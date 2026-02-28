import SwiftUI
import SwiftData

struct HomeView: View {

    @Environment(UserProfile.self) private var profile
    @Environment(\.modelContext) private var context
    @Query private var allEntries: [CheckInEntry]
    @Query(sort: \MRSEntry.date,        order: .reverse) private var mrsEntries:   [MRSEntry]
    @Query(sort: \TreatmentEntry.date,  order: .reverse) private var treatments:   [TreatmentEntry]

    @State private var showCheckIn       = false
    @State private var showSettings      = false
    @State private var showAssessment    = false
    @State private var showCalm          = false
    @State private var showDoctorReport  = false
    @State private var showTreatmentLog  = false
    @State private var editEntry:        CheckInEntry? = nil

    private var todayEntry: CheckInEntry? { allEntries.first { $0.isToday } }

    /// True when the account is at least 7 days old and no MRS entry exists this week
    private var assessmentDue: Bool {
        let oneWeekAfter = Calendar.current.date(byAdding: .day, value: 7, to: profile.accountCreatedAt) ?? profile.accountCreatedAt
        guard Date() >= oneWeekAfter else { return false }
        return !mrsEntries.contains { $0.isThisWeek }
    }

    private var formattedDate: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        return f.string(from: Date())
    }

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 22) {
                        header
                        if let entry = todayEntry { todaySummary(entry) }
                        else { checkInPrompt }
                        if assessmentDue { weeklyAssessmentPrompt }
                        quickActionsSection
                        forYouSection
                        Spacer(minLength: 100)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.lg)
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(for: Article.self) { ArticleView(article: $0) }
        }
        .sheet(isPresented: $showCheckIn) { DailyCheckInView() }
        .sheet(item: $editEntry) { entry in DailyCheckInView(existingEntry: entry) }
        .sheet(isPresented: $showSettings) { ProfileSettingsView() }
        .sheet(isPresented: $showAssessment) { WeeklyAssessmentView() }
        .sheet(isPresented: $showCalm) { CalmToolsView() }
        .sheet(isPresented: $showDoctorReport) { DoctorReportView() }
        .sheet(isPresented: $showTreatmentLog) { TreatmentLogView() }
    }

    // MARK: - Header

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text(formattedDate)
                    .font(.subheadline)
                    .foregroundStyle(HeleneTheme.Colors.textSecond)

                // Mixed-weight heading
                Text(profile.firstName.isEmpty ? "Hello." : "Hello, \(profile.firstName).")
                    .font(.system(size: 28, weight: .regular))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("How do you \(Text("feel today?").bold())")
                    .font(.system(size: 28, weight: .regular))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }

            Spacer()

            Button { showSettings = true } label: {
                ZStack {
                    Circle()
                        .fill(HeleneTheme.Colors.surface)
                        .frame(width: 42, height: 42)
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                }
            }
        }
    }

    // MARK: - Weekly Assessment Prompt

    private var weeklyAssessmentPrompt: some View {
        Button { showAssessment = true } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium)
                        .fill(HeleneTheme.marigoldFill)
                        .frame(width: 42, height: 42)
                    Image(systemName: "checklist.checked")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                }
                .environment(\.colorScheme, .light)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Weekly check-up ready")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text("11 questions · ~3 min · tracks your MRS score")
                        .font(.system(size: 12))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }

                Spacer()

                ZStack {
                    Circle()
                        .fill(HeleneTheme.Colors.dark)
                        .frame(width: 32, height: 32)
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(HeleneTheme.Colors.surface,
                         in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Check-in Prompt

    @ViewBuilder
    private var checkInPrompt: some View {
        if todayEntry == nil {
            Button { showCheckIn = true } label: {
                HStack {
                    Text("Your reflection...")
                        .font(.system(size: 16))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                    Spacer()
                    ZStack {
                        Circle()
                            .fill(HeleneTheme.Colors.dark)
                            .frame(width: 36, height: 36)
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .background(HeleneTheme.Colors.surface,
                             in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Today's Log

    private func todaySummary(_ entry: CheckInEntry) -> some View {
        let hasDetails = !entry.symptoms.isEmpty || !entry.triggers.isEmpty || !entry.note.isEmpty

        return VStack(spacing: 0) {

            // ── HERO ZONE ──
            ZStack(alignment: .bottomTrailing) {

                // Mood-responsive base fill
                moodFill(for: entry.mood)

                // Depth: subtle top-left → bottom-right gradient
                LinearGradient(
                    colors: [.white.opacity(0.0), .white.opacity(0.22)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                // Watermark icon — ultraLight, partially cropped at corner
                Image(systemName: moodIcon(for: entry.mood))
                    .font(.system(size: 110, weight: .ultraLight))
                    .foregroundStyle(.white.opacity(0.35))
                    .offset(x: 10, y: 10)

                // Foreground content
                VStack(alignment: .leading, spacing: 14) {

                    // Header row
                    HStack {
                        HStack(spacing: 5) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 11))
                            Text("Today's check-in")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundStyle(HeleneTheme.Colors.textPrimary.opacity(0.45))
                        Spacer()
                        Button { editEntry = entry } label: {
                            HStack(spacing: 3) {
                                Image(systemName: "pencil")
                                    .font(.system(size: 10, weight: .medium))
                                Text("Edit")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundStyle(HeleneTheme.Colors.textPrimary.opacity(0.65))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(.white.opacity(0.45), in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }

                    // Icon + mood label + description
                    HStack(alignment: .center, spacing: 14) {
                        ZStack {
                            Circle()
                                .fill(.white.opacity(0.38))
                                .frame(width: 56, height: 56)
                            Image(systemName: moodIcon(for: entry.mood))
                                .font(.system(size: 24, weight: .medium))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary.opacity(0.75))
                        }

                        VStack(alignment: .leading, spacing: 3) {
                            Text(entry.moodLabel)
                                .font(.system(size: 21, weight: .bold))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            Text(moodDescription(for: entry.mood))
                                .font(.system(size: 12))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary.opacity(0.5))
                        }
                    }

                    // Wellbeing badges
                    if entry.sleepQuality > 0 || entry.energyLevel > 0 || entry.stressLevel > 0 {
                        HStack(spacing: 6) {
                            if entry.sleepQuality > 0 {
                                WellbeingBadge(icon: "moon.fill", value: entry.sleepQuality)
                            }
                            if entry.energyLevel > 0 {
                                WellbeingBadge(icon: "bolt.fill", value: entry.energyLevel)
                            }
                            if entry.stressLevel > 0 {
                                WellbeingBadge(icon: "wind", value: entry.stressLevel)
                            }
                        }
                    }
                }
                .padding(18)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .clipped()
            .environment(\.colorScheme, .light)

            // Hairline zone separator in mood color
            if hasDetails {
                moodFill(for: entry.mood)
                    .opacity(0.4)
                    .frame(height: 1)
                    .environment(\.colorScheme, .light)
            }

            // ── DETAIL ZONE ──
            if hasDetails {
                VStack(alignment: .leading, spacing: 10) {

                    if !entry.symptoms.isEmpty {
                        FlowLayout(spacing: 5) {
                            ForEach(entry.symptoms, id: \.self) { s in
                                Text(symptomLabel(for: s))
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(HeleneTheme.sageFill, in: Capsule())
                                    .environment(\.colorScheme, .light)
                            }
                        }
                    }

                    if !entry.triggers.isEmpty {
                        FlowLayout(spacing: 5) {
                            ForEach(entry.triggers, id: \.self) { t in
                                Text(triggerLabel(for: t))
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(HeleneTheme.marigoldFill, in: Capsule())
                                    .environment(\.colorScheme, .light)
                            }
                        }
                    }

                    if !entry.note.isEmpty {
                        Text("\u{201C}\(entry.note)\u{201D}")
                            .font(.system(size: 13).italic())
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .lineLimit(2)
                            .lineSpacing(3)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(HeleneTheme.Colors.surface)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    private func moodIcon(for level: Int) -> String {
        switch level {
        case 5: return "sun.max.fill"
        case 4: return "cloud.sun.fill"
        case 3: return "cloud.fill"
        case 2: return "cloud.drizzle.fill"
        default: return "cloud.rain.fill"
        }
    }

    private func moodFill(for level: Int) -> Color {
        switch level {
        case 5: return HeleneTheme.mintFill
        case 4: return HeleneTheme.lavenderFill
        case 3: return HeleneTheme.marigoldFill
        case 2: return HeleneTheme.peachFill
        default: return HeleneTheme.peachFill
        }
    }

    private func moodDescription(for level: Int) -> String {
        switch level {
        case 5: return "Feeling great today"
        case 4: return "Having a good day"
        case 3: return "Getting through the day"
        case 2: return "A challenging day"
        case 1: return "A tough day — you're not alone"
        default: return ""
        }
    }

    private func symptomLabel(for id: String) -> String {
        let map = [
            "sleep": "Sleep problems", "anxiety": "Anxiety",
            "fatigue": "Fatigue", "hotflashes": "Hot flashes",
            "brainfog": "Brain fog", "moodswings": "Mood swings",
            "weight": "Weight changes", "jointpain": "Joint pain"
        ]
        return map[id] ?? id
    }

    private func triggerLabel(for id: String) -> String {
        let map = [
            "coffee": "Caffeine", "alcohol": "Alcohol",
            "exercise": "Exercise", "workstress": "Work stress",
            "medication": "Medication", "outdoor": "Outdoors",
            "social": "Social", "disruptedsleep": "Poor sleep"
        ]
        return map[id] ?? id
    }

    // MARK: - For You

    private var forYouSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("For you")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            // Two-column article cards
            HStack(spacing: 12) {
                NavigationLink(value: Article.understandingYourBody) {
                    ForYouCard(title: "Understanding\nyour body",
                               subtitle: "Learn what's happening",
                               fill: HeleneTheme.lavenderFill) { BodyIllustration() }
                }
                .buttonStyle(.plain)
                NavigationLink(value: Article.trackYourPatterns) {
                    ForYouCard(title: "Track your\npatterns",
                               subtitle: "Spot what changes",
                               fill: HeleneTheme.marigoldFill) { WaveIllustration() }
                }
                .buttonStyle(.plain)
            }

            // Full-width article card
            NavigationLink(value: Article.sleepAndMenopause) {
                ForYouCard(title: "Sleep disruption\naffects 68% of us",
                           subtitle: "Did you know? Tap to learn more",
                           fill: HeleneTheme.sageFill) { MoonIllustration() }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        VStack(spacing: 12) {
            treatmentSection

            HStack(spacing: 12) {
                Button { showCalm = true } label: {
                    ActionCard(title: "Quick calm\ntools",
                               subtitle: "Breathing · 1–5 min",
                               fill: HeleneTheme.peachFill,
                               icon: "wind")
                }
                .buttonStyle(.plain)

                Button { showDoctorReport = true } label: {
                    ActionCard(title: "Prepare for\nyour doctor",
                               subtitle: "Generate health report",
                               fill: HeleneTheme.mintFill,
                               icon: "stethoscope")
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Treatment Section

    private var treatmentSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Treatments & Changes")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Spacer()
                Button { showTreatmentLog = true } label: {
                    ZStack {
                        Circle()
                            .fill(HeleneTheme.Colors.dark)
                            .frame(width: 32, height: 32)
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .buttonStyle(.plain)
            }

            if treatments.isEmpty {
                Text("Tap + to log your first treatment or lifestyle change.")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
                    .lineSpacing(3)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(treatments.prefix(8).enumerated()), id: \.element.id) { idx, t in
                        if idx > 0 { Divider().padding(.horizontal, 4) }
                        HomeTreatmentRow(entry: t) {
                            context.delete(t)
                        }
                    }
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface,
                    in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

}

// MARK: - Wellbeing Badge

private struct WellbeingBadge: View {
    let icon:  String
    let value: Int

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .medium))
            Text("\(value)/5")
                .font(.system(size: 11, weight: .semibold))
        }
        .foregroundStyle(HeleneTheme.Colors.textPrimary.opacity(0.7))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.white.opacity(0.4), in: Capsule())
    }
}

// MARK: - Article Card (illustration + text zone)

private struct ForYouCard<I: View>: View {
    let title:      String
    let subtitle:   String
    let fill:       Color
    @ViewBuilder let illustration: () -> I

    var body: some View {
        VStack(spacing: 0) {

            // Illustration zone
            ZStack {
                fill
                LinearGradient(colors: [.white.opacity(0.0), .white.opacity(0.18)],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
                illustration()
            }
            .frame(maxWidth: .infinity)
            .frame(height: 130)
            .clipped()

            // Text zone
            HStack(alignment: .center, spacing: 8) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .lineLimit(1)
                }
                Spacer(minLength: 4)
                ZStack {
                    Circle().fill(HeleneTheme.Colors.background).frame(width: 26, height: 26)
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                }
            }
            .padding(13)
            .background(HeleneTheme.Colors.surface)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
        .environment(\.colorScheme, .light)
    }
}

// MARK: - Action Card (original design — icon top-left, text bottom)

private struct ActionCard: View {
    let title:    String
    let subtitle: String
    let fill:     Color
    let icon:     String

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: HeleneTheme.Radius.card).fill(fill)

            ZStack {
                Circle().fill(.white.opacity(0.15)).frame(width: 48, height: 48)
                Circle().strokeBorder(.white.opacity(0.5), lineWidth: 1.5).frame(width: 48, height: 48)
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(.white.opacity(0.9))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(10)

            ZStack {
                Circle().fill(.white.opacity(0.35)).frame(width: 30, height: 30)
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
            .padding(10)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(8)
        }
        .frame(height: 175)
        .frame(maxWidth: .infinity)
        .environment(\.colorScheme, .light)
    }
}

// MARK: - Article Illustrations

/// Concentric rings — body awareness / self-knowledge
private struct BodyIllustration: View {
    var body: some View {
        Canvas { ctx, size in
            let cx = size.width / 2, cy = size.height / 2

            // Concentric rings (outermost to innermost)
            for (r, o, lw): (CGFloat, Double, CGFloat) in [(50, 0.12, 1.0), (36, 0.20, 1.5), (22, 0.30, 2.0)] {
                ctx.stroke(Path(ellipseIn: CGRect(x: cx-r, y: cy-r, width: r*2, height: r*2)),
                           with: .color(.white.opacity(o)),
                           style: StrokeStyle(lineWidth: lw))
            }
            // Centre dot
            let cr: CGFloat = 6
            ctx.fill(Path(ellipseIn: CGRect(x: cx-cr, y: cy-cr, width: cr*2, height: cr*2)),
                     with: .color(.white.opacity(0.55)))

            // Floating particles
            for (dx, dy, r, o): (CGFloat, CGFloat, CGFloat, Double) in [
                (36, -26, 2.5, 0.55), (-32, 18, 2.0, 0.40),
                (-24, -32, 3.0, 0.45), (28, 28, 2.0, 0.30)
            ] {
                ctx.fill(Path(ellipseIn: CGRect(x: cx+dx-r, y: cy+dy-r, width: r*2, height: r*2)),
                         with: .color(.white.opacity(o)))
            }
        }
    }
}

/// Flowing wave lines — mood / pattern tracking
private struct WaveIllustration: View {
    var body: some View {
        Canvas { ctx, size in
            let waves: [(y: Double, amp: Double, freq: Double, phase: Double, opacity: Double)] = [
                (0.30, 0.13, 5.5, 0.0, 0.55),
                (0.52, 0.10, 5.0, 0.8, 0.40),
                (0.72, 0.07, 6.0, 1.6, 0.28)
            ]
            for w in waves {
                var path = Path()
                let yc = size.height * w.y
                path.move(to: CGPoint(x: 0, y: yc))
                var x = 0.0
                while x <= size.width {
                    let y = yc + sin(x / size.width * .pi * w.freq + w.phase) * size.height * w.amp
                    path.addLine(to: CGPoint(x: x, y: y))
                    x += 2
                }
                ctx.stroke(path, with: .color(.white.opacity(w.opacity)),
                           style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
            }
            // Peak dots
            for (xr, yr, r, o): (Double, Double, CGFloat, Double) in [
                (0.17, 0.19, 3.5, 0.80), (0.50, 0.24, 3.0, 0.70),
                (0.72, 0.38, 3.5, 0.65), (0.35, 0.60, 3.0, 0.55)
            ] {
                ctx.fill(Path(ellipseIn: CGRect(x: xr*size.width - r, y: yr*size.height - r,
                                               width: r*2, height: r*2)),
                         with: .color(.white.opacity(o)))
            }
        }
    }
}

/// Crescent moon + stars — sleep
private struct MoonIllustration: View {
    var body: some View {
        Canvas { ctx, size in
            let cx = size.width / 2, cy = size.height / 2

            // Stars
            for (dx, dy, r, o): (CGFloat, CGFloat, CGFloat, Double) in [
                (-30, -24, 2.0, 0.80), (28, -32, 1.5, 0.60),
                (32,  10,  2.5, 0.70), (-34, 14, 1.5, 0.50),
                (8,   34,  2.0, 0.60), (-18, 28, 1.5, 0.40)
            ] {
                ctx.fill(Path(ellipseIn: CGRect(x: cx+dx-r, y: cy+dy-r, width: r*2, height: r*2)),
                         with: .color(.white.opacity(o)))
            }

            // Crescent moon via even-odd fill
            let mr: CGFloat = 22, or_: CGFloat = 19
            var moon = Path()
            moon.addEllipse(in: CGRect(x: cx-6-mr, y: cy-mr,   width: mr*2, height: mr*2))
            moon.addEllipse(in: CGRect(x: cx-6-mr+13, y: cy-mr-8, width: or_*2, height: or_*2))
            ctx.fill(moon, with: .color(.white.opacity(0.65)), style: FillStyle(eoFill: true))
        }
    }
}

// MARK: - Home Treatment Row

private struct HomeTreatmentRow: View {
    let entry:    TreatmentEntry
    let onDelete: () -> Void

    @State private var confirmDelete = false

    private var statusColor: Color {
        switch entry.status {
        case "started":  return HeleneTheme.sageFill
        case "stopped":  return HeleneTheme.peachFill
        case "adjusted": return HeleneTheme.marigoldFill
        case "paused":   return HeleneTheme.lavenderFill
        default:         return HeleneTheme.Colors.surface
        }
    }

    private var formattedDate: String {
        let df = DateFormatter(); df.dateStyle = .medium
        return df.string(from: entry.date)
    }

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text(formattedDate)
                    .font(.system(size: 11))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            Spacer()
            Text(entry.status.capitalized)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .padding(.horizontal, 9)
                .padding(.vertical, 4)
                .background(statusColor, in: Capsule())
                .environment(\.colorScheme, .light)
            Button {
                confirmDelete = true
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 13))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 10)
        .confirmationDialog("Delete this entry?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { onDelete() }
            Button("Cancel", role: .cancel) {}
        }
    }
}

#Preview {
    HomeView()
        .environment(UserProfile())
        .modelContainer(for: CheckInEntry.self, inMemory: true)
}
