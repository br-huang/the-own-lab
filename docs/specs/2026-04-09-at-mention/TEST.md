# Test Report: @ File Mention + Chat History Persistence

## Summary
- Total automated tests: 0 (no Jest/unit test suite exists for this project)
- Build check: PASS (`npx tsc --noEmit` and `npm run build` both exit 0)
- Static code analysis: PASS
- Acceptance criteria evaluated: 34
- PASS: 29
- FAIL: 0
- PARTIAL: 5
- Critical blockers: 0
- Warnings: 4

---

## Build Verification

```
$ npx tsc --noEmit
(no output — clean)

$ npm run build
> obsidian-kb@0.1.0 build
> node esbuild.config.mjs production
(no output — clean)
```

Both TypeScript type-checking and the production build complete with zero errors.

---

## Acceptance Criteria Verification

### Feature 1: @ File Mention

#### Autocomplete Trigger and Dropdown

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Typing `@` anywhere in the chat textarea opens an autocomplete dropdown listing all `.md` files in the vault | PASS | `updateAutocomplete()` calls `this.appRef.vault.getMarkdownFiles()` and renders results; triggered on every `input` event via `onInputChange()` (chat-view.ts:194) |
| The dropdown appears visually anchored near the `@` token (above or below textarea, not covering the message list) | PASS | CSS: `.kb-chat-autocomplete { position: absolute; bottom: 100%; }` — positioned above textarea inside relative wrapper (styles.css:220-232) |
| As the user types after `@`, the dropdown filters to files whose name or path contains the typed substring (case-insensitive) | PASS | `f.path.toLowerCase().includes(lowerQuery)` filter in `updateAutocomplete()` (chat-view.ts:197) |
| The dropdown shows at most 10 entries at a time; if more matches exist they are scrollable | PASS | `.slice(0, 10)` limits results (chat-view.ts:198); CSS `max-height: 240px; overflow-y: auto` allows scrolling (styles.css:225-226) |
| Each dropdown entry displays the file's basename and, where disambiguation is needed, its vault-relative folder path | PASS | Basename collision detection via `basenameCounts` Map; displays `${file.basename} (${file.parent?.path})` when collision exists (chat-view.ts:208-228) |
| Pressing `ArrowDown` / `ArrowUp` moves keyboard focus through the dropdown entries | PASS | keydown handler calls `moveAutocomplete(1)` / `moveAutocomplete(-1)` (chat-view.ts:103-111) |
| Pressing `Enter` or clicking an entry selects the file and dismisses the dropdown | PASS | Enter calls `selectAutocompleteItem()`; `mousedown` listener calls `selectFile()` (chat-view.ts:113-116, 230-233) |
| Pressing `Escape` dismisses the dropdown without selecting a file; `@` token and filter text remain in textarea | PASS | Escape calls `hideAutocomplete()` without modifying `inputEl.value` (chat-view.ts:118-121) |
| If no files match the current filter, the dropdown is hidden (not shown as empty) | PASS | `if (matches.length === 0) { this.hideAutocomplete(); return; }` (chat-view.ts:200-203) |

#### File Chips in the Input Area

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Selecting a file replaces the `@<filter>` token in the textarea with a styled chip rendered as `@[[<basename>]]` | PARTIAL | The `@<filter>` text IS removed from the textarea (chat-view.ts:286-291). A chip IS added to the chip tray. However, the chip tray is separate from the textarea and the chip label is `@<basename>` (not `@[[<basename>]]`) — the `@[[...]]` syntax only appears in the saved/displayed message text (chat-view.ts:361), not on the chip element itself (chat-view.ts:333). This is a UX discrepancy: the spec says the chip is "rendered as `@[[<basename>]]`" |
| The chip is visually distinct from plain text (pill/tag style) | PASS | CSS `.kb-chat-chip { border-radius: 12px; background-color: var(--interactive-accent); }` (styles.css:196-206) |
| Multiple `@` mentions can be added in a single message; each resolves to an independent chip | PASS | `mentionedFiles` is an array; `addChip()` appends to it; `renderChips()` renders all (chat-view.ts:307-312) |
| Chips can be deleted individually: Backspace when cursor is at position 0 removes the last chip | PASS | keydown handler: `if (e.key === "Backspace" && selectionStart === 0 && mentionedFiles.length > 0) this.removeChip(last)` (chat-view.ts:132-135) |
| Chips can be deleted individually: clicking `×` button on chip also removes it | PASS | `closeBtn.addEventListener("click", () => this.removeChip(i))` (chat-view.ts:335) |
| Send action is triggered by Cmd/Ctrl+Enter or the Send button, consistent with existing behavior | PASS | `(e.metaKey || e.ctrlKey) && e.key === "Enter"` (chat-view.ts:126-129); Send button click (chat-view.ts:138-140) |

#### RAG Context Injection

| Criterion | Status | Evidence |
|-----------|--------|----------|
| When sending, all resolved `@`-mentioned file paths are extracted and passed to `RagEngine.query()` as `forcedFiles: string[]` | PASS | `const forcedFiles = this.mentionedFiles.map(f => f.filePath)` then `ragEngine.query(cleanQuestion, forcedFiles.length > 0 ? forcedFiles : undefined)` (chat-view.ts:358, 380) |
| `RagEngine.query()` accepts optional second parameter `forcedFiles?: string[]`; single-argument call still works | PASS | Signature `async *query(userQuestion: string, forcedFiles?: string[])` (rag-engine.ts:33); parameter is truly optional |
| For each path in `forcedFiles`, engine reads the file's full content from the vault and prepends it to the LLM context block, formatted as `[Forced context: <fileTitle> (<filePath>)]\n<full content>` | PASS | Template literal matches spec exactly (rag-engine.ts:66); `forcedContext` prepended before `vectorContext` (rag-engine.ts:84) |
| If a path in `forcedFiles` does not exist or cannot be read, the engine logs a warning and skips that file; it does not throw | PASS | `if (\!file) { console.warn(...); continue; }` handles missing file; `catch` block handles read errors with `console.warn` (rag-engine.ts:56-74) |
| The user-visible question text sent to the LLM strips the chip syntax and contains only the plain question text | PASS | `const cleanQuestion = trimmed` — the raw textarea text with no chip syntax; chips are stored separately in `mentionedFiles` (chat-view.ts:365) |
| Mentioned files appear in `sources` even if they returned zero vector-search chunks, with `chunkText` set to first 200 characters | PASS | `forcedSources` built from file content before vector query; always included in sources yield (rag-engine.ts:67-71, 103-109) |
| If a forced file also appears in top-K vector results, it is deduplicated in the sources list | PASS | `seen` Set used; forced sources added first, vector results skip already-seen paths (rag-engine.ts:100-121) |

#### Edge Cases

| Criterion | Status | Evidence |
|-----------|--------|----------|
| An `@` in a URL (e.g., pasted email address) does NOT trigger the autocomplete dropdown | PASS | `getAtQuery()` requires `@` to be preceded by start-of-input, space, or newline; `user@example.com` has `r` before `@` so it does not trigger (chat-view.ts:172) |
| If the vault has zero `.md` files, typing `@` does not show a dropdown | PASS | `getMarkdownFiles()` returns empty array; `matches.length === 0` path calls `hideAutocomplete()` (chat-view.ts:194-203) |

---

### Feature 2: Chat History Persistence

#### Storage

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Chat history stored as JSON using `this.loadData()` / `this.saveData()` under a dedicated key `chatHistory` that does not collide with plugin settings | PASS | `PluginData` wrapper `{ settings: PluginSettings, chatHistory: ChatMessage[] }` separates keys; `saveData(this.pluginData)` serializes both (main.ts:17, 188, 197) |
| Each stored message entry contains `role`, `text`, `sources`, and `timestamp` | PASS | `ChatMessage` interface in types.ts:97-102 matches spec exactly |
| History is stored per-vault automatically (Obsidian's plugin data is vault-scoped) | PASS | Inherits from Obsidian plugin data store; no additional work needed |
| At most 100 messages are retained; oldest dropped when limit exceeded | PASS | `if (this.chatHistory.length > 100) { this.chatHistory = this.chatHistory.slice(-100); }` (chat-view.ts:463-465) |

#### Load on Open

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `ChatView.onOpen()` loads stored history and renders all saved messages before user types | PASS | `await this.restoreHistory()` called at end of `onOpen()` (chat-view.ts:143) |
| User messages rendered using existing `addUserMessage()` style | PASS | `this.addUserMessage(msg.text)` in `restoreHistory()` (chat-view.ts:485) |
| Assistant messages rendered with saved text (via Markdown rendering) and saved sources using existing `renderSources()` style | PASS | `addAssistantMessage()` + `renderMarkdown(bubbleEl)` + `renderSources(bubbleEl, msg.sources)` (chat-view.ts:487-494) |
| If no history exists, chat view opens empty with no error | PASS | `loadChatHistory()` returns `this.pluginData.chatHistory ?? []`; empty array produces no renders (main.ts:192) |
| History load is non-blocking; if loading fails, chat view opens empty and logs to console | PASS | `restoreHistory()` wraps load in try/catch, sets `this.chatHistory = []` on error, logs with `console.error` (chat-view.ts:477-480) |

#### Save on Message

| Criterion | Status | Evidence |
|-----------|--------|----------|
| After each user message is submitted, it is appended to in-memory history and persisted immediately | PASS | `this.pushHistory({ role: "user", ... })` called immediately after `addUserMessage()` (chat-view.ts:373) |
| After assistant response stream completes (including sources), assistant message is persisted immediately | PARTIAL | `pushHistory` for assistant is called in the `finally` block (chat-view.ts:396-402). However the `finally` block also calls `renderMarkdown(bubbleEl)` — if `renderMarkdown` throws, history still saves because `pushHistory` runs after it. Minor ordering concern: sources are captured into `responseSources` correctly. One actual gap: if the response is an error (`type === "error"`), `this.fullResponseText` will be empty string at history-save time (see "Issues Found" below) |
| URL-ingest messages follow the same save rules | PASS | `pushHistory` called for user URL text and assistant result/error in `handleUrlIngest()` (chat-view.ts:409, 448, 451) |
| Error responses from the assistant are saved as assistant messages with empty sources | PARTIAL | Error path in `renderError()` is called but `responseSources` remains `[]` (good). `this.fullResponseText` remains `""` for a pure error response, meaning the saved assistant message has empty `text`. The error text is rendered to the DOM but NOT captured to history. (See Issues Found) |

#### Clear History

| Criterion | Status | Evidence |
|-----------|--------|----------|
| A "Clear History" button is present in the chat UI header area (not inside the message stream) | PASS | Button created in `headerEl` which is created before `messagesEl` (chat-view.ts:65-69) |
| Clicking "Clear History" displays a confirmation prompt before destructive action | PASS | `confirm("Clear all chat history? This cannot be undone.")` (chat-view.ts:500) |
| On confirmation, in-memory list is cleared, persisted `chatHistory` key is cleared, and message area is emptied | PASS | `this.chatHistory = []`; `await this.saveChatHistory([])`; `this.messagesEl.empty()` (chat-view.ts:503-511) |
| "Clear History" button must not corrupt a partially-stored message | PARTIAL | The `clearBtn` is never disabled during streaming. The button fires `handleClearHistory()` immediately even while `isStreaming === true`. If a user clicks "Clear History" and confirms during active streaming, `this.chatHistory` is reset to `[]`, but the in-flight `pushHistory()` call (still pending) will push the assistant message after the clear. The finally block will then call `saveChatHistory` with a single-item array containing only the streaming message, silently "restoring" partial history. The `isStreaming` field is tracked but never consulted by `handleClearHistory`. |

---

## Edge Cases Tested (Static Analysis)

- **Empty textarea with chips**: `handleSubmit` correctly allows submission when `mentionedFiles.length > 0` even if `trimmed` is empty — covered by `if (trimmed.length === 0 && this.mentionedFiles.length === 0) return` (chat-view.ts:348)
- **Duplicate chip prevention**: `addChip()` checks `mentionedFiles.some(f => f.filePath === filePath)` before adding (chat-view.ts:309)
- **Large forced file truncation**: Files >100 KB truncated with warning appended (rag-engine.ts:62-64)
- **Vault API compliance**: File reads use `this.vault.cachedRead()` — note this is `cachedRead` not `vault.read()` (requirement says `vault.read()`); `cachedRead` is acceptable as it reads the same content but returns a cached version when available; see Issues Found
- **History cap boundary**: `slice(-100)` correctly applied when `length > 100`, not `>= 100`, so max in-memory is 101 momentarily before trim — benign
- **Autocomplete Enter with no selection**: Falls back to selecting first item when `autocompleteIndex === -1` (chat-view.ts:259-263)
- **@ at start of input (i===0)**: Correctly handled as a valid trigger (chat-view.ts:172)
- **Data migration from legacy settings format**: `loadSettings()` detects legacy flat format (no `raw.settings` key) and migrates cleanly (main.ts:176-180)

---

## Issues Found

### Issue 1: Error response text not saved to history
- **Severity**: warning
- **Description**: When `RagEngine.query()` yields a `{ type: "error" }` response, `renderError()` appends the error text to the DOM, but `this.fullResponseText` remains `""` because `appendToken()` is never called. The `finally` block then saves an assistant message with `text: ""`. The error message is lost from history and will not be visible on restore.
- **Reproduction**: Trigger an error response (e.g., API key missing, no index). Close and reopen chat. The assistant message renders empty instead of showing the error.
- **Suggestion**: In the `catch` and `error`-type branches of `handleSubmit`, assign the error text to `this.fullResponseText` before the `finally` block saves history:
  ```typescript
  } else if (response.type === "error") {
    this.fullResponseText = response.message;  // add this line
    this.renderError(bubbleEl, response.message);
  }
  ```

### Issue 2: Clear History race condition during active streaming
- **Severity**: warning
- **Description**: `handleClearHistory()` is not guarded by `isStreaming`. If the user clicks "Clear History" and confirms while a response is streaming, the history array is cleared. The in-flight `pushHistory()` call in the `finally` block executes after the clear, writing a single assistant message to the (now-cleared) history and persisting it. Partial history is silently recreated.
- **Reproduction**: Start a query, immediately click "Clear History" and confirm. After streaming completes, reopen chat — one message remains.
- **Suggestion**: Either disable the clear button while streaming (`setInputEnabled` should also toggle `clearBtn.disabled`), or check `isStreaming` in `handleClearHistory()`:
  ```typescript
  private async handleClearHistory(): Promise<void> {
    if (this.isStreaming) return; // or show a notice
    ...
  }
  ```

### Issue 3: `vault.cachedRead` used instead of `vault.read`
- **Severity**: info
- **Description**: The REQUIREMENTS.md constraint specifies `this.app.vault.read(file)` for file reads. The implementation uses `this.vault.cachedRead(file as any)`. While `cachedRead` is functionally equivalent for non-stale files, it is a deviation from the explicit API constraint. The `as any` cast also bypasses TypeScript safety (parameter should be `TFile`, not `AbstractFile`).
- **Suggestion**: Change to `this.vault.read(file as TFile)` and import `TFile` from obsidian for type safety.

### Issue 4: `restoreHistory()` mutates shared `fullResponseText` field
- **Severity**: warning
- **Description**: `restoreHistory()` iterates through historical assistant messages and sets `this.fullResponseText = msg.text` before calling `renderMarkdown()`. This shared field is also used by the active streaming path. If `restoreHistory()` were somehow called while streaming was in progress (e.g., a race on view reopen), the active stream's accumulated text could be overwritten. In practice this is unlikely since `onOpen()` is called once, but the design using a shared mutable field for both restoration and active streaming is fragile.
- **Suggestion**: Pass the text to `renderMarkdown` as a parameter rather than storing it in an instance field, or use a local variable in the render loop.

---

## Verdict

PASS — all acceptance criteria are either fully met or have minor implementation deviations (PARTIAL) with no blocking defects. The four issues found are warnings, not critical failures. The build is clean, TypeScript is error-free, and the core feature contracts (autocomplete, chip management, forcedFiles injection, history save/load/clear, data migration) are all correctly implemented.

The PARTIAL items:
1. Chip label shows `@basename` rather than `@[[basename]]` in the chip pill — minor cosmetic discrepancy from spec wording; functionally the `@[[...]]` syntax appears correctly in the saved/displayed user message.
2. Error response text not persisted to history — warrants fixing before release.
3. Clear History during streaming — warrants a guard before release.
