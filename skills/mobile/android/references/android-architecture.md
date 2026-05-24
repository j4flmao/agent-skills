# Android Architecture — MVVM + Clean Architecture

## Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│                    UI Layer                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Composable  │  │  Activity/   │  │  ViewModel   │  │
│  │  Screens     │  │  Fragment    │  │  (StateFlow) │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
├────────────────────────────────────────────────────────┤
│                   Domain Layer                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  UseCases   │  │  Repository  │  │  Domain      │  │
│  │             │  │  Interfaces  │  │  Models      │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
├────────────────────────────────────────────────────────┤
│                   Data Layer                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Repository  │  │  Remote      │  │  Local       │  │
│  │  Impl        │  │  Data Source │  │  Data Source │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────┘
```

## Domain Layer

### Domain Models
```kotlin
// domain/model/ — Pure Kotlin, no framework dependencies
data class Order(
    val id: String,
    val customerName: String,
    val total: Money,
    val status: OrderStatus,
    val items: List<OrderItem>,
    val createdAt: Instant
)

data class Money(
    val amount: BigDecimal,
    val currency: Currency
)

enum class OrderStatus { PENDING, CONFIRMED, PREPARING, DELIVERED, CANCELLED }
```

### Repository Interfaces
```kotlin
// domain/repository/ — Interface only, no implementation details
interface OrderRepository {
    fun getOrders(): Flow<List<Order>>
    suspend fun getOrder(id: String): Result<Order>
    suspend fun createOrder(order: Order): Result<Order>
    suspend fun updateOrderStatus(id: String, status: OrderStatus): Result<Unit>
}

interface UserRepository {
    suspend fun getCurrentUser(): Result<User>
    fun observeAuthState(): Flow<AuthState>
}
```

### Use Cases
```kotlin
// domain/usecase/ — Single responsibility per use case
class GetOrdersUseCase(
    private val orderRepo: OrderRepository
) {
    operator fun invoke(): Flow<List<Order>> {
        return orderRepo.getOrders()
    }
}

class PlaceOrderUseCase(
    private val orderRepo: OrderRepository,
    private val userRepo: UserRepository,
    private val validationRules: OrderValidationRules
) {
    suspend operator fun invoke(order: Order): Result<Order> {
        // Business validation
        val validation = validationRules.validate(order)
        if (!validation.isValid) {
            return Result.failure(ValidationException(validation.errors))
        }

        // Business logic
        val user = userRepo.getCurrentUser().getOrThrow()
        val validatedOrder = order.copy(
            customerName = user.name,
            status = OrderStatus.PENDING
        )
        return orderRepo.createOrder(validatedOrder)
    }
}

// Use cases should be:
// 1. Thin — orchestrate, don't implement
// 2. Single purpose — one public method (invoke)
// 3. Framework-free — no Android imports
// 4. Testable — pure dependency injection
```

## Data Layer

### Data Sources
```kotlin
// data/remote/ — Network data source
interface OrderApiService {
    @GET("orders")
    suspend fun getOrders(): List<OrderResponse>

    @POST("orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): OrderResponse
}

// data/local/ — Local data source
@Dao
interface OrderDao {
    @Query("SELECT * FROM orders ORDER BY created_at DESC")
    fun getAllOrders(): Flow<List<OrderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrders(orders: List<OrderEntity>)

    @Query("DELETE FROM orders")
    suspend fun clearAll()
}
```

### Repository Implementation
```kotlin
// data/repository/ — Bridge between remote and local
class OrderRepositoryImpl(
    private val api: OrderApiService,
    private val dao: OrderDao,
    private val mapper: OrderMapper
) : OrderRepository {

    override fun getOrders(): Flow<List<Order>> {
        return dao.getAllOrders()
            .map { entities -> entities.map(mapper::toDomain) }
    }

    override suspend fun getOrder(id: String): Result<Order> = runCatching {
        // Try remote first, fallback to local
        val remote = api.getOrders().find { it.id == id }
        remote?.let { mapper.toDomain(it) }
            ?: throw OrderNotFoundException(id)
    }

    override suspend fun createOrder(order: Order): Result<Order> = runCatching {
        val request = mapper.toRequest(order)
        val response = api.createOrder(request)
        val entity = mapper.toEntity(response)
        dao.insertOrders(listOf(entity))
        mapper.toDomain(response)
    }

    override suspend fun updateOrderStatus(
        id: String, status: OrderStatus
    ): Result<Unit> = runCatching {
        api.updateOrderStatus(id, status.name)
        dao.updateStatus(id, status.name)
    }
}
```

### Data Mapping
```kotlin
// data/mapper/ — Maps between layers
class OrderMapper {
    // Response → Domain
    fun toDomain(response: OrderResponse): Order {
        return Order(
            id = response.id,
            customerName = response.customerName,
            total = Money(
                amount = response.total.toBigDecimal(),
                currency = Currency.getInstance("USD")
            ),
            status = OrderStatus.valueOf(response.status),
            items = response.items.map { itemResponse ->
                OrderItem(
                    productId = itemResponse.productId,
                    name = itemResponse.name,
                    quantity = itemResponse.quantity,
                    price = Money(
                        amount = itemResponse.price.toBigDecimal(),
                        currency = Currency.getInstance("USD")
                    )
                )
            },
            createdAt = Instant.parse(response.createdAt)
        )
    }

    // Domain → Entity
    fun toEntity(order: Order): OrderEntity {
        return OrderEntity(
            id = order.id,
            customerName = order.customerName,
            total = order.total.amount.toDouble(),
            currency = order.total.currency.currencyCode,
            status = order.status.name,
            createdAt = order.createdAt.toString()
        )
    }

    // Domain → Request
    fun toRequest(order: Order): CreateOrderRequest {
        return CreateOrderRequest(
            customerName = order.customerName,
            total = order.total.amount.toDouble(),
            items = order.items.map { item ->
                CreateOrderItemRequest(
                    productId = item.productId,
                    quantity = item.quantity,
                    price = item.price.amount.toDouble()
                )
            }
        )
    }
}
```

## Unidirectional Data Flow (UDF)

```kotlin
// UI State — single source of truth
data class OrderListUiState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = ""
)

// ViewModel — state holder
@HiltViewModel
class OrderListViewModel @Inject constructor(
    private val getOrders: GetOrdersUseCase,
    private val placeOrder: PlaceOrderUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderListUiState())
    val uiState: StateFlow<OrderListUiState> = _uiState.asStateFlow()

    init {
        loadOrders()
    }

    fun onAction(action: OrderListAction) {
        when (action) {
            is OrderListAction.Refresh -> loadOrders()
            is OrderListAction.Search -> updateSearch(action.query)
            is OrderListAction.PlaceOrder -> placeNewOrder(action.order)
        }
    }

    private fun loadOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                getOrders().collect { orders ->
                    _uiState.update {
                        it.copy(orders = orders, isLoading = false)
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message)
                }
            }
        }
    }

    private fun updateSearch(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    private fun placeNewOrder(order: Order) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            placeOrder(order)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message)
                    }
                }
        }
    }
}

// Actions — user intents
sealed interface OrderListAction {
    data object Refresh : OrderListAction
    data class Search(val query: String) : OrderListAction
    data class PlaceOrder(val order: Order) : OrderListAction
}
```

## State Hoisting

```kotlin
@Composable
fun OrderListScreen(
    uiState: OrderListUiState,
    onAction: (OrderListAction) -> Unit
) {
    // State is hoisted to ViewModel — screen is stateless
    // Screen only displays state and dispatches actions

    when {
        uiState.isLoading -> LoadingIndicator()
        uiState.error != null -> ErrorMessage(
            message = uiState.error,
            onRetry = { onAction(OrderListAction.Refresh) }
        )
        else -> OrderList(
            orders = uiState.orders,
            onRefresh = { onAction(OrderListAction.Refresh) },
            onOrderClick = { id -> /* navigate */ }
        )
    }
}

// Reusable composable — also stateless
@Composable
fun OrderList(
    orders: List<Order>,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    onOrderClick: (String) -> Unit = {}
) {
    LazyColumn(modifier = modifier) {
        items(orders, key = { it.id }) { order ->
            OrderCard(
                order = order,
                onClick = { onOrderClick(order.id) }
            )
        }
    }
}
```

## Dependency Injection Pattern

```kotlin
// di/ — Scoped modules
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
            .build()
    }
}

@Module
@InstallIn(ViewModelComponent::class)
object OrderModule {
    @Provides
    fun provideGetOrdersUseCase(repo: OrderRepository): GetOrdersUseCase {
        return GetOrdersUseCase(repo)
    }
}
```

## Testing Architecture

```kotlin
class PlaceOrderUseCaseTest {
    private val orderRepo = mockk<OrderRepository>()
    private val userRepo = mockk<UserRepository>()
    private val validator = mockk<OrderValidationRules>()
    private val useCase = PlaceOrderUseCase(orderRepo, userRepo, validator)

    @Test
    fun `places order successfully`() = runTest {
        val order = Order(...)
        val user = User(name = "Test")

        every { validator.validate(any()) } returns ValidationResult.valid()
        coEvery { userRepo.getCurrentUser() } returns Result.success(user)
        coEvery { orderRepo.createOrder(any()) } returns Result.success(order)

        val result = useCase(order)

        assertTrue(result.isSuccess)
        coVerify { orderRepo.createOrder(match {
            it.customerName == "Test" && it.status == OrderStatus.PENDING
        }) }
    }

    @Test
    fun `fails on validation error`() = runTest {
        val order = Order(...)
        every { validator.validate(any()) } returns
            ValidationResult.invalid(listOf("Invalid total"))

        val result = useCase(order)

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ValidationException)
    }
}
```
