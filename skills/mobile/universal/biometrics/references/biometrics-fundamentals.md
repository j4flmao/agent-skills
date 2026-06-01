# Biometrics Fundamentals

## What is Mobile Biometric Authentication?

Biometric authentication uses unique physical characteristics (fingerprint, face, iris) to verify a user's identity. On mobile devices, biometrics provide convenient, secure local authentication without requiring the user to enter a password each time.

## Biometric Types

### Class 3 — Strong Biometric
Highest security. Hardware-backed with anti-spoofing.
- **Face ID** (iPhone X+): TrueDepth camera projects 30,000 infrared dots, 1:1,000,000 false positive rate
- **Touch ID** (iPhone 5s+): Capacitive fingerprint sensor, 1:50,000 false positive rate
- **Ultrasonic fingerprint** (Samsung, Pixel): Uses sound waves, works with wet fingers
- **Pixel Imprint**: Google's hardware-backed fingerprint

### Class 2 — Weak Biometric
Software-based, less secure, easier to spoof.
- **Face Unlock** (Android): Front camera only, no depth mapping
- **Iris scanner**: Less common, available on select Samsung devices

### Class 1 — Convenience
Basic face detection, no security guarantees. Used only for convenience (waking device, showing notifications).

### Device Credential
PIN, pattern, or password. Always available, used as fallback when biometrics unavailable or locked out.

## Platform APIs

### iOS — LocalAuthentication
```swift
import LocalAuthentication

let context = LAContext()
var error: NSError?

// Check availability
guard context.canEvaluatePolicy(
    .deviceOwnerAuthenticationWithBiometrics, error: &error
) else {
    // Handle: no biometric hardware, not enrolled, or locked out
    handleBiometricUnavailable(error)
    return
}

// Authenticate
context.evaluatePolicy(
    .deviceOwnerAuthenticationWithBiometrics,
    localizedReason: "Unlock your account"
) { success, authError in
    DispatchQueue.main.async {
        if success { grantAccess() }
        else { handleFailure(authError) }
    }
}
```

### Android — BiometricPrompt
```kotlin
val biometricPrompt = BiometricPrompt(
    activity,
    ContextCompat.getMainExecutor(context),
    object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            grantAccess()
        }
        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            handleError(errorCode, errString)
        }
        override fun onAuthenticationFailed() {
            // Fingerprint not recognized — can retry, no error code
            showRetry()
        }
    }
)

val promptInfo = BiometricPrompt.PromptInfo.Builder()
    .setTitle("Verify Identity")
    .setSubtitle("Access your secure data")
    .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
    .setConfirmationRequired(true)
    .build()

biometricPrompt.authenticate(promptInfo)
```

## Availability Check Flow

### iOS
```swift
func biometricAvailability() -> BiometricAvailability {
    let context = LAContext()
    var error: NSError?

    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
        let laError = error as? LAError
        switch laError?.code {
        case .biometryNotAvailable: return .hardwareUnavailable
        case .biometryNotEnrolled: return .notEnrolled
        case .biometryLockout: return .lockedOut
        default: return .unavailable
        }
    }
    return .available(context.biometryType == .faceID ? .faceID : .touchID)
}
```

### Android
```kotlin
fun biometricAvailability(): Int {
    val biometricManager = BiometricManager.from(context)
    return biometricManager.canAuthenticate(BIOMETRIC_STRONG)
    // Returns: BIOMETRIC_SUCCESS, BIOMETRIC_ERROR_NO_HARDWARE,
    //          BIOMETRIC_ERROR_HW_UNAVAILABLE, BIOMETRIC_ERROR_NONE_ENROLLED,
    //          BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED
}
```

## Common UX Patterns

### App Unlock
- Show login screen first (email/password or social)
- After successful login, prompt to enable biometrics for future access
- On subsequent launches, show biometric prompt immediately
- If biometric fails 3x, show device credential (PIN) as fallback
- Cache authorization for session duration (5-15 minutes idle timeout)

### In-App Authentication
- Proceed with biometric on accessing protected features
- Show feature-locked state with "Unlock with Face ID" button
- Brief explanation of why biometric is needed
- Fallback to app password if biometric unavailable

### Settings Toggle
- Settings screen: "Use Face ID" toggle
- On enable: prompt biometric to verify user owns the device
- On disable: confirm with device credential (prevent accidental disable)
- Show enrolled biometric type and status
- "Change biometric" option to re-enroll secure keys

## Error Handling

| Error Code | iOS (LAError) | Android (BiometricPrompt) | User Message |
|------------|---------------|--------------------------|--------------|
| Hardware unavailable | `.biometryNotAvailable` | `BIOMETRIC_ERROR_HW_UNAVAILABLE` | "Biometric hardware not available" |
| Not enrolled | `.biometryNotEnrolled` | `BIOMETRIC_ERROR_NONE_ENROLLED` | "No biometrics enrolled. Go to Settings" |
| Locked out | `.biometryLockout` | `BIOMETRIC_ERROR_LOCKOUT` | "Too many attempts. Use PIN" |
| User canceled | `.userCancel` | `ERROR_USER_CANCELED` | (No message — user initiated) |
| System cancel | `.systemCancel` | `ERROR_CANCELED` | (Event from system, retry) |
| App backgrounded | `.appCancel` | `ERROR_CANCELED` | (Re-prompt on return to foreground) |
| Passcode not set | `.passcodeNotSet` | `BIOMETRIC_ERROR_NO_DEVICE_CREDENTIAL` | "Set device PIN in Settings" |
| Biometric changed | (key invalid) | `KeyPermanentlyInvalidatedException` | "Biometric changed. Please re-enroll" |

## Privacy & Security

- Biometric data NEVER leaves the device — only authentication results
- Face ID/Touch ID data stored in Secure Enclave (iOS) or TEE (Android)
- App receives a boolean success/failure, not the biometric data itself
- Biometric key invalidated on enrollment change prevents stolen biometric replay
- Store only authentication tokens (not biometric templates) on server
- Always provide non-biometric fallback for accessibility
