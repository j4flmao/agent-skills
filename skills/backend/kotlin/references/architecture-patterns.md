# Kotlin Backend Architecture Patterns

Architecture choices for Kotlin services built on Ktor, Spring Boot (MVC or WebFlux with coroutines), or http4k. Focus: layering, dependency direction, coroutine-aware boundaries, and when to pick each style.

## Choosing a Style

| Style | Use when | Avoid when |
|-------|----------|------------|
| Layered (routes → service → repository) | CRUD services, small teams | Domain logic is complex and leaks into services |
| Hexagonal (ports & adapters) | Rich domain, many integrations, high test needs | Prototype or thin proxy service |
| Vertical slices (feature packages) | Many independent features, frequent change | Heavy shared domain model across features |
| Modular monolith (Gradle modules per bounded context) | Clear contexts, one deployable | Teams need independent release cadence |

Start layered or slice-based; move to hexagonal when the domain needs isolation from frameworks.

## Hexagonal Layout

```
service/
├── domain/          # pure Kotlin: entities, value objects, domain errors, ports
├── application/     # use cases orchestrating ports, transactions
├── adapters/
│   ├── http/        # Ktor routes / Spring controllers, DTOs, mapping
│   ├── persistence/ # Exposed / jOOQ / Spring Data repositories implementing ports
│   └── messaging/   # Kafka producers/consumers
└── bootstrap/       # main(), DI wiring, configuration
```

Rule: `domain` depends on nothing framework-specific. Enforce with Gradle modules (`implementation(project(":domain"))` only from outer modules) or Konsist/ArchUnit tests.

## Ports as Suspend Interfaces

```kotlin
// domain
@JvmInline value class OrderId(val value: Long)

data class Order(val id: OrderId, val customerId: Long, val totalCents: Long, val status: Status) {
    enum class Status { PENDING, PAID, CANCELLED }

    fun pay(): Order {
        check(status == Status.PENDING) { "Order ${id.value} is $status, cannot pay" }
        return copy(status = Status.PAID)
    }
}

interface OrderRepository {
    suspend fun find(id: OrderId): Order?
    suspend fun save(order: Order): Order
}

interface PaymentGateway {
    suspend fun charge(customerId: Long, amountCents: Long, idempotencyKey: String): ChargeResult
}
```

```kotlin
// application
class PayOrder(
    private val orders: OrderRepository,
    private val payments: PaymentGateway,
    private val tx: TransactionRunner,
) {
    suspend operator fun invoke(id: OrderId): Order {
        val order = orders.find(id) ?: throw OrderNotFound(id)
        val result = payments.charge(order.customerId, order.totalCents, "order-${id.value}")
        if (result !is ChargeResult.Success) throw PaymentDeclined(id, result.toString())
        return tx { orders.save(order.pay()) }
    }
}
```

Suspend ports keep the domain free of `Mono`/`CompletableFuture` and let adapters choose blocking (wrapped in `Dispatchers.IO`) or non-blocking drivers.

## Ktor Composition Root

```kotlin
fun main() {
    embeddedServer(Netty, port = 8080, module = Application::module).start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) { json() }
    val deps = Dependencies(environment.config)   // manual DI or Koin
    configureErrors()
    routing {
        orderRoutes(deps.payOrder, deps.orderQueries)
        get("/healthz") { call.respondText("ok") }
    }
}
```

Keep routes thin: parse, validate, call a use case, map to DTO. No repository calls in routes.

## Spring Boot with Coroutines

```kotlin
@RestController
@RequestMapping("/orders")
class OrderController(private val payOrder: PayOrder) {
    @PostMapping("/{id}/pay")
    suspend fun pay(@PathVariable id: Long): OrderDto = payOrder(OrderId(id)).toDto()
}
```

- Suspend controller functions are supported on WebFlux and Spring MVC; WebFlux avoids blocking a request thread per call.
- Use the `kotlin("plugin.spring")` compiler plugin so `@Component` classes are open; use `kotlin("plugin.jpa")` for no-arg JPA entities.
- With JPA, keep entities in the adapter layer and map to domain data classes; JPA needs mutable, open classes that fit poorly in a pure domain.

## CQRS-lite

Separate write use cases (load aggregate → mutate → save) from read queries that project directly to DTOs with SQL. This removes the urge to load full aggregates for list endpoints and avoids N+1 queries.

```kotlin
interface OrderQueries {
    suspend fun listForCustomer(customerId: Long, limit: Int, afterId: Long?): List<OrderSummaryDto>
}
```

## Events Between Modules

- In-process: publish domain events after commit (`ApplicationEventPublisher` + `@TransactionalEventListener` in Spring, or a `SharedFlow` in Ktor for non-critical notifications).
- Cross-service: transactional outbox table written in the same transaction, relayed to Kafka by a poller or Debezium. Never publish to Kafka inside the DB transaction and hope both succeed.

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| Domain classes annotated with `@Entity`/`@Serializable` | Separate persistence and transport models; map at the edge |
| `GlobalScope.launch` for background work | Use an application-owned `CoroutineScope` with `SupervisorJob`, cancelled on shutdown |
| Blocking JDBC on Netty event loop | Wrap in `withContext(Dispatchers.IO)` or use R2DBC / Exposed suspend transactions |
| One giant `Service` per entity | Use-case classes with one public operation each |
| Cyclic module deps | Extract shared kernel module with only value types |

## Checklist

- [ ] Dependency rule enforced by Gradle modules or architecture tests
- [ ] Ports are `suspend` interfaces in the domain/application layer
- [ ] Routes/controllers contain no business rules
- [ ] Reads use projections, writes use aggregates
- [ ] Cross-service events use an outbox
- [ ] Application-owned coroutine scope cancelled on shutdown
