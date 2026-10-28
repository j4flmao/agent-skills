# Security Features and Their Performance Cost on Mobile

Security controls are mandatory, but each has a cost in latency, CPU, battery or startup time. This reference shows how to implement common mobile security measures without hurting performance, and which performance shortcuts are unsafe.

## Cost Overview

| Control | Cost | Where it hurts | Mitigation |
|---|---|---|---|
| TLS on every request | Handshake round trips, CPU | First request latency | Connection reuse, TLS 1.3, HTTP/2 or HTTP/3 |
| Certificate pinning | Negligible per request | Outages if pins rotate unexpectedly | Pin SPKI hashes with backup pins; platform config |
| Keystore / Keychain operations | Milliseconds per op, IPC to secure hardware | Startup if done eagerly | Read once, cache in memory, do it off main |
| Encrypted storage (database/files) | CPU per page/read | Large queries, scrolling lists | Encrypt only sensitive stores; page-level encryption (SQLCipher) tuned |
| Biometric prompts | User interaction latency | Frequent re-auth | Auth-bound key validity windows where policy allows |
| Root/jailbreak/integrity checks | Disk and API calls | Startup | Run async after first frame; server-side Play Integrity / App Attest verdicts |
| Obfuscation (R8) | None at runtime (often faster) | Stack trace readability | Upload mapping files |
| Request signing / HMAC | Small CPU | High-frequency calls | Hardware-backed keys, batch requests |
| Logging redaction | Small CPU | Hot logging paths | Do not log sensitive data at all in release |

## Network Security Without Latency Penalties

### Android Network Security Configuration
```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config>
    <domain includeSubdomains="true">api.example.com</domain>
    <pin-set expiration="2027-06-01">
      <pin digest="SHA-256">base64PrimarySpkiHash=</pin>
      <pin digest="SHA-256">base64BackupSpkiHash=</pin>
    </pin-set>
  </domain-config>
  <debug-overrides>
    <trust-anchors><certificates src="user" /></trust-anchors>
  </debug-overrides>
</network-security-config>
```
The pin values shown are illustrative; generate real SPKI SHA-256 hashes from your certificates and always include a backup pin. Platform pinning is evaluated during the handshake and adds no extra round trips.

### iOS App Transport Security and pinning
- ATS enforces HTTPS with modern TLS by default; avoid `NSAllowsArbitraryLoads`.
- iOS 14+ supports declarative pinning with `NSPinnedDomains` in Info.plist (SPKI SHA-256 hashes), avoiding custom `URLSessionDelegate` code.

### Connection reuse is a security and performance win
One long-lived client or session reduces handshakes; sharing it also centralizes pinning, timeouts and interceptors.

## Secure Storage Efficiently

### Android
```kotlin
// Generate a hardware-backed AES key once
val keyGen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
keyGen.init(
  KeyGenParameterSpec.Builder("tokens", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setKeySize(256)
    .build()
)
keyGen.generateKey()
```
- Keystore operations involve IPC to the keystore daemon (and StrongBox is slower still); do them on a background dispatcher and cache the decrypted token in memory for the session.
- `androidx.security:security-crypto` (EncryptedSharedPreferences) is deprecated; use Keystore-wrapped keys with DataStore/Tink or your own AES-GCM wrapper.
- Use StrongBox (`setIsStrongBoxBacked(true)`) only for keys where the extra latency is acceptable.

### iOS
```swift
let query: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrService as String: "com.example.auth",
  kSecAttrAccount as String: "refreshToken",
  kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
  kSecValueData as String: tokenData,
]
let status = SecItemAdd(query as CFDictionary, nil)
guard status == errSecSuccess || status == errSecDuplicateItem else {
  throw KeychainError.unhandled(status)
}
```
- Keychain calls can take milliseconds; avoid calling `SecItemCopyMatching` repeatedly in loops or on every request; read once per session off the main thread.
- Choose accessibility classes deliberately; `AfterFirstUnlock` allows background refresh to read tokens, `WhenUnlocked` does not.

### Encrypted databases
- SQLCipher adds CPU per page; tune `cipher_page_size`/`kdf_iter` only per its documentation, and keep the database key in Keystore/Keychain.
- Encrypt only stores containing sensitive data; caches of public content do not need encryption.

## Integrity and Attestation
- Android Play Integrity API and iOS App Attest / DeviceCheck: request tokens asynchronously, cache verdict-bound sessions server-side, and avoid calling them on every request (both have quotas and latency).
- Local root/jailbreak heuristics are bypassable; never block startup on them. Run after first frame and report to the server for risk decisions.

## Unsafe "Performance" Shortcuts

| Shortcut | Why it is unsafe |
|---|---|
| Disabling certificate validation to speed up debugging and shipping it | Enables man-in-the-middle attacks |
| Caching auth tokens in plain `SharedPreferences`/`UserDefaults` | Readable from backups or on compromised devices |
| Logging full requests/responses in release | Leaks tokens and personal data to logcat/console and crash tools |
| Skipping TLS for "internal" or CDN endpoints | Content tampering, privacy leaks |
| Long-lived tokens to avoid refresh cost | Larger blast radius if stolen |
| Weak or fast hashing for local PINs | Brute-forceable; use platform keys with user-auth binding |

## Profiling Security Code
- Wrap security operations in trace sections (`trace("keystore.decrypt")`, `OSSignposter` intervals) to see their real cost in Perfetto/Instruments.
- Watch for main-thread Keystore/Keychain access with StrictMode and the Main Thread Checker.

## Checklist
- [ ] Cleartext disabled; pinning (if used) has backup pins and an expiry plan
- [ ] Single network client/session shared across the app
- [ ] Keystore/Keychain access off the main thread, cached per session
- [ ] Encryption limited to sensitive stores
- [ ] Integrity checks asynchronous and server-evaluated
- [ ] No sensitive data in release logs; mapping/dSYM files stored securely
