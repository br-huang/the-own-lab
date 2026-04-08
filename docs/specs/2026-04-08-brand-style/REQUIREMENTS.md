# Feature: Phase 3 — Brand Style & Content

## Summary

Apply visual identity, implement dual theme, add animations, build non-docs pages (Index, Portfolio, Blog), fill in real content, and prepare for production deployment on Cloudflare Pages.

This is the final phase. It depends on Session 1 (Astro scaffold) and Session 2 (Docs framework) being complete and merged.

---

## Acceptance Criteria

### Brand Identity

- [ ] Brand name and tagline are defined and displayed in the Navbar and Index page
- [ ] Color palette is defined as CSS custom properties (design tokens)
- [ ] Typography (font family, scale) is configured via Tailwind CSS theme
- [ ] Design tokens are applied consistently across all pages including Docs

### Dual Theme

- [ ] Light and dark themes are implemented via CSS custom properties + Tailwind `dark:` variant
- [ ] A `ThemeToggle` component allows users to switch between light/dark
- [ ] User preference is persisted in `localStorage`
- [ ] System preference (`prefers-color-scheme`) is respected as the default
- [ ] All pages (Index, Portfolio, Blog, Docs) render correctly in both themes
- [ ] Interactive components (CodePlayground, ParamDemo, AlgoVisualizer) adapt to the active theme

### Animations

- [ ] Page transitions are implemented using Astro's built-in View Transitions API
- [ ] Scroll-triggered animations are applied to key sections (Index hero, Portfolio cards, etc.)
- [ ] Animations respect `prefers-reduced-motion` media query
- [ ] Animation style is subtle and consistent with a clean/minimal aesthetic

### Index Page

- [ ] Hero section with brand name, tagline, and call-to-action
- [ ] Featured Portfolio section (3–5 highlighted projects)
- [ ] Latest Blog posts section (3 most recent)
- [ ] Navigation to all sections (Portfolio, Blog, Docs)
- [ ] Responsive layout across mobile, tablet, desktop

### Portfolio

- [ ] Portfolio content collection is added to `src/content.config.ts`
- [ ] Markdown files in `src/content/portfolio/` define projects
- [ ] Frontmatter schema: `title`, `description`, `tags`, `url`, `repo`, `image`, `featured`, `date`
- [ ] Portfolio list page at `/portfolio/` shows all projects as cards
- [ ] Portfolio detail page at `/portfolio/[slug]` shows full project details
- [ ] Projects can be filtered or sorted by tags

### Blog

- [ ] Blog content collection is added to `src/content.config.ts`
- [ ] Markdown/MDX files in `src/content/blog/` define articles
- [ ] Frontmatter schema: `title`, `description`, `date`, `tags`, `draft`
- [ ] Blog list page at `/blog/` shows articles sorted by date (newest first)
- [ ] Blog detail page at `/blog/[slug]` renders with a readable prose layout
- [ ] Draft posts are excluded from production builds

### Shared Components

- [ ] `Navbar.astro` — site-wide navigation with links to Index, Portfolio, Blog, Docs + ThemeToggle
- [ ] `Footer.astro` — site-wide footer with social links and copyright
- [ ] `BaseLayout.astro` — wraps non-docs pages with Navbar, Footer, head meta, View Transitions
- [ ] `Card.astro` — reusable card component for Portfolio and Blog lists

### SEO & Meta

- [ ] Each page has a unique `<title>` and `<meta name="description">`
- [ ] Open Graph meta tags (`og:title`, `og:description`, `og:image`) on all pages
- [ ] `robots.txt` and `sitemap.xml` are generated (Astro built-in)
- [ ] Favicon (SVG preferred) is in `/public/`

### Analytics

- [ ] GA4 tracking script is loaded on all pages
- [ ] Script is loaded via `@astrojs/partytown` or deferred loading to avoid blocking render

### Deployment

- [ ] `pnpm run build` produces a valid static site in `dist/`
- [ ] Site deploys successfully to Cloudflare Pages
- [ ] Custom domain is configured (if domain is decided)
- [ ] All pages load correctly on the deployed site

---

## Scope

### In Scope

- Brand identity definition (name, colors, fonts, tokens)
- Dual theme implementation
- View Transitions and scroll animations
- Index, Portfolio, Blog pages and layouts
- Shared components (Navbar, Footer, BaseLayout, Card)
- Real content for Portfolio, Blog, and Docs
- SEO meta tags and Open Graph
- GA4 analytics
- Cloudflare Pages deployment
- Responsive polish

### Out of Scope

- Changes to Docs framework logic (sidebar builder, interactive components)
- New interactive component types
- Authentication or user accounts
- Comments or user-generated content
- CI/CD pipeline automation
- i18n / multi-language support
- CMS integration (content stays in local Markdown)

---

## Constraints

- **Do not break the Docs framework** — styling changes must be backwards-compatible with DocsLayout and all Docs components
- **Tailwind v4 CSS-based config** — design tokens go in `global.css` using `@theme {}`, not in a `tailwind.config.js`
- **Static output only** — no server-side rendering or edge functions
- **Performance** — no layout shift, no render-blocking scripts, Lighthouse performance score > 90

---

## Open Questions (to resolve at start of Session 3)

- **Brand name** — not yet decided
- **Color palette** — not yet decided
- **Font family** — not yet decided (system fonts? Google Fonts? Custom?)
- **Domain name** — not yet decided
- **Animation library** — Astro View Transitions for page transitions; scroll animations via CSS (`@scroll-timeline`, `animation-timeline: view()`) or Motion library?
- **Portfolio content** — which projects to include?
- **Blog content** — initial articles to write?
