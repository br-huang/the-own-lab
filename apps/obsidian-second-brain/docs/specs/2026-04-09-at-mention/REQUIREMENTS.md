# Feature: @ File Mention in Chat + Chat History Persistence

## Summary

Two related enhancements to the KB Chat view: (1) users can type `@` to mention vault `.md` files and force their full content into the RAG context alongside vector search results; (2) chat messages are persisted to disk and restored when the chat view is reopened, with a clear-history control.

---

## Feature 1: @ File Mention in Chat

### Acceptance Criteria

#### Autocomplete Trigger and Dropdown
- [ ] Typing `@` anywhere in the chat textarea opens an autocomplete dropdown listing all `.md` files in the vault.
- [ ] The dropdown appears visually anchored near the `@` token in the input area (above or below the textarea, not covering the message list).
- [ ] As the user types characters after `@` (e.g., `@proj`), the dropdown filters to files whose name or path contains the typed substring (case-insensitive substring match is the minimum; fuzzy match is acceptable).
- [ ] The dropdown shows at most 10 entries at a time; if more matches exist they are scrollable.
- [ ] Each dropdown entry displays the file's basename (without `.md` extension) and, where disambiguation is needed, its vault-relative folder path.
- [ ] Pressing `ArrowDown` / `ArrowUp` moves keyboard focus through the dropdown entries.
- [ ] Pressing `Enter` or clicking an entry selects the file and dismisses the dropdown.
- [ ] Pressing `Escape` dismisses the dropdown without selecting a file; the `@` token and any typed filter text remain in the textarea.
- [ ] If no files match the current filter, the dropdown is hidden (not shown as empty).

#### File Chips in the Input Area
- [ ] Selecting a file from the dropdown replaces the `@<filter>` token in the textarea with a styled chip rendered as `@[[<basename>]]`.
- [ ] The chip is visually distinct from plain text (e.g., a pill/tag style).
- [ ] Multiple `@` mentions can be added in a single message; each resolves to an independent chip.
- [ ] Chips can be deleted individually (Backspace when cursor is immediately after a chip removes it; clicking an `×` button on the chip also removes it).
- [ ] The send action is triggered by Cmd/Ctrl+Enter or the Send button, consistent with existing behavior.

#### RAG Context Injection
- [ ] When the user sends a message, all resolved `@`-mentioned file paths are extracted from the input and passed to `RagEngine.query()` as a new parameter `forcedFiles: string[]`.
- [ ] `RagEngine.query()` accepts an optional second parameter `forcedFiles?: string[]`; its existing single-argument call signature from `handleSubmit` continues to work unchanged (backward compatible).
- [ ] For each path in `forcedFiles`, the engine reads the file's full content from the vault and prepends it to the LLM context block, before the vector-search results, formatted as `[Forced context: <fileTitle> (<filePath>)]\n<full content>`.
- [ ] If a path in `forcedFiles` does not exist or cannot be read, the engine logs a warning and skips that file; it does not throw.
- [ ] The user-visible question text sent to the LLM strips the chip syntax (`@[[...]]`) and contains only the plain question text.
- [ ] Mentioned files appear in the `sources` response even if they returned zero vector-search chunks, with `chunkText` set to the first 200 characters of the file content.
- [ ] If a forced file also appears in the top-K vector results, it is deduplicated in the sources list (not shown twice).

#### Edge Cases
- [ ] An `@` in a URL (e.g., pasted email address) does NOT trigger the autocomplete dropdown. Trigger fires only when `@` is typed interactively and is preceded by a word boundary (start of input, space, or newline).
- [ ] If the vault has zero `.md` files, typing `@` does not show a dropdown.

---

## Feature 2: Chat History Persistence

### Acceptance Criteria

#### Storage
- [ ] Chat history is stored as JSON using the plugin's existing `this.loadData()` / `this.saveData()` mechanism (Obsidian's plugin data store), under a dedicated key `chatHistory` that does not collide with plugin settings.
- [ ] Each stored message entry contains: `role` (`"user"` | `"assistant"`), `text` (full message text), `sources` (array of `SourceReference` or empty array), and `timestamp` (ISO-8601 string).
- [ ] History is stored per-vault automatically because Obsidian's plugin data is vault-scoped.
- [ ] At most 100 messages are retained; when a new message would exceed this limit, the oldest messages are dropped to bring the count back to 100.

#### Load on Open
- [ ] When `ChatView.onOpen()` is called, it loads the stored history and renders all saved messages in order before the user types anything.
- [ ] User messages are rendered using the existing `addUserMessage()` style.
- [ ] Assistant messages are rendered with their saved text (via Markdown rendering) and their saved sources using the existing `renderSources()` style.
- [ ] If no history exists (first launch or after a clear), the chat view opens empty with no error.
- [ ] History load is non-blocking; if loading fails, the chat view opens empty and logs an error to the console without surfacing a modal to the user.

#### Save on Message
- [ ] After each user message is submitted, that user message is appended to the in-memory history and persisted immediately.
- [ ] After the assistant response stream completes (including sources), the assistant message (full accumulated text + sources) is appended to the in-memory history and persisted immediately.
- [ ] URL-ingest messages (where the user pastes a URL) follow the same save rules: user URL text is saved as a user message; the ingest result confirmation is saved as an assistant message.
- [ ] Error responses from the assistant are saved as assistant messages with empty sources.

#### Clear History
- [ ] A "Clear History" button is present in the chat UI header area (not inside the message stream).
- [ ] Clicking "Clear History" displays a confirmation prompt (Obsidian `Modal` or `confirm()` dialog) before destructive action.
- [ ] On confirmation, the in-memory message list is cleared, the persisted `chatHistory` key is cleared, and the message area is emptied in the UI.
- [ ] The "Clear History" button is always visible and clickable regardless of whether streaming is in progress (but if streaming is in progress it should wait or be disabled — implementation decision; the requirement is that it must not corrupt a partially-stored message).

---

## Scope

### In Scope
- Autocomplete dropdown for `.md` vault files triggered by `@` in the chat textarea
- File chip rendering inside the input area
- `forcedFiles` parameter on `RagEngine.query()`
- Prepending full file content to LLM context
- Including forced files in source citations
- JSON chat history saved via plugin data store
- Restoring history on `ChatView.onOpen()`
- 100-message rolling cap
- Clear History button with confirmation

### Out of Scope
- `@` mention for non-`.md` files (images, PDFs, etc.)
- `@` mention for headings, blocks, or anchors within a file (e.g., `@file#heading`)
- Multi-conversation threads or named conversation sessions
- Export or search of chat history
- History sync across devices
- Editing or deleting individual historical messages
- Pagination of the loaded history (all 100 messages render on open)

---

## Constraints

- **Obsidian API only:** File reads must use `this.app.vault.read(file)` (no Node `fs`). File listing must use `this.app.vault.getMarkdownFiles()`.
- **No new dependencies:** The dropdown and chip UI must be built with vanilla DOM / Obsidian's existing `createEl` helpers; no new npm packages.
- **Backward compatibility:** `RagEngine.query(userQuestion)` (single argument) must continue to work; `forcedFiles` is additive and optional.
- **Data key isolation:** The `chatHistory` key in plugin data must not conflict with `PluginSettings` fields. The safest approach is a wrapper object `{ settings: PluginSettings, chatHistory: ChatMessage[] }` or a separate `loadData`/`saveData` call pattern. Architect decides implementation; the requirement is zero data corruption to existing settings on upgrade.
- **Performance:** Reading forced files happens at query time (not pre-loaded). Files larger than 100 KB should be truncated to 100 KB with a warning appended to the injected content block so the LLM context window is not exhausted by a single large file.

---

## Data Shape Reference

The following types are additive (do not modify existing types; these extend `types.ts`):

```
// New type to be added to types.ts
interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources: SourceReference[];  // empty array for user messages
  timestamp: string;           // ISO-8601
}
```

`RagEngine.query` new signature:

```
async *query(userQuestion: string, forcedFiles?: string[]): AsyncGenerator<RagResponse>
```

---

## Open Questions

None — scope is fully defined. All decisions deferred to the implementation spec/architect phase.
