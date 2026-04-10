# Implementation Plan: Phase 1 — Self-Built Docs Framework

## Overview

This plan builds a docs framework from scratch using Astro 5.x, React 19, Tailwind CSS 4, and TypeScript. The project root is `/Users/rong/Workspaces/1-Projects/13-Personal-Brand/` (referred to as `ROOT` below). There is no existing source code — only a `docs/specs/` directory with requirements and design documents.

Read `DESIGN.md` in this same directory for all type definitions, architecture diagrams, and rationale behind decisions referenced here.

## Prerequisites

- Node.js >= 20 installed
- pnpm installed (preferred package manager; npm is acceptable)
- Familiarity with Astro, React, TypeScript, and Tailwind CSS at a basic level

---

## Phase A: Project Scaffold and Configuration

### Step 1: Initialize the Astro project

**Files to create:**

- `ROOT/package.json`
- `ROOT/tsconfig.json`
- `ROOT/astro.config.ts`
- `ROOT/src/styles/global.css`
- `ROOT/src/env.d.ts`

**Action:**

1. From `ROOT`, run:

   ```bash
   pnpm create astro@latest . --template minimal --typescript strict --no-install --no-git
   ```

   If the command fails because the directory is not empty, use `--force` or create in a temp directory and move files. The `docs/` directory must be preserved.

2. Install dependencies:

   ```bash
   pnpm add astro@^5 @astrojs/mdx @astrojs/react react@^19 react-dom@^19 tailwindcss@^4 @tailwindcss/vite@^4 @codesandbox/sandpack-react@^2
   pnpm add -D typescript@^5.5 pagefind@^1 @types/react@^19 @types/react-dom@^19
   ```

3. Replace `ROOT/astro.config.ts` with:

   ```typescript
   import { defineConfig } from 'astro/config';
   import mdx from '@astrojs/mdx';
   import react from '@astrojs/react';
   import tailwindcss from '@tailwindcss/vite';

   export default defineConfig({
     site: 'https://rongying.co', // placeholder; update before production deploy
     output: 'static',
     integrations: [mdx(), react()],
     vite: {
       plugins: [tailwindcss()],
     },
   });
   ```

   Note: Tailwind v4 does NOT use an `@astrojs/tailwind` integration. It uses the `@tailwindcss/vite` plugin directly in the Vite config. There is NO `tailwind.config.js` or `tailwind.config.ts` file — all configuration is done in CSS.

4. Replace `ROOT/tsconfig.json` with:

   ```json
   {
     "extends": "astro/tsconfigs/strict",
     "compilerOptions": {
       "jsx": "react-jsx",
       "jsxImportSource": "react",
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       }
     }
   }
   ```

5. Create `ROOT/src/styles/global.css`:

   ```css
   @import 'tailwindcss';

   /*
    * Phase 1 temporary prose styles.
    * Tailwind v4 typography plugin may be added later.
    * For now, basic content styling via custom CSS.
    */
   .prose h1 {
     @apply text-3xl font-bold mt-8 mb-4;
   }
   .prose h2 {
     @apply text-2xl font-semibold mt-6 mb-3;
   }
   .prose h3 {
     @apply text-xl font-semibold mt-4 mb-2;
   }
   .prose p {
     @apply my-3 leading-7;
   }
   .prose ul {
     @apply list-disc pl-6 my-3;
   }
   .prose ol {
     @apply list-decimal pl-6 my-3;
   }
   .prose li {
     @apply my-1;
   }
   .prose code {
     @apply bg-gray-100 px-1.5 py-0.5 rounded text-sm;
   }
   .prose pre {
     @apply bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4;
   }
   .prose pre code {
     @apply bg-transparent p-0;
   }
   .prose a {
     @apply text-blue-600 underline;
   }
   .prose blockquote {
     @apply border-l-4 border-gray-300 pl-4 italic my-4;
   }
   ```

6. Ensure `ROOT/src/env.d.ts` contains:
   ```typescript
   /// <reference path="../.astro/types.d.ts" />
   ```

**Do NOT:**

- Create a `tailwind.config.ts` or `tailwind.config.js` file (Tailwind v4 does not use one)
- Install `@astrojs/tailwind` (Tailwind v4 uses `@tailwindcss/vite` directly)
- Install `@astrojs/cloudflare` (not needed for static output)
- Delete the existing `docs/` directory

**Verify:**

- Run `pnpm run dev`. The Astro dev server starts without errors.
- Visit `http://localhost:4321/`. You see the default Astro page or a blank page (no crash).
- `pnpm astro check` reports no type errors.

---

### Step 2: Create shared type definitions

**Files to create:**

- `ROOT/src/types/docs.ts`

**Action:**

Create `ROOT/src/types/docs.ts` with the following content (copied verbatim from DESIGN.md "Key Interfaces" section):

```typescript
import type { ReactNode } from 'react';

// ─── _meta.ts Schema ───

export interface MetaItem {
  /** Display title override. If omitted, derived from filename. */
  title?: string;
  /** Explicit sort order. Lower numbers appear first. */
  order?: number;
}

export interface MetaConfig {
  /** Display name for this folder itself in the sidebar. */
  label?: string;
  /** Map of child slug (filename without extension, or subfolder name) → display overrides. */
  items: Record<string, MetaItem>;
}

// ─── Sidebar Tree ───

export interface SidebarLink {
  kind: 'link';
  title: string;
  href: string;
  order: number;
  /** True if this link matches the current page. */
  active: boolean;
}

export interface SidebarSection {
  kind: 'section';
  title: string;
  order: number;
  children: SidebarNode[];
  /** True if any descendant is active. */
  expanded: boolean;
}

export type SidebarNode = SidebarLink | SidebarSection;

// ─── TOC ───

export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

// ─── Interactive Component Props ───

export interface CodePlaygroundProps {
  files: Record<string, string>;
  template?: 'react-ts' | 'react' | 'vanilla-ts' | 'vanilla';
  showPreview?: boolean;
}

export interface ParamDef {
  type: 'number' | 'boolean' | 'select';
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  label?: string;
}

export interface ParamDemoProps {
  params: Record<string, ParamDef>;
  children: (values: Record<string, number | boolean | string>) => ReactNode;
}

export interface AlgoStep {
  label?: string;
  data: Record<string, unknown>;
}

export interface AlgoVisualizerProps {
  steps: AlgoStep[];
  autoPlayInterval?: number | null;
  children: (step: AlgoStep, index: number) => ReactNode;
}
```

**Do NOT:**

- Add any runtime logic to this file — it is types only.

**Verify:**

- `pnpm astro check` passes with no errors.

---

### Step 3: Configure Astro Content Collections for docs

**Files to create:**

- `ROOT/src/content.config.ts`

**Action:**

Create `ROOT/src/content.config.ts` (note: Astro 5.x uses `content.config.ts` at the `src/` level, NOT `src/content/config.ts`):

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { docs };
```

Key points about Astro 5.x Content Layer API:

- The file is `src/content.config.ts` (not `src/content/config.ts`).
- Uses `glob()` loader from `astro/loaders`, not `type: "content"`.
- The `glob()` loader generates IDs from file paths relative to `base`. For a file at `src/content/docs/algorithms/binary-search.mdx`, the ID will be `algorithms/binary-search`.

**Do NOT:**

- Create `src/content/config.ts` (that is the old Astro v4 location).
- Use `type: "content"` in `defineCollection` (that is the old API).

**Verify:**

- No verification step yet — we need content files first (Step 4).

---

### Step 4: Create sample content and `_meta.ts` fixtures

**Files to create:**

- `ROOT/src/content/docs/_meta.ts`
- `ROOT/src/content/docs/getting-started.mdx`
- `ROOT/src/content/docs/algorithms/_meta.ts`
- `ROOT/src/content/docs/algorithms/binary-search.mdx`

**Action:**

1. Create `ROOT/src/content/docs/_meta.ts`:

   ```typescript
   import type { MetaConfig } from '@/types/docs';

   export default {
     items: {
       'getting-started': { title: 'Getting Started', order: 1 },
       algorithms: { order: 2 },
     },
   } satisfies MetaConfig;
   ```

2. Create `ROOT/src/content/docs/getting-started.mdx`:

   ````mdx
   ---
   title: 'Getting Started'
   description: 'Introduction to the docs framework.'
   order: 1
   ---

   # Getting Started

   Welcome to the docs framework. This is a sample page to verify the content system works.

   ## Installation

   Run the install command:

   ```bash
   pnpm install
   ```
   ````

   ## Configuration

   Configuration is done via `astro.config.ts`.

   ### Advanced Options

   These options are for advanced users.

   ```

   ```

3. Create `ROOT/src/content/docs/algorithms/_meta.ts`:

   ```typescript
   import type { MetaConfig } from '@/types/docs';

   export default {
     label: 'Algorithms',
     items: {
       'binary-search': { title: 'Binary Search', order: 1 },
     },
   } satisfies MetaConfig;
   ```

4. Create `ROOT/src/content/docs/algorithms/binary-search.mdx`:

   ````mdx
   ---
   title: 'Binary Search'
   description: 'A walkthrough of the binary search algorithm.'
   order: 1
   ---

   # Binary Search

   Binary search finds an element in a sorted array in O(log n) time.

   ## How It Works

   1. Compare the target with the middle element.
   2. If the target matches, return the index.
   3. If the target is less, search the left half.
   4. If the target is greater, search the right half.

   ## Implementation

   ```typescript
   function binarySearch(arr: number[], target: number): number {
     let lo = 0,
       hi = arr.length - 1;
     while (lo <= hi) {
       const mid = Math.floor((lo + hi) / 2);
       if (arr[mid] === target) return mid;
       if (arr[mid] < target) lo = mid + 1;
       else hi = mid - 1;
     }
     return -1;
   }
   ```
   ````

   ### Complexity Analysis
   - Time: O(log n)
   - Space: O(1)

   ```

   ```

**Do NOT:**

- Add interactive components to sample content yet — those are added in Phase D after the components exist.

**Verify:**

- Run `pnpm run dev`. No build errors related to content collection.
- In the terminal, Astro should report finding the content collection entries.

---

## Phase B: Sidebar Builder and Core Library Code

### Step 5: Implement the sidebar tree builder

**Files to create:**

- `ROOT/src/lib/sidebar.ts`

**Action:**

Create `ROOT/src/lib/sidebar.ts`:

```typescript
import { getCollection } from "astro:content";
import type { MetaConfig, SidebarNode, SidebarLink, SidebarSection } from "@/types/docs";

/**
 * Convert a kebab-case string to Title Case.
 * "binary-search" → "Binary Search"
 */
export function kebabToTitle(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Load all _meta.ts files from src/content/docs/.
 * Returns a Map keyed by directory path relative to src/content/docs/.
 * For the root directory, the key is "".
 * For "algorithms/", the key is "algorithms".
 */
async function loadMetaFiles(): Promise<Map<string, MetaConfig>> {
  const metaModules = import.meta.glob<{ default: MetaConfig }>(
    "/src/content/docs/**/_meta.ts",
    { eager: true }
  );

  const metaMap = new Map<string, MetaConfig>();

  for (const [path, mod] of Object.entries(metaModules)) {
    // path example: "/src/content/docs/_meta.ts" → dir = ""
    // path example: "/src/content/docs/algorithms/_meta.ts" → dir = "algorithms"
    const dir = path
      .replace("/src/content/docs/", "")
      .replace("/_meta.ts", "")
      .replace("_meta.ts", ""); // handles root case where path ends with just "_meta.ts"
    metaMap.set(dir, mod.default);
  }

  return metaMap;
}

/**
 * Build the complete sidebar tree for the docs collection.
 *
 * @param currentSlug - The slug of the current page (e.g., "algorithms/binary-search"),
 *                      used to mark the active link and expanded sections.
 */
export async function buildSidebarTree(currentSlug: string): Promise<SidebarNode[]> {
  const allDocs = await getCollection("docs", (entry) => {
    // Filter out drafts in production
    if (import.meta.env.PROD && entry.data.draft) return false;
    return true;
  });

  const metaMap = await loadMetaFiles();

  // Group docs by their parent directory
  // e.g., "algorithms/binary-search" → parent = "algorithms"
  // e.g., "getting-started" → parent = ""
  const docsByDir = new Map<string, typeof allDocs>();

  for (const doc of allDocs) {
    const parts = doc.id.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
    if (\!docsByDir.has(dir)) docsByDir.set(dir, []);
    docsByDir.get(dir)\!.push(doc);
  }

  // Collect all directory paths that have children (for building sections)
  const allDirs = new Set<string>();
  allDirs.add(""); // root always exists
  for (const doc of allDocs) {
    const parts = doc.id.split("/");
    if (parts.length > 1) {
      // Add all ancestor directories
      for (let i = 1; i < parts.length; i++) {
        allDirs.add(parts.slice(0, i).join("/"));
      }
    }
  }

  function buildLevel(dir: string): SidebarNode[] {
    const meta = metaMap.get(dir);
    const nodes: SidebarNode[] = [];

    // Add document links at this level
    const docsAtLevel = docsByDir.get(dir) ?? [];
    for (const doc of docsAtLevel) {
      const filename = doc.id.split("/").pop()\!;
      const metaItem = meta?.items[filename];

      const title = metaItem?.title ?? doc.data.title ?? kebabToTitle(filename);
      const order = metaItem?.order ?? doc.data.order ?? Infinity;
      const href = `/docs/${doc.id}/`;

      nodes.push({
        kind: "link",
        title,
        href,
        order,
        active: doc.id === currentSlug,
      } satisfies SidebarLink);
    }

    // Add sub-sections (child directories)
    for (const childDir of allDirs) {
      // Only direct children of current dir
      if (childDir === dir) continue;
      const expectedPrefix = dir === "" ? "" : dir + "/";
      const relative = dir === "" ? childDir : childDir.slice(expectedPrefix.length);
      if (\!childDir.startsWith(expectedPrefix) || relative.includes("/")) continue;

      const folderName = relative;
      const childMeta = metaMap.get(childDir);
      const parentMeta = meta?.items[folderName];

      const sectionTitle = childMeta?.label ?? parentMeta?.title ?? kebabToTitle(folderName);
      const sectionOrder = parentMeta?.order ?? Infinity;

      const children = buildLevel(childDir);
      const expanded = children.some(
        (child) =>
          (child.kind === "link" && child.active) ||
          (child.kind === "section" && child.expanded)
      );

      nodes.push({
        kind: "section",
        title: sectionTitle,
        order: sectionOrder,
        children,
        expanded,
      } satisfies SidebarSection);
    }

    // Sort by order, then alphabetically by title
    nodes.sort((a, b) => {
      if (a.order \!== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });

    return nodes;
  }

  return buildLevel("");
}

/**
 * Flatten the sidebar tree into an ordered list of links (for pagination).
 */
export function flattenSidebarLinks(nodes: SidebarNode[]): SidebarLink[] {
  const links: SidebarLink[] = [];
  for (const node of nodes) {
    if (node.kind === "link") {
      links.push(node);
    } else {
      links.push(...flattenSidebarLinks(node.children));
    }
  }
  return links;
}

/**
 * Get previous and next links for pagination.
 */
export function getPagination(
  nodes: SidebarNode[],
  currentSlug: string
): { prev: SidebarLink | null; next: SidebarLink | null } {
  const flat = flattenSidebarLinks(nodes);
  const index = flat.findIndex((link) => link.href === `/docs/${currentSlug}/`);
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}
```

**Do NOT:**

- Import from `fs` or `path` — this code runs in Astro's Vite context, not Node.
- Use synchronous file reads — `getCollection` and `import.meta.glob` are the data sources.

**Verify:**

- `pnpm astro check` passes with no type errors.
- Full verification happens once the route is built (Step 8).

---

### Step 6: Implement the TOC heading filter utility

**Files to create:**

- `ROOT/src/lib/toc.ts`

**Action:**

Create `ROOT/src/lib/toc.ts`:

```typescript
import type { TocHeading } from '@/types/docs';

/**
 * Filter headings from Astro's render() output to only h2 and h3.
 * The input comes from `entry.render()` which returns `{ headings }`.
 */
export function filterTocHeadings(
  headings: Array<{ depth: number; slug: string; text: string }>,
): TocHeading[] {
  return headings.filter((h) => h.depth === 2 || h.depth === 3);
}
```

**Do NOT:**

- Add scroll-spy logic here. That lives in the React `TableOfContents.tsx` component.

**Verify:**

- `pnpm astro check` passes.

---

## Phase C: Layout and Astro Components

### Step 7: Build the DocsLayout

**Files to create:**

- `ROOT/src/layouts/DocsLayout.astro`

**Action:**

Create `ROOT/src/layouts/DocsLayout.astro`:

```astro
---
import type { SidebarNode, TocHeading, SidebarLink } from "@/types/docs";
import Sidebar from "@/components/docs/Sidebar.astro";
import Pagination from "@/components/docs/Pagination.astro";
import TableOfContents from "@/components/docs/TableOfContents";
import Search from "@/components/docs/Search";
import MobileNav from "@/components/docs/MobileNav";
import "@/styles/global.css";

interface Props {
  title: string;
  description?: string;
  sidebar: SidebarNode[];
  headings: TocHeading[];
  prev: SidebarLink | null;
  next: SidebarLink | null;
}

const { title, description, sidebar, headings, prev, next } = Astro.props;
---

<\!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body class="min-h-screen bg-white text-gray-900">
    <\!-- Mobile navigation (visible below md) -->
    <div class="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
      <MobileNav sidebar={sidebar} client:visible />
      <span class="font-semibold text-sm truncate mx-2">{title}</span>
      <Search client:visible />
    </div>

    <div class="flex max-w-7xl mx-auto">
      <\!-- Left sidebar (hidden on mobile) -->
      <aside class="hidden md:block w-64 shrink-0 border-r border-gray-200 h-screen sticky top-0 overflow-y-auto p-4">
        <div class="mb-4">
          <Search client:visible />
        </div>
        <Sidebar nodes={sidebar} />
      </aside>

      <\!-- Center content -->
      <main class="flex-1 min-w-0 px-6 py-8 md:px-10 md:py-10 mt-14 md:mt-0">
        <article class="prose max-w-none">
          <slot />
        </article>
        <Pagination prev={prev} next={next} />
      </main>

      <\!-- Right TOC (hidden on mobile and small tablets) -->
      <aside class="hidden lg:block w-56 shrink-0 h-screen sticky top-0 overflow-y-auto p-4 pt-10">
        <TableOfContents headings={headings} client:visible />
      </aside>
    </div>
  </body>
</html>
```

**Do NOT:**

- Import components that do not exist yet — we create them in the following steps before this layout is actually rendered.
- Add `<link>` tags for CSS — Tailwind is imported via `global.css` in the frontmatter.

**Verify:**

- File parses without syntax errors: `pnpm astro check`.
- Full visual verification after all components exist (end of Phase C).

---

### Step 8: Build the Sidebar Astro components

**Files to create:**

- `ROOT/src/components/docs/Sidebar.astro`
- `ROOT/src/components/docs/SidebarSection.astro`

**Action:**

1. Create `ROOT/src/components/docs/Sidebar.astro`:

   ```astro
   ---
   import type { SidebarNode } from "@/types/docs";
   import SidebarSection from "./SidebarSection.astro";

   interface Props {
     nodes: SidebarNode[];
   }

   const { nodes } = Astro.props;
   ---

   <nav aria-label="Documentation sidebar">
     <ul class="space-y-1">
       {nodes.map((node) => (
         <li>
           {node.kind === "link" ? (
             <a
               href={node.href}
               class:list={[
                 "block px-3 py-1.5 rounded text-sm transition-colors",
                 node.active
                   ? "bg-blue-50 text-blue-700 font-medium"
                   : "text-gray-700 hover:bg-gray-100",
               ]}
               aria-current={node.active ? "page" : undefined}
             >
               {node.title}
             </a>
           ) : (
             <SidebarSection section={node} />
           )}
         </li>
       ))}
     </ul>
   </nav>
   ```

2. Create `ROOT/src/components/docs/SidebarSection.astro`:

   ```astro
   ---
   import type { SidebarSection as SidebarSectionType } from "@/types/docs";
   import Sidebar from "./Sidebar.astro";

   interface Props {
     section: SidebarSectionType;
   }

   const { section } = Astro.props;
   ---

   <details open={section.expanded}>
     <summary class="px-3 py-1.5 text-sm font-semibold text-gray-900 cursor-pointer select-none hover:bg-gray-50 rounded">
       {section.title}
     </summary>
     <div class="pl-3 mt-1">
       <Sidebar nodes={section.children} />
     </div>
   </details>
   ```

   Note: `Sidebar.astro` and `SidebarSection.astro` are mutually recursive. Astro handles this fine because it resolves components at build time per-render.

**Do NOT:**

- Add JavaScript to these components — they are fully static, rendered at build time.

**Verify:**

- `pnpm astro check` passes.

---

### Step 9: Build the Pagination component

**Files to create:**

- `ROOT/src/components/docs/Pagination.astro`

**Action:**

Create `ROOT/src/components/docs/Pagination.astro`:

```astro
---
import type { SidebarLink } from "@/types/docs";

interface Props {
  prev: SidebarLink | null;
  next: SidebarLink | null;
}

const { prev, next } = Astro.props;
---

<nav class="flex justify-between items-center mt-12 pt-6 border-t border-gray-200" aria-label="Pagination">
  {prev ? (
    <a href={prev.href} class="flex flex-col text-sm group">
      <span class="text-gray-500 group-hover:text-gray-700">Previous</span>
      <span class="text-blue-600 group-hover:text-blue-800 font-medium">{prev.title}</span>
    </a>
  ) : (
    <div />
  )}
  {next ? (
    <a href={next.href} class="flex flex-col items-end text-sm group">
      <span class="text-gray-500 group-hover:text-gray-700">Next</span>
      <span class="text-blue-600 group-hover:text-blue-800 font-medium">{next.title}</span>
    </a>
  ) : (
    <div />
  )}
</nav>
```

**Do NOT:**

- Add any JavaScript.

**Verify:**

- `pnpm astro check` passes.

---

### Step 10: Build the TableOfContents React component

**Files to create:**

- `ROOT/src/components/docs/TableOfContents.tsx`

**Action:**

Create `ROOT/src/components/docs/TableOfContents.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react';
import type { TocHeading } from '@/types/docs';

interface Props {
  headings: TocHeading[];
}

export default function TableOfContents({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the first heading that is intersecting
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: '0px 0px -80% 0px',
        threshold: 0,
      },
    );

    for (const el of elements) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        On this page
      </p>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li key={heading.slug}>
            <a
              href={`#${heading.slug}`}
              className={`block text-sm py-0.5 transition-colors ${
                heading.depth === 3 ? 'pl-3' : ''
              } ${
                activeId === heading.slug
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

**Do NOT:**

- Use scroll event listeners — IntersectionObserver is the correct approach.
- Add this component with `client:load` — it must use `client:visible` (set in the layout).

**Verify:**

- `pnpm astro check` passes.

---

### Step 11: Build the Search React component (Pagefind)

**Files to create:**

- `ROOT/src/components/docs/Search.tsx`

**Action:**

Create `ROOT/src/components/docs/Search.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";

interface PagefindResult {
  url: string;
  meta: { title: string };
  excerpt: string;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const pagefindRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load Pagefind on first interaction
  const loadPagefind = useCallback(async () => {
    if (pagefindRef.current) return;
    try {
      // Pagefind generates its assets at /pagefind/pagefind.js after build
      pagefindRef.current = await import(
        /* @vite-ignore */ "/pagefind/pagefind.js"
      );
      await pagefindRef.current.init();
    } catch {
      console.warn("Pagefind not available — run a production build to generate the search index.");
    }
  }, []);

  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      if (\!value.trim()) {
        setResults([]);
        return;
      }
      await loadPagefind();
      if (\!pagefindRef.current) return;

      const search = await pagefindRef.current.search(value);
      const data = await Promise.all(
        search.results.slice(0, 8).map((r: any) => r.data())
      );
      setResults(data);
    },
    [loadPagefind]
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        placeholder="Search docs..."
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={query}
        onFocus={() => { setIsOpen(true); loadPagefind(); }}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((result, i) => (
            <a
              key={i}
              href={result.url}
              className="block px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-gray-900">{result.meta.title}</div>
              <div
                className="text-gray-500 text-xs mt-0.5 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: result.excerpt }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Do NOT:**

- Import Pagefind at module top level — it must be lazy-loaded.
- Expect search to work in `dev` mode — it only works after `pnpm run build`.

**Verify:**

- `pnpm astro check` passes.
- Search will be verified end-to-end after the build step (Phase E).

---

### Step 12: Build the MobileNav React component

**Files to create:**

- `ROOT/src/components/docs/MobileNav.tsx`

**Action:**

Create `ROOT/src/components/docs/MobileNav.tsx`:

```tsx
import { useState } from "react";
import type { SidebarNode } from "@/types/docs";

interface Props {
  sidebar: SidebarNode[];
}

function SidebarTree({ nodes }: { nodes: SidebarNode[] }) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) =>
        node.kind === "link" ? (
          <li key={node.href}>
            <a
              href={node.href}
              className={`block px-3 py-2 rounded text-sm ${
                node.active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              {node.title}
            </a>
          </li>
        ) : (
          <li key={node.title}>
            <details open={node.expanded}>
              <summary className="px-3 py-2 text-sm font-semibold cursor-pointer">
                {node.title}
              </summary>
              <div className="pl-3">
                <SidebarTree nodes={node.children} />
              </div>
            </details>
          </li>
        )
      )}
    </ul>
  );
}

export default function MobileNav({ sidebar }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(\!isOpen)}
        className="p-2 text-gray-700 hover:bg-gray-100 rounded"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 top-14 z-40 bg-white overflow-y-auto p-4"
          role="dialog"
          aria-label="Navigation menu"
        >
          <nav>
            <SidebarTree nodes={sidebar} />
          </nav>
        </div>
      )}
    </>
  );
}
```

**Do NOT:**

- Use a portal or complex animation library — keep it simple for Phase 1.

**Verify:**

- `pnpm astro check` passes.

---

### Step 13: Build the dynamic route `[...slug].astro`

**Files to create:**

- `ROOT/src/pages/docs/[...slug].astro`

**Action:**

Create `ROOT/src/pages/docs/[...slug].astro`:

```astro
---
import type { GetStaticPaths } from "astro";
import { getCollection, render } from "astro:content";
import DocsLayout from "@/layouts/DocsLayout.astro";
import { buildSidebarTree, getPagination } from "@/lib/sidebar";
import { filterTocHeadings } from "@/lib/toc";

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection("docs", (entry) => {
    if (import.meta.env.PROD && entry.data.draft) return false;
    return true;
  });

  return docs.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
};

const { entry } = Astro.props;
const { Content, headings } = await render(entry);

const sidebar = await buildSidebarTree(entry.id);
const tocHeadings = filterTocHeadings(headings);
const { prev, next } = getPagination(sidebar, entry.id);
---

<DocsLayout
  title={entry.data.title}
  description={entry.data.description}
  sidebar={sidebar}
  headings={tocHeadings}
  prev={prev}
  next={next}
>
  <Content />
</DocsLayout>
```

Key points about Astro 5.x Content Layer API:

- `render()` is imported from `astro:content`, not called as `entry.render()`.
- The `entry.id` is the path-based ID generated by the glob loader (e.g., `"algorithms/binary-search"`), which is also used as the route slug.

**Do NOT:**

- Use `entry.render()` — that is the Astro v4 API. Use `render(entry)` from `astro:content`.
- Use `entry.slug` — Astro 5.x Content Layer uses `entry.id` for path-based identification.

**Verify:**

- Run `pnpm run dev`.
- Visit `http://localhost:4321/docs/getting-started/`. You should see the three-column layout with the sidebar on the left, the Getting Started content in the center, and a TOC on the right.
- Visit `http://localhost:4321/docs/algorithms/binary-search/`. The sidebar should show "Algorithms" as a collapsible section with "Binary Search" highlighted as active.
- Previous/Next links should appear at the bottom of each page.
- Resize the browser below 768px wide — the sidebar should disappear and a hamburger menu should appear.

---

## Phase D: Interactive React Island Components

### Step 14: Build the CodePlayground component

**Files to create:**

- `ROOT/src/components/islands/CodePlayground.tsx`

**Action:**

Create `ROOT/src/components/islands/CodePlayground.tsx`:

```tsx
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from '@codesandbox/sandpack-react';
import type { CodePlaygroundProps } from '@/types/docs';

export default function CodePlayground({
  files,
  template = 'react-ts',
  showPreview = true,
}: CodePlaygroundProps) {
  return (
    <div className="my-6 rounded-lg overflow-hidden border border-gray-200">
      <SandpackProvider template={template} files={files}>
        <SandpackLayout>
          <SandpackCodeEditor showLineNumbers showTabs style={{ minHeight: '300px' }} />
          {showPreview && <SandpackPreview style={{ minHeight: '300px' }} />}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
```

**Do NOT:**

- Add `client:visible` here — that directive is added in the MDX file or layout where the component is used.
- Add Sandpack themes or customizations beyond the defaults — keep it minimal for Phase 1.

**Verify:**

- `pnpm astro check` passes.
- Full visual verification after sample content is updated (Step 17).

---

### Step 15: Build the ParamDemo component

**Files to create:**

- `ROOT/src/components/islands/ParamDemo.tsx`

**Action:**

Create `ROOT/src/components/islands/ParamDemo.tsx`:

```tsx
import { useState } from 'react';
import type { ParamDemoProps, ParamDef } from '@/types/docs';

function initValues(params: Record<string, ParamDef>): Record<string, number | boolean | string> {
  const values: Record<string, number | boolean | string> = {};
  for (const [key, def] of Object.entries(params)) {
    values[key] = def.default;
  }
  return values;
}

function ControlInput({
  name,
  def,
  value,
  onChange,
}: {
  name: string;
  def: ParamDef;
  value: number | boolean | string;
  onChange: (value: number | boolean | string) => void;
}) {
  const label = def.label ?? name;

  if (def.type === 'number') {
    return (
      <label className="flex items-center gap-3 text-sm">
        <span className="w-24 text-gray-700">{label}</span>
        <input
          type="range"
          min={def.min ?? 0}
          max={def.max ?? 100}
          step={def.step ?? 1}
          value={value as number}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-10 text-right font-mono text-gray-500">{value}</span>
      </label>
    );
  }

  if (def.type === 'boolean') {
    return (
      <label className="flex items-center gap-3 text-sm">
        <span className="w-24 text-gray-700">{label}</span>
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
        />
      </label>
    );
  }

  if (def.type === 'select' && def.options) {
    return (
      <label className="flex items-center gap-3 text-sm">
        <span className="w-24 text-gray-700">{label}</span>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {def.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return null;
}

export default function ParamDemo({ params, children }: ParamDemoProps) {
  const [values, setValues] = useState(() => initValues(params));

  const updateValue = (key: string, value: number | boolean | string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="my-6 rounded-lg border border-gray-200 p-4">
      <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
        {Object.entries(params).map(([name, def]) => (
          <ControlInput
            key={name}
            name={name}
            def={def}
            value={values[name]}
            onChange={(v) => updateValue(name, v)}
          />
        ))}
      </div>
      <div>{children(values)}</div>
    </div>
  );
}
```

**Do NOT:**

- Store visualization logic in this component — the render prop (`children`) handles that.

**Verify:**

- `pnpm astro check` passes.

---

### Step 16: Build the AlgoVisualizer component

**Files to create:**

- `ROOT/src/components/islands/AlgoVisualizer.tsx`

**Action:**

Create `ROOT/src/components/islands/AlgoVisualizer.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import type { AlgoVisualizerProps } from "@/types/docs";

export default function AlgoVisualizer({
  steps,
  autoPlayInterval = null,
  children,
}: AlgoVisualizerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[currentIndex];

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, totalSteps - 1)));
    },
    [totalSteps]
  );

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && autoPlayInterval) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((i) => {
          if (i >= totalSteps - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, autoPlayInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, autoPlayInterval, totalSteps]);

  if (totalSteps === 0) return <div className="text-gray-500 text-sm">No steps to visualize.</div>;

  return (
    <div className="my-6 rounded-lg border border-gray-200 p-4">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          aria-label="Previous step"
        >
          Prev
        </button>

        {autoPlayInterval && (
          <button
            onClick={() => setIsPlaying(\!isPlaying)}
            className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        )}

        <button
          onClick={next}
          disabled={currentIndex === totalSteps - 1}
          className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          aria-label="Next step"
        >
          Next
        </button>

        <span className="ml-auto text-xs text-gray-500">
          Step {currentIndex + 1} / {totalSteps}
          {currentStep.label && ` — ${currentStep.label}`}
        </span>
      </div>

      {/* Visualization (render prop) */}
      <div>{children(currentStep, currentIndex)}</div>
    </div>
  );
}
```

**Do NOT:**

- Include any specific visualization logic — this is generic.

**Verify:**

- `pnpm astro check` passes.

---

### Step 17: Update sample content with interactive components

**Files to modify:**

- `ROOT/src/content/docs/getting-started.mdx`
- `ROOT/src/content/docs/algorithms/binary-search.mdx`

**Action:**

1. Replace `ROOT/src/content/docs/getting-started.mdx` with:

   ````mdx
   ---
   title: 'Getting Started'
   description: 'Introduction to the docs framework.'
   order: 1
   ---

   import CodePlayground from '@/components/islands/CodePlayground';

   # Getting Started

   Welcome to the docs framework. This page demonstrates the core features.

   ## Installation

   Run the install command:

   ```bash
   pnpm install
   ```

   ## Live Code Example

   Try editing the code below:

   <CodePlayground
     client:visible
     files={{
       '/App.tsx': `export default function App() {
     return <h1>Hello from the docs framework\!</h1>;
   }`,
     }}
   />

   ## Configuration

   Configuration is done via `astro.config.ts`.

   ### Advanced Options

   These options are for advanced users.
   ````

2. Replace `ROOT/src/content/docs/algorithms/binary-search.mdx` with:

   ````mdx
   ---
   title: 'Binary Search'
   description: 'A walkthrough of the binary search algorithm.'
   order: 1
   ---

   import AlgoVisualizer from '@/components/islands/AlgoVisualizer';
   import ParamDemo from '@/components/islands/ParamDemo';

   # Binary Search

   Binary search finds an element in a sorted array in O(log n) time.

   ## How It Works

   1. Compare the target with the middle element.
   2. If the target matches, return the index.
   3. If the target is less, search the left half.
   4. If the target is greater, search the right half.

   ## Step-Through Visualization

   export const binarySearchSteps = [
     { label: 'Start', data: { array: [1, 3, 5, 7, 9, 11], lo: 0, hi: 5, mid: 2, target: 7 } },
     { label: 'Go right', data: { array: [1, 3, 5, 7, 9, 11], lo: 3, hi: 5, mid: 4, target: 7 } },
     { label: 'Go left', data: { array: [1, 3, 5, 7, 9, 11], lo: 3, hi: 3, mid: 3, target: 7 } },
     { label: 'Found\!', data: { array: [1, 3, 5, 7, 9, 11], lo: 3, hi: 3, mid: 3, target: 7 } },
   ];

   export const StepView = ({ data, index }) => (
     <div className="font-mono text-sm">
       <div className="flex gap-2 mb-2">
         {data.array.map((val, i) => (
           <div
             key={i}
             className={`w-10 h-10 flex items-center justify-center rounded border ${
               i === data.mid
                 ? 'bg-yellow-200 border-yellow-500'
                 : i >= data.lo && i <= data.hi
                   ? 'bg-blue-50 border-blue-300'
                   : 'bg-gray-50 border-gray-200'
             }`}
           >
             {val}
           </div>
         ))}
       </div>
       <div className="text-gray-500">
         Target: {data.target} | lo: {data.lo} | hi: {data.hi} | mid: {data.mid}
       </div>
     </div>
   );

   <AlgoVisualizer steps={binarySearchSteps} autoPlayInterval={1000} client:visible>
     {(step, index) => <StepView data={step.data} index={index} />}
   </AlgoVisualizer>

   ## Array Size Impact

   <ParamDemo
     params={{
       size: { type: 'number', default: 10, min: 1, max: 1000, step: 1, label: 'Array size (n)' },
     }}
     client:visible
   >
     {(values) => (
       <div className="text-sm font-mono">
         <p>Array size: {values.size}</p>
         <p>Max comparisons (log2 n): {Math.ceil(Math.log2(Number(values.size) || 1))}</p>
         <p>Linear search comparisons: {values.size}</p>
       </div>
     )}
   </ParamDemo>

   ## Implementation

   ```typescript
   function binarySearch(arr: number[], target: number): number {
     let lo = 0,
       hi = arr.length - 1;
     while (lo <= hi) {
       const mid = Math.floor((lo + hi) / 2);
       if (arr[mid] === target) return mid;
       if (arr[mid] < target) lo = mid + 1;
       else hi = mid - 1;
     }
     return -1;
   }
   ```

   ### Complexity Analysis

   - Time: O(log n)
   - Space: O(1)
   ````

**Do NOT:**

- Remove any heading levels — they are needed to verify TOC generation.

**Verify:**

- Run `pnpm run dev`.
- Visit `http://localhost:4321/docs/getting-started/`. The Sandpack code editor should appear and be interactive.
- Visit `http://localhost:4321/docs/algorithms/binary-search/`. The AlgoVisualizer should show step-through controls. The ParamDemo should show a slider.
- If inline function children (`{(values) => ...}`) do not work in MDX, switch to a `render` prop pattern as documented in DESIGN.md Risk 1. Change the component interface to accept a `render` prop instead of `children`, and update the MDX to use `render={(values) => ...}`.

---

## Phase E: Build Pipeline and Search

### Step 18: Configure the build script with Pagefind

**Files to modify:**

- `ROOT/package.json`

**Action:**

Add or update the `scripts` section in `ROOT/package.json`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && pagefind --site dist",
    "preview": "astro preview",
    "check": "astro check"
  }
}
```

**Do NOT:**

- Change any other fields in `package.json`.

**Verify:**

- Run `pnpm run build`. The build should complete without errors.
- After build, verify `ROOT/dist/pagefind/` directory exists and contains `pagefind.js` and index files.
- Run `pnpm run preview` and visit `http://localhost:4321/docs/getting-started/`.
- Click the search input, type "binary" — search results should appear linking to the Binary Search page.

---

### Step 19: Add a docs index redirect

**Files to create:**

- `ROOT/src/pages/docs/index.astro`

**Action:**

Create `ROOT/src/pages/docs/index.astro` to redirect `/docs/` to the first page:

```astro
---
import { getCollection } from "astro:content";
import { buildSidebarTree, flattenSidebarLinks } from "@/lib/sidebar";

const sidebar = await buildSidebarTree("");
const links = flattenSidebarLinks(sidebar);
const firstPage = links[0]?.href ?? "/";

return Astro.redirect(firstPage);
---
```

Note: For static builds, `Astro.redirect()` generates a meta-refresh HTML page or a redirect rule. This is fine for Phase 1.

**Do NOT:**

- Create a full index page with custom content — just redirect to the first doc.

**Verify:**

- Run `pnpm run dev`.
- Visit `http://localhost:4321/docs/`. You should be redirected to `http://localhost:4321/docs/getting-started/`.

---

## Phase F: Verification and Cleanup

### Step 20: End-to-end verification checklist

This step has no files to create. Run through this checklist manually:

**Dev mode (`pnpm run dev`):**

1. `http://localhost:4321/docs/getting-started/` loads with three-column layout.
2. Sidebar shows "Getting Started" (active, highlighted) and "Algorithms" section with "Binary Search" child.
3. TOC on the right shows h2/h3 headings from the page. Scrolling highlights the active heading.
4. Pagination shows "Next: Binary Search" at the bottom (no Previous link on first page).
5. Navigate to `/docs/algorithms/binary-search/`. Pagination shows "Previous: Getting Started" (no Next).
6. The Algorithms section in sidebar is expanded with Binary Search highlighted.
7. `CodePlayground` on the Getting Started page renders a Sandpack editor with editable code and live preview.
8. `AlgoVisualizer` on Binary Search page shows step controls. Clicking Next/Prev advances the visualization. Play auto-advances.
9. `ParamDemo` on Binary Search page shows a slider. Moving the slider updates the computed values.
10. Resize browser below 768px. Sidebar and TOC disappear. Hamburger menu appears. Tapping it shows sidebar in an overlay.

**Production build (`pnpm run build && pnpm run preview`):**

11. Build completes without errors.
12. Pagefind index is generated in `dist/pagefind/`.
13. Search works: type a query and see results with page links.
14. All pages load correctly in preview mode.
15. No JavaScript is loaded for off-screen interactive components on initial page load (verify in browser DevTools Network tab — Sandpack JS should not appear until you scroll to the CodePlayground).

**If any check fails:** Debug and fix before considering the implementation complete. The most likely failure points are:

- MDX inline function children not working (see Step 17 fallback note)
- `_meta.ts` files being picked up by Content Collections (rename to `_meta.config.ts` if needed)
- Pagefind path issues (adjust the import path in `Search.tsx`)
- Astro 5.x API differences (check `render()` import, `entry.id` vs `entry.slug`)

---

## Summary of All Files Created

```
ROOT/
├── astro.config.ts                                    (Step 1)
├── tsconfig.json                                      (Step 1)
├── package.json                                       (Step 1, modified Step 18)
├── src/
│   ├── content.config.ts                              (Step 3)
│   ├── env.d.ts                                       (Step 1)
│   ├── styles/
│   │   └── global.css                                 (Step 1)
│   ├── types/
│   │   └── docs.ts                                    (Step 2)
│   ├── lib/
│   │   ├── sidebar.ts                                 (Step 5)
│   │   └── toc.ts                                     (Step 6)
│   ├── layouts/
│   │   └── DocsLayout.astro                           (Step 7)
│   ├── components/
│   │   ├── docs/
│   │   │   ├── Sidebar.astro                          (Step 8)
│   │   │   ├── SidebarSection.astro                   (Step 8)
│   │   │   ├── Pagination.astro                       (Step 9)
│   │   │   ├── TableOfContents.tsx                    (Step 10)
│   │   │   ├── Search.tsx                             (Step 11)
│   │   │   └── MobileNav.tsx                          (Step 12)
│   │   └── islands/
│   │       ├── CodePlayground.tsx                     (Step 14)
│   │       ├── ParamDemo.tsx                          (Step 15)
│   │       └── AlgoVisualizer.tsx                     (Step 16)
│   ├── pages/
│   │   └── docs/
│   │       ├── [...slug].astro                        (Step 13)
│   │       └── index.astro                            (Step 19)
│   └── content/
│       └── docs/
│           ├── _meta.ts                               (Step 4)
│           ├── getting-started.mdx                    (Step 4, modified Step 17)
│           └── algorithms/
│               ├── _meta.ts                           (Step 4)
│               └── binary-search.mdx                  (Step 4, modified Step 17)
└── docs/
    └── specs/                                         (pre-existing, not modified)
```

## Dependency Graph

```
Step 1 (scaffold) ──┬── Step 2 (types)
                    │      │
                    │      ├── Step 3 (content config)
                    │      │      │
                    │      │      └── Step 4 (sample content)
                    │      │
                    │      ├── Step 5 (sidebar builder) ────┐
                    │      │                                │
                    │      └── Step 6 (toc util) ───────────┤
                    │                                       │
                    └── Steps 7-12 (layout + components) ◄──┘
                           │
                           └── Step 13 (route) ──── Step 17 (update content)
                                                       │
                    Steps 14-16 (islands) ─────────────┘
                                                       │
                                          Step 18 (build script)
                                                       │
                                          Step 19 (index redirect)
                                                       │
                                          Step 20 (verification)
```
