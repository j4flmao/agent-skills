---
name: mobile-kotlin-multiplatform
description: >
  Use this skill when the user says 'Kotlin Multiplatform', 'KMP', 'Compose Multiplatform', 'shared Kotlin', 'KMP module', 'expect/actual', 'commonMain', 'KMP project', 'multiplatform library'. Build cross-platform mobile apps with Kotlin Multiplatform sharing business logic, Compose Multiplatform UI, and platform-specific integrations. Do NOT use for: Android-only or iOS-only app development.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, kmp, kotlin, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Kotlin Multiplatform

## Purpose
Guide for building Kotlin Multiplatform mobile apps with shared business logic, Compose Multiplatform UI, and platform-specific integrations.

## Agent Protocol

### Trigger
Phrases: "Kotlin Multiplatform", "KMP", "Compose Multiplatform", "shared Kotlin", "KMP module", "expect/actual", "commonMain", "KMP project", "multiplatform library"

### Input Context
- Module structure (commonMain, androidMain, iosMain paths)
- Build files (build.gradle.kts with KMP plugin)
- Shared domain models and interfaces
- Platform-specific implementations

### Output Artifact
Working KMP module with: commonMain business logic, expect/actual declarations, Compose Multiplatform screens, Gradle multi-module build configuration.

### Response Format
```
<kmp-module>
<common>{shared types, interfaces, expect decls}</common>
<platform-specific>{actual implementations}</platform-specific>
<compose>{shared UI screens}</compose>
<build>{gradle config}</build>
</kmp-module>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- commonMain compiles without platform imports
- expect/actual pairs resolve for all target platforms
- Compose Multiplatform screens render on Android and iOS
- Ktor client calls succeed on all platforms
- SQLDelight queries work cross-platform

### Max Response Length
8000 tokens

## Workflow

1. **Module structure** — Set up commonMain (shared business logic), androidMain (Android-specific), iosMain (iOS-specific). Use expect/actual for platform APIs. Keep platform code thin.

2. **Shared logic layers** — Domain models in commonMain. Repository interfaces. Ktor HttpClient with JSON serialization. SQLDelight schema and queries. kotlinx.serialization for all data classes.

3. **Platform integration** — Declare expect fun/class in commonMain. Provide actual implementations per platform. Platform-specific DI modules. Lifecycle integration via Android Lifecycle / iOS lifecycle callbacks.

4. **Compose Multiplatform UI** — Shared @Composable screens. Material3 theming with platform color adaptation. Navigation with Voyager or Decompose. Platform-specific composables via expect/actual.

5. **Build configuration** — Gradle multi-module. KMP plugin in root build.gradle.kts. Framework export for iOS via embedAndSignAppleFrameworkForXcode. CocoaPods or SPM for iOS dependency distribution.

## Rules

- Business logic lives in commonMain.
- Platform APIs accessed exclusively via expect/actual.
- No android.* or UIKit imports in commonMain — zero tolerance.
- Compose Multiplatform for all shared UI — no platform-specific layouts.
- Ktor is the single HTTP client across all platforms.
- SQLDelight for local persistence — shared schema in commonMain.
- Network models (DTOs) and database models are shared types.
- Platform modules contain only actual implementations and thin adapters.

## References

- `references/kmp-structure.md` — Module setup, expect/actual pattern, dependency injection
- `references/kmp-compose.md` — Compose Multiplatform, navigation, theming, platform integration

## Handoff
Hand off to platform-specific iOS or Android skills when expect/actual implementations need deep platform API knowledge.
