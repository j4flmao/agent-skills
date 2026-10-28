# Mobile Security Best Practices

Defensive security for iOS, Android and cross-platform apps, organized around the OWASP Mobile Application Security Verification Standard (MASVS) control groups: storage, cryptography, authentication, network, platform interaction, code quality, resilience and privacy.

## Threat Model Basics

- The app binary and everything in it are available to attackers: assume reverse engineering.
- The device may be compromised (rooted/jailbroken, malware, instrumentation frameworks).
- The network is hostile (public Wi-Fi, proxies).
- The server is the trust boundary: enforce authorization and business rules there, never only in the app.

## MASVS Control Groups

| Group | Focus |
|-------|-------|
| MASVS-STORAGE | Sensitive data at rest |
| MASVS-CRYPTO | Correct cryptography and key management |
| MASVS-AUTH | Authentication and session handling |
| MASVS-NETWORK | Secure communication |
| MASVS-PLATFORM | IPC, WebViews, deep links, permissions |
| MASVS-CODE | Dependencies, input validation, updates |
| MASVS-RESILIENCE | Anti-tampering and reverse-engineering hardening |
| MASVS-PRIVACY | Data minimization and user control |

Use the OWASP MASTG (testing guide) test cases to verify each group.

## Storage

| Data | iOS | Android | Cross-platform |
|------|-----|---------|----------------|
| Tokens, secrets | Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` (or `AfterFirstUnlockThisDeviceOnly` for background use) | Encrypt with a Keystore-backed key; store ciphertext in DataStore/files | `flutter_secure_storage`, `expo-secure-store`, `react-native-keychain` |
| Sensitive files/DB | Data Protection class `complete` | Keystore-backed encryption (e.g. SQLCipher with a Keystore-wrapped key) | Platform-backed plugins |
| Non-sensitive prefs | `UserDefaults` | DataStore | shared_preferences / AsyncStorage |

Rules:
- Never store secrets in `UserDefaults`, `SharedPreferences`, AsyncStorage, logs, or the app bundle.
- Jetpack Security `EncryptedSharedPreferences`/`EncryptedFile` are deprecated; use Keystore directly or Tink with Keystore-backed keys.
- Exclude sensitive files from backups (Android `dataExtractionRules`/`fullBackupContent`; iOS `isExcludedFromBackup` for files that must not leave the device).
- Prevent sensitive screens from appearing in screenshots/app switcher (`FLAG_SECURE` on Android; blur/overlay on iOS when backgrounding).

## Cryptography

- Use platform APIs: CryptoKit (iOS), Android Keystore + `Cipher` with AES-GCM, or Tink. No custom crypto.
- Generate keys in hardware-backed storage (Secure Enclave for P-256 keys; StrongBox where available) and make them non-exportable.
- Random values from `SecRandomCopyBytes` / `SecureRandom`; never a non-cryptographic generator such as JavaScript `Math.random`.
- AES-GCM with unique nonces; no ECB, no unauthenticated CBC.

## Authentication and Sessions

- Use OAuth 2.0 / OIDC Authorization Code flow with PKCE via the system browser (`ASWebAuthenticationSession`, Custom Tabs; AppAuth libraries). Embedded WebViews for login are discouraged by RFC 8252.
- Short-lived access tokens, rotating refresh tokens, server-side revocation.
- Biometric unlock should gate a Keystore/Keychain key (`BiometricPrompt` with `CryptoObject`; Keychain `SecAccessControl` with `.biometryCurrentSet`), not a boolean flag in app code.
- Passkeys (Credential Manager on Android, AuthenticationServices on iOS) for phishing-resistant sign-in.

## Network

- TLS only. iOS App Transport Security on by default (do not add global `NSAllowsArbitraryLoads`); Android `network_security_config.xml` with `cleartextTrafficPermitted="false"` (default for targetSdk ≥ 28).
- Certificate/public-key pinning only with a rotation plan (backup pins, remote kill switch); mis-managed pins brick apps. Pin the SPKI hash, not the leaf certificate.
- Do not disable certificate validation in any build type that can ship; keep debug trust overrides in `debug-overrides`.

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config>
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2027-06-30">
            <pin digest="SHA-256">BASE64_SPKI_HASH_PRIMARY=</pin>
            <pin digest="SHA-256">BASE64_SPKI_HASH_BACKUP=</pin>
        </pin-set>
    </domain-config>
    <debug-overrides>
        <trust-anchors><certificates src="user" /></trust-anchors>
    </debug-overrides>
</network-security-config>
```

Replace the pin values with the SPKI hashes of your current and backup keys.

## Platform Interaction

- **Exported components (Android)**: set `android:exported` explicitly; protect with permissions; validate all Intent extras.
- **Deep links**: treat parameters as untrusted input; use verified App Links / Universal Links for sensitive flows; never perform state-changing actions from a link without user confirmation.
- **WebViews**: disable JavaScript unless needed; restrict `addJavascriptInterface` / message handlers to trusted origins; disallow file access (`setAllowFileAccess(false)`); load only HTTPS content you control.
- **Pasteboard**: avoid copying secrets; set expiration/local-only options on iOS when needed.
- **Permissions**: request at time of use with rationale; handle denial.

## Code and Dependencies

- Keep SDKs updated; review third-party SDK data collection (privacy manifests on iOS list required-reason APIs and tracking domains).
- Validate and encode all inputs before SQL (use parameterized queries/Room/Core Data predicates) or WebView rendering.
- Enforce minimum supported versions server-side for critical fixes (forced update flow).
- Strip logs of sensitive data in release builds.

## Resilience (Defense in Depth)

- App integrity attestation: Play Integrity API (Android; SafetyNet Attestation is discontinued) and App Attest/DeviceCheck (iOS). Verify verdicts on the server.
- Code shrinking/obfuscation (R8, Flutter `--obfuscate`) raises effort but is not a security boundary.
- Root/jailbreak detection informs risk scoring; do not rely on it alone.
- Never ship secrets expecting obfuscation to protect them: move secret-dependent calls to your backend.

## Privacy

- Collect the minimum; document data use in App Store privacy labels and Google Play Data safety form.
- iOS App Tracking Transparency prompt before cross-app tracking.
- Provide account and data deletion paths (required by both stores for apps with account creation).

## Checklist

- [ ] Secrets only in Keychain/Keystore-backed storage; excluded from backups where required
- [ ] No deprecated Jetpack Security crypto classes or SafetyNet
- [ ] OAuth + PKCE via system browser; biometrics bound to keys
- [ ] TLS enforced; pinning (if used) with backup pins and expiry
- [ ] Exported components, deep links and WebViews locked down
- [ ] Play Integrity / App Attest verified server-side
- [ ] Privacy labels, data safety form and deletion flow accurate
- [ ] MASTG test cases run before major releases
