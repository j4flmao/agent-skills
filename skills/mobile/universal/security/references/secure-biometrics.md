# Secure Biometrics for Mobile

## Overview

Biometric authentication provides a convenient and secure method for mobile app authentication. This guide covers biometric API integration across platforms, security considerations, fallback strategies, and best practices for implementation.

## Platform Biometric APIs

```yaml
platform_apis:
  ios:
    framework: "LocalAuthentication"
    available: "Face ID (iPhone X+) or Touch ID (iPhone 5s+)"
    api_level: "LAContext — evaluatePolicy with .deviceOwnerAuthenticationWithBiometrics"
    biometric_only: "true (user must use biometrics, no passcode fallback within biometric context)"
    keychain_integration: "SecAccessControl with biometryCurrentSet — key released only on biometric auth"
    
    swift_example: |
      import LocalAuthentication
      
      func authenticate(reason: String) async -> Bool {
          let context = LAContext()
          context.localizedReason = reason
          
          var error: NSError?
          guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
              return false
          }
          
          do {
              let success = try await context.evaluatePolicy(
                  .deviceOwnerAuthenticationWithBiometrics,
                  localizedReason: reason
              )
              return success
          } catch {
              return false
          }
      }
      
  android:
    framework: "BiometricPrompt (Android 9+), androidx.biometric"
    available: "Fingerprint, Face (Android 10+), Iris"
    api_level: "BiometricManager.authentication with BIOMETRIC_STRONG"
    crypto_object: "CryptoObject for key release — binds biometric auth to cryptographic key usage"
    
    kotlin_example: |
      import androidx.biometric.BiometricPrompt
      import androidx.fragment.app.FragmentActivity
      
      fun authenticate(activity: FragmentActivity) {
          val promptInfo = BiometricPrompt.PromptInfo.Builder()
              .setTitle("Verify identity")
              .setSubtitle("Authenticate to view sensitive data")
              .setAllowedAuthenticators(
                  BIOMETRIC_STRONG or DEVICE_CREDENTIAL
              )
              .build()
          
          val biometricPrompt = BiometricPrompt(
              activity,
              { authResult -> onSuccess() },
              { error -> onError(error) }
          )
          
          biometricPrompt.authenticate(promptInfo)
      }
      
  flutter:
    package: "local_auth"
    available: "Face ID / Touch ID (iOS), Fingerprint / Face (Android)"
    usage: |
      import 'package:local_auth/local_auth.dart';
      
      final auth = LocalAuthentication();
      final available = await auth.canCheckBiometrics;
      if (available) {
          final authenticated = await auth.authenticate(
              localizedReason: 'Verify identity',
              options: AuthenticationOptions(
                  biometricOnly: true,
                  stickyAuth: true,
              ),
          );
      }
      
  react_native:
    package: "react-native-biometrics"
    available: "Face ID / Touch ID (iOS), Biometric (Android)"
    usage: |
      import ReactNativeBiometrics from 'react-native-biometrics';
      
      const { biometryType } = await ReactNativeBiometrics.isSensorAvailable();
      
      const { success } = await ReactNativeBiometrics.simplePrompt({
          promptMessage: 'Verify identity',
      });
```

## Biometric Key Release Pattern

### Why CryptoObject Matters

The biometric CryptoObject pattern ensures that authentication and key release are atomic operations — biometric approval releases a cryptographic key, which is then used to decrypt stored secrets.

```swift
// iOS: Keychain + Biometric binding
let accessControl = SecAccessControlCreateWithFlags(
    nil,
    kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
    .biometryCurrentSet,  // Key released only on biometric auth
    nil
)

let query: [String: Any] = [
    kSecClass: kSecClassGenericPassword,
    kSecAttrAccount: "auth_token",
    kSecAttrAccessControl: accessControl as Any,
    kSecValueData: tokenData,
]
SecItemAdd(query as CFDictionary, nil)

// Reading requires biometric auth
SecItemCopyMatching(query, nil)  // System shows biometric prompt
```

```kotlin
// Android: BiometricPrompt with CryptoObject
val keyGenParameterSpec = KeyGenParameterSpec.Builder(
    "app_key",
    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setUserAuthenticationRequired(true)  // Requires biometric
    .setInvalidatedByBiometricEnrollment(true)  // New face/finger invalidates key
    .build()

val keyGenerator = KeyGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_AES,
    "AndroidKeyStore"
)
keyGenerator.init(keyGenParameterSpec)
keyGenerator.generateKey()

// Encrypt data — biometric required to use this key
val cipher = Cipher.getInstance("AES/GCM/NoPadding")
cipher.init(Cipher.ENCRYPT_MODE, secretKey)

// BiometricPrompt with cryptoObject = BiometricPrompt.CryptoObject(cipher)
```

## Biometric Security Considerations

```yaml
biometric_security:
  false_acceptance_rate:
    face_id: "1:1,000,000"
    touch_id: "1:50,000"
    android_fingerprint: "1:50,000 (varies by sensor quality)"
    android_face: "1:50,000 (Class 3 — requires IR camera)"
    voice: "1:50 (not suitable as sole authenticator)"
    
  attack_vectors:
    presentation_attack:
      description: "Fake biometric presented to sensor (photo, mask, gummy finger)"
      mitigation: "Liveness detection — iOS Face ID uses IR + dot projector, Android Class 3 requires IR camera"
      platforms:
        ios: "Face ID has anti-spoofing built in — dot project + IR + neural network"
        android: "Requires BIOMETRIC_STRONG (Class 3) for anti-spoofing. BIOMETRIC_WEAK (Class 1/2) is photo-detectable."
    
    biometric_enrollment_change:
      description: "Attacker adds their biometric to device after theft"
      mitigation: "Keys bound to current biometric enrollment — new enrollment invalidates keys"
      ios: "kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly + .biometryCurrentSet"
      android: "setInvalidatedByBiometricEnrollment(true) — key invalidated on new enrollment"
      
    biometric_as_sole_factor:
      description: "Biometric alone is sufficient for all sensitive operations"
      mitigation: "Biometric should gate access to stored credentials, not replace them. Use as second factor."
```

## Fallback Strategies

```yaml
fallback_strategies:
  device_passcode_fallback:
    description: "Fall back to device passcode/PIN when biometric fails"
    implementation:
      ios: "use .deviceOwnerAuthentication instead of .deviceOwnerAuthenticationWithBiometrics"
      android: "BIOMETRIC_STRONG or DEVICE_CREDENTIAL in allowedAuthenticators"
    security: "Device passcode is less secure than biometric — limit fallback to low-sensitivity operations"
    
  app_level_pin_fallback:
    description: "App-specific PIN as fallback when biometric unavailable"
    implementation:
      - "Prompt user to create app PIN during initial setup"
      - "Store PIN hash in secure storage (Keychain/EncryptedSharedPrefs)"
      - "Require biometric OR PIN for sensitive operations"
    security: "Weaker than biometric — enforce PIN complexity (6+ digits), rate limit attempts"
    
  progressive_degradation:
    no_biometric: "Fall back to app PIN or password"
    biometric_not_available: "Use device passcode if enrolled, otherwise app PIN"
    repeated_failure: "Escalate to full password authentication after N failures"
```

## Implementation Checklist

```yaml
biometric_checklist:
  security:
    - "Use cryptographic binding (CryptoObject / SecAccessControl) — not just boolean success/failure"
    - "Bind keys to current biometric enrollment — invalidate on biometric change"
    - "Store tokens and secrets via biometric-gated secure storage"
    - "Use BIOMETRIC_STRONG (Android) — never use BIOMETRIC_WEAK for security"
    - "Limit biometric for authentication — not as sole authorization mechanism"
    
  ux:
    - "Clear, user-friendly reason string explaining why biometric is needed"
    - "Fallback mechanism for when biometric fails or is unavailable"
    - "Handle edge cases: app backgrounded mid-auth, multiple rapid attempts"
    - "Show biometric type (Face ID / Touch ID / Fingerprint) based on device capability"
    
  testing:
    - "Test on device — simulator biometric is simulated and not representative"
    - "Test biometric enrollment changes — enroll new face/fingerprint, verify old keys invalidated"
    - "Test all fallback paths — passcode fallback, app PIN, progressive lockout"
    - "Test with accessibility features (VoiceOver, Switch Control, TalkBack)"
```
