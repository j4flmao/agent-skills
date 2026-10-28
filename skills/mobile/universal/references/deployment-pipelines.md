# Mobile Deployment Pipelines

CI/CD for iOS and Android apps: build signing, versioning, automated distribution to testers and stores, staged rollouts, over-the-air updates for JS/Dart-capable stacks, and release monitoring. Tooling covered: fastlane, Xcode Cloud, GitHub Actions, Gradle Play Publisher, EAS, Codemagic.

## Pipeline Stages

```text
PR:       lint → unit tests → build (debug) → UI tests on emulator/simulator
main:     build (release, signed) → upload to internal testing (TestFlight / Play internal)
release:  promote build → store review → staged rollout → monitor → 100%
hotfix:   branch from release tag → same pipeline → expedited review if needed
```

Build once, promote the same signed artifact through tracks; do not rebuild for production.

## Versioning

| Platform | User-visible | Monotonic build number |
|----------|--------------|------------------------|
| iOS | `CFBundleShortVersionString` (e.g. 3.4.0) | `CFBundleVersion` (must increase per upload for the same version) |
| Android | `versionName` | `versionCode` (integer, must increase for every upload to Play) |
| Flutter | `version: 3.4.0+412` in pubspec (name+build) | |
| Expo | `version` + `ios.buildNumber` / `android.versionCode` (or EAS remote versioning with `autoIncrement`) | |

Derive build numbers from CI (run number) or a remote counter to avoid collisions between branches.

## Code Signing

### iOS
- Distribution certificate + provisioning profile (App Store), or automatic signing with an App Store Connect API key.
- Store certificates/profiles encrypted (fastlane `match` in a private repo or cloud storage), or let Xcode Cloud manage signing.
- Authenticate CI with an App Store Connect API key (`.p8`, key ID, issuer ID), not an Apple ID password.

### Android
- Play App Signing: Google holds the app signing key; you sign uploads with an upload key. Losing the upload key is recoverable via Play support; losing a self-managed app signing key is not.
- Keep the upload keystore and passwords in the CI secret store; decode at build time.

```kotlin
// app/build.gradle.kts
android {
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("UPLOAD_KEYSTORE_PATH") ?: error("UPLOAD_KEYSTORE_PATH not set"))
            storePassword = System.getenv("UPLOAD_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("UPLOAD_KEY_ALIAS")
            keyPassword = System.getenv("UPLOAD_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

## fastlane

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  lane :beta do
    api_key = app_store_connect_api_key(
      key_id: ENV.fetch("ASC_KEY_ID"),
      issuer_id: ENV.fetch("ASC_ISSUER_ID"),
      key_content: ENV.fetch("ASC_KEY_P8"),
    )
    match(type: "appstore", readonly: true, api_key: api_key)
    increment_build_number(build_number: ENV.fetch("BUILD_NUMBER"))
    build_app(scheme: "App", export_method: "app-store")
    upload_to_testflight(api_key: api_key, skip_waiting_for_build_processing: true)
  end
end

platform :android do
  lane :internal do
    gradle(task: "bundle", build_type: "Release")
    upload_to_play_store(track: "internal", aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
                         json_key_data: ENV.fetch("PLAY_SERVICE_ACCOUNT_JSON"))
  end

  lane :promote_production do
    upload_to_play_store(track: "internal", track_promote_to: "production", rollout: "0.1",
                         skip_upload_aab: true, json_key_data: ENV.fetch("PLAY_SERVICE_ACCOUNT_JSON"))
  end
end
```

Android uploads use App Bundles (`.aab`); new apps on Google Play must be published as AABs.

## GitHub Actions (Android example)

```yaml
name: android-release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: gradle/actions/setup-gradle@v4
      - name: Decode keystore
        run: echo "$UPLOAD_KEYSTORE_B64" | base64 -d > "$RUNNER_TEMP/upload.jks"
        env:
          UPLOAD_KEYSTORE_B64: ${{ secrets.UPLOAD_KEYSTORE_B64 }}
      - run: ./gradlew bundleRelease
        env:
          UPLOAD_KEYSTORE_PATH: ${{ runner.temp }}/upload.jks
          UPLOAD_KEYSTORE_PASSWORD: ${{ secrets.UPLOAD_KEYSTORE_PASSWORD }}
          UPLOAD_KEY_ALIAS: ${{ secrets.UPLOAD_KEY_ALIAS }}
          UPLOAD_KEY_PASSWORD: ${{ secrets.UPLOAD_KEY_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with: { name: aab, path: app/build/outputs/bundle/release/*.aab }
```

iOS builds need macOS runners (`macos-latest` or a pinned `macos-15` image) and an explicit Xcode selection.

## Hosted Options

| Service | Notes |
|---------|-------|
| Xcode Cloud | Apple-hosted; integrated signing and TestFlight; iOS/macOS only |
| EAS Build/Submit (Expo) | Managed builds and store submission for Expo/RN; build profiles in `eas.json` |
| Codemagic | Strong Flutter support; iOS and Android |
| Bitrise | Mobile-focused CI with step library |

Visual Studio App Center was retired on March 31, 2025, including its CodePush service; migrate distribution to TestFlight/Play testing tracks or Firebase App Distribution, and OTA to EAS Update or a self-hosted CodePush-compatible server.

## Tester Distribution

| Channel | Platform |
|---------|----------|
| TestFlight internal/external groups | iOS (external testers require Beta App Review) |
| Play internal / closed / open testing tracks | Android |
| Firebase App Distribution | iOS (ad hoc/enterprise) and Android |

## Staged Rollouts

- Google Play: staged rollout percentage on production; can halt a rollout. Users who already received the update keep it.
- App Store: phased release over 7 days for automatic updates (can pause; users can still update manually).
- Combine with remote feature flags so risky features can be disabled without a new binary.

## Over-the-Air Updates

| Stack | Mechanism | Limits |
|-------|-----------|--------|
| Expo / React Native | EAS Update (runtime versions, channels, rollouts) | JS/assets only; native changes need a store build |
| Flutter | Shorebird code push | Dart code only; check platform-specific constraints |
| Native | Not available for executable code | Use remote config/feature flags |

Store rules allow interpreted code updates that do not change the app's primary purpose; follow the current App Store Review Guidelines and Google Play policies.

## Release Monitoring

- Crash-free users/sessions (Crashlytics, Sentry), ANR rate (Android vitals), launch time.
- Gate rollout increases on these metrics staying within thresholds versus the previous release.
- Upload dSYMs (iOS) and R8 mapping files (Android) for every release build so crashes are symbolicated.

## Checklist

- [ ] Same signed artifact promoted through tracks
- [ ] Build numbers monotonic and CI-generated
- [ ] Signing material in secret storage; API-key auth for App Store Connect, service account for Play
- [ ] AAB uploads; Play App Signing enabled
- [ ] Staged/phased rollout with metric gates; symbols and mapping files uploaded
- [ ] No dependency on App Center or its CodePush service (both retired)
