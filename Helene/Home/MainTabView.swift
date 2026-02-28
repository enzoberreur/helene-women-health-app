import SwiftUI
import SwiftData

struct MainTabView: View {

    @Environment(UserProfile.self) private var profile
    @State private var selectedTab    = 0
    @State private var showVoiceChat  = false
    @State private var ringSpinning   = false  // triggers GPU-side rotation, no rebuilds

    var body: some View {
        ZStack(alignment: .bottom) {
            HeleneTheme.Colors.background.ignoresSafeArea()

            // ── Content ───────────────────────────────────────────────
            Group {
                switch selectedTab {
                case 0: HomeView()
                case 1: CommunityView()
                case 2: InsightsView()
                case 3: AICompanionView()
                default: HomeView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .animation(.easeInOut(duration: 0.2), value: selectedTab)

            // ── Floating Tab Bar ───────────────────────────────────────
            floatingTabBar
                .padding(.bottom, 30)
                .padding(.horizontal, 50)
        }
        // Force the ZStack to always fill the full screen.
        // Without this, each page's NavigationStack can report a different preferred
        // height, causing the floating tab bar to shift between tabs.
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea(edges: .bottom)
        .fullScreenCover(isPresented: $showVoiceChat) {
            UnifiedVoiceView()
        }
        .onAppear {
            withAnimation(.linear(duration: 5).repeatForever(autoreverses: false)) {
                ringSpinning = true
            }
        }
    }

    // MARK: - Tab Bar

    private var floatingTabBar: some View {
        ZStack(alignment: .bottom) {

            // ── Pill with 4 tabs — 2 left, gap, 2 right ───────────────
            HStack(spacing: 0) {
                tabButton(filled: "house.fill",                        outline: "house",                        tag: 0)
                tabButton(filled: "bubble.left.and.bubble.right.fill", outline: "bubble.left.and.bubble.right", tag: 1)

                Spacer().frame(width: 80)

                tabButton(filled: "chart.xyaxis.line",                 outline: "chart.xyaxis.line",            tag: 2)
                tabButton(filled: "sparkles",                          outline: "sparkles",                     tag: 3)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 12)
            .background(
                Capsule()
                    .fill(HeleneTheme.Colors.dark)
                    .shadow(color: .black.opacity(0.28), radius: 20, y: 6)
            )

            // ── AI Voice button — dark, inside the bar ─────────────────
            Button {
                showVoiceChat = true
            } label: {
                ZStack {
                    // Rotating shimmer ring — GPU rotationEffect, no rebuilds
                    Circle()
                        .stroke(
                            AngularGradient(
                                colors: [
                                    .clear,
                                    Color(hex: "#9B7FE8").opacity(0.55),
                                    Color.white.opacity(0.70),
                                    Color(hex: "#9B7FE8").opacity(0.55),
                                    .clear
                                ],
                                center: .center
                            ),
                            lineWidth: 1.2
                        )
                        .rotationEffect(.degrees(ringSpinning ? 360 : 0))
                        .frame(width: 52, height: 52)

                    // Deep dark fill
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color(hex: "#1A1714"), Color(hex: "#0C0A09")],
                                startPoint: .topLeading,
                                endPoint:   .bottomTrailing
                            )
                        )
                        .frame(width: 50, height: 50)

                    // Waveform icon
                    Image(systemName: "waveform")
                        .font(.system(size: 19, weight: .medium))
                        .foregroundStyle(.white.opacity(0.88))
                }
            }
            .buttonStyle(.plain)
            // Sits slightly above the pill — mostly in the bar, just a hint of protrusion
            .offset(y: -10)
        }
    }

    private func tabButton(filled: String, outline: String, tag: Int) -> some View {
        Button {
            withAnimation(.spring(duration: 0.3)) { selectedTab = tag }
        } label: {
            Image(systemName: selectedTab == tag ? filled : outline)
                .font(.system(size: 19, weight: selectedTab == tag ? .semibold : .regular))
                .foregroundStyle(selectedTab == tag ? .white : .white.opacity(0.4))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    MainTabView()
        .environment(UserProfile())
        .environment(CommunityStore())
        .modelContainer(for: CheckInEntry.self, inMemory: true)
}
