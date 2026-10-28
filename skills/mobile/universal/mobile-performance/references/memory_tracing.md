# Memory Tracing and Leak Detection

Measuring app memory, finding leaks and bloat, and responding to memory pressure on Android and iOS.

## What "Memory" Means

| Metric | Platform | Meaning |
|---|---|---|
| Java/Kotlin heap | Android | Managed objects; limited per app (`ActivityManager.getMemoryClass()`, `largeHeap` raises it) |
| Native heap | Android | malloc'd memory: bitmaps' native buffers (Android 8+), NDK libs, Skia |
| PSS / RSS | Android | Proportional/resident set size from `dumpsys meminfo` |
| Graphics | Android | GL/Vulkan textures and buffers |
| Physical footprint | iOS | The number jetsam uses to decide termination (`phys_footprint`) |
| Dirty / compressed memory | iOS | Pages that cannot be dropped; iOS compresses rather than swaps |

When over the limit: Android low-memory killer kills background processes first, foreground app gets `OutOfMemoryError` from the managed heap; iOS jetsam terminates the app (no crash report, appears as a "jetsam event" / memory-limit termination in MetricKit and Organizer).

## Android

### Quick inspection
```bash
adb shell dumpsys meminfo com.example.app          # PSS breakdown: Java, Native, Graphics, Code, Stack
adb shell am dumpheap com.example.app /data/local/tmp/app.hprof
adb pull /data/local/tmp/app.hprof                 # open in Android Studio
```

### Android Studio Memory Profiler
- "Track Memory Consumption" for a live timeline; "Analyze Memory Usage (Heap Dump)" to see retained sizes; "Track Java/Kotlin allocations" and "Native allocations" (heapprofd) to find churn.
- In a heap dump, filter "Show activity/fragment leaks", sort by retained size, and inspect the reference path to a GC root.

### LeakCanary (debug builds)
```kotlin
dependencies {
  debugImplementation("com.squareup.leakcanary:leakcanary-android:<version>")
}
```
It installs itself automatically, watches destroyed Activities, Fragments, Views and ViewModels, dumps the heap when they are retained, and prints the leak trace:
```
GC Root: static field
  CheckoutSdk.listener  -> instance of CheckoutActivity$1
  CheckoutActivity$1.this$0 -> CheckoutActivity (destroyed)  LEAKING
```

### Common Android leaks
| Leak | Fix |
|---|---|
| Static/singleton holding an Activity Context or View | Use `applicationContext`; clear references |
| Listeners/callbacks not unregistered | Register in `onStart`, unregister in `onStop`, or lifecycle-aware observers |
| Fragment view binding kept after `onDestroyView` | Null the binding in `onDestroyView` |
| Coroutines/Rx subscriptions outliving the screen | `viewModelScope`, `repeatOnLifecycle`, dispose subscriptions |
| Handler posting delayed runnables capturing Activity | `removeCallbacksAndMessages(null)` on destroy |
| Large bitmaps cached unbounded | `LruCache` sized by bytes, image-library caches |

### Memory pressure callbacks
```kotlin
class App : Application() {
  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    if (level >= ComponentCallbacks2.TRIM_MEMORY_BACKGROUND) imageCache.evictAll()
    else if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) imageCache.trimToSize(imageCache.maxSize() / 2)
  }
}
```
Since API 34 most other trim levels are deprecated and not delivered; rely on `UI_HIDDEN` and `BACKGROUND`.

## iOS

### Tools
| Tool | Use |
|---|---|
| Xcode Memory Graph Debugger | Snapshot of live objects; flags leaked cycles; shows who references what |
| Instruments Allocations | Allocation timeline, generations ("Mark Generation") to find growth per action |
| Instruments Leaks | Unreachable allocations over time |
| `leaks`, `vmmap`, `heap` CLI | Inspect a `.memgraph` exported from Xcode |
| MetricKit `MXMemoryMetric`, `MXAppExitMetric` | Peak memory and memory-limit exits from users |

```bash
leaks --outputGraph=app.memgraph <pid>      # or export from Xcode's memory graph
vmmap --summary app.memgraph
heap app.memgraph --sortBySize | head -40
```

### Retain cycles
```swift
final class FeedViewController: UIViewController {
  private var timer: Timer?
  private let model = FeedModel()

  override func viewDidLoad() {
    super.viewDidLoad()
    model.onUpdate = { [weak self] items in      // weak capture breaks the cycle
      self?.render(items)
    }
    timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
      self?.model.refresh()
    }
  }

  deinit { timer?.invalidate() }
}
```
Other sources: delegates declared `strong` (use `weak var delegate`), `NotificationCenter` block observers retaining `self`, long-lived `Task`s capturing `self` strongly, Combine `sink` stored on the object that it captures.

### Responding to pressure
```swift
NotificationCenter.default.addObserver(forName: UIApplication.didReceiveMemoryWarningNotification,
                                       object: nil, queue: .main) { _ in
  ImageCache.shared.removeAll()
}
let available = os_proc_available_memory()   // bytes remaining before the limit
```
Use `NSCache` for caches (evicts automatically under pressure) and downsample images to display size.

## Finding Growth, Not Just Leaks

1. Record a baseline after launch and settling.
2. Repeat a journey several times (open/close screen, scroll a list).
3. Compare heap after each iteration (Android heap dumps diff; iOS Allocations generations).
4. Memory that grows per iteration and is never released is a leak or an unbounded cache.

## Allocation Churn
Frequent short-lived allocations trigger GC on Android (pauses on the UI thread are short with concurrent GC, but churn still costs CPU) and ARC traffic on iOS. Remove allocations from `onDraw`, `onBindViewHolder`, Compose draw lambdas and SwiftUI `body`.

## Pitfalls
- Only testing on high-RAM devices; jetsam limits differ by device.
- Treating Java heap as total memory; bitmaps and native libs live in native memory.
- Caches without size limits.
- Ignoring background memory: apps using less memory in background are killed less often.

## Checklist
- [ ] LeakCanary in debug builds; Memory Graph checked for key flows
- [ ] Repeated-journey test shows no unbounded growth
- [ ] Image decode sized to the view
- [ ] Caches bounded and trimmed on pressure callbacks
- [ ] Field memory metrics (vitals, MetricKit exits) monitored
