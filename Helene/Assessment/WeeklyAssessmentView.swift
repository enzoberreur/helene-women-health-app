import SwiftUI
import SwiftData

// MARK: - MRS Domain

enum MRSDomain { case somatic, psychological, urogenital }

// MARK: - Weekly Assessment View (MRS — Menopause Rating Scale)

struct WeeklyAssessmentView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss)      private var dismiss

    @Query(sort: \CheckInEntry.date, order: .reverse) private var allEntries: [CheckInEntry]

    @State private var step = 0   // 0=intro, 1=somatic, 2=psychological, 3=urogenital, 4=results

    // Somatic
    @State private var hotFlashes      = 0
    @State private var heartDiscomfort = 0
    @State private var sleepProblems   = 0
    @State private var jointPain       = 0

    // Psychological
    @State private var depressiveMood  = 0
    @State private var irritability    = 0
    @State private var anxiety         = 0
    @State private var exhaustion      = 0

    // Urogenital
    @State private var sexualProblems  = 0
    @State private var bladderProblems = 0
    @State private var vaginalDryness  = 0

    // Saved entry reference (set in results step)
    @State private var savedEntry: MRSEntry? = nil

    // MARK: - This week's check-in data

    private var thisWeekEntries: [CheckInEntry] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        return allEntries.filter { $0.date >= cutoff }
    }

    private var weekAvgMood: Double? {
        guard !thisWeekEntries.isEmpty else { return nil }
        return Double(thisWeekEntries.map { $0.mood }.reduce(0, +)) / Double(thisWeekEntries.count)
    }

    private var weekAvgSleep: Double? {
        let s = thisWeekEntries.filter { $0.sleepQuality > 0 }
        guard !s.isEmpty else { return nil }
        return Double(s.map { $0.sleepQuality }.reduce(0, +)) / Double(s.count)
    }

    private var weekAvgEnergy: Double? {
        let s = thisWeekEntries.filter { $0.energyLevel > 0 }
        guard !s.isEmpty else { return nil }
        return Double(s.map { $0.energyLevel }.reduce(0, +)) / Double(s.count)
    }

    private var weekAvgStress: Double? {
        let s = thisWeekEntries.filter { $0.stressLevel > 0 }
        guard !s.isEmpty else { return nil }
        return Double(s.map { $0.stressLevel }.reduce(0, +)) / Double(s.count)
    }

    /// Top 4 most-logged symptoms this week (display labels)
    private var weekTopSymptoms: [String] {
        var freq: [String: Int] = [:]
        for entry in thisWeekEntries {
            for s in entry.symptoms { freq[s, default: 0] += 1 }
        }
        return freq.sorted { $0.value > $1.value }.prefix(4).map { symptomLabel($0.key) }
    }

    /// Most recent non-empty note this week
    private var weekLatestNote: String? {
        thisWeekEntries.first { !$0.note.isEmpty }?.note
    }

    // Maps domain keywords to relevant logged symptoms for contextual hints
    private func domainHints(for domain: MRSDomain) -> [String] {
        let somaticIds    = Set(["sleep", "hotflashes", "fatigue", "jointpain"])
        let psychoIds     = Set(["anxiety", "moodswings", "brainfog", "fatigue"])

        var logged = Set<String>()
        for entry in thisWeekEntries { logged.formUnion(entry.symptoms) }

        switch domain {
        case .somatic:
            return logged.intersection(somaticIds).map { symptomLabel($0) }
        case .psychological:
            return logged.intersection(psychoIds).map { symptomLabel($0) }
        case .urogenital:
            return []   // no direct daily mapping — skip hint
        }
    }

    private func symptomLabel(_ id: String) -> String {
        let map = [
            "sleep": "Sleep problems", "anxiety": "Anxiety",
            "fatigue": "Fatigue", "hotflashes": "Hot flashes",
            "brainfog": "Brain fog", "moodswings": "Mood swings",
            "weight": "Weight changes", "jointpain": "Joint pain"
        ]
        return map[id] ?? id
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    if step > 0 && step < 4 {
                        progressBar
                            .padding(.horizontal, HeleneTheme.Spacing.lg)
                            .padding(.top, HeleneTheme.Spacing.md)
                            .padding(.bottom, HeleneTheme.Spacing.sm)
                    }

                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 24) {
                            switch step {
                            case 0: introStep
                            case 1: domainStep(
                                title: "Body Symptoms",
                                icon: "figure.stand",
                                fill: HeleneTheme.peachFill,
                                description: "How severe have the following physical symptoms been over the past week?",
                                hints: domainHints(for: .somatic),
                                questions: somaticQuestions
                            )
                            case 2: domainStep(
                                title: "Emotional Wellbeing",
                                icon: "brain.head.profile",
                                fill: HeleneTheme.lavenderFill,
                                description: "Rate the severity of these emotional and mental symptoms over the past week.",
                                hints: domainHints(for: .psychological),
                                questions: psychologicalQuestions
                            )
                            case 3: domainStep(
                                title: "Intimate Health",
                                icon: "heart.fill",
                                fill: HeleneTheme.sageFill,
                                description: "These symptoms are personal but important for understanding your wellbeing. All data stays private on your device.",
                                hints: domainHints(for: .urogenital),
                                questions: urogenitalQuestions
                            )
                            case 4: resultsStep
                            default: EmptyView()
                            }

                            Spacer(minLength: 40)
                        }
                        .padding(.horizontal, HeleneTheme.Spacing.lg)
                        .padding(.top, step == 0 ? HeleneTheme.Spacing.xl : HeleneTheme.Spacing.md)
                    }

                    actionBar
                }
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        HStack(spacing: 6) {
            ForEach(1...3, id: \.self) { i in
                Capsule()
                    .fill(i <= step ? HeleneTheme.Colors.dark : HeleneTheme.Colors.surface)
                    .frame(height: 4)
                    .animation(.easeInOut(duration: 0.25), value: step)
            }
        }
    }

    // MARK: - Intro Step

    private var introStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: HeleneTheme.Radius.card)
                    .fill(HeleneTheme.lavenderFill)
                    .frame(width: 72, height: 72)
                Image(systemName: "checklist.checked")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            .environment(\.colorScheme, .light)

            VStack(alignment: .leading, spacing: 8) {
                Text("Weekly Wellbeing Check")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)

                Text("A short 11-question assessment that tracks how your menopause symptoms are affecting your quality of life.")
                    .font(.system(size: 15))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .lineSpacing(4)
            }

            VStack(spacing: 10) {
                InfoRow2(icon: "clock", text: "Takes about 3–5 minutes")
                InfoRow2(icon: "calendar.badge.clock", text: "Best done once a week, same day each week")
                InfoRow2(icon: "lock.fill", text: "All data stays private on your device")
                InfoRow2(icon: "chart.line.uptrend.xyaxis", text: "Tracks your progress in Insights over time")
            }
            .padding(HeleneTheme.Spacing.lg)
            .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))

            Text("Based on the validated **Menopause Rating Scale (MRS)**, a scientific tool used worldwide in clinical research.")
                .font(.system(size: 13))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .lineSpacing(3)
        }
    }

    // MARK: - Weekly Recall Card

    private var weeklyRecallCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                Text("From your check-ins this week")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .textCase(.uppercase)
                    .tracking(0.5)
            }

            // Stats row
            HStack(spacing: 10) {
                if let mood = weekAvgMood {
                    RecallStat(icon: moodEmoji(for: Int(mood.rounded())),
                               label: "Avg mood",
                               value: String(format: "%.1f/5", mood),
                               isEmoji: true)
                }
                if let sleep = weekAvgSleep {
                    RecallStat(icon: "moon.fill",
                               label: "Sleep",
                               value: String(format: "%.1f/5", sleep),
                               isEmoji: false)
                }
                if let energy = weekAvgEnergy {
                    RecallStat(icon: "bolt.fill",
                               label: "Energy",
                               value: String(format: "%.1f/5", energy),
                               isEmoji: false)
                }
            }

            // Top symptoms
            if !weekTopSymptoms.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("You mentioned:")
                        .font(.system(size: 12))
                        .foregroundStyle(HeleneTheme.Colors.textLight)

                    FlowLayout(spacing: 6) {
                        ForEach(weekTopSymptoms, id: \.self) { symptom in
                            Text(symptom)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(.white.opacity(0.7), in: Capsule())
                        }
                    }
                }
            }

            // Latest note
            if let note = weekLatestNote {
                Text("\u{201C}\(note)\u{201D}")
                    .font(.system(size: 13))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .italic()
                    .lineLimit(2)
                    .lineSpacing(3)
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.marigoldFill.opacity(0.45), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
        .environment(\.colorScheme, .light)
    }

    private func moodEmoji(for level: Int) -> String {
        switch level {
        case 5: return "😊"
        case 4: return "🙂"
        case 3: return "😐"
        case 2: return "😔"
        default: return "😓"
        }
    }

    // MARK: - Domain Step

    private func domainStep(
        title: String, icon: String, fill: Color,
        description: String,
        hints: [String] = [],
        questions: [(label: String, description: String, binding: Binding<Int>)]
    ) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            // Domain header
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium)
                        .fill(fill)
                        .frame(width: 44, height: 44)
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text(description)
                        .font(.system(size: 13))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .lineSpacing(2)
                }
            }

            // Contextual hint — shown when user logged related symptoms this week
            if !hints.isEmpty {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "lightbulb.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .padding(.top, 1)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("This week you mentioned:")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                        Text(hints.joined(separator: ", "))
                            .font(.system(size: 13))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .lineSpacing(2)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(fill.opacity(0.45), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.small))
                .environment(\.colorScheme, .light)
            }

            // Scale legend
            HStack {
                Text("None")
                Spacer()
                Text("Very Severe")
            }
            .font(.caption)
            .foregroundStyle(HeleneTheme.Colors.textLight)

            // Questions
            VStack(spacing: 14) {
                ForEach(Array(questions.enumerated()), id: \.offset) { _, q in
                    QuestionRow(
                        label: q.label,
                        detail: q.description,
                        value: q.binding
                    )
                }
            }
        }
    }

    // MARK: - Results Step

    private var resultsStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 6) {
                Text("Your results")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Based on your answers this week")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }

            // Total score card
            if let entry = savedEntry {
                totalScoreCard(entry)
                domainBreakdown(entry)
                interpretationCard(entry)
            }
        }
    }

    private func totalScoreCard(_ entry: MRSEntry) -> some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Overall score")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .textCase(.uppercase)
                    .tracking(0.8)

                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(entry.totalScore)")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text("/ 44")
                        .font(.system(size: 18))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                }
            }

            Spacer()

            VStack(spacing: 6) {
                Text(entry.severityLabel)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(severityColor(entry.totalScore), in: Capsule())
                Text("Severity")
                    .font(.caption)
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    private func domainBreakdown(_ entry: MRSEntry) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("By domain")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .textCase(.uppercase)
                .tracking(0.8)

            DomainBar(label: "Body",      score: entry.somaticScore,       maxScore: 16, fill: HeleneTheme.peachFill)
            DomainBar(label: "Emotional", score: entry.psychologicalScore,  maxScore: 16, fill: HeleneTheme.lavenderFill)
            DomainBar(label: "Intimate",  score: entry.urogenitalScore,     maxScore: 12, fill: HeleneTheme.sageFill)
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    private func interpretationCard(_ entry: MRSEntry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "info.circle.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                Text("What this means")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            Text(interpretationText(entry.totalScore))
                .font(.system(size: 14))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .lineSpacing(3)
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.lavenderFill.opacity(0.4), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
        .environment(\.colorScheme, .light)
    }

    // MARK: - Action Bar

    private var actionBar: some View {
        VStack(spacing: 0) {
            Divider().background(HeleneTheme.Colors.separator)

            HStack(spacing: 12) {
                if step > 0 && step < 4 {
                    Button {
                        withAnimation { step -= 1 }
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .frame(width: 44, height: 44)
                            .background(HeleneTheme.Colors.surface, in: Circle())
                    }
                    .buttonStyle(.plain)
                }

                Button {
                    withAnimation { advance() }
                } label: {
                    Text(step == 3 ? "See My Results" : step == 4 ? "Done" : step == 0 ? "Start Assessment" : "Continue")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(HeleneTheme.Colors.dark, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)
            .padding(.top, 14)
            .padding(.bottom, 36)
        }
        .background(HeleneTheme.Colors.background)
    }

    // MARK: - Navigation

    private func advance() {
        if step < 3 {
            step += 1
        } else if step == 3 {
            saveEntry()
            step = 4
        } else {
            dismiss()
        }
    }

    private func saveEntry() {
        let entry = MRSEntry(
            hotFlashes:      hotFlashes,
            heartDiscomfort: heartDiscomfort,
            sleepProblems:   sleepProblems,
            jointPain:       jointPain,
            depressiveMood:  depressiveMood,
            irritability:    irritability,
            anxiety:         anxiety,
            exhaustion:      exhaustion,
            sexualProblems:  sexualProblems,
            bladderProblems: bladderProblems,
            vaginalDryness:  vaginalDryness
        )
        context.insert(entry)
        try? context.save()
        savedEntry = entry
    }

    // MARK: - Question Data

    private var somaticQuestions: [(label: String, description: String, binding: Binding<Int>)] {[
        ("Hot flushes & sweating",  "Episodes of sudden warmth, perspiration", $hotFlashes),
        ("Heart discomfort",        "Unusual heartbeat awareness, racing, tightness", $heartDiscomfort),
        ("Sleep problems",          "Difficulty falling or staying asleep, waking early", $sleepProblems),
        ("Joint & muscle pain",     "Pain in joints or muscles, rheumatic complaints", $jointPain),
    ]}

    private var psychologicalQuestions: [(label: String, description: String, binding: Binding<Int>)] {[
        ("Depressive mood",         "Feeling down, sad, tearful, lack of drive, mood swings", $depressiveMood),
        ("Irritability",            "Feeling nervous, inner tension, feeling aggressive", $irritability),
        ("Anxiety",                 "Inner restlessness, feeling panicky", $anxiety),
        ("Exhaustion",              "Decreased performance, impaired memory, forgetfulness", $exhaustion),
    ]}

    private var urogenitalQuestions: [(label: String, description: String, binding: Binding<Int>)] {[
        ("Sexual wellbeing",        "Change in sexual desire, activity and satisfaction", $sexualProblems),
        ("Bladder problems",        "Difficulty urinating, increased need, incontinence", $bladderProblems),
        ("Vaginal dryness",         "Sensation of dryness or burning, discomfort", $vaginalDryness),
    ]}

    // MARK: - Helpers

    private func interpretationText(_ score: Int) -> String {
        switch score {
        case 0...4:
            return "Your symptoms are minimal this week — great news. Continue logging to track any changes over time."
        case 5...8:
            return "You're experiencing mild symptoms. Your Insights will show trends over time. Lifestyle adjustments like sleep hygiene and stress reduction can help."
        case 9...15:
            return "Your symptoms are moderately impacting your quality of life. Consider discussing these results with your healthcare provider. The AI Companion can also offer evidence-based guidance."
        default:
            return "Your symptoms are significantly impacting your wellbeing. We strongly encourage sharing this report with your doctor. You don't have to navigate this alone."
        }
    }

    private func severityColor(_ score: Int) -> Color {
        switch score {
        case 0...4:  return HeleneTheme.sageFill
        case 5...8:  return HeleneTheme.marigoldFill
        case 9...15: return HeleneTheme.peachFill
        default:     return HeleneTheme.rose.opacity(0.25)
        }
    }
}

// MARK: - Question Row

private struct QuestionRow: View {
    let label:   String
    let detail:  String
    @Binding var value: Int

    private let options = ["None", "Mild", "Mod.", "Severe", "V.Severe"]
    private let colors:  [Color] = [
        Color.gray.opacity(0.12),
        HeleneTheme.marigoldFill.opacity(0.5),
        HeleneTheme.marigoldFill,
        HeleneTheme.peachFill,
        HeleneTheme.rose.opacity(0.25)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text(detail)
                    .font(.system(size: 12))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
                    .lineLimit(2)
            }

            HStack(spacing: 5) {
                ForEach(0..<5) { i in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) { value = i }
                    } label: {
                        Text(options[i])
                            .font(.system(size: 10, weight: value == i ? .bold : .medium))
                            .foregroundStyle(value == i ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                            .frame(maxWidth: .infinity)
                            .frame(height: 34)
                            .background(
                                value == i ? colors[i] : HeleneTheme.Colors.surface,
                                in: RoundedRectangle(cornerRadius: 8)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(14)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
    }
}

// MARK: - Domain Bar

private struct DomainBar: View {
    let label:    String
    let score:    Int
    let maxScore: Int
    let fill:     Color

    private var fraction: CGFloat { maxScore > 0 ? CGFloat(score) / CGFloat(maxScore) : 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Spacer()
                Text("\(score) / \(maxScore)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(HeleneTheme.Colors.background).frame(height: 8)
                    Capsule().fill(fill)
                        .frame(width: max(geo.size.width * fraction, fraction > 0 ? 8 : 0), height: 8)
                        .animation(.easeOut(duration: 0.5), value: score)
                }
            }
            .frame(height: 8)
        }
    }
}

// MARK: - Recall Stat (Intro card)

private struct RecallStat: View {
    let icon:    String
    let label:   String
    let value:   String
    let isEmoji: Bool

    var body: some View {
        VStack(spacing: 4) {
            if isEmoji {
                Text(icon).font(.system(size: 20))
            } else {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(HeleneTheme.Colors.textLight)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.white.opacity(0.55), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.small))
    }
}

// MARK: - Info Row (Intro)

private struct InfoRow2: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .frame(width: 20)
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .lineSpacing(2)
        }
    }
}

#Preview {
    WeeklyAssessmentView()
        .modelContainer(for: [CheckInEntry.self, MRSEntry.self], inMemory: true)
}
