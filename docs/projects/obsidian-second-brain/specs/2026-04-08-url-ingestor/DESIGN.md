# Design: URL Ingestor (Phase 2)

## Codebase Analysis

### Existing Architecture

The plugin follows a clean layered architecture:

```
main.ts (Plugin entry, DI wiring, command registration)
  ├── core/   (VaultIndexer, VectorStore, RagEngine, Chunker)
  ├── llm/    (OpenAIProvider, LocalEmbeddingProvider, provider interface)
  ├── ui/     (ChatView)
  ├── types.ts (all shared interfaces and defaults)
  └── settings.ts (KBSettingTab)
```

**Key patterns observed:**
- Constructor dependency injection everywhere (no service locator, no singletons)
- `main.ts` is the composition root — instantiates all services, registers commands and views
- UI uses plain Obsidian DOM APIs (`createEl`, `createDiv`, `addClass`) — no React or framework
- `PluginSettings` is a flat interface; `DEFAULT_SETTINGS` provides all defaults
- `VaultIndexer.watchForChanges()` listens for vault `create` events and debounce-indexes new `.md` files after 2 seconds — this is the auto-indexing hook we rely on
- `ChatView.handleSubmit()` is the single entry point for user messages — currently forwards everything to `ragEngine.query()`
- esbuild bundles everything into `main.js` with specific externals (obsidian, electron, codemirror, xenova/transformers); new deps must NOT be listed as external
- The plugin is `isDesktopOnly: true` (manifest.json) — Electron APIs are available

### Files That Will Change

| File | Nature of Change |
|---|---|
| `src/types.ts` | Add `ingestFolder` field to `PluginSettings` and `DEFAULT_SETTINGS` |
| `src/settings.ts` | Add "URL Ingestor" section with folder text input |
| `src/main.ts` | Register `kb-ingest-url` command, lazy-instantiate `UrlIngestor` |
| `src/ui/chat-view.ts` | Add URL detection in `handleSubmit`, call ingestor for URL-only messages |

### New Files

| File | Responsibility |
|---|---|
| `src/ingestor/url-ingestor.ts` | Core pipeline: fetch, extract, convert, save |
| `src/ingestor/video-detector.ts` | `detectVideoProvider()` — YouTube/Bilibili guard |
| `src/ui/ingest-url-modal.ts` | `IngestUrlModal` — command palette modal |

---

## Proposed Approach

### Architecture Overview

The URL Ingestor is a self-contained module (`UrlIngestor`) that orchestrates a three-step pipeline: Fetch, Extract, Save. It is instantiated lazily from `main.ts` and injected into both the modal and the chat view. Auto-indexing is handled transparently by the existing `VaultIndexer` watcher — no new indexing code.

```
User input (Modal or Chat)
  │
  ▼
UrlIngestor.ingest(url, onProgress)
  │
  ├── 1. detectVideoProvider(url) → early exit if YouTube/Bilibili
  ├── 2. requestUrl(url) → raw HTML string
  ├── 3. DOMParser.parseFromString(html) → Document
  ├── 4. new Readability(doc).parse() → article object
  ├── 5. TurndownService.turndown(article.content) → markdown string
  ├── 6. Build frontmatter + markdown body
  ├── 7. vault.create(path, content) → TFile
  │
  ▼
VaultIndexer (existing) picks up vault:create event → auto-indexes
```

### Module Design

#### `src/ingestor/video-detector.ts`

```typescript
/**
 * Detects whether a URL points to a video platform that requires
 * specialized handling (not yet implemented).
 *
 * @returns "youtube" | "bilibili" | null
 */
export function detectVideoProvider(url: string): "youtube" | "bilibili" | null;
```

Implementation: parse the URL hostname against a set of known domains (`youtube.com`, `youtu.be`, `www.youtube.com`, `bilibili.com`, `www.bilibili.com`, `b23.tv`). Use the `URL` constructor for reliable hostname extraction — no regex on the raw string.

#### `src/ingestor/url-ingestor.ts`

```typescript
import { Vault, requestUrl } from "obsidian";

/** Progress phases reported to the caller */
export type IngestPhase = "fetching" | "extracting" | "saving";

/** Successful ingestion result */
export interface IngestResult {
  title: string;       // Article title used in frontmatter
  filePath: string;    // Vault-relative path of saved note
}

/** Callback for progress updates */
export type OnProgress = (phase: IngestPhase) => void;

export class UrlIngestor {
  constructor(
    private vault: Vault,
    private ingestFolder: () => string,  // getter for current setting value
  ) {}

  /**
   * Full ingestion pipeline. Throws on any failure with a
   * human-readable message (suitable for display in UI).
   */
  async ingest(url: string, onProgress?: OnProgress): Promise<IngestResult>;

  /** Fetch raw HTML via Obsidian requestUrl */
  private async fetchHtml(url: string): Promise<string>;

  /** Parse HTML and extract article content using Readability */
  private extractArticle(html: string, url: string): { title: string; content: string; byline: string | null };

  /** Convert HTML fragment to Markdown via Turndown */
  private htmlToMarkdown(html: string): string;

  /** Build YAML frontmatter string */
  private buildFrontmatter(meta: { url: string; title: string; author: string | null; ingestedAt: string }): string;

  /** Derive a safe filename from the article title */
  private slugify(title: string): string;

  /** Resolve filename collisions by appending numeric suffix */
  private async resolveFilePath(folder: string, slug: string): Promise<string>;

  /** Ensure the output folder exists, creating it if needed */
  private async ensureFolder(folderPath: string): Promise<void>;
}
```

The `ingestFolder` parameter is a getter function `() => string` rather than a static string. This ensures the ingestor always reads the current setting value without requiring re-instantiation when the user changes the setting.

#### `src/ui/ingest-url-modal.ts`

```typescript
import { App, Modal } from "obsidian";
import { UrlIngestor } from "../ingestor/url-ingestor";

export class IngestUrlModal extends Modal {
  constructor(app: App, private ingestor: UrlIngestor) {
    super(app);
  }

  onOpen(): void;   // Build input field, Ingest button, status area
  onClose(): void;  // Cleanup
  private async doIngest(url: string): Promise<void>;  // Drive the pipeline with progress UI
}
```

---

## Data Flow

### Full Pipeline (Happy Path)

1. **Input**: User provides URL (via modal text input or chat message).
2. **Video check**: `detectVideoProvider(url)` — if match, throw with "not yet supported" message. No network request.
3. **Fetch**: `requestUrl({ url, method: "GET" })` returns response. Validate status is 200. Extract `response.text` as raw HTML.
4. **Parse**: Create a `Document` from HTML using `new DOMParser().parseFromString(html, "text/html")`. This uses Electron's built-in DOMParser (no jsdom needed).
5. **Extract**: `new Readability(doc).parse()`. If result is `null`, throw "Could not extract article content."
6. **Sanitize**: Before Turndown conversion, strip `<img>`, `<iframe>`, `<script>` tags from the extracted `content` HTML string using a second DOMParser pass (create a document, querySelectorAll those tags, remove them, serialize back).
7. **Convert**: `new TurndownService().turndown(sanitizedHtml)` produces Markdown body.
8. **Frontmatter**: Build YAML block with `url`, `title`, `author` (omitted if null), `ingested_at`, `source_type: "web"`.
9. **Filename**: Slugify title (lowercase, spaces to hyphens, strip non-alphanumeric except hyphens, truncate to 60 chars). Check for collision via `vault.getAbstractFileByPath()`. Append `-2`, `-3`, etc. if needed.
10. **Folder**: Ensure `ingestFolder` exists via `vault.createFolder()` (wrapped in try/catch for "folder already exists" case).
11. **Save**: `vault.create(filePath, frontmatter + body)` writes the note. Returns `IngestResult`.
12. **Auto-index**: The `vault:create` event fires. `VaultIndexer.watchForChanges()` listener picks it up, debounces 2s, then indexes.

### Chat URL Detection Flow

In `ChatView.handleSubmit()`:

1. Trim the input. Test against regex `^https?:\/\/[^\s]+$` (entire string is one URL, no surrounding text).
2. If match: treat as ingest request. Show user bubble with the URL, show assistant bubble with "Ingesting URL..." progress text. Call `urlIngestor.ingest(url, onProgress)`. Update bubble on success/failure.
3. If no match: proceed with existing RAG query flow (no change).

---

## Key Technical Decisions

### Decision 1: DOMParser (Electron) over jsdom

**Choice**: Use the global `DOMParser` available in Electron's renderer process.

**Rationale**:
- jsdom is approximately 3MB+ bundled and brings its own DOM implementation. It would significantly bloat the plugin bundle.
- Obsidian runs in Electron's renderer process, which provides a fully compliant `DOMParser` and `Document` API natively — the same one browsers use.
- `@mozilla/readability` requires a `Document` object. `DOMParser.parseFromString(html, "text/html")` produces exactly that.
- The plugin is already `isDesktopOnly: true`, so there is no mobile compatibility concern.
- No additional dependency. No bundling complexity.

**Risk**: If Obsidian ever ships a non-Electron mobile version, DOMParser would not be available. Mitigation: The plugin is desktop-only, and a future mobile port would require broader rearchitecting anyway.

### Decision 2: Turndown for HTML-to-Markdown

**Choice**: Use the `turndown` npm package, bundled by esbuild.

**Rationale**:
- Turndown is the de facto standard for HTML-to-Markdown in JavaScript. It is small (~30KB minified), well-maintained, and has no native dependencies.
- It accepts HTML strings directly, no Document object needed.
- It integrates cleanly with esbuild bundling (pure JS, no wasm, no native modules).

**Configuration**: Use default Turndown settings with heading style `atx` (# style) and code block fencing. No plugins needed for Phase 2.

### Decision 3: Filename Slugification

**Choice**: Custom `slugify()` function — lowercase, replace spaces/underscores with hyphens, strip non-alphanumeric (except hyphens), collapse consecutive hyphens, trim leading/trailing hyphens, truncate to 60 characters.

**Collision handling**: Check `vault.getAbstractFileByPath()` in a loop. If `slug.md` exists, try `slug-2.md`, `slug-3.md`, etc. Cap at 100 iterations (throw error if exceeded — pathological case).

**Rationale**: Simple, deterministic, produces readable filenames. The 60-char limit avoids filesystem path length issues. Numeric suffixes match the requirement spec exactly.

### Decision 4: Chat URL Detection via Regex in handleSubmit

**Choice**: Add a URL detection check at the top of `ChatView.handleSubmit()` before the existing RAG query logic.

**Pattern**: `^https?:\/\/\S+$` — the entire trimmed message must be a single URL with no other content.

**Rationale**:
- Simple and precise. Only triggers on messages that are purely a URL.
- Messages containing a URL mixed with question text pass through to normal RAG — no false positives.
- The check is a 3-line guard at the top of `handleSubmit`, minimally invasive.

**Implementation**: `ChatView` needs a reference to `UrlIngestor`. This is passed via constructor injection, following the existing pattern (ChatView already receives `RagEngine` via constructor).

### Decision 5: Lazy Instantiation of UrlIngestor

**Choice**: `UrlIngestor` is created once on first use (command invocation or chat URL detection), not during `onload()`.

**Implementation**: In `main.ts`, add a private `urlIngestor: UrlIngestor | null = null` field and a `getUrlIngestor(): UrlIngestor` method that creates it on first call. The command callback and ChatView both call this getter.

**Update**: Actually, `UrlIngestor` is extremely lightweight (stores two references: `vault` and a settings getter). There is no async initialization, no heavy setup. The "lazy" requirement from the spec is about avoiding async work on load — not about deferring construction. We can instantiate it eagerly in `onload()` after settings are loaded, since the constructor does zero async work. This is simpler and avoids the getter indirection.

**Revised choice**: Instantiate `UrlIngestor` eagerly in `onload()` (after `loadSettings()`). The constructor only stores references — no async work, no I/O. This satisfies the constraint "no async work on plugin load" while keeping the code straightforward.

### Decision 6: Modal UI with Obsidian Modal Class

**Choice**: Extend `obsidian.Modal` for `IngestUrlModal`.

**UI structure**:
- `onOpen()` builds: heading, text input (auto-focused), "Ingest" button, status div (initially hidden).
- Enter key on the input triggers ingest (same as button click).
- Escape closes modal (built-in Modal behavior).
- During ingestion: input and button disabled, status div shows phase text ("Fetching page...", "Extracting content...", "Saving note...").
- On success: status shows title and path, `setTimeout` closes modal after 2 seconds. User can also press Escape to dismiss early.
- On failure: status shows error in red, modal stays open for retry or manual close.

### Decision 7: Progress Reporting via Callback

**Choice**: `UrlIngestor.ingest()` accepts an optional `onProgress: (phase: IngestPhase) => void` callback.

**Rationale**: Both the modal and the chat bubble need progress updates, but they render progress differently (modal updates a status div; chat updates bubble text). A callback is the simplest abstraction that works for both consumers without coupling the ingestor to any UI.

---

## Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **jsdom for HTML parsing** | Works identically on all platforms; battle-tested | 3MB+ bundle size increase; duplicates what Electron already provides; complex to bundle with esbuild |
| **DOMParser (Electron native)** [CHOSEN] | Zero bundle cost; native browser-grade parser; already available | Desktop-only assumption (already true for this plugin) |
| **linkedom as jsdom alternative** | Lighter than jsdom (~100KB) | Still an unnecessary dependency when DOMParser is available; less battle-tested than jsdom |
| **Event emitter for progress** | More extensible pattern | Over-engineered for 3 progress phases; callback is simpler |
| **Ingestor as static functions** | No instantiation needed | Loses DI pattern used everywhere else; harder to test; clutters call sites with vault/settings params |

---

## Dependencies and Bundling Strategy

### New npm Dependencies

| Package | Purpose | Bundle Strategy |
|---|---|---|
| `@mozilla/readability` | Article content extraction from HTML | **Bundled** by esbuild (DO NOT add to `external` list) |
| `turndown` | HTML-to-Markdown conversion | **Bundled** by esbuild (DO NOT add to `external` list) |

### Type Declarations

| Package | Purpose |
|---|---|
| `@types/turndown` | TypeScript types for turndown |

`@mozilla/readability` ships its own TypeScript types — no separate `@types/` package needed.

### esbuild Configuration

No changes to `esbuild.config.mjs` are needed. The two new packages are pure JavaScript with no native bindings. esbuild will bundle them into `main.js` automatically since they are not in the `external` list.

**Note on jsdom**: By choosing DOMParser over jsdom, we avoid adding jsdom (which would require careful esbuild configuration due to its native bindings and node-specific APIs).

---

## Changes to Existing Files

### `src/types.ts`

Add `ingestFolder` to `PluginSettings` interface and `DEFAULT_SETTINGS`:

```typescript
export interface PluginSettings {
  // ... existing fields unchanged ...
  ingestFolder: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  // ... existing defaults unchanged ...
  ingestFolder: "Ingested",
};
```

This is a non-breaking additive change. `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` in `loadSettings()` ensures existing users get the default value.

### `src/settings.ts`

Add a new "URL Ingestor" section after the existing "Chat (LLM)" section and before the "Advanced" section:

```typescript
// ─── URL Ingestor Section ───
containerEl.createEl("h3", { text: "URL Ingestor" });

new Setting(containerEl)
  .setName("Ingested Notes Folder")
  .setDesc("Vault folder where ingested web pages are saved.")
  .addText((text) =>
    text
      .setPlaceholder("Ingested")
      .setValue(this.plugin.settings.ingestFolder)
      .onChange(async (value) => {
        this.plugin.settings.ingestFolder = value;
        await this.plugin.saveSettings();
      })
  );
```

### `src/main.ts`

1. Import `UrlIngestor` and `IngestUrlModal`.
2. Add `urlIngestor: UrlIngestor` field.
3. In `onload()`, after `loadSettings()`:
   - Instantiate `UrlIngestor` with `this.app.vault` and `() => this.settings.ingestFolder`.
4. Register the `kb-ingest-url` command that opens `IngestUrlModal`.
5. Pass `urlIngestor` to `ChatView` constructor (add second parameter).

### `src/ui/chat-view.ts`

1. Constructor gains a third parameter: `urlIngestor: UrlIngestor`.
2. `handleSubmit()` gains a URL detection guard at the top:
   - If the trimmed message matches `^https?:\/\/\S+$`, treat as ingest request.
   - Show user bubble, show assistant bubble with progress text.
   - Call `urlIngestor.ingest(url, onProgress)`.
   - Update assistant bubble on success or failure.
   - Return early (skip RAG query).
3. Add a private `handleUrlIngest(url: string)` method to encapsulate the ingest-from-chat flow.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **DOMParser not available** in some Obsidian environment | Low | High | Plugin is desktop-only. Add a runtime check: if `typeof DOMParser === "undefined"`, throw a clear error message. |
| **Readability fails on non-article pages** (SPAs, login walls, JS-rendered content) | Medium | Low | This is expected behavior. The error message "Could not extract article content" is clear. Users learn which pages work. Future phases could add fallback extractors. |
| **requestUrl blocked by CORS or returns non-HTML** | Medium | Low | `requestUrl` bypasses CORS (Obsidian's native HTTP). For non-HTML responses, Readability will return null, triggering the standard error path. |
| **Turndown produces poor Markdown for complex HTML** | Low | Low | Turndown handles standard article HTML well. Edge cases (tables, nested lists) may be imperfect but readable. Turndown plugins can be added later. |
| **Filename collision loop** | Very Low | Low | Capped at 100 iterations. Practically impossible to hit since it requires 100+ articles with identical titles. |
| **Large HTML pages cause memory pressure** | Low | Medium | Readability extracts only the article body, discarding the rest. The full HTML is held in memory briefly during parsing but GC'd after extraction. No mitigation needed for typical web pages. |
| **ChatView constructor signature change breaks view registration** | Low | Medium | The `registerView` callback in `main.ts` is the only call site. Update it in the same step. No external consumers. |

---

## File Map (Summary)

```
src/
├── ingestor/
│   ├── url-ingestor.ts    [NEW]  Core pipeline: fetch → extract → convert → save
│   └── video-detector.ts  [NEW]  detectVideoProvider() guard function
├── ui/
│   ├── chat-view.ts       [MOD]  Add URL detection in handleSubmit, accept UrlIngestor
│   └── ingest-url-modal.ts [NEW] Command palette modal UI
├── main.ts                [MOD]  Instantiate UrlIngestor, register command, wire DI
├── types.ts               [MOD]  Add ingestFolder to PluginSettings
└── settings.ts            [MOD]  Add URL Ingestor settings section
```
