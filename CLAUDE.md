# Personal Brand Website

## Project Structure

This project is built in 3 sequential sessions. **Read `docs/SESSION-GUIDE.md` first** to understand which session you are in and what your scope is.

## Tech Stack

- Astro 5.x (static output)
- React 19 (islands only, `client:visible`)
- Tailwind CSS 4 (CSS-based config via `@tailwindcss/vite`, NO `tailwind.config.js`)
- TypeScript 5.5+
- Sandpack (code playground, TS/JS)
- Pagefind (static search)
- pnpm (package manager)
- Cloudflare Pages (deployment)

## Key Astro 5.x Conventions

- Content collection config: `src/content.config.ts` (NOT `src/content/config.ts`)
- Uses `glob()` loader from `astro/loaders` (NOT `type: "content"`)
- `render(entry)` imported from `astro:content` (NOT `entry.render()`)
- `entry.id` for path-based identification (NOT `entry.slug`)

## Key Tailwind v4 Conventions

- No `tailwind.config.js` or `tailwind.config.ts`
- Config is done in CSS: `@import "tailwindcss"` in `global.css`
- Theme customization via `@theme {}` block in CSS
- Uses `@tailwindcss/vite` plugin (NOT `@astrojs/tailwind`)

## Specs

- `docs/SESSION-GUIDE.md` — Session scope, dependencies, and contracts
- `docs/specs/2026-04-07-docs-framework/` — Requirements, Design, Plan for Docs Framework
- `docs/specs/2026-04-08-brand-style/` — Requirements for Brand Style & Content

## Git Conventions

- Commit messages: `type(scope): description` (e.g., `feat(docs): add sidebar builder`)
- Feature branches: `feature/{feature-slug}`
- Merge to `main` when session is complete
