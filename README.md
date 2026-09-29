# Claude Code for Codex

Use Claude Code from inside Codex for reviews, second opinions, implementation work, and resumable delegated tasks.

## Status

Early plugin release. The companion runtime supports:

- Claude Code installation and authentication checks
- foreground and background jobs
- read-only review and adversarial-review profiles
- read-only or write-capable rescue work
- model and effort selection
- deferred `AskUserQuestion` handling and exact-session resume
- structured results with changed files, checks, findings, and unfinished work
- restricted execution with ambient MCP servers disabled
- status, result, cancellation, and estimated usage reporting

## Installation

This plugin installs into Codex and uses your local Claude Code runtime.

### Let Codex install it

Paste this into Codex:

```text
Fetch and follow the installation instructions from:
https://raw.githubusercontent.com/khankaholic/claude-code-for-codex/main/docs/INSTALL_AGENT.md
```

Codex will install the marketplace and plugin, prepare the pinned runtime dependency, verify the installation, and tell you if a human authentication step is required.

### Install it manually

Add this repository as a Codex marketplace and install the plugin:

```bash
codex plugin marketplace add khankaholic/claude-code-for-codex
codex plugin add claude-code-for-codex@claude-code-for-codex
```

Start a new Codex session, then run `$cc-setup`. The setup skill verifies Claude Code and offers to install the plugin's pinned local SDK dependency if needed. It never performs Claude authentication for you.

See [the human installation guide](docs/INSTALL.md) for prerequisites, updating, uninstalling, and troubleshooting. The fetched agent procedure is maintained in [the agent installation contract](docs/INSTALL_AGENT.md).

## Requirements

- Node.js 20 or later
- Claude Code 2.1.259 or later
- a Claude.ai subscription login or supported Anthropic provider authentication

For source development, install dependencies and check the runtime:

```bash
npm ci
npm run setup
```

## Codex skills

```text
$cc-setup
$cc-review review my current changes
$cc-adversarial-review opus-5-5 high - challenge the retry design
$cc-rescue implement ABC
$cc-rescue sonnet-5-5 medium - implement ABC
$cc-answer <job-id> <answer>
$cc-status
$cc-result <job-id>
$cc-cancel <job-id>
$cc-usage
```

The friendly syntax is `$cc-rescue [model] [effort] - task`. You normally do not need to choose a model: planning, brainstorming, architecture, investigation, review, and other judgment-heavy work use the latest `opus` alias; ordinary implementation and explicitly simple work use Claude Sonnet 5.5. Automatic effort defaults to `medium` and rises to `high` when the request asks for deeper reasoning or careful, thorough checking. Adversarial review also uses `high`. Explicit choices always win. `sonnet`, `sonnet-5-5`, and `claude-sonnet-5-5` select Claude Sonnet 5.5; use `opus-5-5` to pin Claude Opus 5.5. You may also provide another friendly version name or exact Claude model ID. Effort may be `low`, `medium`, `high`, `xhigh`, or `max`.

Examples:

```text
$cc-rescue brainstorm migration approaches          # opus medium
$cc-rescue carefully design the new boundary        # opus high
$cc-rescue implement the accepted change            # sonnet 5.5 medium
$cc-review thoroughly review my current changes     # opus high
```

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
