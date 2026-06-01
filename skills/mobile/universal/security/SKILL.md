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
            <pin digest="SHA-256">base64hash3...</pin>  <!-- Backup pin -->
        </pin-set>
        <!-- Trust user CA for debugging only — remove in release -->
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </domain-config>
</network-security-config>
```

```xml
<!-- AndroidManifest.xml — reference config -->
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:allowBackup="false"
    android:fullBackupContent="false">
```

```swift
// iOS: URLSessionDelegate — certificate pinning with backup pins
class PinningDelegate: NSObject, URLSessionDelegate {
  private let pinnedHashes = [
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",  // Primary
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",  // Backup 1
    "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=",  // Backup 2
  ]

  func urlSession(_ session: URLSession,
                  didReceive challenge: URLAuthenticationChallenge,
                  completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
          let serverTrust = challenge.protectionSpace.serverTrust,
          let certificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    // Get public key hash
    let publicKey = SecCertificateCopyKey(certificate)
    let publicKeyData = SecKeyCopyExternalRepresentation(publicKey!, nil)! as Data
    let hash = sha256(data: publicKeyData)

    if pinnedHashes.contains(hash) {
      completionHandler(.useCredential, URLCredential(trust: serverTrust))
    } else {
      completionHandler(.cancelAuthenticationChallenge, nil)  // MITM detected
    }
  }

  private func sha256(data: Data) -> String {
    var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    data.withUnsafeBytes { CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash) }
    return Data(hash).base64EncodedString()
  }
}
```

### SSL Pinning — Third-Party Libraries
```kotlin
// Android: OkHttp CertificatePinner
val certificatePinner = CertificatePinner.Builder()
  .add("api.example.com", "sha256/AAAA...")
  .add("api.example.com", "sha256/BBBB...")
  .add("api.example.com", "sha256/CCCC...")  // Backup
  .build()

val client = OkHttpClient.Builder()
  .certificatePinner(certificatePinner)
  .build()
```

### ATS Configuration (iOS)
```xml
<!-- Info.plist — App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>api.example.com</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <true/>
        </dict>
    </dict>
</dict>
```

## Authentication

### Biometric Authentication
```dart
// Flutter — local_auth
import 'package:local_auth/local_auth.dart';

final auth = LocalAuthentication();
bool authenticated = false;

Future<bool> authenticateWithBiometrics() async {
  final available = await auth.canCheckBiometrics;
  if (!available) return false;  // Fall back to PIN

  try {
    authenticated = await auth.authenticate(
      localizedReason: 'Authenticate to view your orders',
      options: AuthenticationOptions(
        biometricOnly: false,   // Allow PIN/password fallback
        stickyAuth: true,       // Re-authenticate on resume
      ),
    );
  } on PlatformException catch (e) {
    if (e.code == 'LockedOut' || e.code == 'PermanentlyLockedOut') {
      // Biometric locked out — redirect to device settings
      openAppSettings();
    }
  }
  return authenticated;
}
```

```swift
// iOS — LocalAuthentication
import LocalAuthentication

class BiometricService {
  let context = LAContext()

  func authenticate(reason: String) async throws -> Bool {
    var error: NSError?
    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
      throw BiometricError.notAvailable
    }

    return try await context.evaluatePolicy(
      .deviceOwnerAuthenticationWithBiometrics,
      localizedReason: reason
    )
  }

  var biometryType: LABiometryType {
    context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
    return context.biometryType  // .faceID, .touchID, or .none
  }
}
```

```kotlin
// Android — BiometricPrompt
class BiometricHelper(private val activity: FragmentActivity) {
  private val executor = ContextCompat.getMainExecutor(activity)

  fun authenticate(onSuccess: () -> Unit, onError: (String) -> Unit) {
    val biometricManager = BiometricManager.from(activity)
    when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
      BiometricManager.BIOMETRIC_SUCCESS -> {
        val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
          override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            onSuccess()
          }
          override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            onError(errString.toString())
          }
        })
        prompt.authenticate(
          BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authenticate")
            .setSubtitle("Unlock to view orders")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or
              BiometricManager.Authenticators.DEVICE_CREDENTIAL)
            .build()
        )
      }
      BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
      BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE,
      BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
        onError("Biometric not available")
      }
    }
  }
}
```

### OAuth2 PKCE Flow
```typescript
// React Native — OAuth2 with PKCE
import { authorize } from 'react-native-app-auth';

const config = {
  issuer: 'https://accounts.example.com',
  clientId: 'mobile_client',
  redirectUrl: 'com.example.app://oauth/callback',
  scopes: ['openid', 'profile', 'orders'],
  useNonce: true,
  usePKCE: true,  // PKCE prevents auth code interception
};

async function login() {
  try {
    const result = await authorize(config);
    // Store tokens in secure storage
    await Keychain.setGenericPassword('access_token', result.accessToken);
    await Keychain.setGenericPassword('refresh_token', result.refreshToken);
    return result;
  } catch (error) {
    if ((error as AuthError).code === 'cancelled') {
      return null;  // User cancelled
    }
    throw error;
  }
}
```

### Secure Token Storage
```swift
// iOS — Keychain wrapper
class KeychainManager {
  static let shared = KeychainManager()

  func save(key: String, value: String) {
    let data = value.data(using: .utf8)!
    let query: [String: Any] = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrAccount: key,
      kSecValueData: data,
      kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    SecItemDelete(query as CFDictionary)  // Delete existing
    SecItemAdd(query as CFDictionary, nil)
  }

  func read(key: String) -> String? {
    let query: [String: Any] = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrAccount: key,
      kSecReturnData: true,
    ]
    var result: AnyObject?
    SecItemCopyMatching(query as CFDictionary, &result)
    guard let data = result as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  func delete(key: String) {
    let query: [String: Any] = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrAccount: key,
    ]
    SecItemDelete(query as CFDictionary)
  }
}
```

## Data at Rest — SQLCipher
```kotlin
// Android — Encrypted database with SQLCipher
import net.zetetic.database.sqlcipher.SQLiteDatabase
import net.zetetic.database.sqlcipher.SupportFactory

val passphrase = SQLiteDatabase.getBytes(masterKey.toCharArray())
val factory = SupportFactory(passphrase)
val db = Room.databaseBuilder(context, AppDatabase::class.java, "encrypted.db")
  .openHelperFactory(factory)
  .build()
```

```swift
// iOS — Core Data with NSFileProtection
let store = NSPersistentStoreCoordinator()
let options = [
  NSPersistentHistoryTrackingKey: true,
  NSPersistentStoreFileProtectionKey: FileProtectionType.complete,
]
try store.addPersistentStore(
  ofType: NSSQLiteStoreType,
  configurationName: nil,
  at: storeURL,
  options: options
)
```

## Code Protection

### Android ProGuard / R8
```gradle
// app/build.gradle.kts
android {
  buildTypes {
    release {
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
      )
    }
  }
}
```

```pro
# proguard-rules.pro — keep what's needed
-keep class com.example.app.model.** { *; }  # Keep data models (serialization)
-keep class com.example.app.api.** { *; }    # Keep API interfaces (Retrofit)
-keepattributes Signature, *Annotation*
-dontwarn okhttp3.**
```

```yaml
# Flutter: build.gradle android settings
--obfuscate
--split-debug-info=build/debug-info
```

### iOS Code Protection
```swift
// iOS — debugger detection
func isDebuggerAttached() -> Bool {
  var info = kinfo_proc()
  var size = MemoryLayout<kinfo_proc>.stride
  var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
  let result = sysctl(&mib, u_int(mib.count), &info, &size, nil, 0)
  return result == 0 && (info.kp_proc.p_flag & P_TRACED) != 0
}
```

### App Integrity Verification
```kotlin
// Android — Play Integrity API
class IntegrityVerifier(private val context: Context) {
  private val integrityManager = IntegrityManagerFactory.create(context)

  suspend fun verifyIntegrity(): IntegrityResult {
    val tokenResponse = integrityManager.requestIntegrityToken(
      IntegrityTokenRequest.AccessTokenRequest(
        cloudProjectNumber = CLOUD_PROJECT_NUMBER,
        nonce = generateNonce()
      )
    )

    val integrityToken = tokenResponse.token()
    // Send token to server for verification
    return api.verifyIntegrityToken(integrityToken, nonce)
  }
}
```

```swift
// iOS — DeviceCheck
import DeviceCheck

func verifyDeviceIntegrity() async -> Bool {
  let device = DCDevice.current
  guard device.isSupported else { return false }

  do {
    let token = try await device.generateToken()
    // Send token to server for verification
    return try await api.verifyDeviceToken(token)
  } catch {
    return false
  }
}
```

### Clipboard Security
```swift
// iOS — disable pasteboard for sensitive fields
// SecureField automatically disables copy/paste in iOS

// Prevent screenshots for sensitive screens
// In the view controller:
view.clipsToBounds = true
// Using SecureField for text input disables clipboard access

// UIPasteboard notification
UIPasteboard.general.changeCount  // Monitor for clipboard changes
```

```kotlin
// Android — disable clipboard for sensitive TextFields
// Disable copy/paste on EditText
editText.customSelectionActionModeCallback = object : ActionMode.Callback {
  override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean = true
  override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean = false
  override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean = false
  override fun onDestroyActionMode(mode: ActionMode) {}
}

// Prevent screenshots
window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)

// Clear clipboard after sensitive copy
val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
clipboard.clearPrimaryClip()
```

### Backup Exclusion
```xml
<!-- Android: disable backup entirely for sensitive apps -->
<application ...
    android:allowBackup="false"
    android:fullBackupContent="false"
    android:dataExtractionRules="@xml/data_extraction_rules">

<!-- Or exclude only sensitive files -->
<full-backup-content>
    <exclude domain="sharedpref" path="secure_prefs.xml"/>
    <exclude domain="database" path="encrypted.db"/>
</full-backup-content>
```

```swift
// iOS — exclude files from backup
var url = documentsURL.appendingPathComponent("database.sqlite")
var resourceValues = URLResourceValues()
resourceValues.isExcludedFromBackup = true
try url.setResourceValues(resourceValues)
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
