# Feature: MVP Phase 1 - RAG Core

## Summary

Build the foundational RAG (Retrieval-Augmented Generation) pipeline as an Obsidian plugin that allows users to query their existing Vault notes through a chat interface, receiving answers grounded in their own knowledge base with source citations. This phase establishes the complete end-to-end RAG loop without any external content ingestion.

---

## User Stories

**US-1 — Initial Setup**
As a user, I want to install the plugin, enter my OpenAI API key in settings, and have the plugin ready to index and chat within minutes, so that setup friction is minimal.

**US-2 — Vault Indexing**
As a user, I want my existing Vault notes to be automatically indexed when the plugin loads for the first time, so that I can immediately start asking questions about my notes without manual steps.

**US-3 — Incremental Updates**
As a user, I want notes I create, edit, or delete to be reflected in the index automatically, so that my knowledge base always stays current without manual re-indexing.

**US-4 — Conversational Query**
As a user, I want to ask questions in natural language in a chat sidebar and receive answers drawn from my Vault content, so that I can surface insights across all my notes without manually searching.

**US-5 — Source Transparency**
As a user, I want each AI answer to show which notes it cited, with clickable links that open the source note, so that I can verify answers and explore the context further.

**US-6 — Streaming Responses**
As a user, I want the AI response to stream word-by-word rather than appearing all at once, so that I get immediate feedback and the interface feels responsive.

---

## Acceptance Criteria

### Plugin Scaffold

- [ ] `manifest.json` is valid and declares the correct plugin ID, name, minimum Obsidian version (1.4.0 or higher), and version `0.1.0`.
- [ ] `esbuild.config.mjs` produces a single `main.js` bundle that Obsidian can load without errors.
- [ ] The plugin activates without throwing any errors when loaded in Obsidian (no red notices on startup).
- [ ] The plugin adds a settings tab under Obsidian Settings that is reachable via the standard settings navigation.

### Settings

- [ ] The settings tab contains an input field for OpenAI API key (masked/password type).
- [ ] The settings tab contains a dropdown to select the OpenAI chat model (default: `gpt-4o`).
- [ ] The settings tab contains a dropdown to select the OpenAI embedding model (default: `text-embedding-3-small`).
- [ ] Settings are persisted to disk via `plugin.loadData()` / `plugin.saveData()` and survive plugin reload.
- [ ] If the API key is empty, the chat UI displays a clear error message prompting the user to configure it, rather than throwing an unhandled exception.

### LLM Provider Interface

- [ ] `src/llm/provider.ts` exports an `LLMProvider` interface with at minimum: `chat(messages, options?): AsyncIterable<string>`, `embed(texts: string[]): Promise<number[][]>`, `name: string`, and `maxTokens: number`.
- [ ] `src/llm/openai.ts` implements `LLMProvider` using the official `openai` npm package.
- [ ] `chat()` streams tokens as an `AsyncIterable<string>` using the OpenAI streaming API (`stream: true`).
- [ ] `embed()` accepts a batch of strings and returns a corresponding array of embedding vectors via `text-embeddings` endpoint.
- [ ] A test call to `embed(["hello world"])` with a valid API key returns a single vector with length > 0.
- [ ] OpenAI API errors (invalid key, rate limit, network failure) are caught and surfaced as descriptive error messages in the UI, not unhandled promise rejections.

### Chunker

- [ ] `src/core/chunker.ts` exports a `chunk(content: string, metadata: ChunkMetadata): Chunk[]` function.
- [ ] Chunking respects Markdown heading boundaries: splits prefer heading boundaries (`#`, `##`, `###`) before falling back to paragraph boundaries, then sentence boundaries.
- [ ] Default chunk size is 500 tokens with 50-token overlap. Both values are configurable via function parameters.
- [ ] Each returned `Chunk` object contains: `text: string`, `metadata: ChunkMetadata` (including `filePath`, `fileTitle`, `chunkIndex`), and `tokenCount: number`.
- [ ] A document of 1200 tokens with no headings produces at least 3 chunks (ensuring overlap logic is applied).
- [ ] A document with 3 `##` headings of 200 tokens each produces at least 3 chunks, each starting at or near a heading boundary.
- [ ] Empty or whitespace-only input returns an empty array without throwing.

### Vector Store

- [ ] `src/core/vector-store.ts` wraps LanceDB and stores data at `{vaultPath}/.obsidian-kb/vectors/`.
- [ ] `upsert(chunks: VectorChunk[])` stores chunk embeddings and metadata; calling it twice with the same `filePath` overwrites the previous entries for that file (no duplicates).
- [ ] `query(embedding: number[], topK: number): VectorChunk[]` returns up to `topK` results sorted by cosine similarity descending.
- [ ] `delete(filePath: string)` removes all chunks associated with the given file path; subsequent queries do not return results from that file.
- [ ] The LanceDB table is created automatically on first use if it does not exist.
- [ ] The vector store initializes successfully on a fresh vault with no existing `.obsidian-kb/vectors/` directory.

### Vault Indexer

- [ ] `src/core/vault-indexer.ts` exports a `VaultIndexer` class with `initialIndex()` and `watchForChanges()` methods.
- [ ] `initialIndex()` reads all `.md` files in the vault, chunks them, generates embeddings, and upserts them into the vector store. Files already indexed (tracked by a stored file-hash manifest) are skipped.
- [ ] A status bar item displays the indexing progress as `"Indexing: X / Y notes"` during initial indexing, and `"KB: X notes indexed"` once complete.
- [ ] `watchForChanges()` registers Obsidian `vault.on('modify')`, `vault.on('create')`, and `vault.on('delete')` event listeners.
- [ ] When a note is modified or created, only that note is re-chunked, re-embedded, and upserted (not the entire vault).
- [ ] When a note is deleted, all its chunks are removed from the vector store.
- [ ] Files in the `.obsidian` system folder and the `.obsidian-kb` folder are never indexed.
- [ ] Large vaults (200+ notes) complete initial indexing without crashing the Obsidian UI thread (embedding calls must be batched, not all concurrent).
- [ ] Batch size for embedding API calls is configurable (default: 20 files per batch) and respects a minimum 200ms delay between batches to avoid rate limiting.

### RAG Engine

- [ ] `src/core/rag-engine.ts` exports a `RagEngine` class with a `query(userQuestion: string): AsyncIterable<RagResponse>` method.
- [ ] `query()` follows this pipeline in order: (1) embed the user question, (2) vector search for top-5 chunks, (3) assemble a context string from the retrieved chunks, (4) call LLM with system prompt + context + user question, (5) stream the response.
- [ ] The number of retrieved chunks (top-k) is configurable via settings (default: 5).
- [ ] The assembled context includes each chunk's source file path as a label so the LLM can reference it.
- [ ] The system prompt instructs the LLM to only answer based on provided context and to cite source note titles in its response.
- [ ] `RagResponse` carries both the streamed `token: string` and a final `sources: SourceReference[]` (file paths and note titles of all retrieved chunks), emitted after the stream completes.
- [ ] If the vector store is empty (nothing indexed yet), `query()` returns a user-readable message explaining that no notes have been indexed yet, rather than throwing.
- [ ] If the user question is an empty string, `query()` rejects with a descriptive error before making any API calls.

### Chat UI

- [ ] `src/ui/chat-view.ts` registers an Obsidian `ItemView` with a unique view type ID (e.g., `obsidian-kb-chat`).
- [ ] A ribbon icon (or command palette entry `"Open KB Chat"`) opens the chat view in the right sidebar.
- [ ] The chat view renders a scrollable message history, a text input field, and a send button.
- [ ] Pressing Enter (without Shift) in the input field submits the message; Shift+Enter inserts a newline.
- [ ] Streamed AI tokens appear in the message bubble in real-time as they arrive.
- [ ] AI response text is rendered as Markdown (bold, italic, lists, code blocks are formatted, not shown as raw syntax).
- [ ] After the stream completes, a "Sources" section appears below the response listing each cited note as a clickable link.
- [ ] Clicking a source link opens the corresponding note in Obsidian's main editor pane.
- [ ] While a response is streaming, the input field and send button are disabled to prevent concurrent requests.
- [ ] A loading indicator (spinner or animated ellipsis) is visible while waiting for the first token.
- [ ] If the RAG engine returns an error, the error message is displayed inline in the chat as a styled error bubble, not as a raw JavaScript error.
- [ ] Chat message history is visible for the current session (persisting across sessions is out of scope for Phase 1).

---

## Scope

### In Scope

- Obsidian plugin scaffold: `manifest.json`, `main.ts`, `settings.ts`, `esbuild.config.mjs`
- LLM Provider abstract interface (`provider.ts`) and OpenAI implementation (`openai.ts`) supporting chat streaming and batch embedding
- Markdown-aware recursive character text splitter (`chunker.ts`) with 500-token chunks and 50-token overlap
- LanceDB vector store wrapper (`vector-store.ts`) with upsert, query, and delete operations, stored at `{vault}/.obsidian-kb/vectors/`
- Vault Indexer (`vault-indexer.ts`) for initial full indexing of existing `.md` notes and incremental updates via file event listeners
- RAG Engine (`rag-engine.ts`) implementing the full query pipeline: embedding, vector search, context assembly, LLM generation, and source citation
- Basic Chat UI (`chat-view.ts`) as an Obsidian `ItemView` sidebar with streaming Markdown rendering and clickable source references
- Status bar item showing indexing progress and total indexed note count
- Settings for API key, chat model, embedding model, top-k retrieval count, and embedding batch size

### Out of Scope (Phase 1)

- Content ingestion from any external source: URLs, PDFs, EPUBs, YouTube, Bilibili, GitHub Trending, Google News
- Whisper / audio transcription
- Anthropic (Claude) or Ollama LLM provider implementations
- Hybrid search (combining vector search with Obsidian full-text search)
- Query rewriting via a pre-processing LLM call
- Chat history persistence across plugin restarts
- Source Modal UI for adding external sources
- Scheduled / automated ingestion tasks
- Obsidian Canvas or non-Markdown file indexing (images, attachments)
- Mobile (iOS/Android) Obsidian support — desktop only for Phase 1

---

## Constraints

- **Runtime environment**: The plugin runs inside Obsidian's Electron renderer process. Node.js built-in modules are available, but browser-only APIs (e.g., `fetch` without polyfill) may require the `requestUrl` adapter from `obsidian` package.
- **Bundle size**: The final `main.js` bundle must load within Obsidian's plugin load timeout. LanceDB and the OpenAI SDK are the largest dependencies; tree-shaking via esbuild must be verified.
- **LanceDB compatibility**: LanceDB must be confirmed compatible with Obsidian's Electron version. Use the `@lancedb/lancedb` Node.js binding; verify native binary compatibility with the target Electron ABI.
- **No background processes**: Obsidian plugins cannot spawn persistent background processes. All async work (indexing, embedding, querying) must be managed within the plugin lifecycle using JavaScript async/await and event-driven patterns.
- **API costs**: All embedding and chat calls consume the user's own OpenAI API credits. Incremental indexing (skip unchanged files via hash) is required to avoid unnecessary re-embedding costs.
- **Data locality**: All plugin data (vectors, index manifest, settings) must be stored within the Obsidian vault or Obsidian's plugin data directory. No external databases or cloud sync.
- **TypeScript strict mode**: The project must compile with `"strict": true` in `tsconfig.json` with zero type errors.
- **Token counting**: For chunking purposes, an approximation of 1 token ≈ 4 characters is acceptable for Phase 1; exact tiktoken counting is not required but must not over-chunk by more than 20%.

---

## Open Questions

None — all key decisions have been made by the project owner. The above requirements are sufficient to begin implementation.

---

_Document written: 2026-04-07_
_Phase: MVP Phase 1 - RAG Core_
_Next phase: Phase 2 will add content ingestion (URL, PDF, YouTube, Bilibili)._
