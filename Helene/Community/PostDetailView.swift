import SwiftUI

struct PostDetailView: View {
    let postId: UUID

    @Environment(CommunityStore.self) private var store
    @Environment(UserProfile.self)    private var profile
    @Environment(\.dismiss)           private var dismiss

    @State private var commentText     = ""
    @State private var replyingTo:    CommunityComment? = nil
    @State private var showEditPost    = false
    @State private var showDeleteAlert = false
    @State private var showReportAlert = false
    @State private var showSetup        = false
    @State private var editingTarget:  CommentEditTarget? = nil
    @FocusState private var inputFocused: Bool

    private var hasProfile: Bool { !profile.communityPseudonym.isEmpty }

    private var post: CommunityPost? { store.posts.first { $0.id == postId } }
    private var isOwn: Bool { post?.pseudonym == profile.communityPseudonym && !profile.communityPseudonym.isEmpty }

    private var totalComments: Int {
        guard let post else { return 0 }
        return post.comments.reduce(0) { $0 + 1 + $1.replies.count }
    }

    var body: some View {
        ZStack {
            HeleneTheme.Colors.background.ignoresSafeArea()

            if let post {
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 16) {
                        postCard(post)

                        if totalComments > 0 {
                            commentsHeader
                            commentsSection(post.comments, postId: post.id)
                        } else {
                            emptyComments
                        }

                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.md)
                }
                .safeAreaInset(edge: .bottom) {
                    inputBar(postId: post.id)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onTapGesture {
            if replyingTo != nil && !inputFocused { replyingTo = nil }
        }
        .sheet(isPresented: $showSetup)    { CommunitySetupView(isPresented: $showSetup) }
        .sheet(isPresented: $showEditPost) {
            if let post { EditPostView(post: post) }
        }
        .alert("Delete post?", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                store.deletePost(postId)
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This can't be undone.")
        }
        .alert("Report post?", isPresented: $showReportAlert) {
            Button("Report", role: .destructive) {
                store.reportPost(postId)
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This post will be hidden from your feed.")
        }
    }

    // MARK: - Post Card

    private func postCard(_ post: CommunityPost) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            // Author row + menu
            HStack(spacing: 10) {
                AvatarView(pseudonym: post.pseudonym, seed: post.avatarSeed)
                VStack(alignment: .leading, spacing: 2) {
                    Text(post.pseudonym)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    Text(post.timestamp.formatted(.relative(presentation: .named)))
                        .font(.caption)
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                }
                Spacer()

                // Context menu
                Menu {
                    if isOwn {
                        Button { showEditPost = true } label: {
                            Label("Edit post", systemImage: "pencil")
                        }
                        Button(role: .destructive) { showDeleteAlert = true } label: {
                            Label("Delete post", systemImage: "trash")
                        }
                    } else {
                        if hasProfile {
                            Button {
                                store.toggleBookmark(post.id)
                            } label: {
                                Label(
                                    store.isBookmarked(post.id) ? "Remove bookmark" : "Save post",
                                    systemImage: store.isBookmarked(post.id) ? "bookmark.fill" : "bookmark"
                                )
                            }
                        }
                        Button(role: .destructive) { showReportAlert = true } label: {
                            Label("Report post", systemImage: "flag")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                        .frame(width: 32, height: 32)
                        .background(HeleneTheme.Colors.surface, in: Circle())
                }
                .buttonStyle(.plain)
            }

            // Tag chips
            if !post.tags.isEmpty {
                HStack(spacing: 6) {
                    ForEach(post.tags, id: \.self) { tagId in
                        if let tag = CommunityStore.tags.first(where: { $0.id == tagId }) {
                            HStack(spacing: 4) {
                                Image(systemName: tag.icon).font(.system(size: 10, weight: .semibold))
                                Text(tag.name).font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .background(tag.fill, in: Capsule())
                            .environment(\.colorScheme, .light)
                        }
                    }
                }
            }

            Text(post.title)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            Text(post.body)
                .font(.system(size: 15))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .lineSpacing(4)

            // Poll
            if let poll = post.poll {
                pollView(poll: poll, postId: post.id, votedId: post.userVotedOption)
            }

            // Footer: upvote + bookmark
            HStack(spacing: 10) {
                Button { if hasProfile { store.upvote(post.id) } else { showSetup = true } } label: {
                    HStack(spacing: 6) {
                        Image(systemName: post.hasUpvoted ? "arrow.up.circle.fill" : "arrow.up.circle")
                            .font(.system(size: 15))
                        Text("\(post.upvotes) \(post.upvotes == 1 ? "upvote" : "upvotes")")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundStyle(post.hasUpvoted ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(post.hasUpvoted ? HeleneTheme.lavenderFill : HeleneTheme.Colors.surface, in: Capsule())
                    .lightSchemeOnFill(post.hasUpvoted)
                }
                .buttonStyle(.plain)

                Spacer()

                // Bookmark shortcut — only when profile exists
                if hasProfile {
                    Button { store.toggleBookmark(post.id) } label: {
                        Image(systemName: store.isBookmarked(post.id) ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 15))
                            .foregroundStyle(store.isBookmarked(post.id) ? HeleneTheme.Colors.textPrimary : HeleneTheme.Colors.textSecond)
                            .frame(width: 36, height: 36)
                            .background(
                                store.isBookmarked(post.id) ? HeleneTheme.sageFill : HeleneTheme.Colors.surface,
                                in: Circle()
                            )
                            .lightSchemeOnFill(store.isBookmarked(post.id))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(HeleneTheme.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Poll View

    private func pollView(poll: CommunityPoll, postId: UUID, votedId: UUID?) -> some View {
        let hasVoted = votedId != nil
        let total    = max(poll.totalVotes, 1)

        return VStack(alignment: .leading, spacing: 10) {
            ForEach(poll.options) { option in
                Button {
                    store.votePoll(optionId: option.id, in: postId)
                } label: {
                    HStack(spacing: 10) {
                        // Bar background + fill
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(HeleneTheme.Colors.surface)
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(option.id == votedId ? HeleneTheme.lavenderFill : HeleneTheme.peachFill.opacity(0.6))
                                    .frame(width: hasVoted ? geo.size.width * CGFloat(option.votes) / CGFloat(total) : 0)
                                    .animation(.easeOut(duration: 0.4), value: option.votes)

                                HStack {
                                    Text(option.text)
                                        .font(.system(size: 14, weight: option.id == votedId ? .semibold : .regular))
                                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                        .padding(.leading, 12)
                                    Spacer()
                                    if hasVoted {
                                        Text("\(Int((Double(option.votes) / Double(total)) * 100))%")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                                            .padding(.trailing, 12)
                                    }
                                    if option.id == votedId {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 13))
                                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                            .padding(.trailing, 10)
                                    }
                                }
                            }
                            .environment(\.colorScheme, .light)
                        }
                        .frame(height: 40)
                    }
                }
                .buttonStyle(.plain)
            }

            Text(hasVoted ? "\(poll.totalVotes) votes · tap to change" : "\(poll.totalVotes) votes · tap to vote")
                .font(.system(size: 12))
                .foregroundStyle(HeleneTheme.Colors.textLight)
        }
        .padding(14)
        .background(HeleneTheme.Colors.background, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
    }

    // MARK: - Comments

    private var commentsHeader: some View {
        Text("\(totalComments) \(totalComments == 1 ? "reply" : "replies")")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(HeleneTheme.Colors.textSecond)
            .padding(.horizontal, 4)
    }

    private var emptyComments: some View {
        Text("No replies yet. Be the first to reply.")
            .font(.system(size: 14))
            .foregroundStyle(HeleneTheme.Colors.textLight)
            .padding(.horizontal, 4)
    }

    private func commentsSection(_ comments: [CommunityComment], postId: UUID) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(comments) { comment in
                VStack(alignment: .leading, spacing: 6) {
                    CommentBubble(
                        comment:  comment,
                        isReply:  false,
                        isOwn:    comment.pseudonym == profile.communityPseudonym && hasProfile,
                        onReply:  { if hasProfile { replyingTo = comment; inputFocused = true } else { showSetup = true } },
                        onEdit:   {
                            editingTarget = .init(commentId: comment.id, parentCommentId: nil, postId: postId)
                            replyingTo = nil
                            commentText = comment.body
                            inputFocused = true
                        },
                        onDelete: { store.deleteComment(comment.id, in: postId) }
                    )
                    if !comment.replies.isEmpty {
                        HStack(alignment: .top, spacing: 0) {
                            Rectangle()
                                .fill(HeleneTheme.Colors.separator)
                                .frame(width: 2)
                                .padding(.leading, 17).padding(.vertical, 4)
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(comment.replies) { reply in
                                    CommentBubble(
                                        comment:  reply,
                                        isReply:  true,
                                        isOwn:    reply.pseudonym == profile.communityPseudonym && hasProfile,
                                        onReply:  { if hasProfile { replyingTo = comment; inputFocused = true } else { showSetup = true } },
                                        onEdit:   {
                                            editingTarget = .init(commentId: reply.id, parentCommentId: comment.id, postId: postId)
                                            replyingTo = nil
                                            commentText = reply.body
                                            inputFocused = true
                                        },
                                        onDelete: { store.deleteReply(reply.id, from: comment.id, in: postId) }
                                    )
                                }
                            }
                            .padding(.leading, 12)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Input Bar

    private func inputBar(postId: UUID) -> some View {
        VStack(spacing: 0) {
            // No profile — prompt to join
            if profile.communityPseudonym.isEmpty {
                HStack(spacing: 10) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.system(size: 18))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                    Text("Create a profile to join the conversation")
                        .font(.system(size: 14))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, HeleneTheme.Spacing.md)
                .padding(.vertical, 16)
                .background(HeleneTheme.Colors.background
                    .shadow(color: .black.opacity(0.06), radius: 8, y: -4))
            } else {
            if let _ = editingTarget {
                HStack(spacing: 8) {
                    Image(systemName: "pencil")
                        .font(.system(size: 12))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                    Text("Editing your reply")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                    Spacer()
                    Button { editingTarget = nil; commentText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, HeleneTheme.Spacing.md)
                .padding(.vertical, 10)
                .background(HeleneTheme.Colors.surface)
            } else if let target = replyingTo {
                HStack(spacing: 8) {
                    Image(systemName: "arrowshape.turn.up.left.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                    Text("Replying to \(target.pseudonym)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                    Spacer()
                    Button { replyingTo = nil } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, HeleneTheme.Spacing.md)
                .padding(.vertical, 10)
                .background(HeleneTheme.Colors.surface)
            }

            Divider().background(HeleneTheme.Colors.separator)

            HStack(spacing: 10) {
                AvatarView(
                    pseudonym: profile.communityPseudonym.isEmpty ? "You" : profile.communityPseudonym,
                    seed: profile.communityAvatarSeed, size: 32
                )
                TextField(
                    editingTarget != nil ? "Edit your reply…" : replyingTo == nil ? "Add a reply…" : "Reply to \(replyingTo!.pseudonym)…",
                    text: $commentText
                )
                .font(.system(size: 15))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .focused($inputFocused)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(HeleneTheme.Colors.surface, in: Capsule())

                Button {
                    let trimmed = commentText.trimmingCharacters(in: .whitespaces)
                    guard !trimmed.isEmpty else { return }
                    if let target = editingTarget {
                        if let parentId = target.parentCommentId {
                            store.updateReply(target.commentId, body: trimmed, from: parentId, in: target.postId)
                        } else {
                            store.updateComment(target.commentId, body: trimmed, in: target.postId)
                        }
                        editingTarget = nil
                    } else {
                        let author = profile.communityPseudonym.isEmpty ? "Anonymous" : profile.communityPseudonym
                        let newComment = CommunityComment(pseudonym: author, avatarSeed: profile.communityAvatarSeed, body: trimmed)
                        if let target = replyingTo {
                            store.addReply(newComment, to: target.id, in: postId)
                            replyingTo = nil
                        } else {
                            store.addComment(newComment, to: postId)
                        }
                    }
                    commentText = ""; inputFocused = false
                } label: {
                    let isEmpty = commentText.trimmingCharacters(in: .whitespaces).isEmpty
                    ZStack {
                        Circle().fill(isEmpty ? HeleneTheme.Colors.surface : HeleneTheme.Colors.dark)
                            .frame(width: 36, height: 36)
                        Image(systemName: "arrow.up")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(isEmpty ? HeleneTheme.Colors.textLight : .white)
                    }
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, HeleneTheme.Spacing.md)
            .padding(.top, 12).padding(.bottom, 80)
            .background(HeleneTheme.Colors.background.shadow(color: .black.opacity(0.06), radius: 8, y: -4))
            } // end else (has profile)
        }
    }
}

// MARK: - Comment Edit Target

private struct CommentEditTarget {
    let commentId:       UUID
    let parentCommentId: UUID?   // nil = top-level comment
    let postId:          UUID
}

// MARK: - Edit Post Sheet

private struct EditPostView: View {
    let post: CommunityPost

    @Environment(CommunityStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var title:        String
    @State private var postBody:     String
    @State private var selectedTags: Set<String>
    @State private var hasPoll:      Bool
    @State private var pollOptions:  [String]

    init(post: CommunityPost) {
        self.post     = post
        _title        = State(initialValue: post.title)
        _postBody     = State(initialValue: post.body)
        _selectedTags = State(initialValue: Set(post.tags))
        _hasPoll      = State(initialValue: post.poll != nil)
        _pollOptions  = State(initialValue: post.poll?.options.map { $0.text } ?? ["", ""])
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !postBody.trimmingCharacters(in: .whitespaces).isEmpty &&
        !selectedTags.isEmpty &&
        (!hasPoll || pollOptions.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.count >= 2)
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
                                        .background(selectedTags.contains(tag.id) ? tag.fill : HeleneTheme.Colors.surface,
                                                    in: Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        // Poll editor
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle(isOn: $hasPoll.animation()) {
                                HStack(spacing: 8) {
                                    Image(systemName: "chart.bar.xaxis")
                                        .font(.system(size: 14))
                                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                                    Text("Poll")
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                }
                            }
                            .tint(HeleneTheme.lavenderFill)
                            .padding(.horizontal, 16).padding(.vertical, 12)
                            .background(HeleneTheme.Colors.surface,
                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))

                            if hasPoll {
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
                                                Button { pollOptions.remove(at: i) } label: {
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
                                            .frame(maxWidth: .infinity).padding(.vertical, 10)
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
            .navigationTitle("Edit Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let validOptions = pollOptions
                            .map { $0.trimmingCharacters(in: .whitespaces) }
                            .filter { !$0.isEmpty }
                        let updatedPoll: CommunityPoll? = hasPoll && validOptions.count >= 2
                            ? CommunityPoll(options: validOptions.map { PollOption(text: $0) })
                            : nil
                        store.updatePost(
                            post.id,
                            title: title.trimmingCharacters(in: .whitespaces),
                            body:  postBody.trimmingCharacters(in: .whitespaces),
                            tags:  Array(selectedTags),
                            poll:  updatedPoll
                        )
                        dismiss()
                    }
                    .disabled(!canSave)
                    .font(.system(size: 15, weight: .semibold))
                }
            }
        }
    }
}

// MARK: - Comment Bubble

private struct CommentBubble: View {
    let comment:  CommunityComment
    let isReply:  Bool
    let isOwn:    Bool
    let onReply:  () -> Void
    let onEdit:   () -> Void
    let onDelete: () -> Void

    @State private var showActions = false

    var body: some View {
        Button { showActions.toggle() } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 8) {
                    AvatarView(pseudonym: comment.pseudonym, seed: comment.avatarSeed,
                               size: isReply ? 28 : 32)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(comment.pseudonym)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            Text(comment.timestamp.formatted(.relative(presentation: .named)))
                                .font(.caption)
                                .foregroundStyle(HeleneTheme.Colors.textLight)
                        }
                        Text(comment.body)
                            .font(.system(size: 14))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .lineSpacing(3)
                            .multilineTextAlignment(.leading)
                    }
                }
                if showActions {
                    HStack {
                        Spacer(minLength: 40)
                        if isOwn {
                            HStack(spacing: 8) {
                                Button {
                                    showActions = false
                                    onEdit()
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: "pencil").font(.system(size: 11, weight: .semibold))
                                        Text("Edit").font(.system(size: 12, weight: .semibold))
                                    }
                                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                                    .padding(.horizontal, 10).padding(.vertical, 5)
                                    .background(HeleneTheme.Colors.background, in: Capsule())
                                }
                                .buttonStyle(.plain)
                                Button {
                                    showActions = false
                                    onDelete()
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: "trash").font(.system(size: 11, weight: .semibold))
                                        Text("Delete").font(.system(size: 12, weight: .semibold))
                                    }
                                    .foregroundStyle(HeleneTheme.rose)
                                    .padding(.horizontal, 10).padding(.vertical, 5)
                                    .background(HeleneTheme.rose.opacity(0.12), in: Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        } else {
                            Button {
                                showActions = false
                                onReply()
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "arrowshape.turn.up.left").font(.system(size: 11, weight: .semibold))
                                    Text("Reply").font(.system(size: 12, weight: .semibold))
                                }
                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(HeleneTheme.Colors.background, in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.18), value: showActions)
    }
}
