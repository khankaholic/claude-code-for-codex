# Agent instructions

This repository is a Codex plugin. Claude Code is a local runtime used by the plugin; do not use Claude Code's plugin installer or create `.claude-plugin` files.

When asked to install this plugin into Codex, follow [docs/INSTALL_AGENT.md](docs/INSTALL_AGENT.md). Keep installation idempotent, use Codex's plugin commands instead of editing Codex configuration files, and never perform Claude authentication for the user.

For repository changes, preserve the existing safety boundaries in the skills and companion runtime. Run `npm test` and the plugin and skill validators before claiming a change is complete.
