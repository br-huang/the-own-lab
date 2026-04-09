import NFLCore
import SwiftUI

struct SidebarView: View {
    @Bindable var viewModel: AppViewModel

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
                }
            }
        }
        .navigationTitle("Not Forget List")
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
