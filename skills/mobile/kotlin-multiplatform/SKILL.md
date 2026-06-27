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
version: "2.0.0"
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
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- commonMain compiles without platform imports
- expect/actual pairs resolve for all target platforms
- Compose Multiplatform screens render on Android and iOS
- Ktor client calls succeed on all platforms
- SQLDelight queries work cross-platform

### Max Response Length
8000 tokens

## Architecture Decision Trees

### UI Strategy
```
Need shared UI?
├── Yes → Compose Multiplatform
│   Pros: Single UI codebase, Material3 theming, navigation
│   Cons: Cannot render native components (Map, Camera, WebView)
├── Native UI per platform
│   Pros: Full native API access, platform-native UX
│   Cons: Two UI codebases, more maintenance
└── Hybrid → Compose Multiplatform + expect/actual for native components
    Strategy: 80% shared UI via Compose, 20% platform composable via expect
```

### Networking Strategy
```
API complexity?
├── REST + JSON → Ktor Client + kotlinx.serialization
│   Engine: OkHttp (Android), Darwin (iOS)
├── GraphQL → Apollo Kotlin (KMP support)
└── gRPC → KMP-gRPC (emerging, check compatibility)
```

### Persistence Strategy
```
Data model complexity?
├── Relational (SQL, joins) → SQLDelight
│   Common schema, platform drivers, Flow support
├── Key-value (settings, preferences) → multiplatform-settings
│   Wraps SharedPreferences (Android), NSUserDefaults (iOS)
├── NoSQL/Document → Realm Kotlin SDK
│   KMP-native, reactive, synchronization
└── Encrypted → SQLCipher (SQLDelight cipher) or platform Keychain/Keystore
```

### Dependency Injection
```
DI framework preference?
├── Lightweight, KMP-native → Koin
│   No code gen, easy setup, reasonable runtime performance
├── Compile-time verified → Anvil (Dagger-based)
│   Works with KMP, faster than Kapt
└── Manual → Constructor injection with factory pattern
```

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

## Anti-Patterns

- **Fat platform source sets**: If androidMain has more than 10 files, you're not sharing enough — refactor to commonMain
- **expect/actual for everything**: Interfaces with platform implementations are more testable than expect/actual
- **Ignoring iOS concurrency model**: Kotlin coroutines on iOS use custom dispatch — test iOS-specific threading scenarios
- **No commonTest coverage**: If commonTest is empty, you lose the main advantage of KMP — shared test coverage
- **Manual memory management on iOS**: Kotlin/Native uses ARC — but watch for cyclic references between Kotlin and Swift objects
- **Outdated libs.versions.toml**: KMP ecosystem moves fast — update Ktor, Kotlin, Compose versions together
- **Mixing KMP modules with Android-only dependencies**: Keep KMP modules pure — put Android UI in separate :app module

## Build & Deployment Patterns

### CI/CD for KMP Projects

KMP requires building for multiple targets — Android (JVM) and iOS (Kotlin/Native). CI must handle both environments. Recommended CI matrix:

```yaml
# GitHub Actions example
jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - name: Build Android
        run: ./gradlew :shared:assembleAndroidDebug :app:assembleDebug
      - name: Run common tests
        run: ./gradlew :shared:allTests

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - name: Build iOS framework
        run: |
          ./gradlew :shared:linkDebugFrameworkIosSimulatorArm64
          ./gradlew :shared:linkDebugFrameworkIosArm64
      - name: Run iOS tests
        run: ./gradlew :shared:iosX64Test :shared:iosSimulatorArm64Test
      - name: Build Xcode project
        run: |
          cd iosApp
          xcodebuild -scheme iosApp -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15'
```

### iOS Framework Integration

The KMP shared module produces a Kotlin/Native framework consumed by Xcode:

1. **Gradle setup**: Configure framework name and target in shared/build.gradle.kts:
   ```kotlin
   listOf(iosX64(), iosArm64(), iosSimulatorArm64()).forEach {
       it.binaries.framework {
           baseName = "shared"
           isStatic = true
           export("my-exported-module") // re-export module's API
       }
   }
   ```

2. **Xcode integration**: Add build phase to embed framework:
   - In Xcode target → Build Phases → New Run Script Phase
   - Script: `cd "$SRCROOT/.." && ./gradlew :shared:embedAndSignAppleFrameworkForXcode`
   - Input files: `$(SRCROOT)/../shared/build/bin/iosSimulatorArm64/debugFramework/shared.framework`

3. **SPM/CocoaPods distribution**: Publish framework as CocoaPod:
   ```ruby
   # shared.podspec
   Pod::Spec.new do |spec|
     spec.name = 'Shared'
     spec.vendored_frameworks = 'shared.framework'
     spec.platform = :ios, '16.0'
   end
   ```

### Version Catalog (libs.versions.toml)
```toml
[versions]
kotlin = "2.0.21"
ktor = "3.0.3"
sqldelight = "2.0.2"
compose-multiplatform = "1.7.1"
koin = "3.5.6"
coroutines = "1.9.0"
datetime = "0.6.1"

[libraries]
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
ktor-client-darwin = { module = "io.ktor:ktor-client-darwin", version.ref = "ktor" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
sqldelight-android = { module = "app.cash.sqldelight:android-driver", version.ref = "sqldelight" }
sqldelight-native = { module = "app.cash.sqldelight:native-driver", version.ref = "sqldelight" }
sqldelight-coroutines = { module = "app.cash.sqldelight:coroutines-extensions", version.ref = "sqldelight" }
koin-core = { module = "io.insert-koin:koin-core", version.ref = "koin" }
koin-android = { module = "io.insert-koin:koin-android", version.ref = "koin" }
datetime = { module = "org.jetbrains.kotlinx:kotlinx-datetime", version.ref = "datetime" }
```

### Gradle Multi-Module Structure
```
project/
├── shared/                    # KMP shared module
│   ├── src/commonMain/
│   ├── src/androidMain/
│   ├── src/iosMain/
│   └── build.gradle.kts
├── composeApp/               # Compose Multiplatform UI module
│   ├── src/commonMain/
│   ├── src/androidMain/
│   ├── src/iosMain/
│   └── build.gradle.kts
├── app/                       # Android shell app (only if not using composeApp)
│   └── src/main/
├── iosApp/                    # iOS Xcode project
│   └── iosApp.xcodeproj/
└── build.gradle.kts
```

Keep `shared` module pure — no Android UI dependencies. The `composeApp` module depends on `shared` and provides the Compose UI layer. Android app module wraps `composeApp`; iOS app embeds the framework from `composeApp` or `shared`.

## Performance Optimization

### Compose Multiplatform Rendering

- **`remember` and `derivedStateOf`**: Cache expensive computations. `val total = remember(items) { items.sumOf { it.price } }` recalculates only when items change. Use `derivedStateOf` for computed state that derives from other state.
- **`LaunchedEffect` lifecycle**: Runs in the composition's coroutine scope. Cancelled when composable leaves composition — no manual cleanup needed for coroutines. Use `DisposableEffect` for resources that need cleanup (listeners, observers).
- **`Modifier` ordering**: Order matters — `Modifier.clip().size(100.dp).background(Color.Red)` clips before sizing, which may not work as expected. Always clip after sizing: `Modifier.size(100.dp).clip(CircleShape).background(Color.Red)`.
- **Lambda stability**: Use `remember` for lambdas passed to composables: `val onClick = remember { { handleClick() } }`. Prevents unnecessary recomposition of child composables that receive unstable lambdas.
- **`key` parameter in `LazyColumn`**: `LazyColumn { items(items, key = { it.id }) }` provides stable identity — enables item animation, preserves scroll position across recomposition, and minimizes recomposition scope.
- **`contentType` in lazy lists**: When `LazyColumn` has mixed item types (headers, items, footers), set `contentType` parameter: `items(items, contentType = { "item" })`. Helps the layout engine optimize recycling.

### Memory and Allocation

- **`kotlin.Result` zero-cost**: Use `Result<T>` for operation outcomes instead of sealed classes in performance-critical paths — the Kotlin compiler optimizes it as a single object.
- **Primitive collections**: Use `IntArray`, `FloatArray`, `LongArray` over `List<Int>`, `List<Float>` for numeric-heavy operations. Reduces boxing overhead 10-20x.
- **`@Immutable` / `@Stable` annotations**: Mark data classes as `@Immutable` (all properties final, never change) or `@Stable` (changes are reported to Compose). This enables Compose's compiler to skip recomposition when state hasn't changed. Without these annotations, Compose pessimistically recomposes.
- **Avoid `var` in state holders**: Use `val` with `MutableState`/`MutableStateFlow`. `var customerName by remember { mutableStateOf("") }` — the `by` delegate enables automatic recomposition. Mutating `var` directly (without delegation) doesn't trigger recomposition.
- **`buildList` / `buildMap` / `buildString`**: Allocation-efficient collection builders. `buildList { addAll(items); sort() }` creates a single list at the end, not intermediate copies for each operation.
- **Image loading**: Coil 3 (KMP-compatible) with Compose integration. Use `AsyncImage` with `ImageRequest.Builder` for disk/memory cache, transform pipelines, and placeholder/error states.

```kotlin
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data("https://example.com/image.jpg")
        .crossfade(true)
        .size(512, 512)
        .build(),
    contentDescription = "Product image",
    modifier = Modifier.clip(RoundedCornerShape(8.dp))
)
```

### Ktor Client Optimization

- **Connection pooling**: Configure `HttpClient` with custom engine options. OkHttp: `OkHttp.config { connectionPool(ConnectionPool(5, 30, TimeUnit.SECONDS)) }`. Darwin: `Darwin.config { configureRequest { setAllowsCellularAccess(true) } }`.
- **Response caching**: Enable OkHttp cache on Android for GET requests. Configure cache directory and max size. Reduces redundant network calls.
- **Serialization performance**: Use `kotlinx.serialization` with `Json { ignoreUnknownKeys = true; isLenient = true }` over Gson or Moshi. KMP-native serialization is 2-3x faster than reflection-based alternatives.
- **WebSocket keep-alive**: For real-time connections, configure `WebSockets { pingInterval = 30_000 }` — sends ping frames every 30s to keep the connection alive and detect disconnects early.

## Architecture Patterns (Expanded)

### Repository Pattern with Caching
```kotlin
// commonMain
class OrderRepository(
    private val api: OrderApi,
    private val db: OrderDatabase,
) {
    fun getOrders(): Flow<List<Order>> = flow {
        // 1. Emit cached first
        val cached = db.orderQueries.selectAll().executeAsList()
        if (cached.isNotEmpty()) emit(cached.map { it.toOrder() })

        // 2. Fetch fresh from network
        val fresh = api.getOrders()
        db.transaction {
            db.orderQueries.deleteAll()
            fresh.forEach { db.orderQueries.insert(it.toEntity()) }
        }

        // 3. Emit fresh
        emit(fresh)
    }
}
```

### Clean Architecture Module Layers
```
shared/src/commonMain/kotlin/com/app/
├── domain/                    # Pure Kotlin, no framework dependencies
│   ├── model/                 # Domain entities (data classes)
│   ├── repository/            # Repository interfaces
│   └── usecase/               # Business logic (single responsibility)
├── data/                      # Implements domain interfaces
│   ├── remote/                # Ktor API clients
│   ├── local/                 # SQLDelight DAOs
│   └── repository/            # Repository implementations
├── di/                        # Koin module definitions
└── platform/                  # expect declarations
    └── Platform.kt
```

Domain layer has zero dependencies on Ktor, SQLDelight, or Compose. This makes it testable in `commonTest` without platform setup. Repository interfaces are in domain (`OrderRepository`), implementations are in data (`OrderRepositoryImpl`).

### Sealed Class State Management
```kotlin
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String, val throwable: Throwable?) : UiState<Nothing>
}

@Composable
fun <T> ContentView(
    state: UiState<T>,
    onRetry: () -> Unit,
    content: @Composable (T) -> Unit
) {
    when (state) {
        is UiState.Loading -> ShimmerLoading()
        is UiState.Success -> content(state.data)
        is UiState.Error -> ErrorView(state.message, onRetry)
    }
}
```

## Anti-Patterns (Expanded)

- **Sharing platform-specific types**: `java.io.File` in commonMain breaks compilation. Use expect/actual or interfaces for platform types.
- **One-shot expect/actual for everything**: Each `expect` declaration needs `actual` on every platform — increases maintenance. Prefer interfaces with platform DI.
- **Blocking main thread on iOS**: Kotlin coroutines on iOS may dispatch to the main thread. Use `Dispatchers.Main.immediate` with `withContext` for UI updates. Never use `runBlocking` on main thread in iOS.
- **No iOS memory optimization**: Kotlin/Native frameworks shipped with debug symbols by default. Strip with `isStatic = true` and set `embedAndSignAppleFrameworkForXcode` to use release builds in production.
- **`kotlin.test` vs platform test runners**: `commonTest` uses `kotlin.test` assertions, which differ from JUnit 5 and XCTest. Teams must learn KMP test patterns.
- **Over-reliance on Compose for everything**: Compose Multiplatform can't render native MapView, CameraPreview, or ARKit/ARCore. For 20% of features that need native components, use `expect` composable wrappers and keep them thin.
- **Mixing CocoaPods and SPM**: Choose one dependency manager for iOS. CocoaPods has better KMP integration. SPM support is improving but still has edge cases with transitive dependencies.
- **Missing `@ThreadLocal` on iOS objects**: iOS object initializers run on arbitrary threads. Use `@ThreadLocal` annotation or `AtomicReference` for mutable state accessed from multiple threads.

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
        androidMain.dependencies {
            implementation("io.ktor:ktor-client-okhttp:3.0.3")
            implementation("app.cash.sqldelight:android-driver:2.0.2")
        }
        iosMain.dependencies {
            implementation("io.ktor:ktor-client-darwin:3.0.3")
            implementation("app.cash.sqldelight:native-driver:2.0.2")
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
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.