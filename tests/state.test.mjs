import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { listJobs, loadJob, saveJob } from "../scripts/lib/state.mjs";

test("stores jobs atomically per workspace", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "cc-codex-state-test-"));
  const workspace = path.join(temporary, "workspace");
  fs.mkdirSync(workspace);
  process.env.CC_CODEX_STATE_DIR = path.join(temporary, "state");
  try {
    const saved = saveJob(workspace, { id: "cc-test", status: "queued" });
    assert.equal(loadJob(workspace, "cc-test").status, "queued");
    assert.equal(listJobs(workspace)[0].id, "cc-test");
    assert.ok(saved.createdAt);
  } finally {
    delete process.env.CC_CODEX_STATE_DIR;
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
