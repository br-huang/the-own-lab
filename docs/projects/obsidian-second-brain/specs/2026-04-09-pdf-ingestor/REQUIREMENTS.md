# Feature: PDF Ingestor

## Summary
Add a "KB: Ingest PDF" command that lets the user pick any `.pdf` file from their Vault, extracts text page by page using `pdfjs-dist`, and saves it as a Markdown note with structured frontmatter into the shared `ingestFolder` — where it is automatically indexed by the existing `VaultIndexer` via the `vault:create` event.

---

## Acceptance Criteria

### Command & Entry Point
- [ ] A command "KB: Ingest PDF" is registered in the Obsidian command palette (id: `kb-ingest-pdf`).
- [ ] Executing the command opens `IngestPdfModal`.
- [ ] `IngestPdfModal` is instantiated in `main.ts` alongside `IngestUrlModal`, following the same registration pattern as `kb-ingest-url`.

### File Picker Modal
- [ ] The modal displays a scrollable list of every `.pdf` file found in the Vault via `vault.getFiles()` filtered to `.pdf` extension.
- [ ] The list shows the Vault-relative path of each file (e.g., `References/paper.pdf`).
- [ ] A text input at the top of the modal filters the list by filename in real time (case-insensitive substring match).
- [ ] If no `.pdf` files exist in the Vault, the modal displays the message: "No PDF files found in your Vault."
- [ ] Clicking a file in the list begins ingestion; the list and search input are disabled for the duration.
- [ ] The modal displays a status line that updates as ingestion progresses (see Progress section below).
- [ ] On success the modal displays: `Saved: "{title}" → {filePath}` and auto-closes after 2 seconds.
- [ ] On error the modal displays the error message and re-enables the file list for retry.

### PDF Reading & Parsing
- [ ] The plugin reads the selected file as binary via `vault.readBinary(file)`.
- [ ] The binary data is passed to `pdfjs-dist` (`pdfjsLib.getDocument({ data: arrayBuffer })`) to load the PDF document.
- [ ] Text is extracted page by page in order, from page 1 to the last page, using `page.getTextContent()`.
- [ ] Each page's text items (`item.str`) are joined with a single space to form the page text.
- [ ] Empty pages (pages where all extracted text is whitespace only) are silently skipped and not included in the output.

### Output Markdown Structure
- [ ] The saved note begins with a YAML frontmatter block followed by a blank line and then the body.
- [ ] The frontmatter contains exactly these fields in this order:
  - `url`: the Vault-relative path of the source PDF (e.g., `References/paper.pdf`), enclosed in double quotes with any internal double quotes escaped.
  - `title`: the document title (see Title Resolution), enclosed in double quotes with any internal double quotes escaped.
  - `source_type`: the literal string `"pdf"`.
  - `pages`: an unquoted integer — the total page count of the PDF.
  - `ingested_at`: ISO 8601 timestamp string (e.g., `"2026-04-09T10:00:00.000Z"`).
- [ ] The body contains one section per non-empty page, with a level-2 heading `## Page N` (where N is the 1-based page number from the original PDF) followed by the extracted text for that page as a plain paragraph.
- [ ] Pages that are skipped (empty) do not produce a heading or paragraph in the output.

### Title Resolution
- [ ] If `pdfjs-dist` returns a non-empty `info.Title` string from PDF metadata, that string is used as the title.
- [ ] Otherwise, the filename without its `.pdf` extension is used as the title (e.g., `paper.pdf` → `paper`).

### File Saving
- [ ] The note filename is derived by slugifying the title using the same `slugify` algorithm as `UrlIngestor` and `YouTubeIngestor` (lowercase, spaces/underscores to hyphens, non-alphanumeric stripped, max 60 chars, no leading/trailing hyphens).
- [ ] The note is saved to the folder returned by `() => settings.ingestFolder` (defaulting to `"Ingested"` when empty), the same `ingestFolder` used by `UrlIngestor`.
- [ ] If a note with the same slug already exists, a numeric suffix is appended (e.g., `-2`, `-3`) up to a maximum of 100 attempts, matching the `resolveFilePath` behaviour in existing ingestors.
- [ ] Nested folders in `ingestFolder` are created automatically using the same `ensureFolder` logic as existing ingestors.

### Progress Feedback
- [ ] The `PdfIngestor` class accepts an optional `onProgress` callback typed as `OnProgress` (imported from `url-ingestor.ts`), reusing the existing `IngestPhase` type.
- [ ] The callback is called with `"fetching"` before `vault.readBinary()` begins.
- [ ] The callback is called with `"extracting"` before text extraction begins.
- [ ] The modal displays `"Reading PDF..."` when the phase is `"fetching"`.
- [ ] The modal displays `"Extracting page X / Y..."` — updated on each page — when the phase is `"extracting"`. Because `OnProgress` only carries a phase string, the per-page update is produced by a separate `onPageProgress?: (current: number, total: number) => void` callback on `PdfIngestor.ingest()`.
- [ ] The callback is called with `"saving"` before `vault.create()` is called.
- [ ] The modal displays `"Saving note..."` when the phase is `"saving"`.

### Error Handling
- [ ] If `vault.readBinary()` throws, the error is re-thrown with the message: `"Failed to read PDF: {original message}"`.
- [ ] If `pdfjs-dist` cannot load the document (corrupted or unrecognised file), the error is caught and re-thrown with the message: `"Failed to parse PDF: {original message}"`.
- [ ] If the PDF is password-protected, `pdfjs-dist` throws `PasswordException`; this is caught and re-thrown with the message: `"This PDF is password-protected and cannot be ingested."`.
- [ ] If text extraction completes but all pages are empty (scanned/image-only PDF), an error is thrown with the message: `"No text content found. This PDF may be a scanned image and cannot be ingested without OCR."`.
- [ ] If `vault.create()` fails, the error is re-thrown with the message: `"Failed to save note: {original message}"`.
- [ ] All errors surface as user-visible text in the modal status line; no errors are silently swallowed.

### Auto-Indexing
- [ ] No changes to `VaultIndexer` are required. The saved `.md` note is indexed automatically because `VaultIndexer` already listens for `vault:create` events on Markdown files.

### Dependency: pdfjs-dist
- [ ] `pdfjs-dist` is listed as a dependency in `package.json`.
- [ ] `pdfjs-dist` is marked as `external` in the esbuild config (the same pattern used for `@xenova/transformers`), so it is loaded from `node_modules` at runtime rather than bundled.
- [ ] The `PdfIngestor` sets `pdfjsLib.GlobalWorkerOptions.workerSrc` to `""` (empty string) or disables the worker, since Obsidian's renderer process does not support spawning dedicated Web Workers for bundled plugins. The `getDocument` call must complete in the main thread.

### Code Structure
- [ ] The ingestor logic lives in `src/ingestor/pdf-ingestor.ts` as a class `PdfIngestor` with the same constructor signature pattern as `UrlIngestor` and `YouTubeIngestor`: `constructor(private vault: Vault, private getIngestFolder: () => string)`.
- [ ] The modal lives in `src/ui/ingest-pdf-modal.ts` as a class `IngestPdfModal extends Modal`.
- [ ] `PdfIngestor` is instantiated once in `main.ts` `onload()` and stored as a private field, parallel to `urlIngestor`.
- [ ] `IngestPdfModal` is opened by the `kb-ingest-pdf` command callback in `main.ts`, receiving the `App` instance and the `PdfIngestor` instance.

---

## Scope

### In Scope
- PDF text extraction using `pdfjs-dist`, page by page.
- Vault file picker modal with real-time search filter.
- Markdown note output with `## Page N` headings and YAML frontmatter (`url`, `title`, `source_type`, `pages`, `ingested_at`).
- Shared `ingestFolder` setting (no new settings field needed).
- Progress feedback: per-phase and per-page updates in the modal.
- Error handling for corrupted, password-protected, and image-only PDFs.
- Auto-indexing via the existing `vault:create` event listener in `VaultIndexer`.
- `pdfjs-dist` as an external dependency (not bundled).

### Out of Scope
- OCR for scanned or image-only PDFs.
- Extraction of PDF annotations, highlights, or comments.
- Extraction of images embedded in PDFs.
- EPUB, DOCX, or any other non-PDF document format.
- Drag-and-drop of PDFs onto the modal or chat view.
- Ingesting PDFs from external URLs (that path goes through `UrlIngestor`).
- A new settings field specifically for PDFs — the existing `ingestFolder` is reused.
- Modifying the `IngestPhase` type or `OnProgress` type in `url-ingestor.ts`.

---

## Constraints

- `pdfjs-dist` must be treated as external in esbuild (loaded from `node_modules`), matching the `@xenova/transformers` pattern already in place.
- PDF parsing must complete in the main thread with no Web Worker (set `GlobalWorkerOptions.workerSrc = ""`), because Obsidian does not support spawning dedicated workers for plugin code.
- The `PdfIngestor` must not make any network requests; it reads only from the local Vault binary.
- The note output format (frontmatter field names, heading style) must be consistent with the existing `UrlIngestor` and `YouTubeIngestor` output so that downstream RAG chunking and indexing work without changes.
- `slugify`, `resolveFilePath`, and `ensureFolder` logic must be identical in behaviour to existing ingestors; duplication is acceptable until a shared utility module is introduced.
- No changes to `PluginSettings` or `DEFAULT_SETTINGS` in `types.ts` are required.

---

## Open Questions
- None. All ambiguities resolved from codebase context and provided feature specification.
