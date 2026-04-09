import Testing
import NFLCore
@testable import NFLNetwork

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
