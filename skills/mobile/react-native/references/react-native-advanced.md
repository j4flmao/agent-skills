# React Native Advanced Topics

Production topics beyond the basics: the New Architecture runtime model, threading, animations and graphics, native extensibility, OTA updates and monitoring. Deep dives live in siblings: `fabric-renderer.md`, `performance-hermes.md`, `ref6_apis.md` (native modules), `ref8_deployment.md` (release/OTA).

## New Architecture Runtime Model

The New Architecture (JSI + Fabric + TurboModules + Codegen) became the default in React Native 0.76 and is the only architecture in current releases (0.82 dropped the legacy bridge). Libraries that still rely on the old bridge APIs only work through the interop layer or not at all; check them on reactnative.directory before upgrading.

| Piece | Role |
|-------|------|
| JSI | C++ interface letting JS hold references to native objects and call them directly; no JSON bridge |
| Fabric | C++ renderer; shadow tree shared across platforms; supports concurrent React features (Suspense, transitions, `useLayoutEffect` reading layout synchronously) |
| TurboModules | Lazily loaded native modules called through JSI; sync or async methods |
| Codegen | Generates C++/ObjC++/Java/Kotlin glue from typed TS specs (`NativeFoo.ts`) |
| Bridgeless mode | Runtime no longer initialises the legacy bridge |

### Threads

| Thread | Runs | Blocking it causes |
|--------|------|--------------------|
| JS thread | React render, business logic, event handlers | Dropped JS frames, slow taps |
| UI (main) thread | Native view mounting, gestures, native animations | Visible jank |
| Background (Fabric) | Layout (Yoga), shadow tree commit | Late layout |

Keep heavy work (JSON parsing of large payloads, crypto, image processing) in native code or off the JS thread.

## Animations and Gestures

- **Reanimated 4** (New Architecture only) runs worklets on the UI thread. Worklet runtime moved to `react-native-worklets`; add its Babel plugin (`react-native-worklets/plugin`) as the last plugin.
- Reanimated 4 adds CSS-style animations and transitions (`animationName`, `transitionProperty` in styles) alongside shared-value APIs (`useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`).
- **Gesture Handler** (`Gesture.Pan()`, `GestureDetector`) recognises gestures natively; combine with Reanimated so gesture-driven animation never touches the JS thread.
- Built-in `Animated`: always `useNativeDriver: true` where the property supports it (transform, opacity).

```tsx
const offset = useSharedValue(0);
const pan = Gesture.Pan()
  .onChange((e) => { offset.value += e.changeX; })
  .onEnd(() => { offset.value = withSpring(0); });
const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

return (
  <GestureDetector gesture={pan}>
    <Animated.View style={[styles.card, style]} />
  </GestureDetector>
);
```

## Graphics

`@shopify/react-native-skia` renders 2D graphics (paths, shaders, image filters, text) on the GPU and integrates with Reanimated shared values. Use it for charts, custom progress indicators and visual effects that would otherwise need many nested views.

## Lists and Images

| Need | Use |
|------|-----|
| Long, heterogeneous lists | `@shopify/flash-list` (v2 needs no `estimatedItemSize` and targets the New Architecture) |
| Simple list < few hundred rows | `FlatList` with `keyExtractor`, memoised `renderItem`, `getItemLayout` for fixed heights |
| Image caching, modern formats | `expo-image` (disk/memory cache, blurhash previews while loading, AVIF/WebP) |

`react-native-fast-image` is unmaintained; prefer `expo-image`, which works in bare apps via `expo` modules.

## Native Extensibility

Pick, in order of effort:
1. Existing library (check New Architecture support).
2. **Expo Modules API** (Swift/Kotlin DSL; works in bare RN with `npx install-expo-modules`).
3. **Turbo Native Module** with Codegen spec (C++/ObjC++/Kotlin), or a pure **C++ TurboModule** shared across platforms.
4. **Fabric Native Component** for custom native views.

Details and code in `ref6_apis.md`.

## Over-the-Air Updates

Microsoft App Center, including CodePush, was retired on 2025-03-31. Current options:

| Option | Notes |
|--------|-------|
| EAS Update (`expo-updates`) | Works in Expo and bare apps; channels, branches, rollouts, rollback, code signing |
| Self-hosted server implementing the Expo Updates protocol | Full control, you operate it |

Rules: gate updates by `runtimeVersion` so JS never runs against an incompatible native binary; update only JS/assets (store policies forbid changing app purpose via OTA); roll out to a percentage first and roll back on crash spikes.

## Debugging and Profiling

- **React Native DevTools** (Chrome DevTools frontend for Hermes, opened with `j` in Metro) replaced Flipper and the remote JS debugger; Flipper integration was removed from the template in 0.74.
- React DevTools Profiler for render counts; Hermes sampling profiler for JS CPU.
- Native: Xcode Instruments (Time Profiler, Allocations), Android Studio Profiler, Perfetto for system traces.
- Startup: measure cold start on a release build on a low-end Android device.

## Production Monitoring

- Crash/error reporting: Sentry React Native or Firebase Crashlytics; upload Hermes source maps and native debug symbols (dSYM, R8 mapping) per build.
- Performance: Sentry performance or Firebase Performance; track cold start, TTI per screen, slow/frozen frames, JS errors per session.
- Analytics: strip PII before sending; consistent `object_action` event naming.

## Testing at Scale

- Jest + React Native Testing Library for components (`ref7_testing.md`).
- E2E: Maestro (YAML flows, simple CI) or Detox (gray-box, synchronises with the JS thread).
- Storybook for React Native v8+ for component catalogues; the old Storyshots addon is deprecated, so use Storybook test runner or plain RNTL tests for snapshots.

## Upgrade Practice

- Use the React Native Upgrade Helper diff for bare apps; `npx expo install --fix` for Expo projects.
- Upgrade one minor version at a time on large apps; run E2E on both platforms each step.
- Read the release blog for removed APIs; enable `strict` TypeScript to catch API changes.

## Checklist

- [ ] All native dependencies support the New Architecture
- [ ] Animations and gestures run on the UI thread (Reanimated/Gesture Handler or native driver)
- [ ] FlashList or tuned FlatList for long lists; `expo-image` for remote images
- [ ] OTA updates gated by `runtimeVersion`, staged rollout, rollback plan
- [ ] Source maps and native symbols uploaded per release
- [ ] Profiling done on release builds on a low-end device
