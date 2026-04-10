# Design: MVP Phase 1 — RAG Core

## Codebase Analysis

This is a greenfield project. No existing code exists. The design is informed by:

- The broader architecture plan (which covers Phases 1-5)
- Obsidian's plugin API conventions (`Plugin`, `PluginSettingTab`, `ItemView`, `requestUrl`, vault events)
- The constraints of running inside Obsidian's Electron renderer process

Key conventions to establish from the start:

- All source code under `src/`, organized into `core/`, `llm/`, `ui/` subdirectories
- A single `types.ts` for shared interfaces and types
- esbuild bundles everything into a single `main.js`
- LanceDB data stored at `{vault}/.obsidian-kb/vectors/`
- Plugin settings stored via Obsidian's `plugin.loadData()`/`plugin.saveData()`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Obsidian Host                            │
│                                                                 │
│  ┌──────────┐   ┌────────────┐   ┌───────────────────────────┐ │
│  │ main.ts  │──▶│ settings.ts│   │        Chat UI            │ │
│  │ (Plugin) │   │(SettingTab)│   │   (ItemView sidebar)      │ │
│  └────┬─────┘   └────────────┘   └─────────┬─────────────────┘ │
│       │                                     │                   │
│       │  owns all modules                   │ user questions    │
│       ▼                                     ▼                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    RAG Engine                        │       │
│  │  query() → embed → search → context → LLM → stream  │       │
│  └────────┬──────────────────┬──────────────────────────┘       │
│           │                  │                                   │
│     ┌─────▼──────┐    ┌─────▼──────┐                           │
│     │VectorStore │    │LLMProvider │                           │
│     │ (LanceDB)  │    │  (OpenAI)  │                           │
│     └─────▲──────┘    └─────▲──────┘                           │
│           │                  │                                   │
│     ┌─────┴──────┐          │                                   │
│     │VaultIndexer│──────────┘ (calls embed)                    │
│     │            │                                              │
│     └─────┬──────┘                                              │
│           │                                                     │
│     ┌─────▼──────┐                                              │
│     │  Chunker   │                                              │
│     └────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Module dependency graph** (arrows mean "depends on"):

```
main.ts ──▶ settings.ts
main.ts ──▶ VaultIndexer ──▶ Chunker
                          ──▶ VectorStore
                          ──▶ LLMProvider (for embedding)
main.ts ──▶ RagEngine ──▶ VectorStore
                       ──▶ LLMProvider (for embedding + chat)
main.ts ──▶ ChatView ──▶ RagEngine
```

---

## Data Model (`src/types.ts`)

All shared TypeScript interfaces live in a single file. This keeps imports clean and avoids circular dependencies.

```typescript
// ─── Plugin Settings ───

export interface PluginSettings {
  openaiApiKey: string;
  chatModel: string; // default: "gpt-4o"
  embeddingModel: string; // default: "text-embedding-3-small"
  topK: number; // default: 5
  embeddingBatchSize: number; // default: 20
  chunkSize: number; // default: 500 (in tokens)
  chunkOverlap: number; // default: 50 (in tokens)
}

export const DEFAULT_SETTINGS: PluginSettings = {
  openaiApiKey: '',
  chatModel: 'gpt-4o',
  embeddingModel: 'text-embedding-3-small',
  topK: 5,
  embeddingBatchSize: 20,
  chunkSize: 500,
  chunkOverlap: 50,
};

// ─── Chunking ───

export interface ChunkMetadata {
  filePath: string;
  fileTitle: string;
  chunkIndex: number;
}

export interface Chunk {
  text: string;
  metadata: ChunkMetadata;
  tokenCount: number;
}

// ─── Vector Store ───

export interface VectorChunk {
  id: string; // deterministic: `${filePath}::${chunkIndex}`
  text: string;
  filePath: string;
  fileTitle: string;
  chunkIndex: number;
  vector: number[];
}

// ─── LLM ───

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number; // default: 0.3
  maxTokens?: number; // default: 1024
}

// ─── RAG ───

export interface SourceReference {
  filePath: string;
  fileTitle: string;
  chunkText: string; // first 200 chars for preview
}

export interface RagResponseToken {
  type: 'token';
  token: string;
}

export interface RagResponseSources {
  type: 'sources';
  sources: SourceReference[];
}

export interface RagResponseError {
  type: 'error';
  message: string;
}

export type RagResponse = RagResponseToken | RagResponseSources | RagResponseError;

// ─── Indexer ───

export interface FileHashManifest {
  [filePath: string]: string; // filePath → MD5 hash of content
}
```

---

## Module Design

### Module 1: Plugin Entry (`src/main.ts`)

**Purpose**: Obsidian plugin lifecycle — instantiate all modules, wire them together, register views/commands/events.

```typescript
export default class ObsidianKBPlugin extends Plugin {
  settings: PluginSettings;
  llmProvider: LLMProvider;
  vectorStore: VectorStore;
  vaultIndexer: VaultIndexer;
  ragEngine: RagEngine;

  async onload(): Promise<void>; // init everything
  async onunload(): Promise<void>; // cleanup
  async loadSettings(): Promise<void>;
  async saveSettings(): Promise<void>;
}
```

**Responsibilities**:

- Load settings, instantiate `OpenAIProvider`, `VectorStore`, `VaultIndexer`, `RagEngine`
- Register the `ChatView` view type
- Register ribbon icon and command to open chat
- Add status bar item (passed to `VaultIndexer`)
- Call `vaultIndexer.initialIndex()` then `vaultIndexer.watchForChanges()`
- Register settings tab

**Dependencies**: All other modules (this is the composition root).

**Design decisions**:

- Module instantiation order: settings -> LLMProvider -> VectorStore -> VaultIndexer -> RagEngine -> ChatView
- All modules receive their dependencies via constructor injection (no global singletons)
- The `Plugin` instance is passed to modules that need Obsidian API access (vault, workspace)

---

### Module 2: Settings (`src/settings.ts`)

**Purpose**: Settings tab UI and persistence.

```typescript
export class KBSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: ObsidianKBPlugin);
  display(): void;
}
```

**Settings fields**:
| Field | UI Control | Default |
|-------|-----------|---------|
| `openaiApiKey` | Password input | `""` |
| `chatModel` | Dropdown (`gpt-4o`, `gpt-4o-mini`) | `"gpt-4o"` |
| `embeddingModel` | Dropdown (`text-embedding-3-small`, `text-embedding-3-large`) | `"text-embedding-3-small"` |
| `topK` | Slider (1-20) | `5` |
| `embeddingBatchSize` | Slider (5-50) | `20` |

**Dependencies**: `ObsidianKBPlugin` (for `loadData`/`saveData`).

---

### Module 3: LLM Provider (`src/llm/provider.ts` + `src/llm/openai.ts`)

**Abstract interface** (`provider.ts`):

```typescript
export interface LLMProvider {
  readonly name: string;
  readonly maxTokens: number;
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>;
  embed(texts: string[]): Promise<number[][]>;
}
```

**OpenAI implementation** (`openai.ts`):

```typescript
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly maxTokens: number;

  constructor(apiKey: string, chatModel: string, embeddingModel: string);

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>;
  async embed(texts: string[]): Promise<number[][]>;
}
```

**Internal design**:

- Uses the official `openai` npm package (`new OpenAI({ apiKey, dangerouslyAllowBrowser: true })`)
- `chat()` calls `openai.chat.completions.create({ stream: true })` and yields delta tokens
- `embed()` calls `openai.embeddings.create({ input: texts, model })` and returns the vector array
- All API errors are caught and re-thrown as descriptive `Error` objects with user-friendly messages
- The `dangerouslyAllowBrowser: true` flag is required because the code runs in Electron's renderer process, which the OpenAI SDK detects as a browser environment

**Why `dangerouslyAllowBrowser: true`**: Obsidian plugins run in the renderer process. The OpenAI SDK checks `typeof window \!== 'undefined'` and refuses to run without this flag. This is safe in our context because the API key is already local to the user's machine.

**Dependencies**: `openai` npm package, `Message` and `ChatOptions` types.

---

### Module 4: Chunker (`src/core/chunker.ts`)

**Public API**:

```typescript
export function chunk(
  content: string,
  metadata: Omit<ChunkMetadata, 'chunkIndex'>,
  options?: { chunkSize?: number; chunkOverlap?: number },
): Chunk[];

// Internal helper, exported for testing
export function estimateTokens(text: string): number;
```

**Algorithm — Markdown-aware recursive character splitting**:

1. If `content` is empty or whitespace-only, return `[]`.
2. Try to split by `\n## ` (h2 headings) first.
3. If any resulting section exceeds `chunkSize` tokens, recursively split by `\n### ` (h3), then `\n\n` (paragraphs), then `\n` (lines), then `. ` (sentences).
4. Merge adjacent small sections until they approach `chunkSize`.
5. Apply overlap: each chunk (after the first) starts with the last `chunkOverlap` tokens of the previous chunk.
6. Assign sequential `chunkIndex` values starting from 0.

**Token estimation**: `estimateTokens(text)` returns `Math.ceil(text.length / 4)`. This is the 1 token ~ 4 chars approximation specified in the requirements. It is acceptable for Phase 1 since the requirement states "must not over-chunk by more than 20%", and this approximation is within that tolerance for English text and reasonably close for CJK text (which tends toward ~1.5-2 chars per token but will simply produce slightly smaller chunks, which is acceptable).

**Dependencies**: None (pure function, no external imports).

---

### Module 5: Vector Store (`src/core/vector-store.ts`)

**Public API**:

```typescript
export class VectorStore {
  constructor(vaultPath: string);

  async initialize(): Promise<void>;
  async upsert(chunks: VectorChunk[]): Promise<void>;
  async query(embedding: number[], topK: number): Promise<VectorChunk[]>;
  async delete(filePath: string): Promise<void>;
  async isEmpty(): Promise<boolean>;
}
```

**Internal design**:

- Data directory: `{vaultPath}/.obsidian-kb/vectors/`
- Uses `@lancedb/lancedb` to open/create a database at that path
- Single table named `"chunks"` with schema: `id (string), text (string), filePath (string), fileTitle (string), chunkIndex (int32), vector (fixed_size_list[float32, N])`
- `initialize()`: connects to the database, creates the table if it does not exist. Creates the `.obsidian-kb/vectors/` directory if it does not exist using `fs.mkdirSync({ recursive: true })`.
- `upsert()`: deletes all existing rows where `filePath` matches any of the incoming chunks' file paths, then adds the new chunks. This is a delete-then-insert pattern because LanceDB does not have a native upsert-by-key operation that handles the variable-number-of-chunks-per-file case cleanly.
- `query()`: performs vector search using LanceDB's built-in `search(embedding).limit(topK)` and returns results mapped to `VectorChunk` objects. Uses cosine distance (LanceDB default for normalized vectors; OpenAI embeddings are already L2-normalized).
- `delete()`: deletes all rows where `filePath` matches.
- `isEmpty()`: checks if the table exists and has at least one row.

**LanceDB table creation strategy**: On first call to `initialize()`, if the table does not exist, we create it by inserting a single dummy record and immediately deleting it. This is necessary because LanceDB requires at least one record to infer the schema (including the vector dimension). The alternative — specifying the schema via Apache Arrow — adds complexity. Instead, we will use LanceDB's `createTable(name, data)` overload which infers the schema from the first record. We create a proper first record during the first real `upsert()` call. To handle the "table does not exist yet" case, `initialize()` will simply connect to the DB, and `upsert()` will create the table on first use if it does not exist.

**Revised approach for table creation**:

- `initialize()` connects to the DB and attempts to open table `"chunks"`. If it does not exist, it sets an internal flag `tableReady = false`.
- `upsert()` checks `tableReady`. If false and data is available, it calls `db.createTable("chunks", data)` which creates the table and inserts the first batch. Subsequent calls use `table.add(data)`.
- `query()` and `delete()` return empty results / no-op if `tableReady` is false.

**Dependencies**: `@lancedb/lancedb`, `apache-arrow` (peer dependency), Node.js `fs` module.

---

### Module 6: Vault Indexer (`src/core/vault-indexer.ts`)

**Public API**:

```typescript
export class VaultIndexer {
  constructor(
    vault: Vault, // Obsidian Vault API
    vectorStore: VectorStore,
    llmProvider: LLMProvider,
    settings: PluginSettings,
    statusBarEl: HTMLElement,
  );

  async initialIndex(): Promise<void>;
  watchForChanges(): void;
  async destroy(): Promise<void>;
}
```

**Internal design**:

**File hash manifest**:

- Stored as JSON at `{vaultPath}/.obsidian-kb/manifest.json`
- Structure: `{ [filePath: string]: string }` where the value is an MD5 hex hash of the file content
- On `initialIndex()`, for each `.md` file: compute hash, compare with manifest. Skip if unchanged.
- After successful indexing of a file, update the manifest entry.
- On file delete, remove the entry from the manifest.
- Manifest is loaded into memory at startup and written back to disk after each batch completes.

**Hashing**: Use Node.js `crypto.createHash('md5').update(content).digest('hex')`. MD5 is fine here — it is used for change detection, not security.

**`initialIndex()` flow**:

1. Load manifest from disk (or create empty `{}`).
2. List all `.md` files via `vault.getMarkdownFiles()`.
3. Filter out files in `.obsidian/` and `.obsidian-kb/` directories.
4. For each file, compute hash. Collect files whose hash differs from manifest.
5. Process changed files in batches of `settings.embeddingBatchSize`:
   a. Read file content via `vault.cachedRead(file)`.
   b. Chunk via `chunk(content, { filePath, fileTitle })`.
   c. Collect all chunks from the batch.
   d. Call `llmProvider.embed(chunkTexts)` to get vectors.
   e. Construct `VectorChunk[]` and call `vectorStore.upsert(chunks)`.
   f. Update manifest entries.
   g. Update status bar: `"Indexing: X / Y notes"`.
   h. Wait 200ms before next batch (rate limit protection).
6. Detect deleted files: files in manifest but not in vault. Call `vectorStore.delete(filePath)` and remove from manifest.
7. Save manifest to disk.
8. Update status bar: `"KB: X notes indexed"`.

**`watchForChanges()` flow**:

- Register `vault.on('modify', callback)`, `vault.on('create', callback)`, `vault.on('delete', callback)`.
- Store the event references for cleanup in `destroy()`.
- On modify/create: debounce by 2 seconds (avoid re-indexing on every keystroke), then re-index the single file (read, hash, chunk, embed, upsert, update manifest).
- On delete: call `vectorStore.delete(filePath)`, remove from manifest.
- File filtering: ignore non-`.md` files and files in `.obsidian/` or `.obsidian-kb/`.

**Debouncing**: Use a `Map<string, ReturnType<typeof setTimeout>>` to track pending re-index timers per file path. On each modify event, clear the previous timer and set a new 2-second timer.

**Dependencies**: Obsidian `Vault` API, `VectorStore`, `LLMProvider`, `Chunker`, Node.js `crypto` and `fs`.

---

### Module 7: RAG Engine (`src/core/rag-engine.ts`)

**Public API**:

```typescript
export class RagEngine {
  constructor(vectorStore: VectorStore, llmProvider: LLMProvider, settings: PluginSettings);

  async *query(userQuestion: string): AsyncGenerator<RagResponse>;
}
```

**`query()` pipeline**:

1. **Validate**: If `userQuestion` is empty, throw `Error("Please enter a question.")`.
2. **Check index**: If `vectorStore.isEmpty()`, yield `{ type: "error", message: "No notes indexed yet. Please wait for indexing to complete." }` and return.
3. **Embed question**: `const [embedding] = await llmProvider.embed([userQuestion])`.
4. **Vector search**: `const results = await vectorStore.query(embedding, settings.topK)`.
5. **Assemble context**: Build a context string from results:

   ```
   [Source: Note Title (path/to/note.md)]
   chunk text here...

   [Source: Another Note (path/to/other.md)]
   chunk text here...
   ```

6. **Build messages**: Construct the message array:
   - System message: instructs the LLM to answer based only on provided context, cite sources by note title, and say "I don't have enough information" if the context is insufficient.
   - User message: `"Context:\n{context}\n\nQuestion: {userQuestion}"`
7. **Stream LLM response**: `for await (const token of llmProvider.chat(messages))` — yield each token as `{ type: "token", token }`.
8. **Emit sources**: After the stream completes, yield `{ type: "sources", sources }` where sources are deduplicated by `filePath`.

**System prompt** (exact text):

```
You are a helpful assistant that answers questions based on the user's personal notes.
You MUST only use the provided context to answer. Do not use external knowledge.
When citing information, reference the source note title in square brackets, e.g., [Note Title].
If the provided context does not contain enough information to answer the question,
say "I don't have enough information in your notes to answer this question."
```

**Dependencies**: `VectorStore`, `LLMProvider`, `PluginSettings` types.

---

### Module 8: Chat UI (`src/ui/chat-view.ts`)

**Public API**:

```typescript
export const CHAT_VIEW_TYPE = 'obsidian-kb-chat';

export class ChatView extends ItemView {
  constructor(leaf: WorkspaceLeaf, ragEngine: RagEngine, app: App);

  getViewType(): string; // returns CHAT_VIEW_TYPE
  getDisplayText(): string; // returns "KB Chat"
  getIcon(): string; // returns "message-square"
  async onOpen(): Promise<void>;
  async onClose(): Promise<void>;
}
```

**Internal design**:

The UI is built using plain DOM manipulation (not React/Svelte). This keeps the dependency tree small and aligns with how most Obsidian community plugins work.

**DOM structure**:

```html
<div class="kb-chat-container">
  <div class="kb-chat-messages"><\!-- message bubbles rendered here --></div>
  <div class="kb-chat-input-area">
    <textarea class="kb-chat-input" placeholder="Ask about your notes..."></textarea>
    <button class="kb-chat-send">Send</button>
  </div>
</div>
```

**Message rendering**:

- User messages: plain text in a styled bubble.
- Assistant messages: rendered as Markdown using `MarkdownRenderer.render()` from the Obsidian API. This handles bold, italic, lists, code blocks, etc.
- Source references: rendered as clickable `<a>` elements below the assistant message. Clicking opens the file via `app.workspace.openLinkText(filePath, "")`.
- Error messages: rendered in a red-tinted bubble.
- Loading state: an animated ellipsis (`...`) shown while waiting for the first token.

**Event handling**:

- Enter (without Shift) submits the message.
- Shift+Enter inserts a newline.
- During streaming: input and send button are disabled.
- After streaming completes: re-enable input, scroll to bottom, focus input.

**Streaming integration**:

```typescript
private async handleSubmit(question: string): Promise<void> {
  this.setInputEnabled(false);
  this.addUserMessage(question);
  const assistantEl = this.addAssistantMessage();  // empty bubble + loader

  try {
    for await (const response of this.ragEngine.query(question)) {
      if (response.type === "token") {
        this.appendToken(assistantEl, response.token);
      } else if (response.type === "sources") {
        this.renderSources(assistantEl, response.sources);
      } else if (response.type === "error") {
        this.renderError(assistantEl, response.message);
      }
    }
  } catch (err) {
    this.renderError(assistantEl, (err as Error).message);
  } finally {
    this.setInputEnabled(true);
  }
}
```

**Markdown re-rendering**: To avoid re-rendering the entire message on every token, we accumulate the full response text in a string variable and re-render the Markdown only every 100ms (throttled). This gives smooth streaming without excessive DOM thrashing.

**No external UI framework**: Using plain DOM + Obsidian's `MarkdownRenderer` keeps the bundle small and avoids compatibility issues. The CSS goes in `styles.css` at the project root.

**Dependencies**: Obsidian API (`ItemView`, `MarkdownRenderer`, `WorkspaceLeaf`), `RagEngine`.

---

## Data Flow

### Indexing Flow

```
1. Plugin loads → VaultIndexer.initialIndex()
2. vault.getMarkdownFiles() → list all .md files
3. For each file: compute MD5 hash
4. Compare with manifest → collect changed files
5. Process in batches of 20:
   a. vault.cachedRead(file) → raw markdown string
   b. chunk(content, metadata) → Chunk[]
   c. llmProvider.embed(chunkTexts[]) → number[][]
   d. Combine into VectorChunk[]
   e. vectorStore.upsert(vectorChunks)
   f. Update manifest, update status bar
   g. await sleep(200ms)
6. Detect deleted files → vectorStore.delete() + remove from manifest
7. Save manifest to disk
8. Status bar: "KB: 142 notes indexed"
```

### Query Flow

```
1. User types question in chat sidebar, presses Enter
2. ChatView calls ragEngine.query(question)
3. ragEngine:
   a. llmProvider.embed([question]) → questionEmbedding
   b. vectorStore.query(questionEmbedding, topK=5) → VectorChunk[]
   c. Assemble context string with source labels
   d. Build messages: [system prompt, user message with context]
   e. llmProvider.chat(messages) → AsyncIterable<string>
4. ChatView receives RagResponse stream:
   a. type="token" → append to message bubble, re-render markdown (throttled)
   b. type="sources" → render clickable source links below message
5. User clicks source link → app.workspace.openLinkText(filePath)
```

---

## Key Technical Decisions

### Decision 1: LanceDB in Electron

**Choice**: Use `@lancedb/lancedb` (v0.27.x) Node.js binding directly.

**Rationale**: LanceDB ships pre-built native binaries for multiple platforms via `@napi-rs`. Obsidian's Electron exposes full Node.js APIs in the renderer process, and native addons work as long as the Node ABI matches. The Obsidian desktop app uses Electron ~28+ (Node 18+), which is compatible with LanceDB's NAPI bindings (they use N-API which is ABI-stable across Node versions).

**Risk**: If the native binary fails to load (ABI mismatch), the plugin will not work.

**Mitigation**:

- Test the plugin against Obsidian's exact Electron version during development.
- LanceDB uses N-API (version-agnostic), which reduces ABI breakage risk.
- Document the minimum Obsidian version requirement.
- esbuild must be configured with `external: ['@lancedb/lancedb']` to avoid bundling the native addon. The native module will be loaded from `node_modules` at runtime. This means the plugin distribution must include `node_modules/@lancedb/lancedb` (and its native binary). This is handled by the install instructions, which will run `npm install` inside the plugin directory.

**esbuild configuration for native modules**: The esbuild config must mark `@lancedb/lancedb` and `apache-arrow` as external. These packages will remain in `node_modules/` and be resolved at runtime via Node's `require()`. This is the standard approach for Obsidian plugins that use native addons.

### Decision 2: Token Counting

**Choice**: Character approximation — `Math.ceil(text.length / 4)`.

**Rationale**: The requirements explicitly allow this approximation for Phase 1 and state it "must not over-chunk by more than 20%". For English text, the 4 chars/token ratio is well-established and within tolerance. Avoiding `tiktoken` saves ~2MB of WASM bundle size and eliminates a class of loading issues in Electron.

**Future path**: Phase 5 can add optional tiktoken for exact counting.

### Decision 3: Embedding Batching

**Choice**: Process files in configurable batches (default 20 files per batch) with a 200ms delay between batches.

**Rationale**: OpenAI's embedding API accepts arrays of strings in a single request (up to ~8K tokens total input). Batching by file count (rather than token count) is simpler and predictable. The 200ms inter-batch delay prevents rate limiting. The batch size is configurable via settings so users with higher rate limits can increase it.

**Implementation detail**: Within a single batch, all chunks from all files in that batch are collected and sent in a single `embed()` call to the OpenAI API. If the total number of chunks exceeds the API's input limit (~2048 strings per request), the `embed()` implementation will internally split into sub-batches.

### Decision 4: File Hash Manifest for Incremental Indexing

**Choice**: JSON file at `{vault}/.obsidian-kb/manifest.json` mapping file paths to MD5 hashes.

**Rationale**: Simple, human-readable, easy to debug. MD5 is fast and sufficient for change detection (not used for security). The manifest is small (a few hundred KB even for vaults with thousands of notes) and loads quickly.

**Alternative considered**: Using file modification timestamps. Rejected because `mtime` is unreliable across synced vaults (Dropbox, iCloud, Syncthing) — these tools often update mtime when syncing even if content has not changed.

### Decision 5: Obsidian API Integration

**Choice**: Use Obsidian's native APIs throughout.

- **File reading**: `vault.cachedRead(file)` — fast, uses Obsidian's internal cache.
- **File listing**: `vault.getMarkdownFiles()` — respects Obsidian's file index.
- **File events**: `vault.on('modify')`, `vault.on('create')`, `vault.on('delete')` — standard Obsidian event system.
- **HTTP requests**: The OpenAI SDK uses `fetch` internally, which works in Electron's renderer process. We do NOT need to use `requestUrl` from Obsidian — the OpenAI SDK handles HTTP directly.
- **Markdown rendering**: `MarkdownRenderer.render()` — Obsidian's built-in renderer, handles all Obsidian-specific Markdown extensions.
- **Opening files**: `app.workspace.openLinkText(filePath, "")` — standard way to open a note.
- **ItemView lifecycle**: `ChatView` extends `ItemView`. The view is registered in `onload()` and Obsidian manages its lifecycle. We store the `RagEngine` reference in the view instance (passed via constructor) so it survives view re-creation.

### Decision 6: No UI Framework

**Choice**: Plain DOM manipulation + Obsidian's built-in `MarkdownRenderer`.

**Rationale**: The chat UI is relatively simple (message list + input). Using React or Svelte would add bundle size, build complexity, and potential conflicts with Obsidian's own DOM management. Most successful Obsidian community plugins use plain DOM. The `styles.css` file at the project root provides all styling.

### Decision 7: VectorStore Upsert Strategy

**Choice**: Delete-then-insert by `filePath`.

**Rationale**: When a file is modified, the number of chunks may change (the file might have grown or shrunk). A simple "update existing chunks" approach would require tracking which chunks are new, modified, or removed. Delete-all-for-file then insert-new-chunks is simpler and correct. The performance cost is negligible since we are operating on a small number of rows per file.

---

## Dependency List

### Production Dependencies

| Package            | Version   | Purpose                                    |
| ------------------ | --------- | ------------------------------------------ |
| `@lancedb/lancedb` | `^0.27.0` | Local vector database with native bindings |
| `apache-arrow`     | `^18.0.0` | Required peer dependency of LanceDB        |
| `openai`           | `^4.80.0` | OpenAI API SDK for chat and embedding      |

### Dev Dependencies

| Package       | Version   | Purpose                                     |
| ------------- | --------- | ------------------------------------------- |
| `obsidian`    | `^1.7.0`  | Obsidian API type definitions (not bundled) |
| `typescript`  | `^5.5.0`  | TypeScript compiler                         |
| `esbuild`     | `^0.24.0` | JavaScript bundler                          |
| `@types/node` | `^20.0.0` | Node.js type definitions                    |
| `tslib`       | `^2.8.0`  | TypeScript runtime helpers                  |

### Notes on Bundling

- `obsidian` is marked as `external` in esbuild (provided by the host).
- `@lancedb/lancedb` is marked as `external` in esbuild (native addon, loaded from `node_modules` at runtime).
- `apache-arrow` is marked as `external` in esbuild (used by LanceDB at runtime).
- `openai` IS bundled into `main.js` by esbuild (pure JS, tree-shakeable).
- `electron` is marked as `external` in esbuild (provided by the host).

---

## File Structure

```
110-Obsidian-RAG/
├── manifest.json                  # Obsidian plugin manifest (id, version, minAppVersion)
├── package.json                   # npm dependencies and scripts
├── tsconfig.json                  # TypeScript config (strict: true)
├── esbuild.config.mjs             # esbuild bundler config
├── styles.css                     # Chat UI styles
├── docs/
│   └── specs/
│       └── 2026-04-07-rag-core-mvp/
│           ├── REQUIREMENTS.md
│           └── DESIGN.md          # This document
├── src/
│   ├── main.ts                    # Plugin entry point (composition root)
│   ├── settings.ts                # PluginSettingTab implementation
│   ├── types.ts                   # All shared TypeScript interfaces
│   │
│   ├── core/
│   │   ├── chunker.ts             # Markdown-aware text splitter
│   │   ├── vector-store.ts        # LanceDB wrapper (upsert, query, delete)
│   │   ├── vault-indexer.ts       # Full + incremental vault indexing
│   │   └── rag-engine.ts          # RAG pipeline (embed → search → LLM)
│   │
│   ├── llm/
│   │   ├── provider.ts            # LLMProvider interface
│   │   └── openai.ts              # OpenAI implementation
│   │
│   └── ui/
│       └── chat-view.ts           # Chat sidebar (ItemView)
│
└── Runtime data (in user's vault, NOT in repo):
    └── {vault}/.obsidian-kb/
        ├── vectors/               # LanceDB data files
        └── manifest.json          # File hash manifest
```

**Total: 10 source files** (main.ts, settings.ts, types.ts, chunker.ts, vector-store.ts, vault-indexer.ts, rag-engine.ts, provider.ts, openai.ts, chat-view.ts) plus 4 config files (manifest.json, package.json, tsconfig.json, esbuild.config.mjs) and 1 CSS file.

---

## Risks & Mitigations

### Risk 1: LanceDB Native Binary Incompatible with Obsidian's Electron

**Severity**: High (plugin will not load at all).

**Mitigation**:

- LanceDB uses N-API (Node-API), which provides ABI stability across Node.js versions. This means the same binary works across Node 18, 20, 22, etc.
- Test early: the first implementation step should be a "hello world" that imports LanceDB and creates a table inside Obsidian.
- Fallback plan: if LanceDB native bindings fail, evaluate `vectordb` (the older LanceDB package) or fall back to a pure-JS vector store using `hnswlib-node` or even a brute-force in-memory search for MVP (acceptable for vaults under 1000 notes).

### Risk 2: Bundle Size / Load Time

**Severity**: Medium (plugin may load slowly or hit Obsidian's timeout).

**Mitigation**:

- Keep `@lancedb/lancedb` and `apache-arrow` external (not bundled).
- The OpenAI SDK bundles to ~200KB after tree-shaking, which is acceptable.
- Measure `main.js` size after each implementation step. Target: under 500KB for the bundled JS.

### Risk 3: Embedding API Costs for Large Vaults

**Severity**: Medium (user pays per token).

**Mitigation**:

- File hash manifest ensures files are only re-embedded when their content changes.
- Status bar shows indexing progress so users know what is happening.
- Batch size and delay are configurable so users can tune for their API tier.

### Risk 4: Main Thread Blocking During Indexing

**Severity**: Medium (UI freezes).

**Mitigation**:

- All I/O is async (file reading, API calls, LanceDB operations).
- Batching with inter-batch delays (`await sleep(200)`) yields control back to the event loop between batches.
- The chunker is synchronous but operates on single files (fast — sub-millisecond for a typical note).

### Risk 5: OpenAI SDK Browser Detection

**Severity**: Low (easily solved).

**Mitigation**: Set `dangerouslyAllowBrowser: true` in the OpenAI constructor. This is well-documented and safe in our Electron context.

### Risk 6: Race Conditions in File Event Handling

**Severity**: Low (data inconsistency in vector store).

**Mitigation**:

- Debounce modify events by 2 seconds per file path.
- Use a processing queue (simple `Promise` chain) to ensure file indexing operations do not run concurrently for the same file.
- Delete events are processed immediately (no debounce needed).

---

## Alternatives Considered

### Vector Database Choice

| Approach                          | Pros                                                                           | Cons                                                      |
| --------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **LanceDB (chosen)**              | Local, embedded, good search performance, columnar storage, active development | Native binary dependency, Electron compatibility risk     |
| `hnswlib-node`                    | Proven HNSW implementation, lighter                                            | Also native binary, less feature-rich, manual persistence |
| Pure JS (brute force)             | Zero native deps, guaranteed compatibility                                     | O(n) search, impractical beyond ~5000 chunks              |
| SQLite + pgvector-style extension | Well-understood, battle-tested                                                 | No good vector extension for embedded SQLite in Node.js   |

### UI Framework

| Approach               | Pros                                                   | Cons                                                |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| **Plain DOM (chosen)** | Small bundle, no conflicts, standard Obsidian approach | More verbose code for complex UIs                   |
| React                  | Component model, ecosystem                             | Large bundle, potential conflicts with Obsidian DOM |
| Svelte                 | Small bundle, reactive                                 | Build complexity, less common in Obsidian plugins   |

### Token Counting

| Approach                        | Pros                            | Cons                                          |
| ------------------------------- | ------------------------------- | --------------------------------------------- |
| **Char approximation (chosen)** | Zero dependencies, fast, simple | ~10-15% inaccuracy for English, worse for CJK |
| `tiktoken` WASM                 | Exact counts                    | +2MB bundle, WASM loading issues in Electron  |
| `gpt-tokenizer`                 | Pure JS, exact                  | +500KB bundle, slower than approximation      |

---

_Document written: 2026-04-07_
_Phase: MVP Phase 1 — RAG Core_
_Author: Architect Agent_
