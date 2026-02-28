import SwiftUI

struct EmailAuthView: View {

    @Environment(AuthManager.self) private var authManager

    enum Mode { case signIn, signUp }
    @State private var mode:         Mode   = .signIn
    @State private var name:         String = ""
    @State private var email:        String = ""
    @State private var password:     String = ""
    @State private var isLoading:    Bool   = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            HeleneTheme.Colors.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: HeleneTheme.Spacing.xl) {

                    // ── Heading ──────────────────────────────────────────
                    VStack(alignment: .leading, spacing: HeleneTheme.Spacing.sm) {
                        Text(mode == .signIn ? "Welcome back." : "Join Helene.")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundStyle(HeleneTheme.Colors.textPrimary)

                        Text(mode == .signIn
                             ? "Sign in to continue."
                             : "Your data never leaves your phone.")
                            .font(.subheadline)
                            .foregroundStyle(HeleneTheme.Colors.textSecond)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .padding(.top, HeleneTheme.Spacing.xxl)

                    // ── Fields ───────────────────────────────────────────
                    VStack(spacing: HeleneTheme.Spacing.sm) {

                        if let errorMessage {
                            Text(errorMessage)
                                .font(.footnote)
                                .foregroundStyle(HeleneTheme.rose)
                                .multilineTextAlignment(.center)
                        }

                        if mode == .signUp {
                            HeleneTextField(placeholder: "First name", text: $name, icon: "person")
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }

                        HeleneTextField(placeholder: "Email", text: $email, icon: "envelope",
                                        keyboardType: .emailAddress, autocapitalization: .never)
                        HeleneTextField(placeholder: "Password", text: $password, icon: "lock", isSecure: true)

                        Button {
                            Task { await performAuth() }
                        } label: {
                            Group {
                                if isLoading { ProgressView().tint(.white) }
                                else {
                                    Text(mode == .signIn ? "Sign In" : "Create Account")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(.white)
                                }
                            }
                            .frame(maxWidth: .infinity).frame(height: 54)
                            .background(HeleneTheme.Colors.dark,
                                        in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.button))
                        }
                        .disabled(isLoading || !isFormValid)
                        .opacity(isFormValid ? 1 : 0.4)
                        .padding(.top, HeleneTheme.Spacing.xs)
                    }
                    .padding(.horizontal, HeleneTheme.Spacing.lg)
                    .animation(.spring(duration: 0.4), value: mode)

                    // ── Toggle ───────────────────────────────────────────
                    Button {
                        withAnimation(.spring(duration: 0.4)) {
                            mode = mode == .signIn ? .signUp : .signIn
                            errorMessage = nil
                        }
                    } label: {
                        if mode == .signIn {
                            Text("New to Helene? \(Text("Create an account").foregroundStyle(HeleneTheme.Colors.textPrimary).bold())")
                                .font(.footnote).foregroundStyle(HeleneTheme.Colors.textSecond)
                        } else {
                            Text("Already have an account? \(Text("Sign in").foregroundStyle(HeleneTheme.Colors.textPrimary).bold())")
                                .font(.footnote).foregroundStyle(HeleneTheme.Colors.textSecond)
                        }
                    }
                }
            }
        }
    }

    private var isFormValid: Bool {
        email.contains("@") && email.contains(".") && password.count >= 8
        && (mode == .signIn || !name.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    private func performAuth() async {
        isLoading = true; errorMessage = nil
        do {
            if mode == .signIn { try await authManager.signInWithEmail(email: email, password: password) }
            else { try await authManager.signUpWithEmail(email: email, password: password, name: name) }
        } catch { withAnimation { errorMessage = error.localizedDescription } }
        isLoading = false
    }
}

// MARK: - Text Field

struct HeleneTextField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    var isSecure: Bool = false

    var body: some View {
        HStack(spacing: HeleneTheme.Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(HeleneTheme.Colors.textLight)
                .frame(width: 20)
            if isSecure {
                SecureField(placeholder, text: $text)
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    .autocorrectionDisabled()
            } else {
                TextField(placeholder, text: $text)
                    .foregroundStyle(HeleneTheme.Colors.textPrimary)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(autocapitalization)
                    .autocorrectionDisabled()
            }
        }
        .padding(HeleneTheme.Spacing.md)
        .background(HeleneTheme.Colors.surface,
                    in: RoundedRectangle(cornerRadius: HeleneTheme.Radius.medium))
    }
}

#Preview {
    EmailAuthView().environment(AuthManager())
}
