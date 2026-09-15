---
name: cc-rescue
description: Delegate a diagnosis, implementation, or follow-up coding task to Claude Code and return its result to Codex.
---

# Claude Code rescue

Act as a thin routing layer. Do not inspect or solve the repository task before invoking Claude.

Resolve the plugin root as two directories above this `SKILL.md`, then forward the request:

```bash
node <plugin-root>/scripts/cc-companion.mjs task --kind rescue [--write] [--background] -- "<request text>"
```

Routing rules:

- Preserve friendly prefixes such as `sonnet high - implement ABC` or `opus-xhigh - investigate the race`; the companion parses them.
- Add `--write` only when the user asks Claude to implement, fix, change, create, or otherwise modify files. Diagnosis, research, planning, and explanation stay read-only.
- Add `--background` only when the user explicitly requests it. Background writes are intentionally rejected until isolated worktrees are implemented.
- Return Claude's result faithfully. Do not add a second implementation.
- After a write-capable job, inspect the actual diff and status, check for paths outside the requested scope, and independently run the most important already-authorized check. Clearly distinguish Claude-reported checks from Codex-observed verification. Do not edit Claude's work unless the user separately asks Codex to do so.
- When the result is `needs_input`, answer automatically only if the choice is directly established by repository evidence and is low risk. Otherwise present Claude's options to the user. Continue with `$cc-answer` after a choice is available.
