# Not-Forget-List — Architecture Design

**Document version:** 1.0  
**Date:** 2026-04-08  
**Status:** Proposed  
**Companion:** [REQUIREMENTS.md](./REQUIREMENTS.md)

---

## 1. Architecture Overview

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       Apple Devices                              │
│                                                                  │
│  ┌────────────────┐                    ┌────────────────┐        │
│  │   iOS App       │                    │   macOS App     │        │
│  │  (SwiftUI)      │                    │  (SwiftUI)      │        │
│  │                 │                    │                 │        │
│  │  ┌───────────┐ │                    │  ┌───────────┐ │        │
│  │  │   Views    │ │                    │  │   Views    │ │        │
│  │  └─────┬─────┘ │                    │  └─────┬─────┘ │        │
│  │        │        │                    │        │        │        │
│  │  ┌─────▼─────┐ │                    │  ┌─────▼─────┐ │        │
│  │  │ ViewModels │ │                    │  │ ViewModels │ │        │
│  │  └─────┬─────┘ │                    │  └─────┬─────┘ │        │
│  │        │        │                    │        │        │        │
│  │  ┌─────▼─────┐ │                    │  ┌─────▼─────┐ │        │
│  │  │Repositories│ │                    │  │Repositories│ │        │
│  │  └─────┬─────┘ │                    │  └─────┬─────┘ │        │
│  └────────┼────────┘                    └────────┼────────┘        │
│           │             Shared Swift              │                │
│           │             Packages                  │                │
│           └────────────────┬──────────────────────┘                │
└────────────────────────────┼─────────────────────────────────────┘
                             │ HTTPS + WebSocket
                             ▼
              ┌──────────────────────────────┐
              │        Supabase Cloud         │
              │                              │
              │  ┌────────────┐ ┌──────────┐ │
              │  │ PostgreSQL  │ │ Realtime │ │
              │  │   + RLS     │ │ (WS)    │ │
              │  └────────────┘ └──────────┘ │
              │  ┌────────────┐ ┌──────────┐ │
              │  │    Auth     │ │  Edge    │ │
              │  │ (Apple ID)  │ │ Funcs    │ │
              │  └────────────┘ └──────────┘ │
              └──────────────────────────────┘
```

### Data Flow (React Analogy)

| Concept | React | SwiftUI (Our App) |
|---------|-------|--------------------|
| Component | `function TaskRow()` | `struct TaskRow: View` |
| State | `useState` / Redux store | `@Observable` ViewModel |
| Side effects | `useEffect` | `.task { }` / `.onChange { }` |
| Props | component props | View init parameters |
| Context | `useContext` | `@Environment` |
| API call | `fetch()` / React Query | Repository → `supabase-swift` |
| Optimistic update | `mutate()` with rollback | Update `@Observable` first, then await server |

### Client-Server Relationship

- **Cloud-first**: Supabase PostgreSQL is the single source of truth.
- **No local database** in Phases 1-4. All state lives in `@Observable` classes in memory.
- **Phase 5** adds a lightweight pending-operations queue (JSON file on disk) for offline writes only.
- **Realtime**: Supabase Realtime WebSocket pushes `INSERT`, `UPDATE`, `DELETE` events to connected clients. The Repository layer applies these to the in-memory cache.

---

## 2. Approach Comparison

Three client-side architecture patterns evaluated for the SwiftUI layer.

### Option A: MVVM + Repository Pattern

**Description:** Classic Model-View-ViewModel. Each screen has a ViewModel (`@Observable` class) that owns business logic. Repositories abstract Supabase access. ViewModels call repositories; views observe ViewModels.

```
View → ViewModel → Repository → Supabase
                 ← @Observable ←
```

**Pros:**
- Simplest mental model; abundant tutorials and community support
- Low ceremony — no framework dependency
- `@Observable` (iOS 17+) eliminates `@Published` boilerplate
- Easy to test ViewModels in isolation with mock repositories

**Cons:**
- No enforced unidirectional data flow — easy to create spaghetti state if undisciplined
- Navigation coordination requires a separate Router or Coordinator pattern
- No built-in side-effect management (developer must establish conventions)

**Complexity:** Low  
**Testability:** Good (with protocol-based repository injection)  
**Community support:** Highest — this is the default SwiftUI pattern

---

### Option B: TCA (The Composable Architecture by Point-Free)

**Description:** A Redux-like architecture for SwiftUI. All state is in a single `Store`. User actions dispatch to `Reducer` functions. Side effects are modeled as `Effect` values. Features compose via scoping.

```
View → Store.send(Action) → Reducer → Effect → Dependency → Supabase
                          ← State ←
```

**Pros:**
- Very familiar to a React/Redux developer — actions, reducers, selectors, middleware
- Strict unidirectional data flow prevents state bugs
- Built-in dependency injection (`@Dependency`) and testing support (`TestStore`)
- Excellent for complex features (Kanban drag-and-drop, Gantt interactions)
- Active community, well-maintained, frequent updates

**Cons:**
- Steep learning curve for Swift beginners — requires understanding generics, key paths, macros
- Heavy boilerplate: every feature needs State + Action + Reducer + dependency registration
- Debugging requires TCA-specific knowledge (e.g., `_printChanges()`)
- Adds ~15K lines of framework code to the binary
- TCA updates can introduce breaking changes (the API has shifted significantly between versions)

**Complexity:** High  
**Testability:** Excellent (deterministic, snapshot-testable)  
**Community support:** Strong but niche — smaller than vanilla MVVM

---

### Option C: MVVM + Repository + Coordinator (Structured MVVM)

**Description:** Option A enhanced with two explicit conventions: (1) a Coordinator pattern for navigation, and (2) a documented side-effect convention (all async work via `.task` modifier, all mutations through ViewModel methods). This is MVVM with guardrails, without a framework dependency.

```
View → ViewModel → Repository → Supabase
  ↕                ← @Observable ←
Coordinator (navigation)
```

**Pros:**
- All MVVM benefits, plus explicit navigation management
- No external dependency — patterns are conventions in your own code
- Coordinator pattern maps well to React Router mental model
- Easy to adopt incrementally; can start simple and add structure as needed

**Cons:**
- Conventions require discipline — no compiler enforcement
- Coordinator pattern in SwiftUI is less elegant than in UIKit (NavigationPath helps but is limited)
- More code than bare MVVM, less structure than TCA

**Complexity:** Medium  
**Testability:** Good  
**Community support:** Good (pattern is well-known, but no single canonical implementation)

---

### Recommendation: Option A — MVVM + Repository Pattern

**Rationale:**

1. **Learning curve**: This is a first Swift project. TCA (Option B) demands deep Swift generics/macro knowledge that will slow down Phase 1 delivery. MVVM lets the developer focus on learning SwiftUI, Swift concurrency, and Supabase — three new things are enough without adding a fourth (TCA framework internals).

2. **Pragmatic progression**: Start with simple MVVM. If state management becomes painful in Phase 3 (Kanban/Gantt), the Repository layer stays the same — only the ViewModel layer would need restructuring. Migrating from MVVM to TCA later is feasible; the reverse is harder.

3. **React mapping**: MVVM + Repository actually maps more directly to the React patterns the developer already knows:
   - ViewModel = custom hook (`useTaskList()`)
   - Repository = API service module (`taskApi.ts`)
   - `@Observable` = `useState` + automatic re-render
   - `.task { }` = `useEffect(() => { fetchData() }, [])`

4. **Coordinator deferred**: For Phase 1, SwiftUI's built-in `NavigationStack` / `NavigationSplitView` with `NavigationPath` is sufficient. A Coordinator (Option C) can be introduced in Phase 3 when navigation complexity warrants it.

5. **Sole developer**: MVVM has the lowest "context switch cost." When the developer returns to the codebase after a break, the patterns are self-evident.

---

## 3. Project Structure

### Xcode Workspace Layout

```
NotForgetList/
├── NotForgetList.xcodeproj          # Xcode project (multiplatform app target)
├── NotForgetList/                   # App target (shared iOS + macOS)
│   ├── App/
│   │   ├── NotForgetListApp.swift   # @main entry point
│   │   ├── AppState.swift           # Root observable state
│   │   └── AppConstants.swift       # Global constants
│   │
│   ├── Features/                    # Feature modules (one folder per feature)
│   │   ├── TaskList/
│   │   │   ├── TaskListView.swift
│   │   │   ├── TaskListViewModel.swift
│   │   │   └── TaskRowView.swift
│   │   │
│   │   ├── TaskDetail/
│   │   │   ├── TaskDetailView.swift
│   │   │   ├── TaskDetailViewModel.swift
│   │   │   └── DescriptionEditorView.swift
│   │   │
│   │   ├── Sidebar/
│   │   │   ├── SidebarView.swift
│   │   │   └── SidebarViewModel.swift
│   │   │
│   │   ├── SmartLists/
│   │   │   ├── TodayView.swift
│   │   │   ├── UpcomingView.swift
│   │   │   └── SmartListViewModel.swift
│   │   │
│   │   ├── Tags/
│   │   │   ├── TagListView.swift
│   │   │   └── TagViewModel.swift
│   │   │
│   │   ├── Search/
│   │   │   ├── SearchView.swift
│   │   │   └── SearchViewModel.swift
│   │   │
│   │   └── Settings/
│   │       ├── SettingsView.swift
│   │       └── SettingsViewModel.swift
│   │
│   ├── Shared/                      # Reusable UI components
│   │   ├── Components/
│   │   │   ├── PriorityBadge.swift
│   │   │   ├── TagChip.swift
│   │   │   ├── DueDateLabel.swift
│   │   │   ├── ColorPicker.swift
│   │   │   └── EmptyStateView.swift
│   │   │
│   │   └── Modifiers/
│   │       ├── SwipeActions.swift
│   │       └── DragReorder.swift
│   │
│   ├── Platform/                    # Platform-specific code
│   │   ├── iOS/
│   │   │   └── iOSNavigationView.swift
│   │   └── macOS/
│   │       ├── MacNavigationView.swift
│   │       └── ToolbarCommands.swift
│   │
│   ├── Resources/
│   │   ├── Localizable.xcstrings    # String catalog (zh-Hant + en)
│   │   ├── Assets.xcassets
│   │   └── Info.plist
│   │
│   └── Preview Content/
│       └── PreviewData.swift        # Mock data for SwiftUI previews
│
├── Packages/                        # Local Swift packages
│   ├── NFLCore/                     # Data models + business logic
│   │   ├── Sources/NFLCore/
│   │   │   ├── Models/
│   │   │   │   ├── NFLTask.swift
│   │   │   │   ├── TaskList.swift
│   │   │   │   ├── ListGroup.swift
│   │   │   │   ├── Tag.swift
│   │   │   │   ├── Reminder.swift
│   │   │   │   ├── PomodoroSession.swift
│   │   │   │   ├── KanbanStatus.swift
│   │   │   │   └── RepeatRule.swift
│   │   │   ├── LexoRank.swift       # Fractional index implementation
│   │   │   └── Enums/
│   │   │       ├── Priority.swift
│   │   │       └── TaskStatus.swift
│   │   ├── Tests/NFLCoreTests/
│   │   └── Package.swift
│   │
│   ├── NFLNetwork/                  # Supabase integration
│   │   ├── Sources/NFLNetwork/
│   │   │   ├── SupabaseClientProvider.swift
│   │   │   ├── Repositories/
│   │   │   │   ├── TaskRepository.swift
│   │   │   │   ├── ListRepository.swift
│   │   │   │   ├── TagRepository.swift
│   │   │   │   ├── GroupRepository.swift
│   │   │   │   └── SearchRepository.swift
│   │   │   ├── Realtime/
│   │   │   │   └── RealtimeManager.swift
│   │   │   └── Protocols/
│   │   │       └── RepositoryProtocol.swift
│   │   ├── Tests/NFLNetworkTests/
│   │   └── Package.swift
│   │
│   └── NFLEditor/                   # Rich text editor (bridged UITextView/NSTextView)
│       ├── Sources/NFLEditor/
│       │   ├── MarkdownEditor.swift
│       │   ├── MarkdownParser.swift
│       │   ├── iOS/
│       │   │   └── UIKitEditorBridge.swift
│       │   └── macOS/
│       │       └── AppKitEditorBridge.swift
│       ├── Tests/NFLEditorTests/
│       └── Package.swift
│
├── docs/
│   ├── specs/
│   └── adr/                         # Architecture Decision Records
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions: build + test
│
├── supabase/                        # Supabase project files
│   ├── migrations/                  # SQL migration files
│   │   └── 001_initial_schema.sql
│   ├── functions/                   # Edge functions
│   │   └── push-notification/
│   │       └── index.ts
│   └── config.toml
│
└── README.md
```

### Why Local Swift Packages?

Swift Package Manager (SPM) modules provide:
- **Build isolation**: Changes to `NFLCore` models don't recompile UI code
- **Enforced boundaries**: Views cannot accidentally import Supabase SDK directly
- **Testability**: Packages have their own test targets, runnable independently
- **React analogy**: Think of each package as an npm package in a monorepo (`packages/core`, `packages/api`)

---

## 4. Data Model

### 4.1 PostgreSQL Schema (Supabase)

```sql
-- ============================================================
-- Enable required extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Users (managed by Supabase Auth, this is the public profile)
-- ============================================================
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    locale      TEXT DEFAULT 'zh-Hant',
    daily_summary_time TIME DEFAULT '08:00:00',
    daily_summary_enabled BOOLEAN DEFAULT TRUE,
    pomodoro_focus_minutes INT DEFAULT 25,
    pomodoro_short_break_minutes INT DEFAULT 5,
    pomodoro_long_break_minutes INT DEFAULT 15,
    pomodoro_cycles_before_long_break INT DEFAULT 4,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- List Groups (folders that contain lists)
-- ============================================================
CREATE TABLE public.list_groups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  TEXT NOT NULL,  -- LexoRank fractional index
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_list_groups_user ON public.list_groups(user_id)
    WHERE deleted_at IS NULL;

-- ============================================================
-- Lists
-- ============================================================
CREATE TABLE public.lists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id    UUID REFERENCES public.list_groups(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    color       TEXT,           -- Hex color, e.g. '#FF6B6B'
    is_inbox    BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    sort_order  TEXT NOT NULL,  -- LexoRank
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_lists_user ON public.lists(user_id)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_lists_inbox ON public.lists(user_id)
    WHERE is_inbox = TRUE AND deleted_at IS NULL;

-- ============================================================
-- Kanban Statuses (per-list custom columns)
-- ============================================================
CREATE TABLE public.kanban_statuses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list_id     UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,   -- e.g. 'To Do', 'In Progress', 'Done'
    sort_order  TEXT NOT NULL,   -- LexoRank
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_kanban_statuses_list ON public.kanban_statuses(list_id)
    WHERE deleted_at IS NULL;

-- ============================================================
-- Tasks
-- ============================================================
CREATE TABLE public.tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list_id         UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    kanban_status_id UUID REFERENCES public.kanban_statuses(id) ON DELETE SET NULL,
    title           TEXT NOT NULL CHECK (char_length(title) <= 500),
    description     TEXT,          -- Markdown content
    priority        SMALLINT DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
                                    -- 0=None, 1=Low, 2=Medium, 3=High
    is_completed    BOOLEAN DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    due_date        DATE,
    due_time        TIME,
    start_date      DATE,          -- For Gantt view (Phase 3)
    sort_order      TEXT NOT NULL,  -- LexoRank within list
    -- Repeat
    repeat_rule     JSONB,         -- { "type": "daily"|"weekly"|"monthly"|"yearly"|"custom", "interval": 1, "days_of_week": [1,3,5] }
    -- Dependencies (Phase 3)
    depends_on_id   UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_list ON public.tasks(user_id, list_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON public.tasks(user_id, due_date)
    WHERE deleted_at IS NULL AND is_completed = FALSE;
CREATE INDEX idx_tasks_completed ON public.tasks(user_id, completed_at)
    WHERE deleted_at IS NULL AND is_completed = TRUE;
CREATE INDEX idx_tasks_search ON public.tasks
    USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')))
    WHERE deleted_at IS NULL;

-- ============================================================
-- Tags
-- ============================================================
CREATE TABLE public.tags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    color       TEXT,
    sort_order  TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    UNIQUE(user_id, name)
);

CREATE INDEX idx_tags_user ON public.tags(user_id)
    WHERE deleted_at IS NULL;

-- ============================================================
-- Task-Tag junction
-- ============================================================
CREATE TABLE public.task_tags (
    task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (task_id, tag_id)
);

-- ============================================================
-- Reminders (Phase 2)
-- ============================================================
CREATE TABLE public.reminders (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    remind_at   TIMESTAMPTZ NOT NULL,
    -- Location-based (optional)
    location_name TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    radius_meters INT DEFAULT 100,
    trigger_on  TEXT CHECK (trigger_on IN ('arrive', 'leave')),
    is_fired    BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reminders_task ON public.reminders(task_id);
CREATE INDEX idx_reminders_pending ON public.reminders(user_id, remind_at)
    WHERE is_fired = FALSE;

-- ============================================================
-- Pomodoro Sessions (Phase 4)
-- ============================================================
CREATE TABLE public.pomodoro_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id     UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    started_at  TIMESTAMPTZ NOT NULL,
    ended_at    TIMESTAMPTZ,
    duration_seconds INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pomodoro_user_date ON public.pomodoro_sessions(user_id, started_at);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all mutable tables
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lists_updated_at BEFORE UPDATE ON public.lists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_list_groups_updated_at BEFORE UPDATE ON public.list_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON public.tags
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_kanban_statuses_updated_at BEFORE UPDATE ON public.kanban_statuses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_reminders_updated_at BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Row-Level Security (RLS) Policies
-- ============================================================
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Pattern: every table policy checks auth.uid() = user_id
-- Profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Tasks (example — same pattern for all other tables)
CREATE POLICY "Users can CRUD own tasks"
    ON public.tasks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Lists
CREATE POLICY "Users can CRUD own lists"
    ON public.lists FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- List Groups
CREATE POLICY "Users can CRUD own groups"
    ON public.list_groups FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tags
CREATE POLICY "Users can CRUD own tags"
    ON public.tags FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Task-Tags (join through task ownership)
CREATE POLICY "Users can CRUD own task_tags"
    ON public.task_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_tags.task_id
            AND tasks.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_tags.task_id
            AND tasks.user_id = auth.uid()
        )
    );

-- Kanban Statuses
CREATE POLICY "Users can CRUD own kanban_statuses"
    ON public.kanban_statuses FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Reminders
CREATE POLICY "Users can CRUD own reminders"
    ON public.reminders FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Pomodoro Sessions
CREATE POLICY "Users can CRUD own pomodoro_sessions"
    ON public.pomodoro_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Seed: create Inbox list for new users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id) VALUES (NEW.id);
    INSERT INTO public.lists (user_id, name, is_inbox, sort_order)
        VALUES (NEW.id, 'Inbox', TRUE, 'a');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4.2 Swift Models (NFLCore Package)

```swift
// Packages/NFLCore/Sources/NFLCore/Models/NFLTask.swift
import Foundation

/// `NFLTask` instead of `Task` to avoid collision with Swift concurrency's `Task`.
struct NFLTask: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var userID: UUID
    var listID: UUID
    var kanbanStatusID: UUID?
    var title: String
    var description: String?
    var priority: Priority
    var isCompleted: Bool
    var completedAt: Date?
    var dueDate: Date?       // Date-only (decoded from DATE column)
    var dueTime: Date?       // Time-only (decoded from TIME column)
    var startDate: Date?
    var sortOrder: String    // LexoRank
    var repeatRule: RepeatRule?
    var dependsOnID: UUID?
    let createdAt: Date
    var updatedAt: Date
    var deletedAt: Date?

    // Relationships loaded separately, not encoded in this struct
    var tags: [Tag]?

    enum CodingKeys: String, CodingKey {
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

enum Priority: Int, Codable, CaseIterable, Sendable {
    case none = 0
    case low = 1
    case medium = 2
    case high = 3

    var label: String {
        switch self {
        case .none:   "None"
        case .low:    "Low"
        case .medium: "Medium"
        case .high:   "High"
        }
    }
}

struct RepeatRule: Codable, Hashable, Sendable {
    enum RepeatType: String, Codable, Sendable {
        case daily, weekly, monthly, yearly, custom
    }
    var type: RepeatType
    var interval: Int             // Every N days/weeks/months/years
    var daysOfWeek: [Int]?        // 1=Mon..7=Sun, only for weekly+custom

    enum CodingKeys: String, CodingKey {
        case type, interval
        case daysOfWeek = "days_of_week"
    }
}
```

```swift
// Packages/NFLCore/Sources/NFLCore/Models/TaskList.swift
import Foundation

struct TaskList: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var userID: UUID
    var groupID: UUID?
    var name: String
    var color: String?
    var isInbox: Bool
    var isArchived: Bool
    var sortOrder: String

    let createdAt: Date
    var updatedAt: Date
    var deletedAt: Date?

    enum CodingKeys: String, CodingKey {
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

```swift
// Packages/NFLCore/Sources/NFLCore/Models/ListGroup.swift
import Foundation

struct ListGroup: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var userID: UUID
    var name: String
    var sortOrder: String

    let createdAt: Date
    var updatedAt: Date
    var deletedAt: Date?

    enum CodingKeys: String, CodingKey {
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

```swift
// Packages/NFLCore/Sources/NFLCore/Models/Tag.swift
import Foundation

struct Tag: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var userID: UUID
    var name: String
    var color: String?
    var sortOrder: String

    let createdAt: Date
    var updatedAt: Date
    var deletedAt: Date?

    enum CodingKeys: String, CodingKey {
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

```swift
// Packages/NFLCore/Sources/NFLCore/LexoRank.swift
import Foundation

/// Minimal LexoRank implementation for fractional indexing.
/// Generates a string that sorts lexicographically between two bounds.
///
/// Usage:
///   LexoRank.between("a", "b")  // → "an" (midpoint)
///   LexoRank.between(nil, "a")  // → "N" (before first)
///   LexoRank.between("z", nil)  // → "zn" (after last)
enum LexoRank {
    static func between(_ before: String?, _ after: String?) -> String {
        // Implementation uses base-52 (a-z, A-Z) midpoint calculation.
        // This is a simplified version; a production implementation should
        // handle edge cases (equal strings, exhausted space, rebalancing).
        // Recommend: https://github.com/nicolo-ribaudo/lexorank (port to Swift)
        fatalError("TODO: implement — see PLAN.md Step X")
    }
}
```

---

## 5. API Layer Design

### 5.1 Supabase Client Integration

The `supabase-swift` SDK is the sole networking layer. No raw URLSession calls for data operations.

```swift
// Packages/NFLNetwork/Sources/NFLNetwork/SupabaseClientProvider.swift
import Supabase
import Foundation

/// Singleton provider for the Supabase client.
/// React analogy: this is like creating an Axios instance with baseURL + interceptors.
@MainActor
final class SupabaseClientProvider: Sendable {
    static let shared = SupabaseClientProvider()

    let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: URL(string: AppConstants.supabaseURL)\!,
            supabaseKey: AppConstants.supabaseAnonKey
        )
    }
}
```

### 5.2 Repository Pattern

Each entity has a repository protocol and a concrete implementation. ViewModels depend on the protocol (for testing).

```swift
// Packages/NFLNetwork/Sources/NFLNetwork/Protocols/RepositoryProtocol.swift
import Foundation
import NFLCore

protocol TaskRepositoryProtocol: Sendable {
    func fetchTasks(listID: UUID) async throws -> [NFLTask]
    func fetchTasksDueOn(date: Date) async throws -> [NFLTask]
    func fetchTasksDueInRange(from: Date, to: Date) async throws -> [NFLTask]
    func fetchCompletedTasks(since: Date) async throws -> [NFLTask]
    func searchTasks(query: String) async throws -> [NFLTask]
    func createTask(_ task: NFLTask) async throws -> NFLTask
    func updateTask(_ task: NFLTask) async throws -> NFLTask
    func softDeleteTask(id: UUID) async throws
    func reorderTask(id: UUID, newSortOrder: String) async throws
}
```

```swift
// Packages/NFLNetwork/Sources/NFLNetwork/Repositories/TaskRepository.swift
import Supabase
import NFLCore
import Foundation

final class TaskRepository: TaskRepositoryProtocol {
    private let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    func fetchTasks(listID: UUID) async throws -> [NFLTask] {
        try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")  // Nested join
            .eq("list_id", value: listID.uuidString)
            .is("deleted_at", value: nil)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    func searchTasks(query: String) async throws -> [NFLTask] {
        // Uses PostgreSQL full-text search via the GIN index
        try await client.from("tasks")
            .select()
            .is("deleted_at", value: nil)
            .textSearch("title", query: query, type: .plain)
            .execute()
            .value
    }

    func createTask(_ task: NFLTask) async throws -> NFLTask {
        try await client.from("tasks")
            .insert(task)
            .select()
            .single()
            .execute()
            .value
    }

    func updateTask(_ task: NFLTask) async throws -> NFLTask {
        try await client.from("tasks")
            .update(task)
            .eq("id", value: task.id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    func softDeleteTask(id: UUID) async throws {
        try await client.from("tasks")
            .update(["deleted_at": Date().ISO8601Format()])
            .eq("id", value: id.uuidString)
            .execute()
    }

    func reorderTask(id: UUID, newSortOrder: String) async throws {
        try await client.from("tasks")
            .update(["sort_order": newSortOrder])
            .eq("id", value: id.uuidString)
            .execute()
    }

    func fetchTasksDueOn(date: Date) async throws -> [NFLTask] {
        let dateStr = date.formatted(.iso8601.year().month().day())
        return try await client.from("tasks")
            .select("*, tags:task_tags(tag:tags(*))")
            .eq("due_date", value: dateStr)
            .is("deleted_at", value: nil)
            .eq("is_completed", value: false)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    func fetchTasksDueInRange(from: Date, to: Date) async throws -> [NFLTask] {
        let fromStr = from.formatted(.iso8601.year().month().day())
        let toStr = to.formatted(.iso8601.year().month().day())
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

    func fetchCompletedTasks(since: Date) async throws -> [NFLTask] {
        let sinceStr = since.ISO8601Format()
        return try await client.from("tasks")
            .select()
            .is("deleted_at", value: nil)
            .eq("is_completed", value: true)
            .gte("completed_at", value: sinceStr)
            .order("completed_at", ascending: false)
            .execute()
            .value
    }
}
```

### 5.3 Realtime Subscription

```swift
// Packages/NFLNetwork/Sources/NFLNetwork/Realtime/RealtimeManager.swift
import Supabase
import NFLCore
import Foundation

/// Manages Supabase Realtime subscriptions.
/// React analogy: this is like a WebSocket hook that fires callbacks on data changes.
@Observable
final class RealtimeManager {
    private let client: SupabaseClient
    private var channel: RealtimeChannelV2?

    init(client: SupabaseClient) {
        self.client = client
    }

    /// Subscribe to all task changes for the current user.
    func subscribeToTasks(
        userID: UUID,
        onInsert: @escaping (NFLTask) -> Void,
        onUpdate: @escaping (NFLTask) -> Void,
        onDelete: @escaping (NFLTask) -> Void
    ) async {
        let channel = client.realtimeV2.channel("tasks-\(userID)")

        let changes = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "tasks",
            filter: "user_id=eq.\(userID.uuidString)"
        )

        let updates = channel.postgresChange(
            UpdateAction.self,
            schema: "public",
            table: "tasks",
            filter: "user_id=eq.\(userID.uuidString)"
        )

        let deletes = channel.postgresChange(
            DeleteAction.self,
            schema: "public",
            table: "tasks",
            filter: "user_id=eq.\(userID.uuidString)"
        )

        await channel.subscribe()
        self.channel = channel

        // Listen in background tasks
        Task {
            for await insert in changes {
                if let task = try? insert.decodeRecord(as: NFLTask.self, decoder: JSONDecoder()) {
                    await MainActor.run { onInsert(task) }
                }
            }
        }
        Task {
            for await update in updates {
                if let task = try? update.decodeRecord(as: NFLTask.self, decoder: JSONDecoder()) {
                    await MainActor.run { onUpdate(task) }
                }
            }
        }
        Task {
            for await delete in deletes {
                if let task = try? delete.decodeOldRecord(as: NFLTask.self, decoder: JSONDecoder()) {
                    await MainActor.run { onDelete(task) }
                }
            }
        }
    }

    func unsubscribe() async {
        await channel?.unsubscribe()
        channel = nil
    }
}
```

### 5.4 Edge Functions

Two Edge Functions are needed (Phase 2+):

1. **`push-notification`** — Triggered by a database webhook when a row in `reminders` reaches its `remind_at` time. Sends an APNs push via Supabase's built-in push or a direct APNs call.

2. **`daily-summary`** — Runs on a cron schedule (pg_cron). Queries each user's tasks due today and sends a push notification summary.

These are Phase 2 deliverables and do not affect Phase 1 architecture.

---

## 6. State Management

### Data Flow

```
                    ┌──────────────────────────────────┐
                    │         Supabase Cloud            │
                    │  (PostgreSQL + Realtime WS)       │
                    └───────────┬──────────────────────┘
                                │
                    ┌───────────▼──────────────────────┐
                    │        Repository Layer           │
                    │  (TaskRepository, ListRepository) │
                    │  Translates Supabase ↔ Swift      │
                    └───────────┬──────────────────────┘
                                │
                    ┌───────────▼──────────────────────┐
                    │       ViewModel Layer             │
                    │  (@Observable classes)            │
                    │  In-memory cache lives here       │
                    │  Business logic lives here        │
                    └───────────┬──────────────────────┘
                                │ automatic SwiftUI
                                │ observation
                    ┌───────────▼──────────────────────┐
                    │          View Layer               │
                    │  (SwiftUI structs)                │
                    │  Renders state, dispatches actions │
                    └──────────────────────────────────┘
```

### ViewModel Example

```swift
// NotForgetList/Features/TaskList/TaskListViewModel.swift
import SwiftUI
import NFLCore
import NFLNetwork

@Observable
@MainActor
final class TaskListViewModel {
    // MARK: - State (React analogy: these are your useState values)
    var tasks: [NFLTask] = []
    var isLoading = false
    var error: Error?

    private let taskRepo: TaskRepositoryProtocol
    private let listID: UUID

    init(listID: UUID, taskRepo: TaskRepositoryProtocol) {
        self.listID = listID
        self.taskRepo = taskRepo
    }

    // MARK: - Actions (React analogy: dispatch functions)

    /// Called from .task { } modifier — like useEffect on mount
    func loadTasks() async {
        isLoading = true
        defer { isLoading = false }
        do {
            tasks = try await taskRepo.fetchTasks(listID: listID)
        } catch {
            self.error = error
        }
    }

    /// Optimistic create — UI updates instantly, server call in background
    func createTask(title: String) async {
        let newSortOrder = LexoRank.between(tasks.last?.sortOrder, nil)
        let newTask = NFLTask(
            id: UUID(),
            userID: UUID(), // filled by auth context
            listID: listID,
            title: title,
            priority: .none,
            isCompleted: false,
            sortOrder: newSortOrder,
            createdAt: .now,
            updatedAt: .now
        )

        // 1. Optimistic update (instant UI feedback — NFR-1.4: <100ms)
        tasks.append(newTask)

        // 2. Server call
        do {
            let serverTask = try await taskRepo.createTask(newTask)
            // Replace optimistic version with server-confirmed version
            if let index = tasks.firstIndex(where: { $0.id == newTask.id }) {
                tasks[index] = serverTask
            }
        } catch {
            // 3. Rollback on failure
            tasks.removeAll { $0.id == newTask.id }
            self.error = error
        }
    }

    func toggleComplete(_ task: NFLTask) async {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }

        // Optimistic
        tasks[index].isCompleted.toggle()
        tasks[index].completedAt = tasks[index].isCompleted ? .now : nil

        do {
            tasks[index] = try await taskRepo.updateTask(tasks[index])
        } catch {
            // Rollback
            tasks[index].isCompleted.toggle()
            tasks[index].completedAt = task.completedAt
            self.error = error
        }
    }

    func reorder(from source: IndexSet, to destination: Int) async {
        var reordered = tasks
        reordered.move(fromOffsets: source, toOffset: destination)

        // Calculate new LexoRank for the moved item
        let movedIndex = destination > source.first\! ? destination - 1 : destination
        let before = movedIndex > 0 ? reordered[movedIndex - 1].sortOrder : nil
        let after = movedIndex < reordered.count - 1 ? reordered[movedIndex + 1].sortOrder : nil
        let newRank = LexoRank.between(before, after)

        // Optimistic
        reordered[movedIndex].sortOrder = newRank
        tasks = reordered

        do {
            try await taskRepo.reorderTask(id: reordered[movedIndex].id, newSortOrder: newRank)
        } catch {
            // Reload from server on reorder failure
            await loadTasks()
        }
    }
}
```

### In-Memory Caching Strategy

| What | Where | Lifetime | Invalidation |
|------|-------|----------|-------------|
| Current list's tasks | `TaskListViewModel.tasks` | While view is mounted | Reload on appear, Realtime updates |
| Sidebar lists + groups | `SidebarViewModel.lists` | App session | Realtime updates |
| Tags | `TagViewModel.tags` | App session | Realtime updates |
| Search results | `SearchViewModel.results` | While search is active | Each new query replaces |
| Smart list data | `SmartListViewModel.tasks` | While view is mounted | Reload on appear |

There is no shared global cache in Phase 1. Each ViewModel owns its data. If two ViewModels need the same data (e.g., sidebar badge count + list view), a shared `@Observable` service can be introduced.

### Optimistic UI Update Pattern

Every write follows the same three-step pattern:

1. **Mutate local state immediately** (user sees result in < 100ms)
2. **Send request to Supabase** (async, in background)
3. **On success**: replace local data with server response. **On failure**: rollback local state, show error toast.

This is identical to React Query's `optimisticUpdate` + `rollback` pattern.

---

## 7. Authentication Flow

### Phase 1-4: Guest Mode

- No authentication required.
- The app uses a **hardcoded anonymous UUID** stored in `UserDefaults` as the `user_id`.
- Supabase is configured with a permissive RLS policy for development: `auth.uid()` is replaced with a server-side function that accepts an `x-user-id` header (development only).
- **Alternative (simpler):** Use Supabase Anonymous Sign-In (`auth.signInAnonymously()`). This gives a real JWT and `auth.uid()` without requiring the user to enter credentials. RLS works immediately. When the user later signs in with Apple (Phase 5), the anonymous account is linked.

**Recommendation: Use Supabase Anonymous Sign-In from Phase 1.** This avoids building a separate auth bypass that must be dismantled in Phase 5.

```swift
// On first launch:
let session = try await SupabaseClientProvider.shared.client.auth.signInAnonymously()
// session.user.id is now a real UUID, RLS policies work
```

### Phase 5: Sign In with Apple

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐
│  User    │────▶│ Apple Sign-In │────▶│ Supabase Auth │
│ taps     │     │ (ASAuth)     │     │ (OIDC)       │
│ button   │     │              │     │              │
└─────────┘     └──────┬───────┘     └──────┬───────┘
                       │ ID Token           │ JWT
                       └───────────────────▶│
                                            │
                              ┌──────────────▼──────────┐
                              │ Link anonymous account  │
                              │ to Apple identity       │
                              │ (merge, not replace)    │
                              └─────────────────────────┘
```

- **Token storage**: Supabase Swift SDK stores the session in Keychain by default (NFR-2.2 satisfied).
- **Session refresh**: The SDK handles JWT refresh automatically.
- **Account linking**: `auth.linkIdentity(provider: .apple)` converts the Phase 1 anonymous account into a full Apple-linked account. All existing data retains the same `user_id`.

---

## 8. Platform-Specific Considerations

### macOS

**Navigation Structure:**
```swift
// Platform/macOS/MacNavigationView.swift
NavigationSplitView(columnVisibility: $columnVisibility) {
    // Sidebar: lists, groups, smart lists, tags
    SidebarView()
} content: {
    // Middle: task list for selected item
    TaskListView(listID: selectedListID)
} detail: {
    // Right: task detail editor
    TaskDetailView(taskID: selectedTaskID)
}
```

**macOS-specific features:**
- **Menu bar commands**: File > New Task (Cmd+N), Edit > Find (Cmd+F)
- **Keyboard shortcuts**: Cmd+1..5 for smart lists, Cmd+Enter to complete task, Delete to soft-delete
- **Toolbar**: Compact toolbar with search field, view mode picker, new task button
- **Multi-window**: Not in Phase 1. `@Environment(\.openWindow)` can be added later.
- **Sidebar width**: Resizable, default 220pt, minimum 180pt

### iOS

**Navigation Structure:**
```swift
// Platform/iOS/iOSNavigationView.swift
// On iPhone: single column with push navigation
// On iPad: behaves like NavigationSplitView automatically
NavigationSplitView {
    SidebarView()
} detail: {
    // Task list + detail in a NavigationStack
    NavigationStack(path: $navPath) {
        TaskListView(listID: selectedListID)
            .navigationDestination(for: UUID.self) { taskID in
                TaskDetailView(taskID: taskID)
            }
    }
}
```

**iOS-specific features (by phase):**
- **Phase 1**: Swipe actions on task rows (complete, delete), pull-to-refresh
- **Phase 2**: Push notifications, deep link handling via `UNUserNotificationCenter`
- **Phase 4**: Live Activity (ActivityKit), Home Screen Widget (WidgetKit)
- **Haptic feedback**: On task completion, drag-and-drop reorder

---

## 9. Key Technical Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D-1 | Client architecture | MVVM + Repository | Lowest learning curve for Swift beginner; familiar to React developers (ViewModel = custom hook); no framework dependency; see Section 2 |
| D-2 | Rich text storage format | Markdown (plain text) | Portable, human-readable, easy to parse. Avoids proprietary JSON document model. The editor renders Markdown live but stores raw Markdown string in the `description` column |
| D-3 | Rich text editor approach | Bridged `UITextView`/`NSTextView` with `NSAttributedString` | No mature pure-SwiftUI rich text editor exists (Risk R-1). Bridging native text views is well-documented and gives full control over formatting. `MarkdownParser` converts Markdown <-> `NSAttributedString` |
| D-4 | Sort order implementation | LexoRank (fractional index strings) | Avoids re-indexing all items on every reorder. A single item's `sort_order` is updated. LexoRank strings sort lexicographically: `"a" < "an" < "b"`. Occasional rebalancing needed if space exhausts (rare) |
| D-5 | Sync strategy | Cloud-first + Supabase Realtime | Supabase Realtime pushes changes via WebSocket. No polling. Phase 5 adds pending-ops queue for offline. LWW conflict resolution (single-user app, acceptable) |
| D-6 | Local persistence | None (Phases 1-4) | In-memory `@Observable` state only. Simplifies architecture dramatically. Acceptable because the app is cloud-first and the developer is learning Swift — no need to learn CoreData/SwiftData yet |
| D-7 | Swift concurrency model | `async/await` + `@MainActor` | Modern, maps well to React's `async/await`. All ViewModels are `@MainActor`. Repositories are `Sendable`. No Combine unless needed for debouncing (search) |
| D-8 | Search implementation | PostgreSQL full-text search via Supabase | GIN index on `title || description`. No local search index needed. Fast enough for < 10K tasks. Debounced at 300ms on client |
| D-9 | Auth strategy (Phase 1) | Supabase Anonymous Sign-In | Real JWT from day one. RLS works immediately. Account links to Apple ID in Phase 5 without data migration |
| D-10 | Package manager | Swift Package Manager (SPM) | Only option for local packages in Xcode. CocoaPods/Carthage not needed. External dep: `supabase-swift` via SPM |
| D-11 | Localization | `.xcstrings` String Catalogs | Native Xcode format (iOS 17+). Supports zh-Hant + en. Compiler warns on missing translations |
| D-12 | CI/CD | GitHub Actions + xcodebuild | Build and test on every push to main. Xcode Cloud or Fastlane for TestFlight (configured in Phase 1 but not critical path) |

---

## 10. Phase 1 Scope — Detailed Breakdown

### What Gets Built

Phase 1 delivers a fully functional CRUD task manager with lists, groups, tags, smart lists, search, and a description editor. It runs on both iOS and macOS from a shared codebase.

### Modules to Build

| Module | Package | Description |
|--------|---------|-------------|
| Models | `NFLCore` | `NFLTask`, `TaskList`, `ListGroup`, `Tag`, `RepeatRule`, `Priority`, `LexoRank` |
| Network | `NFLNetwork` | `SupabaseClientProvider`, `TaskRepository`, `ListRepository`, `TagRepository`, `GroupRepository`, `SearchRepository`, `RealtimeManager` |
| Editor | `NFLEditor` | `MarkdownEditor` (bridged), `MarkdownParser` |

### Screens

| # | Screen | Platform | Description |
|---|--------|----------|-------------|
| S-1 | Root Navigation Shell | Both | `NavigationSplitView` — sidebar + content + detail (macOS 3-col, iOS 2-col) |
| S-2 | Sidebar | Both | Lists grouped by group, smart lists (Today/Tomorrow/Upcoming/All/Completed), Tags section |
| S-3 | Task List | Both | Scrollable list of tasks for selected list/smart list. Supports drag reorder, swipe actions |
| S-4 | Task Detail | Both | Title, description editor, priority picker, due date picker, tag picker, repeat rule picker |
| S-5 | New Task Quick Entry | Both | Inline text field at top of task list (like Apple Reminders) + optional popover for details |
| S-6 | List/Group Management | Both | Create/edit/delete lists and groups. Color picker for list color |
| S-7 | Tag Management | Both | Create/edit/delete tags. Shown in sidebar and in task detail tag picker |
| S-8 | Search | Both | Search bar with debounced full-text search. Results as a task list |
| S-9 | Settings | Both | Locale picker, daily summary toggle (Phase 2 placeholder), about section |

**Total: 9 screens** (some are shared components, not full-screen destinations)

### Data Models Active in Phase 1

- `NFLTask` (full model minus `kanban_status_id`, `start_date`, `depends_on_id` — fields exist but unused)
- `TaskList`
- `ListGroup`
- `Tag`
- `TaskTag` (junction, handled by Supabase joins, no Swift struct needed)
- `RepeatRule`
- `Priority` (enum)

### Database Tables Active in Phase 1

- `profiles` (created automatically on anonymous sign-in)
- `tasks`
- `lists`
- `list_groups`
- `tags`
- `task_tags`

Tables created but unused in Phase 1: `reminders`, `kanban_statuses`, `pomodoro_sessions`

### External Dependencies (SPM)

| Package | Version | Purpose |
|---------|---------|---------|
| `supabase-swift` | 2.x | Supabase client (Auth, PostgREST, Realtime, Storage) |

No other external packages. All UI is native SwiftUI.

### What is NOT in Phase 1

- No reminders / push notifications (Phase 2)
- No Kanban, Calendar, or Gantt views (Phase 3)
- No Pomodoro timer (Phase 4)
- No Sign in with Apple (Phase 5 — anonymous auth used)
- No offline pending-ops queue (Phase 5)
- No widgets or Live Activities (Phase 4)
- No location-based features
- No iPad-specific layouts

### Verification Criteria (Phase 1 Done)

Mapped from REQUIREMENTS.md Section 7:

1. Task CRUD works on both iOS 17 and macOS 14
2. Lists, groups, and tags are fully CRUD-able
3. Smart lists (Today, Tomorrow, Upcoming, All Tasks, Completed) return correct results
4. Search returns results within 300ms on 1000 tasks
5. Description editor renders bold, italic, bullet/numbered lists, inline checklists
6. Manual sort order (LexoRank) persists across app restarts
7. Data syncs between two devices via Supabase Realtime (observable but not offline-resilient)

---

## Dependencies and Risks (Phase 1 Specific)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rich text editor spike (R-1) | High | Build `NFLEditor` package first as a standalone spike. If bridging `UITextView`/`NSTextView` proves too complex for a first Swift project, fall back to plain Markdown editing (render on view, edit as raw text). This is ugly but unblocks Phase 1 |
| LexoRank implementation | Low | Port an existing JS/TS LexoRank library to Swift. Alternatively, use simple midpoint string calculation (`"a"` + `"b"` → `"an"`). Rebalance (reassign all ranks in a list) is a background operation triggered when rank string exceeds 10 characters |
| Supabase anonymous auth + RLS | Low | Test immediately in Phase 1 setup. If anonymous auth creates friction, fall back to a hardcoded dev-only user UUID with RLS disabled (dev mode only, re-enable before Phase 5) |
| Swift 6 strict concurrency | Medium | Mark all ViewModels `@MainActor`. Mark all model structs `Sendable`. Repository methods are `async` and non-isolated. If compiler errors become overwhelming, temporarily use `@preconcurrency` import and fix incrementally |

---

*End of Design Document*
