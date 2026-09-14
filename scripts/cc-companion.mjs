#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseArgs, parseFriendlyTask } from "./lib/args.mjs";
import { createJobId, listJobs, loadJob, resolveWorkspace, saveJob } from "./lib/state.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const VALID_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);
const VALID_KINDS = new Set(["rescue", "review", "adversarial-review"]);
const DEFAULTS = {
  rescue: { model: "sonnet", effort: "high" },
  review: { model: "sonnet", effort: "high" },
  "adversarial-review": { model: "opus", effort: "xhigh" }
};

function output(value, json = false) {
  process.stdout.write(json ? `${JSON.stringify(value, null, 2)}\n` : `${value}\n`);
}

function printUsage() {
  output([
    "Usage:",
    "  cc-companion.mjs setup [--json]",
    "  cc-companion.mjs task [--kind rescue|review|adversarial-review] [--model <model>] [--effort <level>] [--write] [--background] -- <prompt>",
    "  cc-companion.mjs answer <job-id> <answer> [--json]",
    "  cc-companion.mjs status [job-id] [--all] [--json]",
    "  cc-companion.mjs result [job-id] [--json]",
    "  cc-companion.mjs cancel <job-id> [--json]",
    "  cc-companion.mjs usage [--json]"
  ].join("\n"));
}

function commandStatus(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  return {
    available: !result.error && result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? ""
  };
}

async function handleSetup(argv) {
  const { options } = parseArgs(argv);
  const claude = commandStatus("claude", ["--version"]);
  const authRaw = commandStatus("claude", ["auth", "status", "--json"]);
  let auth = { loggedIn: false, authMethod: null, subscriptionType: null, apiProvider: null };
  if (authRaw.available) {
    const parsed = JSON.parse(authRaw.stdout);
    auth = {
      loggedIn: Boolean(parsed.loggedIn),
      authMethod: parsed.authMethod ?? null,
      subscriptionType: parsed.subscriptionType ?? null,
      apiProvider: parsed.apiProvider ?? null
    };
  }
  let sdkAvailable = false;
  try {
    await import("@anthropic-ai/claude-agent-sdk");
    sdkAvailable = true;
  } catch {
    sdkAvailable = false;
  }
  const report = {
    ready: claude.available && auth.loggedIn && sdkAvailable,
    node: process.version,
    claude: { available: claude.available, version: claude.stdout || null },
    auth,
    agentSdk: { available: sdkAvailable, version: "0.3.270" },
    budgetCeiling: null,
    costCapture: true
  };
  output(options.json ? report : [
    `Ready: ${report.ready ? "yes" : "no"}`,
    `Node: ${report.node}`,
    `Claude: ${report.claude.version ?? "not found"}`,
    `Authentication: ${auth.loggedIn ? `${auth.authMethod} (${auth.subscriptionType ?? "unknown plan"})` : "not logged in"}`,
    `Claude Agent SDK: ${sdkAvailable ? "0.3.270" : "not installed; run npm install in the plugin root"}`,
    "Budget ceiling: none",
    "Estimated usage capture: enabled"
  ].join("\n"), options.json);
}

function validateTaskOptions(options) {
  if (options.effort && !VALID_EFFORTS.has(String(options.effort).toLowerCase())) {
    throw new Error(`Unsupported effort: ${options.effort}`);
  }
  const kind = options.kind ?? "rescue";
  if (!VALID_KINDS.has(kind)) throw new Error(`Unsupported job kind: ${kind}`);
  if (options.write && kind !== "rescue") throw new Error("Review jobs are always read-only.");
  if (options.background && options.write) {
    throw new Error("Background writes are disabled until worktree isolation is implemented.");
  }
  return kind;
}

function renderJob(job) {
  const lines = [
    `${job.id} · ${job.kind} · ${job.status}`,
    `Model: ${job.activeModel ?? job.model ?? "Claude default"}${job.effort ? ` · effort ${job.effort}` : ""}`,
    `Estimated cost: $${Number(job.estimatedCostUsd ?? 0).toFixed(6)}`
  ];
  if (job.status === "needs_input") {
    lines.push("Claude needs input:");
    for (const [index, question] of (job.pendingQuestion?.input?.questions ?? []).entries()) {
      lines.push(`${index + 1}. ${question.question}`);
      for (const option of question.options ?? []) lines.push(`   - ${option.label}: ${option.description ?? ""}`);
    }
    lines.push(`Answer with: $cc-answer ${job.id} <choice>`);
  } else if (job.result) {
    lines.push("", job.result);
  } else if (job.error) {
    lines.push(`Error: ${job.error}`);
  }
  return lines.join("\n");
}

async function runStoredJob(cwd, job) {
  let current = saveJob(cwd, { ...job, status: "running", phase: "starting", pid: process.pid });
  try {
    const { executeClaudeJob } = await import("./lib/runner.mjs");
    const result = await executeClaudeJob(current, (patch) => {
      current = saveJob(cwd, { ...current, ...patch });
    });
    return saveJob(cwd, { ...current, ...result, pid: null });
  } catch (error) {
    return saveJob(cwd, {
      ...current,
      status: "failed",
      phase: "failed",
      pid: null,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleTask(argv) {
  const { options, positionals } = parseArgs(argv);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const kind = validateTaskOptions(options);
  const friendly = parseFriendlyTask(positionals.join(" "));
  const prompt = friendly.prompt.trim();
  if (!prompt) throw new Error("Provide a task after `--`.");
  const model = options.model ?? friendly.model ?? DEFAULTS[kind].model;
  const effort = (options.effort ?? friendly.effort ?? DEFAULTS[kind].effort).toLowerCase();
  if (!VALID_EFFORTS.has(effort)) throw new Error(`Unsupported effort: ${effort}`);
  const job = saveJob(cwd, {
    id: createJobId(), cwd: resolveWorkspace(cwd), kind, prompt,
    model, effort,
    write: Boolean(options.write), status: options.background ? "queued" : "running",
    phase: options.background ? "queued" : "starting", runs: [], estimatedCostUsd: 0
  });

  if (options.background) {
    const child = spawn(process.execPath, [SCRIPT_PATH, "worker", "--cwd", cwd, "--job-id", job.id], {
      cwd, detached: true, stdio: "ignore", shell: false
    });
    child.unref();
    saveJob(cwd, { ...job, pid: child.pid ?? null });
    output(options.json ? job : `${job.id} started in the background. Use $cc-status ${job.id}.`, options.json);
    return;
  }
  const completed = await runStoredJob(cwd, job);
  output(options.json ? completed : renderJob(completed), options.json);
  if (completed.status === "failed") process.exitCode = 1;
}

function resolveJob(cwd, reference, predicate = () => true) {
  if (reference) {
    const exact = loadJob(cwd, reference);
    if (!exact) throw new Error(`Unknown job: ${reference}`);
    return exact;
  }
  const job = listJobs(cwd).find(predicate);
  if (!job) throw new Error("No matching Claude Code job found for this workspace.");
  return job;
}

async function handleAnswer(argv) {
  const { options, positionals } = parseArgs(argv);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const job = resolveJob(cwd, positionals.shift(), (candidate) => candidate.status === "needs_input");
  if (job.status !== "needs_input" || !job.pendingQuestion) throw new Error(`${job.id} is not waiting for input.`);
  const questions = job.pendingQuestion.input?.questions ?? [];
  let answers;
  if (options["answers-json"]) {
    answers = JSON.parse(options["answers-json"]);
  } else {
    if (questions.length !== 1) throw new Error("Multiple questions require --answers-json.");
    const answer = positionals.join(" ").trim();
    if (!answer) throw new Error("Provide an answer.");
    const labels = new Set((questions[0].options ?? []).map((option) => option.label));
    if (labels.size > 0 && !labels.has(answer)) throw new Error(`Choose one of: ${[...labels].join(", ")}`);
    answers = { [questions[0].question]: answer };
  }
  const resumed = await runStoredJob(cwd, saveJob(cwd, {
    ...job, pendingAnswers: answers, status: "running", phase: "resuming"
  }));
  output(options.json ? resumed : renderJob(resumed), options.json);
  if (resumed.status === "failed") process.exitCode = 1;
}

function handleStatus(argv) {
  const { options, positionals } = parseArgs(argv);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  if (positionals[0]) {
    const job = resolveJob(cwd, positionals[0]);
    output(options.json ? job : renderJob(job), options.json);
    return;
  }
  const jobs = listJobs(cwd).filter((job) => options.all || !["completed", "failed", "cancelled"].includes(job.status));
  if (options.json) return output(jobs, true);
  output(jobs.length === 0 ? "No matching Claude Code jobs." : jobs.map((job) =>
    `${job.id}\t${job.kind}\t${job.status}\t$${Number(job.estimatedCostUsd ?? 0).toFixed(6)}`
  ).join("\n"));
}

function handleResult(argv) {
  const { options, positionals } = parseArgs(argv);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const job = resolveJob(cwd, positionals[0], (candidate) => ["completed", "failed", "cancelled", "needs_input"].includes(candidate.status));
  output(options.json ? job : renderJob(job), options.json);
}

function handleCancel(argv) {
  const { options, positionals } = parseArgs(argv);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const job = resolveJob(cwd, positionals[0], (candidate) => ["queued", "running"].includes(candidate.status));
  if (!["queued", "running"].includes(job.status)) throw new Error(`${job.id} is not running.`);
  if (Number.isFinite(job.pid) && job.pid > 1) {
    try { process.kill(-job.pid, "SIGINT"); } catch { process.kill(job.pid, "SIGINT"); }
  }
  const cancelled = saveJob(cwd, { ...job, status: "cancelled", phase: "cancelled", pid: null });
  output(options.json ? cancelled : `${job.id} cancelled.`, options.json);
}

function handleUsage(argv) {
  const { options } = parseArgs(argv);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const jobs = listJobs(cwd);
  const byModel = {};
  for (const job of jobs) {
    for (const run of job.runs ?? []) {
      for (const [model, usage] of Object.entries(run.modelUsage ?? {})) {
        const current = byModel[model] ?? {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          webSearchRequests: 0,
          estimatedCostUsd: 0
        };
        current.inputTokens += Number(usage.inputTokens ?? 0);
        current.outputTokens += Number(usage.outputTokens ?? 0);
        current.cacheReadInputTokens += Number(usage.cacheReadInputTokens ?? 0);
        current.cacheCreationInputTokens += Number(usage.cacheCreationInputTokens ?? 0);
        current.webSearchRequests += Number(usage.webSearchRequests ?? 0);
        current.estimatedCostUsd += Number(usage.costUSD ?? 0);
        byModel[model] = current;
      }
    }
  }
  const report = {
    workspace: resolveWorkspace(cwd),
    jobs: jobs.length,
    calls: jobs.reduce((sum, job) => sum + (job.runs?.length ?? 0), 0),
    estimatedCostUsd: jobs.reduce((sum, job) => sum + Number(job.estimatedCostUsd ?? 0), 0),
    byModel,
    byKind: Object.fromEntries([...VALID_KINDS].map((kind) => [kind,
      jobs.filter((job) => job.kind === kind).reduce((sum, job) => sum + Number(job.estimatedCostUsd ?? 0), 0)
    ]))
  };
  output(options.json ? report : [
    `Workspace: ${report.workspace}`, `Jobs: ${report.jobs}`, `Claude calls: ${report.calls}`,
    `Estimated API-equivalent cost: $${report.estimatedCostUsd.toFixed(6)}`,
    ...Object.entries(report.byModel).map(([model, usage]) =>
      `${model}: ${usage.inputTokens} input · ${usage.outputTokens} output · ${usage.cacheReadInputTokens} cache-read · $${usage.estimatedCostUsd.toFixed(6)}`
    ),
    "Budget ceiling: none"
  ].join("\n"), options.json);
}

async function handleWorker(argv) {
  const { options } = parseArgs(argv);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  await runStoredJob(cwd, resolveJob(cwd, options["job-id"]));
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  switch (command) {
    case "setup": await handleSetup(argv); break;
    case "task": await handleTask(argv); break;
    case "answer": await handleAnswer(argv); break;
    case "status": handleStatus(argv); break;
    case "result": handleResult(argv); break;
    case "cancel": handleCancel(argv); break;
    case "usage": handleUsage(argv); break;
    case "worker": await handleWorker(argv); break;
    case "help": case "--help": case undefined: printUsage(); break;
    default: throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
