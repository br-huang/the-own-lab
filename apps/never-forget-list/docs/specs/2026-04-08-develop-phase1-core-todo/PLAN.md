# Phase 1 Implementation Plan — Core Todo + Notes

**Date:** 2026-04-08
**Companion docs:** [REQUIREMENTS.md](../2026-04-08-plan-not-forget-list-architecture/REQUIREMENTS.md) | [DESIGN.md](../2026-04-08-plan-not-forget-list-architecture/DESIGN.md)
**Estimated total effort:** 40–60 hours across 16 milestones

---

## Current Status

**Last updated:** 2026-04-09

| Milestone | Status | Notes |
|----------|--------|-------|
| 1. Project Scaffolding | Complete | Workspace, project, and three local SPM packages are in place. |
| 2. Supabase Backend | Skipped for now | Phase 1 currently runs on an in-memory repository. `supabase-swift` remains wired into `NFLNetwork` for later phases. |
| 3. Data Models (`NFLCore`) | Complete | `NFLTask`, `TaskList`, `TaskTag`, `TaskPriority`, `SidebarDestination`, `AppSnapshot`, and preview seed data are implemented. |
| 4. Network Layer (`NFLNetwork`) | Complete (InMemory) | `TaskRepository` and `InMemoryTaskRepository` are implemented. |
| 5. App Shell and Navigation | Complete | `NavigationSplitView` app shell and `AppViewModel` are implemented. |
| 6. Sidebar | Complete | Smart Lists, My Lists, and badge counts are present. |
| 7. Task List | Mostly complete | Quick entry, task rows, completion toggle, swipe delete, and manual reorder within list views are implemented. |
| 8. Task Detail | Mostly complete | Title, priority, due date, notes, completion state, and tag assignment are editable. |
| 9. Rich Text Editor | Simplified | `TextEditor` plus Markdown preview is used instead of a custom rich-text bridge. |
| 10. List/Group Management | Mostly complete | Create, rename, and delete list flows exist. Groups are not implemented. |
| 11. Tag Management | Mostly complete | Tags can be created, renamed, deleted, selected in the sidebar, and assigned from task detail. Color/edit metadata is not implemented yet. |
| 12. Smart Lists | Complete | `Today`, `Upcoming`, `All Tasks`, and `Completed` filters are implemented. |
| 13. Search | Complete | Local search over title, notes, and tags is implemented with `.searchable`. |
| 14. Settings | Not started | No settings screen yet. |
| 15. Localization | Not started | User-facing strings are still hardcoded in English. |
| 16. Polish | Not started | Accessibility, visual polish, and final QA still remain. |
| Validation | Complete for current slice | `NFLCore` tests pass, `NFLNetwork` tests pass, and the macOS app target builds successfully with `CODE_SIGNING_ALLOWED=NO`. Reorder coverage has been added in `NFLNetworkTests`. |

---

## Prerequisites

- **Xcode 16+** (Swift 6 support, `.xcstrings` String Catalogs)
- **macOS 14 (Sonoma) or later** on the development machine
- **Supabase account** — free tier is sufficient. Create a project at https://supabase.com
- **Supabase CLI** — install via `brew install supabase/tap/supabase`
- **Git** — initialized in the project root (`/Users/rong/Workspaces/1-Projects/11-Brian-Projects/113-Not-Forget-List`)
- **Apple Developer account** — for signing the macOS and iOS targets

> **Notation:** Throughout this plan, `$ROOT` refers to `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/113-Not-Forget-List`.

---

## Milestone 1: Project Scaffolding

### Step 1.1: Create Xcode multiplatform project

**Action:** Open Xcode > File > New > Project > Multiplatform > App.

| Field | Value |
|-------|-------|
| Product Name | `NotForgetList` |
| Team | Your Apple Developer team |
| Organization Identifier | `com.briandev` (or your domain) |
| Interface | SwiftUI |
| Language | Swift |
| Storage | None |
| Include Tests | Yes (both Unit and UI) |

Save the project **inside** `$ROOT`, so the `.xcodeproj` lands at `$ROOT/NotForgetList.xcodeproj`.

After creation, move the generated source folder so the directory structure matches DESIGN.md Section 3:

```
$ROOT/
├── NotForgetList.xcodeproj
├── NotForgetList/           # <-- shared app target source
│   ├── NotForgetListApp.swift
│   ├── ContentView.swift    # will be replaced later
│   └── Assets.xcassets
├── NotForgetListTests/
└── NotForgetListUITests/
```

Then create the feature folder skeleton inside `$ROOT/NotForgetList/`:

```bash
mkdir -p NotForgetList/App
mkdir -p NotForgetList/Features/{TaskList,TaskDetail,Sidebar,SmartLists,Tags,Search,Settings}
mkdir -p NotForgetList/Shared/{Components,Modifiers}
mkdir -p NotForgetList/Platform/{iOS,macOS}
mkdir -p NotForgetList/Resources
mkdir -p "NotForgetList/Preview Content"
```

Move the generated `NotForgetListApp.swift` into `NotForgetList/App/`.

In Xcode, set the deployment targets:
- iOS: **17.0**
- macOS: **14.0**

In Build Settings, set **Swift Language Version** to **Swift 6** (or "6" if listed numerically). If strict concurrency errors are overwhelming, set `SWIFT_STRICT_CONCURRENCY` to `complete` instead and migrate incrementally.

**Done when:**
- `Cmd+B` builds and runs successfully on both an iOS Simulator and macOS.
- The folder structure inside `$ROOT/NotForgetList/` matches the skeleton above.

**Gotcha:** When you move files, Xcode's file references break. After moving `NotForgetListApp.swift`, delete the red reference in the Project Navigator and re-add the file from its new location by dragging it in.

---

### Step 1.2: Create NFLCore local Swift package

**Action:** In Terminal:

```bash
cd $ROOT
mkdir -p Packages/NFLCore
cd Packages/NFLCore
swift package init --name NFLCore --type library
```

This creates `Package.swift`, `Sources/NFLCore/`, and `Tests/NFLCoreTests/`.

Edit `$ROOT/Packages/NFLCore/Package.swift`:

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NFLCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NFLCore", targets: ["NFLCore"]),
    ],
    targets: [
        .target(name: "NFLCore"),
        .testTarget(
            name: "NFLCoreTests",
            dependencies: ["NFLCore"]
        ),
    ]
)
```

Create subdirectories inside Sources:

```bash
mkdir -p Sources/NFLCore/Models
mkdir -p Sources/NFLCore/Enums
```

In Xcode: drag the `Packages/NFLCore` folder into the Project Navigator's root. Xcode detects the `Package.swift` and shows it as a local package. Then go to the **NotForgetList** app target > General > Frameworks, Libraries, and Embedded Content > click "+" > select `NFLCore` (from your workspace).

**Done when:**
- `import NFLCore` compiles in `NotForgetListApp.swift` (add the import, build, then remove it).
- `NFLCoreTests` target appears and runs (even if empty).

**Gotcha:** If Xcode says "no such module," close and reopen the project, or do File > Packages > Reset Package Caches.

---

### Step 1.3: Create NFLNetwork local Swift package

**Action:** Same pattern as Step 1.2:

```bash
cd $ROOT
mkdir -p Packages/NFLNetwork
cd Packages/NFLNetwork
swift package init --name NFLNetwork --type library
```

Edit `$ROOT/Packages/NFLNetwork/Package.swift`:

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NFLNetwork",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NFLNetwork", targets: ["NFLNetwork"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0"),
        .package(path: "../NFLCore"),
    ],
    targets: [
        .target(
            name: "NFLNetwork",
            dependencies: [
                "NFLCore",
                .product(name: "Supabase", package: "supabase-swift"),
            ]
        ),
        .testTarget(
            name: "NFLNetworkTests",
            dependencies: ["NFLNetwork"]
        ),
    ]
)
```

Create subdirectories:

```bash
mkdir -p Sources/NFLNetwork/Repositories
mkdir -p Sources/NFLNetwork/Realtime
mkdir -p Sources/NFLNetwork/Protocols
```

In Xcode: drag `Packages/NFLNetwork` into the Project Navigator. Add `NFLNetwork` as a framework dependency to the app target (same as Step 1.2).

**Done when:**
- `import NFLNetwork` compiles in the app target.
- `import Supabase` compiles inside `NFLNetwork` source files.
- Xcode has resolved the `supabase-swift` package (check Package Dependencies in the Project Navigator sidebar).

**Gotcha:** The first `supabase-swift` resolve can take 2-3 minutes. If it fails, check your network and try File > Packages > Resolve Package Versions.

---

### Step 1.4: Create NFLEditor local Swift package

**Action:**

```bash
cd $ROOT
mkdir -p Packages/NFLEditor
cd Packages/NFLEditor
swift package init --name NFLEditor --type library
```

Edit `$ROOT/Packages/NFLEditor/Package.swift`:

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NFLEditor",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NFLEditor", targets: ["NFLEditor"]),
    ],
    dependencies: [
        .package(path: "../NFLCore"),
    ],
    targets: [
        .target(
            name: "NFLEditor",
            dependencies: ["NFLCore"]
        ),
        .testTarget(
            name: "NFLEditorTests",
            dependencies: ["NFLEditor"]
        ),
    ]
)
```

Create subdirectories:

```bash
mkdir -p Sources/NFLEditor/iOS
mkdir -p Sources/NFLEditor/macOS
```

Add `NFLEditor` as a framework dependency to the app target.

**Done when:** `import NFLEditor` compiles in the app target.

---

### Step 1.5: Configure app constants (Supabase URL and anon key)

**Action:** Create file `$ROOT/NotForgetList/App/AppConstants.swift`:

```swift
import Foundation

enum AppConstants {
    // MARK: - Supabase
    // Replace these with your actual Supabase project values.
    // Find them at: Supabase Dashboard > Project Settings > API
    static let supabaseURL = "https://YOUR_PROJECT_REF.supabase.co"
    static let supabaseAnonKey = "eyJ..."  // anon / public key — safe to ship in client

    // MARK: - App
    static let defaultLocale = "zh-Hant"
    static let searchDebounceMilliseconds = 300
    static let completedTaskRetentionDays = 30
}
```

> **Security note:** The anon key is designed to be public. The service-role key must NEVER appear here. RLS policies protect data.

**Done when:** The file exists and the project builds. You will fill in real values in Milestone 2.

**Gotcha:** Do NOT add this file to `.gitignore` — the anon key is public by design. If you later add a service-role key for scripts, put that in an `.env` file and DO gitignore it.

---

## Milestone 2: Supabase Backend Setup

### Step 2.1: Initialize Supabase project locally (CLI)

**Action:** In Terminal:

```bash
cd $ROOT
supabase init
```

This creates a `$ROOT/supabase/` directory with `config.toml`.

Edit `$ROOT/supabase/config.toml` and set the project ID to match your Supabase dashboard project:

```toml
[project]
id = "YOUR_PROJECT_REF"
```

Link to your remote project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You will be prompted for your database password.

**Done when:** `supabase status` shows your linked project info (or local development server if using `supabase start`).

**Tip:** You can develop against a local Supabase instance using `supabase start` (requires Docker). This is faster for iteration but optional. If you prefer to work against the cloud instance directly, that is fine for Phase 1.

---

### Step 2.2: Create initial migration (SQL schema)

**Action:** Create the migration file:

```bash
supabase migration new initial_schema
```

This creates a file like `$ROOT/supabase/migrations/20260408XXXXXX_initial_schema.sql`. Open it and paste the **entire SQL schema** from DESIGN.md Section 4.1 — everything from `CREATE EXTENSION` through the `on_auth_user_created` trigger. That is approximately 200 lines of SQL.

However, for Phase 1, we only need these tables to be *active*: `profiles`, `list_groups`, `lists`, `tasks`, `tags`, `task_tags`. The `reminders`, `kanban_statuses`, and `pomodoro_sessions` tables should still be created (they are referenced by foreign keys and the triggers apply to them), but we will not use them in app code.

Copy the full schema as-is from DESIGN.md Section 4.1 into this migration file. Do not split it — one migration for the initial schema is cleaner.

**Done when:** The file exists at `$ROOT/supabase/migrations/<timestamp>_initial_schema.sql` and contains all CREATE TABLE, CREATE INDEX, RLS, trigger, and seed function statements.

---

### Step 2.3: Apply migration and verify

**Action:**

If using local Supabase:
```bash
supabase db reset    # applies all migrations from scratch
```

If using remote (cloud) Supabase:
```bash
supabase db push
```

Then verify the tables exist:

```bash
# Local:
supabase db inspect
# Or connect to the DB and run:
# \dt public.*
```

For cloud, open the Supabase Dashboard > Table Editor and confirm all tables are listed.

**Done when:**
- All 9 tables exist: `profiles`, `list_groups`, `lists`, `kanban_statuses`, `tasks`, `tags`, `task_tags`, `reminders`, `pomodoro_sessions`.
- The `idx_tasks_search` GIN index exists on the `tasks` table.
- The `on_auth_user_created` trigger is active on `auth.users`.

**Gotcha:** If `supabase db push` fails with permission errors on `auth.users`, it is because the trigger references `auth.users` which requires elevated permissions. The Supabase CLI handles this for migrations, but if you run SQL manually via the SQL Editor, you may need to use the `service_role` connection.

---

### Step 2.4: Configure anonymous auth

**Action:** In Supabase Dashboard:
1. Go to **Authentication** > **Providers**.
2. Ensure **Email** provider is enabled (it is by default).
3. Go to **Authentication** > **Settings**.
4. Scroll to **Anonymous sign-ins** and **enable** them.

This allows the app to call `auth.signInAnonymously()` and receive a real JWT + UUID without requiring credentials.

**Done when:** In the Supabase Dashboard SQL Editor, run:

```sql
-- This simulates what the app will do
SELECT auth.uid();
```

If anonymous sign-in is enabled, you can test it via the Supabase client libraries. The actual Swift test happens in Step 5.1.

---

### Step 2.5: Verify RLS policies

**Action:** In the Supabase Dashboard SQL Editor, run:

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Every table should show `rowsecurity = true`.

Then test that an anonymous user can only see their own data:

```sql
-- In the SQL Editor (runs as service role, bypasses RLS)
-- Insert a test list
INSERT INTO public.lists (user_id, name, is_inbox, sort_order)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test', false, 'a');

-- Now try to query as a different user (this would fail via the API)
-- This verifies the policy exists — actual enforcement testing happens in Step 4.x
```

**Done when:** All tables show `rowsecurity = true`. The `on_auth_user_created` trigger creates a profile and Inbox list when a user is created.

**Tip:** Delete the test data you inserted, or run `supabase db reset` to start clean.

---

## Milestone 3: Data Models (NFLCore)

### Step 3.1: NFLTask model

**File:** `$ROOT/Packages/NFLCore/Sources/NFLCore/Models/NFLTask.swift`

**Action:** Create the file with this exact content:

```swift
import Foundation

/// Task model. Named `NFLTask` to avoid collision with Swift's `Task` concurrency type.
/// Maps to the `tasks` table in Supabase.
public struct NFLTask: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public var userID: UUID
    public var listID: UUID
    public var kanbanStatusID: UUID?
    public var title: String
    public var description: String?
    public var priority: Priority
    public var isCompleted: Bool
    public var completedAt: Date?
    public var dueDate: Date?
    public var dueTime: Date?
    public var startDate: Date?
    public var sortOrder: String
    public var repeatRule: RepeatRule?
    public var dependsOnID: UUID?
    public let createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    /// Tags loaded via join — not encoded when sending to Supabase
    public var tags: [Tag]?

    public init(
        id: UUID = UUID(),
        userID: UUID,
        listID: UUID,
        kanbanStatusID: UUID? = nil,
        title: String,
        description: String? = nil,
        priority: Priority = .none,
        isCompleted: Bool = false,
        completedAt: Date? = nil,
        dueDate: Date? = nil,
        dueTime: Date? = nil,
        startDate: Date? = nil,
        sortOrder: String,
        repeatRule: RepeatRule? = nil,
        dependsOnID: UUID? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        deletedAt: Date? = nil,
        tags: [Tag]? = nil
    ) {
        self.id = id
        self.userID = userID
        self.listID = listID
        self.kanbanStatusID = kanbanStatusID
        self.title = title
        self.description = description
        self.priority = priority
        self.isCompleted = isCompleted
        self.completedAt = completedAt
        self.dueDate = dueDate
        self.dueTime = dueTime
        self.startDate = startDate
        self.sortOrder = sortOrder
        self.repeatRule = repeatRule
        self.dependsOnID = dependsOnID
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
        self.tags = tags
    }

    public enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case listID = "list_id"
        case kanbanStatusID = "kanban_status_id"
        case title, description, priority
        case isCompleted = "is_completed"
        case completedAt = "completed_at"
        case dueDate = "due_date"
        case dueTime = "due_time"
        case startDate = "start_date"
        case sortOrder = "sort_order"
        case repeatRule = "repeat_rule"
        case dependsOnID = "depends_on_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
        case tags
    }
}
```

**Key points:**
- All properties are `public` because this is a library target consumed by the app and other packages.
- `CodingKeys` map Swift camelCase to Supabase snake_case column names.
- `tags` is optional and populated only when fetched with a join query; it is `nil` when encoding for writes.

**Done when:** `swift build` succeeds in the `Packages/NFLCore` directory (or Cmd+B in Xcode with the NFLCore scheme selected).

**Gotcha:** This will not compile yet because `Priority`, `RepeatRule`, and `Tag` do not exist. Proceed to the next steps — the package will compile after Step 3.6.

---

### Step 3.2: TaskList model

**File:** `$ROOT/Packages/NFLCore/Sources/NFLCore/Models/TaskList.swift`

```swift
import Foundation

/// Maps to the `lists` table in Supabase.
public struct TaskList: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public var userID: UUID
    public var groupID: UUID?
    public var name: String
    public var color: String?       // Hex color, e.g. "#FF6B6B"
    public var isInbox: Bool
    public var isArchived: Bool
    public var sortOrder: String

    public let createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(
        id: UUID = UUID(),
        userID: UUID,
        groupID: UUID? = nil,
        name: String,
        color: String? = nil,
        isInbox: Bool = false,
        isArchived: Bool = false,
        sortOrder: String,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.userID = userID
        self.groupID = groupID
        self.name = name
        self.color = color
        self.isInbox = isInbox
        self.isArchived = isArchived
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }

    public enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case groupID = "group_id"
        case name, color
        case isInbox = "is_inbox"
        case isArchived = "is_archived"
        case sortOrder = "sort_order"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
    }
}
```

**Done when:** File exists and has no syntax errors (full package compile after Step 3.6).

---

### Step 3.3: ListGroup model

**File:** `$ROOT/Packages/NFLCore/Sources/NFLCore/Models/ListGroup.swift`

```swift
import Foundation

/// Maps to the `list_groups` table in Supabase.
public struct ListGroup: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public var userID: UUID
    public var name: String
    public var sortOrder: String

    public let createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(
        id: UUID = UUID(),
        userID: UUID,
        name: String,
        sortOrder: String,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.userID = userID
        self.name = name
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }

    public enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case name
        case sortOrder = "sort_order"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
    }
}
```

**Done when:** File exists with no syntax errors.

---

### Step 3.4: Tag model

**File:** `$ROOT/Packages/NFLCore/Sources/NFLCore/Models/Tag.swift`

```swift
import Foundation

/// Maps to the `tags` table in Supabase.
public struct Tag: Codable, Identifiable, Hashable, Sendable {
    public let id: UUID
    public var userID: UUID
    public var name: String
    public var color: String?
    public var sortOrder: String

    public let createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(
        id: UUID = UUID(),
        userID: UUID,
        name: String,
        color: String? = nil,
        sortOrder: String,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.userID = userID
        self.name = name
        self.color = color
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }

    public enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case name, color
        case sortOrder = "sort_order"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
    }
}
```

**Done when:** File exists with no syntax errors.

---

### Step 3.5: Priority enum

**File:** `$ROOT/Packages/NFLCore/Sources/NFLCore/Enums/Priority.swift`

```swift
import Foundation

public enum Priority: Int, Codable, CaseIterable, Sendable, Comparable {
    case none = 0
    case low = 1
    case medium = 2
    case high = 3

    public var label: String {
        switch self {
        case .none:   "None"
        case .low:    "Low"
        case .medium: "Medium"
        case .high:   "High"
        }
    }

    /// SF Symbol name for the priority indicator.
    /// Used in TaskRowView and TaskDetailView.
    public var iconName: String {
        switch self {
        case .none:   "minus"
        case .low:    "arrow.down"
        case .medium: "equal"
        case .high:   "arrow.up"
        }
    }

    // Comparable conformance so we can sort tasks by priority
    public static func < (lhs: Priority, rhs: Priority) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}
```

**Done when:** File exists with no syntax errors.

---

### Step 3.6: RepeatRule model

**File:** `$ROOT/Packages/NFLCore/Sources/NFLCore/Models/RepeatRule.swift`

```swift
import Foundation

/// Represents a task's recurrence schedule.
/// Stored as JSONB in the `repeat_rule` column of the tasks table.
public struct RepeatRule: Codable, Hashable, Sendable {
    public enum RepeatType: String, Codable, CaseIterable, Sendable {
        case daily
        case weekly
        case monthly
        case yearly
        case custom
    }

    public var type: RepeatType
    public var interval: Int             // Every N days/weeks/months/years
    public var daysOfWeek: [Int]?        // 1=Mon..7=Sun, only for weekly + custom

    public init(type: RepeatType, interval: Int = 1, daysOfWeek: [Int]? = nil) {
        self.type = type
        self.interval = interval
        self.daysOfWeek = daysOfWeek
    }

    public enum CodingKeys: String, CodingKey {
        case type, interval
        case daysOfWeek = "days_of_week"
    }
}
```

Now delete the placeholder file that `swift package init` created. It is typically at `$ROOT/Packages/NFLCore/Sources/NFLCore/NFLCore.swift`. Remove it (or replace its contents with a simple `// NFLCore module` comment).

Do the same for `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/NFLNetwork.swift` and `$ROOT/Packages/NFLEditor/Sources/NFLEditor/NFLEditor.swift`.

**Done when:** `cd $ROOT/Packages/NFLCore && swift build` succeeds with zero errors. All 6 model/enum files compile.

---

### Step 3.7: LexoRank utility

**File:** `$ROOT/Packages/NFLCore/Sources/NFLCore/LexoRank.swift`

**Action:** Implement a minimal fractional-index generator. This does NOT need to be a full LexoRank implementation — a simple midpoint string calculation is sufficient for Phase 1.

```swift
import Foundation

/// Generates sort-order strings that sort lexicographically between two bounds.
///
/// Usage:
///   LexoRank.between(nil, nil)      → "n"        (first item)
///   LexoRank.between(nil, "n")      → "g"        (before first)
///   LexoRank.between("n", nil)      → "u"        (after last)
///   LexoRank.between("a", "c")      → "b"        (midpoint)
///   LexoRank.between("a", "b")      → "an"       (subdivide)
///
/// The alphabet used is lowercase a-z (26 characters).
/// When two adjacent characters have no room between them, a new character is appended.
///
/// Rebalance: if any sortOrder string exceeds `maxLength`, call `rebalance(_:)` on
/// the entire list to reassign evenly-spaced ranks.
public enum LexoRank {
    private static let chars = Array("abcdefghijklmnopqrstuvwxyz")
    private static let mid = 13  // index of 'n'

    /// Default max length before suggesting a rebalance.
    public static let maxLength = 10

    /// Generate a rank string between `before` and `after`.
    /// - Pass `nil` for `before` to insert at the beginning.
    /// - Pass `nil` for `after` to insert at the end.
    /// - Pass `nil` for both to get the initial rank.
    public static func between(_ before: String?, _ after: String?) -> String {
        switch (before, after) {
        case (nil, nil):
            return String(chars[mid])  // "n"

        case (nil, let after?):
            // Insert before the first item
            let firstChar = after.first.flatMap { charIndex($0) } ?? mid
            if firstChar > 0 {
                return String(chars[firstChar / 2])
            } else {
                // No room — prepend "a" and find midpoint of rest
                return "a" + midpoint("", String(after.dropFirst()))
            }

        case (let before?, nil):
            // Insert after the last item
            let lastChar = before.first.flatMap { charIndex($0) } ?? mid
            if lastChar < chars.count - 1 {
                let newIndex = lastChar + (chars.count - 1 - lastChar) / 2
                return String(chars[newIndex])
            } else {
                // No room — append midpoint character
                return before + String(chars[mid])
            }

        case (let before?, let after?):
            return midpoint(before, after)
        }
    }

    /// Compute a string midpoint between two strings.
    private static func midpoint(_ a: String, _ b: String) -> String {
        let aChars = Array(a)
        let bChars = Array(b)
        let maxLen = max(aChars.count, bChars.count)
        var result = ""

        for i in 0..<maxLen {
            let aVal = i < aChars.count ? (charIndex(aChars[i]) ?? 0) : 0
            let bVal = i < bChars.count ? (charIndex(bChars[i]) ?? 25) : 25

            if aVal == bVal {
                result.append(chars[aVal])
                continue
            }

            let midVal = (aVal + bVal) / 2
            if midVal > aVal {
                result.append(chars[midVal])
                return result
            } else {
                // aVal and bVal are adjacent, need to go deeper
                result.append(chars[aVal])
                // Continue to next character with adjusted bounds
            }
        }

        // If we exhausted all characters, append midpoint
        result.append(chars[mid])
        return result
    }

    /// Get index of a character in our alphabet.
    private static func charIndex(_ c: Character) -> Int? {
        chars.firstIndex(of: c)
    }

    /// Reassign evenly-spaced ranks to a list of items.
    /// Returns an array of new rank strings in the same order as the input.
    /// Use this when any rank string exceeds `maxLength`.
    public static func rebalance(count: Int) -> [String] {
        guard count > 0 else { return [] }
        let step = Double(chars.count) / Double(count + 1)
        return (1...count).map { i in
            let idx = min(Int(step * Double(i)), chars.count - 1)
            return String(chars[idx])
        }
    }
}
```

**Done when:** The package builds successfully and you can call `LexoRank.between(nil, nil)` in a test.

**Gotcha:** This is a simplified implementation. It handles the common cases but edge cases (like inserting between "a" and "ab") may produce non-optimal results. This is acceptable for Phase 1 with < 1000 tasks per list. The `rebalance` function is the escape hatch if ranks get too long.

---

### Step 3.8: Unit tests for models

**File:** `$ROOT/Packages/NFLCore/Tests/NFLCoreTests/LexoRankTests.swift`

```swift
import Testing
@testable import NFLCore

@Suite("LexoRank Tests")
struct LexoRankTests {

    @Test("First item gets midpoint rank")
    func firstItem() {
        let rank = LexoRank.between(nil, nil)
        #expect(rank == "n")
    }

    @Test("Insert after last item")
    func afterLast() {
        let rank = LexoRank.between("n", nil)
        #expect(rank > "n")
    }

    @Test("Insert before first item")
    func beforeFirst() {
        let rank = LexoRank.between(nil, "n")
        #expect(rank < "n")
    }

    @Test("Insert between two items")
    func betweenTwo() {
        let rank = LexoRank.between("a", "c")
        #expect(rank > "a")
        #expect(rank < "c")
    }

    @Test("Insert between adjacent items subdivides")
    func adjacentItems() {
        let rank = LexoRank.between("a", "b")
        #expect(rank > "a")
        #expect(rank < "b")
        #expect(rank.count > 1, "Should append character when no room")
    }

    @Test("Rebalance produces evenly-spaced ranks")
    func rebalance() {
        let ranks = LexoRank.rebalance(count: 5)
        #expect(ranks.count == 5)
        for i in 0..<(ranks.count - 1) {
            #expect(ranks[i] < ranks[i + 1], "Ranks must be sorted: \(ranks[i]) < \(ranks[i + 1])")
        }
    }
}
```

**File:** `$ROOT/Packages/NFLCore/Tests/NFLCoreTests/ModelCodingTests.swift`

```swift
import Testing
import Foundation
@testable import NFLCore

@Suite("Model Coding Tests")
struct ModelCodingTests {

    @Test("NFLTask encodes to snake_case JSON")
    func taskEncoding() throws {
        let task = NFLTask(
            userID: UUID(),
            listID: UUID(),
            title: "Test task",
            sortOrder: "n"
        )
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .useDefaultKeys  // CodingKeys handle it
        let data = try encoder.encode(task)
        let json = String(data: data, encoding: .utf8)\!
        #expect(json.contains("\"user_id\""))
        #expect(json.contains("\"list_id\""))
        #expect(json.contains("\"sort_order\""))
        #expect(json.contains("\"is_completed\""))
    }

    @Test("Priority raw values match database convention")
    func priorityValues() {
        #expect(Priority.none.rawValue == 0)
        #expect(Priority.low.rawValue == 1)
        #expect(Priority.medium.rawValue == 2)
        #expect(Priority.high.rawValue == 3)
    }

    @Test("RepeatRule round-trips through JSON")
    func repeatRuleRoundTrip() throws {
        let rule = RepeatRule(type: .weekly, interval: 2, daysOfWeek: [1, 3, 5])
        let data = try JSONEncoder().encode(rule)
        let decoded = try JSONDecoder().decode(RepeatRule.self, from: data)
        #expect(decoded.type == .weekly)
        #expect(decoded.interval == 2)
        #expect(decoded.daysOfWeek == [1, 3, 5])
    }
}
```

**Done when:** `cd $ROOT/Packages/NFLCore && swift test` runs all tests and they pass.

**Gotcha:** Swift Testing (`import Testing`) requires Xcode 16+ / Swift 6. If you get "no such module 'Testing'," make sure your `swift-tools-version` in `Package.swift` is set to `6.0`.

---

## Milestone 4: Network Layer (NFLNetwork)

### Step 4.1: SupabaseClientProvider

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/SupabaseClientProvider.swift`

```swift
import Foundation
import Supabase

/// Provides a configured SupabaseClient instance.
/// React analogy: this is like creating an Axios instance with baseURL + auth headers.
///
/// Usage from the app target:
///   SupabaseClientProvider.configure(url: "...", anonKey: "...")
///   let client = SupabaseClientProvider.shared.client
public final class SupabaseClientProvider: Sendable {
    public static var shared: SupabaseClientProvider = {
        fatalError("Call SupabaseClientProvider.configure(url:anonKey:) before accessing .shared")
    }()

    public let client: SupabaseClient

    private init(url: URL, anonKey: String) {
        self.client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey
        )
    }

    /// Call this once at app launch, before any repository is created.
    public static func configure(url: String, anonKey: String) {
        guard let supabaseURL = URL(string: url) else {
            fatalError("Invalid Supabase URL: \(url)")
        }
        shared = SupabaseClientProvider(url: supabaseURL, anonKey: anonKey)
    }
}
```

**Done when:** File compiles (build the NFLNetwork package).

**Gotcha:** The `SupabaseClient` initializer parameters may vary slightly across `supabase-swift` versions. Check the actual initializer available in version 2.x if the build fails. Common parameters are `supabaseURL: URL` and `supabaseKey: String`.

---

### Step 4.2: Repository protocols

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/Protocols/RepositoryProtocol.swift`

```swift
import Foundation
import NFLCore

// MARK: - Task Repository

public protocol TaskRepositoryProtocol: Sendable {
    func fetchTasks(listID: UUID) async throws -> [NFLTask]
    func fetchAllTasks() async throws -> [NFLTask]
    func fetchTasksDueOn(date: Date) async throws -> [NFLTask]
    func fetchTasksDueBefore(date: Date) async throws -> [NFLTask]
    func fetchTasksDueInRange(from: Date, to: Date) async throws -> [NFLTask]
    func fetchCompletedTasks(since: Date) async throws -> [NFLTask]
    func createTask(_ task: NFLTask) async throws -> NFLTask
    func updateTask(_ task: NFLTask) async throws -> NFLTask
    func softDeleteTask(id: UUID) async throws
    func reorderTask(id: UUID, newSortOrder: String) async throws
}

// MARK: - List Repository

public protocol ListRepositoryProtocol: Sendable {
    func fetchLists() async throws -> [TaskList]
    func createList(_ list: TaskList) async throws -> TaskList
    func updateList(_ list: TaskList) async throws -> TaskList
    func archiveList(id: UUID) async throws
    func softDeleteList(id: UUID) async throws
    func reorderList(id: UUID, newSortOrder: String) async throws
}

// MARK: - Group Repository

public protocol GroupRepositoryProtocol: Sendable {
    func fetchGroups() async throws -> [ListGroup]
    func createGroup(_ group: ListGroup) async throws -> ListGroup
    func updateGroup(_ group: ListGroup) async throws -> ListGroup
    func softDeleteGroup(id: UUID) async throws
    func reorderGroup(id: UUID, newSortOrder: String) async throws
}

// MARK: - Tag Repository

public protocol TagRepositoryProtocol: Sendable {
    func fetchTags() async throws -> [Tag]
    func createTag(_ tag: Tag) async throws -> Tag
    func updateTag(_ tag: Tag) async throws -> Tag
    func softDeleteTag(id: UUID) async throws
    func addTagToTask(taskID: UUID, tagID: UUID) async throws
    func removeTagFromTask(taskID: UUID, tagID: UUID) async throws
    func fetchTaskCountPerTag() async throws -> [UUID: Int]
}

// MARK: - Search Repository

public protocol SearchRepositoryProtocol: Sendable {
    func search(query: String) async throws -> [NFLTask]
}
```

**Done when:** File compiles with no errors.

---

### Step 4.3: TaskRepository implementation

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/Repositories/TaskRepository.swift`

```swift
import Foundation
import Supabase
import NFLCore

public final class TaskRepository: TaskRepositoryProtocol, @unchecked Sendable {
    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    public func fetchTasks(listID: UUID) async throws -> [NFLTask] {
        try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .eq("list_id", value: listID.uuidString)
            .is("deleted_at", value: nil)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    public func fetchAllTasks() async throws -> [NFLTask] {
        try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .is("deleted_at", value: nil)
            .eq("is_completed", value: false)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    public func fetchTasksDueOn(date: Date) async throws -> [NFLTask] {
        let dateStr = formatDate(date)
        return try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .eq("due_date", value: dateStr)
            .is("deleted_at", value: nil)
            .eq("is_completed", value: false)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    public func fetchTasksDueBefore(date: Date) async throws -> [NFLTask] {
        let dateStr = formatDate(date)
        return try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .lt("due_date", value: dateStr)
            .is("deleted_at", value: nil)
            .eq("is_completed", value: false)
            .order("due_date", ascending: true)
            .execute()
            .value
    }

    public func fetchTasksDueInRange(from: Date, to: Date) async throws -> [NFLTask] {
        let fromStr = formatDate(from)
        let toStr = formatDate(to)
        return try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .gte("due_date", value: fromStr)
            .lte("due_date", value: toStr)
            .is("deleted_at", value: nil)
            .eq("is_completed", value: false)
            .order("due_date", ascending: true)
            .execute()
            .value
    }

    public func fetchCompletedTasks(since: Date) async throws -> [NFLTask] {
        let sinceStr = since.ISO8601Format()
        return try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .is("deleted_at", value: nil)
            .eq("is_completed", value: true)
            .gte("completed_at", value: sinceStr)
            .order("completed_at", ascending: false)
            .execute()
            .value
    }

    public func createTask(_ task: NFLTask) async throws -> NFLTask {
        try await client.from("tasks")
            .insert(task)
            .select()
            .single()
            .execute()
            .value
    }

    public func updateTask(_ task: NFLTask) async throws -> NFLTask {
        try await client.from("tasks")
            .update(task)
            .eq("id", value: task.id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    public func softDeleteTask(id: UUID) async throws {
        struct SoftDelete: Encodable {
            let deleted_at: String
        }
        try await client.from("tasks")
            .update(SoftDelete(deleted_at: Date.now.ISO8601Format()))
            .eq("id", value: id.uuidString)
            .execute()
    }

    public func reorderTask(id: UUID, newSortOrder: String) async throws {
        struct Reorder: Encodable {
            let sort_order: String
        }
        try await client.from("tasks")
            .update(Reorder(sort_order: newSortOrder))
            .eq("id", value: id.uuidString)
            .execute()
    }

    // MARK: - Helpers

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter.string(from: date)
    }
}
```

**Done when:** File compiles. Actual integration testing happens in Step 4.9.

**Gotcha:** The Supabase Swift SDK's `select("*, tags:task_tags(tag:tags(*))")` syntax for nested joins may need adjustment depending on the exact SDK version. This is PostgREST resource embedding syntax. If you get decoding errors, the issue is likely that the nested JSON shape does not match the `tags: [Tag]?` property. You may need a custom decoder or a separate DTO for the joined response. Test this early.

---

### Step 4.4: ListRepository implementation

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/Repositories/ListRepository.swift`

```swift
import Foundation
import Supabase
import NFLCore

public final class ListRepository: ListRepositoryProtocol, @unchecked Sendable {
    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    public func fetchLists() async throws -> [TaskList] {
        try await client.from("lists")
            .select()
            .is("deleted_at", value: nil)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    public func createList(_ list: TaskList) async throws -> TaskList {
        try await client.from("lists")
            .insert(list)
            .select()
            .single()
            .execute()
            .value
    }

    public func updateList(_ list: TaskList) async throws -> TaskList {
        try await client.from("lists")
            .update(list)
            .eq("id", value: list.id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    public func archiveList(id: UUID) async throws {
        struct Archive: Encodable {
            let is_archived: Bool
        }
        try await client.from("lists")
            .update(Archive(is_archived: true))
            .eq("id", value: id.uuidString)
            .execute()
    }

    public func softDeleteList(id: UUID) async throws {
        struct SoftDelete: Encodable {
            let deleted_at: String
        }
        try await client.from("lists")
            .update(SoftDelete(deleted_at: Date.now.ISO8601Format()))
            .eq("id", value: id.uuidString)
            .execute()
    }

    public func reorderList(id: UUID, newSortOrder: String) async throws {
        struct Reorder: Encodable {
            let sort_order: String
        }
        try await client.from("lists")
            .update(Reorder(sort_order: newSortOrder))
            .eq("id", value: id.uuidString)
            .execute()
    }
}
```

**Done when:** File compiles.

---

### Step 4.5: TagRepository implementation

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/Repositories/TagRepository.swift`

```swift
import Foundation
import Supabase
import NFLCore

public final class TagRepository: TagRepositoryProtocol, @unchecked Sendable {
    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    public func fetchTags() async throws -> [Tag] {
        try await client.from("tags")
            .select()
            .is("deleted_at", value: nil)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    public func createTag(_ tag: Tag) async throws -> Tag {
        try await client.from("tags")
            .insert(tag)
            .select()
            .single()
            .execute()
            .value
    }

    public func updateTag(_ tag: Tag) async throws -> Tag {
        try await client.from("tags")
            .update(tag)
            .eq("id", value: tag.id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    public func softDeleteTag(id: UUID) async throws {
        struct SoftDelete: Encodable {
            let deleted_at: String
        }
        try await client.from("tags")
            .update(SoftDelete(deleted_at: Date.now.ISO8601Format()))
            .eq("id", value: id.uuidString)
            .execute()
    }

    public func addTagToTask(taskID: UUID, tagID: UUID) async throws {
        struct TaskTag: Encodable {
            let task_id: String
            let tag_id: String
        }
        try await client.from("task_tags")
            .insert(TaskTag(task_id: taskID.uuidString, tag_id: tagID.uuidString))
            .execute()
    }

    public func removeTagFromTask(taskID: UUID, tagID: UUID) async throws {
        try await client.from("task_tags")
            .delete()
            .eq("task_id", value: taskID.uuidString)
            .eq("tag_id", value: tagID.uuidString)
            .execute()
    }

    public func fetchTaskCountPerTag() async throws -> [UUID: Int] {
        // Use a raw RPC call or query task_tags grouped by tag_id
        // For Phase 1, fetch all task_tags and count client-side
        struct TaskTagRow: Decodable {
            let tag_id: UUID
        }
        let rows: [TaskTagRow] = try await client.from("task_tags")
            .select("tag_id")
            .execute()
            .value
        var counts: [UUID: Int] = [:]
        for row in rows {
            counts[row.tag_id, default: 0] += 1
        }
        return counts
    }
}
```

**Done when:** File compiles.

---

### Step 4.6: GroupRepository implementation

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/Repositories/GroupRepository.swift`

```swift
import Foundation
import Supabase
import NFLCore

public final class GroupRepository: GroupRepositoryProtocol, @unchecked Sendable {
    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    public func fetchGroups() async throws -> [ListGroup] {
        try await client.from("list_groups")
            .select()
            .is("deleted_at", value: nil)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    public func createGroup(_ group: ListGroup) async throws -> ListGroup {
        try await client.from("list_groups")
            .insert(group)
            .select()
            .single()
            .execute()
            .value
    }

    public func updateGroup(_ group: ListGroup) async throws -> ListGroup {
        try await client.from("list_groups")
            .update(group)
            .eq("id", value: group.id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    public func softDeleteGroup(id: UUID) async throws {
        struct SoftDelete: Encodable {
            let deleted_at: String
        }
        try await client.from("list_groups")
            .update(SoftDelete(deleted_at: Date.now.ISO8601Format()))
            .eq("id", value: id.uuidString)
            .execute()
    }

    public func reorderGroup(id: UUID, newSortOrder: String) async throws {
        struct Reorder: Encodable {
            let sort_order: String
        }
        try await client.from("list_groups")
            .update(Reorder(sort_order: newSortOrder))
            .eq("id", value: id.uuidString)
            .execute()
    }
}
```

**Done when:** File compiles.

---

### Step 4.7: SearchRepository implementation

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/Repositories/SearchRepository.swift`

```swift
import Foundation
import Supabase
import NFLCore

public final class SearchRepository: SearchRepositoryProtocol, @unchecked Sendable {
    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    /// Full-text search across task title and description using the GIN index.
    /// Uses PostgreSQL `to_tsquery('simple', ...)` for language-agnostic search
    /// (important: 'simple' config works with Chinese characters).
    public func search(query: String) async throws -> [NFLTask] {
        // PostgREST text search: column=fts.query
        // The 'simple' configuration tokenizes on whitespace/punctuation,
        // which works for CJK when terms are space-separated or exact.
        // For better CJK search, consider pg_bigm extension in the future.
        let searchQuery = query.split(separator: " ").joined(separator: " & ")
        return try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .is("deleted_at", value: nil)
            .textSearch(
                "title",
                query: searchQuery,
                config: "simple",
                type: .plain
            )
            .order("updated_at", ascending: false)
            .limit(50)
            .execute()
            .value
    }
}
```

**Done when:** File compiles.

**Gotcha:** PostgreSQL full-text search with `simple` configuration is not great for Chinese text. For Phase 1, this is acceptable — search will match exact tokens. If Chinese search quality is poor, consider adding `pg_bigm` or `pgroonga` extension later.

---

### Step 4.8: RealtimeManager

**File:** `$ROOT/Packages/NFLNetwork/Sources/NFLNetwork/Realtime/RealtimeManager.swift`

```swift
import Foundation
import Supabase
import NFLCore

/// Manages Supabase Realtime WebSocket subscriptions.
/// Notifies the app when tasks, lists, tags, or groups change on the server.
///
/// React analogy: a WebSocket hook that dispatches actions on incoming events.
@MainActor
@Observable
public final class RealtimeManager {
    private let client: SupabaseClient
    private var channels: [RealtimeChannelV2] = []

    public var isConnected = false

    public init(client: SupabaseClient) {
        self.client = client
    }

    /// Subscribe to changes on a specific table.
    /// - Parameters:
    ///   - table: The Supabase table name (e.g. "tasks", "lists")
    ///   - userID: The authenticated user's UUID (used as RLS filter)
    ///   - onInsert: Called when a new row is inserted
    ///   - onUpdate: Called when a row is updated
    ///   - onDelete: Called when a row is deleted
    public func subscribe<T: Codable & Sendable>(
        to table: String,
        userID: UUID,
        as type: T.Type,
        onInsert: @escaping @Sendable @MainActor (T) -> Void,
        onUpdate: @escaping @Sendable @MainActor (T) -> Void,
        onDelete: @escaping @Sendable @MainActor (T) -> Void
    ) async {
        let channel = client.realtimeV2.channel("public:\(table)")

        let inserts = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: table,
            filter: "user_id=eq.\(userID.uuidString)"
        )

        let updates = channel.postgresChange(
            UpdateAction.self,
            schema: "public",
            table: table,
            filter: "user_id=eq.\(userID.uuidString)"
        )

        let deletes = channel.postgresChange(
            DeleteAction.self,
            schema: "public",
            table: table,
            filter: "user_id=eq.\(userID.uuidString)"
        )

        await channel.subscribe()
        channels.append(channel)
        isConnected = true

        // Spawn listeners
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        Task { [weak self] in
            for await insert in inserts {
                if let record = try? insert.decodeRecord(as: T.self, decoder: decoder) {
                    await MainActor.run { onInsert(record) }
                }
            }
            // Channel closed
            await MainActor.run { self?.isConnected = false }
        }
        Task {
            for await update in updates {
                if let record = try? update.decodeRecord(as: T.self, decoder: decoder) {
                    await MainActor.run { onUpdate(record) }
                }
            }
        }
        Task {
            for await delete in deletes {
                if let record = try? delete.decodeOldRecord(as: T.self, decoder: decoder) {
                    await MainActor.run { onDelete(record) }
                }
            }
        }
    }

    /// Unsubscribe from all channels.
    public func unsubscribeAll() async {
        for channel in channels {
            await channel.unsubscribe()
        }
        channels.removeAll()
        isConnected = false
    }
}
```

**Done when:** File compiles. Full Realtime testing requires a running Supabase instance (tested in Step 4.9).

**Gotcha:** The `supabase-swift` Realtime API has changed across versions. If `postgresChange`, `InsertAction`, `UpdateAction`, `DeleteAction` are not recognized, check the SDK's README for the current Realtime API shape. You may need to use `channel.onPostgresChange` or a different method.

---

### Step 4.9: Integration tests

**File:** `$ROOT/Packages/NFLNetwork/Tests/NFLNetworkTests/TaskRepositoryTests.swift`

This step verifies that the repositories can actually talk to Supabase. These tests require a running Supabase instance (local or cloud).

```swift
import Testing
import Foundation
@testable import NFLNetwork
@testable import NFLCore
import Supabase

@Suite("TaskRepository Integration Tests")
struct TaskRepositoryIntegrationTests {

    // IMPORTANT: These tests run against a REAL Supabase instance.
    // Set environment variables SUPABASE_URL and SUPABASE_ANON_KEY before running.
    // Or hardcode test values (not recommended for CI).

    private func makeClient() -> SupabaseClient {
        let url = ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "http://localhost:54321"
        let key = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "your-local-anon-key"
        return SupabaseClient(supabaseURL: URL(string: url)\!, supabaseKey: key)
    }

    @Test("Create and fetch a task")
    func createAndFetch() async throws {
        let client = makeClient()

        // Sign in anonymously to get a user_id
        let session = try await client.auth.signInAnonymously()
        let userID = session.user.id

        // Fetch the user's Inbox (created by trigger)
        let lists: [TaskList] = try await client.from("lists")
            .select()
            .eq("user_id", value: userID.uuidString)
            .eq("is_inbox", value: true)
            .execute()
            .value
        let inbox = try #require(lists.first, "Inbox should be created by trigger")

        // Create a task
        let repo = TaskRepository(client: client)
        let task = NFLTask(
            userID: userID,
            listID: inbox.id,
            title: "Integration test task",
            sortOrder: "n"
        )
        let created = try await repo.createTask(task)
        #expect(created.title == "Integration test task")
        #expect(created.listID == inbox.id)

        // Fetch tasks for the inbox
        let fetched = try await repo.fetchTasks(listID: inbox.id)
        #expect(fetched.contains(where: { $0.id == created.id }))

        // Clean up: soft delete
        try await repo.softDeleteTask(id: created.id)
    }
}
```

**Done when:**
- The test file compiles.
- If you run the test with a real Supabase instance, it passes. (It is acceptable to skip this in CI for now and run manually.)
- The anonymous sign-in creates a user, the trigger creates an Inbox list, and a task can be created and fetched.

**Tip:** Run `supabase start` for local development. The local URL is `http://localhost:54321` and the anon key is printed to the console.

---

## Milestone 5: App Shell and Navigation

### Step 5.1: App entry point + anonymous auth

**File:** `$ROOT/NotForgetList/App/NotForgetListApp.swift`

```swift
import SwiftUI
import NFLNetwork
import NFLCore

@main
struct NotForgetListApp: App {
    @State private var appState = AppState()

    init() {
        // Configure Supabase before any view loads
        SupabaseClientProvider.configure(
            url: AppConstants.supabaseURL,
            anonKey: AppConstants.supabaseAnonKey
        )
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .task {
                    await appState.signInAnonymously()
                }
        }
    }
}
```

**File:** `$ROOT/NotForgetList/App/AppState.swift`

```swift
import SwiftUI
import NFLNetwork
import NFLCore

/// Root application state. Holds the authenticated user ID and loading state.
/// React analogy: this is your root context provider.
@Observable
@MainActor
final class AppState {
    var userID: UUID?
    var isLoading = true
    var error: Error?

    var isAuthenticated: Bool { userID \!= nil }

    func signInAnonymously() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Check for existing session first
            let session = try await SupabaseClientProvider.shared.client.auth.session
            userID = session.user.id
        } catch {
            // No existing session — sign in anonymously
            do {
                let session = try await SupabaseClientProvider.shared.client.auth.signInAnonymously()
                userID = session.user.id
            } catch {
                self.error = error
            }
        }
    }
}
```

**Done when:**
- The app launches without crashing on both iOS and macOS.
- The console does NOT show any auth errors (if Supabase is configured correctly).
- `appState.userID` has a value after launch.

**Gotcha:** You must fill in real values in `AppConstants.swift` (Step 1.5) before this step works. If you have not set up Supabase yet, the app will crash on launch. Make sure Milestone 2 is done first.

---

### Step 5.2: Root NavigationSplitView

**File:** `$ROOT/NotForgetList/App/RootView.swift`

```swift
import SwiftUI
import NFLCore

struct RootView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedSidebarItem: SidebarItem?
    @State private var selectedTaskID: UUID?
    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    var body: some View {
        if appState.isLoading {
            ProgressView("Loading...")
        } else if let error = appState.error {
            ContentUnavailableView {
                Label("Connection Error", systemImage: "wifi.exclamationmark")
            } description: {
                Text(error.localizedDescription)
            }
        } else {
            #if os(macOS)
            macOSNavigation
            #else
            iOSNavigation
            #endif
        }
    }

    // MARK: - macOS: 3-column split view
    private var macOSNavigation: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView(selection: $selectedSidebarItem)
        } content: {
            if let item = selectedSidebarItem {
                TaskListView(
                    sidebarItem: item,
                    selectedTaskID: $selectedTaskID
                )
            } else {
                ContentUnavailableView("Select a list", systemImage: "list.bullet")
            }
        } detail: {
            if let taskID = selectedTaskID {
                TaskDetailView(taskID: taskID)
            } else {
                ContentUnavailableView("Select a task", systemImage: "checkmark.circle")
            }
        }
    }

    // MARK: - iOS: 2-column with push navigation
    private var iOSNavigation: some View {
        NavigationSplitView {
            SidebarView(selection: $selectedSidebarItem)
        } detail: {
            if let item = selectedSidebarItem {
                NavigationStack {
                    TaskListView(
                        sidebarItem: item,
                        selectedTaskID: $selectedTaskID
                    )
                    .navigationDestination(for: UUID.self) { taskID in
                        TaskDetailView(taskID: taskID)
                    }
                }
            } else {
                ContentUnavailableView("Select a list", systemImage: "list.bullet")
            }
        }
    }
}
```

**File:** `$ROOT/NotForgetList/Features/Sidebar/SidebarItem.swift`

```swift
import Foundation

/// Represents a selectable item in the sidebar.
/// Used as the selection binding for NavigationSplitView.
enum SidebarItem: Hashable {
    // Smart lists
    case today
    case tomorrow
    case upcoming
    case allTasks
    case completed

    // User lists
    case list(id: UUID)

    // Tag filter
    case tag(id: UUID)
}
```

**Done when:**
- The app displays a split view on macOS (sidebar + content + detail).
- The app displays a split view on iOS (sidebar + detail).
- Empty state messages appear in the content and detail columns.

**Gotcha:** At this point, `SidebarView`, `TaskListView`, and `TaskDetailView` do not exist yet. Create placeholder files for them now so the project compiles:

Create `$ROOT/NotForgetList/Features/Sidebar/SidebarView.swift`:
```swift
import SwiftUI
struct SidebarView: View {
    @Binding var selection: SidebarItem?
    var body: some View {
        List { Text("Sidebar placeholder") }
            .navigationTitle("Not Forget List")
    }
}
```

Create `$ROOT/NotForgetList/Features/TaskList/TaskListView.swift`:
```swift
import SwiftUI
struct TaskListView: View {
    let sidebarItem: SidebarItem
    @Binding var selectedTaskID: UUID?
    var body: some View {
        Text("Task list placeholder")
    }
}
```

Create `$ROOT/NotForgetList/Features/TaskDetail/TaskDetailView.swift`:
```swift
import SwiftUI
struct TaskDetailView: View {
    let taskID: UUID
    var body: some View {
        Text("Task detail placeholder")
    }
}
```

---

### Step 5.3: Preview data helper

**File:** `$ROOT/NotForgetList/Preview Content/PreviewData.swift`

```swift
import Foundation
import NFLCore

/// Mock data for SwiftUI previews. Never used in production.
enum PreviewData {
    static let userID = UUID(uuidString: "00000000-0000-0000-0000-000000000001")\!
    static let inboxID = UUID(uuidString: "00000000-0000-0000-0000-000000000010")\!

    static let inbox = TaskList(
        id: inboxID,
        userID: userID,
        name: "Inbox",
        isInbox: true,
        isArchived: false,
        sortOrder: "a"
    )

    static let workList = TaskList(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000011")\!,
        userID: userID,
        name: "Work",
        color: "#4A90D9",
        isInbox: false,
        isArchived: false,
        sortOrder: "n"
    )

    static let sampleTasks: [NFLTask] = [
        NFLTask(
            userID: userID,
            listID: inboxID,
            title: "Buy groceries",
            priority: .medium,
            dueDate: .now,
            sortOrder: "a"
        ),
        NFLTask(
            userID: userID,
            listID: inboxID,
            title: "Review PR #42",
            description: "Check the **new API** changes",
            priority: .high,
            dueDate: .now,
            sortOrder: "n"
        ),
        NFLTask(
            userID: userID,
            listID: inboxID,
            title: "Read Swift concurrency docs",
            priority: .low,
            sortOrder: "u"
        ),
    ]

    static let sampleTag = Tag(
        userID: userID,
        name: "urgent",
        color: "#FF6B6B",
        sortOrder: "n"
    )
}
```

**Done when:** File exists and compiles. This will be used in previews throughout later milestones.

---

## Milestone 6: Sidebar

### Step 6.1: SidebarViewModel

**File:** `$ROOT/NotForgetList/Features/Sidebar/SidebarViewModel.swift`

```swift
import SwiftUI
import NFLCore
import NFLNetwork

@Observable
@MainActor
final class SidebarViewModel {
    var lists: [TaskList] = []
    var groups: [ListGroup] = []
    var tags: [Tag] = []
    var tagCounts: [UUID: Int] = [:]
    var isLoading = false
    var error: Error?

    private let listRepo: ListRepositoryProtocol
    private let groupRepo: GroupRepositoryProtocol
    private let tagRepo: TagRepositoryProtocol

    init(
        listRepo: ListRepositoryProtocol,
        groupRepo: GroupRepositoryProtocol,
        tagRepo: TagRepositoryProtocol
    ) {
        self.listRepo = listRepo
        self.groupRepo = groupRepo
        self.tagRepo = tagRepo
    }

    // MARK: - Computed properties

    /// The Inbox list (always exists, cannot be deleted).
    var inbox: TaskList? { lists.first(where: { $0.isInbox }) }

    /// Lists that belong to a specific group.
    func lists(inGroup groupID: UUID) -> [TaskList] {
        lists.filter { $0.groupID == groupID && \!$0.isArchived }
    }

    /// Lists that do not belong to any group (and are not Inbox).
    var ungroupedLists: [TaskList] {
        lists.filter { $0.groupID == nil && \!$0.isInbox && \!$0.isArchived }
    }

    // MARK: - Data loading

    func loadAll() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let fetchedLists = listRepo.fetchLists()
            async let fetchedGroups = groupRepo.fetchGroups()
            async let fetchedTags = tagRepo.fetchTags()
            async let fetchedCounts = tagRepo.fetchTaskCountPerTag()

            lists = try await fetchedLists
            groups = try await fetchedGroups
            tags = try await fetchedTags
            tagCounts = try await fetchedCounts
        } catch {
            self.error = error
        }
    }

    // MARK: - List CRUD

    func createList(name: String, color: String?, groupID: UUID?) async {
        guard let userID = lists.first?.userID else { return }
        let sortOrder = LexoRank.between(lists.last?.sortOrder, nil)
        let newList = TaskList(
            userID: userID,
            groupID: groupID,
            name: name,
            color: color,
            isInbox: false,
            isArchived: false,
            sortOrder: sortOrder
        )
        lists.append(newList)
        do {
            let created = try await listRepo.createList(newList)
            if let index = lists.firstIndex(where: { $0.id == newList.id }) {
                lists[index] = created
            }
        } catch {
            lists.removeAll { $0.id == newList.id }
            self.error = error
        }
    }

    func deleteList(id: UUID) async {
        guard let index = lists.firstIndex(where: { $0.id == id }) else { return }
        guard \!lists[index].isInbox else { return } // Cannot delete Inbox
        let removed = lists.remove(at: index)
        do {
            try await listRepo.softDeleteList(id: id)
        } catch {
            lists.insert(removed, at: index)
            self.error = error
        }
    }

    // MARK: - Group CRUD

    func createGroup(name: String) async {
        guard let userID = lists.first?.userID else { return }
        let sortOrder = LexoRank.between(groups.last?.sortOrder, nil)
        let newGroup = ListGroup(userID: userID, name: name, sortOrder: sortOrder)
        groups.append(newGroup)
        do {
            let created = try await groupRepo.createGroup(newGroup)
            if let index = groups.firstIndex(where: { $0.id == newGroup.id }) {
                groups[index] = created
            }
        } catch {
            groups.removeAll { $0.id == newGroup.id }
            self.error = error
        }
    }

    func deleteGroup(id: UUID) async {
        guard let index = groups.firstIndex(where: { $0.id == id }) else { return }
        let removed = groups.remove(at: index)
        // Move lists in this group to ungrouped
        for i in lists.indices where lists[i].groupID == id {
            lists[i].groupID = nil
        }
        do {
            try await groupRepo.softDeleteGroup(id: id)
        } catch {
            groups.insert(removed, at: index)
            self.error = error
        }
    }

    // MARK: - Tag CRUD

    func createTag(name: String, color: String?) async {
        guard let userID = lists.first?.userID else { return }
        let sortOrder = LexoRank.between(tags.last?.sortOrder, nil)
        let newTag = Tag(userID: userID, name: name, color: color, sortOrder: sortOrder)
        tags.append(newTag)
        do {
            let created = try await tagRepo.createTag(newTag)
            if let index = tags.firstIndex(where: { $0.id == newTag.id }) {
                tags[index] = created
            }
        } catch {
            tags.removeAll { $0.id == newTag.id }
            self.error = error
        }
    }
}
```

**Done when:** File compiles.

---

### Step 6.2: SidebarView — lists and groups

**File:** `$ROOT/NotForgetList/Features/Sidebar/SidebarView.swift` (replace placeholder)

```swift
import SwiftUI
import NFLCore
import NFLNetwork

struct SidebarView: View {
    @Binding var selection: SidebarItem?
    @Environment(AppState.self) private var appState
    @State private var viewModel: SidebarViewModel?
    @State private var showNewList = false
    @State private var showNewGroup = false

    var body: some View {
        Group {
            if let vm = viewModel {
                sidebarContent(vm)
            } else {
                ProgressView()
            }
        }
        .navigationTitle("Not Forget List")
        .task {
            guard viewModel == nil, let userID = appState.userID else { return }
            let client = SupabaseClientProvider.shared.client
            let vm = SidebarViewModel(
                listRepo: ListRepository(client: client),
                groupRepo: GroupRepository(client: client),
                tagRepo: TagRepository(client: client)
            )
            viewModel = vm
            await vm.loadAll()
            // Auto-select Inbox on first load
            if selection == nil, let inbox = vm.inbox {
                selection = .list(id: inbox.id)
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("New List", systemImage: "list.bullet") {
                        showNewList = true
                    }
                    Button("New Group", systemImage: "folder") {
                        showNewGroup = true
                    }
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showNewList) {
            if let vm = viewModel {
                CreateListSheet(viewModel: vm)
            }
        }
        .sheet(isPresented: $showNewGroup) {
            if let vm = viewModel {
                CreateGroupSheet(viewModel: vm)
            }
        }
    }

    @ViewBuilder
    private func sidebarContent(_ vm: SidebarViewModel) -> some View {
        List(selection: $selection) {
            // MARK: Smart Lists
            Section("Smart Lists") {
                Label("Today", systemImage: "star")
                    .tag(SidebarItem.today)
                Label("Tomorrow", systemImage: "sunrise")
                    .tag(SidebarItem.tomorrow)
                Label("Upcoming", systemImage: "calendar")
                    .tag(SidebarItem.upcoming)
                Label("All Tasks", systemImage: "tray.full")
                    .tag(SidebarItem.allTasks)
                Label("Completed", systemImage: "checkmark.circle")
                    .tag(SidebarItem.completed)
            }

            // MARK: Inbox
            if let inbox = vm.inbox {
                Section {
                    Label(inbox.name, systemImage: "tray")
                        .tag(SidebarItem.list(id: inbox.id))
                }
            }

            // MARK: Groups + their lists
            ForEach(vm.groups) { group in
                Section(group.name) {
                    ForEach(vm.lists(inGroup: group.id)) { list in
                        listRow(list)
                    }
                }
            }

            // MARK: Ungrouped lists
            if \!vm.ungroupedLists.isEmpty {
                Section("Lists") {
                    ForEach(vm.ungroupedLists) { list in
                        listRow(list)
                    }
                }
            }

            // MARK: Tags
            if \!vm.tags.isEmpty {
                Section("Tags") {
                    ForEach(vm.tags) { tag in
                        Label(tag.name, systemImage: "tag")
                            .tag(SidebarItem.tag(id: tag.id))
                    }
                }
            }
        }
    }

    private func listRow(_ list: TaskList) -> some View {
        Label(list.name, systemImage: "list.bullet")
            .tag(SidebarItem.list(id: list.id))
            .contextMenu {
                if \!list.isInbox {
                    Button("Archive", systemImage: "archivebox") {
                        Task { await viewModel?.deleteList(id: list.id) }
                    }
                    Button("Delete", systemImage: "trash", role: .destructive) {
                        Task { await viewModel?.deleteList(id: list.id) }
                    }
                }
            }
    }
}
```

**Note:** `CreateListSheet` and `CreateGroupSheet` are built in Milestone 10. For now, create stub files so the project compiles:

**File:** `$ROOT/NotForgetList/Features/Sidebar/CreateListSheet.swift`
```swift
import SwiftUI
struct CreateListSheet: View {
    let viewModel: SidebarViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    var body: some View {
        NavigationStack {
            Form {
                TextField("List name", text: $name)
            }
            .navigationTitle("New List")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task { await viewModel.createList(name: name, color: nil, groupID: nil) }
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}
```

**File:** `$ROOT/NotForgetList/Features/Sidebar/CreateGroupSheet.swift`
```swift
import SwiftUI
struct CreateGroupSheet: View {
    let viewModel: SidebarViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    var body: some View {
        NavigationStack {
            Form {
                TextField("Group name", text: $name)
            }
            .navigationTitle("New Group")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task { await viewModel.createGroup(name: name) }
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}
```

**Done when:**
- The sidebar renders with Smart Lists, Inbox, and any user-created lists/groups/tags.
- Tapping/clicking a sidebar item updates the `selection` binding (visible in the content area changing, even if it is just a placeholder).
- Context menu on lists shows Archive and Delete options.

---

## Milestone 7: Task List View

### Step 7.1: TaskListViewModel

**File:** `$ROOT/NotForgetList/Features/TaskList/TaskListViewModel.swift`

```swift
import SwiftUI
import NFLCore
import NFLNetwork

@Observable
@MainActor
final class TaskListViewModel {
    var tasks: [NFLTask] = []
    var isLoading = false
    var error: Error?

    private let taskRepo: TaskRepositoryProtocol
    private let sidebarItem: SidebarItem
    private let userID: UUID

    init(sidebarItem: SidebarItem, userID: UUID, taskRepo: TaskRepositoryProtocol) {
        self.sidebarItem = sidebarItem
        self.userID = userID
        self.taskRepo = taskRepo
    }

    var title: String {
        switch sidebarItem {
        case .today:     return String(localized: "Today")
        case .tomorrow:  return String(localized: "Tomorrow")
        case .upcoming:  return String(localized: "Upcoming")
        case .allTasks:  return String(localized: "All Tasks")
        case .completed: return String(localized: "Completed")
        case .list:      return ""  // Set by the view from the list name
        case .tag:       return ""  // Set by the view from the tag name
        }
    }

    // MARK: - Load

    func loadTasks() async {
        isLoading = true
        defer { isLoading = false }

        do {
            switch sidebarItem {
            case .today:
                let today = Calendar.current.startOfDay(for: .now)
                let dueTodayTasks = try await taskRepo.fetchTasksDueOn(date: today)
                let overdueTasks = try await taskRepo.fetchTasksDueBefore(date: today)
                tasks = overdueTasks + dueTodayTasks

            case .tomorrow:
                let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: .now)\!
                tasks = try await taskRepo.fetchTasksDueOn(date: tomorrow)

            case .upcoming:
                let today = Calendar.current.startOfDay(for: .now)
                let weekEnd = Calendar.current.date(byAdding: .day, value: 7, to: today)\!
                tasks = try await taskRepo.fetchTasksDueInRange(from: today, to: weekEnd)

            case .allTasks:
                tasks = try await taskRepo.fetchAllTasks()

            case .completed:
                let thirtyDaysAgo = Calendar.current.date(byAdding: .day, value: -30, to: .now)\!
                tasks = try await taskRepo.fetchCompletedTasks(since: thirtyDaysAgo)

            case .list(let id):
                tasks = try await taskRepo.fetchTasks(listID: id)

            case .tag:
                // Tag filtering: fetch all tasks and filter client-side
                // A server-side join query would be better but is complex with PostgREST
                let allTasks = try await taskRepo.fetchAllTasks()
                if case .tag(let tagID) = sidebarItem {
                    tasks = allTasks.filter { task in
                        task.tags?.contains(where: { $0.id == tagID }) ?? false
                    }
                }
            }
        } catch {
            self.error = error
        }
    }

    // MARK: - Actions

    func createTask(title: String, listID: UUID) async {
        let newSortOrder = LexoRank.between(tasks.last?.sortOrder, nil)
        let newTask = NFLTask(
            userID: userID,
            listID: listID,
            title: title,
            sortOrder: newSortOrder
        )
        tasks.append(newTask)
        do {
            let created = try await taskRepo.createTask(newTask)
            if let index = tasks.firstIndex(where: { $0.id == newTask.id }) {
                tasks[index] = created
            }
        } catch {
            tasks.removeAll { $0.id == newTask.id }
            self.error = error
        }
    }

    func toggleComplete(_ task: NFLTask) async {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        var updated = tasks[index]
        updated.isCompleted.toggle()
        updated.completedAt = updated.isCompleted ? .now : nil

        // Handle repeat: if completing a repeating task, create the next occurrence
        if updated.isCompleted, let rule = updated.repeatRule, let dueDate = updated.dueDate {
            let nextDate = nextOccurrence(from: dueDate, rule: rule)
            var nextTask = updated
            nextTask.isCompleted = false
            nextTask.completedAt = nil
            nextTask.dueDate = nextDate
            nextTask.sortOrder = LexoRank.between(tasks.last?.sortOrder, nil)
            // Create next occurrence in background
            Task {
                _ = try? await taskRepo.createTask(nextTask)
                await loadTasks()  // Refresh to show the new task
            }
        }

        tasks[index] = updated
        do {
            tasks[index] = try await taskRepo.updateTask(updated)
        } catch {
            tasks[index].isCompleted.toggle()
            tasks[index].completedAt = task.completedAt
            self.error = error
        }
    }

    func softDelete(_ task: NFLTask) async {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let removed = tasks.remove(at: index)
        do {
            try await taskRepo.softDeleteTask(id: task.id)
        } catch {
            tasks.insert(removed, at: index)
            self.error = error
        }
    }

    func reorder(from source: IndexSet, to destination: Int) async {
        var reordered = tasks
        reordered.move(fromOffsets: source, toOffset: destination)

        let movedIndex = destination > (source.first ?? 0) ? destination - 1 : destination
        let before = movedIndex > 0 ? reordered[movedIndex - 1].sortOrder : nil
        let after = movedIndex < reordered.count - 1 ? reordered[movedIndex + 1].sortOrder : nil
        let newRank = LexoRank.between(before, after)

        reordered[movedIndex].sortOrder = newRank
        tasks = reordered

        do {
            try await taskRepo.reorderTask(id: reordered[movedIndex].id, newSortOrder: newRank)
        } catch {
            await loadTasks()  // Reload on failure
        }
    }

    // MARK: - Helpers

    private func nextOccurrence(from date: Date, rule: RepeatRule) -> Date {
        let calendar = Calendar.current
        switch rule.type {
        case .daily:
            return calendar.date(byAdding: .day, value: rule.interval, to: date)\!
        case .weekly:
            return calendar.date(byAdding: .weekOfYear, value: rule.interval, to: date)\!
        case .monthly:
            return calendar.date(byAdding: .month, value: rule.interval, to: date)\!
        case .yearly:
            return calendar.date(byAdding: .year, value: rule.interval, to: date)\!
        case .custom:
            return calendar.date(byAdding: .day, value: rule.interval, to: date)\!
        }
    }
}
```

**Done when:** File compiles.

---

### Step 7.2: TaskListView — basic list rendering

**File:** `$ROOT/NotForgetList/Features/TaskList/TaskListView.swift` (replace placeholder)

```swift
import SwiftUI
import NFLCore
import NFLNetwork

struct TaskListView: View {
    let sidebarItem: SidebarItem
    @Binding var selectedTaskID: UUID?
    @Environment(AppState.self) private var appState
    @State private var viewModel: TaskListViewModel?
    @State private var newTaskTitle = ""

    /// The list ID, only available when sidebarItem is .list
    private var listID: UUID? {
        if case .list(let id) = sidebarItem { return id }
        return nil
    }

    var body: some View {
        Group {
            if let vm = viewModel {
                taskListContent(vm)
            } else {
                ProgressView()
            }
        }
        .task(id: sidebarItem) {
            guard let userID = appState.userID else { return }
            let client = SupabaseClientProvider.shared.client
            let vm = TaskListViewModel(
                sidebarItem: sidebarItem,
                userID: userID,
                taskRepo: TaskRepository(client: client)
            )
            viewModel = vm
            await vm.loadTasks()
        }
    }

    @ViewBuilder
    private func taskListContent(_ vm: TaskListViewModel) -> some View {
        List(selection: $selectedTaskID) {
            // Quick entry field (only for concrete lists, not smart lists)
            if let listID {
                quickEntryField(vm: vm, listID: listID)
            }

            // Task rows
            ForEach(vm.tasks) { task in
                TaskRowView(task: task) {
                    Task { await vm.toggleComplete(task) }
                }
                .tag(task.id)
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        Task { await vm.softDelete(task) }
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
                .swipeActions(edge: .leading) {
                    Button {
                        Task { await vm.toggleComplete(task) }
                    } label: {
                        Label(
                            task.isCompleted ? "Uncomplete" : "Complete",
                            systemImage: task.isCompleted ? "arrow.uturn.backward" : "checkmark"
                        )
                    }
                    .tint(.green)
                }
            }
            .onMove { source, destination in
                Task { await vm.reorder(from: source, to: destination) }
            }
        }
        .navigationTitle(vm.title)
        .refreshable {
            await vm.loadTasks()
        }
        .overlay {
            if vm.tasks.isEmpty && \!vm.isLoading {
                ContentUnavailableView("No Tasks", systemImage: "checkmark.circle")
            }
        }
    }

    private func quickEntryField(vm: TaskListViewModel, listID: UUID) -> some View {
        HStack {
            Image(systemName: "plus.circle")
                .foregroundStyle(.secondary)
            TextField("New task", text: $newTaskTitle)
                .onSubmit {
                    let title = newTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard \!title.isEmpty else { return }
                    newTaskTitle = ""
                    Task { await vm.createTask(title: title, listID: listID) }
                }
                .textFieldStyle(.plain)
        }
        .padding(.vertical, 4)
    }
}
```

**Done when:**
- Selecting a list in the sidebar shows its tasks (or empty state).
- The quick entry text field appears at the top of concrete lists.
- Typing a title and pressing Enter creates a new task.

---

### Step 7.3: TaskRowView component

**File:** `$ROOT/NotForgetList/Features/TaskList/TaskRowView.swift`

```swift
import SwiftUI
import NFLCore

struct TaskRowView: View {
    let task: NFLTask
    let onToggleComplete: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Completion checkbox
            Button(action: onToggleComplete) {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(task.isCompleted ? .green : .secondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(task.isCompleted ? "Mark incomplete" : "Mark complete")

            VStack(alignment: .leading, spacing: 4) {
                // Title
                Text(task.title)
                    .strikethrough(task.isCompleted)
                    .foregroundStyle(task.isCompleted ? .secondary : .primary)
                    .lineLimit(2)

                // Metadata row
                HStack(spacing: 8) {
                    // Priority badge
                    if task.priority \!= .none {
                        PriorityBadge(priority: task.priority)
                    }

                    // Due date
                    if let dueDate = task.dueDate {
                        DueDateLabel(date: dueDate)
                    }

                    // Tag chips (max 2 visible)
                    if let tags = task.tags, \!tags.isEmpty {
                        ForEach(tags.prefix(2)) { tag in
                            TagChip(tag: tag, size: .small)
                        }
                        if tags.count > 2 {
                            Text("+\(tags.count - 2)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle()) // Makes entire row tappable
        .accessibilityElement(children: .combine)
    }
}
```

Create the shared components referenced above:

**File:** `$ROOT/NotForgetList/Shared/Components/PriorityBadge.swift`

```swift
import SwiftUI
import NFLCore

struct PriorityBadge: View {
    let priority: Priority

    var body: some View {
        Label(priority.label, systemImage: priority.iconName)
            .font(.caption2)
            .foregroundStyle(color)
            .accessibilityLabel("Priority: \(priority.label)")
    }

    private var color: Color {
        switch priority {
        case .none:   .secondary
        case .low:    .blue
        case .medium: .orange
        case .high:   .red
        }
    }
}
```

**File:** `$ROOT/NotForgetList/Shared/Components/DueDateLabel.swift`

```swift
import SwiftUI

struct DueDateLabel: View {
    let date: Date

    var body: some View {
        Label(formattedDate, systemImage: "calendar")
            .font(.caption2)
            .foregroundStyle(isOverdue ? .red : .secondary)
    }

    private var isOverdue: Bool {
        date < Calendar.current.startOfDay(for: .now)
    }

    private var formattedDate: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return String(localized: "Today")
        } else if calendar.isDateInTomorrow(date) {
            return String(localized: "Tomorrow")
        } else {
            return date.formatted(.dateTime.month(.abbreviated).day())
        }
    }
}
```

**File:** `$ROOT/NotForgetList/Shared/Components/TagChip.swift`

```swift
import SwiftUI
import NFLCore

struct TagChip: View {
    let tag: Tag
    let size: ChipSize

    enum ChipSize {
        case small, regular
        var font: Font {
            switch self {
            case .small: .caption2
            case .regular: .caption
            }
        }
        var padding: EdgeInsets {
            switch self {
            case .small: EdgeInsets(top: 1, leading: 4, bottom: 1, trailing: 4)
            case .regular: EdgeInsets(top: 2, leading: 6, bottom: 2, trailing: 6)
            }
        }
    }

    var body: some View {
        Text(tag.name)
            .font(size.font)
            .padding(size.padding)
            .background(tagColor.opacity(0.15))
            .foregroundStyle(tagColor)
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var tagColor: Color {
        if let hex = tag.color {
            return Color(hex: hex)
        }
        return .secondary
    }
}

// MARK: - Color extension for hex strings

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}
```

**Done when:**
- Task rows display title, priority badge, due date, and tag chips.
- Completed tasks show strikethrough text and a filled checkmark.
- Swipe left to delete, swipe right to complete on iOS.
- Drag to reorder works on the list.

---

## Milestone 8: Task Detail View

### Step 8.1: TaskDetailViewModel

**File:** `$ROOT/NotForgetList/Features/TaskDetail/TaskDetailViewModel.swift`

```swift
import SwiftUI
import NFLCore
import NFLNetwork

@Observable
@MainActor
final class TaskDetailViewModel {
    var task: NFLTask?
    var allTags: [Tag] = []
    var isLoading = false
    var error: Error?

    private let taskRepo: TaskRepositoryProtocol
    private let tagRepo: TagRepositoryProtocol
    let taskID: UUID

    init(taskID: UUID, taskRepo: TaskRepositoryProtocol, tagRepo: TagRepositoryProtocol) {
        self.taskID = taskID
        self.taskRepo = taskRepo
        self.tagRepo = tagRepo
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            allTags = try await tagRepo.fetchTags()
            // Fetch the specific task — we re-fetch from the list or use fetchAllTasks + filter
            // For simplicity, fetch all and find the one we need.
            // A better approach is a fetchTask(id:) method on the repo.
            let allTasks = try await taskRepo.fetchAllTasks()
            task = allTasks.first(where: { $0.id == taskID })
        } catch {
            self.error = error
        }
    }

    func updateTitle(_ newTitle: String) async {
        guard var t = task else { return }
        t.title = newTitle
        task = t
        do { task = try await taskRepo.updateTask(t) }
        catch { self.error = error }
    }

    func updateDescription(_ newDescription: String?) async {
        guard var t = task else { return }
        t.description = newDescription
        task = t
        do { task = try await taskRepo.updateTask(t) }
        catch { self.error = error }
    }

    func updatePriority(_ priority: Priority) async {
        guard var t = task else { return }
        t.priority = priority
        task = t
        do { task = try await taskRepo.updateTask(t) }
        catch { self.error = error }
    }

    func updateDueDate(_ date: Date?) async {
        guard var t = task else { return }
        t.dueDate = date
        task = t
        do { task = try await taskRepo.updateTask(t) }
        catch { self.error = error }
    }

    func updateRepeatRule(_ rule: RepeatRule?) async {
        guard var t = task else { return }
        t.repeatRule = rule
        task = t
        do { task = try await taskRepo.updateTask(t) }
        catch { self.error = error }
    }

    func toggleTag(_ tag: Tag) async {
        guard let t = task else { return }
        let isCurrentlyAssigned = t.tags?.contains(where: { $0.id == tag.id }) ?? false

        // Optimistic update
        if isCurrentlyAssigned {
            task?.tags?.removeAll(where: { $0.id == tag.id })
        } else {
            if task?.tags == nil { task?.tags = [] }
            task?.tags?.append(tag)
        }

        do {
            if isCurrentlyAssigned {
                try await tagRepo.removeTagFromTask(taskID: t.id, tagID: tag.id)
            } else {
                try await tagRepo.addTagToTask(taskID: t.id, tagID: tag.id)
            }
        } catch {
            // Rollback
            if isCurrentlyAssigned {
                task?.tags?.append(tag)
            } else {
                task?.tags?.removeAll(where: { $0.id == tag.id })
            }
            self.error = error
        }
    }
}
```

**Done when:** File compiles.

**Gotcha:** The `fetchAllTasks` + filter approach for loading a single task is inefficient. Consider adding a `fetchTask(id:)` method to `TaskRepositoryProtocol` that does `.eq("id", value: id).single()`. This is a quick improvement you should make once everything works.

---

### Step 8.2: TaskDetailView — title, priority, due date

**File:** `$ROOT/NotForgetList/Features/TaskDetail/TaskDetailView.swift` (replace placeholder)

```swift
import SwiftUI
import NFLCore
import NFLNetwork

struct TaskDetailView: View {
    let taskID: UUID
    @Environment(AppState.self) private var appState
    @State private var viewModel: TaskDetailViewModel?
    @State private var editingTitle = ""
    @State private var showDatePicker = false
    @State private var showRepeatPicker = false

    var body: some View {
        Group {
            if let vm = viewModel, let task = vm.task {
                detailContent(task, vm: vm)
            } else if viewModel?.isLoading == true {
                ProgressView()
            } else {
                ContentUnavailableView("Task not found", systemImage: "questionmark.circle")
            }
        }
        .task(id: taskID) {
            let client = SupabaseClientProvider.shared.client
            let vm = TaskDetailViewModel(
                taskID: taskID,
                taskRepo: TaskRepository(client: client),
                tagRepo: TagRepository(client: client)
            )
            viewModel = vm
            await vm.load()
            editingTitle = vm.task?.title ?? ""
        }
    }

    @ViewBuilder
    private func detailContent(_ task: NFLTask, vm: TaskDetailViewModel) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Title field
                TextField("Task title", text: $editingTitle, axis: .vertical)
                    .font(.title2.bold())
                    .textFieldStyle(.plain)
                    .onSubmit {
                        Task { await vm.updateTitle(editingTitle) }
                    }
                    .onChange(of: editingTitle) {
                        // Debounce title updates (save after user stops typing)
                        // For simplicity, save on submit/focus-loss only
                    }

                Divider()

                // Priority picker
                HStack {
                    Label("Priority", systemImage: "flag")
                    Spacer()
                    Picker("Priority", selection: Binding(
                        get: { task.priority },
                        set: { newVal in Task { await vm.updatePriority(newVal) } }
                    )) {
                        ForEach(Priority.allCases, id: \.self) { p in
                            Label(p.label, systemImage: p.iconName).tag(p)
                        }
                    }
                    .pickerStyle(.menu)
                }

                // Due date
                HStack {
                    Label("Due date", systemImage: "calendar")
                    Spacer()
                    if let dueDate = task.dueDate {
                        Text(dueDate.formatted(.dateTime.month().day().year()))
                            .foregroundStyle(.secondary)
                        Button("Clear", systemImage: "xmark.circle") {
                            Task { await vm.updateDueDate(nil) }
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(.secondary)
                    }
                    Button(task.dueDate == nil ? "Set date" : "Change") {
                        showDatePicker = true
                    }
                }
                .sheet(isPresented: $showDatePicker) {
                    DatePickerSheet(
                        selectedDate: task.dueDate ?? .now,
                        onSave: { date in
                            Task { await vm.updateDueDate(date) }
                        }
                    )
                }

                // Repeat rule
                HStack {
                    Label("Repeat", systemImage: "repeat")
                    Spacer()
                    if let rule = task.repeatRule {
                        Text(rule.type.rawValue.capitalized)
                            .foregroundStyle(.secondary)
                    }
                    Button(task.repeatRule == nil ? "Set" : "Change") {
                        showRepeatPicker = true
                    }
                }
                .sheet(isPresented: $showRepeatPicker) {
                    RepeatRulePickerSheet(
                        rule: task.repeatRule,
                        onSave: { rule in
                            Task { await vm.updateRepeatRule(rule) }
                        }
                    )
                }

                Divider()

                // Tags
                tagSection(task, vm: vm)

                Divider()

                // Description editor (Milestone 9)
                descriptionSection(task, vm: vm)
            }
            .padding()
        }
        .navigationTitle("Task Detail")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    @ViewBuilder
    private func tagSection(_ task: NFLTask, vm: TaskDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Tags", systemImage: "tag")
                .font(.headline)

            FlowLayout(spacing: 8) {
                ForEach(vm.allTags) { tag in
                    let isSelected = task.tags?.contains(where: { $0.id == tag.id }) ?? false
                    Button {
                        Task { await vm.toggleTag(tag) }
                    } label: {
                        TagChip(tag: tag, size: .regular)
                            .opacity(isSelected ? 1.0 : 0.4)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder
    private func descriptionSection(_ task: NFLTask, vm: TaskDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Notes", systemImage: "note.text")
                .font(.headline)

            // Placeholder: plain TextEditor until NFLEditor is built (Milestone 9)
            TextEditor(text: Binding(
                get: { task.description ?? "" },
                set: { newValue in
                    Task { await vm.updateDescription(newValue.isEmpty ? nil : newValue) }
                }
            ))
            .frame(minHeight: 100)
            .font(.body)
            .scrollContentBackground(.hidden)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
```

**Supporting views:**

**File:** `$ROOT/NotForgetList/Features/TaskDetail/DatePickerSheet.swift`

```swift
import SwiftUI

struct DatePickerSheet: View {
    @State var selectedDate: Date
    let onSave: (Date) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            DatePicker("Due date", selection: $selectedDate, displayedComponents: [.date])
                .datePickerStyle(.graphical)
                .padding()
                .navigationTitle("Due Date")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            onSave(selectedDate)
                            dismiss()
                        }
                    }
                }
        }
    }
}
```

**File:** `$ROOT/NotForgetList/Features/TaskDetail/RepeatRulePickerSheet.swift`

```swift
import SwiftUI
import NFLCore

struct RepeatRulePickerSheet: View {
    @State private var repeatType: RepeatRule.RepeatType = .daily
    @State private var interval: Int = 1
    let rule: RepeatRule?
    let onSave: (RepeatRule?) -> Void
    @Environment(\.dismiss) private var dismiss

    init(rule: RepeatRule?, onSave: @escaping (RepeatRule?) -> Void) {
        self.rule = rule
        self.onSave = onSave
        if let rule {
            _repeatType = State(initialValue: rule.type)
            _interval = State(initialValue: rule.interval)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Frequency", selection: $repeatType) {
                    ForEach(RepeatRule.RepeatType.allCases, id: \.self) { type in
                        Text(type.rawValue.capitalized).tag(type)
                    }
                }

                Stepper("Every \(interval) \(repeatType.rawValue)", value: $interval, in: 1...365)

                if rule \!= nil {
                    Button("Remove repeat", role: .destructive) {
                        onSave(nil)
                        dismiss()
                    }
                }
            }
            .navigationTitle("Repeat")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(RepeatRule(type: repeatType, interval: interval))
                        dismiss()
                    }
                }
            }
        }
    }
}
```

**File:** `$ROOT/NotForgetList/Shared/Components/FlowLayout.swift`

```swift
import SwiftUI

/// A horizontal wrapping layout (like CSS flexbox with flex-wrap).
/// Tags that don't fit on one line wrap to the next.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private struct LayoutResult {
        var size: CGSize
        var positions: [CGPoint]
    }

    private func computeLayout(proposal: ProposedViewSize, subviews: Subviews) -> LayoutResult {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            totalWidth = max(totalWidth, currentX - spacing)
        }

        return LayoutResult(
            size: CGSize(width: totalWidth, height: currentY + lineHeight),
            positions: positions
        )
    }
}
```

**Done when:**
- Tapping a task in the list view navigates to the detail view.
- Title is editable inline.
- Priority picker changes the priority.
- Due date picker sheet opens and saves a date.
- Repeat rule picker sheet opens and saves a rule.
- Tags section shows all tags with toggle behavior.
- Description section shows a plain text editor (upgraded in Milestone 9).

**Gotcha:** On macOS, `Color(.secondarySystemBackground)` does not exist. Use `Color(nsColor: .controlBackgroundColor)` instead. You can wrap this with a platform check:
```swift
#if os(macOS)
.background(Color(nsColor: .controlBackgroundColor))
#else
.background(Color(.secondarySystemBackground))
#endif
```

---

## Milestone 9: Rich Text Editor Spike (NFLEditor)

### Step 9.1: MarkdownParser — Markdown to NSAttributedString and back

**File:** `$ROOT/Packages/NFLEditor/Sources/NFLEditor/MarkdownParser.swift`

```swift
import Foundation
#if canImport(UIKit)
import UIKit
public typealias PlatformFont = UIFont
public typealias PlatformColor = UIColor
#elseif canImport(AppKit)
import AppKit
public typealias PlatformFont = NSFont
public typealias PlatformColor = NSColor
#endif

/// Converts between Markdown strings and NSAttributedString.
/// Supports: **bold**, *italic*, `inline code`, headings (# ## ###),
/// bullet lists (- item), numbered lists (1. item), and checklists (- [ ] / - [x]).
public enum MarkdownParser {

    public static func attributedString(from markdown: String) -> NSAttributedString {
        let result = NSMutableAttributedString()
        let bodyFont = PlatformFont.systemFont(ofSize: 15)
        let boldFont = PlatformFont.boldSystemFont(ofSize: 15)

        let lines = markdown.components(separatedBy: "\n")
        for (index, line) in lines.enumerated() {
            let attributedLine = parseLine(line, bodyFont: bodyFont, boldFont: boldFont)
            result.append(attributedLine)
            if index < lines.count - 1 {
                result.append(NSAttributedString(string: "\n"))
            }
        }
        return result
    }

    public static func markdown(from attributedString: NSAttributedString) -> String {
        // For Phase 1, store raw markdown. The editor works with NSAttributedString
        // for display, but we persist the original markdown.
        // A full round-trip implementation is complex; defer to Phase 2 if needed.
        return attributedString.string
    }

    private static func parseLine(
        _ line: String,
        bodyFont: PlatformFont,
        boldFont: PlatformFont
    ) -> NSAttributedString {
        // Headings
        if line.hasPrefix("### ") {
            return heading(String(line.dropFirst(4)), level: 3)
        } else if line.hasPrefix("## ") {
            return heading(String(line.dropFirst(3)), level: 2)
        } else if line.hasPrefix("# ") {
            return heading(String(line.dropFirst(2)), level: 1)
        }

        // Checklists
        if line.hasPrefix("- [x] ") || line.hasPrefix("- [X] ") {
            return checklist(String(line.dropFirst(6)), checked: true, font: bodyFont)
        }
        if line.hasPrefix("- [ ] ") {
            return checklist(String(line.dropFirst(6)), checked: false, font: bodyFont)
        }

        // Bullet lists
        if line.hasPrefix("- ") {
            let bullet = NSMutableAttributedString(
                string: "\u{2022} ",
                attributes: [.font: bodyFont]
            )
            bullet.append(parseInline(String(line.dropFirst(2)), bodyFont: bodyFont, boldFont: boldFont))
            return bullet
        }

        // Numbered lists (matches "1. ", "2. ", etc.)
        if let range = line.range(of: #"^\d+\. "#, options: .regularExpression) {
            let prefix = String(line[range])
            let content = String(line[range.upperBound...])
            let numbered = NSMutableAttributedString(
                string: prefix,
                attributes: [.font: bodyFont]
            )
            numbered.append(parseInline(content, bodyFont: bodyFont, boldFont: boldFont))
            return numbered
        }

        // Regular paragraph
        return parseInline(line, bodyFont: bodyFont, boldFont: boldFont)
    }

    private static func heading(_ text: String, level: Int) -> NSAttributedString {
        let size: CGFloat = switch level {
        case 1: 24
        case 2: 20
        default: 17
        }
        return NSAttributedString(
            string: text,
            attributes: [.font: PlatformFont.boldSystemFont(ofSize: size)]
        )
    }

    private static func checklist(
        _ text: String, checked: Bool, font: PlatformFont
    ) -> NSAttributedString {
        let checkbox = checked ? "\u{2611} " : "\u{2610} "
        let result = NSMutableAttributedString(
            string: checkbox + text,
            attributes: [.font: font]
        )
        if checked {
            result.addAttribute(
                .strikethroughStyle,
                value: NSUnderlineStyle.single.rawValue,
                range: NSRange(location: 2, length: text.count)
            )
        }
        return result
    }

    private static func parseInline(
        _ text: String,
        bodyFont: PlatformFont,
        boldFont: PlatformFont
    ) -> NSAttributedString {
        // Simple regex-based inline parsing for **bold**, *italic*, `code`
        let result = NSMutableAttributedString(string: text, attributes: [.font: bodyFont])

        // Bold: **text**
        applyPattern(#"\*\*(.+?)\*\*"#, to: result, attributes: [.font: boldFont])

        // Italic: *text*
        let italicFont = PlatformFont.italicSystemFont(ofSize: bodyFont.pointSize)
        applyPattern(#"(?<\!\*)\*(?\!\*)(.+?)(?<\!\*)\*(?\!\*)"#, to: result, attributes: [.font: italicFont])

        // Inline code: `text`
        let codeFont = PlatformFont.monospacedSystemFont(ofSize: bodyFont.pointSize - 1, weight: .regular)
        applyPattern(#"`(.+?)`"#, to: result, attributes: [
            .font: codeFont,
            .backgroundColor: PlatformColor.secondarySystemFill
        ])

        return result
    }

    private static func applyPattern(
        _ pattern: String,
        to attrString: NSMutableAttributedString,
        attributes: [NSAttributedString.Key: Any]
    ) {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return }
        let fullRange = NSRange(location: 0, length: attrString.length)
        let matches = regex.matches(in: attrString.string, range: fullRange)
        for match in matches.reversed() {  // Reversed to preserve indices
            if match.numberOfRanges > 1 {
                let contentRange = match.range(at: 1)
                attrString.addAttributes(attributes, range: contentRange)
            }
        }
    }
}

// MARK: - Platform compatibility
#if os(macOS)
extension NSFont {
    static func italicSystemFont(ofSize size: CGFloat) -> NSFont {
        let descriptor = NSFont.systemFont(ofSize: size).fontDescriptor.withSymbolicTraits(.italic)
        return NSFont(descriptor: descriptor, size: size) ?? .systemFont(ofSize: size)
    }
}

extension NSColor {
    static var secondarySystemFill: NSColor { .controlBackgroundColor }
}
#endif
```

**Done when:** The package builds on both iOS and macOS platforms. No runtime test yet — visual verification happens in Step 9.4.

**Gotcha:** `PlatformColor.secondarySystemFill` does not exist on macOS. The `#if os(macOS)` extension at the bottom handles this. Watch for similar platform differences in AppKit vs UIKit.

---

### Step 9.2: iOS bridge — UITextView wrapper

**File:** `$ROOT/Packages/NFLEditor/Sources/NFLEditor/iOS/UIKitEditorBridge.swift`

```swift
#if os(iOS)
import UIKit
import SwiftUI

struct UIKitEditorBridge: UIViewRepresentable {
    @Binding var text: String
    let isEditable: Bool

    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.delegate = context.coordinator
        textView.isEditable = isEditable
        textView.isScrollEnabled = true
        textView.font = .systemFont(ofSize: 15)
        textView.textContainerInset = UIEdgeInsets(top: 8, left: 4, bottom: 8, right: 4)
        textView.backgroundColor = .clear
        return textView
    }

    func updateUIView(_ textView: UITextView, context: Context) {
        let attributed = MarkdownParser.attributedString(from: text)
        if textView.attributedText.string \!= attributed.string || \!textView.isFirstResponder {
            textView.attributedText = attributed
        }
        textView.isEditable = isEditable
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, UITextViewDelegate {
        let parent: UIKitEditorBridge
        init(_ parent: UIKitEditorBridge) { self.parent = parent }

        func textViewDidChange(_ textView: UITextView) {
            // Store raw text (markdown) — not the attributed string
            parent.text = textView.text
        }
    }
}
#endif
```

**Done when:** File compiles when building for iOS target.

---

### Step 9.3: macOS bridge — NSTextView wrapper

**File:** `$ROOT/Packages/NFLEditor/Sources/NFLEditor/macOS/AppKitEditorBridge.swift`

```swift
#if os(macOS)
import AppKit
import SwiftUI

struct AppKitEditorBridge: NSViewRepresentable {
    @Binding var text: String
    let isEditable: Bool

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        guard let textView = scrollView.documentView as? NSTextView else {
            return scrollView
        }
        textView.delegate = context.coordinator
        textView.isEditable = isEditable
        textView.isRichText = true
        textView.font = .systemFont(ofSize: 15)
        textView.textContainerInset = NSSize(width: 4, height: 8)
        textView.drawsBackground = false
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? NSTextView else { return }
        let attributed = MarkdownParser.attributedString(from: text)
        if textView.string \!= attributed.string {
            textView.textStorage?.setAttributedString(attributed)
        }
        textView.isEditable = isEditable
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, NSTextViewDelegate {
        let parent: AppKitEditorBridge
        init(_ parent: AppKitEditorBridge) { self.parent = parent }

        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            parent.text = textView.string
        }
    }
}
#endif
```

**Done when:** File compiles when building for macOS target.

---

### Step 9.4: MarkdownEditor — unified SwiftUI view

**File:** `$ROOT/Packages/NFLEditor/Sources/NFLEditor/MarkdownEditor.swift`

```swift
import SwiftUI

/// A Markdown-aware text editor that renders formatting live.
/// Uses UITextView on iOS and NSTextView on macOS under the hood.
///
/// Usage:
///   MarkdownEditor(text: $description, isEditable: true)
public struct MarkdownEditor: View {
    @Binding public var text: String
    public let isEditable: Bool

    public init(text: Binding<String>, isEditable: Bool = true) {
        self._text = text
        self.isEditable = isEditable
    }

    public var body: some View {
        #if os(iOS)
        UIKitEditorBridge(text: $text, isEditable: isEditable)
        #elseif os(macOS)
        AppKitEditorBridge(text: $text, isEditable: isEditable)
        #endif
    }
}
```

**Done when:**
- `MarkdownEditor(text: .constant("**bold** and *italic*"), isEditable: true)` renders in a SwiftUI preview with bold and italic formatting visible.
- Typing into the editor updates the `text` binding with raw markdown.
- The editor works on both iOS and macOS.

**Tip for testing:** Create a temporary SwiftUI preview in the app target that imports `NFLEditor` and displays a `MarkdownEditor`. Verify visually that `**bold**` appears bold, `*italic*` appears italic, and `- [ ] unchecked` shows a checkbox.

---

### Step 9.5: Integrate editor into TaskDetailView

**Action:** Go back to `$ROOT/NotForgetList/Features/TaskDetail/TaskDetailView.swift` and replace the `descriptionSection` placeholder with the real editor.

Replace the `descriptionSection` method:

```swift
@ViewBuilder
private func descriptionSection(_ task: NFLTask, vm: TaskDetailViewModel) -> some View {
    VStack(alignment: .leading, spacing: 8) {
        Label("Notes", systemImage: "note.text")
            .font(.headline)

        MarkdownEditor(
            text: Binding(
                get: { task.description ?? "" },
                set: { newValue in
                    Task { await vm.updateDescription(newValue.isEmpty ? nil : newValue) }
                }
            ),
            isEditable: true
        )
        .frame(minHeight: 120)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.secondary.opacity(0.2))
        )
    }
}
```

Add `import NFLEditor` at the top of the file.

**Done when:**
- The task detail description field renders Markdown formatting live.
- Typing `**test**` shows "test" in bold.
- Checklist items (`- [ ] item`) display with checkbox characters.

---

## Milestone 10: List and Group Management

### Step 10.1: Create/edit list sheet (full version)

**File:** `$ROOT/NotForgetList/Features/Sidebar/CreateListSheet.swift` (replace the stub)

```swift
import SwiftUI
import NFLCore

struct CreateListSheet: View {
    let viewModel: SidebarViewModel
    var editingList: TaskList? = nil  // nil = create, non-nil = edit
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var selectedColor: String?
    @State private var selectedGroupID: UUID?

    private let presetColors = [
        "#FF6B6B", "#FF8E53", "#FFC107", "#4CAF50",
        "#4A90D9", "#7C4DFF", "#E040FB", "#78909C"
    ]

    init(viewModel: SidebarViewModel, editingList: TaskList? = nil) {
        self.viewModel = viewModel
        self.editingList = editingList
        _name = State(initialValue: editingList?.name ?? "")
        _selectedColor = State(initialValue: editingList?.color)
        _selectedGroupID = State(initialValue: editingList?.groupID)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("List name", text: $name)
                }

                Section("Color") {
                    LazyVGrid(columns: Array(repeating: GridItem(.fixed(44)), count: 4), spacing: 12) {
                        ForEach(presetColors, id: \.self) { hex in
                            Circle()
                                .fill(Color(hex: hex))
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Circle().stroke(Color.primary, lineWidth: selectedColor == hex ? 3 : 0)
                                )
                                .onTapGesture { selectedColor = hex }
                                .accessibilityLabel("Color \(hex)")
                        }
                        // "No color" option
                        Circle()
                            .stroke(Color.secondary, lineWidth: 1)
                            .frame(width: 36, height: 36)
                            .overlay(
                                Image(systemName: selectedColor == nil ? "checkmark" : "xmark")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            )
                            .onTapGesture { selectedColor = nil }
                            .accessibilityLabel("No color")
                    }
                    .padding(.vertical, 8)
                }

                if \!viewModel.groups.isEmpty {
                    Section("Group") {
                        Picker("Group", selection: $selectedGroupID) {
                            Text("None").tag(UUID?.none)
                            ForEach(viewModel.groups) { group in
                                Text(group.name).tag(UUID?.some(group.id))
                            }
                        }
                    }
                }
            }
            .navigationTitle(editingList == nil ? "New List" : "Edit List")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(editingList == nil ? "Create" : "Save") {
                        Task {
                            await viewModel.createList(
                                name: name,
                                color: selectedColor,
                                groupID: selectedGroupID
                            )
                        }
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
```

**Done when:** The sheet opens from the sidebar "+" menu, allows naming and coloring a list, and creates it on submit.

---

### Step 10.2: Create/edit group sheet (full version)

The stub from Step 6.2 is already functional enough. Enhance `CreateGroupSheet.swift` if you need edit support, but the stub is acceptable for Phase 1.

**Done when:** Groups can be created from the sidebar "+" menu.

---

### Step 10.3-10.5: List/group reorder, archive, delete

These features are already wired in `SidebarViewModel` (Step 6.1) and `SidebarView` (Step 6.2) via context menus. Drag-to-reorder for sidebar lists can be added with:

Add to the list/group `ForEach` in `SidebarView`:
```swift
.onMove { source, destination in
    // Reorder logic similar to TaskListViewModel.reorder
}
```

**Done when:** Lists and groups can be created, renamed, archived, and deleted. Reorder via drag-and-drop works in the sidebar.

---

## Milestone 11: Tag Management

### Step 11.1-11.3: Tag list view, create/edit, filtering

Tag CRUD is already handled in `SidebarViewModel`. For a dedicated tag management view:

**File:** `$ROOT/NotForgetList/Features/Tags/TagListView.swift`

```swift
import SwiftUI
import NFLCore

struct TagListView: View {
    let viewModel: SidebarViewModel
    @State private var showNewTag = false
    @State private var newTagName = ""
    @State private var newTagColor: String?

    var body: some View {
        List {
            ForEach(viewModel.tags) { tag in
                HStack {
                    if let color = tag.color {
                        Circle().fill(Color(hex: color)).frame(width: 12, height: 12)
                    }
                    Text(tag.name)
                    Spacer()
                    Text("\(viewModel.tagCounts[tag.id] ?? 0) tasks")
                        .foregroundStyle(.secondary)
                        .font(.caption)
                }
                .contextMenu {
                    Button("Delete", systemImage: "trash", role: .destructive) {
                        Task { await viewModel.deleteTag(id: tag.id) }
                    }
                }
            }
        }
        .navigationTitle("Tags")
        .toolbar {
            Button("New Tag", systemImage: "plus") { showNewTag = true }
        }
        .alert("New Tag", isPresented: $showNewTag) {
            TextField("Tag name", text: $newTagName)
            Button("Cancel", role: .cancel) { newTagName = "" }
            Button("Create") {
                Task { await viewModel.createTag(name: newTagName, color: nil) }
                newTagName = ""
            }
        }
    }
}
```

Add a `deleteTag` method to `SidebarViewModel` (if not already present):

```swift
func deleteTag(id: UUID) async {
    guard let index = tags.firstIndex(where: { $0.id == id }) else { return }
    let removed = tags.remove(at: index)
    do {
        try await tagRepo.softDeleteTag(id: id)
    } catch {
        tags.insert(removed, at: index)
        self.error = error
    }
}
```

**Done when:**
- Tags are visible in the sidebar.
- Clicking a tag in the sidebar filters the task list to show only tasks with that tag.
- Tags can be created and deleted.
- Tag assignment works in the Task Detail view (Step 8.2).

---

## Milestone 12: Smart Lists

### Step 12.1-12.5: Smart list views

Smart lists are already handled by `TaskListViewModel` (Step 7.1) which switches fetch logic based on the `SidebarItem` enum. The task list view renders them identically to regular lists.

The **one thing to add** is grouped display for the Upcoming view (tasks grouped by date). Create a wrapper:

**File:** `$ROOT/NotForgetList/Features/SmartLists/UpcomingGroupedView.swift`

```swift
import SwiftUI
import NFLCore

/// Wraps the task list with date-grouped sections for the Upcoming smart list.
struct UpcomingGroupedView: View {
    let tasks: [NFLTask]
    let onToggleComplete: (NFLTask) -> Void
    @Binding var selectedTaskID: UUID?

    private var groupedByDate: [(Date, [NFLTask])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: tasks) { task -> Date in
            if let due = task.dueDate {
                return calendar.startOfDay(for: due)
            }
            return .distantFuture
        }
        return grouped.sorted { $0.key < $1.key }
    }

    var body: some View {
        List(selection: $selectedTaskID) {
            ForEach(groupedByDate, id: \.0) { date, dateTasks in
                Section {
                    ForEach(dateTasks) { task in
                        TaskRowView(task: task) {
                            onToggleComplete(task)
                        }
                        .tag(task.id)
                    }
                } header: {
                    Text(date.formatted(.dateTime.weekday(.wide).month().day()))
                }
            }
        }
    }
}
```

Integrate this into `TaskListView` by detecting when `sidebarItem == .upcoming` and rendering `UpcomingGroupedView` instead of the flat list. Add a conditional in `taskListContent`:

```swift
if sidebarItem == .upcoming {
    UpcomingGroupedView(
        tasks: vm.tasks,
        onToggleComplete: { task in Task { await vm.toggleComplete(task) } },
        selectedTaskID: $selectedTaskID
    )
} else {
    // ... existing flat list
}
```

**Done when:**
- **Today** shows tasks due today + overdue tasks.
- **Tomorrow** shows tasks due tomorrow.
- **Upcoming** shows tasks due in the next 7 days, grouped by date with date headers.
- **All Tasks** shows all non-deleted, non-completed tasks.
- **Completed** shows completed tasks from the last 30 days.

---

## Milestone 13: Search

### Step 13.1: SearchViewModel with debounce

**File:** `$ROOT/NotForgetList/Features/Search/SearchViewModel.swift`

```swift
import SwiftUI
import Combine
import NFLCore
import NFLNetwork

@Observable
@MainActor
final class SearchViewModel {
    var query = ""
    var results: [NFLTask] = []
    var isSearching = false

    private let searchRepo: SearchRepositoryProtocol
    private var debounceTask: Task<Void, Never>?

    init(searchRepo: SearchRepositoryProtocol) {
        self.searchRepo = searchRepo
    }

    func onQueryChanged() {
        debounceTask?.cancel()

        let currentQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard \!currentQuery.isEmpty else {
            results = []
            isSearching = false
            return
        }

        debounceTask = Task {
            // Wait 300ms (debounce)
            try? await Task.sleep(for: .milliseconds(AppConstants.searchDebounceMilliseconds))

            guard \!Task.isCancelled else { return }

            isSearching = true
            defer { isSearching = false }

            do {
                results = try await searchRepo.search(query: currentQuery)
            } catch {
                if \!Task.isCancelled {
                    results = []
                }
            }
        }
    }
}
```

**Done when:** File compiles.

---

### Step 13.2: SearchView UI

**File:** `$ROOT/NotForgetList/Features/Search/SearchView.swift`

```swift
import SwiftUI
import NFLCore
import NFLNetwork

struct SearchView: View {
    @State private var viewModel: SearchViewModel?
    @State private var selectedTaskID: UUID?

    var body: some View {
        Group {
            if let vm = viewModel {
                searchContent(vm)
            } else {
                ProgressView()
            }
        }
        .task {
            if viewModel == nil {
                let client = SupabaseClientProvider.shared.client
                viewModel = SearchViewModel(searchRepo: SearchRepository(client: client))
            }
        }
    }

    @ViewBuilder
    private func searchContent(_ vm: SearchViewModel) -> some View {
        VStack {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search tasks...", text: Bindable(vm).query)
                    .textFieldStyle(.plain)
                    .onChange(of: vm.query) {
                        vm.onQueryChanged()
                    }
                if \!vm.query.isEmpty {
                    Button {
                        vm.query = ""
                        vm.results = []
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(8)
            .background(.bar)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal)

            // Results
            if vm.isSearching {
                ProgressView()
                    .padding()
            } else if vm.results.isEmpty && \!vm.query.isEmpty {
                ContentUnavailableView.search(text: vm.query)
            } else {
                List(selection: $selectedTaskID) {
                    ForEach(vm.results) { task in
                        TaskRowView(task: task) { /* no-op for search results */ }
                            .tag(task.id)
                    }
                }
            }
        }
        .navigationTitle("Search")
    }
}
```

Wire search into the app. Add a search toolbar item or integrate it with the sidebar. The simplest approach for Phase 1 is to add a `.searchable` modifier to the root view or a dedicated search button that pushes `SearchView`.

**Done when:**
- A search interface is accessible from the app.
- Typing a query with a 300ms pause triggers a search.
- Results display as task rows.
- Clearing the query clears results.

---

## Milestone 14: Settings

### Step 14.1: SettingsView

**File:** `$ROOT/NotForgetList/Features/Settings/SettingsView.swift`

```swift
import SwiftUI

struct SettingsView: View {
    @AppStorage("appLocale") private var appLocale = "zh-Hant"

    var body: some View {
        Form {
            Section("Language") {
                Picker("Language", selection: $appLocale) {
                    Text("繁體中文").tag("zh-Hant")
                    Text("English").tag("en")
                }
            }

            Section("About") {
                LabeledContent("Version", value: Bundle.main.appVersion)
                LabeledContent("Build", value: Bundle.main.buildNumber)
            }

            Section("Data") {
                // Placeholder for future settings
                Text("Daily summary notifications")
                    .foregroundStyle(.secondary)
                Text("Pomodoro timer settings")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Settings")
    }
}

extension Bundle {
    var appVersion: String {
        infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
    var buildNumber: String {
        infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
}
```

Add a settings button to the sidebar (bottom toolbar or gear icon).

**Done when:** Settings view shows a locale picker and version info.

---

## Milestone 15: Localization

### Step 15.1: Create .xcstrings catalog

**Action:** In Xcode:
1. Select the `NotForgetList` project in the navigator.
2. Select the project (not the target) > Info tab > Localizations.
3. Click "+" and add "Chinese, Traditional (zh-Hant)".
4. English should already be listed.

Then: File > New > File > String Catalog. Name it `Localizable.xcstrings`. Save it in `$ROOT/NotForgetList/Resources/`.

**Done when:** The `.xcstrings` file exists and lists both `en` and `zh-Hant` as supported languages.

---

### Step 15.2: Extract all user-facing strings

**Action:** Go through every view file and replace hardcoded strings with `String(localized:)` or use SwiftUI's automatic localization (any string literal passed to `Text()`, `Label()`, `Button()` title, `navigationTitle()`, etc. is automatically localized if it is in the string catalog).

Key strings to localize (add to `Localizable.xcstrings`):

| Key | en | zh-Hant |
|-----|-----|---------|
| "Today" | "Today" | "今天" |
| "Tomorrow" | "Tomorrow" | "明天" |
| "Upcoming" | "Upcoming" | "即將到來" |
| "All Tasks" | "All Tasks" | "所有任務" |
| "Completed" | "Completed" | "已完成" |
| "Inbox" | "Inbox" | "收件匣" |
| "New task" | "New task" | "新任務" |
| "Search tasks..." | "Search tasks..." | "搜尋任務..." |
| "Settings" | "Settings" | "設定" |
| "Tags" | "Tags" | "標籤" |
| "Lists" | "Lists" | "清單" |
| "Smart Lists" | "Smart Lists" | "智慧清單" |
| "Priority" | "Priority" | "優先級" |
| "Due date" | "Due date" | "到期日" |
| "Repeat" | "Repeat" | "重複" |
| "Notes" | "Notes" | "備註" |
| "Delete" | "Delete" | "刪除" |
| "Cancel" | "Cancel" | "取消" |
| "Create" | "Create" | "建立" |
| "Save" | "Save" | "儲存" |

In Xcode, open the `.xcstrings` file. Xcode shows a table editor where you can type translations for each string. Build the project (Cmd+B) and Xcode will auto-detect string literals used in `Text()`, etc., and add them to the catalog.

**Done when:**
- Building the project populates the string catalog with discovered strings.
- Each string has both en and zh-Hant translations.
- Running the app on a device set to zh-Hant shows Chinese strings.

**Gotcha:** Xcode auto-extracts strings from `Text("literal")` but NOT from `String(localized:)` in older Xcode versions. In Xcode 16+, both work. If strings do not appear in the catalog, build and check the "Missing Translations" filter.

---

## Milestone 16: Polish and Verification

### Step 16.1: Accessibility audit

**Action:** On each platform:
1. Enable VoiceOver (macOS: Cmd+F5; iOS: Settings > Accessibility > VoiceOver).
2. Navigate through every screen and verify:
   - Every interactive element is announced with a meaningful label.
   - Priority badges announce "Priority: High" not just a color.
   - Task completion state is announced ("completed" / "not completed").
3. Test Dynamic Type: on iOS, go to Settings > Accessibility > Display & Text Size > Larger Text. Set to the largest size. Verify text scales and does not clip.

Fix any issues by adding `.accessibilityLabel()` or `.accessibilityValue()` modifiers.

**Done when:** Every interactive element is announced by VoiceOver with a meaningful label. No text clips at the largest Dynamic Type size.

---

### Step 16.2: Dark mode verification

**Action:** On both platforms, switch to dark mode and verify:
- All text is readable (no white-on-white or dark-on-dark).
- The editor background, card backgrounds, and tag chips have appropriate contrast.
- The color picker colors are distinguishable in both modes.

**Done when:** No visual regressions in dark mode on either platform.

---

### Step 16.3: macOS keyboard shortcuts

**File:** `$ROOT/NotForgetList/Platform/macOS/ToolbarCommands.swift`

```swift
import SwiftUI

struct AppCommands: Commands {
    var body: some Commands {
        CommandGroup(after: .newItem) {
            Button("New Task") {
                NotificationCenter.default.post(name: .newTask, object: nil)
            }
            .keyboardShortcut("n", modifiers: .command)

            Button("New List") {
                NotificationCenter.default.post(name: .newList, object: nil)
            }
            .keyboardShortcut("n", modifiers: [.command, .shift])
        }

        CommandGroup(replacing: .textEditing) {
            Button("Find") {
                NotificationCenter.default.post(name: .search, object: nil)
            }
            .keyboardShortcut("f", modifiers: .command)
        }
    }
}

extension Notification.Name {
    static let newTask = Notification.Name("newTask")
    static let newList = Notification.Name("newList")
    static let search = Notification.Name("search")
}
```

Add to the `App` scene:
```swift
var body: some Scene {
    WindowGroup { ... }
    #if os(macOS)
    .commands { AppCommands() }
    #endif
}
```

**Done when:** Cmd+N focuses the new task field, Cmd+Shift+N opens the new list sheet, Cmd+F opens search.

---

### Step 16.4: End-to-end test on both platforms

**Action:** Manual test checklist. Run through each scenario on **both** iOS Simulator and macOS:

1. [ ] App launches and signs in anonymously (no login screen).
2. [ ] Inbox list exists in sidebar.
3. [ ] Create a new task via quick entry — it appears in the list.
4. [ ] Tap the task — detail view opens with title, priority, due date, repeat, tags, notes.
5. [ ] Edit the task title — change persists after navigating away and back.
6. [ ] Set priority to High — badge appears in the task row.
7. [ ] Set a due date — date label appears in the task row. "Today" shows it in the Today smart list.
8. [ ] Set a repeat rule (daily) — complete the task — a new task is created for the next day.
9. [ ] Complete a task — it moves to the Completed smart list.
10. [ ] Delete a task (swipe) — it disappears from the list.
11. [ ] Create a new list with a color — it appears in the sidebar.
12. [ ] Create a new group — assign the list to it — sidebar updates.
13. [ ] Create a tag — assign it to a task — tag chip appears in the task row.
14. [ ] Click the tag in the sidebar — only tasks with that tag appear.
15. [ ] Search for a task by keyword — results appear within 300ms.
16. [ ] Drag to reorder tasks — order persists after closing and reopening the app.
17. [ ] Type `**bold**` and `- [ ] checklist item` in the notes editor — formatting renders.
18. [ ] Switch language to zh-Hant in Settings — UI strings change to Chinese.
19. [ ] Verify dark mode looks correct.
20. [ ] Verify VoiceOver reads task rows meaningfully.

**Done when:** All 20 checks pass on both iOS and macOS.

---

### Step 16.5: Verify all Phase 1 done criteria

Cross-reference with REQUIREMENTS.md Section 7 — Phase 1 Done When:

| Criterion | How to verify |
|-----------|---------------|
| Task CRUD on both platforms | Steps 3-7 of the E2E test |
| Lists, groups, tags fully CRUD-able | Steps 11-14 of the E2E test |
| 5 smart lists return correct results | Open each; verify task counts match expectations |
| Search returns results within 300ms on 1000 tasks | Seed 1000 tasks via SQL; time the search |
| Description editor renders bold, italic, bullet lists, numbered lists, inline checklists | Type each syntax in the editor; verify visual output |
| Manual sort order persists across restarts | Reorder tasks, force-quit app, relaunch, verify order |

**Done when:** All six Phase 1 criteria pass.

---

## Summary

| Milestone | Steps | Estimated Effort |
|-----------|-------|-----------------|
| 1. Project Scaffolding | 1.1–1.5 | 1–2 hours |
| 2. Supabase Backend | 2.1–2.5 | 1–2 hours |
| 3. Data Models | 3.1–3.8 | 2–3 hours |
| 4. Network Layer | 4.1–4.9 | 3–4 hours |
| 5. App Shell | 5.1–5.3 | 1–2 hours |
| 6. Sidebar | 6.1–6.2 | 2–3 hours |
| 7. Task List | 7.1–7.3 | 3–4 hours |
| 8. Task Detail | 8.1–8.2 | 3–4 hours |
| 9. Rich Text Editor | 9.1–9.5 | 4–6 hours |
| 10. List/Group Management | 10.1–10.5 | 2–3 hours |
| 11. Tag Management | 11.1–11.3 | 1–2 hours |
| 12. Smart Lists | 12.1–12.5 | 2–3 hours |
| 13. Search | 13.1–13.2 | 1–2 hours |
| 14. Settings | 14.1 | 0.5–1 hour |
| 15. Localization | 15.1–15.2 | 2–3 hours |
| 16. Polish & Verification | 16.1–16.5 | 3–4 hours |
| **Total** | | **30–46 hours** |
