---
name: kotlin-backend-patterns
description: >
  Use this skill when implementing Kotlin backend patterns — repository pattern, service layer, DTO mapping, DI setup (Koin, Kodein), testing with MockK, and structured concurrency. This skill enforces: proper pattern usage, consistent DI wiring, testable architecture. Do NOT use for: framework-specific setup, database migrations, deployment.
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

# Kotlin Backend Patterns

## Purpose
Standardize common Kotlin backend implementation patterns: repository, service, DTO mapping, dependency injection, and testing.

## Agent Protocol

### Trigger
User request includes: `kotlin pattern`, `repository kotlin`, `service layer kotlin`, `koin setup`, `mockk testing`, `kotlin di`, `coroutine pattern`, `kotlin testing`.

### Input Context
- Framework (Ktor, Spring WebFlux, http4k)
- DI framework (Koin, Kodein, Spring)
- Test framework (kotlin.test, MockK)
- Serialization approach (kotlinx.serialization, Jackson)

### Output Artifact
A markdown document containing:
- Repository pattern with coroutines
- Service layer abstraction
- DTO / domain mapping
- DI module wiring
- Unit test examples with MockK
- Integration test patterns

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Repository abstracted behind interface for testability
- Service layer contains business logic
- DI modules scoped correctly
- Tests cover success, error, and edge cases
- Coroutine dispatchers overridable in tests

### Max Response Length
4096 tokens

## Workflow

### Step 1: Repository Pattern
```kotlin
interface OrderRepository {
  suspend fun findById(id: UUID): Order?
  suspend fun save(order: Order): Order
  suspend fun delete(id: UUID)
}

class OrderRepositoryImpl(private val db: Database) : OrderRepository {
  override suspend fun findById(id: UUID): Order? = db.withSession {
    OrderTable.select { OrderTable.id eq id }
      .map { it.toOrder() }
      .singleOrNull()
  }
}
```

### Step 2: Service Layer
```kotlin
class OrderService(
  private val repo: OrderRepository,
  private val validator: OrderValidator
) {
  suspend fun create(request: CreateOrderRequest): Order {
    validator.validate(request)
    val order = request.toDomain()
    return repo.save(order)
  }

  suspend fun findById(id: UUID): Order {
    return repo.findById(id) ?: throw AppException.NotFound("Order", id)
  }
}
```

### Step 3: DTO / Domain Mapping
```kotlin
@Serializable
data class CreateOrderRequest(val items: List<OrderItemDto>, val customerId: String)

@Serializable
data class OrderResponse(val id: String, val status: String, val total: Double)

fun Order.toResponse() = OrderResponse(
  id = id.toString(),
  status = status.name,
  total = totalAmount
)
```

### Step 4: DI with Koin
```kotlin
val repositoryModule = module {
  single<OrderRepository> { OrderRepositoryImpl(get()) }
  single<OrderValidator> { OrderValidator() }
}

val serviceModule = module {
  factory { OrderService(get(), get()) }
}

val appModules = listOf(repositoryModule, serviceModule, databaseModule)
```

### Step 5: Testing with MockK
```kotlin
class OrderServiceTest {
  private val repo = mockk<OrderRepository>()
  private val validator = mockk<OrderValidator>()
  private val service = OrderService(repo, validator)

  @Test
  fun `create order succeeds`() = runTest {
    val req = CreateOrderRequest(listOf(...), "cust-1")
    every { validator.validate(req) } just Runs
    every { repo.save(any()) } returns Order(...)

    val result = service.create(req)

    assertNotNull(result)
    verify { repo.save(any()) }
  }

  @Test
  fun `find missing order throws`() = runTest {
    every { repo.findById(any()) } returns null

    assertFailsWith<AppException.NotFound> {
      service.findById(UUID.randomUUID())
    }
  }
}
```

## Rules
- Repository interfaces in domain layer, implementations in infrastructure.
- Service classes single-responsibility — one aggregate root per service.
- DTOs annotated with @Serializable, mapped via extension functions.
- DI modules separated by layer (infrastructure, service, controller).
- MockK preferred for unit tests — inline mocking discouraged.
- runTest for coroutine tests, TestCoroutineDispatcher for time control.

## References

### Reference Files
- `references/ktor-setup.md` — Ktor configuration and routing
- `references/kotlin-backend-patterns.md` — Detailed patterns reference
- `references/coroutines-guide.md` — Coroutine patterns and scopes

### Related Skills
- `backend/kotlin/architecture/SKILL.md` — Kotlin backend architecture
- `backend/universal/api-response/SKILL.md` — Unified API responses
- `backend/universal/oop-principles/SKILL.md` — SOLID principles

## Handoff
Hand off to `backend/kotlin/architecture/SKILL.md` for overall architecture guidance.
