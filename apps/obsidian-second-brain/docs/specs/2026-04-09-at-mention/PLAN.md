# Implementation Plan: @ File Mention + Chat History Persistence

## Prerequisites
- Read and understand DESIGN.md in this same directory
- The project builds with `npm run build` from the project root
- All file paths below are relative to `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/`

---

## Step 1: Update types.ts -- Add ChatMessage and PluginData

**Files**: `src/types.ts`

**Action**: Add two new interfaces at the bottom of the file, after the existing `FileHashManifest` interface.

**Signatures**:
```typescript
export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources: SourceReference[];
  timestamp: string; // ISO-8601
}

export interface PluginData {
  settings: PluginSettings;
  chatHistory: ChatMessage[];
}
```

**Details**:
- Add these after the `FileHashManifest` interface block, under a new section comment `// ─── Chat History ───`
- `ChatMessage.sources` reuses the existing `SourceReference` interface already in this file
- `PluginData` wraps the existing `PluginSettings` to create a top-level storage envelope

**Do NOT**:
- Modify any existing interfaces
- Change `DEFAULT_SETTINGS` or any other existing exports
- Add any imports (all referenced types are already in this file)

**Verify**: `npm run build` succeeds. `grep "ChatMessage" src/types.ts` shows the new interface.

---

## Step 2: Update rag-engine.ts -- Add forcedFiles parameter and vault access

**Files**: `src/core/rag-engine.ts`

**Action**: Modify the RagEngine class to accept a Vault reference and support `forcedFiles` in `query()`.

**2a. Add Vault import and constructor parameter**:

At the top of the file, change the import to also import `Vault` from `obsidian`:
```typescript
import { Vault } from "obsidian";
```

Add `private vault: Vault` as the FIRST parameter of the constructor (before `vectorStore`). Store it as `this.vault = vault;`.

New constructor signature:
```typescript
constructor(
  vault: Vault,
  vectorStore: VectorStore,
  llmProvider: LLMProvider,
  embeddingProvider: EmbeddingProvider,
  settings: PluginSettings,
)
```

**2b. Add forcedFiles to query()**:

Change the `query` method signature to:
```typescript
async *query(userQuestion: string, forcedFiles?: string[]): AsyncGenerator<RagResponse>
```

After the `isEmpty()` check and before the embedding call (line ~44 area), add forced file reading logic:

```typescript
// --- Read forced files ---
let forcedContext = "";
const forcedSources: SourceReference[] = [];

if (forcedFiles && forcedFiles.length > 0) {
  for (const fp of forcedFiles) {
    try {
      const file = this.vault.getAbstractFileByPath(fp);
      if (\!file) {
        console.warn(`KB: Forced file not found: ${fp}`);
        continue;
      }
      let content = await this.vault.cachedRead(file as any);
      const MAX_FORCED_FILE_SIZE = 100 * 1024; // 100 KB
      if (content.length > MAX_FORCED_FILE_SIZE) {
        content = content.substring(0, MAX_FORCED_FILE_SIZE) + "\n\n[Content truncated at 100 KB]";
      }
      const title = fp.split("/").pop()?.replace(/\.md$/, "") ?? fp;
      forcedContext += `[Forced context: ${title} (${fp})]\n${content}\n\n`;
      forcedSources.push({
        filePath: fp,
        fileTitle: title,
        chunkText: content.substring(0, 200),
      });
    } catch (err) {
      console.warn(`KB: Failed to read forced file ${fp}:`, err);
    }
  }
}
```

**2c. Prepend forced context to the LLM context block**:

Change the `context` variable construction. Currently it is:
```typescript
const context = results.map(r => ...
```

Change to:
```typescript
const vectorContext = results.map(r =>
  `[Source: ${r.fileTitle} (${r.filePath})]\n${r.text}`
).join("\n\n");
const context = forcedContext + vectorContext;
```

**2d. Merge forced sources into the sources yield, with deduplication**:

In the source-building block at the end of query(), change it to:
```typescript
const seen = new Set<string>();
const sources: SourceReference[] = [];

// Add forced sources first
for (const fs of forcedSources) {
  if (\!seen.has(fs.filePath)) {
    seen.add(fs.filePath);
    sources.push(fs);
  }
}

// Add vector search sources
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

**Do NOT**:
- Change the generator pattern (must remain `async *query`)
- Change the system prompt
- Change the embedding or vector search logic
- Remove any existing error handling

**Verify**: `npm run build` succeeds. The query signature accepts an optional second parameter. Calling `ragEngine.query("test")` still works (single-arg backward compat).

---

## Step 3: Update main.ts -- Data wrapper, pass vault and callbacks to ChatView

**Files**: `src/main.ts`

**Action**: Refactor data storage to use the `PluginData` wrapper and pass new dependencies to `ChatView`.

**3a. Add imports**:

Add to the existing imports from `./types`:
```typescript
import { PluginSettings, DEFAULT_SETTINGS, ChatMessage, PluginData } from "./types";
```

**3b. Add a `pluginData` field**:

Add a private field to the plugin class:
```typescript
private pluginData: PluginData = { settings: DEFAULT_SETTINGS, chatHistory: [] };
```

Keep the existing `settings` field but make it a getter alias:
```typescript
get settings(): PluginSettings {
  return this.pluginData.settings;
}
set settings(val: PluginSettings) {
  this.pluginData.settings = val;
}
```

Remove the existing `settings: PluginSettings = DEFAULT_SETTINGS;` line and replace it with the above getter/setter plus the `pluginData` field.

**3c. Rewrite loadSettings()**:

```typescript
async loadSettings(): Promise<void> {
  const raw = await this.loadData();
  if (raw && raw.settings) {
    // New format: { settings: ..., chatHistory: ... }
    this.pluginData = {
      settings: Object.assign({}, DEFAULT_SETTINGS, raw.settings),
      chatHistory: Array.isArray(raw.chatHistory) ? raw.chatHistory : [],
    };
  } else if (raw && typeof raw === "object") {
    // Legacy format: settings at top level
    this.pluginData = {
      settings: Object.assign({}, DEFAULT_SETTINGS, raw),
      chatHistory: [],
    };
  } else {
    this.pluginData = { settings: { ...DEFAULT_SETTINGS }, chatHistory: [] };
  }
}
```

**3d. Rewrite saveSettings()**:

```typescript
async saveSettings(): Promise<void> {
  await this.saveData(this.pluginData);
}
```

**3e. Add chat history accessors**:

```typescript
async loadChatHistory(): Promise<ChatMessage[]> {
  return this.pluginData.chatHistory ?? [];
}

async saveChatHistory(messages: ChatMessage[]): Promise<void> {
  this.pluginData.chatHistory = messages;
  await this.saveData(this.pluginData);
}
```

**3f. Pass vault to RagEngine**:

In `onload()`, change the RagEngine constructor call to:
```typescript
this.ragEngine = new RagEngine(
  this.app.vault,
  this.vectorStore,
  this.llmProvider,
  this.embeddingProvider,
  this.settings,
);
```

Do the same in `refreshProvider()`.

**3g. Pass callbacks and app to ChatView**:

Change the `registerView` call to:
```typescript
this.registerView(CHAT_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
  return new ChatView(
    leaf,
    this.ragEngine,
    this.urlIngestor,
    this.app,
    () => this.loadChatHistory(),
    (msgs: ChatMessage[]) => this.saveChatHistory(msgs),
  );
});
```

**Do NOT**:
- Change any command registrations
- Change the indexer, urlIngestor, or pdfIngestor setup
- Remove `refreshProvider()` -- but update its RagEngine constructor call too
- Change the settings tab registration

**Verify**: `npm run build` succeeds. Open the plugin in Obsidian; existing settings are preserved (migration works). Check console for no errors on load.

---

## Step 4: Rewrite chat-view.ts -- Constructor, header, input area structure

**Files**: `src/ui/chat-view.ts`

**Action**: Update the ChatView constructor to accept new dependencies, add a header bar with Clear History button, and restructure the input area to include chip tray and autocomplete dropdown.

**4a. Update imports and constructor**:

Add imports:
```typescript
import { ItemView, WorkspaceLeaf, MarkdownRenderer, App } from "obsidian";
import { RagEngine } from "../core/rag-engine";
import { SourceReference, ChatMessage } from "../types";
import { UrlIngestor, IngestPhase } from "../ingestor/url-ingestor";
import { detectVideoProvider } from "../ingestor/video-detector";
```

Add new private fields:
```typescript
private appRef: App;
private loadChatHistory: () => Promise<ChatMessage[]>;
private saveChatHistory: (messages: ChatMessage[]) => Promise<void>;
private chatHistory: ChatMessage[] = [];
private mentionedFiles: { filePath: string; displayName: string }[] = [];
private chipTrayEl\!: HTMLElement;
private autocompleteEl\!: HTMLElement;
private inputWrapperEl\!: HTMLElement;
private autocompleteIndex = -1;
private autocompleteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
```

New constructor signature:
```typescript
constructor(
  leaf: WorkspaceLeaf,
  ragEngine: RagEngine,
  urlIngestor: UrlIngestor,
  appRef: App,
  loadChatHistory: () => Promise<ChatMessage[]>,
  saveChatHistory: (messages: ChatMessage[]) => Promise<void>,
) {
  super(leaf);
  this.ragEngine = ragEngine;
  this.urlIngestor = urlIngestor;
  this.appRef = appRef;
  this.loadChatHistory = loadChatHistory;
  this.saveChatHistory = saveChatHistory;
}
```

**4b. Rewrite onOpen() -- Header bar**:

At the top of `onOpen()`, after `container.empty()` and `container.addClass(...)`, add a header bar:

```typescript
// Header bar
const headerEl = container.createDiv({ cls: "kb-chat-header" });
headerEl.createEl("span", { cls: "kb-chat-header-title", text: "KB Chat" });
const clearBtn = headerEl.createEl("button", {
  cls: "kb-chat-clear-btn",
  text: "Clear History",
});
clearBtn.addEventListener("click", () => this.handleClearHistory());
```

Then the messages area (same as before):
```typescript
this.messagesEl = container.createDiv({ cls: "kb-chat-messages" });
```

**4c. Rewrite onOpen() -- Input area with chip tray and autocomplete**:

Replace the current input area creation with:

```typescript
const inputArea = container.createDiv({ cls: "kb-chat-input-area" });

this.inputWrapperEl = inputArea.createDiv({ cls: "kb-chat-input-wrapper" });

// Chip tray (above textarea, inside wrapper)
this.chipTrayEl = this.inputWrapperEl.createDiv({ cls: "kb-chat-chip-tray" });
this.chipTrayEl.style.display = "none"; // hidden when no chips

// Textarea (inside wrapper)
this.inputEl = this.inputWrapperEl.createEl("textarea", {
  cls: "kb-chat-input",
  attr: { placeholder: "Ask about your notes... (@ to mention a file)", rows: "3" },
});

// Autocomplete dropdown (inside wrapper, absolutely positioned)
this.autocompleteEl = this.inputWrapperEl.createDiv({ cls: "kb-chat-autocomplete" });
this.autocompleteEl.style.display = "none";

// Send button (outside wrapper, same level as wrapper)
this.sendBtn = inputArea.createEl("button", {
  cls: "kb-chat-send",
  text: "Send",
});
```

**4d. Rewrite onOpen() -- Event listeners**:

Replace the existing keydown and click listeners with:

```typescript
this.inputEl.addEventListener("input", () => this.onInputChange());

this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
  // If autocomplete is open, handle navigation keys
  if (this.autocompleteEl.style.display \!== "none") {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.moveAutocomplete(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.moveAutocomplete(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      this.selectAutocompleteItem();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      this.hideAutocomplete();
      return;
    }
  }

  // Normal submit: Cmd/Ctrl+Enter
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    this.handleSubmit(this.inputEl.value);
  }

  // Backspace at position 0 removes last chip
  if (e.key === "Backspace" && this.inputEl.selectionStart === 0
      && this.inputEl.selectionEnd === 0 && this.mentionedFiles.length > 0) {
    this.removeChip(this.mentionedFiles.length - 1);
  }
});

this.sendBtn.addEventListener("click", () => {
  this.handleSubmit(this.inputEl.value);
});
```

**4e. Add history load at end of onOpen()**:

At the very end of `onOpen()`, add:
```typescript
// Load chat history
await this.restoreHistory();
```

**Do NOT**:
- Change `getViewType()`, `getDisplayText()`, `getIcon()`, or `onClose()`
- Remove any existing method bodies yet (they will be updated in later steps)
- Change the `handleUrlIngest` method
- Modify the `addUserMessage`, `addAssistantMessage`, `appendToken`, `renderMarkdown`, `renderSources`, `renderError`, `setInputEnabled`, or `scrollToBottom` methods yet

**Verify**: `npm run build` succeeds (may have errors for methods not yet implemented -- that is OK if you add stub implementations). The chat view opens with a header bar, chip tray (hidden), textarea, autocomplete dropdown (hidden), and send button.

---

## Step 5: Implement autocomplete logic in chat-view.ts

**Files**: `src/ui/chat-view.ts`

**Action**: Add private methods for @ detection, file filtering, dropdown rendering, and keyboard navigation.

**5a. Add `onInputChange()` method**:

```typescript
private onInputChange(): void {
  if (this.autocompleteDebounceTimer) {
    clearTimeout(this.autocompleteDebounceTimer);
  }
  this.autocompleteDebounceTimer = setTimeout(() => {
    this.autocompleteDebounceTimer = null;
    this.updateAutocomplete();
  }, 100);
}
```

**5b. Add `getAtQuery()` method** -- scans backward from cursor to find @ trigger:

```typescript
private getAtQuery(): string | null {
  const text = this.inputEl.value;
  const cursor = this.inputEl.selectionStart ?? text.length;

  // Scan backward from cursor to find @
  let atPos = -1;
  for (let i = cursor - 1; i >= 0; i--) {
    if (text[i] === "@") {
      // Check word boundary: @ must be at start or preceded by space/newline
      if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
        atPos = i;
      }
      break; // stop at first @ regardless
    }
    // If we hit a space or newline before finding @, no active trigger
    if (text[i] === " " || text[i] === "\n") {
      break;
    }
  }

  if (atPos === -1) return null;
  return text.substring(atPos + 1, cursor);
}
```

**5c. Add `updateAutocomplete()` method**:

```typescript
private updateAutocomplete(): void {
  const query = this.getAtQuery();
  if (query === null) {
    this.hideAutocomplete();
    return;
  }

  const files = this.appRef.vault.getMarkdownFiles();
  const lowerQuery = query.toLowerCase();
  const matches = files
    .filter((f) => f.path.toLowerCase().includes(lowerQuery))
    .slice(0, 10);

  if (matches.length === 0) {
    this.hideAutocomplete();
    return;
  }

  this.autocompleteEl.empty();
  this.autocompleteIndex = -1;

  // Check for basename collisions to decide whether to show folder path
  const basenameCounts = new Map<string, number>();
  for (const f of matches) {
    const bn = f.basename;
    basenameCounts.set(bn, (basenameCounts.get(bn) ?? 0) + 1);
  }

  for (let i = 0; i < matches.length; i++) {
    const file = matches[i];
    const needsDisambiguation = (basenameCounts.get(file.basename) ?? 0) > 1;
    const displayText = needsDisambiguation
      ? `${file.basename} (${file.parent?.path ?? ""})`
      : file.basename;

    const item = this.autocompleteEl.createDiv({
      cls: "kb-chat-autocomplete-item",
      text: displayText,
    });
    item.dataset.filepath = file.path;
    item.dataset.displayname = file.basename;
    item.dataset.index = String(i);

    item.addEventListener("mousedown", (e) => {
      e.preventDefault(); // prevent textarea blur
      this.selectFile(file.path, file.basename);
    });
  }

  this.autocompleteEl.style.display = "block";
}
```

**5d. Add `moveAutocomplete()` method**:

```typescript
private moveAutocomplete(direction: number): void {
  const items = this.autocompleteEl.querySelectorAll(".kb-chat-autocomplete-item");
  if (items.length === 0) return;

  // Remove highlight from current
  if (this.autocompleteIndex >= 0 && this.autocompleteIndex < items.length) {
    items[this.autocompleteIndex].removeClass("is-selected");
  }

  this.autocompleteIndex += direction;
  if (this.autocompleteIndex < 0) this.autocompleteIndex = items.length - 1;
  if (this.autocompleteIndex >= items.length) this.autocompleteIndex = 0;

  items[this.autocompleteIndex].addClass("is-selected");
  (items[this.autocompleteIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
}
```

**5e. Add `selectAutocompleteItem()` method**:

```typescript
private selectAutocompleteItem(): void {
  const items = this.autocompleteEl.querySelectorAll(".kb-chat-autocomplete-item");
  if (this.autocompleteIndex < 0 || this.autocompleteIndex >= items.length) {
    // If nothing highlighted, select first item
    if (items.length > 0) {
      this.autocompleteIndex = 0;
    } else {
      return;
    }
  }
  const el = items[this.autocompleteIndex] as HTMLElement;
  const filePath = el.dataset.filepath\!;
  const displayName = el.dataset.displayname\!;
  this.selectFile(filePath, displayName);
}
```

**5f. Add `selectFile()` method** -- adds chip and cleans up textarea:

```typescript
private selectFile(filePath: string, displayName: string): void {
  // Remove @query from textarea
  const text = this.inputEl.value;
  const cursor = this.inputEl.selectionStart ?? text.length;

  // Find the @ position
  let atPos = -1;
  for (let i = cursor - 1; i >= 0; i--) {
    if (text[i] === "@") {
      atPos = i;
      break;
    }
  }

  if (atPos >= 0) {
    // Replace @query with empty string
    this.inputEl.value = text.substring(0, atPos) + text.substring(cursor);
    this.inputEl.selectionStart = atPos;
    this.inputEl.selectionEnd = atPos;
  }

  // Add chip
  this.addChip(filePath, displayName);
  this.hideAutocomplete();
  this.inputEl.focus();
}
```

**5g. Add `hideAutocomplete()` method**:

```typescript
private hideAutocomplete(): void {
  this.autocompleteEl.style.display = "none";
  this.autocompleteEl.empty();
  this.autocompleteIndex = -1;
}
```

**Do NOT**:
- Modify `handleSubmit` yet (that is Step 6)
- Add any npm dependencies
- Change the RagEngine or types files

**Verify**: `npm run build` succeeds. In Obsidian, typing `@` in the chat textarea shows a dropdown of .md files. Arrow keys navigate. Enter selects. Escape dismisses. Typing filters the list.

---

## Step 6: Implement chip management in chat-view.ts

**Files**: `src/ui/chat-view.ts`

**Action**: Add methods to render/remove chips in the chip tray and extract file paths on submit.

**6a. Add `addChip()` method**:

```typescript
private addChip(filePath: string, displayName: string): void {
  // Prevent duplicate
  if (this.mentionedFiles.some((f) => f.filePath === filePath)) return;

  this.mentionedFiles.push({ filePath, displayName });
  this.renderChips();
}
```

**6b. Add `removeChip()` method**:

```typescript
private removeChip(index: number): void {
  this.mentionedFiles.splice(index, 1);
  this.renderChips();
}
```

**6c. Add `renderChips()` method**:

```typescript
private renderChips(): void {
  this.chipTrayEl.empty();

  if (this.mentionedFiles.length === 0) {
    this.chipTrayEl.style.display = "none";
    return;
  }

  this.chipTrayEl.style.display = "flex";

  for (let i = 0; i < this.mentionedFiles.length; i++) {
    const file = this.mentionedFiles[i];
    const chip = this.chipTrayEl.createDiv({ cls: "kb-chat-chip" });
    chip.createSpan({ text: `@${file.displayName}` });
    const closeBtn = chip.createSpan({ cls: "kb-chat-chip-close", text: "×" });
    closeBtn.addEventListener("click", () => this.removeChip(i));
  }
}
```

**6d. Add `clearChips()` method**:

```typescript
private clearChips(): void {
  this.mentionedFiles = [];
  this.renderChips();
}
```

**6e. Update `handleSubmit()` to extract chips and pass forcedFiles**:

Modify the existing `handleSubmit` method. Before the `this.inputEl.value = ""` line, extract forced files:

```typescript
private async handleSubmit(question: string): Promise<void> {
  const trimmed = question.trim();
  if (trimmed.length === 0 && this.mentionedFiles.length === 0) return;

  // URL detection (only if no chips are attached)
  if (/^https?:\/\/\S+$/.test(trimmed) && this.mentionedFiles.length === 0) {
    this.inputEl.value = "";
    await this.handleUrlIngest(trimmed);
    return;
  }

  // Extract forced file paths before clearing
  const forcedFiles = this.mentionedFiles.map((f) => f.filePath);

  // Build display text with chip mentions for the user message bubble
  const chipMentions = this.mentionedFiles.map((f) => `@[[${f.displayName}]]`).join(" ");
  const displayText = chipMentions ? `${chipMentions} ${trimmed}` : trimmed;

  // Clean question text (no chip syntax sent to LLM)
  const cleanQuestion = trimmed;

  this.inputEl.value = "";
  this.clearChips();
  this.setInputEnabled(false);
  this.addUserMessage(displayText);

  // Save user message to history
  this.pushHistory({ role: "user", text: displayText, sources: [], timestamp: new Date().toISOString() });

  const bubbleEl = this.addAssistantMessage();
  this.fullResponseText = "";
  let responseSources: SourceReference[] = [];

  try {
    for await (const response of this.ragEngine.query(cleanQuestion, forcedFiles.length > 0 ? forcedFiles : undefined)) {
      if (response.type === "token") {
        this.appendToken(bubbleEl, response.token);
      } else if (response.type === "sources") {
        responseSources = response.sources;
        this.renderSources(bubbleEl, response.sources);
      } else if (response.type === "error") {
        this.renderError(bubbleEl, response.message);
      }
    }
  } catch (err) {
    this.renderError(bubbleEl, (err as Error).message);
  } finally {
    this.renderMarkdown(bubbleEl);
    this.setInputEnabled(true);

    // Save assistant message to history
    this.pushHistory({
      role: "assistant",
      text: this.fullResponseText,
      sources: responseSources,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**6f. Update `handleUrlIngest()` to save history**:

Add history persistence calls inside the existing `handleUrlIngest` method:

After `this.addUserMessage(url)`:
```typescript
this.pushHistory({ role: "user", text: url, sources: [], timestamp: new Date().toISOString() });
```

After the result is displayed (inside the `try` block, after setting contentEl text):
```typescript
const resultText = `Ingested: "${result.title}" → ${result.filePath}`;
this.pushHistory({ role: "assistant", text: resultText, sources: [], timestamp: new Date().toISOString() });
```

In the `catch` block, after `renderError`:
```typescript
this.pushHistory({ role: "assistant", text: `Error: ${(err as Error).message}`, sources: [], timestamp: new Date().toISOString() });
```

**Do NOT**:
- Change the streaming pattern or async generator consumption
- Modify `renderSources`, `renderError`, `appendToken`, or `renderMarkdown`
- Add any new files

**Verify**: `npm run build` succeeds. In Obsidian, selecting a file from autocomplete adds a chip above the textarea. The `x` button removes it. Backspace at position 0 removes the last chip. Sending a message with chips passes `forcedFiles` to the query.

---

## Step 7: Implement chat history persistence in chat-view.ts

**Files**: `src/ui/chat-view.ts`

**Action**: Add methods for saving, loading, clearing, and restoring chat history.

**7a. Add `pushHistory()` method**:

```typescript
private async pushHistory(message: ChatMessage): Promise<void> {
  this.chatHistory.push(message);

  // Cap at 100 messages
  if (this.chatHistory.length > 100) {
    this.chatHistory = this.chatHistory.slice(-100);
  }

  try {
    await this.saveChatHistory(this.chatHistory);
  } catch (err) {
    console.error("KB: Failed to save chat history", err);
  }
}
```

**7b. Add `restoreHistory()` method**:

```typescript
private async restoreHistory(): Promise<void> {
  try {
    this.chatHistory = await this.loadChatHistory();
  } catch (err) {
    console.error("KB: Failed to load chat history", err);
    this.chatHistory = [];
    return;
  }

  for (const msg of this.chatHistory) {
    if (msg.role === "user") {
      this.addUserMessage(msg.text);
    } else if (msg.role === "assistant") {
      const bubbleEl = this.addAssistantMessage();
      // Render the saved text as markdown
      this.fullResponseText = msg.text;
      this.renderMarkdown(bubbleEl);
      // Render sources if any
      if (msg.sources && msg.sources.length > 0) {
        this.renderSources(bubbleEl, msg.sources);
      }
    }
  }
}
```

**7c. Add `handleClearHistory()` method**:

```typescript
private async handleClearHistory(): Promise<void> {
  // Simple confirmation dialog
  const confirmed = confirm("Clear all chat history? This cannot be undone.");
  if (\!confirmed) return;

  this.chatHistory = [];
  try {
    await this.saveChatHistory([]);
  } catch (err) {
    console.error("KB: Failed to clear chat history", err);
  }

  // Clear the message area
  this.messagesEl.empty();
}
```

**Do NOT**:
- Modify the data storage methods (those are in main.ts)
- Add any new imports beyond what was already added in Step 4
- Change the message rendering methods

**Verify**: `npm run build` succeeds. In Obsidian: send a message, close the chat panel, reopen it -- the message history is restored. Click "Clear History", confirm -- all messages are removed and the panel is empty on next open.

---

## Step 8: Add styles for chips, autocomplete, header, and clear button

**Files**: `styles.css`

**Action**: Append new CSS rules at the end of the file.

```css
/* ─── Chat Header ─── */
.kb-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.kb-chat-header-title {
  font-weight: 600;
  font-size: 1em;
}

.kb-chat-clear-btn {
  font-size: 0.8em;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
  color: var(--text-muted);
  cursor: pointer;
}

.kb-chat-clear-btn:hover {
  color: var(--text-error);
  border-color: var(--text-error);
}

/* ─── Input Wrapper (relative container for autocomplete) ─── */
.kb-chat-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* ─── Chip Tray ─── */
.kb-chat-chip-tray {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
}

.kb-chat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
  font-size: 0.85em;
  white-space: nowrap;
}

.kb-chat-chip-close {
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  opacity: 0.7;
}

.kb-chat-chip-close:hover {
  opacity: 1;
}

/* ─── Autocomplete Dropdown ─── */
.kb-chat-autocomplete {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.kb-chat-autocomplete-item {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-chat-autocomplete-item:hover,
.kb-chat-autocomplete-item.is-selected {
  background-color: var(--background-modifier-hover);
}
```

**Do NOT**:
- Modify any existing CSS rules
- Change class names used by existing code
- Add any `@import` statements

**Verify**: `npm run build` succeeds. Visual check in Obsidian: header bar visible with "KB Chat" and "Clear History" button. Chips appear as colored pills. Autocomplete dropdown appears above the textarea with clean styling.

---

## Step 9: Build and end-to-end verification

**Files**: None (verification only)

**Action**: Run the build and perform manual testing.

```bash
npm run build
```

**Manual test checklist**:

1. **Build**: `npm run build` completes with zero errors
2. **Open chat**: Click ribbon icon. Header bar shows "KB Chat" and "Clear History" button
3. **@ autocomplete**: Type `@` in textarea. Dropdown appears with .md files. Type a filter string -- list narrows. Arrow keys navigate. Enter selects. Escape dismisses
4. **Chips**: After selecting a file, chip appears in tray above textarea. `x` button removes it. Backspace at position 0 removes last chip
5. **Send with chips**: Add a chip, type a question, Cmd+Enter. User message shows `@[[filename]] question`. Assistant responds with forced file content in context
6. **Send without chips**: Type a question without @. Normal RAG query works (backward compatible)
7. **Sources**: Forced file appears in sources. If it also has vector results, it appears only once
8. **History persist**: Send a message. Close chat panel. Reopen. Messages are restored with markdown rendering and sources
9. **History cap**: (Optional) Verify > 100 messages triggers trimming (check data.json)
10. **Clear history**: Click "Clear History". Confirm dialog appears. Confirm. Messages cleared. Reopen -- empty
11. **URL ingest**: Paste a URL. Ingest works as before. Messages are saved to history
12. **Settings preserved**: Check plugin settings are still intact after data migration

**Do NOT**:
- Skip the build step
- Push to remote without user approval
