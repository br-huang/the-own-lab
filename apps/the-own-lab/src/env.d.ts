/// <reference path="../.astro/types.d.ts" />

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module '*/pagefind/pagefind.js' {
  export function init(): Promise<void>;
  export function search(query: string): Promise<{
    results: Array<{
      data: () => Promise<{
        url: string;
        meta: { title: string };
        excerpt: string;
      }>;
    }>;
  }>;
}
