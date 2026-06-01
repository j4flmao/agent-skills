# Android Advanced Topics

## Introduction
Advanced Android topics cover performance profiling, custom build variants, Compose internals, complex animations, Kotlin coroutines patterns, advanced testing, and production deployment optimization.

## Advanced Compose Patterns

### Composition Locals and Custom Theming
Create typed `CompositionLocal` for app-wide dependencies without parameter drilling. `CompositionLocalProvider` scopes values to subtree. Use `MaterialTheme` extension for custom color/typography/shape schemes. `LocalDensity`, `LocalConfiguration` for platform values.

### Side Effects and LaunchedEffect
`LaunchedEffect` launches coroutine in Compose's scope, cancels on recomposition. `DisposableEffect` for cleanup on leave. `rememberCoroutineScope` for launching from callbacks. `snapshotFlow` converts Compose state to Flow. `produceState` bridges non-Compose async to Compose state.

### Custom Layouts and Modifiers
Implement `Layout` composable for custom measure/layout logic. Create custom `Modifier` with `Modifier.composed` or `ModifierNode`. Use `IntrinsicMeasurable` for parent-driven sizing. `SubcomposeLayout` for lazy content with custom layout.

### Lazy List Optimization
`LazyColumn`/`LazyRow` with stable keys via `key` parameter. `itemsIndexed` for position-aware items. `PagingData` integration with `collectAsLazyPagingItems()`. Use `contentType` for heterogeneous items. Avoid unstable parameters in item composables.

## Performance Optimization

### Baseline Profiles
Place `baseline-prof.txt` in `src/main` to AOT-compile critical code paths. Improves cold start by 30-40%. Generate with Macrobenchmark + BaselineProfileRule. Update profiles each release as code paths change.

### Macrobenchmark
Use `MacrobenchmarkRule` in `androidx.benchmark` to measure startup, scrolling, and user journeys. Run on physical device (not emulator). Compare against baseline in CI. Track frame timing, startup modes (cold/warm/hot).

### Memory Profiling
Android Studio Memory Profiler for heap snapshots and allocation tracking. LeakCanary for automatic leak detection. `hprof` analysis with MAT or Android Studio. Track `onTrimMemory()` callbacks. Use `WeakReference` for caches. Avoid static references to Activity/Context.

### Startup Tracing
Use `androidx.tracing.Trace` with `trace("section")` blocks. Enable with `android:debuggable=false` in release. Analyze with Perfetto or systrace. Defer SDK init with `App Startup` library. Use `IdleHandler` for post-first-frame work.

## Coroutines & Flow

### Structured Concurrency
`viewModelScope` auto-cancels on ViewModel clear. `lifecycleScope` for lifecycle-bound work. `repeatOnLifecycle` for restarting on resume. `shutdownOn()` for cleanup. Never use `GlobalScope` in production.

### Flow Sharing and State
`stateIn`/`shareIn` with `WhileSubscribed(5000)` for UI state. `flatMapLatest` for request-per-key patterns. `callbackFlow` for bridging listeners. `channelFlow` for concurrent producers. `buffer` with `DROP_OLDEST` for UI-bound flows.

### Exception Handling
`catch {}` operator in Flow chains. `retry` with exponential backoff for network flows. `onCompletion` for cleanup. SupervisorJob for independent child failure. `supervisorScope` in ViewModel for parallel tasks.

## Build System

### Gradle Performance
Enable Gradle build cache and configuration cache. Use `libs.version.toml` for dependency management. Configure `kotlin.daemon.jvmargs` for daemon memory. Use `--parallel` and `--build-cache` in CI. Avoid dynamic versions.

### Custom Build Types and Flavors
Define `buildTypes` (debug, release, staging) and `productFlavors` (demo, full, enterprise). Use `buildConfigField` and `resValue` for per-variant config. `flavorDimensions` for multi-axis variants. Source sets per flavor combo.

### R8/ProGuard Rules
`minifyEnabled = true` with `proguard-android-optimize.txt`. Keep rules for serialization, reflection, and JNI. Generate mapping files for crash deobfuscation. Use `-printusage` to find unused code. Test release build thoroughly.

## Advanced Testing

### Robolectric
Run Android tests on JVM without emulator. Shadow classes simulate Android framework. Test Activity lifecycle, Intent handling, and resource loading. Fast feedback for CI. Combine with Compose test for UI validation.

### Screenshot Testing
Paparazzi for Composable screenshot tests (JVM, fast). Shot for Activity screenshots. Store golden images in version control. Require human review for golden changes. Run in CI with failure on mismatch.

### Hermetic Testing
Use `mockwebserver` (OkHttp) for API mocking. In-memory Room database for DAO tests. AndroidX Test Orchestrator for test isolation. Google Truth for fluent assertions. `Turbine` for Flow testing.

## Security

### Play Integrity API
Verify app authenticity and device integrity. Request integrity token from server for server-side validation. Detect rooted devices, custom ROMs, and debug builds. Nonce per request (cryptographically random). Handle network failures gracefully (degrade, don't block).

### Runtime Protection
Debug detection: `android.os.Debug.isDebuggerConnected()`. Emulator detection: check Build properties, IMEI, radio version. Integrity verification: validate APK signature at runtime. Tamper detection: compare app signing certificate hash.

## Production Deployment

### App Bundles and App Thinning
Upload AAB to Play Store for device-specific APK generation. Configure `onDemandResources` for large assets. Language, density, and ABI splits in `bundle` config. Test with `bundletool` before release.

### Play Feature Delivery
Deliver feature modules on-demand (`install-time`, `on-demand`, `conditional`). Use `SplitInstallManager` for requesting modules. Decrease initial install size by 40-60%. Handle module download failures with fallback UI.

## Key Points
- Baseline Profiles for 30-40% cold start improvement
- Macrobenchmark on physical device for reliable performance measurement
- StateFlow + State for reactive Compose UI
- Configuration cache + version catalog for faster builds
- R8 mapping files essential for crash deobfuscation
- Play Feature Delivery for modular app distribution
- Robolectric for fast Android unit tests on JVM
- Play Integrity API for device attestation
- LeakCanary + hprof analysis for memory leak detection
- `flatMapLatest` + `stateIn` for reactive data flows
- Compose stability: stable params prevent unnecessary recomposition
- `DisposableEffect` for proper resource cleanup
