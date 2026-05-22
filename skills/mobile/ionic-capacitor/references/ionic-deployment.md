# Ionic Deployment

## Build Pipeline

```bash
# Install dependencies
npm ci

# Build web assets
ionic build --prod

# Copy to native platforms
npx cap copy

# Sync plugins (runs copy + installs pods for iOS)
npx cap sync

# Open native IDE
npx cap open ios
npx cap open android
```

## Android Code Signing

Generate keystore:
```bash
keytool -genkey -v -keystore release.keystore -alias app-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

Configure `android/app/build.gradle`:
```groovy
android {
  signingConfigs {
    release {
      storeFile file("release.keystore")
      storePassword System.getenv("KEYSTORE_PASSWORD")
      keyAlias System.getenv("KEY_ALIAS")
      keyPassword System.getenv("KEY_PASSWORD")
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
```

## iOS Code Signing

- Xcode → Signing & Capabilities → Select Team
- Use Automatic signing for development
- Manually configure provisioning profiles for distribution
- Export from Xcode → Distribute App → App Store Connect

## CI/CD (GitHub Actions)

```yaml
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: ionic build --prod
      - run: npx cap sync ios
      - run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App -configuration Release \
            -archivePath App.xcarchive archive
```

## Store Submission

- iOS: Upload via Xcode Organizer or Transporter. Submit to App Store Connect for review.
- Android: Generate signed AAB (`./gradlew bundleRelease`). Upload to Google Play Console → Internal testing → Closed/Open track → Production.
- Ionic Appflow: Alternative CI/CD with live deploy (web assets only, no native rebuild).
