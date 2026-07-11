# Mobile Skills Guide

24 skills covering native and cross-platform mobile development: iOS, Android, Flutter, React Native, Kotlin Multiplatform, and universal patterns for the full mobile lifecycle.

## Skill Map

### Platform Skills

| Platform | Skill | Focus |
|----------|-------|-------|
| **iOS** | `skills/mobile/ios/` | Swift, SwiftUI, UIKit, Combine, Xcode |
| **Android** | `skills/mobile/android/` | Kotlin, Jetpack Compose, XML, Android Studio |
| **Flutter** | `skills/mobile/flutter/` | Dart, Widgets, BLoC, Provider, Riverpod |
| **React Native** | `skills/mobile/react-native/` | Expo, RN CLI, Hermes, Metro |
| **Kotlin Multiplatform** | `skills/mobile/kotlin-multiplatform/` | Shared logic, Compose Multiplatform, SQLDelight |
| **Ionic/Capacitor** | `skills/mobile/ionic-capacitor/` | Web-based, plugins, native bridges |
| **.NET MAUI** | `skills/mobile/dotnet-maui/` | C#, XAML, MVVM, platform-specific |

### Universal Patterns (16 skills)

| Pattern | Skill | Focus |
|---------|-------|-------|
| Analytics | `skills/mobile/universal/analytics/` | Amplitude, Mixpanel, GA4, custom events |
| AR/VR | `skills/mobile/universal/ar-vr/` | ARKit, ARCore, SceneKit, RealityKit |
| Biometrics | `skills/mobile/universal/biometrics/` | Face ID, Touch ID, fingerprint, passcode |
| Camera & Media | `skills/mobile/universal/camera-media/` | CameraX, AVFoundation, image picking |
| Crash Reporting | `skills/mobile/universal/crash-reporting/` | Sentry, Crashlytics, App Center |
| Deep Linking | `skills/mobile/universal/deep-linking/` | Universal links, custom schemes, routing |
| Deployment | `skills/mobile/universal/deployment/` | App Store, Play Store, CodePush, signing |
| In-App Purchase | `skills/mobile/universal/in-app-purchase/` | StoreKit, Billing Library, RevenueCat |
| Map & Location | `skills/mobile/universal/map-location/` | MapKit, Google Maps, geocoding, permissions |
| Networking | `skills/mobile/universal/networking/` | URLSession, OkHttp, Dio, GraphQL, caching |
| Offline First | `skills/mobile/universal/offline-first/` | Local DB, sync, conflict resolution |
| Patterns | `skills/mobile/universal/patterns/` | MVVM, MVI, Clean Architecture, BLoC |
| Performance | `skills/mobile/universal/performance/` | Frame rate, memory, startup, battery |
| Push Notifications | `skills/mobile/universal/push-notifications/` | APNS, FCM, local notifications, payloads |
| Security | `skills/mobile/universal/security/` | Keychain, Keystore, SSL pinning, obfuscation |
| Storage | `skills/mobile/universal/storage/` | SQLite, Realm, Core Data, SharedPreferences |
| Testing | `skills/mobile/universal/testing/` | XCTest, JUnit, Espresso, Detox, Maestro |

## Decision Framework

### Choose Your Platform Strategy

```
Need native performance and full OS access?
  ├─ iOS native (Swift + SwiftUI) — Apple ecosystem
  ├─ Android native (Kotlin + Compose) — Google ecosystem
  └─ Both — Kotlin Multiplatform + Compose Multiplatform

Need code sharing across platforms?
  ├─ Flutter — single codebase, near-native perf
  ├─ React Native — JS/TS, large ecosystem
  ├─ Kotlin Multiplatform — shared logic, native UI
  └─ .NET MAUI — C#, Windows + mobile

Need quick prototype or web skills reuse?
  ├─ Ionic/Capacitor — web tech, native plugins
  └─ React Native (Expo) — fast dev cycle
```

### Choose Your Architecture

```
Need simple app?
  ├─ MVVM — standard, testable (SwiftUI, Android)
  └─ BLoC — Flutter, reactive streams

Need complex app?
  ├─ MVI — unidirectional, predictable
  ├─ Clean Architecture — layers, testable
  └─ Redux-like — single store, actions

Need shared logic?
  └─ KMP shared module + platform UI
```

## Architecture Layers

```
┌──────────────────────────────────────────┐
│              UI Layer                      │
│  SwiftUI / Jetpack Compose / Flutter      │
│  Widgets, Components, Screens             │
├──────────────────────────────────────────┤
│           State Management                │
│  StateObject / ViewModel / BLoC / Riverpod│
├──────────────────────────────────────────┤
│            Business Logic                 │
│  UseCases, Interactors, Repository        │
├──────────────────────────────────────────┤
│              Data Layer                   │
│  Local DB, Network, Cache, Preferences    │
├──────────────────────────────────────────┤
│         Platform & Device                 │
│  Camera, Location, Biometrics, Push       │
└──────────────────────────────────────────┘
```

## By Common Scenarios

### Building a Social App
1. `mobile/{platform}/` — project setup
2. `mobile/universal/patterns/` — architecture
3. `mobile/universal/networking/` — API client
4. `mobile/universal/storage/` — local cache
5. `mobile/universal/push-notifications/` — alerts
6. `mobile/universal/deep-linking/` — navigation
7. `mobile/universal/crash-reporting/` — stability

### Building an E-Commerce App
1. `mobile/{platform}/` — project setup
2. `mobile/universal/patterns/` — architecture
3. `mobile/universal/networking/` — API client
4. `mobile/universal/offline-first/` — offline support
5. `mobile/universal/in-app-purchase/` — payments
6. `mobile/universal/analytics/` — tracking
7. `mobile/universal/security/` — payment security

## Skills List

### Platform Skills
- `skills/mobile/ios/SKILL.md`
- `skills/mobile/android/SKILL.md`
- `skills/mobile/flutter/SKILL.md`
- `skills/mobile/react-native/SKILL.md`
- `skills/mobile/kotlin-multiplatform/SKILL.md`
- `skills/mobile/ionic-capacitor/SKILL.md`
- `skills/mobile/dotnet-maui/SKILL.md`

### Universal Skills
- `skills/mobile/universal/analytics/SKILL.md`
- `skills/mobile/universal/ar-vr/SKILL.md`
- `skills/mobile/universal/biometrics/SKILL.md`
- `skills/mobile/universal/camera-media/SKILL.md`
- `skills/mobile/universal/crash-reporting/SKILL.md`
- `skills/mobile/universal/deep-linking/SKILL.md`
- `skills/mobile/universal/deployment/SKILL.md`
- `skills/mobile/universal/in-app-purchase/SKILL.md`
- `skills/mobile/universal/map-location/SKILL.md`
- `skills/mobile/universal/networking/SKILL.md`
- `skills/mobile/universal/offline-first/SKILL.md`
- `skills/mobile/universal/patterns/SKILL.md`
- `skills/mobile/universal/performance/SKILL.md`
- `skills/mobile/universal/push-notifications/SKILL.md`
- `skills/mobile/universal/security/SKILL.md`
- `skills/mobile/universal/storage/SKILL.md`
- `skills/mobile/universal/testing/SKILL.md`
