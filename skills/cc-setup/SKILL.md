---
name: cc-setup
description: Check whether the local Claude Code and Claude Agent SDK runtime is ready for use from Codex.
---

# Claude Code setup

Resolve the plugin root as two directories above this `SKILL.md`, then run:

```bash
node <plugin-root>/scripts/cc-companion.mjs setup
```

Return the report without exposing account identity, organization details, tokens, API keys, or environment values. If dependencies are missing, tell the user to run `npm install` in the plugin root. If Claude is not authenticated, tell the user to run `claude auth login` themselves.
