export const DELEGATION_REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["complete", "partial", "blocked"] },
    summary: { type: "string", minLength: 1, maxLength: 240 },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["critical", "high", "medium", "low", "info"] },
          title: { type: "string", minLength: 1, maxLength: 160 },
          file: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
          line: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
          detail: { type: "string", minLength: 1, maxLength: 600 }
        },
        required: ["severity", "title", "file", "line", "detail"]
      }
    },
    changedFiles: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", minLength: 1 }
    },
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          command: { type: "string", minLength: 1 },
          required: { type: "boolean" },
          status: { type: "string", enum: ["passed", "failed", "denied", "not_run"] },
          exitCode: { anyOf: [{ type: "integer" }, { type: "null" }] },
          outcome: { type: "string", minLength: 1, maxLength: 240 }
        },
        required: ["command", "required", "status", "exitCode", "outcome"]
      }
    },
    permissionDenials: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", minLength: 1 }
    },
    unexpectedChanges: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", minLength: 1 }
    },
    unfinishedWork: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", minLength: 1 }
    }
  },
  required: [
    "status",
    "summary",
    "findings",
    "changedFiles",
    "checks",
    "permissionDenials",
    "unexpectedChanges",
    "unfinishedWork"
  ]
};

function locationFor(finding) {
  if (!finding.file) return "";
  return finding.line ? ` (${finding.file}:${finding.line})` : ` (${finding.file})`;
}

export function renderDelegationReport(report) {
  const lines = [`${report.status.toUpperCase()}: ${report.summary}`];
  if (report.findings.length > 0) {
    lines.push("", "Findings:");
    for (const finding of report.findings) {
      lines.push(`- [${finding.severity}] ${finding.title}${locationFor(finding)} — ${finding.detail}`);
    }
  }
  if (report.changedFiles.length > 0) {
    lines.push("", "Changed files:", ...report.changedFiles.map((file) => `- ${file}`));
  }
  if (report.checks.length > 0) {
    lines.push("", "Checks:");
    for (const check of report.checks) {
      const exit = check.exitCode == null ? "" : ` (exit ${check.exitCode})`;
      lines.push(`- ${check.status}: ${check.command}${exit} — ${check.outcome}`);
    }
  }
  for (const [label, values] of [
    ["Permission denials", report.permissionDenials],
    ["Unexpected changes", report.unexpectedChanges],
    ["Unfinished work", report.unfinishedWork]
  ]) {
    if (values.length > 0) lines.push("", `${label}:`, ...values.map((value) => `- ${value}`));
  }
  return lines.join("\n");
}
