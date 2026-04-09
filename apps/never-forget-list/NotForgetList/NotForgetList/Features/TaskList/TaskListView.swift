import NFLCore
import NFLNetwork
import SwiftUI

struct TaskListView: View {
    @Bindable var viewModel: AppViewModel

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                TextField("Add a new task", text: $viewModel.newTaskTitle)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit(viewModel.addTask)

                Button("Add", action: viewModel.addTask)
                    .buttonStyle(.borderedProminent)
            }
            .padding()

            List(selection: $viewModel.selectedTaskID) {
                if !viewModel.openVisibleTasks.isEmpty {
                    Section("Open") {
                        ForEach(viewModel.openVisibleTasks) { task in
                            TaskRowView(
                                task: task,
                                listName: viewModel.listName(for: task),
                                tagNames: viewModel.tagNames(for: task),
                                showsReorderControls: supportsReorder,
                                canMoveUp: viewModel.canReorder(task: task, direction: .up),
                                canMoveDown: viewModel.canReorder(task: task, direction: .down),
                                toggleCompletion: { viewModel.toggleTaskCompletion(task) },
                                moveUp: { viewModel.moveTask(task, direction: .up) },
                                moveDown: { viewModel.moveTask(task, direction: .down) }
                            )
                            .tag(task.id)
                            .swipeActions {
                                Button(role: .destructive) {
                                    viewModel.deleteTask(task)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }

                if !viewModel.completedVisibleTasks.isEmpty {
                    Section("Completed") {
                        ForEach(viewModel.completedVisibleTasks) { task in
                            TaskRowView(
                                task: task,
                                listName: viewModel.listName(for: task),
                                tagNames: viewModel.tagNames(for: task),
                                showsReorderControls: false,
                                canMoveUp: false,
                                canMoveDown: false,
                                toggleCompletion: { viewModel.toggleTaskCompletion(task) },
                                moveUp: {},
                                moveDown: {}
                            )
                            .tag(task.id)
                            .swipeActions {
                                Button(role: .destructive) {
                                    viewModel.deleteTask(task)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
            .overlay {
                if viewModel.visibleTasks.isEmpty {
                    ContentUnavailableView(
                        "No Tasks",
                        systemImage: "checklist",
                        description: Text("Create a task or change the current filter.")
                    )
                }
            }
        }
        .navigationTitle(viewModel.navigationTitle)
    }

    private var supportsReorder: Bool {
        if case .list = viewModel.destination {
            return viewModel.openVisibleTasks.count > 1
        }

        return false
    }
}
