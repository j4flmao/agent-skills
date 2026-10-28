# App Startup Performance (Android and iOS)

How mobile apps launch, how to measure launch time, and the techniques that reduce it. Covers cold/warm/hot starts on Android (ART, Baseline Profiles, App Startup, SplashScreen) and iOS (dyld, pre-main, first frame, MetricKit).

## Launch Types

| Type | Android | iOS |
|---|---|---|
| Cold | Process created, `Application.onCreate`, first Activity created and drawn | Process launched, dyld loads/binds images, `main`, `UIApplicationDelegate`/`App` init, first frame |
| Warm | Process alive but Activity recreated (or process recreated from saved state) | App relaunched after being terminated but with dyld caches warm |
| Hot | Activity brought to foreground; no re-creation | Resume from background (not a launch; measure as "resume") |

Optimize cold start first: it is the slowest and most common after updates, reboots and memory pressure.

## Targets and Thresholds

- Android vitals flags excessive startup: cold ≥ 5 s, warm ≥ 2 s, hot ≥ 1.5 s. Aim far below; a practical goal is under 1 s cold on mid-range devices.
- Apple recommends the first frame within roughly 400 ms of launch; the system watchdog terminates apps that take too long to launch (on the order of 20 s).
- Measure on low/mid-tier physical devices with release builds; debug builds and emulators are not representative.

## Android: What Happens on Cold Start

```
zygote fork -> bindApplication -> ContentProviders init -> Application.onCreate
  -> Activity.onCreate (inflate / setContent) -> onStart -> onResume
  -> first frame (Choreographer doFrame, RenderThread draw)   = TTID (Displayed)
  -> app content loaded, reportFullyDrawn()                    = TTFD
```

### Measuring
```bash
# Time to initial display, cold
adb shell am force-stop com.example.app
adb shell am start-activity -W -S com.example.app/.MainActivity
# Logcat line from ActivityTaskManager: "Displayed com.example.app/.MainActivity: +612ms"
```
```kotlin
// Mark TTFD when meaningful content is visible
class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      val feed by viewModel.feed.collectAsStateWithLifecycle()
      ReportDrawnWhen { feed.isLoaded }   // androidx.activity.compose
      FeedScreen(feed)
    }
  }
}
```
Use Jetpack Macrobenchmark `StartupTimingMetric` for repeatable numbers (see the testing reference), Perfetto for the breakdown, and `ApplicationStartInfo` (Android 15, API 35) to read real start type and timestamps in production.

### Techniques
| Technique | Effect |
|---|---|
| Baseline Profiles (`androidx.baselineprofile` Gradle plugin + `profileinstaller`) | AOT-compiles startup and critical-journey code; avoids JIT/interpretation on first runs |
| Startup Profiles / DEX layout optimization | Puts startup classes in the primary DEX |
| R8 full mode, resource shrinking | Less code to load and verify |
| Lazy initialization of SDKs | Move analytics, ads, crash SDK extras off the critical path |
| Jetpack App Startup with lazy `Initializer`s | One ContentProvider instead of one per library; can defer via `tools:node="remove"` + manual `AppInitializer` |
| Avoid disk/network/IPC in `Application.onCreate` | No blocking main thread |
| Defer DI graph creation | Hilt/Koin: inject lazily (`Lazy<T>`, `Provider<T>`) |
| Simple first screen | Flat layout or lightweight Compose tree; load secondary UI later |
| SplashScreen API (`androidx.core:core-splashscreen`) | Correct system splash; use `setKeepOnScreenCondition` only while truly needed |

```kotlin
class AnalyticsInitializer : Initializer<Analytics> {
  override fun create(context: Context): Analytics = Analytics.init(context)
  override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
// Deferred: remove from manifest merge and call AppInitializer.getInstance(ctx)
//   .initializeComponent(AnalyticsInitializer::class.java) after first frame.
```

```kotlin
// StrictMode in debug to catch main-thread I/O during startup
if (BuildConfig.DEBUG) {
  StrictMode.setThreadPolicy(
    StrictMode.ThreadPolicy.Builder().detectDiskReads().detectDiskWrites().detectNetwork().penaltyLog().build()
  )
}
```

## iOS: What Happens on Launch

```
exec -> dyld: load dylibs/frameworks, rebase/bind, ObjC setup, +load / static initializers
  -> main() -> UIApplicationMain / App.init
  -> application(_:didFinishLaunchingWithOptions:) / scene connection
  -> first CATransaction commit -> first frame rendered
```

### Measuring
- Xcode Instruments "App Launch" template: shows process creation, dyld, static init, UIKit init, initial frame.
- `XCTApplicationLaunchMetric` in UI tests for regressions.
- MetricKit `MXAppLaunchMetric` (time-to-first-draw histograms) and Xcode Organizer Launch Time for field data.
- `os_signpost` / `OSSignposter` intervals around your own init work.

### Techniques
| Technique | Effect |
|---|---|
| Fewer dynamic frameworks; merge or link statically (mergeable libraries, Xcode 15+) | Less dyld load/bind work |
| Remove `+load` and heavy static initializers | Work moved out of pre-main |
| Defer SDK setup until after first frame | `DispatchQueue.main.async` or a `Task` started after UI is shown |
| No synchronous network/keychain/large file reads before first frame | Avoids main-thread blocking |
| Lightweight initial view controller / SwiftUI view | Smaller first commit |
| Prewarming awareness | iOS 15+ may prewarm the process; do not assume `main` time equals user tap time |

```swift
@main
struct ShopApp: App {
  @State private var model = AppModel()
  var body: some Scene {
    WindowGroup {
      RootView(model: model)
        .task { await model.startDeferredServices() }   // after first frame
    }
  }
}
```

## Cross-Platform Notes
- Flutter: use the `--profile` build, `flutter run --trace-startup`; keep `main()` minimal and defer plugin init; consider deferred components on Android.
- React Native: enable Hermes (default) and the New Architecture; inline requires and lazy screens; measure with native tools since JS bundle load is part of TTID.

## Pitfalls
- Measuring debug builds or with the debugger attached.
- Content providers from libraries silently initializing at startup.
- Splash screens hiding slow startup instead of fixing it.
- Synchronous `SharedPreferences`/`UserDefaults` of large data on the main thread.
- Pre-main time on iOS growing as frameworks are added.

## Checklist
- [ ] Cold-start TTID and TTFD measured on a low-end device, release build
- [ ] Baseline Profile generated and verified (Android)
- [ ] No disk/network on the main thread before first frame (StrictMode / Instruments)
- [ ] Third-party SDK init deferred or lazy
- [ ] Launch metric tracked in CI and in field data (vitals, MetricKit)
