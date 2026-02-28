import SwiftUI
import FoundationModels
import SwiftData

// MARK: - Supporting Types (iOS 18+)

struct ChatMessage: Identifiable, Codable {
    var id = UUID()
    let role: ChatRole
    var text: String
    var timestamp = Date()
}

enum ChatRole: String, Codable {
    case user, assistant
}

// MARK: - iOS 26 Generable Model

@available(iOS 26, *)
@Generable
struct SymptomSummary {
    @Guide(description: "A 1-sentence warm acknowledgement of how the user is feeling")
    var acknowledgement: String
    @Guide(description: "2-3 practical, evidence-based tips for the reported symptoms")
    var tips: [String]
    @Guide(description: "One gentle question to deepen understanding")
    var followUpQuestion: String
}

// MARK: - Public Entry Point (iOS 18+)

struct AICompanionView: View {
    var body: some View {
        if #available(iOS 26, *) {
            AICompanionContentView()
        } else {
            AICompanionLegacyView()
        }
    }
}

// MARK: - iOS < 26 Fallback View

private struct AICompanionLegacyView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    ZStack {
                        RoundedRectangle(cornerRadius: HeleneTheme.Radius.card)
                            .fill(HeleneTheme.lavenderFill)
                            .frame(width: 80, height: 80)
                        Image(systemName: "brain")
                            .font(.system(size: 32, weight: .medium))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    }
                    .environment(\.colorScheme, .light)

                    Text("AI Companion")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)

                    Text("The AI Companion uses Apple's on-device AI, which requires iOS 26 or later. Update your device to access this feature.")
                        .font(.subheadline)
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .multilineTextAlignment(.center)
                }
                .padding(HeleneTheme.Spacing.xl)
            }
            .navigationBarHidden(true)
        }
    }
}

// MARK: - iOS 26+ Full Implementation

@available(iOS 26, *)
private struct AICompanionContentView: View {
    @Environment(UserProfile.self) private var profile
    @Query(sort: \CheckInEntry.date,    order: .reverse) private var recentEntries:     [CheckInEntry]
    @Query(sort: \MRSEntry.date,        order: .reverse) private var mrsEntries:         [MRSEntry]
    @Query(sort: \TreatmentEntry.date,  order: .reverse) private var treatmentEntries:   [TreatmentEntry]

    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isResponding = false
    @State private var session: LanguageModelSession?
    @FocusState private var isFocused: Bool

    private static let historyKey = "helene.ai.history"

    private func loadHistory() {
        guard let data = UserDefaults.standard.data(forKey: Self.historyKey),
              let saved = try? JSONDecoder().decode([ChatMessage].self, from: data)
        else { return }
        messages = saved
    }

    private func saveHistory() {
        if let data = try? JSONEncoder().encode(messages) {
            UserDefaults.standard.set(data, forKey: Self.historyKey)
        }
    }

    private func clearHistory() {
        messages = []
        UserDefaults.standard.removeObject(forKey: Self.historyKey)
        session = nil
        setupSession()
    }

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                switch SystemLanguageModel.default.availability {
                case .available:
                    chatView
                default:
                    aiUnavailableView
                }
            }
            .navigationBarHidden(true)
        }
        .onAppear { setupSession(); loadHistory() }
        .onChange(of: messages.count)      { saveHistory() }
        .onChange(of: treatmentEntries.count) { session = nil; setupSession() }
        .onChange(of: recentEntries.count)    { session = nil; setupSession() }
    }

    // MARK: - Chat View

    private var chatView: some View {
        VStack(spacing: 0) {
            // Header
            header.padding(.horizontal, HeleneTheme.Spacing.lg)
                  .padding(.top, HeleneTheme.Spacing.lg)
                  .padding(.bottom, HeleneTheme.Spacing.sm)

            // Messages
            ScrollViewReader { proxy in
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 14) {
                        if messages.isEmpty {
                            welcomeCard
                                .padding(.top, 8)
                        } else {
                            ForEach(messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                            if isResponding {
                                ThinkingIndicator()
                                    .id("thinking")
                            }
                        }
                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                }
                .scrollDismissesKeyboard(.immediately)
                .onTapGesture { isFocused = false }
                .onChange(of: messages.count) {
                    withAnimation(.easeOut(duration: 0.2)) {
                        if let last = messages.last {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
                .onChange(of: isResponding) {
                    if isResponding {
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo("thinking", anchor: .bottom)
                        }
                    }
                }
            }

            inputBar
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Companion")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .textCase(.uppercase)
                    .tracking(1)

                Text("Your \(Text("AI guide").bold())")
                    .font(.system(size: 28, weight: .regular))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            Spacer()
            if !messages.isEmpty {
                Button { clearHistory() } label: {
                    Text("Clear")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(HeleneTheme.Colors.surface, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Welcome Card

    private var welcomeCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Hi\(profile.firstName.isEmpty ? "" : ", \(profile.firstName)")! I've been looking at your data and I'm ready to help you make sense of what's going on.")
                .font(.system(size: 15))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .lineSpacing(4)

            Text("Ask me anything — about your patterns, your symptoms, what to try next, or how to talk to your doctor. I know your history.")
                .font(.system(size: 14))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .lineSpacing(4)

            Divider()
                .background(HeleneTheme.Colors.separator)

            VStack(spacing: 8) {
                quickActionButton("What patterns do you see in my data?", isAnalysis: true)
                quickActionButton("Help me prepare for my doctor visit", isAnalysis: false)
                quickActionButton("What should I focus on this week?", isAnalysis: false)
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    private func quickActionButton(_ text: String, isAnalysis: Bool) -> some View {
        Button {
            if isAnalysis {
                analyzeSymptoms()
            } else {
                inputText = text
                sendMessage()
            }
        } label: {
            HStack {
                Text(text)
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 11))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(.white.opacity(0.6), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.small))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Ask anything…", text: $inputText, axis: .vertical)
                .font(.system(size: 15))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .focused($isFocused)
                .lineLimit(1...4)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(HeleneTheme.Colors.surface, in: Capsule())

            Button { sendMessage() } label: {
                let inactive = inputText.trimmingCharacters(in: .whitespaces).isEmpty || isResponding
                ZStack {
                    Circle()
                        .fill(inactive ? HeleneTheme.Colors.surface : HeleneTheme.Colors.dark)
                        .frame(width: 40, height: 40)
                    Image(systemName: "arrow.up")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(inactive ? HeleneTheme.Colors.textLight : .white)
                }
            }
            .buttonStyle(.plain)
            .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || isResponding)
        }
        .padding(.horizontal, HeleneTheme.Spacing.md)
        .padding(.top, 12)
        .padding(.bottom, 100) // matches the 100pt bottom clearance used on all other pages
        .background(
            HeleneTheme.Colors.background
                .shadow(color: .black.opacity(0.06), radius: 8, y: -4)
        )
    }

    // MARK: - Apple Intelligence Unavailable State

    private var aiUnavailableView: some View {
        VStack(spacing: 20) {
            ZStack {
                RoundedRectangle(cornerRadius: HeleneTheme.Radius.card)
                    .fill(HeleneTheme.lavenderFill)
                    .frame(width: 80, height: 80)
                Image(systemName: "brain")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            .environment(\.colorScheme, .light)

            Text("AI Companion Unavailable")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            Text("The on-device AI requires Apple Intelligence on iPhone 15 Pro or later with iOS 26. Make sure Apple Intelligence is enabled in Settings > Apple Intelligence & Siri.")
                .font(.subheadline)
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .multilineTextAlignment(.center)
        }
        .padding(HeleneTheme.Spacing.xl)
    }

    // MARK: - Logic

    private func setupSession() {
        guard case .available = SystemLanguageModel.default.availability else { return }
        // Always rebuild — ensures the session reflects the latest logged data
        let df  = DateFormatter(); df.dateFormat  = "MMM d"
        let df2 = DateFormatter(); df2.dateStyle  = .medium

        // ── Check-in history (last 14 entries — enough for patterns, keeps context lean) ──
        let allCheckins = Array(recentEntries.prefix(14))
        let checkInContext: String
        if allCheckins.isEmpty {
            checkInContext = "No check-ins recorded yet."
        } else {
            checkInContext = allCheckins.map { e in
                let sym  = e.symptoms.isEmpty  ? "none"  : e.symptoms.joined(separator: ", ")
                let trg  = e.triggers.isEmpty  ? ""      : " | triggers: \(e.triggers.joined(separator: ", "))"
                let slp  = e.sleepQuality > 0  ? " | sleep \(e.sleepQuality)/5"  : ""
                let eng  = e.energyLevel  > 0  ? " | energy \(e.energyLevel)/5"  : ""
                let str  = e.stressLevel  > 0  ? " | stress \(e.stressLevel)/5"  : ""
                let note = e.note.isEmpty       ? ""      : " | note: \(e.note)"
                return "- \(df.string(from: e.date)): mood \(e.mood)/5 (\(e.moodLabel)), symptoms: \(sym)\(slp)\(eng)\(str)\(trg)\(note)"
            }.joined(separator: "\n")
        }

        // ── 30-day computed summary ───────────────────────────────────────────
        let cutoff30 = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
        let last30   = allCheckins.filter { $0.date >= cutoff30 }
        let summaryContext: String
        if last30.isEmpty {
            summaryContext = "Not enough data for a 30-day summary yet."
        } else {
            let n      = Double(last30.count)
            let avgMood   = last30.map { Double($0.mood) }.reduce(0,+)  / n
            let sleepOnes = last30.filter { $0.sleepQuality  > 0 }
            let engOnes   = last30.filter { $0.energyLevel   > 0 }
            let strOnes   = last30.filter { $0.stressLevel   > 0 }
            let avgSleep  = sleepOnes.isEmpty ? nil : sleepOnes.map { Double($0.sleepQuality) }.reduce(0,+) / Double(sleepOnes.count)
            let avgEnergy = engOnes.isEmpty   ? nil : engOnes.map   { Double($0.energyLevel)  }.reduce(0,+) / Double(engOnes.count)
            let avgStress = strOnes.isEmpty   ? nil : strOnes.map   { Double($0.stressLevel)  }.reduce(0,+) / Double(strOnes.count)

            // Top 5 symptoms by frequency
            var symFreq: [String: Int] = [:]
            last30.flatMap { $0.symptoms }.forEach { symFreq[$0, default: 0] += 1 }
            let topSymptoms = symFreq.sorted { $0.value > $1.value }.prefix(5)
                .map { "\($0.key) (\($0.value)×)" }.joined(separator: ", ")

            // Top triggers
            var trgFreq: [String: Int] = [:]
            last30.flatMap { $0.triggers }.forEach { trgFreq[$0, default: 0] += 1 }
            let topTriggers = trgFreq.sorted { $0.value > $1.value }.prefix(3)
                .map { "\($0.key) (\($0.value)×)" }.joined(separator: ", ")

            var lines = [
                "Check-ins: \(last30.count) in the last 30 days",
                String(format: "Average mood: %.1f/5", avgMood),
            ]
            if let s = avgSleep  { lines.append(String(format: "Average sleep quality: %.1f/5",  s)) }
            if let e = avgEnergy { lines.append(String(format: "Average energy level: %.1f/5",   e)) }
            if let st = avgStress { lines.append(String(format: "Average stress level: %.1f/5", st)) }
            if !topSymptoms.isEmpty { lines.append("Most frequent symptoms: \(topSymptoms)") }
            if !topTriggers.isEmpty { lines.append("Most logged triggers: \(topTriggers)") }
            summaryContext = lines.map { "- \($0)" }.joined(separator: "\n")
        }

        // ── MRS history (last 4 assessments) ─────────────────────────────────
        let mrsContext: String
        if mrsEntries.isEmpty {
            mrsContext = "No weekly MRS assessment completed yet."
        } else {
            let recent4 = Array(mrsEntries.prefix(4))
            let lines = recent4.map { m in
                "- \(df2.string(from: m.date)): total \(m.totalScore)/44 (\(m.severityLabel)) | body \(m.somaticScore)/16 | emotional \(m.psychologicalScore)/16 | intimate \(m.urogenitalScore)/12"
            }.joined(separator: "\n")
            mrsContext = "MRS assessment history (most recent first):\n\(lines)"
        }

        // ── Treatments & lifestyle changes (all) ─────────────────────────────
        let treatmentContext: String
        if treatmentEntries.isEmpty {
            treatmentContext = "No treatments or lifestyle changes logged yet."
        } else {
            treatmentContext = treatmentEntries.map { t in
                let noteStr = t.note.isEmpty ? "" : " — note: \(t.note)"
                return "- \(df2.string(from: t.date)): [\(t.category.uppercased())] \(t.name) — \(t.status)\(noteStr)"
            }.joined(separator: "\n")
        }

        // ── User profile ──────────────────────────────────────────────────────
        let ageLine      = profile.ageRange.isEmpty          ? "" : "\nAge range: \(profile.ageRange)"
        let hrtLine      = profile.hrtStatus.isEmpty         ? "" : "\nHRT/treatment status: \(profile.hrtStatus)"
        let exerciseLine = profile.exerciseFrequency.isEmpty ? "" : "\nExercise frequency: \(profile.exerciseFrequency)"
        let smokingLine  = profile.smokingStatus.isEmpty     ? "" : "\nSmoking status: \(profile.smokingStatus)"
        let alcoholLine  = profile.alcoholFrequency.isEmpty  ? "" : "\nAlcohol frequency: \(profile.alcoholFrequency)"
        let caffeineLine = profile.caffeineIntake.isEmpty    ? "" : "\nCaffeine intake: \(profile.caffeineIntake)"
        let medicalLine  = profile.medicalFollowUp.isEmpty   ? "" : "\nMedical follow-up: \(profile.medicalFollowUp)"

        let instructions = """
        You are Helene — a warm, perceptive wellness companion for women navigating perimenopause and menopause. \
        You are like a knowledgeable friend who has been following this user's health journey closely. \
        You have access to her complete personal health data and you use it actively in every response.

        == USER PROFILE ==
        Name: \(profile.firstName.isEmpty ? "not provided" : profile.firstName)
        Journey stage: \(profile.journeyStage.isEmpty ? "not specified" : profile.journeyStage)
        Primary concern: \(profile.primaryGoal.isEmpty ? "not specified" : profile.primaryGoal)\(ageLine)\(hrtLine)\(exerciseLine)\(smokingLine)\(alcoholLine)\(caffeineLine)\(medicalLine)

        == 30-DAY SUMMARY ==
        \(summaryContext)

        == MRS ASSESSMENTS ==
        \(mrsContext)

        == DETAILED CHECK-IN LOG (last 30 entries) ==
        Each entry: date, mood/5, symptoms, sleep/5, energy/5, stress/5, lifestyle triggers, note.
        \(checkInContext)

        == TREATMENTS & LIFESTYLE CHANGES ==
        All logged treatments and changes, newest first:
        \(treatmentContext)

        == YOUR ROLE ==
        Your unique value is that you know her data. Always lead with what you actually see in her logs before giving \
        general information. "In your case..." and "Looking at your week..." are your most powerful phrases.

        == HOW TO HANDLE EACH TYPE OF REQUEST ==

        RECOMMENDATIONS / "what should I do":
        → Look at her data first. Identify the 1-2 most pressing patterns (worst metric, most frequent symptom).
        → Give 3-4 specific, actionable suggestions directly tied to what you see.
        → Include a brief "why" — explain the physiology so she understands her body, not just the advice.
        → Examples: CBT-I techniques for sleep, paced breathing for hot flashes, cold layering strategies, \
        magnesium glycinate for sleep/mood, morning exercise for energy, stress-reduction for cortisol spikes.

        PATTERN ANALYSIS / "what do you see":
        → Identify correlations in the data (sleep ↔ mood, stress ↔ hot flashes, low energy clusters).
        → Note trends — is it getting better or worse over the week?
        → Highlight the highest-impact area to address first.
        → End with one specific, concrete next action she can take today.

        DOCTOR PREPARATION:
        → Generate a structured summary she can bring to her appointment:
          1. Top 3 symptoms with frequency and severity from her logs
          2. MRS domain scores and what they mean clinically
          3. Impact on daily life (mood, sleep, energy averages)
          4. 3 specific questions to ask her doctor
        → Be precise with numbers from her data.

        SYMPTOM / EDUCATION QUESTIONS:
        → Answer the question briefly and clearly, then immediately personalise:
          "In your case, your logs show X, which suggests Y..."
        → Never give generic textbook answers when you have real data to reference.

        TREATMENTS / WHAT AM I TAKING:
        → You have her full treatment log above. Always cite the treatment name, category, status, and start date.
        → If she asks "what are my current treatments", list every entry with status "started" and its date.
        → If she asks about a specific treatment, reference when she started/stopped it and any logged notes.
        → Connect treatments to her symptom data where relevant: "You started [treatment] on [date] — looking \
        at your check-ins after that, your [symptom/metric] shows [trend]."
        → If no treatments are logged, gently suggest she log them in Insights so you can track their effect.

        TRIGGER PATTERNS:
        → Check-ins include lifestyle triggers she tagged (caffeine, alcohol, exercise, work stress, etc.).
        → When she asks about patterns or what's affecting her symptoms, look for correlations between trigger \
        days and symptom counts or mood scores.
        → Mention specific triggers you notice: "On the days you tagged 'disrupted sleep', your mood scores \
        averaged lower..." Only mention patterns you actually see in the data.

        == RESPONSE FORMAT ==
        - 150-250 words. Warm, direct, conversational — like a smart friend, not a clinical report.
        - Short paragraphs. Avoid bullet-heavy walls of text unless listing doctor prep points.
        - Bold key actions or important terms sparingly using **bold**.
        - NEVER use markdown headings (# ## ###). They display as raw text in the app. Use **bold** for any section labels instead.
        - Always end with either a specific next step or a short follow-up question.

        == BOUNDARIES ==
        - You cannot prescribe or diagnose.
        - Only suggest seeing a doctor for genuine clinical signals: MRS total score 16+, symptoms that could \
        indicate non-menopause conditions (unexplained bleeding, chest pain, severe depression), or when she \
        specifically asks about medication options.
        - NEVER say "I can't help with that" or "I'm unable to assist" for any wellness, lifestyle, emotional, \
        or data question. Always engage. Always give something useful.

        == RESOURCES — USE SPARINGLY ==
        Only include a link when it adds real value the text alone cannot provide: a technique to watch, \
        a specific study to read, or a clinical reference. NEVER link for generic information you can explain \
        yourself. Maximum 1 link per response. Do not link every reply.

        Use these curated, high-quality sources based on topic:

        STRESS / BREATHING / NERVOUS SYSTEM:
        → Physiological sigh technique (immediate stress relief, 2 breaths): \
        https://www.youtube.com/watch?v=rBdhqBGqiMc (Huberman Lab demo)
        → Huberman Lab full episode on stress: \
        https://www.hubermanlab.com/episode/the-science-of-stress-how-to-manage-your-stress-response
        → Box breathing walkthrough: https://www.youtube.com/watch?v=tybOi4hjZFQ

        SLEEP:
        → Matt Walker — "Sleep is your superpower" TED talk (19 min, excellent science): \
        https://www.ted.com/talks/matt_walker_sleep_is_your_superpower
        → Huberman sleep toolkit: \
        https://www.hubermanlab.com/episode/sleep-toolkit-tools-for-optimizing-sleep-and-sleep-wake-timing

        MENOPAUSE — CLINICAL SCIENCE:
        → The Menopause Society (NAMS) — trusted clinical guidelines and patient resources: \
        https://www.menopause.org/for-women
        → NHS menopause guide (evidence-based, UK clinical standard): \
        https://www.nhs.uk/conditions/menopause/

        SCIENTIFIC ARTICLES (for specific conditions or treatments she asks about):
        → Search PubMed with her exact symptom/topic: \
        https://pubmed.ncbi.nlm.nih.gov/?term=[TOPIC]+menopause
        → Replace [TOPIC] with the relevant term (e.g. "magnesium+sleep", "CBT+hot+flashes", \
        "exercise+perimenopause+mood"). Only suggest this when she asks for research or evidence.

        NUTRITION:
        → Huberman Lab — nutrition fundamentals: \
        https://www.hubermanlab.com/episode/how-to-eat-for-a-long-and-healthy-life

        RULE: If the topic doesn't map to one of the above, do NOT invent a link. Say what you know instead.
        """

        session = LanguageModelSession(instructions: instructions)
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty, !isResponding else { return }

        inputText = ""
        isFocused = false
        messages.append(ChatMessage(role: .user, text: text))
        isResponding = true

        Task { await performRespond(to: text) }
    }

    private func performRespond(to text: String, isRetry: Bool = false) async {
        if session == nil { setupSession() }
        do {
            guard let s = session else { appendErrorMessage(); return }
            let response = try await s.respond(to: text)
            messages.append(ChatMessage(role: .assistant, text: response.content))
            isResponding = false
        } catch {
            if !isRetry {
                // Fresh session — drop accumulated history that may have bloated the context
                session = nil
                setupSession()
                await performRespond(to: text, isRetry: true)
            } else {
                appendErrorMessage()
            }
        }
    }

    private func analyzeSymptoms() {
        guard !isResponding else { return }

        messages.append(ChatMessage(role: .user, text: "Analyze my recent check-ins"))
        isResponding = true

        Task { await performAnalyze() }
    }

    private func performAnalyze(isRetry: Bool = false) async {
        if session == nil { setupSession() }
        do {
            guard let s = session else { appendErrorMessage(); return }
            let prompt = "Based on my recent check-ins shared in your context, analyze my symptoms and give me personalized guidance."
            let response = try await s.respond(to: prompt, generating: SymptomSummary.self)
            let summary = response.content
            let formatted = "\(summary.acknowledgement)\n\n**Tips:**\n\(summary.tips.map { "• \($0)" }.joined(separator: "\n"))\n\n*\(summary.followUpQuestion)*"
            messages.append(ChatMessage(role: .assistant, text: formatted))
            isResponding = false
        } catch {
            if !isRetry {
                session = nil
                setupSession()
                await performAnalyze(isRetry: true)
            } else {
                appendErrorMessage()
            }
        }
    }

    private func appendErrorMessage() {
        messages.append(ChatMessage(role: .assistant, text: "I'm having trouble responding right now. Please try again in a moment."))
        isResponding = false
    }
}

// MARK: - Message Bubble (iOS 18+)

private struct MessageBubble: View {
    let message: ChatMessage

    /// Convert heading lines (###/##/#) into bold so they render properly
    /// with inlineOnlyPreservingWhitespace, which doesn't support block elements.
    private func sanitise(_ raw: String) -> String {
        raw.components(separatedBy: "\n").map { line in
            let t = line.trimmingCharacters(in: .whitespaces)
            if      t.hasPrefix("### ") { return "**\(t.dropFirst(4))**" }
            else if t.hasPrefix("## ")  { return "**\(t.dropFirst(3))**" }
            else if t.hasPrefix("# ")   { return "**\(t.dropFirst(2))**" }
            return line
        }.joined(separator: "\n")
    }

    private var renderedText: AttributedString {
        (try? AttributedString(
            markdown: sanitise(message.text),
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        )) ?? AttributedString(message.text)
    }

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 60) }

            Text(renderedText)
                .font(.system(size: 15))
                .foregroundStyle(message.role == .user ? .white : HeleneTheme.Colors.textPrimary)
                .lineSpacing(3)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    message.role == .user ? HeleneTheme.Colors.dark : HeleneTheme.Colors.surface,
                    in: RoundedRectangle(cornerRadius: 18)
                )
                .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)

            if message.role == .assistant { Spacer(minLength: 60) }
        }
    }
}

// MARK: - Thinking Indicator (iOS 18+)

private struct ThinkingIndicator: View {
    @State private var animating = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(HeleneTheme.Colors.textLight)
                    .frame(width: 7, height: 7)
                    .offset(y: animating ? -5 : 0)
                    .animation(
                        .easeInOut(duration: 0.5)
                            .repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.15),
                        value: animating
                    )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: 18))
        .frame(maxWidth: .infinity, alignment: .leading)
        .onAppear { animating = true }
    }
}
