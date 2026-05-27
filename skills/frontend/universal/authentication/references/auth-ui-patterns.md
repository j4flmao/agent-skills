# Authentication UI Patterns

## Login Screen

```swift
import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Image("logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 120, height: 120)

                Text("Welcome Back")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                VStack(spacing: 16) {
                    SocialLoginButton(provider: "Google", action: viewModel.loginWithGoogle)
                    SocialLoginButton(provider: "Apple", action: viewModel.loginWithApple)
                }

                DividerWithText("or")

                VStack(spacing: 12) {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textFieldStyle(RoundedBorderTextFieldStyle())

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }

                Button("Forgot Password?") { viewModel.forgotPassword() }
                    .font(.subheadline)
                    .foregroundColor(.blue)

                Button(action: { viewModel.login(email: email, password: password) }) {
                    Text("Login")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .disabled(email.isEmpty || password.isEmpty)
            }
            .padding()
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK") { viewModel.showError = false }
        } message: {
            Text(viewModel.errorMessage)
        }
    }
}

struct SocialLoginButton: View {
    let provider: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(provider.lowercased())
                    .resizable()
                    .frame(width: 20, height: 20)
                Text("Continue with \(provider)")
                    .font(.body)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(10)
        }
    }
}
```

## Biometric Authentication

```swift
import LocalAuthentication

class BiometricAuthManager {
    private let context = LAContext()

    var canUseBiometrics: Bool {
        context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
    }

    var biometricType: BiometricType {
        guard canUseBiometrics else { return .none }

        switch context.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        case .opticID: return .opticID
        default: return .none
        }
    }

    func authenticate(reason: String = "Authenticate to access your account") async throws -> Bool {
        return try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        )
    }

    enum BiometricType {
        case none, touchID, faceID, opticID
    }
}
```

## Key Points

- Provide multiple login options (email, social, biometric)
- Support social login with Google, Apple, Facebook
- Implement biometric authentication (Face ID, Touch ID)
- Use secure text fields for password input
- Show validation errors inline in the form
- Implement forgot password flow
- Support signup with email verification
- Use OAuth 2.0 for social login
- Implement session timeout and auto-logout
- Show loading states during authentication
- Handle account lockout after failed attempts
- Support multi-factor authentication
