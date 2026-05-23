# Kotlin Backend Patterns

## Repository Pattern
```kotlin
interface OrderRepository {
  suspend fun findById(id: UUID): Order?
  suspend fun findAll(page: Int, size: Int): List<Order>
  suspend fun save(order: Order): Order
  suspend fun update(order: Order): Order
  suspend fun deleteById(id: UUID)
}

class OrderRepositoryImpl(
  private val db: Database,
  private val serializer: Json
) : OrderRepository {
  override suspend fun findById(id: UUID): Order? = db.withSession {
    OrderTable.select { OrderTable.id eq id }
      .map { it.toOrder() }
      .singleOrNull()
  }
}
```

## Service Layer
```kotlin
class OrderService(
  private val repository: OrderRepository,
  private val validator: OrderValidator,
  private val eventBus: EventBus
) {
  suspend fun create(request: CreateOrderRequest): OrderResponse {
    validator.validate(request)
    val order = request.toDomain()
    val saved = repository.save(order)
    eventBus.publish(OrderCreated(saved.id, saved.customerId))
    return saved.toResponse()
  }
}
```

## DTO Mapping with Extension Functions
```kotlin
@Serializable
data class OrderResponse(
  val id: String, val customerId: String,
  val status: String, val total: Double, val createdAt: String
)

fun Order.toResponse() = OrderResponse(
  id = id.toString(), customerId = customerId,
  status = status.name, total = totalAmount,
  createdAt = createdAt.toString()
)
```

## Koin DI Setup
```kotlin
val appModule = module {
  single<OrderRepository> { OrderRepositoryImpl(get(), get()) }
  factory { OrderService(get(), get(), get()) }
  factory { OrderController(get()) }
  single { HttpClient(CIO) { install(ContentNegotiation) { json() } } }
}

fun Application.module() {
  startKoin {
    modules(appModule, databaseModule)
  }
  routing { /* ... */ }
}
```

## Testing Patterns
```kotlin
class OrderServiceTest {
  private val repo = mockk<OrderRepository>()
  private val validator = mockk<OrderValidator>()
  private val eventBus = mockk<EventBus>(relaxed = true)
  private val service = OrderService(repo, validator, eventBus)

  @Test
  fun `create emits event`() = runTest {
    every { validator.validate(any()) } just Runs
    every { repo.save(any()) } returns order

    service.create(request)

    coVerify { eventBus.publish(any<OrderCreated>()) }
  }
}
```

## Result Type Pattern
```kotlin
sealed class Result<out T> {
  data class Success<T>(val data: T) : Result<T>()
  data class Error(val code: String, val message: String) : Result<Nothing>()
}

suspend fun <T> Result<T>.unwrap(): T = when (this) {
  is Result.Success -> data
  is Result.Error -> throw AppException.BadRequest(code, message)
}
```

## Extension Patterns
```kotlin
suspend fun <T : Any> Database.withSession(block: suspend Transaction.() -> T): T =
  this.transaction { block() }

fun UUID.toResponseString(): String = toString().substring(0, 8)
```

## Configuration Pattern
```kotlin
object AppConfig {
  val dbUrl: String by lazy { System.getenv("DB_URL") ?: "jdbc:h2:mem:test" }
  val jwtSecret: String by lazy { System.getenv("JWT_SECRET") ?: error("JWT_SECRET required") }
  val port: Int by lazy { (System.getenv("PORT") ?: "8080").toInt() }
}
```
