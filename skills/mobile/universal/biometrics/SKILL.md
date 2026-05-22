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

1. **Biometric API choice** — Android: BiometricPrompt (strong) / androidx.biometric. iOS: LocalAuthentication framework (LAContext). Cross-platform: Expo LocalAuthentication or Capacitor biometrics plugin.

2. **Authentication flow** — Check biometric availability → check if enrolled → check device credential fallback availability → show prompt with reason → handle success → handle failure (retry or fallback). Always chain: biometric → device credential → app password.

3. **Secure storage** — Android: EncryptedSharedPreferences or Keystore for biometric-protected CryptoObject. iOS: Keychain with `kSecAccessControlBiometryCurrentSet` / `kSecAccessControlUserPresence`. Data encrypted at rest, decryption key released only after biometric verification.

4. **Biometric variants** — Strong biometric: Face ID, Touch ID, Pixel Imprint (Class 3). Weak biometric: face unlock on unsupported hardware (Class 1/2). Device credential: PIN, pattern, password. Treat all strong variants the same in UX — show icon matching device type.

5. **UX considerations** — Explicit user opt-in before enrolling. Clear description of what biometrics protect. Fallback to device credential always available. Retry on first failure, lockout after 5 consecutive failures. Time-based lockout with increasing duration.

## Rules

- Never store raw biometric data — only compare authentication result.
- Biometric data never leaves the device — no server transmission.
- Device credential is a mandatory fallback — no biometric-only gates.
- User must explicitly opt in — no silent enrollment.
- Require biometrics for sensitive operations: payments, password viewing, profile changes, security settings.
- Biometric key material automatically invalidated when new biometric is enrolled.
- 5-failure lockout with time escalation — user must use device credential after lockout.

## References

- `references/biometric-apis.md` — Android BiometricPrompt, iOS LocalAuthentication, cross-platform wrappers
- `references/secure-storage.md` — Keystore, Keychain, biometric encryption, key invalidation

## Handoff
Hand off to mobile-security skill for threat modeling and penetration testing of biometric auth paths.
