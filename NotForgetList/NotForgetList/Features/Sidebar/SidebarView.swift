import NFLCore
import SwiftUI

struct SidebarView: View {
    @Bindable var viewModel: AppViewModel
    @State private var editorMode: ListEditorMode?
    @State private var isTagEditorPresented = false
    @State private var pendingDeleteList: TaskList?
    @State private var pendingDeleteTag: TaskTag?

    var body: some View {
        List(selection: $viewModel.destination) {
            Section("Smart Lists") {
                smartListRow("Today", systemImage: "sun.max", destination: .today)
                smartListRow("Upcoming", systemImage: "calendar", destination: .upcoming)
                smartListRow("All Tasks", systemImage: "tray.full", destination: .allTasks)
                smartListRow("Completed", systemImage: "checkmark.circle", destination: .completed)
            }

            Section("My Lists") {
                ForEach(viewModel.lists) { list in
                    Label(list.name, systemImage: list.isInbox ? "tray" : "folder")
                        .tag(SidebarDestination.list(list.id))
                        .contextMenu {
                            Button("Rename") {
                                editorMode = .rename(list)
                            }

                            if list.isInbox == false {
                                Button("Delete", role: .destructive) {
                                    pendingDeleteList = list
                                }
                            }
                        }
                }
            }

            if !viewModel.tags.isEmpty {
                Section("Tags") {
                    ForEach(viewModel.tags) { tag in
                        HStack {
                            Label(tag.name, systemImage: "tag")
                            Spacer()
                            Text("\(viewModel.tagTaskCount(for: tag))")
                                .foregroundStyle(.secondary)
                        }
                        .tag(SidebarDestination.tag(tag.id))
                        .contextMenu {
                            Button("Delete", role: .destructive) {
                                pendingDeleteTag = tag
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Not Forget List")
        .toolbar {
            Menu {
                Button("New List") {
                    editorMode = .create
                }

                Button("New Tag") {
                    isTagEditorPresented = true
                }
            } label: {
                Label("Create", systemImage: "plus")
            }
        }
        .sheet(item: $editorMode) { mode in
            ListEditorSheet(mode: mode) { name in
                switch mode {
                case .create:
                    viewModel.createList(named: name)
                case .rename(let list):
                    viewModel.renameList(list, to: name)
                }
            }
        }
        .sheet(isPresented: $isTagEditorPresented) {
            TagEditorSheet { name in
                viewModel.createTag(named: name)
            }
        }
        .alert(
            "Delete List",
            isPresented: Binding(
                get: { pendingDeleteList != nil },
                set: { isPresented in
                    if isPresented == false {
                        pendingDeleteList = nil
                    }
                }
            ),
            presenting: pendingDeleteList
        ) { list in
            Button("Delete", role: .destructive) {
                viewModel.deleteList(list)
                pendingDeleteList = nil
            }
            Button("Cancel", role: .cancel) {
                pendingDeleteList = nil
            }
        } message: { list in
            Text("Tasks in \"\(list.name)\" will be soft-deleted in the in-memory store.")
        }
        .alert(
            "Delete Tag",
            isPresented: Binding(
                get: { pendingDeleteTag != nil },
                set: { isPresented in
                    if isPresented == false {
                        pendingDeleteTag = nil
                    }
                }
            ),
            presenting: pendingDeleteTag
        ) { tag in
            Button("Delete", role: .destructive) {
                viewModel.deleteTag(tag)
                pendingDeleteTag = nil
            }
            Button("Cancel", role: .cancel) {
                pendingDeleteTag = nil
            }
        } message: { tag in
            Text("The tag \"\(tag.name)\" will be removed from all tasks.")
        }
    }

    @ViewBuilder
    private func smartListRow(
        _ title: String,
        systemImage: String,
        destination: SidebarDestination
    ) -> some View {
        HStack {
            Label(title, systemImage: systemImage)
            Spacer()
            Text("\(viewModel.smartListCount(for: destination))")
                .foregroundStyle(.secondary)
        }
        .tag(destination)
    }
}

private struct TagEditorSheet: View {
    let onSubmit: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Tag Name", text: $name)
                    .onSubmit(save)
            }
            .navigationTitle("New Tag")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .frame(minWidth: 320, minHeight: 140)
    }

    private func save() {
        onSubmit(name)
        dismiss()
    }
}

private enum ListEditorMode: Identifiable {
    case create
    case rename(TaskList)

    var id: String {
        switch self {
        case .create:
            return "create"
        case .rename(let list):
            return "rename-\(list.id.uuidString)"
        }
    }

    var title: String {
        switch self {
        case .create:
            return "New List"
        case .rename:
            return "Rename List"
        }
    }

    var initialName: String {
        switch self {
        case .create:
            return ""
        case .rename(let list):
            return list.name
        }
    }

    var actionTitle: String {
        switch self {
        case .create:
            return "Create"
        case .rename:
            return "Save"
        }
    }
}

private struct ListEditorSheet: View {
    let mode: ListEditorMode
    let onSubmit: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String

    init(mode: ListEditorMode, onSubmit: @escaping (String) -> Void) {
        self.mode = mode
        self.onSubmit = onSubmit
        _name = State(initialValue: mode.initialName)
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField("List Name", text: $name)
                    .onSubmit(save)
            }
            .navigationTitle(mode.title)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(mode.actionTitle) {
                        save()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .frame(minWidth: 320, minHeight: 140)
    }

    private func save() {
        onSubmit(name)
        dismiss()
    }
}
