# scripts/

Standalone automation and utilities. Not importable by other projects.

## Projects

| Name                 | Purpose                              |
| -------------------- | ------------------------------------ |
| api                  | API utilities                        |
| application-activator| macOS app activation helper          |
| claude-cleaner       | Claude artifact cleanup              |
| claude-path-migrator | Claude config path migration         |
| react-starter        | React project scaffolding generator  |

## Rules

- Scripts run independently. They are not imported by `apps/` or `packages/`.
- Install dependencies from root: `pnpm add --filter <name> <pkg>`.
- Documentation lives in `docs/projects/<script-name>/`, not here.
