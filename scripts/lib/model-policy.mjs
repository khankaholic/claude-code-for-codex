const DEEP_WORK = /\b(?:plan|planning|brainstorm|brainstorming|architect|architecture|architectural|design|strategy|strategic|trade[ -]?offs?|investigate|investigation|diagnose|diagnosis|research|analyze|analyse|analysis|reason|reasoning|explore|proposal|specification|roadmap|root cause)\b/i;
const ACCEPTED_DESIGN = /\b(?:accepted|approved|finalized|agreed)\s+(?:plan|design|architecture|proposal|specification)\b/i;
const SIMPLE_WORK = /\b(?:simple|straightforward|small|minor|trivial|quick|quickly)\b/i;
const HIGH_EFFORT = /\b(?:careful|carefully|thorough|thoroughly|deep|deeply|complex|critical|high[ -]?stakes|rigorous|rigorously|exhaustive|exhaustively|meticulous|meticulously|double[ -]?check)\b/i;

function automaticEffort(kind, text) {
  if (kind === "adversarial-review" || HIGH_EFFORT.test(text)) return "high";
  return "medium";
}

export function selectDefaultModel({ kind, prompt, write = false }) {
  const text = String(prompt ?? "");
  const effort = automaticEffort(kind, text);

  if (kind === "adversarial-review") {
    return { model: "opus", effort, reason: "adversarial judgment" };
  }
  if (kind === "review") {
    return { model: "opus", effort, reason: "code review and analysis" };
  }
  if (write && ACCEPTED_DESIGN.test(text)) {
    return { model: "sonnet", effort, reason: "implementation of an accepted design" };
  }
  if (DEEP_WORK.test(text)) {
    return { model: "opus", effort, reason: "planning or deep analysis" };
  }
  if (write) {
    return { model: "sonnet", effort, reason: "implementation" };
  }
  if (SIMPLE_WORK.test(text)) {
    return { model: "sonnet", effort, reason: "explicitly simple work" };
  }
  return { model: "opus", effort, reason: "judgment-heavy or unclassified work" };
}

export function resolveModelSelection({ kind, prompt, write = false, model = null, effort = null }) {
  const policy = selectDefaultModel({ kind, prompt, write });
  return {
    model: model ?? policy.model,
    effort: effort ?? policy.effort,
    modelSelection: model ? "explicit" : policy.reason
  };
}
