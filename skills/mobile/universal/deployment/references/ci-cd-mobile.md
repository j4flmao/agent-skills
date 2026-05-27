# Mobile CI/CD Pipeline Setup

## Overview

Mobile CI/CD pipelines face unique challenges compared to web: code signing, device provisioning, platform-specific build tools, app store submission, and long build times. A robust pipeline automates build, test, signing, distribution, and review processes.

## CI/CD Provider Comparison

| Feature | GitHub Actions | Bitrise | CircleCI | GitLab CI | Jenkins |
|---------|---------------|---------|----------|-----------|---------|
| macOS runners | Yes (macos-14) | Yes (native) | Yes (macOS) | Yes (macOS) | Manual |
| iOS signing | Manual setup | Built-in codesign | Manual setup | Manual setup | Manual setup |
| Android build | Yes | Yes | Yes | Yes | Yes |
| Build cache | actions/cache | Built-in | Built-in | Built-in | Manual |
| Parallelism | Matrix strategy | Workflow-based | Container-based | Parallel jobs | Distributed |
| Pricing | Pay per minute | Tiered plans | Pay per credit | Free minutes | Free (self-hosted) |
| Mobile templates | Community | Excellent | Community | Community | Custom |

## GitHub Actions — iOS Pipeline

```yaml
name: iOS Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  XCODE_VERSION: '15.4'
  SCHEME: 'App'
  WORKSPACE: 'App.xcworkspace'
  CONFIGURATION: 'Release'

jobs:
  test:
    name: Unit and UI Tests
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-pods-

      - name: Install Dependencies
        run: |
          gem install bundler
          bundle install
          pod install --repo-update

      - name: Run Tests
        run: |
          xcodebuild test \
            -workspace "${{ env.WORKSPACE }}" \
            -scheme "${{ env.SCHEME }}" \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
            -resultBundlePath 'TestResults.xcresult'

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: TestResults.xcresult

  build_and_deploy:
    name: Build and Deploy to TestFlight
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_${{ env.XCODE_VERSION }}.app

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}

      - name: Install Dependencies
        run: |
          gem install bundler
          bundle install
          pod install --repo-update

      - name: Setup Code Signing
        run: |
          bundle exec fastlane match appstore --readonly
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}

      - name: Build and Upload to TestFlight
        run: bundle exec fastlane beta
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.FASTLANE_APPLE_SPECIFIC_PASSWORD }}
          FASTLANE_SESSION: ${{ secrets.FASTLANE_SESSION }}
          APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.APP_STORE_CONNECT_API_KEY_CONTENT }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_ISSUER_ID }}

      - name: Upload IPA Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-ipa
          path: |
            *.ipa
            *.dSYM.zip
```

## GitHub Actions — Android Pipeline

```yaml
name: Android Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  JAVA_VERSION: '17'
  JAVA_DISTRIBUTION: 'temurin'

jobs:
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: ${{ env.JAVA_DISTRIBUTION }}
          java-version: ${{ env.JAVA_VERSION }}

      - name: Setup Gradle Cache
        uses: gradle/actions/setup-gradle@v3

      - name: Run Unit Tests
        run: ./gradlew testDebugUnitTest

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: android-test-results
          path: app/build/reports/tests/

  instrumented_tests:
    name: Instrumented Tests
    runs-on: macos-14
    strategy:
      matrix:
        api-level: [29, 33, 34]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: ${{ env.JAVA_DISTRIBUTION }}
          java-version: ${{ env.JAVA_VERSION }}

      - name: Run Instrumented Tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: ${{ matrix.api-level }}
          script: ./gradlew connectedDebugAndroidTest

  build_and_deploy:
    name: Build and Deploy to Play Console
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: ${{ env.JAVA_DISTRIBUTION }}
          java-version: ${{ env.JAVA_VERSION }}

      - name: Setup Gradle Cache
        uses: gradle/actions/setup-gradle@v3

      - name: Decode Keystore
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > app/keystore.jks

      - name: Build Signed APK/AAB
        run: ./gradlew bundleRelease
        env:
          ANDROID_KEYSTORE_PATH: app/keystore.jks
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: Upload to Play Console
        run: bundle exec fastlane android beta
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          PLAY_CONFIG_JSON: ${{ secrets.PLAY_CONFIG_JSON }}

      - name: Upload AAB Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-aab
          path: app/build/outputs/bundle/release/app-release.aab
```

## Bitrise Configuration

Bitrise provides native mobile CI/CD with specialized steps for signing and distribution.

### Key Steps

1. **Git Clone** — Standard clone step
2. **Certificate and Profile Installer** — Automatically fetches signing certificates from Bitrise Code Signing tab
3. **Xcode Test for iOS** — Runs unit and UI tests on Bitrise-managed simulator
4. **Xcode Archive for iOS** — Creates .xcarchive and exports .ipa
5. **Gradle Runner for Android** — Runs gradle tasks with configurable arguments
6. **Deploy to Bitrise.io** — Internal distribution for testing
7. **Deploy to TestFlight** — Upload to App Store Connect
8. **Google Play Deploy** — Upload to Play Console

### Bitrise YAML Example (iOS)

```yaml
format_version: '13'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: ios
trigger_map:
- push_branch: main
  workflow: beta
workflows:
  beta:
    steps:
    - activate-ssh-key@4:
        run_if: '{{getenv "SSH_RSA_PRIVATE_KEY" | ne ""}}'
    - git-clone@8: {}
    - certificate-and-profile-installer@1: {}
    - xcode-test@5:
        inputs:
        - project_path: "$BITRISE_PROJECT_PATH"
        - scheme: "$BITRISE_SCHEME"
    - xcode-archive@5:
        inputs:
        - project_path: "$BITRISE_PROJECT_PATH"
        - scheme: "$BITRISE_SCHEME"
        - export_method: app-store
    - deploy-to-bitrise-io@2: {}
    - testflight-deploy@3:
        inputs:
        - api_key_path: "$API_KEY_PATH"
        - api_issuer: "$API_ISSUER"
```

## CircleCI Configuration

### iOS orb

```yaml
version: 2.1
orbs:
  ios: circleci/ios@2.3.0

jobs:
  build-and-test:
    macos:
      xcode: 15.4.0
    steps:
      - checkout
      - ios/install-dependencies:
          bundle-install: true
          pod-install: true
      - ios/run-tests:
          workspace: App.xcworkspace
          scheme: App
          device: iPhone 15
      - store_test_results:
          path: test_output

  deploy:
    macos:
      xcode: 15.4.0
    steps:
      - checkout
      - ios/install-dependencies:
          bundle-install: true
          pod-install: true
      - run:
          name: Deploy to TestFlight
          command: bundle exec fastlane beta

workflows:
  version: 2
  build-deploy:
    jobs:
      - build-and-test
      - deploy:
          requires:
            - build-and-test
          filters:
            branches:
              only: main
```

## Build Automation

### Version Bumping

iOS — Fastlane automated versioning:

```ruby
lane :bump_version do
    increment_version_number(
        version_name: prompt(text: "New version (e.g., 2.1.0): ")
    )
    increment_build_number(
        build_number: number_of_commits
    )
end
```

Android — Gradle automated versioning:

```groovy
android {
    defaultConfig {
        versionCode = getCommitCount()
        versionName = getVersionName()
    }
}

def getCommitCount() {
    def stdout = new ByteArrayOutputStream()
    exec {
        commandLine 'git', 'rev-list', '--count', 'HEAD'
        standardOutput = stdout
    }
    return stdout.toString().trim().toInteger()
}

def getVersionName() {
    def stdout = new ByteArrayOutputStream()
    exec {
        commandLine 'git', 'describe', '--tags', '--always'
        standardOutput = stdout
    }
    return stdout.toString().trim()
}
```

### Changelog Generation

Generate changelog from git commits between tags:

```bash
#!/bin/bash
PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD~1)
git log $PREVIOUS_TAG..HEAD --oneline --no-merges | while read line; do
    echo "- $line"
done > CHANGELOG.md
```

Fastlane integration:

```ruby
lane :changelog do
    previous_tag = last_git_tag
    changelog = changelog_from_git_commits(
        between: [previous_tag, "HEAD"],
        merge_commit_filtering: "exclude_merges"
    )
    puts changelog
end
```

## Signing Management

### iOS — Fastlane Match

```ruby
lane :sync_signing do
    match(
        type: "appstore",
        app_identifier: ["com.example.app", "com.example.app.widget"],
        git_url: "https://github.com/org/match-certs.git",
        shallow_clone: true,
        readonly: is_ci
    )
end
```

### Android — Keystore in CI

```bash
# CI environment setup
# Store as base64-encoded secret:
# cat keystore.jks | base64

# Decode in CI pipeline:
echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > app/keystore.jks

# configure app/build.gradle:
android {
    signingConfigs {
        release {
            storeFile file("keystore.jks")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
}
```

## Test Automation in CI

### Unit Tests

```bash
# iOS — run all unit tests
xcodebuild test \
    -workspace App.xcworkspace \
    -scheme App \
    -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
    -only-testing:AppTests \
    | xcpretty

# Android — run all unit tests
./gradlew testDebugUnitTest

# Flutter
flutter test --coverage
```

### UI Tests

```bash
# iOS — specific UI test target
xcodebuild test \
    -workspace App.xcworkspace \
    -scheme App \
    -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
    -only-testing:AppUITests \
    | xcpretty --test

# Android — instrumented tests on emulator
./gradlew connectedDebugAndroidTest
```

## Beta Distribution

### TestFlight

```ruby
lane :beta do
    match(type: "appstore")
    build_app(scheme: "App", export_method: "app-store")
    upload_to_testflight(
        skip_waiting_for_build_processing: true,
        distribute_external: false,
        notify_external_testers: false,
        groups: ["Internal"]
    )
end
```

### Firebase App Distribution

```ruby
lane :firebase_beta do
    gradle(task: "assembleRelease")
    firebase_app_distribution(
        app: "1:123456789:android:abc123",
        testers: "testers@example.com",
        release_notes: File.read("CHANGELOG.md"),
        groups: ["qa-team", "product-team"]
    )
end
```

## Review Process Automation

### Pre-Submission Checks

```yaml
# GitHub Actions matrix — run checks before submission
jobs:
  pre_submission:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate Info.plist
        run: |
          plutil -lint App/Info.plist

      - name: Check Required Keys
        run: |
          for key in NSCameraUsageDescription NSPhotoLibraryUsageDescription; do
            if ! grep -q $key App/Info.plist; then
              echo "Missing key: $key"
              exit 1
            fi
          done

      - name: Check App Icon
        run: |
          if [ ! -f App/Assets.xcassets/AppIcon.appiconset/Contents.json ]; then
            echo "Missing app icon"
            exit 1
          fi

      - name: Validate Android Manifest
        run: |
          ./gradlew validateSigningRelease
```

### App Store Connect API

Modern App Store Connect interactions use the API key authentication:

```ruby
# Fastlane App Store Connect API Key
app_store_connect_api_key(
    key_id: ENV["APP_STORE_CONNECT_API_KEY_ID"],
    issuer_id: ENV["APP_STORE_CONNECT_API_ISSUER_ID"],
    key_content: ENV["APP_STORE_CONNECT_API_KEY_CONTENT"],
    is_key_content_base64: true,
    in_house: false
)
```

## Environment Configuration

### Build Variants

```yaml
# iOS — different schemes per environment
env:
  SCHEME_DEVELOP: 'App-Dev'
  SCHEME_STAGING: 'App-Staging'
  SCHEME_PRODUCTION: 'App'

# Fastlane — environment-based configuration
lane :deploy do |options|
    environment = options[:env] || "production"
    case environment
    when "development"
        build_app(scheme: "App-Dev", export_method: "development")
        upload_to_testflight(groups: ["Dev"])
    when "staging"
        build_app(scheme: "App-Staging", export_method: "app-store")
        upload_to_testflight(groups: ["Staging"])
    when "production"
        build_app(scheme: "App", export_method: "app-store")
        upload_to_testflight(groups: ["Internal"])
        upload_to_app_store
    end
end
```

### Android Build Types

```groovy
android {
    buildTypes {
        debug {
            applicationIdSuffix ".debug"
            versionNameSuffix "-debug"
            signingConfig signingConfigs.debug
        }
        staging {
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            signingConfig signingConfigs.release
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
        }
    }
}
```

## Best Practices

- Never store credentials in repository — use CI secrets
- Use Fastlane Match for iOS certificate management
- Run unit tests on every PR, UI tests nightly, E2E before release
- Cache build artifacts (Pods, Gradle cache) to speed up pipelines
- Build number derived from git commit count for traceability
- Use phased releases starting at 1%
- Separate CI workflows for PR, beta, and production
- iOS builds must run on macOS — no exceptions
- Android keystore must be base64-encoded in CI secrets
- Monitor CI build times and optimize slow stages
