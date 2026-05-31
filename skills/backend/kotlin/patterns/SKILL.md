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
// domain/OrderRepository.kt
interface OrderRepository {
    suspend fun findById(id: UUID): Order?
    suspend fun findByCustomerId(customerId: String): List<Order>
    suspend fun save(order: Order): Order
    suspend fun delete(id: UUID)
    suspend fun findAll(page: Int, size: Int): PagedResult<Order>
}

data class PagedResult<T>(
    val items: List<T>,
    val total: Long,
    val page: Int,
    val size: Int
)

// infrastructure/OrderRepositoryImpl.kt
class OrderRepositoryImpl(private val db: Database) : OrderRepository {
    override suspend fun findById(id: UUID): Order? = db.withSession {
        OrderTable.select { OrderTable.id eq id }
            .map { it.toOrder() }
            .singleOrNull()
    }

    override suspend fun findByCustomerId(customerId: String): List<Order> = db.withSession {
        OrderTable.select { OrderTable.customerId eq customerId }
            .orderBy(OrderTable.createdAt.desc())
            .map { it.toOrder() }
    }

    override suspend fun save(order: Order): Order = db.withSession {
        val entity = order.toEntity()
        OrderTable.insert(entity)
        order.copy(id = entity.id)
    }

    override suspend fun delete(id: UUID) = db.withSession {
        OrderTable.deleteWhere { OrderTable.id eq id }
    }

    override suspend fun findAll(page: Int, size: Int): PagedResult<Order> = db.withSession {
        val total = OrderTable.selectAll().count()
        val items = OrderTable.selectAll()
            .orderBy(OrderTable.createdAt.desc())
            .limit(size)
            .offset((page * size).toLong())
            .map { it.toOrder() }
        PagedResult(items, total, page, size)
    }
}
```

### Step 2: Service Layer
```kotlin
// domain/OrderService.kt
class OrderService(
    private val repo: OrderRepository,
    private val validator: OrderValidator,
    private val eventPublisher: EventPublisher
) {
    suspend fun create(request: CreateOrderRequest): Order {
        validator.validate(request)
        val order = Order.create(
            customerId = request.customerId,
            items = request.items.map { it.toDomain() },
            couponCode = request.couponCode
        )
        val saved = repo.save(order)
        eventPublisher.publish(OrderCreatedEvent(saved.id!!))
        return saved
    }

    suspend fun findById(id: UUID): Order {
        return repo.findById(id) ?: throw NotFoundException("Order", id)
    }

    suspend fun findByCustomerId(customerId: String): List<Order> {
        return repo.findByCustomerId(customerId)
    }

    suspend fun findAll(page: Int, size: Int): PagedResult<Order> {
        require(page >= 0) { "Page must be non-negative" }
        require(size in 1..100) { "Size must be between 1 and 100" }
        return repo.findAll(page, size)
    }

    suspend fun cancel(id: UUID, reason: String): Order {
        val order = repo.findById(id) ?: throw NotFoundException("Order", id)
        order.cancel(reason)
        val saved = repo.save(order)
        eventPublisher.publish(OrderCancelledEvent(saved.id!!, reason))
        return saved
    }

    suspend fun delete(id: UUID) {
        val order = repo.findById(id) ?: throw NotFoundException("Order", id)
        repo.delete(id)
    }
}

// domain/OrderValidator.kt
class OrderValidator {
    fun validate(request: CreateOrderRequest) {
        require(request.customerId.isNotBlank()) { "customerId must not be blank" }
        require(request.items.isNotEmpty()) { "At least one item required" }
        request.items.forEachIndexed { index, item ->
            require(item.quantity > 0) { "Item $index: quantity must be positive" }
            require(item.unitPrice >= 0.0) { "Item $index: unit price must be non-negative" }
        }
    }
}
```

### Step 3: Domain Model and Mapping
```kotlin
// domain/Order.kt
data class Order(
    val id: UUID? = null,
    val customerId: String,
    val status: OrderStatus = OrderStatus.PENDING,
    val items: List<OrderItem>,
    val totalAmount: Double,
    val couponCode: String? = null,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant? = null
) {
    companion object {
        fun create(customerId: String, items: List<OrderItem>, couponCode: String? = null): Order {
            val total = items.sumOf { it.quantity * it.unitPrice }
            return Order(
                customerId = customerId,
                items = items,
                totalAmount = total,
                couponCode = couponCode
            )
        }
    }

    fun cancel(reason: String): Order {
        require(status.canCancel()) { "Order in ${status.name} cannot be cancelled" }
        return copy(status = OrderStatus.CANCELLED, updatedAt = Instant.now())
    }
}

enum class OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED;

    fun canCancel() = this in listOf(PENDING, CONFIRMED)
}

data class OrderItem(
    val id: UUID? = null,
    val productId: String,
    val quantity: Int,
    val unitPrice: Double
)
```

### Step 4: DTO / Response Mapping
```kotlin
// application/CreateOrderRequest.kt
@Serializable
data class CreateOrderRequest(
    val customerId: String,
    val items: List<OrderItemDto>,
    val couponCode: String? = null
)

@Serializable
data class OrderItemDto(
    val productId: String,
    val quantity: Int,
    val unitPrice: Double
)

// application/OrderResponse.kt
@Serializable
data class OrderResponse(
    val id: String,
    val customerId: String,
    val status: String,
    val items: List<OrderItemResponse>,
    val totalAmount: Double,
    val createdAt: String
)

@Serializable
data class OrderItemResponse(
    val id: String,
    val productId: String,
    val quantity: Int,
    val unitPrice: Double
)

@Serializable
data class PagedResponse<T>(
    val items: List<T>,
    val total: Long,
    val page: Int,
    val size: Int
)

// Extension functions for mapping
fun Order.toResponse(): OrderResponse = OrderResponse(
    id = id?.toString() ?: "",
    customerId = customerId,
    status = status.name,
    items = items.map { it.toResponse() },
    totalAmount = totalAmount,
    createdAt = createdAt.toString()
)

fun OrderItem.toResponse(): OrderItemResponse = OrderItemResponse(
    id = id?.toString() ?: "",
    productId = productId,
    quantity = quantity,
    unitPrice = unitPrice
)

fun CreateOrderRequest.toDomain(): Order = Order.create(
    customerId = customerId,
    items = items.map { it.toDomain() },
    couponCode = couponCode
)

fun OrderItemDto.toDomain(): OrderItem = OrderItem(
    productId = productId,
    quantity = quantity,
    unitPrice = unitPrice
)
```

### Step 5: DI with Koin
```kotlin
// di/Modules.kt
import org.koin.dsl.module
import org.koin.core.module.dsl.singleOf
import org.koin.core.module.dsl.factoryOf

val repositoryModule = module {
    single<OrderRepository> { OrderRepositoryImpl(get()) }
    single<PaymentGateway> { PaymentGatewayImpl(get()) }
}

val serviceModule = module {
    single { OrderValidator() }
    factory { OrderService(get(), get(), get()) }
    factory { PaymentService(get()) }
}

val controllerModule = module {
    single { OrderController(get(), get()) }
    single { PaymentController(get()) }
}

val databaseModule = module {
    single { createDatabase(get()) }
}

val appModules = listOf(
    repositoryModule,
    serviceModule,
    controllerModule,
    databaseModule,
    serializationModule
)

// di/SerializationModule.kt
val serializationModule = module {
    single {
        Json {
            ignoreUnknownKeys = true
            isLenient = true
            encodeDefaults = true
        }
    }
}

// Application.kt (Ktor example)
fun Application.configureDI() {
    install(Koin) {
        modules(appModules)
    }
}

fun Application.module() {
    configureDI()
    configureSerialization()
    configureRouting()
}
```

### Step 6: Testing with MockK
```kotlin
// src/test/kotlin/.../OrderServiceTest.kt
import io.mockk.*
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.*
import java.util.UUID

class OrderServiceTest {
    private val repo = mockk<OrderRepository>()
    private val validator = mockk<OrderValidator>()
    private val eventPublisher = mockk<EventPublisher>()
    private lateinit var service: OrderService

    @BeforeEach
    fun setUp() {
        service = OrderService(repo, validator, eventPublisher)
    }

    @Test
    fun `create order succeeds`() = runTest {
        val req = CreateOrderRequest(
            customerId = "cust-1",
            items = listOf(OrderItemDto(productId = "prod-1", quantity = 2, unitPrice = 19.99))
        )
        val expectedOrder = Order.create("cust-1", listOf(OrderItem(productId = "prod-1", quantity = 2, unitPrice = 19.99)))

        every { validator.validate(req) } just Runs
        coEvery { repo.save(any()) } returns expectedOrder
        every { eventPublisher.publish(any<OrderCreatedEvent>()) } just Runs

        val result = service.create(req)

        assertNotNull(result)
        assertEquals(expectedOrder.customerId, result.customerId)
        coVerify { repo.save(any()) }
        verify { eventPublisher.publish(any<OrderCreatedEvent>()) }
    }

    @Test
    fun `find missing order throws NotFoundException`() = runTest {
        val id = UUID.randomUUID()
        coEvery { repo.findById(id) } returns null

        assertFailsWith<NotFoundException> {
            service.findById(id)
        }

        coVerify { repo.findById(id) }
    }

    @Test
    fun `cancel order succeeds`() = runTest {
        val id = UUID.randomUUID()
        val order = Order(id = id, customerId = "cust-1", items = emptyList(), totalAmount = 0.0)
        val cancelledOrder = order.copy(status = OrderStatus.CANCELLED)

        coEvery { repo.findById(id) } returns order
        coEvery { repo.save(any()) } returns cancelledOrder
        every { eventPublisher.publish(any<OrderCancelledEvent>()) } just Runs

        val result = service.cancel(id, "Customer request")

        assertEquals(OrderStatus.CANCELLED, result.status)
        coVerify { repo.findById(id) }
        coVerify { repo.save(any()) }
    }

    @Test
    fun `delete non-existent order throws`() = runTest {
        val id = UUID.randomUUID()
        coEvery { repo.findById(id) } returns null

        assertFailsWith<NotFoundException> {
            service.delete(id)
        }
    }
}
```

### Step 7: Integration Testing
```kotlin
// src/test/kotlin/.../OrderRepositoryTest.kt
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import org.junit.jupiter.api.*
import org.testcontainers.containers.PostgreSQLContainer

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OrderRepositoryTest {
    private lateinit var container: PostgreSQLContainer<Nothing>
    private lateinit var db: Database
    private lateinit var repo: OrderRepository

    @BeforeAll
    fun setup() {
        container = PostgreSQLContainer<Nothing>("postgres:15").apply {
            withDatabaseName("testdb")
            withUsername("test")
            withPassword("test")
            start()
        }
        db = createDatabase(container.jdbcUrl, container.username, container.password)
        repo = OrderRepositoryImpl(db)
    }

    @Test
    fun `save and find order`() = runTest {
        val order = Order.create("cust-1", listOf(OrderItem(productId = "prod-1", quantity = 2, unitPrice = 19.99)))
        val saved = repo.save(order)

        saved.id shouldNotBe null

        val found = repo.findById(saved.id!!)
        found shouldNotBe null
        found!!.customerId shouldBe "cust-1"
    }

    @AfterAll
    fun cleanup() {
        container.stop()
    }
}
```

## Architecture Decision Trees

### DI Framework Selection
```
Spring Boot project?
  +-- Yes -> Use Spring DI (built-in). No need for Koin/Kodein.
  +-- No  -> Need simple, Kotlin-native DI?
      +-- Yes -> Koin (DSL-based, no reflection, lightweight)
      +-- No  -> Kodein (more features, extensible)
```

### Repository Implementation
```
Complex query needs (specifications, criteria)?
  +-- Yes -> Spring Data JPA / Exposed DAO with complex query support
  +-- No  -> Simple SQL via Exposed DSL or raw SQL mapping
```

### Serialization
```
Need Kotlin multiplatform support?
  +-- Yes -> kotlinx.serialization (works on all platforms)
  +-- No  -> Need Jackson features (XML, YAML)?
      +-- Yes -> Jackson with kotlin-module
      +-- No  -> kotlinx.serialization (faster, idiomatic)
```

## Common Pitfalls

1. **GlobalScope.launch in services**: Creates memory leaks. Use structured concurrency with `coroutineScope` or `supervisorScope`.

2. **Serialization annotation on data class for ORM**: `@Serializable` from kotlinx.serialization conflicts with JPA annotations. Keep DTOs and entities separate.

3. **MockK every/coEvery confusion**: `every` for non-suspend functions, `coEvery` for suspend functions. Wrong choice leads to confusing errors.

4. **DI module scope misconfiguration**: Repositories should be `single`, services usually `factory` (if they have state) or `single` (if stateless).

5. **Not using `withContext` for blocking IO**: Database calls must use `Dispatchers.IO` to avoid blocking the main dispatcher.

6. **Lost exception in coroutine scope**: Exceptions in child coroutines within `coroutineScope` propagate. Use `supervisorScope` for independent child jobs.

7. **Testing with `runBlocking` in tests**: Use `runTest` from kotlinx-coroutines-test for proper time control and cleanup.

8. **Ignoring coroutine cancellation**: Long-running operations must check `isActive` or use `ensureActive()` to respect cancellation.

9. **Direct repository dependency in controllers**: Controllers should depend on service interfaces, never on repositories directly.

10. **Missing `@OptIn(ExperimentalCoroutinesApi::class)`**: Some coroutine test APIs are experimental. Add opt-in annotation to test files.

## Best Practices

1. **Repository abstracted behind interface** for testability. Implementation hidden from domain layer.

2. **Service classes with single responsibility** — one aggregate root per service.

3. **DTOs annotated with @Serializable** and mapped via extension functions.

4. **DI modules separated by layer** (infrastructure, service, controller).

5. **MockK preferred for unit tests** — inline mocking discouraged.

6. **Domain entities as immutable data classes** with copy() for state changes.

7. **Validation in dedicated validator classes**, not scattered across services.

8. **Explicit error types (sealed class hierarchy)** instead of generic exceptions.

9. **Co-routine dispatcher injection** in services for testability (Default, IO, Unconfined).

10. **Idempotency in update operations** — check if entity state allows the operation.

## Compared With

| Feature | Kotlin Exposed | Spring Data JPA | Room (Android) |
|---|---|---|---|
| DSL query | Yes | No (JPQL/Criteria) | No (SQL/DAO) |
| Type-safe | Yes | No | No |
| Coroutine support | Yes | Via WebFlux | Yes |
| Migration | Via library | Auto-ddl, Flyway | Auto |
| JPA compatibility | No | Yes | No |
| Learning curve | Low | High | Low |

## Performance

- kotlinx.serialization benchmarks 2-3x faster than Jackson for JSON serialization.
- Exposed DSL queries compile to SQL with minimal overhead vs raw JDBC.
- Coroutine overhead is negligible — use structured concurrency for thousands of concurrent operations.
- Connection pooling with HikariCP: 10-20 connections per service instance.
- Batch operations: Exposed `batchInsert()` for bulk inserts.
- Lazy loading: Avoid in coroutine contexts. Use explicit JOIN queries.

## Tooling

| Tool | Purpose |
|---|---|
| **Koin** | Dependency injection framework |
| **MockK** | Kotlin-native mocking library |
| **Exposed** | SQL DSL ORM |
| **kotlinx.serialization** | Binary-safe serialization |
| **Kotest** | Test framework with property-based testing |
| **Testcontainers** | Integration testing with real DBs |
| **Detekt** | Static code analysis |
| **ktlint** | Code formatting |
| **Gradle Kotlin DSL** | Build configuration |
| **Coroutines Test** | Coroutine testing utilities |

## Rules

- Repository interfaces in domain layer, implementations in infrastructure.
- Service classes single-responsibility — one aggregate root per service.
- DTOs annotated with @Serializable, mapped via extension functions.
- DI modules separated by layer (infrastructure, service, controller).
- MockK preferred for unit tests — inline mocking discouraged.
- runTest for coroutine tests, TestCoroutineDispatcher for time control.
- Domain entities are data classes — value equality.
- Validator classes contain all business rule checks.
- Controllers never access repositories directly.
- Coroutine dispatchers injected via DI for testability.
- Service methods return domain types, DTO mapping happens in controller.
- Exception types sealed class hierarchy with meaningful error codes.

## References
  - references/kotlin-coroutines-patterns.md — Kotlin Coroutines Patterns
  - references/kotlin-flow-reactive.md — Kotlin Flow Reactive Patterns
  - references/coroutines-guide.md — Coroutines Guide
  - references/kotlin-backend-patterns.md — Kotlin Backend Patterns
  - references/kotlin-deployment.md — Kotlin Deployment
  - references/kotlin-di-koin.md — Kotlin DI with Koin Reference
  - references/kotlin-testing-mockk.md — Kotlin Testing with MockK Reference
  - references/ktor-setup.md — Ktor Setup Guide

## Handoff
Hand off to `backend/kotlin/architecture/SKILL.md` for overall architecture guidance.
