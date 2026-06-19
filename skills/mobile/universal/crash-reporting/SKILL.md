---
name: mobile-crash-reporting
description: >
  Use this skill when the user says 'crash report', 'crashlytics', 'sentry', 'symbolication', 'dsym', 'breadcrumb', 'non-fatal', 'user context', 'error tracking'. This skill enforces proper crash reporting patterns: SDK setup, symbolication, breadcrumbs, non-fatal error capture, user context, and release health monitoring. Applies to iOS, Android, Flutter, and React Native.
version: "2.0.0"
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

## Architecture / Decision Trees

### Crash Service Selection
```
Budget and requirements?
├── Free, Google ecosystem → Firebase Crashlytics
│   Pros: Free, Google Analytics integration, real-time alerts
│   Cons: Firebase dependency, limited session replay
├── Developer-friendly, cross-platform → Sentry
│   Pros: Breadcrumbs, performance tracing, wide platform support
│   Cons: Paid beyond free tier (5000 events/month), self-hosting option
├── Enterprise, full observability → Datadog Crash Reporting / New Relic
│   Pros: Unified metrics + traces + logs + crashes
│   Cons: Expensive, heavy SDK
└── Privacy-first, self-hosted → Countly / Sentry self-hosted
    Full data control, GDPR certainty, ops overhead
```

### Symbolication Strategy
```
Platform?
├── iOS → dSYM upload (Sentry.framework or Crashlytics upload-symbols)
│   CI/CD must upload dSYMs after each build
│   Bitcode: upload dSYMs separately for recompiled slices
├── Android → ProGuard/R8 mapping file upload
│   `mapping.txt` generated at build time
│   Upload via Firebase CLI or Gradle plugin
├── Flutter → Dart symbols + native dSYMs
│   Both Dart and native layer need symbolication
├── React Native → Source maps upload
│   Hermes debug symbols + Metro bundle source maps
└── Missing symbols = unsymbolicated crash = useless stack trace
```

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
// Android
FirebaseCrashlytics.getInstance().apply {
    setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
}
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

### Step 3: Attach User Context
```swift
SentrySDK.configureScope { scope in
    scope.setUser(SentryUser(
        userId: "user_123",
        email: "alice@example.com",
        username: "alice"
    ))
}
```

### Step 4: Add Breadcrumbs
```swift
// Track user actions leading to crash
SentrySDK.addBreadcrumb(Breadcrumb(
    level: .info,
    category: "navigation",
    message: "Order list screen displayed",
    data: ["orders_count": 42]
))
```

```kotlin
Sentry.addBreadcrumb(Breadcrumb().apply {
    level = SentryLevel.INFO
    category = "ui_action"
    message = "User tapped checkout"
    data = mapOf("total" to 99.99)
})
```

### Step 5: Configure Release Health Monitoring

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Crash-free rate | Sessions without crash / total sessions | <99.5% alert |
| Crash rate | Crashes per session | >0.5% alert |
| Error rate | Non-fatals per session | >5% alert |
| Version adoption | % of users on each app version | Track trend |
| Issue frequency | Top N most frequent crashes | Review daily |

### Step 6: CI/CD Symbol Upload

```yaml
# iOS — GitHub Actions dSYM upload
- run: ./Pods/FirebaseCrashlytics/upload-symbols -gsp $GCS_SERVICE_ACCOUNT
  env:
    GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.FIREBASE_CREDENTIALS }}

# Android — automatic via Crashlytics Gradle plugin
- run: ./gradlew assembleRelease crashlyticsUploadSymbolsRelease
```

## Breadcrumb Strategy

| Category | Event | Data |
|----------|-------|------|
| navigation | Screen view | screen_name, route |
| ui_action | Button tap, gesture | action, element_id |
| network | API call | method, endpoint, status_code |
| lifecycle | App state change | foreground/background |
| auth | Login, logout, token refresh | auth_method |
| data | Read/write to storage | entity_type, operation |
| performance | Screen load, API latency | duration_ms |

## Rules
- Always disable crash reporting in debug builds to avoid noise.
- Never include personally identifiable information in breadcrumbs or user context without compliance review.
- Always upload dSYMs (iOS) during CI/CD for symbolicated crash reports.
- Non-fatal errors must include context (screen, action, state) for debugging.
- Crash reporting SDK must be initialized before any other SDK that might throw.
- Always test crash reporting on a real device before release.
- Never log authentication tokens or secrets in breadcrumbs.
- Set breadcrumb limit (200 max) to avoid memory bloat from verbose logging.
- Monitor crash-free rate after every release — regression means reverting or hotfixing.
- Crash alerts should page on-call engineer within 5 minutes of significant spike.

## ANR & OOM Detection

Android ANRs (Application Not Responding) and iOS OOMs (Out of Memory) are not traditional crashes and require special handling. Android: ANRs are detected by the system when the main thread is blocked for >5s. Capture via `ANRWatcher` or `FirebasePerformance`'s ANR tracking. Custom ANR detection: a background thread posts a runnable to the main thread handler every 2s; if the runnable isn't executed within 5s, an ANR is recorded. iOS: OOM detection is indirect — the system kills the process without an exception. Detect OOMs by comparing app launch reason: if the previous termination was not a normal termination (user swipe, crash, app update), it's likely an OOM. Sentry's OOM integration tracks `app.breadcrumbs` before termination and flags OOM candidates. For both: correlate ANR/OOM with memory pressure events, screen state, and foreground duration. Mitigations: (a) instrument OOM-prone screens with memory warnings, (b) reduce image cache size on memory warning, (c) implement state restoration so OOM termination is invisible to user.

## Custom Error Grouping & Fingerprinting

Crash reporting platforms auto-group crashes by stack trace, but custom grouping is needed for specific patterns. Sentry: set `event.fingerprint` to override default grouping. Use when: (a) generic error types with different root causes (e.g., `NetworkError` with different endpoints), (b) crashes in shared library code that collapse into one group, (c) non-fatal errors you want to group differently than crashes. Fingerprint rules: `["{{ default }}", "{{ machine }}" ]` for environment-specific grouping, or `["error", error.code]` for code-based grouping. Crashlytics: use `setCustomKey` to add distinguishing keys, then filter/search in the dashboard. For custom server: implement grouping algorithm that considers (stack trace hash * 0.6 + error message hash * 0.2 + custom tags * 0.2) to compute a grouping key.

### Alert Routing Decision Tree
```
Crash spike detected?
├── Crash-free rate drops below 99.0% → Page on-call immediately
│   Route: PagerDuty/Opsgenie → SMS + phone call
│   SLA: acknowledge within 5 min
├── Crash-free rate 99.0-99.5% → Notify team channel
│   Route: Slack/Teams → #alerts channel
│   SLA: respond within 30 min (business hours)
├── New issue type appears (never seen before)
│   → Auto-create ticket (Jira/GitHub issue) with full stack trace
│   Priority: P2 (normal bug) or P0 (crash affecting >1% of users)
└── Error rate spikes (>5% sessions with non-fatals)
    → Send digest to team, no page
    → Investigate during working hours
    → Correlate with recent deployments
```

### Crash Grouping & Fingerprint Strategy
```
Default auto-group not sufficient?
├── Generic error with same stack trace but different root causes
│   → Override fingerprint with distinguishing key: `["{{ default }}", error.domain]`
│   Example: "NetworkError" for "api.orders" vs "api.payments" grouped separately
├── Crash in shared library code (third-party SDK)
│   → Prefix fingerprint with library name: `["sdk_name", "{{ default }}"]`
│   So you can filter out known third-party issues
├── Non-fatal errors that should group with crashes
│   → Set same fingerprint as the crash type they lead to
│   Example: "login_validation_error" → same group as "login_crash"
└── Environment-specific crashes (device model, OS version)
    → Add device fingerprint to grouping: `["{{ default }}", device_model]`
    → Identify device-specific regressions quickly
```

### Log Levels & Breadcrumb Strategy
```
Breadcrumb level usage:
├── debug → Development-only, filtered in production
│   Sensor readings, raw data dumps, frame-by-frame state
├── info → Normal user flow, always tracked
│   Screen views, button taps, API calls started
├── warning → Recoverable issues, degraded experience
│   API retry, cache miss, slow operation (>2s)
│   Important for understanding crash context
└── error → Always captured, attached to every crash
    Unhandled exceptions, assertion failures, data corruption
    Never filtered — always part of the breadcrumb trail
```

Maximum breadcrumbs: 200 (ring buffer). When 201st is added, oldest is dropped. Prioritize: errors > warnings > info > debug. If buffer is full, drop oldest debug first, then info, never errors.

## Session Replay & Event Debugging

Session replay (Sentry Replay, Datadog Session Replay) records user interactions leading up to a crash. Implementation: (a) record canvas/snapshot diffs at 1fps (not full video — too large), (b) capture DOM mutations (Flutter: widget tree diffs, React Native: virtual DOM events), (c) mask sensitive fields (input values, PII fields) automatically, (d) on crash, attach the replay buffer to the crash event, (e) upload replay after crash or at session end. Privacy: never record passwords, credit card fields, or personal messages. Mask all text input fields by default, allow opt-in recording for specified screens. Replay storage: 7-30 days retention, ~1MB per session. Bandwidth: upload replay asynchronously after session ends, not in real-time. Budget: cap replay storage at 100MB per device, oldest-delete when full.

## Production Considerations

### Crash Reporting Failure Modes

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| SDK init crash | App crash loop on launch | Wrap init in try/catch, delay to background thread |
| dSYM/sourcemap not uploaded | Unsymbolicated stacks | CI must upload symbols every build — catch in CI |
| Event queue lost on crash | Last crash before event flush | Synchronous flush on crash handler |
| Breadcrumb buffer overflow | Old breadcrumbs overwritten | Set max 200 breadcrumbs, use ring buffer |
| Rate limited by provider | Events dropped | Queue locally, retry with backoff |
| Debug events in production | Noise in dashboard | Use `environment` tag, filter debug builds |

### Troubleshooting Checklist

- Verify crash appears in provider dashboard within 5 minutes of app launch after crash
- Check symbolication status: unsymbolicated stack → missing dSYM/sourcemap
- Validate SDK init happens before any potential crash source
- Confirm non-fatal errors include context: screen, action, state
- Verify breadcrumbs show user actions leading to crash
- Test crash on real device — simulator may not symbolicate correctly
- Check release health dashboard after deployment
- Verify alert thresholds set: crash-free rate <99.5%, error rate >5%
- Confirm panic/native crash handlers are initialized (Flutter/RN)
- Validate ProGuard/R8 mapping uploaded for Android release build

### CI/CD Symbol Upload Automation

```yaml
# .github/workflows/symbols.yml
name: Upload Symbols

on:
  release:
    types: [published]

jobs:
  upload-dsym:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Upload dSYMs to Sentry
        run: |
          export SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }}
          export SENTRY_ORG=myorg
          export SENTRY_PROJECT=myapp
          sentry-cli upload-dif --include-sources ./build/ios/*.app.dSYM.zip

  upload-mapping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Upload ProGuard mapping
        run: |
          find . -name "mapping.txt" -exec firebase crashlytics:upload:mapping \
            --app=1:123456:android:abc123 {} \;

  upload-sourcemaps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Upload React Native source maps
        run: |
          npx @sentry/react-native-upload \
            --platform android \
            --path ./android/app/build/generated/sourcemaps/react/release/index.android.bundle.map
```

### ANR Detection Implementation (Android)
```kotlin
class ANRDetector {
    private val handler = Handler(Looper.getMainLooper())
    private val watchdog = HandlerThread("anr-watchdog").apply { start() }
    private val watchdogHandler = Handler(watchdog.looper)
    private val TIMEOUT_MS = 5000L
    private var lastPing = 0L
    private var isRunning = false

    fun start() {
        isRunning = true
        watchdogHandler.post(checkRunnable)
        handler.post(pingRunnable)
    }

    fun stop() {
        isRunning = false
        watchdogHandler.removeCallbacks(checkRunnable)
        handler.removeCallbacks(pingRunnable)
    }

    private val pingRunnable = Runnable {
        lastPing = System.currentTimeMillis()
        handler.postDelayed(this, 2000) // ping every 2s
    }

    private val checkRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            val elapsed = System.currentTimeMillis() - lastPing
            if (elapsed > TIMEOUT_MS) {
                // Main thread blocked >5s
                Sentry.captureMessage("ANR detected: main thread blocked ${elapsed}ms")
            }
            watchdogHandler.postDelayed(this, TIMEOUT_MS)
        }
    }
}
```

## Rules (Additional)

- ANR detection must be enabled for Android builds targeting API 30+
- OOM detection must log memory pressure breadcrumbs (iOS: `didReceiveMemoryWarning`)
- Always attach user context to crashes: user ID, app version, OS version, device model
- Breadcrumbs must include timestamp, category, and level for each event
- Non-fatal errors must include stack trace and relevant local state
- Session replay must mask all input fields by default
- Crash reporting SDK must be initialized synchronously on app launch (not delayed async)
- Symbol upload must fail CI build if missing — unsymbolicated crashes are useless
- Release health must be monitored for 48h after every deployment
- Crash alert must page on-call engineer within 5 minutes of significant spike

### Crash Reporting Anti-Patterns

- **Initializing crash SDK after other SDKs**: Crash in a third-party SDK before crash reporting is initialized = crash lost. Initialize crash reporting as the very first line of `application:didFinishLaunching`.
- **Not testing crash reporting before release**: Crash reporting "works" in debug but fails in production (missing dSYM, different build config). Test crash on TestFlight/internal track build before production release.
- **Logging sensitive data in breadcrumbs**: Breadcrumbs containing passwords, credit card numbers, or auth tokens are uploaded to crash servers. Audit breadcrumb data regularly.
- **Too many breadcrumbs**: Setting max breadcrumbs to 1000 creates memory overhead. 200 is sufficient for crash context — any more is noise.
- **Ignoring native crashes in cross-platform apps**: Flutter/React Native crash reporting often captures only the framework layer. Configure native crash handlers (iOS/Android) separately for full coverage.
- **Setting `tracesSampleRate` too high**: Performance tracing at 100% sample rate creates significant overhead. 10-20% is sufficient for most apps. Only increase for targeted debugging.
- **Not filtering test device crashes**: Developers' test devices submit crashes to production dashboard, polluting crash-free rate. Filter by test device IDs or debug build flag.
- **Debug logs level in production**: `SentryLogLevel.debug` in production writes verbose log output to device console. Use `.error` or disable in production builds.
- **Forgetting bitcode dSYM upload**: Apps with bitcode enabled (iOS) have dSYMs regenerated by Apple after submission. Must upload these post-upload dSYMs separately via Xcode or CI.

### Crash Report Diagnostic: Reading Stack Traces

When analyzing a crash report, follow this decision tree:
```
Stack trace available?
├── Symbolicated → Focus on the top frame in app code
│   Look for: null pointer, index out of bounds, force unwrap
├── Unsymbolicated → Missing dSYM or source map — upload immediately
│   Unsymbolicated: thread_0, 0x1045238a0 — useless for debugging
└── Partial symbolication → Some frames resolved, some not
    Check: main binary + system libraries resolved, framework not
```
For each frame: (1) identify if it's your code or system/library code, (2) if your code, check the file:line for recent changes, (3) if library code, check for version mismatch or known issues. Look for the last frame in your code before the crash — that's the likely source.

### Advanced: Custom Crash Handler for Uncaught Exceptions

```swift
// iOS — NSSetUncaughtExceptionHandler
NSSetUncaughtExceptionHandler { exception in
    let breadcrumbs = BreadcrumbCollector.shared.collect()
    let context = CrashContext(
        exception: exception,
        breadcrumbs: breadcrumbs,
        memoryPressure: MemoryPressureMonitor.lastReading(),
        timestamp: Date()
    )
    // Save crash report to local storage before app terminates
    CrashReportPersister.shared.save(context)
    // Attempt synchronous flush to server
    SentrySDK.capture(error: exception)
    SentrySDK.flush(timeout: 2.0)
}
```

```kotlin
// Android — UncaughtExceptionHandler
class CustomExceptionHandler(
    private val defaultHandler: Thread.UncaughtExceptionHandler?
) : Thread.UncaughtExceptionHandler {
    override fun uncaughtException(thread: Thread, throwable: Throwable) {
        val breadcrumbs = BreadcrumbManager.getAll()
        val context = mapOf(
            "breadcrumbs" to breadcrumbs,
            "memory" to MemoryUtil.getUsage(),
            "thread" to thread.name
        )
        FirebaseCrashlytics.getInstance().apply {
            setCustomKeys(context)
            recordException(throwable)
            sendUnsentReports()
        }
        defaultHandler?.uncaughtException(thread, throwable)
    }
}

// Install in Application.onCreate()
Thread.setDefaultUncaughtExceptionHandler(
    CustomExceptionHandler(Thread.getDefaultUncaughtExceptionHandler())
)
```

## References
  - references/breadcrumbs.md — Breadcrumbs
  - references/crash-analysis-workflow.md — Crash Analysis Workflow
  - references/crash-reporting-architecture.md — Crash Reporting Architecture
  - references/crashlytics-setup.md — Crashlytics Setup
  - references/sentry-setup.md — Sentry Setup
  - references/symbolication.md — Symbolication
  - references/crash-reporting-fundamentals.md — Crash Reporting Fundamentals
  - references/crash-reporting-advanced.md — Advanced Crash Reporting
  - references/crash-reporting-ci.md — Crash Reporting CI/CD Integration

## Handoff
No further handoff. Crash reporting is self-contained after initial setup.
