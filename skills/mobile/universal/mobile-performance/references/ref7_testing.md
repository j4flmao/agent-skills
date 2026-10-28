# Mobile Performance Testing

Automated performance tests that catch regressions before release: Jetpack Macrobenchmark and Microbenchmark on Android, XCTest performance metrics on iOS, device setup for stable results, and CI integration.

## Test Types

| Type | Measures | Android | iOS |
|---|---|---|---|
| Macro (app-level) | Startup, scrolling, navigation, frame timing | Jetpack Macrobenchmark | XCTest UI tests with `measure(metrics:)` |
| Micro (code-level) | A function's time/allocations | Jetpack Microbenchmark | XCTest `measure` in unit tests |
| Trace-based assertions | Custom section durations | `TraceSectionMetric` | `XCTOSSignpostMetric` |
| Memory | Peak/footprint on journey | `MemoryUsageMetric` | `XCTMemoryMetric` |
| Field validation | Real-user metrics after release | Android vitals, JankStats | MetricKit, Organizer |

## Android: Macrobenchmark

Module setup (`com.android.test` module targeting the app, with a `benchmark` build type that is release-like and `profileable`):
```kotlin
// macrobenchmark/build.gradle.kts
plugins { id("com.android.test"); id("org.jetbrains.kotlin.android"); id("androidx.baselineprofile") }
android {
  targetProjectPath = ":app"
}
dependencies { implementation("androidx.benchmark:benchmark-macro-junit4:<version>") }
```

```kotlin
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
  @get:Rule val rule = MacrobenchmarkRule()

  @Test fun coldStartNoProfile() = startup(CompilationMode.None())
  @Test fun coldStartBaselineProfile() = startup(CompilationMode.Partial(BaselineProfileMode.Require))

  private fun startup(mode: CompilationMode) = rule.measureRepeated(
    packageName = "com.example.app",
    metrics = listOf(StartupTimingMetric(), TraceSectionMetric("Feed.parse")),
    compilationMode = mode,
    startupMode = StartupMode.COLD,
    iterations = 10,
    setupBlock = { pressHome() },
  ) {
    startActivityAndWait()
  }
}

@RunWith(AndroidJUnit4::class)
class ScrollBenchmark {
  @get:Rule val rule = MacrobenchmarkRule()
  @Test fun scrollFeed() = rule.measureRepeated(
    packageName = "com.example.app",
    metrics = listOf(FrameTimingMetric()),
    compilationMode = CompilationMode.Partial(),
    iterations = 5,
    setupBlock = { startActivityAndWait() },
  ) {
    val list = device.findObject(By.res("feed"))
    list.setGestureMargin(device.displayWidth / 5)
    repeat(3) { list.fling(Direction.DOWN) }
    device.waitForIdle()
  }
}
```
Output: `timeToInitialDisplayMs`, `timeToFullDisplayMs` (if `reportFullyDrawn` is called), `frameDurationCpuMs` and `frameOverrunMs` percentiles, plus Perfetto traces per iteration.

Run: `./gradlew :macrobenchmark:connectedBenchmarkAndroidTest` (or the variant-specific task). Results JSON is under `build/outputs/connected_android_test_additional_output/`.

## Android: Microbenchmark
```kotlin
@RunWith(AndroidJUnit4::class)
class ParserBenchmark {
  @get:Rule val benchmarkRule = BenchmarkRule()
  private val json = loadFixture("feed_500_items.json")

  @Test fun parseFeed() = benchmarkRule.measureRepeated {
    FeedParser.parse(json)
  }
}
```
Microbenchmark handles warm-up, reports time and allocations, and warns about debuggable builds, emulators and unlocked clocks.

## iOS: XCTest Metrics

```swift
final class LaunchPerfTests: XCTestCase {
  func testColdLaunch() {
    let options = XCTMeasureOptions()
    options.iterationCount = 10
    measure(metrics: [XCTApplicationLaunchMetric(waitUntilResponsive: true)], options: options) {
      XCUIApplication().launch()
    }
  }

  func testFeedScroll() {
    let app = XCUIApplication()
    app.launch()
    let feed = app.collectionViews["feed"]
    measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
      feed.swipeUp(velocity: .fast)
    }
  }

  func testCheckoutMemory() {
    let app = XCUIApplication()
    app.launch()
    measure(metrics: [XCTMemoryMetric(application: app), XCTCPUMetric(application: app)]) {
      app.buttons["checkout"].tap()
      app.navigationBars.buttons.element(boundBy: 0).tap()
    }
  }
}
```
Custom signposts: `XCTOSSignpostMetric(subsystem: "com.example.app", category: "Checkout", name: "render")`.

Baselines: set in Xcode's test report per device; tests fail when results exceed baseline + max deviation. Store baselines in the repo (`.xcbaseline` inside the scheme's xcshareddata) and keep CI devices consistent.

Run from CLI:
```bash
xcodebuild test -scheme App -destination 'platform=iOS,id=<UDID>' \
  -only-testing:AppPerfTests -resultBundlePath perf.xcresult
```

## Stable Measurements

| Factor | Practice |
|---|---|
| Hardware | Physical devices, same model and OS build for comparisons |
| Build | Release-like (minified, optimized), profileable/not debuggable |
| Thermal | Cool-down between runs; avoid charging-induced heat |
| Background noise | Airplane mode or controlled network; disable auto-updates |
| Clocks (Android) | Microbenchmark can lock clocks on rooted devices (`./gradlew lockClocks`); otherwise rely on more iterations |
| Statistics | Compare medians and percentiles over 5–20 iterations; track variance |
| Data | Fixed fixtures or a seeded backend so content is identical |

## CI Integration

```
merge to main
  -> build benchmark variant
  -> run on device farm (Firebase Test Lab, AWS Device Farm, BrowserStack, self-hosted devices)
  -> parse JSON / xcresult
  -> compare with stored baseline (median, threshold %)
  -> post results to PR / dashboard; fail on regression beyond threshold
```
- Run full suites nightly and a small smoke set per PR to manage device time.
- Use step-fit or rolling-median comparison to separate real regressions from noise.
- Keep raw traces as CI artifacts for diagnosis.

## What to Cover First
1. Cold startup (with and without Baseline Profile on Android).
2. Main list scroll.
3. Most frequent navigation (open detail screen).
4. Heaviest screen (checkout, editor, map).
5. Memory over a repeated journey.

## Pitfalls
- Running benchmarks on emulators or simulators and trusting absolute numbers.
- Benchmarks without `reportFullyDrawn`, measuring a splash instead of content.
- Single-iteration results.
- Network-dependent tests with live backends.
- Baselines updated automatically on every run, hiding gradual regressions.

## Checklist
- [ ] Macro tests for startup and scroll on both platforms
- [ ] Micro tests for hot algorithms (parsing, diffing)
- [ ] Physical devices, release-like builds, fixed data
- [ ] Baselines stored and reviewed by owners
- [ ] CI fails on regressions beyond threshold and keeps traces
