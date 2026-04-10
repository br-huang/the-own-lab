# packages/

Shared libraries importable by `apps/` or other `packages/`.

## Projects

| Name                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| ui                      | Shared UI component library (Lit, Storybook) |
| design                  | Design tokens and system                     |
| themes                  | Theme definitions                            |
| documentation-framework | Doc site framework                           |
| claude-company-of-one   | Claude Code agent orchestration plugin       |
| claude-statusline       | Claude Code statusline CLI renderer          |

## Rules

- Packages may depend on other packages. Never depend on `apps/`.
- `packages/ui` is the default shared UI library — add generic components here, not in apps.
- Documentation lives in `docs/projects/<package-name>/`, not here.
