# UI Package Shared Component Usage

## Purpose

`packages/ui` is the shared component library for this monorepo. Apps and packages should consume it before creating app-local UI primitives.

## Design Principles

- Prefer importing from `ui` for shared primitives such as buttons, forms, overlays, layout navigation, and content presentation.
- Keep `packages/ui` focused on reusable building blocks rather than app-specific workflows.
- Favor semantic tokens from `src/styles/theme.css`; avoid hardcoded app colors in downstream projects.
- Add new shared primitives to `packages/ui` when the component would reasonably be reused across more than one app or package.

## Component Layers

### Layer 1: Shared primitives in `packages/ui`

Examples:

- form controls: `Button`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`, `Switch`, `Slider`, `InputOTP`
- overlays: `Dialog`, `AlertDialog`, `Sheet`, `Drawer`, `Popover`, `Tooltip`, `HoverCard`
- navigation: `Breadcrumb`, `Pagination`, `NavigationMenu`, `Menubar`, `Sidebar`, `Tabs`
- data display: `Card`, `Table`, `Accordion`, `Chart`, `Progress`, `Avatar`, `Badge`, `Skeleton`
- layout helpers: `Separator`, `ScrollArea`, `ResizablePanelGroup`, `AspectRatio`, `Carousel`

### Layer 2: App-level compositions in apps

Apps may create local components when they are:

- tied to app-specific routing or business entities
- composed from multiple shared primitives for a single screen or workflow
- unlikely to be reused outside that app

Examples:

- page-specific filters
- dashboard widgets bound to app data models
- custom wizards, import flows, or editor shells

## Consumption Rules

- Prefer `import { Button, Dialog, Sidebar } from "ui"` from the package entrypoint.
- Use `ui/components/<name>` only when a file-level import is specifically needed.
- Before adding a new app-local primitive, check whether an equivalent already exists in `packages/ui/src/components/ui/`.
- If a missing primitive is generic and reusable, add it to `packages/ui` first instead of duplicating it inside an app.

## Documentation Contract

When adding new shared components:

- update `packages/ui/src/index.ts`
- keep package dependencies declared in `packages/ui/package.json`
- add or update the relevant spec docs under `docs/projects/ui/specs/`
- validate with `pnpm nx run ui:typecheck` and `pnpm nx run ui:lint`
