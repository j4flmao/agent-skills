# App Store Connect — Complete Guide

## App Submission Pipeline

### Prerequisites
```bash
# Apple Developer Program membership ($99/year)
# App Store Connect record created
# Certificates and profiles configured

# Upload via Xcode or altool
xcodebuild -workspace App.xcworkspace \
  -scheme "App" \
  -configuration Release \
  -archivePath ./build/App.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath ./build/App.xcarchive \
  -exportPath ./build/ \
  -exportOptionsPlist exportOptions.plist

# Upload to App Store Connect
xcrun altool --upload-app \
  -f ./build/App.ipa \
  -t ios \
  -u "developer@example.com" \
  -p "@keychain:AC_PASSWORD"

# Or use Transporter app
```

### exportOptions.plist
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>destination</key>
    <string>upload</string>
    <key>teamID</key>
    <string>TEAM_ID_HERE</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
</dict>
</plist>
```

## TestFlight

### Internal vs External Testing
| Feature | Internal Testing | External Testing |
|---|---|---|
| Max testers | 100 | 10,000 |
| Beta App Review | Not required | Required |
| Build retention | 90 days | 90 days |
| Invitation method | Email (auto) | Email or public link |
| Test groups | Yes | Yes |
| Feedback collection | Via TestFlight | Via TestFlight |

```bash
# Distribute via Fastlane
fastlane run upload_to_testflight \
  api_key_path:"/path/to/api_key.json" \
  app_identifier:"com.example.app" \
  skip_waiting_for_build_processing:true

# Distribute to specific group
fastlane run upload_to_testflight \
  groups:"Beta Testers" \
  notify_external_testers:true
```

### TestFlight API Key Setup
```json
{
  "key_id": "ABC123DEFG",
  "issuer_id": "12345678-90ab-cdef-1234-567890abcdef",
  "key": "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBH...",
  "duration": 1200
}
```

## App Review Guidelines

### Common Rejection Reasons
| Issue | Guideline | Mitigation |
|---|---|---|
| Incomplete information | 2.1 | Fill out all review fields |
| Broken links | 2.1 | Check all URLs in review info |
| Placeholder content | 2.3 | No dummy data or screenshots |
| Bugs/crashes | 2.1 | Test on real devices before submission |
| Inaccurate description | 2.3 | Features in app must match description |
| Login required without demo | 4.2 | Provide demo account or video |
| Permissions without explanation | 5.1.1 | Include usage description in Info.plist |
| Subscription confusion | 3.1.1 | Clear pricing and terms |
| 4+ size media | 4.5 | Respect IP rights |

### App Review Process Flow
```mermaid
Submission → Wait (1-48h) → Review → 
  ├── Approved → Release on App Store
  └── Rejected → Read reason → Fix → Appeal or Resubmit
```

**Appeal rejected binary**: Use App Store Connect Resolution Center. Attach video if issue is non-reproducible. Include steps to reproduce, device/OS info.

## Marketing Optimization

### Product Page Optimization
| Element | iOS Requirement | Best Practice |
|---|---|---|
| App name | 30 chars | Include keywords |
| Subtitle | 30 chars | Call to action |
| Description | 4000 chars | First 3 lines visible, include keywords |
| Keywords | 100 chars | Comma-separated, no duplicates |
| Screenshots | 6.5" and 5.5" | First 3 most important |
| App previews | 30s max, 3 per platform | Show key feature in action |

### A/B Testing Product Pages
```bash
# Create product page optimization via App Store Connect API
curl -X POST https://api.appstoreconnect.apple.com/v1/appStoreVersionExperiments \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": {
      "type": "appStoreVersionExperiments",
      "attributes": {
        "name": "Icon Test",
        "trafficProportion": 50
      }
    }
  }'
```

### In-App Events
| Field | Limit | Notes |
|---|---|---|
| Event name | 30 chars | Short, compelling |
| Description | 120 chars | What and when |
| Deep link | Required | Opens relevant screen |
| Start date | Required | Must be future |
| End date | Required | Max 31 days |

## App Metadata Versioning

```swift
// CFBundleVersion vs CFBundleShortVersionString
// Build number (CFBundleVersion): Internal, increments every build
// Version (CFBundleShortVersionString): User-facing, semantic versioning

// In-App Purchase version management
// Each IAP product has an associated app version
// IAPs auto-approved if no changes to binary
```

## Phased Releases

### App Store Connect Phased Release
```bash
# Enable phased release via altool
xcrun altool --upload-app \
  -f build/App.ipa \
  -t ios \
  --phased-release true

# Or set in App Store Connect UI: Pricing and Availability → Phased Release
```

**Rollout schedule (7-day):**
| Day | % of users |
|---|---|
| 1 | 1% |
| 2 | 2% |
| 3 | 5% |
| 4 | 10% |
| 5 | 20% |
| 6 | 50% |
| 7 | 100% |

**Pause or halt**: Pause in App Store Connect UI. Already-updated users keep the version. New users get previous version.

## App Availability

### Distribution Methods
```bash
# App Store (public)
# Custom apps (Volume Purchase Program)
# Unlisted apps (direct link, no search)
# Beta via TestFlight
# Ad-hoc (100 devices, development)
# Enterprise (in-house, 1000+ devices, D&B required)
```

### Geographic Availability
```json
{
  "availableInNewTerritories": true,
  "territories": [
    "USA", "GBR", "JPN", "KOR", "DEU"
  ]
}
```

## App Store Server API

```bash
# Get app store receipt
curl https://api.storekit.itunes.apple.com/inApps/v1/receipt/verify \
  -d '{"receipt-data": "<base64>", "password": "<shared_secret>"}'

# Server notifications for IAP
# Configure in App Store Connect → General → App Store Server Notifications
# V2 notifications: signed JWTs with signedPayload
```

## Subscription Management

```swift
// Grace period for subscription renewals
// App Store Server Notification: DID_RENEW, DID_FAIL_TO_RENEW
// Offer codes, promotional offers, introductory offers
let subscriptionStatus = try await product.subscription.status
// Check renewal state, grace period, billing retry
```

## Error Recovery

| Error | Cause | Resolution |
|---|---|---|
| ITMS-90062 | Duplicate bundle ID | Check bundle identifier uniqueness |
| ITMS-90442 | Missing Info.plist key | Add required privacy strings |
| ERROR ITMS-90704 | Missing UIKit framework | Ensure UIRequiredDeviceCapabilities |
| Invalid Swift Support | Swift runtime not packaged | Use Swift standard libraries |
| WatchKit app not found | Missing watchOS binary | Archive with watch target |
