import { query } from "@anthropic-ai/claude-agent-sdk";

import { DELEGATION_REPORT_SCHEMA, renderDelegationReport } from "./report.mjs";

function profileFor(job) {
  const ask = "AskUserQuestion";
  if (job.kind !== "rescue" || !job.write) {
    return {
      tools: ["Read", "Glob", "Grep", "Bash", ask],
      permissionMode: "dontAsk"
    };
  }
  return {
    tools: ["Read", "Glob", "Grep", "Edit", "Write", "Bash", ask],
    permissionMode: "acceptEdits"
  };
}

function promptFor(job) {
  const authorization = job.kind === "rescue" && job.write
    ? "Implementation is authorized only for files required by the objective."
    : "Read-only. Do not edit, create, rename, or delete files.";
  const assignment = [
    "You are completing a bounded assignment delegated by Codex.",
    `Repository: ${job.cwd}`,
    `Objective: ${job.prompt}`,
    `Authorization: ${authorization}`,
    "Preserve all unrelated and pre-existing work. Do not commit, push, publish, deploy, install dependencies, or access unrelated external systems.",
    "Read applicable AGENTS.md or CLAUDE.md instructions before acting. Inspect only the context needed for this objective.",
    "Run only checks that are already implied by the objective and available permissions. Report actual outcomes; do not claim an unobserved success.",
    "Return the requested structured report. List unexpected changes and unfinished work explicitly."
  ].join("\n");
  if (job.kind === "review") {
    return [
      "Review the current repository changes. Report only actionable correctness, safety, reliability, or maintainability findings.",
      "Do not edit files. Cite file paths and line numbers. If there are no findings, say so clearly.",
      assignment
    ].filter(Boolean).join("\n\n");
  }
  if (job.kind === "adversarial-review") {
    return [
      "Perform an adversarial read-only review. Challenge assumptions, architecture, tradeoffs, and failure modes.",
      "Do not edit files. Separate concrete defects from design questions and cite evidence.",
      assignment
    ].filter(Boolean).join("\n\n");
  }
  return assignment;
}

function answersMatch(job, questions) {
  const answers = job.pendingAnswers;
  return Boolean(answers && questions.every((question) => Object.hasOwn(answers, question.question)));
}

export function resumePrompt(job) {
  const answers = JSON.stringify(job.pendingAnswers ?? {});
  return [
    "Continue the original task from the deferred question.",
    `The user supplied these answers: ${answers}`,
    "Treat those values as the user's answer to the pending question. Do not ask the same question again.",
    "Finish the original task within its existing authorization boundary and return the requested structured report."
  ].join("\n");
}

function costRecord(message) {
  return {
    estimatedCostUsd: Number(message.total_cost_usd ?? 0),
    usage: message.usage ?? null,
    modelUsage: message.modelUsage ?? null,
    durationMs: message.duration_ms ?? null,
    durationApiMs: message.duration_api_ms ?? null,
    numTurns: message.num_turns ?? null,
    recordedAt: new Date().toISOString()
  };
}

export async function executeClaudeJob(job, onUpdate = () => {}) {
  const profile = profileFor(job);
  const answersIncludedInPrompt = Boolean(job.sessionId && job.pendingAnswers);
  let init = null;
  let finalResult = null;
  let pendingAnswersConsumed = false;
  const progress = [];

  const askUserHook = async (input) => {
    if (input.tool_name !== "AskUserQuestion") return {};
    const questions = input.tool_input?.questions ?? [];
    if (answersMatch(job, questions)) {
      pendingAnswersConsumed = true;
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          updatedInput: { questions, answers: job.pendingAnswers }
        }
      };
    }
    return {
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "defer" }
    };
  };

  const stream = query({
    prompt: job.sessionId
      ? resumePrompt(job)
      : promptFor(job),
    options: {
      cwd: job.cwd,
      model: job.model ?? undefined,
      effort: job.effort ?? undefined,
      resume: job.sessionId ?? undefined,
      tools: profile.tools,
      permissionMode: profile.permissionMode,
      permissionPrompts: "host",
      settingSources: [],
      mcpServers: {},
      strictMcpConfig: true,
      extraArgs: { restricted: null },
      outputFormat: { type: "json_schema", schema: DELEGATION_REPORT_SCHEMA },
      canUseTool: async (toolName, input) => {
        if (toolName === ask && answersMatch(job, input?.questions ?? [])) {
          pendingAnswersConsumed = true;
          return {
            behavior: "allow",
            updatedInput: { questions: input.questions, answers: job.pendingAnswers }
          };
        }
        return {
          behavior: "deny",
          message: `${toolName} was not approved by the Codex companion policy.`
        };
      },
      hooks: { PreToolUse: [{ matcher: "^AskUserQuestion$", hooks: [askUserHook] }] }
    }
  });

  for await (const message of stream) {
    if (message.type === "system" && message.subtype === "init") {
      init = {
        sessionId: message.session_id,
        model: message.model ?? null,
        tools: message.tools ?? [],
        permissionMode: message.permissionMode ?? profile.permissionMode
      };
      onUpdate({ sessionId: init.sessionId, activeModel: init.model, phase: "running" });
    } else if (message.type === "assistant") {
      for (const block of message.message?.content ?? []) {
        if (block.type === "tool_use") {
          progress.push({ tool: block.name, at: new Date().toISOString() });
          onUpdate({ phase: block.name === "Edit" || block.name === "Write" ? "editing" : "running" });
        }
      }
    } else if (message.type === "result") {
      finalResult = message;
    }
  }

  if (!finalResult) throw new Error("Claude ended without a terminal result message.");
  const run = costRecord(finalResult);
  const base = {
    sessionId: finalResult.session_id ?? init?.sessionId ?? job.sessionId ?? null,
    activeModel: init?.model ?? null,
    permissionMode: init?.permissionMode ?? profile.permissionMode,
    progress: [...(job.progress ?? []), ...progress],
    runs: [...(job.runs ?? []), run],
    estimatedCostUsd: Number(job.estimatedCostUsd ?? 0) + run.estimatedCostUsd,
    pendingAnswers: pendingAnswersConsumed || answersIncludedInPrompt ? null : job.pendingAnswers ?? null,
    permissionDenials: finalResult.permission_denials ?? [],
    stopReason: finalResult.stop_reason ?? null,
    terminalReason: finalResult.terminal_reason ?? null
  };

  if (finalResult.stop_reason === "tool_deferred" && finalResult.deferred_tool_use) {
    return {
      ...base,
      status: "needs_input",
      phase: "needs_input",
      pendingQuestion: finalResult.deferred_tool_use,
      result: null,
      error: null
    };
  }

  const successful = finalResult.subtype === "success" && !finalResult.is_error;
  const structuredResult = finalResult.structured_output ?? null;
  const structuredFailure = finalResult.subtype === "error_max_structured_output_retries";
  return {
    ...base,
    status: successful ? "completed" : "failed",
    phase: successful ? "completed" : "failed",
    pendingQuestion: null,
    structuredResult,
    delegatedStatus: structuredResult?.status ?? null,
    rawResult: finalResult.result ?? "",
    result: structuredResult ? renderDelegationReport(structuredResult) : finalResult.result ?? "",
    requiresVerification: Boolean(job.write && (!successful || structuredResult?.status !== "complete")),
    error: successful
      ? null
      : structuredFailure && job.write
        ? "Claude exhausted structured-output retries. File edits may still exist; inspect the working tree before retrying."
        : finalResult.subtype ?? "Claude execution failed"
  };
}
