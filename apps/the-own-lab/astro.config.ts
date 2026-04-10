import { defineConfig } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

function uiSourceAlias() {
  const uiSrcRoot = fileURLToPath(new URL('../../packages/ui/src', import.meta.url));

  return {
    name: 'ui-source-alias',
    enforce: 'pre' as const,
    async resolveId(source: string, importer?: string) {
      if (!importer?.includes('/packages/ui/src/') || !source.startsWith('@/')) {
        return null;
      }

      const target = path.resolve(uiSrcRoot, source.slice(2));
      return this.resolve(target, importer, { skipSelf: true });
    },
  };
}

export default defineConfig({
  site: 'https://rongying.co', // placeholder; update before production deploy
  output: 'static',
  integrations: [mdx(), react()],
  vite: {
    plugins: [uiSourceAlias(), tailwindcss()],
    build: {
      rollupOptions: {
        // Pagefind is generated post-build by `pagefind --site dist`.
        // It does not exist during Astro's build phase, so Rollup must
        // skip resolution and preserve the dynamic import() for runtime.
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
});
