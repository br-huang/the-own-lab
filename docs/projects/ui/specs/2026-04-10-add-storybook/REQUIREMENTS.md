# UI Package Storybook

## Context

`packages/ui` now contains a large shared component surface area. The package needs a dedicated showcase and isolated development environment so engineers can discover components, preview behavior, and verify theme consistency without booting a full app.

## Goals

- Add Storybook for `packages/ui`
- Make Storybook the default local showcase for shared UI primitives
- Load the shared theme styles so components render with the same tokens used in apps
- Establish a small set of initial stories that prove the setup works across representative component categories

## Non-Goals

- Exhaustively document every component in this first pass
- Deploy Storybook publicly
- Replace app-specific integration testing

## Functional Requirements

- [ ] Storybook can run for `packages/ui` from the monorepo root
- [ ] Storybook uses the shared `ui/styles/theme.css`
- [ ] Storybook supports light and dark theme preview
- [ ] Storybook includes initial stories for representative components such as:
  - `Button`
  - `Input`
  - `Dialog`
  - `Sidebar`
  - `Table`
- [ ] Storybook configuration and stories live in or alongside `packages/ui`
- [ ] The setup follows monorepo conventions and uses Nx-compatible tasks where practical

## Quality Requirements

- [ ] `pnpm nx run ui:typecheck` passes after setup
- [ ] `pnpm nx run ui:lint` passes after setup
- [ ] Storybook startup configuration is committed and reproducible from a clean checkout

## Constraints

- Prefer a standard Storybook setup over a custom showcase app
- Do not modify root workspace config unless required and justified
