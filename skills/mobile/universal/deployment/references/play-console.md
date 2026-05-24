# Google Play Console — Complete Guide

## App Submission Pipeline

### Android App Bundle (AAB)
```bash
# Generate signed AAB
./gradlew bundleRelease

# AAB is mandatory for new apps since August 2021
# Google Play derives APKs from AAB for each device configuration
# Dynamic delivery, on-demand modules, asset packs

# Sign AAB with apksigner
apksigner sign --ks keystore.jks \
  --ks-key-alias release \
  --out app-release.aab \
  app-release.aab

# Upload via Google Play Developer API
# Or use Fastlane
fastlane supply --aab app-release.aab --track production
```

### App Signing
```kotlin
// Two signing keys:
// 1. Upload key: used to sign AAB for upload (keep secure)
// 2. App signing key: managed by Google (or you, if opted out)

// Keystore generation
// keytool -genkey -v -keystore upload-keystore.jks \
//   -alias upload -keyalg RSA -keysize 2048 -validity 10000

// Store in CI as base64
// - powershell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks"))
```

## Testing Tracks

| Track | Testers | Access | Review | Notes |
|---|---|---|---|---|
| Internal testing | up to 100 | Email (Google Groups) | None | Fastest — 2-5 min availability |
| Closed alpha | up to 100/group | Email or invite link | None | Multiple groups, per-group targeting |
| Open beta | unlimited | Public link | None | Listed in Play Store, anyone can join |
| Production | all | Public | Google review required | Staged rollout available |

### Internal Testing Setup
```bash
# Fastlane — upload to internal track
fastlane run supply \
  aap:"app-release.aab" \
  track:"internal" \
  release_status:"draft" \
  skip_upload_metadata:true \
  skip_upload_images:true \
  skip_upload_screenshots:true

# Internal testers must opt-in via link
# Build available within minutes — no review
```

### Closed Alpha Setup
```bash
# Create testers via Google Groups
# Group types: email, Google account
# Up to 5 groups, 100 testers per group

# Upload to alpha track
fastlane run supply \
  aap:"app-release.aab" \
  track:"alpha" \
  release_status:"completed"
```

### Open Beta
```bash
# Public URL for opt-in
# https://play.google.com/apps/testing/com.example.app
# Opt-in requires Google account
# Listed in Play Store with "Early access" badge

fastlane run supply \
  aap:"app-release.aab" \
  track:"beta" \
  release_status:"completed"
```

## Staged Rollouts

### Play Console Staged Rollout
```bash
# Production track with staged rollout percentage
fastlane run supply \
  aap:"app-release.aab" \
  track:"production" \
  rollout:"0.1"  # Start at 10%

# Increase rollout percentage over time
# Phase 1: 10% (monitor 24h)
# Phase 2: 25% (monitor 24h)
# Phase 3: 50% (monitor 48h)
# Phase 4: 100%
```

| Staged Rollout Feature | Behavior |
|---|---|
| Min % | 0.1 (10% of eligible users) |
| Max % | 1.0 (100% — full rollout) |
| Pause | Immediate — users keep installed version |
| Resume | Continue from paused percentage |
| Rollback | Upload previous version with 100% rollout |
| User assignment | Random — cookie-based consistency |

## Pre-launch Reports

### Automated Testing
```bash
# Google runs automated tests on real devices
# Reports include:
# - Crash and ANR detection
# - UI rendering issues
# - Compatibility problems
# - Performance regressions
# - Accessibility issues
# - Security vulnerabilities

# Review pre-launch report before production release
# Blocking issues fail the report entirely
```

### Pre-launch Report Categories
| Category | Detection Method |
|---|---|
| Crashes | Monkey testing on real devices |
| ANRs | 5-second UI thread block detection |
| Rendering | UI jank, frozen frames |
| Compatibility | All certified device models (top 30) |
| Performance | Memory, CPU, network usage |
| Security | OWASP Mobile Top 10 scan |
| Accessibility | Content labels, touch targets |

## Android App Bundle Features

### Dynamic Delivery
```kotlin
// build.gradle.kts — on-demand module
android {
    dynamicFeatures = setOf(":camera", ":ar")
}

// Install on-demand
val splitInstallManager = SplitInstallManagerFactory.create(context)
val request = SplitInstallRequest.newBuilder()
    .addModule("camera")
    .build()

splitInstallManager.startInstall(request)
    .addOnSuccessListener { /* Module installed */ }
    .addOnFailureListener { /* Handle failure */ }
```

### Asset Packs
```gradle
// build.gradle.kts — asset pack for large resources
android {
    assetPacks = setOf("game-assets", "hd-textures")
}

// Install-time pack (included in initial install)
// Fast-follow pack (auto-downloaded after install)
// On-demand pack (download when needed)
```

## In-App Reviews API

```kotlin
// Google Play In-App Review API
class ReviewHelper(private val activity: Activity) {
    private val reviewManager = ReviewManagerFactory.create(activity)

    fun requestReview(callback: (Boolean) -> Unit) {
        val request = reviewManager.requestReviewFlow()
        request.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val reviewInfo = task.result
                val flow = reviewManager.launchReviewFlow(activity, reviewInfo)
                flow.addOnCompleteListener {
                    callback(true)
                }
            } else {
                callback(false)
            }
        }
    }
}
```

### Quota and Limitations
```kotlin
// API quota: 1 request per app per user per 7 days
// No guaranteed dialog display — Google controls UI
// Test on internal/closed tracks (same quota applies)
// Do NOT call on button tap (user must not be incentived)
```

## In-App Updates API

```kotlin
// Immediate and flexible in-app updates
class InAppUpdateHelper(private val activity: Activity) {
    private val appUpdateManager = AppUpdateManagerFactory.create(activity)

    fun checkForUpdate() {
        val appUpdateInfoTask = appUpdateManager.appUpdateInfo
        appUpdateInfoTask.addOnSuccessListener { info ->
            if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {

                appUpdateManager.startUpdateFlowForResult(
                    info,
                    AppUpdateType.IMMEDIATE,
                    activity,
                    REQUEST_CODE_UPDATE
                )
            }
        }
    }
}
```

## Listing and Metadata

### Store Listing Fields
| Field | Limit | Notes |
|---|---|---|
| App name | 50 chars | Include keywords |
| Short description | 80 chars | Tagline |
| Full description | 4000 chars | Features, benefits |
| Release notes | 500 chars | What's new in this version |
| Feature graphic | 1024×500px | Required — top of listing |
| Screenshots | 2-8 per device type | First 3 critical |
| Icon | 512×512px | 32-bit PNG |
| Category | Required | Choose carefully for search |

### Google Play Policies
```groovy
// Deceptive behavior policy: app must work as described
// Permissions policy: only request what's needed
// Advertising ID policy: user opt-out for interest-based ads
// Store listing must match app functionality exactly

// Policy violations → Warning → Suspension → Account termination
// Appeal process: Play Console → Policy status → Appeal
```

## Publishing API

```bash
# Google Play Developer API v3
# Auth: OAuth 2.0 service account

# Edit ID (required for updates)
EDIT_ID=$(curl -s -X POST \
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.app/edits" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.id')

# Upload AAB
curl -X POST \
  "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/com.example.app/edits/$EDIT_ID/bundles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @app-release.aab

# Commit edit
curl -X POST \
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.app/edits/$EDIT_ID:commit" \
  -H "Authorization: Bearer $TOKEN"
```

## Monetization

### Subscriptions
```kotlin
// Subscription base plans (new system, replacing old SKUs)
// Prepaid plans, auto-renewing base plans, offers
// Account hold (grace period): 7-30 days
// Account pause: up to 1 year
// Recovery period: 30 days after cancellation
```

### In-App Products
```kotlin
// Managed products (one-time purchases)
// Consumable products (can be purchased again)
// Product details: title, description, price, default currency
// Subscriptions and products must be activated before publishing
```

## Play Integrity API

```kotlin
// Device integrity verification (replaces SafetyNet)
class IntegrityHelper(private val context: Context) {
    private val integrityManager = IntegrityManagerFactory.create(context)

    fun verifyIntegrity(nonce: String) {
        val request = IntegrityTokenRequest.builder()
            .setNonce(nonce)
            .build()

        integrityManager.requestIntegrityToken(request)
            .addOnSuccessListener { response ->
                val token = response.token()
                // Verify on server: device integrity, app integrity
                // account details, licensing info
            }
    }
}
```
