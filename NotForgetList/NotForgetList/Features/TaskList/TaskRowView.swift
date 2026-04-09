import NFLCore
import SwiftUI

struct TaskRowView: View {
    let task: NFLTask
    let listName: String
    let tagNames: [String]
    let toggleCompletion: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button(action: toggleCompletion) {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(task.isCompleted ? .green : .secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 6) {
                Text(task.title)
                    .strikethrough(task.isCompleted)
                    .foregroundStyle(task.isCompleted ? .secondary : .primary)

                HStack(spacing: 8) {
                    Text(listName)
                    if let dueDate = task.dueDate {
                        Text(dueDate, format: .dateTime.month(.abbreviated).day())
                    }
                    if task.priority != .none {
                        Text(task.priority.displayName)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)

                if !tagNames.isEmpty {
                    Text(tagNames.joined(separator: " • "))
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
