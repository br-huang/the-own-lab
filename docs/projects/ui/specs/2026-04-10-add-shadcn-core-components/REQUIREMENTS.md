# UI Package Shadcn Core Components

## Context

The `packages/ui` project currently exposes only a minimal Shadcn-compatible setup with `Button`, theme tokens, and utility helpers. Downstream apps need the rest of the foundational Shadcn UI component set so they can build forms, overlays, navigation, and content layouts without recreating shared primitives locally.

## Goals

- Add the missing foundational Shadcn UI components that can be implemented with the existing `radix-ui` dependency and current theme tokens.
- Keep component APIs aligned with common Shadcn usage patterns so downstream apps can adopt them with low friction.
- Export all added components from the `ui` package entrypoint.
- Preserve compatibility with the existing Tailwind v4 token setup in `src/styles/theme.css`.

## Non-Goals

- Add data visualization, charts, carousels, drawers, OTP inputs, or date-picker style components that require additional third-party dependencies.
- Build app-specific composite widgets.
- Change root workspace configuration.

## Functional Requirements

- [ ] `packages/ui` exposes foundational display and form primitives, including at least:
  - `Accordion`
  - `Alert`
  - `Avatar`
  - `Badge`
  - `Card`
  - `Checkbox`
  - `Dialog`
  - `DropdownMenu`
  - `Input`
  - `Label`
  - `Popover`
  - `Select`
  - `Separator`
  - `Skeleton`
  - `Switch`
  - `Tabs`
  - `Textarea`
  - `Tooltip`
- [ ] Each component is implemented under `packages/ui/src/components/ui/`.
- [ ] Each component uses `cn()` and semantic theme tokens rather than hardcoded app-specific colors.
- [ ] Components that wrap Radix primitives preserve accessible defaults and forward props appropriately.
- [ ] `packages/ui/src/index.ts` exports all newly added components.

## Quality Requirements

- [ ] TypeScript typecheck passes for `packages/ui`.
- [ ] Lint passes for `packages/ui`.
- [ ] The implementation does not require changes to root Nx config, workspace config, or commitlint scopes.

## Constraints

- Use the existing `radix-ui` umbrella package where possible.
- Keep file edits scoped to `packages/ui` and project docs unless a package dependency must be added from the workspace root.
