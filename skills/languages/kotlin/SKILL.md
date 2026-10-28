---
name: lang-kotlin
description: >
  Use this skill when the user says 'Kotlin', 'coroutines', 'Flow', 'StateFlow', 'suspend function', 'structured concurrency', 'null safety Kotlin', 'data class', 'sealed interface', 'extension function', 'K2 compiler', 'KSP', 'Gradle Kotlin DSL', 'MockK', 'kotlinx.serialization'. Writes and reviews idiomatic Kotlin 2.x on the JVM: null safety, data/sealed/value classes, coroutines and Flow with structured concurrency, collections and sequences, Java interop, build setup and testing. Do NOT use for: Android UI/Jetpack Compose architecture (use android), Kotlin Multiplatform project structure (use mobile-kotlin-multiplatform), Ktor/Spring service architecture (use backend/kotlin/*).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, kotlin, jvm, coroutines, flow]
---

# Kotlin

## Purpose
Kotlin removes most null-pointer bugs at compile time and makes asynchronous code sequential-looking with coroutines. The common failures are leaking coroutines outside a scope, blocking threads inside `suspend` code, and fighting the type system with `!!`. This skill applies Kotlin 2.x idioms (K2 compiler) that avoid them.

## Agent Protocol

### Trigger
"Kotlin", "coroutines", "Flow", "StateFlow", "suspend", "structured concurrency", "null safety", "data class", "sealed interface", "extension function", "K2", "KSP", "Gradle Kotlin DSL", "MockK".

### Input Context
- Kotlin and JVM target versions; platform (JVM server, Android, KMP shared module)
- Frameworks (Spring Boot, Ktor, Android Jetpack) and build tool (Gradle Kotlin DSL)
- Existing coroutine scopes/dispatchers and test setup

### Output Artifact
Kotlin code, Gradle snippets, tests, or review findings. No file unless requested.

### Response Format
```
Kotlin/JVM: {2.x / 17|21}
Change: {what and why}
Code: {snippet}
Concurrency: {scope, dispatcher, cancellation behaviour}
Verify: {./gradlew test, detekt/ktlint}
```

## 1. Null Safety
- `String` vs `String?`; smart casts after checks; `?.`, `?:` (Elvis), `let`, `requireNotNull(x) { "message" }`.
- `!!` throws NPE — acceptable only where an invariant is proven; prefer `?: error("...")` with context.
- Java interop: Java types are *platform types* (`String!`) — annotate Java code (`@Nullable`/`@NonNull`, JSpecify) or check at the boundary.

## 2. Modelling Data
```kotlin
@JvmInline value class OrderId(val value: String)              // zero-cost wrapper on the JVM in most cases

data class Order(val id: OrderId, val total: Long, val status: Status)

sealed interface Status {
    data object Pending : Status
    data class Shipped(val trackingNo: String) : Status
    data class Cancelled(val reason: String) : Status
}

fun describe(s: Status): String = when (s) {                     // exhaustive, no else needed
    Status.Pending -> "pending"
    is Status.Shipped -> "shipped: ${s.trackingNo}"
    is Status.Cancelled -> "cancelled: ${s.reason}"
}
```
- Prefer `val` and immutable collections (`List`, `Map`); `copy()` for updates.
- Extension functions add behaviour without inheritance; they are resolved statically (no override).
- Scope functions: `apply` (configure and return receiver), `also` (side effect), `let` (transform/null-check), `run`/`with` (compute with receiver) — keep chains short.

## 3. Coroutines and Structured Concurrency
- Every coroutine belongs to a `CoroutineScope`; cancellation and failure propagate through the job hierarchy. Never use `GlobalScope` in application code.
- `coroutineScope { }` for parallel decomposition that fails together; `supervisorScope { }` when children fail independently.
```kotlin
suspend fun loadDashboard(userId: String): Dashboard = coroutineScope {
    val profile = async { profileApi.get(userId) }
    val orders  = async { orderApi.recent(userId) }
    Dashboard(profile.await(), orders.await())          // if one fails, the other is cancelled
}
```
- Dispatchers: `Default` (CPU, cores-sized pool), `IO` (blocking I/O, elastic up to 64 threads by default), `Main` (UI). Wrap blocking calls in `withContext(Dispatchers.IO)`; never call blocking APIs on `Default`/`Main`.
- Cancellation is cooperative: suspension points check it; long CPU loops call `ensureActive()`. Do not catch `CancellationException` without rethrowing (beware `runCatching` around suspend calls).
- Timeouts: `withTimeout(5.seconds) { ... }`.
- Shared mutable state: confine to one coroutine, use `Mutex` (suspending) or atomics; `synchronized` blocks must not suspend inside.

## 4. Flow
- Cold `Flow` for streams computed on collection; `StateFlow` (always has a value, conflated) for observable state; `SharedFlow` for events.
- Operators: `map`, `filter`, `debounce`, `distinctUntilChanged`, `flatMapLatest`, `combine`, `catch`, `flowOn(Dispatchers.IO)` (changes the upstream context only).
- Convert cold to hot with `stateIn(scope, SharingStarted.WhileSubscribed(5_000), initial)`.
- Collect lifecycle-aware on Android (`repeatOnLifecycle` / `collectAsStateWithLifecycle`).

## 5. Collections and Sequences
Collection operators are eager (each step allocates a list); use `asSequence()` for long chains over large inputs or when short-circuiting (`first { }`). Use `buildList { }`, `associateBy`, `groupBy`, `partition` instead of manual loops where clearer.

## 6. Build and Tooling
- K2 compiler is the default since Kotlin 2.0; keep the Kotlin Gradle plugin, coroutines and serialization versions aligned (version catalog `libs.versions.toml`).
- Annotation processing: prefer KSP; kapt is in maintenance mode and slower.
- `kotlinx.serialization` (`@Serializable`) for JSON without reflection; works across KMP targets.
- Static analysis: detekt, ktlint (or the Kotlin compiler's own warnings as errors: `allWarningsAsErrors = true`).
- Java interop annotations: `@JvmStatic`, `@JvmOverloads`, `@JvmField`, `@Throws` for checked exceptions seen from Java.

## 7. Testing
- JUnit 5 or Kotest; MockK for Kotlin-friendly mocks (`coEvery`/`coVerify` for suspend functions).
- `kotlinx-coroutines-test`: `runTest { }` with virtual time, `StandardTestDispatcher`, `advanceUntilIdle()`; inject dispatchers instead of hard-coding `Dispatchers.IO`.
- Turbine for testing Flows.
See `references/kotlin-testing.md`.

## 8. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| `GlobalScope.launch` | leaks, no cancellation | inject a scope tied to lifecycle |
| `runBlocking` in production request paths | blocks threads | suspend all the way |
| Blocking I/O on `Dispatchers.Default`/`Main` | starvation, ANR | `withContext(Dispatchers.IO)` |
| Swallowing `CancellationException` | coroutine never cancels | rethrow or use `ensureActive()` |
| `!!` chains | NPEs | Elvis with error message, model optionality |
| Mutable `var` in data classes used as map keys | broken hashing | immutable `val` properties |

## 9. Checklist
- [ ] No `!!` without a stated invariant; platform types checked at Java boundaries
- [ ] Sealed hierarchies + exhaustive `when` for state/results
- [ ] Every coroutine launched in an owned scope; dispatchers injected
- [ ] Blocking calls isolated on `Dispatchers.IO`; cancellation honoured
- [ ] Tests use `runTest`; detekt/ktlint clean

## References
- `references/kotlin-fundamentals.md` — nullability, data classes, scope functions
- `references/kotlin-advanced.md` — coroutines, Flow, inline/value classes
- `references/reified-generics-dsl.md` — reified generics and type-safe DSLs
- `references/kotlin-testing.md` — MockK, Kotest, coroutine testing
