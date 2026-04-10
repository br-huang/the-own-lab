# docs/

Personal documentation vault. Also serves as an Obsidian workspace.

## Structure

```
projects/   → project management (specs, ADR, issues, wiki, changelog) per project
knowledge/  → personal domain knowledge base (not project-specific)
inbox/      → unsorted notes, triage regularly
archive/    → retired docs
assets/     → PDFs, images, attachments
excalidraw/ → diagrams
```

## Rules

- `projects/` is the single source of truth for all project artifacts. See `projects/CLAUDE.md` for format.
- `knowledge/` is personal reference — not tied to any project.
- Never create `docs/` inside `apps/`, `packages/`, or `scripts/`.
- All spec, ADR, issue, and wiki files live under `projects/<project-name>/`.
