import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function gitRoot(cwd) {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8", shell: false });
  return result.status === 0 ? result.stdout.trim() : path.resolve(cwd);
}

export function resolveWorkspace(cwd) {
  const root = gitRoot(cwd);
  try { return fs.realpathSync.native(root); } catch { return root; }
}

export function resolveStateDir(cwd) {
  const workspace = resolveWorkspace(cwd);
  const name = path.basename(workspace).replace(/[^a-zA-Z0-9._-]/g, "-") || "workspace";
  const hash = crypto.createHash("sha256").update(workspace).digest("hex").slice(0, 16);
  const base = process.env.CC_CODEX_STATE_DIR
    ? path.resolve(process.env.CC_CODEX_STATE_DIR)
    : path.join(os.homedir(), ".codex", "claude-code-for-codex", "state");
  return path.join(base, `${name}-${hash}`);
}

function jobPath(cwd, jobId) {
  return path.join(resolveStateDir(cwd), "jobs", `${jobId}.json`);
}

function atomicWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, filePath);
}

export function createJobId() {
  return `cc-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

export function saveJob(cwd, job) {
  const now = new Date().toISOString();
  const next = { ...job, updatedAt: now, createdAt: job.createdAt ?? now };
  atomicWrite(jobPath(cwd, job.id), next);
  return next;
}

export function loadJob(cwd, jobId) {
  const file = jobPath(cwd, jobId);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

export function listJobs(cwd) {
  const directory = path.join(resolveStateDir(cwd), "jobs");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((name) => name.endsWith(".json")).flatMap((name) => {
    try { return [JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"))]; } catch { return []; }
  }).sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}
