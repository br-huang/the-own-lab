import Foundation
import NFLCore
import NFLNetwork
import Observation

@MainActor
@Observable
final class AppViewModel {
    var destination: SidebarDestination = .today
    var selectedTaskID: UUID?
    var searchText = ""
    var newTaskTitle = ""

    private let repository: TaskRepository
    private(set) var lists: [TaskList] = []
    private(set) var tags: [TaskTag] = []
    private(set) var tasks: [NFLTask] = []

    init() {
        self.repository = InMemoryTaskRepository()
        reload()
        selectedTaskID = visibleTasks.first?.id
    }

    init(repository: TaskRepository) {
        self.repository = repository
        reload()
        selectedTaskID = visibleTasks.first?.id
    }

    var activeListID: UUID {
        switch destination {
        case .list(let id):
            return id
        default:
            return lists.first(where: \.isInbox)?.id ?? lists.first?.id ?? UUID()
        }
    }

    var visibleTasks: [NFLTask] {
        tasks
            .filter { $0.deletedAt == nil }
            .filter(matchesDestination)
            .filter(matchesSearch)
            .sorted(by: compareTasks)
    }

    var completedVisibleTasks: [NFLTask] {
        visibleTasks.filter(\.isCompleted)
    }

    var openVisibleTasks: [NFLTask] {
        visibleTasks.filter { !$0.isCompleted }
    }

    var selectedTask: NFLTask? {
        get { tasks.first(where: { $0.id == selectedTaskID }) }
        set {
            guard let newValue else { return }
            repository.updateTask(newValue)
            reload(keepSelection: newValue.id)
        }
    }

    var navigationTitle: String {
        switch destination {
        case .today: "Today"
        case .upcoming: "Upcoming"
        case .allTasks: "All Tasks"
        case .completed: "Completed"
        case .list(let id): lists.first(where: { $0.id == id })?.name ?? "List"
        case .tag(let id): tags.first(where: { $0.id == id })?.name ?? "Tag"
        }
    }

    func reload(keepSelection: UUID? = nil) {
        let snapshot = repository.fetchSnapshot()
        lists = snapshot.lists.filter { !$0.isArchived }
        tags = snapshot.tags
        tasks = snapshot.tasks
        selectedTaskID = keepSelection ?? selectedTaskID ?? visibleTasks.first?.id
    }

    func addTask() {
        let title = newTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return }

        let task = repository.createTask(title: title, listID: activeListID)
        newTaskTitle = ""
        reload(keepSelection: task.id)
    }

    func toggleTaskCompletion(_ task: NFLTask) {
        var updated = task
        updated.isCompleted.toggle()
        updated.completedAt = updated.isCompleted ? .now : nil
        repository.updateTask(updated)
        reload(keepSelection: updated.id)
    }

    func createList(named name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let list = repository.createList(name: trimmed, colorName: nil)
        destination = .list(list.id)
        reload()
    }

    func renameList(_ list: TaskList, to newName: String) {
        let trimmed = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        var updated = list
        updated.name = trimmed
        repository.updateList(updated)
        reload()
    }

    func deleteList(_ list: TaskList) {
        guard list.isInbox == false else { return }

        repository.deleteList(id: list.id)
        if destination == .list(list.id) {
            destination = .today
        }
        reload()
    }

    func createTag(named name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let tag = repository.createTag(name: trimmed, colorName: nil)
        destination = .tag(tag.id)
        reload()
    }

    func renameTag(_ tag: TaskTag, to newName: String) {
        let trimmed = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        var updated = tag
        updated.name = trimmed
        repository.updateTag(updated)
        reload(keepSelection: selectedTaskID)
    }

    func deleteTag(_ tag: TaskTag) {
        repository.deleteTag(id: tag.id)
        if destination == .tag(tag.id) {
            destination = .allTasks
        }
        reload(keepSelection: selectedTaskID)
    }

    func setTag(_ tag: TaskTag, isAssigned: Bool, for task: NFLTask) {
        var updated = task

        if isAssigned {
            if updated.tagIDs.contains(tag.id) == false {
                updated.tagIDs.append(tag.id)
            }
        } else {
            updated.tagIDs.removeAll { $0 == tag.id }
        }

        repository.updateTask(updated)
        reload(keepSelection: updated.id)
    }

    func saveTask(_ task: NFLTask) {
        repository.updateTask(task)
        reload(keepSelection: task.id)
    }

    func deleteTask(_ task: NFLTask) {
        repository.softDeleteTask(id: task.id)
        let nextSelection = visibleTasks.first(where: { $0.id != task.id })?.id
        reload(keepSelection: nextSelection)
    }

    func canReorder(task: NFLTask, direction: TaskMoveDirection) -> Bool {
        guard case .list(let listID) = destination, task.listID == listID, task.isCompleted == false else {
            return false
        }

        let orderedTasks = tasks
            .filter { $0.deletedAt == nil && $0.isCompleted == false && $0.listID == listID }
            .sorted(by: compareTasks)

        guard let index = orderedTasks.firstIndex(where: { $0.id == task.id }) else {
            return false
        }

        switch direction {
        case .up:
            return index > 0
        case .down:
            return index < orderedTasks.count - 1
        }
    }

    func moveTask(_ task: NFLTask, direction: TaskMoveDirection) {
        guard case .list(let listID) = destination, task.listID == listID else {
            return
        }

        repository.moveTask(id: task.id, in: listID, direction: direction)
        reload(keepSelection: task.id)
    }

    func smartListCount(for destination: SidebarDestination) -> Int {
        tasks
            .filter { $0.deletedAt == nil }
            .filter(taskMatches(destination: destination))
            .count
    }

    func tagNames(for task: NFLTask) -> [String] {
        let lookup = Dictionary(uniqueKeysWithValues: tags.map { ($0.id, $0.name) })
        return task.tagIDs.compactMap { lookup[$0] }
    }

    func listName(for task: NFLTask) -> String {
        lists.first(where: { $0.id == task.listID })?.name ?? "Inbox"
    }

    func tagTaskCount(for tag: TaskTag) -> Int {
        tasks
            .filter { $0.deletedAt == nil }
            .filter { $0.tagIDs.contains(tag.id) }
            .count
    }

    func isTagAssigned(_ tag: TaskTag, to task: NFLTask) -> Bool {
        task.tagIDs.contains(tag.id)
    }

    private func matchesDestination(_ task: NFLTask) -> Bool {
        taskMatches(destination: destination)(task)
    }

    private func taskMatches(destination: SidebarDestination) -> (NFLTask) -> Bool {
        { task in
            let calendar = Calendar.current
            let startOfToday = calendar.startOfDay(for: .now)
            let startOfTomorrow = calendar.date(byAdding: .day, value: 1, to: startOfToday) ?? startOfToday
            let upcomingEnd = calendar.date(byAdding: .day, value: 7, to: startOfToday) ?? startOfTomorrow

            switch destination {
            case .today:
                guard let dueDate = task.dueDate else { return false }
                return !task.isCompleted && dueDate < startOfTomorrow
            case .upcoming:
                guard let dueDate = task.dueDate else { return false }
                return !task.isCompleted && dueDate >= startOfTomorrow && dueDate < upcomingEnd
            case .allTasks:
                return true
            case .completed:
                return task.isCompleted
            case .list(let id):
                return task.listID == id
            case .tag(let id):
                return task.tagIDs.contains(id)
            }
        }
    }

    private func matchesSearch(_ task: NFLTask) -> Bool {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return true }

        let haystack = [
            task.title,
            task.notes,
            tagNames(for: task).joined(separator: " ")
        ].joined(separator: " ").localizedLowercase

        return haystack.contains(query.localizedLowercase)
    }

    private func compareTasks(lhs: NFLTask, rhs: NFLTask) -> Bool {
        if lhs.isCompleted != rhs.isCompleted {
            return !lhs.isCompleted && rhs.isCompleted
        }

        if case .list = destination, lhs.listID == rhs.listID, lhs.isCompleted == rhs.isCompleted {
            if lhs.sortOrder != rhs.sortOrder {
                return lhs.sortOrder < rhs.sortOrder
            }
        }

        switch (lhs.dueDate, rhs.dueDate) {
        case let (left?, right?) where left != right:
            return left < right
        case (_?, nil):
            return true
        case (nil, _?):
            return false
        default:
            return lhs.title.localizedStandardCompare(rhs.title) == .orderedAscending
        }
    }
}
