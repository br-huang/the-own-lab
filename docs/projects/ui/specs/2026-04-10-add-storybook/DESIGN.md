# UI Storybook Design

## Decision

Use Storybook as the official showcase and isolated development environment for `packages/ui`.

## Why Storybook

- The shared UI library is large enough that discoverability is now a real problem.
- Storybook provides a standard workflow for previewing shared primitives in isolation.
- It supports theme validation, future docs expansion, and common team onboarding patterns.

## Scope

This first pass includes:

- Nx Storybook integration for `packages/ui`
- shared theme CSS loading
- theme toolbar for light and dark mode preview
- initial stories for representative components

This first pass does not include:

- exhaustive stories for all components
- public deployment
- visual regression tooling

## Configuration Shape

- Workspace-level Storybook support is enabled through `@nx/storybook`
- `packages/ui/.storybook/` contains package-local Storybook config
- `packages/ui/tsconfig.storybook.json` isolates Storybook story compilation from the library build
- stories live under `packages/ui/src/stories/`

## Initial Story Coverage

The initial stories should prove Storybook works for:

- basic controls: `Button`
- form primitives: `Input`, `Textarea`
- overlays: `Dialog`
- navigation shell: `Sidebar`
- data display: `Table`

## Theme Strategy

- Load `packages/ui/src/styles/theme.css` inside Storybook preview
- Expose a toolbar toggle for `light` and `dark`
- Wrap all stories in a themed background container so visual inspection is consistent

## Follow-Up Work

- add stories for more components incrementally
- add MDX or autodocs for usage guidance
- consider visual regression or hosted Storybook later
