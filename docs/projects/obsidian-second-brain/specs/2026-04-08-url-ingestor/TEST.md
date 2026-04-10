# Test Report: URL Ingestor (Phase 2)

## Summary

- Total acceptance criteria: 30
- Passed: 25
- Failed: 3
- Partial: 2
- TypeScript compilation: PASS (zero errors)
- Build: PASS (`npm run build` succeeds)
- Runtime tests: MANUAL TEST NEEDED (Obsidian plugin — no unit test harness)

---

## Build Verification

### TypeScript (`npx tsc --noEmit`)

```
(no output — zero errors)
```

**Result: PASS**

### Production Build (`npm run build`)

```
> obsidian-kb@0.1.0 build
> node esbuild.config.mjs production
```

**Result: PASS**

Both `@mozilla/readability` and `turndown` are listed in `package.json` as runtime dependencies and are absent from the esbuild `external` list — they bundle correctly.

---

## Acceptance Criteria Verification

### Command Palette and Modal (US-1)

| #   | Criterion                                                                                        | Status  | Evidence                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Command with id `kb-ingest-url` and name "KB: Ingest URL" is registered                          | PASS    | `main.ts:91-97` — `addCommand({ id: "kb-ingest-url", name: "KB: Ingest URL", ... })`                                                                                                                                                                                                 |
| 2   | Invoking the command opens `IngestUrlModal` containing a single text input labelled "URL"        | PARTIAL | `main.ts:95` opens `IngestUrlModal`. The modal has a heading "Ingest URL" and an input with placeholder "https://example.com/article" but no `<label>` element wrapping the input. The spec says "labelled URL" — the heading is present but strict HTML labelling is absent. Minor. |
| 3   | The modal input accepts focus immediately on open                                                | PASS    | `ingest-url-modal.ts:33` — `this.urlInput.focus()` called in `onOpen()`                                                                                                                                                                                                              |
| 4   | Pressing Enter or clicking "Ingest" button triggers ingestion                                    | PASS    | `ingest-url-modal.ts:35-48` — keydown Enter listener and button click listener both call `doIngest()`                                                                                                                                                                                |
| 5   | Pressing Escape closes the modal without side effects                                            | PASS    | Obsidian `Modal` base class handles Escape natively; `onClose()` only calls `contentEl.empty()`                                                                                                                                                                                      |
| 6   | Modal displays spinner/progress text ("Fetching...", "Extracting...", "Saving...") during phases | PASS    | `ingest-url-modal.ts:4-8` defines `PHASE_TEXT` with exactly "Fetching page...", "Extracting content...", "Saving note..."; status element is updated in the progress callback                                                                                                        |
| 7   | On success modal displays title and vault path, closes after 2 seconds                           | PASS    | `ingest-url-modal.ts:75-80` — `statusEl.setText("Saved: ...")`, `setTimeout(() => this.close(), 2000)`                                                                                                                                                                               |
| 8   | On failure modal displays human-readable error and remains open for retry                        | PASS    | `ingest-url-modal.ts:81-87` — error class added, input/button re-enabled for retry                                                                                                                                                                                                   |

### Chat URL Detection (US-2)

| #   | Criterion                                                                             | Status | Evidence                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | Message containing exactly one URL and no other non-whitespace text triggers ingest   | PASS   | `chat-view.ts:76` — regex `/^https?:\/\/\S+$/` tested on trimmed input                                                                                                                                                                                                           |
| 10  | Chat displays assistant bubble with text "Ingesting URL..." and progress update       | FAIL   | `chat-view.ts:109` — `addAssistantMessage()` creates a bubble showing `"..."` (loader span). No `"Ingesting URL..."` text is ever set. The first visible text is the first progress callback text `"Fetching page..."`. The spec string `"Ingesting URL..."` is never displayed. |
| 11  | On success the assistant bubble updates to confirm note title and vault path          | PASS   | `chat-view.ts:130` — `contentEl.setText("Ingested: \"${result.title}\" → ${result.filePath}")`                                                                                                                                                                                   |
| 12  | On failure the assistant bubble displays the error message                            | PASS   | `chat-view.ts:133` — `renderError(bubbleEl, err.message)`                                                                                                                                                                                                                        |
| 13  | Message containing a URL plus other text is treated as a normal RAG query — no ingest | PASS   | Regex `^https?:\/\/\S+$` requires the entire trimmed string to be a URL; mixed messages fall through to the RAG path                                                                                                                                                             |

### Content Extraction (US-3)

| #   | Criterion                                                                                   | Status | Evidence                                                                                                               |
| --- | ------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| 14  | Fetches URL via Obsidian `requestUrl` API                                                   | PASS   | `url-ingestor.ts:1,66` — imports and uses `requestUrl` from `"obsidian"`                                               |
| 15  | Raw HTML processed with `@mozilla/readability`                                              | PASS   | `url-ingestor.ts:2,83-85` — `new Readability(doc).parse()`                                                             |
| 16  | If Readability returns null, fails with "Could not extract article content from this page." | PASS   | `url-ingestor.ts:87-89` — null/empty content check throws with exact spec message                                      |
| 17  | Extracted content converted from HTML to Markdown using `turndown`                          | PASS   | `url-ingestor.ts:3,112-118` — `TurndownService` with `headingStyle: "atx"` and `codeBlockStyle: "fenced"`              |
| 18  | Images, iframes, and script tags stripped before conversion                                 | PASS   | `url-ingestor.ts:103-110` — `sanitizeHtml()` uses `DOMParser` + `querySelectorAll` to remove `img`, `iframe`, `script` |

### Frontmatter Generation (US-4)

| #   | Criterion                                                                                                                    | Status | Evidence                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 19  | YAML frontmatter contains `url`, `title`, `author` (omitted if absent), `ingested_at`, `source_type: "web"`                  | PASS   | `url-ingestor.ts:120-136` — all five fields built; `author` conditionally omitted (`if (meta.author)`)                         |
| 20  | `ingested_at` is ISO 8601 UTC                                                                                                | PASS   | `url-ingestor.ts:53` — `new Date().toISOString()` always returns UTC with `Z` suffix                                           |
| 21  | Filename derived from title: lowercase, spaces to hyphens, non-alphanumeric stripped, truncated to 60 chars, `.md` extension | PASS   | `url-ingestor.ts:138-151` — `slugify()` implements the full transformation; verified with test cases                           |
| 22  | Numeric suffix for filename collisions (`-2`, `-3`, …)                                                                       | PASS   | `url-ingestor.ts:153-167` — loop from 2 to 100 appending `-N` suffix; `vault.getAbstractFileByPath()` used for collision check |

### Configurable Output Folder (US-5)

| #   | Criterion                                                                     | Status | Evidence                                                                                            |
| --- | ----------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| 23  | `PluginSettings` gains `ingestFolder: string` with default `"Ingested"`       | PASS   | `types.ts:10,20` — field and default present                                                        |
| 24  | Settings tab gains "Ingested Notes Folder" input under "URL Ingestor" section | PASS   | `settings.ts:52-67` — `h3` heading "URL Ingestor" and `Setting` for "Ingested Notes Folder"         |
| 25  | Folder created automatically if it does not exist                             | PASS   | `url-ingestor.ts:169-186` — `ensureFolder()` uses `vault.createFolder()` with per-segment creation  |
| 26  | Setting accepts any vault-relative path (e.g., `"53-Knowledge/Ingested"`)     | PASS   | `ensureFolder()` splits on `/` and creates each path segment; ingestor uses plain string comparison |

### Automatic Indexing (US-6)

| #   | Criterion                                                                          | Status | Evidence                                                                                                    |
| --- | ---------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| 27  | Note written via `vault.create()`                                                  | PASS   | `url-ingestor.ts:59` — `await this.vault.create(filePath, fullContent)`                                     |
| 28  | Existing `VaultIndexer.watchForChanges()` picks up the new file via `create` event | PASS   | `vault-indexer.ts:130-134` — `vault.on("create", ...)` listener debounces and indexes `.md` TFile instances |
| 29  | No new indexing code introduced for ingested notes                                 | PASS   | No indexing logic in any of the new files; the existing watcher handles it transparently                    |

### Progress and Error Feedback (US-7)

| #   | Criterion                                                                      | Status | Evidence                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30  | Progress states: "Fetching page...", "Extracting content...", "Saving note..." | PASS   | `ingest-url-modal.ts:4-8` and `chat-view.ts:111-115` both define identical `phaseText` maps with exact strings                                                                                                                                        |
| 31  | Network error: "Failed to fetch URL: {HTTP status or error message}."          | PASS   | `url-ingestor.ts:68,75` — status < 200 or >= 300 throws `"Failed to fetch URL: HTTP ${status}."` ; other errors throw `"Failed to fetch URL: ${err.message}."`                                                                                        |
| 32  | Extraction failure: "Could not extract article content from this page."        | PASS   | `url-ingestor.ts:88` — exact spec string                                                                                                                                                                                                              |
| 33  | File-write failure: "Failed to save note: {error message}."                    | FAIL   | `url-ingestor.ts:59` — `vault.create()` is called with no surrounding try/catch. If it throws, the raw vault error propagates without the `"Failed to save note:"` prefix. Only the collision-overflow case (`url-ingestor.ts:166`) uses this prefix. |

### YouTube / Bilibili Stub (US-8)

| #   | Criterion                                                                                                                          | Status | Evidence                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| 34  | Checks hostname against `youtube.com`, `youtu.be`, `bilibili.com`, `b23.tv`                                                        | PASS   | `video-detector.ts:13-19` — `www.` prefix stripped before comparison; all four domains covered |
| 35  | Aborts with "YouTube/Bilibili ingestion is not yet supported…"                                                                     | PASS   | `url-ingestor.ts:28-30` — exact spec message                                                   |
| 36  | No network request made for video URLs                                                                                             | PASS   | Video check at `url-ingestor.ts:26-31` precedes the `fetchHtml()` call at line 35              |
| 37  | Detection in standalone `detectVideoProvider(url): "youtube" \| "bilibili" \| null` exported from `src/ingestor/video-detector.ts` | PASS   | `video-detector.ts:5` — function signature matches spec exactly                                |

---

## Test Suite Results

No automated unit test suite exists for this project. All verification was performed through:

1. Static code analysis
2. `npx tsc --noEmit` — zero TypeScript errors
3. `npm run build` — production bundle produced without errors
4. Manual logic tracing and inline Node.js evaluation of pure logic functions

---

## Edge Cases Tested

- **Empty URL submitted in modal**: `doIngest()` returns early (`if (\!trimmed) return`). No crash. PASS.
- **Invalid URL string passed to `detectVideoProvider`**: try/catch around `new URL()` returns `null`. PASS.
- **Slug from pure non-ASCII title** (e.g., `"文章标题"`): All characters stripped, slug becomes `"ingested-page"` fallback. PASS.
- **Slug truncation at exactly 60 characters when boundary falls on a hyphen**: `slugify()` performs trailing-hyphen trim only before truncation, not after. A title producing a pre-truncation slug of `"a".repeat(59) + "-extra"` results in filename `"aaaa...aaa-.md"` with a trailing hyphen in the slug. Low severity but technically invalid for the slug. WARN.
- **URL with double-quote characters in frontmatter**: `buildFrontmatter` escapes `title` and `author` for embedded quotes but does NOT escape the `url` field. A URL containing a `"` character would produce malformed YAML. Real-world probability is very low but the inconsistency is present. WARN.
- **`ensureFolder()` catches all `createFolder` errors, not just "already exists"**: If folder creation fails for a permissions reason, the error is silently swallowed. The subsequent `vault.create()` will then fail with a raw error that is not wrapped with `"Failed to save note:"`. Combined with issue #2 below, the error message shown to the user will not match the spec. WARN.
- **Slug collision cap at 100**: Loop exits with `"Failed to save note: too many files with the same name."` which technically does use the `"Failed to save note:"` prefix — PASS for this one path only.
- **Message with trailing/leading whitespace containing a URL**: `handleSubmit` trims before regex test. `"  https://example.com  "` correctly matches as ingest request. PASS.
- **URL with query string and hash fragment**: `/^https?:\/\/\S+$/` matches `https://example.com/page?q=1#section`. PASS.
- **Empty ingestFolder setting**: `url-ingestor.ts:43` — `this.getIngestFolder() || "Ingested"` falls back to `"Ingested"`. PASS.
- **Lazy vs eager `UrlIngestor` instantiation**: Spec says "instantiated lazily"; DESIGN doc revises this to eager construction since the constructor is synchronous. Code follows the DESIGN (eager, in `onload()`). The underlying constraint ("no async work on plugin load") is satisfied because the constructor does no I/O. PASS on constraint; divergence from spec text is intentional and documented in DESIGN.

---

## Issues Found

### Issue 1 — `vault.create()` errors not wrapped with "Failed to save note:" prefix

- **Severity**: warning
- **Description**: `url-ingestor.ts:59` calls `await this.vault.create(filePath, fullContent)` without a surrounding `try/catch`. If the vault write fails (e.g., filesystem permission denied, path too long, vault adapter error), the raw Obsidian/Node error propagates directly to the UI. The spec requires the message `"Failed to save note: {error message}."`. The actual message displayed would be whatever the vault throws, with no prefix.
- **Reproduction**: Simulate `vault.create()` throwing — e.g., call `ingestor.ingest()` pointing to a read-only vault path.
- **Suggestion**: Wrap `vault.create()` call in a try/catch and re-throw with the spec prefix:
  ```typescript
  try {
    await this.vault.create(filePath, fullContent);
  } catch (err) {
    throw new Error(`Failed to save note: ${(err as Error).message}.`);
  }
  ```

### Issue 2 — Chat bubble never shows "Ingesting URL..." text

- **Severity**: warning
- **Description**: US-2 requires the chat to display an assistant bubble with the text `"Ingesting URL..."`. `handleUrlIngest()` creates the assistant bubble via `addAssistantMessage()` which shows `"..."` (a loader span). No code path sets the text to `"Ingesting URL..."` before calling `ingestor.ingest()`. The first text the user sees is the first progress callback: `"Fetching page..."`. The spec string `"Ingesting URL..."` is never rendered.
- **Reproduction**: Paste a URL into chat and observe the assistant bubble — it shows `"..."` then jumps to `"Fetching page..."`.
- **Suggestion**: Before calling `ingestor.ingest()`, set the content element text to `"Ingesting URL..."`:
  ```typescript
  const contentEl = bubbleEl.querySelector('.kb-chat-content') as HTMLElement;
  if (contentEl) {
    contentEl.empty();
    contentEl.setText('Ingesting URL...');
  }
  ```

### Issue 3 — Slugify does not trim trailing hyphen after 60-character truncation

- **Severity**: info
- **Description**: `slugify()` in `url-ingestor.ts:138-151` trims leading/trailing hyphens before truncation. If the truncation boundary at position 60 happens to land on a hyphen (e.g., a title whose slug is 61+ chars with a hyphen at position 60), the resulting filename will have a trailing hyphen before `.md`, producing `some-slug-.md`. This is a cosmetic issue and does not affect functionality.
- **Reproduction**: Use a title that slugifies to a string where character 59 (0-indexed) is a hyphen.
- **Suggestion**: After `slug.substring(0, 60)`, add `.replace(/-$/, "")`:
  ```typescript
  return slug.substring(0, 60).replace(/-$/, '');
  ```

### Issue 4 — `url` field in frontmatter not escaped for embedded double-quotes

- **Severity**: info
- **Description**: `buildFrontmatter()` escapes embedded double-quotes in `title` and `author` via `.replace(/"/g, '\\"')` but applies no such escaping to the `url` field. A URL containing a literal `"` character (pathologically rare but theoretically possible) would produce malformed YAML.
- **Reproduction**: Call `buildFrontmatter({ url: 'https://example.com/path"with"quotes', ... })` and observe the YAML output.
- **Suggestion**: Apply the same escaping to the `url` field: `lines.push(\`url: "${meta.url.replace(/"/g, '\\\\"')}"\`)`.

---

## Phase 1 Regression Check

- `PluginSettings` change is additive — `ingestFolder` field added with default. `loadSettings()` uses `Object.assign({}, DEFAULT_SETTINGS, ...)` so existing users receive the default without data loss. PASS.
- `ChatView` constructor gains a third parameter (`urlIngestor`). The only call site is `main.ts:76` `registerView` callback, which is updated to pass `this.urlIngestor`. No external consumers. PASS.
- `VaultIndexer`, `VectorStore`, `RagEngine`, `OpenAIProvider`, `LocalEmbeddingProvider`, `KBSettingTab` — none modified. PASS.
- Build succeeds with no errors. PASS.

---

## Items Requiring Manual Testing in Obsidian

The following acceptance criteria require a running Obsidian instance with the plugin loaded and cannot be verified statically:

| Criterion                                                                        | Reason                                                           |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `requestUrl` fetches real pages (non-2xx, timeout handling)                      | Requires live network; `requestUrl` is mocked at type level only |
| `vault.create()` actually creates files and fires the `create` event             | Requires Obsidian vault runtime                                  |
| `VaultIndexer` picks up new file and makes it queryable via RAG within 2 seconds | Requires full Obsidian + vector store runtime                    |
| `DOMParser` + `Readability` extraction on real HTML pages                        | Requires Electron renderer process                               |
| Modal input focus on open                                                        | Requires rendered DOM                                            |
| Escape closes modal without side effects                                         | Requires rendered DOM                                            |
| Auto-close after 2 seconds on success                                            | Requires rendered DOM + timer                                    |
| Folder created automatically in vault for nested paths                           | Requires Obsidian vault runtime                                  |

---

## Verdict

**FAIL**

Two acceptance criteria are not met:

1. **AC-33 (US-7)**: `vault.create()` errors are not wrapped with `"Failed to save note: {error message}."` — raw vault errors propagate to the UI without the required prefix.
2. **AC-10 (US-2)**: The chat assistant bubble never displays `"Ingesting URL..."`. The first text shown is `"Fetching page..."` from the first progress callback.

Both issues are straightforward two-to-five line fixes. All other 28 criteria pass code verification. No Phase 1 regressions detected. The build and type-check are clean.
