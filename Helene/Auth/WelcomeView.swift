import SwiftUI
import AuthenticationServices

struct WelcomeView: View {

    @Environment(AuthManager.self) private var authManager
    @State private var showEmailAuth = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            HeleneTheme.Colors.background.ignoresSafeArea()

            // Decorative blobs
            GeometryReader { geo in
                ZStack {
                    Circle()
                        .fill(HeleneTheme.lavenderFill)
                        .frame(width: 280, height: 280)
                        .offset(x: geo.size.width * 0.55, y: -80)

                    Circle()
                        .fill(HeleneTheme.sageFill)
                        .frame(width: 220, height: 220)
                        .offset(x: -60, y: geo.size.height * 0.52)

                    Circle()
                        .fill(HeleneTheme.peachFill)
                        .frame(width: 160, height: 160)
                        .offset(x: geo.size.width * 0.45, y: geo.size.height * 0.68)
                }
                .blur(radius: 50)
            }
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // ── Brand ────────────────────────────────────────────────
                VStack(spacing: HeleneTheme.Spacing.lg) {
                    VStack(spacing: HeleneTheme.Spacing.sm) {
                        Text("helene")
                            .font(.system(size: 52, weight: .bold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)

                        Text("Your companion through menopause.")
                            .font(.system(size: 16))
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                            .multilineTextAlignment(.center)
                    }
                }

                Spacer()
                Spacer()

                // ── Auth ─────────────────────────────────────────────────
                VStack(spacing: HeleneTheme.Spacing.sm) {

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(HeleneTheme.rose)
                            .multilineTextAlignment(.center)
                    }

                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.fullName, .email]
                    } onCompletion: { result in
                        handleAppleResult(result)
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 54)
                    .clipShape(RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))

                    HStack(spacing: HeleneTheme.Spacing.md) {
                        Rectangle().fill(HeleneTheme.Colors.separator).frame(height: 1)
                        Text("or").font(.footnote).foregroundStyle(HeleneTheme.Colors.textLight)
                        Rectangle().fill(HeleneTheme.Colors.separator).frame(height: 1)
                    }

                    Button { showEmailAuth = true } label: {
                        Text("Continue with email")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(.white,
                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
                    }

                    Text("By continuing, you agree to our [Terms of Use](helene://terms) and [Privacy Policy](helene://privacy).")
                        .font(.caption)
                        .foregroundStyle(HeleneTheme.Colors.textLight)
                        .multilineTextAlignment(.center)
                        .tint(HeleneTheme.Colors.textSecond)
                }
                .padding(.horizontal, HeleneTheme.Spacing.lg)
                .padding(.bottom, 44)
            }
        }
        .sheet(isPresented: $showEmailAuth) {
            EmailAuthView().environment(authManager)
        }
    }

    private func handleAppleResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential else { return }
            errorMessage = nil
            authManager.handleAppleCredential(credential)
        case .failure(let error):
            guard (error as? ASAuthorizationError)?.code != .canceled else { return }
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    WelcomeView().environment(AuthManager())
}
