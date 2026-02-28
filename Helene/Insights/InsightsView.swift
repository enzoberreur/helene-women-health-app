import SwiftUI
import SwiftData
import Charts

// MARK: - Time Range

enum InsightRange: String, CaseIterable {
    case week    = "7D"
    case month   = "30D"
    case quarter = "3M"
    case all     = "All"

    var days: Int? {
        switch self {
        case .week:    return 7
        case .month:   return 30
        case .quarter: return 90
        case .all:     return nil
        }
    }

    var chartTitle: String {
        switch self {
        case .week:    return "last 7 days"
        case .month:   return "last 30 days"
        case .quarter: return "last 3 months"
        case .all:     return "all time"
        }
    }
}

// MARK: - Main View

struct InsightsView: View {
    @Query(sort: \CheckInEntry.date,   order: .reverse) private var entries:    [CheckInEntry]
    @Query(sort: \MRSEntry.date,       order: .reverse) private var mrsEntries: [MRSEntry]

    @State private var selectedRange: InsightRange = .week

    // MARK: - Derived data

    private var filteredEntries: [CheckInEntry] {
        guard let days = selectedRange.days else { return entries }
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        return entries.filter { $0.date >= cutoff }
    }

    private var trendEntries: [CheckInEntry] { Array(filteredEntries.reversed()) }

    private var totalCheckIns: Int { filteredEntries.count }

    private var avgMood: Double {
        guard !filteredEntries.isEmpty else { return 0 }
        return Double(filteredEntries.map { $0.mood }.reduce(0, +)) / Double(filteredEntries.count)
    }

    // Streak always counts from today regardless of filter
    private var streak: Int {
        var count = 0
        var checkDay = Calendar.current.startOfDay(for: Date())
        let cal = Calendar.current
        for entry in entries.sorted(by: { $0.date > $1.date }) {
            let entryDay = cal.startOfDay(for: entry.date)
            if entryDay == checkDay || entryDay == cal.date(byAdding: .day, value: -1, to: checkDay)! {
                count += 1
                checkDay = entryDay
            } else if entryDay < cal.date(byAdding: .day, value: -1, to: checkDay)! {
                break
            }
        }
        return count
    }

    private var symptomFrequency: [(symptom: String, count: Int)] {
        var freq: [String: Int] = [:]
        for entry in filteredEntries {
            for symptom in entry.symptoms { freq[symptom, default: 0] += 1 }
        }
        return freq.sorted { $0.value > $1.value }.prefix(6).map { (symptom: $0.key, count: $0.value) }
    }

    private var sleepEntries:   [CheckInEntry] { trendEntries.filter { $0.sleepQuality > 0 } }
    private var energyEntries:  [CheckInEntry] { trendEntries.filter { $0.energyLevel  > 0 } }
    private var stressEntries:  [CheckInEntry] { trendEntries.filter { $0.stressLevel  > 0 } }
    private var entriesWithTriggers: [CheckInEntry] { filteredEntries.filter { !$0.triggers.isEmpty } }

    private var sleepMoodCorrelation: (good: Double, poor: Double)? {
        let withSleep = filteredEntries.filter { $0.sleepQuality > 0 }
        guard withSleep.count >= 5 else { return nil }
        let goodSleep = withSleep.filter { $0.sleepQuality >= 4 }
        let poorSleep = withSleep.filter { $0.sleepQuality <= 2 }
        guard !goodSleep.isEmpty, !poorSleep.isEmpty else { return nil }
        return (
            good: Double(goodSleep.map { $0.mood }.reduce(0, +)) / Double(goodSleep.count),
            poor: Double(poorSleep.map { $0.mood }.reduce(0, +)) / Double(poorSleep.count)
        )
    }

    private var stressMoodCorrelation: (calm: Double, stressed: Double)? {
        let withStress = filteredEntries.filter { $0.stressLevel > 0 }
        guard withStress.count >= 5 else { return nil }
        let calm     = withStress.filter { $0.stressLevel >= 4 }
        let stressed = withStress.filter { $0.stressLevel <= 2 }
        guard !calm.isEmpty, !stressed.isEmpty else { return nil }
        return (
            calm:     Double(calm.map     { $0.mood }.reduce(0, +)) / Double(calm.count),
            stressed: Double(stressed.map { $0.mood }.reduce(0, +)) / Double(stressed.count)
        )
    }

    // Top words from check-in notes (filtered, sorted by frequency)
    private var wordFrequency: [(word: String, count: Int)] {
        let stopWords: Set<String> = [
            "i", "my", "me", "we", "a", "an", "the", "and", "or", "but", "so",
            "is", "are", "was", "were", "be", "been", "being", "have", "has",
            "had", "do", "did", "does", "in", "on", "at", "to", "for", "of",
            "it", "its", "this", "that", "with", "from", "up", "as", "by",
            "not", "no", "very", "just", "been", "also", "still", "really",
            "feel", "felt", "feeling", "bit", "lot", "bit", "got", "get",
            "im", "its", "its", "day", "today", "again", "bit"
        ]
        var freq: [String: Int] = [:]
        for entry in filteredEntries where !entry.note.isEmpty {
            let words = entry.note
                .lowercased()
                .components(separatedBy: .alphanumerics.inverted)
                .filter { $0.count > 2 && !stopWords.contains($0) }
            for word in words { freq[word, default: 0] += 1 }
        }
        return freq.sorted { $0.value > $1.value }.prefix(40).map { (word: $0.key, count: $0.value) }
    }

    // Avg mood by day-of-week (1=Sun … 7=Sat)
    private var weekdayPattern: [(weekday: Int, avgMood: Double)] {
        let cal = Calendar.current
        var buckets: [Int: [Int]] = [:]
        for entry in filteredEntries {
            let wd = cal.component(.weekday, from: entry.date)
            buckets[wd, default: []].append(entry.mood)
        }
        return (1...7).compactMap { wd -> (Int, Double)? in
            guard let moods = buckets[wd], !moods.isEmpty else { return nil }
            return (wd, Double(moods.reduce(0, +)) / Double(moods.count))
        }
    }

    // Previous equivalent period (for progress comparison)
    private var progressCurrentEntries: [CheckInEntry] {
        let actualDays = selectedRange.days ?? 30
        let cutoff = Calendar.current.date(byAdding: .day, value: -actualDays, to: Date()) ?? Date()
        return entries.filter { $0.date >= cutoff }
    }

    private var previousPeriodEntries: [CheckInEntry] {
        let actualDays = selectedRange.days ?? 30
        let cutoff     = Calendar.current.date(byAdding: .day, value: -actualDays,     to: Date()) ?? Date()
        let prevCutoff = Calendar.current.date(byAdding: .day, value: -actualDays * 2, to: Date()) ?? Date()
        return entries.filter { $0.date >= prevCutoff && $0.date < cutoff }
    }

    private var progressMetrics: [ProgressMetric] {
        let cur  = progressCurrentEntries
        let prev = previousPeriodEntries
        guard cur.count >= 3, prev.count >= 3 else { return [] }

        func avg(_ arr: [CheckInEntry], _ kp: KeyPath<CheckInEntry, Int>) -> Double? {
            let vals = arr.map { $0[keyPath: kp] }.filter { $0 > 0 }
            return vals.isEmpty ? nil : Double(vals.reduce(0, +)) / Double(vals.count)
        }

        var result: [ProgressMetric] = []
        if let c = avg(cur, \.mood),         let p = avg(prev, \.mood)         { result.append(.init(label: "Mood",    icon: "face.smiling", current: c, delta: c - p, higherIsBetter: true))  }
        if let c = avg(cur, \.sleepQuality), let p = avg(prev, \.sleepQuality) { result.append(.init(label: "Sleep",   icon: "moon.fill",    current: c, delta: c - p, higherIsBetter: true))  }
        if let c = avg(cur, \.energyLevel),  let p = avg(prev, \.energyLevel)  { result.append(.init(label: "Energy",  icon: "bolt.fill",    current: c, delta: c - p, higherIsBetter: true))  }
        if let c = avg(cur, \.stressLevel),  let p = avg(prev, \.stressLevel)  { result.append(.init(label: "Stress",  icon: "wind",         current: c, delta: c - p, higherIsBetter: false)) }
        let cSym = cur.isEmpty  ? 0.0 : Double(cur.map  { $0.symptoms.count }.reduce(0, +)) / Double(cur.count)
        let pSym = prev.isEmpty ? 0.0 : Double(prev.map { $0.symptoms.count }.reduce(0, +)) / Double(prev.count)
        result.append(.init(label: "Symptoms/day", icon: "cross.circle", current: cSym, delta: cSym - pSym, higherIsBetter: false))
        return result
    }

    // Symptom count per day (for trend chart)
    private var symptomCountByDay: [(date: Date, count: Int)] {
        let cal = Calendar.current
        var byDay: [Date: Int] = [:]
        for entry in filteredEntries {
            let day = cal.startOfDay(for: entry.date)
            byDay[day] = (byDay[day] ?? 0) + entry.symptoms.count
        }
        return byDay.sorted { $0.key < $1.key }.map { (date: $0.key, count: $0.value) }
    }

    // Top 3 best days in the selected period
    private var topDays: [CheckInEntry] {
        Array(filteredEntries.sorted {
            if $0.mood != $1.mood { return $0.mood > $1.mood }
            return $0.symptoms.count < $1.symptoms.count
        }.prefix(3))
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {
                        header
                        rangeFilterBar
                        if entries.count < 3 { earlyDataBanner }
                        statsRow
                        if !progressMetrics.isEmpty {
                            progressSnapshotCard
                        }
                        if filteredEntries.count > 0 {
                            moodTrendChart
                            if !sleepEntries.isEmpty || !energyEntries.isEmpty || !stressEntries.isEmpty {
                                wellbeingTrendChart
                            }
                            if weekdayPattern.count >= 3 {
                                weeklyPatternChart
                            }
                            if !symptomFrequency.isEmpty {
                                symptomFrequencyChart
                            }
                            if symptomCountByDay.count >= 3 {
                                symptomTrendChart
                            }
                            if !wordFrequency.isEmpty {
                                wordCloudSection
                            }
                        }
                        if sleepMoodCorrelation != nil || stressMoodCorrelation != nil {
                            correlationCard
                        }
                        if !topDays.isEmpty {
                            bestDaysCard
                        }
                        mrsSection
                        if entriesWithTriggers.count >= 5 {
                            triggerInsightsSection
                        }
                        Spacer(minLength: 100)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.lg)
                }
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Insights")
                .font(.caption.weight(.semibold))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .textCase(.uppercase)
                .tracking(1)

            Text("Your \(Text("patterns").bold())")
                .font(.system(size: 28, weight: .regular))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
        }
    }

    // MARK: - Range Filter Bar

    private var rangeFilterBar: some View {
        HStack(spacing: 8) {
            ForEach(InsightRange.allCases, id: \.self) { range in
                Button { withAnimation(.easeInOut(duration: 0.2)) { selectedRange = range } } label: {
                    Text(range.rawValue)
                        .font(.system(size: 13, weight: selectedRange == range ? .bold : .medium))
                        .foregroundStyle(selectedRange == range ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            selectedRange == range ? HeleneTheme.lavenderFill : HeleneTheme.Colors.surface,
                            in: Capsule()
                        )
                        .lightSchemeOnFill(selectedRange == range)
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 12) {
            StatCard(value: "\(totalCheckIns)", label: "Check-ins", fill: HeleneTheme.lavenderFill)
            StatCard(value: avgMood > 0 ? String(format: "%.1f", avgMood) : "—", label: "Avg mood", fill: HeleneTheme.marigoldFill)
            StatCard(value: "\(streak)d", label: "Streak", fill: HeleneTheme.sageFill)
        }
    }

    // MARK: - Mood Trend

    private var moodTrendChart: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Mood — \(selectedRange.chartTitle)")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            Chart {
                ForEach(trendEntries) { entry in
                    LineMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Mood", entry.mood)
                    )
                    .foregroundStyle(HeleneTheme.lavenderFill)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Mood", entry.mood)
                    )
                    .foregroundStyle(HeleneTheme.lavenderFill)
                    .symbolSize(36)
                }
            }
            .chartYScale(domain: 1...5)
            .chartYAxis {
                AxisMarks(values: [1, 2, 3, 4, 5]) { value in
                    AxisValueLabel {
                        if let v = value.as(Int.self) {
                            Text(moodLabel(v))
                                .font(.caption)
                                .foregroundStyle(HeleneTheme.Colors.textLight)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: xStride, count: xStrideCount)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        .font(.caption)
                }
            }
            .frame(height: 180)
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Sleep & Energy Trend

    private var wellbeingTrendChart: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Sleep, energy & stress — \(selectedRange.chartTitle)")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            HStack(spacing: 16) {
                if !sleepEntries.isEmpty {
                    Label("Sleep", systemImage: "moon.fill")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color(hex: "#8A8FCC"))
                }
                if !energyEntries.isEmpty {
                    Label("Energy", systemImage: "bolt.fill")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color(hex: "#C8A030"))
                }
                if !stressEntries.isEmpty {
                    Label("Stress", systemImage: "wind")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color(hex: "#CC8870"))
                }
            }

            Chart {
                ForEach(sleepEntries) { entry in
                    LineMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Sleep", entry.sleepQuality),
                        series: .value("Metric", "Sleep")
                    )
                    .foregroundStyle(HeleneTheme.lavenderFill)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Sleep", entry.sleepQuality)
                    )
                    .foregroundStyle(HeleneTheme.lavenderFill)
                    .symbolSize(24)
                }
                ForEach(energyEntries) { entry in
                    LineMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Energy", entry.energyLevel),
                        series: .value("Metric", "Energy")
                    )
                    .foregroundStyle(HeleneTheme.marigoldFill)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Energy", entry.energyLevel)
                    )
                    .foregroundStyle(HeleneTheme.marigoldFill)
                    .symbolSize(24)
                }
                ForEach(stressEntries) { entry in
                    LineMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Stress", entry.stressLevel),
                        series: .value("Metric", "Stress")
                    )
                    .foregroundStyle(HeleneTheme.peachFill)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Date", entry.date, unit: .day),
                        y: .value("Stress", entry.stressLevel)
                    )
                    .foregroundStyle(HeleneTheme.peachFill)
                    .symbolSize(24)
                }
            }
            .chartYScale(domain: 1...5)
            .chartYAxis {
                AxisMarks(values: [1, 3, 5]) { value in
                    AxisValueLabel {
                        if let v = value.as(Int.self) {
                            Text("\(v)")
                                .font(.caption)
                                .foregroundStyle(HeleneTheme.Colors.textLight)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: xStride, count: xStrideCount)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        .font(.caption)
                }
            }
            .frame(height: 160)
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Weekly Pattern

    private var weeklyPatternChart: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Weekly pattern")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Average mood by day of week")
                    .font(.system(size: 12))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }

            Chart {
                ForEach(weekdayPattern, id: \.weekday) { item in
                    BarMark(
                        x: .value("Day", weekdayLabel(item.weekday)),
                        y: .value("Mood", item.avgMood)
                    )
                    .foregroundStyle(
                        item.avgMood >= 4 ? HeleneTheme.sageFill :
                        item.avgMood >= 3 ? HeleneTheme.lavenderFill :
                        HeleneTheme.peachFill
                    )
                    .cornerRadius(6)

                    RuleMark(y: .value("Avg", avgMood))
                        .foregroundStyle(HeleneTheme.Colors.textLight.opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .annotation(position: .trailing) {
                            Text("avg")
                                .font(.system(size: 9))
                                .foregroundStyle(HeleneTheme.Colors.textLight)
                        }
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let label = value.as(String.self) {
                            Text(label).font(.caption).foregroundStyle(HeleneTheme.Colors.textSecond)
                        }
                    }
                }
            }
            .chartYScale(domain: 1...5)
            .chartYAxis {
                AxisMarks(values: [1, 2, 3, 4, 5]) { value in
                    AxisValueLabel {
                        if let v = value.as(Int.self) {
                            Text(moodLabel(v)).font(.system(size: 9)).foregroundStyle(HeleneTheme.Colors.textLight)
                        }
                    }
                }
            }
            .frame(height: 150)
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Symptom Frequency

    private var symptomFrequencyChart: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Most frequent symptoms — \(selectedRange.chartTitle)")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            Chart {
                ForEach(symptomFrequency, id: \.symptom) { item in
                    BarMark(
                        x: .value("Count", item.count),
                        y: .value("Symptom", item.symptom)
                    )
                    .foregroundStyle(HeleneTheme.sageFill)
                    .cornerRadius(6)
                }
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                    AxisValueLabel().font(.caption)
                }
            }
            .frame(height: CGFloat(symptomFrequency.count) * 44 + 20)
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Word Cloud

    private var wordCloudSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Your words")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Most used words in your notes — \(selectedRange.chartTitle)")
                    .font(.system(size: 12))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }

            let maxCount = wordFrequency.first?.count ?? 1
            FlowLayout(spacing: 8) {
                ForEach(wordFrequency, id: \.word) { item in
                    let ratio    = CGFloat(item.count) / CGFloat(maxCount)
                    let fontSize = 11 + ratio * 13          // 11pt → 24pt
                    let opacity  = 0.45 + Double(ratio) * 0.55  // 45% → 100%
                    Text(item.word)
                        .font(.system(size: fontSize, weight: ratio > 0.6 ? .semibold : .regular))
                        .foregroundStyle(wordColor(ratio: ratio).opacity(opacity))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(wordColor(ratio: ratio).opacity(opacity * 0.18),
                                    in: Capsule())
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    private func wordColor(ratio: CGFloat) -> Color {
        if ratio > 0.66 { return HeleneTheme.rose }
        if ratio > 0.33 { return Color(hex: "#8A8FCC") }   // lavender-ish
        return HeleneTheme.Colors.textSecond
    }

    // MARK: - Correlation Card

    private var correlationCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "link")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                Text("Connections")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }

            VStack(alignment: .leading, spacing: 10) {
                if let s = sleepMoodCorrelation {
                    CorrelationRow(icon: "moon.fill", color: HeleneTheme.lavenderFill,
                                   text: sleepCorrelationText(good: s.good, poor: s.poor))
                }
                if let s = stressMoodCorrelation {
                    if sleepMoodCorrelation != nil { Divider() }
                    CorrelationRow(icon: "wind", color: HeleneTheme.sageFill,
                                   text: stressCorrelationText(calm: s.calm, stressed: s.stressed))
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.peachFill.opacity(0.5), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
        .environment(\.colorScheme, .light)
    }

    // MARK: - MRS Section

    private var mrsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "checklist.checked")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                Text("Wellbeing Score (MRS)")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }

            if mrsEntries.isEmpty {
                HStack(spacing: 12) {
                    Image(systemName: "clock.badge.questionmark")
                        .font(.system(size: 22))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("No assessments yet")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        Text("Complete your first weekly check-up from the Home tab to see your MRS score here.")
                            .font(.system(size: 13))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .lineSpacing(2)
                    }
                }
            } else {
                if let latest = mrsEntries.first { mrsLatestCard(latest) }
                if mrsEntries.count >= 2 { mrsTrendChart }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    private func mrsLatestCard(_ entry: MRSEntry) -> some View {
        let df = DateFormatter(); df.dateStyle = .medium
        return VStack(spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Latest · \(df.string(from: entry.date))")
                        .font(.caption).foregroundStyle(HeleneTheme.Colors.textLight)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(entry.totalScore)")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        Text("/ 44").font(.system(size: 15)).foregroundStyle(HeleneTheme.Colors.textLight)
                    }
                }
                Spacer()
                Text(entry.severityLabel)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(mrsSeverityColor(entry.totalScore), in: Capsule())
            }
            VStack(spacing: 8) {
                MRSDomainMiniBar(label: "Body",      score: entry.somaticScore,      max: 16, fill: HeleneTheme.peachFill)
                MRSDomainMiniBar(label: "Emotional", score: entry.psychologicalScore, max: 16, fill: HeleneTheme.lavenderFill)
                MRSDomainMiniBar(label: "Intimate",  score: entry.urogenitalScore,    max: 12, fill: HeleneTheme.sageFill)
            }
        }
        .padding(HeleneTheme.Spacing.md)
        .background(HeleneTheme.Colors.background, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
    }

    private var mrsTrendChart: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Score history")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textSecond)

            let sorted = mrsEntries.sorted { $0.date < $1.date }
            Chart {
                ForEach(sorted) { entry in
                    RectangleMark(
                        xStart: .value("Start", sorted.first!.date),
                        xEnd:   .value("End",   sorted.last!.date),
                        yStart: .value("y0", 0), yEnd: .value("y1", 5)
                    )
                    .foregroundStyle(HeleneTheme.sageFill.opacity(0.15))

                    LineMark(
                        x: .value("Week", entry.date, unit: .weekOfYear),
                        y: .value("Score", entry.totalScore)
                    )
                    .foregroundStyle(HeleneTheme.marigoldFill)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Week", entry.date, unit: .weekOfYear),
                        y: .value("Score", entry.totalScore)
                    )
                    .foregroundStyle(HeleneTheme.marigoldFill)
                    .symbolSize(40)
                }
            }
            .chartYScale(domain: 0...44)
            .chartYAxis {
                AxisMarks(values: [0, 5, 9, 16, 44]) { value in
                    AxisValueLabel {
                        if let v = value.as(Int.self) {
                            Text("\(v)").font(.caption).foregroundStyle(HeleneTheme.Colors.textLight)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .weekOfYear, count: 1)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day()).font(.caption)
                }
            }
            .frame(height: 160)
        }
    }

    private func mrsSeverityColor(_ score: Int) -> Color {
        switch score {
        case 0...4:  return HeleneTheme.sageFill
        case 5...8:  return HeleneTheme.marigoldFill
        case 9...15: return HeleneTheme.peachFill
        default:     return HeleneTheme.rose.opacity(0.3)
        }
    }

    // MARK: - Early Data Banner

    private var earlyDataBanner: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .padding(.top, 1)
            VStack(alignment: .leading, spacing: 4) {
                Text("Your insights are warming up")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Check in daily for at least 3 days to unlock accurate charts. You've logged \(entries.count) so far — keep going!")
                    .font(.system(size: 13))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .lineSpacing(3)
                HStack(spacing: 6) {
                    ForEach(0..<3) { i in
                        Circle()
                            .fill(i < entries.count ? HeleneTheme.Colors.dark : HeleneTheme.Colors.surface)
                            .frame(width: 8, height: 8)
                            .overlay(Circle().strokeBorder(HeleneTheme.Colors.textLight, lineWidth: 1))
                    }
                    Text("\(entries.count) / 3")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                }
                .padding(.top, 4)
            }
        }
        .padding(HeleneTheme.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HeleneTheme.marigoldFill.opacity(0.35),
                    in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Trigger Insights Section

    private struct TriggerBarData: Identifiable {
        let id        = UUID()
        let triggerId:  String
        let emoji:      String
        let shortLabel: String
        let avgOnDay:   Double
        let daysCount:  Int
    }

    private var overallAvgSymptoms: Double {
        guard !filteredEntries.isEmpty else { return 0 }
        return Double(filteredEntries.map { $0.symptoms.count }.reduce(0, +)) / Double(filteredEntries.count)
    }

    private var triggerBarData: [TriggerBarData] {
        let info: [(id: String, emoji: String, short: String)] = [
            ("coffee",        "☕", "Caffeine"),
            ("alcohol",       "🍷", "Alcohol"),
            ("exercise",      "🏃", "Exercise"),
            ("workstress",    "😤", "Work stress"),
            ("medication",    "💊", "Medication"),
            ("outdoor",       "☀️", "Outdoors"),
            ("social",        "🤝", "Social"),
            ("disruptedsleep","🌙", "Poor sleep")
        ]
        return info.compactMap { item in
            let days = filteredEntries.filter { $0.triggers.contains(item.id) }
            guard days.count >= 3 else { return nil }
            let avg = Double(days.map { $0.symptoms.count }.reduce(0, +)) / Double(days.count)
            return TriggerBarData(triggerId: item.id, emoji: item.emoji,
                                  shortLabel: item.short, avgOnDay: avg, daysCount: days.count)
        }.sorted { $0.avgOnDay > $1.avgOnDay }
    }

    private var triggerInsightsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Trigger Patterns")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            let bars = triggerBarData
            if bars.isEmpty {
                Text("Not enough data yet. Log triggers for at least 3 days each to see patterns.")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
                    .lineSpacing(3)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Avg symptoms logged on days with each factor. Dashed line = your overall average.")
                        .font(.system(size: 12))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)

                    Chart {
                        ForEach(bars) { item in
                            BarMark(
                                x: .value("Trigger", item.emoji + "\n" + item.shortLabel),
                                y: .value("Avg symptoms", item.avgOnDay)
                            )
                            .foregroundStyle(
                                item.avgOnDay > overallAvgSymptoms + 0.1
                                    ? AnyShapeStyle(HeleneTheme.peachFill)
                                    : AnyShapeStyle(HeleneTheme.sageFill)
                            )
                            .cornerRadius(6)
                            .annotation(position: .top) {
                                Text(String(format: "%.1f", item.avgOnDay))
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                            }
                        }
                        if overallAvgSymptoms > 0 {
                            RuleMark(y: .value("Your average", overallAvgSymptoms))
                                .foregroundStyle(HeleneTheme.Colors.textSecond.opacity(0.5))
                                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
                                .annotation(position: .trailing, alignment: .leading) {
                                    Text("avg")
                                        .font(.system(size: 9))
                                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                                }
                        }
                    }
                    .chartYScale(domain: 0...(bars.map { $0.avgOnDay }.max().map { $0 * 1.4 } ?? 5))
                    .chartXAxis {
                        AxisMarks { value in
                            AxisValueLabel(centered: true) {
                                if let label = value.as(String.self) {
                                    Text(label)
                                        .font(.system(size: 9))
                                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                                        .multilineTextAlignment(.center)
                                }
                            }
                        }
                    }
                    .chartYAxis {
                        AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                            AxisValueLabel().font(.caption)
                        }
                    }
                    .frame(height: 180)

                    // Legend
                    HStack(spacing: 16) {
                        HStack(spacing: 5) {
                            RoundedRectangle(cornerRadius: 3).fill(HeleneTheme.peachFill).frame(width: 12, height: 12)
                            Text("More symptoms")
                                .font(.system(size: 11))
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                        }
                        HStack(spacing: 5) {
                            RoundedRectangle(cornerRadius: 3).fill(HeleneTheme.sageFill).frame(width: 12, height: 12)
                            Text("Fewer symptoms")
                                .font(.system(size: 11))
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                        }
                    }

                    // Text summaries below chart
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(bars) { item in
                            let overall = overallAvgSymptoms
                            if overall > 0 {
                                let ratio = item.avgOnDay / overall
                                HStack(alignment: .top, spacing: 6) {
                                    Text(item.emoji).font(.system(size: 13))
                                    if ratio >= 1.1 {
                                        Text("\(item.shortLabel) days — \(String(format: "%.1f×", ratio)) more symptoms (\(item.daysCount) days logged)")
                                            .font(.system(size: 13))
                                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                    } else if ratio < 0.9 {
                                        Text("\(item.shortLabel) days — \(String(format: "%.0f%%", (1 - ratio) * 100)) fewer symptoms (\(item.daysCount) days logged)")
                                            .font(.system(size: 13))
                                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                    } else {
                                        Text("\(item.shortLabel) — ®little impact on symptoms (\(item.daysCount) days logged)")
                                            .font(.system(size: 13))
                                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                                    }
                                }
                            }
                        }
                    }
                    .padding(.top, 4)
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Progress Snapshot

    @ViewBuilder
    private var progressSnapshotCard: some View {
        let metrics     = progressMetrics
        let periodLabel = selectedRange.days.map { "\($0) days" } ?? "30 days"
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Progress")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("vs previous \(periodLabel)")
                    .font(.system(size: 12))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }

            let columns = [GridItem(.flexible()), GridItem(.flexible())]
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(metrics) { m in
                    progressMetricCell(m)
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    @ViewBuilder
    private func progressMetricCell(_ m: ProgressMetric) -> some View {
        let isImproving = m.higherIsBetter ? m.delta > 0.1 : m.delta < -0.1
        let isDeclining = m.higherIsBetter ? m.delta < -0.1 : m.delta > 0.1
        let arrowName   = m.delta > 0.1 ? "arrow.up" : m.delta < -0.1 ? "arrow.down" : "minus"
        let tintColor: Color = isImproving ? Color(hex: "#6B9E6B") : isDeclining ? HeleneTheme.rose : HeleneTheme.Colors.textLight

        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 5) {
                Image(systemName: m.icon)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                Text(m.label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(String(format: "%.1f", m.current))
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                HStack(spacing: 2) {
                    Image(systemName: arrowName)
                        .font(.system(size: 10, weight: .bold))
                    if abs(m.delta) >= 0.1 {
                        Text(String(format: "%+.1f", m.delta))
                            .font(.system(size: 11, weight: .semibold))
                    }
                }
                .foregroundStyle(tintColor)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(HeleneTheme.Colors.background, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
    }

    // MARK: - Symptom Load Trend

    @ViewBuilder
    private var symptomTrendChart: some View {
        let data      = symptomCountByDay
        let counts    = data.map { Double($0.count) }
        let halfIdx   = max(1, counts.count / 2)
        let firstAvg  = counts.prefix(halfIdx).reduce(0, +) / Double(halfIdx)
        let secondAvg = counts.suffix(counts.count - halfIdx).reduce(0, +) / Double(max(1, counts.count - halfIdx))
        let improving = secondAvg < firstAvg - 0.3
        let worsening = secondAvg > firstAvg + 0.3
        let trendLabel: String = improving ? "Symptom load is trending down — an encouraging sign." :
                                 worsening ? "Symptom load is trending up — worth discussing with your doctor." :
                                             "Symptom load is relatively stable over this period."
        let trendIcon: String  = improving ? "arrow.down.circle.fill" : worsening ? "arrow.up.circle.fill" : "equal.circle.fill"
        let trendColor: Color  = improving ? Color(hex: "#6B9E6B") : worsening ? HeleneTheme.rose : HeleneTheme.Colors.textSecond

        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Symptom load")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("Daily symptoms logged — \(selectedRange.chartTitle)")
                    .font(.system(size: 12))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }

            Chart {
                ForEach(data, id: \.date) { point in
                    AreaMark(
                        x: .value("Date", point.date, unit: .day),
                        y: .value("Symptoms", point.count)
                    )
                    .foregroundStyle(HeleneTheme.sageFill.opacity(0.3))
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Date", point.date, unit: .day),
                        y: .value("Symptoms", point.count)
                    )
                    .foregroundStyle(HeleneTheme.sageFill)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Date", point.date, unit: .day),
                        y: .value("Symptoms", point.count)
                    )
                    .foregroundStyle(HeleneTheme.sageFill)
                    .symbolSize(28)
                }
            }
            .chartYScale(domain: 0...Swift.max(5, (data.map { $0.count }.max() ?? 0) + 2))
            .chartXAxis {
                AxisMarks(values: .stride(by: xStride, count: xStrideCount)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        .font(.caption)
                }
            }
            .chartYAxis {
                AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                    AxisValueLabel().font(.caption)
                }
            }
            .frame(height: 140)

            HStack(alignment: .top, spacing: 8) {
                Image(systemName: trendIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(trendColor)
                Text(trendLabel)
                    .font(.system(size: 13))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Best Days

    @ViewBuilder
    private var bestDaysCard: some View {
        let days = topDays
        let df: DateFormatter = { let f = DateFormatter(); f.dateStyle = .medium; return f }()

        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "star.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: "#C8A030"))
                Text("Your best days")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Spacer()
                Text(selectedRange.chartTitle)
                    .font(.system(size: 12))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }

            VStack(spacing: 0) {
                ForEach(Array(days.enumerated()), id: \.offset) { idx, entry in
                    HStack(spacing: 12) {
                        HStack(spacing: 3) {
                            ForEach(1...5, id: \.self) { i in
                                Circle()
                                    .fill(i <= entry.mood ? HeleneTheme.marigoldFill : HeleneTheme.Colors.separator)
                                    .frame(width: 7, height: 7)
                            }
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(df.string(from: entry.date))
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            if !entry.note.isEmpty {
                                Text(entry.note)
                                    .font(.system(size: 12))
                                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                                    .lineLimit(1)
                            }
                        }
                        Spacer()
                        if entry.symptoms.isEmpty {
                            Text("No symptoms")
                                .font(.caption)
                                .foregroundStyle(Color(hex: "#6B9E6B"))
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .background(HeleneTheme.sageFill.opacity(0.5), in: Capsule())
                                .environment(\.colorScheme, .light)
                        } else {
                            Text("\(entry.symptoms.count) symptom\(entry.symptoms.count == 1 ? "" : "s")")
                                .font(.caption)
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .background(HeleneTheme.Colors.surface, in: Capsule())
                        }
                    }
                    .padding(.vertical, 12)
                    if idx < days.count - 1 { Divider() }
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.marigoldFill.opacity(0.25), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
        .environment(\.colorScheme, .light)
    }

    // MARK: - Helpers

    private var xStride: Calendar.Component { .day }
    private var xStrideCount: Int {
        switch selectedRange {
        case .week:    return 1
        case .month:   return 5
        case .quarter: return 14
        case .all:     return 30
        }
    }

    private func weekdayLabel(_ wd: Int) -> String {
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][wd - 1]
    }

    private func moodLabel(_ v: Int) -> String {
        switch v {
        case 1: return "Hard"
        case 2: return "Low"
        case 3: return "Okay"
        case 4: return "Good"
        case 5: return "Great"
        default: return ""
        }
    }

    private func sleepCorrelationText(good: Double, poor: Double) -> String {
        let diff = good - poor
        if diff > 0.4 {
            return String(format: "When you sleep well, your mood averages %.1f/5. After a poor night, it drops to %.1f/5.", good, poor)
        } else {
            return String(format: "Sleep quality has little impact on your reported mood (%.1f vs %.1f/5).", good, poor)
        }
    }

    private func stressCorrelationText(calm: Double, stressed: Double) -> String {
        let diff = calm - stressed
        if diff > 0.4 {
            return String(format: "On calm days your mood averages %.1f/5. On high-stress days, it's %.1f/5.", calm, stressed)
        } else {
            return String(format: "Your mood stays relatively stable regardless of stress level (%.1f vs %.1f/5).", calm, stressed)
        }
    }
}

// MARK: - Correlation Row

private struct CorrelationRow: View {
    let icon:  String
    let color: Color
    let text:  String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            ZStack {
                Circle().fill(color).frame(width: 28, height: 28)
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - Stat Card

private struct StatCard: View {
    let value: String
    let label: String
    let fill:  Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            Text(label)
                .font(.caption)
                .foregroundStyle(HeleneTheme.Colors.textSecond)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(fill, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
        .environment(\.colorScheme, .light)
    }
}

// MARK: - MRS Domain Mini Bar

private struct MRSDomainMiniBar: View {
    let label: String
    let score: Int
    let max:   Int
    let fill:  Color

    private var fraction: CGFloat { max > 0 ? CGFloat(score) / CGFloat(max) : 0 }

    var body: some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .frame(width: 64, alignment: .leading)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(HeleneTheme.Colors.surface).frame(height: 6)
                    Capsule().fill(fill)
                        .frame(width: Swift.max(geo.size.width * fraction, fraction > 0 ? 6 : 0), height: 6)
                        .animation(.easeOut(duration: 0.5), value: score)
                }
            }
            .frame(height: 6)

            Text("\(score)/\(max)")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textLight)
                .frame(width: 32, alignment: .trailing)
        }
    }
}

// MARK: - Progress Metric Model

private struct ProgressMetric: Identifiable {
    let id             = UUID()
    let label:         String
    let icon:          String
    let current:       Double
    let delta:         Double
    let higherIsBetter: Bool
}

#Preview {
    InsightsView()
        .modelContainer(for: [CheckInEntry.self, MRSEntry.self, TreatmentEntry.self], inMemory: true)
}
