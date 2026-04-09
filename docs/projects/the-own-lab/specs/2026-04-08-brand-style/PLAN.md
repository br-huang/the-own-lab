# Implementation Plan: Phase 3 — Brand Style & Content

## Overview

This plan turns the current Phase 1 docs scaffold into a brand-driven site for `The Own Lab` using a semantic token architecture. The main goal is to establish a reusable theming layer before building page-specific UI.

The critical sequencing rule is:

1. define tokens
2. migrate shared surfaces
3. migrate Docs
4. build new sections

Do not start with the homepage hero. If the token system is not stable first, the rest of the site will fragment.

---

## Phase A: Brand Foundations

### Step 1: Define the token contract

Create the initial token contract in `src/styles/global.css`.

Include:

- brand tokens
- semantic tokens
- system tokens
- light theme values
- dark theme values

Outputs:

- `:root` token definitions
- dark-theme override block
- Tailwind v4 `@theme` mappings if needed for utility compatibility

### Step 2: Define theme bootstrapping

Add theme resolution and persistence:

- system preference fallback
- `localStorage` persistence
- no-flash first paint strategy

Outputs:

- `ThemeToggle` component
- root theme script in a shared layout

---

## Phase B: Shared Shell

### Step 3: Create the non-docs base layout

Create:

- `BaseLayout.astro`
- `Navbar.astro`
- `Footer.astro`

These should consume semantic tokens only.

### Step 4: Build reusable content primitives

Create:

- `Card.astro`
- section wrappers or container helpers if needed

Keep these generic enough to work in home, portfolio, and blog.

---

## Phase C: Docs Migration

### Step 5: Migrate docs shell styling

Refactor:

- `DocsLayout.astro`
- docs sidebar
- docs pagination
- docs TOC
- docs mobile nav
- docs search

Goal:

- zero hardcoded palette classes in shared docs shell
- consistent light/dark behavior

### Step 6: Migrate interactive islands

Refactor:

- `CodePlayground.tsx`
- `ParamDemo.tsx`
- `AlgoVisualizer.tsx`

Goal:

- interactive blocks match the same surface, border, and text tokens
- no component introduces an unrelated local palette

---

## Phase D: Site Sections

### Step 7: Build the homepage

Add:

- hero
- featured portfolio
- latest blog
- docs entry point

The page should feel editorial and purposeful, not like a template landing page.

### Step 8: Add portfolio content type and routes

Create:

- content collection
- list page
- detail page

### Step 9: Add blog content type and routes

Create:

- content collection
- list page
- detail page

---

## Phase E: Polish and Production

### Step 10: Motion and transitions

Add:

- Astro View Transitions
- subtle scroll-reveal patterns
- reduced-motion handling

### Step 11: SEO and metadata

Add:

- shared metadata support
- Open Graph image support
- favicon
- sitemap and robots if not already configured

### Step 12: Analytics and deployment verification

Add:

- GA4 integration
- final production build verification
- Cloudflare Pages readiness check

---

## Verification Checklist

- Token values can be changed centrally without editing component markup
- Light and dark themes both work across home, docs, blog, and portfolio
- Docs remains fully usable after visual migration
- Search, TOC, pagination, and interactive islands still function
- No obvious flash of incorrect theme on first load
- `pnpm run build` succeeds
