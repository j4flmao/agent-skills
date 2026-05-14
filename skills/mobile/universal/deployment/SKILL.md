---
name: mobile-deployment
description: Mobile app deployment — App Store Connect, Play Console, TestFlight, Fastlane, CI/CD, code signing, beta testing, phased releases.
---

# Mobile Deployment

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
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Fastlane Setup

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

## Code Signing (iOS)

### Fastlane Match

```bash
fastlane match init
fastlane match development
fastlane match appstore

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
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=<app-specific-password>
FASTLANE_SESSION=<session-cookie>
```

## CI/CD Pipeline (GitHub Actions)

### iOS

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
```

### Android

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
```

## Distribution Tracks

### App Store Connect
| Track | Purpose | Review Required |
|---|---|---|
| TestFlight Internal | Up to 100 testers | No |
| TestFlight External | Up to 10,000 testers | Yes (Beta App Review) |
| App Store Production | Public release | Yes (App Review) |

### Play Console
| Track | Purpose | Review Required |
|---|---|---|
| Internal Testing | Up to 100 testers | No |
| Closed Alpha | Up to 100 testers per group | No |
| Open Beta | Public beta | No |
| Production | Public release | Yes |

## Phased Releases

### iOS (App Store Connect API)
```bash
# Enable phased release (7-day gradual rollout)
xcrun altool --upload-app --phased-release true
```

### Android (Play Console)
```kotlin
// In-app updates API
val appUpdateManager = AppUpdateManagerFactory.create(context)
appUpdateManager.startUpdateFlow(
  AppUpdateInfo.newBuilder().setAvailableVersionCode(2)
    .setUpdateAvailability(UpdateAvailability.UPDATE_AVAILABLE)
    .setUpdatePriority(2)
    .setUpdateType(AppUpdateType.FLEXIBLE)
    .build(),
  context,
  AppUpdateType.FLEXIBLE
)
```

## References

### Reference Files
- `references/fastlane-setup.md` — Fastlane lanes, plugins, environment
- `references/code-signing.md` — iOS code signing, Android keystore, match

### Related Skills
- `mobile/ios/SKILL.md` — iOS development
- `mobile/android/SKILL.md` — Android development
- `devops/jenkins/SKILL.md` — CI/CD pipeline

## Handoff

No further handoff. Deployment is terminal.
