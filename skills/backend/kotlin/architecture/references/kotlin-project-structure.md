# Kotlin Project Structure Reference

## Modular Architecture

Kotlin backend projects follow a domain-driven package structure organized by feature.

```
src/
├── main/kotlin/com/project/
│   ├── Application.kt
│   ├── order/
│   │   ├── api/
│   │   │   ├── OrderController.kt
│   │   │   ├── OrderRequest.kt
│   │   │   └── OrderResponse.kt
│   │   ├── domain/
│   │   │   ├── Order.kt
│   │   │   ├── OrderStatus.kt
│   │   │   └── OrderRepository.kt
│   │   └── application/
│   │       ├── OrderService.kt
│   │       └── OrderValidator.kt
│   ├── product/
│   │   ├── api/
│   │   ├── domain/
│   │   └── application/
│   ├── common/
│   │   ├── error/
│   │   ├── util/
│   │   └── middleware/
│   ├── config/
│   │   ├── AppConfig.kt
│   │   ├── DatabaseConfig.kt
│   │   └── SecurityConfig.kt
│   └── di/
│       ├── CoreModule.kt
│       └── RepositoryModule.kt
├── main/resources/
│   ├── application.conf
│   └── logback.xml
├── test/kotlin/com/project/
│   ├── order/
│   │   ├── OrderControllerTest.kt
│   │   └── OrderServiceTest.kt
│   └── common/
└── build.gradle.kts
```

## Gradle Multi-Module Setup

```kotlin
// settings.gradle.kts
rootProject.name = "order-service"
include(":core", ":api", ":infrastructure", ":common")

// build.gradle.kts (root)
plugins {
    kotlin("jvm") version "1.9.22"
    kotlin("plugin.serialization") version "1.9.22"
}

subprojects {
    apply(plugin = "kotlin")
    apply(plugin = "org.jetbrains.kotlin.plugin.serialization")
    
    dependencies {
        implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
        implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
        testImplementation("org.jetbrains.kotlin:kotlin-test:1.9.22")
        testImplementation("io.mockk:mockk:1.13.9")
    }
}
```

### Module Dependencies

| Module | Depends On | Responsibility |
|---|---|---|
| `:core` | — | Domain entities, repository interfaces |
| `:api` | `:core` | Controllers, DTOs, routing |
| `:infrastructure` | `:core` | DB repos, HTTP clients, messaging |
| `:common` | — | Shared utilities, error types, extensions |

## Package Conventions

```kotlin
// Domain module — pure Kotlin, no framework deps
// order/domain/Order.kt
data class Order(
    val id: OrderId,
    val customerId: CustomerId,
    val items: List<OrderItem>,
    val status: OrderStatus,
    val total: Money
)

// order/domain/OrderRepository.kt
interface OrderRepository {
    suspend fun findById(id: OrderId): Order?
    suspend fun save(order: Order): Order
    suspend fun findByCustomer(customerId: CustomerId): List<Order>
}
```

### Application Layer

```kotlin
// order/application/OrderService.kt
class OrderService(
    private val repo: OrderRepository,
    private val eventBus: EventBus
) {
    suspend fun createOrder(request: CreateOrderRequest): Order {
        val order = Order(
            id = OrderId.generate(),
            customerId = request.customerId,
            items = request.items.map { it.toDomain() },
            status = OrderStatus.PENDING,
            total = calculateTotal(request.items)
        )
        val saved = repo.save(order)
        eventBus.publish(OrderCreated(saved))
        return saved
    }
}
```

### API Layer

```kotlin
// order/api/OrderController.kt
fun Route.orderRoutes() {
    route("/api/v1/orders") {
        post {
            val request = call.receive<CreateOrderRequest>()
            val order = orderService.createOrder(request)
            call.respond(HttpStatusCode.Created, order.toResponse())
        }
        get("/{id}") {
            val id = call.parameters["id"]?.let { OrderId(it) }
                ?: throw ValidationException("Missing id")
            val order = orderService.findById(id)
            call.respond(order.toResponse())
        }
        get {
            val customerId = call.request.queryParameters["customerId"]
                ?.let { CustomerId(it) }
            val orders = if (customerId != null) {
                orderService.findByCustomer(customerId)
            } else {
                orderService.listAll()
            }
            call.respond(orders.map { it.toResponse() })
        }
    }
}
```

## Configuration Management

```kotlin
// config/AppConfig.kt
data class AppConfig(
    val server: ServerConfig,
    val database: DatabaseConfig,
    val features: FeatureFlags
)

data class ServerConfig(val port: Int = 8080, val host: String = "0.0.0.0")
data class DatabaseConfig(val url: String, val poolSize: Int = 10)
data class FeatureFlags(val newCheckout: Boolean = false)
```

## Dependency Injection Modules

```kotlin
// di/CoreModule.kt
val coreModule = module {
    single { AppConfig.load() }
    single { DatabaseFactory.create(get()) }
}

// di/RepositoryModule.kt
val repositoryModule = module {
    single<OrderRepository> { PostgresOrderRepository(get()) }
    single<EventBus> { InMemoryEventBus() }
}
```

## Testing Structure

```kotlin
// order/OrderServiceTest.kt
class OrderServiceTest {
    private val repo = mockk<OrderRepository>()
    private val eventBus = mockk<EventBus>()
    private val service = OrderService(repo, eventBus)
    
    @Test
    fun `create order publishes event`() = runTest {
        val request = CreateOrderRequest(
            customerId = CustomerId("cust-1"),
            items = listOf(CreateOrderItem("SKU-1", 2, Money(29.99)))
        )
        coEvery { repo.save(any()) } answers { firstArg() }
        coEvery { eventBus.publish(any()) } just Runs
        
        service.createOrder(request)
        
        coVerify { eventBus.publish(match<OrderCreated> { 
            it.order.customerId == request.customerId
        }) }
    }
}
```

## Key Points

- Package by feature (domain → application → api), not by layer
- Domain module has zero framework dependencies
- Application layer orchestrates domain operations
- API layer handles serialization and HTTP concerns
- Gradle multi-module enables independent compilation
- Configuration loaded at edge, passed as typed objects
- DI modules separate wiring from application logic
- Test structure mirrors source structure
- Suspend functions propagate coroutine context
- Extension functions separate DTO mapping from domain
