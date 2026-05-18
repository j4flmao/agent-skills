---
name: mobile-crash-reporting
description: >
  Use this skill when the user says 'crash report', 'crashlytics', 'sentry', 'symbolication', 'dsym', 'breadcrumb', 'non-fatal', 'user context', 'error tracking'. This skill enforces proper crash reporting patterns: SDK setup, symbolication, breadcrumbs, non-fatal error capture, user context, and release health monitoring. Applies to iOS, Android, Flutter, and React Native.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, crash-reporting, universal]
---

# Mobile Crash Reporting

## Purpose
Set up crash reporting with proper SDK configuration, symbolication, breadcrumbs, non-fatal error capture, and release health monitoring across all mobile platforms.

## Agent Protocol

### Trigger
User request includes: `crash report`, `crashlytics`, `sentry`, `symbolication`, `dsym`, `breadcrumb`, `non-fatal`, `user context`, `error tracking`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Crash service (Sentry, Crashlytics, or both)
- Existing error handling infrastructure

### Output Artifact
A markdown document containing SDK setup for selected service, symbolication setup (dSYM, ProGuard mapping), breadcrumb implementation, non-fatal / caught error reporting, user context attachment, and release health and alert configuration.

### Response Format
Code-first. One code block per platform (Swift, Kotlin, Dart/TS) with setup and key patterns. Summarize configuration points in bullet list. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Crash reporting SDK initialized for all target platforms
- [ ] Symbolication configured (dSYM upload, ProGuard mapping, source maps)
- [ ] Non-fatal error capture implemented
- [ ] User context attached to crash reports
- [ ] Breadcrumbs configured for key user actions
- [ ] Release health monitoring enabled

### Max Response Length
4096 tokens

## Workflow

### Step 1: Initialize SDK

Sentry:
```swift
// iOS
import Sentry
SentrySDK.start { options in
    options.dsn = "https://key@o123.ingest.sentry.io/456"
    options.debug = false
    options.environment = "production"
    options.tracesSampleRate = 0.2
}
```

```kotlin
// Android
SentryAndroid.init(this) { options ->
    options.dsn = "https://key@o123.ingest.sentry.io/456"
    options.environment = BuildConfig.BUILD_TYPE
    options.tracesSampleRate = 0.2
}
```

```dart
// Flutter
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
});
```

Firebase Crashlytics:
```kotlin
// Android - build.gradle
buildscript {
    dependencies {
        classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
    }
}
```

```kotlin
// Application class
FirebaseCrashlytics.getInstance().apply {
    setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
}
```

```swift
// iOS
FirebaseApp.configure()
```

### Step 2: Capture Non-Fatal Errors
```swift
// Sentry
SentrySDK.capture(error: error) { scope in
    scope.setTag(value: "data_sync", key: "operation")
}
// Crashlytics
Crashlytics.crashlytics().record(error: error, userInfo: ["operation": "data_sync"])
```

```kotlin
Sentry.captureException(error)
FirebaseCrashlytics.getInstance().recordException(error)
```

```dart
await Sentry.captureException(error);
```

```typescript
Sentry.captureException(error);
```

### Step 3: Attach User Context
```swift
SentrySDK.configureScope { scope in
    scope.setUser(SentryUser(
        userId: "user_123",
        email: "alice@example.com",
        username: "alice"
    ))
}
Crashlytics.crashlytics().setUserID("user_123")
Crashlytics.crashlytics().setCustomValue("alice", forKey: "username")
```

```kotlin
Sentry.setUser(SentryUser().apply {
    id = "user_123"
    email = "alice@example.com"
    username = "alice"
})
FirebaseCrashlytics.getInstance().setUserId("user_123")
FirebaseCrashlytics.getInstance().setCustomKey("plan", "premium")
```

### Step 4: Configure Release Health Monitoring

| Metric | Description |
|--------|-------------|
| Crash-free rate | Sessions without crash / total sessions |
| Crash rate | Crashes per session |
| Error rate | Non-fatals per session |
| Version adoption | % of users on each app version |
| Issue frequency | Top N most frequent crashes, grouped by fingerprint |

## Rules
- Always disable crash reporting in debug builds to avoid noise.
- Never include personally identifiable information in breadcrumbs or user context without compliance review.
- Always upload dSYMs (iOS) during CI/CD for symbolicated crash reports.
- Non-fatal errors must include context (screen, action, state) for debugging.
- Crash reporting SDK must be initialized before any other SDK that might throw.
- Always test crash reporting on a real device before release.
- Never log authentication tokens or secrets in breadcrumbs.

## References
- `references/sentry-setup.md` — Full Sentry configurations, sampling, release tracking, environments
- `references/crashlytics-setup.md` — Crashlytics Gradle/SPM setup, debug/prod conditional, analytics integration
- `references/symbolication.md` — dSYM upload, ProGuard mapping, source maps, Bitcode caveats
- `references/breadcrumbs.md` — Manual and automatic breadcrumbs, level filtering, custom context

## Handoff
No further handoff. Crash reporting is self-contained after initial setup.
