# Mobile Engineer

**Who this is for:** You ship iOS, Android or cross-platform apps.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-patterns`](../../skills/mobile/universal/patterns/SKILL.md) | `mobile/universal/patterns` | Select and implement cross-platform mobile architecture patterns including MVVM, MVI, Clean Architecture, Coordinator, and Repository patterns. |
| [`mobile-networking`](../../skills/mobile/universal/networking/SKILL.md) | `mobile/universal/networking` | Design mobile networking layers with offline-first architecture, caching strategy, retry logic, pagination, and authentication interceptors. |
| [`mobile-storage`](../../skills/mobile/universal/storage/SKILL.md) | `mobile/universal/storage` | Design mobile local storage architectures selecting the right persistence strategy — SQLite, Room, Core Data, Hive, Isar, key-value, or file… |
| [`mobile-testing`](../../skills/mobile/universal/testing/SKILL.md) | `mobile/universal/testing` | Design comprehensive mobile test strategies following the test pyramid — unit, widget/component, integration, and E2E — with proper mocking,… |
| [`mobile-security`](../../skills/mobile/universal/security/SKILL.md) | `mobile/universal/security` | Implement mobile security controls covering data-at-rest encryption, network security (certificate pinning), authentication, and code protection… |
| [`mobile-performance`](../../skills/mobile/universal/performance/SKILL.md) | `mobile/universal/performance` | Diagnose and optimize mobile app performance across rendering, memory, startup time, battery drain, and bundle size using platform profiling tools. |

## Level 2 — Professional (8 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-deployment`](../../skills/mobile/universal/deployment/SKILL.md) | `mobile/universal/deployment` | Configure mobile app deployment pipelines including Fastlane automation, code signing, CI/CD, App Store Connect, Play Console, TestFlight, and… |
| [`mobile-push-notifications`](../../skills/mobile/universal/push-notifications/SKILL.md) | `mobile/universal/push-notifications` | Implement push notifications with correct permission flow, token management, payload design, and foreground/background handling across all mobile… |
| [`mobile-deep-linking`](../../skills/mobile/universal/deep-linking/SKILL.md) | `mobile/universal/deep-linking` | Guide for implementing deep linking across iOS and Android using universal links, custom URL schemes, and deferred deep linking. |
| [`mobile-offline-first`](../../skills/mobile/universal/offline-first/SKILL.md) | `mobile/universal/offline-first` | Guide for building mobile apps with offline-first architecture: local-first data, background sync, conflict resolution, and connectivity-aware UX. |
| [`mobile-crash-reporting`](../../skills/mobile/universal/crash-reporting/SKILL.md) | `mobile/universal/crash-reporting` | Set up crash reporting with proper SDK configuration, symbolication, breadcrumbs, non-fatal error capture, and release health monitoring across… |
| [`mobile-analytics`](../../skills/mobile/universal/analytics/SKILL.md) | `mobile/universal/analytics` | Guide for implementing mobile app analytics: event tracking, screen views, user properties, and privacy compliance. |
| [`mobile-in-app-purchase`](../../skills/mobile/universal/in-app-purchase/SKILL.md) | `mobile/universal/in-app-purchase` | Implement in-app purchases with correct product configuration, purchase flow, receipt validation, subscription management, and restore handling… |
| [`mobile-localization`](../../skills/mobile/mobile-localization/SKILL.md) | `mobile/mobile-localization` | Implement comprehensive mobile app localization covering string resources, pluralization, RTL layout, locale-aware formatting, and automated… |

## Level 3 — Specialist (8 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-biometrics`](../../skills/mobile/universal/biometrics/SKILL.md) | `mobile/universal/biometrics` | Guide for implementing biometric authentication (Face ID, Touch ID, fingerprint) with secure storage and fallback UX. |
| [`map-location`](../../skills/mobile/universal/map-location/SKILL.md) | `mobile/universal/map-location` | Map integration provides interactive maps, geocoding, routing and location tracking. |
| [`mobile-camera-media`](../../skills/mobile/universal/camera-media/SKILL.md) | `mobile/universal/camera-media` | Guide for implementing camera capture, media picker, image/video processing, and QR/barcode scanning in mobile apps. |
| [`mobile-ar-vr`](../../skills/mobile/universal/ar-vr/SKILL.md) | `mobile/universal/ar-vr` | Design and implement AR/VR experiences for mobile platforms with platform-aware setup, optimized 3D content, intuitive interaction patterns, and… |
| [`mobile-widgets`](../../skills/mobile/mobile-widgets/SKILL.md) | `mobile/mobile-widgets` | Build glanceable, performant widget experiences across iOS and Android with proper timeline management, refresh strategies, and platform-specific… |
| [`flutter-internals`](../../skills/mobile/cross-platform/flutter-internals/SKILL.md) | `mobile/cross-platform/flutter-internals` | Flutter draws every pixel itself instead of wrapping OEM widgets. |
| [`react-native-architecture`](../../skills/mobile/cross-platform/react-native-architecture/SKILL.md) | `mobile/cross-platform/react-native-architecture` | The legacy architecture serialised every JS↔native interaction as asynchronous JSON messages over a bridge. |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill mobile-testing --skill mobile-security --skill mobile-performance
```

**Level 1 + 2 (14 skills):**

```bash
npx skills add j4flmao/agent-skills --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill mobile-testing --skill mobile-security --skill mobile-performance --skill mobile-deployment --skill mobile-push-notifications --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-crash-reporting --skill mobile-analytics --skill mobile-in-app-purchase --skill mobile-localization
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`mobile-ios`](../bundles.md#mobile-ios) | 116 | Mobile iOS: Swift, SwiftUI, UIKit, CI/CD deployment |
| [`mobile-android`](../bundles.md#mobile-android) | 116 | Mobile Android: Kotlin, Jetpack Compose, Room, Hilt, CI/CD deployment |
| [`mobile-flutter`](../bundles.md#mobile-flutter) | 120 | Flutter + universal mobile skills + deployment |
| [`mobile-react-native`](../bundles.md#mobile-react-native) | 120 | React Native + universal mobile skills + deployment |
| [`mobile-cross-platform`](../bundles.md#mobile-cross-platform) | 28 | Cross-platform mobile: Flutter, React Native, Kotlin Multiplatform, Ionic/Capacitor, .NET MAUI, internals, localization, widgets |

## Combine with

- [Backend Engineer](backend.md)
- [QA & Test Engineer](quality.md)
- [Designer & Design Engineer](design-ux.md)

## Watch out

Add one platform skill: `mobile/ios`, `mobile/android`, `mobile/flutter`, `mobile/react-native`, `mobile/kotlin-multiplatform`, `mobile/ionic-capacitor` or `mobile/dotnet-maui`.
