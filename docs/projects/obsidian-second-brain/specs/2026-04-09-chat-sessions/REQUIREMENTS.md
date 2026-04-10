# Requirements: Chat Sessions (Multi-Session Chat)

## Overview

Refactor single-thread chat history into multi-session conversations. Users can create, switch between, and delete independent chat sessions, similar to ChatGPT's conversation list.

## User Stories

### US-1: Create a New Session

**As a** user, **I want to** start a new chat session **so that** I can ask about a different topic without mixing conversations.

**Acceptance Criteria:**

- A "+ New Chat" button is visible in the header area.
- Clicking it creates a new empty session and switches to it immediately.
- The previous session's messages are preserved on disk.
- The new session appears at the top of the session list.

### US-2: Switch Between Sessions

**As a** user, **I want to** click on a session in the list **so that** I can resume a previous conversation.

**Acceptance Criteria:**

- A session list panel is visible on the left side of the chat view.
- Clicking a session loads its messages into the chat area.
- The previously active session auto-saves before switching.
- The active session is visually highlighted in the list.
- No data loss occurs during switching, even if the user switches rapidly.

### US-3: Auto-Generated Session Titles

**As a** user, **I want** sessions to be titled automatically **so that** I can identify them in the list without manual effort.

**Acceptance Criteria:**

- A new session is titled "New Chat" until the first user message is sent.
- After the first user message, the title is set to the first 30 characters of that message.
- If the message is shorter than 30 characters, the full message is used.
- The title is visible in the session list.

### US-4: Delete a Session

**As a** user, **I want to** delete a session I no longer need **so that** my session list stays manageable.

**Acceptance Criteria:**

- Each session in the list has a delete button (x icon).
- Clicking delete shows a confirmation prompt.
- On confirm, the session is removed from the list and its file is deleted from disk.
- If the deleted session was active, the most recent remaining session becomes active. If no sessions remain, a new empty session is created automatically.

### US-5: Persistent Session State

**As a** user, **I want** my sessions to persist across plugin reloads **so that** I do not lose conversations.

**Acceptance Criteria:**

- On plugin load, the last active session is restored (its messages are shown).
- The session list is populated from the persisted session index.
- Sessions are stored as individual JSON files in `{vault}/.obsidian-kb/sessions/`.
- The session index (id, title, dates, activeSessionId) is stored in plugin `data.json`.

### US-6: Session List Display

**As a** user, **I want** the session list to show session titles and relative dates **so that** I can quickly find recent conversations.

**Acceptance Criteria:**

- Sessions are sorted by `updatedAt` descending (most recent first).
- Each entry shows the session title and a relative date label:
  - "Today" for sessions updated today
  - "Yesterday" for sessions updated yesterday
  - Otherwise, the short date (e.g., "Apr 7")
- Maximum 50 sessions are displayed; older sessions remain on disk but are not listed.

### US-7: Migration from Single History

**As a** user upgrading from the previous version, **I want** my existing chat history to be preserved **so that** I do not lose my conversation.

**Acceptance Criteria:**

- If `pluginData.chatHistory` contains messages and no sessions exist on disk, a migration runs automatically.
- The existing messages are saved as the first session, titled from the first user message.
- After migration, `chatHistory` is cleared from `data.json`.
- Migration runs exactly once; subsequent loads do not re-migrate.

### US-8: First-Load Default Session

**As a** new user, **I want** a session to be created automatically on first open **so that** I can start chatting immediately.

**Acceptance Criteria:**

- If no sessions exist (fresh install, or all deleted), a new empty session is created on chat view open.
- The session is titled "New Chat".

### US-9: Collapsible Session List

**As a** user with limited screen space, **I want to** collapse the session list **so that** I have more room for the chat area.

**Acceptance Criteria:**

- A toggle button (hamburger or chevron) collapses/expands the session list panel.
- When collapsed, the panel is hidden and the chat area takes full width.
- Collapse state is not persisted (defaults to expanded on reload).

## Scope Boundaries

### In Scope

- Multi-session UI with session list panel and chat panel
- Session CRUD (create, read, update, delete)
- File-based session storage (`{vault}/.obsidian-kb/sessions/`)
- Session index in plugin data.json
- Migration from single chatHistory array
- Auto-title generation
- Collapsible session list
- Restore last active session on load

### Out of Scope

- Session search / filtering
- Session export (JSON, Markdown)
- Session sharing
- Manual session renaming (auto-title only)
- Session pinning or favoriting
- Cross-device sync (relies on vault sync, which is the user's responsibility)

## Constraints

- The chat view is an Obsidian `ItemView` in the right sidebar, typically 300-400px wide.
- Session list panel must be narrow: 120-150px.
- Session file I/O must use Node.js `fs` (not the Obsidian Vault API), since `.obsidian-kb/` is plugin data, not user notes.
- Per-session message limit: 100 messages (existing constraint, unchanged).
- Max 50 sessions displayed in the list.
- All existing features must continue to work: @ file mention, URL ingest, RAG query, streaming responses.
- Plain DOM manipulation only (no React, no UI framework).
