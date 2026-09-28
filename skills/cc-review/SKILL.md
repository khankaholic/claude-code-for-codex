---
name: cc-review
description: Ask Claude Code to perform a read-only review of current repository changes or a requested branch comparison.
---

# Claude Code review

Forward the request to the companion rather than reviewing the code yourself. Resolve the plugin root as two directories above this `SKILL.md` and run:

```bash
node <plugin-root>/scripts/cc-companion.mjs task --kind review -- "<request text>"
```

The request may begin with a friendly model and effort prefix, such as `opus-5-5 high - review against main`; preserve it unchanged because the companion parses it. An explicit choice wins; otherwise reviews default to the latest `opus` alias at `medium` effort, rising to `high` when the request calls for deeper reasoning or careful, thorough checking. Add `--background` only when the user explicitly requests background execution. Review is always read-only. Return the companion output faithfully.
