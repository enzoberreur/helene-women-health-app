import SwiftUI
import Speech
import AVFoundation
import FoundationModels
import SwiftData

// MARK: - ElevenLabs config

private enum ElevenLabsConfig {
    static let apiKey  = "sk_3bb44a3c4623322421b99c02b4c3378edd257bc2ad66fe16"
    static let voiceId = "21m00Tcm4TlvDq8ikWAM"
    static let modelId = "eleven_turbo_v2_5"
}

// MARK: - Structured AI reply (sentence-streaming)

@available(iOS 26, *)
@Generable
private struct VoiceReply {
    @Guide(description: "First sentence only, max 20 words, warm and direct. No filler.")
    var s1: String
    @Guide(description: "During check-in: REQUIRED after a readback in s1 — put the next question here. Otherwise optional brief empathy or context, never a second question.")
    var s2: String?
}

// MARK: - Extraction: daily check-in

@available(iOS 26, *)
@Generable
private struct CheckInExtraction {
    @Guide(description: "Mood score 1-5 (1=very bad, 5=great). 0 if not mentioned.")
    var mood: Int
    @Guide(description: "Sleep quality 1-5 (1=very poor, 5=excellent). 0 if not mentioned.")
    var sleepQuality: Int
    @Guide(description: "Energy level 1-5 (1=exhausted, 5=energized). 0 if not mentioned.")
    var energyLevel: Int
    @Guide(description: "Stress level 1-5 (1=very stressed, 5=calm). 0 if not mentioned.")
    var stressLevel: Int
    @Guide(description: "Comma-separated symptom IDs from: sleep, anxiety, fatigue, hotflashes, brainfog, moodswings, weight, jointpain. Empty string if none.")
    var symptoms: String
    @Guide(description: "Comma-separated trigger IDs from: coffee, alcohol, exercise, workstress, medication, outdoor, social, disruptedsleep. Empty string if none.")
    var triggers: String
    @Guide(description: "Brief free-text summary of what the user shared. Empty string if nothing notable.")
    var note: String
}

// MARK: - Extraction: MRS assessment

@available(iOS 26, *)
@Generable
private struct MRSExtraction {
    @Guide(description: "Hot flashes / sweating: 0=none, 1=mild, 2=moderate, 3=severe, 4=very severe. 0 if not mentioned.")
    var hotFlashes: Int
    @Guide(description: "Heart discomfort (palpitations, racing heart): 0-4. 0 if not mentioned.")
    var heartDiscomfort: Int
    @Guide(description: "Sleep problems (difficulty falling or staying asleep): 0-4. 0 if not mentioned.")
    var sleepProblems: Int
    @Guide(description: "Joint and muscle pain: 0-4. 0 if not mentioned.")
    var jointPain: Int
    @Guide(description: "Depressive mood (sadness, tearfulness): 0-4. 0 if not mentioned.")
    var depressiveMood: Int
    @Guide(description: "Irritability / inner tension: 0-4. 0 if not mentioned.")
    var irritability: Int
    @Guide(description: "Anxiety / restlessness / feeling panicky: 0-4. 0 if not mentioned.")
    var anxiety: Int
    @Guide(description: "Physical and mental exhaustion / brain fog: 0-4. 0 if not mentioned.")
    var exhaustion: Int
    @Guide(description: "Changes in sexual desire or satisfaction: 0-4. 0 if not mentioned.")
    var sexualProblems: Int
    @Guide(description: "Bladder problems (urgency, leaking): 0-4. 0 if not mentioned.")
    var bladderProblems: Int
    @Guide(description: "Vaginal dryness or discomfort: 0-4. 0 if not mentioned.")
    var vaginalDryness: Int
}

// MARK: - Extraction: treatments

@available(iOS 26, *)
@Generable
private struct TreatmentListExtraction {
    @Guide(description: "Comma-separated treatment or change names, one per item. E.g. 'Magnesium glycinate, Coffee reduction'")
    var names: String
    @Guide(description: "Comma-separated categories matching each name. Each must be one of: hrt, supplement, lifestyle, medication. E.g. 'supplement, lifestyle'")
    var categories: String
    @Guide(description: "Comma-separated statuses matching each name. Each must be one of: started, stopped, adjusted, paused. E.g. 'started, stopped'")
    var statuses: String
    @Guide(description: "Comma-separated short notes matching each name. Use empty string for items with no note. E.g. 'for sleep, cutting back gradually'")
    var notes: String
}

// MARK: - Delegates

private final class AudioPlayerDelegate: NSObject, AVAudioPlayerDelegate {
    var onFinish: () -> Void = {}
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully _: Bool) {
        DispatchQueue.main.async { self.onFinish() }
    }
}

private final class SpeechDelegate: NSObject, AVSpeechSynthesizerDelegate {
    var onFinish: () -> Void = {}
    func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) {
        DispatchQueue.main.async { self.onFinish() }
    }
}

// MARK: - Voice phase

private enum VoicePhase: Equatable {
    case listening, thinking, speaking
    var glowColor: Color {
        switch self {
        case .listening: return Color(hex: "#6B4E9B")
        case .thinking:  return Color(hex: "#0C0A09")
        case .speaking:  return Color(hex: "#2A7A6A")
        }
    }
}

// MARK: - Check-in state machine

private enum CheckInField: Int, CaseIterable {
    case mood, sleep, energy, stress, symptoms, triggers

    var question: String {
        switch self {
        case .mood:     return "How's your mood today from 1 to 5 — 5 being great, 1 being really rough?"
        case .sleep:    return "Sleep last night from 1 to 5 — 5 being excellent?"
        case .energy:   return "Energy today from 1 to 5 — 5 being full of energy?"
        case .stress:   return "Stress level from 1 to 5 — 5 being calm, 1 being very stressed?"
        case .symptoms: return "Any symptoms today? Hot flashes, fatigue, brain fog, anxiety, joint pain, mood swings?"
        case .triggers: return "Any triggers? Caffeine, alcohol, work stress, exercise, poor sleep?"
        }
    }

    var label: String {
        switch self {
        case .mood: return "mood"; case .sleep: return "sleep"
        case .energy: return "energy"; case .stress: return "stress"
        case .symptoms: return "symptoms"; case .triggers: return "triggers"
        }
    }
}

// MARK: - Machine

@Observable
@available(iOS 26, *)
private final class UnifiedVoiceMachine {

    var phase: VoicePhase   = .listening
    var heleneText          = ""
    var userTranscript      = ""
    var audioLevel: CGFloat = 0

    var conversationLog: [(role: String, text: String)] = []

    var turnCount:         Int      = 0
    var isSaving:          Bool     = false
    var savedSections:     [String] = []
    var showSuccess:       Bool     = false
    var endAfterReply:     Bool     = false  // set when user says goodbye — closes after Helene responds
    private var silentRetryCount = 0          // counts consecutive empty transcripts

    // Structured check-in state (Swift-driven, not AI-driven)
    private(set) var checkInMode        = false
    private var awaitingConfirmation    = false
    private var checkInFieldIdx         = 0
    private var ciMood    = 0; private var ciSleep    = 0
    private var ciEnergy  = 0; private var ciStress   = 0
    private var ciSymptoms: [String]    = []
    private var ciTriggers: [String]    = []
    private var ciNote:      String     = ""
    var onCheckInConfirmed: ((Int, Int, Int, Int, [String], [String], String) -> Void)?

    // Stored at start so End button can trigger save without extra params
    private(set) var needsCheckIn: Bool = false
    private(set) var needsMRS:     Bool = false

    private let recognizer     = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine    = AVAudioEngine()
    private let synthesizer    = AVSpeechSynthesizer()
    private let ttsDelegate    = SpeechDelegate()
    private let playerDelegate = AudioPlayerDelegate()
    private var audioPlayer:   AVAudioPlayer?

    private var speechQueue:  [String] = []
    private var isSpeaking    = false
    private var isGenerating  = false

    private var recognitionTask:    SFSpeechRecognitionTask?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var silenceTimer:       Timer?
    private var isEnding            = false
    private var voice: AVSpeechSynthesisVoice?

    private var session: LanguageModelSession?

    init() {
        let all = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("en") }
        let femaleNames = ["Ava", "Serena", "Nicky", "Zoe", "Kate",
                           "Samantha", "Karen", "Victoria", "Moira", "Tessa"]
        var found: AVSpeechSynthesisVoice?
        outer: for quality in [AVSpeechSynthesisVoiceQuality.premium, .enhanced, .default] {
            for name in femaleNames {
                if let v = all.first(where: { $0.quality == quality &&
                    $0.name.localizedCaseInsensitiveContains(name) }) {
                    found = v; break outer
                }
            }
        }
        voice = found ?? AVSpeechSynthesisVoice(language: "en-US")

        synthesizer.delegate = ttsDelegate
        ttsDelegate.onFinish = { [weak self] in
            guard let self, !self.isEnding else { return }
            self.isSpeaking = false
            self.checkAndAdvance()
        }
        playerDelegate.onFinish = { [weak self] in
            guard let self, !self.isEnding else { return }
            self.isSpeaking = false
            self.checkAndAdvance()
        }
    }

    // MARK: - Start

    func start(profile: UserProfile, hasCheckInToday: Bool, mrsDueThisWeek: Bool,
               entries: [CheckInEntry], mrs: [MRSEntry], treatments: [TreatmentEntry]) {
        isEnding      = false
        needsCheckIn  = true   // always attempt extraction — save only if mood was collected
        needsMRS      = mrsDueThisWeek
        buildSession(profile: profile, hasCheckInToday: hasCheckInToday, mrsDueThisWeek: mrsDueThisWeek,
                     entries: entries, mrs: mrs, treatments: treatments)
        Task {
            await requestPermissionsThenGreet(profile: profile,
                                              hasCheckInToday: hasCheckInToday,
                                              mrsDueThisWeek: mrsDueThisWeek)
        }
    }

    private func requestPermissionsThenGreet(profile: UserProfile,
                                             hasCheckInToday: Bool,
                                             mrsDueThisWeek: Bool) async {
        let auth = await withCheckedContinuation { c in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0) }
        }
        guard auth == .authorized else { return }
        guard await AVAudioApplication.requestRecordPermission() else { return }

        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playAndRecord, mode: .voiceChat,
                           options: [.defaultToSpeaker, .allowBluetooth])
        try? s.setActive(true)

        // Use the AI to generate a data-driven opening; fallback to a static greeting
        await MainActor.run { phase = .thinking }
        var greeting = buildFallbackGreeting(profile: profile)
        if let sess = session,
           let result = try? await sess.respond(to: "[START]", generating: VoiceReply.self) {
            let parts = [result.content.s1, result.content.s2]
                .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
            if !parts.isEmpty { greeting = parts }
        }
        conversationLog.append((role: "helene", text: greeting))
        await MainActor.run { heleneText = greeting; phase = .speaking }
        enqueueAndSpeak(greeting)
    }

    private func buildFallbackGreeting(profile: UserProfile) -> String {
        let name = profile.firstName.isEmpty ? "" : " \(profile.firstName)"
        let hour = Calendar.current.component(.hour, from: Date())
        let timeGreeting = hour < 12 ? "Good morning" : (hour < 18 ? "Hey" : "Good evening")
        return "\(timeGreeting)\(name)! How are you today — how can I help?"
    }

    // MARK: - Speech queue

    private func checkAndAdvance() {
        guard !isEnding, !isSpeaking else { return }
        if let next = speechQueue.first {
            speechQueue.removeFirst()
            isSpeaking = true
            Task { await speakText(next) }
        } else if !isGenerating {
            if endAfterReply {
                endAfterReply = false
                onEndRequested?()   // triggers save + dismiss in the view
            } else {
                beginRecognition()
            }
        }
    }

    // Callback set by the view so the machine can request dismissal
    var onEndRequested: (() -> Void)?

    private func enqueueAndSpeak(_ text: String) {
        let clean = stripMarkdown(text)
        guard !clean.isEmpty else { return }
        if isSpeaking {
            speechQueue.append(clean)
        } else {
            isSpeaking = true
            Task { await speakText(clean) }
        }
    }

    // MARK: - Tap

    func handleTap() {
        switch phase {
        case .listening: stopListeningAndSend()
        case .speaking:
            speechQueue.removeAll()
            isGenerating = false
            isSpeaking   = false
            if audioPlayer?.isPlaying == true {
                audioPlayer?.stop(); audioPlayer = nil
            } else {
                synthesizer.stopSpeaking(at: .immediate)
            }
            beginRecognition()
        case .thinking: break
        }
    }

    // MARK: - Recognition

    func beginRecognition() {
        guard !isEnding else { return }
        userTranscript = ""; audioLevel = 0; phase = .listening
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil; recognitionRequest = nil
        audioEngine.inputNode.removeTap(onBus: 0)
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.reset()

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults  = true
        request.requiresOnDeviceRecognition = recognizer?.supportsOnDeviceRecognition ?? false
        recognitionRequest = request

        let node   = audioEngine.inputNode
        let format = node.outputFormat(forBus: 0)
        node.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
            guard let data = buffer.floatChannelData?[0] else { return }
            let n = Int(buffer.frameLength); guard n > 0 else { return }
            var sum: Float = 0
            for i in 0..<n { sum += data[i] * data[i] }
            let level = CGFloat(min(1.0, sqrt(sum / Float(n)) * 45))
            DispatchQueue.main.async { self?.audioLevel = level }
        }
        audioEngine.prepare(); try? audioEngine.start()

        recognitionTask = recognizer?.recognitionTask(with: request) { [weak self] result, _ in
            guard let self, let result else { return }
            DispatchQueue.main.async {
                self.userTranscript = result.bestTranscription.formattedString
                self.silenceTimer?.invalidate()
                self.silenceTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: false) { _ in
                    self.stopListeningAndSend()
                }
            }
        }
    }

    private func stopListeningAndSend() {
        silenceTimer?.invalidate(); silenceTimer = nil
        recognitionRequest?.endAudio()
        audioEngine.inputNode.removeTap(onBus: 0)
        if audioEngine.isRunning { audioEngine.stop() }
        recognitionTask?.cancel(); recognitionTask = nil; recognitionRequest = nil
        audioLevel = 0
        let text = userTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            silentRetryCount += 1
            if silentRetryCount >= 3 {
                silentRetryCount = 0
                let prompt = "Still there? Take your time."
                heleneText = prompt; phase = .speaking
                conversationLog.append((role: "helene", text: prompt))
                enqueueAndSpeak(prompt)
            } else {
                beginRecognition()
            }
            return
        }
        silentRetryCount = 0
        conversationLog.append((role: "user", text: text))
        turnCount += 1

        // Check-in state machine handles its own answers — no AI involved
        if checkInMode {
            handleCheckInAnswer(text)
            return
        }

        let lower = text.lowercased()
        // Whole-word match for short words to avoid false positives ("end" inside "change", etc.)
        let words = Set(lower.components(separatedBy: .whitespacesAndNewlines)
            .map { $0.trimmingCharacters(in: .punctuationCharacters) })
        let farewellWords: Set<String> = ["bye", "goodbye", "ciao", "adieu"]
        let farewellPhrases = ["that's all", "thats all", "i'm done", "im done",
                                "we're done", "were done", "talk later", "see you later",
                                "thanks bye", "that's it", "thats it"]
        let isFarewell = !farewellWords.isDisjoint(with: words) ||
                          farewellPhrases.contains(where: { lower.contains($0) })
        if isFarewell { endAfterReply = true }

        // Voice-triggered check-in: detect intent without button tap
        let checkInTriggers = ["check in", "check-in", "daily check", "log my day", "log today",
                                "start check", "do a check", "want to check", "like to check",
                                "do my check", "start my check"]
        if !checkInMode && checkInTriggers.contains(where: { lower.contains($0) }) {
            startCheckIn()
            return
        }

        Task { await sendToAI(text) }
    }

    // MARK: - AI (sentence-streaming)

    private func sendToAI(_ text: String) async {
        await MainActor.run { phase = .thinking }
        guard let s = session else { await MainActor.run { beginRecognition() }; return }

        var lastS1: String? = nil
        var lastS2: String? = nil
        var spokenS1        = false
        isGenerating        = true

        do {
            let stream = s.streamResponse(to: text, generating: VoiceReply.self)
            for try await snapshot in stream {
                await MainActor.run {
                    let partial = snapshot.content
                    if let v = partial.s1, !v.isEmpty { lastS1 = v }
                    if let v = partial.s2             { lastS2 = v }

                    heleneText = [lastS1, lastS2].compactMap { $0 }.joined(separator: " ")

                    if !spokenS1, let s1 = lastS1, lastS2 != nil {
                        spokenS1 = true
                        phase    = .speaking
                        enqueueAndSpeak(s1)
                    }
                }
            }

            await MainActor.run {
                isGenerating = false
                let fullResponse = [lastS1, lastS2].compactMap { $0 }.joined(separator: " ")
                if !fullResponse.isEmpty {
                    conversationLog.append((role: "helene", text: fullResponse))
                }

                if spokenS1 {
                    if let s2 = lastS2, !s2.isEmpty { enqueueAndSpeak(s2) }
                    checkAndAdvance()
                } else if let s1 = lastS1, !s1.isEmpty {
                    phase = .speaking
                    enqueueAndSpeak(s1)
                } else {
                    beginRecognition()
                }
            }
        } catch {
            await MainActor.run {
                isGenerating = false
                let fallback = "Say that again?"
                heleneText   = fallback
                phase        = .speaking
                enqueueAndSpeak(fallback)
            }
        }
    }

    // MARK: - TTS routing

    private func speakText(_ text: String) async {
        guard !text.isEmpty else { isSpeaking = false; checkAndAdvance(); return }
        if !ElevenLabsConfig.apiKey.isEmpty {
            await speakWithElevenLabs(text)
        } else {
            await MainActor.run { speakWithApple(text) }
        }
    }

    private func speakWithElevenLabs(_ text: String) async {
        let urlStr = "https://api.elevenlabs.io/v1/text-to-speech/\(ElevenLabsConfig.voiceId)?output_format=mp3_44100_128"
        guard let url = URL(string: urlStr) else {
            await MainActor.run { speakWithApple(text) }; return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(ElevenLabsConfig.apiKey, forHTTPHeaderField: "xi-api-key")
        let body: [String: Any] = [
            "text": text,
            "model_id": ElevenLabsConfig.modelId,
            "voice_settings": ["stability": 0.5, "similarity_boost": 0.75]
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        guard let (data, _) = try? await URLSession.shared.data(for: req) else {
            await MainActor.run { speakWithApple(text) }; return
        }
        let tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".mp3")
        guard (try? data.write(to: tmp)) != nil else {
            await MainActor.run { speakWithApple(text) }; return
        }
        await MainActor.run {
            if let player = try? AVAudioPlayer(contentsOf: tmp) {
                audioPlayer = player
                audioPlayer?.delegate = playerDelegate
                audioPlayer?.play()
            } else {
                speakWithApple(text)
            }
        }
    }

    private func speakWithApple(_ text: String) {
        let u = AVSpeechUtterance(string: text)
        u.voice = voice; u.rate = 0.50; u.pitchMultiplier = 1.0
        u.volume = 1.0; u.preUtteranceDelay = 0.04
        synthesizer.speak(u)
    }

    private func stripMarkdown(_ raw: String) -> String {
        raw
            .replacingOccurrences(of: #"\*\*(.+?)\*\*"#, with: "$1", options: .regularExpression)
            .replacingOccurrences(of: #"\*(.+?)\*"#,     with: "$1", options: .regularExpression)
            .replacingOccurrences(of: "**", with: "")
            .replacingOccurrences(of: "•",  with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Stop mic (soft — keeps session alive)

    func stopListening() {
        silenceTimer?.invalidate(); silenceTimer = nil
        recognitionRequest?.endAudio()
        audioEngine.inputNode.removeTap(onBus: 0)
        if audioEngine.isRunning { audioEngine.stop() }
        recognitionTask?.cancel(); recognitionTask = nil; recognitionRequest = nil
        audioLevel = 0
    }

    // MARK: - Structured check-in state machine

    func startCheckIn() {
        checkInMode = true; awaitingConfirmation = false; checkInFieldIdx = 0
        ciMood = 0; ciSleep = 0; ciEnergy = 0; ciStress = 0
        ciSymptoms = []; ciTriggers = []; ciNote = ""
        speakCheckInQuestion()
    }

    private func speakCheckInQuestion() {
        guard checkInFieldIdx < CheckInField.allCases.count else { speakSummaryAndConfirm(); return }
        let q = CheckInField(rawValue: checkInFieldIdx)!.question
        heleneText = q; phase = .speaking
        conversationLog.append((role: "helene", text: q))
        enqueueAndSpeak(q)
    }

    private func handleCheckInAnswer(_ text: String) {
        if awaitingConfirmation { handleConfirmation(text); return }
        let lower = text.lowercased()
        let isSkip = ["skip","pass","next","nothing","none","no","don't"].contains(where: { lower.contains($0) })
        let field = CheckInField(rawValue: checkInFieldIdx)!
        var ack = ""

        switch field {
        case .mood, .sleep, .energy, .stress:
            if let n = extractCheckInNumber(from: lower), !isSkip {
                switch field {
                case .mood:   ciMood   = n
                case .sleep:  ciSleep  = n
                case .energy: ciEnergy = n
                case .stress: ciStress = n
                default: break
                }
                let empathy = n <= 2 ? (field == .stress ? " Glad you're calm." : " That sounds tough.") :
                              n >= 5 ? " Great!" : ""
                ack = "Got it, \(field.label) \(n) out of 5.\(empathy)"
            } else if isSkip {
                ack = "No problem."
            } else {
                let reask = "I need a number from 1 to 5 for that."
                heleneText = reask; phase = .speaking
                conversationLog.append((role: "helene", text: reask))
                enqueueAndSpeak(reask)
                return // don't advance, re-ask same field
            }
        case .symptoms:
            let symResult = extractCheckInSymptoms(from: lower)
            ciSymptoms = symResult.ids
            if !symResult.extra.isEmpty {
                let entry = "symptoms: \(symResult.extra)"
                ciNote = ciNote.isEmpty ? entry : "\(ciNote); \(entry)"
            }
            ack = ciSymptoms.isEmpty && symResult.extra.isEmpty ? "Got it, no symptoms noted." : "Noted."
        case .triggers:
            let trgResult = extractCheckInTriggers(from: lower)
            ciTriggers = trgResult.ids
            if !trgResult.extra.isEmpty {
                let entry = "triggers: \(trgResult.extra)"
                ciNote = ciNote.isEmpty ? entry : "\(ciNote); \(entry)"
            }
            ack = ciTriggers.isEmpty && trgResult.extra.isEmpty ? "Got it, no particular triggers." : "Noted."
        }

        checkInFieldIdx += 1
        heleneText = ack; phase = .speaking
        conversationLog.append((role: "helene", text: ack))
        if !ack.isEmpty { enqueueAndSpeak(ack) }
        speakCheckInQuestion() // speaks next field, or calls speakSummaryAndConfirm if all done
    }

    private func speakSummaryAndConfirm() {
        awaitingConfirmation = true
        let nums = [(ciMood,"mood"),(ciSleep,"sleep"),(ciEnergy,"energy"),(ciStress,"stress")]
            .filter { $0.0 > 0 }.map { "\($0.1) \($0.0)/5" }.joined(separator: ", ")
        let symStr = ciSymptoms.isEmpty ? "" : " Symptoms: \(ciSymptoms.joined(separator: ", "))."
        let trgStr = ciTriggers.isEmpty ? "" : " Triggers: \(ciTriggers.joined(separator: ", "))."
        let noteStr = ciNote.isEmpty ? "" : " Also noted: \(ciNote)."
        let summary = "Here's what I have — \(nums.isEmpty ? "nothing numeric" : nums).\(symStr)\(trgStr)\(noteStr) Does that sound right?"
        heleneText = summary; phase = .speaking
        conversationLog.append((role: "helene", text: summary))
        enqueueAndSpeak(summary)
    }

    private func handleConfirmation(_ text: String) {
        let lower = text.lowercased()
        // Check for a correction like "change mood to 4" or "mood was 3"
        for field in [CheckInField.mood, .sleep, .energy, .stress] {
            if lower.contains(field.label), let n = extractCheckInNumber(from: lower) {
                switch field {
                case .mood:   ciMood   = n
                case .sleep:  ciSleep  = n
                case .energy: ciEnergy = n
                case .stress: ciStress = n
                default: break
                }
                let ack = "Updated \(field.label) to \(n)."
                heleneText = ack; phase = .speaking
                conversationLog.append((role: "helene", text: ack))
                enqueueAndSpeak(ack)
                speakSummaryAndConfirm()
                return
            }
        }
        // Any affirmative → save, show success overlay, auto-dismiss
        checkInMode = false; awaitingConfirmation = false
        needsCheckIn = false // captured directly — skip transcript re-extraction
        let mood = ciMood; let sleep = ciSleep; let energy = ciEnergy; let stress = ciStress
        let symptoms = ciSymptoms; let triggers = ciTriggers; let note = ciNote
        onCheckInConfirmed?(mood, sleep, energy, stress, symptoms, triggers, note)
        savedSections = ["Check-in"]
        isSaving      = false
        showSuccess   = true  // overlay auto-dismisses → HomeView shows updated card
    }

    // MARK: - Check-in extraction helpers

    private func extractCheckInNumber(from text: String) -> Int? {
        let wordMap = ["one":1,"two":2,"three":3,"four":4,"five":5]
        for (word, n) in wordMap where text.contains(word) && !text.contains("fourteen") { return n }
        for c in text { if let n = Int(String(c)), n >= 1, n <= 5 { return n } }
        return nil
    }

    private func extractCheckInSymptoms(from text: String) -> (ids: [String], extra: String) {
        let map: [([String], String)] = [
            (["hot flash","flush","sweat","night sweat"], "hotflashes"),
            (["fatigue","tired","exhausted"], "fatigue"),
            (["brain fog","foggy","fog","focus"], "brainfog"),
            (["anxiety","anxious","panic","worry"], "anxiety"),
            (["joint","joints","muscle pain","ache"], "jointpain"),
            (["sleep problem","insomnia","can't sleep","sleepless"], "sleep"),
            (["mood swing","irritable","moody"], "moodswings"),
            (["weight"], "weight")
        ]
        let ids = map.compactMap { (keywords, id) in
            keywords.contains(where: { text.contains($0) }) ? id : nil
        }
        // Strip matched keywords to find unrecognized free-form words
        var reduced = text
        for (keywords, _) in map where keywords.contains(where: { text.contains($0) }) {
            for kw in keywords { reduced = reduced.replacingOccurrences(of: kw, with: " ") }
        }
        let fillers: Set<String> = ["i","had","have","some","and","or","the","a","my","today",
                                     "been","felt","feeling","just","bit","little","also","any",
                                     "no","yes","yeah","nope","not","got","kind","of","was","is",
                                     "are","do","did","yes","skip","pass","none","nothing"]
        let separators = CharacterSet.whitespacesAndNewlines.union(.punctuationCharacters)
        let extra = reduced
            .components(separatedBy: separators)
            .map { $0.lowercased().trimmingCharacters(in: .whitespaces) }
            .filter { $0.count > 2 && !fillers.contains($0) }
            .joined(separator: " ")
        return (ids, extra)
    }

    private func extractCheckInTriggers(from text: String) -> (ids: [String], extra: String) {
        let map: [([String], String)] = [
            (["caffeine","coffee","tea"], "coffee"),
            (["alcohol","wine","beer","drink"], "alcohol"),
            (["exercise","workout","gym","walk","run"], "exercise"),
            (["work stress","work","meeting","deadline","boss"], "workstress"),
            (["medication","medicine","pill"], "medication"),
            (["outdoor","outside","nature","fresh air"], "outdoor"),
            (["social","friend","people","party"], "social"),
            (["poor sleep","bad sleep","disrupted","restless"], "disruptedsleep")
        ]
        let ids = map.compactMap { (keywords, id) in
            keywords.contains(where: { text.contains($0) }) ? id : nil
        }
        // Strip matched keywords to find unrecognized free-form words
        var reduced = text
        for (keywords, _) in map where keywords.contains(where: { text.contains($0) }) {
            for kw in keywords { reduced = reduced.replacingOccurrences(of: kw, with: " ") }
        }
        let fillers: Set<String> = ["i","had","have","some","and","or","the","a","my","today",
                                     "been","felt","feeling","just","bit","little","also","any",
                                     "no","yes","yeah","nope","not","got","kind","of","was","is",
                                     "are","do","did","yes","skip","pass","none","nothing"]
        let separators = CharacterSet.whitespacesAndNewlines.union(.punctuationCharacters)
        let extra = reduced
            .components(separatedBy: separators)
            .map { $0.lowercased().trimmingCharacters(in: .whitespaces) }
            .filter { $0.count > 2 && !fillers.contains($0) }
            .joined(separator: " ")
        return (ids, extra)
    }

    // MARK: - Stop all

    func stopAll() {
        isEnding = true
        silenceTimer?.invalidate()
        speechQueue.removeAll()
        recognitionRequest?.endAudio()
        audioEngine.inputNode.removeTap(onBus: 0)
        if audioEngine.isRunning { audioEngine.stop() }
        recognitionTask?.cancel()
        synthesizer.stopSpeaking(at: .immediate)
        audioPlayer?.stop(); audioPlayer = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: - Save all

    func saveAll(context: ModelContext, needsCheckIn: Bool, needsMRS: Bool) async {
        await MainActor.run { isSaving = true; stopListening() }

        let transcript = fullTranscript()
        var saved: [String] = []

        // Check-in extraction
        if needsCheckIn {
            let s = LanguageModelSession(instructions: """
            Extract daily wellness check-in data from this voice conversation.
            Use 0 for any numeric field not discussed.
            Mood: use the number given, or infer from words — "great/excellent"→5, "good"→4, \
            "okay/fine/alright"→3, "low/not great/rough"→2, "terrible/awful/really bad"→1. \
            Set to 0 only if mood was truly never mentioned at all.
            Symptoms — only use these IDs: sleep, anxiety, fatigue, hotflashes, brainfog, moodswings, weight, jointpain
            Triggers — only use these IDs: coffee, alcohol, exercise, workstress, medication, outdoor, social, disruptedsleep
            """)
            if let result = try? await s.respond(to: transcript, generating: CheckInExtraction.self) {
                let e = result.content
                // Save if any meaningful data was collected
                let anyData = e.mood > 0 || e.sleepQuality > 0 || e.energyLevel > 0 || e.stressLevel > 0
                if anyData {
                    let today    = Calendar.current.startOfDay(for: Date())
                    let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
                    let descriptor = FetchDescriptor<CheckInEntry>(
                        predicate: #Predicate { $0.date >= today && $0.date < tomorrow }
                    )
                    await MainActor.run {
                        if let existing = try? context.fetch(descriptor).first {
                            if e.mood         > 0 { existing.mood         = clamp(e.mood, 1...5) }
                            if e.sleepQuality > 0 { existing.sleepQuality = e.sleepQuality }
                            if e.energyLevel  > 0 { existing.energyLevel  = e.energyLevel  }
                            if e.stressLevel  > 0 { existing.stressLevel  = e.stressLevel  }
                            let syms = parseCSV(e.symptoms)
                            let trgs = parseCSV(e.triggers)
                            if !syms.isEmpty { existing.symptoms = syms }
                            if !trgs.isEmpty { existing.triggers = trgs }
                            if !e.note.isEmpty { existing.note = e.note }
                        } else {
                            context.insert(CheckInEntry(
                                mood: clamp(e.mood, 1...5),
                                symptoms: parseCSV(e.symptoms), note: e.note,
                                sleepQuality: e.sleepQuality, energyLevel: e.energyLevel,
                                stressLevel: e.stressLevel, triggers: parseCSV(e.triggers)
                            ))
                        }
                    }
                    saved.append("Check-in")
                }
            }
        }

        // MRS extraction
        if needsMRS {
            let s = LanguageModelSession(instructions: """
            Extract MRS (Menopause Rating Scale) scores from this voice conversation. \
            Each field: 0=none, 1=mild, 2=moderate, 3=severe, 4=very severe. Use 0 if not mentioned.
            Natural-language mapping: "not at all/none" → 0, "a little/mild" → 1, \
            "moderate/sometimes" → 2, "a lot/severe" → 3, "very severe/terrible" → 4.
            """)
            if let result = try? await s.respond(to: transcript, generating: MRSExtraction.self) {
                let e = result.content
                let entry = MRSEntry(
                    hotFlashes:      clamp(e.hotFlashes,      0...4),
                    heartDiscomfort: clamp(e.heartDiscomfort, 0...4),
                    sleepProblems:   clamp(e.sleepProblems,   0...4),
                    jointPain:       clamp(e.jointPain,       0...4),
                    depressiveMood:  clamp(e.depressiveMood,  0...4),
                    irritability:    clamp(e.irritability,    0...4),
                    anxiety:         clamp(e.anxiety,         0...4),
                    exhaustion:      clamp(e.exhaustion,      0...4),
                    sexualProblems:  clamp(e.sexualProblems,  0...4),
                    bladderProblems: clamp(e.bladderProblems, 0...4),
                    vaginalDryness:  clamp(e.vaginalDryness,  0...4)
                )
                await MainActor.run { context.insert(entry) }
                saved.append("Assessment")
            }
        }

        // Treatments extraction (only explicit, named changes — never symptoms or check-in data)
        let tS = LanguageModelSession(instructions: """
        Extract ONLY treatment or lifestyle changes where the user explicitly stated they \
        STARTED, STOPPED, ADJUSTED, or PAUSED something specific by name.

        VALID examples (extract these):
        "I started magnesium glycinate", "I stopped my HRT", "I cut out caffeine", \
        "I began progesterone", "I quit alcohol", "I increased my vitamin D dose"

        NEVER extract these — they are symptoms or health feelings, not treatments:
        - Symptoms: hot flashes, fatigue, anxiety, brain fog, joint pain, mood swings
        - Mood or numeric scores: "my mood was 3", "energy 4 out of 5"
        - Sleep quality, energy level, or stress ratings from the check-in
        - General feelings or experiences ("I felt tired", "I had a rough night")
        - Anything the user merely experienced rather than actively changed

        A valid entry requires BOTH: a specific named substance or habit AND an explicit \
        action verb (started / stopped / adjusted / paused / cut out / began / quit).

        If nothing meets these criteria, return empty strings for ALL fields.
        Categories: hrt, supplement, lifestyle, medication
        Statuses: started, stopped, adjusted, paused
        """)
        if let result = try? await tS.respond(to: transcript, generating: TreatmentListExtraction.self) {
            let e          = result.content
            let names      = parseCSV(e.names)
            let categories = parseCSV(e.categories)
            let statuses   = parseCSV(e.statuses)
            let notes      = parseCSV(e.notes)
            let validCats  = Set(["hrt", "supplement", "lifestyle", "medication"])
            let validStats = Set(["started", "stopped", "adjusted", "paused"])
            if !names.isEmpty {
                await MainActor.run {
                    for (i, name) in names.enumerated() where !name.isEmpty {
                        let cat    = categories.indices.contains(i) ? categories[i] : "lifestyle"
                        let status = statuses.indices.contains(i)   ? statuses[i]   : "started"
                        let note   = notes.indices.contains(i)      ? notes[i]      : ""
                        context.insert(TreatmentEntry(
                            category: validCats.contains(cat)   ? cat    : "lifestyle",
                            name:     name,
                            status:   validStats.contains(status) ? status : "started",
                            note:     note
                        ))
                    }
                }
                saved.append("Treatments")
            }
        }

        await MainActor.run {
            try? context.save()
            savedSections = saved
            isSaving      = false
            showSuccess   = true
        }
    }

    // MARK: - Helpers

    private func fullTranscript() -> String {
        conversationLog
            .map { "\($0.role == "helene" ? "Helene" : "User"): \($0.text)" }
            .joined(separator: "\n")
    }

    private func parseCSV(_ raw: String) -> [String] {
        raw.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    private func clamp(_ value: Int, _ range: ClosedRange<Int>) -> Int {
        min(range.upperBound, max(range.lowerBound, value))
    }

    // MARK: - Session

    func buildSession(profile: UserProfile, hasCheckInToday: Bool, mrsDueThisWeek: Bool,
                      entries: [CheckInEntry], mrs: [MRSEntry], treatments: [TreatmentEntry]) {
        guard case .available = SystemLanguageModel.default.availability else { return }

        let name  = profile.firstName.isEmpty ? "her" : profile.firstName
        let stage = profile.journeyStage.isEmpty ? "unknown" : profile.journeyStage

        var extraParts: [String] = []
        if !profile.ageRange.isEmpty          { extraParts.append("Age: \(profile.ageRange)") }
        if !profile.hrtStatus.isEmpty         { extraParts.append("HRT: \(profile.hrtStatus)") }
        if !profile.exerciseFrequency.isEmpty { extraParts.append("Exercise: \(profile.exerciseFrequency)") }
        let extras = extraParts.joined(separator: " | ")

        let df  = DateFormatter(); df.dateFormat = "MMM d"
        let df2 = DateFormatter(); df2.dateStyle = .medium

        // Last 14 check-ins — full detail
        let recent14 = Array(entries.prefix(14))
        let checkInCtx: String
        if recent14.isEmpty {
            checkInCtx = "None yet."
        } else {
            checkInCtx = recent14.map { e -> String in
                let sym = e.symptoms.isEmpty ? "none" : e.symptoms.joined(separator: ", ")
                let trg = e.triggers.isEmpty  ? ""    : " | triggers: \(e.triggers.joined(separator: ", "))"
                let extra = [
                    e.sleepQuality > 0 ? "sleep \(e.sleepQuality)/5" : nil,
                    e.energyLevel  > 0 ? "energy \(e.energyLevel)/5" : nil,
                    e.stressLevel  > 0 ? "stress \(e.stressLevel)/5" : nil
                ].compactMap { $0 }.joined(separator: ", ")
                let note = e.note.isEmpty ? "" : " | note: \"\(e.note)\""
                return "- \(df.string(from: e.date)): mood \(e.mood)/5\(extra.isEmpty ? "" : ", \(extra)") | symptoms: \(sym)\(trg)\(note)"
            }.joined(separator: "\n")
        }

        // 30-day trend summary
        let cutoff30 = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
        let last30   = entries.filter { $0.date >= cutoff30 }
        let trendCtx: String
        if last30.isEmpty {
            trendCtx = "Not enough data yet."
        } else {
            let avgMood   = last30.map { Double($0.mood) }.reduce(0, +) / Double(last30.count)
            let avgSleep  = last30.filter { $0.sleepQuality > 0 }.map { Double($0.sleepQuality) }
            let avgEnergy = last30.filter { $0.energyLevel  > 0 }.map { Double($0.energyLevel) }
            let avgStress = last30.filter { $0.stressLevel  > 0 }.map { Double($0.stressLevel) }
            var freq: [String: Int] = [:]
            last30.flatMap { $0.symptoms }.forEach { freq[$0, default: 0] += 1 }
            let topSymptoms = freq.sorted { $0.value > $1.value }.prefix(5)
                .map { "\($0.key) (\($0.value)×)" }.joined(separator: ", ")
            var trigFreq: [String: Int] = [:]
            last30.flatMap { $0.triggers }.forEach { trigFreq[$0, default: 0] += 1 }
            let topTriggers = trigFreq.sorted { $0.value > $1.value }.prefix(3)
                .map { "\($0.key) (\($0.value)×)" }.joined(separator: ", ")
            let avg = { (arr: [Double]) -> String in
                arr.isEmpty ? "n/a" : String(format: "%.1f", arr.reduce(0, +) / Double(arr.count))
            }
            trendCtx = "30-day avg — mood: \(String(format: "%.1f", avgMood))/5, sleep: \(avg(avgSleep))/5, energy: \(avg(avgEnergy))/5, stress: \(avg(avgStress))/5 | top symptoms: \(topSymptoms.isEmpty ? "none" : topSymptoms) | top triggers: \(topTriggers.isEmpty ? "none" : topTriggers)"
        }

        // MRS history — latest score + trend
        let mrsCtx: String
        if mrs.isEmpty {
            mrsCtx = "No MRS assessments yet."
        } else {
            let latest = mrs[0]
            let trend: String
            if mrs.count >= 2 {
                let delta = latest.totalScore - mrs[1].totalScore
                trend = delta < 0 ? " (improving, \(abs(delta)) pts down)" : delta > 0 ? " (worsening, \(delta) pts up)" : " (stable)"
            } else { trend = "" }
            let history = mrs.prefix(4).map { "\(df.string(from: $0.date)): \($0.totalScore)/44 \($0.severityLabel)" }.joined(separator: " → ")
            mrsCtx = "Latest: \(latest.totalScore)/44 (\(latest.severityLabel)) on \(df2.string(from: latest.date))\(trend) | history: \(history)"
        }

        // Treatments — last 8
        let txCtx = treatments.isEmpty ? "None logged." : treatments.prefix(8)
            .map { "[\($0.category.uppercased())] \($0.name) — \($0.status) (\(df.string(from: $0.date)))" }
            .joined(separator: "\n")

        // Yesterday's symptoms and triggers for context
        let prevEntry = entries.first(where: { !$0.isToday })
        let symptomNames = [
            "hotflashes": "hot flashes", "fatigue": "fatigue", "brainfog": "brain fog",
            "anxiety": "anxiety", "jointpain": "joint pain", "sleep": "sleep problems",
            "moodswings": "mood swings", "weight": "weight changes"
        ]
        let triggerNames = [
            "coffee": "caffeine", "alcohol": "alcohol", "exercise": "exercise",
            "workstress": "work stress", "disruptedsleep": "poor sleep",
            "social": "social activity", "outdoor": "time outdoors", "medication": "medication"
        ]
        let prevSymptoms = prevEntry.flatMap { $0.symptoms.isEmpty ? nil : $0.symptoms.compactMap { symptomNames[$0] }.joined(separator: ", ") } ?? "none on record"
        let prevTriggers = prevEntry.flatMap { $0.triggers.isEmpty ? nil : $0.triggers.compactMap { triggerNames[$0] }.joined(separator: ", ") } ?? "none on record"

        let checkInOffer = !hasCheckInToday
            ? "No check-in yet today — offer it naturally if the moment is right."
            : "Check-in already done today. Only redo it if she explicitly asks."
        let mrsOffer = mrsDueThisWeek
            ? "Weekly assessment is due — mention it if she seems open."
            : "Weekly assessment already done this week — don't bring it up."

        session = LanguageModelSession(instructions: """
        You are Helene — a warm AI companion for women in perimenopause and menopause.

        USER: \(name) | Stage: \(stage)\(extras.isEmpty ? "" : " | \(extras)")
        30-DAY TREND: \(trendCtx)
        MRS HISTORY: \(mrsCtx)
        TREATMENTS: \(txCtx)
        RECENT CHECK-INS:
        \(checkInCtx)

        DAILY CHECK-IN — \(checkInOffer)
        The check-in is a structured flow that starts automatically when the user requests it,
        either by saying "check in", "log my day", or tapping "Start Check-in". You do NOT ask
        the check-in questions yourself — the app handles that.
        Context for reference only — last symptoms: \(prevSymptoms). Last triggers: \(prevTriggers).

        WEEKLY ASSESSMENT — \(mrsOffer)
        If agreed: cover all 11 MRS dimensions one at a time — hot flashes, heart discomfort, sleep, joint/muscle pain, low mood, irritability, anxiety, exhaustion, sexual problems, bladder problems, vaginal dryness. Each rated none/mild/moderate/severe/very severe.

        TREATMENT LOGGING — if she mentions starting, stopping, or changing a medication, supplement, HRT, or lifestyle habit, note it.

        ALWAYS:
        - When the first message is "[START]": open with one warm sentence referencing something \
        specific from her data (a real trend, pattern, or notable change), then ask how you can help.
        - If the user says they just want to talk, skip all logging suggestions and just be present.
        - After the weekly assessment or treatment discussion, offer one brief specific insight.

        NEVER:
        - Say "I understand", "Of course", "Absolutely", "Great", "Certainly", "I see"
        - Use markdown, bullet points, or lists
        - Diagnose or prescribe
        - Ask two questions in one message
        """)
    }
}

// MARK: - Entry point

struct UnifiedVoiceView: View {
    var body: some View {
        if #available(iOS 26, *) { UnifiedVoiceContent() }
        else { UnifiedVoiceUnavailableView() }
    }
}

// MARK: - Content (iOS 26+)

@available(iOS 26, *)
private struct UnifiedVoiceContent: View {
    @Environment(\.dismiss)        private var dismiss
    @Environment(\.modelContext)   private var context
    @Environment(UserProfile.self) private var profile
    @Query(sort: \CheckInEntry.date,   order: .reverse) private var entries:    [CheckInEntry]
    @Query(sort: \MRSEntry.date,       order: .reverse) private var mrs:        [MRSEntry]
    @Query(sort: \TreatmentEntry.date, order: .reverse) private var treatments: [TreatmentEntry]

    @State private var machine = UnifiedVoiceMachine()

    private var hasCheckInToday: Bool {
        entries.first?.isToday == true
    }

    private var mrsDueThisWeek: Bool {
        let oneWeekAfter = Calendar.current.date(byAdding: .day, value: 7,
                                                  to: profile.accountCreatedAt) ?? profile.accountCreatedAt
        guard Date() >= oneWeekAfter else { return false }
        return !mrs.contains { $0.isThisWeek }
    }

    var body: some View {
        ZStack {
            background
            VStack(spacing: 0) {
                topBar
                Spacer(minLength: 32)
                heleneTextArea
                Spacer(minLength: 20)
                userArea
                Spacer(minLength: 48)
                endButton
                Spacer(minLength: 48)
            }

            if machine.showSuccess { successOverlay }
        }
        .contentShape(Rectangle())
        .onTapGesture { machine.handleTap() }
        .onAppear {
            guard case .available = SystemLanguageModel.default.availability else { return }
            machine.onEndRequested = {
                machine.stopAll()
                if machine.turnCount > 0 {
                    Task { await machine.saveAll(context: context,
                                                 needsCheckIn: machine.needsCheckIn,
                                                 needsMRS:     machine.needsMRS) }
                } else {
                    dismiss()
                }
            }
            machine.onCheckInConfirmed = { mood, sleep, energy, stress, symptoms, triggers, note in
                let today    = Calendar.current.startOfDay(for: Date())
                let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
                let descriptor = FetchDescriptor<CheckInEntry>(
                    predicate: #Predicate { $0.date >= today && $0.date < tomorrow }
                )
                if let existing = try? context.fetch(descriptor).first {
                    if mood    > 0 { existing.mood         = mood    }
                    if sleep   > 0 { existing.sleepQuality = sleep   }
                    if energy  > 0 { existing.energyLevel  = energy  }
                    if stress  > 0 { existing.stressLevel  = stress  }
                    if !symptoms.isEmpty { existing.symptoms = symptoms }
                    if !triggers.isEmpty { existing.triggers = triggers }
                    if !note.isEmpty     { existing.note     = note     }
                } else {
                    context.insert(CheckInEntry(
                        mood: max(1, mood), symptoms: symptoms, note: note,
                        sleepQuality: sleep, energyLevel: energy,
                        stressLevel: stress, triggers: triggers
                    ))
                }
                try? context.save()
            }
            machine.start(
                profile:         profile,
                hasCheckInToday: hasCheckInToday,
                mrsDueThisWeek:  mrsDueThisWeek,
                entries:         Array(entries),
                mrs:             Array(mrs),
                treatments:      Array(treatments)
            )
        }
        .onDisappear { machine.stopAll() }
    }

    // MARK: - Background

    private var background: some View {
        ZStack {
            Color(hex: "#0C0A09").ignoresSafeArea()
            RadialGradient(
                colors: [machine.phase.glowColor.opacity(0.35), .clear],
                center: .init(x: 0.5, y: 0.7),
                startRadius: 0, endRadius: 420
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 1.6), value: machine.phase.glowColor)
        }
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack {
            Button { machine.stopAll(); dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.45))
                    .frame(width: 32, height: 32)
                    .background(.white.opacity(0.07), in: Circle())
            }
            .buttonStyle(.plain)
            Spacer()
            Text("HELENE")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white.opacity(0.25))
                .tracking(4)
            Spacer()
            Color.clear.frame(width: 32, height: 32)
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    // MARK: - Helene text

    private var heleneTextArea: some View {
        ScrollView(showsIndicators: false) {
            Text(machine.heleneText.isEmpty ? " " : machine.heleneText)
                .font(.system(size: 22, weight: .light))
                .foregroundStyle(.white.opacity(machine.phase == .thinking ? 0.30 : 0.90))
                .multilineTextAlignment(.center)
                .lineSpacing(8)
                .padding(.horizontal, 32)
                .animation(.easeInOut(duration: 0.4), value: machine.heleneText)
                .animation(.easeInOut(duration: 0.6), value: machine.phase)
        }
        .frame(maxHeight: 260)
    }

    // MARK: - User transcript

    private var userArea: some View {
        Group {
            if machine.phase == .listening, !machine.userTranscript.isEmpty {
                Text(machine.userTranscript)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(.white.opacity(0.30))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal, 48)
                    .transition(.opacity)
            }
        }
        .frame(minHeight: 36)
        .animation(.easeInOut(duration: 0.3), value: machine.userTranscript.isEmpty)
    }

    // MARK: - Success overlay

    private var successOverlay: some View {
        ZStack {
            Color(hex: "#0C0A09").opacity(0.88).ignoresSafeArea()
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#8B6914").opacity(0.25))
                        .frame(width: 76, height: 76)
                    Image(systemName: "checkmark")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Text("Saved!")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
                if !machine.savedSections.isEmpty {
                    Text(machine.savedSections.joined(separator: " · "))
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.50))
                }
            }
        }
        .transition(.opacity)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                machine.stopAll(); dismiss()
            }
        }
    }

    // MARK: - Bottom buttons

    private var endButton: some View {
        VStack(spacing: 12) {
            if !machine.checkInMode && !machine.isSaving {
                Button { machine.startCheckIn() } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "checklist")
                            .font(.system(size: 12, weight: .semibold))
                        Text("Start Check-in")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(.white.opacity(0.13), in: Capsule())
                }
                .buttonStyle(.plain)
            }

            Button {
                machine.stopAll()
                if machine.turnCount > 0 {
                    Task { await machine.saveAll(context: context,
                                                 needsCheckIn: machine.needsCheckIn,
                                                 needsMRS:     machine.needsMRS) }
                } else {
                    dismiss()
                }
            } label: {
                Text("End & Save")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.45))
                    .padding(.horizontal, 28)
                    .padding(.vertical, 10)
                    .background(.white.opacity(0.06), in: Capsule())
            }
            .buttonStyle(.plain)
            .disabled(machine.isSaving)
        }
    }
}

// MARK: - Unavailable

private struct UnifiedVoiceUnavailableView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        ZStack {
            Color(hex: "#0C0A09").ignoresSafeArea()
            VStack(spacing: 0) {
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.45))
                            .frame(width: 32, height: 32)
                            .background(.white.opacity(0.07), in: Circle())
                    }
                    .buttonStyle(.plain)
                    Spacer()
                }
                .padding(.horizontal, 24).padding(.top, 20)
                Spacer()
                VStack(spacing: 14) {
                    Image(systemName: "waveform.and.mic")
                        .font(.system(size: 28, weight: .light))
                        .foregroundStyle(.white.opacity(0.4))
                    Text("Requires iOS 26 + Apple Intelligence")
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.4))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 48)
                }
                Spacer(); Spacer()
            }
        }
    }
}
