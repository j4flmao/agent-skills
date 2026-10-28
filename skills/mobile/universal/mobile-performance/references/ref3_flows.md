# Mobile Performance Investigation Flows

Step-by-step triage flows for the most common mobile performance problems: slow startup, jank, ANRs/hangs, memory terminations, battery complaints and slow network screens. Each flow goes from symptom to evidence to fix to verification.

## General Loop

```
Signal (field metric, review, CI alert)
  -> Reproduce on a reference device with a release-like build
  -> Classify with a system trace (CPU? I/O? lock? GPU? network?)
  -> Narrow with sampling/profilers and custom trace sections
  -> Fix the root cause
  -> Verify with a benchmark (median of several runs) and add a regression guard
  -> Confirm in field data after rollout
```

## Flow 1: Slow Startup

1. **Confirm**: Android vitals slow cold start or MetricKit launch histogram shifted; note app version where it started.
2. **Reproduce**: `adb shell am start-activity -W -S <pkg>/<activity>` several times, or Macrobenchmark `StartupTimingMetric`; iOS Instruments App Launch.
3. **Classify** (Perfetto / App Launch timeline):
   - Time before `Application.onCreate` or before `main`: content providers, dyld, static initializers.
   - In `Application.onCreate` / `didFinishLaunching`: SDK init, DI graph, disk reads.
   - Between Activity create and first frame: layout inflation, first composition, synchronous data load.
4. **Common causes by version diff**: new SDK added, new ContentProvider via a library, new framework, Baseline Profile missing/outdated, main-thread database migration.
5. **Fix**: defer or lazy-init, move I/O off main, regenerate Baseline Profile, reduce frameworks.
6. **Verify**: startup benchmark median back within budget; StrictMode clean.

## Flow 2: Scroll Jank / Hitches

1. **Confirm**: JankStats / FrameTimingMetric / hitch rate up on a specific screen.
2. **Trace**: Perfetto (Android) Actual Timeline marks janky frames; Instruments Animation Hitches (iOS) says commit vs. render.
3. **Classify the late frame**:

| Where the time is | Typical cause | Next step |
|---|---|---|
| UI thread in bind/compose/body | Per-item allocations, formatting, image decode | Cache, precompute in ViewModel, async decode |
| UI thread in measure/layout | Deep hierarchies, nested weights, self-sizing churn | Flatten, fixed sizes, stable keys |
| Recomposition / body re-evaluation each frame | State read too early, unstable params, broad observation | Lambda modifiers, `derivedStateOf`, `@Observable` |
| RenderThread / render server | Overdraw, offscreen passes, large textures | Remove layers, shadow paths, downsample |
| Thread runnable but not running | CPU contention from background work | Lower priority, defer background tasks |
| First scroll only | JIT / shader compilation | Baseline Profile, shader warm-up |

4. **Verify**: frame metric percentiles in benchmark; visually confirm on 120 Hz device.

## Flow 3: ANR (Android) / Hang (iOS)

1. **Collect**: Play Console ANR clusters with main-thread stack; `ApplicationExitInfo.getTraceInputStream()` for ANR traces in-app; MetricKit `MXHangDiagnostic` call stacks; Xcode Organizer Hangs.
2. **Read the main-thread stack**:
   - Blocked in I/O (`SharedPreferences.commit`, SQLite, file read) → move off main.
   - Waiting on a lock/monitor held by a background thread → find the holder thread in the same trace; shorten critical section or avoid sharing.
   - Binder/IPC call to system service or another process → make async, cache result.
   - `runBlocking`, `DispatchSemaphore.wait`, `DispatchQueue.main.sync` → remove synchronous bridging.
   - Busy CPU loop → profile and optimize or move off main.
3. **Reproduce** with StrictMode penalties (`penaltyDeath` in debug) or iOS Main Thread Checker and the Hangs instrument.
4. **Verify**: ANR rate / hang rate per version during staged rollout.

## Flow 4: Out-of-Memory / Memory Terminations

1. **Signal**: `OutOfMemoryError` crashes; `ApplicationExitInfo` with `REASON_LOW_MEMORY`; MetricKit exit metrics for memory limit; increase in background terminations.
2. **Reproduce**: repeat journey N times on a low-RAM device; watch `dumpsys meminfo` / Xcode memory gauge.
3. **Classify**:
   - Monotonic growth across iterations → leak (LeakCanary trace, Memory Graph).
   - Spikes on specific screens → large bitmaps, unbounded lists, big JSON parsed at once.
   - High steady baseline → too many SDKs, caches sized too large, duplicated image caches.
4. **Fix**: break reference cycles, downsample images, stream/paginate parsing, bound caches, respond to trim/memory warnings.
5. **Verify**: heap after N iterations stable; peak memory within budget.

## Flow 5: Battery Complaints

1. **Signal**: reviews, Android vitals wake-lock/background warnings, Xcode Organizer energy reports.
2. **Measure**: `dumpsys batterystats` per UID; Android Studio Power Profiler; Instruments Power Profiler / Energy Log.
3. **Look for**: wake locks without timeouts, periodic jobs too frequent, location updates at high accuracy, polling timers alive in background, retries without backoff, animations running off-screen.
4. **Fix**: constraints on WorkManager/BGTask, push instead of poll, batch network, stop work on background.
5. **Verify**: same scripted scenario shows lower power and fewer wakeups.

## Flow 6: Slow Screen Due to Network

1. **Measure phases**: OkHttp `EventListener` or `URLSessionTaskMetrics` for DNS/connect/TLS/TTFB/download.
2. **Classify**:
   - Many sequential requests (waterfall) → parallelize or aggregate endpoint.
   - Large payload → pagination, field selection, compression.
   - New connection per request → shared client/session, HTTP/2 or HTTP/3.
   - Server time dominant → backend issue; hand over with trace IDs.
3. **UX mitigation**: render cached data immediately, skeletons only for truly new data, prefetch next screen data.
4. **Verify** under throttled network profiles.

## Regression Bisecting

```bash
# Benchmarks per commit range (Android example)
git bisect start <bad> <good>
git bisect run ./scripts/run-startup-benchmark.sh --threshold-ms 800
```
The script should build a release-like variant, install on the same device, run several iterations, and exit non-zero if the median exceeds the threshold. Keep the device charged, cool, and with the same OS build.

## Hand-off Template
```
Symptom: <metric, screen, versions affected, device tiers>
Evidence: <trace files, benchmark numbers before/after>
Root cause: <one sentence>
Fix: <PR link>
Guard: <benchmark/test name and threshold>
Field check: <date and metric after rollout>
```

## Checklist
- [ ] Every investigation starts with a reproducible scenario on a reference device
- [ ] Classification done from a system trace before code changes
- [ ] Fix verified by benchmark medians, not single runs
- [ ] Regression guard added to CI
- [ ] Field metric checked after the release
