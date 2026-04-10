# Design: Phase 1 — Self-Built Docs Framework

## Codebase Analysis

The project is a greenfield build. No existing configuration, dependencies, or source code exist yet. The only artifact is the `REQUIREMENTS.md` in `docs/specs/2026-04-07-docs-framework/`. This design starts from scratch.

---

## Architecture Overview

The system is a static Astro site that renders MDX documents into a docs website with interactive React islands. The architecture has five distinct layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Build Pipeline                        │
│  astro build  →  pagefind --source dist  →  deploy      │
└─────────────────────────────────────────────────────────┘
        │                                        ▲
        ▼                                        │
┌─────────────────────────────────────────────────────────┐
│                   Astro Runtime                          │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  Content  │   │  Dynamic     │   │  Sidebar       │  │
│  │  Collect. │──▶│  Route       │──▶│  Builder       │  │
│  │  (MDX)   │   │  [...slug]   │   │  (_meta.ts)    │  │
│  └──────────┘   └──────────────┘   └────────────────┘  │
│        │               │                                │
│        ▼               ▼                                │
│  ┌──────────┐   ┌──────────────┐                        │
│  │  Render  │   │  DocsLayout  │                        │
│  │  MDX     │──▶│  (3-column)  │                        │
│  └──────────┘   └──────────────┘                        │
│                       │                                  │
│        ┌──────────────┼──────────────┐                  │
│        ▼              ▼              ▼                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐        │
│  │ Sidebar  │  │  Content   │  │     TOC      │        │
│  │ (Astro)  │  │  (MDX)     │  │ (React)      │        │
│  └──────────┘  └───────────┘  └──────────────┘        │
│                      │                                  │
│         ┌────────────┼────────────┐                    │
│         ▼            ▼            ▼                    │
│  ┌────────────┐ ┌──────────┐ ┌──────────────┐        │
│  │ CodePlay-  │ │ Param-   │ │ AlgoVisual-  │        │
│  │ ground     │ │ Demo     │ │ izer         │        │
│  │ (React)    │ │ (React)  │ │ (React)      │        │
│  └────────────┘ └──────────┘ └──────────────┘        │
│  client:visible  client:vis.  client:visible          │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** Astro owns the page shell and static content. React owns only what must be interactive. There is no shared state between islands.

---

## File/Folder Structure

```
/
├── astro.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── content/
│   │   ├── config.ts                    # Content collection schema
│   │   └── docs/
│   │       ├── _meta.ts                 # Root-level sidebar config
│   │       ├── getting-started.mdx      # Sample fixture page
│   │       └── algorithms/
│   │           ├── _meta.ts             # Section-level sidebar config
│   │           └── binary-search.mdx    # Sample fixture page
│   ├── components/
│   │   ├── docs/
│   │   │   ├── Sidebar.astro            # Static sidebar tree
│   │   │   ├── SidebarSection.astro     # Recursive section renderer
│   │   │   ├── TableOfContents.tsx      # React — scroll-spy active heading
│   │   │   ├── Pagination.astro         # Previous/Next links
│   │   │   ├── Search.tsx               # React — Pagefind UI wrapper
│   │   │   └── MobileNav.tsx            # React — hamburger menu for sidebar/TOC
│   │   └── islands/
│   │       ├── CodePlayground.tsx       # React — Sandpack wrapper
│   │       ├── ParamDemo.tsx            # React — parameter controls + render prop
│   │       └── AlgoVisualizer.tsx       # React — step-through algorithm viewer
│   ├── layouts/
│   │   └── DocsLayout.astro             # Three-column page shell
│   ├── lib/
│   │   ├── sidebar.ts                   # Build-time sidebar tree construction
│   │   └── toc.ts                       # Heading extraction utility
│   ├── pages/
│   │   └── docs/
│   │       └── [...slug].astro          # Dynamic catch-all route
│   ├── styles/
│   │   └── global.css                   # Tailwind directives + base prose styles
│   └── types/
│       └── docs.ts                      # Shared type definitions
├── public/
│   └── (empty — Pagefind output goes to dist/)
└── docs/
    └── specs/                           # Project documentation (not deployed)
```

---

## Key Interfaces and Type Definitions

All types live in `src/types/docs.ts`.

### Content Collection Schema (`src/content/config.ts`)

```typescript
import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = {
  docs: docsCollection,
};
```

**Decision**: Include a `draft` field (defaulting to `false`) so authors can exclude WIP pages without deleting files. Draft pages are filtered out of sidebar and pagination in production builds.

### `_meta.ts` Schema

Each `_meta.ts` file is a plain TypeScript module with a default export. It is NOT part of the content collection — it is imported directly at build time by the sidebar builder.

```typescript
// src/types/docs.ts

/**
 * Entry in a _meta.ts file. Each key is a filename (without extension)
 * or a subfolder name.
 */
export interface MetaItem {
  /** Display title override. If omitted, derived from filename. */
  title?: string;
  /** Explicit sort order. Lower numbers appear first. */
  order?: number;
}

/**
 * The default export of a _meta.ts file.
 */
export interface MetaConfig {
  /** Display name for this folder itself in the sidebar. */
  label?: string;
  /** Map of child slug → display overrides. */
  items: Record<string, MetaItem>;
}
```

Example `_meta.ts`:

```typescript
import type { MetaConfig } from '@/types/docs';

export default {
  label: 'Algorithms',
  items: {
    'binary-search': { title: 'Binary Search', order: 1 },
    'merge-sort': { title: 'Merge Sort', order: 2 },
  },
} satisfies MetaConfig;
```

**Decision**: The `label` key controls the folder's own display name in the sidebar, as resolved in the open questions. The `items` key controls children. This two-level structure keeps the folder's identity and its children's ordering in one file without ambiguity.

### Sidebar Tree Types

```typescript
// src/types/docs.ts

export interface SidebarLink {
  kind: 'link';
  title: string;
  href: string;
  order: number;
  /** True if this link matches the current page */
  active: boolean;
}

export interface SidebarSection {
  kind: 'section';
  title: string;
  order: number;
  children: SidebarNode[];
  /** True if any descendant is active */
  expanded: boolean;
}

export type SidebarNode = SidebarLink | SidebarSection;
```

### Interactive Component Props

```typescript
// CodePlayground
export interface CodePlaygroundProps {
  /** Sandpack file map. Key is filename (e.g., "/App.tsx"), value is code string. */
  files: Record<string, string>;
  /** Sandpack template. Default: "react-ts" */
  template?: 'react-ts' | 'react' | 'vanilla-ts' | 'vanilla';
  /** Show preview pane. Default: true */
  showPreview?: boolean;
}

// ParamDemo
export interface ParamDef {
  type: 'number' | 'boolean' | 'select';
  default: number | boolean | string;
  /** For number type */
  min?: number;
  max?: number;
  step?: number;
  /** For select type */
  options?: string[];
  label?: string;
}

export interface ParamDemoProps {
  params: Record<string, ParamDef>;
  /** Render prop: receives current param values, returns ReactNode */
  children: (values: Record<string, number | boolean | string>) => React.ReactNode;
}

// AlgoVisualizer
export interface AlgoStep {
  /** Label for this step (shown in step counter) */
  label?: string;
  /** Arbitrary state data that the visualization component interprets */
  data: Record<string, unknown>;
}

export interface AlgoVisualizerProps {
  steps: AlgoStep[];
  /** Auto-play interval in ms. Default: null (manual stepping only) */
  autoPlayInterval?: number | null;
  /** Render prop: receives current step data and step index, returns ReactNode */
  children: (step: AlgoStep, index: number) => React.ReactNode;
}
```

**Decision (AlgoVisualizer)**: Uses a `steps` array (not a generator function) as resolved in the open questions. The `children` render prop pattern is used so each MDX page owns its visualization logic. The component itself only manages step navigation (play/pause/next/prev) and passes the current step to the render function.

**Decision (ParamDemo)**: Uses the `children` render prop pattern as resolved in the open questions. The MDX author provides a function-as-children that receives current param values and returns the visualization. The component manages only the control UI (sliders, toggles, selects).

---

## Data Flow

### MDX Document to Rendered Page

```
1. Author writes:  src/content/docs/algorithms/binary-search.mdx
                       │
2. Astro Content       │  (build time)
   Collections         ▼
   validates    ───▶ Frontmatter parsed + validated against Zod schema
                       │
3. Route match:        ▼
   pages/docs/   [...slug].astro receives slug = ["algorithms", "binary-search"]
   [...slug]           │
                       ▼
4. Page calls:   getCollection("docs") → finds matching entry
                       │
                       ▼
5. Layout:       DocsLayout.astro receives:
                   - entry (content + frontmatter)
                   - sidebarTree (from sidebar.ts)
                   - headings (from entry.render())
                   - pagination (prev/next from flattened sidebar order)
                       │
                 ┌─────┼──────┐
                 ▼     ▼      ▼
              Sidebar  MDX   TOC
              .astro  render  .tsx
```

### `_meta.ts` to Sidebar Tree

```
1. sidebar.ts calls:  import.meta.glob("/src/content/docs/**/_meta.ts", { eager: true })
                          │
2. Walks directory:       ▼
   For each folder in src/content/docs/:
     a. Load _meta.ts if present → get { label, items }
     b. List MDX files in folder via getCollection("docs") filtered by path prefix
     c. For each MDX file:
        - Use _meta.ts items[slug].title  OR  frontmatter.title  OR  kebab-to-title(filename)
        - Use _meta.ts items[slug].order  OR  frontmatter.order  OR  Infinity (sort last)
     d. Build SidebarSection { title: meta.label ?? kebab-to-title(folderName) }
     e. Sort children by order, then alphabetically
                          │
3. Returns:               ▼
   SidebarNode[] — the complete tree, passed to DocsLayout at render time
```

**Title resolution priority** (highest to lowest):

1. `_meta.ts` items[slug].title
2. Frontmatter `title`
3. Filename converted from kebab-case to Title Case

**Order resolution priority** (highest to lowest):

1. `_meta.ts` items[slug].order
2. Frontmatter `order`
3. `Infinity` (sorts to end; then alphabetical as tiebreaker)

### Heading Extraction to TOC

```
1. [...slug].astro calls:  entry.render()
                              │
2. Astro returns:             ▼
   { Content, headings }  where headings = Array<{ depth, slug, text }>
                              │
3. Filter:                    ▼
   Keep only depth 2 and 3 (h2, h3)
                              │
4. Pass to:                   ▼
   <TableOfContents headings={filtered} client:visible />
                              │
5. React component:           ▼
   Renders anchor links + IntersectionObserver for active heading highlight
```

---

## Component Architecture

### Astro Components (server-rendered, zero JS)

| Component              | Responsibility                                  | Why Astro                                             |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `DocsLayout.astro`     | Three-column page shell (sidebar, content, TOC) | Pure layout — no interactivity needed                 |
| `Sidebar.astro`        | Renders the full sidebar tree                   | Static at build time — active state is known per-page |
| `SidebarSection.astro` | Recursive section renderer with nesting         | Composition pattern for tree structure                |
| `Pagination.astro`     | Previous/Next links                             | Static links — no JS needed                           |

### React Components (hydrated islands)

| Component             | Hydration        | Why React                                                |
| --------------------- | ---------------- | -------------------------------------------------------- |
| `TableOfContents.tsx` | `client:visible` | Needs IntersectionObserver for scroll-spy active heading |
| `Search.tsx`          | `client:visible` | Pagefind UI is JS-only; must not block initial render    |
| `MobileNav.tsx`       | `client:visible` | Toggle visibility of sidebar/TOC on mobile viewports     |
| `CodePlayground.tsx`  | `client:visible` | Sandpack is a React-only library                         |
| `ParamDemo.tsx`       | `client:visible` | Real-time state updates for parameter controls           |
| `AlgoVisualizer.tsx`  | `client:visible` | Stateful step navigation with play/pause                 |

**Decision**: `client:visible` everywhere. No component in this system requires `client:load` because none are above the fold in a way that demands immediate hydration. Pagefind search is in the sidebar/header which may be above the fold, but the search input can be a static HTML element that triggers Pagefind lazy-load on focus/click — this is handled inside `Search.tsx`.

### Render Prop Pattern for Islands in MDX

Both `ParamDemo` and `AlgoVisualizer` use a render prop (children-as-function) pattern. In MDX, this looks like:

```mdx
<ParamDemo params={{ n: { type: 'number', default: 5, min: 1, max: 20 } }} client:visible>
  {(values) => <MyVisualization n={values.n} />}
</ParamDemo>
```

**Important limitation**: MDX does not natively support inline JSX arrow functions in all parsers. To handle this reliably, each MDX page that uses `ParamDemo` or `AlgoVisualizer` should define a wrapper component in the same file or import a pre-built visualization component, then pass it as children. The render prop approach still works — the function is just defined as a named component rather than an inline arrow. Example:

```mdx
export const BinarySearchViz = ({ data, index }) => (
  <div>
    Step {index}: comparing {data.target} with {data.current}
  </div>
);

<AlgoVisualizer steps={binarySearchSteps} client:visible>
  {(step, index) => <BinarySearchViz data={step.data} index={index} />}
</AlgoVisualizer>
```

If testing reveals that inline function children do not work in MDX, the fallback is a `renderStep` prop instead of `children`. This is a known risk documented below.

---

## Key Technical Decisions

### 1. Astro Content Collections (v5 Content Layer API)

**Choice**: Use Astro's Content Collections with the file-system loader (`type: "content"` in the collection config). MDX files in `src/content/docs/` are the collection source.

**Rationale**: This is Astro's first-party, stable API for typed content. It gives us Zod validation on frontmatter, automatic slug generation, and a typed `getCollection()` API. No external content management needed.

**Trade-off**: Content Collections require files to live under `src/content/`. This is fine for Phase 1 but may need adjustment if Phase 2 introduces content from other sources.

### 2. `_meta.ts` Files are NOT Part of Content Collections

**Choice**: `_meta.ts` files live alongside MDX files in `src/content/docs/` but are loaded via `import.meta.glob()`, not as collection entries.

**Rationale**: Content Collections expect content files (MDX, MD, JSON, YAML). TypeScript modules with arbitrary exports do not fit the collection model. Using `import.meta.glob` gives us typed imports with zero overhead.

**Trade-off**: We must ensure Astro does not try to process `_meta.ts` as content. The content collection config should use a custom `glob` loader pattern or the files must be excluded. In practice, Astro ignores files that start with `_` in content collections by convention, so `_meta.ts` is naturally excluded. This must be verified during implementation.

### 3. Sidebar Built at Render Time Per Page (Not a Shared Build Step)

**Choice**: The `buildSidebarTree()` function is called in `[...slug].astro` for each page during static build. It reads the full collection and all `_meta.ts` files to produce the tree, then marks the current page as active.

**Rationale**: During static build, Astro runs each page's `getStaticPaths` and render independently. There is no shared "build once, use everywhere" step for computed data. However, `import.meta.glob` and `getCollection()` are both cached by Vite during build, so the actual cost of "rebuilding" the tree per page is negligible — the data is already in memory.

**Trade-off**: If the docs collection grows to thousands of pages, this could become a measurable build cost. For Phase 1 (likely under 100 pages), this is a non-issue.

### 4. Pagefind as a Post-Build Step, Combined Script

**Choice**: `package.json` has a single `build` script: `"build": "astro build && pagefind --site dist"`.

**Rationale**: Per the resolved open question, Pagefind is integrated as a combined build script. This keeps the workflow simple — one command to build and index.

**Trade-off**: During development (`astro dev`), Pagefind search will not work because no index exists. This is acceptable for Phase 1. A `"build:search"` script can be added later if devs want to test search locally without a full build.

### 5. Sandpack for Code Playground (Not CodeMirror + Eval)

**Choice**: Use `@codesandbox/sandpack-react` for the `CodePlayground` component.

**Rationale**: Sandpack provides a complete editor + bundler + preview in an iframe. Building this from CodeMirror + a bundler would take weeks and is not justified for Phase 1. Sandpack supports React, TypeScript, and vanilla JS out of the box.

**Trade-off**: Sandpack adds significant JS weight (~200-300KB). This is mitigated by `client:visible` — users only pay this cost when they scroll to a playground. Sandpack is also a runtime dependency on CodeSandbox's bundler CDN, which could be a reliability concern. For Phase 1, this is acceptable.

### 6. Static Adapter Choice: `@astrojs/cloudflare` in Static Mode

**Choice**: Use `@astrojs/cloudflare` adapter with `mode: "directory"` for static output.

**Rationale**: Requirements specify Cloudflare Pages deployment. The adapter in static/directory mode outputs to `dist/` with a structure Cloudflare Pages expects. No Workers or edge functions needed.

**Update (2026 Astro)**: If using Astro 5.x, the static adapter may simply be `output: "static"` in `astro.config.ts` with no adapter needed for static builds. The Cloudflare adapter is only required if using SSR. During implementation, check: if `output: "static"` produces a valid Cloudflare Pages deploy, skip the adapter entirely.

### 7. TOC Scroll-Spy via IntersectionObserver (Not Scroll Event)

**Choice**: `TableOfContents.tsx` uses IntersectionObserver to track which heading is currently in view.

**Rationale**: IntersectionObserver is performant (no scroll event handler), widely supported, and the standard approach for scroll-spy. Each heading element is observed; when it enters/exits the viewport, the TOC highlights the corresponding link.

**Trade-off**: None significant. Edge case: if a section has no visible heading (e.g., very long section scrolled past the heading), the last-seen heading remains active. This is standard behavior.

### 8. Mobile Responsive Strategy

**Choice**: On viewports below 768px, the sidebar and TOC are hidden by default. A `MobileNav.tsx` React component renders a hamburger button that toggles an overlay containing the sidebar. The TOC is accessible via a secondary button or is omitted on mobile (TOC is less critical on small screens).

**Rationale**: A pure-CSS approach (checkbox hack or `:target`) could avoid React for mobile nav, but it creates accessibility issues and is harder to maintain. A small React island for mobile nav is the pragmatic choice.

**Trade-off**: One extra React island on mobile. The JS cost is minimal.

### Alternatives Considered

| Decision                                 | Alternative                        | Why Not                                                                                                                 |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `_meta.ts` per folder                    | Single `sidebar.config.ts` at root | Per-folder keeps config co-located with content; easier for authors to maintain                                         |
| `_meta.ts` per folder                    | YAML/JSON frontmatter only         | Cannot configure folder labels or ordering without a separate config                                                    |
| Render prop for ParamDemo/AlgoVisualizer | Fixed internal canvas              | Render prop lets each page define its own visualization; more flexible, no wasted abstraction                           |
| `steps` array for AlgoVisualizer         | Generator function                 | Generators add complexity (iterator protocol, reset semantics); arrays are simpler and cover all planned use cases      |
| Pagefind                                 | Algolia DocSearch                  | Pagefind is fully static, zero-cost, no external service dependency; Algolia requires an account and network calls      |
| Sandpack                                 | StackBlitz WebContainers           | Sandpack is lighter weight and React-native; WebContainers are more powerful but heavier and not needed for TS/JS demos |
| Tailwind CSS                             | Vanilla CSS / CSS Modules          | Tailwind accelerates Phase 1 development; it is explicitly temporary and will be replaced in Phase 3                    |

---

## Dependencies

### Runtime Dependencies

| Package                       | Version Constraint | Purpose                       |
| ----------------------------- | ------------------ | ----------------------------- |
| `astro`                       | `^5.0`             | Core framework                |
| `@astrojs/mdx`                | `^4.0`             | MDX integration for Astro     |
| `@astrojs/react`              | `^4.0`             | React integration for islands |
| `@astrojs/tailwind`           | `^6.0`             | Tailwind integration          |
| `react`                       | `^19.0`            | React runtime for islands     |
| `react-dom`                   | `^19.0`            | React DOM renderer            |
| `@codesandbox/sandpack-react` | `^2.0`             | Code playground component     |
| `tailwindcss`                 | `^4.0`             | Utility-first CSS             |

### Dev Dependencies

| Package                   | Version Constraint | Purpose                                  |
| ------------------------- | ------------------ | ---------------------------------------- |
| `typescript`              | `^5.5`             | Type checking                            |
| `pagefind`                | `^1.0`             | Static search indexing (runs post-build) |
| `@tailwindcss/typography` | `^0.5`             | Prose styling for MDX content            |

### No Adapter Needed (Tentative)

Astro 5.x with `output: "static"` should produce a valid static site for Cloudflare Pages without a dedicated adapter. If this does not work, add `@astrojs/cloudflare` as a fallback.

### Version Constraint Rationale

All constraints use `^` (compatible) ranges pinned to the current major version. This allows patch and minor updates while preventing breaking changes. The exact versions should be locked via `package-lock.json` or `pnpm-lock.yaml` after initial install.

---

## Risks and Mitigations

### Risk 1: MDX Does Not Support Inline Function Children

**Severity**: Medium
**Description**: The render prop pattern (`children` as a function) may not work in all MDX configurations. Some MDX compilers treat JSX children as static content, not as JavaScript expressions.
**Mitigation**: During implementation Step 1, test a minimal MDX file with a function-as-children pattern. If it fails, switch to a named prop pattern:

```tsx
// Instead of: <ParamDemo>{(values) => <Viz {...values} />}</ParamDemo>
// Use:        <ParamDemo render={(values) => <Viz {...values} />} />
```

This is a one-line change in the component interface. The design accommodates both approaches.

### Risk 2: `_meta.ts` Files Processed by Content Collections

**Severity**: Low
**Description**: Astro might attempt to process `_meta.ts` files as content entries, causing build errors.
**Mitigation**: Astro's content collections ignore files prefixed with `_` by convention. If this fails, rename to `_meta.config.ts` or move meta files to a parallel directory structure outside `src/content/`. The sidebar builder path is configurable.

### Risk 3: Sandpack CDN Dependency

**Severity**: Low
**Description**: Sandpack loads its bundler from CodeSandbox's CDN at runtime. If that CDN is down, code playgrounds break.
**Mitigation**: This is acceptable for Phase 1. If reliability becomes a concern, Sandpack supports self-hosted bundlers. This can be addressed in a future phase.

### Risk 4: Pagefind Index Size

**Severity**: Low
**Description**: Pagefind generates a search index as static files. For a small docs site, this is negligible. If docs grow significantly, the index could add meaningful weight to the deploy.
**Mitigation**: Pagefind is designed for static sites with thousands of pages. Its index is efficient (typically under 1MB for hundreds of pages). No action needed for Phase 1.

### Risk 5: Tailwind Coupling Makes Phase 3 Refactor Harder

**Severity**: Medium
**Description**: If layout logic is deeply intertwined with Tailwind utility classes, migrating to a custom design system in Phase 3 could require touching every component.
**Mitigation**: Keep Tailwind usage in components thin. Use it primarily for layout (flex, grid, spacing) and basic typography. Avoid complex Tailwind compositions like `@apply` chains or deeply nested utility patterns. The `@tailwindcss/typography` plugin's `prose` class handles MDX content styling, which is easy to replace with custom CSS later.

### Risk 6: Astro Major Version Changes

**Severity**: Low
**Description**: Astro is actively developed. The Content Collections API has changed between v2, v3, v4, and v5.
**Mitigation**: Pin to Astro 5.x. The design uses only stable, documented APIs (defineCollection, getCollection, render). Avoid experimental features.

---

## Phase Boundary Notes

This design is scoped to Phase 1. The following decisions are explicitly deferred:

- **Phase 2** (Website Pages): The `src/pages/` directory will expand with non-docs routes. The `DocsLayout` will remain docs-specific; a separate `BaseLayout` will be introduced.
- **Phase 3** (Brand Styling): Tailwind will be evaluated for replacement or deep customization. The `prose` styling, color palette, typography scale, and component visual design will all change. The current Tailwind usage is intentionally shallow to make this migration tractable.
- **Dark mode**: Not implemented in Phase 1. The architecture does not preclude it — Tailwind's `dark:` variant can be added later, or a CSS custom properties approach can replace it entirely in Phase 3.

---

## Summary of Resolved Open Questions

| Question                                            | Resolution                                   | Impact on Design                                               |
| --------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `_meta.ts` supports `label` for folder display name | Yes — `label` key at top level of MetaConfig | MetaConfig interface has both `label` and `items`              |
| AlgoVisualizer: `steps` array vs generator          | `steps` array                                | AlgoVisualizerProps.steps is `AlgoStep[]`, not a generator     |
| ParamDemo output rendering                          | Children/render prop pattern                 | ParamDemoProps.children is a function receiving current values |
| Pagefind build integration                          | Single combined `build` script               | package.json `build` = `astro build && pagefind --site dist`   |
