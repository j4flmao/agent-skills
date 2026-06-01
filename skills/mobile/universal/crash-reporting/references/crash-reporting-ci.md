# Crash Reporting CI/CD Integration

## Why Automate Crash Reporting in CI?

Manual symbol upload is error-prone and often forgotten, resulting in unsymbolicated crashes that are useless for debugging. CI automation ensures every build has matching symbols, every release is monitored, and regressions are caught before reaching users.

## iOS — dSYM Upload

### Xcode Build Phase (Alternative to CI)
Add a Run Script phase after "Embed Frameworks":
```bash
"${PODS_ROOT}/FirebaseCrashlytics/upload-symbols" -gsp "${PROJECT_DIR}/GoogleService-Info.plist" -p ios "${DWARF_DSYM_FOLDER_PATH}"
```

### GitHub Actions — Sentry
```yaml
name: Upload dSYMs to Sentry
on:
  release:
    types: [published]

jobs:
  upload-dsym:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: ~/Library/Developer/Xcode/DerivedData
          key: derived-${{ hashFiles('**/*.swift') }}

      - name: Build Release
        run: |
          xcodebuild archive \
            -scheme MyApp \
            -configuration Release \
            -archivePath build/MyApp.xcarchive

      - name: Upload dSYMs
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: mycompany
          SENTRY_PROJECT: myapp-ios
        run: |
          # Zip dSYMs for faster upload
          cd build/MyApp.xcarchive/dSYMs
          zip -r dsyms.zip *.dSYM
          # Upload with source context
          sentry-cli upload-dif \
            --include-sources \
            --org $SENTRY_ORG \
            --project $SENTRY_PROJECT \
            dsyms.zip
```

### GitHub Actions — Crashlytics
```yaml
- name: Upload dSYMs to Crashlytics
  env:
    GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.FIREBASE_CREDENTIALS }}
  run: |
    "${PODS_ROOT}/FirebaseCrashlytics/upload-symbols" \
      -gsp GoogleService-Info.plist \
      -p ios \
      build/MyApp.xcarchive/dSYMs
```

## Android — ProGuard/R8 Mapping Upload

### Gradle Plugin (Automatic)
```kotlin
// build.gradle.kts (app level)
firebaseCrashlytics {
    mappingFileUploadEnabled = true
}

// For Sentry:
sentry {
    includeProguardMapping = true
    uploadNativeSymbols = true
    autoUploadProguardMapping = true
}
```

### GitHub Actions — Manual Upload
```yaml
- name: Upload ProGuard mapping
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
  run: |
    find . -path "*/build/outputs/mapping/release/mapping.txt" | while read mapping; do
      firebase crashlytics:mapping:upload \
        --app=1:123456789:android:abcdef123456 \
        mapping.txt
    done
```

## React Native — Source Map Upload

### Sentry CLI
```yaml
- name: Build & Upload Source Maps
  run: |
    # Build Android bundle
    npx react-native bundle \
      --platform android \
      --dev false \
      --entry-file index.js \
      --bundle-output android-release.bundle \
      --sourcemap-output android-release.bundle.map

    # Upload to Sentry
    npx @sentry/wizard -i reactNative -p ios android
    sentry-cli upload-sourcemaps \
      --org mycompany \
      --project myapp-rn \
      --dist 1 \
      --release com.mycompany.myapp@1.0.0 \
      android-release.bundle \
      android-release.bundle.map
```

## Flutter — Symbol Upload

### Sentry Flutter Integration
```yaml
- name: Build Flutter Release
  run: |
    flutter build ios --release --no-codesign
    flutter build apk --release

- name: Upload Flutter Symbols
  run: |
    # Upload Dart symbols (iOS)
    sentry-cli upload-dif \
      --org mycompany \
      --project myapp-flutter \
      build/ios/iphoneos/Runner.app.dSYM.zip

    # Upload Android mapping
    sentry-cli upload-dif \
      --org mycompany \
      --project myapp-flutter \
      build/app/outputs/mapping/release/mapping.txt
```

## Verification in CI

### Check Symbol Upload Status
```yaml
- name: Verify symbols uploaded
  run: |
    # Check Sentry has symbols for this release
    release_version=$(git describe --tags)
    sentry-cli releases files $release_version list | grep -q "dsym" || {
      echo "ERROR: No symbols found for release $release_version"
      exit 1
    }
```

### Automated Crash Test
```yaml
- name: Force crash to verify reporting
  run: |
    # Install the build on a test device
    # Execute a crash test (trigger a deliberate crash)
    # Wait for crash to appear in Sentry
    sentry-cli events list --project myapp --field crash | grep -q "test-crash" || {
      echo "ERROR: Test crash not received"
      exit 1
    }
```

## Release Health Monitoring

### Automate Release Tracking
```yaml
- name: Create Sentry Release
  run: |
    sentry-cli releases new \
      --org mycompany \
      --project myapp \
      $RELEASE_VERSION

    sentry-cli releases set-commits \
      --org mycompany \
      --project myapp \
      --auto $RELEASE_VERSION

    sentry-cli releases finalize \
      --org mycompany \
      --project myapp \
      $RELEASE_VERSION
```

### Post-Release Health Check (Slack/Webhook)
```yaml
- name: Monitor release health
  run: |
    # Wait 30 minutes for data
    sleep 1800
    curl -X POST $SLACK_WEBHOOK \
      -H "Content-Type: application/json" \
      -d '{"text": "Release ${{ env.RELEASE_VERSION }} deployed. Monitor crash-free rate."}'
```

## Best Practices

- Upload symbols for EVERY build (not just final release)
- Fail CI build if symbol upload fails
- Tag symbols with exact git commit hash for traceability
- Automate release creation in Sentry/Crashlytics as part of CI
- Set up release health dashboard that updates automatically
- Add crash check to CI gate: if new version crash-free rate <99%, block promotion
- Test crash reporting works on real device before each release
- Monitor symbol upload logs in CI output for warnings
- Keep symbol retention matching your release support window (90-180 days)
