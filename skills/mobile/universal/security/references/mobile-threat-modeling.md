# Mobile Threat Modeling

## Overview

Mobile threat modeling adapts traditional threat modeling to the unique mobile attack surface: device loss, app store distribution, reverse engineering, network interception, and side-loading risks. This guide covers mobile-specific threats, attack trees, mitigation libraries, and platform-specific security controls.

## Mobile Attack Surface

```yaml
mobile_attack_surface:
  device_layer:
    threats:
      physical_access:
        description: "Attacker gains physical access to unlocked or easily compromised device"
        vectors: ["Lost/stolen device", "Shoulder surfing", "USB debugging enabled in public"]
        impact: "Direct access to local data, tokens, and credentials"
      device_compromise:
        description: "Device is rooted (Android) or jailbroken (iOS)"
        vectors: ["Malicious app achieves privilege escalation", "Device deliberately rooted by user"]
        impact: "Circumvent platform security — Keychain, sandbox, code signing bypass"
      malware:
        description: "Malicious app installed on device"
        vectors: ["Side-loaded apps", "Compromised app store (third-party)", "Phishing install"]
        impact: "Keylogging, screen capture, data exfiltration, credential theft"
      
  network_layer:
    threats:
      man_in_the_middle:
        description: "Attacker intercepts network traffic between app and server"
        vectors: ["Rogue WiFi hotspot", "Compromised router", "DNS spoofing"]
        impact: "Capture credentials, tokens, API responses — modify requests in transit"
      certificate_authority_compromise:
        description: "CA issues fraudulent certificate for your domain"
        vectors: ["State-level CA compromise", "Corporate CA misconfiguration"]
        impact: "MITM even with HTTPS — app cannot distinguish legitimate from fraudulent cert"
        
  application_layer:
    threats:
      reverse_engineering:
        description: "Attacker decompiles or disassembles the app binary"
        vectors: ["APK/IPA extraction from device", "App store download and analysis"]
        impact: "Extract API keys, algorithms, business logic, hardcoded secrets"
      runtime_manipulation:
        description: "Attacker modifies app behavior at runtime"
        vectors: ["Frida, Objection, Cycript — code injection tools"]
        impact: "Bypass authentication, modify responses, skip validation logic"
      insecure_data_storage:
        description: "Sensitive data stored without encryption"
        vectors: ["SharedPreferences", "UserDefaults", "SQLite without encryption", "Log files"]
        impact: "Data exposure on device compromise"
      insecure_authentication:
        description: "Weak or bypassable authentication"
        vectors: ["Biometric fallback to PIN", "Token stored without biometric gate"]
        impact: "Unauthorized access to app functionality and data"
        
  supply_chain_layer:
    threats:
      compromised_sdk:
        description: "Third-party SDK contains malicious code"
        vectors: ["SDK supply chain attack", "Abandoned library acquired by attacker"]
        impact: "Data exfiltration, ad fraud, surveillance"
      compromised_build:
        description: "Build pipeline or signing infrastructure compromised"
        vectors: ["CI/CD credential leak", "Signing key theft"]
        impact: "Attacker signs and distributes malicious version of app"
```

## Threat Modeling Process for Mobile

```yaml
mobile_threat_modeling:
  step_1_decompose:
    activities:
      - "Create data flow diagram specific to mobile context"
      - "Identify all entry points: app launch, URL scheme, push notification, widget"
      - "Map data stores: local DB, secure storage, cache, keychain, shared preferences"
      - "Identify trust boundaries: device ↔ server, app ↔ third-party SDK"
    artifacts: ["Mobile data flow diagram", "Component inventory", "Entry point map"]
    
  step_2_identify_threats:
    technique: "STRIDE per component adapted for mobile"
    component_threats:
      local_storage:
        spoofing: "Fake app writing data to local store"
        tampering: "Root/jailbreak bypassing storage encryption"
        repudiation: "No audit log for local data access"
        info_disclosure: "Keyboard cache, backup, clipboard exposing sensitive data"
        dos: "Fill storage to prevent app operation"
        elevation: "Root app reading protected storage"
      api_communication:
        spoofing: "Certificate pinning bypass"
        tampering: "MITM modifying API requests"
        repudiation: "Missing request signature validation"
        info_disclosure: "Data in transit not encrypted"
        dos: "Server overwhelmed by mobile requests"
        elevation: "API parameter manipulation"
        
  step_3_risk_assessment:
    factors:
      likelihood:
        - "Is data valuable enough to target?"
        - "Is the app used by high-value targets?"
        - "Does the app handle payment or PII?"
      impact:
        - "Data breach severity"
        - "Financial loss potential"
        - "Reputational damage"
        
  step_4_mitigation_prioritization:
    high_risk:
      - "Secure storage for all sensitive data"
      - "Certificate pinning with backup pins"
      - "Server-side authorization — never trust client"
    medium_risk:
      - "Biometric gate for sensitive operations"
      - "Anti-debugging and integrity checks"
      - "Minimize data collection"
    low_risk:
      - "Basic obfuscation"
      - "Debug detection"
```

## Attack Trees

### Data Extraction Attack Tree

```
Goal: Extract sensitive data from mobile app
├── 1. Physical device access
│   ├── 1.1 Device unlocked
│   │   ├── 1.1.1 Open app and use normally
│   │   └── 1.1.2 Extract data via file manager
│   │       ├── 1.1.2.1 Read SharedPreferences (FAIL if EncryptedSharedPrefs)
│   │       ├── 1.1.2.2 Read SQLite (FAIL if encrypted with SQLCipher)
│   │       └── 1.1.2.3 Copy app documents directory
│   └── 1.2 Device locked
│       ├── 1.2.1 Brute force PIN (iOS: escalating delay after attempts)
│       └── 1.2.2 Forensic tools (Cellebrite, GrayKey)
│           ├── 1.2.2.1 iOS: Limited by Secure Enclave
│           └── 1.2.2.2 Android: Limited by hardware-backed keystore
│
├── 2. Remote extraction
│   ├── 2.1 Malware on device
│   │   ├── 2.1.1 Keylogger captures input (FAIL if biometric + token storage)
│   │   ├── 2.1.2 Screen capture (FAIL if FLAG_SECURE set)
│   │   └── 2.1.3 Hook app functions via Frida
│   │       └── 2.1.3.1 Bypass root detection (FAIL if server-side integrity check)
│   ├── 2.2 Phishing
│   │   └── 2.2.1 Fake login screen captures credentials
│   │       └── Mitigation: In-app phishing warnings, biometric-only auth
│   └── 2.3 Push notification interception
│       └── 2.3.1 Read push payload (FAIL if payload contains no sensitive data)
│
└── 3. Reverse engineering binary
    ├── 3.1 Decompile APK/IPA
    │   ├── 3.1.1 Extract API keys (FAIL if keys are server-side or obfuscated)
    │   ├── 3.1.2 Extract business logic
    │   │   └── 3.1.2.1 Understand validation logic to bypass
    │   │       └── Mitigation: Server-side validation, integrity checks
    │   └── 3.1.3 Extract encryption keys (FAIL if keys in hardware-backed keystore)
    └── 3.2 Modify and repackage
        └── 3.2.1 Remove license checks, trial limitations
            └── Mitigation: Server-side entitlement verification
```

## Platform-Specific Threat Mitigations

```yaml
platform_mitigations:
  ios:
    keychain:
      threat: "Keychain data accessible on jailbroken device"
      mitigation: "Use kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly — data encrypted until device unlock"
      additional: "Consider additional encryption layer for critical data — key derived from biometric + server secret"
      
    app_sandbox:
      threat: "App data in Documents directory accessible via iTunes file sharing"
      mitigation: "Store sensitive data in Library/Application Support — not Documents"
      
    ipa_extraction:
      threat: "IPA can be extracted from device or purchased and analyzed"
      mitigation: "Encrypt resources at rest. Obfuscate Swift/ObjC symbols. Use class-dump prevention."
      
  android:
    shared_preferences:
      threat: "SharedPreferences readable via ADB backup or file explorer on rooted device"
      mitigation: "Always use EncryptedSharedPreferences for any non-trivial data"
      
    apk_extraction:
      threat: "APK easily extracted from device or downloaded from stores"
      mitigation: "ProGuard/R8 obfuscation. Don't hardcode secrets. Use Firebase App Check."
      
    backup:
      threat: "Auto-backup (Android 6+) includes app data — sensitive data stored in not-excluded directories"
      mitigation: "Set android:allowBackup=\"false\" or use android:fullBackupContent to exclude sensitive dirs"
```

## Mobile OWASP MASVS Mappings

```yaml
masvs_mappings:
  v2_1:
    storage:
      - "MASVS-STORAGE-1: Secure credential storage"
      - "MASVS-STORAGE-2: No sensitive data in logs"
      - "MASVS-STORAGE-3: No sensitive data in IPC/SDK shared storage"
      - "MASVS-STORAGE-4: Keyboard cache disabled for sensitive fields"
      - "MASVS-STORAGE-5: No sensitive data in app screenshots (FLAG_SECURE)"
      - "MASVS-STORAGE-6: No sensitive data in backups"
    crypto:
      - "MASVS-CRYPTO-1: Use platform-standard cryptography"
      - "MASVS-CRYPTO-2: Secure key generation and management"
      - "MASVS-CRYPTO-3: No hardcoded cryptographic keys"
    auth:
      - "MASVS-AUTH-1: Server-side authentication"
      - "MASVS-AUTH-2: Biometric authentication for sensitive operations"
      - "MASVS-AUTH-3: Secure session handling"
    network:
      - "MASVS-NETWORK-1: TLS 1.2+ enforced"
      - "MASVS-NETWORK-2: Certificate pinning for first-party APIs"
    platform:
      - "MASVS-PLATFORM-1: Secure WebView configuration"
      - "MASVS-PLATFORM-2: No JavaScript bridges to sensitive APIs"
      - "MASVS-PLATFORM-3: Secure intent handling"
    code:
      - "MASVS-CODE-1: Code obfuscation applied"
      - "MASVS-CODE-2: Debug detection"
      - "MASVS-CODE-3: Integrity checks"
      - "MASVS-CODE-4: No hardcoded secrets"
    resilience:
      - "MASVS-RESILIENCE-1: Device integrity checks (root/jailbreak)"
      - "MASVS-RESILIENCE-2: Runtime integrity verification"
      - "MASVS-RESILIENCE-3: Repackaging detection"
```
