# Kotlin Backend Testing Strategies

Test pyramid, tools, and patterns for Kotlin services: unit tests for domain logic, coroutine tests, HTTP tests with Ktor's test host or Spring slices, and integration tests with Testcontainers.

## Tooling

| Purpose | Library |
|---------|---------|
| Test runner | JUnit 5 (Jupiter) or Kotest |
| Assertions | Kotest assertions, AssertJ, or `kotlin.test` |
| Mocking | MockK (`coEvery`/`coVerify` for suspend functions) |
| Coroutines | `kotlinx-coroutines-test` (`runTest`, `StandardTestDispatcher`) |
| Flows | Turbine |
| HTTP (Ktor) | `ktor-server-test-host` (`testApplication`) |
| HTTP (Spring) | `@WebFluxTest` / `@WebMvcTest`, `WebTestClient`, MockMvc Kotlin DSL |
| Real dependencies | Testcontainers (PostgreSQL, Kafka, Redis) |
| Property-based | Kotest property testing |
| Architecture | Konsist, ArchUnit |

## Pyramid

1. **Unit** (most): domain and use cases with fakes; milliseconds each.
2. **Slice/HTTP**: routing, serialization, validation, error mapping.
3. **Integration**: repositories against a real database; message consumers against a real broker.
4. **End-to-end** (few): deployed service, smoke paths only.

## Unit Tests with Fakes

Prefer hand-written fakes for ports over mocks; they keep tests readable and survive refactoring.

```kotlin
class InMemoryOrderRepository : OrderRepository {
    private val data = mutableMapOf<OrderId, Order>()
    override suspend fun find(id: OrderId) = data[id]
    override suspend fun save(order: Order) = order.also { data[it.id] = it }
}

class PayOrderTest {
    private val orders = InMemoryOrderRepository()
    private val payments = mockk<PaymentGateway>()
    private val payOrder = PayOrder(orders, payments, TransactionRunner.noop())

    @Test
    fun `marks order paid when charge succeeds`() = runTest {
        // Arrange
        orders.save(Order(OrderId(1), customerId = 7, totalCents = 500, status = Order.Status.PENDING))
        coEvery { payments.charge(7, 500, "order-1") } returns ChargeResult.Success("ch_1")

        // Act
        val result = payOrder(OrderId(1))

        // Assert
        assertEquals(Order.Status.PAID, result.status)
        coVerify(exactly = 1) { payments.charge(any(), any(), any()) }
    }

    @Test
    fun `throws when order missing`() = runTest {
        assertFailsWith<OrderNotFound> { payOrder(OrderId(99)) }
    }
}
```

## Coroutine Testing

- `runTest` uses virtual time: `delay` skips instantly, so timeouts and retries test fast.
- Inject dispatchers (`CoroutineDispatcher` constructor parameter) rather than hard-coding `Dispatchers.IO`, then pass `StandardTestDispatcher(testScheduler)` in tests.
- Use `advanceUntilIdle()` / `advanceTimeBy()` to drive scheduled work.

```kotlin
@Test
fun `retries three times with backoff`() = runTest {
    var calls = 0
    val result = retrying(times = 3, initialDelayMs = 100) {
        calls++
        if (calls < 3) error("transient") else "ok"
    }
    assertEquals("ok", result)
    assertEquals(3, calls)
    assertEquals(300, currentTime)   // 100 + 200 virtual ms with doubling backoff
}
```

### Flows with Turbine

```kotlin
@Test
fun `emits updated flags`() = runTest {
    val source = MutableSharedFlow<Map<String, Boolean>>()
    val flags = FeatureFlags(backgroundScope, FakeFlagSource(source))
    flags.flags.test {
        assertEquals(emptyMap(), awaitItem())
        source.emit(mapOf("beta" to true))
        assertEquals(mapOf("beta" to true), awaitItem())
    }
}
```

`backgroundScope` (inside `runTest`) is cancelled automatically at the end, ideal for `stateIn` collectors.

## Ktor HTTP Tests

```kotlin
class OrderRoutesTest {
    @Test
    fun `returns 404 problem for unknown order`() = testApplication {
        application { module(testDependencies()) }
        val client = createClient { install(ContentNegotiation) { json() } }

        val response = client.post("/orders/99/pay")

        assertEquals(HttpStatusCode.NotFound, response.status)
        assertEquals("order_not_found", response.body<Problem>().type)
    }
}
```

Make `Application.module` accept dependencies (or use Koin test modules) so tests can swap adapters.

## Spring Slice Tests

```kotlin
@WebFluxTest(OrderController::class)
class OrderControllerTest(@Autowired val client: WebTestClient) {
    @MockkBean lateinit var payOrder: PayOrder    // springmockk

    @Test
    fun `pays order`() {
        coEvery { payOrder(OrderId(1)) } returns sampleOrder()
        client.post().uri("/orders/1/pay").exchange().expectStatus().isOk
    }
}
```

## Integration Tests with Testcontainers

```kotlin
@Testcontainers
class OrderRepositoryIT {
    companion object {
        @Container @JvmStatic
        val postgres = PostgreSQLContainer("postgres:17-alpine")
    }

    @Test
    fun `round-trips an order`() = runTest {
        val repo = ExposedOrderRepository(connect(postgres.jdbcUrl, postgres.username, postgres.password))
        val saved = repo.save(newOrder())
        assertEquals(saved, repo.find(saved.id))
    }
}
```

- Run migrations (Flyway) in test setup so schema matches production.
- Reuse one container per test class or JVM; isolate tests with transactions rolled back or truncation.
- Spring Boot: `@ServiceConnection` on the container bean wires connection properties automatically.

## Contract and Property Tests

- Consumer-driven contracts (Pact, Spring Cloud Contract) for service-to-service APIs.
- Property-based tests for parsers, money arithmetic, and state machines:

```kotlin
class MoneyProps : StringSpec({
    "adding zero is identity" {
        checkAll(Arb.long(-1_000_000L..1_000_000L)) { cents ->
            Money(cents) + Money.ZERO shouldBe Money(cents)
        }
    }
})
```

## Pitfalls

- `runBlocking` in tests: real delays, slow suites; use `runTest`.
- Mocking data classes or the system under test; mock only boundaries.
- `every` instead of `coEvery` for suspend functions (MockK fails at runtime).
- H2 instead of the real database: dialect differences hide bugs.
- Tests sharing mutable fixtures across classes, causing order dependence.

## Checklist

- [ ] Domain and use cases covered by fast unit tests (AAA structure)
- [ ] Dispatchers injected; coroutine tests use `runTest`
- [ ] HTTP error mapping and validation covered by route/slice tests
- [ ] Repositories tested against real DB via Testcontainers
- [ ] Edge cases: empty input, not found, conflicts, timeouts
- [ ] Contract tests for external consumers
