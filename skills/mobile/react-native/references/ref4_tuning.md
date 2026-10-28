# React Native Build, Startup and Size Tuning

Tuning that happens at build and startup time: bundle size, Hermes bytecode, native binary size, startup work and release build settings. Runtime rendering performance (re-renders, lists, animations) is in `performance.md` and `performance-hermes.md`.

## Measure First

| Metric | How to measure |
|--------|----------------|
| Cold start (TTID / TTFD) | Android: `adb shell am start -W -n com.app/.MainActivity` (TotalTime), Macrobenchmark `StartupTimingMetric`; iOS: Xcode Organizer launch metrics, Instruments App Launch |
| JS bundle size | `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output out.js --sourcemap-output out.map` then `npx source-map-explorer out.js out.map` |
| Expo bundle composition | `npx expo export` then Expo Atlas (`EXPO_ATLAS=1 npx expo start`) |
| Android download size | Play Console app size report; `bundletool get-size total` |
| iOS size | App Store Connect / App Thinning Size Report |

Always measure release builds on a low-end physical Android device; debug builds are not representative.

## Hermes

- Hermes is the default engine; Metro output is compiled to Hermes bytecode at build time, so no JS parsing happens at startup.
- Do not disable Hermes for size or speed reasons without measurements.
- Hermes V1 (the next-generation engine) is opt-in in recent releases; evaluate it on a branch with your own startup and memory measurements.
- Keep `Intl` usage in mind: Hermes ships its own Intl support; test locale-heavy formatting on both platforms.

## JS Bundle Size and Startup Work

1. Remove heavy dependencies: replace `moment` with `date-fns`/`Temporal` polyfill subsets, full `lodash` with per-method imports or native code.
2. Avoid barrel files (`index.ts` re-exporting everything) in hot paths; they defeat lazy evaluation.
3. Enable inline requires so modules evaluate on first use:

```js
// metro.config.js (bare RN; Expo enables a similar optimisation by default)
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    getTransformOptions: async () => ({
      transform: { experimentalImportSupport: false, inlineRequires: true },
    }),
  },
});
```

4. Lazy-load rarely used screens (`React.lazy` with Suspense, or route-level splitting in Expo Router).
5. Defer non-critical SDK initialisation (analytics, chat widgets, feature-rich SDKs) until after the first screen is interactive.
6. Strip `console.*` in production with `babel-plugin-transform-remove-console` if logs are verbose.

## Android Release Settings

```properties
# android/gradle.properties
newArchEnabled=true
hermesEnabled=true
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64   # trim for local builds only
```

```groovy
// android/app/build.gradle
def enableProguardInReleaseBuilds = true

android {
  buildTypes {
    release {
      minifyEnabled enableProguardInReleaseBuilds
      shrinkResources enableProguardInReleaseBuilds
      proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
  }
}
```

- Ship an Android App Bundle (AAB); Play generates per-ABI and per-density APKs.
- R8 needs keep rules for reflection-based libraries; test release builds in CI.
- Upload the R8 `mapping.txt` to crash reporting.
- Baseline Profiles improve startup of the native/Java portion; React Native apps can add them with the Android Baseline Profile Gradle plugin and Macrobenchmark.

## iOS Release Settings

- Release configuration: `Optimization Level` = `-Os`/`-O` (Xcode default for Release), dead-code stripping enabled, bitcode no longer used (removed in Xcode 14).
- Use asset catalogs so App Thinning delivers only needed image scales.
- Recent React Native versions can consume precompiled iOS core binaries; this shortens build times, not app runtime. Follow your RN version's release notes to enable it.

## Assets

| Asset | Tuning |
|-------|--------|
| Images | Serve correctly sized images from a CDN; WebP/AVIF; `expo-image` caching |
| Bundled images | Provide @2x/@3x only, compress at build time |
| Fonts | Only weights you use; variable fonts where supported |
| Lottie | Prefer small JSON or dotLottie; avoid huge embedded images |
| Large data files | Download on demand instead of bundling |

## Startup Code Patterns

```ts
// Bad: top-level side effects in many modules
import './analytics';   // initialises SDK at import time

// Good: explicit, deferred initialisation
InteractionManager.runAfterInteractions(() => {
  initAnalytics();
  prefetchHomeData();
});
```

- Keep the root component free of synchronous storage reads of large values.
- Avoid rendering the entire tab tree on launch; tabs are lazy by default in React Navigation, keep it that way.

## Memory

- Watch memory on image-heavy screens; recycle with FlashList, downsample images.
- Hermes heap snapshots (React Native DevTools Memory tab) for JS leaks: unremoved listeners, growing caches, closures capturing large arrays.
- Android: check `onTrimMemory` behaviour by backgrounding the app and reopening.

## CI Guardrails

- Fail the build when the JS bundle grows beyond an agreed budget (compare `out.js` size per PR).
- Track cold start in a nightly Macrobenchmark/XCTest run on a fixed device.
- Run a release-mode smoke test (R8/minification issues only appear there).

## Checklist

- [ ] Startup and size measured on release builds on a low-end device
- [ ] Hermes enabled; inline requires on
- [ ] Heavy SDK initialisation deferred past first screen
- [ ] R8 + resource shrinking on; mapping files uploaded
- [ ] AAB for Play; asset catalogs on iOS
- [ ] Bundle-size budget enforced in CI
