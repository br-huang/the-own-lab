# ADR-001: Not-Forget-List Architecture — SwiftUI + Supabase Cloud-First

**Date:** 2026-04-08  
**Status:** Proposed  
**Companion documents:** [REQUIREMENTS.md](./REQUIREMENTS.md), [DESIGN.md](./DESIGN.md)

---

## Context

Not-Forget-List is a native Apple-ecosystem task management application inspired by TickTick, Apple Reminders, and Things 3. It targets iOS 17 and macOS 14 from a single SwiftUI codebase, using Supabase as the cloud backend. The product is being built by a single developer (Brian) who is an experienced React engineer learning Swift/SwiftUI through this project.

The architecture must satisfy several competing constraints:

1. **Learning vehicle** — This is the developer's first Swift project. The architecture must be approachable enough to learn Swift, SwiftUI, and async/await without simultaneously requiring mastery of a complex framework like TCA.
2. **Production quality** — The app will be published on the App Store and open-sourced. The architecture cannot be throwaway or tutorial-grade.
3. **Five-phase evolution** — The product grows from a CRUD todo app (Phase 1) to a full productivity suite with Kanban, Calendar, Gantt, Pomodoro, and cross-device sync (Phase 5). The architecture must accommodate this growth without a rewrite.
4. **Real-time sync** — Even in Phase 1, data lives in Supabase and syncs across devices via Realtime WebSocket. The data layer must be designed for this from day one.
5. **Apple-only** — No cross-platform considerations. The architecture should exploit native platform capabilities (NavigationSplitView, ActivityKit, WidgetKit, EventKit) rather than abstract them away.
6. **Single developer** — Low ceremony and minimal "context switch cost" are essential. The developer will return to this codebase after breaks and needs patterns that are self-evident.

This ADR captures every significant architectural decision made in the DESIGN.md and provides rationale, consequences, and alternatives for each.

---

## Decision

The application uses **MVVM + Repository over Supabase**, organized into **SPM local packages**, with **cloud-first persistence** (no local database), **Markdown for rich text**, **LexoRank for sort order**, **anonymous auth from day one**, and **Supabase Realtime for sync**.

### D-1: Client Architecture Pattern — MVVM + Repository

Each screen has an `@Observable` ViewModel that owns business logic and in-memory state. Repositories abstract all Supabase access behind protocols. Views observe ViewModels and dispatch actions through ViewModel methods. No external architecture framework is used.

This was chosen over TCA (The Composable Architecture) because the developer is simultaneously learning Swift, SwiftUI, and Supabase — three large learning surfaces. Adding TCA's generics, macros, and reducer ceremony as a fourth would delay Phase 1 without proportional benefit. MVVM maps directly to React mental models the developer already knows: ViewModel equals custom hook, Repository equals API service module, `@Observable` equals `useState` with automatic re-render.

The Coordinator pattern (structured MVVM variant) is deferred to Phase 3 when navigation complexity warrants it. SwiftUI's built-in `NavigationStack` and `NavigationSplitView` with `NavigationPath` are sufficient for Phase 1.

### D-2: Backend Platform — Supabase

Supabase provides PostgreSQL 15, Realtime WebSocket subscriptions, Auth (including anonymous sign-in and Sign in with Apple), Edge Functions, and Row-Level Security in a single managed platform. The `supabase-swift` SDK is the sole networking layer — no raw URLSession calls for data operations.

Supabase was chosen over Firebase because PostgreSQL offers relational modeling with joins (critical for task-tag relationships), full-text search via GIN indexes, and RLS policies that enforce data isolation at the database level rather than in application code. It was chosen over self-hosted solutions because the developer is a solo operator who should not be managing infrastructure.

### D-3: Data Persistence Strategy — Cloud-First, No Local Database

In Phases 1 through 4, there is no local database. All state lives in `@Observable` classes in memory. Supabase PostgreSQL is the single source of truth. Data visible on screen at the time of going offline remains readable, but no local replica exists.

Phase 5 introduces a lightweight pending-operations queue (JSON file or SwiftData) for offline writes only — not a full data mirror. This dramatically simplifies the Phase 1 architecture by avoiding CoreData/SwiftData, which would add a second large learning surface. The trade-off is that the app is non-functional without network connectivity in Phases 1-4 (app launch requires fetching data from Supabase).

### D-4: Rich Text Storage Format — Markdown

Task descriptions are stored as plain Markdown text in the `description` column. The editor renders Markdown live using `NSAttributedString` conversion but persists raw Markdown strings. This supports bold, italic, inline code, bullet lists, numbered lists, headings (H1-H3), and inline checklists.

Markdown was chosen over a JSON document model because it is human-readable, portable, easy to debug in Supabase Studio, and requires no custom schema versioning. The trade-off is limited expressiveness (no tables, no images, no nested block-level structures), which is acceptable for a task description field.

### D-5: Sort Order Implementation — LexoRank (Fractional Index Strings)

User-reorderable entities (tasks within a list, lists within a group, groups, tags) use LexoRank-style fractional index strings in a `sort_order` column. When an item is moved between two neighbors, a new string is computed that sorts lexicographically between the neighbors' strings. Only the moved item's row is updated — no full-list re-indexing.

LexoRank was chosen over integer positions because integer reordering requires updating every item after the insertion point (O(n) writes per reorder). LexoRank requires O(1) writes. Occasional rebalancing is needed if the string space is exhausted (triggered when a rank string exceeds 10 characters), but this is rare in practice.

### D-6: Authentication Strategy — Anonymous Sign-In from Phase 1, Sign in with Apple in Phase 5

The app uses Supabase Anonymous Sign-In (`auth.signInAnonymously()`) from first launch. This gives a real JWT and `auth.uid()` immediately, so RLS policies work from day one without any dev-only auth bypass. The anonymous session is stored in Keychain by the Supabase SDK.

In Phase 5, the anonymous account is linked to an Apple identity via `auth.linkIdentity(provider: .apple)`. This is a merge, not a replacement — all existing data retains the same `user_id`. No data migration is needed.

This was chosen over deferring auth entirely (hardcoded UUID with RLS disabled) because it avoids building a separate auth bypass that must be dismantled later. It was chosen over requiring Sign in with Apple from Phase 1 because authentication UI is a distraction from the core CRUD experience.

### D-7: Real-time Sync Approach — Supabase Realtime WebSocket + LWW Conflict Resolution

Supabase Realtime pushes `INSERT`, `UPDATE`, and `DELETE` events to connected clients via WebSocket. The `RealtimeManager` class subscribes to table changes filtered by `user_id` and applies them to the in-memory ViewModel cache.

All writes use an optimistic UI update pattern: (1) mutate local state immediately for sub-100ms feedback, (2) send request to Supabase, (3) on success replace local data with server response, on failure rollback and show error. Conflict resolution is Last-Write-Wins based on the server-assigned `updated_at` timestamp. This is acceptable because the app is used by a single user across their own devices.

Phase 5 adds exponential backoff reconnect logic and a pending-operations queue for offline resilience.

### D-8: Project Structure — SPM Local Packages

The codebase is organized into three local Swift packages plus the app target:

- **`NFLCore`** — Data models, enums, `LexoRank`, business logic. No dependencies.
- **`NFLNetwork`** — Supabase client provider, repository protocols and implementations, `RealtimeManager`. Depends on `NFLCore` and `supabase-swift`.
- **`NFLEditor`** — Markdown editor with bridged `UITextView` (iOS) / `NSTextView` (macOS), `MarkdownParser`. Depends on `NFLCore`.

The app target contains Views, ViewModels, platform-specific navigation, resources, and the `@main` entry point. Feature code is organized by feature folder (`TaskList/`, `TaskDetail/`, `Sidebar/`, etc.).

SPM packages were chosen because they enforce build isolation (changes to models do not recompile UI), prevent accidental coupling (Views cannot import Supabase directly), and enable independent test targets. This maps to the npm monorepo pattern (`packages/core`, `packages/api`) the developer already understands.

---

## Consequences

### Positive

- **Low initial complexity**: MVVM + Repository with no local database means fewer concepts to learn simultaneously. The developer focuses on SwiftUI, Swift concurrency, and Supabase rather than also learning CoreData, TCA, or Combine.
- **React mental model transfer**: Every major pattern has a direct React equivalent documented in the design. ViewModel = custom hook, Repository = API module, `@Observable` = `useState`, `.task {}` = `useEffect`.
- **RLS from day one**: Anonymous sign-in means Row-Level Security policies are active in every phase. No dev-mode security holes to close before shipping.
- **O(1) reorder writes**: LexoRank ensures drag-and-drop reordering never updates more than one row, keeping the UI responsive and minimizing network traffic.
- **Portable data format**: Markdown descriptions are human-readable and not locked to any editor implementation. If the editor approach changes, stored data does not need migration.
- **Incremental migration path**: MVVM can evolve into TCA later if Phase 3 complexity warrants it — the Repository layer stays the same, only ViewModels change. Anonymous auth can be upgraded to Apple Sign-In without data migration.
- **Build-time isolation**: SPM packages prevent cross-layer imports at compile time, not just by convention.
- **Single external dependency**: Only `supabase-swift` is needed. All UI is native SwiftUI with platform bridges where necessary.

### Negative

- **No offline capability in Phases 1-4**: The app requires network connectivity to function. A cold launch with no network shows an empty state or loading error. Data visible before going offline remains readable, but new tasks cannot be created.
- **No enforced unidirectional data flow**: MVVM does not prevent spaghetti state. The developer must maintain discipline — all mutations through ViewModel methods, no direct state writes from Views. There is no compiler enforcement of this convention.
- **No shared in-memory cache**: Each ViewModel owns its data independently. If two screens show the same task, they hold separate copies. Realtime updates keep them eventually consistent, but there can be brief inconsistency. A shared `@Observable` service may be needed if this becomes a problem.
- **Rich text editor risk**: No mature pure-SwiftUI rich text editor exists. Bridging `UITextView`/`NSTextView` is well-documented but requires platform-specific code and is the highest-risk component of Phase 1.
- **LexoRank edge cases**: Fractional index strings can exhaust their keyspace after many reorders between the same two items. A rebalancing mechanism (reassigning all ranks in a list) is needed but deferred to when rank strings exceed 10 characters.
- **Supabase vendor dependency**: All data, auth, and realtime sync depend on Supabase. Migration away from Supabase would require replacing the entire Repository layer. Mitigated by the Repository protocol abstraction and by PostgreSQL being standard SQL (data is exportable).

### Risks

- **R-1 (Rich text editor)**: No mature SwiftUI rich text package exists. **Mitigation**: Build `NFLEditor` as a standalone spike first. Bridge `UITextView`/`NSTextView` using `UIViewRepresentable`/`NSViewRepresentable`. Fallback: plain Markdown editing (render on view, edit as raw text) if bridging proves too complex for a first Swift project.
- **R-2 (Gantt chart in Phase 3)**: No Swift charting packages support Gantt. **Mitigation**: Build with SwiftUI `Canvas`. Scope Phase 3 Gantt to read-only + basic drag; avoid complex dependency logic in the Phase 3 MVP.
- **R-3 (Swift concurrency learning curve)**: `async/await` and `Actor` isolation are new to the developer. **Mitigation**: Mark all ViewModels `@MainActor`, all model structs `Sendable`, all Repository methods `async` and non-isolated. Use `@preconcurrency` import as a temporary escape hatch if compiler errors become overwhelming.
- **R-4 (Supabase Realtime under poor network)**: WebSocket connections drop on flaky networks. **Mitigation**: Implement exponential backoff reconnect logic in the sync layer (Phase 5). The pending-operations queue is the source of truth for unconfirmed writes, not the WebSocket.
- **R-5 (Kanban drag-and-drop in SwiftUI)**: SwiftUI's `.draggable`/`.dropDestination` modifiers (iOS 16+) are limited. **Mitigation**: Budget extra time for custom gesture recognizers if the built-in modifiers are insufficient for smooth Kanban UX.
- **R-6 (ActivityKit API changes)**: Live Activity API could change. **Mitigation**: Pin minimum deployment target to iOS 17 where ActivityKit is stable.
- **R-7 (LexoRank implementation)**: Edge cases in fractional indexing. **Mitigation**: Port an existing JS/TS LexoRank library to Swift rather than implementing from scratch. Trigger rebalancing when rank strings exceed 10 characters.
- **R-8 (App Store review)**: First submission from a new developer account. **Mitigation**: Follow App Store guidelines from day one. Sign in with Apple compliance is satisfied by the auth strategy.

---

## Alternatives Considered

| Decision | Chosen | Alternative A | Alternative B | Rejected Because |
|----------|--------|--------------|---------------|-----------------|
| Client Pattern | MVVM + Repository | TCA (The Composable Architecture) | MVVM + Coordinator | TCA demands deep Swift generics/macro knowledge that would slow Phase 1 delivery. Coordinator adds ceremony without proportional benefit until Phase 3 navigation complexity. |
| Backend | Supabase (PostgreSQL) | Firebase (Firestore) | Self-hosted PostgreSQL | Firebase lacks relational joins (task-tag relationships require denormalization), no RLS equivalent, document model is awkward for relational data. Self-hosted adds infrastructure management burden for a solo developer. |
| Persistence | Cloud-first (no local DB) | Local SQLite/SwiftData mirror | CoreData + CloudKit | Local database adds a second large learning surface (CoreData or SwiftData) and introduces sync conflict complexity from Phase 1. Cloud-first defers this complexity to Phase 5 where it is scoped to a pending-ops queue, not a full replica. |
| Rich Text | Markdown (plain text) | JSON document model (ProseMirror-style) | AttributedString serialization | JSON document model requires schema versioning and custom serialization/deserialization. AttributedString is not portable across platforms. Markdown is human-readable, debuggable in Supabase Studio, and sufficient for task descriptions. |
| Sort Order | LexoRank (fractional strings) | Integer position | Array index (implicit) | Integer position requires O(n) writes on every reorder (update all items after insertion point). Array index is not persistable across sessions. LexoRank is O(1) writes per reorder. |
| Auth (Phase 1) | Anonymous Sign-In → Apple ID | No auth until Phase 5 (hardcoded UUID) | Sign in with Apple from Phase 1 | Hardcoded UUID requires disabling RLS and building a dev-only auth bypass. Apple Sign-In from Phase 1 adds friction to the initial development experience. Anonymous sign-in gives real JWTs and working RLS with zero user-facing ceremony. |
| Concurrency | async/await + @MainActor | Combine | GCD (DispatchQueue) | Combine is a declining API in the SwiftUI ecosystem (superseded by async/await and @Observable). GCD is lower-level and does not integrate with Swift's structured concurrency model. |
| Search | PostgreSQL full-text search (GIN index) | Local in-memory search | SQLite FTS | Local search requires a local database (contradicts D-3). SQLite FTS requires a local database. PostgreSQL GIN index is fast enough for <10K tasks and requires no additional infrastructure. |
| Package Manager | SPM (local packages) | CocoaPods | Carthage | SPM is the only option for local packages in modern Xcode. CocoaPods and Carthage are not needed when the sole external dependency (`supabase-swift`) supports SPM. |
| Localization | .xcstrings String Catalogs | NSLocalizedString + .strings files | Third-party i18n library | `.xcstrings` is the native Xcode 15+ format with compiler warnings for missing translations. No third-party library needed. `.strings` files are the legacy approach. |

---

## Implementation Roadmap

### Phase 1: Core Todo + Notes (MVP)

- **Scope**: Full CRUD for tasks, lists, groups, and tags. Five built-in smart lists (Today, Tomorrow, Upcoming, All Tasks, Completed). Keyword search. Rich text description editor with inline checklists. Manual drag-and-drop reorder. Repeating tasks. Soft delete with 30-day retention.
- **Key screens**: Root Navigation Shell, Sidebar, Task List, Task Detail, New Task Quick Entry, List/Group Management, Tag Management, Search, Settings (9 screens total)
- **DB tables (active)**: `profiles`, `tasks`, `lists`, `list_groups`, `tags`, `task_tags`
- **DB tables (created but unused)**: `reminders`, `kanban_statuses`, `pomodoro_sessions`
- **SPM packages**: `NFLCore` (models, enums, LexoRank), `NFLNetwork` (Supabase client, repositories, RealtimeManager), `NFLEditor` (Markdown editor bridge, MarkdownParser)
- **External dependencies**: `supabase-swift` 2.x (sole external package)
- **Estimated complexity**: High for a Swift beginner. Three simultaneous learning surfaces (SwiftUI, Swift concurrency, Supabase). Estimated 6-10 weeks for a developer working part-time.
- **Spike required**: `NFLEditor` — bridging `UITextView`/`NSTextView` for Markdown rendering and editing. This is the highest-risk component and should be built first as a standalone package before integrating into the app. Fallback: plain Markdown editing (render formatted output in view mode, edit as raw text).
- **Key technical challenges**: LexoRank implementation in Swift (port from JS/TS). Supabase anonymous auth + RLS integration. Swift 6 strict concurrency compliance. Platform-specific navigation (`NavigationSplitView` 3-column on macOS, 2-column on iOS).
- **Verification criteria**: Task CRUD on both platforms. Smart lists return correct results. Search within 300ms on 1000 tasks. Description editor renders formatting. Sort order persists across restarts.

### Phase 2: Reminders

- **Scope**: Time-based and location-based reminders. Push notifications via APNs. Deep-link from notification to task detail. Snooze (15 min, 1 hr, tomorrow 9 AM). Daily summary notification at user-configured time.
- **New DB tables**: `reminders` (already created in Phase 1 migration, now actively used)
- **New models**: `Reminder` struct in `NFLCore`
- **New SPM packages**: None. Reminder logic lives in existing packages plus a new `Features/Reminders/` folder in the app target.
- **Supabase additions**: Two Edge Functions — `push-notification` (triggered by database webhook when `remind_at` is reached) and `daily-summary` (cron via pg_cron).
- **Key technical challenges**: APNs configuration and certificate management. Local notification scheduling that survives app restart and device reboot (`UNUserNotificationCenter` re-registration on launch). CoreLocation permission flow for geofence triggers. Deep-link URL scheme design.
- **Dependencies on Phase 1**: Task detail view (to attach reminders). Supabase auth (to scope notifications to the correct user). Settings screen (to configure daily summary time).

### Phase 3: Multi-View (Kanban, Calendar, Gantt)

- **Scope**: Three additional view modes for task lists. Kanban with customizable columns. Monthly and weekly Calendar view with system calendar integration (read-only). Gantt with draggable bars and dependency arrows.
- **New DB tables**: `kanban_statuses` (already created, now actively used)
- **New models**: `KanbanStatus` struct in `NFLCore`. `TaskStatus` enum expanded.
- **New fields activated**: `tasks.kanban_status_id`, `tasks.start_date`, `tasks.depends_on_id`
- **New SPM packages**: None anticipated, but a `NFLCanvas` package may be extracted if the Gantt Canvas rendering grows complex.
- **Key technical challenges**: SwiftUI `.draggable`/`.dropDestination` for Kanban columns (may need custom gesture recognizers). SwiftUI `Canvas` for Gantt rendering (no third-party libraries). EventKit integration for read-only calendar overlay. Pinch-to-zoom on Gantt time axis. This is the phase most likely to benefit from introducing a Coordinator pattern for navigation if complexity warrants it.
- **Dependencies on Phase 1**: Task list infrastructure. LexoRank (reused for Kanban column ordering). Repository layer (extended with Kanban status methods).
- **Dependencies on Phase 2**: None (Phases 2 and 3 can be developed in parallel if desired).

### Phase 4: Pomodoro Timer

- **Scope**: Focus timer with configurable intervals (25/5/15 default). Live Activity on Dynamic Island and Lock Screen. Audio cues. Session recording in Supabase. Home screen widget showing daily Pomodoro count.
- **New DB tables**: `pomodoro_sessions` (already created, now actively used)
- **New models**: `PomodoroSession` struct in `NFLCore`
- **New SPM packages**: None. Pomodoro logic lives in `Features/Pomodoro/` in the app target. Widget target is added to the Xcode project.
- **New system frameworks**: `ActivityKit` (Live Activity), `WidgetKit` (home screen widget), `AVFoundation` (audio cues), `BackgroundTasks` (timer continuation)
- **Key technical challenges**: ActivityKit Live Activity lifecycle (start, update, end). Background timer accuracy when the app is suspended. Widget data sharing via App Group. Audio session configuration for cue sounds.
- **Dependencies on Phase 1**: Task detail view (to link Pomodoro sessions to tasks). Supabase integration (to persist sessions).
- **Dependencies on Phase 2**: None directly, but the notification infrastructure from Phase 2 may be reused for timer completion alerts.

### Phase 5: Cross-Device Sync

- **Scope**: Deterministic real-time sync across all signed-in devices. Offline support with pending-operations queue. Sign in with Apple. Account linking from anonymous to Apple identity. Sync status indicator.
- **New DB tables**: None. All tables already exist.
- **New local storage**: Pending-operations queue — a JSON file on disk (or SwiftData store) that logs unconfirmed writes when offline. This is the only local persistence introduced in the entire product.
- **New SPM packages**: `NFLSync` — encapsulates the pending-operations queue, replay logic, and exponential backoff reconnect. Depends on `NFLCore` and `NFLNetwork`.
- **New system frameworks**: `AuthenticationServices` (Sign in with Apple), `Network` (NWPathMonitor for connectivity detection)
- **Key technical challenges**: Account linking (`auth.linkIdentity(provider: .apple)`) — ensuring the anonymous user's data is preserved. Pending-operations replay ordering and idempotency. LWW conflict resolution edge cases (two devices editing the same field offline simultaneously — server timestamp wins). Full data download within 10 seconds for 10K tasks. Sync status UI that accurately reflects "Synced", "Syncing...", and "Offline — N changes pending".
- **Dependencies on Phase 1**: Repository layer (extended with offline-aware write path). RealtimeManager (enhanced with reconnect logic). Auth infrastructure (upgraded from anonymous to Apple).

---

## Dependencies

- **`supabase-swift` SDK (2.x)**: The sole external Swift package. Provides Auth, PostgREST, Realtime, and Storage clients. Status: stable, actively maintained by Supabase. Risk: breaking changes between major versions. Mitigation: pin to a specific minor version in `Package.swift`.

- **Supabase Cloud**: Managed PostgreSQL 15, Realtime WebSocket, Auth, Edge Functions, Row-Level Security. Status: production-grade, SOC 2 compliant. Risk: vendor lock-in — all data and auth depend on Supabase. Mitigation: Repository protocol abstraction; PostgreSQL data is exportable via standard `pg_dump`.

- **ActivityKit (iOS 16.2+)**: Required for Pomodoro Live Activity on Dynamic Island and Lock Screen. Status: stable since iOS 16.2, minimum deployment target is iOS 17. Risk: low — API is stable.

- **WidgetKit**: Required for Pomodoro home screen widget. Status: stable since iOS 14. Risk: none at iOS 17 deployment target.

- **EventKit**: Required for Calendar view system calendar integration (read-only). Status: stable, mature API. Risk: requires user permission to access calendars. Mitigation: graceful degradation — Calendar view works without system events if permission is denied.

- **CoreLocation**: Required for location-based reminders (Phase 2). Status: stable. Risk: geofence monitoring requires "Always" location permission on iOS, which triggers stricter App Store review. Mitigation: request "When In Use" first, upgrade to "Always" only when user configures a location-based reminder.

- **AuthenticationServices**: Required for Sign in with Apple (Phase 5). Status: stable, required by App Store guidelines if any other social login is offered. Risk: none — Apple's own framework on Apple platforms.

- **BackgroundTasks framework**: Required for Pomodoro timer continuation when app is backgrounded. Status: stable. Risk: iOS background execution time limits. Mitigation: Live Activity provides visual countdown even if the app is suspended; timer accuracy is re-established when the app returns to foreground.

- **Swift 6 (strict concurrency)**: The project targets Swift 6 strict concurrency checking. Risk: compiler errors when integrating third-party code that is not `Sendable`-compliant. Mitigation: use `@preconcurrency` import as a temporary escape hatch; fix incrementally.

- **Xcode 16+ / iOS 17 / macOS 14**: Minimum toolchain and deployment targets. `.xcstrings` string catalogs require Xcode 15+. `@Observable` macro requires iOS 17+. Risk: none — these are current-generation tools.

---

*End of Architecture Decision Record*
