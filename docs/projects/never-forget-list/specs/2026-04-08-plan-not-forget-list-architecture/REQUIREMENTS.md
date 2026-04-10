# Not-Forget-List — Requirements

**Document version:** 1.0  
**Date:** 2026-04-08  
**Status:** Draft — pending architect review

---

## 1. Project Overview

Not-Forget-List is a native Apple-ecosystem task management application inspired by TickTick's breadth of features, Apple Reminders' simplicity of interaction, and Things 3's architectural elegance. The product is built by a single developer for personal use first, with a clear intention to publish publicly and open-source the codebase once the core experience is stable.

**Vision:** A fast, beautiful, cloud-native todo app that lives entirely in the Apple ecosystem, syncs in real time across devices, and grows from a minimal CRUD tool into a full productivity suite across five incremental phases.

**Reference applications:**

- TickTick — feature philosophy, view breadth (Kanban, Calendar, Gantt, Pomodoro)
- Apple Reminders — interaction simplicity, native feel, list + tag model
- Things 3 — architecture model (full-stack Swift, clean data model, desktop + mobile parity)

---

## 2. Target Platforms

| Platform | Minimum OS        | Distribution               |
| -------- | ----------------- | -------------------------- |
| iOS      | iOS 17            | TestFlight → App Store     |
| macOS    | macOS 14 (Sonoma) | TestFlight → Mac App Store |

Both targets share a single SwiftUI codebase using `#if os(iOS)` / `#if os(macOS)` guards only for platform-specific UI overrides. No Android, no web client, no Windows.

---

## 3. User Personas

### Primary — The Developer (Brian)

- React expert, learning Swift/SwiftUI with this project as the vehicle
- Uses iOS daily and macOS for development
- Needs real-time sync between iPhone and MacBook
- Productivity-oriented: uses tags, priorities, and structured lists
- Prefers native UX over cross-platform compromises
- Traditional Chinese is the preferred UI language

### Secondary — Future Public Users (post-publish)

- Apple-ecosystem users who want a capable, open-source TickTick alternative
- May use iPad (must be considered in layout, not explicitly built for Phase 1)
- Expect reliability, speed, and data ownership transparency

---

## 4. Functional Requirements

### Phase 1: Core Todo + Notes (MVP)

**Goal:** A fully functional CRUD task manager with lists, tags, priorities, and a simple note editor. This is the shippable baseline.

#### Tasks

- **FR-1.1** A user can create a task with a title (required, max 500 characters).
- **FR-1.2** A user can add an optional description to a task. The description supports plain text with basic formatting: bold, italic, inline code, bullet lists, numbered lists, and headings (H1–H3). Rich text is stored as a portable format (e.g., Markdown or a JSON document model).
- **FR-1.3** A user can set a due date and optional due time on a task.
- **FR-1.4** A user can set a priority on a task. Priority levels: None, Low, Medium, High. Default is None.
- **FR-1.5** A user can mark a task as complete. Completed tasks are visually distinguished and move to a "Completed" section within their list.
- **FR-1.6** A user can delete a task. Deletion is soft (record marked deleted, not removed from database) with a 30-day retention window before hard delete.
- **FR-1.7** A user can reorder tasks within a list via drag-and-drop. The manual sort order persists across sessions and devices.
- **FR-1.8** A user can set a task's repeat schedule: daily, weekly, monthly, yearly, or a custom interval. When a repeating task is completed, the next occurrence is automatically created.

#### Lists

- **FR-1.9** A user can create named lists (equivalent to TickTick's "lists" or Apple Reminders' "lists"). Lists have a name and an optional color.
- **FR-1.10** A user has a default "Inbox" list that cannot be deleted. New tasks created without an explicit list are placed in Inbox.
- **FR-1.11** A user can organize lists into named groups (folders). A group has a name and contains one or more lists.
- **FR-1.12** A user can reorder lists and groups via drag-and-drop.
- **FR-1.13** A user can archive a list. Archived lists and their tasks are hidden from the main navigation but remain queryable.
- **FR-1.14** A user can delete a list. All tasks within the list are soft-deleted with the same 30-day retention window as individual tasks.

#### Tags

- **FR-1.15** A user can create tags with a name and optional color.
- **FR-1.16** A user can assign zero or more tags to a task.
- **FR-1.17** A user can filter the task view by one or more tags (AND logic: show tasks matching all selected tags).
- **FR-1.18** The system provides a "Tags" smart list in the sidebar that shows all tags and their task counts.

#### Smart Lists / Filters

- **FR-1.19** The system provides built-in smart lists that are always visible in the sidebar:
  - **Today** — tasks with a due date of today or overdue
  - **Tomorrow** — tasks with a due date of tomorrow
  - **Upcoming** — tasks due within the next 7 days, grouped by date
  - **All Tasks** — all non-deleted, non-archived tasks across all lists
  - **Completed** — all completed tasks within the last 30 days
- **FR-1.20** A user can search tasks by keyword across title, description, and tags. Search is scoped to all non-deleted tasks and returns results in real time as the user types (debounced at 300 ms).

#### Notes (Simple Editor)

- **FR-1.21** A task's description field functions as a lightweight note editor, not a separate entity. There is no standalone "Note" object in Phase 1.
- **FR-1.22** The description editor renders formatted output in view mode and switches to an editable mode on tap/click. It does not require a separate "Edit" screen navigation push.
- **FR-1.23** The editor supports inline checklist items (sub-tasks) within the description. Checking off a sub-task item does not affect the parent task's completion state.

---

### Phase 2: Reminders

**Goal:** Let users receive push notifications for time-sensitive tasks.

- **FR-2.1** A user can add one or more reminders to a task. Each reminder is a specific date + time.
- **FR-2.2** A reminder delivers a push notification to all of the user's logged-in devices. The notification displays the task title and list name.
- **FR-2.3** A user can set a location-based reminder (geofence trigger: arriving at or leaving a named location). This requires CoreLocation permission.
- **FR-2.4** Tapping a notification deep-links the user directly to the task detail view.
- **FR-2.5** A user can snooze a notification from the notification banner. Snooze duration options: 15 minutes, 1 hour, tomorrow at 9 AM.
- **FR-2.6** The system sends a daily "Today Summary" notification at a user-configured time (default: 8 AM) listing the count and titles of tasks due today. The user can disable this in Settings.
- **FR-2.7** All reminder scheduling survives app restart and device reboot. Reminders are re-registered on app launch if the local notification store has been cleared.

---

### Phase 3: Multi-View (Kanban, Calendar, Gantt)

**Goal:** Allow users to visualize and interact with tasks in three additional views beyond the default list view.

#### Kanban View

- **FR-3.1** Any list can be displayed in Kanban view. The user switches between List and Kanban via a view-mode picker.
- **FR-3.2** Kanban columns map to a task's **status** field. Default statuses: To Do, In Progress, Done. The user can add, rename, and reorder columns per list.
- **FR-3.3** A user can drag a task card from one column to another. Moving a card updates the task's status in real time.
- **FR-3.4** A user can create a new task by tapping a "+" button at the bottom of any column. The task is pre-assigned to that column's status.
- **FR-3.5** Task cards in Kanban view display: title, priority indicator, due date (if set), and assigned tag chips (up to 3 visible, remainder shown as "+N").

#### Calendar View

- **FR-3.6** The Calendar view displays tasks with due dates on a monthly and weekly grid. Tasks without due dates do not appear in this view.
- **FR-3.7** The monthly grid shows a dot indicator per day that has at least one task due. Tapping a day opens a list of tasks for that day below the grid (TickTick-style split view).
- **FR-3.8** The weekly view shows tasks as tappable chips within time slots. Tasks with only a date (no time) appear in an all-day row at the top.
- **FR-3.9** A user can drag a task chip in the weekly view to a new time slot to reschedule it. The updated due date/time is persisted.
- **FR-3.10** The Calendar view integrates with the system calendar (EventKit) in read-only mode — system calendar events appear as non-interactive grey blocks for context.

#### Gantt View

- **FR-3.11** The Gantt view is available at the list level. It requires tasks to have both a start date and a due date to render a bar; tasks with only a due date are shown as milestones (diamond marker).
- **FR-3.12** The time axis is horizontally scrollable, showing days grouped by week. The default zoom level shows 4 weeks. The user can pinch-to-zoom between a 1-week and 12-week range.
- **FR-3.13** Task bars display the task title. Color is inherited from the list color.
- **FR-3.14** A user can drag the leading or trailing edge of a Gantt bar to adjust start/due dates. Changes persist in real time.
- **FR-3.15** Task dependencies (finish-to-start) can be defined between tasks in the same list. The Gantt view renders dependency arrows between bars. Dependency creation is done via the task detail screen, not directly in the Gantt view.
- **FR-3.16** The Gantt view is built with SwiftUI Canvas. No third-party charting library is used.

---

### Phase 4: Pomodoro Timer

**Goal:** Embed a focus timer into the app with system-level visibility.

- **FR-4.1** A user can start a Pomodoro session from any task detail view or from a global "Focus" shortcut in the toolbar. Starting a session associates the session with a specific task (optional — the timer can run without a linked task).
- **FR-4.2** The default Pomodoro configuration is 25-minute focus / 5-minute short break / 15-minute long break after 4 cycles. All durations are user-configurable in Settings.
- **FR-4.3** When a Pomodoro session is active and the app moves to background, the timer continues running and displays as a Live Activity on the Dynamic Island and Lock Screen (ActivityKit). The Live Activity shows: task title, time remaining, and current phase (focus/break).
- **FR-4.4** The system plays an audio cue (user-selectable, with silent option) at the end of each focus or break interval.
- **FR-4.5** A user can pause, resume, or abandon an active session. Abandoning a session does not record it as a completed Pomodoro.
- **FR-4.6** Completed Pomodoro sessions are recorded: timestamp, duration, linked task (if any). This data is stored in Supabase and is the foundation for future analytics.
- **FR-4.7** The task detail view shows the count of completed Pomodoros for that task.
- **FR-4.8** A daily Pomodoro count is visible on the app's home screen widget (minimum: a simple count widget showing today's completed sessions).

---

### Phase 5: Cross-Device Sync

**Goal:** Guarantee that changes made on any device appear on all other devices in real time, with a clear and deterministic conflict resolution strategy.

- **FR-5.1** Any create, update, or delete operation performed on one device is reflected on all other signed-in devices within 3 seconds under normal network conditions (via Supabase Realtime).
- **FR-5.2** The conflict resolution strategy is Last-Write-Wins (LWW) based on a server-assigned `updated_at` timestamp. The device with the most recent write wins. This is acceptable because the app is used by a single user across their own devices.
- **FR-5.3** When the device is offline, the user can continue creating and editing tasks. All changes are queued in a local pending-operations log.
- **FR-5.4** When the device reconnects, the pending operations queue is replayed against the server in chronological order. Conflicts are resolved via LWW. The user is not prompted to resolve conflicts manually.
- **FR-5.5** The sync status is visible to the user in the sidebar footer: "Synced", "Syncing...", or "Offline — N changes pending".
- **FR-5.6** A user can sign in on a new device and receive a full data download within 10 seconds for a dataset of up to 10,000 tasks.
- **FR-5.7** The authentication mechanism uses Supabase Auth with Sign in with Apple as the primary identity provider. Email/password is a secondary option.

---

## 5. Non-Functional Requirements

### NFR-1: Performance

- **NFR-1.1** The app launches to an interactive state (list visible, tasks loaded) within 1.5 seconds on an iPhone 14 or newer under normal conditions.
- **NFR-1.2** Scrolling through a list of 500 tasks maintains 60 fps. Lists over 500 tasks use virtual/lazy rendering (SwiftUI `LazyVStack`).
- **NFR-1.3** Search results appear within 300 ms of the user stopping typing (debounce + local index query).
- **NFR-1.4** Any user-initiated write (create, update, delete, reorder) must produce visible UI feedback within 100 ms, regardless of network state (optimistic UI update before server confirmation).

### NFR-2: Security and Authentication

- **NFR-2.1** All data is scoped to the authenticated user via Supabase Row-Level Security (RLS) policies. No user can query another user's data through the API.
- **NFR-2.2** Authentication tokens are stored in the system Keychain, not in UserDefaults or any file on disk.
- **NFR-2.3** The app requires no account for local use in Phase 1 (guest mode with local-only storage). Sign-in is required for sync (Phase 5).
- **NFR-2.4** API requests to Supabase use the anon key client-side. Service-role keys never appear in the client codebase.

### NFR-3: Data Model

- **NFR-3.1** The canonical data store is PostgreSQL (via Supabase). The client connects directly to Supabase with in-memory caching (`@Observable` state). No local database mirror. In Phase 5, a lightweight pending-operations queue (JSON file or SwiftData) is introduced for offline writes only — not a full data replica.
- **NFR-3.2** Every syncable entity (Task, List, Tag, Group) has the following base fields: `id` (UUID), `user_id` (UUID FK), `created_at` (timestamptz), `updated_at` (timestamptz), `deleted_at` (timestamptz, nullable).
- **NFR-3.3** Sort order for user-reorderable entities is stored as a fractional index string (e.g., LexoRank or similar) to avoid full-list re-indexing on every reorder.
- **NFR-3.4** The rich text description is stored as a portable format. Markdown is the default choice unless a document-model format (e.g., a JSON schema) is required by the chosen editor component.

### NFR-4: Offline Behavior

- **NFR-4.1** The app is cloud-first: Supabase is the source of truth. Offline mode is a graceful degradation, not a design target.
- **NFR-4.2** All data visible on screen at the time of going offline remains readable offline.
- **NFR-4.3** Writes made offline are queued locally and synced on reconnection. The user is never blocked from editing due to lack of connectivity.
- **NFR-4.4** If a sync conflict cannot be resolved automatically (edge case: two devices edit the same field offline simultaneously), the server-side timestamp wins and the losing change is discarded silently. No data loss occurs for the task entity itself.

### NFR-5: Accessibility

- **NFR-5.1** All interactive elements have accessible labels compatible with VoiceOver.
- **NFR-5.2** The app respects the system Dynamic Type size settings. No text is hard-coded at a fixed point size that prevents scaling.
- **NFR-5.3** Color is never the sole differentiator for task priority or status. A shape or label is always present alongside color.
- **NFR-5.4** The app supports Reduce Motion: all non-essential animations are disabled when the user enables Reduce Motion in Accessibility settings.

### NFR-6: Localization

- **NFR-6.1** The app ships with two supported locales: Traditional Chinese (zh-Hant) and English (en).
- **NFR-6.2** Traditional Chinese is the default locale for the developer build. English is the default for the App Store release.
- **NFR-6.3** All user-facing strings are externalized in `.xcstrings` catalogs. No hardcoded strings in view code.
- **NFR-6.4** Date and time formatting uses the system locale formatter (`Date.FormatStyle`) — it must not be hardcoded to any locale or calendar system.

---

## 6. Technical Constraints

| Constraint                  | Detail                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Language                    | Swift 6 (strict concurrency)                                                                              |
| UI Framework                | SwiftUI (minimum: iOS 17 / macOS 14 API surface)                                                          |
| Backend                     | Supabase (PostgreSQL 15, Realtime via websocket, Auth, Storage)                                           |
| Local persistence           | None in Phase 1–4 (in-memory only). Phase 5 adds a lightweight pending-ops queue (SwiftData or JSON file) |
| Networking                  | Supabase Swift client (`supabase-swift`) for API calls; URLSession for any custom requests                |
| Push notifications          | Apple Push Notification service (APNs) via Supabase Edge Functions or a thin server-side trigger          |
| Background timer            | ActivityKit (Live Activity), BackgroundTasks framework                                                    |
| No third-party UI libraries | All UI is native SwiftUI + AppKit/UIKit bridges where necessary. No web views.                            |
| Testing                     | XCTest for unit/integration; Swift Testing framework for new tests; XCUITest for critical flows           |
| CI                          | GitHub Actions — build + test on push to main                                                             |
| Distribution                | Xcode Cloud or Fastlane for TestFlight delivery                                                           |

---

## 7. Success Criteria

Each phase is considered "done" when all of its functional requirements pass acceptance testing on both iOS and macOS, and the following phase-level criteria are met.

### Phase 1 Done When:

- A task can be created, edited, completed, and deleted on both platforms.
- Lists, groups, and tags are fully CRUD-able.
- All five built-in smart lists (Today, Tomorrow, Upcoming, All Tasks, Completed) return correct results.
- Keyword search returns results within 300 ms on a dataset of 1,000 tasks.
- The description editor renders bold, italic, bullet lists, numbered lists, and inline checklists correctly.
- Manual sort order of tasks persists across app restarts.

### Phase 2 Done When:

- A scheduled reminder fires a local push notification at the correct time after app restart and device reboot.
- Tapping the notification navigates to the correct task.
- Snooze options (15 min, 1 hr, tomorrow 9 AM) work correctly.
- The daily summary notification fires at the user-configured time and is suppressible.

### Phase 3 Done When:

- Kanban: drag-and-drop between columns updates task status in real time on a second device.
- Calendar: tasks appear on the correct day; dragging a task to a new time slot updates the due date.
- Gantt: bars render for tasks with start + due dates; dragging a bar edge correctly updates dates; dependency arrows render for linked tasks.
- All three views work on both iOS and macOS without layout regressions.

### Phase 4 Done When:

- Starting a Pomodoro session on a task and backgrounding the app shows a Live Activity with correct countdown.
- Audio cue fires at interval end.
- Completed sessions are stored in Supabase and the task detail shows the correct Pomodoro count.
- The home screen widget shows the correct today count.

### Phase 5 Done When:

- A task created on iOS appears on macOS within 3 seconds on a local Wi-Fi network.
- Editing a task offline and reconnecting results in the edit being synced without user intervention.
- Sign in on a new device and full data load (1,000 tasks) completes within 10 seconds.
- Sync status indicator correctly reflects "Synced", "Syncing...", and "Offline" states.

---

## 8. Risks and Mitigations

| #   | Risk                                               | Severity   | Mitigation                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | Rich text editor: no mature SwiftUI package exists | High       | Bridge `UITextView` (iOS) / `NSTextView` (macOS) using `UIViewRepresentable` / `NSViewRepresentable`. Target Markdown as storage format to reduce editor complexity. Spike required before Phase 1 is finalized.                             |
| R-2 | Gantt chart: no Swift packages available           | High       | Build with SwiftUI `Canvas`. Scope Phase 3 Gantt to read + basic drag; avoid complex dependency logic in MVP of Phase 3.                                                                                                                     |
| R-3 | Swift concurrency learning curve                   | Medium     | Developer is experienced in async patterns from React/JS. Swift's `async/await` and `Actor` model are the primary learning surface. Allocate extra time for Phase 1 architecture. Use TCA or MVVM as a clear, consistent pattern throughout. |
| R-4 | Supabase Realtime reliability under poor network   | Medium     | Implement exponential backoff reconnect logic in the sync layer. Use the pending-operations queue (FR-5.3) as the source of truth, not the websocket.                                                                                        |
| R-5 | Kanban drag-and-drop is limited in SwiftUI         | Low-Medium | SwiftUI `.draggable` / `.dropDestination` available since iOS 16. Sufficient for basic Kanban. Custom gesture recognizer may be needed for smooth UX — budget time for this.                                                                 |
| R-6 | ActivityKit Live Activity API changes              | Low        | ActivityKit is stable as of iOS 16.2. Pin to a minimum deployment target that guarantees the API.                                                                                                                                            |
| R-7 | LexoRank sort order implementation complexity      | Low        | Use an existing Swift LexoRank implementation or a simpler fractional index library. This is a solved problem — avoid reimplementing from scratch.                                                                                           |
| R-8 | App Store review for first Swift project           | Low        | Follow App Store guidelines from day one. Sign in with Apple is required if any other social login is offered (NFR-2.3 complies).                                                                                                            |

---

## 9. Out of Scope

The following are explicitly excluded from this product. They may be revisited post-launch but must not influence any current architecture or implementation decisions.

- **Android client** — not in scope, ever (Apple-ecosystem-only product)
- **Web client** — no browser-based access; Supabase Studio is for developer use only
- **Windows / Linux** — no cross-platform runtime (no Flutter, no Electron)
- **iPad-optimized layouts** — iPad will work (it runs iOS apps) but no split-view, Pencil, or Stage Manager optimization in any phase
- **Team / collaboration features** — shared lists, task assignment, comments, @mentions are not planned
- **AI / natural language input** — no NLP task parsing (e.g., "remind me tomorrow at 3pm" as free text)
- **Habit tracking** — recurring tasks exist (FR-1.8) but dedicated habit streaks and analytics are not in scope
- **Time tracking beyond Pomodoro** — no manual time log entry, no integration with Toggl or similar
- **File attachments** — tasks do not support attached files or images in any phase
- **Public API / webhooks** — no developer-facing API surface
- **Billing / subscription** — personal use only; no in-app purchase or subscription infrastructure
- **Data export** — CSV/JSON export is desirable but not required for any phase

---

_End of Requirements Document_
