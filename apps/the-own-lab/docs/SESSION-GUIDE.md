# Session Guide — Personal Brand Website

This document is the **single source of truth** for how work is split across three independent Claude Code sessions. Each session should read this file first to understand its scope, dependencies, and deliverables.

## Project Overview

A personal brand website with four sections: Index, Portfolio, Blog, and interactive Docs. Built with Astro 5.x, React 19, Tailwind CSS 4, TypeScript, deployed to Cloudflare Pages.

---

## Session Map

```
Session 1: Astro Scaffold        Session 2: Docs Framework        Session 3: Brand & Content
─────────────────────           ─────────────────────            ─────────────────────
Astro project init              Sidebar builder (_meta.ts)       Brand identity (name, colors)
Tailwind v4 config              TOC scroll-spy                   Design tokens → Tailwind theme
Content Collections schema      Pagination                       Dual theme (light/dark)
Shared types                    Search (Pagefind)                Page transitions & scroll anim
Sample MDX fixtures             CodePlayground (Sandpack)        Real content (Portfolio, Blog, Docs)
DocsLayout (3-column)           ParamDemo (render prop)          OG images, favicon, SEO meta
Sidebar/TOC/Pagination UI       AlgoVisualizer (step-through)    GA4 integration
Dynamic route [...slug]         Updated sample MDX content       Responsive polish
MobileNav                       Build pipeline (Pagefind)        Cloudflare Pages deploy
                                E2E verification
         │                                │                                │
         ▼                                ▼                                ▼
   Branch: feature/scaffold      Branch: feature/docs-framework   Branch: feature/brand-style
   Merges to: main               Merges to: main (after S1)      Merges to: main (after S1+S2)
```

---

## Session 1: Astro Scaffold (main)

### Goal
Set up the Astro project foundation that Session 2 and 3 build upon.

### Branch
`feature/scaffold`

### Specs
`docs/specs/2026-04-07-docs-framework/PLAN.md` — **Phase A (Steps 1–4) + Phase C (Steps 7–13)**

### Scope

| Do | Don't |
|----|-------|
| Initialize Astro 5.x project with pnpm | Install Starlight or any docs framework |
| Configure `@astrojs/mdx`, `@astrojs/react`, `@tailwindcss/vite` | Create `tailwind.config.js` (Tailwind v4 uses CSS config) |
| Create `src/content.config.ts` with `glob()` loader | Use the old `src/content/config.ts` or `type: "content"` |
| Create `src/types/docs.ts` (all shared type definitions) | Add any interactive component logic |
| Create sample MDX fixtures (getting-started, algorithms/binary-search) — **without interactive components** | Import CodePlayground/ParamDemo/AlgoVisualizer |
| Create `_meta.ts` files for sidebar config | Fill in real content |
| Implement `src/lib/sidebar.ts` (tree builder) and `src/lib/toc.ts` | Add brand colors, fonts, or design tokens |
| Build DocsLayout.astro (3-column: Sidebar, Content, TOC) | Implement dark mode |
| Build Sidebar.astro, SidebarSection.astro, Pagination.astro | |
| Build TableOfContents.tsx, Search.tsx, MobileNav.tsx (React islands) | |
| Build `pages/docs/[...slug].astro` and `pages/docs/index.astro` | |
| Create `src/styles/global.css` with temporary prose styles | |

### Deliverables
- Runnable Astro project: `pnpm run dev` starts without errors
- `/docs/getting-started/` renders with 3-column layout, sidebar, TOC, pagination
- `/docs/algorithms/binary-search/` renders with sidebar section expanded
- Mobile responsive (sidebar collapses, hamburger menu works)
- `pnpm astro check` passes with no type errors

### Verification
Run through items 1–6, 10 of the Step 20 checklist in PLAN.md (skip interactive component checks 7–9).

### Handoff to Session 2
Session 2 expects these files to exist and work:
- `src/types/docs.ts` — all type definitions including `CodePlaygroundProps`, `ParamDemoProps`, `AlgoVisualizerProps`
- `src/content.config.ts` — docs collection configured
- `src/layouts/DocsLayout.astro` — accepts `<slot />` for MDX content
- `src/pages/docs/[...slug].astro` — renders any MDX in `src/content/docs/`
- `src/lib/sidebar.ts` — `buildSidebarTree()`, `getPagination()`, `flattenSidebarLinks()`
- `src/lib/toc.ts` — `filterTocHeadings()`
- `src/styles/global.css` — Tailwind + temporary prose styles

---

## Session 2: Docs Framework

### Goal
Build the interactive components and finalize the Docs framework as a complete, working system.

### Branch
`feature/docs-framework` (branched from Session 1's merged code)

### Specs
`docs/specs/2026-04-07-docs-framework/PLAN.md` — **Phase D (Steps 14–17) + Phase E (Steps 18–19) + Phase F (Step 20)**

Also read:
- `docs/specs/2026-04-07-docs-framework/DESIGN.md` — architecture decisions, component props, risk mitigations
- `docs/specs/2026-04-07-docs-framework/REQUIREMENTS.md` — acceptance criteria

### Scope

| Do | Don't |
|----|-------|
| Build `CodePlayground.tsx` (Sandpack wrapper, TS/JS) | Modify DocsLayout, Sidebar, or other Session 1 components |
| Build `ParamDemo.tsx` (parameter controls + render prop) | Change the content collection schema |
| Build `AlgoVisualizer.tsx` (step array + play/pause controls) | Add non-docs pages (Index, Portfolio, Blog) |
| Update sample MDX to embed interactive components | Add brand styling or design tokens |
| Configure build script: `astro build && pagefind --site dist` | Implement dark mode |
| Verify Pagefind search works in production build | Set up CI/CD or deployment pipeline |
| Run full E2E verification (Step 20 checklist) | |
| Handle MDX inline function children fallback if needed (DESIGN.md Risk 1) | |

### Prerequisites
Session 1 must be merged to main. Verify by checking:
```bash
# These files must exist and work
ls src/types/docs.ts src/content.config.ts src/layouts/DocsLayout.astro
ls src/pages/docs/[...slug].astro src/lib/sidebar.ts src/lib/toc.ts
pnpm run dev  # Must start without errors
```

### Deliverables
- 3 interactive React islands: CodePlayground, ParamDemo, AlgoVisualizer
- All components use `client:visible` hydration
- Updated sample MDX demonstrating all 3 components
- `pnpm run build` succeeds (Astro build + Pagefind indexing)
- Search works in preview mode
- All 15 items in Step 20 verification checklist pass

### Key Technical Decisions
- **Sandpack** for code playground (not custom editor)
- **Render prop pattern** for ParamDemo and AlgoVisualizer — MDX author controls visualization
- **`client:visible`** everywhere — no JS loaded for off-screen components
- If MDX doesn't support inline function children, use `render` prop instead (see DESIGN.md Risk 1)

### Verification
Run through ALL items (1–15) in the Step 20 checklist in PLAN.md.

---

## Session 3: Brand Style & Content

### Goal
Define the visual identity, implement dual theme, add animations, fill in real content, and prepare for deployment.

### Branch
`feature/brand-style` (branched from Session 2's merged code)

### Specs
`docs/specs/2026-04-08-brand-style/REQUIREMENTS.md` (in this directory)

### Scope

| Do | Don't |
|----|-------|
| Define brand name, tagline, color palette, typography | Change Docs framework component logic |
| Create design tokens as CSS custom properties | Modify sidebar builder or content collection schema |
| Configure Tailwind theme via CSS (`@theme` in global.css) | Rewrite interactive components |
| Implement dual theme (light/dark) with `ThemeToggle` | Change the build pipeline |
| Add View Transitions (Astro built-in) | |
| Add scroll animations (CSS or Motion library) | |
| Build shared Navbar and Footer | |
| Build Index page (Hero, featured Portfolio, latest Blog, CTA) | |
| Build Portfolio list + detail pages (Content Collection) | |
| Build Blog list + detail pages (Content Collection) | |
| Fill in real Portfolio/Blog/Docs content | |
| Add GA4 via `@astrojs/partytown` or inline script | |
| Generate OG images, favicon | |
| Configure custom domain in Cloudflare Pages | |
| Responsive polish and cross-browser testing | |

### Prerequisites
Session 1 + Session 2 must be merged to main. Verify by checking:
```bash
# Docs framework must be fully functional
pnpm run build  # Must succeed
pnpm run preview
# Visit /docs/getting-started/ — interactive components work
# Search works
```

### Deliverables
- Complete visual identity applied across all pages
- 4 working sections: Index, Portfolio, Blog, Docs
- Light/dark theme toggle
- Page transitions and scroll animations
- Real content in all sections
- GA4 tracking
- Deployable to Cloudflare Pages with custom domain
- All pages responsive (mobile, tablet, desktop)

### Key Decisions Still Open
- Brand name and tagline
- Color palette and font selection
- Specific animation style and intensity
- Domain name

---

## Cross-Session Contracts

### Shared Types (`src/types/docs.ts`)
Created in Session 1, used by all sessions. If Session 2 or 3 needs to modify types, it must be backwards-compatible with existing usage.

### Content Collection Schema (`src/content.config.ts`)
Created in Session 1 with `docs` collection. Session 3 adds `blog` and `portfolio` collections.

### Styling (`src/styles/global.css`)
Session 1 creates temporary prose styles. Session 3 replaces them with the real design system. Session 2 should NOT add styling beyond what's in the components.

### Layout Files
- `DocsLayout.astro` — Created in Session 1, untouched by Session 2 and 3 (unless brand styling requires changes)
- `BaseLayout.astro` — Created in Session 3 for non-docs pages
- `BlogLayout.astro`, `PortfolioLayout.astro` — Created in Session 3

### File Ownership

| Path | Owner | Others may... |
|------|-------|---------------|
| `astro.config.ts` | Session 1 | Session 3 adds integrations (partytown) |
| `src/content.config.ts` | Session 1 | Session 3 adds blog/portfolio collections |
| `src/types/docs.ts` | Session 1 | Session 2 reads only |
| `src/lib/sidebar.ts`, `src/lib/toc.ts` | Session 1 | Read only |
| `src/layouts/DocsLayout.astro` | Session 1 | Session 3 may adjust styling classes |
| `src/components/docs/*` | Session 1 | Read only |
| `src/components/islands/*` | Session 2 | Read only |
| `src/content/docs/**/*.mdx` | Session 1 (fixtures) | Session 2 updates, Session 3 replaces with real content |
| `src/styles/global.css` | Session 1 | Session 3 replaces temporary styles |
| `src/pages/index.astro` | Session 3 | — |
| `src/pages/blog/**` | Session 3 | — |
| `src/pages/portfolio/**` | Session 3 | — |
| `src/components/ui/*` | Session 3 | — |
| `package.json` scripts | Session 1 | Session 2 modifies `build` script |

---

## Quick Reference: Tech Stack

| Component | Choice | Notes |
|-----------|--------|-------|
| Framework | Astro 5.x | `output: "static"` |
| Content | Astro Content Collections | `glob()` loader, `src/content.config.ts` |
| MDX | `@astrojs/mdx` | Supports React imports |
| React | React 19 + `@astrojs/react` | Islands only, `client:visible` |
| CSS | Tailwind CSS 4 | `@tailwindcss/vite`, CSS-based config, NO `tailwind.config.js` |
| Code Editor | `@codesandbox/sandpack-react` | TS/JS only |
| Search | Pagefind | Post-build indexing |
| Deploy | Cloudflare Pages | Static output, no adapter needed |
| Package Manager | pnpm | |
