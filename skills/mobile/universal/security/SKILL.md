---
name: mobile-security
description: >
  Use this skill when the user asks about mobile security, secure storage,
  certificate pinning, SSL pinning, biometric authentication, data encryption,
  ProGuard, obfuscation, or OWASP Mobile Top 10.
version: "2.0.0"
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

---

### Max Response Length
4096 tokens

## Architecture

### Security Control Layers
```
┌─────────────────────────────────────────────────┐
│             Code Protection Layer                │
│  ProGuard/R8 obfuscation, debug detection,       │
│  root/jailbreak detection, integrity checks      │
├─────────────────────────────────────────────────┤
│           Authentication Layer                    │
│  Biometric (Face ID / fingerprint), token        │
│  storage, OAuth2 PKCE, session management        │
├─────────────────────────────────────────────────┤
│            Network Security Layer                 │
│  Certificate pinning, TLS 1.2+, ATS, no          │
│  cleartext traffic, anti-phishing                │
├─────────────────────────────────────────────────┤
│            Data at Rest Layer                     │
│  Keychain (iOS), EncryptedSharedPrefs (Android), │
│  flutter_secure_storage, SQLCipher, backup       │
│  exclusion                                       │
├─────────────────────────────────────────────────┤
│        Threat Modeling & Compliance              │
│  Data classification, OWASP review, privacy      │
│  controls, penetration testing schedule          │
└─────────────────────────────────────────────────┘
```

### Decision Tree: Security Requirements
```
What data does the app handle?
├── PII (name, email, phone, address)
│   ├── Encrypted storage at rest
│   ├── Certificate pinning for all API calls
│   ├── Biometric gate for display
│   ├── Data deletion API required
│   └── Privacy policy labels required
├── Payment data (credit card, billing)
│   ├── PCI DSS scope assessment needed
│   ├── Tokenization — never store raw PAN
│   ├── Certificate pinning mandatory
│   ├── Biometric confirmation for payments
│   └── Network security config hardened
├── Health data (HIPAA)
│   ├── All of the above +
│   ├── Audit logging for all data access
│   ├── BAA agreement with cloud providers
│   ├── Encryption at rest + in transit (always)
│   └── Penetration testing required before launch
└── Non-sensitive (public data, no auth)
    ├── HTTPS only (TLS 1.2+)
    ├── Basic storage security
    └── No biometric or pinning needed
```

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

### Step 6: Configure Runtime Protection
Implement runtime application self-protection (RASP) controls: debugger detection (prevent debugging in release builds), emulator detection (block or limit functionality in emulators), integrity verification (validate code signature at runtime), and anti-tampering (verify app hash against known good value). Runtime checks should degrade gracefully — log and limit rather than crash.

### Step 7: Penetration Testing
Schedule penetration testing at each major release. Cover: network interception testing with Burp Suite/mitmproxy, static analysis with MobSF, dynamic analysis on jailbroken/rooted devices, storage inspection via Objection/Frida, and API security testing for OWASP API Top 10. Document findings, track remediation in the security backlog, and re-test after fixes.

## Mobile Threat Landscape

### OWASP Mobile Top 10 Risk Categories
```yaml
owasp_mobile_top_10:
  M1_improper_credential_usage:
    risk: "Credentials (keys, passwords, tokens) hardcoded or weakly stored"
    mitigation: "Platform secure storage (Keychain, EncryptedSharedPrefs), biometric gate"
    
  M2_inadequate_supply_chain:
    risk: "Third-party libraries with vulnerabilities, compromised SDKs"
    mitigation: "SCA scanning (Snyk, Dependabot), pin dependency versions, binary integrity checks"
    
  M3_insecure_authentication:
    risk: "Weak auth flows, no biometric, token theft through device access"
    mitigation: "OAuth2 with PKCE, biometric for sensitive operations, token binding to device"
    
  M4_insufficient_authorization:
    risk: "Client-side authorization checks that can be bypassed"
    mitigation: "Server-enforced authorization — never trust client claims alone"
    
  M5_inadequate_data_privacy:
    risk: "PII leakage through logging, analytics, or clipboard"
    mitigation: "Data minimization, opt-in analytics, disable clipboard for sensitive fields"
    
  M6_insecure_data_storage:
    risk: "Sensitive data in SharedPreferences, UserDefaults, SQLite without encryption"
    mitigation: "Encrypted storage for all sensitive data, exclude from backups"
    
  M7_insecure_communication:
    risk: "Cleartext HTTP, weak TLS, no certificate validation, no pinning"
    mitigation: "HTTPS only, TLS 1.2+, certificate pinning, ATS enforcement (iOS)"
    
  M8_inadequate_privacy_controls:
    risk: "Permissions requested but not scoped, privacy labels not accurate"
    mitigation: "Minimal permission requests, purpose strings, on-demand permission prompts"
    
  M9_insecure_data_export:
    risk: "Clipboard access, app background snapshot, file provider exposure"
    mitigation: "Disable clipboard for sensitive data, secure window flag, scoped file access"
    
  M10_misconfiguration:
    risk: "Debug mode in release, backup enabled, insecure intent filters"
    mitigation: "Build config validation, proguard rules review, intent filter hardening"
```

### Security Decision Tree
```yaml
security_decision_tree:
  question_1_data_sensitivity:
    "Does the app handle PII, payment data, or credentials?":
      yes: "Full security controls required — all layers below"
      no: "Baseline controls only — HTTPS, basic storage security"
      
  question_2_auth_method:
    "What authentication mechanism does the app use?":
      token_based: "Secure token storage + biometric gate for display"
      session_cookie: "HTTP-only cookies + CSRF protection"
      biometric_only: "Device biometric + fallback to PIN if biometric unavailable"
      
  question_3_network_security:
    "Does the app communicate with a custom API?":
      yes: "Certificate pinning required — at least 2 backup pins"
      no_first_party: "Standard TLS validation sufficient"
      third_party_only: "Validate third-party SDK security before integration"
      
  question_4_code_protection:
    "What is the risk of reverse engineering?":
      high: "ProGuard/R8 full obfuscation, root/jailbreak detection, integrity checks"
      medium: "ProGuard/R8 default configuration, basic obfuscation"
      low: "Minify only, no obfuscation needed"
```

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

## Common Pitfalls

- **Hardcoded secrets**: API keys, tokens, and passwords compiled into the binary can be extracted with string search tools. Always fetch from a secure server or use device-native storage.
- **Insufficient backup exclusion**: Sensitive data in UserDefaults or SharedPreferences is included in device backups by default. Mark sensitive data with `NSURLIsExcludedFromBackupKey` (iOS) or `android:allowBackup="false"`.
- **Pinning without backup pins**: If the primary certificate expires or is rotated without a backup pin, all API traffic fails. Always include at least 2 backup pins with staggered expiration.
- **Biometric without fallback**: If biometric authentication fails (wet fingers, Face ID mismatch), users must have a fallback (device PIN/password) or they are locked out.
- **Overlooking third-party SDKs**: Third-party analytics, crash reporting, and ad SDKs can leak data through their own network calls. Review each SDK's data practices before integration.
- **Weak key derivation**: Using user passwords directly as encryption keys without PBKDF2/scrypt key stretching makes brute-force attacks practical. Always use platform key derivation APIs.
- **Debug endpoints in release builds**: `staging`, `dev`, or `debug` API endpoints left in release builds allow attackers to access non-production environments. Strip debug configurations at build time.
- **Ignoring clipboard security**: Sensitive data copied to the clipboard persists beyond the app. Disable clipboard for password fields, payment info, and PII display.

## Compared With

| Security Approach | Effort | Protection Level | User Friction |
|-------------------|--------|-----------------|---------------|
| Platform secure storage only | Low | Medium (basic data protection) | None |
| + Certificate pinning | Medium | High (prevents MITM) | None |
| + Biometric auth | Medium | High (device-level auth) | Low |
| + ProGuard/R8 obfuscation | Low | Medium (deters static reverse engineering) | None |
| + Root/jailbreak detection | Medium | Medium-High (prevents tampered-device attacks) | None |
| + Runtime protection (RASP) | High | High (active attack prevention) | None |
| + Full encryption (SQLCipher) | High | Very High (data never in plaintext) | None |
| + Penetration testing + reward | Ongoing | Highest (validated through attack simulation) | None |

## Performance

- Platform secure storage read/write: Keychain ~5-15ms, EncryptedSharedPreferences ~10-30ms, hardware-backed keystore ~50-200ms
- Certificate pinning validation: adds ~10-50ms per HTTPS handshake depending on cert chain length
- Biometric authentication: Face ID ~1-2s, fingerprint ~200-500ms — do not call on app launch for non-sensitive screens
- ProGuard/R8 obfuscation: increases build time by 30-120s for medium-size apps, adds ~5-10% to APK size from mapping files
- Root/jailbreak detection: ~5-20ms per check — cache results for session duration, do not check on every screen
- SQLCipher: 5-15% performance overhead vs plain SQLite — most impact on large write queries
- Runtime integrity checks: ~50-100ms at app startup — run in background thread, do not block TTI

## Tooling

| Tool | Category | Platform |
|------|----------|----------|
| MobSF | Static + dynamic analysis | iOS, Android |
| Burp Suite | Network interception testing | iOS, Android |
| OWASP ZAP | Automated security scanning | iOS, Android |
| Frida | Runtime instrumentation | iOS, Android |
| Objection | Mobile exploration | iOS, Android |
| Drozer | Android security assessment | Android |
| Needle | iOS security testing | iOS |
| Snyk / Dependabot | SCA (supply chain) | Cross-platform |
| Checkmarx / SonarQube | SAST (static analysis) | Cross-platform |
| Apple Security Bounty | Bug bounty platform | iOS |
| Google Play Security Rewards | Bug bounty platform | Android |
| Selenium / Appium | Security UI automation | iOS, Android |

## Rules

- Never store secrets in plain text — use platform secure storage always
- Certificate pinning with at least two backup pins and an expiration date
- Biometric auth for sensitive operations (payments, personal data viewing)
- ProGuard/R8 must be enabled for all release builds
- Auth tokens must be stored in secure storage, never SharedPreferences or UserDefaults
- Debug builds must not expose debug endpoints or verbose logging in production
- Root/jailbreak detection should degrade gracefully, not crash the app
- All network traffic must use HTTPS with certificate validation enabled
- OWASP Mobile Top 10 must be reviewed at the start of every mobile project
- Security controls should be tested on both jailbroken/rooted and stock devices
- Every third-party SDK must be evaluated for data practices before integration
- Sensitive data must be excluded from device backups explicitly
- Key derivation must use platform APIs (PBKDF2, scrypt) — never raw user passwords as keys
- Penetration testing must be scheduled for every major release
- Security findings must be tracked with severity, remediation steps, and re-test date

## References
  - references/auth.md — Mobile Authentication
  - references/data-protection.md — Mobile Data Protection
  - references/mobile-security-best-practices.md — Mobile Security Best Practices
  - references/mobile-security.md — Mobile Security Fundamentals
  - references/network-security.md — Mobile Network Security
  - references/security-hardening.md — Mobile Security Hardening
  - references/mobile-security-penetration-testing.md — Mobile Security Penetration Testing
  - references/mobile-security-compliance.md — Mobile Security Compliance
## Handoff

Hand off to stack-specific skill for implementation.
