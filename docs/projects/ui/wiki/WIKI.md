# UI Wiki

## Overview

`packages/ui` is the shared UI component package for this monorepo.

Use it as the default source for reusable UI primitives before creating app-local components.

## Import Rules

- Prefer package entrypoint imports:

```ts
import { Button, Dialog, Sidebar, Table } from 'ui';
```

- Use file-level imports only when necessary:

```ts
import { Button } from 'ui/components/button';
```

- Import shared styles from:

```ts
import 'ui/styles/theme.css';
```

## When To Use `packages/ui`

Add or use a component here when it is:

- generic and reusable across apps
- part of the shared design language
- a primitive or shared composition
- not tied to one app's business workflow

Keep components out of `packages/ui` when they are:

- page-specific
- workflow-specific
- tightly coupled to one app's route, data model, or business logic

## Current Component Coverage

### Core

- `Accordion`
- `Alert`
- `AlertDialog`
- `AspectRatio`
- `Avatar`
- `Badge`
- `Breadcrumb`
- `Button`
- `Card`
- `Checkbox`
- `Collapsible`
- `Input`
- `InputOTP`
- `Label`
- `Pagination`
- `Progress`
- `RadioGroup`
- `ResizablePanelGroup`
- `Select`
- `Separator`
- `Skeleton`
- `Slider`
- `Switch`
- `Table`
- `Tabs`
- `Textarea`
- `Toggle`
- `ToggleGroup`

### Overlay and Feedback

- `Dialog`
- `Drawer`
- `HoverCard`
- `Popover`
- `Sheet`
- `Toaster`
- `Tooltip`

### Navigation and Layout

- `ContextMenu`
- `DropdownMenu`
- `Menubar`
- `NavigationMenu`
- `ScrollArea`
- `Sidebar`

### Data and Advanced

- `Calendar`
- `Carousel`
- `Chart`
- `Command`
- `DatePicker`
- `Form`

## Recommended Workflow For New Shared UI

1. Check whether the component already exists in `packages/ui/src/components/ui/`.
2. If missing and reusable, add it to `packages/ui`.
3. Export it from `packages/ui/src/index.ts`.
4. Declare required dependencies in `packages/ui/package.json`.
5. Update docs under `docs/projects/ui`.
6. Validate with:

```bash
pnpm nx run ui:typecheck
pnpm nx run ui:lint
```

## Shared UI Policy

- Prefer extending the shared library over cloning primitives into apps.
- Favor semantic theme tokens from `ui/styles/theme.css`.
- Keep app-local UI focused on composition and business behavior.
- If a component will likely be reused by more than one app, it belongs in `packages/ui`.
