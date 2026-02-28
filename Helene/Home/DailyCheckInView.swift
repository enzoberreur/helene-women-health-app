import SwiftUI
import SwiftData

struct DailyCheckInView: View {

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss)      private var dismiss

    let existingEntry: CheckInEntry?

    // Predefined symptom IDs — used to detect custom entries on edit
    private static let predefinedIds: Set<String> = [
        "sleep", "anxiety", "fatigue", "hotflashes",
        "brainfog", "moodswings", "weight", "jointpain"
    ]

    @State private var step:              Int
    @State private var selectedMood:      Int?
    @State private var selectedSleep:     Int
    @State private var selectedEnergy:    Int
    @State private var selectedStress:    Int
    @State private var selectedSymptoms:  Set<String>
    @State private var customSymptoms:    [String]       // display list of user-typed symptoms
    @State private var customInput:       String
    @State private var note:              String
    @State private var selectedTriggers:  Set<String>
    @FocusState private var noteFocused:   Bool
    @FocusState private var customFocused: Bool

    init(existingEntry: CheckInEntry? = nil) {
        self.existingEntry = existingEntry
        let entrySymptoms  = existingEntry?.symptoms ?? []
        let customFromEntry = entrySymptoms.filter { !Self.predefinedIds.contains($0) }

        _step             = State(initialValue: 0)
        _selectedMood     = State(initialValue: existingEntry?.mood)
        _selectedSleep    = State(initialValue: existingEntry?.sleepQuality ?? 0)
        _selectedEnergy   = State(initialValue: existingEntry?.energyLevel ?? 0)
        _selectedStress   = State(initialValue: existingEntry?.stressLevel ?? 0)
        _selectedSymptoms = State(initialValue: Set(entrySymptoms))
        _customSymptoms   = State(initialValue: customFromEntry)
        _customInput      = State(initialValue: "")
        _note             = State(initialValue: existingEntry?.note ?? "")
        _selectedTriggers = State(initialValue: Set(existingEntry?.triggers ?? []))
    }

    private let symptoms: [(label: String, id: String, icon: String)] = [
        ("Sleep problems", "sleep",      "moon.fill"),
        ("Anxiety",        "anxiety",    "brain.head.profile"),
        ("Fatigue",        "fatigue",    "zzz"),
        ("Hot flashes",    "hotflashes", "thermometer.sun.fill"),
        ("Brain fog",      "brainfog",   "cloud.fog.fill"),
        ("Mood swings",    "moodswings", "arrow.triangle.2.circlepath"),
        ("Weight changes", "weight",     "scalemass.fill"),
        ("Joint pain",     "jointpain",  "figure.walk")
    ]

    // Steps: 0=mood, 1=wellbeing, 2=symptoms, 3=triggers, 4=note
    var body: some View {
        ZStack {
            HeleneTheme.Colors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Drag handle
                Capsule()
                    .fill(HeleneTheme.Colors.separator)
                    .frame(width: 36, height: 4)
                    .padding(.top, 14)
                    .padding(.bottom, HeleneTheme.Spacing.lg)

                // Progress dots
                progressDots
                    .padding(.bottom, HeleneTheme.Spacing.lg)

                Group {
                    switch step {
                    case 0: moodStep
                    case 1: wellbeingStep
                    case 2: symptomsStep
                    case 3: triggersStep
                    case 4: noteStep
                    default: EmptyView()
                    }
                }
                .id(step)
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal:   .move(edge: .leading).combined(with: .opacity)
                ))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .animation(.easeInOut(duration: 0.28), value: step)

                actionButton
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.bottom, 44)
            }
        }
    }

    // MARK: - Progress Dots

    private var progressDots: some View {
        HStack(spacing: 6) {
            ForEach(0..<5) { i in
                Capsule()
                    .fill(i <= step ? HeleneTheme.Colors.dark : HeleneTheme.Colors.separator)
                    .frame(width: i == step ? 20 : 6, height: 6)
                    .animation(.spring(duration: 0.3), value: step)
            }
        }
    }

    // MARK: - Mood Step

    private let moodOptions: [(icon: String, level: Int, label: String)] = [
        ("sun.max.fill",       5, "Great"),
        ("cloud.sun.fill",     4, "Good"),
        ("cloud.fill",         3, "Okay"),
        ("cloud.drizzle.fill", 2, "Low"),
        ("cloud.rain.fill",    1, "Hard")
    ]

    private var moodStep: some View {
        VStack(alignment: .leading, spacing: HeleneTheme.Spacing.xxl) {
            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                Text("How are you\nfeeling today?")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Be honest — this is just for you.")
                    .font(.subheadline)
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)

            HStack(spacing: 0) {
                ForEach(moodOptions, id: \.level) { mood in
                    Button {
                        withAnimation(.spring(duration: 0.3)) { selectedMood = mood.level }
                    } label: {
                        VStack(spacing: 8) {
                            ZStack {
                                Circle()
                                    .fill(selectedMood == mood.level
                                          ? HeleneTheme.lavenderFill
                                          : Color.clear)
                                    .frame(width: 60, height: 60)
                                Image(systemName: mood.icon)
                                    .font(.system(size: 24, weight: .medium))
                                    .foregroundStyle(selectedMood == mood.level
                                                     ? HeleneTheme.Colors.textPrimary
                                                     : HeleneTheme.Colors.textSecond)
                                    .scaleEffect(selectedMood == mood.level ? 1.15 : 1.0)
                                    .animation(.spring(duration: 0.3), value: selectedMood)
                            }
                            .lightSchemeOnFill(selectedMood == mood.level)
                            Text(mood.label)
                                .font(.caption.weight(selectedMood == mood.level ? .semibold : .regular))
                                .foregroundStyle(selectedMood == mood.level
                                                 ? HeleneTheme.Colors.textPrimary
                                                 : HeleneTheme.Colors.textLight)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, HeleneTheme.Spacing.md)
            .padding(.vertical, HeleneTheme.Spacing.md)
            .background(HeleneTheme.Colors.surface,
                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
            .padding(.horizontal, HeleneTheme.Spacing.lg)
        }
        .padding(.top, HeleneTheme.Spacing.sm)
    }

    // MARK: - Wellbeing Step

    private var wellbeingStep: some View {
        VStack(alignment: .leading, spacing: HeleneTheme.Spacing.xl) {
            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                Text("A little more\nabout today")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Optional — skip any row, or continue to the next step.")
                    .font(.subheadline)
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)

            VStack(spacing: 0) {
                WellbeingRow(
                    label: "Sleep",
                    icon: "moon.fill",
                    hint: "1 = poor  ·  5 = great",
                    value: $selectedSleep,
                    fill: HeleneTheme.lavenderFill
                )
                Divider().padding(.horizontal, 16)
                WellbeingRow(
                    label: "Energy",
                    icon: "bolt.fill",
                    hint: "1 = drained  ·  5 = high",
                    value: $selectedEnergy,
                    fill: HeleneTheme.marigoldFill
                )
                Divider().padding(.horizontal, 16)
                WellbeingRow(
                    label: "Stress",
                    icon: "wind",
                    hint: "1 = very high  ·  5 = calm",
                    value: $selectedStress,
                    fill: HeleneTheme.sageFill
                )
            }
            .background(HeleneTheme.Colors.surface,
                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
            .padding(.horizontal, HeleneTheme.Spacing.lg)
        }
        .padding(.top, HeleneTheme.Spacing.sm)
    }

    // MARK: - Symptoms Step

    private var symptomsStep: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.lg) {
                VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                    Text("Any symptoms\ntoday?")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text("Select all that apply, or add your own.")
                        .font(.subheadline)
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }

                // Predefined grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())],
                          spacing: HeleneTheme.Spacing.sm) {
                    ForEach(symptoms, id: \.id) { s in
                        SymptomChip(label: s.label, icon: s.icon, isSelected: selectedSymptoms.contains(s.id)) {
                            if selectedSymptoms.contains(s.id) { selectedSymptoms.remove(s.id) }
                            else { selectedSymptoms.insert(s.id) }
                        }
                    }
                }

                // Custom symptoms (user-typed)
                if !customSymptoms.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your additions")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                            .textCase(.uppercase)
                            .tracking(0.6)

                        FlowLayout(spacing: 8) {
                            ForEach(customSymptoms, id: \.self) { symptom in
                                Button {
                                    withAnimation(.spring(duration: 0.25)) {
                                        if selectedSymptoms.contains(symptom) {
                                            selectedSymptoms.remove(symptom)
                                            customSymptoms.removeAll { $0 == symptom }
                                        } else {
                                            selectedSymptoms.insert(symptom)
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(symptom)
                                            .font(.system(size: 13, weight: .medium))
                                        Image(systemName: selectedSymptoms.contains(symptom) ? "xmark" : "plus")
                                            .font(.system(size: 10, weight: .semibold))
                                    }
                                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(
                                        selectedSymptoms.contains(symptom)
                                            ? HeleneTheme.lavenderFill
                                            : HeleneTheme.Colors.surface,
                                        in: Capsule()
                                    )
                                    .lightSchemeOnFill(selectedSymptoms.contains(symptom))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                // "Add your own" input
                HStack(spacing: 10) {
                    TextField("Add your own symptom...", text: $customInput)
                        .font(.system(size: 15))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        .focused($customFocused)
                        .autocorrectionDisabled()
                        .submitLabel(.done)
                        .onSubmit { addCustomSymptom() }

                    if !customInput.trimmingCharacters(in: .whitespaces).isEmpty {
                        Button { addCustomSymptom() } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 22))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        }
                        .buttonStyle(.plain)
                        .transition(.scale.combined(with: .opacity))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(HeleneTheme.Colors.surface,
                            in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
                .animation(.easeInOut(duration: 0.15), value: customInput.isEmpty)
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)
        }
        .padding(.top, HeleneTheme.Spacing.sm)
    }

    private func addCustomSymptom() {
        let trimmed = customInput.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty,
              !customSymptoms.contains(trimmed),
              !symptoms.contains(where: { $0.0.lowercased() == trimmed.lowercased() }) else {
            customInput = ""
            return
        }
        withAnimation(.spring(duration: 0.3)) {
            customSymptoms.append(trimmed)
            selectedSymptoms.insert(trimmed)
        }
        customInput = ""
    }

    // MARK: - Triggers Step

    private let triggerOptions: [(id: String, label: String, icon: String)] = [
        ("coffee",         "Caffeine",        "cup.and.saucer.fill"),
        ("alcohol",        "Alcohol",         "drop.fill"),
        ("exercise",       "Exercise",        "figure.run"),
        ("workstress",     "Work stress",     "briefcase.fill"),
        ("medication",     "Medication",      "pill.fill"),
        ("outdoor",        "Outdoor time",    "sun.max.fill"),
        ("social",         "Social time",     "person.2.fill"),
        ("disruptedsleep", "Disrupted sleep", "moon.zzz.fill")
    ]

    private var triggersStep: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.lg) {
                VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                    Text("What may have\ninfluenced today?")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text("Optional — helps spot patterns over time.")
                        .font(.subheadline)
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())],
                          spacing: HeleneTheme.Spacing.sm) {
                    ForEach(triggerOptions, id: \.id) { option in
                        SymptomChip(
                            label: option.label,
                            icon: option.icon,
                            isSelected: selectedTriggers.contains(option.id)
                        ) {
                            if selectedTriggers.contains(option.id) {
                                selectedTriggers.remove(option.id)
                            } else {
                                selectedTriggers.insert(option.id)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)
        }
        .padding(.top, HeleneTheme.Spacing.sm)
    }

    // MARK: - Note Step

    private var noteStep: some View {
        VStack(alignment: .leading, spacing: HeleneTheme.Spacing.lg) {
            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                Text("Anything you'd\nlike to add?")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Optional — a few words or a lot more.")
                    .font(.subheadline)
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)

            ZStack(alignment: .topLeading) {
                if note.isEmpty {
                    Text("How was today?")
                        .font(.system(size: 15))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                        .padding(.top, 12)
                        .padding(.leading, 16)
                        .allowsHitTesting(false)
                }
                TextEditor(text: $note)
                    .font(.system(size: 15))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    .frame(height: 110)
                    .scrollContentBackground(.hidden)
                    .contentMargins(.all, 12, for: .scrollContent)
                    .focused($noteFocused)
            }
            .background(HeleneTheme.Colors.surface,
                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
            .padding(.horizontal, HeleneTheme.Spacing.lg)
        }
        .padding(.top, HeleneTheme.Spacing.sm)
    }

    // MARK: - Action Button

    private var actionButton: some View {
        Button(action: handleAction) {
            Text(step == 4 ? "Save check-in" : "Continue")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity).frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: HeleneTheme.Radius.button)
                        .fill(canProceed
                              ? AnyShapeStyle(HeleneTheme.Colors.dark)
                              : AnyShapeStyle(HeleneTheme.Colors.separator))
                )
        }
        .disabled(!canProceed)
        .animation(.easeInOut(duration: 0.2), value: canProceed)
    }

    private var canProceed: Bool { step == 0 ? selectedMood != nil : true }

    private func handleAction() {
        if step < 4 { step += 1 }
        else {
            if let entry = existingEntry {
                entry.mood         = selectedMood ?? 3
                entry.sleepQuality = selectedSleep
                entry.energyLevel  = selectedEnergy
                entry.stressLevel  = selectedStress
                entry.symptoms     = Array(selectedSymptoms)
                entry.note         = note
                entry.triggers     = Array(selectedTriggers)
            } else {
                context.insert(CheckInEntry(
                    mood:         selectedMood ?? 3,
                    symptoms:     Array(selectedSymptoms),
                    note:         note,
                    sleepQuality: selectedSleep,
                    energyLevel:  selectedEnergy,
                    stressLevel:  selectedStress,
                    triggers:     Array(selectedTriggers)
                ))
            }
            try? context.save()
            dismiss()
        }
    }
}

// MARK: - Wellbeing Row

private struct WellbeingRow: View {
    let label: String
    let icon:  String
    let hint:  String
    @Binding var value: Int
    let fill:  Color

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .frame(width: 16)
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text(hint)
                        .font(.system(size: 10))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                }
            }
            .frame(width: 96, alignment: .leading)

            Spacer()

            HStack(spacing: 6) {
                ForEach(1...5, id: \.self) { level in
                    Button {
                        withAnimation(.spring(duration: 0.2)) {
                            value = (value == level) ? 0 : level
                        }
                    } label: {
                        Circle()
                            .fill(value == level ? fill : HeleneTheme.Colors.background)
                            .frame(width: 34, height: 34)
                            .overlay(
                                Text("\(level)")
                                    .font(.system(size: 13, weight: value == level ? .semibold : .regular))
                                    .foregroundStyle(value == level
                                                     ? HeleneTheme.Colors.textPrimary
                                                     : HeleneTheme.Colors.textLight)
                            )
                            .lightSchemeOnFill(value == level)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

// MARK: - Symptom Chip

private struct SymptomChip: View {
    let label:      String
    let icon:       String
    let isSelected: Bool
    let action:     () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(isSelected
                                     ? HeleneTheme.Colors.textPrimary
                                     : HeleneTheme.Colors.textSecond)
                Text(label)
                    .font(.system(size: 14, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 14)
            .padding(.horizontal, 14)
            .background(
                RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium)
                    .fill(isSelected ? HeleneTheme.lavenderFill : HeleneTheme.Colors.surface)
            )
            .lightSchemeOnFill(isSelected)
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.02 : 1.0)
        .animation(.spring(duration: 0.25), value: isSelected)
    }
}

#Preview {
    DailyCheckInView().modelContainer(for: CheckInEntry.self, inMemory: true)
}
