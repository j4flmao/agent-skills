# Universal Links Setup

## iOS — apple-app-site-association

Host at `https://example.com/.well-known/apple-app-site-association` (no .json extension).

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.example.app",
        "paths": ["/profile/*", "/product/*", "/search"]
      }
    ]
  }
}
```

`appID` format: Team ID (from Apple Developer) + Bundle Identifier. Paths support `*` wildcard, `?` single-segment, and `NOT` prefix.

## iOS — App Delegate Handling

```swift
func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]) -> Void) -> Bool {
  guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
        let url = userActivity.webpageURL else { return false }
  DeepLinkRouter.handle(url)
  return true
}
```

## Android — AndroidManifest intent-filter

```xml
<activity android:name=".MainActivity"
          android:launchMode="singleTask">
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="example.com"
          android:pathPrefix="/profile" />
  </intent-filter>
</activity>
```

## Verification

- iOS: AASA fetched at app install time, validated silently. Verify via `swcutil` or check device logs for `[CoreBroker]` messages.
- Android: Google Search Console verification of domain ownership. Run `adb shell dumpsys package domain-preferred-apps` to check autoVerify status.

## Testing Commands

```bash
# iOS Simulator
xcrun simctl openurl booted "https://example.com/profile/42"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://example.com/profile/42"

# Custom URL scheme
xcrun simctl openurl booted "myapp://profile/42"
adb shell am start -W -a android.intent.action.VIEW \
  -d "myapp://profile/42"
```
