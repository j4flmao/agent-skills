# Deep Linking Fundamentals

## What is Deep Linking?

Deep linking allows opening a mobile app to a specific screen (not just the home screen) via a URL or link. Deep links connect web content to app content, enabling seamless navigation from external sources.

## Deep Link Types

### Custom URL Scheme
```
myapp://profile/42?tab=orders
```
- Custom protocol prefix (myapp://)
- Works immediately, no server configuration
- Shows confirmation dialog on iOS ("Open in MyApp?")
- Can be claimed by multiple apps
- Use for: development, internal testing, fallback

### Universal Link (iOS)
```
https://app.example.com/profile/42
```
- Standard HTTPS URL that opens app silently
- Requires `apple-app-site-association` file on server
- Verified by Apple at install time
- Only YOUR app can claim this domain
- No confirmation dialog
- Use for: all production iOS deep linking

### App Link (Android)
```
https://app.example.com/profile/42
```
- Same HTTPS URL pattern as universal link
- Requires `intent-filter` with `autoVerify`
- Verified by Google via Digital Asset Links
- No disambiguation dialog
- Use for: all production Android deep linking

## Platform Setup

### iOS — AASA File
Host at `https://{domain}/.well-known/apple-app-site-association` (no .json extension):
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.example.app",
        "paths": ["*", "not:/admin/*"]
      }
    ]
  }
}
```

#### Verifying AASA
```bash
curl -v https://app.example.com/.well-known/apple-app-site-association
# Check: 200 OK, Content-Type: application/json or application/pkix-cert
# Check: no redirect to another URL
```

#### Testing iOS Universal Links
```bash
# From simulator
xcrun simctl openurl booted "https://app.example.com/profile/42"

# Check AASA fetch status in device console
# Search for: [CoreBroker], swcutil
```

### Android — Intent Filter
```xml
<activity android:name=".MainActivity"
    android:launchMode="singleTask">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="app.example.com"
            android:pathPrefix="/profile" />
    </intent-filter>
    <!-- Custom scheme for development -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="myapp" />
    </intent-filter>
</activity>
```

#### Digital Asset Links JSON
Host at `https://{domain}/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.app",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

#### Verifying App Links
```bash
adb shell dumpsys package domain-preferred-apps
# Look for: Status: always for your app package
```

## Route Configuration

### URL Structure
```
https://[domain]/[path]?[query_params]

Examples:
https://app.example.com/profile/42
https://app.example.com/orders/ORD-123?tab=items
https://app.example.com/product/abc-456?ref=share
```

### Route Registry
```typescript
interface Route {
  pattern: string;        // "/profile/:id"
  handler: RouteHandler;  // (params) => navigate
}

const routeRegistry: Route[] = [
  { pattern: "/home", handler: () => navigateTo(HomeScreen) },
  { pattern: "/profile/:id", handler: (p) => navigateTo(ProfileScreen, { userId: p.id }) },
  { pattern: "/orders/:orderId", handler: (p) => navigateTo(OrderScreen, { orderId: p.orderId }) },
  { pattern: "/product/:productId", handler: (p) => navigateTo(ProductScreen, { productId: Number(p.productId) }) },
];
```

### Path Matching Algorithm
```swift
func matchPath(path: String, pattern: String) -> [String: String]? {
    let pathSegments = path.split(separator: "/").map(String.init)
    let patternSegments = pattern.split(separator: "/").map(String.init)

    guard pathSegments.count == patternSegments.count else { return nil }

    var params: [String: String] = [:]
    for (segment, pattern) in zip(pathSegments, patternSegments) {
        if pattern.hasPrefix(":") {
            // Named parameter
            params[String(pattern.dropFirst())] = segment
        } else if segment != pattern {
            // Literal mismatch
            return nil
        }
    }
    return params
}
```

## Deep Link Lifecycle

### Cold Start (App Not Running)
1. User taps link
2. System launches app with intent/activity
3. `AppDelegate.didFinishLaunchingWithOptions` (iOS) or `Activity.onCreate` (Android) receives the link
4. Deep link handler extracts URL, matches route, navigates
5. If auth required: show login, store pending deep link

### Warm Start (App in Background)
1. User taps link
2. System delivers link to running app
3. `AppDelegate.continue` (iOS) or `Activity.onNewIntent` (Android) receives link
4. Deep link handler navigates from current state
5. Don't reset navigation stack — push onto existing stack

## Fallback Behavior

### When App Is Not Installed
- iOS: Opens the webpage at the same URL
- Android: Opens the webpage at the same URL
- The webpage must detect mobile user-agent and redirect to App Store / Play Store

```html
<!-- Fallback webpage at https://app.example.com/profile/42 -->
<script>
  // Try to open app
  window.location.href = "myapp://profile/42";
  setTimeout(function() {
    // If app didn't open, redirect to store
    if (confirm("Install MyApp to view this content?")) {
      window.location.href = "https://apps.apple.com/app/id123456789";
    }
  }, 500);
</script>
```

### When App Opens Wrong Screen
- Log analytics event for unhandled deep link
- Navigate to home screen as default
- Show user message: "The requested page was not found"

## Testing Deep Links

### iOS Testing
```bash
# Universal link (simulator)
xcrun simctl openurl booted "https://app.example.com/profile/42"

# Universal link (real device)
# SMS, Notes, or Safari: tap the HTTPS URL

# Custom scheme
xcrun simctl openurl booted "myapp://profile/42"

# Check AASA
curl -v https://app.example.com/.well-known/apple-app-site-association
```

### Android Testing
```bash
# App link (emulator)
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://app.example.com/profile/42"

# Custom scheme
adb shell am start -W -a android.intent.action.VIEW \
  -d "myapp://profile/42"

# Verify intent filter
adb shell dumpsys package domain-preferred-apps

# Check assetlinks
curl -v https://app.example.com/.well-known/assetlinks.json
```
