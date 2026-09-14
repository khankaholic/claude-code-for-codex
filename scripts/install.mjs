#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const install = args.has("--install");
const check = args.has("--check") || !install;

if (args.has("--help")) {
  process.stdout.write([
    "Usage:",
    "  node scripts/install.mjs --check [--json]",
    "  node scripts/install.mjs --install [--json]",
    "",
    "--check is read-only. --install runs npm ci --omit=dev in the plugin root, then verifies the runtime."
  ].join("\n") + "\n");
  process.exit(0);
}

const known = new Set(["--check", "--install", "--json", "--help"]);
const unknown = [...args].filter((arg) => !known.has(arg));
if (unknown.length > 0 || (install && args.has("--check"))) {
  process.stderr.write(unknown.length > 0
    ? `Unknown option: ${unknown.join(", ")}\n`
    : "Choose either --check or --install.\n");
  process.exit(2);
}

function command(commandName, commandArgs, options = {}) {
  return spawnSync(commandName, commandArgs, {
    cwd: pluginRoot,
    encoding: "utf8",
    shell: false,
    ...options
  });
}

function clean(value) {
  return value?.trim() || null;
}

async function inspect() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const claudeResult = command("claude", ["--version"]);
  const authResult = command("claude", ["auth", "status", "--json"]);
  let loggedIn = false;
  if (!authResult.error && authResult.status === 0) {
    try {
      loggedIn = Boolean(JSON.parse(authResult.stdout).loggedIn);
    } catch {
      loggedIn = false;
    }
  }

  let sdkAvailable = false;
  try {
    await import("@anthropic-ai/claude-agent-sdk");
    sdkAvailable = true;
  } catch {
    sdkAvailable = false;
  }

  return {
    ready: nodeMajor >= 20 && !claudeResult.error && claudeResult.status === 0 && sdkAvailable && loggedIn,
    pluginRoot,
    node: { supported: nodeMajor >= 20, version: process.version },
    claude: {
      available: !claudeResult.error && claudeResult.status === 0,
      version: clean(claudeResult.stdout)
    },
    agentSdk: { available: sdkAvailable, version: "0.3.270" },
    auth: { loggedIn },
    nextAction: nodeMajor < 20
      ? "Install Node.js 20 or later."
      : claudeResult.error || claudeResult.status !== 0
        ? "Install Claude Code using Anthropic's official instructions."
        : !sdkAvailable
          ? "Run this script with --install to install the pinned plugin dependency."
          : !loggedIn
            ? "Run claude auth login yourself, then repeat the check."
            : "Start a new Codex session and use a $cc-* skill."
  };
}

function print(report) {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  process.stdout.write([
    `Ready: ${report.ready ? "yes" : "no"}`,
    `Node.js: ${report.node.version}${report.node.supported ? "" : " (requires 20 or later)"}`,
    `Claude Code: ${report.claude.version ?? "not found"}`,
    `Claude Agent SDK: ${report.agentSdk.available ? report.agentSdk.version : "not installed"}`,
    `Authentication: ${report.auth.loggedIn ? "ready" : "action required"}`,
    `Next: ${report.nextAction}`
  ].join("\n") + "\n");
}

if (install) {
  const npm = command("npm", ["--version"]);
  if (npm.error || npm.status !== 0) {
    const report = { ready: false, installed: false, error: "npm is required to install the plugin runtime dependency." };
    print(report);
    process.exit(1);
  }
  const result = command("npm", ["ci", "--omit=dev", "--ignore-scripts"], { stdio: json ? "pipe" : "inherit" });
  if (result.error || result.status !== 0) {
    const report = { ready: false, installed: false, error: "npm ci failed while installing the pinned plugin dependency." };
    print(report);
    process.exit(1);
  }
}

const report = await inspect();
print(install ? { ...report, installed: report.agentSdk.available } : report);
if (!report.ready && check) process.exitCode = 1;
