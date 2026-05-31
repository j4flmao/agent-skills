# Mobile Analytics Privacy and Compliance

## Overview

Privacy compliance is a critical requirement for mobile analytics. Regulations including GDPR (Europe), CCPA (California), LGPD (Brazil), and platform-specific requirements like Apple App Tracking Transparency (ATT) impose strict rules on how user data is collected, processed, and stored. This reference covers the complete privacy landscape for mobile analytics.

## Regulatory Landscape

### GDPR (General Data Protection Regulation)

Applies to any app that processes data of EU residents, regardless of where the company is based.

```yaml
key_requirements:
  lawful_basis:
    - "Consent for non-essential data processing"
    - "Legitimate interest for essential processing (app functionality, security)"
    - "Both must be clearly documented"

  consent_standards:
    - "Freely given: no pressure or dark patterns"
    - "Specific: separate toggles for different processing purposes"
    - "Informed: clear language, no legal jargon"
    - "Unambiguous: affirmative action required (pre-ticked boxes are illegal)"
    - "Withdrawable: as easy to withdraw as to give"

  data_subject_rights:
    - "Right to access: user can request all stored data"
    - "Right to rectification: user can correct inaccurate data"
    - "Right to erasure (right to be forgotten): user can request data deletion"
    - "Right to restrict processing: user can limit how data is used"
    - "Right to data portability: user can export data in machine-readable format"
    - "Right to object: user can object to processing for direct marketing"

  implementation_requirements:
    - "Data Protection Impact Assessment (DPIA) for high-risk processing"
    - "Data Processing Agreement (DPA) with all analytics providers"
    - "Records of processing activities"
    - "72-hour breach notification to supervisory authority"
    - "Data protection officer appointment (if processing at scale)"
```

### CCPA (California Consumer Privacy Act)

Applies to businesses collecting data of California residents meeting revenue or data volume thresholds.

```yaml
key_requirements:
  disclosure:
    - "Categories of personal information collected"
    - "Categories of sources"
    - "Business purpose for collection"
    - "Categories of third parties with whom data is shared"

  consumer_rights:
    - "Right to know: what data is collected, used, shared"
    - "Right to delete: request deletion of personal information"
    - "Right to opt-out: of sale of personal information"
    - "Right to non-discrimination: no penalty for exercising rights"

  do_not_sell:
    - "Visible 'Do Not Sell My Personal Information' link on app homepage"
    - "Applies to analytics data sharing (considered a 'sale' under CCPA)"
    - "Must honor opt-out signals (GPC browser signals)"
```

### LGPD (Brazil)

Similar to GDPR with additional requirements for data processing impact assessments and the appointment of a Data Protection Officer (DPO) for certain processing activities.

### Platform Requirements

```yaml
ios_att:
  regulation: "App Tracking Transparency (iOS 14.5+)"
  requirement: "Explicit user permission via ATT prompt before accessing IDFA"
  scope: "Cross-app tracking, ad attribution, personalized analytics"
  failure_penalty: "App rejection for accessing IDFA without ATT; 30-day compliance window"
  implementation: "Info.plist NSUserTrackingUsageDescription key + ATTrackingManager.requestTrackingAuthorization()"

android_consent:
  regulation: "Google Consent Management SDK"
  requirement: "Consent dialog for EU users under GDPR"
  scope: "Ad personalization, analytics data sharing"
  implementation: "Google's User Messaging Platform (UMP) SDK"

apple_privacy_labels:
  regulation: "App Store Privacy Labels"
  requirement: "Self-reported data collection and usage categories"
  scope: "All data collected and linked to user identity"
  update: "Required with every app submission; inaccurate labels cause rejection"

google_data_safety:
  regulation: "Google Play Data Safety Section"
  requirement: "Declare data collection, sharing, and security practices"
  scope: "All data types collected by the app and third-party SDKs"
  update: "Required for store listing; inaccurate declarations risk suspension"
```

## Consent Management Architecture

### Consent Flow

```
┌──────────────────────────────┐
│      App Launch               │
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│  Check Consent Status         │
│  (stored locally)             │
└──────┬────────────┬──────────┘
       │            │
  Not Decided    Previously
       │         Decided
┌──────▼──────┐     │
│ Show Consent │     │
│   Dialog     │     │
│              │     │
│  [Accept]    │     │
│  [Customize] │     │
│  [Reject]    │     │
└──────┬──────┘     │
       │            │
┌──────▼────────────▼──────────┐
│ Persist Consent Preferences   │
│ (UserDefaults / SharedPrefs)  │
└──────┬───────────────────────┘
       │
┌──────▼───────────────────────┐
│ Configure Analytics Providers │
│ (enable/disable per category) │
└──────────────────────────────┘
```

### Consent Categories

```typescript
interface ConsentPreferences {
    essential: boolean;       // Always true — app lifecycle, crashes
    functional: boolean;      // User-set preferences, feature usage
    analytics: boolean;       // Behavioral tracking, product metrics
    personalization: boolean; // Advertising, content recommendation
    timestamp: number;        // When consent was last updated
    version: string;          // Consent dialog version shown to user
}
```

### Consent Storage Implementation

```swift
class ConsentManager {
    private let defaults = UserDefaults.standard
    private let consentKey = "analytics_consent_preferences"
    private let consentVersionKey = "analytics_consent_version_shown"

    var currentPreferences: ConsentPreferences {
        guard let data = defaults.data(forKey: consentKey),
              let preferences = try? JSONDecoder().decode(ConsentPreferences.self, from: data) else {
            return .allDenied
        }
        return preferences
    }

    func savePreferences(_ preferences: ConsentPreferences) {
        guard let data = try? JSONEncoder().encode(preferences) else { return }
        defaults.set(data, forKey: consentKey)
        defaults.set(preferences.version, forKey: consentVersionKey)
        // Re-configure analytics providers with new preferences
        AnalyticsService.shared.updateConsent(preferences)
    }

    func isAllowed(_ category: AnalyticsCategory) -> Bool {
        switch category {
        case .essential: return true
        case .functional: return currentPreferences.functional
        case .analytics: return currentPreferences.analytics
        case .personalization: return currentPreferences.personalization
        }
    }

    var shouldShowConsentDialog: Bool {
        // Show if no consent on file, or if consent version is outdated
        guard let savedVersion = defaults.string(forKey: consentVersionKey) else { return true }
        return savedVersion != currentConsentDialogVersion
    }
}
```

### Consent Dialog UX

Key UX principles for consent dialogs:

```yaml
layout:
  - "Full-screen or prominent bottom sheet — never a tiny banner"
  - "Clear heading explaining what data is collected and why"
  - "Granular toggles for each consent category"
  - "'Accept All' and 'Reject All' buttons at the top for easy choice"
  - "'Customize' option between Accept All and Reject All"
  - "Link to full privacy policy"
  - "Language: plain, non-legal, localized to user's language"

dark_patterns_to_avoid:
  - "Pre-checked boxes for non-essential categories"
  - "'Accept' button more prominent than 'Reject'"
  - "Confusing double negatives ('Don't not sell my data')"
  - "Requiring account creation to access privacy settings"
  - "Burying the reject option behind multiple taps"
  - "Re-prompting immediately after rejection"

timing:
  - "First app launch (before any analytics data is sent)"
  - "Not during onboarding flow — let user see value first"
  - "Contextual: explain why analytics helps improve the app"
  - "After privacy policy changes that affect data processing"
```

## ATT Implementation (iOS 14.5+)

### ATT Request Flow

```swift
import AppTrackingTransparency
import AdSupport

class ATTPromptManager {
    enum ATTPromptTiming {
        case onFirstLaunch
        case contextual(before: String)  // Before specific feature
    }

    static func requestATT(timing: ATTPromptTiming = .contextual(before: "personalized recommendations")) {
        if #available(iOS 14.5, *) {
            switch ATTrackingManager.trackingAuthorizationStatus {
            case .notDetermined:
                // Show contextual prompt message first
                if case .contextual(let feature) = timing {
                    showContextualPrompt(for: feature) {
                        ATTrackingManager.requestTrackingAuthorization { status in
                            handleATTResponse(status)
                        }
                    }
                } else {
                    ATTrackingManager.requestTrackingAuthorization { status in
                        handleATTResponse(status)
                    }
                }
            case .authorized:
                // User already granted — enable personalized analytics
                AnalyticsService.shared.enablePersonalization()
            case .denied, .restricted:
                // Respect user choice — no personalized analytics
                AnalyticsService.shared.disablePersonalization()
            @unknown default:
                break
            }
        }
    }

    private static func handleATTResponse(_ status: ATTrackingManager.AuthorizationStatus) {
        switch status {
        case .authorized:
            AnalyticsService.shared.enablePersonalization()
        case .denied, .restricted, .notDetermined:
            AnalyticsService.shared.disablePersonalization()
        @unknown default:
            break
        }
    }

    private static func showContextualPrompt(for feature: String, completion: @escaping () -> Void) {
        // Show a brief explanation before the system ATT dialog
        // "To provide you with [feature], we need permission to track your activity..."
        // After user reads the explanation, trigger the system dialog
        completion()
    }
}
```

### ATT-Enabled Analytics Provider

```swift
class ATTEnabledAnalyticsProvider: AnalyticsProvider {
    private var isPersonalizationEnabled = false

    func enablePersonalization() {
        isPersonalizationEnabled = true
        // Now allowed to read IDFA and send personalized events
        let idfa = ASIdentifierManager.shared().advertisingIdentifier.uuidString
        setUserProperty(key: "idfa", value: idfa)
    }

    func disablePersonalization() {
        isPersonalizationEnabled = false
        // Send a random or null identifier instead of IDFA
        let randomId = UUID().uuidString
        setUserProperty(key: "idfa", value: randomId)
    }

    func track(event: AnalyticsEvent) {
        // Check if this event requires personalization
        if event.category == .personalization && !isPersonalizationEnabled {
            return  // Skip personalized events
        }
        // Proceed with tracking
    }
}
```

### ATT Best Practices

- Request ATT contextually, not on first launch — contextual prompts (before a personalized feature) have 2-3x higher acceptance rates
- Explain the value: "Allow tracking to get personalized recommendations" converts better than "Allow tracking"
- Respect the user's choice: do not re-prompt if denied, do not alter app functionality if denied
- Fall back to non-personalized analytics: segment-level analysis (device type, OS version, country) does not require IDFA
- Test ATT flow on a real device — simulators return `.authorized` regardless of actual device settings
- Update your privacy labels to reflect ATT usage: declare IDFA collection under "Identifiers"

## Data Retention and Deletion

### Retention Policy Configuration

```yaml
firebase_analytics:
  max_retention: "24 months (configurable in Google Analytics)"
  default: "14 months (automatic)"
  event_count_limit: "500 distinct event types"
  user_property_limit: "500 per app"

mixpanel:
  default_retention: "90 days (Growth plan)"
  extended_retention: "Unlimited (Enterprise plan)"
  data_export: "Warehouse sync to Snowflake/BigQuery/Redshift"

amplitude:
  default_retention: "12 months (default)"
  extended_retention: "Unlimited (Enterprise plan)"
  data_export: "Amazon S3 or Snowflake"

custom_server:
  retention: "Configurable per data type"
  deletion: "Full control over data lifecycle"
  export: "Direct database access"
```

### User Data Deletion Implementation

```swift
class UserDataDeletionManager {
    enum DeletionScope {
        case all
        case analyticsOnly
        case personalizationOnly
    }

    func deleteUserData(scope: DeletionScope = .all) async throws {
        // 1. Call provider deletion APIs
        for provider in AnalyticsService.shared.providers {
            switch provider {
            case let firebase as FirebaseProvider:
                Analytics.setUserID(nil)
                // Firebase: user data auto-deletes per retention policy
                // For immediate deletion: use Firebase REST API
            case let mixpanel as MixpanelProvider:
                mixpanel.reset()
                // Mixpanel: call DELETE /api/engage/profiles with distinct_id
                try await mixpanel.deleteUser()
            case let amplitude as AmplitudeProvider:
                amplitude.reset()
                // Amplitude: call DELETE /api/2/users with user_id
                try await amplitude.deleteUser()
            default:
                break
            }
        }

        // 2. Clear local analytics queue
        EventBatcher.shared.clearQueue()

        // 3. Reset analytics user ID
        IdentityManager.shared.resetIdentity()

        // 4. Clear local consent state (so prompt reappears)
        ConsentManager.shared.clearConsent()

        // 5. Send confirmation to the user
        // "Your analytics data has been deleted. This action cannot be undone."
    }

    func exportUserData() async throws -> Data {
        var allData: [String: Any] = [:]

        // Collect from each provider
        for provider in AnalyticsService.shared.providers {
            let userData = try await provider.exportUserData()
            allData[provider.name] = userData
        }

        // Format as JSON for portability
        return try JSONSerialization.data(withJSONObject: allData, options: .prettyPrinted)
    }
}
```

### Server-Side Deletion Endpoint

```python
# FastAPI endpoint for analytics data deletion
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter()

class DeletionRequest(BaseModel):
    user_id: str
    scope: str = "all"  # all, analytics_only, personalization_only
    confirmation_token: str

@router.post("/api/analytics/user/delete")
async def delete_user_analytics(request: DeletionRequest):
    """Delete all analytics data for a user across all providers."""
    # Verify the confirmation token (sent via email to prevent abuse)
    if not verify_deletion_token(request.user_id, request.confirmation_token):
        raise HTTPException(status_code=403, detail="Invalid confirmation token")

    # Delete from analytics providers
    providers = get_analytics_providers()
    for provider in providers:
        await provider.delete_user(request.user_id)

    # Delete from local event queue storage
    await clear_event_queue(request.user_id)

    # Log the deletion for audit purposes (no personal data in the log)
    log_audit_event("user_data_deleted", {"user_id_hash": hash_user_id(request.user_id)})

    return {"status": "deleted", "user_id": request.user_id}
```

### Data Deletion Compliance Checklist

```yaml
compliance_checklist:
  gdpr:
    - "User can request data deletion from app settings"
    - "Deletion API removes data from ALL providers"
    - "Local analytics cache is cleared"
    - "Identity is reset (new anonymous ID generated)"
    - "Confirmation sent to user"
    - "Deletion completed within 30 days"
    - "Third-party processors notified of deletion"

  ccpa:
    - "User can request data deletion (Right to Delete)"
    - "User can opt out of data sale (Do Not Sell)"
    - "Opt-out honored for all analytics data shared with third parties"
    - "Non-discrimination: full app functionality for opt-out users"
```

## Privacy by Design in Analytics

### Data Minimization

```yaml
principles:
  - "Only collect data you actively analyze — not everything you technically can"
  - "Stop collecting event properties that no dashboard uses (quarterly audit)"
  - "Use segment-level analysis instead of individual user tracking where possible"
  - "Aggregate data at collection time: send bins (age_range: 25-34) instead of exact values"
  - "Reduce string property cardinality: use enum values, not free text"

examples:
  bad:
    - "Collecting exact GPS coordinates when city-level is sufficient"
    - "Tracking every scroll event when only page views are analyzed"
    - "Capturing full search query text when only search category matters"
    - "Sending device serial number to analytics when device model is sufficient"
  
  good:
    - "Send truncated location: country + region only"
    - "Track page view events once, not scroll positions"
    - "Send search category (electronics/clothing) not the search query text"
    - "Send device model (iPhone 15 Pro) not the device hardware identifier"
```

### PII Detection

```typescript
class PIIDetector {
    private static readonly patterns = [
        /^[\w.+-]+@[\w-]+\.[\w.]+$/,       // Email
        /^\+?[\d\s-]{7,15}$/,                // Phone
        /^\d{3}-?\d{2}-?\d{4}$/,             // SSN
        /^(?:4[0-9]{12}(?:[0-9]{3})?)$/,     // Credit card (Visa)
        /^5[1-5][0-9]{14}$/,                  // Credit card (Mastercard)
        /^3[47][0-9]{13}$/,                   // Credit card (Amex)
        /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/,  // IBAN
    ];

    static containsPII(value: string): boolean {
        return this.patterns.some(pattern => pattern.test(value));
    }

    static sanitizeForAnalytics(value: string): string {
        if (this.containsPII(value)) {
            return '[REDACTED]';
        }
        return value;
    }
}
```

### Backup Exclusion

```swift
// iOS: Exclude analytics data from iCloud backup
func excludeFromBackup() throws {
    let analyticsDir = FileManager.default.urls(
        for: .applicationSupportDirectory,
        in: .userDomainMask
    ).first!.appendingPathComponent("analytics")

    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try analyticsDir.setResourceValues(resourceValues)
}
```

```kotlin
// Android: Exclude from Google Drive backup
// In AndroidManifest.xml
<application
    android:allowBackup="false"
    android:fullBackupContent="false">
```

## Privacy Policy Generation

Required sections for mobile app privacy policy covering analytics:

```yaml
information_we_collect:
  - "Device information: model, OS version, screen resolution"
  - "Usage data: app features used, screens viewed, session duration"
  - "Crash reports: stack traces, app state at crash"
  - "Location data: coarse (city-level) if user grants permission"
  - "Advertising identifier: IDFA (iOS) / AAID (Android) with consent"

how_we_use:
  - "Product improvement and feature development"
  - "Performance monitoring and crash analysis"
  - "User experience personalization (with consent)"
  - "Analytics and reporting"

data_sharing:
  - "Analytics providers (Firebase, Mixpanel, Amplitude — list by name)"
  - "Third-party SDKs integrated into the app"
  - "No sale of personal information (or 'We do not sell your data')"

your_rights:
  - "Access your data: settings > export my data"
  - "Delete your data: settings > delete my data"
  - "Opt out of analytics: settings > privacy > analytics"
  - "Withdraw consent: settings > privacy > consent preferences"
  - "Contact DPO: privacy@company.com"

data_retention:
  - "Analytics events retained for [X] months"
  - "Crash reports retained for [X] months"
  - "User properties retained until account deletion or 12 months of inactivity"

policy_updates:
  - "Material changes notified via in-app banner"
  - "Consent re-obtained if data processing purposes change"
  - "Last updated: [date]"
```

## Platform-Specific Privacy Configurations

### iOS Info.plist Entries

```xml
<key>NSUserTrackingUsageDescription</key>
<string>This identifier helps us provide personalized content and measure ad effectiveness.</string>

<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>

<key>NSBluetoothAlwaysUsageDescription</key>
<string>Used to detect nearby devices for proximity features.</string>
```

### Android Manifest Permissions

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="com.google.android.gms.permission.AD_ID" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS Privacy Labels Categories

```yaml
data_collected_and_linked_to_you:
  identifiers:
    - "User ID (for identity across sessions)"
    - "Device ID (for analytics segmentation)"
  usage_data:
    - "Product interaction (events, screen views)"
    - "Advertising data (if ATT authorized)"
  diagnostics:
    - "Crash data"
    - "Performance data"

data_not_collected:
  - "Health and fitness"
  - "Financial information"
  - "Contacts"
  - "Location (unless user grants permission)"
  - "Sensitive information"
```

## Privacy Auditing

### Quarterly Privacy Audit Checklist

```yaml
event_audit:
  - "List all events currently tracked in the app"
  - "Compare against the approved tracking plan"
  - "Remove any events not in the tracking plan"
  - "Verify each event's category assignment (essential/functional/etc.)"
  - "Verify no PII in event property values"

consent_audit:
  - "Verify consent dialog is displayed on first launch"
  - "Verify consent preferences are persisted and respected"
  - "Verify analytics data flow stops when consent is withdrawn"
  - "Verify essential events still fire without consent"
  - "Test consent flow on both iOS and Android"

provider_audit:
  - "Verify DPA is in place with each analytics provider"
  - "Verify data retention policies are correctly configured"
  - "Verify data deletion API works end-to-end"
  - "Review provider SDK updates for privacy changes"

code_audit:
  - "Check for hardcoded analytics keys in source code"
  - "Verify debug analytics config not used in production builds"
  - "Check that no analytics SDKs are initialized before consent"
  - "Verify privacy labels in App Store Connect are accurate"
```

## References

- analytics-privacy.md — Analytics Privacy Overview
- event-tracking.md — Event Tracking Implementation
- mobile-analytics.md — Mobile Analytics Full Guide
- analytics-reporting.md — Dashboards and Reporting
- analytics-sdks.md — Analytics SDK Reference
