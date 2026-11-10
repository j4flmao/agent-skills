# Flutter Developer

**Who this is for:** You build iOS and Android apps from one Dart codebase.

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
| [`flutter-expertise`](../../skills/mobile/flutter/SKILL.md) | `mobile/flutter` | Flutter renders its own UI from a declarative widget tree, so app quality depends on keeping rebuilds narrow, state ownership clear, and heavy… |
| [`lang-dart`](../../skills/languages/dart/SKILL.md) | `languages/dart` | Dart is the language under Flutter and also runs CLIs and servers. |
| [`mobile-patterns`](../../skills/mobile/universal/patterns/SKILL.md) | `mobile/universal/patterns` | Select and implement cross-platform mobile architecture patterns including MVVM, MVI, Clean Architecture, Coordinator, and Repository patterns. |
| [`mobile-networking`](../../skills/mobile/universal/networking/SKILL.md) | `mobile/universal/networking` | Design mobile networking layers with offline-first architecture, caching strategy, retry logic, pagination, and authentication interceptors. |
| [`mobile-storage`](../../skills/mobile/universal/storage/SKILL.md) | `mobile/universal/storage` | Design mobile local storage architectures selecting the right persistence strategy — SQLite, Room, Core Data, Hive, Isar, key-value, or file… |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`flutter-internals`](../../skills/mobile/cross-platform/flutter-internals/SKILL.md) | `mobile/cross-platform/flutter-internals` | Flutter draws every pixel itself instead of wrapping OEM widgets. |
| [`mobile-testing`](../../skills/mobile/universal/testing/SKILL.md) | `mobile/universal/testing` | Design comprehensive mobile test strategies following the test pyramid — unit, widget/component, integration, and E2E — with proper mocking,… |
| [`mobile-performance`](../../skills/mobile/universal/performance/SKILL.md) | `mobile/universal/performance` | Diagnose and optimize mobile app performance across rendering, memory, startup time, battery drain, and bundle size using platform profiling tools. |
| [`mobile-push-notifications`](../../skills/mobile/universal/push-notifications/SKILL.md) | `mobile/universal/push-notifications` | Implement push notifications with correct permission flow, token management, payload design, and foreground/background handling across all mobile… |
| [`mobile-deployment`](../../skills/mobile/universal/deployment/SKILL.md) | `mobile/universal/deployment` | Configure mobile app deployment pipelines including Fastlane automation, code signing, CI/CD, App Store Connect, Play Console, TestFlight, and… |
| [`mobile-offline-first`](../../skills/mobile/universal/offline-first/SKILL.md) | `mobile/universal/offline-first` | Guide for building mobile apps with offline-first architecture: local-first data, background sync, conflict resolution, and connectivity-aware UX. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-in-app-purchase`](../../skills/mobile/universal/in-app-purchase/SKILL.md) | `mobile/universal/in-app-purchase` | Implement in-app purchases with correct product configuration, purchase flow, receipt validation, subscription management, and restore handling… |
| [`mobile-deep-linking`](../../skills/mobile/universal/deep-linking/SKILL.md) | `mobile/universal/deep-linking` | Guide for implementing deep linking across iOS and Android using universal links, custom URL schemes, and deferred deep linking. |
| [`mobile-localization`](../../skills/mobile/mobile-localization/SKILL.md) | `mobile/mobile-localization` | Implement comprehensive mobile app localization covering string resources, pluralization, RTL layout, locale-aware formatting, and automated… |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill flutter-expertise --skill lang-dart --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill mobile-security
```

**Level 1 + 2 + security baseline (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill flutter-expertise --skill lang-dart --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill flutter-internals --skill mobile-testing --skill mobile-performance --skill mobile-push-notifications --skill mobile-deployment --skill mobile-offline-first --skill mobile-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`mobile-flutter`](../bundles.md#mobile-flutter) | 120 | Flutter + universal mobile skills + deployment |
| [`mobile-cross-platform`](../bundles.md#mobile-cross-platform) | 28 | Cross-platform mobile: Flutter, React Native, Kotlin Multiplatform, Ionic/Capacitor, .NET MAUI, internals, localization, widgets |

## Combine with

- [Mobile Engineer](mobile.md)
- [Backend Engineer](backend.md)

## Watch out

Flutter golden tests need the same OS and fonts as the baseline; see `quality/visual-testing` before adding them to CI.
