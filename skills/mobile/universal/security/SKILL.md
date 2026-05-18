---
name: mobile-security
description: Cross-platform mobile security — data protection, network security, authentication, code protection, secure storage, certificate pinning, OWASP Mobile Top 10.
---

# Mobile Security

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

### Max Response Length
4096 tokens

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

### Reference Files
- `references/data-protection.md` — encryption, key management, secure storage APIs
- `references/network-security.md` — SSL pinning, certificate validation, proxy prevention
- `references/auth.md` — OAuth, JWT, biometric, session management

### Related Skills
- `mobile/universal/networking/SKILL.md` — secure networking patterns
- `management/security/SKILL.md` — security auditing, compliance

## Handoff

Hand off to stack-specific skill for implementation.
