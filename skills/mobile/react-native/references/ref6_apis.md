# React Native Native APIs: Turbo Native Modules, Fabric Components and Expo Modules

How to expose native platform APIs to JavaScript in the New Architecture. Covers the three supported paths (Expo Modules API, Turbo Native Modules with Codegen, C++ TurboModules), native view components, events, threading and testing.

## Choosing a Path

| Path | Languages | Best for | Notes |
|------|-----------|----------|-------|
| Expo Modules API | Swift, Kotlin | Most app-specific modules and views | Declarative DSL, works in bare RN after `npx install-expo-modules` |
| Turbo Native Module + Codegen | ObjC++/Swift (via ObjC++ glue), Java/Kotlin | Libraries without Expo dependency | Type-safe spec generates glue |
| C++ TurboModule | C++ | Logic shared across iOS/Android, hot paths | One implementation; no platform glue |
| Fabric Native Component | ObjC++/Kotlin + Codegen | Custom native views without Expo | Props/events declared in spec |

## Expo Modules API

```swift
// ios/BatteryModule.swift
import ExpoModulesCore

public class BatteryModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Battery")

    Function("getLevel") { () -> Float in
      UIDevice.current.isBatteryMonitoringEnabled = true
      return UIDevice.current.batteryLevel
    }

    AsyncFunction("fetchHealth") { (promise: Promise) in
      promise.resolve(["status": "good"])
    }

    Events("onLevelChange")
  }
}
```

```kotlin
// android/src/main/java/expo/modules/battery/BatteryModule.kt
class BatteryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Battery")

    Function("getLevel") {
      val bm = appContext.reactContext!!.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
      bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) / 100f
    }

    Events("onLevelChange")
  }
}
```

```ts
// index.ts
import { requireNativeModule } from 'expo-modules-core';
const Battery = requireNativeModule('Battery');
export const getLevel = (): number => Battery.getLevel();
```

Create a module scaffold with `npx create-expo-module --local`.

## Turbo Native Module with Codegen

### 1. Spec

```ts
// specs/NativeLocalStore.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getItem(key: string): string | null;            // synchronous
  setItem(value: string, key: string): void;
  removeItem(key: string): Promise<void>;          // async
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeLocalStore');
```

File name must start with `Native`; only Codegen-supported types are allowed (primitives, arrays, object literals, `Promise`, callbacks, enums, `UnsafeObject`).

### 2. Codegen configuration

```json
// package.json
"codegenConfig": {
  "name": "AppSpecs",
  "type": "modules",
  "jsSrcsDir": "specs",
  "android": { "javaPackageName": "com.example.specs" }
}
```

Codegen runs during the Android Gradle build and `pod install` on iOS.

### 3. Android implementation (Kotlin)

```kotlin
class LocalStoreModule(reactContext: ReactApplicationContext) :
  NativeLocalStoreSpec(reactContext) {

  private val prefs = reactContext.getSharedPreferences("local_store", Context.MODE_PRIVATE)

  override fun getName() = NAME
  override fun getItem(key: String): String? = prefs.getString(key, null)
  override fun setItem(value: String, key: String) { prefs.edit().putString(key, value).apply() }
  override fun removeItem(key: String, promise: Promise) {
    prefs.edit().remove(key).apply()
    promise.resolve(null)
  }

  companion object { const val NAME = "NativeLocalStore" }
}
```

Register it with a `BaseReactPackage` (`getModule` + `getReactModuleInfoProvider`) and add the package in `MainApplication`.

### 4. iOS implementation (ObjC++)

```objc
// RCTNativeLocalStore.mm
#import "RCTNativeLocalStore.h"   // @interface RCTNativeLocalStore : NSObject <NativeLocalStoreSpec>

@implementation RCTNativeLocalStore

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLocalStoreSpecJSI>(params);
}

- (NSString *)getItem:(NSString *)key {
  return [[NSUserDefaults standardUserDefaults] stringForKey:key];
}
- (void)setItem:(NSString *)value key:(NSString *)key {
  [[NSUserDefaults standardUserDefaults] setObject:value forKey:key];
}
- (void)removeItem:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [[NSUserDefaults standardUserDefaults] removeObjectForKey:key];
  resolve(nil);
}

+ (NSString *)moduleName { return @"NativeLocalStore"; }
@end
```

Map the module name to the class in `package.json` `codegenConfig.ios.modulesProvider` (recent RN versions) so the app links it. Swift implementations need an ObjC++ wrapper because the generated spec is C++.

## Sync vs Async Methods

| Choose | When |
|--------|------|
| Sync (returns value) | Fast, non-blocking reads (cached values, constants); runs on the JS thread |
| Async (`Promise`) | I/O, network, anything that may take more than a frame |

A slow sync method freezes JS. Never do disk or network I/O synchronously.

## Events from Native to JS

- Expo Modules: `Events("name")` + `sendEvent("name", payload)`; subscribe with `addListener` from the module object.
- Codegen modules (RN 0.76+): declare `readonly onChange: EventEmitter<Payload>` in the spec, emit with the generated `emitOnChange` method.

Always remove listeners on unmount and stop native observers when there are no listeners.

## Native View Components

Expo Modules:

```swift
View(MapPreview.self) {
  Prop("zoom") { (view: MapPreview, zoom: Double) in view.setZoom(zoom) }
  Events("onRegionChange")
}
```

Codegen (Fabric): a spec file `MyViewNativeComponent.ts` using `codegenNativeComponent<NativeProps>('MyView')`, with props typed using `Int32`, `Double`, `WithDefault`, `DirectEventHandler`. The generated C++ props/shadow node are consumed by an ObjC++ `RCTViewComponentView` subclass and a Kotlin `SimpleViewManager` with the generated delegate.

## Threading Rules

- Expo `AsyncFunction` runs off the main thread by default; use `.runOnQueue(.main)` for UIKit work.
- Codegen modules: annotate main-thread requirements (`requiresMainQueueSetup`, `methodQueue` on iOS) and dispatch UI work to the main thread on Android (`UiThreadUtil.runOnUiThread`).
- Protect shared mutable state with locks or confine it to one queue.

## Errors

- Reject promises with a stable error code and message: `promise.reject("E_NOT_FOUND", "Item missing for key $key")`.
- Expo: throw `Exception` subclasses (`CodedException`) whose `code` reaches JS as `error.code`.
- Map codes to typed errors in the JS wrapper.

## Testing

- Unit-test native logic with XCTest / JUnit independent of React Native.
- In Jest, mock the module: `jest.mock('./specs/NativeLocalStore', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }))`.
- E2E (Maestro/Detox) covers the bridge-free integration on real builds.

## Checklist

- [ ] Path chosen deliberately (Expo Modules unless constraints rule it out)
- [ ] Typed spec; only Codegen-supported types
- [ ] No blocking I/O in sync methods
- [ ] Events unsubscribed and native observers stopped
- [ ] UI work dispatched to the main thread
- [ ] Errors carry stable codes; JS wrapper types them
- [ ] Jest mocks and native unit tests exist
