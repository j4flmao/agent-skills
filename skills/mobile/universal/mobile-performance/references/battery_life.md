# Battery Life and Energy Efficiency

What drains battery on mobile devices, the OS rules that limit background work, and how to measure energy use on Android and iOS.

## Main Energy Consumers

| Consumer | Typical cause in apps | Mitigation |
|---|---|---|
| CPU | Busy loops, polling, heavy parsing, excessive recomposition/layout | Event-driven work, batching, caching results |
| Radio (cellular/Wi-Fi) | Many small requests; each wakes the radio and keeps it in a high-power state for a tail period | Batch and prefetch, push instead of poll, compress payloads |
| GPS / location | High-accuracy continuous updates | Lower accuracy, larger interval, geofences, significant-change updates |
| Screen / GPU | Bright UI, unnecessary animations, high frame rates | Dark themes on OLED, stop animations off-screen, adaptive frame rate |
| Wake locks / background execution | Holding the CPU awake | Use WorkManager / BGTaskScheduler with constraints |
| Sensors / Bluetooth | Continuous scanning | Batched sensor events, scan filters, duty cycling |

## Android Rules for Background Work

| Mechanism | Since | Effect |
|---|---|---|
| Doze | Android 6 | Defers jobs, alarms, network when device idle; maintenance windows |
| App Standby Buckets | Android 9 | Active, Working set, Frequent, Rare, Restricted (Android 12) limit jobs and alarms by recent usage |
| Background execution limits | Android 8 | No background services started from background; implicit broadcast limits |
| Exact alarm permission | Android 12 (`SCHEDULE_EXACT_ALARM`), not pre-granted for most apps on Android 14+ | Use inexact alarms or WorkManager unless the app is a clock/calendar |
| Foreground service types | Android 14 | Type must be declared and match a permission |
| Background location | Android 10+ | Separate `ACCESS_BACKGROUND_LOCATION` grant |

### Prefer WorkManager with Constraints
```kotlin
val sync = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
  .setConstraints(
    Constraints.Builder()
      .setRequiredNetworkType(NetworkType.UNMETERED)
      .setRequiresBatteryNotLow(true)
      .setRequiresCharging(false)
      .build()
  )
  .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
  .build()

WorkManager.getInstance(context)
  .enqueueUniquePeriodicWork("sync", ExistingPeriodicWorkPolicy.KEEP, sync)
```
Minimum periodic interval is 15 minutes; the OS may delay further under Doze and standby buckets.

### Wake Locks
```kotlin
val wl = (getSystemService(POWER_SERVICE) as PowerManager)
  .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "app:upload")
wl.acquire(10 * 60 * 1000L)      // always pass a timeout
try { uploadChunk() } finally { if (wl.isHeld) wl.release() }
```
Prefer not to hold wake locks at all; WorkManager holds one for you while a worker runs. Android vitals reports apps with stuck or excessive partial wake locks, which can affect Play visibility.

### Location
```kotlin
val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 60_000)
  .setMinUpdateIntervalMillis(30_000)
  .setMaxUpdateDelayMillis(5 * 60_000)   // batch deliveries
  .build()
```

## iOS Rules for Background Work

| Mechanism | Use |
|---|---|
| `BGAppRefreshTask` | Short refresh (about 30 s) scheduled opportunistically by the system |
| `BGProcessingTask` | Longer maintenance; can require power and network (`requiresExternalPower`, `requiresNetworkConnectivity`) |
| Background `URLSession` | Uploads/downloads continue while suspended; system schedules them (`isDiscretionary`) |
| Silent push (`content-available`) | Throttled by the system; not guaranteed |
| Location | Significant-change service, region monitoring, `CLLocationUpdate.liveUpdates` with appropriate activity type |
| Low Power Mode | Check `ProcessInfo.processInfo.isLowPowerModeEnabled` and observe `NSProcessInfoPowerStateDidChange` |

```swift
import BackgroundTasks

BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.example.refresh", using: nil) { task in
  let op = Task {
    await FeedStore.shared.refresh()
    task.setTaskCompleted(success: true)
  }
  task.expirationHandler = { op.cancel() }
  scheduleRefresh()
}

func scheduleRefresh() {
  let req = BGAppRefreshTaskRequest(identifier: "com.example.refresh")
  req.earliestBeginDate = Date(timeIntervalSinceNow: 2 * 60 * 60)
  try? BGTaskScheduler.shared.submit(req)
}
```
Identifiers must be listed in `BGTaskSchedulerPermittedIdentifiers` in Info.plist.

```swift
let config = URLSessionConfiguration.background(withIdentifier: "com.example.upload")
config.isDiscretionary = true                 // let the system pick a good time
config.allowsConstrainedNetworkAccess = false // respect Low Data Mode
```

## Network Energy Patterns
- Batch analytics and logs; flush on app background or when on Wi-Fi.
- Use push notifications instead of polling.
- Prefetch content on unmetered networks while charging.
- Keep one HTTP/2 or HTTP/3 connection rather than many short connections.

## UI Energy Patterns
- Stop animations, video and timers when the view is not visible (`onPause`, `repeatOnLifecycle`, `scenePhase`).
- Request high refresh rates only for interactive animations (`CADisplayLink.preferredFrameRateRange`, Android `Surface.setFrameRate`).
- Avoid infinite Lottie or shimmer loops on static screens.

## Measuring Energy

| Tool | Platform | What it shows |
|---|---|---|
| Android Studio Power Profiler | Android (devices with ODPM, e.g. Pixel 6+) | Per-rail power consumption with CPU/network timeline |
| Perfetto with power rails / battery counters | Android | System-wide traces with energy counters |
| `adb shell dumpsys batterystats` | Android | Wake locks, alarms, jobs per UID |
| Android vitals (Play Console) | Android | Field wake-lock and background issues |
| Xcode Energy gauge / Instruments Power Profiler | iOS | CPU, network, location, display overhead |
| MetricKit `MXCPUMetric`, `MXCPUExceptionDiagnostic`, `MXDiskWriteExceptionDiagnostic` | iOS | Field CPU and disk-write exceptions |
| Xcode Organizer Energy | iOS | Aggregated energy reports from users |

```bash
adb shell dumpsys batterystats --reset
# exercise the app for a fixed scenario
adb shell dumpsys batterystats --charged com.example.app > stats.txt
adb shell cmd appops get com.example.app   # check background permissions
adb shell am set-standby-bucket com.example.app rare   # test restricted behavior
adb shell dumpsys deviceidle force-idle               # simulate Doze
```

## Pitfalls
- Polling every few seconds "only while the app is open", then leaking the timer into background.
- Retrying failed requests in tight loops without backoff.
- Foreground services used to keep the app alive without a user-visible reason.
- High-accuracy location for features that only need city level.
- Testing only on charging devices connected to a debugger.

## Checklist
- [ ] Background work uses WorkManager / BGTaskScheduler with constraints
- [ ] Every wake lock has a timeout and is released in `finally`
- [ ] No polling where push or sync-on-open works
- [ ] Location accuracy and interval justified per feature
- [ ] Energy measured for key journeys on a real device
- [ ] Field metrics (vitals, MetricKit) monitored after releases
