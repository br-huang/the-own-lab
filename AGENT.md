# Agent Rules

You are working in a Nx + pnpm monorepo. Read CLAUDE.md first.

## You MUST

- Commit after every meaningful change using `type(scope): desc` format
- Install deps from root: `pnpm add <pkg> --filter <project>`
- Run tasks via Nx: `pnpm nx build <project>`, not `cd apps/foo && npm run build`
- Register new projects with `project.json` (non-JS) or `package.json` (JS/TS) and add scope to `commitlint.config.js`
- Use `mise.toml` for language versions, not global installs

## You MUST NOT

- Create lockfiles in sub-projects
- Import between apps (`apps/a` cannot depend on `apps/b`)
- Modify root config files (`nx.json`, `pnpm-workspace.yaml`, `lefthook.yml`) without explicit user approval
- Skip the commit hook or use `--no-verify`
