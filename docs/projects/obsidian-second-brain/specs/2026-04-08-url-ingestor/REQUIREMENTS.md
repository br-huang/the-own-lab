# Feature: URL Ingestor (Phase 2)

## Summary

The URL Ingestor allows users to provide a web URL — either through a command palette modal or directly in the chat — and have the plugin fetch the page, extract its main article content, save it as a Markdown note with structured frontmatter, and automatically index it into the RAG knowledge base.

---

## User Stories

**US-1 — Command Palette Entry Point**
As a user, I want to invoke "Ingest URL" from the command palette so that I can ingest any webpage without opening the chat.

**US-2 — Chat URL Detection**
As a user, I want to paste a URL into the chat input and have the plugin recognise it and offer to ingest it, so that ingestion fits naturally into my chat workflow.

**US-3 — Content Extraction**
As a user, I want the plugin to extract only the main article body (not navbars, ads, footers) so that the saved note is clean and queryable.

**US-4 — Structured Frontmatter**
As a user, I want the saved note to include frontmatter with source URL, title, author, and ingestion date so that I can trace every piece of knowledge back to its origin.

**US-5 — Configurable Output Folder**
As a user, I want to choose which vault folder ingested notes are saved to so that they fit into my existing folder structure.

**US-6 — Automatic Indexing**
As a user, I want the saved note to appear in RAG search results without any manual action so that the knowledge is immediately queryable after ingestion.

**US-7 — Progress and Error Feedback**
As a user, I want to see a progress indicator during ingestion and a clear success or error message when it completes so that I know the operation succeeded or why it failed.

**US-8 — YouTube / Bilibili Stub**
As a developer, I want the ingestor to detect YouTube and Bilibili URLs and display a "not yet supported" message (rather than silently attempting extraction) so that users receive a clear signal and the architecture is ready for future specialized handlers.

---

## Acceptance Criteria

### Command Palette and Modal (US-1)

- [ ] A command with id `kb-ingest-url` and name "KB: Ingest URL" is registered and appears in the Obsidian command palette.
- [ ] Invoking the command opens a modal (`IngestUrlModal`) containing a single text input field labelled "URL".
- [ ] The modal input accepts focus immediately on open.
- [ ] Pressing Enter or clicking the "Ingest" button triggers ingestion.
- [ ] Pressing Escape closes the modal without any side effects.
- [ ] The modal displays a spinner / progress text ("Fetching...", "Extracting...", "Saving...") during the three phases of ingestion.
- [ ] On success the modal displays the title of the saved note and the vault path where it was written, then closes automatically after 2 seconds or on user dismissal.
- [ ] On failure the modal displays a human-readable error message and remains open so the user can retry or close manually.

### Chat URL Detection (US-2)

- [ ] When the user submits a message in `ChatView` that contains exactly one URL (matching the pattern `https?://[^\s]+`) and no other non-whitespace text, the chat treats it as an ingest request rather than a RAG query.
- [ ] In that case the chat displays an assistant bubble with the text "Ingesting URL..." and a progress update.
- [ ] On success the assistant bubble updates to confirm the note title and vault path.
- [ ] On failure the assistant bubble displays the error message.
- [ ] When the user submits a message containing a URL along with other text (i.e., a question), the message is treated as a normal RAG query — no ingest is triggered.

### Content Extraction (US-3)

- [ ] The plugin fetches the URL using the Obsidian `requestUrl` API (not Node `http`/`https`) to avoid CORS issues.
- [ ] The raw HTML is processed with the Mozilla `@mozilla/readability` library to extract the main article content.
- [ ] If Readability returns `null` (page is not article-like), ingestion fails with the message: "Could not extract article content from this page."
- [ ] The extracted content is converted from HTML to Markdown using `turndown`.
- [ ] Images, iframes, and script tags in the extracted content are stripped before conversion.

### Frontmatter Generation (US-4)

- [ ] The saved note begins with a YAML frontmatter block containing at minimum:
  - `url`: the original URL as a string
  - `title`: the article title from Readability (fallback: the URL hostname)
  - `author`: the byline from Readability (omitted from frontmatter if not detected, not set to null or empty string)
  - `ingested_at`: ISO 8601 date-time string in UTC at the moment of saving (e.g., `2026-04-08T14:32:00Z`)
  - `source_type`: the string `"web"`
- [ ] The note filename is derived from the article title: lowercase, spaces replaced with hyphens, non-alphanumeric characters (except hyphens) removed, truncated to 60 characters, with `.md` extension. Example: `how-to-build-a-rag-pipeline.md`.
- [ ] If a note with the derived filename already exists in the output folder, a numeric suffix is appended: `how-to-build-a-rag-pipeline-2.md`, `...-3.md`, etc.

### Configurable Output Folder (US-5)

- [ ] `PluginSettings` gains a new field `ingestFolder: string` with default value `"Ingested"`.
- [ ] The Settings tab gains a new text input "Ingested Notes Folder" under a new section "URL Ingestor", bound to `ingestFolder`.
- [ ] The folder is created automatically if it does not exist at ingestion time.
- [ ] The setting accepts any valid Obsidian vault-relative path (e.g., `"53-Knowledge/Ingested"`).

### Automatic Indexing (US-6)

- [ ] The saved note is written via `vault.create()` (not via Node `fs`), so Obsidian fires the `vault:create` event.
- [ ] The existing `VaultIndexer.watchForChanges()` listener picks up the new file via the `create` event and indexes it within the existing debounce window (2 seconds).
- [ ] No new indexing code is introduced for ingested notes specifically — the existing watcher handles it transparently.
- [ ] After the debounce period the new note's content is retrievable via a RAG query in `ChatView`.

### Progress and Error Feedback (US-7)

- [ ] Progress states shown in both the modal and the chat bubble are: "Fetching page...", "Extracting content...", "Saving note...".
- [ ] Network errors (non-2xx HTTP status, timeout) surface the message: "Failed to fetch URL: {HTTP status or error message}."
- [ ] Extraction failure (Readability null result) surfaces the message: "Could not extract article content from this page."
- [ ] File-write failure surfaces the message: "Failed to save note: {error message}."

### YouTube / Bilibili Stub (US-8)

- [ ] Before attempting fetch, the ingestor checks whether the URL hostname matches `youtube.com`, `youtu.be`, `bilibili.com`, or `b23.tv`.
- [ ] If a match is found, ingestion is aborted immediately with the message: "YouTube/Bilibili ingestion is not yet supported. This will be available in a future update."
- [ ] No network request is made for matched video URLs.
- [ ] The detection logic lives in a standalone function `detectVideoProvider(url: string): "youtube" | "bilibili" | null` exported from a new file `src/ingestor/video-detector.ts`, making it easy to extend in future phases.

---

## New Files and Modules

The following new source files are expected (implementation decisions left to the architect, but the module boundaries are required by these specs):

| File                             | Responsibility                                      |
| -------------------------------- | --------------------------------------------------- |
| `src/ingestor/url-ingestor.ts`   | Core ingestion logic: fetch, extract, convert, save |
| `src/ingestor/video-detector.ts` | `detectVideoProvider()` function                    |
| `src/ui/ingest-url-modal.ts`     | `IngestUrlModal` — command palette modal UI         |

`ChatView` is modified (not replaced) to add URL detection logic.
`PluginSettings` / `DEFAULT_SETTINGS` in `src/types.ts` gains `ingestFolder`.
`KBSettingTab` in `src/settings.ts` gains the "URL Ingestor" section.
`main.ts` registers the `kb-ingest-url` command and instantiates `UrlIngestor`.

---

## Scope

### In Scope

- General web page ingestion (any URL returning HTML)
- Mozilla Readability-based article extraction
- Turndown-based HTML-to-Markdown conversion
- YAML frontmatter with url, title, author, ingested_at, source_type fields
- Configurable output folder setting
- Command palette modal with progress and error feedback
- Chat URL detection triggering ingestion (single-URL messages only)
- YouTube / Bilibili early-exit stub with user-facing message
- Automatic indexing via existing VaultIndexer watcher (no new indexing code)

### Out of Scope

- YouTube transcript extraction (future phase)
- Bilibili transcript extraction (future phase)
- PDF ingestion
- EPUB ingestion
- Scheduled / periodic re-ingestion
- Whisper audio transcription
- Deduplication by URL (if same URL ingested twice, two notes are created with numeric suffix — dedup is a future concern)
- Editing or updating previously ingested notes
- Any UI for browsing or managing ingested notes

---

## Constraints

- **Obsidian API only for network calls**: Must use `requestUrl` from the `obsidian` module. Direct use of Node's `http`/`https` or `fetch` is prohibited to ensure compatibility with Obsidian's security model.
- **Obsidian API only for file writes**: Must use `vault.create()` / `vault.createFolder()` so Obsidian's file watcher fires correctly. Direct `fs.writeFileSync` must not be used for ingested notes.
- **New dependencies must be bundleable**: `@mozilla/readability` and `turndown` must be installable as npm packages and compatible with the existing esbuild bundling setup. No CDN or dynamic import from external URLs.
- **No breaking changes to Phase 1**: The existing `PluginSettings` interface gains a new optional field; `DEFAULT_SETTINGS` provides a default. All existing settings, vector store, and RAG behaviour remain unchanged.
- **TypeScript strict mode**: New files must compile without errors under the existing tsconfig.
- **No async work on plugin load**: The `UrlIngestor` is instantiated lazily (on first use or command invocation), not during `onload`, to avoid slowing plugin startup.

---

## Open Questions

None — scope is fully defined for Phase 2. The following items are deferred to later phases and should not be revisited during Phase 2 implementation:

- Transcript extraction for YouTube / Bilibili
- Re-ingestion / update strategy for already-ingested URLs
- PDF and EPUB support
