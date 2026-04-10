# UI Package Verification

## Commands

Run from the workspace root:

```bash
pnpm nx run ui:typecheck
pnpm nx run ui:lint
```

## Expected Result

- TypeScript passes for `packages/ui`
- ESLint passes for `packages/ui`
- New shared components are exported from `packages/ui/src/index.ts`
- Dependencies required by shared components are declared in `packages/ui/package.json`

## Manual Review Checklist

- Shared primitives are imported from `ui` rather than duplicated in app code.
- New reusable UI work lands in `packages/ui` before app-local implementation is considered.
- Components use semantic theme tokens and `cn()` composition.
- Added components remain generic and do not encode app-specific business logic.
