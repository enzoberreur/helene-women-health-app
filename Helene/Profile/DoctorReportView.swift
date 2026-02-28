import SwiftUI
import SwiftData
import UIKit

struct DoctorReportView: View {

    @Environment(UserProfile.self)  private var profile
    @Environment(\.dismiss)         private var dismiss

    @Query(sort: \CheckInEntry.date,   order: .reverse) private var entries:     [CheckInEntry]
    @Query(sort: \MRSEntry.date,       order: .reverse) private var mrsEntries:  [MRSEntry]
    @Query(sort: \TreatmentEntry.date, order: .reverse) private var treatments:  [TreatmentEntry]

    private var cutoff: Date {
        Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
    }

    private var recentEntries: [CheckInEntry] { entries.filter { $0.date >= cutoff } }

    private var prevCutoff: Date {
        Calendar.current.date(byAdding: .day, value: -60, to: Date()) ?? Date()
    }

    private var prevEntries: [CheckInEntry] {
        entries.filter { $0.date >= prevCutoff && $0.date < cutoff }
    }

    // MARK: - Computed metrics

    private var totalCheckIns: Int { entries.count }

    private var avgMood: Double {
        guard !recentEntries.isEmpty else { return 0 }
        return Double(recentEntries.map { $0.mood }.reduce(0, +)) / Double(recentEntries.count)
    }

    private var streak: Int {
        var count = 0
        var checkDay = Calendar.current.startOfDay(for: Date())
        let cal = Calendar.current
        for entry in entries {
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

    private var topSymptoms: [(symptom: String, count: Int)] {
        var freq: [String: Int] = [:]
        for entry in recentEntries { for s in entry.symptoms { freq[s, default: 0] += 1 } }
        return freq.sorted { $0.value > $1.value }.prefix(5).map { (symptom: $0.key, count: $0.value) }
    }

    private func avg30(_ keyPath: KeyPath<CheckInEntry, Int>, filter: (CheckInEntry) -> Bool) -> Double {
        let valid = recentEntries.filter(filter)
        guard !valid.isEmpty else { return 0 }
        return Double(valid.map { $0[keyPath: keyPath] }.reduce(0, +)) / Double(valid.count)
    }

    private func avg30Prev(_ keyPath: KeyPath<CheckInEntry, Int>, filter: (CheckInEntry) -> Bool) -> Double {
        let valid = prevEntries.filter(filter)
        guard !valid.isEmpty else { return 0 }
        return Double(valid.map { $0[keyPath: keyPath] }.reduce(0, +)) / Double(valid.count)
    }

    private var avgSleep:  Double { avg30(\.sleepQuality, filter: { $0.sleepQuality > 0 }) }
    private var avgEnergy: Double { avg30(\.energyLevel,  filter: { $0.energyLevel  > 0 }) }
    private var avgStress: Double { avg30(\.stressLevel,  filter: { $0.stressLevel  > 0 }) }

    private var prevSleep:  Double { avg30Prev(\.sleepQuality, filter: { $0.sleepQuality > 0 }) }
    private var prevEnergy: Double { avg30Prev(\.energyLevel,  filter: { $0.energyLevel  > 0 }) }
    private var prevStress: Double { avg30Prev(\.stressLevel,  filter: { $0.stressLevel  > 0 }) }

    // MARK: - Smart Questions

    /// Data-driven list of questions to bring to the doctor appointment.
    var smartQuestions: [String] {
        var questions: [String] = []
        let topIDs = Set(topSymptoms.map { $0.symptom })

        // ── Symptom-driven ──────────────────────────────────────────────
        if topIDs.contains("hotflashes") {
            questions.append("My hot flashes occur frequently — what are the safest treatment options for me?")
        }
        if topIDs.contains("sleep") {
            let sleepStr = avgSleep > 0 ? String(format: " (avg %.1f/5)", avgSleep) : ""
            questions.append("Sleep is one of my top symptoms\(sleepStr). What evidence-based interventions would you suggest?")
        }
        if topIDs.contains("anxiety") || topIDs.contains("moodswings") {
            questions.append("I experience frequent mood swings or anxiety. Is this hormonal, and what can I do about it?")
        }
        if topIDs.contains("fatigue") {
            questions.append("I regularly feel fatigued. Could this be related to hormonal changes, and what should I check?")
        }
        if topIDs.contains("brainfog") {
            questions.append("I often experience brain fog. Is this expected at my menopause stage, and is there relief?")
        }
        if topIDs.contains("jointpain") {
            questions.append("I log joint pain regularly — is this connected to oestrogen decline, and what would help?")
        }

        // ── Wellbeing-driven ────────────────────────────────────────────
        if avgSleep > 0 && avgSleep < 2.5 {
            questions.append("My average sleep quality has been poor (\(String(format: "%.1f", avgSleep))/5). What sleep strategies do you recommend?")
        }
        if avgStress > 0 && avgStress < 2.5 {
            questions.append("My stress levels are consistently high. What options exist beyond lifestyle changes?")
        }
        if avgEnergy > 0 && avgEnergy < 2.5 {
            questions.append("My energy is very low on average (\(String(format: "%.1f", avgEnergy))/5). Should we rule out thyroid issues or anaemia?")
        }

        // ── MRS-driven ──────────────────────────────────────────────────
        if let mrs = mrsEntries.first {
            if mrs.totalScore >= 9 {
                questions.append("My MRS score is \(mrs.totalScore)/44 (\(mrs.severityLabel)). Does this warrant a treatment review?")
            }
            if mrs.urogenitalScore >= 5 {
                questions.append("My urogenital score is elevated. What local treatments exist that are safe and effective?")
            }
        }

        // ── Treatment-driven ────────────────────────────────────────────
        if !treatments.isEmpty {
            let started = treatments.filter { $0.status == "started" }.prefix(2)
            for t in started {
                questions.append("I started \(t.name) — what side effects should I watch for and how long before I see results?")
            }
        }
        if profile.hrtStatus == "considering" {
            questions.append("I am considering HRT — given my history, am I a good candidate and what type would suit me?")
        }

        // ── Always-on generic ────────────────────────────────────────────
        questions.append("Based on this health summary, are there any lifestyle changes I should prioritise?")
        if questions.count < 3 {
            questions.append("What follow-up tests or monitoring would you recommend at this stage?")
        }

        return questions
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {
                        headerStrip
                        overviewSection
                        symptomHighlights
                        wellbeingAverages
                        if !mrsEntries.isEmpty { mrsScoreSection }
                        if !treatments.isEmpty { treatmentChangesSection }
                        doctorQuestionsSection
                        shareButton
                        Spacer(minLength: 60)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.md)
                }
            }
            .navigationTitle("Health Summary")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                }
            }
        }
    }

    // MARK: - Header Strip

    private var headerStrip: some View {
        let df = DateFormatter(); df.dateStyle = .long
        return VStack(alignment: .leading, spacing: 4) {
            Text(profile.firstName.isEmpty ? "Health Summary" : "\(profile.firstName)'s Summary")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .textCase(.uppercase)
                .tracking(0.8)
            Text("Generated \(df.string(from: Date()))")
                .font(.caption)
                .foregroundStyle(HeleneTheme.Colors.textLight)
        }
    }

    // MARK: - Overview

    private var overviewSection: some View {
        ReportCard(title: "Overview") {
            HStack(spacing: 12) {
                StatPill(value: "\(totalCheckIns)", label: "check-ins",
                         fill: HeleneTheme.lavenderFill)
                StatPill(value: avgMood > 0 ? String(format: "%.1f", avgMood) : "—",
                         label: "avg mood", fill: HeleneTheme.marigoldFill)
                StatPill(value: "\(streak)d", label: "streak",
                         fill: HeleneTheme.sageFill)
            }
        }
    }

    // MARK: - Symptom Highlights

    private var symptomHighlights: some View {
        ReportCard(title: "Symptom Highlights (last 30 days)") {
            if topSymptoms.isEmpty {
                Text("No symptoms logged in the last 30 days.")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(topSymptoms, id: \.symptom) { item in
                        Text("\(displayName(for: item.symptom)) · \(item.count)×")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(HeleneTheme.sageFill, in: Capsule())
                            .environment(\.colorScheme, .light)
                    }
                }
            }
        }
    }

    // MARK: - Wellbeing Averages

    private var wellbeingAverages: some View {
        ReportCard(title: "Wellbeing — Last 30 Days") {
            VStack(spacing: 10) {
                WellbeingAvgRow(label: "Mood",   icon: "face.smiling",
                                value: avgMood,  prev: Double(prevEntries.map { $0.mood }.reduce(0, +)) / Double(max(prevEntries.count, 1)), unit: "/5")
                if avgSleep  > 0 { WellbeingAvgRow(label: "Sleep",  icon: "moon.fill",  value: avgSleep,  prev: prevSleep,  unit: "/5") }
                if avgEnergy > 0 { WellbeingAvgRow(label: "Energy", icon: "bolt.fill",  value: avgEnergy, prev: prevEnergy, unit: "/5") }
                if avgStress > 0 { WellbeingAvgRow(label: "Stress", icon: "wind",       value: avgStress, prev: prevStress, unit: "/5 (5=calm)") }
            }
        }
    }

    // MARK: - MRS Score

    private var mrsScoreSection: some View {
        guard let latest = mrsEntries.first else { return AnyView(EmptyView()) }
        return AnyView(
            ReportCard(title: "Menopause Rating Scale") {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("\(latest.totalScore)")
                            .font(.system(size: 34, weight: .bold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        Text("/ 44")
                            .font(.system(size: 14))
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                        Spacer()
                        Text(latest.severityLabel)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(mrsSeverityColor(latest.totalScore), in: Capsule())
                            .environment(\.colorScheme, .light)
                    }
                    MRSDomainMiniBar(label: "Body",      score: latest.somaticScore,      max: 16, fill: HeleneTheme.peachFill)
                    MRSDomainMiniBar(label: "Emotional", score: latest.psychologicalScore, max: 16, fill: HeleneTheme.lavenderFill)
                    MRSDomainMiniBar(label: "Intimate",  score: latest.urogenitalScore,    max: 12, fill: HeleneTheme.sageFill)
                }
            }
        )
    }

    private func mrsSeverityColor(_ score: Int) -> Color {
        switch score {
        case 0...4:  return HeleneTheme.sageFill
        case 5...8:  return HeleneTheme.marigoldFill
        case 9...15: return HeleneTheme.peachFill
        default:     return HeleneTheme.rose.opacity(0.3)
        }
    }

    // MARK: - Treatment Changes

    private var treatmentChangesSection: some View {
        let df = DateFormatter(); df.dateStyle = .medium
        let recent = Array(treatments.prefix(5))
        return ReportCard(title: "Treatment & Lifestyle Changes") {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(recent) { t in
                    HStack(alignment: .top, spacing: 8) {
                        Text("•")
                            .font(.system(size: 13))
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(t.status.capitalized): \(t.name)")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            Text(df.string(from: t.date))
                                .font(.caption)
                                .foregroundStyle(HeleneTheme.Colors.textLight)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Doctor Questions

    private var doctorQuestionsSection: some View {
        ReportCard(title: "Questions for Your Doctor") {
            VStack(alignment: .leading, spacing: 10) {
                Text("Generated from your data")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
                    .padding(.bottom, 2)
                ForEach(smartQuestions, id: \.self) { q in
                    HStack(alignment: .top, spacing: 8) {
                        Text("→")
                            .font(.system(size: 13))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                        Text(q)
                            .font(.system(size: 14))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .lineSpacing(2)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    // MARK: - Share Button (PDF export)

    @State private var showShareSheet = false

    private var shareButton: some View {
        Button {
            showShareSheet = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "arrow.up.doc")
                    .font(.system(size: 15, weight: .semibold))
                Text("Export as PDF")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(HeleneTheme.Colors.dark,
                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showShareSheet) {
            if let url = makePDF() {
                ShareSheet(items: [url])
            }
        }
    }

    // MARK: - PDF Generation

    private func makePDF() -> URL? {
        let pageW:  CGFloat = 595.2
        let pageH:  CGFloat = 841.8
        let margin: CGFloat = 44
        let contentW = pageW - margin * 2

        let reportText = generateReport()
        let para = NSMutableParagraphStyle()
        para.lineSpacing = 2
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.monospacedSystemFont(ofSize: 9.5, weight: .regular),
            .foregroundColor: UIColor.black,
            .paragraphStyle: para
        ]
        let attrStr = NSAttributedString(string: reportText, attributes: attrs)
        let framesetter = CTFramesetterCreateWithAttributedString(attrStr)

        let pdfRenderer = UIGraphicsPDFRenderer(
            bounds: CGRect(x: 0, y: 0, width: pageW, height: pageH)
        )
        let data = pdfRenderer.pdfData { ctx in
            var charIndex: CFIndex = 0
            let totalChars = CFAttributedStringGetLength(attrStr)
            while charIndex < totalChars {
                ctx.beginPage()
                let cgCtx = ctx.cgContext
                cgCtx.saveGState()
                cgCtx.translateBy(x: 0, y: pageH)
                cgCtx.scaleBy(x: 1, y: -1)
                let pageBounds = CGRect(x: margin, y: margin,
                                        width: contentW, height: pageH - margin * 2)
                let path = CGPath(rect: pageBounds, transform: nil)
                let frame = CTFramesetterCreateFrame(
                    framesetter, CFRangeMake(charIndex, 0), path, nil
                )
                CTFrameDraw(frame, cgCtx)
                cgCtx.restoreGState()
                let visible = CTFrameGetVisibleStringRange(frame)
                if visible.length == 0 { break }
                charIndex += visible.length
            }
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("HeleneHealthSummary.pdf")
        try? data.write(to: url)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    // MARK: - Report Generation

    func generateReport() -> String {
        let df = DateFormatter(); df.dateStyle = .medium; df.timeStyle = .none

        func avg(_ values: [Int]) -> String {
            guard !values.isEmpty else { return "—" }
            return String(format: "%.1f/5", Double(values.reduce(0, +)) / Double(values.count))
        }

        let moods   = recentEntries.map { $0.mood }
        let sleeps  = recentEntries.filter { $0.sleepQuality > 0 }.map { $0.sleepQuality }
        let energys = recentEntries.filter { $0.energyLevel  > 0 }.map { $0.energyLevel  }
        let stresss = recentEntries.filter { $0.stressLevel  > 0 }.map { $0.stressLevel  }

        let symText = topSymptoms.map { "  • \(displayName(for: $0.symptom)) (\($0.count)×)" }.joined(separator: "\n")

        let log = entries.prefix(14).map { e -> String in
            let sym = e.symptoms.isEmpty ? "none" : e.symptoms.map { displayName(for: $0) }.joined(separator: ", ")
            var line = "  \(df.string(from: e.date)): Mood \(e.mood)/5"
            if e.sleepQuality > 0 { line += ", Sleep \(e.sleepQuality)/5" }
            if e.energyLevel  > 0 { line += ", Energy \(e.energyLevel)/5" }
            if e.stressLevel  > 0 { line += ", Stress \(e.stressLevel)/5" }
            if !sym.isEmpty && sym != "none" { line += "\n    Symptoms: \(sym)" }
            if !e.note.isEmpty { line += "\n    Note: \(e.note)" }
            return line
        }.joined(separator: "\n")

        let mrsSection: String
        if let latest = mrsEntries.first {
            mrsSection = """

── MRS WELLBEING SCORE ─────────────────────────
Latest score:   \(latest.totalScore)/44 (\(latest.severityLabel))
Body domain:    \(latest.somaticScore)/16
Emotional:      \(latest.psychologicalScore)/16
Intimate:       \(latest.urogenitalScore)/12
"""
        } else { mrsSection = "" }

        let txSection: String
        if !treatments.isEmpty {
            let rows = treatments.prefix(5).map { t -> String in
                "  • \(t.status.capitalized): \(t.name) (\(df.string(from: t.date)))"
            }.joined(separator: "\n")
            txSection = """

── TREATMENT & LIFESTYLE CHANGES ───────────────
\(rows)
"""
        } else { txSection = "" }

        let qSection = smartQuestions.map { "  → \($0)" }.joined(separator: "\n")

        return """
╔══════════════════════════════════════════════╗
║          HELENE — HEALTH SUMMARY             ║
╚══════════════════════════════════════════════╝
Generated: \(df.string(from: Date()))

── PATIENT ─────────────────────────────────────
Name:             \(profile.firstName.isEmpty ? "—" : profile.firstName)
Menopause stage:  \(profile.journeyStage.isEmpty ? "—" : profile.journeyStage)
Age range:        \(profile.ageRange.isEmpty ? "—" : profile.ageRange)
Primary concern:  \(profile.primaryGoal.isEmpty ? "—" : profile.primaryGoal)

── CHECK-IN OVERVIEW ───────────────────────────
Total check-ins:  \(totalCheckIns)
Last 30 days:     \(recentEntries.count) check-ins

Avg mood:         \(avg(moods))
Avg sleep:        \(avg(sleeps)) (when logged)
Avg energy:       \(avg(energys)) (when logged)
Avg stress:       \(avg(stresss)) (when logged, 5=Calm)

── TOP SYMPTOMS (last 30 days) ─────────────────
\(symText.isEmpty ? "None logged" : symText)
\(mrsSection)
\(txSection)

── QUESTIONS FOR DOCTOR ────────────────────────
\(qSection)

── RECENT CHECK-IN LOG (last 14 entries) ───────
\(log.isEmpty ? "No entries yet" : log)

───────────────────────────────────────────────
Generated by Helene. Always consult a qualified
healthcare provider before making medical decisions.
"""
    }

    // MARK: - Label Helper

    private func displayName(for id: String) -> String {
        let map = [
            "sleep": "Sleep problems", "anxiety": "Anxiety",
            "fatigue": "Fatigue", "hotflashes": "Hot flashes",
            "brainfog": "Brain fog", "moodswings": "Mood swings",
            "weight": "Weight changes", "jointpain": "Joint pain"
        ]
        return map[id] ?? id
    }
}

// MARK: - Share Sheet

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ uvc: UIActivityViewController, context: Context) {}
}

// MARK: - Report Card

private struct ReportCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .textCase(.uppercase)
                .tracking(0.8)
            content()
        }
        .padding(HeleneTheme.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }
}

// MARK: - Stat Pill

private struct StatPill: View {
    let value: String
    let label: String
    let fill:  Color

    var body: some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(fill, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
        .environment(\.colorScheme, .light)
    }
}

// MARK: - Wellbeing Avg Row

private struct WellbeingAvgRow: View {
    let label: String
    let icon:  String
    let value: Double
    let prev:  Double
    let unit:  String

    private var isImproving: Bool { value > prev + 0.1 }
    private var isDeclining: Bool { value < prev - 0.1 }

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .frame(width: 16)
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .frame(width: 60, alignment: .leading)
            Spacer()
            if value > 0 {
                Text(String(format: "%.1f\(unit)", value))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                if prev > 0 {
                    if isImproving {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(HeleneTheme.sageFill)
                    } else if isDeclining {
                        Image(systemName: "arrow.down")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(HeleneTheme.peachFill)
                    }
                }
            } else {
                Text("—")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            }
        }
    }
}

// MARK: - MRS Domain Mini Bar (local copy)

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
                    Capsule().fill(HeleneTheme.Colors.background).frame(height: 6)
                    Capsule().fill(fill)
                        .frame(width: Swift.max(geo.size.width * fraction, fraction > 0 ? 6 : 0), height: 6)
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

#Preview {
    DoctorReportView()
        .environment(UserProfile())
        .modelContainer(for: [CheckInEntry.self, MRSEntry.self, TreatmentEntry.self], inMemory: true)
}
