# Agent installation contract

Use this procedure when a user asks an agent to install this repository as a Codex plugin.

## Boundaries

- The target is Codex, not Claude Code's plugin system.
- Do not run Claude Code `/plugin` commands or create `.claude-plugin` files.
- Do not edit `~/.codex/config.toml` or marketplace JSON by hand.
- Do not install or upgrade Codex, Node.js, or Claude Code globally unless the user explicitly requests it.
- Never perform `claude auth login`, request credentials, or print tokens, account identity, or organization details. Ask the human to authenticate when necessary.
- Do not delete plugin state under `~/.codex/claude-code-for-codex/` during install or upgrade.

## Procedure

1. Check `codex --version`, `node --version`, and `claude --version`. Stop with a precise prerequisite message if Codex is unavailable or Node.js is older than 20.
2. Inspect `codex plugin marketplace list`. If the `claude-code-for-codex` marketplace is absent, run:

   ```bash
   codex plugin marketplace add khankaholic/claude-code-for-codex --json
   ```

   If it is already present, refresh it instead:

   ```bash
   codex plugin marketplace upgrade claude-code-for-codex
   ```

3. Install or reinstall the plugin with structured output:

   ```bash
   codex plugin add claude-code-for-codex@claude-code-for-codex --json
   ```

4. Resolve the installed plugin root from the successful Codex result or `codex plugin list`. Do not guess a cache path.
5. Run the plugin-local readiness check:

   ```bash
   node <plugin-root>/scripts/install.mjs --check --json
   ```

6. If and only if the report says `agentSdk.available` is false, tell the user that the plugin needs its pinned local npm dependency. After the user approves, run:

   ```bash
   node <plugin-root>/scripts/install.mjs --install --json
   ```

7. Run the check again. If `auth.loggedIn` is false, ask the user to run `claude auth login` in their own terminal, then rerun the check after they confirm.
8. Report the verified component statuses and tell the user to start a new Codex session. Do not claim the skills are loaded in the current session.

## Success criteria

Installation is complete only when:

- the marketplace is configured;
- Codex reports the plugin installed;
- Node.js is supported;
- the Claude Code CLI is available;
- the Claude Agent SDK can be imported; and
- Claude Code reports an authenticated session.

Return a compact summary containing the plugin name and component statuses. Authentication output must be reduced to `ready` or `action_required`.
