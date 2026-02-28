import SwiftUI
import SwiftData
import UIKit

@main
struct HeleneApp: App {

    @State private var authManager = AuthManager()
    @State private var userProfile = UserProfile()
    @State private var communityStore = CommunityStore()

    init() {
        // Remove UIKit container backgrounds so they don't flash through SwiftUI transitions.
        // Our SwiftUI views own their own backgrounds via HeleneTheme.Colors.background.
        UINavigationBar.appearance().backgroundColor = .clear
        UINavigationBar.appearance().shadowImage     = UIImage()
        UITableView.appearance().backgroundColor     = .clear
        UICollectionView.appearance().backgroundColor = .clear
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if !authManager.isAuthenticated {
                    WelcomeView()
                } else if !authManager.isOnboardingComplete {
                    OnboardingView()
                } else {
                    MainTabView()
                }
            }
            .environment(authManager)
            .environment(userProfile)
            .environment(communityStore)
            // Global keyboard "Done" button — applies to every text field in the app
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(
                            #selector(UIResponder.resignFirstResponder),
                            to: nil, from: nil, for: nil
                        )
                    }
                    .font(.system(size: 15, weight: .semibold))
                }
            }
        }
        .modelContainer(for: [CheckInEntry.self, MRSEntry.self, TreatmentEntry.self])
    }
}
