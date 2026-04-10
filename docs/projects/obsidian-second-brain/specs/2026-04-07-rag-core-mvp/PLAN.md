# Implementation Plan: MVP Phase 1 — RAG Core

## Prerequisites

- Node.js 18+ installed
- Working directory: `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/`
- An Obsidian vault available for testing (any vault with a few `.md` files)
- An OpenAI API key for integration testing

---

## Steps

### Step 1: Project Scaffold — package.json, tsconfig.json, manifest.json

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/package.json` (create)
- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/tsconfig.json` (create)
- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/manifest.json` (create)
- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/.gitignore` (create)

**What to do**:

1. Create `package.json` with the following content:

   ```json
   {
     "name": "obsidian-kb",
     "version": "0.1.0",
     "description": "RAG-powered knowledge base chat for Obsidian",
     "main": "main.js",
     "scripts": {
       "dev": "node esbuild.config.mjs",
       "build": "node esbuild.config.mjs production"
     },
     "dependencies": {
       "@lancedb/lancedb": "^0.27.0",
       "apache-arrow": "^18.0.0",
       "openai": "^4.80.0"
     },
     "devDependencies": {
       "@types/node": "^20.0.0",
       "esbuild": "^0.24.0",
       "obsidian": "^1.7.0",
       "tslib": "^2.8.0",
       "typescript": "^5.5.0"
     }
   }
   ```

2. Create `tsconfig.json`:

   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "outDir": "./dist",
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": false,
       "sourceMap": false,
       "noEmit": true,
       "isolatedModules": true
     },
     "include": ["src/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

3. Create `manifest.json` (Obsidian plugin manifest):

   ```json
   {
     "id": "obsidian-kb",
     "name": "Obsidian KB",
     "version": "0.1.0",
     "minAppVersion": "1.4.0",
     "description": "RAG-powered knowledge base chat for your Obsidian vault",
     "author": "Brian",
     "isDesktopOnly": true
   }
   ```

4. Create `.gitignore`:

   ```
   node_modules/
   main.js
   dist/
   .DS_Store
   ```

5. Create the source directories:
   - `src/`
   - `src/core/`
   - `src/llm/`
   - `src/ui/`

**Do NOT**: Run `npm install` yet — that happens in Step 2.

**Verify**: All four files exist at the project root. `tsconfig.json` has `"strict": true`. `manifest.json` has `"minAppVersion": "1.4.0"` and `"version": "0.1.0"`. The three directories `src/core/`, `src/llm/`, `src/ui/` exist.

---

### Step 2: esbuild Config and Install Dependencies

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/esbuild.config.mjs` (create)

**What to do**:

1. Create `esbuild.config.mjs`:

   ```javascript
   import esbuild from 'esbuild';
   import process from 'process';

   const prod = process.argv[2] === 'production';

   const context = await esbuild.context({
     entryPoints: ['src/main.ts'],
     bundle: true,
     external: [
       'obsidian',
       'electron',
       '@codemirror/autocomplete',
       '@codemirror/collab',
       '@codemirror/commands',
       '@codemirror/language',
       '@codemirror/lint',
       '@codemirror/search',
       '@codemirror/state',
       '@codemirror/view',
       '@lezer/common',
       '@lezer/highlight',
       '@lezer/lr',
       '@lancedb/lancedb',
       'apache-arrow',
     ],
     format: 'cjs',
     target: 'es2022',
     logLevel: 'info',
     sourcemap: prod ? false : 'inline',
     treeShaking: true,
     outfile: 'main.js',
     minify: prod,
   });

   if (prod) {
     await context.rebuild();
     process.exit(0);
   } else {
     await context.watch();
   }
   ```

   Key points about `external`:
   - `obsidian` and `electron` are provided by the Obsidian host at runtime.
   - `@codemirror/*` and `@lezer/*` are standard Obsidian externals (provided by the host).
   - `@lancedb/lancedb` and `apache-arrow` are external because LanceDB has native bindings that cannot be bundled. They are loaded from `node_modules/` at runtime.
   - `openai` is intentionally NOT external — it gets bundled into `main.js`.

2. Run `npm install` in the project root.

**Do NOT**: Modify `package.json` or `tsconfig.json` (those were created in Step 1).

**Verify**: Run `npm install` completes without errors. `node_modules/` directory exists. Run `ls node_modules/@lancedb/lancedb` shows the package is installed. Run `ls node_modules/openai` shows the package is installed.

---

### Step 3: Shared Types

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/types.ts` (create)

**What to do**:

Create `src/types.ts` with ALL shared interfaces. Copy these exactly — every other module imports from this file:

```typescript
// ─── Plugin Settings ───

export interface PluginSettings {
  openaiApiKey: string;
  chatModel: string;
  embeddingModel: string;
  topK: number;
  embeddingBatchSize: number;
  chunkSize: number;
  chunkOverlap: number;
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

**Do NOT**: Add any implementation code to this file. It is types and the `DEFAULT_SETTINGS` constant only.

**Verify**: Run `npx tsc --noEmit` from the project root. It should produce zero errors (it may warn about no source files for `main.ts` yet — that is fine, but `types.ts` itself should have no errors). Confirm all interfaces listed above are present.

---

### Step 4: LLM Provider Interface

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/llm/provider.ts` (create)

**What to do**:

Create `src/llm/provider.ts` with the abstract LLM provider interface:

```typescript
import { Message, ChatOptions } from '../types';

export interface LLMProvider {
  readonly name: string;
  readonly maxTokens: number;

  /**
   * Stream chat completions. Yields one string per token/chunk.
   */
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>;

  /**
   * Generate embeddings for a batch of texts.
   * Returns one embedding vector per input text.
   */
  embed(texts: string[]): Promise<number[][]>;
}
```

**Do NOT**: Add any implementation here. This file is only the interface.

**Verify**: Run `npx tsc --noEmit`. Zero type errors.

---

### Step 5: OpenAI Provider Implementation

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/llm/openai.ts` (create)

**What to do**:

Create `src/llm/openai.ts` implementing the `LLMProvider` interface using the `openai` npm package.

```typescript
import OpenAI from 'openai';
import { Message, ChatOptions } from '../types';
import { LLMProvider } from './provider';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly maxTokens: number;
  private client: OpenAI;
  private chatModel: string;
  private embeddingModel: string;

  constructor(apiKey: string, chatModel: string, embeddingModel: string) {
    this.chatModel = chatModel;
    this.embeddingModel = embeddingModel;
    this.maxTokens = 128000; // GPT-4o context window
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Required: Obsidian runs in Electron renderer
    });
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    // implementation below
  }

  async embed(texts: string[]): Promise<number[][]> {
    // implementation below
  }
}
```

**`chat()` implementation details**:

- Call `this.client.chat.completions.create({ model: this.chatModel, messages, stream: true, temperature: options?.temperature ?? 0.3, max_tokens: options?.maxTokens ?? 1024 })`.
- Iterate over the stream: `for await (const chunk of stream)`.
- For each chunk, extract `chunk.choices[0]?.delta?.content`. If it is a non-empty string, `yield` it.
- Wrap the entire method body in a try/catch. On error:
  - If the error has a `status` property of `401`, throw `new Error("Invalid OpenAI API key. Please check your settings.")`.
  - If the error has a `status` property of `429`, throw `new Error("OpenAI rate limit exceeded. Please wait a moment and try again.")`.
  - Otherwise, throw `new Error("OpenAI API error: " + (error as Error).message)`.

**`embed()` implementation details**:

- Call `this.client.embeddings.create({ model: this.embeddingModel, input: texts })`.
- The response has a `data` array. Map over it: `response.data.map(item => item.embedding)`.
- Return the resulting `number[][]`.
- Wrap in try/catch with same error handling pattern as `chat()`.

**Do NOT**: Add retry logic or sub-batching for embed(). Keep it simple for MVP.

**Verify**: Run `npx tsc --noEmit`. Zero type errors. The file should import correctly from `../types` and `./provider`.

---

### Step 6: Chunker

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/core/chunker.ts` (create)

**What to do**:

Create `src/core/chunker.ts` — a pure function with no external dependencies.

**Exports**:

```typescript
import { Chunk, ChunkMetadata } from '../types';

/**
 * Estimate token count using the ~4 chars per token approximation.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split markdown content into overlapping chunks that respect heading boundaries.
 */
export function chunk(
  content: string,
  metadata: Omit<ChunkMetadata, 'chunkIndex'>,
  options?: { chunkSize?: number; chunkOverlap?: number },
): Chunk[] {
  // implementation below
}
```

**`chunk()` algorithm — implement exactly as described**:

1. `const chunkSize = options?.chunkSize ?? 500;`
   `const chunkOverlap = options?.chunkOverlap ?? 50;`

2. If `content.trim().length === 0`, return `[]`.

3. Define an array of separators in priority order:

   ```typescript
   const separators = ['\n## ', '\n### ', '\n\n', '\n', '. '];
   ```

4. Implement a recursive `splitText(text: string, sepIndex: number): string[]` function:
   - If `estimateTokens(text) <= chunkSize`, return `[text]`.
   - If `sepIndex >= separators.length`, return `[text]` (cannot split further — just return as-is even if over size).
   - Split `text` by `separators[sepIndex]`. For each resulting part, if it exceeds `chunkSize`, recursively call `splitText(part, sepIndex + 1)`. Otherwise keep the part as-is.
   - Important: when splitting by a separator, **prepend the separator back** onto each part (except the first) so that heading markers are preserved in the chunk text. For example, splitting `"intro\n## Section"` by `"\n## "` produces `["intro", "## Section"]` (note the `## ` is kept).

5. After splitting, **merge** adjacent small sections:
   - Walk through the sections. Accumulate sections into a current buffer. When adding the next section would exceed `chunkSize` tokens, finalize the current buffer as a chunk and start a new buffer with the current section.
   - Do not leave any section behind — the last buffer becomes the last chunk.

6. Apply **overlap**: for each chunk after the first, prepend the last `chunkOverlap` tokens (measured in characters: `chunkOverlap * 4` characters) from the end of the previous chunk's text.

7. Build the final `Chunk[]` array. For each chunk text at index `i`:
   ```typescript
   {
     text: chunkText,
     metadata: { ...metadata, chunkIndex: i },
     tokenCount: estimateTokens(chunkText),
   }
   ```

**Do NOT**: Import any external packages. This is a pure function. Do not use `tiktoken` or any tokenizer library.

**Verify**: Run `npx tsc --noEmit`. Zero errors. Mentally trace through: a 1200-token document with no headings should produce at least 3 chunks (each ~500 tokens with 50-token overlaps). A document with 3 headings of 200 tokens each should produce 3 chunks aligned to headings. An empty string should return `[]`.

---

### Step 7: Vector Store

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/core/vector-store.ts` (create)

**What to do**:

Create `src/core/vector-store.ts` wrapping LanceDB.

```typescript
import * as lancedb from '@lancedb/lancedb';
import type { Table } from '@lancedb/lancedb';
import * as fs from 'fs';
import * as path from 'path';
import { VectorChunk } from '../types';

export class VectorStore {
  private dbPath: string;
  private db: lancedb.Connection | null = null;
  private table: Table | null = null;
  private tableReady = false;

  constructor(vaultPath: string) {
    this.dbPath = path.join(vaultPath, '.obsidian-kb', 'vectors');
  }

  async initialize(): Promise<void> {
    /* ... */
  }
  async upsert(chunks: VectorChunk[]): Promise<void> {
    /* ... */
  }
  async query(embedding: number[], topK: number): Promise<VectorChunk[]> {
    /* ... */
  }
  async delete(filePath: string): Promise<void> {
    /* ... */
  }
  async isEmpty(): Promise<boolean> {
    /* ... */
  }
}
```

**`initialize()` implementation**:

- Create the data directory if it does not exist: `fs.mkdirSync(this.dbPath, { recursive: true })`.
- Connect to the database: `this.db = await lancedb.connect(this.dbPath)`.
- Try to open the existing table: `this.table = await this.db.openTable("chunks")`. If this throws (table does not exist), set `this.tableReady = false` and continue (do NOT throw).
- If the table opens successfully, set `this.tableReady = true`.

**`upsert()` implementation**:

- If `chunks.length === 0`, return immediately.
- Build the data array: map each `VectorChunk` to a plain object `{ id, text, filePath, fileTitle, chunkIndex, vector }`.
- Collect unique file paths from the incoming chunks.
- If `this.tableReady` is false (table does not exist yet):
  - Create the table: `this.table = await this.db\!.createTable("chunks", data)`.
  - Set `this.tableReady = true`.
  - Return (no need to delete — table is brand new).
- If `this.tableReady` is true:
  - Delete existing rows for those file paths: for each unique filePath, `await this.table\!.delete('filePath = "' + filePath.replace(/"/g, '\\"') + '"')`.
  - Add new data: `await this.table\!.add(data)`.

**`query()` implementation**:

- If `\!this.tableReady`, return `[]`.
- Execute search: `const results = await this.table\!.search(embedding).limit(topK).toArray()`.
- Map each result row to a `VectorChunk` object: `{ id: row.id, text: row.text, filePath: row.filePath, fileTitle: row.fileTitle, chunkIndex: row.chunkIndex, vector: Array.from(row.vector) }`.
- Return the mapped array.

**`delete()` implementation**:

- If `\!this.tableReady`, return.
- `await this.table\!.delete('filePath = "' + filePath.replace(/"/g, '\\"') + '"')`.

**`isEmpty()` implementation**:

- If `\!this.tableReady`, return `true`.
- `const count = await this.table\!.countRows()`.
- Return `count === 0`.

**Do NOT**: Add any caching, connection pooling, or schema migration logic. Keep it minimal for MVP.

**Verify**: Run `npx tsc --noEmit`. Zero type errors. The LanceDB import types must resolve correctly (they are in `node_modules/@lancedb/lancedb`). Note: you may need to check the actual LanceDB API — if `Table` is not exported as a type from `@lancedb/lancedb`, use `Awaited<ReturnType<lancedb.Connection["openTable"]>>` or similar. Adjust the import as needed to satisfy the type checker.

---

### Step 8: Vault Indexer

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/core/vault-indexer.ts` (create)

**What to do**:

Create `src/core/vault-indexer.ts`.

```typescript
import { Vault, TFile, EventRef } from 'obsidian';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PluginSettings, FileHashManifest, VectorChunk } from '../types';
import { chunk as chunkText } from './chunker';
import { VectorStore } from './vector-store';
import { LLMProvider } from '../llm/provider';

export class VaultIndexer {
  private vault: Vault;
  private vectorStore: VectorStore;
  private llmProvider: LLMProvider;
  private settings: PluginSettings;
  private statusBarEl: HTMLElement;
  private manifest: FileHashManifest = {};
  private manifestPath: string;
  private eventRefs: EventRef[] = [];
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    vault: Vault,
    vectorStore: VectorStore,
    llmProvider: LLMProvider,
    settings: PluginSettings,
    statusBarEl: HTMLElement,
  ) {
    this.vault = vault;
    this.vectorStore = vectorStore;
    this.llmProvider = llmProvider;
    this.settings = settings;
    this.statusBarEl = statusBarEl;
    // Vault path: use the vault adapter's basePath
    const vaultPath = (this.vault.adapter as any).basePath as string;
    this.manifestPath = path.join(vaultPath, '.obsidian-kb', 'manifest.json');
  }

  async initialIndex(): Promise<void> {
    /* ... */
  }
  watchForChanges(): void {
    /* ... */
  }
  async destroy(): Promise<void> {
    /* ... */
  }

  // Private helpers
  private loadManifest(): void {
    /* ... */
  }
  private saveManifest(): void {
    /* ... */
  }
  private hashContent(content: string): string {
    /* ... */
  }
  private shouldIndex(file: TFile): boolean {
    /* ... */
  }
  private async indexFile(file: TFile): Promise<void> {
    /* ... */
  }
}
```

**`loadManifest()`**: Read `this.manifestPath` using `fs.readFileSync`. If file does not exist, set `this.manifest = {}`. Parse JSON into `this.manifest`.

**`saveManifest()`**: Ensure the parent directory exists (`fs.mkdirSync(path.dirname(this.manifestPath), { recursive: true })`). Write `JSON.stringify(this.manifest, null, 2)` to `this.manifestPath` using `fs.writeFileSync`.

**`hashContent(content: string)`**: Return `crypto.createHash("md5").update(content).digest("hex")`.

**`shouldIndex(file: TFile)`**: Return `true` if:

- `file.extension === "md"`
- `file.path` does NOT start with `.obsidian/`
- `file.path` does NOT start with `.obsidian-kb/`

**`initialIndex()` implementation**:

1. Call `this.loadManifest()`.
2. Get all markdown files: `const files = this.vault.getMarkdownFiles()`.
3. Filter with `this.shouldIndex(file)`.
4. For each file, read content via `await this.vault.cachedRead(file)`, compute hash. Collect files whose hash differs from `this.manifest[file.path]`.
5. Track total changed files count for progress.
6. Process changed files in batches of `this.settings.embeddingBatchSize`:
   - For each file in the batch:
     a. Read content: `const content = await this.vault.cachedRead(file)`.
     b. Chunk: `const chunks = chunkText(content, { filePath: file.path, fileTitle: file.basename }, { chunkSize: this.settings.chunkSize, chunkOverlap: this.settings.chunkOverlap })`.
     c. Collect all chunk texts from this batch.
   - Call `this.llmProvider.embed(allChunkTexts)` for the entire batch's chunks at once.
   - Build `VectorChunk[]` from chunks + embeddings: for each chunk at index `i`, create `{ id: chunk.metadata.filePath + "::" + chunk.metadata.chunkIndex, text: chunk.text, filePath: chunk.metadata.filePath, fileTitle: chunk.metadata.fileTitle, chunkIndex: chunk.metadata.chunkIndex, vector: embeddings[i] }`.
   - Call `await this.vectorStore.upsert(vectorChunks)`.
   - Update manifest for each file in the batch: `this.manifest[file.path] = hash`.
   - Update status bar: `this.statusBarEl.setText("Indexing: " + processedCount + " / " + totalCount + " notes")`.
   - Wait 200ms: `await new Promise(r => setTimeout(r, 200))`.
7. Detect deleted files: files in manifest whose path is NOT in the current vault files list. For each: `await this.vectorStore.delete(filePath)`, `delete this.manifest[filePath]`.
8. Call `this.saveManifest()`.
9. Update status bar: `this.statusBarEl.setText("KB: " + Object.keys(this.manifest).length + " notes indexed")`.

**`watchForChanges()` implementation**:

- Register three event listeners on `this.vault`:
  - `vault.on("modify", (file) => { ... })` — if `file instanceof TFile && this.shouldIndex(file)`, debounce by 2 seconds per `file.path`, then call `this.indexFile(file)`.
  - `vault.on("create", (file) => { ... })` — same as modify.
  - `vault.on("delete", (file) => { ... })` — if `file instanceof TFile && this.shouldIndex(file)`, immediately call `this.vectorStore.delete(file.path)`, remove from manifest, save manifest, update status bar count.
- Store each `EventRef` returned by `vault.on()` in `this.eventRefs`.

**Debounce logic**: When a modify/create event fires:

```typescript
const existing = this.debounceTimers.get(file.path);
if (existing) clearTimeout(existing);
const timer = setTimeout(() => {
  this.debounceTimers.delete(file.path);
  this.indexFile(file);
}, 2000);
this.debounceTimers.set(file.path, timer);
```

**`indexFile(file: TFile)` implementation**:

- Read content, compute hash. If hash matches manifest, skip.
- Chunk the content.
- If no chunks (empty file), delete from vector store and manifest, return.
- Embed all chunk texts: `const embeddings = await this.llmProvider.embed(chunkTexts)`.
- Build `VectorChunk[]` and upsert.
- Update manifest entry, save manifest.
- Update status bar with current count.
- Wrap in try/catch: on error, `console.error("KB: Failed to index " + file.path, err)`. Do NOT throw — a single file failure should not crash the indexer.

**`destroy()` implementation**:

- Clear all debounce timers: `this.debounceTimers.forEach(t => clearTimeout(t)); this.debounceTimers.clear()`.
- Unregister event refs: `this.eventRefs.forEach(ref => this.vault.offref(ref))`.

**Do NOT**: Add a progress modal or any UI besides the status bar text. Do NOT add file-watching for non-`.md` files.

**Verify**: Run `npx tsc --noEmit`. Zero type errors. Confirm: `initialIndex` reads files, chunks, embeds in batches, and saves manifest. `watchForChanges` registers three event listeners with debouncing. `shouldIndex` excludes `.obsidian/` and `.obsidian-kb/` paths.

---

### Step 9: RAG Engine

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/core/rag-engine.ts` (create)

**What to do**:

Create `src/core/rag-engine.ts`.

```typescript
import { PluginSettings, RagResponse, SourceReference, Message } from '../types';
import { VectorStore } from './vector-store';
import { LLMProvider } from '../llm/provider';

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the user's personal notes.
You MUST only use the provided context to answer. Do not use external knowledge.
When citing information, reference the source note title in square brackets, e.g., [Note Title].
If the provided context does not contain enough information to answer the question,
say "I don't have enough information in your notes to answer this question."`;

export class RagEngine {
  private vectorStore: VectorStore;
  private llmProvider: LLMProvider;
  private settings: PluginSettings;

  constructor(vectorStore: VectorStore, llmProvider: LLMProvider, settings: PluginSettings) {
    this.vectorStore = vectorStore;
    this.llmProvider = llmProvider;
    this.settings = settings;
  }

  async *query(userQuestion: string): AsyncGenerator<RagResponse> {
    // implementation below
  }
}
```

**`query()` implementation**:

1. **Validate**: If `userQuestion.trim().length === 0`, throw `new Error("Please enter a question.")`.

2. **Check index**: If `await this.vectorStore.isEmpty()`, yield `{ type: "error", message: "No notes have been indexed yet. Please wait for indexing to complete." } as RagResponse` and return.

3. **Embed question**: `const [questionEmbedding] = await this.llmProvider.embed([userQuestion])`.

4. **Vector search**: `const results = await this.vectorStore.query(questionEmbedding, this.settings.topK)`.

5. **Assemble context**: Build a string from the results:

   ```typescript
   const context = results
     .map((r) => `[Source: ${r.fileTitle} (${r.filePath})]\n${r.text}`)
     .join('\n\n');
   ```

6. **Build messages**:

   ```typescript
   const messages: Message[] = [
     { role: 'system', content: SYSTEM_PROMPT },
     { role: 'user', content: `Context:\n${context}\n\nQuestion: ${userQuestion}` },
   ];
   ```

7. **Stream LLM response**: Wrap in try/catch.

   ```typescript
   try {
     for await (const token of this.llmProvider.chat(messages)) {
       yield { type: "token", token } as RagResponse;
     }
   } catch (err) {
     yield { type: "error", message: (err as Error).message } as RagResponse;
     return;
   }
   ```

8. **Emit sources**: After the stream completes, deduplicate results by `filePath`:
   ```typescript
   const seen = new Set<string>();
   const sources: SourceReference[] = [];
   for (const r of results) {
     if (\!seen.has(r.filePath)) {
       seen.add(r.filePath);
       sources.push({
         filePath: r.filePath,
         fileTitle: r.fileTitle,
         chunkText: r.text.substring(0, 200),
       });
     }
   }
   yield { type: "sources", sources } as RagResponse;
   ```

**Do NOT**: Add conversation history / multi-turn context. Phase 1 is single-turn only. Do NOT add query rewriting.

**Verify**: Run `npx tsc --noEmit`. Zero type errors. Trace the pipeline: empty question throws, empty index yields error, otherwise embeds -> searches -> assembles context -> streams LLM -> emits sources.

---

### Step 10: Settings Tab

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/settings.ts` (create)

**What to do**:

Create `src/settings.ts`. This file depends on `main.ts` for the plugin type, but to avoid circular imports, use a forward reference pattern.

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';
import type ObsidianKBPlugin from './main';

export class KBSettingTab extends PluginSettingTab {
  plugin: ObsidianKBPlugin;

  constructor(app: App, plugin: ObsidianKBPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Obsidian KB Settings' });

    // 1. OpenAI API Key — password input
    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Your OpenAI API key for embeddings and chat.')
      .addText((text) =>
        text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value;
            await this.plugin.saveSettings();
          })
          // Make it a password field
          .then((text) => {
            text.inputEl.type = 'password';
          }),
      );

    // 2. Chat Model — dropdown
    new Setting(containerEl)
      .setName('Chat Model')
      .setDesc('OpenAI model for chat completions.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('gpt-4o', 'gpt-4o')
          .addOption('gpt-4o-mini', 'gpt-4o-mini')
          .setValue(this.plugin.settings.chatModel)
          .onChange(async (value) => {
            this.plugin.settings.chatModel = value;
            await this.plugin.saveSettings();
          }),
      );

    // 3. Embedding Model — dropdown
    new Setting(containerEl)
      .setName('Embedding Model')
      .setDesc('OpenAI model for generating embeddings.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('text-embedding-3-small', 'text-embedding-3-small')
          .addOption('text-embedding-3-large', 'text-embedding-3-large')
          .setValue(this.plugin.settings.embeddingModel)
          .onChange(async (value) => {
            this.plugin.settings.embeddingModel = value;
            await this.plugin.saveSettings();
          }),
      );

    // 4. Top-K results — slider
    new Setting(containerEl)
      .setName('Top-K Results')
      .setDesc('Number of chunks to retrieve per query (1-20).')
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.plugin.settings.topK)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.topK = value;
            await this.plugin.saveSettings();
          }),
      );

    // 5. Embedding Batch Size — slider
    new Setting(containerEl)
      .setName('Embedding Batch Size')
      .setDesc('Number of files per embedding batch during indexing (5-50).')
      .addSlider((slider) =>
        slider
          .setLimits(5, 50, 5)
          .setValue(this.plugin.settings.embeddingBatchSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.embeddingBatchSize = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
```

**Important**: The `import type ObsidianKBPlugin from "./main"` uses `import type` to avoid circular dependency issues at runtime. This only imports the type, not the value.

**Do NOT**: Add a "Test API Key" button or any validation logic in settings. Keep it simple.

**Verify**: Run `npx tsc --noEmit`. Zero type errors (this depends on `main.ts` existing — if `main.ts` does not exist yet, you may get an import error. That is OK; it will resolve after Step 12). Confirm all 5 settings fields are present: API key (password), chat model (dropdown), embedding model (dropdown), top-K (slider), batch size (slider).

---

### Step 11: Chat UI — View

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/ui/chat-view.ts` (create)

**What to do**:

Create `src/ui/chat-view.ts`.

```typescript
import { ItemView, WorkspaceLeaf, MarkdownRenderer, App } from 'obsidian';
import { RagEngine } from '../core/rag-engine';
import { SourceReference } from '../types';

export const CHAT_VIEW_TYPE = 'obsidian-kb-chat';

export class ChatView extends ItemView {
  private ragEngine: RagEngine;
  private messagesEl: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private isStreaming = false;
  private fullResponseText = '';
  private renderThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(leaf: WorkspaceLeaf, ragEngine: RagEngine) {
    super(leaf);
    this.ragEngine = ragEngine;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }
  getDisplayText(): string {
    return 'KB Chat';
  }
  getIcon(): string {
    return 'message-square';
  }

  async onOpen(): Promise<void> {
    /* build DOM */
  }
  async onClose(): Promise<void> {
    /* cleanup */
  }

  private async handleSubmit(question: string): Promise<void> {
    /* ... */
  }
  private addUserMessage(text: string): void {
    /* ... */
  }
  private addAssistantMessage(): HTMLElement {
    /* returns the bubble element */
  }
  private appendToken(bubbleEl: HTMLElement, token: string): void {
    /* ... */
  }
  private renderMarkdown(bubbleEl: HTMLElement): void {
    /* ... */
  }
  private renderSources(bubbleEl: HTMLElement, sources: SourceReference[]): void {
    /* ... */
  }
  private renderError(bubbleEl: HTMLElement, message: string): void {
    /* ... */
  }
  private setInputEnabled(enabled: boolean): void {
    /* ... */
  }
  private scrollToBottom(): void {
    /* ... */
  }
}
```

**`onOpen()` implementation — build the DOM**:

```typescript
const container = this.contentEl;
container.empty();
container.addClass("kb-chat-container");

// Messages area
this.messagesEl = container.createDiv({ cls: "kb-chat-messages" });

// Input area
const inputArea = container.createDiv({ cls: "kb-chat-input-area" });
this.inputEl = inputArea.createEl("textarea", {
  cls: "kb-chat-input",
  attr: { placeholder: "Ask about your notes...", rows: "3" },
});
this.sendBtn = inputArea.createEl("button", {
  cls: "kb-chat-send",
  text: "Send",
});

// Event: Enter to send, Shift+Enter for newline
this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter" && \!e.shiftKey) {
    e.preventDefault();
    this.handleSubmit(this.inputEl.value);
  }
});

// Event: click send button
this.sendBtn.addEventListener("click", () => {
  this.handleSubmit(this.inputEl.value);
});
```

**`onClose()` implementation**:

```typescript
if (this.renderThrottleTimer) clearTimeout(this.renderThrottleTimer);
```

**`handleSubmit(question)` implementation**:

1. Trim the question. If empty, return.
2. Clear the input field.
3. Call `this.setInputEnabled(false)`.
4. Call `this.addUserMessage(question)`.
5. Create assistant bubble: `const bubbleEl = this.addAssistantMessage()`.
6. Reset: `this.fullResponseText = ""`.
7. Try/catch block:
   - `for await (const response of this.ragEngine.query(question))`:
     - If `response.type === "token"`: call `this.appendToken(bubbleEl, response.token)`.
     - If `response.type === "sources"`: call `this.renderSources(bubbleEl, response.sources)`.
     - If `response.type === "error"`: call `this.renderError(bubbleEl, response.message)`.
   - In catch: `this.renderError(bubbleEl, (err as Error).message)`.
   - In finally: `this.setInputEnabled(true)`. Also do a final markdown render to make sure the complete text is rendered.

**`addUserMessage(text)`**:

- Create a div with class `kb-chat-message kb-chat-user`: `this.messagesEl.createDiv({ cls: "kb-chat-message kb-chat-user" })`.
- Set its `textContent` to `text`.
- Call `this.scrollToBottom()`.

**`addAssistantMessage()`**:

- Create a div with class `kb-chat-message kb-chat-assistant`.
- Inside it, create a div with class `kb-chat-bubble`.
- Inside the bubble, create a span with class `kb-chat-loader` and text `"..."` (this is the loading indicator).
- Call `this.scrollToBottom()`.
- Return the bubble div (NOT the message div).

**`appendToken(bubbleEl, token)`**:

- Remove the loader element if it still exists: `bubbleEl.querySelector(".kb-chat-loader")?.remove()`.
- Accumulate: `this.fullResponseText += token`.
- Throttled Markdown re-render: if `this.renderThrottleTimer` is null, set it:
  ```typescript
  this.renderThrottleTimer = setTimeout(() => {
    this.renderThrottleTimer = null;
    this.renderMarkdown(bubbleEl);
  }, 100);
  ```

**`renderMarkdown(bubbleEl)`**:

- Clear the bubble (but keep sources if they exist — so only clear elements that are NOT `.kb-chat-sources`): `const sourcesEl = bubbleEl.querySelector(".kb-chat-sources"); bubbleEl.empty(); if (sourcesEl) bubbleEl.appendChild(sourcesEl);`
- Actually, simpler approach: use a dedicated content div inside the bubble. On `addAssistantMessage`, create a content div with class `kb-chat-content` inside the bubble. Then `renderMarkdown` only clears and re-renders within the content div.
- Revised: `addAssistantMessage` creates:
  ```
  <div class="kb-chat-message kb-chat-assistant">
    <div class="kb-chat-bubble">
      <div class="kb-chat-content"><span class="kb-chat-loader">...</span></div>
    </div>
  </div>
  ```
  And returns the `.kb-chat-bubble` element. `appendToken` removes the loader from `.kb-chat-content`, and `renderMarkdown` clears `.kb-chat-content` and re-renders into it.
- Use Obsidian's `MarkdownRenderer.render(this.app, this.fullResponseText, contentEl, "", this)` to render the accumulated markdown.

**`renderSources(bubbleEl, sources)`**:

- Create a div with class `kb-chat-sources` inside `bubbleEl`.
- Add a label: `sourcesEl.createEl("div", { cls: "kb-chat-sources-label", text: "Sources:" })`.
- For each source:
  ```typescript
  const link = sourcesEl.createEl('a', {
    cls: 'kb-chat-source-link',
    text: source.fileTitle,
  });
  link.addEventListener('click', (e) => {
    e.preventDefault();
    this.app.workspace.openLinkText(source.filePath, '');
  });
  ```

**`renderError(bubbleEl, message)`**:

- Remove loader if present.
- Get or create the content div.
- Create an error div: `contentEl.createDiv({ cls: "kb-chat-error", text: message })`.

**`setInputEnabled(enabled)`**:

- `this.inputEl.disabled = \!enabled`.
- `this.sendBtn.disabled = \!enabled`.
- `this.isStreaming = \!enabled`.
- If enabled, focus the input: `this.inputEl.focus()`.

**`scrollToBottom()`**:

- `this.messagesEl.scrollTop = this.messagesEl.scrollHeight`.

**Do NOT**: Persist chat history to disk. Do NOT add conversation context (multi-turn). The `ragEngine.query()` call is single-turn.

**Verify**: Run `npx tsc --noEmit`. Zero type errors. Confirm: the view type is `"obsidian-kb-chat"`, Enter sends, Shift+Enter does not, streaming tokens are rendered as Markdown via throttled re-rendering, sources are clickable links, errors show in a styled element.

---

### Step 12: Chat UI — Styles

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/styles.css` (create)

**What to do**:

Create `styles.css` at the project root (Obsidian automatically loads `styles.css` from the plugin directory).

```css
/* ─── Chat Container ─── */
.kb-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

/* ─── Messages Area ─── */
.kb-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ─── Message Bubbles ─── */
.kb-chat-message {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 8px;
  line-height: 1.5;
  word-wrap: break-word;
}

.kb-chat-user {
  align-self: flex-end;
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
}

.kb-chat-assistant {
  align-self: flex-start;
  background-color: var(--background-secondary);
}

.kb-chat-bubble {
  width: 100%;
}

.kb-chat-content {
  width: 100%;
}

/* Make markdown content inside chat look nice */
.kb-chat-content p {
  margin: 0.3em 0;
}

.kb-chat-content p:first-child {
  margin-top: 0;
}

.kb-chat-content p:last-child {
  margin-bottom: 0;
}

/* ─── Loading Indicator ─── */
.kb-chat-loader {
  display: inline-block;
  animation: kb-pulse 1.2s ease-in-out infinite;
}

@keyframes kb-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

/* ─── Error Messages ─── */
.kb-chat-error {
  color: var(--text-error);
  background-color: var(--background-modifier-error);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 4px;
}

/* ─── Sources ─── */
.kb-chat-sources {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--background-modifier-border);
  font-size: 0.85em;
}

.kb-chat-sources-label {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-muted);
}

.kb-chat-source-link {
  display: block;
  color: var(--text-accent);
  cursor: pointer;
  padding: 2px 0;
}

.kb-chat-source-link:hover {
  text-decoration: underline;
}

/* ─── Input Area ─── */
.kb-chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--background-modifier-border);
}

.kb-chat-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  padding: 8px;
  background-color: var(--background-primary);
  color: var(--text-normal);
  font-family: inherit;
  font-size: inherit;
}

.kb-chat-input:focus {
  border-color: var(--interactive-accent);
  outline: none;
}

.kb-chat-send {
  padding: 8px 16px;
  border-radius: 4px;
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  cursor: pointer;
  font-weight: 600;
  align-self: flex-end;
}

.kb-chat-send:hover {
  opacity: 0.9;
}

.kb-chat-send:disabled,
.kb-chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Do NOT**: Use any hard-coded colors. Always use Obsidian CSS variables (`var(--...)`) so the plugin respects light and dark themes.

**Verify**: The file exists at the project root as `styles.css`. All class names match those used in `chat-view.ts`. No hard-coded hex colors — only CSS variables.

---

### Step 13: Plugin Main Entry — Wire Everything Together

**Files**:

- `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/src/main.ts` (create)

**What to do**:

Create `src/main.ts` — the composition root that wires all modules together.

```typescript
import { Plugin, WorkspaceLeaf } from "obsidian";
import { PluginSettings, DEFAULT_SETTINGS } from "./types";
import { OpenAIProvider } from "./llm/openai";
import { VectorStore } from "./core/vector-store";
import { VaultIndexer } from "./core/vault-indexer";
import { RagEngine } from "./core/rag-engine";
import { ChatView, CHAT_VIEW_TYPE } from "./ui/chat-view";
import { KBSettingTab } from "./settings";

export default class ObsidianKBPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private vectorStore\!: VectorStore;
  private vaultIndexer\!: VaultIndexer;
  private ragEngine\!: RagEngine;

  async onload(): Promise<void> {
    // 1. Load settings
    await this.loadSettings();

    // 2. Get vault base path
    const vaultPath = (this.app.vault.adapter as any).basePath as string;

    // 3. Instantiate LLM Provider
    const llmProvider = new OpenAIProvider(
      this.settings.openaiApiKey,
      this.settings.chatModel,
      this.settings.embeddingModel,
    );

    // 4. Instantiate Vector Store and initialize
    this.vectorStore = new VectorStore(vaultPath);
    await this.vectorStore.initialize();

    // 5. Instantiate status bar item
    const statusBarEl = this.addStatusBarItem();
    statusBarEl.setText("KB: Initializing...");

    // 6. Instantiate Vault Indexer
    this.vaultIndexer = new VaultIndexer(
      this.app.vault,
      this.vectorStore,
      llmProvider,
      this.settings,
      statusBarEl,
    );

    // 7. Instantiate RAG Engine
    this.ragEngine = new RagEngine(
      this.vectorStore,
      llmProvider,
      this.settings,
    );

    // 8. Register the Chat View
    this.registerView(CHAT_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
      return new ChatView(leaf, this.ragEngine);
    });

    // 9. Register ribbon icon to open chat
    this.addRibbonIcon("message-square", "Open KB Chat", () => {
      this.activateChatView();
    });

    // 10. Register command to open chat
    this.addCommand({
      id: "open-kb-chat",
      name: "Open KB Chat",
      callback: () => {
        this.activateChatView();
      },
    });

    // 11. Register settings tab
    this.addSettingTab(new KBSettingTab(this.app, this));

    // 12. IMPORTANT: Wait for layout ready before indexing
    //     This prevents vault create events from firing during
    //     Obsidian's initial file loading.
    this.app.workspace.onLayoutReady(async () => {
      if (this.settings.openaiApiKey) {
        await this.vaultIndexer.initialIndex();
        this.vaultIndexer.watchForChanges();
      } else {
        statusBarEl.setText("KB: Set API key in settings");
      }
    });
  }

  async onunload(): Promise<void> {
    await this.vaultIndexer?.destroy();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async activateChatView(): Promise<void> {
    const { workspace } = this.app;

    // Check if view is already open
    let leaf = workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];

    if (\!leaf) {
      // Open in right sidebar
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: CHAT_VIEW_TYPE,
          active: true,
        });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
```

**Key points**:

- The `onLayoutReady()` wrapper around indexing is CRITICAL. Without it, Obsidian fires `create` events for every file during initial load, which would trigger redundant re-indexing.
- If no API key is set, indexing is skipped and the status bar shows a message prompting the user to configure it.
- The `activateChatView()` method checks if the view is already open before creating a new leaf.
- Module instantiation order: settings -> llmProvider -> vectorStore -> vaultIndexer -> ragEngine -> chatView registration.

**Do NOT**: Add any logic to re-create the LLM provider when settings change (that is a Phase 2 enhancement). For Phase 1, the user must reload the plugin after changing the API key or model settings.

**Verify**: Run `npx tsc --noEmit`. Zero type errors. Confirm: `onload` creates all modules in the correct dependency order, registers the view, ribbon icon, command, and settings tab. `onLayoutReady` wraps the indexing. `onunload` calls `vaultIndexer.destroy()`.

---

### Step 14: Build and Verify

**Files**: None created. This is a verification step.

**What to do**:

1. Run `npm run build` from the project root. This executes `node esbuild.config.mjs production`.
2. Confirm the build succeeds and produces `main.js` at the project root.
3. Check `main.js` file size — it should be under 500KB (the OpenAI SDK tree-shakes to ~200KB, plus our code).
4. Run `npx tsc --noEmit` to confirm zero type errors.
5. Verify these files exist at the project root (required by Obsidian to load the plugin):
   - `main.js`
   - `manifest.json`
   - `styles.css`

**Manual smoke test** (if an Obsidian vault is available):

1. Copy the entire project directory (or symlink it) into `{vault}/.obsidian/plugins/obsidian-kb/`.
2. Make sure `node_modules/` is present in the plugin directory (run `npm install` if needed).
3. Open Obsidian, go to Settings > Community Plugins > enable "Obsidian KB".
4. Confirm: no red error notices on startup.
5. Confirm: "Obsidian KB" appears in the settings tab list.
6. Confirm: a chat icon appears in the left ribbon.
7. Enter an OpenAI API key in settings.
8. Reload the plugin (disable then re-enable).
9. Confirm: status bar shows "Indexing: X / Y notes" then "KB: X notes indexed".
10. Click the ribbon icon. Confirm: the chat sidebar opens.
11. Type a question about your notes. Confirm: tokens stream in, markdown renders, sources appear as clickable links.

**Verify**: `npm run build` exits with code 0. `main.js` exists and is under 500KB. `npx tsc --noEmit` exits with zero errors.

---

## Summary of Steps

| Step | Title                        | Files Created                                                               |
| ---- | ---------------------------- | --------------------------------------------------------------------------- |
| 1    | Project scaffold             | `package.json`, `tsconfig.json`, `manifest.json`, `.gitignore`, `src/` dirs |
| 2    | esbuild config + npm install | `esbuild.config.mjs`                                                        |
| 3    | Shared types                 | `src/types.ts`                                                              |
| 4    | LLM Provider interface       | `src/llm/provider.ts`                                                       |
| 5    | OpenAI implementation        | `src/llm/openai.ts`                                                         |
| 6    | Chunker                      | `src/core/chunker.ts`                                                       |
| 7    | Vector Store                 | `src/core/vector-store.ts`                                                  |
| 8    | Vault Indexer                | `src/core/vault-indexer.ts`                                                 |
| 9    | RAG Engine                   | `src/core/rag-engine.ts`                                                    |
| 10   | Settings tab                 | `src/settings.ts`                                                           |
| 11   | Chat UI view                 | `src/ui/chat-view.ts`                                                       |
| 12   | Chat UI styles               | `styles.css`                                                                |
| 13   | Plugin main entry            | `src/main.ts`                                                               |
| 14   | Build and verify             | (no new files)                                                              |

**Total**: 14 steps, 15 files created (10 TypeScript source files + 4 config files + 1 CSS file).

**Estimated groupings**:

- Infrastructure (Steps 1-3): ~10 min
- Core modules (Steps 4-9): ~25 min
- UI layer (Steps 10-12): ~10 min
- Integration + verification (Steps 13-14): ~10 min

---

_Document written: 2026-04-07_
_Phase: MVP Phase 1 — RAG Core_
_Author: Architect Agent_
