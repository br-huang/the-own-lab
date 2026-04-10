# Agent Rules

You are working in a Nx + pnpm monorepo. Read CLAUDE.md first.

## You MUST

- Commit after every meaningful change using `type(scope): desc` format
- Install deps from root: `pnpm add <pkg> --filter <project>`
- Run tasks via Nx: `pnpm nx build <project>`, not `cd apps/foo && npm run build`
- Register new projects with `project.json` (non-JS) or `package.json` (JS/TS) and add scope to `commitlint.config.js`
- Use `mise.toml` for language versions, not global installs
- Write all specs, ADRs, wiki, and issues in `docs/projects/<project>/` — read existing specs and wiki before modifying a project
- Start every new feature with `docs/projects/<project>/specs/YYYY-MM-DD-<slug>/REQUIREMENTS.md`
- Use exact file names: `REQUIREMENTS.md`, `DESIGN.md`, `PLAN.md`, `REVIEW.md`, `TEST.md` (uppercase)
- Issue files MUST have YAML frontmatter with `issue`, `status` (pending|processing|completed), `created_at`
- After completing a feature, distill learnings into `docs/projects/<project>/wiki/` as living documents
- Prefer `packages/ui` shared components before creating app-local UI primitives

## You MUST NOT

- Create lockfiles in sub-projects
- Import between apps (`apps/a` cannot depend on `apps/b`)
- Modify root config files (`nx.json`, `pnpm-workspace.yaml`, `lefthook.yml`) without explicit user approval
- Skip the commit hook or use `--no-verify`
- Create `docs/` directories inside `apps/`, `packages/`, or `scripts/` — all documentation goes in `docs/projects/`
- Use `git merge` to integrate feature branches — use `git rebase` then `git merge --ff-only`
- Use `git push --force` — use `--force-with-lease` only when absolutely necessary

## Shared UI Policy

- Check `packages/ui` first before building a new button, form control, overlay, navigation element, or layout primitive.
- If the component is generic and reusable, add it to `packages/ui` instead of duplicating it in an app.
- Keep app-local UI focused on business-specific composition and workflows.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
