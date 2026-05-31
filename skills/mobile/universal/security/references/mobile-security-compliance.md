# Mobile Security Compliance

## Overview

Mobile app security compliance ensures applications meet regulatory, industry, and platform requirements for data protection, privacy, and security controls. This reference covers major compliance frameworks (GDPR, HIPAA, PCI DSS, SOC 2, ISO 27001), platform requirements (App Store, Google Play), and implementation guidance for each.

## Compliance Framework Overview

### Major Frameworks

```yaml
gdpr:
  full_name: "General Data Protection Regulation"
  jurisdiction: "European Union (applies to any app processing EU resident data)"
  focus: "Personal data protection, privacy, consent, data subject rights"
  penalties: "Up to 4% of global annual revenue or 20M EUR, whichever is higher"
  applies_to: "Any organization processing personal data of EU residents"
  key_requirements:
    - "Lawful basis for all data processing"
    - "Consent management with granular controls"
    - "Data subject rights (access, deletion, portability, rectification)"
    - "Data breach notification within 72 hours"
    - "Data Protection Impact Assessment (DPIA) for high-risk processing"
    - "Data Processing Agreement (DPA) with all processors"
    - "Privacy by design and default"

hipaa:
  full_name: "Health Insurance Portability and Accountability Act"
  jurisdiction: "United States (healthcare data)"
  focus: "Protected Health Information (PHI) confidentiality, integrity, availability"
  penalties: "$100-$50,000 per violation, up to $1.5M per year per violation category"
  applies_to: "Covered entities and business associates handling PHI"
  key_requirements:
    - "Encryption of PHI at rest and in transit"
    - "Access controls (unique user IDs, automatic logoff)"
    - "Audit controls (logging all PHI access)"
    - "Integrity controls (no improper alteration of PHI)"
    - "Business Associate Agreements (BAA) with all PHI processors"
    - "Contingency plan (backup, disaster recovery)"
    - "Security awareness training for workforce"

pci_dss:
  full_name: "Payment Card Industry Data Security Standard"
  jurisdiction: "Global (any organization handling cardholder data)"
  focus: "Credit card data protection"
  penalties: "$5,000-$100,000 per month by card brands, potential loss of processing ability"
  applies_to: "Merchants, processors, acquirers, and service providers handling card data"
  key_requirements:
    - "Do not store full PAN, CVV, or track data after authorization"
    - "Encrypt cardholder data at rest and in transit"
    - "Tokenization for recurring payments"
    - "Access control (need-to-know basis)"
    - "Regular network security testing (quarterly scans, annual penetration tests)"
    - "Security policy and incident response plan"
    - "Restrict physical access to cardholder data"

soc_2:
  full_name: "Service Organization Control 2 (by AICPA)"
  jurisdiction: "Global (service organizations)"
  focus: "Security, availability, processing integrity, confidentiality, privacy"
  penalties: "Audit failure affects customer trust, not regulatory fines"
  applies_to: "Service organizations handling customer data (SaaS, cloud providers)"
  key_requirements:
    - "Security controls (firewall, intrusion detection, access control)"
    - "Availability commitments (uptime SLAs, redundancy)"
    - "Processing integrity (accurate and timely processing)"
    - "Confidentiality (data classification, encryption, access controls)"
    - "Privacy (PII collection, use, retention, disposal)"

iso_27001:
  full_name: "ISO/IEC 27001 Information Security Management"
  jurisdiction: "Global (certification)"
  focus: "Information security management system (ISMS)"
  penalties: "Certification loss, not regulatory fines"
  applies_to: "Any organization seeking security management certification"
  key_requirements:
    - "Information security policy and objectives"
    - "Risk assessment and treatment plan"
    - "Asset management (inventory, classification)"
    - "Access control policy and implementation"
    - "Cryptography policy"
    - "Physical and environmental security"
    - "Operations security (change management, capacity management)"
    - "Business continuity management"
```

## Mobile-Specific Compliance Requirements

### Data at Rest Encryption

```yaml
gdpr:
  requirement: "Appropriate technical measures to protect personal data"
  implementation:
    - "iOS: Data Protection API (NSFileProtectionComplete)"
    - "Android: EncryptedSharedPreferences, File-based encryption"
    - "Database: SQLCipher for SQLite, Core Data with encryption"
    - "Keychain/Keystore for secrets"
  backup_exclusion:
    - "iOS: NSURLIsExcludedFromBackupKey on sensitive files"
    - "Android: android:allowBackup=\"false\" in manifest"

hipaa:
  requirement: "Encryption of PHI at rest (addressable implementation specification)"
  implementation:
    - "Same as GDPR, plus:"
    - "Full disk encryption (FileVault, BitLocker) on development machines"
    - "Mobile device management (MDM) with remote wipe capability"
    - "Database encryption at row level for PHI fields"
  additional:
    - "Audit logging for all PHI access in mobile app"

pci_dss:
  requirement: "Encrypt stored cardholder data (Requirement 3.4)"
  implementation:
    - "Never store full PAN, CVV, or track data after authorization"
    - "Use tokenization services (Stripe, Braintree) — never handle raw PAN"
    - "If PAN storage is necessary: one-way hash, truncation, or strong encryption"
    - "Encryption keys stored separately from cardholder data"
```

### Data in Transit Encryption

```yaml
all_frameworks:
  requirement: "Encrypt all sensitive data during transmission"
  implementation:
    - "TLS 1.2 minimum, TLS 1.3 preferred"
    - "Certificate pinning for all first-party API endpoints"
    - "Disable cleartext HTTP (iOS ATS, Android network_security_config.xml)"
    - "HSTS headers on API responses"
    - "Valid TLS certificates from trusted CA (no self-signed in production)"

  cipher_suite_requirements:
    pci_dss: "Strong cryptography (TLS 1.2+, AES-256, ECDHE key exchange)"
    hipaa: "Validated cryptography per FIPS 140-2"
    gdpr: "Appropriate level of encryption (not prescribed, risk-based)"
```

### Authentication Requirements

```yaml
pci_dss:
  requirement: "Strong authentication for cardholder data access"
  specifics:
    - "Multi-factor authentication for remote access to CDE"
    - "Unique user IDs (no shared accounts)"
    - "Lockout after 6 failed attempts"
    - "Session timeout after 15 minutes of inactivity"
    - "Re-authentication for sensitive actions (password changes, payment)"

hipaa:
  requirement: "Unique user identification and automatic logoff"
  specifics:
    - "Unique user IDs for all users"
    - "Emergency access procedure"
    - "Automatic logoff after inactivity"
    - "Biometric authentication optional (not sufficient by itself for PHI access)"

gdpr:
  requirement: "Appropriate authentication based on risk"
  specifics:
    - "Risk-based authentication strength"
    - "For high-risk processing: MFA recommended"
    - "Password hashing with strong algorithm (bcrypt, Argon2)"
```

### Consent and Privacy

```yaml
gdpr:
  requirements:
    - "Granular consent for each processing purpose"
    - "Consent must be freely given, specific, informed, unambiguous"
    - "No pre-checked boxes"
    - "Easy to withdraw consent as it is to give"
    - "Record of consent maintained"
    - "Privacy policy accessible in app"
    - "Data Protection Impact Assessment for high-risk processing"
  mobile_implementation:
    - "Consent dialog on first launch"
    - "Category-level toggles (essential, functional, analytics, personalization)"
    - "Privacy settings screen accessible from app settings"
    - "Consent preference persistence and sync across devices"

ccpa:
  requirements:
    - "Right to know what data is collected and shared"
    - "Right to delete personal information"
    - "Right to opt-out of sale of personal information"
    - "Non-discrimination for exercising rights"
  mobile_implementation:
    - "\"Do Not Sell My Personal Information\" link in app"
    - "Data deletion request flow in app settings"
    - "Data inventory and mapping documentation"

hipaa:
  requirements:
    - "Notice of Privacy Practices (NPP)"
    - "Authorization for PHI use beyond treatment, payment, operations"
    - "Minimum necessary standard (limit PHI access to what is needed)"
  mobile_implementation:
    - "NPP accessible within the app"
    - "Granular PHI access controls by role"
    - "Audit logging of all PHI access"
```

## Compliance Automation

### Automated Compliance Checks

```yaml
ci_compliance_checks:
  static_analysis:
    - "MobSF: mobile security static analysis in CI pipeline"
    - "Checkmarx/SonarQube: SAST for code vulnerabilities"
    - "Snyk/Dependabot: SCA for dependency vulnerabilities"
    - "ProGuard/R8 configuration validation"

  configuration_checks:
    - "Verify Info.plist does not contain NSAllowsArbitraryLoads set to true"
    - "Verify AndroidManifest does not contain android:debuggable=\"true\""
    - "Verify allowBackup is set to false or properly configured"
    - "Verify network_security_config.xml has proper pinning configuration"
    - "Verify ProGuard rules are applied to release builds"

  secret_detection:
    - "truffleHog: detect hardcoded secrets in git history"
    - "GitLeaks: pre-commit hook for secret detection"
    - "Validate no AWS keys, API tokens, or passwords in source code"

  dependency_scanning:
    - "Snyk: continuous dependency vulnerability monitoring"
    - "OWASP Dependency-Check: identify known vulnerable components"
    - "Renovate/Dependabot: automated dependency updates"

  license_compliance:
    - "FOSSA: dependency license compliance"
    - "Verify all third-party libraries have compatible licenses"
    - "Generate open-source attribution documentation"
```

### Compliance Documentation Templates

```yaml
dpia_template:
  sections:
    - "System description and purpose of processing"
    - "Data classification and categories of data subjects"
    - "Data flow diagram (collection, processing, storage, transfer, deletion)"
    - "Legal basis for processing (GDPR Article 6)"
    - "Risk assessment (likelihood and severity of harm)"
    - "Risk mitigation measures"
    - "Data Protection Officer (DPO) review and sign-off"
    - "Review schedule (annual or on significant change)"

data_mapping_template:
  sections:
    - "Data element name"
    - "Data category (PII, PHI, cardholder, anonymous)"
    - "Source of data (user input, SDK, device sensor)"
    - "Purpose of processing"
    - "Legal basis"
    - "Storage location and duration"
    - "Third-party processors (name, location, DPA status)"
    - "Data subject rights applicable"
    - "Deletion procedure and timeline"

baa_template:
  sections:
    - "Permitted PHI uses and disclosures"
    - "Obligations of business associate"
    - "Security safeguards (administrative, physical, technical)"
    - "Breach notification procedures"
    - "Data return or destruction upon termination"
    - "Subcontractor restrictions"
    - "Audit rights for covered entity"
    - "Indemnification and liability"
```

## Platform-Specific Compliance

### Apple App Store Requirements

```yaml
privacy_labels:
  requirement: "Self-reported data collection and usage categories"
  categories:
    - "Contact Info (name, email, phone, address)"
    - "Health and Fitness"
    - "Financial Info"
    - "Location"
    - "Sensitive Info"
    - "Contacts"
    - "User Content"
    - "Search History"
    - "Browsing History"
    - "Usage Data"
    - "Diagnostics"
    - "Device ID"
    - "Purchases"

  linked_to_identity:
    - "Data linked to user identity across sessions"
    - "Examples: user ID, email, device ID"

  used_for_tracking:
    - "Data used for targeted advertising or analytics sharing"
    - "Triggers ATT prompt requirement"

  update_frequency:
    - "Required with every app submission"
    - "Inaccurate or incomplete labels cause rejection"

account_deletion:
  requirement: "Apps that support account creation must offer account deletion (iOS 15+)"
  implementation:
    - "Provide in-app account deletion option"
    - "Deletion must remove all user data within a reasonable timeframe"
    - "Alternative: account deactivation + deletion option"
    - "Support URL for account deletion if not in-app"

international_law_compliance:
  requirement: "Apps must comply with all applicable laws where distributed"
  verification:
    - "GDPR compliance for EU distribution"
    - "CCPA compliance for California users"
    - "China ICP license for mainland China distribution"
    - "Japan Act on Protection of Personal Information compliance"
```

### Google Play Requirements

```yaml
data_safety_section:
  requirement: "Declare data collection and security practices"
  categories:
    - "Location (approximate, precise)"
    - "Personal info (name, email, user IDs, address, phone)"
    - "Financial info (payment info, credit score)"
    - "Health and fitness"
    - "Messages (email, SMS, MMS)"
    - "Photos and videos"
    - "Audio (voice recordings, music)"
    - "Files and docs"
    - "Calendar"
    - "Contacts"
    - "App activity (page views, searches, installed apps)"
    - "App performance (crash logs, diagnostics)"
    - "Device IDs"

  security_practices:
    - "Data encryption in transit"
    - "Data encryption at rest"
    - "Data deletion mechanisms"
    - "Independent security testing (ISO 27001, SOC 2, etc.)"

play_integrity_api:
  requirement: "Strong-recommended for secure apps (Play Integrity API)"
  purpose:
    - "Verify app integrity (not tampered with)"
    - "Verify device integrity (not rooted)"
    - "Verify license validity (genuine install)"
  implementation:
    - "Integrate Play Integrity API into app startup"
    - "Send integrity verdict to backend for verification"
    - "Degrade gracefully on integrity failure (limited functionality, not crash)"

api_target_level:
  requirement: "New apps must target Android 14+ (API 34)"
  implications:
    - "Runtime permission model required"
    - "Foreground service types required"
    - "Photo picker instead of READ_MEDIA_IMAGES"
    - "Notification permission runtime prompt"
```

## Compliance Verification

### Automated Compliance Scanner

```python
# Simple compliance scanner for mobile app configuration
import os
import plistlib
import zipfile
from pathlib import Path

class ComplianceScanner:
    def __init__(self, app_path: str):
        self.app_path = Path(app_path)
        self.findings = []

    def scan_ios_info_plist(self):
        """Check Info.plist for security configuration."""
        info_path = self.app_path / "Info.plist"
        if not info_path.exists():
            self.findings.append({"severity": "critical", "finding": "Info.plist not found"})
            return

        with open(info_path, "rb") as f:
            plist = plistlib.load(f)

        # Check ATS
        if plist.get("NSAppTransportSecurity", {}).get("NSAllowsArbitraryLoads"):
            self.findings.append({
                "severity": "high",
                "finding": "NSAllowsArbitraryLoads set to true — cleartext HTTP allowed",
            })

        # Check for tracking description
        if "NSUserTrackingUsageDescription" not in plist:
            self.findings.append({
                "severity": "medium",
                "finding": "Missing NSUserTrackingUsageDescription for ATT compliance",
            })

        # Check for encryption export compliance
        if "ITSAppUsesNonExemptEncryption" not in plist:
            self.findings.append({
                "severity": "low",
                "finding": "Missing ITSAppUsesNonExemptEncryption — App Store submission requirement",
            })

    def scan_android_manifest(self):
        """Check AndroidManifest.xml for security configuration."""
        # Extract from APK
        manifest_path = self.app_path / "AndroidManifest.xml"
        if not manifest_path.exists():
            self.findings.append({"severity": "critical", "finding": "AndroidManifest.xml not found"})
            return

        content = manifest_path.read_text()

        # Check debuggable
        if 'android:debuggable="true"' in content:
            self.findings.append({
                "severity": "critical",
                "finding": "App is debuggable in release build",
            })

        # Check backup
        if 'android:allowBackup="true"' in content:
            self.findings.append({
                "severity": "medium",
                "finding": "android:allowBackup enabled — app data included in backups",
            })

        # Check for cleartext traffic
        if "usesCleartextTraffic" in content and "true" in content.split("usesCleartextTraffic")[1][:10]:
            self.findings.append({
                "severity": "medium",
                "finding": "Cleartext traffic allowed — HTTP requests permitted",
            })

    def generate_report(self) -> dict:
        """Generate compliance report."""
        return {
            "scanned_path": str(self.app_path),
            "total_findings": len(self.findings),
            "critical": len([f for f in self.findings if f["severity"] == "critical"]),
            "high": len([f for f in self.findings if f["severity"] == "high"]),
            "medium": len([f for f in self.findings if f["severity"] == "medium"]),
            "low": len([f for f in self.findings if f["severity"] == "low"]),
            "findings": self.findings,
        }
```

### Compliance Checklist Generation

```yaml
pre_release_compliance_checklist:
  data_protection:
    - "All sensitive data stored in platform secure storage"
    - "Backup exclusion configured for sensitive files"
    - "Data at rest encryption verified on device"
    - "Data in transit encryption verified via proxy"
    - "Certificate pinning implemented and tested"
    - "No hardcoded secrets in source code"
    - "Clean text logs (no PII, no tokens)"

  authentication:
    - "Biometric authentication for sensitive operations"
    - "Token storage in secure storage (not UserDefaults/SharedPreferences)"
    - "Token refresh mechanism implemented"
    - "Account lockout after failed attempts"
    - "Session timeout after inactivity"

  consent_and_privacy:
    - "Consent dialog on first launch (GDPR)"
    - "Granular consent categories"
    - "Privacy settings accessible from app settings"
    - "\"Do Not Sell My Info\" link (CCPA)"
    - "Data deletion API implemented and tested"
    - "Data export API implemented and tested"
    - "ATT prompt on iOS 14.5+"

  configuration:
    - "ProGuard/R8 enabled and configured"
    - "Debug mode disabled in release build"
    - "Crash reporting does not include PII"
    - "Analytics data minimized (no PII in events)"
    - "App store privacy labels accurately completed"
    - "Data safety section accurately completed"

  third_party:
    - "All SDKs in inventory doc"
    - "Data Processing Agreements for all data processors"
    - "SDK data practices reviewed for compliance alignment"
    - "Vulnerability-free dependency versions verified"

  testing:
    - "Penetration test completed for this release"
    - "Critical and high findings remediated"
    - "Medium findings scheduled with timeline"
    - "Automated compliance checks in CI"
```

## Compliance Audit Preparation

### Audit Evidence Collection

```yaml
required_evidence:
  policies:
    - "Information security policy (signed by leadership)"
    - "Data classification policy"
    - "Access control policy"
    - "Incident response plan"
    - "Business continuity plan"
    - "Privacy policy (app-specific)"

  technical:
    - "Network architecture diagram"
    - "Data flow diagram (app -> API -> database -> third-party)"
    - "Threat model for the application"
    - "Penetration test report (within 12 months)"
    - "Vulnerability scan results (within 3 months)"
    - "Static analysis results"
    - "CI/CD pipeline configuration"

  procedural:
    - "Security awareness training records"
    - "Change management process documentation"
    - "Access review records (quarterly)"
    - "Incident response exercise records"
    - "Risk assessment records"
    - "DPIA for high-risk processing"

  third_party:
    - "Data Processing Agreements for all processors"
    - "Business Associate Agreements (HIPAA)"
    - "Subprocessor list and due diligence"
    - "Third-party security assessment reports"
```

### Common Compliance Gaps

```yaml
gap_1_missing_baas:
  framework: "HIPAA, GDPR"
  issue: "Data Processing Agreements not in place with analytics providers, cloud hosts, or SDK vendors"
  fix: "Execute BAAs or DPAs with all third parties that process protected data"

gap_2_incomplete_data_mapping:
  framework: "GDPR, CCPA"
  issue: "No comprehensive data inventory — teams don't know what data is collected or where it flows"
  fix: "Create and maintain a data flow map covering all data elements, purposes, and processors"

gap_3_insecure_defaults:
  framework: "All"
  issue: "Development defaults (debug mode, weak encryption, verbose logging) deployed to production"
  fix: "Enforce release configuration validation in CI pipeline"

gap_4_backup_exposure:
  framework: "HIPAA, GDPR"
  issue: "Sensitive data in app local storage is included in device backups"
  fix: "Exclude app data directories from backup, use secure storage for secrets"

gap_5_no_pentest_schedule:
  framework: "PCI DSS, SOC 2, ISO 27001"
  issue: "Penetration testing is ad-hoc, not scheduled before every major release"
  fix: "Schedule pentests quarterly or before every major release"

gap_6_inconsistent_consent:
  framework: "GDPR"
  issue: "Consent obtained but not consistently enforced across all data collection points"
  fix: "Centralize consent checking in the AnalyticsService facade"

gap_7_outdated_dependencies:
  framework: "PCI DSS, ISO 27001"
  issue: "Known vulnerable library versions in production build"
  fix: "Automated dependency scanning in CI, Renovate/Dependabot for updates"
```

## References

- Mobile Security — Core security implementation guide
- Mobile Security Penetration Testing — Pentest methodology and tooling
- Authentication — Mobile authentication implementation
- Data Protection — Data at rest encryption
- Network Security — Certificate pinning and TLS configuration
- Security Hardening — Code protection and obfuscation
