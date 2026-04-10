# Implementation Plan: Chat Sessions

## Prerequisites

- Read and understand: `src/types.ts`, `src/main.ts`, `src/ui/chat-view.ts`, `styles.css`
- The plugin uses Node.js `fs` for file I/O (see `VectorStore` for the pattern)
- Vault path is obtained via `FileSystemAdapter.getBasePath()`

## Steps

### Step 1: Update types.ts — Add Session Types

- **Files**: `src/types.ts`
- **Action**: Add new interfaces and update `PluginData`
- **Details**:

Add these interfaces after the existing `ChatMessage` interface (around line 102):

```typescript
export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SessionIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
```

Update the `PluginData` interface (currently lines 104-107) to:

```typescript
export interface PluginData {
  settings: PluginSettings;
  chatHistory: ChatMessage[]; // kept for migration; empty post-migration
  sessionIndex: SessionIndexEntry[];
  activeSessionId: string | null;
}
```

- **Do NOT**: Change any other existing interfaces (`ChatMessage`, `PluginSettings`, etc.). Do not remove `chatHistory` — it is needed for migration.
- **Verify**: `npm run build` succeeds. You will see type errors in `main.ts` because `PluginData` now requires `sessionIndex` and `activeSessionId` — that is expected and will be fixed in Step 8.

---

### Step 2: Create src/core/session-store.ts — Session CRUD

- **Files**: `src/core/session-store.ts` (new file)
- **Action**: Create the `SessionStore` class with file-based session CRUD
- **Signature**:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChatSession, ChatMessage, SessionIndexEntry, PluginData } from '../types';

export class SessionStore {
  private sessionsDir: string;
  private pluginData: PluginData;
  private persistIndex: () => Promise<void>;

  constructor(vaultPath: string, pluginData: PluginData, persistIndex: () => Promise<void>);
  async initialize(): Promise<void>;
  async createSession(): Promise<ChatSession>;
  async loadSession(id: string): Promise<ChatSession>;
  async saveSession(session: ChatSession): Promise<void>;
  async deleteSession(id: string): Promise<void>;
  getSessionIndex(): SessionIndexEntry[];
  getActiveSessionId(): string | null;
  setActiveSessionId(id: string): void;
  async migrateFromChatHistory(messages: ChatMessage[]): Promise<ChatSession>;
}
```

- **Details**:

**Constructor:**

- `sessionsDir = path.join(vaultPath, ".obsidian-kb", "sessions")`
- Store references to `pluginData` and `persistIndex` callback.

**`initialize()`:**

- Create `sessionsDir` recursively: `await fs.mkdir(this.sessionsDir, { recursive: true })`
- If `pluginData.chatHistory.length > 0` AND `pluginData.sessionIndex.length === 0`, call `migrateFromChatHistory(pluginData.chatHistory)`. After migration, set `pluginData.chatHistory = []` and call `persistIndex()`.
- If `pluginData.sessionIndex.length === 0`, call `createSession()` to make a default "New Chat" session, set it as active.

**`createSession()`:**

- Generate ID: `crypto.randomUUID()`. If `crypto.randomUUID` is not available, use fallback: `Date.now().toString(36) + Math.random().toString(36).slice(2)`.
- Create `ChatSession` object: `{ id, title: "New Chat", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] }`.
- Write session file: `await fs.writeFile(path.join(this.sessionsDir, id + ".json"), JSON.stringify(session, null, 2))`.
- Add entry to `pluginData.sessionIndex` (unshift to front).
- Set `pluginData.activeSessionId = id`.
- Call `persistIndex()`.
- Return the session.

**`loadSession(id)`:**

- Read file: `await fs.readFile(path.join(this.sessionsDir, id + ".json"), "utf-8")`.
- Parse JSON. If parse fails or file not found, log error and return a new empty session (also remove the stale index entry).
- Return `ChatSession`.

**`saveSession(session)`:**

- Update `session.updatedAt = new Date().toISOString()`.
- Write to temp file first, then rename (atomic write):
  ```typescript
  const filePath = path.join(this.sessionsDir, session.id + '.json');
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(session, null, 2));
  await fs.rename(tmpPath, filePath);
  ```
- Update the matching entry in `pluginData.sessionIndex` (title, updatedAt).
- Call `persistIndex()`.

**`deleteSession(id)`:**

- Remove the file: `await fs.unlink(path.join(this.sessionsDir, id + ".json"))`. Catch ENOENT (already deleted).
- Remove from `pluginData.sessionIndex`.
- If `pluginData.activeSessionId === id`, set it to the first remaining session's ID, or `null` if none remain.
- Call `persistIndex()`.

**`getSessionIndex()`:**

- Return `pluginData.sessionIndex` sorted by `updatedAt` descending, sliced to first 50.

**`getActiveSessionId()`:**

- Return `pluginData.activeSessionId`.

**`setActiveSessionId(id)`:**

- Set `pluginData.activeSessionId = id`. Call `persistIndex()`.

**`migrateFromChatHistory(messages)`:**

- Determine title: find first message with `role === "user"`. Take first 30 chars of its `text` (strip leading `@[[...]]` chip mentions with regex: `text.replace(/@\[\[[^\]]*\]\]\s*/g, "").slice(0, 30)`). Fallback: "Migrated Chat".
- Create a session with those messages, save to file, add to index. Return it.

- **Do NOT**: Touch any other files in this step. Do not import Obsidian APIs — this class uses only Node.js `fs`.
- **Verify**: The file compiles: `npx tsc --noEmit src/core/session-store.ts` (may need to temporarily ignore main.ts errors). Review that all 6 public methods are implemented.

---

### Step 3: Refactor chat-view.ts — Two-Panel Layout

- **Files**: `src/ui/chat-view.ts`
- **Action**: Restructure `onOpen()` to render a two-panel layout. Import `SessionStore`.
- **Details**:

**Change constructor signature** to accept `SessionStore` instead of `loadChatHistory`/`saveChatHistory`:

```typescript
constructor(
  leaf: WorkspaceLeaf,
  ragEngine: RagEngine,
  urlIngestor: UrlIngestor,
  appRef: App,
  sessionStore: SessionStore,
)
```

Remove fields: `loadChatHistory`, `saveChatHistory`.
Add fields:

```typescript
private sessionStore: SessionStore;
private currentSession: ChatSession | null = null;
private sessionListEl\!: HTMLElement;
private chatMainEl\!: HTMLElement;
private sessionListVisible = true;
```

**Restructure `onOpen()`** — the new DOM hierarchy is:

```
.kb-chat-container (horizontal flex)
  ├── .kb-session-panel (left, 140px fixed width)
  │     ├── .kb-session-panel-header
  │     │     └── "+ New" button
  │     └── .kb-session-list (scrollable)
  │           └── .kb-session-item (repeated)
  └── .kb-chat-main (right, flex: 1, vertical flex)
        ├── .kb-chat-header
        │     ├── toggle button (hamburger)
        │     └── "KB Chat" title
        ├── .kb-chat-messages (existing)
        └── .kb-chat-input-area (existing)
```

Keep all existing input area, autocomplete, chip tray logic exactly as-is. Move them into `.kb-chat-main`.

At the end of `onOpen()`, load the active session:

```typescript
const activeId = this.sessionStore.getActiveSessionId();
if (activeId) {
  await this.switchToSession(activeId);
}
```

- **Do NOT**: Change any autocomplete, chip, or submit logic. Do not change `handleSubmit`, `handleUrlIngest`, `appendToken`, `renderMarkdown`, `renderSources`, `renderError`. These remain exactly the same.
- **Verify**: The chat view opens in Obsidian. You see a left panel (may be empty) and the right panel with the existing chat UI.

---

### Step 4: Implement Session List Rendering

- **Files**: `src/ui/chat-view.ts`
- **Action**: Add methods to render and refresh the session list
- **Signature**:

```typescript
private renderSessionList(): void
private formatRelativeDate(isoDate: string): string
```

- **Details**:

**`renderSessionList()`:**

- Clear `this.sessionListEl` (the `.kb-session-list` div created in Step 3).
- Call `this.sessionStore.getSessionIndex()` to get sorted entries.
- For each entry, create a `.kb-session-item` div containing:
  - A `.kb-session-item-title` span with the entry's `title` (truncated to fit via CSS `text-overflow: ellipsis`).
  - A `.kb-session-item-date` span with `formatRelativeDate(entry.updatedAt)`.
  - A `.kb-session-item-delete` button with text "x" (small, right-aligned, only visible on hover via CSS).
- If `entry.id === this.currentSession?.id`, add class `is-active` to the item.
- Attach click handler on the item: `this.switchToSession(entry.id)`.
- Attach click handler on delete button: `this.handleDeleteSession(entry.id, event)`. The event handler must call `event.stopPropagation()` to prevent triggering the switch.

**`formatRelativeDate(isoDate)`:**

- Parse the ISO string to a Date.
- Compare to today's date (at midnight):
  - Same day: return `"Today"`
  - Yesterday: return `"Yesterday"`
  - Otherwise: return short format like `"Apr 7"` using `date.toLocaleDateString("en-US", { month: "short", day: "numeric" })`.

- **Do NOT**: Change the message rendering or input handling code.
- **Verify**: Session list shows entries with titles and dates. Active session is highlighted.

---

### Step 5: Implement Session Switching

- **Files**: `src/ui/chat-view.ts`
- **Action**: Add the `switchToSession` method
- **Signature**:

```typescript
private async switchToSession(sessionId: string): Promise<void>
```

- **Details**:
- If `this.isStreaming`, return early (do not switch while streaming).
- If `this.currentSession` is not null and has the same ID, return early (already active).
- If `this.currentSession` is not null, save it: `await this.sessionStore.saveSession(this.currentSession)`.
- Load new session: `this.currentSession = await this.sessionStore.loadSession(sessionId)`.
- Set active: `this.sessionStore.setActiveSessionId(sessionId)`.
- Clear `this.messagesEl`.
- Re-render messages from `this.currentSession.messages` (reuse the same logic as the old `restoreHistory`, but read from `this.currentSession.messages` instead of `this.chatHistory`).
- Call `this.renderSessionList()` to update the active highlight.

**Update `restoreHistory()`**: Remove or replace this method. Its logic is now handled by `switchToSession`. If you keep it as a helper called `renderMessages()`, it should iterate `this.currentSession.messages` instead of `this.chatHistory`.

**Remove the `chatHistory` field** from ChatView entirely. All history is now accessed via `this.currentSession.messages`.

- **Do NOT**: Change message rendering (addUserMessage, addAssistantMessage, etc.).
- **Verify**: Click a session in the list. Messages change. Click back. Messages restore. No data loss.

---

### Step 6: Implement New Session and Delete Session

- **Files**: `src/ui/chat-view.ts`
- **Action**: Add handlers for creating and deleting sessions
- **Signature**:

```typescript
private async handleNewSession(): Promise<void>
private async handleDeleteSession(sessionId: string, event: MouseEvent): Promise<void>
```

- **Details**:

**`handleNewSession()`:**

- If `this.isStreaming`, return.
- Save current session if exists: `await this.sessionStore.saveSession(this.currentSession)`.
- Create new: `const session = await this.sessionStore.createSession()`.
- Switch to it: `await this.switchToSession(session.id)`.

**`handleDeleteSession(sessionId, event)`:**

- `event.stopPropagation()`.
- If `this.isStreaming`, return.
- Show confirmation: `if (\!confirm("Delete this session?")) return`.
- If the deleted session is the current one, save is unnecessary.
- Call `await this.sessionStore.deleteSession(sessionId)`.
- If the deleted session was the current one:
  - Get the new active ID from `this.sessionStore.getActiveSessionId()`.
  - If an ID exists, switch to it.
  - If null (no sessions left), create a new session: `await this.handleNewSession()`.
- Call `this.renderSessionList()`.

**Also update `handleClearHistory()`**: This now clears the current session's messages (not a global history). Rename or repurpose:

- Clear `this.currentSession.messages = []`.
- Save session.
- Clear `this.messagesEl`.
- Remove the old "Clear History" button from the header. The delete-session button replaces this concept.

- **Do NOT**: Change the SessionStore methods — they are already implemented.
- **Verify**: "+ New" creates a session and switches. "x" deletes and switches to another. Deleting the last session creates a fresh one.

---

### Step 7: Implement Auto-Title Generation

- **Files**: `src/ui/chat-view.ts`
- **Action**: Update `pushHistory` (or the method that saves messages) to set the session title on first user message
- **Details**:

**In the `pushHistory` method** (or wherever a user message is appended to `this.currentSession.messages`):

After pushing the message, check:

```typescript
if (message.role === 'user' && this.currentSession.title === 'New Chat') {
  // Strip @[[...]] mentions, take first 30 chars
  const cleanText = message.text.replace(/@\[\[[^\]]*\]\]\s*/g, '').trim();
  this.currentSession.title = cleanText.slice(0, 30) || 'New Chat';
  this.renderSessionList(); // refresh to show new title
}
```

**Refactor `pushHistory`** to work with `this.currentSession` instead of `this.chatHistory`:

```typescript
private async pushHistory(message: ChatMessage): Promise<void> {
  if (\!this.currentSession) return;

  this.currentSession.messages.push(message);

  // Cap at 100 messages
  if (this.currentSession.messages.length > 100) {
    this.currentSession.messages = this.currentSession.messages.slice(-100);
  }

  // Auto-title on first user message
  if (message.role === "user" && this.currentSession.title === "New Chat") {
    const cleanText = message.text.replace(/@\[\[[^\]]*\]\]\s*/g, "").trim();
    this.currentSession.title = cleanText.slice(0, 30) || "New Chat";
    this.renderSessionList();
  }

  try {
    await this.sessionStore.saveSession(this.currentSession);
  } catch (err) {
    console.error("KB: Failed to save session", err);
  }
}
```

- **Do NOT**: Change how `handleSubmit` calls `pushHistory` — the call signature (`pushHistory(msg)`) stays the same.
- **Verify**: Type a question in a new session. The session list updates to show the first 30 characters of your question as the title.

---

### Step 8: Update main.ts — Wire SessionStore

- **Files**: `src/main.ts`
- **Action**: Create `SessionStore`, pass to `ChatView`, update `PluginData` loading
- **Details**:

**Update imports:**

```typescript
import { SessionStore } from './core/session-store';
```

Remove imports for `ChatMessage` if no longer used directly.

**Add field:**

```typescript
private sessionStore\!: SessionStore;
```

**Update `pluginData` default:**

```typescript
private pluginData: PluginData = {
  settings: DEFAULT_SETTINGS,
  chatHistory: [],
  sessionIndex: [],
  activeSessionId: null,
};
```

**Update `loadSettings()`** to handle the new fields with defaults:

```typescript
// In the new-format branch:
this.pluginData = {
  settings: Object.assign({}, DEFAULT_SETTINGS, raw.settings),
  chatHistory: Array.isArray(raw.chatHistory) ? raw.chatHistory : [],
  sessionIndex: Array.isArray(raw.sessionIndex) ? raw.sessionIndex : [],
  activeSessionId: raw.activeSessionId ?? null,
};
```

**In `onload()`, after vault path is resolved**, create and initialize SessionStore:

```typescript
this.sessionStore = new SessionStore(vaultPath, this.pluginData, () => this.saveSettings());
await this.sessionStore.initialize();
```

**Update `registerView`** to pass `sessionStore` instead of callbacks:

```typescript
this.registerView(CHAT_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
  return new ChatView(leaf, this.ragEngine, this.urlIngestor, this.app, this.sessionStore);
});
```

**Remove** these methods (they are no longer needed):

- `loadChatHistory()`
- `saveChatHistory()`

- **Do NOT**: Change `refreshProvider()`, `activateChatView()`, or any command registrations.
- **Verify**: `npm run build` succeeds with no errors. Plugin loads in Obsidian. Chat view opens and shows the session list.

---

### Step 9: Update styles.css — Session Panel Styles

- **Files**: `styles.css`
- **Action**: Add styles for the two-panel layout and session list
- **Details**:

**Modify `.kb-chat-container`** to be horizontal flex:

```css
.kb-chat-container {
  display: flex;
  flex-direction: row;
  height: 100%;
  padding: 0;
}
```

**Add new styles** (append to end of file):

```css
/* ─── Session Panel ─── */
.kb-session-panel {
  width: 140px;
  min-width: 120px;
  border-right: 1px solid var(--background-modifier-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kb-session-panel.is-collapsed {
  display: none;
}

.kb-session-panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.kb-session-new-btn {
  width: 100%;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
  color: var(--text-normal);
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
}

.kb-session-new-btn:hover {
  background: var(--background-modifier-hover);
}

.kb-session-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.kb-session-item {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  cursor: pointer;
  border-left: 3px solid transparent;
  position: relative;
}

.kb-session-item:hover {
  background: var(--background-modifier-hover);
}

.kb-session-item.is-active {
  background: var(--background-secondary);
  border-left-color: var(--interactive-accent);
}

.kb-session-item-title {
  font-size: 0.85em;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-session-item-date {
  font-size: 0.75em;
  color: var(--text-muted);
  margin-top: 2px;
}

.kb-session-item-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8em;
  border-radius: 3px;
  display: none;
  align-items: center;
  justify-content: center;
}

.kb-session-item:hover .kb-session-item-delete {
  display: flex;
}

.kb-session-item-delete:hover {
  color: var(--text-error);
  background: var(--background-modifier-error);
}

/* ─── Chat Main Panel ─── */
.kb-chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

/* ─── Toggle Button ─── */
.kb-session-toggle {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 1.1em;
}

.kb-session-toggle:hover {
  color: var(--text-normal);
}
```

- **Do NOT**: Remove or change any existing styles. The existing `.kb-chat-header`, `.kb-chat-messages`, `.kb-chat-input-area`, etc. all continue to work inside `.kb-chat-main`.
- **Verify**: The two-panel layout renders correctly. Session panel is 140px wide. Chat area fills remaining space. Sessions have hover effects and active highlighting. Delete button appears on hover.

---

### Step 10: Implement Collapsible Session Panel

- **Files**: `src/ui/chat-view.ts`
- **Action**: Add toggle button in the chat header to collapse/expand the session panel
- **Details**:

In `onOpen()`, add a toggle button as the first child of `.kb-chat-header`:

```typescript
const toggleBtn = headerEl.createEl("button", {
  cls: "kb-session-toggle",
  attr: { "aria-label": "Toggle session list" },
});
toggleBtn.textContent = "\u2630"; // hamburger character ☰
toggleBtn.addEventListener("click", () => {
  this.sessionListVisible = \!this.sessionListVisible;
  const panel = this.containerEl.querySelector(".kb-session-panel");
  if (panel) {
    panel.toggleClass("is-collapsed", \!this.sessionListVisible);
  }
});
```

- **Do NOT**: Persist collapse state. It resets to expanded on each open.
- **Verify**: Click the hamburger. Session panel hides. Click again. It reappears. Chat area expands to fill the space.

---

### Step 11: Build and End-to-End Verification

- **Files**: All modified files
- **Action**: Build the project and verify all features
- **Details**:

Run `npm run build`. Fix any TypeScript errors.

**Verification checklist:**

1. Fresh install (no existing data): Chat view opens with one "New Chat" session. Session list shows it as active.
2. Send a message: Session title updates to first 30 chars. Message appears. AI responds. Session auto-saves.
3. Click "+ New": New session created at top of list. Chat area clears. Old session preserved.
4. Click old session: Messages from old session load. New session's messages are gone from view (but on disk).
5. Delete a session: Confirmation prompt. Session removed from list and disk. If active, switches to another.
6. Delete last session: A new empty session is created automatically.
7. Reload plugin: Last active session restores. Session list populates.
8. Migration: If `data.json` has `chatHistory` with messages, they appear as the first session after upgrade. `chatHistory` is cleared.
9. Collapse toggle: Session panel hides/shows. Chat area resizes.
10. All existing features work: @ mention, autocomplete, URL ingest, streaming, sources.

- **Do NOT**: Skip the migration test — it is easy to break.
- **Verify**: All 10 checklist items pass.
