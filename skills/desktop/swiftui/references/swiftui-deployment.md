# SwiftUI Deployment Reference

## Mac App Store

```swift
// Configure app for App Store distribution
// AppStore.xcconfig
BUNDLE_ID = com.example.myapp
APP_STORE_TEAM_ID = TEAM123456
CODE_SIGN_STYLE = Manual
DEVELOPMENT_TEAM = TEAM123456
PROVISIONING_PROFILE_SPECIFIER = Match AppStore com.example.myapp

// App Store receipt validation
// StoreKit 2 handles this automatically
// Verify in-app purchases with Transaction.currentEntitlements
```

App Store submission checklist:
1. Archive product (Product → Archive)
2. Distribute App → App Store Connect
3. Provide export compliance (ITAR, encryption)
4. Upload via Xcode Organizer or Transporter
5. Configure pricing, description, screenshots in App Store Connect
6. Submit for review

## Code Signing

```bash
# Manual signing for distribution
codesign --force --options runtime \
  --sign "Developer ID Application: My Company (TEAMID)" \
  --entitlements App.entitlements \
  "Build/Release/MyApp.app"

# Verify signature
codesign -dv --verbose=4 "MyApp.app"
spctl --assess --verbose=4 --type execute "MyApp.app"
```

```xml
<!-- App.entitlements -->
<dict>
  <key>com.apple.security.app-sandbox</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.print</key>
  <true/>
</dict>
```

## Notarization

```bash
# Notarize .app bundle
ditto -c -k --keepParent "MyApp.app" "MyApp.zip"

xcrun notarytool submit "MyApp.zip" \
  --apple-id "user@example.com" \
  --team-id "TEAMID" \
  --password @keychain:AC_PASSWORD \
  --wait

# Staple ticket
xcrun stapler staple "MyApp.app"

# For .dmg distribution
# Sign DMG after notarization
codesign --sign "Developer ID Application: My Company" MyApp.dmg
```

## Swift Packages

```swift
// Package.swift — library as Swift Package
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MyLibrary",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(name: "MyLibrary", targets: ["MyLibrary"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-dependencies", from: "1.0.0"),
    ],
    targets: [
        .target(
            name: "MyLibrary",
            dependencies: [
                .product(name: "Dependencies", package: "swift-dependencies"),
            ]),
        .testTarget(name: "MyLibraryTests", dependencies: ["MyLibrary"]),
    ]
)
```

## CI/CD for macOS

### GitHub Actions

```yaml
jobs:
  build:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: swift-actions/setup-swift@v2

      - name: Build
        run: swift build -c release

      - name: Test
        run: swift test

      - name: Archive
        run: |
          xcodebuild -scheme MyApp \
            -configuration Release \
            -archivePath MyApp.xcarchive archive

      - name: Export
        run: |
          xcodebuild -exportArchive \
            -archivePath MyApp.xcarchive \
            -exportPath Build/ \
            -exportOptionsPlist ExportOptions.plist

      - name: Notarize
        if: startsWith(github.ref, 'refs/tags/')
        env:
          AC_USERNAME: ${{ secrets.AC_USERNAME }}
          AC_PASSWORD: ${{ secrets.AC_PASSWORD }}
          AC_TEAM_ID: ${{ secrets.AC_TEAM_ID }}
        run: |
          ditto -c -k --keepParent "Build/MyApp.app" "Build/MyApp.zip"
          xcrun notarytool submit "Build/MyApp.zip" \
            --apple-id "$AC_USERNAME" \
            --team-id "$AC_TEAM_ID" \
            --password "$AC_PASSWORD" --wait
          xcrun stapler staple "Build/MyApp.app"
```

## Sandboxing

```xml
<!-- Sandbox entitlements -->
<key>com.apple.security.app-sandbox</key>
<true/>
<!-- File access -->
<key>com.apple.security.files.user-selected.read-write</key>
<true/>
<key>com.apple.security.files.downloads.read-write</key>
<false/>
<key>com.apple.security.files.pictures.read-write</key>
<false/>
<!-- Network -->
<key>com.apple.security.network.client</key>
<true/>
<key>com.apple.security.network.server</key>
<false/>
<!-- Device -->
<key>com.apple.security.device.camera</key>
<false/>
<key>com.apple.security.device.microphone</key>
<false/>
<!-- Printing -->
<key>com.apple.security.print</key>
<true/>
```

## Deployment Checklist

- App signed with Developer ID or Mac App Store certificate
- Notarized by Apple with stapled ticket
- Sandbox entitlements set (if App Store distribution)
- Export compliance determined (ITSAppUsesNonExemptEncryption)
- Minimum macOS version set (macOS 14+ for @Observable)
- Swift Package dependencies pinned to specific versions
- Previews removed or disabled from release builds
- Asset catalog with AppIcon in all required sizes
- Info.plist with correct bundle version and display name
- Privacy manifest (PrivacyInfo.xcprivacy) for required reason API
- Xcode Archive with debug symbols for crash symbolication
- CI builds on macOS runner for every tag
