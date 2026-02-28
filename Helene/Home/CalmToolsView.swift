import SwiftUI

// MARK: - Data Structs

private struct BreathPhase: Hashable {
    let label:   String
    let seconds: Double
    let scale:   CGFloat
}

private struct BreathExercise: Identifiable, Hashable {
    let id        = UUID()
    let name:      String
    let tagline:   String
    let detail:    String
    let duration:  String
    let fillIndex: Int          // index into exerciseFills
    let phases:    [BreathPhase]
    let cycles:    Int
}

private let exerciseFills: [Color] = [
    HeleneTheme.lavenderFill,
    HeleneTheme.peachFill,
    HeleneTheme.mintFill
]

private let exercises: [BreathExercise] = [
    BreathExercise(
        name:      "Physiological Sigh",
        tagline:   "Fastest stress reset",
        detail:    "Two quick inhales through the nose, one long exhale. Shown by Stanford research to lower stress faster than any other technique.",
        duration:  "1.5 min",
        fillIndex: 0,
        phases: [
            BreathPhase(label: "Inhale",      seconds: 3.5, scale: 1.5),
            BreathPhase(label: "2nd inhale",  seconds: 1.5, scale: 1.7),
            BreathPhase(label: "Long exhale", seconds: 8.0, scale: 1.0)
        ],
        cycles: 4
    ),
    BreathExercise(
        name:      "Box Breathing",
        tagline:   "Focus & calm",
        detail:    "Equal counts of inhale, hold, exhale, hold. Balances the nervous system and sharpens focus — used by high-performance athletes.",
        duration:  "5 min",
        fillIndex: 1,
        phases: [
            BreathPhase(label: "Inhale", seconds: 4, scale: 1.5),
            BreathPhase(label: "Hold",   seconds: 4, scale: 1.5),
            BreathPhase(label: "Exhale", seconds: 4, scale: 1.0),
            BreathPhase(label: "Hold",   seconds: 4, scale: 1.0)
        ],
        cycles: 5
    ),
    BreathExercise(
        name:      "4-7-8 Breathing",
        tagline:   "Wind down for sleep",
        detail:    "Extended exhale activates the parasympathetic system. Ideal for winding down before bed or during a night waking.",
        duration:  "5 min",
        fillIndex: 2,
        phases: [
            BreathPhase(label: "Inhale", seconds: 4, scale: 1.5),
            BreathPhase(label: "Hold",   seconds: 7, scale: 1.5),
            BreathPhase(label: "Exhale", seconds: 8, scale: 1.0)
        ],
        cycles: 3
    )
]

// MARK: - Main View

struct CalmToolsView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var activeExercise: BreathExercise? = nil

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {

                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Calm tools")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            Text("Science-backed breathing exercises. Choose one and follow the guide — your body will do the rest.")
                                .font(.system(size: 14))
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                                .lineSpacing(3)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.top, 4)

                        ForEach(exercises) { exercise in
                            Button { activeExercise = exercise } label: {
                                ExerciseCard(exercise: exercise)
                            }
                            .buttonStyle(.plain)
                        }

                        Spacer(minLength: 60)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.md)
                }
            }
            .navigationBarHidden(true)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
            }
            .navigationDestination(item: $activeExercise) { ex in
                ActiveExerciseView(exercise: ex)
            }
        }
    }
}

// MARK: - Exercise Card

private struct ExerciseCard: View {
    let exercise: BreathExercise

    private var fill: Color { exerciseFills[exercise.fillIndex] }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            RoundedRectangle(cornerRadius: HeleneTheme.Radius.card).fill(fill)

            // Decorative rings — top right
            ZStack {
                Circle()
                    .stroke(.white.opacity(0.3), lineWidth: 1)
                    .frame(width: 110, height: 110)
                    .offset(x: 36, y: -36)
                Circle()
                    .fill(.white.opacity(0.15))
                    .frame(width: 64, height: 64)
                    .offset(x: 12, y: -56)
                Circle()
                    .fill(.white.opacity(0.22))
                    .frame(width: 36, height: 36)
                    .offset(x: 44, y: -10)
            }
            .clipped()

            // Content
            VStack(alignment: .leading, spacing: 0) {
                // Duration + arrow row
                HStack {
                    Text(exercise.duration)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(.white.opacity(0.55), in: Capsule())

                    Spacer()

                    ZStack {
                        Circle().fill(.white.opacity(0.55)).frame(width: 30, height: 30)
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    }
                }

                Spacer()

                VStack(alignment: .leading, spacing: 5) {
                    Text(exercise.name)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text(exercise.tagline)
                        .font(.system(size: 13))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
            }
            .padding(18)
        }
        .frame(height: 148)
        .clipped()
        .environment(\.colorScheme, .light)
    }
}

// MARK: - Active Exercise View

private struct ActiveExerciseView: View {

    let exercise: BreathExercise

    @Environment(\.dismiss) private var dismiss

    @State private var phaseIndex:  Int     = 0
    @State private var cycleCount:  Int     = 1
    @State private var circleScale: CGFloat = 1.0
    @State private var countdown:   Double  = 0
    @State private var isComplete:  Bool    = false
    @State private var timer: Timer?        = nil

    private var currentPhase: BreathPhase { exercise.phases[phaseIndex] }
    private var fill: Color { exerciseFills[exercise.fillIndex] }

    var body: some View {
        ZStack {
            HeleneTheme.Colors.background.ignoresSafeArea()
            // Subtle tint from exercise color
            fill.opacity(0.10).ignoresSafeArea()

            if isComplete {
                completionScreen
            } else {
                activeScreen
            }
        }
        .navigationBarBackButtonHidden(true)
        .onAppear { startPhase() }
        .onDisappear { timer?.invalidate() }
    }

    // MARK: Active Screen

    private var activeScreen: some View {
        VStack(spacing: 0) {
            // Top bar
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(exercise.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text("Cycle \(cycleCount) of \(exercise.cycles)")
                        .font(.system(size: 12))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
                Spacer()
                Button { dismiss() } label: {
                    ZStack {
                        Circle()
                            .fill(HeleneTheme.Colors.surface)
                            .frame(width: 34, height: 34)
                        Image(systemName: "xmark")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                    }
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)
            .padding(.top, 20)

            Spacer()

            // Breathing circle
            ZStack {
                // Outer glow ring
                Circle()
                    .fill(fill.opacity(0.18))
                    .frame(width: 260, height: 260)
                    .scaleEffect(circleScale * 0.88)

                // Mid ring
                Circle()
                    .fill(fill.opacity(0.35))
                    .frame(width: 230, height: 230)
                    .scaleEffect(circleScale * 0.94)

                // Main filled circle
                Circle()
                    .fill(fill)
                    .frame(width: 200, height: 200)
                    .scaleEffect(circleScale)

                // Labels inside
                VStack(spacing: 8) {
                    Text(currentPhase.label)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text("\(Int(ceil(countdown)))s")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .monospacedDigit()
                }
                .environment(\.colorScheme, .light)
            }
            .animation(.easeInOut(duration: currentPhase.seconds), value: circleScale)

            Spacer().frame(height: 44)

            // Phase progress — animated pill dots
            HStack(spacing: 7) {
                ForEach(0..<exercise.phases.count, id: \.self) { i in
                    Capsule()
                        .fill(i == phaseIndex ? HeleneTheme.Colors.dark : HeleneTheme.Colors.separator)
                        .frame(width: i == phaseIndex ? 22 : 6, height: 6)
                        .animation(.easeInOut(duration: 0.25), value: phaseIndex)
                }
            }

            Spacer()
        }
    }

    // MARK: Completion Screen

    private var completionScreen: some View {
        VStack(spacing: 0) {
            Spacer()

            ZStack {
                Circle()
                    .fill(fill.opacity(0.25))
                    .frame(width: 130, height: 130)
                Circle()
                    .fill(fill)
                    .frame(width: 84, height: 84)
                Image(systemName: "checkmark")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }

            Spacer().frame(height: 32)

            VStack(spacing: 8) {
                Text("Well done")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("You completed \(exercise.cycles) cycles of \(exercise.name).\nYour nervous system thanks you.")
                    .font(.system(size: 15))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }

            Spacer()

            Button { dismiss() } label: {
                Text("Done")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(HeleneTheme.Colors.dark,
                                in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, HeleneTheme.Spacing.lg)
            .padding(.bottom, 48)
        }
        .padding(.horizontal, HeleneTheme.Spacing.lg)
    }

    // MARK: - Timer Logic

    private func startPhase() {
        timer?.invalidate()
        let phase = exercise.phases[phaseIndex]
        countdown = phase.seconds

        withAnimation(.easeInOut(duration: phase.seconds)) {
            circleScale = phase.scale
        }

        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { t in
            countdown -= 0.1
            if countdown <= 0 {
                t.invalidate()
                advancePhase()
            }
        }
    }

    private func advancePhase() {
        let next = phaseIndex + 1
        if next >= exercise.phases.count {
            if cycleCount >= exercise.cycles {
                withAnimation { isComplete = true }
                return
            }
            phaseIndex = 0
            cycleCount += 1
        } else {
            phaseIndex = next
        }
        startPhase()
    }
}

#Preview {
    CalmToolsView()
}
