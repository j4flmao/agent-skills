# Platform Performance APIs Reference

The APIs apps call to measure and report performance on Android and iOS, with minimum OS versions and short usage examples. Tooling (profilers) and test frameworks are covered in sibling references.

## Android

| API | Package / artifact | Min API | Purpose |
|---|---|---|---|
| `androidx.tracing.trace {}` / `Trace.beginSection` | `androidx.tracing:tracing-ktx` / `android.os.Trace` | 18 | Custom sections in system traces |
| `Trace.beginAsyncSection` | `android.os.Trace` | 29 | Async spans across threads |
| `Activity.reportFullyDrawn()` / `ReportDrawnWhen` | framework / `androidx.activity` | 19 | Time to full display |
| `FrameMetrics` / `Window.addOnFrameMetricsAvailableListener` | framework | 24 | Per-frame stage durations |
| `JankStats` | `androidx.metrics:metrics-performance` | 16 (best on 24+) | Per-frame jank with UI state tags |
| `ApplicationExitInfo` (`getHistoricalProcessExitReasons`) | framework | 30 | Why the process died (ANR, crash, low memory) |
| `ApplicationStartInfo` (`getHistoricalProcessStartReasons`) | framework | 35 | Start type, reason, startup timestamps |
| `StrictMode` | framework | 9 | Detect main-thread I/O, leaks of closables |
| `PowerManager.getThermalHeadroom` / `addThermalStatusListener` | framework | 30 / 29 | Thermal state for adaptive quality |
| `ActivityManager.isLowRamDevice`, `memoryClass` | framework | 19 / 5 | Device tier decisions |
| `ComponentCallbacks2.onTrimMemory` | framework | 14 | Memory pressure |
| `PerformanceHintManager` | framework | 31 | Hint target work duration for game/render threads |
| `ProfilingManager` | framework | 35 | Request heap dumps / traces / stack samples in production with rate limiting |

### Exit reasons
```kotlin
val am = context.getSystemService(ActivityManager::class.java)
am.getHistoricalProcessExitReasons(context.packageName, 0, 10).forEach { info ->
  when (info.reason) {
    ApplicationExitInfo.REASON_ANR -> report("anr", info.timestamp, info.traceInputStream?.bufferedReader()?.readText())
    ApplicationExitInfo.REASON_LOW_MEMORY -> report("lmk", info.timestamp, "pss=${info.pss}kB")
    ApplicationExitInfo.REASON_CRASH_NATIVE -> report("native_crash", info.timestamp, null)
    else -> Unit
  }
}
```
Persist the last processed timestamp to avoid reporting the same exit twice.

### Startup info (Android 15+)
```kotlin
if (Build.VERSION.SDK_INT >= 35) {
  val am = getSystemService(ActivityManager::class.java)
  am.addApplicationStartInfoCompletionListener(mainExecutor) { info ->
    val ts = info.startupTimestamps
    val launch = ts[ApplicationStartInfo.START_TIMESTAMP_LAUNCH]
    val firstFrame = ts[ApplicationStartInfo.START_TIMESTAMP_FIRST_FRAME]
    if (launch != null && firstFrame != null) {
      metrics.record("ttid_ms", (firstFrame - launch) / 1_000_000, mapOf("type" to info.startType.toString()))
    }
  }
}
```

### Frame metrics
```kotlin
window.addOnFrameMetricsAvailableListener({ _, metrics, _ ->
  val totalMs = metrics.getMetric(FrameMetrics.TOTAL_DURATION) / 1_000_000.0
  val layoutMs = metrics.getMetric(FrameMetrics.LAYOUT_MEASURE_DURATION) / 1_000_000.0
  if (totalMs > 16.7) Log.d("frames", "slow frame total=$totalMs layout=$layoutMs")
}, Handler(Looper.getMainLooper()))
```
In production prefer JankStats, which accounts for the device refresh rate.

### StrictMode policy
```kotlin
StrictMode.setVmPolicy(
  StrictMode.VmPolicy.Builder()
    .detectLeakedClosableObjects()
    .detectActivityLeaks()
    .detectUnsafeIntentLaunch()     // API 31+
    .penaltyLog()
    .build()
)
```

## iOS

| API | Framework | Min iOS | Purpose |
|---|---|---|---|
| `OSSignposter` / `os_signpost` | `os` | 15 / 12 | Intervals and events visible in Instruments |
| `Logger` | `os` | 14 | Low-overhead unified logging |
| `MXMetricManager` / `MXMetricManagerSubscriber` | MetricKit | 13 | Daily aggregated metrics |
| `MXDiagnosticPayload` | MetricKit | 14 (delivered immediately from 15) | Crash, hang, CPU and disk-write exception diagnostics |
| `MXSignpostMetric` (`mxSignpost`) | MetricKit | 13 | Field aggregation of custom signposts |
| `CADisplayLink.preferredFrameRateRange` | QuartzCore | 15 | Request frame rates on ProMotion |
| `ProcessInfo.thermalState`, `isLowPowerModeEnabled` | Foundation | 11 / 9 | Adaptive quality |
| `os_proc_available_memory()` | `os` | 13 | Remaining memory before the limit |
| `URLSessionTaskMetrics` | Foundation | 10 | Per-request timing phases |
| `UIApplication.didReceiveMemoryWarningNotification` | UIKit | 2 | Memory pressure |

### MetricKit subscriber
```swift
import MetricKit

final class MetricsReporter: NSObject, MXMetricManagerSubscriber {
  static let shared = MetricsReporter()
  func start() { MXMetricManager.shared.add(self) }

  func didReceive(_ payloads: [MXMetricPayload]) {
    for p in payloads {
      upload(json: p.jsonRepresentation(), kind: "metrics")
    }
  }

  func didReceive(_ payloads: [MXDiagnosticPayload]) {
    for p in payloads {
      upload(json: p.jsonRepresentation(), kind: "diagnostics")   // hangs, crashes, CPU exceptions
    }
  }

  private func upload(json: Data, kind: String) {
    Task.detached(priority: .background) { try? await Uploader.shared.send(json, kind: kind) }
  }
}
```

### Signposts that MetricKit aggregates
```swift
let log = MXMetricManager.makeLogHandle(category: "Checkout")

func renderCheckout() {
  mxSignpost(.begin, log: log, name: "render")
  defer { mxSignpost(.end, log: log, name: "render") }
  buildCheckoutView()
}
```
Keep the number of MetricKit signpost names small; they are aggregated daily per name.

### Request timing
```swift
final class MetricsDelegate: NSObject, URLSessionTaskDelegate {
  func urlSession(_ s: URLSession, task: URLSessionTask, didFinishCollecting m: URLSessionTaskMetrics) {
    guard let t = m.transactionMetrics.last else { return }
    let ttfb = t.responseStartDate.flatMap { r in t.requestStartDate.map { r.timeIntervalSince($0) } }
    Logger.network.debug("proto=\(t.networkProtocolName ?? "?") reused=\(t.isReusedConnection) ttfb=\(ttfb ?? -1)")
  }
}
```

## Cross-Platform Frameworks
- Flutter: `Timeline.startSync`/`finishSync` (`dart:developer`) for trace events; `SchedulerBinding.instance.addTimingsCallback` for frame timings (`FrameTiming`).
- React Native: `performance.now()` and the `react-native-performance` library; native traces still needed for UI-thread issues.

## Usage Guidelines
- Instrument only meaningful boundaries; too many sections add overhead and noise.
- Never block or allocate heavily in metric callbacks; upload off the main thread in batches.
- Gate verbose instrumentation behind sampling or remote config.
- Check `Build.VERSION.SDK_INT` / `#available` before calling newer APIs.

## Checklist
- [ ] Trace sections on startup and key journeys
- [ ] TTFD reported (`reportFullyDrawn`, signpost)
- [ ] Exit reasons (Android) and MetricKit diagnostics (iOS) collected
- [ ] Frame/jank metrics collected in production with sampling
- [ ] Version checks for every API above the min SDK
