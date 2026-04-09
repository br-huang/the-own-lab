# Agent Rules for Monorepo

These rules apply to all AI agents (Claude Code, subagents, Codex) working in this workspace.

## Critical Rules

1. **Never install dependencies in sub-projects directly.** Always run `pnpm add` from the root with filter:
   ```bash
   pnpm add <pkg> --filter <project-name>    # add to specific project
   pnpm add -Dw <pkg>                        # add to root devDependencies
   ```

2. **Never create lockfiles in sub-projects.** Only root `pnpm-lock.yaml` exists. If you see `package-lock.json` or sub-level `pnpm-lock.yaml`, delete them.

3. **Commit messages must follow Conventional Commits.** lefthook will reject non-conforming messages:
   ```
   type(scope): description
   ```
   Valid scopes are listed in `commitlint.config.js`. When adding a new project, add its scope there too.

4. **When creating a new project**, you must:
   - Create `project.json` (for non-JS) or `package.json` (for JS/TS in `apps/` or `packages/`)
   - Add the project name to `commitlint.config.js` scope whitelist
   - Verify with `pnpm nx show projects` that it's detected

5. **Respect dependency direction:**
   - `apps/` → `packages/` (allowed)
   - `packages/` → `packages/` (allowed)
   - `apps/` → `apps/` (forbidden)
   - `scripts/`, `learn/` → independent

6. **Use Nx for task execution**, not direct tool invocation:
   ```bash
   pnpm nx build <project>      # not: cd apps/foo && npm run build
   pnpm nx test <project>       # not: cd apps/foo && npm test
   pnpm nx run-many -t build    # build everything
   pnpm nx affected -t test     # test only what changed
   ```

7. **Non-JS projects use `project.json`** to register with Nx. Define `command`, `inputs`, `outputs`, and `cache` for each target.

8. **Language toolchains are managed by mise.** Do not install Node/Python/Go/Rust globally or via brew. Use `mise.toml` at root or per-project level.

9. **Subtree projects have independent remotes.** When modifying `apps/obsidian-second-brain`, `packages/claude-company-of-one`, or `packages/claude-statusline`, be aware they may need to be pushed to their original repos separately via `git subtree push`.

10. **Do not modify root config files without understanding impact:**
    - `nx.json` — affects all project caching and task defaults
    - `pnpm-workspace.yaml` — affects which projects pnpm manages
    - `commitlint.config.js` — affects commit validation
    - `lefthook.yml` — affects git hooks
    - `.gitignore` — affects what gets tracked

## Project Structure Reference

| Directory | Purpose | pnpm workspace | Nx detected via |
|-----------|---------|---------------|-----------------|
| `apps/*` | Deployable applications | Yes | `package.json` or `project.json` |
| `packages/*` | Shared/publishable modules | Yes | `package.json` or `project.json` |
| `scripts/*` | Automation, tools, templates | No | `project.json` |
| `learn/*` | Learning, experiments | No | `project.json` |
| `docs/` | Documentation | No | Not a project |
