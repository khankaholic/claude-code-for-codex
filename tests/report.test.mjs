import assert from "node:assert/strict";
import test from "node:test";

import { DELEGATION_REPORT_SCHEMA, renderDelegationReport } from "../scripts/lib/report.mjs";

test("delegation report schema requires integration evidence", () => {
  assert.equal(DELEGATION_REPORT_SCHEMA.additionalProperties, false);
  for (const field of ["status", "summary", "findings", "changedFiles", "checks", "permissionDenials", "unexpectedChanges", "unfinishedWork"]) {
    assert.ok(DELEGATION_REPORT_SCHEMA.required.includes(field));
  }
});

test("renders structured findings and observed checks", () => {
  const rendered = renderDelegationReport({
    status: "partial",
    summary: "Implemented the parser but one check could not run.",
    findings: [{ severity: "medium", title: "Edge case remains", file: "parser.mjs", line: 12, detail: "Empty input needs a decision." }],
    changedFiles: ["parser.mjs"],
    checks: [{ command: "npm test", required: true, status: "denied", exitCode: null, outcome: "Bash was not authorized." }],
    permissionDenials: ["Bash(npm test)"],
    unexpectedChanges: [],
    unfinishedWork: ["Decide empty-input behavior."]
  });
  assert.match(rendered, /^PARTIAL:/);
  assert.match(rendered, /parser\.mjs:12/);
  assert.match(rendered, /denied: npm test/);
  assert.match(rendered, /Unfinished work:/);
});
