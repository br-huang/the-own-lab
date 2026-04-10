# Design: Chat Sessions

## Codebase Analysis

### Current Architecture

- **`ChatView`** (`src/ui/chat-view.ts`): A single `ItemView` class (~600 lines) that owns the entire chat UI: header, message list, input area, autocomplete, chip tray. It receives `loadChatHistory` and `saveChatHistory` callbacks from the plugin.
- **`PluginData`** (`src/types.ts`): `{ settings, chatHistory }` where `chatHistory` is a flat `ChatMessage[]` stored in Obsidian's `data.json` via `this.loadData()` / `this.saveData()`.
- **`ObsidianKBPlugin`** (`src/main.ts`): Owns `pluginData`, constructs `ChatView` with load/save callbacks, and handles persistence via Obsidian's built-in data API.
- **Styles** (`styles.css`): Flat layout — `.kb-chat-container` is a vertical flex with header, messages, input area. No sidebar.
- **Storage**: The plugin already uses `{vault}/.obsidian-kb/` for vector store data (see `VectorStore` constructor). Session files will live alongside.

### Key Patterns

- DOM is built imperatively using Obsidian's `createDiv`, `createEl` helpers.
- No state management library; state is plain class fields.
- File I/O for plugin data uses Node.js `fs` (via `FileSystemAdapter.getBasePath()` to get vault path).
- The `VectorStore` class demonstrates the existing pattern for file-based storage in `.obsidian-kb/`.

## Proposed Approach

### Architecture: SessionStore + Split ChatView

Introduce a `SessionStore` class that owns session CRUD and file I/O, and refactor `ChatView` to render a two-panel layout (session list + chat panel).

```
ObsidianKBPlugin
  ├── SessionStore          (new: session CRUD, file I/O)
  └── ChatView
        ├── Session List     (new: left panel, session items)
        └── Chat Panel       (refactored: existing chat UI)
```

**Data flow:**

1. On plugin load: `SessionStore.initialize()` reads the session index from `data.json`, ensures sessions dir exists.
2. `ChatView` receives `SessionStore` reference. On `onOpen()`, it renders two-panel layout and loads the active session.
3. Session switching: ChatView calls `sessionStore.saveSession(current)`, then `sessionStore.loadSession(newId)`, re-renders messages.
4. New session: ChatView calls `sessionStore.createSession()`, switches to it.
5. Delete session: ChatView calls `sessionStore.deleteSession(id)`, switches to next available.
6. Auto-save: on every `pushHistory()`, the current session is saved to disk.

### Alternatives Considered

| Approach                                       | Pros                                                                                                                      | Cons                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **A: SessionStore class (chosen)**             | Clean separation of concerns. ChatView stays focused on UI. Testable independently. Follows existing VectorStore pattern. | Adds a new file/class.                                                                                                            |
| **B: Session logic inside ChatView**           | Fewer files. No new abstractions.                                                                                         | ChatView is already ~600 lines. Mixing I/O with UI is hard to test and maintain.                                                  |
| **C: Separate SessionListView (own ItemView)** | Full separation. Could be placed anywhere in workspace.                                                                   | Obsidian sidebar panels are already tight. Two views need cross-communication (events/callbacks). Over-engineered for this scope. |

**Decision: Approach A.** SessionStore as a standalone class mirrors the existing `VectorStore` pattern and keeps ChatView manageable.

## Key Decisions

### KD-1: File-based session storage (not data.json)

**Choice:** Each session stored as `{vault}/.obsidian-kb/sessions/{id}.json`. Session index (lightweight metadata) in `data.json`.
**Rationale:** Sessions with 100 messages can be 50-100KB each. Storing 50 sessions in `data.json` would make it 2.5-5MB, slowing down every `loadData()`/`saveData()` call (which also stores settings). Separate files allow loading only the active session.

### KD-2: Session index in data.json

**Choice:** Store `SessionIndexEntry[]` (id, title, createdAt, updatedAt) and `activeSessionId` in `PluginData`.
**Rationale:** Fast session list rendering without reading all session files. Obsidian's `data.json` is the right place for small metadata that must persist across reloads.

### KD-3: Node.js fs for session I/O

**Choice:** Use `fs.promises` (readFile, writeFile, unlink, mkdir) for session files.
**Rationale:** `.obsidian-kb/` is plugin infrastructure, not user notes. The Vault API would expose these files in Obsidian's file explorer, which is undesirable. This is consistent with how `VectorStore` operates.

### KD-4: Two-panel layout via CSS flexbox

**Choice:** `.kb-chat-container` becomes a horizontal flex. Left child is `.kb-session-list` (120-150px fixed). Right child is `.kb-chat-main` (flex: 1) containing the existing vertical layout.
**Rationale:** Minimal DOM restructuring. The existing chat UI moves into `.kb-chat-main` almost unchanged.

### KD-5: Auto-title from first user message

**Choice:** Title = first 30 chars of the first user message text, with chip mentions stripped.
**Rationale:** Simple, predictable. Users can identify sessions by what they asked. No LLM call needed (that would add latency and cost for a cosmetic feature).

### KD-6: Session body layout remains vertical

**Choice:** The right panel (`.kb-chat-main`) keeps the existing vertical flex layout: header, messages, input area.
**Rationale:** Minimal refactoring of the existing working chat UI. Header changes slightly (adds "+ New Chat" button, removes "Clear History" which is replaced by delete-session).

### KD-7: Collapsible session list via toggle button

**Choice:** A small toggle button in the header area. Collapsed state hides the session list panel via `display: none`. Not persisted across reloads.
**Rationale:** The sidebar is narrow. Users need the option to reclaim space. Non-persistence keeps it simple.

## Data Model

```typescript
// New types in src/types.ts

interface ChatSession {
  id: string; // crypto.randomUUID()
  title: string; // auto: first user message, truncated to 30 chars
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  messages: ChatMessage[]; // existing ChatMessage type, unchanged
}

interface SessionIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// Updated PluginData
interface PluginData {
  settings: PluginSettings;
  chatHistory: ChatMessage[]; // kept for migration; empty after migration
  sessionIndex: SessionIndexEntry[];
  activeSessionId: string | null;
}
```

## SessionStore API

```typescript
// src/core/session-store.ts

class SessionStore {
  constructor(vaultPath: string, pluginSaveData: () => Promise<void>);

  // Lifecycle
  async initialize(pluginData: PluginData): Promise<void>;
  // Ensures .obsidian-kb/sessions/ dir exists
  // Runs migration if needed (chatHistory -> first session)

  // CRUD
  async createSession(): Promise<ChatSession>;
  async loadSession(id: string): Promise<ChatSession>;
  async saveSession(session: ChatSession): Promise<void>;
  async deleteSession(id: string): Promise<void>;

  // Index
  getSessionIndex(): SessionIndexEntry[]; // sorted by updatedAt desc, max 50
  getActiveSessionId(): string | null;
  setActiveSessionId(id: string): void;

  // Migration
  async migrateFromChatHistory(messages: ChatMessage[]): Promise<ChatSession>;
}
```

## Dependencies and Risks

| Risk                                           | Impact                    | Mitigation                                                                                        |
| ---------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| Session file corruption (partial write)        | Lost conversation         | Write to temp file, then rename (atomic). Catch JSON parse errors and log, skip corrupt sessions. |
| Race condition on rapid session switching      | Data loss or stale render | Disable session list clicks while a save is in progress (use a `saving` flag).                    |
| Migration runs twice if plugin data save fails | Duplicate session         | Check if sessions dir already has files before migrating.                                         |
| Sidebar too narrow for two-panel layout        | Unusable UI               | Collapsible session list. Minimum width of 120px for list, which fits in a 300px sidebar.         |
| `crypto.randomUUID()` not available            | Crash on older Electron   | Fallback to `Date.now().toString(36) + Math.random().toString(36).slice(2)`.                      |

## Files Affected

| File                        | Change                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types.ts`              | Add `ChatSession`, `SessionIndexEntry`. Update `PluginData` with `sessionIndex`, `activeSessionId`.                                                            |
| `src/core/session-store.ts` | **New file.** Session CRUD, file I/O, migration logic.                                                                                                         |
| `src/ui/chat-view.ts`       | Major refactor: two-panel layout, session list rendering, session switching. Remove `loadChatHistory`/`saveChatHistory` callbacks, use `SessionStore` instead. |
| `src/main.ts`               | Create `SessionStore`, pass to `ChatView`. Remove `loadChatHistory`/`saveChatHistory` methods. Update `PluginData` loading.                                    |
| `styles.css`                | Add session list panel styles, two-panel layout, active session highlight, collapse toggle.                                                                    |
