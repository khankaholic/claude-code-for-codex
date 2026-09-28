---
name: cc-adversarial-review
description: Ask Claude Code to challenge an implementation's architecture, assumptions, tradeoffs, and failure modes without editing files.
---

# Claude Code adversarial review

Resolve the plugin root as two directories above this `SKILL.md` and forward the request with:

```bash
node <plugin-root>/scripts/cc-companion.mjs task --kind adversarial-review -- "<request text>"
```

Preserve a friendly prefix such as `opus-5-5 xhigh - challenge the retry design`; the companion parses it. `opus` selects Anthropic's latest Opus alias (currently Opus 5.5), while `opus-5-5` pins Claude Opus 5.5 explicitly. With no model prefix, this skill already defaults to the latest `opus` alias at `xhigh` effort. Add `--background` only when explicitly requested. Do not edit files or independently soften, summarize, or replace Claude's findings.
