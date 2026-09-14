---
name: cc-adversarial-review
description: Ask Claude Code to challenge an implementation's architecture, assumptions, tradeoffs, and failure modes without editing files.
---

# Claude Code adversarial review

Resolve the plugin root as two directories above this `SKILL.md` and forward the request with:

```bash
node <plugin-root>/scripts/cc-companion.mjs task --kind adversarial-review -- "<request text>"
```

Preserve a friendly prefix such as `opus xhigh - challenge the retry design`; the companion parses it. Add `--background` only when explicitly requested. Do not edit files or independently soften, summarize, or replace Claude's findings.
