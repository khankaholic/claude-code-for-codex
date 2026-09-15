import assert from "node:assert/strict";
import test from "node:test";

import { resumePrompt } from "../scripts/lib/runner.mjs";

test("resume prompt carries recorded answers into the exact session", () => {
  const prompt = resumePrompt({ pendingAnswers: { "Choose Alpha or Beta": "Alpha" } });
  assert.match(prompt, /"Choose Alpha or Beta":"Alpha"/);
  assert.match(prompt, /Do not ask the same question again/);
});
