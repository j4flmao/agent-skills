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
version: "1.0.0"
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
```
<biometrics>
<availability>{check, enrollment, fallback}</availability>
<prompt>{authentication flow, cancellation, retry}</prompt>
<secure-storage>{keychain, keystore, encrypted prefs}</secure-storage>
<ux>{opt-in, description, lockout}</ux>
</biometrics>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Biometric prompt appears and resolves correctly
- Data encrypted with biometric key — inaccessible without auth
- Device credential fallback works when biometrics unavailable
- User can opt in/out of biometric auth
- 5-failure lockout enforced

### Max Response Length
6000 tokens

## Workflow

1. **Biometric type detection** — Three categories of biometric authentication with varying security levels. Class 3 (Strong): Face ID (iPhone X+), Touch ID (iPhone 5s+), Pixel Imprint, ultrasonic fingerprint. Class 2 (Weak): face unlock on budget Android devices, iris scanner. Class 1: convenience face unlock. Android: Check with `BiometricManager.canAuthenticate(BIOMETRIC_STRONG)` vs `BIOMETRIC_WEAK`. iOS: `LAContext.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` — Face ID on devices with TrueDepth camera, Touch ID on devices with Touch ID sensor. Device credential (PIN, pattern, password) is always available as fallback and is considered a biometric alternative on iOS (`deviceOwnerAuthentication`), but not equivalent to biometric on Android (`DEVICE_CREDENTIAL` flag).

2. **Biometric availability check** — Before showing a biometric prompt, check: (a) Is biometric hardware available? (hardware present). (b) Is biometric enrolled? (user has registered at least one fingerprint/face). (c) Is device credential configured? (PIN/password set — required fallback). (d) Are there any transient issues? (security update required, sensor dirty, too many attempts — lockout). Handle each failure case with a specific user-facing message. On Android, `BiometricManager` returns distinct error codes. On iOS, `LAContext.canEvaluatePolicy` returns `NSError` with `LAError` codes. Never show biometric prompt without first checking availability.

3. **Authentication prompt flow** — Flow: user triggers protected action → check availability → if biometric available → show biometric prompt with reason string → user authenticates → on success → grant access → on failure → allow retry (up to 5 attempts) → on 5th failure → lockout → force device credential. If biometric not available at start → fall through to device credential. The reason string is mandatory on both platforms and displayed prominently. On iOS, `localizedReason` is shown in the Face ID dialog. On Android, `setTitle` and `setSubtitle` are shown in the system prompt. After successful authentication, the app receives a callback with (optionally) a `CryptoObject` for decryption.

4. **Secure storage with biometric protection** — Store sensitive data (auth tokens, encryption keys, passwords) in platform secure stores with biometric access control. Android: EncryptedSharedPreferences backed by Android Keystore — set `setUserAuthenticationRequired(true)` on the master key to require biometric before reading. Or use Keystore `SecretKey` with `setUserAuthenticationRequired(true)` and encrypt/decrypt data through `CryptoObject`. `setInvalidatedByBiometricEnrollment(true)` ensures key is destroyed if new biometric is enrolled (prevents stolen biometric from accessing old data). iOS: Keychain with `SecAccessControlCreateWithFlags` using `biometryCurrentSet` — item is only accessible after biometric authentication and is invalidated on biometric enrollment change. For "cache after auth" pattern, use `setUserAuthenticationValidityDurationSeconds` (Android) or `kSecUseAuthenticationUIFallback` (iOS).

5. **Fallback and UX design** — Always provide device credential (PIN/password) as fallback — never block users out. Three-tier fallback chain: Biometric → Device Credential → App Password (optional, for users who can't use either). UX patterns: opt-in onboarding screen explaining what biometrics protect, toggle in Settings to enable/disable, clear description of protected operations, graceful degradation on devices without biometric hardware. Lockout: after 5 consecutive biometric failures, biometric is blocked (iOS indefinitely until device credential used, Android for 30 seconds escalating). After lockout, show device credential prompt automatically. Never let users get stuck — always offer the next fallback option.

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

## Common Pitfalls

- **Lockout without recovery**: If no device credential fallback, user is permanently locked out. Always provide it.
- **Camera-based face unlock fails in low light**: Advise user or fallback to device credential.
- **Biometric changed alert ignored**: Apps that don't monitor `onAuthenticationError` with `ERROR_USER_CANCELED` after biometric change leave old data accessible.
- **Key invalidation surprise**: Keys invalidated on enrollment change delete encrypted data. Migrate before invalidation.

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

## References

- `references/biometric-types.md` — Android BiometricPrompt, iOS LocalAuthentication, cross-platform wrappers
- `references/auth-flow.md` — Authentication flow, secure storage, key invalidation, migration

## Handoff
Hand off to mobile-security skill for threat modeling and penetration testing of biometric auth paths.
