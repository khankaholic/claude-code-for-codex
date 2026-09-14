const VALUE_OPTIONS = new Set(["answers-json", "cwd", "effort", "job-id", "kind", "model"]);
const BOOLEAN_OPTIONS = new Set(["all", "background", "json", "read-only", "write"]);

export function parseArgs(argv) {
  const options = {};
  const positionals = [];
  let passthrough = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (passthrough) {
      positionals.push(token);
    } else if (token === "--") {
      passthrough = true;
    } else if (!token.startsWith("--")) {
      positionals.push(token);
    } else {
      const name = token.slice(2);
      if (BOOLEAN_OPTIONS.has(name)) {
        options[name] = true;
      } else if (VALUE_OPTIONS.has(name)) {
        const value = argv[index + 1];
        if (value == null) throw new Error(`Missing value for ${token}`);
        options[name] = value;
        index += 1;
      } else {
        throw new Error(`Unknown option: ${token}`);
      }
    }
  }
  return { options, positionals };
}

export const MODEL_ALIASES = new Set(["sonnet", "opus", "haiku", "default", "best", "opusplan"]);
export const EFFORT_LEVELS = new Set(["low", "medium", "high", "xhigh", "max"]);

export function parseFriendlyTask(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return { model: null, effort: null, prompt: "" };
  const separatorIndex = normalized.indexOf(" - ");
  const prefix = separatorIndex === -1 ? normalized : normalized.slice(0, separatorIndex).trim();
  const explicitPrompt = separatorIndex === -1 ? null : normalized.slice(separatorIndex + 3).trim();
  const tokens = prefix.split(/\s+/);
  let model = null;
  let effort = null;
  let consumed = 0;
  const first = tokens[0]?.toLowerCase();
  if (MODEL_ALIASES.has(first) || first?.startsWith("claude-")) {
    model = tokens[0];
    consumed += 1;
  } else if (/^(sonnet|opus|haiku)-\d+(?:-\d+)*$/.test(first)) {
    model = `claude-${first}`;
    consumed += 1;
  } else if (first?.includes("-")) {
    const splitAt = first.lastIndexOf("-");
    const possibleModel = first.slice(0, splitAt);
    const possibleEffort = first.slice(splitAt + 1);
    if (MODEL_ALIASES.has(possibleModel) && EFFORT_LEVELS.has(possibleEffort)) {
      model = possibleModel;
      effort = possibleEffort;
      consumed += 1;
    }
  }
  const next = tokens[consumed]?.toLowerCase();
  if (!effort && EFFORT_LEVELS.has(next)) {
    effort = next;
    consumed += 1;
  }
  return { model, effort, prompt: explicitPrompt ?? tokens.slice(consumed).join(" ") };
}
