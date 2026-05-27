---
name: mobile-security
description: >
  Use this skill when the user asks about mobile security, secure storage,
  certificate pinning, SSL pinning, biometric authentication, data encryption,
  ProGuard, obfuscation, or OWASP Mobile Top 10.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, security, phase-4, universal]
---

# Mobile Security

## Purpose
Implement mobile security controls covering data-at-rest encryption, network security (certificate pinning), authentication, and code protection against the OWASP Mobile Top 10.

## Agent Protocol

### Trigger
User request includes: `mobile security`, `secure storage`, `certificate pinning`, `ssl pinning`, `mobile auth`, `biometric`, `encrypt mobile`, `proguard`, `obfuscate`, `root detection`, `jailbreak detection`, `owasp mobile`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Security requirements (data classification, compliance)
- Auth mechanism (JWT, OAuth, biometric)
- Storage sensitivity level

### Output Artifact
A markdown document containing:
- Threat model summary
- Security controls per layer
- Implementation snippets
- Verification steps

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

——

### Max Response Length
4096 tokens

## Workflow

### Step 1: Threat Modeling
Identify data classification levels, threat vectors (reverse engineering, network interception, device theft), and compliance requirements.

### Step 2: Secure Data at Rest
Use platform-native secure storage: iOS Keychain, Android EncryptedSharedPreferences, flutter_secure_storage, or react-native-keychain.

### Step 3: Configure Network Security
Implement certificate pinning with backup pins, disable cleartext traffic, and validate TLS connections.

### Step 4: Implement Authentication
Integrate biometric authentication (Face ID, fingerprint) for sensitive operations and secure token storage.

### Step 5: Apply Code Protection
Enable ProGuard/R8 minification, debug detection, and root/jailbreak detection for release builds.

## Rules

- Never store secrets in plain text — use platform secure storage always
- Certificate pinning with at least two backup pins and an expiration date
- Biometric auth for sensitive operations (payments, personal data viewing)
- ProGuard/R8 must be enabled for all release builds
- Auth tokens must be stored in secure storage, never SharedPreferences or UserDefaults
- Debug builds must not expose debug endpoints or verbose logging in production
- Root/jailbreak detection should degrade gracefully, not crash the app
- All network traffic must use HTTPS with certificate validation enabled

## Data at Rest

```swift
// iOS: Keychain
let query: [String: Any] = [
    kSecClass: kSecClassGenericPassword,
    kSecAttrAccount: "auth_token",
    kSecValueData: token.data(using: .utf8)!,
]
SecItemAdd(query as CFDictionary, nil)
```

```kotlin
// Android: EncryptedSharedPreferences
val prefs = EncryptedSharedPreferences.create(
    "secure_prefs",
    masterKey,
    context,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
```

```dart
// Flutter: flutter_secure_storage
final storage = FlutterSecureStorage();
await storage.write(key: 'token', value: token);
```

```typescript
// RN: react-native-keychain
await Keychain.setGenericPassword('token', token);
```

## Network Security

```xml
<!-- Android: network_security_config.xml -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2025-12-31">
            <pin digest="SHA-256">base64hash1...</pin>
            <pin digest="SHA-256">base64hash2...</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

```swift
// iOS: URLSession delegate for pinning
func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge) async -> (URLSession.AuthChallengeDisposition, URLCredential?) {
    guard let serverTrust = challenge.protectionSpace.serverTrust else { return (.cancelAuthenticationChallenge, nil) }
    // Validate certificate hash
    return (.useCredential, URLCredential(trust: serverTrust))
}
```

## Authentication

```dart
// Biometric auth
final available = await LocalAuthentication().canCheckBiometrics;
if (available) {
    final authenticated = await LocalAuthentication().authenticate(
        localizedReason: 'Unlock to view orders',
    );
}
```

## Code Protection

```gradle
// Android: ProGuard / R8
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## References
  - references/auth.md — Mobile Authentication
  - references/data-protection.md — Mobile Data Protection
  - references/mobile-security-best-practices.md — Mobile Security Best Practices
  - references/mobile-security.md — Mobile Security Fundamentals
  - references/network-security.md — Mobile Network Security
  - references/security-hardening.md — Mobile Security Hardening
## Handoff

Hand off to stack-specific skill for implementation.
