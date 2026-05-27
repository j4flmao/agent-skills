---
name: kotlin-architecture
description: >
  Use this skill when designing Kotlin backend architecture — Ktor, Spring WebFlux, http4k. Project structure, coroutine pipelines, routing, error handling, DI. This skill enforces: structured concurrency, proper coroutine scope management, layered architecture, validation. Do NOT use for: frontend architecture, database schema design, Kotlin Multiplatform Mobile.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, kotlin, jvm, phase-4]
---

# Kotlin Architecture

## Purpose
Define and enforce Kotlin backend architecture, framework selection, coroutine pipeline conventions, and project structure.

## Agent Protocol

### Trigger
User request includes: `kotlin backend`, `ktor`, `webflux`, `http4k`, `kotlin server`, `coroutines`, `kotlin project structure`.

### Input Context
- Framework (Ktor, Spring WebFlux, http4k)
- Runtime (JVM 17+, native via Kotlin/Native)
- Language (Kotlin 1.9+)
- Project type (REST API, GraphQL, WebSocket server)

### Output Artifact
A markdown document containing:
- Project structure
- Coroutine pipeline layout
- Routing conventions
- Error handling strategy
- Validation setup (kotlinx.serialization, Konform)
- DI pattern (Koin, Kodein, Spring)
- Testing setup (kotlin.test, MockK)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output.

### Completion Criteria
- Project structure follows clean architecture with domain-driven packages
- Coroutine scope management prevents leaks
- Route handlers separated from business logic
- Central error handler for all exceptions
- Validation uses typed DSL or annotation-based approach

### Max Response Length
4096 tokens

## Workflow

### Step 1: Select Framework

| Framework | Style | DI | Coroutines | When |
|---|---|---|---|---|
| **Ktor** | Async, pipeline | Koin/Kodein | Native | Lightweight, microservices, custom stacks |
| **Spring WebFlux** | Reactive | Spring DI | reactor-kotlin | Team familiar with Spring, full ecosystem |
| **http4k** | Functional, lens | Manual/Kodein | Supported | Pure functions, testability, hexagonal arch |

### Step 2: Set Up Project Structure
```
src/
├── main/
│   ├── kotlin/
│   │   └── com/project/
│   │       ├── module/
│   │       │   ├── order/
│   │       │   │   ├── OrderController.kt
│   │       │   │   ├── OrderService.kt
│   │       │   │   ├── OrderRepository.kt
│   │       │   │   ├── OrderModel.kt
│   │       │   │   └── OrderRoute.kt
│   │       │   ├── product/
│   │       │   └── user/
│   │       ├── common/
│   │       │   ├── middleware/
│   │       │   ├── error/
│   │       │   └── util/
│   │       ├── config/
│   │       │   ├── AppConfig.kt
│   │       │   └── Database.kt
│   │       ├── di/
│   │       │   └── Modules.kt
│   │       └── Application.kt
│   └── resources/
│       ├── application.conf
│       └── logback.xml
├── test/
│   └── kotlin/
│       └── com/project/
└── build.gradle.kts
```

### Step 3: Define Coroutine Scope Architecture
```kotlin
// Application.kt
fun main() {
  runBlocking {
    supervisedScope {
      val app = createApplication()
      app.start()
    }
  }
}

// Common scopes
val requestScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
val dbScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
```

### Step 4: Implement Structured Route Layout (Ktor)
```kotlin
fun Application.module() {
  install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
  install(CallLogging)
  install(StatusPages) {
    exception<AppException> { call, cause ->
      call.respond(
        HttpStatusCode.fromValue(cause.statusCode),
        ErrorResponse(cause.code, cause.message)
      )
    }
    exception<Throwable> { call, cause ->
      log.error("Unhandled", cause)
      call.respond(HttpStatusCode.InternalServerError, ErrorResponse("INTERNAL", "Unexpected error"))
    }
  }
  routing {
    route("/api/v1") {
      orderRoutes()
      productRoutes()
      userRoutes()
    }
  }
}
```

### Step 5: Error Handling Pattern
```kotlin
sealed class AppException(val statusCode: Int, val code: String, override val message: String) : RuntimeException(message) {
  class NotFound(entity: String, id: Any) : AppException(404, "NOT_FOUND", "$entity with $id not found")
  class Validation(errors: List<String>) : AppException(400, "VALIDATION", errors.joinToString("; "))
  class Unauthorized(reason: String) : AppException(401, "UNAUTHORIZED", reason)
}
```

## Rules
- Framework chosen by ecosystem needs and team expertise.
- Modules grouped by domain feature, not technical layer.
- CoroutineScope always supervised — never use GlobalScope.
- Routes are thin — delegate to service layer.
- All exceptions handled by StatusPages plugin — no try/catch in route handlers.
- Validation via Konform or kotlinx.serialization — never manual field checks.
- Build system: Gradle Kotlin DSL.

## References
  - references/coroutines-guide.md — Coroutines Guide
  - references/kotlin-backend-patterns.md — Kotlin Backend Patterns
  - references/kotlin-error-handling.md — Kotlin Error Handling Reference
  - references/kotlin-project-structure.md — Kotlin Project Structure Reference
  - references/kotlin-testing.md — Kotlin Testing Guide
  - references/ktor-setup.md — Ktor Setup Guide
## Handoff
Hand off to `backend/kotlin/patterns/SKILL.md` for Kotlin-specific backend patterns.
