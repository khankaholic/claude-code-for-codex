---
name: cc-cancel
description: Cancel a running Claude Code companion job for the current repository.
---

# Cancel Claude Code job

Resolve the plugin root as two directories above this `SKILL.md`, resolve the exact job ID, and run:

```bash
node <plugin-root>/scripts/cc-companion.mjs cancel <job-id>
```

Do not guess a job ID when more than one job is active. Report whether the job was cancelled; do not delete its stored result or session record.
