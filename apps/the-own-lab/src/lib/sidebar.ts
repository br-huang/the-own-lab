import { getCollection } from 'astro:content';
import type { MetaConfig, SidebarNode, SidebarLink, SidebarSection } from '@/types/docs';

/**
 * Convert a kebab-case string to Title Case.
 * "binary-search" → "Binary Search"
 */
export function kebabToTitle(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Load all _meta.ts files from src/content/docs/.
 * Returns a Map keyed by directory path relative to src/content/docs/.
 * For the root directory, the key is "".
 * For "algorithms/", the key is "algorithms".
 */
async function loadMetaFiles(): Promise<Map<string, MetaConfig>> {
  const metaModules = import.meta.glob<{ default: MetaConfig }>('/src/content/docs/**/_meta.ts', {
    eager: true,
  });

  const metaMap = new Map<string, MetaConfig>();

  for (const [path, mod] of Object.entries(metaModules)) {
    // path example: "/src/content/docs/_meta.ts" → dir = ""
    // path example: "/src/content/docs/algorithms/_meta.ts" → dir = "algorithms"
    const dir = path
      .replace('/src/content/docs/', '')
      .replace('/_meta.ts', '')
      .replace('_meta.ts', ''); // handles root case where path ends with just "_meta.ts"
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
  const allDocs = await getCollection('docs', (entry) => {
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
    const parts = doc.id.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    if (!docsByDir.has(dir)) docsByDir.set(dir, []);
    docsByDir.get(dir)!.push(doc);
  }

  // Collect all directory paths that have children (for building sections)
  const allDirs = new Set<string>();
  allDirs.add(''); // root always exists
  for (const doc of allDocs) {
    const parts = doc.id.split('/');
    if (parts.length > 1) {
      // Add all ancestor directories
      for (let i = 1; i < parts.length; i++) {
        allDirs.add(parts.slice(0, i).join('/'));
      }
    }
  }

  function buildLevel(dir: string): SidebarNode[] {
    const meta = metaMap.get(dir);
    const nodes: SidebarNode[] = [];

    // Add document links at this level
    const docsAtLevel = docsByDir.get(dir) ?? [];
    for (const doc of docsAtLevel) {
      const filename = doc.id.split('/').pop()!;
      const metaItem = meta?.items[filename];

      const title = metaItem?.title ?? doc.data.title ?? kebabToTitle(filename);
      const order = metaItem?.order ?? doc.data.order ?? Infinity;
      const href = `/docs/${doc.id}/`;

      nodes.push({
        kind: 'link',
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
      const expectedPrefix = dir === '' ? '' : dir + '/';
      const relative = dir === '' ? childDir : childDir.slice(expectedPrefix.length);
      if (!childDir.startsWith(expectedPrefix) || relative.includes('/')) continue;

      const folderName = relative;
      const childMeta = metaMap.get(childDir);
      const parentMeta = meta?.items[folderName];

      const sectionTitle = childMeta?.label ?? parentMeta?.title ?? kebabToTitle(folderName);
      const sectionOrder = parentMeta?.order ?? Infinity;

      const children = buildLevel(childDir);
      const expanded = children.some(
        (child) =>
          (child.kind === 'link' && child.active) || (child.kind === 'section' && child.expanded),
      );

      nodes.push({
        kind: 'section',
        title: sectionTitle,
        order: sectionOrder,
        children,
        expanded,
      } satisfies SidebarSection);
    }

    // Sort by order, then alphabetically by title
    nodes.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });

    return nodes;
  }

  return buildLevel('');
}

/**
 * Flatten the sidebar tree into an ordered list of links (for pagination).
 */
export function flattenSidebarLinks(nodes: SidebarNode[]): SidebarLink[] {
  const links: SidebarLink[] = [];
  for (const node of nodes) {
    if (node.kind === 'link') {
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
  currentSlug: string,
): { prev: SidebarLink | null; next: SidebarLink | null } {
  const flat = flattenSidebarLinks(nodes);
  const index = flat.findIndex((link) => link.href === `/docs/${currentSlug}/`);
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}
