# React Native Advanced Topics

## Overview
Advanced React Native topics cover the New Architecture (Fabric + TurboModules), performance profiling, custom native modules, advanced animations, code push, and production monitoring.

## New Architecture

### Fabric Renderer
Replaces the old bridge-based renderer. Direct communication between JS and native via JSI. Synchronous native method calls (no JSON serialization). Enables React Suspense and concurrent mode. Migration: enable `newArchEnabled` in `gradle.properties` and Podfile.

### TurboModules
Native modules accessible synchronously from JS. No bridge serialization overhead. Codegen generates C++/Java/ObjC bindings from JavaScript specs. Used by React Native core modules. Custom TurboModule for high-performance native interop.

### Codegen
TypeScript specs define native module interfaces. Run codegen to generate native code stubs. Ensures type safety across JS/native boundary. Reduces manual platform code. Integrates with build phase script.

## Performance Optimization

### JS Thread Profiling
Use Flipper (React DevTools) for JS thread flamegraphs. Hermes sampling profiler (`hermes-profile-transformer`). `InteractionManager.runAfterInteractions` for deferring non-critical work. Move heavy computation to native via TurboModules or worklets.

### UI Thread Optimization
Reanimated 3 worklets run animations on UI thread (no bridge). `useAnimatedStyle` for performant animated properties. `withSpring`/`withTiming` for native-driven animations. `runOnUI` for UI thread functions. Avoid `useNativeDriver: false` in Animated API.

### List Performance
FlatList with `getItemLayout` for fixed-height items. `windowSize` and `maxToRenderPerBatch` tuning. `removeClippedSubviews` for off-screen items. `React.memo` for list item components. `FlashList` from Shopify for 10x faster lists.

### Image Optimization
`react-native-fast-image` for disk-cached, prioritized image loading. Downsample images to display size. `Image.getSize` before rendering. Use WebP format (supported on both platforms). Prefetch critical images after app launch.

## Advanced Animations

### Reanimated 3
Worklet-based animations on UI thread. `useSharedValue` for animatable values. `useAnimatedStyle` for style mapping. `withSpring` / `withTiming` / `withSequence` for complex sequences. `GestureHandler` + Reanimated for gesture-driven animations.

### Skia
`@shopify/react-native-skia` for GPU-accelerated 2D graphics. Custom drawing with Canvas API. Path operations, shaders, image filters. Use for charts, creative UI, and game-like interfaces. Not just animations — full rendering control.

### Layout Animations
`react-native-reanimated` LayoutAnimations for enter/exit transitions. `entering`, `exiting`, `layout` props on Animated components. `FadingTransition`, `SlideInRight`, `ZoomIn` presets. Custom layout transitions with `LayoutAnimationConfig`.

## Custom Native Modules

### iOS (Objective-C/Swift)
`RCT_EXPORT_MODULE` for module registration. `RCT_EXPORT_METHOD` for async methods (callback or Promise). `RCTEventEmitter` for native-to-JS events. TurboModule: implement `RCTTurboModule` protocol, register in `ModuleProvider`.

### Android (Java/Kotlin)
Extend `ReactContextBaseJavaModule`. `@ReactMethod` annotation for exported methods. `@ReactModule` annotation. `WritableMap`/`ReadableMap` for data passing. TurboModule: implement generated interface from codegen.

### Thread Safety
Native modules receive calls on different threads. Use `@UiThread` / `@WorkerThread` annotations (Android). Dispatch UI work to main queue (iOS). Synchronize access to shared mutable state. Avoid blocking the JS thread.

## Production Monitoring

### Crash Reporting
Sentry React Native for crash tracking. `BeforeSend` callback for breadcrumbs. `react-native-exception-handler` for native crash fallbacks. Hermes debug symbols for symbolicated stack traces. Upload source maps for JS deobfuscation.

### Performance Monitoring
Firebase Performance for HTTP tracing. `react-native-performance` for custom trace measurements. Native performance monitoring with MetricKit (iOS) and Macrobenchmark (Android). Track TTI, FPS, and memory.

### Analytics
Firebase Analytics for event tracking. Amplitude/Mixpanel for product analytics. Segment for multi-destination routing. Event naming: `[category]_[action]` convention. Avoid logging PII — strip before sending.

## Code Push

### Expo Updates
`expo-updates` for OTA JS updates (no store review). Update manifest serves new bundle. Rollback capability via version checking. Configure channel per environment (staging/production). Test updates before publishing.

### Microsoft CodePush (App Center)
Deprecated — migrate to expo-updates or custom solution. Push JS bundle updates without store review. Deployment keys per environment. Mandatory vs optional updates. Rollback monitoring with crash tracking.

## Advanced Testing

### Detox Advanced
Mock server with `device.setURLBlacklist` for offline testing. `device.reloadReactNative` for fresh JS context. Device-specific test configurations. Parallel test execution on multiple simulators. CI integration with detox-cli.

### Storybook
`@storybook/react-native` for component development and visual testing. On-device UI explorer. Snapshot testing with Storyshots. Document component props and states. Share with designers for review.

## Key Points
- New Architecture (Fabric + TurboModules) for direct native communication
- Reanimated 3 worklets for UI thread animations
- FlashList for 10x faster list performance
- Skia for GPU-accelerated 2D graphics
- TurboModules for high-performance native interop
- Expo Updates for OTA JS updates
- Sentry with Hermes symbols for crash deobfuscation
- react-native-fast-image with disk caching
- GestureHandler + Reanimated for gesture-driven animations
- Storybook for component visual documentation
