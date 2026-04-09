# Design: PDF Ingestor

## Codebase Analysis

### Existing Ingestor Pattern

The project has two ingestors that follow an identical structural pattern:

- **`src/ingestor/url-ingestor.ts`** — `UrlIngestor` class. Constructor takes `(vault: Vault, getIngestFolder: () => string)`. Public method `ingest(url, onProgress?)` returns `Promise<IngestResult>`. Contains private helpers: `slugify`, `resolveFilePath`, `ensureFolder`, `buildFrontmatter`.
- **`src/ingestor/youtube-ingestor.ts`** — `YouTubeIngestor` class. Same constructor signature. Same private helpers (duplicated). Imports `IngestPhase`, `IngestResult`, `OnProgress` from `url-ingestor.ts`.

Both ingestors duplicate `slugify`, `resolveFilePath`, `ensureFolder`, and `buildFrontmatter`. The requirements explicitly state that duplication is acceptable until a shared utility module is introduced.

### Shared Types (exported from `url-ingestor.ts`)

```typescript
type IngestPhase = "fetching" | "extracting" | "saving";
interface IngestResult { title: string; filePath: string; }
type OnProgress = (phase: IngestPhase) => void;
```

### Modal Pattern

`src/ui/ingest-url-modal.ts` — `IngestUrlModal extends Modal`. Constructor takes `(app: App, ingestor: UrlIngestor)`. Uses `onOpen()` to build DOM, a private `doIngest()` method that disables UI, calls `ingestor.ingest()` with an `OnProgress` callback, shows success/error, and auto-closes after 2 seconds on success.

### Plugin Registration (`src/main.ts`)

- `urlIngestor` is a private field, instantiated in `onload()`.
- Command `kb-ingest-url` opens `new IngestUrlModal(this.app, this.urlIngestor)`.
- `pluginDir` is already computed (line 44-46) for resolving `@xenova/transformers` from `node_modules`.

### External Module Loading Pattern (`src/llm/local-embeddings.ts`)

For modules marked external in esbuild, the project uses `require()` with an absolute path:

```typescript
const modulePath = path.join(this.pluginDir, "node_modules", "@xenova", "transformers");
const { pipeline } = require(modulePath);
```

This is necessary because Obsidian's Electron renderer cannot resolve bare module specifiers via dynamic `import()`.

### esbuild Config

`esbuild.config.mjs` lists external modules (obsidian, electron, codemirror, @xenova/transformers, onnxruntime-node, sharp). `pdfjs-dist` must be added here.

---

## Proposed Approach

### Architecture

`PdfIngestor` follows the same class-per-ingestor pattern as `UrlIngestor` and `YouTubeIngestor`. It is a standalone class in `src/ingestor/pdf-ingestor.ts` that duplicates the common helpers (`slugify`, `resolveFilePath`, `ensureFolder`, `buildFrontmatter`).

A new modal `IngestPdfModal` in `src/ui/ingest-pdf-modal.ts` provides a file-picker UI (not a URL input). It lists all `.pdf` files in the vault, supports real-time filtering, and drives the ingestor with progress callbacks.

The `PdfIngestor` constructor takes a third parameter `pluginDir: string` to resolve `pdfjs-dist` via absolute path `require()`, matching the `LocalEmbeddingProvider` pattern.

### Data Flow

```
User clicks "KB: Ingest PDF"
  → IngestPdfModal opens, lists .pdf files from vault.getFiles()
  → User selects a file (or filters then selects)
  → modal calls pdfIngestor.ingest(file, onProgress, onPageProgress)
    → onProgress("fetching")
    → vault.readBinary(file) → ArrayBuffer
    → onProgress("extracting")
    → require(pdfjs-dist) → pdfjsLib.getDocument({ data }) → pdfDocument
    → pdfDocument.getMetadata() → title resolution
    → for each page 1..N:
        → page.getTextContent() → items → join text
        → onPageProgress(current, total)
    → filter empty pages
    → if all pages empty → throw OCR error
    → build frontmatter + markdown body
    → onProgress("saving")
    → ensureFolder → resolveFilePath → vault.create()
  → modal shows success, auto-closes after 2s
```

### pdfjs-dist Loading Strategy

`pdfjs-dist` is loaded at runtime via `require()` with an absolute path, identical to the `@xenova/transformers` pattern:

```typescript
const pdfjsPath = path.join(this.pluginDir, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs");
const pdfjsLib = require(pdfjsPath);
pdfjsLib.GlobalWorkerOptions.workerSrc = "";
```

We use the `legacy` build because it targets older JS and avoids ESM-only issues in Electron's CJS context. The worker is disabled because Obsidian plugins run in the renderer process and cannot spawn dedicated Web Workers for bundled code.

**Note:** If the `legacy/build/pdf.mjs` path does not resolve correctly at runtime (CJS require of .mjs), the fallback is `pdfjs-dist/build/pdf.js` or `pdfjs-dist/legacy/build/pdf.js`. The exact path will be verified during Step 1 of implementation by inspecting the installed package.

### Per-Page Progress

The `OnProgress` type only carries a phase string, not numeric progress. Per-page updates use a separate callback:

```typescript
onPageProgress?: (current: number, total: number) => void
```

The modal uses this to display `"Extracting page X / Y..."`.

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| A. Standalone PdfIngestor (chosen) | Follows existing pattern exactly; no refactoring risk; isolated changes | Duplicates slugify/resolveFilePath/ensureFolder again |
| B. Extract shared base class first | Removes duplication; cleaner long-term | Scope creep; touches UrlIngestor and YouTubeIngestor; increases risk for a feature PR |
| C. Bundle pdfjs-dist into main.js | No runtime require complexity | Significantly increases bundle size (~1.5 MB); slower plugin load |

**Decision:** Approach A. Duplication is explicitly accepted by the requirements. Shared utility extraction is a separate follow-up.

---

## Key Decisions

- **pdfjs-dist as external + absolute require**: matches the @xenova/transformers precedent. Avoids bundle bloat. Requires `pluginDir` in constructor.
- **Worker disabled**: `GlobalWorkerOptions.workerSrc = ""` — Obsidian's renderer does not support spawning workers for plugin code. All parsing runs on the main thread.
- **Title resolution**: Use `metadata.info.Title` if non-empty; otherwise fallback to filename without `.pdf` extension.
- **Frontmatter field order**: `url`, `title`, `source_type`, `pages`, `ingested_at` — as specified in requirements, with `source_type: "pdf"`.
- **`url` field holds vault-relative path**: Not a URL. This is consistent with the field name being overloaded across ingestor types (web URL, YouTube URL, vault path).
- **File picker modal (not system dialog)**: Obsidian does not expose a native file picker for vault files. We list `.pdf` files programmatically and let the user search/filter. This is a simpler, cross-platform approach.
- **No new settings fields**: Reuses `ingestFolder` from `PluginSettings`.

---

## Dependencies & Risks

- **pdfjs-dist in Electron/CJS context**: The `require()` of pdfjs-dist may need the `legacy` build or a specific entry point. Mitigation: verify the exact path after `npm install` in Step 1 and adjust if needed.
- **Scanned/image-only PDFs**: `getTextContent()` returns empty items for image-only pages. Mitigation: detect all-empty and throw a clear error message explaining OCR is not supported.
- **Large PDFs (100+ pages)**: Main-thread parsing could block the UI. Mitigation: the per-page progress callback keeps the user informed. For the initial release, this is acceptable. A future enhancement could use `setTimeout(0)` between pages to yield to the event loop.
- **Password-protected PDFs**: pdfjs-dist throws `PasswordException`. Mitigation: catch specifically and rethrow with a user-friendly message.
- **pdfjs-dist version compatibility**: Different versions have different API surfaces. Mitigation: pin to a known-good version (e.g., `^4.x`) and verify the API in implementation.

---

## Files Affected

- **`package.json`** — add `pdfjs-dist` dependency
- **`esbuild.config.mjs`** — add `"pdfjs-dist"` to the `external` array
- **`src/ingestor/pdf-ingestor.ts`** — NEW: `PdfIngestor` class with `ingest()`, `loadPdf()`, `extractPageText()`, `buildMarkdown()`, `buildFrontmatter()`, `slugify()`, `resolveFilePath()`, `ensureFolder()`
- **`src/ui/ingest-pdf-modal.ts`** — NEW: `IngestPdfModal extends Modal` with file picker, search filter, progress display
- **`src/main.ts`** — add import for `PdfIngestor` and `IngestPdfModal`; add `pdfIngestor` field; instantiate in `onload()`; register `kb-ingest-pdf` command

No changes to: `src/types.ts`, `src/ingestor/url-ingestor.ts`, `src/ingestor/youtube-ingestor.ts`, `src/core/vault-indexer.ts`.
