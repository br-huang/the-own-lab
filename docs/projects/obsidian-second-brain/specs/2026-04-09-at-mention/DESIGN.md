# Design: @ File Mention + Chat History Persistence

## Codebase Analysis

### Existing Patterns and Conventions
- **DOM construction**: All UI uses Obsidian's `createDiv()`, `createEl()` helpers -- no frameworks, no JSX. The `ChatView` class extends `ItemView` and builds its entire DOM tree imperatively in `onOpen()`.
- **Streaming pattern**: `RagEngine.query()` is an `AsyncGenerator<RagResponse>` yielding `token`, `sources`, and `error` events. The chat view consumes this with `for await...of`. This generator signature must be preserved.
- **Data storage**: The plugin uses `this.loadData()` / `this.saveData()` on the Plugin class. Currently `loadSettings()` does `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())`, which means the entire data.json IS the settings object. This is important for the chat history storage strategy.
- **Type conventions**: All shared interfaces live in `src/types.ts`. Union types for response shapes. No classes for data -- plain interfaces only.
- **Style conventions**: All styles in root `styles.css`, prefixed with `kb-chat-`. Obsidian CSS variables used throughout (`var(--interactive-accent)`, `var(--background-secondary)`, etc.).
- **Input area**: Currently a simple flex row with `<textarea>` + `<button>`. The textarea value is read directly via `this.inputEl.value`. Send triggered by Cmd/Ctrl+Enter or click.
- **File access**: The plugin has `this.app.vault` available via `ItemView`. Files are read with `vault.read()` or `vault.cachedRead()`. File listing via `vault.getMarkdownFiles()`.

### Key Files
| File | Role | Lines |
|------|------|-------|
| `src/ui/chat-view.ts` | Chat UI, message rendering, submit handling | ~235 |
| `src/core/rag-engine.ts` | Vector search + LLM streaming | ~79 |
| `src/types.ts` | All shared interfaces | ~88 |
| `src/main.ts` | Plugin wiring, view registration | ~180 |
| `styles.css` | All CSS | ~150 |

---

## Proposed Approach

### Feature 1: @ File Mention

**Architecture**: Plain DOM autocomplete built directly into `ChatView`. No new files -- all logic lives in `chat-view.ts` as private methods, consistent with how the existing input handling works.

**Input area refactor**: The current `<textarea>` stays. Chips are rendered as inline `<span>` elements inside a wrapper `<div>` that sits above the textarea (a "chip tray" pattern). This avoids the complexity of contentEditable while keeping chips visually associated with the input.

Layout:
```
┌─ .kb-chat-input-area ──────────────────────┐
│ ┌─ .kb-chat-input-wrapper (relative) ────┐ │
│ │ ┌─ .kb-chat-chip-tray ──────────────┐  │ │
│ │ │ [@Note A ×] [@Note B ×]           │  │ │
│ │ └───────────────────────────────────┘  │ │
│ │ ┌─ textarea ────────────────────────┐  │ │
│ │ │ What is the summary of...         │  │ │
│ │ └───────────────────────────────────┘  │ │
│ │ ┌─ .kb-chat-autocomplete (absolute) ┐  │ │
│ │ │ FileA                              │  │ │
│ │ │ FileB (highlighted)                │  │ │
│ │ │ FileC                              │  │ │
│ │ └───────────────────────────────────┘  │ │
│ └────────────────────────────────────────┘ │
│ [Send]                                      │
└─────────────────────────────────────────────┘
```

**Autocomplete trigger**: On every `input` event, scan backward from cursor to find `@` preceded by a word boundary (start, space, newline). Extract the filter substring after `@`. If filter is active, query `vault.getMarkdownFiles()`, filter by case-insensitive substring match on path, take first 10, render dropdown. Debounce at 100ms.

**Chip data model**: An in-memory array `mentionedFiles: { filePath: string; displayName: string }[]` on the ChatView instance. Chips are rendered as DOM spans in the chip tray. Each chip has a `data-filepath` attribute and an `x` close button. Backspace at position 0 in the textarea removes the last chip.

**RAG integration**: `RagEngine.query()` gains an optional second parameter `forcedFiles?: string[]`. Before building the context string, the engine reads each forced file via `vault.cachedRead()`, truncates to 100KB, and prepends as `[Forced context: <title> (<path>)]\n<content>`. The vault reference must be passed to RagEngine (currently it does not have one).

### Feature 2: Chat History Persistence

**Storage strategy**: The current `loadData()`/`saveData()` pattern stores settings as the top-level object in data.json. To add chat history without breaking existing settings, we introduce a wrapper structure:

```typescript
interface PluginData {
  settings: PluginSettings;
  chatHistory: ChatMessage[];
}
```

`loadSettings()` and `saveSettings()` on the Plugin are updated to read/write from `data.settings`. A new pair of methods `loadChatHistory()` / `saveChatHistory()` operate on `data.chatHistory`. On first load after upgrade, if `data.settings` is undefined but `data.openaiApiKey` exists, migrate: treat the entire loaded object as legacy settings.

**ChatView data access**: The Plugin passes two callbacks to ChatView's constructor:
- `loadChatHistory: () => Promise<ChatMessage[]>`
- `saveChatHistory: (messages: ChatMessage[]) => Promise<void>`

This avoids giving ChatView a reference to the Plugin itself and keeps the dependency narrow.

**Save timing**: After each user message is added to the in-memory array, persist immediately. After the assistant streaming completes (in the `finally` block), persist again. This means at most 2 saveData() calls per exchange.

**Message cap**: Before persisting, if length > 100, slice to keep the last 100 entries.

---

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **contentEditable div** for chips inline with text | Chips visually inline with text, feels like Slack | Complex cursor management, cross-browser issues, breaks existing textarea patterns |
| **Chip tray above textarea** (chosen) | Simple DOM, textarea behavior unchanged, chips clearly separated | Chips not inline with text -- slightly less polished feel |
| **Separate file for autocomplete** (e.g., `src/ui/autocomplete.ts`) | Better separation of concerns | Over-engineering for ~100 lines of logic; inconsistent with existing single-file pattern |
| **Separate data.json file** for chat history (via `adapter.write`) | Zero risk to settings | Non-standard in Obsidian plugin ecosystem; requires manual path construction |
| **Plugin loadData/saveData with wrapper** (chosen) | Standard Obsidian pattern; atomic writes | Requires migration logic for existing settings |

---

## Key Decisions

1. **Chip tray above textarea** (not contentEditable): Because it preserves the existing textarea behavior, avoids cursor management complexity, and the visual trade-off is minimal for a sidebar chat panel.

2. **Autocomplete as absolute-positioned div below textarea**: Because it avoids covering the message history and is the standard dropdown pattern users expect.

3. **Vault reference passed to RagEngine**: RagEngine currently has no access to `Vault`. We add it as a constructor parameter so `forcedFiles` can read file content. This is a small, backward-compatible change.

4. **Wrapper object for plugin data**: `{ settings: PluginSettings, chatHistory: ChatMessage[] }` with migration logic. This is the safest pattern that uses Obsidian's native data API.

5. **Callbacks for data access in ChatView**: Rather than passing the Plugin instance, pass `loadChatHistory`/`saveChatHistory` lambdas. This keeps ChatView decoupled from the Plugin class.

6. **Debounce autocomplete at 100ms**: Prevents excessive filtering on fast typing without noticeable lag.

7. **@ trigger only after word boundary**: Regex check that the character before `@` is start-of-input, space, or newline. This prevents false triggers on pasted URLs containing `@`.

---

## Dependencies & Risks

- **Risk: Data migration on upgrade**: Users with existing data.json containing flat settings will need migration. **Mitigation**: `loadSettings()` detects the old shape (has `openaiApiKey` at top level but no `settings` key) and wraps it automatically on first load. Next `saveSettings()` writes the new shape.

- **Risk: Large file injection fills LLM context**: A 100KB forced file is ~25K tokens. **Mitigation**: Hard cap at 100KB per file with a truncation warning appended. The requirements explicitly specify this.

- **Risk: saveData() during streaming could race**: Two rapid saves (user message + assistant message) could theoretically overlap. **Mitigation**: Obsidian's `saveData()` is async but writes to a single file atomically. We await each call before proceeding. The second save only happens after streaming completes.

- **Risk: Autocomplete performance with large vaults**: `getMarkdownFiles()` returns all files; filtering 10K+ files on every keystroke could lag. **Mitigation**: 100ms debounce + simple `includes()` check is fast enough for 10K strings. If needed later, we can cache the file list.

---

## Files Affected

- `src/types.ts` -- Add `ChatMessage` interface and `PluginData` interface
- `src/core/rag-engine.ts` -- Add `vault` constructor parameter; add `forcedFiles` parameter to `query()`; prepend forced file content to context; deduplicate sources
- `src/ui/chat-view.ts` -- Major changes: chip tray, autocomplete dropdown, @ detection, chip management, history load/save/clear, header bar with Clear button
- `src/main.ts` -- Update data storage to wrapper pattern; pass `vault` to RagEngine; pass `loadChatHistory`/`saveChatHistory` callbacks and `app` reference to ChatView
- `styles.css` -- Add styles for chip tray, chips, autocomplete dropdown, clear button, header bar
