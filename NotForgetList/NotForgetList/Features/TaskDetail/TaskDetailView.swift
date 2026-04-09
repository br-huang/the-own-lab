import NFLCore
import SwiftUI

struct TaskDetailContainerView: View {
    @Bindable var viewModel: AppViewModel

    var body: some View {
        if let task = viewModel.selectedTask {
            TaskDetailView(
                task: task,
                allTags: viewModel.tags,
                isTagAssigned: { tag, task in
                    viewModel.isTagAssigned(tag, to: task)
                },
                onSetTag: { tag, isAssigned, task in
                    viewModel.setTag(tag, isAssigned: isAssigned, for: task)
                },
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
    let allTags: [TaskTag]
    let isTagAssigned: (TaskTag, NFLTask) -> Bool
    let onSetTag: (TaskTag, Bool, NFLTask) -> Void
    let onSave: (NFLTask) -> Void

    init(
        task: NFLTask,
        allTags: [TaskTag],
        isTagAssigned: @escaping (TaskTag, NFLTask) -> Bool,
        onSetTag: @escaping (TaskTag, Bool, NFLTask) -> Void,
        onSave: @escaping (NFLTask) -> Void
    ) {
        _draftTask = State(initialValue: task)
        self.allTags = allTags
        self.isTagAssigned = isTagAssigned
        self.onSetTag = onSetTag
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

            if !allTags.isEmpty {
                Section("Tags") {
                    ForEach(allTags) { tag in
                        Toggle(
                            tag.name,
                            isOn: Binding(
                                get: { isTagAssigned(tag, draftTask) },
                                set: { isAssigned in
                                    onSetTag(tag, isAssigned, draftTask)
                                    if isAssigned {
                                        if draftTask.tagIDs.contains(tag.id) == false {
                                            draftTask.tagIDs.append(tag.id)
                                        }
                                    } else {
                                        draftTask.tagIDs.removeAll { $0 == tag.id }
                                    }
                                }
                            )
                        )
                    }
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
