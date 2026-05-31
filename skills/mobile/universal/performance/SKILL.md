---
name: mobile-performance
description: >
  Use this skill when the user asks about mobile performance optimization, app
  slow, jank, frame drops, memory leaks, startup time, battery drain, bundle size,
  or profiling tools.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, performance, phase-4, universal]
---

# Mobile Performance

## Purpose
Diagnose and optimize mobile app performance across rendering, memory, startup time, battery drain, and bundle size using platform profiling tools.

## Agent Protocol

### Trigger
User request includes: `mobile performance`, `app slow`, `jank`, `frame drop`, `memory leak mobile`, `app startup`, `battery drain`, `app size`, `profiling mobile`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Performance tool (Xcode Instruments, Android Profiler, Flutter DevTools, Flipper)
- Current issue (jank, memory, startup, battery, size)

### Output Artifact
A markdown document containing:
- Root cause analysis
- Optimization strategy
- Code before/after snippets
- Verification steps

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

---

### Max Response Length
4096 tokens

## Architecture

### Performance Optimization Decision Tree
```
What is the user complaint?
├── "App is slow to start" → Startup Performance
│   ├── Cold start >2s → Baseline Profiles (Android), reduce dynamic frameworks (iOS)
│   ├── Warm start >800ms → Cache last state, avoid heavy deserialization on resume
│   └── Hot start >400ms → Defer non-critical SDK init, lazy-load modules
├── "App is janky/stuttering" → Rendering Performance
│   ├── List scrolling drops frames → Virtualize list (ListView.builder, FlatList, LazyColumn)
│   ├── Animation stutters → Use GPU-composited properties (transform, opacity), avoid layout
│   └── Navigation transition jank → Pre-warm next screen, lazy-load screen content
├── "App crashes/uses too much memory" → Memory Performance
│   ├── Heap grows without shrinking → Find retain cycle or subscription leak
│   ├── OOM on image-heavy screens → Downsample images, use disk cache, purge on low memory
│   └── Memory grows with navigation → Check screen deallocation, weak ref patterns
├── "App drains battery" → Battery Performance
│   ├── Background network activity → Batch network requests, use push instead of polling
│   ├── Wake locks held too long → Minimize background work, use WorkManager (Android)
│   └── Location tracking always on → Use significant-change or region monitoring
└── "App download is too large" → Bundle Size
    ├── IPA >80MB / APK >30MB → Code splitting, remove unused resources, asset optimization
    └── Download >100MB cellular warning → On-demand resources, app thinning, deferred downloads
```

### Performance Layer Model
```
┌──────────────────────────────────────────┐
│           User Interface Layer            │
│  Rendering: 60fps (16ms/frame budget)    │
│  120fps for ProMotion (8ms/frame budget) │
├──────────────────────────────────────────┤
│          Application Logic Layer          │
│  Main thread work: <100ms per chunk      │
│  Heavy work: offload to background thread│
├──────────────────────────────────────────┤
│              Data Layer                   │
│  Network: cache-first strategy            │
│  Storage: indexed queries, lazy load     │
├──────────────────────────────────────────┤
│            Platform Bridge                │
│  Flutter: 4-8ms Dart-to-native overhead  │
│  RN: 10-50ms JS-to-native bridge latency │
│  Native: 0ms (direct API calls)          │
└──────────────────────────────────────────┘
```

## Workflow

### Step 1: Profile and Identify Bottleneck
Use platform profiling tool to measure frame times, memory allocations, startup duration, and battery impact.

### Step 2: Fix Rendering Performance
Address jank with virtualization (ListView.builder, FlatList, LazyColumn), const widgets, RepaintBoundary, and proper cell reuse.

### Step 3: Fix Memory Issues
Eliminate retain cycles, cancel network requests on dispose, use weak references, and profile with heap snapshots.

### Step 4: Optimize Startup Time
Implement Baseline Profiles (Android), reduce dynamic framework loading (iOS), and defer non-critical initialization.

### Step 5: Reduce Bundle Size
Enable code splitting, remove unused dependencies, use --split-debug-info, and analyze bundle composition.

### Step 6: Optimize Battery Usage
Minimize background work, batch network requests, use platform background task APIs (BGTaskScheduler on iOS, WorkManager on Android), and reduce wake lock duration. Monitor energy impact in Xcode Instruments Energy Log and Android Battery Historian.

### Step 7: Monitor in Production
Integrate performance monitoring SDK (Firebase Performance, Datadog RUM, Sentry Performance) to collect real-world metrics. Set up dashboards for key metrics: cold start time, frame drop rate, peak memory, network latency. Configure alerts for metric degradation beyond 20% of baseline.

## Performance Budget Methodology

### Defining Performance Budgets
```yaml
performance_budgets:
  startup:
    cold_start:
      target: "<2s to interactive on mid-range device"
      metrics: ["Time to first frame", "Time to interactive", "Fully loaded time"]
      tools: ["Firebase Performance", "Macrobenchmark (Android)", "MetricKit (iOS)"]
    warm_start:
      target: "<800ms to interactive"
      optimization: "Avoid heavy de-serialization on resume, cache last state"
      
  runtime:
    frame_rate:
      target: "60fps consistent (120fps for ProMotion devices)"
      measurement: "Frame timing instrumentation — not just perceived smoothness"
    memory:
      target: "<200MB peak heap on mid-range"
      measurement: "Heap snapshots at key user flows — leak detection per screen"
      
  bundle:
    app_size_android:
      target: "<30MB APK (or AAB equivalent)"
      reduction: "R8 optimization, --split-debug-info, remove unused resources"
    app_size_ios:
      target: "<80MB IPA"
      reduction: "Asset catalog optimization, remove unused architectures, Bitcode"
    download:
      target: "<100MB initial download from store (to avoid cellular warning)"
```

### Profiling Workflow
```yaml
profiling_workflow:
  step_1_establish_baseline:
    activity: "Run performance tests on reference device (mid-range, not flagship)"
    tools: ["Xcode Instruments", "Android Profiler", "Flutter DevTools", "Flipper"]
    metrics: ["Startup time", "Frame rate", "Peak memory", "Bundle size"]
    
  step_2_identify_bottlenecks:
    activity: "Profile each key user flow — launch, list scroll, image load, navigation"
    signs_of_trouble: ["Frame drops >3%", "Heap growing without GC", "Startup >3s"]
    
  step_3_hypothesize_and_fix:
    activity: "Form hypothesis about root cause, implement fix, re-profile"
    common_fixes:
      startup: "Defer SDK init, lazy-load modules, Baseline Profiles (Android)"
      jank: "Virtualized lists, const widgets, efficient re-render triggers"
      memory: "Weak refs, dispose subscriptions, image cache limits"
      
  step_4_verify:
    activity: "Profile again with same conditions — confirm fix without regression"
    threshold: "Improvement >10% in target metric"
    
  step_5_monitor:
    activity: "Add performance monitoring to production release"
    tools: ["Firebase Performance", "Datadog RUM", "New Relic Mobile", "Sentry Performance"]
```

## Rendering Performance

### Flutter

```dart
// Avoid rebuilds — use const widgets
const OrderCard(order: order);  // Only rebuilds when order ref changes

// RepaintBoundary for complex widgets
RepaintBoundary(child: MapWidget());

// Use ListView.builder — not ListView(children: [])
ListView.builder(itemCount: items.length, itemBuilder: ...);
```

### React Native

```typescript
// FlatList with proper config
<FlatList
  data={orders}
  renderItem={renderItem}
  getItemLayout={getItemLayout}
  maxToRenderPerBatch={10}
  windowSize={5}
/>

// UseMemo for expensive computations
const total = useMemo(() => computeTotal(orders), [orders]);
```

### iOS

```swift
// Cell reuse
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "OrderCell")!
    // configure
    return cell
}
```

### Android

```kotlin
// LazyColumn with keys
LazyColumn {
    items(orders, key = { it.id }) { order -> OrderCard(order) }
}
```

## Memory

- Leak common causes: retain cycles (iOS), static references (Android), timer not cancelled
- Use weak references for delegates/callbacks
- Cancel network requests on screen dispose
- Profile with: Instruments (iOS), Memory Profiler (Android), DevTools (Flutter), Flipper (RN)
- Image caching: use disk-backed cache (NSCache/Glide/COIL), limit in-memory cache to 50-100MB
- Bitmap pooling on Android: reuse bitmap objects instead of allocating new ones per image decode
- Weak reference patterns: delegate pattern in Swift, WeakReference in Java/Kotlin, WeakRef in Dart

## Startup

```kotlin
// Android: Baseline Profiles
// In src/main/baseline-prof.txt
Lcom/example/app/MainActivity;->onCreate(Landroid/os/Bundle;)V
Lcom/example/app/features/orders/OrderListScreen;-><init>()V
```

```swift
// iOS: Reduce dynamic framework loading
// Move non-essential frameworks to optional
```

```dart
// Flutter: Defer non-critical init
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(MyApp());
  // Defer SDK init to after first frame
  SchedulerBinding.instance.addPostFrameCallback((_) {
    _initNonCriticalSDKs();
  });
}
```

## Bundle Size

```yaml
# Flutter: Use --split-debug-info
flutter build apk --split-debug-info=build/debug-info

# RN: Remove unused packages
npx react-native-bundle-analyzer

# iOS: App Thinning
# Enable in Xcode: Assets.car per-device slicing, on-demand resources
```

## Common Pitfalls

- **Optimizing before profiling**: Guessing at bottlenecks leads to optimizing the wrong code. Always profile first.
- **Testing only on flagship devices**: Flagships hide performance problems that affect the majority of users on mid-range devices.
- **Ignoring JS thread in React Native**: Expensive JS computations block the JS thread, causing frame drops even when native rendering is fast.
- **Unbounded image caches**: In-memory image caches without size limits cause OOM on low-memory devices.
- **Synchronous storage reads**: Reading from disk on the main thread blocks the UI. Use async storage APIs.
- **Over-using RepaintBoundary**: Too many repaint boundaries in Flutter increase layer tree complexity and GPU memory.
- **Not handling low memory warnings**: Apps that ignore `didReceiveMemoryWarning` (iOS) or `onTrimMemory` (Android) get killed by the OS.
- **Debug build performance testing**: Debug builds have disabled optimizations and extra logging — always profile release builds.
- **Metric reporting overhead**: Performance monitoring SDKs add 2-5% CPU overhead. Disable verbose instrumentation in production builds.

## Compared With

| Platform | Rendering | Memory Model | Startup | Bundle Size |
|----------|-----------|-------------|---------|-------------|
| Native (Swift/Kotlin) | Direct GPU access, 60fps guaranteed | ARC/GC, fine-grained control | Fastest (native code) | Smallest |
| Flutter | Skia/Impeller engine, 60-120fps | Dart GC, widget tree overhead | Moderate (engine init ~200ms) | Moderate (engine ~5MB) |
| React Native | JS-to-native bridge, 60fps typical | JS GC, bridge serialization overhead | Slowest (JS engine init + bundle parse) | Large (JS bundle + RN lib) |
| Ionic/Capacitor | WebView rendering, 60fps achievable | WebView heap, limited control | Slow (WebView init ~200-600ms) | Large (WebView + Ionic libs) |
| Kotlin Multiplatform | Native performance per platform | Platform-native memory model | Native fast startup | Platform-native size |

## Tooling

| Tool | Platform | Use Case |
|------|----------|----------|
| Xcode Instruments | iOS | Frame timing, allocations, energy, network |
| Android Studio Profiler | Android | CPU, memory, network, energy |
| Flutter DevTools | Flutter | Widget rebuild, frame analysis, memory |
| React DevTools + Flipper | React Native | Component tree, network, layout |
| Systrace (Android) | Android | System-level trace, thread scheduling |
| MetricKit (iOS) | iOS | Production performance data aggregation |
| Firebase Performance | Cross-platform | Production monitoring with traces |
| Sentry Performance | Cross-platform | Transaction tracing with error context |
| Datadog RUM | Cross-platform | Real user monitoring with session replay |
| New Relic Mobile | Cross-platform | APM with distributed tracing |
| PerfDog | Cross-platform | Frame rate, temperature, battery on device |
| GTmetrix / Lighthouse | PWA | Web performance audit for PWA mode |

## Rules

- Profile before optimizing — never guess at performance bottlenecks
- Virtualize all lists — no ScrollView wrapping large child lists
- Cancel network requests and timers on screen dispose
- Use weak references for all delegates, callbacks, and listeners
- Startup: defer non-critical SDK initialization to after first frame
- Bundle: remove unused packages before adding new ones
- Baseline Profiles for Android — can improve startup by 30%+
- Set explicit performance budgets before optimization begins
- Profile on mid-range devices — flagships hide performance problems
- Production performance monitoring must be integrated before release — not retrofitted after launch
- Memory cache limits must be explicitly configured for all image loading libraries
- All performance fixes must be verified with a before/after profile on the same device
- Debug builds must not be used for performance measurement — always use release or profile build
- Frame rate monitoring should track both main thread and render thread separately
- Network requests should use connection pooling and HTTP/2 for multiplexing

## References
  - references/memory.md — Mobile Memory
  - references/mobile-performance-optimization.md — Mobile Performance Optimization
  - references/mobile-performance.md — Mobile Performance Optimization
  - references/network-performance.md — Network Performance
  - references/rendering.md — Rendering Performance
  - references/startup.md — Mobile Startup
  - references/mobile-performance-monitoring.md — Mobile Performance Monitoring
  - references/mobile-performance-bundle-optimization.md — Mobile Performance Bundle Optimization
## Handoff

Hand off to stack-specific skill for implementation fixes.
