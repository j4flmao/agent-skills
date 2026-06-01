# Crash Reporting Fundamentals

## What is Crash Reporting?

Crash reporting automatically captures and records application crashes and errors, providing developers with the information needed to diagnose and fix issues. It includes stack traces, device state, user actions, and environment context.

## Core Concepts

### Crash (Fatal)
An unhandled exception or signal that terminates the app process. iOS: NSException, signal (SIGSEGV, SIGABRT). Android: uncaught exception, native crash (NDK). Flutter: unhandled Dart exception. React Native: JS exception or native crash.

### Non-Fatal (Handled Error)
A caught exception that the app recovers from but still logs for analysis. Includes try/catch errors, network failures, validation errors.

### Term-level: Breadcrumb
A timestamped log of user action or system event leading up to a crash. Used to reconstruct the user's path: navigation, button taps, API calls, state changes.

### Symbolication
The process of converting memory addresses in crash stack traces back to readable function names, file names, and line numbers using debug symbols (dSYM, ProGuard mapping, source maps).

### Release Health
Aggregated crash metrics per app version: crash-free rate, crash rate, error rate, version adoption, user impact.

## SDK Initialization

### Sentry — All Platforms
```swift
// iOS — Initialize as early as possible in AppDelegate
import Sentry

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    SentrySDK.start { options in
        options.dsn = "https://key@o123.ingest.sentry.io/456"
        options.environment = "production"
        options.debug = false  // Never debug in production
        options.tracesSampleRate = 0.2
        options.sessionTracking = .enabled
        options.attachScreenshot = true  // Attach screenshot on crash
        options.attachViewHierarchy = true
    }
    return true
}
```

```kotlin
// Android — Initialize in Application.onCreate
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SentryAndroid.init(this) { options ->
            options.dsn = "https://key@o123.ingest.sentry.io/456"
            options.environment = BuildConfig.BUILD_TYPE
            options.tracesSampleRate = 0.2
            options.attachScreenshot = true
            options.sendDefaultPii = false
        }
    }
}
```

```dart
// Flutter — Wrap runApp with Sentry
await SentryFlutter.init(
    (options) => options
        ..dsn = 'https://key@o123.ingest.sentry.io/456'
        ..tracesSampleRate = 0.2,
    appRunner: () => runApp(MyApp()),
);
```

```typescript
// React Native
import * as Sentry from '@sentry/react-native';

Sentry.init({
    dsn: 'https://key@o123.ingest.sentry.io/456',
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
});
```

### Firebase Crashlytics — Android
```kotlin
// Crashlytics is auto-initialized with Firebase
FirebaseCrashlytics.getInstance().apply {
    setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
    // Set user identifiers
    setUserId("user_123")
    setCustomKey("plan_type", "premium")
    log("User reached checkout screen")
}
```

## Capturing Non-Fatal Errors

### Sentry
```swift
// iOS
SentrySDK.capture(error: error) { scope in
    scope.setTag(value: "checkout", key: "screen")
    scope.setExtra(value: ["cart_total": 29.99], key: "context")
}
```

```kotlin
// Android
Sentry.captureException(exception) { scope ->
    scope.setTag("api_endpoint", "/orders/create")
    scope.setExtra("request_payload", payload.toString())
}
```

### Crashlytics
```swift
// iOS
Crashlytics.crashlytics().record(error: error, userInfo: [
    "screen": "checkout",
    "cart_total": 29.99
])
```

```kotlin
// Android
FirebaseCrashlytics.getInstance().recordException(exception)
```

## Breadcrumbs

Breadcrumbs provide context about what the user was doing before the crash. Implement liberally but keep messages concise.

```swift
// Sentry — Add breadcrumbs
SentrySDK.addBreadcrumb(Breadcrumb(
    level: .info,
    category: "navigation",
    message: "Order detail screen displayed",
    data: ["order_id": "ORD-123"]
))

SentrySDK.addBreadcrumb(Breadcrumb(
    level: .warning,
    category: "network",
    message: "API call failed",
    data: ["endpoint": "/api/orders", "status_code": 500]
))
```

```kotlin
// Sentry Android
Sentry.addBreadcrumb(Breadcrumb().apply {
    level = SentryLevel.INFO
    category = "ui_action"
    message = "User tapped checkout button"
    data = mapOf("cart_total" to 99.99, "item_count" to 3)
})
```

## User Context

Attaching user identity to crash reports helps prioritize which crashes affect the most users.

```swift
SentrySDK.configureScope { scope in
    scope.setUser(SentryUser(
        userId: "user_abc_123",
        email: nil,  // Don't send PII unless necessary
        username: nil
    ))
    scope.setTag(value: "premium", key: "plan_type")
}
```

```kotlin
Sentry.configureScope { scope ->
    scope.setUser(SentryUser().apply {
        id = userId
    })
    FirebaseCrashlytics.getInstance().setUserId(userId)
}
```

## Symbolication

### iOS — dSYM Upload
- dSYM files generated during build (DWARF with dSYM file)
- Upload to Sentry/Crashlytics during CI/CD
- Without dSYM: stack trace shows memory addresses only
- Bitcode: upload dSYMs for each recompiled slice

### Android — ProGuard/R8 Mapping
- `mapping.txt` generated at build time in `build/outputs/mapping/release/`
- Upload via Firebase CLI or Gradle plugin
- ProGuard/R8 obfuscates class/method names — mapping reverses this

### React Native — Source Maps
- Metro bundler generates `.map` files
- Hermes generates HBC map for native crashes
- Upload to Sentry via `@sentry/react-native` CLI

### Flutter — Dart + Native Symbols
- Dart errors: symbolicated automatically by Sentry/Flutter SDK
- Native crashes: need dSYM (iOS) and ProGuard (Android)
- Upload with `sentry-cli` or Flutter upload script

## Release Health Monitoring

### Key Metrics
| Metric | Definition | Alert Threshold |
|--------|------------|-----------------|
| Crash-free rate | % of sessions without crash | <99.5% → Alert |
| Crash rate | Crashes per session | >0.5% → Alert |
| Error rate | Non-fatals per session | >5% → Investigate |
| User impact | % of users affected | >1% → High priority |
| Version adoption | % of sessions per version | Track trend |
| Issue frequency | Top N crashes | Review daily |
| ANR rate (Android) | ANRs per session | >0.1% → Alert |

### Post-Release Monitoring
- First 1 hour: check crash-free rate hasn't dropped
- First 24 hours: check for new issues introduced
- Day 2-3: monitor gradual increase in crash rate
- Day 7: compare crash-free rate to previous version baseline
- Rollback any release causing >2x crash rate increase
