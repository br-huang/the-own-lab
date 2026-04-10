# UI Storybook Verification

## Commands

Run from the workspace root:

```bash
pnpm nx run ui:typecheck
pnpm nx run ui:lint
pnpm nx run ui:build-storybook
```

## Expected Result

- Storybook config compiles successfully
- Shared UI stories build into `packages/ui/storybook-static`
- Shared theme CSS is loaded in Storybook
- Light and dark mode toolbar switching works
- Representative stories render for:
  - `Button`
  - `Input`
  - `Dialog`
  - `Sidebar`
  - `Table`

## Notes

- Vite may emit warnings about `"use client"` directives from dependencies; these do not block the Storybook build in the current setup.
- Nx Cloud credential warnings are unrelated to the Storybook feature itself.
