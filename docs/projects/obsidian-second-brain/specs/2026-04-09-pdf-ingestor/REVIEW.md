# Code Review: PDF Ingestor

## Summary
- Files reviewed: 4 (`src/ingestor/pdf-ingestor.ts`, `src/ui/ingest-pdf-modal.ts`, `src/main.ts`, `esbuild.config.mjs`)
- Issues found: 0 critical, 2 warning, 2 info
- Verdict: **APPROVED**

## Issues

### Critical (must fix before merge)

None.

### Warning (should fix, not blocking)

1. **src/ingestor/pdf-ingestor.ts:100-106** — `loadPdfjs()` is called on every `ingest()` invocation, which re-requires the module and re-sets `GlobalWorkerOptions.workerSrc` each time.
   - **Why**: While Node's `require` cache means the module itself is not re-parsed, re-setting `GlobalWorkerOptions.workerSrc = ""` on every call is unnecessary work and slightly misleading — it reads as if the module needs fresh initialization each time.
   - **Suggested fix**: Cache the loaded `pdfjsLib` in an instance field (e.g., `private pdfjsLib: any`) and only call `require` + set `workerSrc` on the first invocation. This is a minor optimization and can be deferred.

2. **src/ui/ingest-pdf-modal.ts:90-123** — No guard against double-click. If a user clicks a PDF item twice quickly before the UI disables, `doIngest` will run concurrently for the same file.
   - **Why**: Could produce duplicate ingested notes. The `pointerEvents = "none"` style disables further clicks, but there is a small window between the click event firing and the style being applied.
   - **Suggested fix**: Add a boolean guard `private ingesting = false;` at the top of `doIngest`, returning early if already true. This matches a common defensive pattern for async UI handlers.

### Info (suggestions for improvement)

1. **src/ingestor/pdf-ingestor.ts (general)** — The `slugify`, `resolveFilePath`, `ensureFolder` helpers are now duplicated across three files (`url-ingestor.ts`, `youtube-ingestor.ts`, `pdf-ingestor.ts`). The requirements explicitly accept this, but it is worth noting that a shared utility extraction would reduce the maintenance surface. This is a good candidate for a follow-up refactor.

2. **src/ingestor/pdf-ingestor.ts:101** — The hardcoded path `pdfjs-dist/legacy/build/pdf.mjs` is fragile across pdfjs-dist major version changes. A comment noting which pdfjs-dist version this targets (v5.x based on `package.json`) would help future maintainers.

## Security Scan

- No hardcoded secrets, API keys, or tokens found.
- No network requests are made by `PdfIngestor` — it only reads from the local vault binary, as required.
- The `file.path` value used in frontmatter comes from Obsidian's `TFile.path`, which is vault-relative and controlled by the vault API — no path traversal risk.
- `pdfjs-dist` is loaded via absolute path from `node_modules` within the plugin directory — no arbitrary path injection possible since `pluginDir` is derived from `this.manifest.dir` in `main.ts`.
- No user input is interpolated into shell commands or SQL.

## What Went Well

- **Exact pattern adherence**: The `PdfIngestor` class mirrors the constructor signature, helper methods, error message formats, and progress callback pattern of the existing `UrlIngestor` and `YouTubeIngestor` precisely. This consistency makes the codebase predictable.
- **Thorough error handling**: All five error paths from the requirements are covered with the exact specified messages — vault read failure, parse failure, password protection, empty/scanned PDF, and save failure. The `getMetadata()` call is also wrapped in try/catch with a sensible fallback, which goes beyond the minimum.
- **Clean modal implementation**: The file picker with real-time filtering, progress display, disable-on-ingest, and re-enable-on-error closely follows the `IngestUrlModal` pattern while adapting it well for the file-selection use case. The hover styling using CSS variables is a nice touch for theme compatibility.
- **Correct frontmatter field order**: `url`, `title`, `source_type`, `pages`, `ingested_at` matches the requirements exactly, with `pages` as an unquoted integer.
- **Minimal main.ts changes**: Only the necessary imports, field, instantiation, and command registration were added — no unrelated modifications.
- **esbuild config**: `pdfjs-dist` correctly added to the `external` array, matching the established pattern for runtime-loaded modules.

## Checklist Verification

| Requirement | Status |
|---|---|
| Command `kb-ingest-pdf` registered | Pass |
| `IngestPdfModal` shows PDF file list | Pass |
| Real-time search filter (case-insensitive) | Pass |
| Empty vault message | Pass |
| Disable UI during ingestion | Pass |
| Success message + auto-close 2s | Pass |
| Error display + re-enable for retry | Pass |
| `vault.readBinary()` for PDF reading | Pass |
| Page-by-page text extraction | Pass |
| Empty pages skipped | Pass |
| Title from metadata or filename fallback | Pass |
| Frontmatter fields in correct order | Pass |
| `## Page N` headings in body | Pass |
| `slugify` / `resolveFilePath` / `ensureFolder` match existing | Pass |
| Progress callbacks (phase + per-page) | Pass |
| All 5 error messages match spec | Pass |
| `pdfjs-dist` external in esbuild | Pass |
| Worker disabled (`workerSrc = ""`) | Pass |
| No changes to existing ingestors or types | Pass |
| Constructor pattern matches design (`vault`, `getIngestFolder`, `pluginDir`) | Pass |

## Verdict

**APPROVED** — ready to merge. The implementation faithfully follows the requirements, design, and plan documents. The two warnings (module caching and double-click guard) are non-blocking quality improvements that can be addressed in a follow-up if desired.
