import Foundation
import NFLCore

@MainActor
public protocol TaskRepository: AnyObject {
    func fetchSnapshot() -> AppSnapshot
    func createTask(title: String, listID: UUID) -> NFLTask
    func updateTask(_ task: NFLTask)
    func softDeleteTask(id: UUID)
    func moveTask(id: UUID, in listID: UUID, direction: TaskMoveDirection)
    func createList(name: String, colorName: String?) -> TaskList
    func updateList(_ list: TaskList)
    func deleteList(id: UUID)
    func createTag(name: String, colorName: String?) -> TaskTag
    func updateTag(_ tag: TaskTag)
    func deleteTag(id: UUID)
}

public enum TaskMoveDirection: Sendable {
    case up
    case down
}

@MainActor
public final class InMemoryTaskRepository: TaskRepository {
    private var snapshot: AppSnapshot

    public init(snapshot: AppSnapshot = PreviewDataFactory.makeAppSnapshot()) {
        self.snapshot = snapshot
    }

    public func fetchSnapshot() -> AppSnapshot {
        snapshot
    }

    public func createTask(title: String, listID: UUID) -> NFLTask {
        let nextSortOrder = snapshot.tasks
            .filter { $0.listID == listID && $0.deletedAt == nil && $0.isCompleted == false }
            .map(\.sortOrder)
            .max()
            .map { $0 + 1 } ?? 0

        let task = NFLTask(title: title, sortOrder: nextSortOrder, listID: listID)
        snapshot.tasks.insert(task, at: 0)
        return task
    }

    public func updateTask(_ task: NFLTask) {
        guard let index = snapshot.tasks.firstIndex(where: { $0.id == task.id }) else {
            return
        }

        snapshot.tasks[index] = task
    }

    public func softDeleteTask(id: UUID) {
        guard let index = snapshot.tasks.firstIndex(where: { $0.id == id }) else {
            return
        }

        snapshot.tasks[index].deletedAt = .now
    }

    public func moveTask(id: UUID, in listID: UUID, direction: TaskMoveDirection) {
        let orderedTasks = snapshot.tasks
            .filter { $0.listID == listID && $0.deletedAt == nil && $0.isCompleted == false }
            .sorted { lhs, rhs in
                if lhs.sortOrder != rhs.sortOrder {
                    return lhs.sortOrder < rhs.sortOrder
                }

                return lhs.title.localizedStandardCompare(rhs.title) == .orderedAscending
            }

        guard let currentIndex = orderedTasks.firstIndex(where: { $0.id == id }) else {
            return
        }

        let targetIndex: Int
        switch direction {
        case .up:
            targetIndex = currentIndex - 1
        case .down:
            targetIndex = currentIndex + 1
        }

        guard orderedTasks.indices.contains(targetIndex) else {
            return
        }

        let currentID = orderedTasks[currentIndex].id
        let targetID = orderedTasks[targetIndex].id

        guard
            let currentSnapshotIndex = snapshot.tasks.firstIndex(where: { $0.id == currentID }),
            let targetSnapshotIndex = snapshot.tasks.firstIndex(where: { $0.id == targetID })
        else {
            return
        }

        let currentSortOrder = snapshot.tasks[currentSnapshotIndex].sortOrder
        snapshot.tasks[currentSnapshotIndex].sortOrder = snapshot.tasks[targetSnapshotIndex].sortOrder
        snapshot.tasks[targetSnapshotIndex].sortOrder = currentSortOrder
    }

    public func createList(name: String, colorName: String? = nil) -> TaskList {
        let list = TaskList(name: name, colorName: colorName)
        snapshot.lists.append(list)
        return list
    }

    public func updateList(_ list: TaskList) {
        guard let index = snapshot.lists.firstIndex(where: { $0.id == list.id }) else {
            return
        }

        snapshot.lists[index] = list
    }

    public func deleteList(id: UUID) {
        guard let index = snapshot.lists.firstIndex(where: { $0.id == id }) else {
            return
        }

        guard snapshot.lists[index].isInbox == false else {
            return
        }

        snapshot.lists.remove(at: index)

        for taskIndex in snapshot.tasks.indices where snapshot.tasks[taskIndex].listID == id {
            snapshot.tasks[taskIndex].deletedAt = .now
        }
    }

    public func createTag(name: String, colorName: String? = nil) -> TaskTag {
        let tag = TaskTag(name: name, colorName: colorName)
        snapshot.tags.append(tag)
        return tag
    }

    public func updateTag(_ tag: TaskTag) {
        guard let index = snapshot.tags.firstIndex(where: { $0.id == tag.id }) else {
            return
        }

        snapshot.tags[index] = tag
    }

    public func deleteTag(id: UUID) {
        snapshot.tags.removeAll { $0.id == id }

        for taskIndex in snapshot.tasks.indices {
            snapshot.tasks[taskIndex].tagIDs.removeAll { $0 == id }
        }
    }
}
