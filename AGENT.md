# Agent Rules

You are working in a Nx + pnpm monorepo. Read CLAUDE.md first.

## You MUST

- Commit after every meaningful change using `type(scope): desc` format
- Install deps from root: `pnpm add <pkg> --filter <project>`
- Run tasks via Nx: `pnpm nx build <project>`, not `cd apps/foo && npm run build`
- Register new projects with `project.json` (non-JS) or `package.json` (JS/TS) and add scope to `commitlint.config.js`
- Use `mise.toml` for language versions, not global installs
- Write all specs, ADRs, and issues in `docs/projects/<project>/` — read existing specs before modifying a project
- Start every new feature with `docs/projects/<project>/specs/YYYY-MM-DD-<slug>/REQUIREMENTS.md`
- Use exact file names: `REQUIREMENTS.md`, `DESIGN.md`, `PLAN.md`, `REVIEW.md`, `TEST.md` (uppercase)

## You MUST NOT

- Create lockfiles in sub-projects
- Import between apps (`apps/a` cannot depend on `apps/b`)
- Modify root config files (`nx.json`, `pnpm-workspace.yaml`, `lefthook.yml`) without explicit user approval
- Skip the commit hook or use `--no-verify`
- Create `docs/` directories inside `apps/`, `packages/`, or `scripts/` — all documentation goes in `docs/projects/`
