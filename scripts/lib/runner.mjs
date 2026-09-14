import { query } from "@anthropic-ai/claude-agent-sdk";

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
  if (job.kind === "review") {
    return [
      "Review the current repository changes. Report only actionable correctness, safety, reliability, or maintainability findings.",
      "Do not edit files. Cite file paths and line numbers. If there are no findings, say so clearly.",
      job.prompt
    ].filter(Boolean).join("\n\n");
  }
  if (job.kind === "adversarial-review") {
    return [
      "Perform an adversarial read-only review. Challenge assumptions, architecture, tradeoffs, and failure modes.",
      "Do not edit files. Separate concrete defects from design questions and cite evidence.",
      job.prompt
    ].filter(Boolean).join("\n\n");
  }
  return job.prompt;
}

function answersMatch(job, questions) {
  const answers = job.pendingAnswers;
  return Boolean(answers && questions.every((question) => Object.hasOwn(answers, question.question)));
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
      ? "Continue from the deferred question using the supplied answer, then finish the original task."
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
      canUseTool: async (toolName) => ({
        behavior: "deny",
        message: `${toolName} was not approved by the Codex companion policy.`
      }),
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
    pendingAnswers: pendingAnswersConsumed ? null : job.pendingAnswers ?? null,
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
  return {
    ...base,
    status: successful ? "completed" : "failed",
    phase: successful ? "completed" : "failed",
    pendingQuestion: null,
    result: finalResult.result ?? "",
    error: successful ? null : finalResult.subtype ?? "Claude execution failed"
  };
}
