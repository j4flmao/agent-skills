# Build and Runtime Tuning for Mobile Apps

Compiler, packaging and runtime settings that affect speed, size and memory: R8 and ART compilation on Android, Swift/Clang optimization and linking on iOS, app size reduction, and runtime knobs that are safe to change.

## Android

### R8 (shrinking, optimization, obfuscation)
```kotlin
// build.gradle.kts (app)
android {
  buildTypes {
    release {
      isMinifyEnabled = true          // R8 code shrinking + optimization
      isShrinkResources = true        // remove unused resources (requires minify)
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }
}
```
- R8 full mode is the default since AGP 8.0; it optimizes more aggressively and may need keep rules for reflection-based code.
- Keep rules: as narrow as possible (`-keep class com.example.api.dto.** { <fields>; }`), prefer libraries' consumer rules; broad `-keep class **` disables most benefits.
- Upload `mapping.txt` to Play Console and crash tools to de-obfuscate stack traces.

### ART compilation
| Mode | When | Effect |
|---|---|---|
| Interpreter + JIT | Fresh install without profiles | Slow first runs, JIT warms up |
| Baseline Profile (AOT for listed methods) | Installed via Play or `profileinstaller` | Fast startup and first interactions |
| Cloud profiles | Aggregated from users by Play | Applies after early adopters' runs |
| Background dexopt | Device idle and charging | Compiles hot code from local profiles |

```kotlin
// baselineprofile module, generator test
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
  @get:Rule val rule = BaselineProfileRule()
  @Test fun generate() = rule.collect(packageName = "com.example.app") {
    pressHome(); startActivityAndWait()
    device.findObject(By.res("feed")).fling(Direction.DOWN)
  }
}
```
Run with `./gradlew :app:generateBaselineProfile`; the profile is written to `src/<variant>/generated/baselineProfiles/` and packaged automatically by the `androidx.baselineprofile` plugin.

Force a compilation mode locally to compare:
```bash
adb shell cmd package compile -f -m speed-profile com.example.app   # profile-guided
adb shell cmd package compile -f -m verify com.example.app          # no AOT (worst case)
```

### Other Android settings
| Setting | Guidance |
|---|---|
| `android:largeHeap` | Avoid; hides leaks and raises GC pause cost |
| `android:hardwareAccelerated` | On by default; do not disable for whole app |
| Native libraries | Ship only needed ABIs via App Bundle splits; `useLegacyPackaging = false` keeps `.so` uncompressed and page-aligned (Google Play requires 16 KB page-size support for new apps and updates targeting Android 15+ from November 2025; build native code with NDK r28+ or 16 KB alignment flags) |
| Kotlin | Use KSP instead of kapt; avoid reflection-heavy libraries on hot paths |
| Debug-only libraries | `debugImplementation` (LeakCanary, Chucker, Flipper-like tools) |
| Logging | Strip verbose logs in release (R8 `-assumenosideeffects` for `Log.v/d`) |

## iOS

### Compiler settings (Release)
| Setting | Recommended |
|---|---|
| `SWIFT_OPTIMIZATION_LEVEL` | `-O` (speed); `-Osize` if binary size matters more |
| `SWIFT_COMPILATION_MODE` | `wholemodule` |
| `GCC_OPTIMIZATION_LEVEL` | `s` (fastest, smallest) |
| `DEAD_CODE_STRIPPING` | YES |
| `STRIP_INSTALLED_PRODUCT`, `STRIP_SWIFT_SYMBOLS` | YES for release, keep dSYMs |
| `DEBUG_INFORMATION_FORMAT` | `dwarf-with-dsym` (upload dSYMs for symbolication) |
| `ENABLE_TESTABILITY` | NO in release |
| Link-time optimization (`LLVM_LTO`) | Consider `YES_THIN` for C/ObjC heavy code; measure build time |

### Linking and launch
- Each dynamic framework adds dyld work at launch; prefer static libraries/frameworks or mergeable libraries (Xcode 15+) for release builds.
- Swift Package Manager products default to static linking unless declared `.dynamic`.
- Avoid ObjC `+load` methods and C++ static constructors with side effects.

### Swift code-level tuning
- Mark classes `final` and members `private`/`fileprivate` to enable direct dispatch.
- Prefer value types for small models; watch copy-on-write of large arrays mutated in loops.
- Use `ContiguousArray` for large homogeneous arrays of class types in hot loops.
- Avoid existential-heavy (`any Protocol`) code in hot paths; generics specialize.

## App Size

| Lever | Android | iOS |
|---|---|---|
| Per-device delivery | App Bundle (ABI, density, language splits) | App Thinning (slicing) |
| Code shrinking | R8 | Dead code stripping, `-Osize` |
| Resources | `shrinkResources`, WebP/vector drawables | Asset catalogs (compressed, slicing), HEIC |
| Large optional content | Play Feature/Asset Delivery | On-demand resources, Background Assets |
| Reports | Play Console size report, `bundletool get-size total` | App Store Connect size report, App Thinning Size Report (`-exportOptionsPlist` with thinning) |

```bash
bundletool build-apks --bundle=app-release.aab --output=app.apks
bundletool get-size total --apks=app.apks --dimensions=ABI,SCREEN_DENSITY
```

## Runtime Knobs

| Knob | Notes |
|---|---|
| Image cache sizes | Size by bytes relative to device memory class; trim on pressure |
| HTTP cache size | Typically tens of MB on disk; measure hit rate |
| Thread pool limits | `limitedParallelism`, OperationQueue `maxConcurrentOperationCount` |
| Prefetch distance in lists | Balance smoothness vs. wasted work and data |
| Animation frame rate | Request high rates only during animations |
| Remote-config kill switches | Disable expensive features per device tier without a release |

## Device-Tier Adaptation
```kotlin
val am = context.getSystemService(ActivityManager::class.java)
val lowRam = am.isLowRamDevice
val memClassMb = am.memoryClass
val imageCacheBytes = (memClassMb * 1024L * 1024L) / if (lowRam) 16 else 8
```
On iOS use `ProcessInfo.processInfo.physicalMemory` and `os_proc_available_memory()` to scale caches; disable heavy effects when `isLowPowerModeEnabled` or thermal state is serious.

## Pitfalls
- Benchmarking with `isMinifyEnabled = false` or Debug configuration.
- Over-broad keep rules silently doubling dex size.
- Shipping dynamic frameworks for every SPM module.
- Losing mapping files or dSYMs, making production traces unreadable.

## Checklist
- [ ] R8 and resource shrinking on; keep rules narrow
- [ ] Baseline Profile generated in CI for each release
- [ ] iOS release uses whole-module optimization and minimal dynamic frameworks
- [ ] Mapping files and dSYMs uploaded per build
- [ ] Size tracked per release with per-device numbers
- [ ] Caches and pools scaled by device tier
