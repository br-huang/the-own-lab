# Design: Phase 3 — Brand Style & Content

## Codebase Analysis

The current codebase has a working Docs framework, but its styling is still Phase 1 temporary UI:

- `src/styles/global.css` contains only basic prose rules
- `src/layouts/DocsLayout.astro` uses hardcoded neutral and blue utility classes
- Docs React islands use direct gray/blue utility classes instead of semantic tokens
- `src/pages/index.astro` is still the default Astro placeholder

This means the correct move is not to layer a few brand classes on top. The correct move is to introduce a shared token system first, then migrate all surfaces to consume it.

---

## Brand Direction

### Brand

- **Name:** `The Own Lab`
- **Core line:** `Build it. Own it. Teach it.`

### Brand Meaning

The brand is not positioned as a polished agency or a loud creator site. It should feel like a working studio for people who build systems, take responsibility for them, and turn that experience into teachable knowledge.

The three ideas behind the line should map into the interface:

- **Build it**: practical, structured, credible
- **Own it**: confident, direct, accountable
- **Teach it**: clear, generous, understandable

### Visual Reference

The closest reference is Claude's product and editorial language, but this project should not copy Claude literally.

Use the reference for:

- warm-neutral surfaces
- restrained contrast
- soft borders and quiet shadows
- editorial rather than startup-marketing typography
- interfaces that feel human and considered

Do not use the reference for:

- exact colors
- exact layout structure
- generic beige minimalism without hierarchy

---

## Design Principles

1. **Tokenized by default**  
   Every reusable component must consume semantic tokens, not raw brand colors.

2. **Warm, not decorative**  
   Surfaces should feel warm and tactile, but the UI must stay technical and legible.

3. **Editorial over dashboard**  
   This is a writing-and-projects site, not a SaaS product shell. Typography, rhythm, and reading comfort matter more than dense control surfaces.

4. **One system across all sections**  
   Home, Portfolio, Blog, Docs, and interactive islands should read as one product family.

5. **Themeable without rewrites**  
   A future rebrand should mostly mean changing token values and semantic mappings, not refactoring components.

---

## Token Architecture

The system should follow a three-layer model.

### Layer 1: Brand Tokens

Brand tokens capture raw visual identity. They should not be used directly in component styles.

Suggested categories:

- `--brand-cream`
- `--brand-sand`
- `--brand-ink`
- `--brand-copper`
- `--brand-olive`
- `--brand-plum` or another low-frequency contrast color if needed

These values should be stored as HSL channels to match the Tailwind v4 and shadcn-style pattern.

Example:

```css
--brand-cream: 42 35% 96%;
--brand-sand: 34 26% 88%;
--brand-ink: 24 18% 14%;
--brand-copper: 22 54% 42%;
--brand-olive: 78 18% 36%;
```

### Layer 2: Semantic Tokens

Semantic tokens are the contract used by components. This is the stable API of the design system.

Required semantic tokens:

```css
--background
--foreground
--card
--card-foreground
--popover
--popover-foreground
--muted
--muted-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--accent
--accent-foreground
--border
--input
--ring
```

Additional semantic tokens for this project:

```css
--surface-subtle
--surface-strong
--surface-elevated
--line-soft
--line-strong
--hero-glow
--selection
--selection-foreground
```

### Layer 3: System Tokens

System tokens cover typography, spacing expression, radii, shadows, and motion.

Recommended system tokens:

```css
--font-sans
--font-mono
--radius-sm
--radius-md
--radius-lg
--radius-xl
--shadow-soft
--shadow-card
--shadow-popover
--tracking-tight
--tracking-wide
--motion-fast
--motion-normal
--motion-slow
```

---

## Mapping Rule

Components should never do this:

```astro
class="bg-[hsl(var(--brand-copper))] text-white"
```

Components should do this:

```astro
class="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
```

That rule is what makes the system replaceable. The brand layer changes values. The semantic layer keeps component code stable.

---

## Theme Strategy

### Light Theme

The light theme should feel like warm paper, dark ink, and low-gloss interfaces.

Behavioral targets:

- background is slightly warm, not pure white
- cards are brighter than the page but still soft
- borders are visible but quiet
- primary actions feel grounded rather than electric

### Dark Theme

The dark theme should not invert into neon-on-black. It should become dim, warm, and still readable.

Behavioral targets:

- use deep cocoa or charcoal surfaces instead of flat black
- keep text contrast high enough for docs reading
- preserve warmth in accents and borders
- keep code and interactive areas aligned with the same token family

### Theme Resolution Order

1. If a stored user preference exists in `localStorage`, use it
2. Otherwise use `prefers-color-scheme`
3. Apply the result on first paint with a small inline script to avoid flash

The document root should carry a class or data attribute such as:

```html
<html data-theme="light">
<html data-theme="dark">
```

---

## Typography Strategy

Typography should feel editorial and technical at the same time.

Guidelines:

- use a readable sans-serif for UI and body copy
- use a mono family for code, labels, and small metadata
- avoid default system-stack feel if it makes the brand generic
- headings should feel deliberate, compact, and slightly denser than body text

The homepage and section intros can use larger, more expressive headline spacing than Docs pages. Docs prose should remain calmer and more utilitarian.

---

## Component Styling Rules

### Shared Layout

- Navbar, Footer, content wrappers, cards, and section headers should all consume shared tokens
- spacing and border treatment should be consistent across Docs and non-Docs pages

### Docs UI

Docs should inherit the brand but stay slightly more restrained than marketing sections.

Apply token migration to:

- `DocsLayout.astro`
- `Sidebar.astro`
- `SidebarSection.astro`
- `Pagination.astro`
- `TableOfContents.tsx`
- `Search.tsx`
- `MobileNav.tsx`

### Interactive Islands

Interactive islands must adapt to theme without owning their own color language.

Apply token migration to:

- `CodePlayground.tsx`
- `ParamDemo.tsx`
- `AlgoVisualizer.tsx`

If Sandpack needs explicit theming, wrap it with a theme mapping derived from the active site theme.

---

## Motion Strategy

Animation should be minimal, structural, and low-distraction.

Use motion for:

- page transitions between major routes
- reveal-on-scroll for section blocks and cards
- subtle hover transitions on cards and nav links

Do not use motion for:

- constant floating effects
- decorative parallax
- anything that competes with reading

All motion must degrade cleanly under `prefers-reduced-motion: reduce`.

---

## Page-Level Direction

### Home

The homepage should establish the brand in one screen:

- clear name and core line
- statement of practice
- links into Portfolio, Blog, and Docs
- preview modules that feel like reading a lab notebook, not a startup landing page

### Portfolio

Portfolio should feel like an archive of shipped work:

- strong titles
- concise descriptions
- visible tags
- optional outcomes, roles, or links if content supports it

### Blog

Blog should optimize for reading confidence:

- strong typographic rhythm
- calm post list
- clear metadata
- prose styling aligned with Docs but slightly more editorial

### Docs

Docs should remain the most utilitarian section:

- better readability
- clearer hierarchy
- theme-compatible code and interactive blocks
- no ornamental styling that fights content density

---

## Risks and Mitigations

### Risk 1: Token system exists, but components keep hardcoded utility colors

If old `bg-white`, `text-gray-900`, `border-gray-200`, or `text-blue-600` classes remain, the system will become partially themed and hard to maintain.

**Mitigation:** treat color migration as a first-class refactor and audit all docs and shared UI files before building new sections.

### Risk 2: Home and Docs diverge into two visual systems

This often happens when marketing pages get richer styling while Docs keep the old scaffold classes.

**Mitigation:** define shared surfaces, typography, and motion tokens first, then migrate Docs before building the final homepage.

### Risk 3: Claude-like inspiration drifts into imitation

Borrowing the warmth is useful. Copying proportions and exact visual signatures is not.

**Mitigation:** keep the brand centered on `The Own Lab` and its own content structure, especially in layout, hierarchy, and copy rhythm.

---

## Deliverable for Implementation

Implementation is complete for the design-system layer when:

- `global.css` defines brand, semantic, and system tokens for light and dark themes
- shared components consume semantic tokens only
- Docs UI is migrated to the token contract
- a future rebrand can be performed primarily by replacing token values and mappings
