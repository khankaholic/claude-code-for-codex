# Install Claude Code for Codex

This installs the plugin into Codex. It does not install a Claude Code plugin.

## Requirements

- Codex CLI with plugin support
- Node.js 20 or later
- Claude Code 2.1.259 or later
- a Claude.ai subscription login or supported Anthropic provider authentication

Check the prerequisites:

```bash
codex --version
node --version
claude --version
```

## Install into Codex

Add this repository as a Codex marketplace:

```bash
codex plugin marketplace add khankaholic/claude-code-for-codex
```

Install the plugin from that marketplace:

```bash
codex plugin add claude-code-for-codex@claude-code-for-codex
```

Start a new Codex session so Codex loads the installed skills. Then run:

```text
$cc-setup
```

`$cc-setup` checks the installed runtime. If the pinned Claude Agent SDK dependency is missing, it will ask before installing it in the plugin directory. It will not log in to Claude Code or expose authentication details.

If setup reports that Claude Code is not authenticated, complete that human-only step in your terminal:

```bash
claude auth login
```

Then start or continue a Codex session and run `$cc-setup` again.

## First test

From a repository you are comfortable sharing with Claude Code, start with a read-only request:

```text
$cc-review sonnet high - review my current changes
```

## Update

Refresh the marketplace snapshot and reinstall the plugin:

```bash
codex plugin marketplace upgrade claude-code-for-codex
codex plugin add claude-code-for-codex@claude-code-for-codex
```

Start a new Codex session after reinstalling.

## Uninstall

Remove the plugin:

```bash
codex plugin remove claude-code-for-codex@claude-code-for-codex
```

Optionally remove its marketplace source too:

```bash
codex plugin marketplace remove claude-code-for-codex
```

The plugin stores job history under `~/.codex/claude-code-for-codex/state/`. Uninstalling the plugin does not remove that history automatically.

## Install from a local checkout

For development, clone the repository, install its pinned dependency, and add the checkout as a local marketplace:

```bash
git clone https://github.com/khankaholic/claude-code-for-codex.git
cd claude-code-for-codex
npm ci --omit=dev
codex plugin marketplace add .
codex plugin add claude-code-for-codex@claude-code-for-codex
```

Run `node scripts/install.mjs --check` from the checkout to verify the runtime without changing it.

## Troubleshooting

- If Codex cannot find `$cc-setup`, confirm the plugin is installed with `codex plugin list`, then start a new session.
- If the Claude Agent SDK is missing, run `$cc-setup` and approve its offered runtime installation, or run `node scripts/install.mjs --install` from the installed plugin directory.
- If Claude Code is missing, install it using Anthropic's official instructions and rerun `$cc-setup`.
- If authentication is missing, run `claude auth login` yourself. Do not paste credentials into Codex or a delegated prompt.
