import Foundation
import NFLCore

@MainActor
public protocol TaskRepository: AnyObject {
    func fetchSnapshot() -> AppSnapshot
    func createTask(title: String, listID: UUID) -> NFLTask
    func updateTask(_ task: NFLTask)
    func softDeleteTask(id: UUID)
    func createList(name: String, colorName: String?) -> TaskList
    func updateList(_ list: TaskList)
    func deleteList(id: UUID)
    func createTag(name: String, colorName: String?) -> TaskTag
    func updateTag(_ tag: TaskTag)
    func deleteTag(id: UUID)
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
        let task = NFLTask(title: title, listID: listID)
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
