---
name: mobile-biometrics
description: >
  Use this skill when the user says 'biometrics', 'Face ID', 'Touch ID', 'fingerprint', 'fingerprint auth', 'biometric auth', 'face unlock', 'local authentication', 'biometric prompt', 'device credential'. Implement biometric authentication with secure storage on iOS and Android. Do NOT use for: server-side authentication or password-based auth.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, biometrics, auth, phase-7, universal]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Biometrics

## Purpose
Guide for implementing biometric authentication (Face ID, Touch ID, fingerprint) with secure storage and fallback UX.

## Agent Protocol

### Trigger
Phrases: "biometrics", "Face ID", "Touch ID", "fingerprint", "fingerprint auth", "biometric auth", "face unlock", "local authentication", "biometric prompt", "device credential"

### Input Context
- Target platforms (iOS, Android, or cross-platform)
- Sensitivity level of protected operations
- Existing auth system (if any)
- UX requirements for lockout and fallback

### Output Artifact
Biometric auth module: availability check, prompt flow, secure storage with biometric protection, fallback to device credential, UX handling.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Biometric prompt appears and resolves correctly
- Data encrypted with biometric key — inaccessible without auth
- Device credential fallback works when biometrics unavailable
- User can opt in/out of biometric auth
- 5-failure lockout enforced

### Max Response Length
6000 tokens

## Architecture / Decision Trees

### Biometric Use Case Decision Tree
```
What operation are you protecting?
├── App unlock (every launch) → Biometric + device credential
│   iOS: LAContext(.deviceOwnerAuthentication)
│   Android: BiometricPrompt with DEVICE_CREDENTIAL
├── High-sensitivity (payments, passwords, personal data)
│   → Class 3 (Strong) biometric required
│   Fallback to device credential
├── Low-sensitivity (dashboard view, quick action)
│   → Class 2 (Weak) biometric acceptable
│   No fallback needed — just require re-auth
└── Data decryption (read stored secrets)
    → Biometric key (Android: setUserAuthenticationRequired, iOS: biometryCurrentSet)
    Key invalidated on biometric enrollment change
```

### Biometric Class Selection
```
Which Android biometric class?
├── Class 3 (Strong) → BIOMETRIC_STRONG
│   Pin/pattern + hardware-backed biometric
│   Used for: payments, auth tokens, PII
├── Class 2 (Weak) → BIOMETRIC_WEAK
│   Face recognition, iris — less secure
│   Used for: convenience unlock, non-sensitive
└── Device credential → DEVICE_CREDENTIAL
    PIN, pattern, password — always available
```

## Workflow

1. **Biometric type detection** — Three categories of biometric authentication with varying security levels. Class 3 (Strong): Face ID (iPhone X+), Touch ID (iPhone 5s+), Pixel Imprint, ultrasonic fingerprint. Class 2 (Weak): face unlock on budget Android devices, iris scanner. Class 1: convenience face unlock. Android: Check with `BiometricManager.canAuthenticate(BIOMETRIC_STRONG)` vs `BIOMETRIC_WEAK`. iOS: `LAContext.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` — Face ID on devices with TrueDepth camera, Touch ID on devices with Touch ID sensor. Device credential (PIN, pattern, password) is always available as fallback and is considered a biometric alternative on iOS (`deviceOwnerAuthentication`), but not equivalent to biometric on Android (`DEVICE_CREDENTIAL` flag).

2. **Biometric availability check** — Before showing a biometric prompt, check: (a) Is biometric hardware available? (hardware present). (b) Is biometric enrolled? (user has registered at least one fingerprint/face). (c) Is device credential configured? (PIN/password set — required fallback). (d) Are there any transient issues? (security update required, sensor dirty, too many attempts — lockout). Handle each failure case with a specific user-facing message. On Android, `BiometricManager` returns distinct error codes. On iOS, `LAContext.canEvaluatePolicy` returns `NSError` with `LAError` codes. Never show biometric prompt without first checking availability.

3. **Authentication prompt flow** — Flow: user triggers protected action -> check availability -> if biometric available -> show biometric prompt with reason string -> user authenticates -> on success -> grant access -> on failure -> allow retry (up to 5 attempts) -> on 5th failure -> lockout -> force device credential. If biometric not available at start -> fall through to device credential. The reason string is mandatory on both platforms and displayed prominently. On iOS, `localizedReason` is shown in the Face ID dialog. On Android, `setTitle` and `setSubtitle` are shown in the system prompt. After successful authentication, the app receives a callback with (optionally) a `CryptoObject` for decryption.

4. **Secure storage with biometric protection** — Store sensitive data (auth tokens, encryption keys, passwords) in platform secure stores with biometric access control. Android: EncryptedSharedPreferences backed by Android Keystore — set `setUserAuthenticationRequired(true)` on the master key to require biometric before reading. Or use Keystore `SecretKey` with `setUserAuthenticationRequired(true)` and encrypt/decrypt data through `CryptoObject`. `setInvalidatedByBiometricEnrollment(true)` ensures key is destroyed if new biometric is enrolled (prevents stolen biometric from accessing old data). iOS: Keychain with `SecAccessControlCreateWithFlags` using `biometryCurrentSet` — item is only accessible after biometric authentication and is invalidated on biometric enrollment change. For "cache after auth" pattern, use `setUserAuthenticationValidityDurationSeconds` (Android) or `kSecUseAuthenticationUIFallback` (iOS).

5. **Fallback and UX design** — Always provide device credential (PIN/password) as fallback — never block users out. Three-tier fallback chain: Biometric -> Device Credential -> App Password (optional, for users who can't use either). UX patterns: opt-in onboarding screen explaining what biometrics protect, toggle in Settings to enable/disable, clear description of protected operations, graceful degradation on devices without biometric hardware. Lockout: after 5 consecutive biometric failures, biometric is blocked (iOS indefinitely until device credential used, Android for 30 seconds escalating). After lockout, show device credential prompt automatically. Never let users get stuck — always offer the next fallback option.

6. **Cross-platform implementation** — Using Capacitor Biometric plugin (`@capacitor/biometric`): single API for both platforms, handles availability check, prompt, and fallback. Using Expo LocalAuthentication: similar cross-platform API with `hasHardwareAsync()`, `isEnrolledAsync()`, `authenticateAsync()`. For React Native: `react-native-biometrics` or `react-native-keychain`. Cross-platform wrappers simplify code but may not expose all platform-specific features (CryptoObject, fine-grained error handling, key invalidation control). For sensitive apps, use platform-native implementation with cross-platform coordination.

## Biometric Strength Comparison

| Level | Android | iOS | Security |
|-------|---------|-----|----------|
| Strong (Class 3) | Fingerprint, Face (Class 3) | Face ID, Touch ID | High |
| Weak (Class 2) | Face unlock, Iris | Face ID with attention not required | Medium |
| Convenience (Class 1) | Basic face detection | None | Low |
| Device Credential | PIN, Pattern, Password | PIN, Password | Varies |

## Best Practices

- Never store raw biometric data — only authentication results
- Biometric data never leaves the device — no server-side biometric matching
- Device credential fallback is mandatory — no biometric-only gates for critical features
- User must explicitly opt in — no silent biometric enrollment
- Protect high-sensitivity operations: payments, password viewing, profile changes, security settings
- Cache biometric auth result for session duration (not per-action)

## Common Pitfalls

- **Lockout without recovery**: If no device credential fallback, user is permanently locked out. Always provide it.
- **Camera-based face unlock fails in low light**: Advise user or fallback to device credential.
- **Biometric changed alert ignored**: Apps that don't monitor `onAuthenticationError` with `ERROR_USER_CANCELED` after biometric change leave old data accessible.
- **Key invalidation surprise**: Keys invalidated on enrollment change delete encrypted data. Migrate before invalidation.
- **Missing usage description strings**: iOS rejects apps without `NSFaceIDUsageDescription` in Info.plist.
- **Calling biometric on main thread**: Android BiometricPrompt UI must be on main thread; heavy post-auth work goes to background thread.

## Security Considerations

- Biometric match probability: Face ID 1:1,000,000; Touch ID 1:50,000 — not cryptographic certainty
- Server-side auth must NOT rely solely on biometric claim — use biometric for local key release, then authenticate with key
- Anti-spoofing: Face ID with attention awareness is better than basic face unlock
- iOS `localizedReason` displayed in dialog — make it clear to user what's being authenticated
- Android `setConfirmationRequired(true)` adds button press to fingerprint — prevents accidental auth

## Configuration Reference

```kotlin
// Android — BiometricPrompt config
val promptInfo = BiometricPrompt.PromptInfo.Builder()
    .setTitle("Verify identity")
    .setSubtitle("Access your secure vault")
    .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
    .setConfirmationRequired(false)
    .build()
```

```swift
// iOS — LAContext
let context = LAContext()
context.localizedReason = "Unlock your premium features"
context.localizedFallbackTitle = "Enter Passcode"
context.touchIDAuthenticationAllowableReuseDuration = 10 // seconds cached
```

## Biometric Key Management & Crypto Integration

Biometric authentication is most valuable when used to protect cryptographic keys, not just as a boolean gate. The pattern: (1) generate a strong symmetric key (AES-256) in platform secure hardware, (2) bind the key to biometric authentication using `setUserAuthenticationRequired(true)`, (3) use this key to encrypt/decrypt sensitive data (auth tokens, API keys, user credentials), (4) the key is only released when biometric authentication succeeds. Android Keystore provides this via `KeyGenParameterSpec` with `setUserAuthenticationRequired(true)` and `setInvalidatedByBiometricEnrollment(true)`. iOS provides this via Keychain with `SecAccessControlCreateWithFlags` and `biometryCurrentSet`. For cross-platform, use platform-specific key storage and expose through a uniform `SecureEnclave` interface. Key invalidation on biometric enrollment change is critical security behavior — when user adds a new fingerprint/face, existing biometric keys are destroyed, requiring re-encryption of stored data. Apps must handle `KeyPermanentlyInvalidatedException` (Android) or `errSecItemNotFound` (iOS) gracefully by re-prompting for fresh credentials and re-encrypting.

## Multi-Factor Authentication Architecture

Biometrics alone should not grant access to high-value operations. For payments, password changes, or PII viewing, combine biometrics with another factor (MFA). Decision tree:
```
Operation sensitivity level?
├── Low (view dashboard, app unlock) → Biometric only
├── Medium (view profile, read messages) → Biometric + device credential
├── High (payments, password change, delete account)
│   ├── Option A: Biometric + OTP (TOTP or SMS)
│   └── Option B: Biometric + server-issued challenge
└── Critical (large transfers, admin actions)
    → Biometric + OTP + device credential (3-factor)
```

The MFA flow: (1) user authenticates with biometric on device, (2) app sends proof of biometric auth (key attestation or signature) to server, (3) server verifies the attestation and issues an OTP challenge, (4) user enters OTP from authenticator app, (5) server validates and grants access. For offline MFA, use time-based OTP generated from a seed stored in the biometric-protected keystore.

## Biometric Error Handling Decision Tree

```
Biometric authentication result?
├── Success → Grant access, cache auth for session
├── Failure (auth failed, fingerprint not recognized)
│   ├── Attempts < 5 → Show "Try again" with haptic feedback
│   └── Attempts >= 5 → Lockout biometric, force device credential
├── Error: biometric not enrolled → Redirect to Settings → enroll
├── Error: hardware unavailable → Fall through to device credential
├── Error: user canceled → Wait for next user action (don't immediately re-prompt)
├── Error: security update required → Show system update prompt
├── Error: sensor dirty/wet (Android specific) → "Clean sensor" message
└── Error: biometric changed (key invalidation) → Re-encrypt data with new biometric key
```

## Production Considerations

### Biometric Failure Modes

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| No biometric enrolled | Feature disabled | Guide user to Settings to enroll |
| Key invalidation on biometric change | Decryption fails on existing data | Catch `KeyPermanentlyInvalidatedException`, re-encrypt |
| Lockout (5+ failures) | Biometric unavailable | Force device credential, never show biometric UI |
| iOS Face ID not configured | `canEvaluatePolicy` returns false | Info.plist missing `NSFaceIDUsageDescription` |
| Android sensor dirty | "Try again" repeatedly | Guide user to clean sensor |
| Biometric hardware absent | `BIOMETRIC_ERROR_HW_UNAVAILABLE` | Disable biometric section, fallback to PIN |

### Troubleshooting Checklist

- Verify `NSFaceIDUsageDescription` in Info.plist (iOS)
- Check `BiometricManager.canAuthenticate(BIOMETRIC_STRONG)` before showing prompt (Android)
- Confirm `setAllowedAuthenticators()` includes `DEVICE_CREDENTIAL` fallback
- Validate that biometric key uses `setInvalidatedByBiometricEnrollment(true)`
- Test lockout flow: authenticate 5 times with wrong finger — verify fallback to device credential
- Test biometric enrollment change: enroll biometric -> store data -> unenroll -> verify data inaccessible
- Test dual orientation: Face ID in portrait vs landscape
- Verify biometric caches correctly cleared on logout
- Ensure biometric toggle in Settings respected on app relaunch

### CI/CD Checklist

- Build includes correct Info.plist entries (iOS)
- AndroidManifest includes `USE_BIOMETRIC` permission
- ProGuard/R8 rules keep biometric SDK classes
- Lint against `LAContext` calls without `canEvaluatePolicy` guard
- Automated test: mock biometric success, failure, and lockout paths
- Accessibility test: biometric with VoiceOver/TalkBack enabled

## Biometric Opt-In UX Patterns

Best practice: never force biometrics on users. Implement a progressive disclosure flow: (a) on first launch, skip biometrics, (b) when user accesses protected feature, show a one-time nudge suggesting biometric setup, (c) if declined, respect the decision for 30 days before another nudge, (d) provide a permanent toggle in Settings to enable/disable, (e) if user disables biometrics, fall back to device credential permanently. The Settings screen should show: enrolled biometric type (Face ID, Fingerprint), enrollment status (X fingerprints, Face enrolled), toggle for each protected feature, and a "Change biometric" button that triggers `showBiometric()` to re-enroll the key in Keystore. Never show biometric as the only auth option — always have a device credential path.

## Code Examples

### Android BiometricPrompt with CryptoObject
```kotlin
class SecureStorage(private val context: Context) {
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    private val keyGenerator = KeyGenerator.getInstance(
        KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore"
    )

    fun createBiometricKey(keyName: String) {
        val spec = KeyGenParameterSpec.Builder(keyName, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationValidityDurationSeconds(10) // cache 10 seconds
            .setInvalidatedByBiometricEnrollment(true)
            .build()
        keyGenerator.init(spec)
        keyGenerator.generateKey()
    }

    fun encryptWithBiometric(keyName: String, data: String, onSuccess: (ByteArray) -> Unit, onError: (String) -> Unit) {
        val secretKey = keyStore.getKey(keyName, null) as SecretKey
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)

        val biometricPrompt = BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(context),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    val encrypted = cipher.doFinal(data.toByteArray())
                    onSuccess(encrypted)
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onError(errString.toString())
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authenticate to access secure data")
            .setSubtitle("Biometric required for decryption")
            .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
            .build()

        biometricPrompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
    }
}
```

### iOS Keychain with Biometric Protection
```swift
import LocalAuthentication
import Security

class BiometricKeychain {
    enum KeychainError: Error {
        case itemNotFound, duplicateItem, unexpectedStatus(OSStatus)
    }

    func storeWithBiometric(service: String, account: String, data: Data) throws {
        let accessControl = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            [.biometryCurrentSet],
            nil
        )!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessControl as String: accessControl,
            kSecUseAuthenticationContext as String: LAContext()
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    func readWithBiometric(service: String, account: String) throws -> Data {
        let context = LAContext()
        context.localizedReason = "Authenticate to access your stored credentials"

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecUseAuthenticationContext as String: context,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
        return result as! Data
    }

    func delete(service: String, account: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

### Cross-Platform (React Native)
```typescript
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export async function checkBiometricAvailability() {
  const { available, biometryType } = await rnBiometrics.isSensorAvailable();
  return { available, type: biometryType };
  // biometryType: Biometrics.FaceID | Biometrics.TouchID | Biometrics.Biometrics
}

export async function authenticateWithBiometric(reason: string) {
  const { success } = await rnBiometrics.simplePrompt({ promptMessage: reason });
  return success;
}

export async function createBiometricKey() {
  const { publicKey } = await rnBiometrics.createKeys();
  return publicKey;  // send to server for challenge-response auth
}

export async function signWithBiometric(payload: string) {
  const { success, signature } = await rnBiometrics.createSignature({
    promptMessage: 'Sign in with biometrics',
    payload,
  });
  return { success, signature };
}
```

## References
  - references/auth-flow.md — Biometric Authentication Flow
  - references/biometric-apis.md — Biometric APIs
  - references/biometric-auth.md — Mobile Biometric Authentication
  - references/biometric-security.md — Biometric Security — Liveness, Spoofing, and Template Protection
  - references/biometric-types.md — Biometric Types
  - references/multi-factor.md — Mobile Multi-Factor Authentication
  - references/secure-storage.md — Secure Storage with Biometrics
  - references/biometrics-fundamentals.md — Biometrics Fundamentals
  - references/biometrics-advanced.md — Advanced Biometric Patterns
  - references/biometrics-testing.md — Biometrics Testing Guide

## Handoff
Hand off to mobile-security skill for threat modeling and penetration testing of biometric auth paths.
