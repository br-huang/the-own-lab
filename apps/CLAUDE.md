# apps/

Deployable applications. Each app runs independently and may depend on `packages/` but never on other apps.

## Projects

| Name                 | Stack              | Notes                    |
| -------------------- | ------------------ | ------------------------ |
| browser              | Electron + Lit     | Custom web browser       |
| never-forget-list    | Swift (macOS)      | macOS-only, Xcode build  |
| obsidian-second-brain| TypeScript/Obsidian | AI-powered RAG knowledge base |
| open-codex           | Reference          | Read-only reference fork |
| open-typora          | TypeScript         | Markdown editor          |
| social-worker-ai     | JavaScript         | AI social worker         |
| the-own-lab          | Astro              | Personal website/lab     |
| ultra-terminal       | Swift (macOS)      | macOS-only terminal app  |

## Rules

- Apps may import from `packages/` only. No cross-app imports.
- macOS-only apps are tagged `platform:macos` and excluded from Linux CI.
- Check `packages/ui` before creating app-local UI primitives.
- Documentation lives in `docs/projects/<app-name>/`, not here.
