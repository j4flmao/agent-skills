# KMM Networking — Ktor, SQLDelight, Serialization

## Ktor Client Configuration

### Engine-Specific Setup
```kotlin
// commonMain — engine-agnostic HttpClient
val httpClient = HttpClient {
    // Content negotiation
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            isLenient = true
            prettyPrint = false
            encodeDefaults = false
            coerceInputValues = true
        })
    }

    // Logging
    install(Logging) {
        level = LogLevel.ALL
        logger = Logger.DEFAULT
    }

    // Timeouts
    install(HttpTimeout) {
        requestTimeoutMillis = 30_000
        connectTimeoutMillis = 10_000
        socketTimeoutMillis = 30_000
    }

    // Default headers
    install(DefaultRequest) {
        url("https://api.example.com/v2/")
        contentType(ContentType.Application.Json)
        accept(ContentType.Application.Json)
    }

    // Response validation
    expectSuccess = true

    // User agent
    install(UserAgent) {
        agent = "MyApp/1.0 (KMP)"
    }
}

// androidMain — OkHttp engine
private val androidHttpClient = HttpClient(OkHttp) {
    engine {
        config {
            retryOnConnectionFailure(true)
            connectTimeout(30, TimeUnit.SECONDS)
            readTimeout(30, TimeUnit.SECONDS)
            addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
        }
    }
}

// iosMain — Darwin engine
private val iosHttpClient = HttpClient(Darwin) {
    engine {
        configureRequest { request ->
            request.setAllowsCellularAccess(true)
            request.setAllowsExpensiveNetworkAccess(false)
        }
        configureSession { session ->
            session.connectionProxyDictionary = [:]
            session.timeoutIntervalForRequest = 30.0
            session.timeoutIntervalForResource = 60.0
        }
    }
}
```

### API Service Pattern
```kotlin
// commonMain — api service with typed responses
class OrderApiService(private val client: HttpClient) {

    suspend fun getOrders(page: Int, limit: Int): List<OrderResponse> {
        return client.get("orders") {
            parameter("page", page)
            parameter("limit", limit)
            parameter("sort", "created_at:desc")
            header("Cache-Control", "no-cache")
        }.body()
    }

    suspend fun getOrder(id: String): OrderResponse {
        return client.get("orders/$id").body()
    }

    suspend fun createOrder(request: CreateOrderRequest): OrderResponse {
        return client.post("orders") {
            setBody(request)
        }.body()
    }

    suspend fun updateOrder(id: String, request: UpdateOrderRequest): OrderResponse {
        return client.put("orders/$id") {
            setBody(request)
        }.body()
    }

    suspend fun deleteOrder(id: String) {
        client.delete("orders/$id")
    }

    // Multipart upload
    suspend fun uploadReceipt(orderId: String, image: ByteArray): ReceiptResponse {
        return client.post("orders/$orderId/receipt") {
            setBody(MultiPartFormDataContent(
                formData {
                    append("receipt", image, Headers.build {
                        append(HttpHeaders.ContentType, "image/jpeg")
                        append(HttpHeaders.ContentDisposition, "filename=receipt.jpg")
                    })
                }
            ))
        }.body()
    }
}

// Response models
@Serializable
data class OrderResponse(
    val id: String,
    @SerialName("customer_name") val customerName: String,
    val total: Double,
    val status: String,
    @SerialName("created_at") val createdAt: String,
    val items: List<OrderItemResponse> = emptyList()
)

@Serializable
data class OrderItemResponse(
    @SerialName("product_id") val productId: String,
    val name: String,
    val quantity: Int,
    val price: Double
)
```

### Error Handling
```kotlin
// commonMain — sealed class for API errors
sealed class ApiError : Exception() {
    data class NetworkError(val cause: Throwable) : ApiError() {
        override val message: String = "Network error: ${cause.localizedMessage}"
    }
    data class ServerError(val statusCode: Int, val body: String) : ApiError() {
        override val message: String = "Server error $statusCode: $body"
    }
    data class SerializationError(val cause: Throwable) : ApiError() {
        override val message: String = "Serialization error: ${cause.localizedMessage}"
    }
    data object Unauthorized : ApiError() {
        override val message: String = "Unauthorized"
    }
    data object NotFound : ApiError() {
        override val message: String = "Resource not found"
    }
}

// Safe API call wrapper
suspend inline fun <reified T> safeApiCall(
    call: () -> T
): Result<T> {
    return try {
        Result.success(call())
    } catch (e: IOException) {
        Result.failure(ApiError.NetworkError(e))
    } catch (e: ClientRequestException) {
        when (e.response.status) {
            HttpStatusCode.Unauthorized -> Result.failure(ApiError.Unauthorized)
            HttpStatusCode.NotFound -> Result.failure(ApiError.NotFound)
            else -> Result.failure(
                ApiError.ServerError(
                    e.response.status.value,
                    e.response.bodyAsText()
                )
            )
        }
    } catch (e: SerializationException) {
        Result.failure(ApiError.SerializationError(e))
    } catch (e: Exception) {
        Result.failure(ApiError.NetworkError(e))
    }
}
```

## kotlinx.serialization

### Custom Serializers
```kotlin
// commonMain — custom serializer for LocalDate
object LocalDateSerializer : KSerializer<LocalDate> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("LocalDate", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: LocalDate) {
        encoder.encodeString(value.toString()) // ISO-8601
    }

    override fun deserialize(decoder: Decoder): LocalDate {
        return LocalDate.parse(decoder.decodeString())
    }
}

// Usage
@Serializable
data class Event(
    val id: String,
    @Serializable(with = LocalDateSerializer::class)
    val date: LocalDate,
    val title: String
)

// Polymorphic serialization for sealed classes
@Serializable
sealed class Notification {
    @Serializable
    @SerialName("push")
    data class Push(val title: String, val body: String) : Notification()

    @Serializable
    @SerialName("email")
    data class Email(val subject: String, val to: String) : Notification()

    @Serializable
    @SerialName("sms")
    data class SMS(val phone: String, val message: String) : Notification()
}

// Json config for polymorphic
val notificationJson = Json {
    serializersModule = SerializersModule {
        polymorphic(Notification::class) {
            subclass(Notification.Push::class)
            subclass(Notification.Email::class)
            subclass(Notification.SMS::class)
        }
    }
}
```

## SQLDelight

### Schema Definition
```sql
-- commonMain/sqldelight/com/example/app/Order.sq

CREATE TABLE OrderEntity (
    id TEXT NOT NULL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE OrderItemEntity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES OrderEntity(id) ON DELETE CASCADE
);

-- Queries
getAll:
SELECT * FROM OrderEntity ORDER BY created_at DESC;

getById:
SELECT * FROM OrderEntity WHERE id = ?;

getByStatus:
SELECT * FROM OrderEntity WHERE status = ?;

getUnsynced:
SELECT * FROM OrderEntity WHERE synced = 0;

insertOrReplace:
INSERT OR REPLACE INTO OrderEntity(id, customer_name, total, status, created_at, synced)
VALUES (?, ?, ?, ?, ?, ?);

markSynced:
UPDATE OrderEntity SET synced = 1 WHERE id = ?;

deleteById:
DELETE FROM OrderEntity WHERE id = ?;

deleteAll:
DELETE FROM OrderEntity;

countByStatus:
SELECT COUNT(*) FROM OrderEntity WHERE status = ?;
```

### Driver Configuration
```kotlin
// commonMain — expect driver factory
expect class DatabaseDriverFactory {
    fun createDriver(): SqlDriver
}

// androidMain — Android Sqlite driver
actual class DatabaseDriverFactory(private val context: Context) {
    actual fun createDriver(): SqlDriver {
        return AndroidSqliteDriver(
            AppDatabase.Schema,
            context,
            "app.db"
        )
    }
}

// iosMain — NativeSqlite driver
actual class DatabaseDriverFactory {
    actual fun createDriver(): SqlDriver {
        return NativeSqliteDriver(
            AppDatabase.Schema,
            "app.db"
        )
    }
}
```

### Repository with Local Cache
```kotlin
// commonMain — repository pattern
class OrderRepository(
    private val api: OrderApiService,
    private val db: AppDatabase,
    private val driverFactory: DatabaseDriverFactory
) {
    private val queries = db.appDatabaseQueries

    fun observeOrders(): Flow<List<Order>> {
        return queries.getAll()
            .asFlow()
            .mapToList()
            .map { entities ->
                entities.map { it.toDomain() }
            }
    }

    suspend fun refreshOrders() {
        val remote = api.getOrders(page = 1, limit = 50)
        db.transaction {
            queries.deleteAll()
            remote.forEach { response ->
                queries.insertOrReplace(
                    id = response.id,
                    customer_name = response.customerName,
                    total = response.total,
                    status = response.status,
                    created_at = response.createdAt,
                    synced = 1L
                )
            }
        }
    }

    suspend fun createOrder(order: Order): Result<Order> {
        return safeApiCall {
            val response = api.createOrder(order.toRequest())
            val entity = response.toEntity()
            queries.insertOrReplace(entity)
            response.toDomain()
        }
    }
}
```

## Testing Networking

### MockEngine
```kotlin
// commonTest — Ktor MockEngine
fun createMockClient(
    baseUrl: String = "https://api.example.com/",
    block: MockRequestHandlerBuilder.() -> Unit
): HttpClient {
    return HttpClient(MockEngine) {
        engine {
            addHandler { request ->
                when {
                    request.url.encodedPath == "/orders" &&
                    request.method == HttpMethod.Get -> {
                        respond(
                            content = ByteReadChannel(
                                """[{"id":"1","customer_name":"Test","total":100.0,"status":"PENDING","created_at":"2024-01-01"}]"""
                            ),
                            status = HttpStatusCode.OK,
                            headers = headersOf(
                                HttpHeaders.ContentType, "application/json"
                            )
                        )
                    }
                    request.url.encodedPathMatches("/orders/.*") &&
                    request.method == HttpMethod.Get -> {
                        val id = request.url.encodedPath.split("/").last()
                        respond(
                            content = ByteReadChannel(
                                """{"id":"$id","customer_name":"Test","total":100.0,"status":"PENDING","created_at":"2024-01-01"}"""
                            ),
                            status = HttpStatusCode.OK,
                            headers = headersOf(
                                HttpHeaders.ContentType, "application/json"
                            )
                        )
                    }
                    else -> respond(
                        content = ByteReadChannel("""{"error":"Not found"}"""),
                        status = HttpStatusCode.NotFound
                    )
                }
            }
        }
    }
}

// Test example
class OrderApiServiceTest {
    @Test
    fun testGetOrders() = runTest {
        val client = createMockClient()
        val service = OrderApiService(client)

        val result = safeApiCall { service.getOrders(1, 10) }

        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrThrow().size)
        assertEquals("1", result.getOrThrow().first().id)
    }

    @Test
    fun testNetworkError() = runTest {
        val client = HttpClient(MockEngine) {
            engine {
                addHandler { throw IOException("Connection refused") }
            }
        }
        val service = OrderApiService(client)

        val result = safeApiCall { service.getOrders(1, 10) }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ApiError.NetworkError)
    }
}
```

## Build Dependencies

```kotlin
// libs.versions.toml
[versions]
ktor = "3.0.3"
kotlinx-serialization = "1.7.3"
sqldelight = "2.0.2"

[libraries]
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
ktor-client-darwin = { module = "io.ktor:ktor-client-darwin", version.ref = "ktor" }
ktor-client-mock = { module = "io.ktor:ktor-client-mock", version.ref = "ktor" }
ktor-client-logging = { module = "io.ktor:ktor-client-logging", version.ref = "ktor" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinx-serialization" }
sqldelight-runtime = { module = "app.cash.sqldelight:runtime", version.ref = "sqldelight" }
sqldelight-coroutines = { module = "app.cash.sqldelight:coroutines-extensions", version.ref = "sqldelight" }
sqldelight-android = { module = "app.cash.sqldelight:android-driver", version.ref = "sqldelight" }
sqldelight-native = { module = "app.cash.sqldelight:native-driver", version.ref = "sqldelight" }
```
