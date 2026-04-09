import NFLCore
import NFLNetwork
import SwiftUI

struct ContentView: View {
    @State private var viewModel = AppViewModel()

    var body: some View {
        NavigationSplitView {
            SidebarView(viewModel: viewModel)
        } content: {
            TaskListView(viewModel: viewModel)
        } detail: {
            TaskDetailContainerView(viewModel: viewModel)
        }
        .searchable(text: $viewModel.searchText, prompt: "Search tasks")
    }
}

#Preview {
    ContentView()
}
