import type { TocHeading } from "@/types/docs";

/**
 * Filter headings from Astro's render() output to only h2 and h3.
 * The input comes from `entry.render()` which returns `{ headings }`.
 */
export function filterTocHeadings(
  headings: Array<{ depth: number; slug: string; text: string }>
): TocHeading[] {
  return headings.filter((h) => h.depth === 2 || h.depth === 3);
}
