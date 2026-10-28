# CPU Profiling on Mobile

Finding where CPU time goes on Android and iOS: sampling vs. tracing, the tools, how to read flame charts, and how to add custom trace sections.

## Sampling vs. Instrumentation

| Approach | How | Overhead | Use for |
|---|---|---|---|
| Sampling (callstack sampling) | Periodically captures stacks | Low; timing realistic | Finding hot functions in release-like builds |
| Method tracing (instrumented) | Records every method entry/exit | High; inflates small methods | Exact call counts, short scenarios only |
| System tracing | Kernel scheduler + app trace sections | Low | Thread states, contention, frame timing, I/O waits |

Default to system trace + sampling. Use method tracing only to answer "how many times is this called".

## Android Tools

### Android Studio Profiler
- Tasks: "Find CPU Hotspots" (callstack sample), "Capture System Activities" (Perfetto system trace), Java/Kotlin method trace.
- Profile a `profileable` release build, not debug: debug builds disable ART optimizations.

```xml
<!-- AndroidManifest.xml of release build used for profiling -->
<application>
  <profileable android:shell="true" tools:targetApi="29" />
</application>
```

### Perfetto from the command line
```bash
# Record 10 s system trace with scheduling, frequency, and app trace sections
adb shell perfetto -o /data/misc/perfetto-traces/trace.pftrace -t 10s \
  sched freq idle am wm gfx view binder_driver hal dalvik input res memory
adb pull /data/misc/perfetto-traces/trace.pftrace
# open in https://ui.perfetto.dev
```
Perfetto UI tips: pin the app's main thread and RenderThread; look at thread state (Running, Runnable, Sleeping, Uninterruptible Sleep = I/O); use SQL queries for aggregates.

```sql
-- Longest slices on the main thread
SELECT s.name, s.dur / 1e6 AS ms
FROM slice s JOIN thread_track tt ON s.track_id = tt.id
JOIN thread t USING (utid)
WHERE t.is_main_thread = 1
ORDER BY s.dur DESC LIMIT 20;
```

### simpleperf (native and Java sampling)
```bash
# Requires profileable/debuggable app
adb shell simpleperf record --app com.example.app -g --duration 10 -o /data/local/tmp/perf.data
adb pull /data/local/tmp/perf.data
# Use the NDK scripts to produce a report or flame graph
python ndk/simpleperf/report_html.py -i perf.data
```

### Custom trace sections
```kotlin
import androidx.tracing.trace

fun parseFeed(json: String): Feed = trace("Feed.parse") {
  decoder.decode(json)
}
// Async work spanning threads:
// Trace.beginAsyncSection("upload", cookie) / Trace.endAsyncSection("upload", cookie)
```
Sections appear in Perfetto and Macrobenchmark `TraceSectionMetric`.

## iOS Tools

### Instruments
| Template | Shows |
|---|---|
| Time Profiler | Sampled call stacks per thread |
| CPU Profiler | Cycle-accurate sampling using CPU counters |
| System Trace | Thread states, system calls, VM faults, context switches |
| Hangs / Animation Hitches | Main-thread hangs and frame hitches |
| Swift Concurrency | Task creation, suspension, actor contention |

Profile with the Release configuration on a device (Product > Profile). Turn on "Invert Call Tree" and "Hide System Libraries" to find your own hot code, then turn them off to understand context.

```bash
# Command line recording
xcrun xctrace record --template 'Time Profiler' --device <UDID> \
  --launch -- /path/to/App.app --time-limit 15s --output run.trace
```

### Signposts
```swift
import os

let signposter = OSSignposter(subsystem: "com.example.app", category: .pointsOfInterest)

func parseFeed(_ data: Data) throws -> Feed {
  let state = signposter.beginInterval("Feed.parse")
  defer { signposter.endInterval("Feed.parse", state) }
  return try JSONDecoder().decode(Feed.self, from: data)
}
```
Signposts appear in Instruments "Points of Interest" and can be used by `XCTOSSignpostMetric` in performance tests.

## Reading a Flame Chart

```
Main thread
|----------------------- Choreographer#doFrame 42 ms -------------------------|
|-- traversal 38 ms ----------------------------------------------|-- anim --|
|-- RecyclerView onLayout 35 ms ----------------------------------|
|-- onBindViewHolder x 12 ------------------------------|
|-- DateFormatter.format 22 ms (allocates per bind) --|
```
- Width = time; look for wide frames whose own (self) time is large.
- Repeated narrow towers usually indicate per-item work that can be cached or moved off-thread.
- Runnable (waiting for CPU) or sleeping time means the issue is contention or I/O, not code speed.

## Typical CPU Hotspots

| Hotspot | Fix |
|---|---|
| Object creation in bind/draw (formatters, regex, paints) | Create once, reuse |
| JSON parsing on main thread | Parse on Default dispatcher / background task; use code-generated adapters |
| Bitmap decode/scale on main | Image libraries (Coil, Glide, Kingfisher/Nuke) with downsampling |
| Excessive recomposition / SwiftUI body re-evaluation | Stable state, smaller observable scopes |
| Reflection-based DI or serialization at startup | Code generation (Hilt/KSP, kotlinx.serialization) |
| Logging in hot paths | Strip verbose logs from release |
| Lock contention | Narrow critical sections; immutable data |

## Workflow
1. Reproduce with a scripted journey on a mid/low-end device.
2. Capture a system trace first to classify the problem (CPU, I/O, lock, GPU).
3. Sample the hot thread; identify top self-time functions.
4. Add trace sections/signposts around suspects; re-measure.
5. Fix, then lock in with a benchmark (Macrobenchmark / XCTest metrics).

## Pitfalls
- Profiling debug builds (Android interpreter/JIT behavior, iOS `-Onone`).
- Method tracing overhead making small methods look expensive.
- Thermal throttling during long sessions; let the device cool and compare like with like.
- Single runs; always compare medians over several iterations.

## Checklist
- [ ] Profiling build is release-optimized and profileable
- [ ] System trace captured before micro-optimizing
- [ ] Custom sections/signposts on critical paths
- [ ] Fix verified with a benchmark, not a single trace
