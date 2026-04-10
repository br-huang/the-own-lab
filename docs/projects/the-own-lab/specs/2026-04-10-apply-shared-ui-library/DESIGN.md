# Design: Apply Shared UI Library (`packages/ui`)

## Architecture Overview

```
packages/ui
  ├── source of truth for visual rules, variants, class composition
  └── direct runtime dependency for interactive React primitives

apps/the-own-lab
  ├── src/components/ui/*.astro      ← Astro primitive wrappers for static use
  ├── src/components/docs/*.tsx      ← interactive React islands using shared ui
  ├── src/components/site/*          ← site composition and branding
  ├── src/layouts/*.astro            ← Astro-first page structure
  └── src/pages/*.astro              ← Astro-first content pages
```

This design deliberately avoids two failure modes:

1. Rendering static page primitives by directly importing React primitives into many Astro templates
2. Rebuilding the entire shared design system as Astro components inside the app

The boundary is narrower and more maintainable:

- **Astro wrappers** for `Button`, `Card`, and `Badge`
- **Shared React runtime** for `Sidebar`, `Command`, and interactive button usage in islands

---

## Design Principles

### 1. `packages/ui` Stays the Source of Truth

`packages/ui` remains the canonical reference for:

- variant names
- semantic class choices
- token usage
- spacing, radius, border, and shadow conventions

The Own Lab may implement a thin Astro wrapper when the primitive is static, but it should not invent a separate API or visual language.

### 2. Astro Owns Static Composition

The site is content-heavy and Astro-native. Static cards, badges, links, and pagination should stay in Astro so the templates remain easy to reason about and hydration stays minimal.

### 3. React Owns Interactivity

Any primitive that depends on one of the following should stay in shared React form:

- state
- keyboard navigation
- overlay behavior
- context providers
- mobile/desktop responsive interaction logic

This includes `Sidebar`, `Sheet`, and `Command`.

---

## Primitive Strategy

### Astro Primitive Wrappers

Create app-local Astro primitives under `src/components/ui/`:

```
src/components/ui/
  ├── Button.astro
  ├── Card.astro
  ├── Badge.astro
  └── Separator.astro   (only if needed)
```

Each wrapper should:

- reference the corresponding file in `packages/ui`
- keep variant names aligned where practical
- use the same semantic utility classes and token assumptions
- stay intentionally small and app-focused

Each file should include a short comment indicating the shared reference source, for example:

```astro
--- 
// Reference: packages/ui/src/components/ui/button.tsx
---
```

### React Shared Primitives

Use shared React components directly for:

- `DocsSidebar.tsx`
- `Search.tsx`
- `ThemeToggle.tsx`

This preserves behavior and avoids reimplementing interactive logic in Astro.

---

## Component Mapping

### 1. Docs Sidebar

**Current**

- `Sidebar.astro`
- `SidebarSection.astro`
- `MobileNav.tsx`

**Target**

- `DocsSidebar.tsx` as one island that consumes shared Sidebar primitives

**Shared primitives used**

- `SidebarProvider`
- `Sidebar`
- `SidebarContent`
- `SidebarGroup`
- `SidebarGroupLabel`
- `SidebarMenu`
- `SidebarMenuItem`
- `SidebarMenuButton`
- `SidebarMenuSub`
- `SidebarMenuSubItem`
- `SidebarMenuSubButton`
- shared Sheet behavior via the Sidebar implementation

**Why React here**

- open/close state
- responsive mobile overlay behavior
- nested navigation interactivity

**Desktop behavior**

- fixed left sidebar
- `variant="sidebar"`

**Mobile behavior**

- sheet-style overlay

### 2. Docs Search

**Current**

- hand-rolled input and result panel

**Target**

- keep `Search.tsx`
- switch rendering to shared `Command` primitives

**Why React here**

- Pagefind lazy loading
- input state
- keyboard navigation
- focus and result list behavior

**Interaction decision**

- inline dropdown behavior remains
- no modal command dialog

### 3. Theme Toggle

**Current**

- custom button with local classes

**Target**

- preserve theme logic
- render the control using shared React `Button`

**Why React here**

- click handling
- local state updates
- system preference syncing

### 4. Astro Button

**Current**

- `.button-primary`
- `.button-ghost`
- `.button-secondary`

**Target**

- `src/components/ui/Button.astro`

**Required API**

- `variant`
- `size`
- render as `<button>` or `<a>`
- pass-through classes

**Design note**

This is not a generic replacement for every future button pattern. It is a narrow wrapper for the site's static button use cases while aligning with the shared Button API.

### 5. Astro Card

**Current**

- `.site-card*` classes rendered directly in pages

**Target**

- `src/components/ui/Card.astro`

**Required structure**

- root
- header
- title
- description
- content
- footer if needed

This can be implemented either as:

- one component with named slots, or
- several small Astro subcomponents under `src/components/ui/card/`

The key requirement is not the internal file split. The key requirement is that pages stop owning raw primitive card styling.

### 6. Astro Badge

**Current**

- `.blog-tag`
- `.portfolio-tag`
- `.portfolio-status-badge`

**Target**

- `src/components/ui/Badge.astro`

**Required API**

- `variant`
- pass-through classes

### 7. Docs Pagination

**Current**

- `Pagination.astro` with local primitive styling

**Target**

- `DocsPagination.astro` using Astro `Button`

**Behavior**

- previous link
- next link
- page position indicator in the middle

This stays Astro because it has no client-side behavior.

---

## Dependency Flow

```
themes/*.css
  → base.css token bridge
    → shared semantic utility choices
      → Astro wrappers and shared React primitives
        → pages and layouts
```

The visual consistency comes from token alignment plus shared class semantics, not from forcing every page primitive through a React runtime.

---

## Hydration Strategy

| Component | Runtime | Reason |
|---|---|---|
| `DocsSidebar.tsx` | `client:load` | immediate navigation and mobile interaction |
| `Search.tsx` | `client:visible` | interactive search behavior |
| `ThemeToggle.tsx` | `client:load` | immediate theme switching |
| `TableOfContents.tsx` | `client:visible` | existing behavior remains |
| Astro `Button` / `Card` / `Badge` | none | static primitive rendering |
| `DocsPagination.astro` | none | static links only |

---

## CSS Cleanup Strategy

Remove CSS that existed only because pages owned primitive styling directly.

### Remove After Wrapper Adoption

- `.site-card*`
- `.button-primary`
- `.button-ghost`
- `.button-secondary`
- `.blog-tag`
- `.portfolio-tag`
- `.portfolio-status-badge`

### Remove After Interactive Replacement

- old docs sidebar classes
- old docs mobile nav classes
- old docs search classes
- old pagination primitive classes that are superseded

### Keep

- layout shell classes
- prose/content classes
- section layout classes
- visualization and demo styles
- token bridge and theme definitions

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Astro wrappers drift from shared UI over time | consistency erosion | keep wrapper API narrow and document shared source file references |
| Too many Astro wrappers are added | accidental parallel design system | restrict wrappers to static primitives only |
| Shared interactive components pull in runtime cost | bundle increase | use them only for actual interaction surfaces |
| Mixed ownership becomes unclear again | architecture drift | enforce rule: pages import Astro primitives, islands import shared React primitives |

---

## Decision Summary

- Use `packages/ui` as the design and behavior reference layer
- Recreate only static primitives as Astro wrappers
- Consume interactive shared primitives directly in React islands
- Keep Astro pages and layouts mostly free of direct React primitive imports
