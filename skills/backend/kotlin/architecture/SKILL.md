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
+-- main/
|   +-- kotlin/
|   |   +-- com/project/
|   |       +-- module/
|   |       |   +-- order/
|   |       |   |   +-- OrderController.kt
|   |       |   |   +-- OrderService.kt
|   |       |   |   +-- OrderRepository.kt
|   |       |   |   +-- OrderModel.kt
|   |       |   |   +-- OrderRoute.kt
|   |       |   |   +-- dto/
|   |       |   |       +-- CreateOrderRequest.kt
|   |       |   |       +-- OrderResponse.kt
|   |       |   +-- product/
|   |       |   +-- user/
|   |       +-- common/
|   |       |   +-- middleware/
|   |       |   |   +-- AuthMiddleware.kt
|   |       |   |   +-- RequestLogging.kt
|   |       |   |   +-- RequestValidation.kt
|   |       |   +-- error/
|   |       |   |   +-- AppException.kt
|   |       |   |   +-- ErrorResponse.kt
|   |       |   +-- util/
|   |       |       +-- PagedResult.kt
|   |       |       +-- Extensions.kt
|   |       +-- config/
|   |       |   +-- AppConfig.kt
|   |       |   +-- Database.kt
|   |       |   +-- SecurityConfig.kt
|   |       +-- di/
|   |       |   +-- Modules.kt
|   |       +-- Application.kt
|   +-- resources/
|       +-- application.conf
|       +-- logback.xml
+-- test/
|   +-- kotlin/
|       +-- com/project/
|           +-- module/
|           +-- common/
+-- build.gradle.kts
+-- settings.gradle.kts
```

### Step 3: Gradle Build Configuration
```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "1.9.22"
    kotlin("plugin.serialization") version "1.9.22"
    id("io.ktor.plugin") version "2.3.7"
}

group = "com.project"
version = "1.0.0"

application {
    mainClass.set("com.project.ApplicationKt")
}

dependencies {
    // Ktor
    implementation("io.ktor:ktor-server-core:2.3.7")
    implementation("io.ktor:ktor-server-netty:2.3.7")
    implementation("io.ktor:ktor-server-content-negotiation:2.3.7")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.7")
    implementation("io.ktor:ktor-server-auth:2.3.7")
    implementation("io.ktor:ktor-server-auth-jwt:2.3.7")

    // Koin
    implementation("io.insert-koin:koin-ktor:3.5.3")

    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")

    // Database
    implementation("org.jetbrains.exposed:exposed-core:0.44.1")
    implementation("org.jetbrains.exposed:exposed-dao:0.44.1")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.44.1")
    implementation("com.zaxxer:HikariCP:5.1.0")
    implementation("org.postgresql:postgresql:42.7.1")

    // Logging
    implementation("ch.qos.logback:logback-classic:1.4.14")

    // Testing
    testImplementation("io.ktor:ktor-server-test-host:2.3.7")
    testImplementation("io.mockk:mockk:1.13.9")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.1")
}
```

### Step 4: Define Coroutine Scope Architecture
```kotlin
// Application.kt
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger
import io.ktor.server.engine.*

fun main() {
    runBlocking {
        supervisedScope {
            val app = createApplication()
            app.start(wait = true)
        }
    }
}

fun Application.createApplication() {
    install(Koin) {
        slf4jLogger()
        modules(appModules)
    }
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            isLenient = true
            encodeDefaults = true
            prettyPrint = false
        })
    }
    install(CallLogging) {
        level = Level.INFO
        filter { call -> call.request.path().startsWith("/api") }
    }
    install(StatusPages) {
        configureErrorHandling()
    }
    configureRouting()
    configureSerialization()
}

// Scoped coroutine contexts
object AppScopes {
    val requestScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val dbScope = CoroutineScope(SupervisorJob() + Dispatchers.IO + CoroutineName("db-pool"))
}

// Pre-configured coroutine context helpers
suspend fun <T> withDbContext(block: suspend CoroutineScope.() -> T): T {
    return withContext(Dispatchers.IO + CoroutineName("db-operation")) {
        block()
    }
}
```

### Step 5: Ktor Plugin Installation Order
```
Ktor plugin order (install order matters):
1. ContentNegotiation (must be before routing)
2. CallLogging
3. Authentication / JWT
4. StatusPages (error handling)
5. Compression
6. CORS
7. RateLimit
8. Routing (always last)
```

### Step 6: Structured Route Layout (Ktor)
```kotlin
// Routing.kt
fun Application.configureRouting() {
    routing {
        route("/api/v1") {
            authenticate {
                orderRoutes()
            }
            authRoutes()  // login/register (no auth)
            healthRoutes()
        }
    }
}

// Module/Order/OrderRoute.kt
fun Route.orderRoutes() {
    val controller: OrderController by inject()

    route("/orders") {
        get {
            val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 0
            val size = call.request.queryParameters["size"]?.toIntOrNull() ?: 20
            val result = controller.list(page, size)
            call.respond(result)
        }

        post {
            val request = call.receive<CreateOrderRequest>()
            val result = controller.create(request)
            call.respond(HttpStatusCode.Created, result)
        }

        get("/{id}") {
            val id = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: throw AppException.Validation("Invalid order ID")
            val result = controller.getById(id)
            call.respond(result)
        }

        post("/{id}/cancel") {
            val id = call.parameters["id"]?.let { UUID.fromString(it) }
                ?: throw AppException.Validation("Invalid order ID")
            val result = controller.cancel(id)
            call.respond(result)
        }
    }
}

// Module/Order/OrderController.kt
class OrderController(
    private val orderService: OrderService
) {
    suspend fun list(page: Int, size: Int): PagedResponse<OrderResponse> {
        val result = orderService.findAll(page, size)
        return PagedResponse(
            items = result.items.map { it.toResponse() },
            total = result.total,
            page = result.page,
            size = result.size
        )
    }

    suspend fun create(request: CreateOrderRequest): OrderResponse {
        val order = orderService.create(request)
        return order.toResponse()
    }

    suspend fun getById(id: UUID): OrderResponse {
        val order = orderService.findById(id)
        return order.toResponse()
    }

    suspend fun cancel(id: UUID): OrderResponse {
        val order = orderService.cancel(id, "User requested cancellation")
        return order.toResponse()
    }
}
```

### Step 7: Error Handling Pattern
```kotlin
// common/error/AppException.kt
sealed class AppException(
    override val message: String,
    val statusCode: HttpStatusCode,
    val errorCode: String
) : RuntimeException(message) {

    class NotFound(entity: String, id: Any) :
        AppException("$entity with $id not found", HttpStatusCode.NotFound, "NOT_FOUND")

    class Validation(override val message: String, val errors: List<String>? = null) :
        AppException(message, HttpStatusCode.BadRequest, "VALIDATION")

    class Unauthorized(reason: String = "Authentication required") :
        AppException(reason, HttpStatusCode.Unauthorized, "UNAUTHORIZED")

    class Forbidden(reason: String = "Access denied") :
        AppException(reason, HttpStatusCode.Forbidden, "FORBIDDEN")

    class Conflict(reason: String) :
        AppException(reason, HttpStatusCode.Conflict, "CONFLICT")

    class Internal(override val message: String = "Internal server error", cause: Throwable? = null) :
        AppException(message, HttpStatusCode.InternalServerError, "INTERNAL_ERROR")
}

// common/error/ErrorResponse.kt
@Serializable
data class ErrorResponse(
    val code: String,
    val message: String,
    val details: List<String>? = null
)

// common/error/StatusPages.kt
fun StatusPagesConfig.configureErrorHandling() {
    exception<AppException.NotFound> { call, cause ->
        call.respond(cause.statusCode, ErrorResponse(cause.errorCode, cause.message))
    }
    exception<AppException.Validation> { call, cause ->
        call.respond(cause.statusCode, ErrorResponse(cause.errorCode, cause.message, cause.errors))
    }
    exception<AppException.Unauthorized> { call, cause ->
        call.respond(cause.statusCode, ErrorResponse(cause.errorCode, cause.message))
    }
    exception<AppException.Forbidden> { call, cause ->
        call.respond(cause.statusCode, ErrorResponse(cause.errorCode, cause.message))
    }
    exception<AppException.Conflict> { call, cause ->
        call.respond(cause.statusCode, ErrorResponse(cause.errorCode, cause.message))
    }
    exception<BadRequestException> { call, cause ->
        call.respond(HttpStatusCode.BadRequest, ErrorResponse("BAD_REQUEST", cause.message))
    }
    exception<Throwable> { call, cause ->
        val logger = call.application.log
        logger.error("Unhandled exception", cause)
        call.respond(HttpStatusCode.InternalServerError, ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
    }
}
```

### Step 8: Authentication with JWT
```kotlin
// config/SecurityConfig.kt
fun Application.configureSecurity() {
    val secret = Environment.getConfig("jwt.secret")
    val issuer = Environment.getConfig("jwt.issuer")
    val audience = Environment.getConfig("jwt.audience")
    val realm = Environment.getConfig("jwt.realm")

    install(Authentication) {
        jwt {
            verifier(JWT.verifier(secret.toByteArray(), Algorithm.HMAC256))
            realm = realm
            validate { credential ->
                if (credential.payload.getClaim("type").asString() == "access") {
                    JWTPrincipal(credential.payload)
                } else null
            }
        }
    }
}

// Middleware for role-based access
fun Route.authorize(vararg roles: String) {
    intercept(ApplicationCallPipeline.Call) {
        val principal = call.principal<JWTPrincipal>()
        val userRole = principal?.payload?.getClaim("role")?.asString()
        if (userRole !in roles) {
            throw AppException.Forbidden("Required role: ${roles.joinToString(",")}")
        }
    }
}
```

### Step 9: Testing
```kotlin
// test/.../OrderControllerTest.kt
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlin.test.*

class OrderControllerTest {
    @Test
    fun `create order returns 201`() = testApplication {
        application {
            configureDI()
            configureSerialization()
            configureRouting()
        }

        val response = client.post("/api/v1/orders") {
            contentType(ContentType.Application.Json)
            setBody("""
                {
                    "customerId": "cust-1",
                    "items": [
                        {"productId": "prod-1", "quantity": 2, "unitPrice": 19.99}
                    ]
                }
            """)
        }

        assertEquals(HttpStatusCode.Created, response.status)
    }

    @Test
    fun `get non-existent order returns 404`() = testApplication {
        application {
            configureRouting()
        }

        val response = client.get("/api/v1/orders/non-existent")
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    @Test
    fun `unauthenticated request returns 401`() = testApplication {
        application {
            configureSecurity()
            configureRouting()
        }

        val response = client.get("/api/v1/orders")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }
}
```

## Architecture Decision Trees

### Framework Selection
```
Spring ecosystem required?
  +-- Yes -> Use Spring WebFlux. Team familiarity, full ecosystem.
  +-- No  -> Need max performance and flexibility?
      +-- Yes -> Ktor. Lightweight, coroutine-native, modular.
      +-- No  -> http4k. Functional, testable, pure functions.
```

### Database Access
```
Complex relational queries with joins?
  +-- Yes -> Exposed (Kotlin SQL DSL) or Spring Data JPA
  +-- No  -> Simple CRUD? Use Exposed DAO or SQLDelight (if multiplatform)
```

### Coroutine Scope Management
```
Request-scoped operations with cleanup?
  +-- Yes -> Structured concurrency with coroutineScope {} (auto-cancels)
  +-- No  -> Background fire-and-forget? Use application scope with SupervisorJob
```

## Common Pitfalls

1. **GlobalScope usage**: Creates leaked coroutines that outlive request lifecycle. Never use GlobalScope — always structured concurrency or supervisedScope.

2. **Blocking calls in coroutines**: Calling `Thread.sleep()` or JDBC blocking operations on Dispatchers.Default or main. Use `withContext(Dispatchers.IO)`.

3. **Missing request body size limit**: Default Ktor max size is 8MB. Configure `maxSize` in ContentNegotiation for security.

4. **Exception swallowed in coroutine builder**: Exceptions in `launch` crash the application if unhandled. Use `supervisorScope` for isolated failure handling.

5. **Incorrect plugin order**: StatusPages must be installed before Routing. ContentNegotiation before Routing.

6. **Route parameters not validated**: `call.parameters["id"]` can be null. Always validate and convert with proper error handling.

7. **No CORS configuration for SPA clients**: CORS plugin must be installed with allowed origins, methods, and headers.

8. **Memory leak from retained coroutines**: Coroutines referencing the request continue after client disconnects. Use `withTimeout` on long operations.

9. **Over-reliance on reflection**: kotlinx.serialization prefers compile-time code generation. Configure `@Serializable` on all transfer types.

10. **Missing serialization module for Java types**: kotlinx.serialization doesn't support `java.util.UUID` or `java.time.Instant` by default. Register custom serializers.

## Best Practices

1. **Framework chosen by ecosystem needs and team expertise.**
2. **Modules grouped by domain feature, not technical layer.**
3. **CoroutineScope always supervised — never use GlobalScope.**
4. **Routes are thin — delegate to service layer.**
5. **All exceptions handled by StatusPages plugin — no try/catch in route handlers.**
6. **Validation via Konform or kotlinx.serialization — never manual field checks.**
7. **Build system: Gradle Kotlin DSL.**
8. **Structured concurrency with explicit scope propagation.**
9. **DTO layer between HTTP and domain models for decoupling.**
10. **Request-scoped services via Koin factory scope.**

## Compared With

| Feature | Ktor | Spring WebFlux | http4k |
|---|---|---|---|
| Startup time | <1s | 2-4s | <0.5s |
| Memory footprint | ~30MB | ~150MB | ~20MB |
| Coroutine support | Native | Via reactor-kotlin | With adapter |
| DI | Koin/Kodein | Spring DI | Manual/Kodein |
| Testing | `testApplication` | `@WebFluxTest` | `HttpHandler` testing |
| OpenAPI | Via plugin | springdoc | Via contract |
| Client | CIO, Apache | WebClient | Built-in |
| GraalVM | Limited | Limited | Good |
| Community | Moderate | Large | Small |

## Performance

- Ktor achieves ~40-50k req/s with Netty engine on modern hardware.
- Connection pooling: HikariCP with 10 connections default. Tune pool size for database limits.
- Content compression: Install Compression plugin (gzip/deflate) for text responses.
- HTTP/2: Enable with Netty engine for multiplexed connections.
- Caching headers: Set Cache-Control on GET responses for static/repeatable data.
- Database indexing: Composite indexes on frequently queried field combinations.
- Coroutine thread pool: Dispatchers.Default uses `number_of_cores` threads. Use Dispatchers.IO for DB calls.

## Tooling

| Tool | Purpose |
|---|---|
| **Ktor** | HTTP server framework |
| **Koin** | Dependency injection |
| **Exposed** | SQL DSL ORM |
| **kotlinx.serialization** | JSON serialization |
| **MockK** | Mocking framework |
| **Kotest** | Test framework |
| **Testcontainers** | Integration testing |
| **Detekt** | Static analysis |
| **ktlint** | Formatting |
| **Gradle Kotlin DSL** | Build configuration |
| **Logback** | Logging framework |
| **Docker** | Containerization |

## Rules

- Framework chosen by ecosystem needs and team expertise.
- Modules grouped by domain feature, not technical layer.
- CoroutineScope always supervised — never use GlobalScope.
- Routes are thin — delegate to service layer.
- All exceptions handled by StatusPages plugin — no try/catch in route handlers.
- Validation via Konform or kotlinx.serialization — never manual field checks.
- Build system: Gradle Kotlin DSL.
- Plugin installation order: ContentNegotiation, CallLogging, Auth, StatusPages, Compression, CORS, Routing.
- Private API in routes: authenticate() guard on protected routes.
- DTO serialization with kotlinx.serialization annotations.
- Database operations always on Dispatchers.IO via withContext.
- Test applications isolated per test case — no shared mutable state.

## References
  - references/kotlin-multiplatform-architecture.md — Kotlin Multiplatform Architecture
  - references/kotlin-ktor-framework.md — Kotlin Ktor Framework Reference
  - references/coroutines-guide.md — Coroutines Guide
  - references/kotlin-backend-patterns.md — Kotlin Backend Patterns
  - references/kotlin-error-handling.md — Kotlin Error Handling Reference
  - references/kotlin-project-structure.md — Kotlin Project Structure Reference
  - references/kotlin-testing.md — Kotlin Testing Guide
  - references/ktor-setup.md — Ktor Setup Guide

## Handoff
Hand off to `backend/kotlin/patterns/SKILL.md` for Kotlin-specific backend patterns.
