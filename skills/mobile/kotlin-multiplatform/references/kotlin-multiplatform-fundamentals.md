# Kotlin Multiplatform Fundamentals

## Overview
Kotlin Multiplatform (KMP) allows sharing business logic between Android, iOS, web, and desktop using Kotlin. Common code compiles to JVM bytecode (Android), native binaries (iOS), and JavaScript/Wasm (web). JetBrains actively maintains KMP with growing ecosystem support.

## Core Concepts

### expect/actual Declarations
Platform-specific implementations declared with `expect` in commonMain and `actual` in platform source sets. Use for platform APIs, system services, and hardware access. Compiler ensures every expect has a matching actual. Minimize expect/actual surface area.

### Source Sets
`commonMain` for shared code. `androidMain` for Android-specific implementations. `iosMain` for iOS-specific (Kotlin/Native). Gradle plugin configures source sets automatically. `appleMain` for shared iOS/macOS/watchOS code. `nativeMain` for all native targets.

### Kotlin/Native
Compiles Kotlin to native binaries via LLVM. No JVM/ART required — runs directly on iOS. Memory management via automatic reference counting (like Swift). Interop with Objective-C/Swift via @ObjCName and C interop via cinterop.

### Kotlin Multiplatform Mobile (KMM)
The mobile-focused subset of KMP sharing code between Android and iOS. Share domain models, network layer, data validation, and business logic. UI remains platform-native (Jetpack Compose on Android, SwiftUI on iOS).

## Architecture Patterns

### Shared Business Logic
Domain layer in commonMain: entities, use cases, repository interfaces, validation. No platform dependencies. Use cases orchestrate business operations. Repository interfaces define data contracts. Models use `@Serializable` for multiplatform serialization.

### Data Layer
`commonMain` defines repository interfaces and data models. `androidMain` implements with Room/Retrofit. `iosMain` implements with CoreData/URLSession. Ktor client for cross-platform networking. SQLDelight for shared SQLite database.

### Presentation Layer
Platform-specific: Jetpack Compose (Android), SwiftUI (iOS). ViewModel in commonMain for shared state using kotlinx-coroutines Flow. Platform observes Flow and renders UI. Compose Multiplatform for shared UI (experimental, production-ready for selected use cases).

## Data Management

### SQLDelight
Cross-platform SQLite from commonMain. Type-safe SQL in `.sq` files. Generates Kotlin drivers for Android (AndroidSqliteDriver) and iOS (NativeSqliteDriver). Schema migrations in `.sqm` files. Reactive queries via `.asFlow().mapToList()`.

### Ktor Client
Multiplatform HTTP client. Engines: OkHttp (Android), Darwin (iOS), CIO (desktop). Configure interceptors, serialization (kotlinx.serialization), and logging in commonMain. Plugin architecture for content negotiation, auth, and WebSockets.

### kotlinx.serialization
Multiplatform serialization library. `@Serializable` annotation on data classes. Supports JSON, CBOR, ProtoBuf, and custom formats. `Json { ignoreUnknownKeys = true }` for flexible parsing. Use sealed classes for polymorphic serialization.

## Security Fundamentals

### Expect/Actual for Secure Storage
Declare `expect` secure storage interface in commonMain. `actual` implementations: EncryptedSharedPreferences (Android), Keychain (iOS). Share only the interface — platform handles encryption. Store tokens, API keys, and credentials.

### Kotlin/Native Cryptography
`kotlinx.coroutines` for secure randomness. Platform crypto via expect/actual or platform-specific SDKs. Apple's Security framework (iOS) vs AndroidKeyStore. Avoid implementing custom crypto — use platform primitives.

## Build & Dependency Management

### Gradle Multiplatform Plugin
`org.jetbrains.kotlin.multiplatform` plugin configures targets. `androidTarget` for Android. `iosX64`, `iosArm64`, `iosSimulatorArm64` for iOS. `listOf(iosX64(), iosArm64(), iosSimulatorArm64())` for all iOS variants. Framework configuration for iOS integration.

### CocoaPods Integration
KMP can produce iOS framework consumed via CocoaPods. `cocoapods {}` block in Gradle. `pod install` integrates the framework. Xcode workspace includes both KMP framework and app target. Kotlin/Native framework exposed as Objective-C compatible API.

### Testing
`commonTest` for shared tests. `kotlin.test` framework (JUnit-style). Expect/actual for platform test dependencies. `Turbine` for Flow testing. MockK for multiplatform mocking (experimental in commonTest). Run with `./gradlew allTests`.

## Key Points
- expect/actual for platform-specific implementations (minimize surface area)
- SQLDelight for shared cross-platform SQLite
- Ktor for multiplatform HTTP client
- kotlinx.serialization for shared serialization
- Source sets: commonMain, androidMain, iosMain
- Kotlin/Native compiles to native binaries on iOS
- CocoaPods or SPM for iOS framework integration
- Coroutines + Flow for shared async/reactive code
- Compose Multiplatform for shared UI (experimental)
- Gradle plugin manages targets, source sets, and dependencies
