---
name: cc-setup
description: Check whether the local Claude Code and Claude Agent SDK runtime is ready for use from Codex.
---

# Claude Code setup

Resolve the plugin root as two directories above this `SKILL.md`, then run the read-only check:

```bash
node <plugin-root>/scripts/install.mjs --check --json
```

Return the report without exposing account identity, organization details, tokens, API keys, or environment values.

If `agentSdk.available` is false, explain that the plugin needs its pinned local dependency and ask before running this networked write:

```bash
node <plugin-root>/scripts/install.mjs --install --json
```

If Claude Code is unavailable, direct the user to Anthropic's official installation instructions. If `auth.loggedIn` is false, tell the user to run `claude auth login` themselves; never perform or automate authentication. After setup succeeds, remind the user that newly installed Codex skills require a new Codex session.
