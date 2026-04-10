# Feature: Apply Shared UI Library (`packages/ui`)

## Summary

Refactor The Own Lab to align with `packages/ui` as the monorepo's shared UI source of truth while keeping the Astro architecture clean.

The implementation strategy is intentionally split into two layers:

- **Static primitives in Astro**: create app-local Astro wrappers for low-complexity, non-interactive primitives by referencing the API, variants, and class structure from `packages/ui`
- **Interactive primitives in React**: consume `packages/ui` React components directly only where client-side state, keyboard handling, overlays, or context are required

This preserves Astro-first rendering for content pages without drifting away from the shared design system.

This spec depends on:
- Session 1–2 complete (Docs framework scaffold)
- Session 3 token architecture complete (`src/styles/themes/*.css` + `src/styles/base.css`)
- `packages/ui` available with the current design-system primitives and utility patterns

---

## Acceptance Criteria

### Architectural Boundary

- [ ] `packages/ui` remains the visual and API reference for shared primitives
- [ ] Astro pages and layouts do not directly render React `Card`, `Button`, or `Badge` primitives from `packages/ui`
- [ ] New app-local Astro primitives are created under `src/components/ui/` only for static, non-interactive use cases
- [ ] Interactive features continue to use React islands and may directly consume `packages/ui`
- [ ] The resulting architecture is explicit: `.astro` for static composition, `.tsx` for interactive behavior

### Dependency Setup

- [ ] `ui` is added as a workspace dependency of `the-own-lab` via `pnpm add --filter the-own-lab ui`
- [ ] All required dependencies for interactive shared primitives resolve without errors
- [ ] No local duplicate of the shared `cn()` utility is introduced

### Astro Primitive Layer

#### Button

- [ ] `src/components/ui/Button.astro` is created as an Astro primitive wrapper
- [ ] The wrapper API mirrors the shared `Button` shape where practical: `variant`, `size`, and link/button rendering
- [ ] The wrapper styling is derived from `packages/ui/src/components/ui/button.tsx`
- [ ] Homepage hero CTA and docs landing CTA use the Astro `Button`
- [ ] Existing `.button-primary`, `.button-ghost`, and `.button-secondary` classes are removed from page markup

#### Card

- [ ] `src/components/ui/Card.astro` is created with composable subcomponents or slots matching current page needs
- [ ] The wrapper styling is derived from `packages/ui/src/components/ui/card.tsx`
- [ ] Homepage cards, blog listing cards, and portfolio cards use the Astro `Card`
- [ ] Existing `.site-card*` classes are removed from page markup

#### Badge

- [ ] `src/components/ui/Badge.astro` is created as an Astro primitive wrapper
- [ ] The wrapper styling is derived from `packages/ui/src/components/ui/badge.tsx`
- [ ] Blog tags, portfolio tags, and portfolio status badges use the Astro `Badge`
- [ ] Existing `.blog-tag`, `.portfolio-tag`, and `.portfolio-status-badge` classes are removed from page markup

#### Optional Follow-up Primitive

- [ ] `src/components/ui/Separator.astro` is only added if this refactor needs it

### Interactive Shared UI

#### Docs Sidebar System

- [ ] `src/components/docs/Sidebar.astro` is deleted
- [ ] `src/components/docs/SidebarSection.astro` is deleted
- [ ] `src/components/docs/MobileNav.tsx` is deleted
- [ ] New React component `src/components/docs/DocsSidebar.tsx` wraps the shared Sidebar system
- [ ] Desktop uses the fixed `sidebar` variant
- [ ] Mobile uses the shared Sheet-backed sidebar behavior
- [ ] Active link highlighting and section expand/collapse behavior are preserved

#### Docs Search

- [ ] `src/components/docs/Search.tsx` is refactored to use shared `Command` primitives
- [ ] Search stays inline, not modal
- [ ] Pagefind lazy-loading logic is preserved
- [ ] Search results still show title and excerpt

#### Theme Toggle

- [ ] `src/components/site/ThemeToggle.tsx` keeps its existing theme logic
- [ ] The rendered control uses the shared React `Button` primitive because it is already an interactive island
- [ ] Icon behavior and accessibility labels remain correct

### Docs Pagination

- [ ] `src/components/docs/Pagination.astro` is deleted
- [ ] New Astro component `src/components/docs/DocsPagination.astro` uses the Astro `Button` wrapper
- [ ] "Previous" / "Next" eyebrow labels and page titles are preserved
- [ ] A page position indicator is displayed (for example `3 / 12`)

### CSS Cleanup

- [ ] `base.css` removes primitive-specific legacy classes that are replaced by Astro wrappers or shared interactive primitives
- [ ] Legacy page primitive classes are no longer referenced from markup:
  - `.site-card`, `.site-card-meta`, `.site-card-title`, `.site-card-text`, `.site-card-link`
  - `.button-primary`, `.button-ghost`, `.button-secondary`
  - `.blog-tag`, `.portfolio-tag`, `.portfolio-status-badge`
  - `.theme-toggle`, `.theme-toggle-icon`, `.theme-toggle-label` if fully superseded
- [ ] Docs search and sidebar legacy classes are removed only after replacement markup no longer depends on them
- [ ] Layout and content classes that are still structurally useful remain in place

### Preserved Components and Logic

- [ ] `src/components/site/Navbar.astro` keeps its structural role
- [ ] `src/components/site/Footer.astro` remains unchanged
- [ ] `src/components/docs/TableOfContents.tsx` remains behaviorally unchanged
- [ ] `src/lib/sidebar.ts` remains the source of sidebar tree data
- [ ] `src/lib/theme.ts` remains the source of theme initialization logic
- [ ] `src/styles/themes/*.css` remain unchanged unless a token mismatch is discovered
- [ ] Content collections and page content are unchanged

### Build and Verification

- [ ] `pnpm nx build the-own-lab` passes
- [ ] Pagefind still indexes the generated docs output
- [ ] The site renders correctly in both light and dark themes
- [ ] Interactive islands still work after the primitive refactor
- [ ] No visual regression is introduced in spacing, typography, color usage, or hierarchy

---

## Scope

### In Scope

- Adding `ui` as a dependency for `the-own-lab`
- Introducing an Astro primitive layer under `src/components/ui/`
- Replacing page-level legacy primitive markup with Astro wrappers
- Replacing interactive docs UI with shared React primitives where appropriate
- Deleting obsolete docs navigation and pagination files
- Cleaning legacy primitive CSS from `base.css`

### Out of Scope

- Modifying `packages/ui` source code
- Replatforming the site to full React
- Rewriting all shared primitives into Astro equivalents
- Redesigning layouts, content, or theme tokens
- Adding new product features unrelated to the UI layer refactor

---

## Constraints

- **Boundary discipline**: only non-interactive primitives may be reimplemented as Astro wrappers
- **No design drift**: Astro wrappers must follow the variant names, token usage, and class intent defined in `packages/ui`
- **No duplicate design system**: do not create Astro versions of complex interactive components such as `Sidebar`, `Command`, `Sheet`, or `Dialog`
- **Astro-first rendering**: static pages should remain mostly Astro-native and avoid unnecessary React SSR usage
- **Static build compatibility**: all React islands must work under the current static output model

---

## Files Affected

### Deleted

```
src/components/docs/Sidebar.astro
src/components/docs/SidebarSection.astro
src/components/docs/MobileNav.tsx
src/components/docs/Pagination.astro
```

### Created

```
src/components/ui/Button.astro
src/components/ui/Card.astro
src/components/ui/Badge.astro
src/components/docs/DocsSidebar.tsx
src/components/docs/DocsPagination.astro
```

Optional:

```
src/components/ui/Separator.astro
```

### Modified

```
package.json
src/layouts/DocsLayout.astro
src/pages/index.astro
src/pages/blog/index.astro
src/pages/portfolio/index.astro
src/pages/docs/index.astro
src/components/docs/Search.tsx
src/components/site/ThemeToggle.tsx
src/styles/base.css
```

---

## Resolved Design Decisions

- **Sidebar**: desktop uses the fixed `sidebar` variant; mobile uses Sheet-backed overlay behavior
- **Search**: use inline `Command`, not `CommandDialog`
- **Pagination**: use prev/next buttons plus a page position indicator
- **Primitive strategy**: static primitives are Astro wrappers; interactive primitives use shared React components directly
