import NFLCore
import SwiftUI

struct TaskDetailContainerView: View {
    @Bindable var viewModel: AppViewModel

    var body: some View {
        if let task = viewModel.selectedTask {
            TaskDetailView(
                task: task,
                onSave: viewModel.saveTask
            )
        } else {
            ContentUnavailableView(
                "Select a Task",
                systemImage: "sidebar.right",
                description: Text("Pick a task from the list to edit its details.")
            )
        }
    }
}

struct TaskDetailView: View {
    @State private var draftTask: NFLTask
    let onSave: (NFLTask) -> Void

    init(task: NFLTask, onSave: @escaping (NFLTask) -> Void) {
        _draftTask = State(initialValue: task)
        self.onSave = onSave
    }

    var body: some View {
        Form {
            Section("Title") {
                TextField("Task title", text: $draftTask.title)
                    .onSubmit(commit)
            }

            Section("Status") {
                Toggle("Completed", isOn: $draftTask.isCompleted)
                    .onChange(of: draftTask.isCompleted) { _, isCompleted in
                        draftTask.completedAt = isCompleted ? .now : nil
                        commit()
                    }

                Picker("Priority", selection: $draftTask.priority) {
                    ForEach(TaskPriority.allCases) { priority in
                        Text(priority.displayName).tag(priority)
                    }
                }
                .onChange(of: draftTask.priority) { _, _ in
                    commit()
                }

                DatePicker(
                    "Due Date",
                    selection: Binding(
                        get: { draftTask.dueDate ?? .now },
                        set: {
                            draftTask.dueDate = $0
                            commit()
                        }
                    ),
                    displayedComponents: [.date]
                )

                Button(draftTask.dueDate == nil ? "Set Due Date to Today" : "Clear Due Date") {
                    draftTask.dueDate = draftTask.dueDate == nil ? .now : nil
                    commit()
                }
            }

            Section("Notes") {
                TextEditor(text: $draftTask.notes)
                    .frame(minHeight: 180)
                    .onChange(of: draftTask.notes) { _, _ in
                        commit()
                    }

                if !draftTask.notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Preview")
                            .font(.headline)
                        Text(.init(draftTask.notes))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.top, 8)
                }
            }
        }
        .navigationTitle("Task Detail")
        .onChange(of: draftTask.id) { _, _ in
            commit()
        }
    }

    private func commit() {
        onSave(draftTask)
    }
}
