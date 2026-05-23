# Biometric Types

## Biometric Classification

### Android Biometric Classes

| Class | Level | Examples | Security |
|-------|-------|----------|----------|
| Class 3 (Strong) | BIOMETRIC_STRONG | Fingerprint (ultrasonic/capacitive), Face (IR-based, Pixel 4+) | High — spoof-resistant |
| Class 2 (Weak) | BIOMETRIC_WEAK | Face unlock (camera-based), Iris scanner | Medium — can be spoofed |
| Class 1 (Convenience) | BIOMETRIC_WEAK | Basic face detection | Low — convenience only |
| Device Credential | DEVICE_CREDENTIAL | PIN, Pattern, Password | Varies |

### iOS Biometric Types

| Type | Hardware Required | Availability | Security |
|------|------------------|-------------|----------|
| Face ID | TrueDepth camera (iPhone X+) | iPhone X+, iPad Pro 2018+ | High — attention aware |
| Touch ID | Touch ID sensor | iPhone 5s+, iPad Air 2+ | High |
| Device Passcode | None | All devices | Medium-High |

## Android — BiometricPrompt API

```kotlin
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity

class BiometricAuthManager(private val activity: FragmentActivity) {

    fun checkAvailability(): BiometricAvailability {
        val manager = BiometricManager.from(activity)
        return when (manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricAvailability.Available
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricAvailability.NoHardware
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricAvailability.NotEnrolled
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> BiometricAvailability.SecurityUpdate
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> BiometricAvailability.Unsupported
            BiometricManager.BIOMETRIC_STATUS_UNKNOWN -> BiometricAvailability.Unknown
            else -> BiometricAvailability.Unknown
        }
    }

    fun authenticate(
        title: String = "Authenticate",
        subtitle: String = "Verify your identity",
        onSuccess: (BiometricPrompt.AuthenticationResult) -> Unit,
        onError: (Int, String) -> Unit,
        onFailed: () -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val biometricPrompt = BiometricPrompt(activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onSuccess(result)
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onError(errorCode, errString.toString())
                }
                override fun onAuthenticationFailed() {
                    onFailed()
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            .setConfirmationRequired(false)
            .build()

        biometricPrompt.authenticate(promptInfo)
    }
}

sealed class BiometricAvailability {
    object Available : BiometricAvailability()
    object NoHardware : BiometricAvailability()
    object NotEnrolled : BiometricAvailability()
    object SecurityUpdate : BiometricAvailability()
    object Unsupported : BiometricAvailability()
    object Unknown : BiometricAvailability()
}
```

## iOS — LocalAuthentication Framework

```swift
import LocalAuthentication

class BiometricAuthManager {
    private let context = LAContext()

    enum BiometricType {
        case faceID, touchID, none
    }

    var biometryType: BiometricType {
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else {
            return .none
        }
        switch context.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        case .none: return .none
        @unknown default: return .none
        }
    }

    func checkAvailability() -> (available: Bool, error: LAError.Code?) {
        var error: NSError?
        let available = context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics, error: &error)
        if !available, let laError = error as? LAError {
            return (false, laError.code)
        }
        return (true, nil)
    }

    func authenticate(
        reason: String = "Authenticate to access your account",
        completion: @escaping (Bool, LAError.Code?) -> Void
    ) {
        let context = LAContext()
        context.localizedReason = reason
        // .deviceOwnerAuthenticationWithBiometrics = biometric only
        // .deviceOwnerAuthentication = biometric + passcode fallback
        context.evaluatePolicy(.deviceOwnerAuthentication,
            localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    completion(true, nil)
                } else if let laError = error as? LAError {
                    completion(false, laError.code)
                } else {
                    completion(false, nil)
                }
            }
        }
    }
}

// LAError codes for handling:
// .biometryNotAvailable — no biometric hardware
// .biometryNotEnrolled — user hasn't enrolled biometrics
// .biometryLockout — too many failed attempts
// .userCancel — user tapped cancel
// .authenticationFailed — biometric didn't match
// .passcodeNotSet — no device passcode set
// .appCancel — app called invalidate()
```

## Cross-Platform — Capacitor Plugin

```typescript
import { Biometric } from '@capacitor/biometric';

async function checkAndAuthenticate() {
    // Check availability
    const result = await Biometric.checkPermissions();
    const available = result.isAvailable; // boolean

    if (!available) {
        // Fallback to device credential or app password
        return showPasswordPrompt();
    }

    // Biometric strength
    const strength = result.biometryType; // 'fingerprint' | 'face' | 'iris' | 'none'

    // Authenticate
    try {
        const auth = await Biometric.authenticate({
            reason: 'Authenticate to access your vault',
            useFallback: true, // allow device credential fallback
            title: 'Verify identity',
            subtitle: 'Access your secure vault',
        });
        if (auth.verified) {
            // Access granted
        }
    } catch (e) {
        if (e.code === 'LOCKOUT') {
            // Too many failed attempts — force device credential
        }
    }
}
```

## Error Handling by Error Code

| Error | Android | iOS | Action |
|-------|---------|-----|--------|
| No hardware | `BIOMETRIC_ERROR_NO_HARDWARE` | `.biometryNotAvailable` | Hide biometric option |
| Not enrolled | `BIOMETRIC_ERROR_NONE_ENROLLED` | `.biometryNotEnrolled` | Redirect to Settings |
| Lockout | `ERROR_LOCKOUT` (30s) / `ERROR_LOCKOUT_PERMANENT` | `.biometryLockout` | Force device credential |
| User canceled | `ERROR_USER_CANCELED` | `.userCancel` | No action (expected) |
| Authentication failed | `onAuthenticationFailed()` | `.authenticationFailed` | Show retry, increment counter |
| Passcode not set | N/A (use `DEVICE_CREDENTIAL`) | `.passcodeNotSet` | Redirect to Settings |
| App canceled | `ERROR_USER_CANCELED` | `.appCancel` | Clean up |

No preamble. No postamble. No explanations.
