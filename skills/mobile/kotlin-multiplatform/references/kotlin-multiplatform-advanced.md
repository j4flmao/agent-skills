# Kotlin Multiplatform Advanced Topics

## Overview
Advanced KMP topics cover Compose Multiplatform, iOS framework distribution, performance optimization, advanced expect/actual patterns, C interop, and production deployment strategies.

## Compose Multiplatform

### Shared UI with Compose
Compose Multiplatform renders on Android (Canvas), iOS (Skia/UIKit), desktop, and web. Write UI once in commonMain using `@Composable` functions. Platform-specific styling via `expect` composables. Resource management via `org.jetbrains.compose.resources`.

### iOS Rendering
iOS renders Compose via a UIKit-backed `UIViewController`. Set `composeApplication` in `MainViewController.kt`. Performance comparable to SwiftUI for most use cases. Custom fonts via font registration in `Info.plist`. Material3 components work cross-platform.

### Desktop and Web Targets
Desktop: JVM-based, runs on Windows/macOS/Linux. Window management with `application { Window { ... } }`. Web: Canvas-based or DOM-based rendering. Target selection based on deployment requirements. Same codebase compiles to all targets.

## Advanced Expect/Actual

### Interface-Based Abstraction
Prefer interface in commonMain with platform implementations injected via DI (Koin, kotlin-inject). Avoid expect/actual for pure abstraction — use interfaces + DI. Reserve expect/actual for platform APIs (system services, hardware).

### Hierarchical Structure
`kotlin.sourceSets { iosMain { dependsOn(appleMain) } }` for shared Apple code. `nativeMain` for all native targets (iOS, macOS, watchOS, tvOS). Commonize platform APIs across similar targets. Reduces actual implementations for shared behavior (URLSession, Foundation).

### Squashing Declarations
Multiple expect declarations can share a single actual. iOS doesn't differentiate between iOS/tvOS/watchOS for some APIs. Use `@OptionalExpectation` for optional platform APIs. `@HiddenFromObjC` for Kotlin-only API (no iOS framework export).

## Performance Optimization

### Kotlin/Native Memory Model
Stable memory model (since Kotlin 1.8): concurrent access protected by compiler. `@SharedImmutable` for frozen shared objects. `AtomicReference`/`AtomicInt` for lock-free concurrency. No manual freezing needed in new memory model.

### Integration with iOS Performance
Kotlin/Native overhead vs native Swift: <5% for typical business logic. Ktor latency vs URLSession: comparable (~1-2ms overhead). Avoid heavy coroutine flows across Kotlin/Swift boundary — batch results. Minimize expect/actual calls in hot paths.

### Binary Size
KMP adds 2-5MB to iOS binary for Kotlin runtime + shared code. Optimize: enable `isStatic = true` in framework config (embeds runtime). R8/ProGuard for Android. Remove unused expect/actual implementations. Use `@Transient` on properties.

## Advanced iOS Integration

### Framework Distribution
Embed KMP framework as XCFramework for distribution. `BinaryFramework` in Gradle for CI publishing. SPM compatibility via `xcframeworks`. CocoaPods podspec generation. Versioning aligned with app releases. Binary size optimization per architecture.

### Swift/Kotlin Interop
Kotlin enums export as Swift enums. Sealed classes export as Swift enums with associated values. `Flow` exports as `Kotlinx_coroutines_coreFlow`. Use `@ObjCName` for Swift-friendly naming. `@Throws` for Kotlin exceptions → Swift throws.

### iOS-Specific Modules
`appleMain` for shared iOS/macOS code. Use `@ObjCExport(false)` to hide from Objective-C. `fun Interface` for protocols. `UIApplication` interop via cinterop. UIKit/CoreGraphics interop in iosMain only.

## C Interop

### cinterop Configuration
Define `.def` files for C library bindings. `headers` for C header files. `staticLibraries` for linking static libs. `libraryPaths` for library search paths. Generate bindings via Gradle cinterop task. Access as Kotlin top-level functions.

### Memory Management
`CPointer` for C pointer handling. `NativePlacement` for allocating native memory. `memScoped` for automatic cleanup. `usePinned` for direct buffer access. Arena-based allocators for complex C interop.

## CI/CD for KMP

### Multi-Platform Builds
Android: runs on Linux (Ubuntu). iOS: requires macOS runner. `./gradlew allTests` for all targets. `./gradlew :shared:linkDebugFrameworkIosArm64` for iOS framework. Separate CI jobs per platform. Cache Gradle dependencies and Kotlin/Native compiler.

### Publishing
`maven-publish` for Android artifacts. CocoaPods trunk for iOS framework. GitHub Packages or Artifactory for internal distribution. Versioning: semantic version for shared module. Binary compatibility checks in CI.

## Key Points
- Compose Multiplatform for shared UI across platforms
- Interface-based DI over expect/actual for pure abstraction
- Kotlin/Native stable memory model (no manual freezing)
- XCFramework for iOS binary distribution
- cinterop for C library integration
- Flow + coroutines for shared async logic
- iOS overlay artifacts for Apple-specific APIs
- Minimal Swift/Kotlin boundary crossing in hot paths
- Separate CI jobs per platform (macOS for iOS, Linux for Android)
- Binary size: 2-5MB overhead for Kotlin runtime
