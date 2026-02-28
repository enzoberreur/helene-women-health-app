import SwiftUI

struct MyProfileView: View {
    @Environment(UserProfile.self)    private var profile
    @Environment(CommunityStore.self) private var store
    @Environment(\.dismiss)           private var dismiss

    @State private var showEditProfile = false
    @State private var selectedTab: ProfileTab = .myPosts

    enum ProfileTab: String, CaseIterable {
        case myPosts = "My Posts"
        case saved   = "Saved"
    }

    private var myPosts: [CommunityPost] {
        store.posts
            .filter { $0.pseudonym == profile.communityPseudonym }
            .sorted { $0.timestamp > $1.timestamp }
    }

    private var savedPosts: [CommunityPost] {
        store.posts.filter { store.bookmarkedPostIds.contains($0.id) }
    }

    private var totalUpvotes: Int {
        myPosts.reduce(0) { $0 + $1.upvotes }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {

                        profileHeader

                        tabBar

                        postsContent

                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.lg)
                }
            }
            .navigationTitle("My Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button { showEditProfile = true } label: {
                        Text("Edit")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    }
                }
            }
            .navigationDestination(for: UUID.self) { postId in
                PostDetailView(postId: postId)
            }
        }
        .sheet(isPresented: $showEditProfile) {
            CommunitySetupView(isPresented: $showEditProfile)
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        VStack(spacing: 16) {
            AvatarView(
                pseudonym: profile.communityPseudonym,
                seed: profile.communityAvatarSeed,
                size: 80
            )

            Text(profile.communityPseudonym)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)

            // Stats row
            HStack(spacing: 0) {
                statItem(value: myPosts.count, label: "Posts")
                divider
                statItem(value: totalUpvotes, label: "Upvotes")
                divider
                statItem(value: savedPosts.count, label: "Saved")
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
        .background(HeleneTheme.Colors.surface,
                    in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    private func statItem(value: Int, label: String) -> some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            Text(label)
                .font(.caption)
                .foregroundStyle(HeleneTheme.Colors.textSecond)
        }
        .frame(maxWidth: .infinity)
    }

    private var divider: some View {
        Rectangle()
            .fill(HeleneTheme.Colors.separator)
            .frame(width: 1, height: 36)
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(ProfileTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) { selectedTab = tab }
                } label: {
                    VStack(spacing: 8) {
                        Text(tab.rawValue)
                            .font(.system(size: 14,
                                          weight: selectedTab == tab ? .semibold : .regular))
                            .foregroundStyle(selectedTab == tab
                                             ? HeleneTheme.Colors.textPrimary
                                             : HeleneTheme.Colors.textSecond)
                        Rectangle()
                            .fill(selectedTab == tab
                                  ? HeleneTheme.Colors.textPrimary
                                  : Color.clear)
                            .frame(height: 2)
                            .cornerRadius(1)
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(HeleneTheme.Colors.separator)
                .frame(height: 1)
        }
    }

    // MARK: - Posts Content

    @ViewBuilder
    private var postsContent: some View {
        let posts = selectedTab == .myPosts ? myPosts : savedPosts

        if posts.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: 12) {
                ForEach(posts) { post in
                    NavigationLink(value: post.id) {
                        MiniPostRow(post: post, showAuthor: selectedTab == .saved)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: selectedTab == .myPosts ? "square.and.pencil" : "bookmark")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(HeleneTheme.Colors.textLight)
            Text(selectedTab == .myPosts ? "No posts yet" : "No saved posts yet")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
            Text(selectedTab == .myPosts
                 ? "When you post in the community, your posts will appear here."
                 : "Tap the bookmark icon on any post to save it here.")
                .font(.subheadline)
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Mini Post Row

private struct MiniPostRow: View {
    let post:       CommunityPost
    var showAuthor: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {

            // Top: author (if saved tab) + tags + date
            HStack(spacing: 8) {
                if showAuthor {
                    AvatarView(pseudonym: post.pseudonym, seed: post.avatarSeed, size: 22)
                    Text(post.pseudonym)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }

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

                Spacer()

                Text(post.timestamp.formatted(.relative(presentation: .named)))
                    .font(.caption)
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            }

            Text(post.title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            Text(post.body)
                .font(.system(size: 13))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            // Footer
            HStack(spacing: 14) {
                HStack(spacing: 4) {
                    Image(systemName: post.hasUpvoted ? "arrow.up.circle.fill" : "arrow.up.circle")
                        .font(.system(size: 13))
                    Text("\(post.upvotes)")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundStyle(post.hasUpvoted
                                 ? HeleneTheme.Colors.textPrimary
                                 : HeleneTheme.Colors.textSecond)

                HStack(spacing: 4) {
                    Image(systemName: "bubble.right").font(.system(size: 13))
                    let total = post.comments.reduce(0) { $0 + 1 + $1.replies.count }
                    Text("\(total)").font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(HeleneTheme.Colors.textSecond)

                if post.poll != nil {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.bar.xaxis").font(.system(size: 11))
                        Text("Poll").font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
            }
        }
        .padding(HeleneTheme.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HeleneTheme.Colors.surface,
                    in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }
}

#Preview {
    MyProfileView()
        .environment(UserProfile())
        .environment(CommunityStore())
}
