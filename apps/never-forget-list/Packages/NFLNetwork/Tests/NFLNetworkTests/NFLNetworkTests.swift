import Testing
import NFLCore
@testable import NFLNetwork

@MainActor
@Test func createTaskAppendsToEndOfListOrder() async throws {
    let snapshot = PreviewDataFactory.makeAppSnapshot()
    let repository = InMemoryTaskRepository(snapshot: snapshot)

    let workListID = try #require(snapshot.lists.first(where: { $0.name == "Work" })?.id)
    let existingWorkTasks = snapshot.tasks.filter { $0.listID == workListID && $0.isCompleted == false }
    let maxSortOrder = existingWorkTasks.map(\.sortOrder).max() ?? -1

    let createdTask = repository.createTask(title: "Ship reorder support", listID: workListID)

    #expect(createdTask.sortOrder == maxSortOrder + 1)
}

@MainActor
@Test func moveTaskSwapsSortOrderWithinList() async throws {
    let snapshot = PreviewDataFactory.makeAppSnapshot()
    let repository = InMemoryTaskRepository(snapshot: snapshot)

    let workListID = try #require(snapshot.lists.first(where: { $0.name == "Work" })?.id)
    let secondTask = repository.createTask(title: "Second work task", listID: workListID)
    let thirdTask = repository.createTask(title: "Third work task", listID: workListID)

    repository.moveTask(id: thirdTask.id, in: workListID, direction: .up)

    let orderedTasks = repository.fetchSnapshot().tasks
        .filter { $0.listID == workListID && $0.deletedAt == nil && $0.isCompleted == false }
        .sorted { $0.sortOrder < $1.sortOrder }

    #expect(orderedTasks.map(\.id).suffix(2) == [thirdTask.id, secondTask.id])
}

@MainActor
@Test func deleteTagRemovesTagAssignmentsFromTasks() async throws {
    let snapshot = PreviewDataFactory.makeAppSnapshot()
    let repository = InMemoryTaskRepository(snapshot: snapshot)

    let tag = try #require(snapshot.tags.first(where: { $0.name == "Swift" }))

    repository.deleteTag(id: tag.id)

    let updatedSnapshot = repository.fetchSnapshot()
    #expect(updatedSnapshot.tags.contains(where: { $0.id == tag.id }) == false)
    #expect(updatedSnapshot.tasks.contains(where: { $0.tagIDs.contains(tag.id) }) == false)
}

@MainActor
@Test func updateTagPersistsRenamedValue() async throws {
    let snapshot = PreviewDataFactory.makeAppSnapshot()
    let repository = InMemoryTaskRepository(snapshot: snapshot)

    var tag = try #require(snapshot.tags.first(where: { $0.name == "Home" }))
    tag.name = "Errands"

    repository.updateTag(tag)

    let updatedTag = try #require(repository.fetchSnapshot().tags.first(where: { $0.id == tag.id }))
    #expect(updatedTag.name == "Errands")
}
