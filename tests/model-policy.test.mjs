import assert from "node:assert/strict";
import test from "node:test";

import { resolveModelSelection, selectDefaultModel } from "../scripts/lib/model-policy.mjs";

test("uses Opus for planning, brainstorming, architecture, and investigation", () => {
  for (const prompt of [
    "plan the migration",
    "brainstorm alternatives",
    "review the architecture",
    "investigate the race condition",
    "compare the design trade-offs"
  ]) {
    assert.equal(selectDefaultModel({ kind: "rescue", prompt }).model, "opus", prompt);
  }
});

test("uses Opus when deep design work is part of an implementation", () => {
  assert.deepEqual(
    selectDefaultModel({ kind: "rescue", prompt: "design and implement the new architecture", write: true }),
    { model: "opus", effort: "medium", reason: "planning or deep analysis" }
  );
});

test("uses Sonnet for ordinary implementation and explicitly simple work", () => {
  assert.deepEqual(
    selectDefaultModel({ kind: "rescue", prompt: "implement the endpoint", write: true }),
    { model: "sonnet", effort: "medium", reason: "implementation" }
  );
  assert.deepEqual(
    selectDefaultModel({ kind: "rescue", prompt: "implement the accepted specification", write: true }),
    { model: "sonnet", effort: "medium", reason: "implementation of an accepted design" }
  );
  assert.equal(selectDefaultModel({ kind: "rescue", prompt: "quickly explain this helper" }).model, "sonnet");
});

test("uses Opus for reviews, adversarial reviews, and unclassified read-only work", () => {
  assert.deepEqual(
    selectDefaultModel({ kind: "review", prompt: "review current changes" }),
    { model: "opus", effort: "medium", reason: "code review and analysis" }
  );
  assert.deepEqual(
    selectDefaultModel({ kind: "adversarial-review", prompt: "challenge this implementation" }),
    { model: "opus", effort: "high", reason: "adversarial judgment" }
  );
  assert.equal(selectDefaultModel({ kind: "rescue", prompt: "explain what is happening" }).model, "opus");
});

test("uses high effort only for deeper or careful automatic work", () => {
  assert.equal(selectDefaultModel({ kind: "rescue", prompt: "carefully plan the migration" }).effort, "high");
  assert.equal(selectDefaultModel({ kind: "review", prompt: "thoroughly review current changes" }).effort, "high");
  assert.equal(selectDefaultModel({ kind: "rescue", prompt: "carefully implement the endpoint", write: true }).effort, "high");
  assert.equal(selectDefaultModel({ kind: "rescue", prompt: "plan the migration" }).effort, "medium");
});

test("explicit model and effort choices override the routing policy", () => {
  assert.deepEqual(
    resolveModelSelection({
      kind: "rescue",
      prompt: "plan the migration",
      model: "sonnet",
      effort: "low"
    }),
    { model: "sonnet", effort: "low", modelSelection: "explicit" }
  );
});
