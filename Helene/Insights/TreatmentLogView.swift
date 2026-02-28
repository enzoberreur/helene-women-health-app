import SwiftUI
import SwiftData

struct TreatmentLogView: View {

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss)      private var dismiss

    @State private var category: String = "hrt"
    @State private var name:     String = ""
    @State private var status:   String = "started"
    @State private var date:     Date   = Date()
    @State private var note:     String = ""

    private let categories: [(id: String, label: String)] = [
        ("hrt",        "HRT"),
        ("supplement", "Supplement"),
        ("lifestyle",  "Lifestyle"),
        ("medication", "Medication")
    ]

    private let statuses: [(id: String, label: String)] = [
        ("started",  "Started"),
        ("stopped",  "Stopped"),
        ("adjusted", "Adjusted"),
        ("paused",   "Paused")
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {

                        // Category
                        fieldSection(title: "Category") {
                            HStack(spacing: 10) {
                                ForEach(categories, id: \.id) { cat in
                                    PillToggleButton(
                                        label: cat.label,
                                        isSelected: category == cat.id
                                    ) { category = cat.id }
                                }
                            }
                        }

                        // Name
                        fieldSection(title: "Name") {
                            TextField("e.g. Estradiol patch 50mcg", text: $name)
                                .font(.system(size: 15))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(HeleneTheme.Colors.surface,
                                            in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
                        }

                        // Status
                        fieldSection(title: "Status") {
                            HStack(spacing: 10) {
                                ForEach(statuses, id: \.id) { s in
                                    PillToggleButton(
                                        label: s.label,
                                        isSelected: status == s.id
                                    ) { status = s.id }
                                }
                            }
                        }

                        // Date
                        fieldSection(title: "Date") {
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(HeleneTheme.Colors.surface,
                                            in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
                        }

                        // Note (optional)
                        fieldSection(title: "Note (optional)") {
                            TextField("Any extra context...", text: $note)
                                .font(.system(size: 15))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(HeleneTheme.Colors.surface,
                                            in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
                        }

                        // Save button
                        Button(action: save) {
                            Text("Save")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 54)
                                .background(
                                    RoundedRectangle(cornerRadius: HeleneTheme.Radius.button)
                                        .fill(name.trimmingCharacters(in: .whitespaces).isEmpty
                                              ? AnyShapeStyle(HeleneTheme.Colors.separator)
                                              : AnyShapeStyle(HeleneTheme.Colors.dark))
                                )
                        }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                        .buttonStyle(.plain)

                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.lg)
                }
            }
            .navigationTitle("Log Treatment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
            }
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func fieldSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .textCase(.uppercase)
                .tracking(0.8)
            content()
        }
    }

    private func save() {
        let entry = TreatmentEntry()
        entry.category = category
        entry.name     = name.trimmingCharacters(in: .whitespaces)
        entry.status   = status
        entry.date     = date
        entry.note     = note.trimmingCharacters(in: .whitespaces)
        context.insert(entry)
        try? context.save()
        dismiss()
    }
}

// MARK: - Pill Toggle Button

private struct PillToggleButton: View {
    let label:      String
    let isSelected: Bool
    let action:     () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(
                    Capsule().fill(isSelected ? HeleneTheme.lavenderFill : HeleneTheme.Colors.surface)
                )
                .lightSchemeOnFill(isSelected)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    TreatmentLogView()
        .modelContainer(for: TreatmentEntry.self, inMemory: true)
}
