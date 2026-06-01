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

### Android

```kotlin
// LazyColumn with stable keys
LazyColumn {
    items(orders, key = { it.id }) { order ->
      key(order.id) { OrderCard(order) }
    }
}

// Avoid recomposition — use derivedStateOf
val visibleCount = remember(orders) {
  derivedStateOf { orders.count { it.isVisible } }
}

// Compose modifier optimization
@Composable
fun OrderCard(order: Order) {
  Column(
    modifier = Modifier
      .drawWithContent { /* custom draw */ }  // Only redraws when needed
      .then(Modifier.padding(8.dp))
  ) { ... }
}

// Use immutable state holders
@Immutable
data class OrderUiState(val orders: List<Order>, val isLoading: Boolean)
```

### iOS (SwiftUI)

```swift
// Cell reuse — UIKit
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "OrderCell")!
    return cell
}

// SwiftUI — LazyVStack instead of VStack
ScrollView {
    LazyVStack {
        ForEach(orders, id: \.id) { order in
            OrderRow(order: order)
        }
    }
}

// Reduce view body recomputation
struct OrderListView: View {
    let orders: [Order]
    var body: some View {
        List(orders, id: \.id) { order in
            NavigationLink(value: order) {
                OrderRow(order: order)
            }
        }
    }
}

// EquatableView for diffing
EquatableView(content: OrderRow(order: order))
    .equatable()
```

### Flutter

```dart
// Avoid rebuilds — use const widgets
const OrderCard(order: order);  // Only rebuilds when order ref changes

// RepaintBoundary for complex widgets
RepaintBoundary(child: MapWidget());

// Use ListView.builder — not ListView(children: [])
ListView.builder(itemCount: items.length, itemBuilder: ...);

// Use ValueListenableBuilder for targeted rebuilds
ValueListenableBuilder<int>(
  valueListenable: counterNotifier,
  builder: (context, count, child) {
    return Text('Count: $count');
  },
);

// Avoid passing function references that cause rebuilds
// Bad: builder: (context) => MyWidget(onTap: () => handleTap())
// Good: builder: (context) => MyWidget(onTap: handleTap)
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
  removeClippedSubviews={true}
  initialNumToRender={10}
/>

// UseMemo for expensive computations
const total = useMemo(() => computeTotal(orders), [orders]);

// UseCallback for stable function references
const handlePress = useCallback((id: string) => {
  navigation.navigate('OrderDetail', { id });
}, [navigation]);

// React.memo for preventing unnecessary re-renders
const OrderRow = React.memo(({ order }: { order: Order }) => {
  return <Text>{order.title}</Text>;
});

// InteractionManager for deferring non-critical work
InteractionManager.runAfterInteractions(() => {
  loadNonCriticalData();
});
```

## Image Optimization

### Sizing and Caching
```kotlin
// Android — Coil with size constraints
AsyncImage(
  model = ImageRequest.Builder(LocalContext.current)
    .data(url)
    .size(400, 300)           // Downsample to display size
    .crossfade(true)
    .memoryCachePolicy(CachePolicy.ENABLED)
    .build(),
  contentDescription = null
)

// Coil memory cache config
val imageLoader = ImageLoader.Builder(context)
  .memoryCachePolicy(CachePolicy.ENABLED)
  .memoryCache {
    MemoryCache.Builder()
      .maxSizePercent(0.25)    // 25% of available heap
      .build()
  }
  .build()
```

```swift
// iOS — Kingfisher or Nuke for disk-backed cache
KFImage.url(URL(string: url))
  .resizable()
  .setProcessor(DownsamplingImageProcessor(size: CGSize(width: 400, height: 300)))
  .cacheMemoryOnly(false)       // Enable disk cache
  .memoryCacheOptions(.init(memory costLimit: 50 * 1024 * 1024))  // 50MB limit

// URLSession cache config
let config = URLSessionConfiguration.default
config.urlCache = URLCache(memoryCapacity: 50_000_000, diskCapacity: 200_000_000)
```

```dart
// Flutter — cached_network_image
CachedNetworkImage(
  imageUrl: url,
  width: 200,
  height: 150,
  memCacheWidth: 400,         // Cache downsampled version
  memCacheHeight: 300,
  placeholder: (_, __) => const Shimmer(),
  errorWidget: (_, __, ___) => const Icon(Icons.error),
)
```

```typescript
// React Native — fast-image with cache
import FastImage from 'react-native-fast-image';

<FastImage
  style={{ width: 200, height: 150 }}
  source={{ uri: url, priority: FastImage.priority.normal }}
  resizeMode={FastImage.resizeMode.contain}
/>
```

### WebP and AVIF Conversion
```yaml
# Convert PNG/JPG to WebP for 25-35% size reduction
cwebp -q 80 input.png -o output.webp

# Android supports WebP natively (API 18+)
# iOS supports WebP via SDWebImage/Kingfisher
# AVIF offers 50% better compression than JPEG — Android 12+, iOS 16+
```

## Startup Optimization

### Android
```kotlin
// Baseline Profiles (src/main/baseline-prof.txt)
// Improves cold start by 30-40%
HSPLcom/example/app/MainActivity;->onCreate(Landroid/os/Bundle;)V
HSPLcom/example/app/features/orders/OrderListScreen;-><init>()V
HSPLcom/example/app/data/repository/OrderRepository;->getOrders()Lkotlinx/coroutines/flow/Flow;

// Startup tracing
@ExperimentalTraceFolksApi
class MainApplication : Application() {
  override fun onCreate() {
    trace("Application.onCreate") {
      super.onCreate()
      // Init critical SDKs first
      trace("init.crashlytics") { FirebaseCrashlytics.init(this) }
      // Defer non-critical
      trace("init.analytics") { /* defer */ }
    }
  }
}

// App Startup library for deterministic init ordering
// InitializationProvider in AndroidManifest with dependencies
```

### iOS
```swift
// Reduce dynamic framework linking — prefer static frameworks
// In Build Settings: Mach-O Type = Static Library

// Defer non-critical initialization
@main
struct MyApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

  var body: some Scene {
    WindowGroup {
      ContentView()
        .onAppear {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            initNonCriticalSDKs()
          }
        }
    }
  }
}

// Use +load/+initialize sparingly — they block startup
// Avoid +load in Objective-C categories
```

### Flutter
```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(MyApp());
  // Defer SDK init to after first frame
  SchedulerBinding.instance.addPostFrameCallback((_) {
    _initNonCriticalSDKs();
  });
}

// Use deferred loading for heavy packages
import 'package:heavy_package' deferred as heavy;

Future<void> loadHeavyPackage() async {
  await heavy.loadLibrary();
}
```

### React Native
```typescript
// Use inline requires for heavy imports
const HeavyModule = {
  get instance() {
    return require('./HeavyModule').default;
  }
};

// InteractionManager for deferring
InteractionManager.runAfterInteractions(() => {
  Analytics.init();
});

// Hermes engine for faster startup (enabled by default in RN 0.70+)
// hermes.enable = true in metro.config.js
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

## Network Performance

### Connection Pooling and Multiplexing
```kotlin
// OkHttp — connection pooling is default, configure for your use case
val client = OkHttpClient.Builder()
  .connectionPool(ConnectionPool(maxIdleConnections = 5, keepAliveDuration = 5, TimeUnit.MINUTES))
  .protocols(listOf(Protocol.HTTP_2, Protocol.HTTP_1_1))
  .build()
```

### Response Caching with Etag
```typescript
// Axios — conditional requests
api.interceptors.request.use(async (config) => {
  const cached = await cache.get(config.url);
  if (cached?.etag) {
    config.headers['If-None-Match'] = cached.etag;
  }
  return config;
});

api.interceptors.response.use(async (response) => {
  if (response.status === 304) {
    return cache.get(response.config.url);  // Return cached response
  }
  if (response.headers.etag) {
    await cache.set(response.config.url, { ...response, etag: response.headers.etag });
  }
  return response;
});
```

### Request Batching
```dart
class BatchedApiClient {
  final _queue = <String>{};
  Timer? _timer;

  void fetch(String id) {
    _queue.add(id);
    _timer ??= Timer(Duration(milliseconds: 50), _flush);
  }

  Future<void> _flush() async {
    final ids = _queue.toList();
    _queue.clear();
    _timer = null;
    // Single batch request instead of N individual requests
    final results = await api.getOrdersBatch(ids);
    for (final result in results) {
      cache.put(result.id, result);
    }
  }
}
```

### Payload Compression
```kotlin
// OkHttp — gzip is automatic for response bodies
// Request body compression:
val client = OkHttpClient.Builder()
  .addInterceptor { chain ->
    val request = chain.request()
    val compressedBody = request.body?.let { body ->
      compressGzip(body)
    }
    if (compressedBody != null) {
      chain.proceed(request.newBuilder()
        .header("Content-Encoding", "gzip")
        .method(request.method, compressedBody)
        .build())
    } else {
      chain.proceed(request)
    }
  }
  .build()
```

## Battery Optimization

### Location Efficiency
```swift
// Prefer significant-change over continuous
// Bad
manager.startUpdatingLocation()

// Good
manager.startMonitoringSignificantLocationChanges()

// Or region monitoring
manager.startMonitoring(for: region)

// Reduce update frequency
manager.desiredAccuracy = kCLLocationAccuracyHundredMeters  // Not Best
manager.distanceFilter = 100  // Only update every 100m
```

```kotlin
// Android — Fused Location Provider with balanced power
val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 60000)
  .setMinUpdateDistanceMeters(100f)
  .build()
```

### Background Work Scheduling
```kotlin
// Android — WorkManager (not raw AlarmManager or Service)
val constraints = Constraints.Builder()
  .setRequiredNetworkType(NetworkType.CONNECTED)
  .setRequiresBatteryNotLow(true)
  .build()

val syncWork = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
  .setConstraints(constraints)
  .build()
```

```swift
// iOS — BGTaskScheduler (not background fetch)
let request = BGProcessingTaskRequest(identifier: "com.example.sync")
request.requiresNetworkConnectivity = true
request.requiresExternalPower = false  // false = allow on battery
try? BGTaskScheduler.shared.submit(request)
```

### Push over Polling
```
Polling: N requests per hour, each wakes radio for ~10-20 seconds
  → 30 requests/hour × 15s = 450s of radio time per hour
  → Battery drain: HIGH

Push notification: 0 background network, push wakes app only when needed
  → Battery drain: NEGLIGIBLE
```

### Network Batching for Radio Efficiency
- Radio energy profile: ramp-up (~2s high power) → transfer → tail (~10s high power)
- Batch requests into 1-2 minute windows to avoid multiple radio ramp-ups
- Use `JobScheduler` (Android) / `BGTaskScheduler` (iOS) for opportunistic batching
- Prefetch data for likely user actions when on WiFi

## Anti-Patterns

### General
- **Optimizing before profiling**: Guessing at bottlenecks leads to optimizing wrong code. Always profile first
- **Testing only on flagship devices**: Flagships hide performance problems affecting majority of users on mid-range
- **Debug build performance testing**: Debug builds have disabled optimizations — always profile release builds
- **Metric reporting overhead**: Performance monitoring SDKs add 2-5% CPU. Disable verbose instrumentation in production
- **Premature optimization**: Adds complexity without evidence. Measure first, optimize second
- **Not setting performance budgets**: Without targets, performance degrades incrementally with each feature

### Rendering Anti-Patterns
- **Ignoring JS thread in React Native**: Expensive JS computations block JS thread, causing frame drops even when native rendering is fast. Use `InteractionManager` and `useMemo`
- **Over-using RepaintBoundary**: Too many repaint boundaries increase layer tree complexity and GPU memory in Flutter
- **Nested ScrollViews**: Both inner and outer scroll — user gets stuck. Use single scroll direction
- **Recreating widgets on every build**: `Widget build()` creating new objects each call triggers unnecessary recomposition. Extract constants
- **No list item keys**: Missing keys causes full list diffing instead of targeted updates. Always provide stable keys
- **Compose without `key()`**: Items in `LazyColumn` without keys cause incorrect animations and full recomposition

### Memory Anti-Patterns
- **Unbounded image caches**: In-memory image caches without size limits cause OOM on low-memory devices. Set explicit limits
- **Not handling low memory warnings**: Apps ignoring `didReceiveMemoryWarning` (iOS) or `onTrimMemory` (Android) get killed
- **Synchronous storage reads**: Reading from disk on main thread blocks UI. Use async storage APIs
- **Static references to Activity/Context**: Android memory leak classic. Use Application context for singletons
- **Timer not cancelled on dispose**: Timer holds reference to callback, callback holds reference to screen. Use `disposeBag` / `AutoDispose`
- **View reference in ViewModel**: ViewModel outlives View. Never hold View reference — observe state
- **Bitmaps not recycled pre-API 12 (Android)**: Unrecycled bitmaps cause native memory leak. Use `Bitmap.recycle()` or libraries like Coil/Glide

### Startup Anti-Patterns
- **Synchronous SDK init**: Every SDK adding 100ms to startup adds up. Defer non-critical init
- **Loading all features on cold start**: Lazy-load feature modules. Only load what user sees first
- **Heavy deserialization on resume**: JSON parsing of last state blocks warm start. Cache serialized state
- **Dynamic framework sprawl (iOS)**: Each dynamic framework adds link time. Use static frameworks
- **Large storyboard/nib files (iOS)**: XIB loading is slow. Prefer programmatic UI for critical screens
- **Reflection-heavy DI on startup**: Annotation processing at runtime slows first screen. Use compile-time DI (Dagger/Hilt)

### Bundle Size Anti-Patterns
- **Unused assets shipped**: PNGs, fonts, sounds not referenced in code. Use `flutter clean`, `npx react-native-analyzer`
- **Including debug symbols in release**: `--split-debug-info` (Flutter), `strip` (iOS), `minifyEnabled` (Android)
- **Duplicate libraries**: Same library included by multiple dependencies. Use `dependency:analysis` or Gradle dependency tree
- **No App Thinning (iOS)**: Each device downloads full IPA. Enable asset catalog slicing and on-demand resources
- **No Android App Bundle**: APK includes resources for all densities/ABIs. AAB generates device-specific APKs
- **Shipping multiple architectures unnecessarily**: `x86_64` emulator libs in release. Filter with `abiFilters`

### Battery Anti-Patterns
- **Polling instead of push notifications**: Each poll wakes cellular radio for ~20s. Replace with push + silent notification
- **Continuous location in background**: Kills battery. Use significant-change or region monitoring
- **No background work constraints**: WorkManager without network/battery constraints runs at inappropriate times
- **Wake locks held too long**: Prevent device sleep. Use `acquire(timeout)` with timeout, always release in finally
- **Animation in background**: UIKit/Compose animations continue when view offscreen. Pause in `onDisappear` / `Disappear`
- **No adaptive sync**: Same sync frequency on WiFi and cellular. Reduce on metered networks, pause on low battery

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
