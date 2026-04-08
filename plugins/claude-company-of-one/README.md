# Company of One for Codex

This plugin package is a thin Codex wrapper around the repo's shared assets.

- `agents/`, `commands/`, `rules/`, `skills/`, and `templates/` should point back to the repo root so Claude Code and Codex use the same source of truth.
- `hooks.json` is Codex-specific and calls the shared shell scripts through `./scripts/`.
- Shared hook logic lives under `../../hooks/scripts/` and resolves runtime storage through `COMPANY_OF_ONE_PLUGIN_*` variables with Claude and Codex fallbacks.
