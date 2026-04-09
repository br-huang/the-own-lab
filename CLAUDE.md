# Brian's Monorepo

## Directory Structure

```
~/Workspaces/
├── apps/           ← Deployable applications (Astro, Electron, Tauri, Swift, Obsidian plugin)
├── packages/       ← Reusable modules, publishable to npm or consumed by apps
├── scripts/        ← Automation scripts, CLI tools, templates (not importable)
├── learn/          ← Learning projects, exercises, experiments
├── docs/           ← Documentation, knowledge base, reference materials
```

### Where to put new projects

- Can it run/deploy independently? → `apps/`
- Can other projects import it? → `packages/`
- Neither? → `scripts/`
- Learning/practice? → `learn/`

### Dependency direction (strict)

```
apps/     → packages/
packages/ → packages/
apps/ ✗ apps/         (no cross-app dependency)
scripts/, learn/      (independent, no dependency graph)
```

## Toolchain

| Tool | Purpose | Config |
|------|---------|--------|
| Nx 22.6 | Task orchestration, caching, affected detection | `nx.json` |
| pnpm 10 | Package management, workspace linking | `pnpm-workspace.yaml` |
| mise | Multi-language runtime management (Node, Python, Go, Rust) | `mise.toml` |
| lefthook | Git hooks | `lefthook.yml` |
| commitlint | Conventional Commits enforcement | `commitlint.config.js` |

## Commit Convention (enforced by lefthook + commitlint)

```
type(scope): description
```

- **type**: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `ci`, `perf`, `build`
- **scope**: project directory name (e.g., `browser`, `claude-statusline`, `monorepo`)
- **examples**:
  - `feat(browser): add tab grouping`
  - `fix(obsidian-second-brain): handle empty vault`
  - `chore(deps): bump nx to 23.0`

Scope is required. Full whitelist is in `commitlint.config.js`.

## Git Strategy

- **Trunk-based**: `main` is the only long-lived branch
- **Feature branches**: `type/project/description` (e.g., `feat/browser/dark-mode`)
- **Tags**: path-scoped `apps/project/v1.0.0`
- **Subtree remotes**: projects with independent GitHub repos use `sub/*` remotes

### Subtree remotes

| Remote | GitHub | Prefix |
|--------|--------|--------|
| `sub/obsidian-second-brain` | `br-huang/obsidian-second-brain` | `apps/obsidian-second-brain` |
| `sub/claude-company-of-one` | `br-huang/Claude-company-of-one` | `packages/claude-company-of-one` |
| `sub/claude-statusline` | `br-huang/claude-best-statusline` | `packages/claude-statusline` |

Push to original repo: `git subtree push --prefix=<path> sub/<name> main`

## Project Registration

- JS/TS projects: `package.json` in `pnpm-workspace.yaml` glob paths → auto-detected by Nx
- Non-JS projects (Swift, Python, Rust, Bash): add `project.json` with name, tags, and targets
- Every project must have either `package.json` or `project.json` (or both)

## Multi-Language Projects

Each sub-project can have its own `.mise.toml` for language-specific versions. Root `mise.toml` sets global defaults. Nx manages tasks for all languages via `project.json` targets using shell commands (`swift build`, `cargo build`, `uv run pytest`, etc.).

## Common Commands

```bash
pnpm build                    # Build all projects
pnpm test                     # Test all projects
pnpm build:affected           # Build only changed projects
pnpm graph                    # Open Nx dependency graph
pnpm projects                 # List all registered projects
pnpm nx build <project>       # Build single project
pnpm nx test <project>        # Test single project
```
