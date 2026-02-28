import SwiftUI

struct OnboardingView: View {

    @Environment(AuthManager.self)  private var authManager
    @Environment(UserProfile.self)  private var profile

    // Local state — never pre-filled from profile
    @State private var journeyStage       = ""
    @State private var ageRange           = ""
    @State private var selectedSymptoms:    Set<String> = []
    @State private var hrtStatus          = ""
    @State private var exerciseFrequency  = ""
    @State private var smokingStatus      = ""
    @State private var alcoholFrequency   = ""
    @State private var caffeineIntake     = ""
    @State private var primaryGoal        = ""
    @State private var medicalFollowUp    = ""
    @State private var firstName          = ""

    @State private var currentStep  = 0
    @State private var goingForward = true
    @FocusState private var nameFocused: Bool

    private let totalSteps = 9

    var body: some View {
        ZStack {
            HeleneTheme.Colors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                progressHeader

                stepContent
                    .id(currentStep)
                    .transition(.asymmetric(
                        insertion: .move(edge: goingForward ? .trailing : .leading).combined(with: .opacity),
                        removal:   .move(edge: goingForward ? .leading  : .trailing).combined(with: .opacity)
                    ))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)

                continueButton
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.bottom, 44)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: currentStep)
    }

    // MARK: - Progress Header

    private var progressHeader: some View {
        HStack(spacing: HeleneTheme.Spacing.md) {
            Button(action: goBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            .opacity(currentStep > 0 ? 1 : 0)
            .disabled(currentStep == 0)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(HeleneTheme.Colors.separator).frame(height: 3)
                    Capsule().fill(HeleneTheme.Colors.textPrimary)
                        .frame(width: geo.size.width * progress, height: 3)
                        .animation(.spring(duration: 0.5), value: currentStep)
                }
            }
            .frame(height: 3)

            Image(systemName: "chevron.left").opacity(0) // balance
        }
        .padding(.horizontal, HeleneTheme.Spacing.lg)
        .padding(.vertical, HeleneTheme.Spacing.md)
    }

    // MARK: - Step Router

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case 0: journeyStep
        case 1: ageStep
        case 2: symptomsStep
        case 3: hrtStep
        case 4: exerciseStep
        case 5: habitsStep
        case 6: goalsStep
        case 7: medicalStep
        case 8: nameStep
        default: EmptyView()
        }
    }

    // MARK: - Step 0: Journey Stage

    private var journeyStep: some View {
        StepContainer(question: "Where are you\nin your journey?", subtitle: "This helps us personalise everything for you.") {
            OnboardingCard(label: "Regular periods",          sublabel: "My cycles are still predictable",           isSelected: journeyStage == "regular")   { journeyStage = "regular" }
            OnboardingCard(label: "Irregular periods",        sublabel: "My cycles have become unpredictable",       isSelected: journeyStage == "irregular") { journeyStage = "irregular" }
            OnboardingCard(label: "No period for 12+ months", sublabel: "I'm in post-menopause",                    isSelected: journeyStage == "post")      { journeyStage = "post" }
            OnboardingCard(label: "Not sure yet",             sublabel: "I'm still figuring it out",                isSelected: journeyStage == "unsure")    { journeyStage = "unsure" }
        }
    }

    // MARK: - Step 1: Age Range (NEW)

    private var ageStep: some View {
        StepContainer(question: "How old\nare you?", subtitle: "Age helps us contextualise your symptoms accurately.") {
            OnboardingCard(label: "Under 40",  sublabel: "Early signs or family history",           isSelected: ageRange == "under40") { ageRange = "under40" }
            OnboardingCard(label: "40 – 44",   sublabel: "Possible early perimenopause",            isSelected: ageRange == "40-44")   { ageRange = "40-44" }
            OnboardingCard(label: "45 – 50",   sublabel: "Peak perimenopause transition",           isSelected: ageRange == "45-50")   { ageRange = "45-50" }
            OnboardingCard(label: "51 – 55",   sublabel: "Around or after menopause",               isSelected: ageRange == "51-55")   { ageRange = "51-55" }
            OnboardingCard(label: "55 or older", sublabel: "Post-menopause phase",                  isSelected: ageRange == "55+")     { ageRange = "55+" }
        }
    }

    // MARK: - Step 2: Symptoms

    private var symptomsStep: some View {
        StepContainer(question: "Which symptoms\nare affecting you?", subtitle: "Select everything that feels familiar.") {
            let items: [(String, String, String)] = [
                ("Sleep problems",          "Difficulty falling or staying asleep",  "sleep"),
                ("Anxiety or irritability", "Feeling on edge or overwhelmed",        "anxiety"),
                ("Persistent fatigue",      "Exhaustion that doesn't go away",       "fatigue"),
                ("Hot flashes",             "Sudden waves of heat",                  "hotflashes"),
                ("Brain fog",               "Difficulty concentrating",              "brainfog"),
                ("Mood swings",             "Unexpected emotional shifts",           "moodswings"),
                ("Weight changes",          "Unexplained gain or redistribution",    "weight"),
                ("Joint or muscle pain",    "Aches and stiffness",                   "jointpain"),
                ("Low libido",              "Reduced interest in intimacy",          "libido"),
                ("Vaginal dryness",         "Discomfort or changes in sensation",    "dryness")
            ]
            ForEach(items, id: \.2) { label, sublabel, id in
                OnboardingCard(label: label, sublabel: sublabel, isSelected: selectedSymptoms.contains(id)) {
                    if selectedSymptoms.contains(id) { selectedSymptoms.remove(id) }
                    else { selectedSymptoms.insert(id) }
                }
            }
        }
    }

    // MARK: - Step 3: Hormone Therapy (NEW)

    private var hrtStep: some View {
        StepContainer(question: "Are you on any\nhormone therapy?", subtitle: "This significantly shapes your symptom patterns.") {
            OnboardingCard(label: "No treatment",              sublabel: "I'm not currently taking anything",              isSelected: hrtStatus == "none")        { hrtStatus = "none" }
            OnboardingCard(label: "Yes, I'm on HRT",           sublabel: "Prescribed hormone replacement therapy",         isSelected: hrtStatus == "hrt")         { hrtStatus = "hrt" }
            OnboardingCard(label: "Natural alternatives",      sublabel: "Supplements, phytoestrogens, or other remedies", isSelected: hrtStatus == "natural")     { hrtStatus = "natural" }
            OnboardingCard(label: "Still deciding",            sublabel: "Exploring options with my doctor",               isSelected: hrtStatus == "considering") { hrtStatus = "considering" }
        }
    }

    // MARK: - Step 4: Exercise Frequency (NEW)

    private var exerciseStep: some View {
        StepContainer(question: "How active are\nyou typically?", subtitle: "Exercise is one of the strongest influences on symptoms.") {
            OnboardingCard(label: "Rarely",       sublabel: "Less than once a week",                  isSelected: exerciseFrequency == "rarely")    { exerciseFrequency = "rarely" }
            OnboardingCard(label: "Sometimes",    sublabel: "1 to 2 times a week",                    isSelected: exerciseFrequency == "sometimes") { exerciseFrequency = "sometimes" }
            OnboardingCard(label: "Regularly",    sublabel: "3 to 4 times a week",                    isSelected: exerciseFrequency == "regularly") { exerciseFrequency = "regularly" }
            OnboardingCard(label: "Very active",  sublabel: "Daily or almost daily",                  isSelected: exerciseFrequency == "daily")     { exerciseFrequency = "daily" }
        }
    }

    // MARK: - Step 5: Daily Habits (NEW)

    private var habitsStep: some View {
        StepContainer(question: "A few questions\nabout your habits", subtitle: "Smoking, alcohol, and caffeine directly influence your symptoms.") {
            // Smoking
            HabitSection(title: "Smoking", icon: "smoke.fill") {
                HabitChip(label: "Never",        isSelected: smokingStatus == "never")   { smokingStatus = "never" }
                HabitChip(label: "Past smoker",  isSelected: smokingStatus == "former")  { smokingStatus = "former" }
                HabitChip(label: "Current",      isSelected: smokingStatus == "current") { smokingStatus = "current" }
            }

            // Alcohol
            HabitSection(title: "Alcohol", icon: "wineglass") {
                HabitChip(label: "Rarely",        isSelected: alcoholFrequency == "rarely")       { alcoholFrequency = "rarely" }
                HabitChip(label: "Occasionally",  isSelected: alcoholFrequency == "occasionally") { alcoholFrequency = "occasionally" }
                HabitChip(label: "Most weeks",    isSelected: alcoholFrequency == "regularly")    { alcoholFrequency = "regularly" }
                HabitChip(label: "Daily",         isSelected: alcoholFrequency == "daily")        { alcoholFrequency = "daily" }
            }

            // Caffeine
            HabitSection(title: "Caffeine", icon: "cup.and.saucer.fill") {
                HabitChip(label: "None",      isSelected: caffeineIntake == "none")     { caffeineIntake = "none" }
                HabitChip(label: "1–2 / day", isSelected: caffeineIntake == "low")      { caffeineIntake = "low" }
                HabitChip(label: "3–4 / day", isSelected: caffeineIntake == "moderate") { caffeineIntake = "moderate" }
                HabitChip(label: "5+ / day",  isSelected: caffeineIntake == "high")     { caffeineIntake = "high" }
            }
        }
    }

    // MARK: - Step 6: Goals

    private var goalsStep: some View {
        StepContainer(question: "What matters\nmost to you?", subtitle: "We'll tailor your experience around this.") {
            OnboardingCard(label: "Understand what's happening", sublabel: "Make sense of my symptoms and body",        isSelected: primaryGoal == "understand") { primaryGoal = "understand" }
            OnboardingCard(label: "Feel less alone",             sublabel: "Connect with women going through the same", isSelected: primaryGoal == "community")  { primaryGoal = "community" }
            OnboardingCard(label: "Track my symptoms",           sublabel: "See patterns and how I evolve over time",   isSelected: primaryGoal == "track")      { primaryGoal = "track" }
            OnboardingCard(label: "Prepare for my doctor",       sublabel: "Make my consultations more useful",         isSelected: primaryGoal == "doctor")     { primaryGoal = "doctor" }
        }
    }

    // MARK: - Step 6: Medical Support

    private var medicalStep: some View {
        StepContainer(question: "Do you have\nmedical support?", subtitle: "There's no right answer — this helps us adapt.") {
            OnboardingCard(label: "Yes, regularly",     sublabel: "I have regular follow-up appointments", isSelected: medicalFollowUp == "yes")       { medicalFollowUp = "yes" }
            OnboardingCard(label: "Sometimes",          sublabel: "Occasional consultations",              isSelected: medicalFollowUp == "sometimes") { medicalFollowUp = "sometimes" }
            OnboardingCard(label: "No, I manage alone", sublabel: "I don't have regular medical support",  isSelected: medicalFollowUp == "no")        { medicalFollowUp = "no" }
        }
    }

    // MARK: - Step 7: Name

    private var nameStep: some View {
        VStack(alignment: .leading, spacing: HeleneTheme.Spacing.xxl) {
            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                Text("What's your\nfirst name?")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                Text("We'd love to make this feel personal.")
                    .font(.subheadline)
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)

            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                TextField("Your first name", text: $firstName)
                    .font(.system(size: 38, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    .focused($nameFocused)
                    .onAppear { nameFocused = true }
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.words)

                Rectangle()
                    .fill(HeleneTheme.Colors.textPrimary)
                    .frame(height: 2)
                    .clipShape(Capsule())
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)
        }
        .padding(.top, HeleneTheme.Spacing.lg)
    }

    // MARK: - Continue Button

    private var continueButton: some View {
        Button(action: goNext) {
            Text(currentStep == totalSteps - 1 ? "Get started" : "Continue")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity).frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: HeleneTheme.Radius.button)
                        .fill(canContinue ? AnyShapeStyle(HeleneTheme.Colors.dark) : AnyShapeStyle(HeleneTheme.Colors.separator))
                )
        }
        .disabled(!canContinue)
        .animation(.easeInOut(duration: 0.2), value: canContinue)
    }

    // MARK: - Logic

    private var progress: Double { Double(currentStep + 1) / Double(totalSteps) }

    private var canContinue: Bool {
        switch currentStep {
        case 0: return !journeyStage.isEmpty
        case 1: return !ageRange.isEmpty
        case 2: return !selectedSymptoms.isEmpty
        case 3: return !hrtStatus.isEmpty
        case 4: return !exerciseFrequency.isEmpty
        case 5: return !smokingStatus.isEmpty && !alcoholFrequency.isEmpty && !caffeineIntake.isEmpty
        case 6: return !primaryGoal.isEmpty
        case 7: return !medicalFollowUp.isEmpty
        case 8: return !firstName.trimmingCharacters(in: .whitespaces).isEmpty
        default: return false
        }
    }

    private func goNext() {
        guard canContinue else { return }
        if currentStep < totalSteps - 1 {
            goingForward = true; currentStep += 1
        } else {
            // Write to profile only once, at the very end
            profile.journeyStage      = journeyStage
            profile.ageRange          = ageRange
            profile.selectedSymptoms  = selectedSymptoms
            profile.hrtStatus         = hrtStatus
            profile.exerciseFrequency = exerciseFrequency
            profile.smokingStatus     = smokingStatus
            profile.alcoholFrequency  = alcoholFrequency
            profile.caffeineIntake    = caffeineIntake
            profile.primaryGoal       = primaryGoal
            profile.medicalFollowUp   = medicalFollowUp
            profile.firstName         = firstName
            profile.save()
            authManager.completeOnboarding()
        }
    }

    private func goBack() {
        guard currentStep > 0 else { return }
        goingForward = false; currentStep -= 1
    }
}

// MARK: - Step Container

private struct StepContainer<Content: View>: View {
    let question: String
    let subtitle: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: HeleneTheme.Spacing.xl) {
                VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                    Text(question)
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
                VStack(spacing: HeleneTheme.Spacing.sm) { content() }
            }
            .padding(.horizontal, HeleneTheme.Spacing.lg)
            .padding(.bottom, HeleneTheme.Spacing.xl)
        }
    }
}

// MARK: - Habit Section

private struct HabitSection<Content: View>: View {
    let title: String
    let icon:  String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            HStack(spacing: 8) {
                content()
                Spacer()
            }
        }
        .padding(.horizontal, HeleneTheme.Spacing.md)
        .padding(.vertical, 14)
        .background(HeleneTheme.Colors.surface,
                    in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
    }
}

// MARK: - Habit Chip

private struct HabitChip: View {
    let label:      String
    let isSelected: Bool
    let action:     () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    isSelected ? HeleneTheme.lavenderFill : HeleneTheme.Colors.background,
                    in: Capsule()
                )
                .lightSchemeOnFill(isSelected)
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.03 : 1.0)
        .animation(.spring(duration: 0.2), value: isSelected)
    }
}

// MARK: - Onboarding Card

private struct OnboardingCard: View {
    let label:      String
    var sublabel:   String? = nil
    let isSelected: Bool
    let action:     () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: HeleneTheme.Spacing.md) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(label)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    if let sublabel {
                        Text(sublabel)
                            .font(.caption)
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .lineLimit(2)
                            .frame(minHeight: 34, alignment: .top)
                    }
                }
                Spacer()
                ZStack {
                    Circle()
                        .fill(isSelected ? HeleneTheme.Colors.dark : HeleneTheme.Colors.surface)
                        .frame(width: 24, height: 24)
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
            }
            .padding(.horizontal, HeleneTheme.Spacing.md)
            .padding(.vertical, 18)
            .background(
                RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium)
                    .fill(isSelected ? HeleneTheme.lavenderFill : HeleneTheme.Colors.surface)
            )
            .lightSchemeOnFill(isSelected)
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.01 : 1.0)
        .animation(.spring(duration: 0.25), value: isSelected)
    }
}

#Preview {
    OnboardingView()
        .environment(AuthManager())
        .environment(UserProfile())
}
