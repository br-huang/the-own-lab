import NFLCore
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
                                toggleCompletion: { viewModel.toggleTaskCompletion(task) }
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
                                toggleCompletion: { viewModel.toggleTaskCompletion(task) }
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
}
