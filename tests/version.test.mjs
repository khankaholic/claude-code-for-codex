import assert from "node:assert/strict";
import test from "node:test";

import {
  detectClaudeFeatures,
  hasRequiredClaudeFeatures,
  isClaudeVersionSupported,
  parseClaudeVersion
} from "../scripts/lib/version.mjs";

test("parses Claude Code version output", () => {
  assert.deepEqual(parseClaudeVersion("2.1.270 (Claude Code)"), [2, 1, 270]);
  assert.deepEqual(parseClaudeVersion("Claude Code 2.2.0-beta.1"), [2, 2, 0]);
  assert.deepEqual(parseClaudeVersion("2.2.0(Claude Code)"), [2, 2, 0]);
  assert.equal(parseClaudeVersion("unknown"), null);
});

test("detects every required restricted-execution feature", () => {
  const features = detectClaudeFeatures("--json-schema --permission-prompts --restricted --strict-mcp-config");
  assert.deepEqual(features, {
    structuredOutput: true,
    permissionPrompts: true,
    restricted: true,
    strictMcpConfig: true
  });
  assert.equal(hasRequiredClaudeFeatures(features), true);
  assert.equal(hasRequiredClaudeFeatures({ ...features, restricted: false }), false);
});

test("enforces the minimum Claude Code version", () => {
  assert.equal(isClaudeVersionSupported("2.1.259 (Claude Code)"), true);
  assert.equal(isClaudeVersionSupported("2.2.0 (Claude Code)"), true);
  assert.equal(isClaudeVersionSupported("2.1.258 (Claude Code)"), false);
  assert.equal(isClaudeVersionSupported("1.9.999 (Claude Code)"), false);
});
