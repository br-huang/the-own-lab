# Plan: Apply Shared UI Library (`packages/ui`)

## Implementation Order

The order below is chosen to establish the architecture first, then replace page primitives, then remove dead CSS. That reduces churn and avoids temporary mixed patterns.

---

## Phase 0: Prepare the Boundary

**Goal**: make the architectural rule explicit before implementation starts

### Step 0.1: Confirm dependency setup

```bash
pnpm add --filter the-own-lab ui
```

### Step 0.2: Create `src/components/ui/`

Introduce the app-local Astro primitive layer:

```
src/components/ui/
  Button.astro
  Card.astro
  Badge.astro
```

Optional:

```
src/components/ui/Separator.astro
```

### Step 0.3: Wrapper rules

Each wrapper must:

- reference the matching file in `packages/ui`
- keep variant names aligned where practical
- stay static and dependency-light
- avoid client runtime behavior

---

## Phase 1: Build Astro Primitive Wrappers

**Goal**: replace page-owned primitive styling with Astro components before touching page markup

### Step 1.1: Implement `Button.astro`

Support:

- `variant`
- `size`
- render as anchor or button
- pass-through `class`

Reference source:

- `packages/ui/src/components/ui/button.tsx`

### Step 1.2: Implement `Card.astro`

Choose one of these internal shapes:

1. single file with named slots
2. root plus subcomponents

Reference source:

- `packages/ui/src/components/ui/card.tsx`

### Step 1.3: Implement `Badge.astro`

Support:

- `variant`
- pass-through `class`

Reference source:

- `packages/ui/src/components/ui/badge.tsx`

### Step 1.4: Verify wrapper parity

Check that the wrappers match shared variant names and visual intent before replacing page markup.

---

## Phase 2: Replace Static Page Primitives

**Goal**: migrate Astro pages to the new primitive layer

### Step 2.1: Homepage

Update `src/pages/index.astro`:

- replace CTA links with Astro `Button`
- replace card markup with Astro `Card`

### Step 2.2: Blog index

Update `src/pages/blog/index.astro`:

- replace card markup with Astro `Card`
- replace tag markup with Astro `Badge`

### Step 2.3: Portfolio index

Update `src/pages/portfolio/index.astro`:

- replace card markup with Astro `Card`
- replace tag and status markup with Astro `Badge`

### Step 2.4: Docs landing

Update `src/pages/docs/index.astro`:

- replace CTA markup with Astro `Button`

### Step 2.5: Docs pagination

Create `src/components/docs/DocsPagination.astro` using Astro `Button`.

Requirements:

- previous link
- next link
- page position indicator

Then update `DocsLayout.astro` to use it and remove `src/components/docs/Pagination.astro`.

---

## Phase 3: Replace Interactive Docs UI

**Goal**: move docs interaction surfaces onto shared React primitives

### Step 3.1: Sidebar

Create `src/components/docs/DocsSidebar.tsx`.

Replace:

- `Sidebar.astro`
- `SidebarSection.astro`
- `MobileNav.tsx`

Use:

- shared Sidebar primitives
- fixed desktop sidebar
- Sheet-backed mobile behavior

Update `src/layouts/DocsLayout.astro` so the sidebar system is owned by a single island.

### Step 3.2: Search

Refactor `src/components/docs/Search.tsx` to use shared `Command` primitives.

Keep:

- Pagefind lazy loading
- inline interaction pattern
- title and excerpt rendering

### Step 3.3: Theme toggle

Refactor `src/components/site/ThemeToggle.tsx` to use shared React `Button`.

Keep:

- local storage logic
- system preference sync
- current icon semantics

---

## Phase 4: Clean CSS

**Goal**: remove obsolete primitive styling once all consumers are migrated

### Step 4.1: Remove page primitive classes

Delete obsolete primitive styles from `src/styles/base.css`:

- `.site-card*`
- `.button-*`
- `.blog-tag`
- `.portfolio-tag`
- `.portfolio-status-badge`

### Step 4.2: Remove docs legacy primitive classes

Delete old docs classes only after replacement is complete:

- legacy sidebar styles
- mobile nav styles
- old search styles
- old pagination primitive styles

### Step 4.3: Verify references

Search `src/` for removed class names and confirm no active markup still depends on them.

---

## Phase 5: Verification

**Goal**: confirm architecture, behavior, and visual stability

### Step 5.1: Build

```bash
pnpm nx build the-own-lab
```

### Step 5.2: Functional checks

Verify:

- docs sidebar opens correctly on mobile
- docs sidebar active state is correct
- docs search still works after production build
- theme toggle still updates the document theme
- pagination previous/next links and page position are correct

### Step 5.3: Visual checks

Verify in light and dark themes:

- homepage cards and CTAs
- blog tags and cards
- portfolio cards, tags, and status badges
- docs sidebar, search, and pagination

---

## Commit Strategy

Use separate meaningful commits:

1. `docs(the-own-lab): update shared ui refactor spec`
2. `refactor(the-own-lab): add astro ui primitives`
3. `refactor(the-own-lab): migrate static page primitives`
4. `refactor(the-own-lab): rebuild docs ui on shared primitives`
5. `refactor(the-own-lab): remove legacy primitive styles`

The exact split can change if implementation reveals a cleaner boundary, but each commit should preserve architectural clarity and reviewability.
