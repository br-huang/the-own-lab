# Monorepo

## Architecture

```
apps/       → deployable (Astro, Electron, Tauri, Swift, Obsidian plugin)
packages/   → importable by apps/ or other packages/
scripts/    → standalone automation, not importable
learn/      → practice, experiments
docs/       → documentation (not a project)
```

Dependency: `apps/ → packages/`, `packages/ → packages/`. No `apps/ → apps/`.

New project placement: runs independently → `apps/`, importable → `packages/`, neither → `scripts/`, learning → `learn/`.

## Git

Trunk-based. `main` only long-lived branch. Feature branch: `type/project/desc`.

Commit format (enforced by lefthook + commitlint, will reject otherwise):

```
type(scope): description
```

- type: feat, fix, chore, refactor, docs, style, test, ci, perf, build
- scope: project name from `commitlint.config.js` (e.g., browser, claude-statusline, monorepo, deps)
- Commit after every meaningful change. Do not batch unrelated changes.

Subtree remotes (`sub/*`) exist for projects with independent GitHub repos. Check `git remote -v`.

## Commands

```bash
pnpm nx build <project>          # build one project
pnpm nx test <project>           # test one project
pnpm build                       # build all
pnpm test                        # test all
pnpm build:affected              # build only what changed
pnpm graph                       # dependency graph
pnpm projects                    # list all projects
pnpm add <pkg> --filter <proj>   # add dep to specific project
pnpm add -Dw <pkg>               # add dep to root
```

## Mandatory

1. Commit messages MUST be `type(scope): desc`. No exceptions.
2. Dependencies MUST be installed from root via `pnpm add --filter`. Never `cd` into a sub-project and run `npm install`.
3. Only ONE lockfile: root `pnpm-lock.yaml`. Delete any sub-project lockfiles on sight.
4. Every project MUST have `package.json` (JS/TS in pnpm workspace) or `project.json` (non-JS) to register with Nx.
5. New projects MUST be added to `commitlint.config.js` scope whitelist.
6. Language runtimes via `mise` only. No global installs.
7. Do not modify `nx.json`, `pnpm-workspace.yaml`, `lefthook.yml`, `commitlint.config.js` without understanding the blast radius.
