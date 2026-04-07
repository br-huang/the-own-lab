# Test Report: MVP Phase 1 — RAG Core

**Date**: 2026-04-07
**Reviewer**: QA Engineer (Claude Sonnet 4.6)
**Project**: Obsidian AI Knowledge Base Plugin — MVP Phase 1

---

## Summary

| Category | Count |
|----------|-------|
| Acceptance criteria total | 47 |
| PASS | 38 |
| FAIL | 5 |
| PARTIAL | 2 |
| MANUAL TEST NEEDED | 7 |

**Overall verdict: FAIL** — 5 blocking issues found, 2 partial implementations.

---

## Static Analysis Results

### TypeScript Compile (`npx tsc --noEmit`)

```
Exit code: 0
Errors: 0
```

**Result: PASS** — TypeScript strict mode compilation succeeds with zero errors.

### Production Build (`node esbuild.config.mjs production`)

```
Exit code: 0
Output: main.js (498 KB minified)
Format: CJS ("use strict")
```

**Result: PASS** — Build succeeds. Bundle is a valid CJS module. Key dependencies are correctly externalized (`@lancedb/lancedb`, `apache-arrow`) while the `openai` SDK is bundled inline. The `obsidian` package is correctly external.

Verified string literals survive minification: `obsidian-kb-chat`, `KB Chat`, `Open KB Chat`, `Obsidian KB Settings`, `gpt-4o`, `text-embedding-3-small`, `dangerouslyAllowBrowser`.

---

## Acceptance Criteria Verification

### Plugin Scaffold

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `manifest.json` is valid, declares plugin ID `obsidian-kb`, name `Obsidian KB`, minAppVersion `1.4.0`, version `0.1.0` | PASS | `manifest.json` verified: `id="obsidian-kb"`, `name="Obsidian KB"`, `version="0.1.0"`, `minAppVersion="1.4.0"`, `isDesktopOnly=true` |
| `esbuild.config.mjs` produces a single `main.js` bundle | PASS | Build produces `main.js` (498 KB) at project root in CJS format |
| Plugin activates without throwing errors when loaded | PARTIAL | Code path looks clean on happy path; however `initialIndex()` has no error handling around the `embed()` call — a network error or API error during initial indexing would produce an unhandled promise rejection (see Issue #1) |
| Plugin adds a settings tab under Obsidian Settings | PASS | `main.ts` line 63: `this.addSettingTab(new KBSettingTab(this.app, this))` |

### Settings

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Settings tab has password-type input for API key | PASS | `settings.ts` line 29: `.then((text) => { text.inputEl.type = "password"; })` |
| Settings tab has dropdown for chat model (default: `gpt-4o`) | PASS | `settings.ts` lines 33–44, options `gpt-4o` and `gpt-4o-mini`, `DEFAULT_SETTINGS.chatModel = "gpt-4o"` |
| Settings tab has dropdown for embedding model (default: `text-embedding-3-small`) | PASS | `settings.ts` lines 46–58, options `text-embedding-3-small` and `text-embedding-3-large` |
| Settings persisted via `loadData()`/`saveData()` | PASS | `main.ts` lines 79–85 implement `loadSettings` and `saveSettings`; every settings change calls `saveSettings()` |
| Empty API key → chat UI shows clear error prompting user to configure | PARTIAL | With empty key AND empty vector store, `rag-engine.query()` yields `"No notes have been indexed yet. Please wait for indexing to complete."` — this is inaccurate (the root cause is the missing key). With empty key but non-empty vector store, the `embed()` call fails with `"Invalid OpenAI API key. Please check your settings."` which is appropriate. The empty-key + empty-store path gives the wrong message. See Issue #2. |

### LLM Provider Interface

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `provider.ts` exports `LLMProvider` interface with `chat()`, `embed()`, `name`, `maxTokens` | PASS | `src/llm/provider.ts` lines 3–17 match specification exactly |
| `openai.ts` implements `LLMProvider` using `openai` npm package | PASS | `src/llm/openai.ts` — `OpenAIProvider implements LLMProvider`, uses `openai` npm package |
| `chat()` streams tokens as `AsyncIterable<string>` using `stream: true` | PASS | `openai.ts` lines 22–47: async generator, `stream: true`, yields `delta.content` |
| `embed()` accepts batch of strings and returns array of embedding vectors | PASS | `openai.ts` lines 49–66: calls `embeddings.create({ input: texts, model })` |
| Test call `embed(["hello world"])` returns single vector with length > 0 | MANUAL TEST NEEDED | Requires a valid OpenAI API key and live network call |
| OpenAI API errors caught and surfaced as descriptive messages | PASS | `openai.ts` handles 401 (invalid key), 429 (rate limit), and generic errors with user-friendly messages in both `chat()` and `embed()` |

### Chunker

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `chunker.ts` exports `chunk(content, metadata): Chunk[]` function | PASS | `src/core/chunker.ts` exports `chunk` with correct signature; also exports `estimateTokens` as documented |
| Chunking respects Markdown heading boundaries (`#`, `##`, `###`) before paragraph/sentence boundaries | FAIL | Separators array is `["\n## ", "\n### ", "\n\n", "\n", ". "]` — H1 (`\n# `) is missing. Documents using H1 headings will not split at heading boundaries; they fall through to paragraph splitting. See Issue #3. |
| Default chunk size 500 tokens, overlap 50 tokens; both configurable | PASS | `chunker.ts` lines 18–19: defaults 500/50, accepted via `options` parameter |
| Each `Chunk` contains `text`, `metadata` (with `filePath`, `fileTitle`, `chunkIndex`), and `tokenCount` | PASS | `chunker.ts` lines 31–35 construct `Chunk` with all required fields |
| 1200-token document with no headings produces at least 3 chunks | FAIL | Verified by simulation: with continuous text and no separator characters the function exhausts all separators at `sepIndex >= separators.length` and returns the oversized text as a single un-split chunk. A realistic document with paragraph breaks (`\n\n`) does produce 3+ chunks. A strictly formatted document without any of the 5 separator types produces 1 chunk. See Issue #4. |
| 3 `##` headings of 200 tokens each → at least 3 chunks at heading boundaries | FAIL | Verified by simulation: the `mergeSections()` step combines the first two 200-token sections (400 < 500) into one chunk, producing 2 chunks instead of 3. The third chunk also loses its heading label due to overlap prepend. See Issue #4. |
| Empty or whitespace-only input returns empty array without throwing | PASS | `chunker.ts` line 21: `if (content.trim().length === 0) return []` |

### Vector Store

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `vector-store.ts` wraps LanceDB, data at `{vaultPath}/.obsidian-kb/vectors/` | PASS | `vector-store.ts` line 14: `path.join(vaultPath, ".obsidian-kb", "vectors")` |
| `upsert()` stores chunks; calling twice with same `filePath` overwrites (no duplicates) | PASS | `vector-store.ts` lines 51–56: delete-then-insert pattern for all unique file paths in the incoming batch |
| `query()` returns up to `topK` results sorted by cosine similarity descending | PASS | `vector-store.ts` line 64: `table.search(embedding).limit(topK).toArray()` — LanceDB uses cosine distance by default for normalized vectors |
| `delete(filePath)` removes all chunks for that file | PASS | `vector-store.ts` lines 76–84: deletes by `filePath` filter |
| LanceDB table created automatically on first use | PASS | `vector-store.ts` lines 45–49: `db.createTable("chunks", data)` on first upsert when `tableReady=false` |
| Initializes successfully on fresh vault with no `.obsidian-kb/vectors/` directory | PASS | `vector-store.ts` line 18: `fs.mkdirSync(this.dbPath, { recursive: true })` creates the directory |

### Vault Indexer

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `vault-indexer.ts` exports `VaultIndexer` class with `initialIndex()` and `watchForChanges()` | PASS | Both methods present at lines 37 and 116 |
| `initialIndex()` reads all `.md` files, chunks, embeds, upserts; skips unchanged via file-hash manifest | PASS | Lines 37–114 implement full pipeline with MD5 hash comparison |
| Status bar shows `"Indexing: X / Y notes"` during indexing, `"KB: X notes indexed"` when complete | PASS | Lines 99 and 113 match exact format required |
| `watchForChanges()` registers `modify`, `create`, `delete` event listeners | PASS | `vault-indexer.ts` lines 117–139 register all three event types |
| Modify/create → only that note re-indexed | PASS | `debounceIndex()` → `indexFile()` processes single file only |
| Delete → all chunks removed from vector store | PASS | `vault-indexer.ts` line 133: `this.vectorStore.delete(file.path)` |
| `.obsidian` and `.obsidian-kb` folders never indexed | PASS | `shouldIndex()` at lines 217–223 filters both paths |
| Large vaults (200+ notes) complete without crashing UI — embedding calls batched | PASS | `initialIndex()` batches by `settings.embeddingBatchSize` (default 20) |
| Batch size configurable (default 20), minimum 200ms delay between batches | PASS | Default 20 in `DEFAULT_SETTINGS`; line 100: `await new Promise(r => setTimeout(r, 200))` |
| `initialIndex()` errors from embed API do not crash the plugin | FAIL | No try/catch around the `embed()` call in `initialIndex()`. An API failure throws and becomes an unhandled rejection in the `onLayoutReady` callback. See Issue #1. |

### RAG Engine

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `rag-engine.ts` exports `RagEngine` with `query(userQuestion): AsyncIterable<RagResponse>` | PASS | `src/core/rag-engine.ts` line 26: `async *query(userQuestion: string): AsyncGenerator<RagResponse>` |
| `query()` pipeline: embed → vector search → context assembly → LLM call → stream | PASS | Lines 36–55 implement the 5-step pipeline in order |
| Top-K count configurable via settings (default: 5) | PASS | Line 37: `this.settings.topK` used in `vectorStore.query()` |
| Context includes source file path as label | PASS | Line 40: `[Source: ${r.fileTitle} (${r.filePath})]` |
| System prompt instructs LLM to answer only from context and cite sources | PASS | Lines 5–9: system prompt is correct and matches design specification exactly |
| `RagResponse` carries streamed `token` and final `sources: SourceReference[]` | PASS | Three response types (`token`, `sources`, `error`) correctly emitted |
| Empty vector store → user-readable message, not an exception | PASS | Lines 31–34: yields `{type:"error", message: "No notes have been indexed yet..."}` |
| Empty user question → rejects with descriptive error before API calls | PASS | Lines 27–29: `throw new Error("Please enter a question.")` |

### Chat UI

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `chat-view.ts` registers `ItemView` with view type `obsidian-kb-chat` | PASS | `CHAT_VIEW_TYPE = "obsidian-kb-chat"`, registered in `main.ts` line 47 |
| Ribbon icon or command `"Open KB Chat"` opens chat in right sidebar | PASS | `main.ts` lines 51–61: ribbon icon `message-square` and command `open-kb-chat` both call `activateChatView()` which opens in right leaf |
| Chat view renders scrollable message history, input field, and send button | PASS | `chat-view.ts` `onOpen()` creates `.kb-chat-messages`, `.kb-chat-input`, `.kb-chat-send` |
| Enter submits; Shift+Enter inserts newline | PASS | `chat-view.ts` lines 50–55: `e.key === "Enter" && \!e.shiftKey` pattern |
| Streamed tokens appear in real-time | PASS | `appendToken()` triggers `renderMarkdown()` via a 100ms throttle timer |
| AI response rendered as Markdown | PASS | `renderMarkdown()` calls `MarkdownRenderer.render()` with the Obsidian API |
| "Sources" section with clickable links appears after stream completes | PASS | `renderSources()` creates `<a>` elements with click handlers |
| Clicking source link opens note in editor | PASS | Line 151: `this.app.workspace.openLinkText(source.filePath, "")` |
| Input and send button disabled during streaming | PASS | `setInputEnabled(false)` called in `handleSubmit()` before streaming, `setInputEnabled(true)` in `finally` |
| Loading indicator visible while waiting for first token | PASS | `addAssistantMessage()` creates `.kb-chat-loader` span with `"..."` text; CSS animates it with `kb-pulse` keyframe |
| RAG engine errors displayed as styled error bubble | PASS | `renderError()` creates `.kb-chat-error` div; CSS applies error colors |
| Chat message history visible for current session | PASS | Messages appended to `this.messagesEl` which persists for the view lifetime; no session-end clearing |

---

## Edge Cases Tested

- **Empty input string in `chunk()`**: returns `[]` without throwing — PASS
- **Whitespace-only input in `chunk()`**: returns `[]` (checks `content.trim().length === 0`) — PASS
- **`upsert()` with empty array**: early return on line 31 — PASS
- **`query()` on uninitialized table** (`tableReady=false`): returns `[]` — PASS
- **`delete()` on uninitialized table**: no-op — PASS
- **`isEmpty()` on uninitialized table**: returns `true` — PASS
- **File path with double-quotes in `delete()`**: escaped with `replace(/"/g, '\\"')` — PASS
- **`initialIndex()` with no changed files**: loop body never executes, jumps to deleted-file detection — PASS
- **`query()` with empty question string**: throws `Error("Please enter a question.")` before any API call — PASS
- **Continuous text (no separators) through chunker**: returns one oversized chunk with no error — FAIL (oversized chunk, but no crash)
- **`MarkdownRenderer.render()` not awaited**: floating promise; scroll may happen before render completes — minor cosmetic issue

---

## Issues Found

### Issue #1 — Unhandled rejection in `initialIndex()` during API failure
- **Severity**: critical
- **Description**: `VaultIndexer.initialIndex()` calls `await this.llmProvider.embed(allChunkTexts)` with no surrounding try/catch. If the OpenAI API call fails for any reason (rate limit, network error, invalid key), the error propagates through the `onLayoutReady` async callback in `main.ts` with no catch handler, resulting in an unhandled promise rejection. In Obsidian this typically surfaces as a visible error notice, violating the acceptance criterion that the plugin activates without errors.
- **Reproduction**: Configure a valid API key, start Obsidian, and simulate a network failure or rate-limit response during initial indexing.
- **Suggestion**: Wrap the batch loop body (or the entire `initialIndex()` call in `main.ts`) in a try/catch. On error, update the status bar with an informative message (e.g., `"KB: Indexing failed — check console"`) and log the error.

### Issue #2 — Empty API key + empty vault → wrong error message
- **Severity**: warning
- **Description**: The acceptance criterion requires: "If the API key is empty, the chat UI displays a clear error message prompting the user to configure it." When the API key is empty and the vault has never been indexed (empty vector store), `rag-engine.query()` returns `"No notes have been indexed yet. Please wait for indexing to complete."` — this is factually wrong and does not direct the user to configure the API key. The root cause is that the RAG engine does not have access to the settings to distinguish the two conditions.
- **Reproduction**: Install plugin fresh, leave API key blank, open chat view, submit any question.
- **Suggestion**: Either (a) pass `settings` to `ChatView` and check `openaiApiKey` before calling `query()`, displaying "Please set your OpenAI API key in settings before using chat", or (b) add an API key validation check at the top of `RagEngine.query()`.

### Issue #3 — H1 heading boundary missing from chunker
- **Severity**: warning
- **Description**: The separators array in `chunker.ts` is `["\n## ", "\n### ", "\n\n", "\n", ". "]`. The H1 separator `"\n# "` is absent. Documents that use H1 (`# `) headings as their primary section dividers will not be split at those boundaries; the H2 split is attempted first, which may yield large unsplit sections that cascade to less semantically meaningful splits (paragraph or line).
- **Reproduction**: Create a Markdown document with `# H1 Heading` sections of 300+ tokens each and call `chunk()`.
- **Suggestion**: Add `"\n# "` as the first entry in the separators array: `["\n# ", "\n## ", "\n### ", "\n\n", "\n", ". "]`.

### Issue #4 — Chunker acceptance criteria for structured documents fail
- **Severity**: critical (two acceptance criteria fail)
- **Description**: Two specific acceptance criteria from REQUIREMENTS.md fail:
  1. **"3 `##` headings of 200 tokens each → at least 3 chunks"**: Verified by simulation — `mergeSections()` combines the first two 200-token sections (combined 401 tokens, below the 500-token `chunkSize`), producing 2 chunks instead of 3. The requirement implies each heading section should remain as its own chunk, but the current merge logic prioritizes filling chunks to `chunkSize`.
  2. **"1200-token document with no headings → at least 3 chunks"**: Fails when the document has no paragraph breaks or sentence boundaries. With continuous text and none of the 5 separator characters present, `splitText()` falls through with `sepIndex >= separators.length` and returns the entire text as a single oversize chunk with no hard-cut fallback.
- **Reproduction**: Simulation scripts in this report (see test run output above).
- **Suggestion**:
  - For criterion 1: Add an option to keep each top-level heading section as its own chunk minimum (do not merge across heading boundaries if the merged result would cross a heading). Alternatively, expand the merge guard to refuse merging sections that start with headings.
  - For criterion 2: Add a character-level hard-cut fallback as the final separator (empty string `""` split into individual characters, or fixed-width slices) when all separators are exhausted. LangChain's `RecursiveCharacterTextSplitter` uses `""` as the last separator for this purpose.

### Issue #5 — Design deviation: plugin fields declared private/local
- **Severity**: info
- **Description**: DESIGN.md specifies `llmProvider`, `vectorStore`, `vaultIndexer`, and `ragEngine` as public properties on `ObsidianKBPlugin`. The implementation declares `vectorStore`, `vaultIndexer`, and `ragEngine` as `private` fields, and `llmProvider` as a local `const` inside `onload()` (not stored at all). This is not a functional defect for Phase 1 (no other module reads these properties), but it deviates from the design and will cause issues if future phases add settings hot-reload (which would need to recreate `llmProvider` and `ragEngine` with new settings).
- **Reproduction**: Code review of `src/main.ts` lines 12–44.
- **Suggestion**: Make the fields public as specified, or at minimum keep `llmProvider` as a stored field so it can be recreated when settings change.

---

## Items Requiring Manual Testing

The following acceptance criteria cannot be verified by static analysis and require loading the plugin in Obsidian with a valid OpenAI API key:

1. **Plugin activation without errors** — requires Obsidian runtime
2. **`embed(["hello world"])` returns vector with length > 0** — requires live OpenAI API
3. **Chat streaming tokens appear in real-time** — requires Obsidian + API
4. **Clicking source link opens note in Obsidian editor** — requires Obsidian runtime
5. **LanceDB native binary loading in Electron** — requires Obsidian's Electron environment
6. **Settings tab reachable via Obsidian Settings navigation** — requires Obsidian runtime
7. **Large vault (200+ notes) indexing completes without UI freeze** — requires Obsidian runtime with real vault

---

## Recommendation

**Fix required before proceeding to review.**

Two critical failures block the merge:

1. **Issue #1** (unhandled rejection in `initialIndex()`): Any API error during initial indexing crashes the plugin's startup flow with an unhandled promise rejection. This is a stability defect that would be immediately visible to users.

2. **Issue #4** (chunker acceptance criteria): Two acceptance criteria written explicitly in REQUIREMENTS.md are demonstrably false. The merge-across-heading-boundaries behavior violates the intent of the heading-aware chunker, and the missing hard-cut fallback means continuous text over the chunk size is stored as an oversized single chunk.

Issue #2 (wrong error message for empty API key) and Issue #3 (missing H1 boundary) are warnings that should be addressed but are lower priority.

Issue #5 (private fields vs DESIGN spec) is informational only.

**Recommended actions before re-review:**
1. Wrap `initialIndex()` batch loop in try/catch with status bar error reporting
2. Add API key empty check in `ChatView.handleSubmit()` before calling `query()`
3. Add `"\n# "` as first separator in chunker
4. Fix the heading-boundary merge prevention in `mergeSections()` and add a hard-cut fallback in `splitText()`
