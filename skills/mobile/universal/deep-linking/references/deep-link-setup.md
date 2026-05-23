# Deep Link Setup

## iOS — apple-app-site-association (AASA)

Host at `https://{domain}/.well-known/apple-app-site-association` (no .json extension, served with Content-Type: application/json or application/pkix-cert).

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.example.app",
        "paths": ["/profile/*", "/product/*", "/search", "NOT /admin/*"]
      },
      {
        "appID": "TEAMID.com.example.app.extension",
        "paths": ["/widget/*"]
      }
    ]
  }
}
```

Key rules:
- `appID`: Team ID (10 chars from Apple Developer) + "." + Bundle Identifier
- `paths`: Array of path patterns. `*` matches any number of segments, `?` matches single segment, `NOT` prefix excludes paths
- Multiple `details` entries for app extensions or multiple app IDs
- AASA is fetched at install time and periodically refreshed by iOS
- Test with `swcutil` or check device logs for `[CoreBroker]` messages

### iOS — App Delegate Handling

```swift
func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]) -> Void) -> Bool {
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL else { return false }
    DeepLinkRouter.handle(url)
    return true
}

// SceneDelegate (iOS 13+)
func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let url = userActivity.webpageURL else { return }
    DeepLinkRouter.handle(url)
}
```

### iOS — Custom URL Scheme

```xml
<!-- Info.plist -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.example.app</string>
    </dict>
</array>
```

```swift
// AppDelegate
func application(_ app: UIApplication, open url: URL,
                 options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    DeepLinkRouter.handle(url)
    return true
}
```

## Android — AndroidManifest intent-filter

```xml
<activity android:name=".MainActivity"
          android:launchMode="singleTask"
          android:exported="true">

    <!-- App Links (auto-verified) -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="example.com"
              android:pathPrefix="/" />
    </intent-filter>

    <!-- Custom URL scheme -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="myapp" />
    </intent-filter>

</activity>
```

### Android — Digital Asset Links

Host at `https://{domain}/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.app",
    "sha256_cert_fingerprints": [
      "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
    ]
  }
}]
```

### Android — Activity Handling

```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data = intent?.data ?: return
        DeepLinkRouter.handle(this, data)
    }
}
```

## Verification Commands

```bash
# iOS — Check AASA fetch status (on device)
# Search Xcode device logs for: [CoreBroker] or swcutil
# Or use the 'swcutil' command on macOS:
swcutil list     # Show registered universal links

# Android — Check autoVerify status
adb shell dumpsys package domain-preferred-apps
# Look for: "Domain verification state: verified"

# Android — Force re-verification
adb shell pm set-app-links --package com.example.app 0 all

# iOS Simulator — Test universal link
xcrun simctl openurl booted "https://example.com/profile/42"

# Android Emulator — Test app link
adb shell am start -W -a android.intent.action.VIEW \
    -d "https://example.com/profile/42"

# Custom URL scheme — both platforms
xcrun simctl openurl booted "myapp://profile/42"
adb shell am start -W -a android.intuitent.action.VIEW \
    -d "myapp://profile/42"
```

## Common Verification Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Link opens Safari instead of app | AASA/assetlinks not configured | Check file location and content |
| iOS: no AASA fetch | Server returns wrong Content-Type | Set to `application/json` or `application/pkix-cert` |
| Android: verification stays "none" | SHA-256 fingerprint mismatch | Regenerate and update assetlinks.json |
| Link works on first install, stops | iOS cached AASA is stale | Wait or reinstall app |
| Custom scheme shows confirmation dialog | Intent missing DEFAULT category | Add `android:category "DEFAULT"` |

No preamble. No postamble. No explanations.
