import SwiftUI

struct CommunitySetupView: View {
    @Environment(UserProfile.self) private var profile
    @Binding var isPresented: Bool

    private static let allPseudonyms = [
        "WildRoseMoon", "SilverFernLeaf", "CalmCreekFlow", "GoldenBirchWind",
        "DawnMistMeadow", "StoneRiverPath", "IvyMoonGlow", "AmberSunPetal",
        "QuietOakGrove", "CrimsonMapleSeed", "WillowBreeze", "NightbloomFern"
    ]

    @State private var nameInput:   String = ""
    @State private var selectedSeed: Int   = 0
    @State private var suggestions:  [String] = []
    @FocusState private var fieldFocused: Bool

    private var trimmedName: String { nameInput.trimmingCharacters(in: .whitespaces) }

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 28) {

                        // Avatar preview
                        AvatarView(
                            pseudonym: trimmedName.isEmpty ? "You" : trimmedName,
                            seed: selectedSeed,
                            size: 80
                        )
                        .padding(.top, 8)

                        // Name input
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Your name")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)

                            TextField("e.g. WillowBreeze", text: $nameInput)
                                .font(.system(size: 16))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)
                                .focused($fieldFocused)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(HeleneTheme.Colors.surface,
                                            in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))

                            // Suggestions row
                            HStack(spacing: 0) {
                                Text("Suggestions  ")
                                    .font(.caption)
                                    .foregroundStyle(HeleneTheme.Colors.textLight)

                                HStack(spacing: 8) {
                                    ForEach(suggestions, id: \.self) { name in
                                        Button { nameInput = name; fieldFocused = false } label: {
                                            Text(name)
                                                .font(.system(size: 12, weight: .medium))
                                                .foregroundStyle(HeleneTheme.Colors.textSecond)
                                                .padding(.horizontal, 10)
                                                .padding(.vertical, 5)
                                                .background(HeleneTheme.Colors.surface, in: Capsule())
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }

                                Spacer()

                                Button { shuffleSuggestions() } label: {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .font(.system(size: 13))
                                        .foregroundStyle(HeleneTheme.Colors.textLight)
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        // Color picker
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Your color")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(HeleneTheme.Colors.textPrimary)

                            HStack(spacing: 16) {
                                ForEach(0..<5) { seed in
                                    Button { selectedSeed = seed } label: {
                                        AvatarView(
                                            pseudonym: trimmedName.isEmpty ? "Y" : trimmedName,
                                            seed: seed,
                                            size: 50
                                        )
                                        .overlay(
                                            Circle()
                                                .strokeBorder(
                                                    HeleneTheme.Colors.textPrimary,
                                                    lineWidth: selectedSeed == seed ? 2 : 0
                                                )
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        // CTA
                        Button {
                            guard !trimmedName.isEmpty else { return }
                            profile.communityPseudonym  = trimmedName
                            profile.communityAvatarSeed = selectedSeed
                            profile.save()
                            isPresented = false
                        } label: {
                            Text(profile.communityPseudonym.isEmpty ? "Join the community" : "Save changes")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: HeleneTheme.Radius.button)
                                        .fill(trimmedName.isEmpty
                                              ? HeleneTheme.Colors.textLight
                                              : HeleneTheme.Colors.dark)
                                )
                        }
                        .buttonStyle(.plain)
                        .disabled(trimmedName.isEmpty)
                        .padding(.top, 8)

                        Text("Your name is pseudonymous and can be changed anytime.")
                            .font(.caption)
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.bottom, HeleneTheme.Spacing.xl)
                }
                .scrollDismissesKeyboard(.immediately)
            }
            .navigationTitle("Community Identity")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
            }
            .onAppear {
                // Pre-fill if editing an existing identity
                if !profile.communityPseudonym.isEmpty {
                    nameInput    = profile.communityPseudonym
                    selectedSeed = profile.communityAvatarSeed
                }
                shuffleSuggestions()
            }
        }
    }

    private func shuffleSuggestions() {
        suggestions = Array(Self.allPseudonyms.shuffled().prefix(3))
    }
}
