# Biometric APIs

## Android — BiometricPrompt

```kotlin
val biometricManager = BiometricManager.from(context)
when (biometricManager.canAuthenticate(BIOMETRIC_STRONG)) {
  BiometricManager.BIOMETRIC_SUCCESS -> // Ready
  BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> // No biometric hardware
  BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> // No fingerprints/Face enrolled
  BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> // Security patch needed
}

val promptInfo = BiometricPrompt.PromptInfo.Builder()
  .setTitle("Authenticate")
  .setSubtitle("Verify identity to access vault")
  .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
  .setConfirmationRequired(false)
  .build()

val biometricPrompt = BiometricPrompt(
  fragmentActivity,
  executor,
  object : BiometricPrompt.AuthenticationCallback() {
    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
      // Use result.cryptoObject for decryption
    }
    override fun onAuthenticationFailed() { /* Retry */ }
    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
      if (errorCode == BiometricPrompt.ERROR_LOCKOUT) { /* Lockout */ }
    }
  }
)

biometricPrompt.authenticate(promptInfo)
```

## iOS — LocalAuthentication

```swift
import LocalAuthentication

let context = LAContext()
var error: NSError?

guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
  // Not available. Fall back to deviceOwnerAuthentication (PIN)
  context.evaluatePolicy(.deviceOwnerAuthentication, 
    localizedReason: "Authenticate to access vault") { success, error in }
  return
}

context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
  localizedReason: "Verify identity to access vault") { success, authError in
  DispatchQueue.main.async {
    if success { /* Access granted */ }
    else if let laError = authError as? LAError {
      switch laError.code {
      case .biometryLockout: break // Too many attempts
      case .userCancel: break
      default: break
      }
    }
  }
}
```

## Cross-Platform — Capacitor

```typescript
import { Biometric } from '@capacitor/biometric';

const check = await Biometric.checkPermissions();
if (check.isAvailable) {
  const result = await Biometric.authenticate({
    reason: 'Authenticate to access vault',
    useFallback: true,
  });
}
```

## Biometric Strength Support

| Platform | Strong | Weak | Device Credential |
|----------|--------|------|-------------------|
| iOS 11+ | Face ID / Touch ID | Face ID (unsafe) | PIN / Password |
| Android 9+ | Class 3 (fingerprint, face) | Class 1/2 | PIN / Pattern |
