import SwiftUI
import SwiftData

struct ProfileSettingsView: View {
    @Environment(UserProfile.self) private var profile
    @Environment(AuthManager.self) private var auth
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \CheckInEntry.date, order: .reverse) private var entries: [CheckInEntry]

    @State private var showSignOutConfirm  = false
    @State private var showCommunitySetup  = false
    @State private var showDoctorReport    = false
    @State private var showDeleteConfirm   = false

    var body: some View {
        NavigationStack {
            ZStack {
                HeleneTheme.Colors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        profileHeader
                        journeySection
                        symptomsSection
                        communitySection
                        doctorReportSection
                        deleteDataSection
                        signOutSection
                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.md)
                }
            }
            .navigationTitle("Profile & Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(HeleneTheme.Colors.textPrimary)
                }
            }
        }
        .confirmationDialog("Sign out?", isPresented: $showSignOutConfirm, titleVisibility: .visible) {
            Button("Sign Out", role: .destructive) { auth.signOut() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("You'll need to sign in again to access Helene.")
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        HStack(spacing: 16) {
            // Monogram circle
            ZStack {
                Circle()
                    .fill(HeleneTheme.lavenderFill)
                    .frame(width: 64, height: 64)
                Text(monogram)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
            }
            .environment(\.colorScheme, .light)

            VStack(alignment: .leading, spacing: 4) {
                Text(profile.firstName.isEmpty ? "Your profile" : profile.firstName)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                if !profile.journeyStage.isEmpty {
                    Text(profile.journeyStage)
                        .font(.system(size: 14))
                        .foregroundStyle(HeleneTheme.Colors.textSecond)
                }
            }
            Spacer()
        }
        .padding(HeleneTheme.Spacing.lg)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }

    // MARK: - Journey Section

    private var journeySection: some View {
        SectionCard(title: "My Journey") {
            if !profile.primaryGoal.isEmpty {
                InfoRow(label: "Primary goal", value: profile.primaryGoal)
            }
            if !profile.medicalFollowUp.isEmpty {
                InfoRow(label: "Medical follow-up", value: profile.medicalFollowUp)
            }
            if profile.primaryGoal.isEmpty && profile.medicalFollowUp.isEmpty {
                Text("Complete onboarding to fill in your journey details.")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            }
        }
    }

    // MARK: - Symptoms Section

    private var symptomsSection: some View {
        SectionCard(title: "My Symptoms") {
            if profile.selectedSymptoms.isEmpty {
                Text("No symptoms added yet.")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textLight)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(Array(profile.selectedSymptoms).sorted(), id: \.self) { symptom in
                        Text(symptom)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(HeleneTheme.lavenderFill,
                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.pill))
                            .environment(\.colorScheme, .light)
                    }
                }
            }
        }
    }

    // MARK: - Community Section

    private var communitySection: some View {
        SectionCard(title: "Community Identity") {
            if profile.communityPseudonym.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("You haven't joined the community yet.")
                        .font(.system(size: 14))
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                        .lineSpacing(3)
                    Button { showCommunitySetup = true } label: {
                        Text("Set up identity")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(HeleneTheme.Colors.background,
                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.small))
                    }
                    .buttonStyle(.plain)
                }
            } else {
                HStack(spacing: 12) {
                    AvatarView(pseudonym: profile.communityPseudonym,
                               seed: profile.communityAvatarSeed,
                               size: 40)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(profile.communityPseudonym)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        Text("Your community name")
                            .font(.caption)
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                    }
                    Spacer()
                    Button { showCommunitySetup = true } label: {
                        Text("Change")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(HeleneTheme.Colors.background,
                                        in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .sheet(isPresented: $showCommunitySetup) {
            CommunitySetupView(isPresented: $showCommunitySetup)
        }
    }

    // MARK: - Doctor Report

    private var doctorReportSection: some View {
        SectionCard(title: "Share with your Doctor") {
            VStack(alignment: .leading, spacing: 14) {
                Text("Generate a structured summary of your health journey to share with your healthcare provider.")
                    .font(.system(size: 14))
                    .foregroundStyle(HeleneTheme.Colors.textSecond)
                    .lineSpacing(3)

                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(entries.count) check-in\(entries.count == 1 ? "" : "s") recorded")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                        Text("Report includes last 30 days of data")
                            .font(.caption)
                            .foregroundStyle(HeleneTheme.Colors.textLight)
                    }
                    Spacer()
                }

                Button { showDoctorReport = true } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.system(size: 14, weight: .semibold))
                        Text("View & Export Report")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(HeleneTheme.Colors.dark, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
                }
                .buttonStyle(.plain)
            }
        }
        .sheet(isPresented: $showDoctorReport) { DoctorReportView() }
    }

    // MARK: - Delete Data

    private var deleteDataSection: some View {
        Button {
            showDeleteConfirm = true
        } label: {
            HStack {
                Image(systemName: "trash")
                    .font(.system(size: 15, weight: .medium))
                Text("Delete all my data")
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(HeleneTheme.rose)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(HeleneTheme.rose.opacity(0.08),
                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
        }
        .buttonStyle(.plain)
        .confirmationDialog("Delete all data?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete everything", role: .destructive) { deleteAllData() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete all your check-ins, assessments, and treatments. This cannot be undone.")
        }
    }

    private func deleteAllData() {
        try? context.delete(model: CheckInEntry.self)
        try? context.delete(model: MRSEntry.self)
        try? context.delete(model: TreatmentEntry.self)
        try? context.save()
    }

    // MARK: - Sign Out

    private var signOutSection: some View {
        Button {
            showSignOutConfirm = true
        } label: {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 15, weight: .medium))
                Text("Sign Out")
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(HeleneTheme.rose)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(HeleneTheme.rose.opacity(0.08),
                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private var monogram: String {
        let parts = profile.firstName.split(separator: " ").map { String($0.prefix(1)).uppercased() }
        return parts.prefix(2).joined()
    }
}

// MARK: - Section Card

private struct SectionCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(HeleneTheme.Colors.textSecond)
                .textCase(.uppercase)
                .tracking(0.8)

            content()
        }
        .padding(HeleneTheme.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(HeleneTheme.Colors.surface, in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.card))
    }
}

// MARK: - Info Row

private struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.caption)
                .foregroundStyle(HeleneTheme.Colors.textLight)
            Text(value)
                .font(.system(size: 15))
                .foregroundStyle(HeleneTheme.Colors.textPrimary)
        }
    }
}

// MARK: - Flow Layout (wrapping chip grid)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        layout(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                                  proposal: ProposedViewSize(frame.size))
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        let width = proposal.width ?? 300
        var frames: [CGRect] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 {
                y += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }

        return (CGSize(width: width, height: y + rowHeight), frames)
    }
}
