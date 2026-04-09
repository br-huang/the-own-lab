import Foundation

public enum TaskPriority: String, CaseIterable, Codable, Sendable, Identifiable {
    case none
    case low
    case medium
    case high

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .none: "None"
        case .low: "Low"
        case .medium: "Medium"
        case .high: "High"
        }
    }
}

public struct TaskTag: Identifiable, Codable, Hashable, Sendable {
    public let id: UUID
    public var name: String
    public var colorName: String?

    public init(id: UUID = UUID(), name: String, colorName: String? = nil) {
        self.id = id
        self.name = name
        self.colorName = colorName
    }
}

public struct TaskList: Identifiable, Codable, Hashable, Sendable {
    public let id: UUID
    public var name: String
    public var colorName: String?
    public var isInbox: Bool
    public var isArchived: Bool

    public init(
        id: UUID = UUID(),
        name: String,
        colorName: String? = nil,
        isInbox: Bool = false,
        isArchived: Bool = false
    ) {
        self.id = id
        self.name = name
        self.colorName = colorName
        self.isInbox = isInbox
        self.isArchived = isArchived
    }
}

public struct NFLTask: Identifiable, Codable, Hashable, Sendable {
    public let id: UUID
    public var title: String
    public var notes: String
    public var dueDate: Date?
    public var priority: TaskPriority
    public var isCompleted: Bool
    public var completedAt: Date?
    public var deletedAt: Date?
    public var listID: UUID
    public var tagIDs: [UUID]

    public init(
        id: UUID = UUID(),
        title: String,
        notes: String = "",
        dueDate: Date? = nil,
        priority: TaskPriority = .none,
        isCompleted: Bool = false,
        completedAt: Date? = nil,
        deletedAt: Date? = nil,
        listID: UUID,
        tagIDs: [UUID] = []
    ) {
        self.id = id
        self.title = title
        self.notes = notes
        self.dueDate = dueDate
        self.priority = priority
        self.isCompleted = isCompleted
        self.completedAt = completedAt
        self.deletedAt = deletedAt
        self.listID = listID
        self.tagIDs = tagIDs
    }
}

public enum SidebarDestination: Hashable, Sendable {
    case today
    case upcoming
    case allTasks
    case completed
    case list(UUID)
    case tag(UUID)
}

public struct AppSnapshot: Sendable {
    public var lists: [TaskList]
    public var tags: [TaskTag]
    public var tasks: [NFLTask]

    public init(lists: [TaskList], tags: [TaskTag], tasks: [NFLTask]) {
        self.lists = lists
        self.tags = tags
        self.tasks = tasks
    }
}

public enum PreviewDataFactory {
    public static func makeAppSnapshot(now: Date = .now) -> AppSnapshot {
        let calendar = Calendar.current

        let inbox = TaskList(
            id: UUID(uuidString: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA") ?? UUID(),
            name: "Inbox",
            colorName: "blue",
            isInbox: true
        )
        let work = TaskList(
            id: UUID(uuidString: "BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB") ?? UUID(),
            name: "Work",
            colorName: "orange"
        )
        let personal = TaskList(
            id: UUID(uuidString: "CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC") ?? UUID(),
            name: "Personal",
            colorName: "green"
        )

        let swiftTag = TaskTag(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111111") ?? UUID(),
            name: "Swift",
            colorName: "orange"
        )
        let releaseTag = TaskTag(
            id: UUID(uuidString: "22222222-2222-2222-2222-222222222222") ?? UUID(),
            name: "Release",
            colorName: "red"
        )
        let homeTag = TaskTag(
            id: UUID(uuidString: "33333333-3333-3333-3333-333333333333") ?? UUID(),
            name: "Home",
            colorName: "green"
        )

        let today = calendar.startOfDay(for: now)
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)
        let threeDaysLater = calendar.date(byAdding: .day, value: 3, to: today)
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)

        let tasks = [
            NFLTask(
                id: UUID(uuidString: "44444444-4444-4444-4444-444444444444") ?? UUID(),
                title: "Draft Phase 1 task list flow",
                notes: """
                # MVP Goal
                - Build sidebar
                - Build task list
                - Keep state in memory first
                """,
                dueDate: today,
                priority: .high,
                listID: work.id,
                tagIDs: [swiftTag.id, releaseTag.id]
            ),
            NFLTask(
                title: "Review docs and map smart lists",
                notes: "Use `Today`, `Upcoming`, and `Completed` as the first navigation set.",
                dueDate: tomorrow,
                priority: .medium,
                listID: inbox.id,
                tagIDs: [swiftTag.id]
            ),
            NFLTask(
                title: "Buy coffee beans",
                notes: "- Light roast\n- 1 bag for home",
                dueDate: threeDaysLater,
                priority: .low,
                listID: personal.id,
                tagIDs: [homeTag.id]
            ),
            NFLTask(
                title: "Close completed example task",
                notes: "This row exists to validate the completed section.",
                dueDate: yesterday,
                priority: .none,
                isCompleted: true,
                completedAt: now,
                listID: work.id
            )
        ]

        return AppSnapshot(
            lists: [inbox, work, personal],
            tags: [swiftTag, releaseTag, homeTag],
            tasks: tasks
        )
    }
}
