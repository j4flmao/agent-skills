---
name: mobile-deployment
description: >
  Use this skill when the user asks about mobile app deployment, App Store,
  Play Store, TestFlight, Fastlane, code signing, mobile CI/CD, app release,
  or beta testing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, deployment, phase-4, universal]
---

# Mobile Deployment

## Purpose
Configure mobile app deployment pipelines including Fastlane automation, code signing, CI/CD, App Store Connect, Play Console, TestFlight, and phased releases.

## Agent Protocol

### Trigger
User request includes: `mobile deploy`, `app store`, `play store`, `testflight`, `fastlane`, `code signing`, `mobile ci/cd`, `app release`, `beta testing`.

### Input Context
- Platform target (iOS, Android, or both)
- CI/CD provider (GitHub Actions, GitLab CI, Bitrise)
- Signing strategy (automatic, manual, match)
- Distribution type (TestFlight, Play Internal, Production)

### Output Artifact
A markdown document containing:
- Fastlane setup for iOS and Android
- Code signing configuration
- CI/CD pipeline yaml
- App Store Connect / Play Console release flow
- Beta testing (TestFlight, Play Internal Testing)
- Phased release configuration

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output.

### Max Response Length
4096 tokens

## Decision Trees

### Distribution Strategy Selection

```
Which distribution channel?
├── Internal team testing (<100 users)
│   ├── iOS → TestFlight Internal (no review, 100 testers via App Store Connect)
│   └── Android → Play Internal Testing (no review, 100 testers)
├── External beta (>100 users)
│   ├── iOS → TestFlight External (up to 10k testers, Beta App Review required)
│   └── Android → Open Beta (unlimited, no review)
├── Production release
│   ├── iOS → App Store via App Store Connect (App Review, 24-48h typical)
│   └── Android → Play Console Production track (review hours-days)
└── Enterprise/internal (org-owned devices only)
    ├── iOS → Apple Developer Enterprise Program + MDM
    └── Android → Managed Google Play + EMM / sideload APK
```

### Code Signing Strategy

```
Which code signing approach?
├── Single developer / small team
│   └── Xcode Automatic Signing (simple, no match needed)
├── Multiple developers / CI
│   ├── Fastlane Match with encrypted git repo (recommended)
│   │   ├── One shared Apple Developer account
│   │   └── Multiple app identifiers
│   └── Manual certificates per machine
│       └── Export p12 + provisioning profiles manually
└── Enterprise distribution
    └── In-house certificate + MDM profile distribution
```

### CI/CD Provider Selection

```
Which CI/CD provider?
├── GitHub project → GitHub Actions (macOS-14 for iOS, ubuntu-latest for Android)
├── Self-hosted / on-prem → GitLab CI (bring your own macOS runner)
├── Mobile-focused → Bitrise (optimized macOS VMs, built-in code signing)
├── Cross-platform desktop → CircleCI (macOS M1 runner, Android Linux)
└── Fast feedback only → local Fastlane with pre-commit hooks
```

## Workflow

### Step 0: Project Setup
Initialize Fastlane, configure Match, create Appfile, and set up environment

```
fastlane init        # creates Fastfile, Appfile, Matchfile
fastlane match init  # creates encrypted cert repo
```

### Step 1: Set Up Fastlane
Configure Fastfile with beta and release lanes for both iOS and Android with proper build and upload steps. Include Matchfile for code signing, Appfile for metadata, and Deliverfile/Supplyfile for store metadata.

### Step 2: Configure Code Signing
Set up Fastlane Match for iOS code signing with encrypted certificates or manual signing for specific targets. Configure Android keystore with env vars.

### Step 3: Set CI/CD Pipeline
Create GitHub Actions workflows for iOS (macOS runner) and Android (Ubuntu runner) with secrets management. Add GitLab CI, Bitrise, or CircleCI as needed.

### Step 4: Configure Distribution Tracks
Set up TestFlight Internal/External for iOS and Internal Testing/Closed Alpha/Open Beta for Android. Configure phased releases and in-app updates.

### Step 5: Manage Store Metadata
Automate app metadata, screenshots, and pricing with Deliver (iOS) and Supply (Android) to eliminate manual store work.

## Rules

- Never commit code signing certificates or provisioning profiles to source
- Fastlane Match with encrypted git repo for iOS certificate management
- CI/CD must run on macOS for iOS builds — no exceptions
- Android keystore must be base64-encoded in CI secrets, not in repo
- TestFlight Internal (100 testers, no review) for rapid iteration
- Phased releases always start at 1% and ramp based on crash metrics
- Build number must be derived from commit count for traceability
- Store metadata (description, keywords, screenshots) version-controlled in Fastlane
- In-app updates (Android) must support both flexible and immediate flows
- iOS app thinning asset packs must be tested on real devices before release
- Enterprise certs revoked = all apps stop working — guard with restricted access
- Never use distribution certificates for development builds

## Fastlane Setup

### Appfile
```ruby
app_identifier("com.example.app")       # Bundle ID
apple_id("developer@example.com")        # Apple ID
team_id("ABCDEF1234")                     # Developer Team ID
itc_team_id("123456789")                 # App Store Connect Team ID
```

### Matchfile
```ruby
git_url("https://github.com/org/certs.git")
storage_mode("git")
type("appstore")                          # or "development"
app_identifier(["com.example.app", "com.example.app.widget"])
username("developer@example.com")

# Match-specific
generate_apple_certs(true)
skip_docs(true)
```

### iOS Fastfile

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    match(type: "appstore")
    build_app(scheme: "App", export_method: "app-store")
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end

  desc "Release to App Store"
  lane :release do
    match(type: "appstore")
    build_app(scheme: "App", export_method: "app-store")
    upload_to_app_store(
      force: true,
      submit_for_review: true,
      release_on_approval: true,
      phased_release: true
    )
  end

  desc "Increment build number"
  lane :bump do
    increment_build_number(
      build_number: number_of_commits
    )
  end

  desc "Build for ad-hoc testing"
  lane :adhoc do
    match(type: "adhoc")
    build_app(scheme: "App", export_method: "ad-hoc")
  end
end
```

### Android Fastfile

```ruby
default_platform(:android)

platform :android do
  desc "Build and upload to Play Internal Testing"
  lane :beta do
    gradle(task: "assembleRelease")
    upload_to_play_store(
      track: "internal",
      release_status: "draft"
    )
  end

  desc "Release to Production"
  lane :release do
    gradle(task: "assembleRelease")
    upload_to_play_store(
      track: "production",
      release_status: "completed",
      in_app_update_priority: 2
    )
  end

  desc "Increment version"
  lane :bump do
    increment_version_name(
      version_name: prompt(text: "New version name: ")
    )
    increment_version_code(
      version_code: number_of_commits
    )
  end
end
```

### Deliverfile (iOS Metadata)
```ruby
app_identifier("com.example.app")
username("developer@example.com")

name("App Name")
subtitle("App Subtitle")
privacy_url({
  "en-US" => "https://example.com/privacy"
})
support_url({
  "en-US" => "https://example.com/support"
})
keywords("keyword1, keyword2, keyword3")
description("App description for App Store listing.")
release_notes("Bug fixes and performance improvements.")

# Pricing
price_tier(0)                    # Free
# price_tier(1)                  # $0.99
automatic_release(false)         # Manual release after review
```

### Supplyfile (Android Metadata)
```ruby
package_name("com.example.app")

track("production")
release_status("completed")

metadata_path("metadata/android")

# Listing details
name("App Name")
summary("Short description")
description("Full description for Play Store listing.")
short_description("Tagline")

# Contact
support_email("support@example.com")
support_phone("+1234567890")
support_website("https://example.com/support")
```

## Code Signing (iOS)

### Certificate Types
| Type | Usage | Validity |
|---|---|---|
| Apple Development | Debug builds, simulator | 1 year |
| Apple Distribution | App Store builds | 1 year |
| iOS Distribution (Ad Hoc) | Limited device testing | 1 year |
| iOS Distribution (In House) | Enterprise distribution | 1 year |
| Apple Push Services | Push notifications | 1 year |
| Pass Type ID | Apple Wallet passes | 1 year |

### Fastlane Match Workflow
```bash
# Initialize encrypted cert repo
fastlane match init

# Generate development certs
fastlane match development

# Generate distribution certs  
fastlane match appstore

# Generate ad-hoc certs
fastlane match adhoc

# Nuke and regenerate (use sparingly)
fastlane match nuke distribution
fastlane match nuke development

# Use in Matchfile
git_url("https://github.com/org/certs.git")
type("appstore")
app_identifier(["com.example.app"])
```

### Manual Signing (Xcode)
```
Target > Signing & Capabilities
  - Automatically manage signing: OFF
  - Provisioning Profile: Match AppStore
  - Code Signing Identity: Apple Distribution
```

### Environment Variables
```bash
# CI signing
MATCH_PASSWORD=<your-match-passphrase>
MATCH_KEYCHAIN_NAME=<keychain-name>
MATCH_KEYCHAIN_PASSWORD=<keychain-password>
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=<app-specific-password>
FASTLANE_SESSION=<session-cookie>
FASTLANE_PASSWORD=<apple-id-password>
FASTLANE_DONT_STORE_PASSWORD=1      # Don't persist to keychain
SPACESHIP_2FA_ENABLED=true           # 2FA support
SPACESHIP_SKIP_2FA_UPGRADE=true
```

### Android Code Signing
```bash
# Generate keystore
keytool -genkey -v -keystore release.keystore \
  -alias example -keyalg RSA -keysize 2048 \
  -validity 10000

# Encode for CI
certutil -encode release.keystore release.keystore.base64
# OR
openssl base64 -in release.keystore > release.keystore.base64
```

```gradle
// app/build.gradle.kts
android {
  signingConfigs {
    create("release") {
      storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "release.keystore")
      storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
      keyAlias = System.getenv("ANDROID_KEY_ALIAS")
      keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
    }
  }
  buildTypes {
    release {
      signingConfig = signingConfigs.getByName("release")
    }
  }
}
```

## CI/CD Pipeline

### GitHub Actions — iOS
```yaml
name: iOS Beta
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: bundle install
      - run: bundle exec fastlane beta
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_SESSION: ${{ secrets.FASTLANE_SESSION }}
      - uses: actions/upload-artifact@v4
        with:
          name: ios-ipa
          path: "*.ipa"
```

### GitHub Actions — Android
```yaml
name: Android Beta
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - run: bundle install
      - run: bundle exec fastlane beta
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: android-apk-aab
          path: "app/build/outputs/**/*.aab"
```

### GitLab CI
```yaml
stages:
  - build
  - deploy

ios-beta:
  stage: deploy
  tags:
    - macos
  script:
    - bundle install
    - bundle exec fastlane beta
  only:
    - main
  variables:
    MATCH_PASSWORD: $MATCH_PASSWORD
    FASTLANE_SESSION: $FASTLANE_SESSION

android-beta:
  stage: deploy
  tags:
    - linux
  script:
    - bundle install
    - bundle exec fastlane beta
  only:
    - main
  variables:
    ANDROID_KEYSTORE_BASE64: $ANDROID_KEYSTORE_BASE64
    ANDROID_KEYSTORE_PASSWORD: $ANDROID_KEYSTORE_PASSWORD
    ANDROID_KEY_ALIAS: $ANDROID_KEY_ALIAS
    ANDROID_KEY_PASSWORD: $ANDROID_KEY_PASSWORD
```

### Bitrise Configuration
Bitrise provides built-in code signing via codesigndoc and Secrets:
- iOS: Use `certificate-and-profile-installer` step
- Android: Use `sign-APK` or `sign-aab` step
- Workflow triggers: push to main, pull request, scheduled nightly

```
Workflow: Deploy
1. git-clone
2. certificate-and-profile-installer (iOS)
3. fastlane beta
4. deploy-to-bitrise-io
5. google-play-deploy (Android)
6. testflight-deploy (iOS)
```

## Build Versioning Strategy

### Semantic Versioning with Build Numbers
```
Version: 3.2.1 (semantic)
  Major: breaking changes
  Minor: feature additions
  Patch: bug fixes

Build number: auto-increment from git
  iOS  CFBundleVersion = number_of_commits
  iOS  CFBundleShortVersionString = manual bump
  Android versionCode = number_of_commits
  Android versionName = manual bump
```

### Fastlane Automatic Build Numbers
```ruby
# iOS: derive from git commit count
lane :bump do
  increment_build_number(
    build_number: number_of_commits
  )
end

# Android: derive from git commit count  
lane :bump do
  increment_version_code(
    version_code: number_of_commits
  )
  increment_version_name(
    version_name: get_version_name_from_git_tag
  )
end
```

## Distribution Tracks

### App Store Connect
| Track | Purpose | Review Required | Max Testers |
|---|---|---|---|
| TestFlight Internal | Internal team testing | No | 100 |
| TestFlight External | External beta testing | Yes (Beta App Review) | 10,000 |
| App Store Production | Public release | Yes (App Review) | Unlimited |

### Play Console
| Track | Purpose | Review Required | Max Testers |
|---|---|---|---|
| Internal Testing | Internal testing | No | 100 |
| Closed Alpha | Per-group testing | No | 100 per group |
| Open Beta | Public beta | No | Unlimited |
| Production | Public release | Yes | Unlimited |

## Phased Releases

### iOS — App Store Connect Phased Release
```bash
# Enable phased release (7-day gradual rollout via API)
xcrun altool --upload-app --phased-release true

# Via Fastlane
upload_to_app_store(
  phased_release: true      # 7-day gradual
)

# Download previous release metadata
xcrun altool --list-apps -u "user" -p "pass"
```

Phased release ramp schedule (automatic):
- Day 1: 1% of users
- Day 2: 2%
- Day 3: 5%
- Day 4: 10%
- Day 5: 20%
- Day 6: 50%
- Day 7: 100%

### Android — Play Console Staged Rollout
```kotlin
// In-app updates — Play Core API
val appUpdateManager = AppUpdateManagerFactory.create(context)

// Check for update
val appUpdateInfoTask = appUpdateManager.appUpdateInfo
appUpdateInfoTask.addOnSuccessListener { info ->
  if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
    && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
    appUpdateManager.startUpdateFlow(
      info,
      context,
      AppUpdateType.FLEXIBLE
    )
  }
}
```

Staged rollout via Fastlane:
```ruby
lane :staged_rollout do
  upload_to_play_store(
    track: "production",
    rollout: "0.01",       # Start at 1%
    release_status: "inProgress"
  )
end
```

Play Console staged rollout schedule:
- 1% → 5% → 10% → 20% → 50% → 100%
- Pause at any stage if crash rate spikes
- Rollback by halting fraction increase

## Enterprise Distribution

### iOS Enterprise (In-House)
- Requires Apple Developer Enterprise Program ($299/year)
- Uses In-House distribution certificate
- No App Store review
- Distribute via MDM (MobileIron, Jamf, Intune) or OTA manifest:
```html
<a href="itms-services://?action=download-manifest&url=https://example.com/manifest.plist">
  Install App
</a>
```
- Risk: one cert revocation kills all enterprise apps — restrict access tightly

### Android Enterprise (Managed Google Play)
- Organization must join Managed Google Play
- Apps distributed via Play Console as private apps
- Managed configurations supported via JSON:
```json
{
  "restrict_share": {
    "type": "bool",
    "value": true
  },
  "allowed_domains": {
    "type": "string",
    "value": "example.com"
  }
}
```
- Sideload APK directly to devices if Play not available

## App Thinning (iOS)
iOS app thinning reduces download size using asset packs and on-demand resources:

```plist
<!-- Info.plist — on-demand resources tags -->
<key>NSBundleResourceRequestTags</key>
<dict>
  <key>Level-1</key>
  <array>
    <string>asset-level-1</string>
  </array>
  <key>Level-2</key>
  <array>
    <string>asset-level-2</string>
  </array>
</dict>
```

```swift
// Load on-demand resource
let request = NSBundleResourceRequest(tags: ["asset-level-1"])
request.beginAccessingResources { error in
  if error == nil {
    // Resources downloaded, use them
  }
}
```

Three thinning mechanisms:
1. **App Slicing** — device-specific variants (automatic)
2. **On-Demand Resources** — download assets when needed
3. **Bitcode** — App Store re-optimization (deprecated in Xcode 14, removed in 16)

## Android App Bundle (AAB)
Always upload AAB (not APK) to Play Console — Google handles app slicing:

```groovy
// build.gradle.kts
android {
  bundle {
    language {
      enableSplit = true    // Language-specific APKs
    }
    density {
      enableSplit = true    // Density-specific APKs
    }
    abi {
      enableSplit = true    // ABI-specific APKs
    }
  }
}
```

```bash
# Build AAB
./gradlew bundleRelease

# Convert AAB to universal APK for local testing
java -jar bundletool.jar build-apks \
  --bundle=app-release.aab \
  --output=app.apks \
  --ks=release.keystore \
  --ks-pass=pass:password

# Extract universal APK
unzip app.apks -d apks/
```

## Screenshot Automation

### Fastlane Snapshot (iOS)
```ruby
lane :screenshots do
  snapshot(
    devices: [
      "iPhone 16 Pro Max",
      "iPhone 16",
      "iPhone SE (3rd generation)"
    ],
    languages: ["en-US", "de", "ja", "zh-Hans"],
    concurrent_workers: 4,
    output_directory: "screenshots/ios"
  )
  deliver(
    skip_build: true,
    overwrite_screenshots: true
  )
}
```

### Fastlane Screengrab (Android)
```ruby
lane :screenshots do
  screengrab(
    app_apk_path: "app/build/outputs/apk/debug/app-debug.apk",
    tests_apk_path: "app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk",
    locales: ["en-US", "de", "ja"],
    output_directory: "screenshots/android"
  )
  supply(
    skip_upload_apk: true,
    skip_upload_aab: true,
    skip_upload_metadata: true,
    sync_image_upload: true
  )
}
```

## Environment Configuration Management

### Build Configurations per Environment
```swift
// iOS — Xcode Build Configurations
// 1. Debug: local dev, no crash reporting
// 2. Staging: staging API, TestFlight
// 3. Release: production API, App Store

// Use xcconfig files:
// Config/Debug.xcconfig
API_BASE_URL = https://dev-api.example.com
BUNDLE_ID_SUFFIX = .dev

// Config/Release.xcconfig
API_BASE_URL = https://api.example.com
BUNDLE_ID_SUFFIX = 
```

```kotlin
// Android — Build Config Fields in build.gradle.kts
android {
  buildTypes {
    debug {
      buildConfigField("String", "API_BASE_URL", "\"https://dev-api.example.com\"")
      applicationIdSuffix = ".dev"
    }
    release {
      buildConfigField("String", "API_BASE_URL", "\"https://api.example.com\"")
    }
  }
}
```

## Anti-Patterns

### Code Signing Anti-Patterns
- **Checking certs into repo**: Exposes signing identities. Use Match with encrypted git repo
- **Manual provisioning profile management**: Time-consuming and error-prone. Always automate with Match
- **One cert for CI and local**: CI server generates new certs independently via Match
- **Expired certs blocking builds**: Match nuke + re-gen; add cert expiry monitoring to CI
- **Using distribution cert for dev**: Blocks debugging on device — use development certs
- **Revokable enterprise cert shared widely**: One leak = all apps dead. Restrict cert access to 1-2 people

### CI/CD Anti-Patterns
- **Running iOS builds on Linux**: Multiple emulator-only, no signing. macOS is required
- **Hardcoding secrets in pipeline YAML**: Always use CI secrets/stores
- **Building without caching**: Adds 5-10 min per run. Cache Gradle/Pods/SwiftPM
- **No build artifact retention**: Can't debug production issues. Store IPAs/AABs for 30 days
- **Skipping lint on CI**: Lets code quality issues into production. Add static analysis to pipeline
- **Single environment for all builds**: Dev/staging/prod configs must be separate

### Release Management Anti-Patterns
- **Releasing on Friday**: Weekend incidents. Release Tuesday-Thursday
- **Phased release at 100% immediately**: No gradual ramp. Always start at 1%
- **No rollback plan**: App Store rejects can't revert. Maintain last-known-good binary
- **Skipping beta testing**: Production bugs caught too late. Always TestFlight/Internal first
- **Manual version bumps**: Inconsistent and error-prone. Automate via git tags or commit count
- **No crash monitoring during phased release**: Can't detect regressions. Monitor crash rate vs baseline
- **In-app update not tested for seamless install**: Users lose state. Test flexible/immediate flows

## Handoff

After deployment, hand off to:
- `mobile/universal/crash-reporting` — Crash monitoring post-release
- `mobile/universal/security` — Code signing security, cert rotation
- `mobile/universal/testing` — Pre-release testing strategy
- `mobile/universal/push-notifications` — Push notification certs
- `mobile/universal/in-app-purchase` — IAP products and receipt validation
- `mobile/android` — Android-specific build variants
- `mobile/ios` — iOS-specific Xcode project config
