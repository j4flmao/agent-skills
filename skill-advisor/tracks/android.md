# Android Developer

**Who this is for:** You build native Android apps with Kotlin and Jetpack Compose.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-security`](../../skills/mobile/universal/security/SKILL.md) | `mobile/universal/security` | Implement mobile security controls covering data-at-rest encryption, network security (certificate pinning), authentication, and code protection… |

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`android`](../../skills/mobile/android/SKILL.md) | `mobile/android` | Implement Android native applications using Kotlin, Jetpack Compose, MVVM+Clean Architecture, Coroutines+Flow, Hilt DI, Room, and comprehensive… |
| [`lang-kotlin`](../../skills/languages/kotlin/SKILL.md) | `languages/kotlin` | Kotlin removes most null-pointer bugs at compile time and makes asynchronous code sequential-looking with coroutines. |
| [`mobile-patterns`](../../skills/mobile/universal/patterns/SKILL.md) | `mobile/universal/patterns` | Select and implement cross-platform mobile architecture patterns including MVVM, MVI, Clean Architecture, Coordinator, and Repository patterns. |
| [`mobile-networking`](../../skills/mobile/universal/networking/SKILL.md) | `mobile/universal/networking` | Design mobile networking layers with offline-first architecture, caching strategy, retry logic, pagination, and authentication interceptors. |
| [`mobile-storage`](../../skills/mobile/universal/storage/SKILL.md) | `mobile/universal/storage` | Design mobile local storage architectures selecting the right persistence strategy — SQLite, Room, Core Data, Hive, Isar, key-value, or file… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-testing`](../../skills/mobile/universal/testing/SKILL.md) | `mobile/universal/testing` | Design comprehensive mobile test strategies following the test pyramid — unit, widget/component, integration, and E2E — with proper mocking,… |
| [`mobile-performance`](../../skills/mobile/universal/performance/SKILL.md) | `mobile/universal/performance` | Diagnose and optimize mobile app performance across rendering, memory, startup time, battery drain, and bundle size using platform profiling tools. |
| [`mobile-push-notifications`](../../skills/mobile/universal/push-notifications/SKILL.md) | `mobile/universal/push-notifications` | Implement push notifications with correct permission flow, token management, payload design, and foreground/background handling across all mobile… |
| [`mobile-in-app-purchase`](../../skills/mobile/universal/in-app-purchase/SKILL.md) | `mobile/universal/in-app-purchase` | Implement in-app purchases with correct product configuration, purchase flow, receipt validation, subscription management, and restore handling… |
| [`mobile-deployment`](../../skills/mobile/universal/deployment/SKILL.md) | `mobile/universal/deployment` | Configure mobile app deployment pipelines including Fastlane automation, code signing, CI/CD, App Store Connect, Play Console, TestFlight, and… |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-kotlin-multiplatform`](../../skills/mobile/kotlin-multiplatform/SKILL.md) | `mobile/kotlin-multiplatform` | Guide for building Kotlin Multiplatform mobile apps with shared business logic, Compose Multiplatform UI, and platform-specific integrations. |
| [`mobile-biometrics`](../../skills/mobile/universal/biometrics/SKILL.md) | `mobile/universal/biometrics` | Guide for implementing biometric authentication (Face ID, Touch ID, fingerprint) with secure storage and fallback UX. |
| [`mobile-camera-media`](../../skills/mobile/universal/camera-media/SKILL.md) | `mobile/universal/camera-media` | Guide for implementing camera capture, media picker, image/video processing, and QR/barcode scanning in mobile apps. |
| [`mobile-widgets`](../../skills/mobile/mobile-widgets/SKILL.md) | `mobile/mobile-widgets` | Build glanceable, performant widget experiences across iOS and Android with proper timeline management, refresh strategies, and platform-specific… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill android --skill lang-kotlin --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill mobile-security
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill android --skill lang-kotlin --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill mobile-testing --skill mobile-performance --skill mobile-push-notifications --skill mobile-in-app-purchase --skill mobile-deployment --skill mobile-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`mobile-android`](../bundles.md#mobile-android) | 116 | Mobile Android: Kotlin, Jetpack Compose, Room, Hilt, CI/CD deployment |

## Combine with

- [Mobile Engineer](mobile.md)
- [Backend Engineer](backend.md)

## Watch out

Kotlin Multiplatform is worth adding only when you share code with iOS.
