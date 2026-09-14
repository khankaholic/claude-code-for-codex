---
name: cc-answer
description: Answer a pending Claude Code AskUserQuestion request and resume the exact delegated session.
---

# Answer Claude Code

The request must identify a waiting job and its answer. Resolve the plugin root as two directories above this `SKILL.md`, then run:

```bash
node <plugin-root>/scripts/cc-companion.mjs answer <job-id> "<selected option>"
```

Use the selected option label exactly as shown. Do not reinterpret approval, credential, destructive-action, publishing, deployment, or product-preference questions; those require the user's choice. The companion validates the answer, resumes the exact Claude session, and preserves its model and effort.
