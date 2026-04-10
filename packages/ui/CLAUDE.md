# UI Package

## Purpose

`packages/ui` is the monorepo shared component library. Prefer extending this package for reusable UI primitives instead of creating duplicates inside apps.

## Rules

- Export every shared component from `src/index.ts`
- Keep dependencies declared in `package.json`
- Use semantic tokens from `src/styles/theme.css`
- Keep components generic; app-specific business logic stays outside this package
- Validate with `pnpm nx run ui:typecheck` and `pnpm nx run ui:lint`

## When To Add Here

Add a component to `packages/ui` when it is:

- reusable across multiple apps or packages
- a shared primitive or shared composition
- part of the monorepo design language

Do not add it here when it is only a screen-specific workflow component.
