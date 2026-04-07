# Feature: Phase 1 — Self-Built Docs Framework

## Summary

Build a self-contained, opinionated Docs framework using Astro + MDX + React Islands. The framework must be minimal, explicit, and free of magic abstractions — suitable for publishing technical writing, algorithm explanations, and interactive code demonstrations under a personal brand site.

---

## Acceptance Criteria

### Content System

- [ ] Astro Content Collections are configured for MDX documents stored under `src/content/docs/`
- [ ] Each MDX file is resolvable via a dynamic route at `/docs/[...slug]`
- [ ] Frontmatter supports at minimum: `title` (string, required), `description` (string, optional), `order` (number, optional)
- [ ] MDX files can import and render React components inline without additional configuration steps

### Sidebar

- [ ] Every content folder may contain a `_meta.ts` file that exports a default object mapping file slugs to display titles and/or explicit order values
- [ ] The sidebar is auto-generated at build time by traversing the `src/content/docs/` directory and merging with `_meta.ts` overrides
- [ ] Folders without a `_meta.ts` file fall back to filename-derived titles (kebab-case converted to Title Case) and alphabetical order
- [ ] Sidebar correctly reflects nested folder structures as collapsible or grouped sections
- [ ] The active page is visually distinguished in the sidebar

### Layout

- [ ] `DocsLayout` renders a three-column layout: left Sidebar, center Content, right Table of Contents
- [ ] On screens narrower than 768px, both the Sidebar and TOC collapse or are hidden behind navigation controls
- [ ] The layout does not depend on any third-party component library or opinionated UI framework

### Table of Contents

- [ ] TOC is generated automatically from `h2` and `h3` headings in the current MDX page
- [ ] Each TOC entry is a hash-linked anchor that scrolls to the corresponding heading
- [ ] Active heading is highlighted in the TOC as the user scrolls (requires `client:visible` or equivalent hydration)

### Pagination

- [ ] Each docs page renders a Previous and Next link at the bottom of the content
- [ ] Previous/Next order follows the same order used to render the sidebar
- [ ] Pages at the beginning or end of the sequence omit the missing direction link

### Search

- [ ] Pagefind is integrated and indexes all rendered docs pages at build time
- [ ] A search input is accessible from the docs layout (header or sidebar)
- [ ] Search results link directly to the matching page and section
- [ ] Search UI is loaded client-side only and does not block initial page render

### Interactive Components (React Islands)

- [ ] All three interactive components — `CodePlayground`, `ParamDemo`, `AlgoVisualizer` — can be embedded directly in MDX files
- [ ] Each component is hydrated with `client:visible` by default (hydrates when it enters the viewport)
- [ ] **CodePlayground**: renders a Sandpack editor supporting TypeScript and JavaScript; displays a live preview pane; accepts a `files` prop to define initial file content
- [ ] **ParamDemo**: accepts a `params` prop defining named parameters with type, default value, and min/max range; renders controls (sliders or inputs) that update a visual output in real time
- [ ] **AlgoVisualizer**: accepts a `steps` prop or a generator function describing discrete algorithm states; renders a step-through UI (play, pause, next, previous); implementation detail of the visualization is left to each MDX page
- [ ] None of the three components are hydrated until they enter the viewport (verified by confirming no JS is loaded for off-screen islands on initial load)

### Styling

- [ ] Tailwind CSS is configured and applied globally
- [ ] Styling is explicitly temporary and scoped to Phase 1 — no design tokens, no brand colors, no custom design system
- [ ] The layout is functional and readable but not visually polished

### Deployment

- [ ] The project builds successfully with `astro build` targeting Cloudflare Pages (using `@astrojs/cloudflare` adapter)
- [ ] All pages are statically generated at build time (SSG); no server-side rendering is required for Phase 1
- [ ] Pagefind index is generated as part of the build output and served as static assets

---

## Scope

### In Scope

- Astro project scaffold configured for MDX, React, Tailwind, and Cloudflare Pages
- `src/content/docs/` as the single source of truth for all docs content
- `_meta.ts` sidebar configuration per folder
- Auto-generated sidebar, TOC, and pagination
- Pagefind search
- Three interactive React Island components: `CodePlayground`, `ParamDemo`, `AlgoVisualizer`
- `DocsLayout` three-column layout with responsive behavior
- Dynamic route `pages/docs/[...slug].astro`
- Temporary Tailwind styling sufficient for readability

### Out of Scope

- Personal website pages (home, about, projects) — Phase 2
- Brand identity, design tokens, color system, typography scale — Phase 3
- Any content beyond what is needed to verify the framework works (one or two sample MDX files are acceptable as fixtures)
- Authentication, user accounts, or any server-side personalization
- Non-docs content types (blog posts, case studies, etc.)
- Internationalization (i18n)
- Dark mode toggle (may be added in Phase 3)
- Analytics or tracking scripts
- Comments or any user-generated content
- Deployment pipeline automation (CI/CD) — manual deploy is acceptable for Phase 1

---

## Constraints

- **No opinionated docs frameworks**: Starlight, Docusaurus, Nextra, VitePress, and similar all-in-one solutions are explicitly excluded
- **Minimal abstraction**: Every layer of the system must be readable and modifiable without understanding a framework's internal conventions
- **Hydration strategy**: `client:visible` is the default for all interactive components; `client:load` is only acceptable if `client:visible` is technically incompatible with a specific component
- **Code Playground language support**: Sandpack integration covers TypeScript and JavaScript only; Python, Rust, and other languages are out of scope
- **Tailwind is temporary**: Styling decisions made in Phase 1 are not binding for Phase 3; avoid coupling layout logic to utility class names in ways that are hard to refactor
- **Static output only**: The Cloudflare Pages deploy must use static export mode; edge functions and Workers are not required for Phase 1

---

## Open Questions

- **`_meta.ts` schema**: Should folder-level `_meta.ts` also support a `label` key for the folder's own display name in the sidebar (as opposed to only controlling its children)? This affects how nested sections are titled.
- **`AlgoVisualizer` interface**: The `steps` prop vs. generator function API needs a concrete decision before implementation. A generator is more flexible but adds complexity to the component contract.
- **`ParamDemo` output rendering**: The component needs to know what to render as output given a set of parameter values. Is the output a passed-in render prop / child component, or is it always a canvas/SVG managed internally? This needs to be settled before the component is built.
- **Pagefind build integration**: Pagefind requires running `pagefind --source dist` after `astro build`. Should this be a single `build` script in `package.json`, or is a separate step acceptable for Phase 1?
