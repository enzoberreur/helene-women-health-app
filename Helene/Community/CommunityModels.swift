import SwiftUI

// MARK: - Tag

struct CommunityTag: Identifiable, Hashable {
    let id: String
    let name: String
    let icon: String
    let fill: Color

    static func == (lhs: CommunityTag, rhs: CommunityTag) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

// MARK: - Sort & Filter Options

enum PostSort: String, CaseIterable {
    case hot = "Hot"
    case new = "New"
    case top = "Top"

    var icon: String {
        switch self {
        case .hot: return "flame.fill"
        case .new: return "sparkles"
        case .top: return "arrow.up.circle.fill"
        }
    }
}

enum TimeFilter: String, CaseIterable {
    case week    = "Week"
    case month   = "Month"
    case year    = "Year"
    case allTime = "All time"
}

// MARK: - Poll

struct PollOption: Identifiable, Codable {
    var id    = UUID()
    var text:  String
    var votes: Int = 0
}

struct CommunityPoll: Codable {
    var options: [PollOption]
    var totalVotes: Int { options.map(\.votes).reduce(0, +) }
}

// MARK: - Post

struct CommunityPost: Identifiable, Codable {
    var id:               UUID   = UUID()
    var tags:             [String]
    var pseudonym:        String
    var avatarSeed:       Int
    var title:            String
    var body:             String
    var timestamp:        Date   = Date()
    var upvotes:          Int    = 0
    var comments:         [CommunityComment] = []
    var hasUpvoted:       Bool   = false
    var poll:             CommunityPoll? = nil
    var userVotedOption:  UUID?  = nil   // option id the user voted for
}

// MARK: - Comment (supports one level of nested replies)

struct CommunityComment: Identifiable, Codable {
    var id:         UUID   = UUID()
    var pseudonym:  String
    var avatarSeed: Int
    var body:       String
    var timestamp:  Date   = Date()
    var replies:    [CommunityComment] = []
}

// MARK: - Store

@Observable
final class CommunityStore {

    var posts:              [CommunityPost] = []
    var bookmarkedPostIds:  Set<UUID>       = []
    var reportedPostIds:    Set<UUID>       = []

    static let tags: [CommunityTag] = [
        CommunityTag(id: "sleep",         name: "Sleep & Rest",   icon: "moon.fill",           fill: HeleneTheme.lavenderFill),
        CommunityTag(id: "mood",          name: "Mind & Mood",    icon: "brain.head.profile",  fill: HeleneTheme.peachFill),
        CommunityTag(id: "body",          name: "Body Talk",      icon: "heart.fill",          fill: HeleneTheme.sageFill),
        CommunityTag(id: "work",          name: "Work & Life",    icon: "briefcase.fill",      fill: HeleneTheme.marigoldFill),
        CommunityTag(id: "relationships", name: "Relationships",  icon: "person.2.fill",       fill: HeleneTheme.mintFill),
        CommunityTag(id: "lounge",        name: "The Lounge",     icon: "cup.and.saucer.fill", fill: HeleneTheme.peachFill),
    ]

    init() { seedMockData() }

    // MARK: - Filtering & Sorting

    func filteredSorted(
        selectedTags: Set<String>,
        searchText: String,
        sort: PostSort,
        timeFilter: TimeFilter
    ) -> [CommunityPost] {

        var result = posts.filter { !reportedPostIds.contains($0.id) }

        // Tag filter — show posts that match ANY selected tag
        if !selectedTags.isEmpty {
            result = result.filter { !Set($0.tags).isDisjoint(with: selectedTags) }
        }

        // Search filter
        if !searchText.isEmpty {
            let q = searchText.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(q) || $0.body.lowercased().contains(q)
            }
        }

        // Time window (Top sort only)
        if sort == .top, timeFilter != .allTime {
            let now = Date()
            let cal = Calendar.current
            let cutoff: Date
            switch timeFilter {
            case .week:    cutoff = cal.date(byAdding: .weekOfYear, value: -1, to: now)!
            case .month:   cutoff = cal.date(byAdding: .month,      value: -1, to: now)!
            case .year:    cutoff = cal.date(byAdding: .year,        value: -1, to: now)!
            case .allTime: cutoff = .distantPast
            }
            result = result.filter { $0.timestamp >= cutoff }
        }

        // Sort
        switch sort {
        case .hot:
            result.sort { a, b in
                let ageA = max(Date().timeIntervalSince(a.timestamp) / 3600, 0.1)
                let ageB = max(Date().timeIntervalSince(b.timestamp) / 3600, 0.1)
                return (Double(a.upvotes + 1) / pow(ageA + 2, 1.5)) >
                       (Double(b.upvotes + 1) / pow(ageB + 2, 1.5))
            }
        case .new:
            result.sort { $0.timestamp > $1.timestamp }
        case .top:
            result.sort { $0.upvotes > $1.upvotes }
        }

        return result
    }

    // MARK: - Mutations

    func upvote(_ postId: UUID) {
        guard let idx = posts.firstIndex(where: { $0.id == postId }) else { return }
        if posts[idx].hasUpvoted {
            posts[idx].upvotes -= 1
            posts[idx].hasUpvoted = false
        } else {
            posts[idx].upvotes += 1
            posts[idx].hasUpvoted = true
        }
    }

    func addComment(_ comment: CommunityComment, to postId: UUID) {
        guard let idx = posts.firstIndex(where: { $0.id == postId }) else { return }
        posts[idx].comments.append(comment)
    }

    func addReply(_ reply: CommunityComment, to commentId: UUID, in postId: UUID) {
        guard let postIdx    = posts.firstIndex(where: { $0.id == postId }) else { return }
        guard let commentIdx = posts[postIdx].comments.firstIndex(where: { $0.id == commentId }) else { return }
        posts[postIdx].comments[commentIdx].replies.append(reply)
    }

    func deleteComment(_ commentId: UUID, in postId: UUID) {
        guard let pi = posts.firstIndex(where: { $0.id == postId }) else { return }
        posts[pi].comments.removeAll { $0.id == commentId }
    }

    func deleteReply(_ replyId: UUID, from commentId: UUID, in postId: UUID) {
        guard let pi = posts.firstIndex(where: { $0.id == postId }) else { return }
        guard let ci = posts[pi].comments.firstIndex(where: { $0.id == commentId }) else { return }
        posts[pi].comments[ci].replies.removeAll { $0.id == replyId }
    }

    func updateComment(_ commentId: UUID, body: String, in postId: UUID) {
        guard let pi = posts.firstIndex(where: { $0.id == postId }) else { return }
        guard let ci = posts[pi].comments.firstIndex(where: { $0.id == commentId }) else { return }
        posts[pi].comments[ci].body = body
    }

    func updateReply(_ replyId: UUID, body: String, from commentId: UUID, in postId: UUID) {
        guard let pi = posts.firstIndex(where: { $0.id == postId }) else { return }
        guard let ci = posts[pi].comments.firstIndex(where: { $0.id == commentId }) else { return }
        guard let ri = posts[pi].comments[ci].replies.firstIndex(where: { $0.id == replyId }) else { return }
        posts[pi].comments[ci].replies[ri].body = body
    }

    func createPost(_ post: CommunityPost) {
        posts.insert(post, at: 0)
    }

    func deletePost(_ postId: UUID) {
        posts.removeAll { $0.id == postId }
    }

    func updatePost(_ postId: UUID, title: String, body: String, tags: [String], poll: CommunityPoll?) {
        guard let i = posts.firstIndex(where: { $0.id == postId }) else { return }
        posts[i].title = title
        posts[i].body  = body
        posts[i].tags  = tags
        posts[i].poll  = poll
        if poll == nil { posts[i].userVotedOption = nil }
    }

    func toggleBookmark(_ postId: UUID) {
        if bookmarkedPostIds.contains(postId) { bookmarkedPostIds.remove(postId) }
        else { bookmarkedPostIds.insert(postId) }
    }

    func isBookmarked(_ postId: UUID) -> Bool { bookmarkedPostIds.contains(postId) }

    func reportPost(_ postId: UUID) { reportedPostIds.insert(postId) }

    func bookmarkedPosts() -> [CommunityPost] {
        posts.filter { bookmarkedPostIds.contains($0.id) }
    }

    func myPosts(pseudonym: String) -> [CommunityPost] {
        posts.filter { $0.pseudonym == pseudonym }.sorted { $0.timestamp > $1.timestamp }
    }

    func votePoll(optionId: UUID, in postId: UUID) {
        guard let pi = posts.firstIndex(where: { $0.id == postId }),
              let oi = posts[pi].poll?.options.firstIndex(where: { $0.id == optionId })
        else { return }
        // Tapping the already-selected option does nothing
        guard posts[pi].userVotedOption != optionId else { return }
        // Remove previous vote
        if let prevId = posts[pi].userVotedOption,
           let prevOi = posts[pi].poll?.options.firstIndex(where: { $0.id == prevId }) {
            posts[pi].poll!.options[prevOi].votes = Swift.max(0, posts[pi].poll!.options[prevOi].votes - 1)
        }
        posts[pi].poll!.options[oi].votes += 1
        posts[pi].userVotedOption = optionId
    }

    // MARK: - Mock Seed

    private func seedMockData() {
        posts = [
            CommunityPost(
                tags: ["sleep"], pseudonym: "WillowBreeze", avatarSeed: 0,
                title: "Finally slept 6 hours!",
                body: "After weeks of waking up at 3am, I tried cooling my room to 66°F and it made such a difference. Anyone else find temperature control helps?",
                timestamp: Date().addingTimeInterval(-3600 * 2), upvotes: 14,
                comments: [
                    CommunityComment(pseudonym: "DawnMistMeadow", avatarSeed: 1,
                                     body: "Yes! Room temperature was a game changer for me too. I also got a cooling weighted blanket.",
                                     timestamp: Date().addingTimeInterval(-3600)),
                    CommunityComment(pseudonym: "QuietOakGrove", avatarSeed: 4,
                                     body: "I use a fan pointed at me. Nothing fancy but it works!",
                                     timestamp: Date().addingTimeInterval(-1800))
                ]
            ),
            {
                var p = CommunityPost(
                    tags: ["mood", "body"], pseudonym: "SilverFernLeaf", avatarSeed: 1,
                    title: "The fog is real 😮‍💨",
                    body: "Brain fog has been hitting me hard this week. I forgot my best friend's birthday and I feel terrible. Is this normal?",
                    timestamp: Date().addingTimeInterval(-3600 * 5), upvotes: 31,
                    comments: [
                        CommunityComment(pseudonym: "WildRoseMoon", avatarSeed: 2,
                                         body: "100% normal. Estrogen affects memory and focus. You're not alone in this.",
                                         timestamp: Date().addingTimeInterval(-3600 * 4))
                    ]
                )
                p.poll = CommunityPoll(options: [
                    PollOption(text: "I write everything down", votes: 24),
                    PollOption(text: "Short breaks every 90 min", votes: 18),
                    PollOption(text: "Reduced meetings", votes: 11),
                    PollOption(text: "Still figuring it out", votes: 30),
                ])
                return p
            }(),
            CommunityPost(
                tags: ["body", "work"], pseudonym: "GoldenBirchWind", avatarSeed: 3,
                title: "Hot flashes at work — tips?",
                body: "I work in an open office and hot flashes are getting embarrassing. I've tried layers but it's not enough. Looking for discreet strategies.",
                timestamp: Date().addingTimeInterval(-3600 * 8), upvotes: 22,
                comments: []
            ),
            CommunityPost(
                tags: ["lounge"], pseudonym: "CalmCreekFlow", avatarSeed: 2,
                title: "Celebrating small wins today",
                body: "I went for a 20-minute walk three days in a row. A year ago I could barely get off the couch. Just wanted to share this somewhere people understand.",
                timestamp: Date().addingTimeInterval(-3600 * 12), upvotes: 47,
                comments: [
                    CommunityComment(pseudonym: "IvyMoonGlow", avatarSeed: 3,
                                     body: "This made my day! 🌱 Keep going.",
                                     timestamp: Date().addingTimeInterval(-3600 * 10)),
                    CommunityComment(pseudonym: "AmberSunPetal", avatarSeed: 1,
                                     body: "We celebrate here! That's huge progress.",
                                     timestamp: Date().addingTimeInterval(-3600 * 9))
                ]
            ),
            CommunityPost(
                tags: ["work", "relationships"], pseudonym: "NightbloomFern", avatarSeed: 4,
                title: "Told my manager about menopause",
                body: "I finally had the conversation with my manager about what I'm going through. She was surprisingly supportive and offered flexible hours. I was so scared to do it.",
                timestamp: Date().addingTimeInterval(-3600 * 24), upvotes: 58,
                comments: []
            ),
            CommunityPost(
                tags: ["sleep", "mood"], pseudonym: "AmberSunPetal", avatarSeed: 1,
                title: "Night sweats and anxiety combo",
                body: "Anyone else dealing with both night sweats and waking up anxious? It's a terrible combination and I'm exhausted.",
                timestamp: Date().addingTimeInterval(-3600 * 36), upvotes: 19,
                comments: []
            ),
        ]
    }
}

// MARK: - Avatar Component

struct AvatarView: View {
    let pseudonym: String
    let seed: Int
    var size: CGFloat = 36

    private var fill: Color {
        let fills: [Color] = [
            HeleneTheme.lavenderFill,
            HeleneTheme.sageFill,
            HeleneTheme.marigoldFill,
            HeleneTheme.peachFill,
            HeleneTheme.mintFill
        ]
        return fills[abs(seed) % fills.count]
    }

    private var initials: String {
        let caps = pseudonym.filter { $0.isUppercase }
        let result = String(caps.prefix(2))
        return result.isEmpty ? String(pseudonym.prefix(2)).uppercased() : result
    }

    var body: some View {
        Circle()
            .fill(fill)
            .frame(width: size, height: size)
            .overlay(
                Text(initials)
                    .font(.system(size: size * 0.32, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            )
    }
}
