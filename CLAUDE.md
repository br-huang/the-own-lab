# Monorepo

## Architecture

```
apps/             → deployable (Astro, Electron, Tauri, Swift, Obsidian plugin)
packages/         → importable by apps/ or other packages/
scripts/          → standalone automation, not importable
learn/            → practice, experiments
docs/             → single source of truth for all documentation
  docs/projects/  → project management (specs, ADR, issues) per project
  docs/knowledge/ → domain knowledge base
  docs/inbox/     → unsorted notes
  docs/assets/    → PDFs, images
```

Dependency: `apps/ → packages/`, `packages/ → packages/`. No `apps/ → apps/`.

New project placement: runs independently → `apps/`, importable → `packages/`, neither → `scripts/`, learning → `learn/`.

## Documentation (docs/projects/)

`docs/projects/` is the single source of truth for all project management artifacts. Never create `docs/` inside sub-projects.

```
docs/projects/<project-name>/
├── specs/                          ← feature specifications
│   └── YYYY-MM-DD-<slug>/         ← one directory per feature
│       ├── REQUIREMENTS.md
│       ├── DESIGN.md
│       ├── PLAN.md
│       ├── REVIEW.md              ← optional
│       └── TEST.md                ← optional
├── adr/                            ← architecture decision records
│   └── NNN-<title>.md
└── issues/                         ← bug tracking, investigations
    └── NNN-<title>.md
```

Rules:
- Spec directory name: `YYYY-MM-DD-<verb>-<feature-slug>` (e.g., `2026-04-09-add-dark-mode`)
- File names are UPPERCASE: `REQUIREMENTS.md`, `DESIGN.md`, `PLAN.md`, `REVIEW.md`, `TEST.md`
- ADR naming: `001-chose-electron-over-tauri.md` (zero-padded, past tense verb)
- Issue naming: `001-tab-crash-on-close.md` (zero-padded, descriptive)
- Every new feature MUST start with a spec under `docs/projects/<project>/specs/`
- Read existing specs before modifying a project: `ls docs/projects/<project>/specs/`

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

## Mandatory

1. Commit messages MUST be `type(scope): desc`. No exceptions.
2. Dependencies MUST be installed from root via `pnpm add --filter`. Never `cd` into a sub-project and run `npm install`.
3. Only ONE lockfile: root `pnpm-lock.yaml`. Delete any sub-project lockfiles on sight.
4. Every project MUST have `package.json` (JS/TS in pnpm workspace) or `project.json` (non-JS) to register with Nx.
5. New projects MUST be added to `commitlint.config.js` scope whitelist.
6. Language runtimes via `mise` only. No global installs.
7. Do not modify `nx.json`, `pnpm-workspace.yaml`, `lefthook.yml`, `commitlint.config.js` without understanding the blast radius.
8. All specs, ADRs, and issues MUST live in `docs/projects/<project>/`. Never create `docs/` inside `apps/`, `packages/`, or `scripts/`.
9. Every new feature MUST have a spec directory in `docs/projects/<project>/specs/YYYY-MM-DD-<slug>/` with at minimum `REQUIREMENTS.md`.
10. Always use `pnpm` to run the commands
