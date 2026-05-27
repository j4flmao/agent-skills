# Kotlin DI with Koin Reference

## Module Organization

Koin modules are organized by architectural layer to maintain clear dependency boundaries.

```kotlin
// Core infrastructure modules
val databaseModule = module {
    single { DatabaseFactory.create() }
    single { TransactionManager(get()) }
}

val repositoryModule = module {
    single<OrderRepository> { PostgresOrderRepository(get()) }
    single<ProductRepository> { PostgresProductRepository(get()) }
    single<EventBus> { InMemoryEventBus() }
}

// Service layer modules
val serviceModule = module {
    factory { OrderService(get(), get(), get()) }
    factory { ProductService(get(), get()) }
    factory { PaymentService(get(), get()) }
}

// Controller/API modules
val apiModule = module {
    factory { OrderController(get()) }
    factory { ProductController(get()) }
}

// Aggregate all modules
val appModules = listOf(
    databaseModule,
    repositoryModule,
    serviceModule,
    apiModule,
    commonModule
)
```

## Starting Koin

```kotlin
fun main() {
    embeddedServer(Netty, port = 8080) {
        module {
            // Install Koin plugin
            install(Koin) {
                modules(appModules)
            }
        }
    }.start(wait = true)
}
```

### Ktor Plugin Configuration

```kotlin
fun Application.configureDI() {
    install(Koin) {
        slf4jLogger()
        modules(appModules)
        // Allow override for tests
        allowOverride(true)
        // Load properties
        properties(mapOf("server.port" to environment.config.property("ktor.deployment.port").getString()))
    }
}
```

## Scoping Rules

```kotlin
// Singleton — one instance per application lifecycle
single { DatabaseMigration(get()) }

// Factory — new instance per injection
factory { OrderService(get(), get(), get()) }

// Scoped — one instance per scope lifecycle
scoped { UserSession() }

// Named scopes
scope(named("request")) {
    scoped { RequestContext() }
    scoped { CorrelationId() }
}

// Creating scopes
fun ApplicationRequest.startScope() {
    val scope = getKoin().createScope("request-${id}", named("request"))
    scope.set(RequestContext(this))
}
```

## Constructor Injection

```kotlin
class OrderService(
    private val repo: OrderRepository,
    private val eventBus: EventBus,
    private val validator: OrderValidator
) {
    suspend fun createOrder(request: CreateOrderRequest): Order {
        validator.validate(request)
        val order = Order.fromRequest(request)
        val saved = repo.save(order)
        eventBus.publish(OrderCreated(saved))
        return saved
    }
}
```

## Named Bindings

```kotlin
val databaseModule = module {
    // Primary database
    single<Database>(named("primary")) {
        PostgresDatabase(primaryConfig)
    }
    
    // Reporting database
    single<Database>(named("reporting")) {
        PostgresDatabase(reportingConfig)
    }
}

// Usage
class ReportService(
    private val db: Database
) {
    private val primaryDb = getKoin().get<Database>(named("primary"))
    private val reportingDb = getKoin().get<Database>(named("reporting"))
}
```

## Module Injection

```kotlin
// For libraries/modules that need their own DI
class FeatureModule {
    fun install() = module {
        single { FeatureConfig() }
        factory { FeatureService(get()) }
    }
}

// In main application
val featureModule = FeatureModule()
val appModules = listOf(
    coreModule,
    featureModule.install()
)
```

## Test Override

Koin allows easy bean replacement in tests.

```kotlin
class OrderServiceTest {
    private val repo = mockk<OrderRepository>()
    private val eventBus = mockk<EventBus>()
    
    @BeforeTest
    fun setup() {
        startKoin {
            modules(module {
                single<OrderRepository> { repo }
                single<EventBus> { eventBus }
                factory { OrderService(get(), get(), mockk()) }
            })
        }
    }
    
    @Test
    fun `test create order`() = runTest {
        val service = getKoin().get<OrderService>()
        val request = CreateOrderRequest(...)
        
        coEvery { repo.save(any()) } returns Order(...)
        coEvery { eventBus.publish(any()) } just Runs
        
        service.createOrder(request)
        
        coVerify { repo.save(any()) }
    }
    
    @AfterTest
    fun cleanup() {
        stopKoin()
    }
}
```

## Lazy Injection

```kotlin
class LazyService {
    // Lazy injection — resolved on first access
    private val repo: OrderRepository by inject()
    private val eventBus: EventBus by inject()
    
    // Named dependency
    private val primaryDb: Database by inject(named("primary"))
    
    // Parameterized injection
    private val config: Config by inject { parametersOf("order-service") }
}
```

## Property Injection

```kotlin
val configModule = module {
    single {
        Config(
            serverPort = property("server.port", 8080),
            dbUrl = property("db.url", "jdbc:postgresql://localhost:5432/app"),
            features = property("features", emptyList())
        )
    }
}

// Loading properties from HOCON config
val configModule = module {
    single {
        val config = HoconApplicationConfig(ConfigFactory.load())
        AppConfig(
            port = config.propertyOrNull("server.port")?.getString()?.toInt() ?: 8080,
            host = config.propertyOrNull("server.host")?.getString() ?: "0.0.0.0"
        )
    }
}
```

## Key Points

- Modules organized by architectural layer (infrastructure → service → api)
- Koin plugin installs seamlessly in Ktor applications
- `single` creates application-scoped singletons, `factory` creates new instances
- `scoped` creates instances within named scope lifecycles
- Named bindings distinguish multiple implementations of same type
- Constructor injection is preferred over field injection
- Test modules override production dependencies easily
- Property injection reads configuration at wiring time
- Parameterized injection passes runtime values to factories
- Lazy injection via `by inject()` defers resolution until first use
