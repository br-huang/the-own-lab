import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://rongying.co", // placeholder; update before production deploy
  output: "static",
  integrations: [mdx(), react()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        // Pagefind is generated post-build by `pagefind --site dist`.
        // It does not exist during Astro's build phase, so Rollup must
        // skip resolution and preserve the dynamic import() for runtime.
        external: ["/pagefind/pagefind.js"],
      },
    },
  },
});
