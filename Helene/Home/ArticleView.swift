import SwiftUI

// MARK: - Model

struct Article: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let fill: Color
    let heroIcon: String
    let readTime: String
    let sections: [ArticleSection]

    static func == (lhs: Article, rhs: Article) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct ArticleSection: Identifiable {
    let id = UUID()
    let heading: String?
    let body: String
}

// MARK: - Static Content

extension Article {
    static let all: [Article] = [understandingYourBody, trackYourPatterns, sleepAndMenopause]

    static let understandingYourBody = Article(
        id: "understanding-body",
        title: "Understanding your body",
        subtitle: "What's really happening during perimenopause",
        fill: HeleneTheme.lavenderFill,
        heroIcon: "figure.mind.and.body",
        readTime: "4 min read",
        sections: [
            ArticleSection(heading: nil, body: "If your body feels like it's changing in ways you don't recognise, that's because it is. Perimenopause isn't a sudden event — it's a gradual hormonal shift that can begin years before your last period, often in your early 40s (sometimes sooner)."),
            ArticleSection(heading: "What's actually happening", body: "Your ovaries begin producing less oestrogen and progesterone. These hormones don't just regulate your cycle — they influence your brain, bones, cardiovascular system, skin, and mood. As levels fluctuate unpredictably, your body adapts, and that adaptation is what you feel as symptoms.\n\nOestrogen affects serotonin and dopamine pathways, which is why mood and sleep can shift dramatically. It also regulates your body's thermostat, explaining why hot flashes can strike out of nowhere."),
            ArticleSection(heading: "Common symptoms — and why they happen", body: "Hot flashes occur because falling oestrogen confuses the hypothalamus, your internal thermostat. It reads normal body temperature as too warm and triggers sweating to cool you down.\n\nBrain fog is real and documented. Oestrogen supports cognitive function, and its fluctuation can temporarily affect memory and concentration — not permanently, but enough to be unsettling.\n\nJoint aches, heart palpitations, anxiety, skin changes, and irregular periods are all part of the same hormonal story."),
            ArticleSection(heading: "How long does this last?", body: "Perimenopause typically lasts 4 to 10 years. Menopause itself is defined as 12 consecutive months without a period. After that, you're in post-menopause — and for many women, symptoms gradually ease.\n\nBut every journey is different. Some women have mild symptoms for a few years; others experience significant disruption for longer."),
            ArticleSection(heading: "What can help", body: "Lifestyle factors make a real difference: regular movement, especially strength training and yoga; a diet rich in phytoestrogens (flaxseeds, soy, legumes); reducing alcohol and processed sugar; and prioritising sleep.\n\nFor moderate to severe symptoms, HRT (Hormone Replacement Therapy) is the most evidence-based medical treatment available. Speak to a menopause-informed GP or gynaecologist about your options — the conversation is worth having."),
        ]
    )

    static let trackYourPatterns = Article(
        id: "track-patterns",
        title: "Track your patterns",
        subtitle: "Why logging symptoms changes everything",
        fill: HeleneTheme.marigoldFill,
        heroIcon: "chart.line.uptrend.xyaxis",
        readTime: "3 min read",
        sections: [
            ArticleSection(heading: nil, body: "One of the most powerful things you can do during perimenopause is also one of the simplest: pay attention. Not obsessively — but intentionally. Tracking your symptoms, mood, sleep, and energy creates a picture that's impossible to hold in memory alone."),
            ArticleSection(heading: "The fog makes it harder to remember", body: "Brain fog is a real symptom of perimenopause — and it makes it genuinely difficult to recall how you felt last week, let alone last month. Writing it down isn't just helpful; it compensates for something your brain is temporarily less equipped to do on its own."),
            ArticleSection(heading: "What to track", body: "You don't need to log everything. Focus on:\n\n• Mood (a single 1–5 rating is enough)\n• Sleep quality\n• Physical symptoms (hot flashes, joint pain, headaches)\n• Energy level\n• Notable triggers (alcohol, stress, certain foods)\n\nEven 30 seconds a day adds up to meaningful data over weeks."),
            ArticleSection(heading: "Finding your triggers", body: "Patterns only become visible with time. You might notice that hot flashes peak around specific cycle days, or that anxiety spikes after poor sleep, or that certain foods reliably disrupt your rest. Without a log, these connections are invisible. With one, they become actionable."),
            ArticleSection(heading: "Preparing for your doctor", body: "A symptom log transforms a 10-minute appointment. Instead of trying to describe 'how you've been feeling lately', you can show your doctor concrete data: frequency, severity, duration, and context. Many women report that their appointments become dramatically more productive once they arrive with written records.\n\nYour Helene check-in history is yours to reference and share whenever you're ready."),
        ]
    )

    static let sleepAndMenopause = Article(
        id: "sleep-menopause",
        title: "Sleep & menopause",
        subtitle: "Why you wake at 3am — and what to do",
        fill: HeleneTheme.sageFill,
        heroIcon: "moon.stars.fill",
        readTime: "4 min read",
        sections: [
            ArticleSection(heading: nil, body: "Sleep disruption affects up to 68% of women in perimenopause. If you're waking at 3am, lying awake for an hour or two, or waking drenched in sweat — you're not imagining it, and it's not stress alone. There are clear biological reasons this happens."),
            ArticleSection(heading: "Why sleep changes during menopause", body: "Oestrogen and progesterone both play roles in sleep regulation. Progesterone has a mild sedative effect — as it drops, falling asleep becomes harder. Oestrogen influences REM sleep and emotional regulation.\n\nNight sweats are the most disruptive factor for many women: your body's overactive thermostat wakes you up to cool you down. Once awake at 3am, cortisol (your morning alert hormone) is already beginning to rise, making it genuinely difficult to fall back asleep."),
            ArticleSection(heading: "Evidence-based strategies", body: "Temperature control is the highest-impact change most women can make. Keep your bedroom at 16–18°C. Use moisture-wicking bedding. A cooling pillow or fan pointed at you can make a significant difference.\n\nSleep hygiene matters more during menopause: consistent wake times (even on weekends), no screens 90 minutes before bed, and limiting alcohol — which fragments sleep and worsens night sweats despite feeling like a relaxant.\n\nMagnesium glycinate (300–400mg before bed) has emerging evidence for improving sleep quality and reducing anxiety. Speak to your doctor before starting any supplement.\n\nMind-body practices — yoga nidra, progressive muscle relaxation, or even slow breathing — activate the parasympathetic nervous system and can ease the hyperarousal that keeps you awake."),
            ArticleSection(heading: "When to seek help", body: "If sleep disruption is significantly affecting your daily functioning, it's worth discussing with a doctor. Cognitive Behavioural Therapy for Insomnia (CBT-I) is the gold-standard non-hormonal treatment. HRT, if appropriate for you, often dramatically improves sleep by addressing night sweats at their hormonal root.\n\nPoor sleep is not something to push through. It compounds every other symptom — mood, cognition, pain tolerance, weight. Treating it is treating everything."),
        ]
    )
}

// MARK: - Article View

struct ArticleView: View {
    let article: Article

    private var shareText: String {
        var lines: [String] = [article.title, article.subtitle, ""]
        for section in article.sections {
            if let heading = section.heading { lines.append(heading) }
            lines.append(section.body)
            lines.append("")
        }
        lines.append("—")
        lines.append("Educational content from Helene. For informational purposes only — not medical advice.")
        return lines.joined(separator: "\n")
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 12) {
                    Text(article.readTime)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .textCase(.uppercase)
                        .tracking(0.8)

                    Text(article.title)
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)

                    Text(article.subtitle)
                        .font(.system(size: 16))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .lineSpacing(3)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, HeleneTheme.Spacing.lg)
                .padding(.vertical, HeleneTheme.Spacing.xl)
                .background(article.fill)
                .environment(\.colorScheme, .light)

                // Body sections
                VStack(alignment: .leading, spacing: HeleneTheme.Spacing.xl) {
                    ForEach(article.sections) { section in
                        VStack(alignment: .leading, spacing: 10) {
                            if let heading = section.heading {
                                Text(heading)
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            }
                            Text(section.body)
                                .font(.system(size: 15))
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                                .lineSpacing(5)
                        }
                    }

                    // Disclaimer
                    HStack(spacing: 10) {
                        Rectangle()
                            .fill(HeleneTheme.Colors.separator)
                            .frame(width: 3)
                            .cornerRadius(2)
                        Text("This article is for educational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional about your symptoms.")
                            .font(.caption)
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                            .lineSpacing(3)
                    }
                    .padding(HeleneTheme.Spacing.md)
                    .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))

                    Spacer(minLength: 60)
                }
                .textSelection(.enabled)
                .tint(HeleneTheme.rose)
                .padding(.horizontal, HeleneTheme.Spacing.lg)
                .padding(.top, HeleneTheme.Spacing.xl)
            }
        }
        .background(HeleneTheme.Colors.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
            }
        }
    }
}
