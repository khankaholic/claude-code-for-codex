export const MINIMUM_CLAUDE_VERSION = "2.1.259";
export const REQUIRED_CLAUDE_FLAGS = {
  structuredOutput: "--json-schema",
  permissionPrompts: "--permission-prompts",
  restricted: "--restricted",
  strictMcpConfig: "--strict-mcp-config"
};

export function parseClaudeVersion(value) {
  const match = String(value ?? "").match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1, 4).map(Number) : null;
}

export function detectClaudeFeatures(helpText) {
  const text = String(helpText ?? "");
  return Object.fromEntries(Object.entries(REQUIRED_CLAUDE_FLAGS).map(([feature, flag]) => [feature, text.includes(flag)]));
}

export function hasRequiredClaudeFeatures(features) {
  return Object.keys(REQUIRED_CLAUDE_FLAGS).every((feature) => features[feature] === true);
}

export function isClaudeVersionSupported(value, minimum = MINIMUM_CLAUDE_VERSION) {
  const actual = parseClaudeVersion(value);
  const required = parseClaudeVersion(minimum);
  if (!actual || !required) return false;
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > required[index]) return true;
    if (actual[index] < required[index]) return false;
  }
  return true;
}
