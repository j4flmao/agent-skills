---
name: react-native-expertise
description: >
  Use this skill when the user says 'React Native', 'Expo', 'RN app', 'FlatList performance', 'FlashList', 'Reanimated', 'React Navigation', 'Expo Router', 'EAS Build', 'EAS Update', 'OTA update', 'CodePush', 'Hermes', 'native module', 'Turbo Module', 'RN upgrade'. Builds and reviews React Native apps on the New Architecture: Expo vs bare workflow, navigation, list and animation performance, native modules, OTA updates with EAS Update, testing and release. Do NOT use for: New Architecture internals (JSI/Fabric/TurboModule mechanics — use react-native-architecture), React web patterns (use frontend/react/*), native iOS/Android code in depth (use ios / android).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [mobile, react-native, expo, performance, ota]
---

# React Native

## Purpose
React Native renders native views from React components. Since 0.76 the New Architecture is the default and since 0.82 it is the only runtime, so current libraries, performance techniques and upgrade paths assume it. This skill covers the production defaults: Expo-based tooling, navigation, fast lists and animations, native modules, OTA updates and release discipline.

## Agent Protocol

### Trigger
"React Native", "Expo", "FlatList performance", "FlashList", "Reanimated", "React Navigation", "Expo Router", "EAS Build", "EAS Update", "OTA update", "CodePush", "Hermes", "native module", "Turbo Module", "RN upgrade".

### Input Context
- React Native and Expo SDK versions (`package.json`), managed (CNG) vs bare workflow
- Navigation/state libraries in use; target OS versions
- Symptom with evidence (React Native DevTools profiler, Perf Monitor, native profilers)

### Output Artifact
TypeScript/TSX code, config (`app.json`/`app.config.ts`, `eas.json`), or an upgrade/performance plan. No file unless requested.

### Response Format
```
RN/Expo: {0.8x / SDK xx}  Arch: New Architecture
Area: {navigation | lists | animation | native module | OTA | release}
Change: {what and why}
Code: {snippet}
Verify: {profiler / test / device check}
```

## 1. Project Setup
- Start with Expo (`npx create-expo-app`): the React Native team recommends a framework. Continuous Native Generation (`npx expo prebuild`) generates `ios/`/`android/` from config plugins, so native changes are reproducible; you can still write custom native code.
- RN 0.81 / Expo SDK 54 were the last releases supporting the legacy architecture; from RN 0.82 the New Architecture is always on — libraries must support it (check reactnative.directory).
- Hermes is the default JS engine; keep it unless a measured reason exists.
- TypeScript by default; strict mode on.

## 2. Navigation
- Expo Router (file-based, built on React Navigation) or React Navigation directly (native stack for platform transitions).
- Deep links/universal links configured once in the router; type route params.
- Avoid heavy work in screen `useEffect` on mount during transitions — defer until the transition ends or use placeholders.

## 3. Lists
- Use `FlashList` (Shopify; v2 targets the New Architecture and no longer needs size estimates) or `FlatList` tuned:
```tsx
import { FlatList, Text, View } from 'react-native';
import { memo, useCallback } from 'react';

const ITEM_HEIGHT = 56;
const Row = memo(function Row({ title }: { title: string }) {
  return <View style={{ height: ITEM_HEIGHT, justifyContent: 'center' }}><Text>{title}</Text></View>;
});

export function OrderList({ data }: { data: { id: string; title: string }[] }) {
  const renderItem = useCallback(({ item }: { item: { id: string; title: string } }) => <Row title={item.title} />, []);
  const getItemLayout = useCallback((_: unknown, index: number) =>
    ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }), []);
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      getItemLayout={getItemLayout}      // only valid for fixed-height rows
      initialNumToRender={12}
      windowSize={7}
    />
  );
}
```
- Stable keys, memoised rows, no inline object/array props that change every render, images sized and cached (`expo-image`).
- `removeClippedSubviews` can help on Android but has caused missing-content bugs on iOS — measure per platform.

## 4. Animations and Gestures
- `react-native-reanimated` (v4 requires the New Architecture) runs animations on the UI thread via worklets; `react-native-gesture-handler` for gestures. Avoid driving animations through React state updates every frame.
- `react-native-skia` for custom 2D drawing.

## 5. Performance Workflow
1. Reproduce in a release build on a low-end Android device.
2. React Native DevTools (0.76+; Flipper is no longer the default) — React Profiler for re-renders, JS profiler for hot functions.
3. Fix re-render cascades (memoisation, state colocation, selector-based stores like Zustand/Redux Toolkit selectors), long JS tasks (move to native or chunk work), image sizes, and startup (lazy-load screens, reduce bundle, avoid synchronous storage reads at launch).
4. Native profilers (Xcode Instruments, Android Studio profiler/Perfetto) for UI-thread and memory issues.

## 6. Native Modules
- New code: Turbo Modules / Fabric components with Codegen specs, or Expo Modules API (Swift/Kotlin) which is usually the simplest path. See `react-native-architecture` for the mechanics.
- Keep the JS interface typed; run heavy work natively off the main thread and return promises.

## 7. OTA Updates
- Microsoft App Center (including CodePush) was retired on 2025-03-31. Use EAS Update (`expo-updates`, works in bare apps too) or a self-hosted update server.
- Rules: OTA updates may change JS/assets only; gate by `runtimeVersion` so an update never targets an incompatible native binary; use channels per environment; roll out gradually and monitor crash rates; keep a rollback.
- Store policies allow interpreted-code updates that do not change the app's primary purpose — do not ship features that require review via OTA.

## 8. Testing and Release
- Unit/component: Jest + React Native Testing Library (`@testing-library/react-native`); E2E: Maestro or Detox.
- Builds: EAS Build or Fastlane; `eas submit` for stores. Upload source maps / dSYMs to Sentry or Crashlytics for symbolication.
- Upgrades: follow the React Native Upgrade Helper diff (bare) or `npx expo install --fix` (Expo); upgrade one minor version at a time for large jumps.

## 9. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| `ScrollView` with hundreds of children | memory, slow mount | `FlatList`/`FlashList` |
| Inline functions/objects passed to memoised rows | breaks memoisation | `useCallback`/`useMemo`, stable props |
| Animations via `setState` per frame | JS-thread jank | Reanimated worklets |
| Libraries without New Architecture support | build failures on 0.82+ | replace or contribute support |
| OTA update without runtimeVersion gating | crashes on old binaries | runtimeVersion policy + staged rollout |
| Secrets in JS bundle / `app.json` | extractable | server-side, secure storage for tokens |

## 10. Checklist
- [ ] Expo/CNG or documented bare setup; New Architecture-compatible dependencies
- [ ] Lists virtualised with stable keys and memoised rows
- [ ] Animations on UI thread (Reanimated)
- [ ] Release-mode profiling on low-end Android before shipping
- [ ] OTA via EAS Update with runtimeVersion, channels, staged rollout
- [ ] Symbols uploaded; E2E tests on critical flows

## References
- `references/react-native-fundamentals.md` — components, styling, platform APIs
- `references/architecture.md` — app architecture and layering
- `references/fabric-renderer.md` — Fabric rendering pipeline
- `references/navigation.md` — React Navigation / Expo Router patterns
- `references/navigation-routing.md` — deep links and routing
- `references/performance.md` — performance techniques
- `references/performance-hermes.md` — Hermes engine profiling
- `references/react-native-advanced.md` — native modules, OTA, advanced tooling
- `references/testing.md` — Jest, RNTL, Detox/Maestro
- `references/ref1_architecture.md` … `references/ref8_deployment.md` — extended notes (architecture, schemas, flows, tuning, security, APIs, testing, deployment)
