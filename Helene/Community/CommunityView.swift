import SwiftUI

struct CommunityView: View {
    @Environment(UserProfile.self)    private var profile
    @Environment(CommunityStore.self) private var store

    @State private var showSetup       = false
    @State private var showNewPost     = false
    @State private var showMyProfile   = false
    @State private var showBookmarks   = false
    @State private var path            = NavigationPath()
    @State private var searchText      = ""
    @State private var selectedTags    = Set<String>()
    @State private var sort: PostSort         = .hot
    @State private var timeFilter: TimeFilter = .week

    private var displayedPosts: [CommunityPost] {
        if showBookmarks { return store.bookmarkedPosts() }
        return store.filteredSorted(
            selectedTags: selectedTags,
            searchText: searchText,
            sort: sort,
            timeFilter: timeFilter
        )
    }

    var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: 14) {
                        header.padding(.bottom, 4)

                        if !showBookmarks {
                            searchBar
                            tagFilterBar
                            sortBar
                        } else {
                            bookmarksBanner
                        }

                        if displayedPosts.isEmpty {
                            emptyState
                        } else {
                            ForEach(displayedPosts) { post in
                                NavigationLink(value: post.id) {
                                    PostRow(post: post,
                                            isBookmarked: store.isBookmarked(post.id),
                                            hasProfile: !profile.communityPseudonym.isEmpty,
                                            onUpvote: { store.upvote(post.id) },
                                            onBookmark: { store.toggleBookmark(post.id) },
                                            onSetupNeeded: { showSetup = true })
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        Spacer(minLength: 100)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.lg)
                }

                // FAB
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            if profile.communityPseudonym.isEmpty { showSetup = true }
                            else { showNewPost = true }
                        } label: {
                            ZStack {
                                Circle().fill(HeleneTheme.Colors.dark)
                                    .frame(width: 56, height: 56)
                                    .shadow(color: .black.opacity(0.2), radius: 12, y: 4)
                                Image(systemName: "plus")
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.trailing, HeleneTheme.Spacing.lg)
                        .padding(.bottom, 100)
                    }
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(for: UUID.self) { postId in
                PostDetailView(postId: postId)
            }
        }
        .sheet(isPresented: $showSetup)     { CommunitySetupView(isPresented: $showSetup) }
        .sheet(isPresented: $showNewPost)   { NewPostView(isPresented: $showNewPost) }
        .sheet(isPresented: $showMyProfile) { MyProfileView() }
    }

    // MARK: - Header

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Community")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .textCase(.uppercase).tracking(1)
                Text("You're \(Text("not alone").bold())")
                    .font(.system(size: 28, weight: .regular))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            Spacer()

            HStack(spacing: 8) {
                // Bookmark toggle — only visible when profile exists
                if !profile.communityPseudonym.isEmpty {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { showBookmarks.toggle() }
                    } label: {
                        Image(systemName: showBookmarks ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(showBookmarks ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                            .frame(width: 36, height: 36)
                            .background(
                                showBookmarks ? HeleneTheme.sageFill : HeleneTheme.Colors.surface,
                                in: Circle()
                            )
                            .lightSchemeOnFill(showBookmarks)
                    }
                    .buttonStyle(.plain)
                }

                // Pseudonym chip → my profile
                if !profile.communityPseudonym.isEmpty {
                    Button { showMyProfile = true } label: {
                        HStack(spacing: 6) {
                            AvatarView(pseudonym: profile.communityPseudonym,
                                       seed: profile.communityAvatarSeed, size: 26)
                            Text(profile.communityPseudonym)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                        }
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(HeleneTheme.Colors.surface, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 6)
        }
    }

    // MARK: - Bookmarks Banner

    private var bookmarksBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "bookmark.fill")
                .font(.system(size: 13))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
            Text("Saved posts")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            Spacer()
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { showBookmarks = false }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(HeleneTheme.sageFill.opacity(0.5), in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
        .environment(\.colorScheme, .light)
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(HeleneTheme.Colors.textLight)
            TextField("Search posts…", text: $searchText)
                .font(.system(size: 15))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            if !searchText.isEmpty {
                Button { searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
    }

    // MARK: - Tag Filter Bar

    private var tagFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) { selectedTags.removeAll() }
                } label: {
                    Text("All")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(selectedTags.isEmpty ? .white : HeleneTheme.Colors.textSecond)
                        .padding(.horizontal, 14).padding(.vertical, 7)
                        .background(selectedTags.isEmpty ? HeleneTheme.Colors.dark : HeleneTheme.Colors.surface,
                                    in: Capsule())
                }
                .buttonStyle(.plain)

                ForEach(CommunityStore.tags) { tag in
                    Button {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            if selectedTags.contains(tag.id) { selectedTags.remove(tag.id) }
                            else { selectedTags.insert(tag.id) }
                        }
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: tag.icon).font(.system(size: 10, weight: .semibold))
                            Text(tag.name).font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundStyle(selectedTags.contains(tag.id) ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(selectedTags.contains(tag.id) ? tag.fill : HeleneTheme.Colors.surface, in: Capsule())
                        .lightSchemeOnFill(selectedTags.contains(tag.id))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Sort Bar

    private var sortBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                ForEach(PostSort.allCases, id: \.self) { option in
                    Button {
                        withAnimation(.easeInOut(duration: 0.18)) { sort = option }
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: option.icon).font(.system(size: 11, weight: .semibold))
                            Text(option.rawValue).font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundStyle(sort == option ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(sort == option ? HeleneTheme.lavenderFill : HeleneTheme.Colors.surface, in: Capsule())
                        .lightSchemeOnFill(sort == option)
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
                Text("\(displayedPosts.count) post\(displayedPosts.count == 1 ? "" : "s")")
                    .font(.caption).foregroundStyle(HeleneTheme.Colors.textLight)
            }

            if sort == .top {
                HStack(spacing: 6) {
                    ForEach(TimeFilter.allCases, id: \.self) { filter in
                        Button {
                            withAnimation(.easeInOut(duration: 0.18)) { timeFilter = filter }
                        } label: {
                            Text(filter.rawValue)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(timeFilter == filter ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textLight)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(timeFilter == filter ? HeleneTheme.Colors.surface : Color.clear, in: Capsule())
                                .overlay(Capsule().strokeBorder(
                                    timeFilter == filter ? Color.clear : HeleneTheme.Colors.separator, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: showBookmarks ? "bookmark" : "bubble.left.and.bubble.right")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(HeleneTheme.Colors.textLight)
            Text(showBookmarks ? "No saved posts yet" : (searchText.isEmpty && selectedTags.isEmpty ? "Be the first to post" : "No posts found"))
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            Text(showBookmarks
                 ? "Tap the bookmark icon on any post to save it here."
                 : (searchText.isEmpty && selectedTags.isEmpty ? "Start a conversation for the community." : "Try a different filter or search term."))
                .font(.subheadline)
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Post Row

private struct PostRow: View {
    let post:          CommunityPost
    let isBookmarked:  Bool
    let hasProfile:    Bool
    let onUpvote:      () -> Void
    let onBookmark:    () -> Void
    let onSetupNeeded: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Author row
            HStack(spacing: 10) {
                AvatarView(pseudonym: post.pseudonym, seed: post.avatarSeed)
                VStack(alignment: .leading, spacing: 2) {
                    Text(post.pseudonym)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text(post.timestamp.formatted(.relative(presentation: .named)))
                        .font(.caption).foregroundStyle(HeleneTheme.Colors.textLight)
                }
                Spacer()
                HStack(spacing: 4) {
                    ForEach(post.tags.prefix(2), id: \.self) { tagId in
                        if let tag = CommunityStore.tags.first(where: { $0.id == tagId }) {
                            Text(tag.name)
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .background(tag.fill, in: Capsule())
                        }
                    }
                }
            }

            Text(post.title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .multilineTextAlignment(.leading)

            Text(post.body)
                .font(.system(size: 14))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .lineLimit(3).multilineTextAlignment(.leading)

            // Poll chip
            if let poll = post.poll {
                HStack(spacing: 5) {
                    Image(systemName: "chart.bar.xaxis")
                        .font(.system(size: 11, weight: .semibold))
                    Text("Poll · \(poll.options.count) options · \(poll.totalVotes) votes")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(HeleneTheme.marigoldFill.opacity(0.6), in: Capsule())
                .environment(\.colorScheme, .light)
            }

            // Footer
            HStack(spacing: 16) {
                Button { hasProfile ? onUpvote() : onSetupNeeded() } label: {
                    HStack(spacing: 5) {
                        Image(systemName: post.hasUpvoted ? "arrow.up.circle.fill" : "arrow.up.circle")
                            .font(.system(size: 15))
                        Text("\(post.upvotes)").font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(post.hasUpvoted ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                }
                .buttonStyle(.plain)

                HStack(spacing: 5) {
                    Image(systemName: "bubble.right").font(.system(size: 14))
                    let total = post.comments.reduce(0) { $0 + 1 + $1.replies.count }
                    Text("\(total)").font(.system(size: 13, weight: .medium))
                }
                .foregroundStyle(HeleneTheme.Colors.textSecond)

                Spacer()

                if hasProfile {
                    Button { onBookmark() } label: {
                        Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 14))
                            .foregroundStyle(isBookmarked ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textLight)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }
}

// MARK: - New Post Sheet

struct NewPostView: View {
    @Binding var isPresented: Bool

    @Environment(CommunityStore.self) private var store
    @Environment(UserProfile.self)    private var profile

    @State private var title        = ""
    @State private var postBody     = ""
    @State private var selectedTags = Set<String>()
    @State private var addPoll      = false
    @State private var pollOptions: [String] = ["", ""]

    private var canPost: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !postBody.trimmingCharacters(in: .whitespaces).isEmpty &&
        !selectedTags.isEmpty &&
        (!addPoll || pollOptions.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.count >= 2)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 16) {
                        TextField("Title", text: $title)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .padding(16)
                            .background(HeleneTheme.Colors.surface,
                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))

                        ZStack(alignment: .topLeading) {
                            if postBody.isEmpty {
                                Text("Share what's on your mind…")
                                    .font(.system(size: 15))
                                    .foregroundStyle(HeleneTheme.Colors.textLight)
                                    .padding(.top, 12).padding(.leading, 16)
                                    .allowsHitTesting(false)
                            }
                            TextEditor(text: $postBody)
                                .font(.system(size: 15))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                .scrollContentBackground(.hidden)
                                .frame(height: 120)
                                .contentMargins(.all, 12, for: .scrollContent)
                        }
                        .background(HeleneTheme.Colors.surface,
                                    in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))

                        // Tags
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Tags")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                                .textCase(.uppercase).tracking(0.8)
                            FlowLayout(spacing: 8) {
                                ForEach(CommunityStore.tags) { tag in
                                    Button {
                                        if selectedTags.contains(tag.id) { selectedTags.remove(tag.id) }
                                        else { selectedTags.insert(tag.id) }
                                    } label: {
                                        HStack(spacing: 5) {
                                            Image(systemName: tag.icon).font(.system(size: 11, weight: .semibold))
                                            Text(tag.name).font(.system(size: 13, weight: .semibold))
                                        }
                                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                        .padding(.horizontal, 12).padding(.vertical, 7)
                                        .background(selectedTags.contains(tag.id) ? tag.fill : HeleneTheme.Colors.surface, in: Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        // Poll toggle
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle(isOn: $addPoll.animation()) {
                                HStack(spacing: 8) {
                                    Image(systemName: "chart.bar.xaxis")
                                        .font(.system(size: 14))
                                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                                    Text("Add a poll")
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                }
                            }
                            .tint(HeleneTheme.lavenderFill)
                            .padding(.horizontal, 16).padding(.vertical, 12)
                            .background(HeleneTheme.Colors.surface,
                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))

                            if addPoll {
                                VStack(spacing: 8) {
                                    ForEach(pollOptions.indices, id: \.self) { i in
                                        HStack(spacing: 10) {
                                            TextField("Option \(i + 1)", text: $pollOptions[i])
                                                .font(.system(size: 15))
                                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                                .padding(.horizontal, 14).padding(.vertical, 10)
                                                .background(HeleneTheme.Colors.surface,
                                                            in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
                                            if pollOptions.count > 2 {
                                                Button {
                                                    pollOptions.remove(at: i)
                                                } label: {
                                                    Image(systemName: "minus.circle.fill")
                                                        .font(.system(size: 20))
                                                        .foregroundStyle(HeleneTheme.Colors.textLight)
                                                }
                                                .buttonStyle(.plain)
                                            }
                                        }
                                    }
                                    if pollOptions.count < 4 {
                                        Button { pollOptions.append("") } label: {
                                            HStack(spacing: 6) {
                                                Image(systemName: "plus.circle").font(.system(size: 14))
                                                Text("Add option").font(.system(size: 14, weight: .medium))
                                            }
                                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(HeleneTheme.Colors.surface,
                                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .transition(.opacity.combined(with: .move(edge: .top)))
                            }
                        }

                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.md)
                }
                .scrollDismissesKeyboard(.immediately)
            }
            .navigationTitle("New Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Post") {
                        let validOptions = pollOptions.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                        let poll: CommunityPoll? = addPoll && validOptions.count >= 2
                            ? CommunityPoll(options: validOptions.map { PollOption(text: $0) })
                            : nil
                        store.createPost(CommunityPost(
                            tags: Array(selectedTags),
                            pseudonym: profile.communityPseudonym,
                            avatarSeed: profile.communityAvatarSeed,
                            title: title.trimmingCharacters(in: .whitespaces),
                            body: postBody.trimmingCharacters(in: .whitespaces),
                            poll: poll
                        ))
                        isPresented = false
                    }
                    .disabled(!canPost)
                    .font(.system(size: 15, weight: .semibold))
                }
            }
        }
    }
}

#Preview {
    CommunityView()
        .environment(UserProfile())
        .environment(CommunityStore())
}
