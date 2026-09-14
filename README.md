# Claude Code for Codex

Use Claude Code from inside Codex for reviews, second opinions, implementation work, and resumable delegated tasks.

## Status

Early local plugin prototype. The companion runtime supports:

- Claude Code installation and authentication checks
- foreground and background jobs
- read-only review and adversarial-review profiles
- read-only or write-capable rescue work
- model and effort selection
- deferred `AskUserQuestion` handling and exact-session resume
- status, result, cancellation, and estimated usage reporting

## Requirements

- Node.js 20 or later
- Claude Code 2.1.259 or later
- a Claude.ai subscription login or supported Anthropic provider authentication

Install dependencies and check the runtime:

```bash
npm install
npm run setup
```

## Codex skills

```text
$cc-setup
$cc-review sonnet high - review my current changes
$cc-adversarial-review opus xhigh - challenge the retry design
$cc-rescue sonnet high - implement ABC
$cc-answer <job-id> <answer>
$cc-status
$cc-result <job-id>
$cc-cancel <job-id>
$cc-usage
```

The friendly syntax is `$cc-rescue [model] [effort] - task`. Models may be aliases such as `sonnet`, `opus`, and `haiku`, friendly version names such as `sonnet-5`, or an exact Claude model ID. Effort may be `low`, `medium`, `high`, `xhigh`, or `max`. Missing values use the skill defaults.

## Cost semantics

The runtime captures `total_cost_usd`, aggregate token usage, and `modelUsage` from every Claude Agent SDK result. Dollar values are client-side API-equivalent estimates, not authoritative subscription charges. No plugin-level budget ceiling is applied.

Job state is stored as private local files under `~/.codex/claude-code-for-codex/state/`. It includes the delegated prompt so background and deferred jobs can resume; do not delegate secrets through the plugin.

## Safety defaults

- Reviews cannot use Edit or Write.
- Rescue tasks are read-only unless the request explicitly authorizes implementation.
- Unresolved permission requests are denied by the host callback.
- A deferred Claude question returns control to Codex and is resumed only after an answer is recorded.
- Background write isolation is not complete yet; keep write-capable jobs in the foreground during this prototype stage.

## Development

```bash
npm test
```

The plugin is not affiliated with or endorsed by Anthropic.
