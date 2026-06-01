# Advanced Crash Reporting

## Custom Event Grouping

### Sentry Fingerprinting
Override default grouping to group related issues:

```typescript
// Group network errors by endpoint, not error message
Sentry.withScope((scope) => {
    scope.setFingerprint(['network-error', endpoint]);
    Sentry.captureException(error);
});

// Group by error code
scope.setFingerprint(['{{ default }}', error.code.toString()]);

// Split crashes by environment
scope.setFingerprint(['{{ default }}', '{{ machine }}']);  // environment-specific

// Custom grouping for generic errors
scope.setFingerprint(['auth-error', authError.type]);
```

### Crashlytics Custom Keys
```swift
// Distinguish crashes with custom keys
Crashlytics.crashlytics().setCustomValue(endpoint, forKey: "api_endpoint")
Crashlytics.crashlytics().setCustomValue(errorCode, forKey: "error_code")
// Filter in Crashlytics dashboard by these keys
```

## Session Replay

### Sentry Replay Configuration
```typescript
Sentry.init({
    dsn: 'https://key@o123.ingest.sentry.io/456',
    replaysSessionSampleRate: 0.1,     // Record 10% of all sessions
    replaysOnErrorSampleRate: 1.0,     // Record 100% of sessions with errors
});
```

### Privacy Configuration
```typescript
Sentry.replay.maskAllText = true;     // Mask all text by default
Sentry.replay.maskAllInputs = true;   // Mask all input fields
Sentry.replay.blockAllMedia = false;  // Allow images

// Per-element opt-out
// <div data-sentry-unmask>Not masked</div>
// <div data-sentry-block>Blocked from replay</div>
```

### Replay Lifecycle
1. Session starts -> begin recording canvas diffs at 1fps
2. User interacts -> capture DOM mutations / widget tree changes
3. Error occurs -> attach replay buffer to error event
4. Session ends (normal) -> upload replay asynchronously
5. Replay storage: 7-30 days, ~1MB per session

## ANR & OOM Handling

### Android ANR Detection (Firebase)
```kotlin
// Monitor ANRs via Firebase Performance
val myTrace = Firebase.performace.newTrace("anr_monitor")
myTrace.start()

val handler = Handler(Looper.getMainLooper())
val anrWatchdog = HandlerThread("anr-watchdog").apply { start() }
val watchdogHandler = Handler(anrWatchdog.looper)

watchdogHandler.post(object : Runnable {
    var lastReported = 0L

    override fun run() {
        handler.post {
            lastReported = System.currentTimeMillis()
        }

        val now = System.currentTimeMillis()
        if (now - lastReported > 5000) {
            // Main thread blocked >5s
            dumpMainThreadStack()
            FirebaseCrashlytics.getInstance().recordException(
                ANRException("Main thread blocked ${now - lastReported}ms")
            )
        }
        watchdogHandler.postDelayed(this, 5000)
    }
})
```

### iOS OOM Detection
```swift
// Detect likely OOM on next launch
class OOMDetector {
    static func detectPreviousOOM() {
        let wasPreviousTerminationNormal = UserDefaults.standard.bool(forKey: "normal_termination")
        let wasCrashed = UserDefaults.standard.bool(forKey: "crashed_last_launch")

        if !wasPreviousTerminationNormal && !wasCrashed {
            SentrySDK.capture(message: "Likely OOM detected") { scope in
                scope.setTag(value: "oom", key: "error_type")
            }
        }
    }

    static func markNormalTermination() {
        UserDefaults.standard.set(true, forKey: "normal_termination")
    }

    static func markCrashDetected() {
        UserDefaults.standard.set(true, forKey: "crashed_last_launch")
    }
}

// In AppDelegate:
func applicationDidEnterBackground(_ application: UIApplication) {
    OOMDetector.markNormalTermination()
}

// In Crashlytics/Sentry callback:
// OOMDetector.markCrashDetected()
```

## Performance Tracing Integration

### Custom Spans
```swift
let transaction = SentrySDK.startTransaction(
    name: "checkout-flow",
    operation: "ui.loading",
    bindToScope: true
)

let span = transaction.startChild(operation: "network.request", description: "POST /api/checkout")
// ... make network request ...
span.finish()

transaction.finish()
```

```kotlin
val transaction = Sentry.startTransaction("checkout-flow", "ui.loading")
val span = transaction.startChild("network.request", "POST /api/checkout")
// ... network call ...
span.finish()
transaction.finish()
```

### Mobile Vitals Metrics
| Metric | Source | Target |
|--------|--------|--------|
| App start time | Sentry/Instruments | <2s cold start |
| Frame rate | Sentry mobile vitals | >55fps sustained |
| Frame delay | Sentry mobile vitals | <16ms per frame |
| Slow/frozen frames | Sentry mobile vitals | <5% slow frames |
| ANR rate | Firebase/Custom | <0.1% |
| Memory usage | Xcode/Android Profiler | <200MB steady |
| Disk writes | Instruments | <1MB/s sustained |

## Crash Alerting Strategy

### Tiered Alerting
| Severity | Example | Alert Channel | Response Time |
|----------|---------|---------------|---------------|
| P0 | 100% crash on launch | Phone call, PagerDuty | <5 min |
| P1 | >5% crash rate for version | Slack @on-call, PagerDuty | <30 min |
| P2 | >0.5% crash rate increase | Slack channel | <4 hours |
| P3 | Single user crash, no pattern | Jira ticket | Next business day |

### Alert Rules (Sentry)
```
if crash_free_rate < 99.5% → P2 alert
if crash_free_rate < 99.0% → P1 alert
if crash_free_rate < 98.0% AND version == latest → P0 alert
if error_rate > 5% AND event_count > 100 → P2 alert
if new_issue_count > 10 in 24h → review PR
if same_issue affected_users > 1000 → P1 alert
```

## Debug Build Filtering

```swift
// Disable crash reporting in debug builds
#if DEBUG
    // Don't start Sentry/Crashlytics
#else
    SentrySDK.start { ... }
#endif
```

```kotlin
// Android — check BuildConfig
if (!BuildConfig.DEBUG) {
    FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(true)
}
```

```dart
// Flutter — check kDebugMode
if (!kDebugMode) {
    await SentryFlutter.init(...);
}
```

## CI/CD Crash Verification

```yaml
# .github/workflows/crash-test.yml
jobs:
  verify-symbolication:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build with debug symbols
        run: xcodebuild -scheme App -configuration Release -sdk iphoneos
      - name: Verify dSYM exists
        run: |
          dsym_count=$(find . -name "*.dSYM" | wc -l)
          if [ "$dsym_count" -eq 0 ]; then
            echo "No dSYM files found — symbolication will fail"
            exit 1
          fi
      - name: Upload to Sentry
        run: sentry-cli upload-dif --include-sources ./build/Release-iphoneos/
```
