---
name: react-native-architecture
description: >
  Use this skill when the user says 'React Native New Architecture', 'JSI', 'Fabric', 'TurboModules', 'Codegen', 'bridgeless', 'old bridge', 'interop layer', 'Hermes', 'Yoga', 'shadow tree', 'synchronous native call', 'migrate to new architecture', 'native component spec'. Explains React Native's runtime architecture — JSI, Fabric renderer, TurboModules, Codegen, bridgeless mode, threading and Hermes — and guides library/app migration and native module authoring on it. Do NOT use for: everyday app development, lists, navigation and OTA (use react-native-expertise), Flutter internals (use flutter-internals).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [mobile, react-native, jsi, fabric, turbomodules, architecture]
---

# React Native Architecture

## Purpose
The legacy architecture serialised every JS↔native interaction as asynchronous JSON messages over a bridge. The New Architecture (default since 0.76, the only runtime since 0.82) replaces it with JSI-based direct calls, the Fabric renderer and TurboModules. This skill explains how those pieces work so you can write native modules/components correctly, migrate libraries, and reason about threading and performance.

## Agent Protocol

### Trigger
"New Architecture", "JSI", "Fabric", "TurboModules", "Codegen", "bridgeless", "bridge", "interop layer", "Hermes", "Yoga", "shadow tree", "synchronous native call", "native component spec".

### Input Context
- React Native version; Expo or bare; library vs app
- Native module/component being written or migrated (iOS Swift/Obj-C++, Android Kotlin/C++)
- Symptom (startup time, UI-thread stalls, interop errors)

### Output Artifact
Architecture explanation, Codegen specs, native module/component code, migration steps. No file unless requested.

### Response Format
```
RN: {version}  Mode: {bridgeless New Architecture}
Piece: {JSI | Fabric | TurboModule | Codegen | Hermes}
Explanation: {mechanism}
Code/spec: {snippet}
Threading: {which thread runs what}
```

## 1. Legacy vs New
| Concern | Legacy (bridge) | New Architecture |
|---------|-----------------|------------------|
| JS↔native calls | async batched JSON messages | JSI: C++ host objects/functions callable from JS, sync or async |
| Native modules | all initialised at startup | TurboModules: lazily loaded on first use |
| Rendering | async UIManager over the bridge | Fabric: C++ renderer with immutable shadow trees, supports React concurrent features |
| Type safety | runtime | Codegen from typed specs (TypeScript/Flow) generates C++/ObjC/Java glue |
| Runtime | bridge always present | bridgeless mode (default with the New Architecture) |

## 2. JSI (JavaScript Interface)
- A C++ API implemented by the JS engine (Hermes by default; JSC available) that lets native code expose `jsi::HostObject`s and `jsi::Function`s to JS and hold references to JS values.
- Enables synchronous calls when justified (e.g. reading a small cached value), and zero-copy access to `ArrayBuffer`s. Synchronous calls block the JS thread — keep them short; long work stays async on native threads.
- JSI values must only be touched on the JS thread (use `CallInvoker` to schedule back onto it).

## 3. Fabric Renderer
- React reconciles in JS; Fabric's C++ core builds an immutable **shadow tree**, runs Yoga (flexbox layout engine in C++), diffs trees and mounts changes on the UI thread.
- Phases: render (JS thread creates shadow nodes) → commit (layout with Yoga, tree promoted) → mount (UI thread applies view mutations).
- Because shadow trees are immutable and shared, rendering can happen on multiple threads and React 18+ features (transitions, Suspense, automatic batching) work; synchronous layout reads (`measure` in `useLayoutEffect`) are reliable.

## 4. TurboModules and Codegen
Spec (TypeScript) → Codegen generates native interfaces → you implement them.
```ts
// specs/NativeDeviceInfo.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getBatteryLevel(): Promise<number>;
  getModelSync(): string;          // synchronous — only for cheap calls
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeDeviceInfo');
```
- `package.json` `codegenConfig` declares the spec directory and library name; Codegen runs during the native build (`pod install` / Gradle).
- Implement on Android in Kotlin/Java (generated `NativeDeviceInfoSpec` base class) and on iOS in Objective-C++/Swift conforming to the generated protocol; C++ TurboModules can be shared across platforms.
- Native components follow the same pattern with `codegenNativeComponent<Props>('MyView')` specs and Fabric component views.
- Simpler alternative for many cases: the Expo Modules API (Swift/Kotlin DSL) which supports the New Architecture without writing Codegen glue.

## 5. Interop Layer
Legacy native modules and view managers can still run through interop layers in the New Architecture, which eased migration; the React Native team keeps them for the foreseeable future, but new libraries should ship native TurboModule/Fabric implementations. Check library status on reactnative.directory before upgrading to 0.82+.

## 6. Threads
| Thread | Work |
|--------|------|
| JS thread | React render, business logic, JSI calls |
| UI / main thread | mounting native views, gestures, native animations |
| Background (native) | module work you dispatch, image decoding, I/O |
Reanimated worklets run JS on the UI thread via a separate runtime — that is why UI-thread animations stay smooth while the JS thread is busy.

## 7. Hermes
- Bytecode precompiled at build time (faster startup, lower memory than parsing JS at launch); generational GC.
- Profiling: React Native DevTools / Chrome DevTools-compatible CPU profiles; sampling profiler for release-like builds.
- Hermes V1 (new compiler/VM generation) has been rolling out in recent releases as opt-in — test before enabling.

## 8. Migration Steps (library or app)
1. Upgrade to the latest RN minor that still matches your dependencies (0.81/Expo SDK 54 if you still need legacy fallback; 0.82+ is New-Architecture-only).
2. Inventory native dependencies; replace unmaintained ones.
3. Convert modules to TurboModule specs + Codegen (or Expo Modules); convert view managers to Fabric components.
4. Remove synchronous assumptions on legacy bridge behaviour (e.g. module constants timing), test on both platforms in release mode.
5. Measure startup and interaction latency before/after.

## 9. Anti-Patterns
- Making every native method synchronous "because JSI allows it" — blocks the JS thread.
- Touching JSI objects from native background threads.
- Shipping libraries that only work through the interop layer.
- Large JSON payloads crossing JS↔native repeatedly instead of shared `ArrayBuffer`s or native-side processing.

## 10. Checklist
- [ ] Typed specs for every native module/component; Codegen in the build
- [ ] Sync methods limited to cheap, non-blocking calls
- [ ] Threading rules respected (JSI on JS thread, heavy work on background threads)
- [ ] All dependencies New-Architecture compatible
- [ ] Release-mode measurements for startup and UI latency
