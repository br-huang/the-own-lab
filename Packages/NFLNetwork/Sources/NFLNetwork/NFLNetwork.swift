import Foundation
import NFLCore

@MainActor
public protocol TaskRepository: AnyObject {
    func fetchSnapshot() -> AppSnapshot
    func createTask(title: String, listID: UUID) -> NFLTask
    func updateTask(_ task: NFLTask)
    func softDeleteTask(id: UUID)
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
}
