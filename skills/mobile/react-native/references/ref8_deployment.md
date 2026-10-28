# React Native Deployment: Builds, Signing, Store Release and OTA

End-to-end release process for React Native apps: environments, versioning, signing, cloud or local builds, store submission, staged rollout and over-the-air (OTA) JavaScript updates.

## Release Pipeline Overview

```
PR merged to main
  -> CI: lint, typecheck, unit tests
  -> build internal (staging channel) -> TestFlight internal / Play internal testing
  -> E2E on build -> QA sign-off
  -> production build -> App Store review / Play production
  -> staged rollout (Play %, App Store phased release)
  -> monitor crash-free sessions -> expand or halt
JS-only hotfix -> OTA update to production channel with rollout %
```

## Versioning

| Field | iOS | Android | Rule |
|-------|-----|---------|------|
| User-facing version | `CFBundleShortVersionString` | `versionName` | SemVer-ish, e.g. 3.4.0 |
| Build number | `CFBundleVersion` | `versionCode` (int) | Strictly increasing per upload |
| OTA compatibility | `runtimeVersion` | `runtimeVersion` | Changes whenever native code changes |

EAS can manage build numbers remotely (`"cli": { "appVersionSource": "remote" }` + `autoIncrement: true`). Use `runtimeVersion: { policy: "fingerprint" }` so any native change yields a new runtime version automatically.

## EAS Build Profiles

```json
// eas.json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "channel": "development" },
    "preview": { "distribution": "internal", "channel": "preview",
                 "env": { "APP_VARIANT": "preview" } },
    "production": { "channel": "production", "autoIncrement": true }
  },
  "submit": {
    "production": {
      "ios": { "ascAppId": "1234567890" },
      "android": { "track": "internal" }
    }
  }
}
```

```bash
eas build --platform all --profile production
eas submit --platform ios --latest
eas submit --platform android --latest
```

Secrets for builds go in EAS environment variables (`eas env:create`) with visibility "secret", not in `eas.json`.

## Bare Workflow: fastlane

```ruby
# fastlane/Fastfile
platform :ios do
  lane :beta do
    setup_ci
    match(type: "appstore", readonly: true)
    increment_build_number(build_number: ENV["BUILD_NUMBER"])
    build_app(workspace: "ios/App.xcworkspace", scheme: "App", export_method: "app-store")
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end
end

platform :android do
  lane :beta do
    gradle(task: "bundle", build_type: "Release", project_dir: "android")
    upload_to_play_store(track: "internal", aab: "android/app/build/outputs/bundle/release/app-release.aab")
  end
end
```

Authenticate to App Store Connect with an API key (`app_store_connect_api_key`), not an Apple ID password.

## Signing

| Platform | Artifact | Guidance |
|----------|----------|----------|
| iOS | Distribution certificate + provisioning profile | Manage with EAS credentials or fastlane `match` (encrypted repo/bucket) |
| Android | Upload key (you hold) + app signing key (Google holds via Play App Signing) | Keep the upload keystore in a secret store; you can reset a lost upload key through Play support |

Never commit keystores, `.p8` keys or passwords. In CI decode them from secrets at build time.

## Store Requirements to Track

- Google Play: new apps and updates must target a recent Android API level (Play raises the target SDK requirement every year, around August). Check the current requirement before each release.
- Apple: builds must use the Xcode/SDK version Apple requires for submissions (raised each spring). Privacy manifest and required-reason API declarations are mandatory.
- Both: data-safety / privacy nutrition labels must match what the app and its SDKs collect.

## Staged Rollout

| Store | Mechanism | Controls |
|-------|-----------|----------|
| Google Play | Staged rollout % on production track | Increase, halt, resume |
| App Store | Phased release over 7 days (1%, 2%, 5%, 10%, 20%, 50%, 100%) | Pause up to 30 days total, release to all |

Define go/no-go gates: crash-free users, ANR rate (Android vitals), key funnel conversion.

## OTA Updates (EAS Update)

App Center CodePush was retired on 2025-03-31; EAS Update (`expo-updates`) is the common replacement and works in bare apps.

```bash
# publish JS/assets to the branch mapped to the production channel
eas update --channel production --message "Fix checkout total rounding"

# staged rollout of an update to 10% of users on that channel
eas update --channel production --rollout-percentage 10 --message "..."

# roll back
eas update:rollback
```

Rules:
- OTA only for JS and assets. Any native change (new native module, permission, SDK upgrade) requires a store build and a new runtime version.
- Enable update code signing so devices reject tampered updates.
- Check for updates at a controlled point (startup or app foreground) and apply on next launch unless critical.
- Respect store policy: OTA may fix bugs and adjust content, not change the app's primary purpose.

## CI Example (GitHub Actions + EAS)

```yaml
name: release
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --platform all --profile production --non-interactive --auto-submit
```

## Post-Release Monitoring

- Upload source maps and native symbols (dSYM, R8 mapping) for each build and each OTA update.
- Dashboards per release: crash-free sessions/users, ANRs, startup time, API error rate.
- Keep a runbook: halt rollout, roll back OTA, hotfix branch from the release tag.

## Checklist

- [ ] Build numbers strictly increasing; `runtimeVersion` tied to native fingerprint
- [ ] Signing material in a secret store; no keys in git
- [ ] Separate channels for development, preview, production
- [ ] Current store target SDK / Xcode requirements met
- [ ] Staged rollout with explicit health gates
- [ ] OTA updates signed and limited to JS/assets
- [ ] Symbols and source maps uploaded for every build and update
