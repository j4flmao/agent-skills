# Kotlin Testing Guide

## Test Setup

```kotlin
// build.gradle.kts
dependencies {
    testImplementation("io.kotest:kotest-runner-junit5:5.9.0")
    testImplementation("io.kotest:kotest-assertions-core:5.9.0")
    testImplementation("io.mockk:mockk:1.13.10")
}
```

## Kotest — Behavior Spec

```kotlin
import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk

class OrderServiceTest : BehaviorSpec({
    val repo = mockk<OrderRepository>()
    val service = OrderService(repo)

    Given("a valid create order request") {
        val request = CreateOrderRequest("cust-1", listOf(OrderItemDto("SKU-1", 2, 50.0)))

        When("creating the order") {
            every { repo.save(any()) } returns Order(id = "ord-1", customerId = "cust-1")

            Then("should return created order") {
                val result = service.create(request)
                result.id shouldBe "ord-1"
                result.customerId shouldBe "cust-1"
            }
        }
    }

    Given("an order that does not exist") {
        val orderId = "nonexistent"

        When("finding the order") {
            every { repo.findById(orderId) } returns null

            Then("should throw NotFound") {
                shouldThrow<AppException.NotFound> {
                    service.findById(orderId)
                }
            }
        }
    }
})
```

## Coroutine Testing

```kotlin
import kotlinx.coroutines.test.*

class OrderServiceCoroutineTest {
    private val repo = mockk<OrderRepository>()
    private val service = OrderService(repo)

    @Test
    fun `should handle concurrent creates`() = runTest {
        val requests = listOf(
            CreateOrderRequest("c1", listOf(OrderItemDto("A", 1, 10.0))),
            CreateOrderRequest("c2", listOf(OrderItemDto("B", 2, 20.0))),
        )

        coEvery { repo.save(any()) } returns Order(id = "ord-1", customerId = "c1")

        val results = requests.map { request ->
            async { service.create(request) }
        }

        results.awaitAll().size shouldBe 2
    }

    @Test
    fun `timeout test`() = runTest(timeout = 5.seconds) {
        coEvery { repo.findById(any()) } coAnswers {
            delay(100) // simulated delay
            Order(id = "ord-1", customerId = "c1")
        }

        val result = service.findById("ord-1")
        result.id shouldBe "ord-1"
    }
}
```

## Fluent Assertions

```kotlin
// Kotest matchers
"hello" shouldHaveLength 5
listOf(1, 2, 3) shouldContain 2
result shouldBeInstanceOf<Order>()
result shouldNotBe null

// Custom assertions
fun Order.shouldBeValid() {
    this.id shouldNotBe null
    this.customerId shouldNotBe blank
    this.items shouldNotBe empty()
}
```

## Test Controllers (Ktor)

```kotlin
fun Application.testModule() {
    install(ContentNegotiation) { json() }
    routing { orderRoutes() }
}

class OrderControllerTest {
    @Test
    fun `test create order endpoint`() = testApplication {
        application { testModule() }

        val response = client.post("/api/v1/orders") {
            contentType(ContentType.Application.Json)
            setBody("""{"customerId": "cust-1", "items": []}""")
        }

        response.status shouldBe HttpStatusCode.Created
    }
}
```

## TestContainers

```kotlin
class PostgresRepositoryTest : StringSpec({
    val postgres = PostgreSQLContainer("postgres:16").apply { start() }
    val db = Database.connect(postgres.jdbcUrl, postgres.username, postgres.password)

    "should save and retrieve order" {
        val repo = OrderRepositoryImpl(db)
        val order = Order.create("cust-1")
        repo.save(order)
        val found = repo.findById(order.id)
        found shouldNotBe null
    }

    afterSpec {
        postgres.stop()
    }
})
```

## Best Practices

| Practice | Why |
|----------|-----|
| runTest for coroutines | Controlled virtual time |
| Kotest BehaviorSpec | Readable GWT structure |
| coEvery / coVerify | Mock suspend functions |
| TestContainers | Real DB integration |
| Separate test modules | Isolate integration tests |
