# Flutter Advanced Topics

## Overview
Advanced Flutter topics cover rendering pipeline optimization, custom painting, platform-specific integration, advanced state management patterns, production monitoring, and build optimization.

## Rendering Pipeline

### Widget, Element, Render Tree
Three trees in Flutter: Widget (configuration, immutable), Element (instance, mutable), RenderObject (layout/paint). Understanding rebuild vs repaint: `build` creates new widget tree, `paint` renders to canvas. `RepaintBoundary` isolates repaint regions.

### CustomPainter
Subclass `CustomPainter` for custom drawing with Canvas API. `shouldRepaint` controls repaint triggers. Use `Path`, `Paint`, `Canvas` methods for shapes. `ClipPath` for clipping. Performance: minimize draw calls, avoid allocating in paint.

### Layout Protocol
`RenderBox` handles layout constraints. `performLayout` sets child sizes using `BoxConstraints`. `computeDryLayout` for intrinsic sizing. Custom `SingleChildLayoutDelegate` for position-based layout. `Flow` widget for efficient reparenting.

### Impeller Engine
Impeller is Flutter's next-gen rendering engine (replaces Skia on iOS). Pre-compiled shaders eliminate jank. Enabled by default on iOS, opt-in on Android. Reduces first-frame latency and eliminates shader compilation jank.

## Advanced State Management

### Riverpod Advanced
`family` modifier for parameterized providers. `autodispose` for cleanup when no listeners. `overrideWith` for testing. `Notifier` (Riverpod 2+) replaces StateNotifier with simpler API. `StreamNotifier` for stream-based state.

### BLoC Advanced
`BlocObserver` for global logging/analytics. `BlocSelector` for targeted rebuilds. `HydratedBloc` for automatic state persistence. `Bloc-to-Bloc` communication via `StreamSubscription`. `Emitter` is async — emit multiple states from one event.

### Custom State Management
`ValueNotifier` + `ValueListenableBuilder` for simple cases. `InheritedWidget`/`InheritedNotifier` for tree-scoped state. `ChangeNotifier` + `ListenableBuilder` for lightweight observable. `Provider` as DI layer under custom implementations.

## Platform Integration

### Method Channel Performance
Batch platform channel calls to reduce overhead. Use `BasicMessageChannel` for string-based communication. `EventChannel` for continuous streams (sensors). Consider `FFI` (dart:ffi) for compute-heavy native code. Profile channel latency with `debugProfilePlatformChannels`.

### Pigeon for Type-Safe Channels
Define message format in `.pigeon` file. Run pigeon to generate Dart + native code. Type-safe, no string-based method names. Supports async (Future) and synchronous calls. Reduces runtime errors from channel mistyping.

### Platform Views
Embed native views in Flutter via `AndroidView` / `UiKitView`. Performance cost: platform views bypass Flutter rendering. Use `HybridComposition` (Android) for keyboard handling. Limit number of platform views per frame.

## Build Optimization

### Tree Shaking and Dead Code
Flutter's tree shaker removes unused widgets and Dart code. Use `--analyze-size` to analyze bundle composition. `--no-tree-shake-icons` if using fewer icons. `--split-debug-info` removes debug symbols from release. Use `dart compile` for aggressive optimization.

### Deferred Loading
`DeferredLibrary` for splitting code into lazy-loaded chunks. Download on demand, never at install. Useful for large features (onboarding, admin panels). Handle load failures gracefully with fallback. Available on Android and web.

### App Size Reduction
Remove unused assets with `flutter clean` and asset audit. Use WebP for images (30% smaller than PNG). Use vector (SVG) over raster when possible. `--android-build-aab` for Play Store app bundles. `--no-codesign` for Android.

## Production Monitoring

### Crash Reporting
Firebase Crashlytics for automatic crash reporting. `FlutterError.onError` for global error handling. `PlatformDispatcher.onError` for platform-level errors. Send breadcrumbs (user actions leading to crash). Deobfuscate stack traces with debug info symbols.

### Performance Monitoring
Firebase Performance for traces and HTTP metrics. Sentry Performance for distributed tracing. Custom `Timeline` events for fine-grained profiling. `DevTools` for local profiling. `flutter build apk --profile` for profile builds.

### Logging and Analytics
`logging` package for structured logs. `Firebase Analytics` for event tracking. `Mixpanel` or `Amplitude` for product analytics. Log level management: verbose in debug, error in production. Never log PII or tokens.

## Animations

### Implicit vs Explicit
`AnimatedContainer`, `AnimatedOpacity`, `TweenAnimationBuilder` for implicit. `AnimationController` + `Tween` for explicit control. `Hero` for shared element transitions. `StaggeredAnimation` for sequenced multi-widget animations. Use 60fps (or 120fps for ProMotion).

### Custom Animations
`AnimatedBuilder` for non-animated child reuse. `TweenSequence` for chained animations. `CurvedAnimation` with easing curves. `AnimationController` with `vsync: this` for ticker management. `SpringSimulation` for physics-based motion.

## Advanced Testing

### Golden Tests
`golden_toolkit` for multi-device golden tests. `deviceFrameBuilder` for device frames. `surfaceSize` configuration per test. Diff threshold for pixel tolerance. CI integration with golden file comparison. Review golden changes manually.

### Integration Testing
`IntegrationTestWidgetsFlutterBinding` for real device testing. `Screenshot` for visual diff in CI. `testAll` for multiple device orientations. `replay` for gesture sequences. Test on both iOS and Android simulators/emulators.

## Key Points
- Impeller engine eliminates shader compilation jank
- RepaintBoundary isolates repaint regions for performance
- Pigeon for type-safe platform channels
- Deferred loading for lazy code chunks
- --analyze-size for bundle composition analysis
- CustomPainter for GPU-accelerated custom drawing
- Riverpod Notifier (2+) for simpler state management
- Sentry/Crashlytics for production error monitoring
- Golden tests for visual regression
- WebP images for 30% bundle size reduction
