# Mobile Snapshot Testing Setup

Scope: native and cross-platform mobile screenshot testing (Android, iOS, Flutter, React Native): tool status, minimal setup, determinism, and an affordable device matrix. Web capture determinism lives in `screenshot-comparison.md`. Facts are current as of late 2026; unverified items are labeled.

## 1. Default Choices

| Platform | Default | Alternative | Avoid for new work |
|---|---|---|---|
| Android (Compose-heavy) | Roborazzi (Robolectric Native Graphics, 1.x, frequent releases) | Paparazzi (layoutlib, device-free; 2.x is alpha) | Google's standalone `com.android.compose.screenshot` plugin ("no longer maintained") |
| Android (real-device fidelity) | Shot or Dropshots on a pinned emulator | Device farm for a few critical screens | Recording on arbitrary local emulators |
| iOS | swift-snapshot-testing (Point-Free) on one pinned simulator | iOSSnapshotTestCase (Uber, v8.x, Obj-C-rooted); Sentry Snapshots (beta, hosted review) | Mixing Intel and Apple Silicon recorders |
| Flutter | Alchemist CI goldens (Ahem text, OS-independent) | Core `matchesGoldenFile` in a pinned Linux image | golden_toolkit (discontinued; last version 0.15.0) |
| React Native | Storybook RN stories captured by Maestro on a pinned simulator/emulator | Sherlo / App Percy for hosted review; Detox or react-native-owl (work in progress) for flows | Jest/RNTL snapshots as "visual" tests (they render a host tree, not pixels) |

The trend is host rendering (JVM layoutlib or Robolectric, `flutter test`, single-simulator trait overrides) over device rendering. Device-based tools are reserved for WebView, SurfaceView, GPU effects, and OEM fonts.

## 2. Android

### Roborazzi

- JVM rendering via Robolectric Native Graphics (RNG); requires Robolectric 4.10-alpha-1 or later.
- Captures Espresso ViewInteractions, Compose nodes, Views, Compose lambdas, Bitmaps.
- Recent releases: 1.75.0, 1.76.0, 1.77.0 (year not shown on the releases page). 1.75 made generated preview tests about 1.6x faster and added experimental `renderScale` (0.5 was about 3.1x faster). Re-record goldens after upgrading: setup order changed.

```kotlin
// app/src/test/kotlin/com/example/ProfileScreenTest.kt
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ProfileScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun profile_default() {
        composeRule.setContent { AppTheme { ProfileScreen(state = ProfileState.sample()) } }
        composeRule.onRoot().captureRoboImage()
    }
}
```

| Task | Purpose |
|---|---|
| `recordRoborazziDebug` | Write goldens |
| `compareRoborazziDebug` | Write diff image + JSON, do not fail |
| `verifyRoborazziDebug` | Fail on diff |
| `verifyAndRecordRoborazziDebug` | Verify, then record |
| `clearRoborazziDebug` | Delete outputs |

Modes can also be set with `roborazzi.test.record` / `compare` / `verify` in `gradle.properties`.

**Preview-driven tests**: `generateComposePreviewRobolectricTests` generates tests from `@Preview` functions via ComposablePreviewScanner, with annotation filtering, `@PreviewWrapper`, and `renderScale`.

**Multiplatform**: Compose Multiplatform iOS (`runComposeUiTest`, `recordRoborazziIosSimulatorArm64`; `filePath` required, WebP unsupported) and Compose Desktop (`runDesktopComposeUiTest`; desktop preview tests are reportedly about 4–6x faster). Desktop and Robolectric goldens are per-platform and not interchangeable.

**Tolerance**: `changeThreshold` (fraction of differing pixels) and `SimpleImageComparator(maxDistance, vShift, hShift)`. Size levers: `resizeScale`, experimental lossless WebP. Optional AI-assisted assertions (Gemini/OpenAI) run only when images differ; treat them as advisory (see `visual-testing-advanced.md`).

**CI pattern from the README (goldens not in git)**:
1. On `main`: run `recordRoborazziDebug`, upload `build/outputs/roborazzi` as a CI artifact.
2. On PRs: download that artifact, run `verifyRoborazziDebug`, upload diffs with `if: always()`.
3. Caveat: Gradle 9 race with multiple Roborazzi tasks (issue #830); JVM rendering is not a real device.

### Paparazzi

- "Render your application screens without a physical device or emulator" (layoutlib).
- Status: latest `2.0.0-alpha05.1` (2026-09-28, layoutlib v16.2.3, AGP 9.0.0 plugin) requires re-recording accessibility goldens. `2.0.0-alpha04` requires **Java 21+** and deprecates `validateAccessibility`. Last stable 1.x: **1.3.5 (2024-11-06)**.

```kotlin
// src/test/kotlin/com/example/LaunchViewTest.kt
class LaunchViewTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_5,
        theme = "android:Theme.Material.Light.NoActionBar",
    )

    @Test
    fun launch_default() {
        paparazzi.snapshot { AppTheme { LaunchScreen() } }
    }
}
```

| Task | Output |
|---|---|
| `recordPaparazziDebug` | Goldens in `src/test/snapshots` |
| `verifyPaparazziDebug` | Diffs in `build/paparazzi/failures` |
| `testDebug` | HTML report |

Gotchas: wrap Composables that need inspection mode (e.g., `GoogleMap()`) in a `CompositionLocalProvider` because `LocalInspectionMode` is not set globally; set `LottieTask.EXECUTOR` to the calling thread; Jetifier users need `android.jetifier.ignorelist`. Accessibility snapshots render a legend of accessibility labels next to the UI.

Storage: Git LFS for snapshot PNGs plus a CI/pre-receive check rejecting PNGs committed without LFS.

```text
# .gitattributes
**/snapshots/**/*.png filter=lfs diff=lfs merge=lfs -text
```

### Google Compose Preview Screenshot Testing

- The standalone `com.android.compose.screenshot` plugin page says it "is no longer maintained". Legacy model: `@PreviewTest` on `@Preview` composables in the `screenshotTest` source set; tasks `updateDebugScreenshotTest` / `validateDebugScreenshotTest`; references in `src/screenshotTestDebug/reference`. Renaming a `@PreviewTest` function orphans its references.
- Replacement: **AGP test suites**, experimental, AGP 9.5.0-alpha03+ and engine `0.0.1-alpha16`.

```properties
# gradle.properties
android.experimental.enableScreenshotTest=true
android.experimental.testSuiteSupport=true
android.compose.screenshot.maxHeapSize=4g
```

Configure under `testOptions { screenshotTests.create("screenshotTest") { ... } }` with `engineVersion` and `targetVariants`; check exact property syntax in the AGP test-suites page, since the API is experimental. Tasks: `update{Suite}{Target}{Variant}TestSuite` / `test{Suite}{Target}{Variant}TestSuite`. Reports classify failures as Reference Image Missing, Size Mismatch, or Pixel Mismatch. Matrix via `@Preview` params (`uiMode`, `fontScale`) and multi-previews; each variant hashes into a distinct reference name. KMP non-Android targets are unsupported.

### Shot and Dropshots (device/emulator)

- **Shot**: `ShotTestRunner` instrumentation; hides cursors and scrollbars, waits for Espresso idle. Record `./gradlew executeScreenshotTests -Precord`, verify `./gradlew executeScreenshotTests`. `shot { tolerance = 0.1 }` (percent) mainly for Compose. Maintenance status unconfirmed.
- **Dropshots**: on-device assertions inside normal instrumentation tests; record via the `dropshots.record` Gradle property; setup docs show plugin `0.4.0`. Record on an emulator configured identically to the comparison emulator.
- Both: disable emulator animations; pin the emulator system image.

## 3. iOS

### swift-snapshot-testing

- Minimum recommended `from: "1.12.0"` (latest version unconfirmed). Supports XCTest and Swift Testing; iOS, macOS, tvOS, Linux.
- Strategies: `.image`, `.recursiveDescription`, `.dump`, `.json`, `.plist`, `.raw`, custom.
- Missing snapshots are recorded automatically; record modes `.all` / `.failed`.

```swift
// Tests/ProfileTests/ProfileViewTests.swift
import SnapshotTesting
import Testing
@testable import Profile

@Suite(.snapshots(record: .failed))
struct ProfileViewTests {
    @Test func defaultState() {
        let vc = ProfileViewController(state: .sample)
        assertSnapshot(of: vc, as: .image(on: .iPhone13))
    }

    @Test func darkLargeText() {
        let vc = ProfileViewController(state: .sample)
        let traits = UITraitCollection(traitsFrom: [
            .init(userInterfaceStyle: .dark),
            .init(preferredContentSizeCategory: .accessibilityExtraLarge),
        ])
        assertSnapshot(of: vc, as: .image(on: .iPhone13, traits: traits))
    }
}
```

- README: "Snapshots must be compared using the exact same simulator that originally took the reference." Device-agnostic rendering lets one simulator render several device types and trait collections.
- Since iOS 13 the simulator renders on the GPU; shadows with opacity ≠ 1 differ between Apple Silicon and Intel. PR #628 proposed a default `perceptualPrecision` of 0.98 on Intel; not merged. Use `.image(precision: 0.99, perceptualPrecision: 0.98)` only as a calibrated escape hatch (exact semantics unverified).
- Local vs Xcode Cloud differences are reported on Apple Developer Forums without an official fix.
- Ecosystem: AccessibilitySnapshot (Cash App), Prefire (tests from SwiftUI Previews), PreviewSnapshots, SnapshotTestingHEIC, SnapshotVision.

### iOSSnapshotTestCase (Uber)

"Maintained by Uber"; install examples pin 8.0.0. `recordMode = YES` in `setUp` to record. `fileNameOptions` appends device model, OS version, screen size, scale to reference names for per-device references. `Core` subspec lacks Swift support.

### Sentry Snapshots (beta)

Upload PNG/JPEG from SnapshotPreviews or any tool with `sentry-cli snapshots upload`; hosted diffing, review, GitHub status checks; Fastlane plugin offers `diff_threshold`. Pricing and Android support not found.

### iOS CI rules

- Pin Xcode version, simulator model, and runtime (e.g., `.xcode-version`).
- Record on the same architecture as CI (Apple Silicon runners are now standard).
- Isolate snapshot tests in their own test plan (`-only-testing`); build once, fan out to simulators.

## 4. Flutter

```dart
// test/widgets/primary_button_test.dart
testWidgets('primary button golden', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: Center(child: PrimaryButton(label: 'Pay'))));
  await expectLater(find.byType(PrimaryButton), matchesGoldenFile('goldens/primary_button.png'));
});
```

- `matchesGoldenFile` is async (`expectLater`); accepts a Finder, `ui.Image`, or `Future<ui.Image>`; captures the nearest `RepaintBoundary`. Update with `flutter test --update-goldens`.
- Tests use the Ahem font by default. Custom fonts "can render differently across operating systems and Flutter versions"; load them with `FontLoader` in `setUpAll` in `flutter_test_config.dart`.
- `goldenFileComparator` (default `LocalFileComparator`) can be subclassed to add tolerance.
- Goldens render in `flutter_tester`, not on device; PlatformViews are not captured. Impeller's effect on golden determinism was not researched.

### Alchemist (0.14.1, betterment.dev)

```dart
// test/flutter_test_config.dart
import 'dart:async';
import 'dart:io';
import 'package:alchemist/alchemist.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) {
  final isCi = Platform.environment.containsKey('CI');
  return AlchemistConfig.runWithConfig(
    config: AlchemistConfig(
      platformGoldensConfig: PlatformGoldensConfig(enabled: !isCi), // readable goldens locally only
    ),
    run: testMain,
  );
}
```

```dart
// test/goldens/button_golden_test.dart
goldenTest(
  'PrimaryButton states',
  fileName: 'primary_button',
  builder: () => GoldenTestGroup(
    children: [
      GoldenTestScenario(name: 'enabled', child: const PrimaryButton(label: 'Pay')),
      GoldenTestScenario(name: 'disabled', child: const PrimaryButton(label: 'Pay', onPressed: null)),
    ],
  ),
);
```

- **Platform goldens**: readable text, host-dependent. **CI goldens**: Ahem + `obscureText` (colored rectangles over text), OS-independent. Commit CI goldens; generate platform goldens locally for human review.
- Config: `renderShadows`, `diffThreshold` (default 0.0), `filePathResolver`, `platforms`, theme.
- Codemagic documents Apple Silicon vs Intel differences affecting Flutter goldens too.

## 5. React Native

- Jest + RNTL: logic and accessibility queries, JSON snapshots only.
- Storybook RN has "no built-in visual testing". Its docs recommend Maestro flows that deep-link to each story, wait for animations, capture, and compare in CI, with `onDeviceUI: false`.

```yaml
# maestro/stories/button-primary.yaml — deep-link scheme is app-specific
appId: com.example.app
---
- openLink: "exampleapp://storybook?storyId=button--primary"
- waitForAnimationToEnd
- takeScreenshot: button--primary
```

- Compare captured files against committed baselines with a script or a hosted service (Sherlo, App Percy). Maestro's built-in screenshot assertion capabilities as of 2026 were not verified.
- Community: `@powala/react-native-visual-regression` (Storybook-based, baseline on first run), react-native-preflight (screen-level Maestro tests with HTML reports). Loki is listed by Storybook RN docs but its repository status is ambiguous (the archived repo found may not be canonical `oblador/loki`).
- App Percy desktop pricing of $199/month for 10,000 screenshots comes from a secondary aggregator: unverified.
- iOS and Android determinism rules apply unchanged: pinned simulator/emulator image, OS, Xcode, animations off.

## 6. Affordable Device Matrix

Express variants as configuration, not devices: `@Preview` params, DeviceConfig, trait collections, Alchemist scenarios.

| Axis | Design-system components | Feature screens |
|---|---|---|
| Width | Phone + tablet/foldable only for adaptive layouts | Phone |
| Theme | Light + dark | Default |
| Text size | Default + largest font scale / dynamic type | Default |
| Direction / locale | LTR + one RTL pseudo-locale (ar-XB); en-XA for expansion | Default |
| Real device | No | Only fidelity-critical screens (WebView, GPU, OEM fonts) |

- Host-rendered tolerance: zero or near zero. About 0.1% or perceptual 0.98 only for GPU/device rendering.
- Never record on PR branches automatically. Record on `main` or via an approved command.
- Re-record intentionally after renderer or tool upgrades (layoutlib, Robolectric, Xcode, Flutter): several changelogs require it.
- Screenshots do not verify interactions: Airbnb generates screenshot tests from mock Fragment "states" and added a separate interaction-testing layer.
- No quantitative data compares device-farm cost with JVM rendering; host rendering is the default for cost and speed reasons, not measured savings.
