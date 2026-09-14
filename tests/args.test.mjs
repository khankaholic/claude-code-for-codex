import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs, parseFriendlyTask } from "../scripts/lib/args.mjs";

test("parses friendly model and effort syntax", () => {
  assert.deepEqual(parseFriendlyTask("sonnet high - implement ABC"), {
    model: "sonnet", effort: "high", prompt: "implement ABC"
  });
});

test("parses combined presets", () => {
  assert.deepEqual(parseFriendlyTask("opus-xhigh - investigate the race"), {
    model: "opus", effort: "xhigh", prompt: "investigate the race"
  });
});

test("preserves an ordinary task without a prefix", () => {
  assert.deepEqual(parseFriendlyTask("implement ABC"), {
    model: null, effort: null, prompt: "implement ABC"
  });
});

test("parses exact model identifiers", () => {
  assert.deepEqual(parseFriendlyTask("claude-sonnet-4-6 high - implement ABC"), {
    model: "claude-sonnet-4-6", effort: "high", prompt: "implement ABC"
  });
});

test("expands friendly versioned model names", () => {
  assert.deepEqual(parseFriendlyTask("sonnet-5 high - implement ABC"), {
    model: "claude-sonnet-5", effort: "high", prompt: "implement ABC"
  });
});

test("keeps passthrough task tokens", () => {
  assert.deepEqual(parseArgs(["--kind", "rescue", "--write", "--", "fix", "tests"]), {
    options: { kind: "rescue", write: true },
    positionals: ["fix", "tests"]
  });
});
