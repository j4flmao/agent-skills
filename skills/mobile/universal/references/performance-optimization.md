# Mobile Performance Optimization

Measuring and improving startup time, rendering smoothness, memory, network and battery on iOS, Android, Flutter and React Native. Profile on real, mid-range devices with release builds; debug builds are not representative.

## Metrics That Matter

| Metric | Where measured | Notes |
|--------|----------------|-------|
| Cold start time | Android vitals, Macrobenchmark, Xcode Organizer launch metrics, MetricKit | Process start to first frame / fully drawn |
| Slow / frozen frames, hitches | Android vitals, JankStats, Instruments (Hitches), Flutter DevTools | Frame budget is ~16.7 ms at 60 Hz, ~8.3 ms at 120 Hz |
| ANR rate (Android) | Play Console Android vitals | Main thread blocked ~5 s for input |
| Hang rate (iOS) | Xcode Organizer, MetricKit | Main thread unresponsive |
| Memory / OOM terminations | Profilers, MetricKit, Play vitals | Background kills hurt resume |
| App size | Play Console, App Store Connect size report | Affects install conversion |
| Battery / wakeups | Battery Historian, Energy Organizer | Background work and location |

Google Play shows bad-behaviour thresholds for ANR and crash rates in Android vitals; exceeding them can reduce store visibility.

## Startup

### Android
- Measure with Macrobenchmark (`StartupTimingMetric`); report `reportFullyDrawn()` when content is ready.
- Ship Baseline Profiles (generated with the Baseline Profile Gradle plugin) so critical code is AOT-compiled at install.
- Defer SDK initialization; use App Startup or lazy init instead of everything in `Application.onCreate`.
- Avoid disk I/O and reflection-heavy DI graph creation on the main thread at launch.
- Use the SplashScreen API rather than a separate splash activity.

```kotlin
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
    @get:Rule val rule = MacrobenchmarkRule()

    @Test fun coldStart() = rule.measureRepeated(
        packageName = "com.example.app",
        metrics = listOf(StartupTimingMetric()),
        compilationMode = CompilationMode.Partial(BaselineProfileMode.Require),
        startupMode = StartupMode.COLD,
        iterations = 10,
    ) {
        pressHome()
        startActivityAndWait()
    }
}
```

### iOS
- Measure with Instruments (App Launch template) and `XCTApplicationLaunchMetric` in performance tests.
- Minimize work in `application(_:didFinishLaunchingWithOptions:)` and initial view `init`/`body`.
- Prefer fewer dynamic frameworks (static linking or mergeable libraries) to reduce dyld time.
- Avoid synchronous network or large file reads before first frame.

### Flutter / React Native
- Flutter: defer heavy plugin init; avoid large synchronous work in `main()`; use deferred components (Android) for large optional features.
- React Native: the New Architecture (default since 0.76) with Hermes; enable inline requires / lazy module loading; keep the initial bundle small.

## Rendering and Scrolling

| Platform | Practices |
|----------|-----------|
| Compose | Stable/immutable state classes; `key` in `LazyColumn` items; `derivedStateOf` for computed state; defer reads with lambda modifiers (`Modifier.offset { }`); check recompositions in Layout Inspector |
| SwiftUI | Small views with focused dependencies; `@Observable` for fine-grained updates; `List`/`LazyVStack` with stable `id`; avoid heavy work in `body` |
| UIKit | Cell reuse, prefetching, avoid offscreen rendering (shadows without `shadowPath`, masks) |
| Flutter | `const` widgets; `ListView.builder`; `RepaintBoundary` for isolated animations; avoid `Opacity`/`saveLayer` in animations (use `FadeTransition`); move heavy work to isolates (`Isolate.run`) |
| React Native | `FlatList`/`FlashList` with `keyExtractor` and item memoization; animations on the UI thread (Reanimated); avoid re-rendering lists from parent state changes |

## Images

- Decode at display size (Coil/Glide on Android, `downsample` via ImageIO or `preparingThumbnail` on iOS, `cacheWidth`/`cacheHeight` in Flutter, `expo-image` or FastImage-style libraries in RN).
- Serve modern formats (WebP/AVIF/HEIC) at the right resolution from a CDN.
- Cache in memory and on disk with size limits.

## Memory

- Watch for leaks: LeakCanary (Android debug), Instruments Leaks/Memory Graph (iOS), DevTools memory tab (Flutter).
- Typical leaks: listeners/observers not removed, long-lived references to Activity/Context/ViewController, closures capturing `self` strongly, timers/subscriptions not cancelled.
- Respond to memory warnings (`onTrimMemory`, `didReceiveMemoryWarning`) by clearing caches.

## Network

- Batch and compress requests; enable HTTP/2 or HTTP/3 where the server supports it.
- Cache with HTTP caching headers (OkHttp cache, `URLCache`) and local DB for offline-first screens.
- Paginate lists; request only needed fields (GraphQL selections, sparse fieldsets).
- Avoid polling; use push or server-sent updates where possible.

## Battery and Background

| Platform | Use |
|----------|-----|
| Android | WorkManager with constraints (unmetered, charging); avoid exact alarms and wakelocks unless required |
| iOS | `BGAppRefreshTask` / `BGProcessingTask`; background URLSession for transfers; significant-change location instead of continuous GPS |
| Cross-platform | Platform plugins wrapping the above; avoid timers running in background |

## App Size

- Android: App Bundles (per-device APKs), R8 shrinking (`isMinifyEnabled`, `isShrinkResources`), remove unused locales/resources.
- iOS: asset catalogs, on-demand resources if needed, strip unused architectures (handled by App Store thinning), audit large dependencies.
- Flutter: `--split-debug-info` and `--obfuscate`, `--analyze-size`.
- RN: Hermes bytecode, remove unused native modules.

## Performance Workflow

1. Define budgets (e.g. cold start target, zero frozen frames on key flows) per product needs.
2. Measure on reference devices with release builds.
3. Profile the regression; fix the largest contributor.
4. Add automated benchmarks (Macrobenchmark, XCTest metrics, Flutter integration perf tests) in CI on physical devices or a device farm.
5. Track field metrics after release (vitals, MetricKit, Firebase Performance).

## Checklist

- [ ] Release-build measurements on mid-range devices
- [ ] Startup work deferred; Baseline Profiles (Android)
- [ ] Lists virtualized with stable keys; heavy work off the main thread
- [ ] Images decoded at display size; caches bounded
- [ ] Leak detection in debug builds
- [ ] Background work via platform schedulers with constraints
- [ ] Benchmarks in CI and field metrics monitored
