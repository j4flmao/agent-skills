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

1. **KMP project structure** — Three-tier source set layout: `commonMain` (shared business logic, domain models, repository interfaces, Ktor client, SQLDelight schema, expect declarations), `androidMain` (Android-specific actual implementations, OkHttp engine, Android Sqlite driver, Context-dependent factories), `iosMain` (iOS-specific actual implementations, Darwin engine, NativeSqlite driver, platform factories). Additional source sets for testing: `commonTest`, `androidUnitTest`, `iosTest`. The shared module is consumed by Android apps as an AAR library and by iOS apps as a Kotlin/Native framework.

2. **expect/actual pattern** — Declare platform-agnostic interfaces in `commonMain` using `expect` keyword. Provide concrete implementations in platform source sets with `actual`. Three forms: `expect fun` (function), `expect class` (class with actual constructors), `expect object` (singleton), `expect val` (property), `expect typealias` (type alias for platform types). Example: `expect fun generateUuid(): String` with `actual fun generateUuid(): String = UUID.randomUUID().toString()` in Android and `actual fun generateUuid(): String = platform.Foundation.NSUUID().UUIDString()` in iOS. Keep expect declarations in `commonMain/.../platform/` package.

3. **Ktor client configuration** — Single `HttpClient` declaration in `commonMain` with engine-agnostic setup. Use `ktor-client-core` for common code, `ktor-client-okhttp` for Android (supports HTTP/2, caching), `ktor-client-darwin` for iOS (uses NSURLSession, automatic cookie storage). Configure serialization with `kotlinx-serialization-json` using `ContentNegotiation` plugin. Add logging with `Logging` plugin. Timeout configuration: `HttpTimeout` plugin with `requestTimeoutMillis`, `connectTimeoutMillis`, `socketTimeoutMillis`.

```kotlin
// commonMain — Ktor client factory
val httpClient = HttpClient {
    install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    install(Logging) { level = LogLevel.HEADERS }
    install(HttpTimeout) { requestTimeoutMillis = 15_000 }
    defaultRequest { url("https://api.example.com/") }
}
```

4. **kotlinx.serialization** — All data classes in `commonMain` use `@Serializable` annotation. Supports primitives, enums, sealed classes, nullable fields, default values. Custom serializers for non-standard types (Date, BigInteger). `Json` configuration: `ignoreUnknownKeys = true` for forward compatibility, `coerceInputValues = true` for invalid defaults, `encodeDefaults = false` to minimize payload. Use `@SerialName` for property name mapping. Polymorphic serialization for sealed class hierarchies.

5. **Compose Multiplatform UI** — All shared UI in `commonMain` using Jetpack Compose APIs. The `org.jetbrains.compose` plugin compiles Compose code for both platforms. Material3 theming with `MaterialTheme` — customize typography, color scheme, and shapes. Navigation options: Voyager (screen-based, type-safe), Decompose (component-based, lifecycle-aware), or custom state-driven navigation. Platform-specific composables via `expect`/`actual` for views that cannot be shared (maps, WebView, Camera). Performance: `remember` for expensive computations, `derivedStateOf` for computed state, `LaunchedEffect` for side effects.

6. **Platform-specific UI integration** — When Compose Multiplatform cannot render a native component, use `expect` composable functions. Android: wrap Android Views via `AndroidView` composable factory. iOS: wrap UIKit views via `UIKitView` composable (KMP Compose provides interop). Example: MapView, CameraPreview, WebView, NativeTextInput. Keep platform composables thin — minimal wrapper code, pass data via parameters. Platform UI code lives in `androidMain`/`iosMain` Composable files.

7. **Testing strategy** — `commonTest` for shared business logic: domain models, repository logic, ViewModel state. Use kotlin.test for assertions. Mock dependencies with mock libraries that support KMP (MockK, KMM- Mock). Instrumented tests on Android and iOS use platform source sets. UI testing of Compose screens uses Compose UI Test framework in commonTest. Run iOS tests on simulator via Gradle task or Xcode Test Navigator.

## Platform Compatibility

| Feature | commonMain | androidMain | iosMain |
|---------|-----------|-------------|---------|
| Business logic | Full | Thin override | Thin override |
| HTTP client | Ktor declaration | OkHttp engine | Darwin engine |
| Database | SQLDelight schema | Android driver | Native driver |
| UI (Compose) | Full | Full | Full |
| Platform APIs | expect decl | actual impl | actual impl |
| Dependency injection | Koin module decl | platform bindings | platform bindings |

## Best Practices

- Keep platform code thin — actual implementations should be 1-5 lines wrapping platform APIs
- Use expect/actual for factory functions, not for large service classes
- Prefer interface-based abstractions over expect/actual for testability
- Use Ktor engine selection at compile time, never at runtime
- Version all shared dependencies in a single `libs.versions.toml` catalog
- Run `./gradlew allTests` before committing to verify all targets compile
- Use `kotlinx.datetime` for cross-platform date/time handling

## Common Pitfalls

- **No android.* imports in commonMain**: The compiler enforces this, but watch for transitive dependencies that pull Android types.
- **iOS framework linking**: Ensure `embedAndSignAppleFrameworkForXcode` is in the build phase of your Xcode project.
- **Serialization class clashes**: Two modules with the same `@Serializable` class cause linker errors. Use explicit `@SerialName` or module-level serializers.
- **Generic type erasure**: `expect`/`actual` with generics requires `@Suppress("NO_ACTUAL_FOR_EXPECT")` in some cases.
- **CocoaPods vs SPM**: CocoaPods + KMP is more mature than SPM integration. Prefer CocoaPods for iOS dependency distribution.

## Configuration Reference

```kotlin
// build.gradle.kts (shared module)
plugins {
    id("org.jetbrains.kotlin.multiplatform") version "2.0.21"
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21"
    id("org.jetbrains.compose") version "1.7.1"
    id("app.cash.sqldelight") version "2.0.2"
}
kotlin {
    androidTarget { compilations.all { kotlinOptions { jvmTarget = "17" } } }
    listOf(iosX64(), iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework { baseName = "shared"; isStatic = true }
    }
    sourceSets {
        commonMain.dependencies {
            implementation("io.ktor:ktor-client-core:3.0.3")
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
            implementation("app.cash.sqldelight:runtime:2.0.2")
            implementation(compose.runtime); implementation(compose.foundation)
            implementation(compose.material3); implementation(compose.ui)
        }
    }
}
```

## References
  - references/kmm-concurrency.md — KMM Concurrency — Coroutines, Flows, and Threading
  - references/kmm-networking.md — KMM Networking — Ktor, SQLDelight, Serialization
  - references/kmp-compose.md — Compose Multiplatform
  - references/kmp-structure.md — KMP Module Structure
  - references/kotlin-multiplatform-advanced.md — Kotlin Multiplatform Advanced Topics
  - references/kotlin-multiplatform-fundamentals.md — Kotlin Multiplatform Fundamentals
  - references/platform-specific.md — Platform-Specific Implementations
## Handoff
Hand off to platform-specific iOS or Android skills when expect/actual implementations need deep platform API knowledge.
