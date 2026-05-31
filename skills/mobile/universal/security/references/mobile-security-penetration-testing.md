# Mobile Security Penetration Testing

## Overview

Penetration testing is the practice of simulating real-world attacks against a mobile application to identify vulnerabilities before malicious actors exploit them. This reference covers the complete pentest lifecycle: planning, tooling, testing methodology, common vulnerability patterns, remediation guidance, and reporting standards for mobile applications.

## Testing Methodology

### Pentest Lifecycle

```yaml
phase_1_planning:
  - "Define scope: which features, endpoints, and platforms are in scope"
  - "Gather documentation: threat model, architecture diagrams, API specs"
  - "Determine testing approach: black box, grey box, or white box"
  - "Set rules of engagement: testing windows, escalation contacts, data handling"
  - "Provision test accounts: various permission levels, edge case configurations"
  - "Duration: typically 5-10 days for a moderate complexity mobile app"

phase_2_reconnaissance:
  - "Static analysis: decompile APK/IPA, examine code, resources, and configs"
  - "Dynamic analysis: run app through proxy, monitor network and file system activity"
  - "Endpoint discovery: enumerate all API endpoints the app communicates with"
  - "Third-party SDK inventory: identify all integrated libraries and their versions"
  - "Authentication flow mapping: document all auth paths (login, signup, password reset)"

phase_3_vulnerability_scanning:
  - "Automated scanning: MobSF for static analysis, Drozer for Android"
  - "Dependency scanning: Snyk/Dependabot for SDK vulnerabilities"
  - "Network scanning: Burp Suite passive scan for API vulnerabilities"
  - "Configuration review: Info.plist, AndroidManifest, ProGuard rules"

phase_4_exploitation:
  - "Manual testing of all identified attack surfaces"
  - "Attempt to bypass authentication and authorization controls"
  - "Test for data leakage through storage, logs, and network"
  - "Attempt reverse engineering and code tampering"
  - "Test for platform-specific vulnerabilities"

phase_5_reporting:
  - "Document all findings with severity classification"
  - "Provide reproduction steps for each finding"
  - "Include remediation guidance with code examples"
  - "Track remediation in issue tracker with re-test date"
  - "Deliver executive summary for non-technical stakeholders"
```

### Testing Levels

```yaml
black_box:
  description: "Tester has no prior knowledge of the application internals"
  approach: "Reverse engineer APK/IPA, analyze network traffic, probe endpoints"
  advantage: "Simulates external attacker with no inside knowledge"
  disadvantage: "May miss deep vulnerabilities requiring code understanding"
  typical_duration: "10-15 days"

grey_box:
  description: "Tester has authenticated access and some documentation"
  approach: "Test accounts, API documentation, partial source code access"
  advantage: "More efficient, can focus on logical vulnerabilities"
  disadvantage: "May not simulate real-world attacker constraints"
  typical_duration: "5-10 days"

white_box:
  description: "Full access to source code, documentation, and team"
  approach: "Code review, architecture analysis, full testing access"
  advantage: "Most thorough, catches vulnerabilities other approaches miss"
  disadvantage: "Most expensive, may miss runtime-specific issues"
  typical_duration: "5-15 days"
```

## Tooling

### Static Analysis Tools

```yaml
mobsf:
  description: "Mobile Security Framework — open-source static and dynamic analyzer"
  platforms: "Android APK, iOS IPA, Windows APPX"
  capabilities:
    - "Decompile and analyze source code"
    - "Extract hardcoded secrets"
    - "Analyze permissions and manifest configuration"
    - "Detect insecure data storage patterns"
    - "Identify known vulnerable libraries"
    - "Check for obfuscation and code protection"
    - "Export detailed PDF reports"
  installation: "docker run -p 8000:8000 opensecurity/mobile-security-framework-mobsf"

  usage:
    - "Upload APK/IPA to web interface"
    - "Review static analysis results"
    - "Check for hardcoded API keys, tokens, URLs"
    - "Review permission usage against purpose"
    - "Verify ProGuard/R8 configuration"

jadx:
  description: "Dex to Java decompiler for Android APKs"
  platforms: "Android"
  capabilities:
    - "Decompile DEX to readable Java source"
    - "Export as Gradle project for further analysis"
    - "Search for strings, classes, methods"
    - "SMALI debugging support"
  usage: "jadx-gui app.apk"

hopper_or_ghidra:
  description: "Binary disassembler and decompiler for iOS binaries"
  platforms: "iOS"
  capabilities:
    - "Disassemble Mach-O binaries"
    - "Decompile to pseudo-code"
    - "Identify vulnerable function calls"
    - "Analyze encryption and obfuscation"

snyk / dependabot:
  description: "Software Composition Analysis (SCA) tools"
  platforms: "All"
  capabilities:
    - "Identify known vulnerable dependencies"
    - "Suggest version upgrades"
    - "Integrated into CI/CD pipeline"
    - "Coverage for npm, Maven, CocoaPods, Gradle"
```

### Dynamic Analysis Tools

```yaml
burp_suite:
  description: "Web proxy for intercepting and modifying HTTP/HTTPS traffic"
  edition: "Professional (repeater, intruder, scanner, sequencer, decoder)"
  features:
    - "Intercept and modify requests/responses in transit"
    - "Replay requests with modified parameters"
    - "Automated scanning for common web vulnerabilities"
    - "Session handling and token analysis"
    - "Collaborator client for out-of-band testing"

  mobile_setup:
    android: "Install Burp CA certificate as system certificate (root required on Android 7+)"
    ios: "Install Burp CA profile via Safari, trust certificate in Settings > General > About"

  usage:
    - "Configure device proxy to Burp listener"
    - "Install Burp CA certificate on device"
    - "Intercept all app traffic"
    - "Test for API vulnerabilities (IDOR, injection, rate limiting)"
    - "Analyze authentication token handling"

frida:
  description: "Dynamic instrumentation toolkit for mobile apps"
  platforms: "iOS, Android, Windows"
  capabilities:
    - "Bypass SSL pinning at runtime"
    - "Hook and modify function behavior"
    - "Trace method calls with arguments and return values"
    - "Dump memory regions and class instances"
    - "Bypass root/jailbreak detection"
    - "Scripting with JavaScript or Python"

  scripts:
    ssl_pinning_bypass: |
      // frida-ios-hook/ssl_pinning_bypass.js
      // Bypasses most common SSL pinning implementations
      // Usage: frida -U -f com.example.app -l ssl_pinning_bypass.js

    root_detection_bypass: |
      // frida-android-hook/root_detection_bypass.js
      // Bypasses common root detection implementations
      // Usage: frida -U -f com.example.app -l root_detection_bypass.js

objection:
  description: "Runtime mobile exploration toolkit built on Frida"
  platforms: "iOS, Android"
  capabilities:
    - "Explore filesystem and keychain/keystore"
    - "Bypass SSL pinning with one command"
    - "Dump memory and screenshots"
    - "Execute shell commands in app context"
    - "Disable jailbreak/root detection"

  commands:
    - "objection patchapk -s app.apk  # Patch APK for Frida gadget injection"
    - "objection explore -g com.example.app  # Start exploration session"
    - "android keystore list  # List keystore entries"
    - "ios keychain dump  # Dump iOS keychain contents"

drozer:
  description: "Android security assessment framework"
  platforms: "Android"
  capabilities:
    - "Enumeration of attack surface (activities, services, providers, receivers)"
    - "Testing for insecure intent handling"
    - "Testing content provider injection"
    - "Testing for insecure inter-process communication (IPC)"
    - "SQL injection testing on content providers"

  commands:
    - "dz> run app.activity.info -a com.example.app  # List exported activities"
    - "dz> run app.provider.info -a com.example.app  # List content providers"
    - "dz> run scanner.provider.finduri -a com.example.app  # Find content URIs"
    - "dz> run app.provider.query content://com.example.app/users/  # Query provider"
```

## Testing Areas

### Authentication Testing

```yaml
test_cases:
  - "Test for insecure authentication token storage (UserDefaults, SharedPreferences)"
  - "Verify token expiration and refresh mechanism"
  - "Test for auto-login with stored credentials bypass"
  - "Verify OAuth2 flow uses PKCE (Proof Key for Code Exchange)"
  - "Test for session fixation — can an attacker force a known session?"
  - "Verify biometric authentication requires device unlock, not just biometric match"
  - "Test that app locks after inactivity period"
  - "Verify password complexity requirements are enforced on the server"
  - "Test for credential stuffing resistance (rate limiting, account lockout)"
  - "Verify multi-factor authentication cannot be bypassed"

  tools:
    - "Burp Suite: intercept and modify auth flows"
    - "Frida: hook token validation functions"
    - "Objection: dump keychain/keystore contents"
```

### Authorization Testing

```yaml
test_cases:
  - "Test for Insecure Direct Object References (IDOR) — modify user_id in API calls"
  - "Verify server-enforced authorization — client-side checks alone are insufficient"
  - "Test for privilege escalation — can a low-privilege user access admin endpoints?"
  - "Verify API endpoints check authorization on every request, not just at login"
  - "Test for parameter tampering — can you modify price, role, or permission parameters?"
  - "Verify that deleted/disabled users cannot access resources"
  - "Test for mass assignment vulnerabilities — extra parameters granted unauthorized access"

  example:
    idor_test:
      request: "GET /api/orders/12345"
      modification: "Change to GET /api/orders/12346"
      expected: "403 Forbidden or authorization error"
      vulnerability: "200 OK with another user's order data"

  tools:
    - "Burp Suite Repeater: modify request parameters"
    - "Burp Suite Autorize: automated authorization testing"
```

### Data Storage Testing

```yaml
test_cases:
  - "Check for sensitive data in UserDefaults (iOS) or SharedPreferences (Android)"
  - "Check for sensitive data in SQLite databases (plaintext or weak encryption)"
  - "Check for sensitive data in Core Data (iOS) without encryption"
  - "Verify app data is excluded from device backups"
  - "Check for cached screenshots in app switcher (iOS: UIApplicationDidEnterBackgroundNotification)"
  - "Check for sensitive data in keyboard autocorrect dictionary"
  - "Verify clipboard is cleared for sensitive fields"
  - "Check for sensitive data in app logs (NSLog, print, Logcat)"
  - "Verify analytics data does not include PII"
  - "Check for crash logs containing sensitive data"

  tools:
    - "Objection: explore filesystem, keychain, and NSUserDefaults"
    - "Drozer: enumerate content providers and readables"
    - "adb shell: explore app data directory"
    - "libimobiledevice: explore iOS app data"
```

### Network Security Testing

```yaml
test_cases:
  - "Verify all traffic uses HTTPS (no cleartext HTTP)"
  - "Test for proper TLS certificate validation"
  - "Test for certificate pinning bypass"
  - "Verify TLS 1.2 minimum with secure cipher suites"
  - "Check for custom URL schemes that can be hijacked"
  - "Test for hostname verification bypass"
  - "Verify WebView does not ignore SSL errors"
  - "Test for insecure WebView configurations (JavaScript enabled, file access)"
  - "Check for sensitive data in query parameters (should be in request body)"
  - "Verify API keys are not exposed in client-side code"

  tools:
    - "Burp Suite: intercept and modify HTTPS traffic"
    - "Frida: bypass SSL pinning"
    - "Nmap: scan for open ports on API servers"
    - "testssl.sh: verify TLS configuration on API endpoints"
```

### Reverse Engineering Testing

```yaml
test_cases:
  - "Verify ProGuard/R8 is enabled and properly configured"
  - "Check for hardcoded API keys, tokens, and secrets"
  - "Verify string obfuscation is applied to sensitive strings"
  - "Test if app runs in debug mode on production builds"
  - "Verify root/jailbreak detection is implemented"
  - "Test if app can be re-packaged with modified code"
  - "Check for debugging symbols in release builds"
  - "Verify code integrity checks (hash validation, signature verification)"
  - "Test for emulator detection"
  - "Verify app detects and responds to Frida injection"

  tools:
    - "JADX: decompile APK to readable Java"
    - "Hopper/Ghidra: disassemble iOS binaries"
    - "Frida: inject and modify app behavior"
    - "apktool: unpack and repackage APK"
```

## Vulnerability Classification

### Severity Rating

```yaml
critical:
  description: "Direct compromise of user data or system integrity"
  response: "Fix within 24 hours, release hotfix"
  examples:
    - "Remote code execution"
    - "Authentication bypass"
    - "Mass data exposure (all users' data accessible)"
    - "Insecure direct object reference to sensitive data"
    - "Hardcoded cloud service credentials"

high:
  description: "Significant security risk, potential data exposure"
  response: "Fix within current sprint, patch release"
  examples:
    - "Insecure data storage (passwords, tokens in plaintext)"
    - "SSL pinning not implemented or easily bypassed"
    - "Privilege escalation"
    - "Session fixation"
    - "Known vulnerable library with active exploit"

medium:
  description: "Moderate risk, limited impact"
  response: "Schedule within next sprint"
  examples:
    - "Sensitive data in logs"
    - "Weak password policy"
    - "No rate limiting on authentication"
    - "Insecure WebView configuration"
    - "Backup data not excluded"

low:
  description: "Minor security concern"
  response: "Fix opportunistically in upcoming work"
  examples:
    - "Information disclosure in error messages"
    - "Missing security headers"
    - "App can be installed on rooted/jailbroken devices"
    - "Debug endpoints accessible (no sensitive data exposed)"
```

### Common Vulnerability Patterns

```yaml
platform_agnostic:
  - "Hardcoded secrets in source code"
  - "Insecure data storage (UserDefaults, SharedPreferences without encryption)"
  - "Missing SSL pinning"
  - "Insufficient authorization checks (client-side only)"
  - "Exposed debug endpoints"
  - "Missing rate limiting on authentication"
  - "Insecure WebView configuration"
  - "Custom URL scheme hijacking"
  - "Session tokens in URL query parameters"
  - "Verbose error messages exposing internals"

android_specific:
  - "Exported activities without proper permission checks"
  - "Insecure content provider (SQL injection, directory traversal)"
  - "Broadcast receivers leaking sensitive data"
  - "Pending intent with mutable flag"
  - "WebView file access enabled"
  - "AllowBackup flag enabled"
  - "Debug build with debuggable flag"
  - "Insecure PendingIntent creation"

ios_specific:
  - "Insecure NSUserDefaults storage"
  - "Keychain accessible attribute set too permissive"
  - "UIWebView usage instead of WKWebView"
  - "Insecure data protection (NSFileProtectionNone)"
  - "App transport security exception (NSAllowsArbitraryLoads)"
  - "Screenshot caching sensitive data"
  - "Side-loading detection not implemented"
  - "Clipboard access enabled for sensitive fields"
```

## Reporting

### Finding Template

```yaml
finding_template:
  title: "Short descriptive title of the vulnerability"
  severity: "Critical | High | Medium | Low"
  cwe: "CWE-XXX (Common Weakness Enumeration ID)"
  owasp_mobile: "M1-M10 OWASP Mobile Top 10 category"

  description: |
    A detailed description of the vulnerability, what it affects,
    and the potential impact if exploited. Should be understandable
    by both technical and non-technical readers.

  reproduction:
    - "Step 1: Install the app on a device"
    - "Step 2: Configure proxy to intercept traffic"
    - "Step 3: Perform action X"
    - "Step 4: Observe that Y happens instead of Z"

  impact:
    - "An attacker can access another user's data"
    - "An attacker can perform actions without authorization"

  affected_components:
    - "File: path/to/file.swift, line 42-58"
    - "API: GET /api/users/{id}"

  remediation:
    - "Implement authorization check on the server for every API call"
    - "Do not rely on client-side parameter validation alone"

  references:
    - "OWASP Mobile Top 10: M4 (Insufficient Authorization)"
    - "CWE-285: Improper Authorization"
```

### Executive Summary Template

```yaml
executive_summary:
  app_name: "ExampleApp"
  platform: "iOS 17+, Android 14+"
  version: "2.3.1 (build 45)"
  test_type: "Grey box penetration test"
  test_dates: "2026-05-01 to 2026-05-10"
  testers: "Security Team"

  summary: |
    A security assessment of ExampleApp version 2.3.1 was conducted
    between May 1-10, 2026. The assessment covered the iOS and Android
    mobile applications and their associated backend API.

    A total of 15 findings were identified:
    - 2 Critical
    - 4 High
    - 6 Medium
    - 3 Low

    The most significant finding was an Insecure Direct Object Reference (IDOR)
    in the order details API allowing authenticated users to access any other
    user's order data by modifying the order ID parameter.

  critical_findings:
    - "IDOR in GET /api/orders/{id}: Authenticated users can access any user's order data"
    - "Hardcoded AWS credentials in Android APK allowing unauthorized S3 bucket access"

  recommendations:
    - "Implement server-side authorization checks for all data-accessing API endpoints"
    - "Remove all hardcoded credentials and implement a credential rotation system"
    - "Enable ProGuard/R8 with obfuscation in the Android release build"
    - "Implement certificate pinning on both platforms"
    - "Schedule remediation review in 30 days"

  risk_score: "8.5/10 (High)"
  retest_date: "2026-06-01"
```

## Remediation Timeline

```yaml
remediation_timeline:
  critical:
    fix_time: "24 hours"
    release: "Hotfix (same day or next)"
    validation: "Re-test within 48 hours of fix"
    example: "Remove hardcoded credentials, fix IDOR vulnerability"

  high:
    fix_time: "1 week"
    release: "Patch release (next sprint)"
    validation: "Re-test within 2 weeks of fix"
    example: "Implement SSL pinning, encrypt local storage"

  medium:
    fix_time: "2-4 weeks"
    release: "Next regular release"
    validation: "Re-test before next release"
    example: "Fix insecure WebView settings, add rate limiting"

  low:
    fix_time: "Next release cycle"
    release: "Within 2 releases"
    validation: "Re-test at next scheduled pentest"
    example: "Remove verbose error messages, update security headers"
```

## References

- Mobile Security — Core security implementation guide
- Mobile Security Compliance — Regulatory compliance for mobile apps
- Authentication — Mobile authentication implementation
- Data Protection — Data at rest encryption
- Network Security — Certificate pinning and TLS configuration
- Security Hardening — Code protection and obfuscation
