# Mobile Biometric Authentication

## Platform Biometric APIs

### iOS — LocalAuthentication Framework
```swift
import LocalAuthentication

class BiometricAuthManager {
    private let context = LAContext()

    enum BiometricType {
        case faceID, touchID, none
    }

    var biometryType: BiometricType {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        switch context.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        default: return .none
        }
    }

    func authenticate(reason: String) async throws -> Bool {
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            throw BiometricError.unavailable(error?.localizedDescription ?? "No biometrics")
        }

        return try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, authError in
                if success {
                    continuation.resume(returning: true)
                } else {
                    let laError = authError as? LAError
                    continuation.resume(throwing: BiometricError.from(laError))
                }
            }
        }
    }
}

enum BiometricError: Error {
    case unavailable(String)
    case userCancel
    case systemCancel
    case authenticationFailed
    case passcodeNotSet
    case biometryNotEnrolled
    case biometryLockout
    case appCancel
    case invalidContext
    case notInteractive

    static func from(_ error: LAError?) -> BiometricError {
        guard let error = error else { return .authenticationFailed }
        switch error.code {
        case .authenticationFailed: return .authenticationFailed
        case .userCancel: return .userCancel
        case .userFallback: return .userCancel
        case .systemCancel: return .systemCancel
        case .passcodeNotSet: return .passcodeNotSet
        case .biometryNotEnrolled: return .biometryNotEnrolled
        case .biometryLockout: return .biometryLockout
        case .appCancel: return .appCancel
        case .invalidContext: return .invalidContext
        case .notInteractive: return .notInteractive
        @unknown default: return .authenticationFailed
        }
    }
}
```

### Android — BiometricPrompt API
```kotlin
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import java.security.Signature
import javax.crypto.Cipher
import javax.crypto.Mac

class AndroidBiometricAuth(private val activity: FragmentActivity) {

    fun checkAvailability(): BiometricAvailability {
        val manager = BiometricManager.from(activity)
        return when (manager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricAvailability.Available
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE ->
                BiometricAvailability.NoHardware
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
                BiometricAvailability.TemporarilyUnavailable
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                BiometricAvailability.NotEnrolled
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED ->
                BiometricAvailability.SecurityUpdateRequired
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED ->
                BiometricAvailability.Unsupported
            else -> BiometricAvailability.Unavailable
        }
    }

    fun authenticate(
        title: String,
        subtitle: String,
        negativeButtonText: String,
        cryptoObject: BiometricPrompt.CryptoObject? = null,
        onSuccess: (BiometricPrompt.AuthenticationResult) -> Unit,
        onError: (Int, String) -> Unit,
        onFailed: () -> Unit
    ) {
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
            .setConfirmationRequired(false)
            .setNegativeButtonText(negativeButtonText)
            .build()

        val prompt = BiometricPrompt(activity, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                    errorCode == BiometricPrompt.ERROR_USER_CANCELED) {
                    return // User tapped cancel — handled by negative button
                }
                onError(errorCode, errString.toString())
            }

            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onSuccess(result)
            }

            override fun onAuthenticationFailed() {
                onFailed()
            }
        })

        if (cryptoObject != null) {
            prompt.authenticate(promptInfo, cryptoObject)
        } else {
            prompt.authenticate(promptInfo)
        }
    }
}

sealed class BiometricAvailability {
    object Available : BiometricAvailability()
    object NoHardware : BiometricAvailability()
    object TemporarilyUnavailable : BiometricAvailability()
    object NotEnrolled : BiometricAvailability()
    object SecurityUpdateRequired : BiometricAvailability()
    object Unsupported : BiometricAvailability()
    object Unavailable : BiometricAvailability()
}
```

### Cross-Platform — Capacitor Biometric Plugin
```typescript
import { BiometricManager, BiometricPermissionState } from '@capacitor/biometric';

async function checkAndAuthenticate() {
  // Check availability
  const result = await BiometricManager.check();
  if (!result.isAvailable) {
    // Fallback to PIN/password
    showPinFallback();
    return;
  }

  // Perform biometric authentication
  try {
    const authResult = await BiometricManager.authenticate({
      reason: 'Please authenticate to access your account',
      title: 'Security Check',
      subtitle: 'Biometric verification required',
      negativeButtonText: 'Use PIN instead',
      allowDeviceCredential: true,
      maxAttempts: 3,
    });

    if (authResult.authenticated) {
      grantAccess();
    }
  } catch (error) {
    if (error instanceof BiometricAuthenticationCancelled) {
      // User cancelled — no action needed
    } else {
      showError(error.message);
    }
  }
}
```

## Face ID vs Touch ID

| Feature | Face ID | Touch ID |
|---|---|---|
| Hardware | TrueDepth camera | Capacitive sensor |
| Authentication | Face matching | Fingerprint matching |
| Speed | ~0.5s | ~0.3s |
| ATTENTION_REQUIRED | Yes (default) | N/A |
| Alternate appearance | 1 (iOS 15+: 2) | Up to 5 fingerprints |
| Works with mask | iOS 15.4+ (partial face) | N/A |
| Fail rate (estimated) | ~1 in 1,000,000 | ~1 in 50,000 |
| Wet/moist fingers | N/A | Fails |
| Sunglasses | Yes (most) | N/A |

## Android Biometric Classes

| Class | Types | Security Level |
|---|---|---|
| Class 3 (Strong) | Face (Grade 3), Fingerprint, Iris | High — meets Android CDD strong requirements |
| Class 2 (Weak) | Face (Grade 2), Iris (device-specific) | Medium — lower spoof resistance |
| Class 1 (Convenience) | Face (Grade 1), basic detection | Low — convenience only |

## Fallback Strategies

### Three-Tier Fallback Chain
```swift
// Swift — fallback chain implementation
enum AuthMethod {
    case biometric
    case deviceCredential
    case appPassword
}

func authenticateWithFallback() async throws {
    let methods: [AuthMethod] = [.biometric, .deviceCredential, .appPassword]

    for method in methods {
        switch method {
        case .biometric:
            guard try await checkBiometricAvailability() else { continue }
            do {
                try await biometricAuth()
                return
            } catch BiometricError.biometryLockout {
                continue // Fall through to device credential
            } catch {
                throw error
            }
        case .deviceCredential:
            do {
                try await deviceCredentialAuth()
                return
            } catch {
                continue
            }
        case .appPassword:
            try await appPasswordAuth()
            return
        }
    }
    throw AuthError.allMethodsFailed
}
```

## Best Practices

- Always check availability before showing prompt — never blind-call authenticate
- Use `deviceOwnerAuthentication` (iOS) / `DEVICE_CREDENTIAL` (Android) as fallback
- Set user-facing reason strings — null/false reasons cause rejection
- Handle `biometryLockout` (iOS) / `ERROR_LOCKOUT` (Android) with explicit UX
- Test on actual hardware — simulators provide limited biometric simulation
- Never store raw biometric data — only authentication assertions
- Clear biometric keys on biometric enrollment changes
