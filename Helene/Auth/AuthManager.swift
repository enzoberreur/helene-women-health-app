import SwiftUI
import AuthenticationServices

@Observable
final class AuthManager {

    // MARK: - State

    var isAuthenticated:    Bool = false
    var isOnboardingComplete: Bool = false
    var isNewUser:          Bool = false

    // MARK: - Persistence Keys

    private enum Keys {
        static let isAuthenticated      = "helene.isAuthenticated"
        static let isOnboardingComplete = "helene.isOnboardingComplete"
    }

    // MARK: - Init

    init() {
        isAuthenticated      = UserDefaults.standard.bool(forKey: Keys.isAuthenticated)
        isOnboardingComplete = UserDefaults.standard.bool(forKey: Keys.isOnboardingComplete)
    }

    // MARK: - Sign In with Apple

    func handleAppleCredential(_ credential: ASAuthorizationAppleIDCredential) {
        // Apple only provides fullName on the very first sign-in
        isNewUser = credential.fullName?.givenName != nil
        persist(authenticated: true)
    }

    // MARK: - Email Auth (stubbed — replace with your backend)

    func signInWithEmail(email: String, password: String) async throws {
        try await Task.sleep(for: .seconds(1))
        isNewUser = false
        persist(authenticated: true)
    }

    func signUpWithEmail(email: String, password: String, name: String) async throws {
        try await Task.sleep(for: .seconds(1))
        isNewUser = true
        persist(authenticated: true)
    }

    // MARK: - Onboarding

    func completeOnboarding() {
        isOnboardingComplete = true
        UserDefaults.standard.set(true, forKey: Keys.isOnboardingComplete)
    }

    // MARK: - Sign Out

    func signOut() {
        isAuthenticated      = false
        isOnboardingComplete = false
        isNewUser            = false
        UserDefaults.standard.set(false, forKey: Keys.isAuthenticated)
        UserDefaults.standard.set(false, forKey: Keys.isOnboardingComplete)
    }

    // MARK: - Private

    private func persist(authenticated: Bool) {
        isAuthenticated = authenticated
        UserDefaults.standard.set(authenticated, forKey: Keys.isAuthenticated)
    }
}
