# Client API Call Patterns

Cross-platform reference for iOS (Swift), Android (Kotlin), and Frontend (React/Next.js).

---

## 1. Shared Concepts

| Concept | iOS | Android | Frontend |
|---|---|---|---|
| HTTP client | `URLSession.shared` | `Retrofit + OkHttp` | `axios` / `fetch` |
| Base config | URL + timeout + cache policy | `Retrofit.Builder` baseUrl + OkHttp interceptor | `axios.create({ baseURL, timeout })` |
| Auth injection | URLSession delegate / custom header | OkHttp `Interceptor` | Axios request interceptor |
| Serialization | `JSONDecoder(keyDecodingStrategy: .convertFromSnakeCase)` | `Gson` / `Moshi` / `kotlinx.serialization` | None (native JSON) |
| Type validation | `Codable` + `Decodable` | `@SerializedName` / `@Serializable` | `zod` / `io-ts` / `type` |
| Error abstraction | `enum APIError: Error` | `sealed class NetworkResult<T>` | `ApiError` class |
| Cancellation | `Task.cancel()` / `withTaskCancellationHandler` | `viewModelScope` + `Job.cancel()` | `AbortController` or query cancellation |
| Retry | Manual loop / `AsyncThrowingStream` | Retry interceptor / loop | `@tanstack/query retry: N` |

---

## 2. REST Error Handling

### iOS

```swift
enum APIError: LocalizedError, Equatable {
    case invalidURL
    case invalidResponse(statusCode: Int)
    case decodingFailed(Error)
    case networkFailed(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse(let code): return "Server error \(code)"
        case .decodingFailed(let e): return "Failed to parse response: \(e.localizedDescription)"
        case .networkFailed(let e): return "No internet connection: \(e.localizedDescription)"
        }
    }

    static func == (lhs: APIError, rhs: APIError) -> Bool {
        lhs.errorDescription == rhs.errorDescription
    }
}
```

### Android

```kotlin
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: Int? = null) : NetworkResult<Nothing>()
    data object Loading : NetworkResult<Nothing>()

    val isLoading: Boolean get() = this is Loading
    val isSuccess: Boolean get() = this is Success
    val isError: Boolean get() = this is Error

    fun dataOrNull(): T? = (this as? Success)?.data
    fun errorOrNull(): Error? = this as? Error

    fun <R> map(transform: (T) -> R): NetworkResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Error -> Error(message, code)
        is Loading -> Loading
    }
}
```

### Frontend

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromAxios(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (isAxiosError(error)) {
      if (!error.response) return new ApiError('Network error');
      return new ApiError(
        error.response.data?.message ?? 'Server error',
        error.response.status,
        error.response.data?.code
      );
    }
    if (error instanceof Error) return new ApiError(error.message);
    return new ApiError('Unknown error');
  }
}
```

---

## 3. Base HTTP Client Setup

### iOS

```swift
protocol HTTPClientProtocol {
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}

final class HTTPClient: HTTPClientProtocol {
    private let session: URLSession
    private let decoder: JSONDecoder
    private let baseURL: String

    init(
        session: URLSession = .shared,
        baseURL: String = "https://api.example.com",
        decoder: JSONDecoder = {
            let d = JSONDecoder()
            d.keyDecodingStrategy = .convertFromSnakeCase
            return d
        }()
    ) {
        self.session = session
        self.baseURL = baseURL
        self.decoder = decoder
    }

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        var components = URLComponents(string: "\(baseURL)\(endpoint.path)")!
        if let query = endpoint.query { components.queryItems = query }

        guard let url = components.url else { throw APIError.invalidURL }

        var req = URLRequest(url: url)
        req.httpMethod = endpoint.method.rawValue
        req.allHTTPHeaderFields = endpoint.headers
        req.timeoutInterval = 10

        if let body = endpoint.body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        // Inject auth token via Request Modifier
        endpoint.authModifier?(&req)

        let (data, response) = try await session.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse(statusCode: -1)
        }
        guard (200...299).contains(http.statusCode) else {
            throw APIError.invalidResponse(statusCode: http.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }
}

// Endpoint value type
struct Endpoint {
    let path: String
    let method: HTTPMethod
    let query: [URLQueryItem]?
    let headers: [String: String]?
    let body: [String: Any]?
    let authModifier: ((inout URLRequest) -> Void)?

    init(
        path: String,
        method: HTTPMethod = .get,
        query: [URLQueryItem]? = nil,
        headers: [String: String]? = nil,
        body: [String: Any]? = nil,
        authModifier: ((inout URLRequest) -> Void)? = nil
    ) {
        self.path = path
        self.method = method
        self.query = query
        self.headers = headers
        self.body = body
        self.authModifier = authModifier
    }
}

enum HTTPMethod: String {
    case get, post, put, patch, delete
}
```

### Android

```kotlin
// NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    @Provides @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl("https://api.example.com/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    @Provides @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
}

// AuthInterceptor.kt
class AuthInterceptor @Inject constructor(
    private val tokenProvider: TokenProvider
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        val token = tokenProvider.getAccessToken()
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
```

### Frontend

```typescript
// lib/api/client.ts
import axios from 'axios';
import type { ApiError } from './error';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error interceptor
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      // Redirect to login or refresh token
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(ApiError.fromAxios(error));
  }
);

// lib/api/endpoints.ts — single source of endpoint definitions
export const endpoints = {
  orders: {
    list: '/orders',
    detail: (id: string) => `/orders/${id}`,
    create: '/orders',
    update: (id: string) => `/orders/${id}`,
    delete: (id: string) => `/orders/${id}`,
  },
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
  },
} as const;
```

---

## 4. Service/Repository Layer

### iOS — Protocol-based Repository

```swift
// OrderRepository.swift
protocol OrderRepositoryProtocol {
    func fetchOrders() async throws -> [Order]
    func fetchOrder(id: String) async throws -> Order
    func createOrder(_ dto: CreateOrderDTO) async throws -> Order
}

final class OrderRepository: OrderRepositoryProtocol {
    private let client: HTTPClientProtocol

    init(client: HTTPClientProtocol = HTTPClient()) {
        self.client = client
    }

    func fetchOrders() async throws -> [Order] {
        let endpoint = Endpoint(path: "/orders", method: .get)
        return try await client.request(endpoint)
    }

    func fetchOrder(id: String) async throws -> Order {
        let endpoint = Endpoint(path: "/orders/\(id)", method: .get)
        return try await client.request(endpoint)
    }

    func createOrder(_ dto: CreateOrderDTO) async throws -> Order {
        let body = try JSONEncoder().encode(dto)
        let dict = try JSONSerialization.jsonObject(with: body) as! [String: Any]
        let endpoint = Endpoint(path: "/orders", method: .post, body: dict)
        return try await client.request(endpoint)
    }
}

// For testing: mock repository
final class MockOrderRepository: OrderRepositoryProtocol {
    var stubOrders: [Order] = []
    var stubError: Error?

    func fetchOrders() async throws -> [Order] {
        if let error = stubError { throw error }
        return stubOrders
    }

    func fetchOrder(id: String) async throws -> Order {
        if let error = stubError { throw error }
        return stubOrders.first { $0.id == id }!
    }

    func createOrder(_ dto: CreateOrderDTO) async throws -> Order {
        if let error = stubError { throw error }
        return Order(id: UUID().uuidString, customerName: dto.customerName, total: dto.total, status: .pending)
    }
}
```

### Android — Repository with Cache Fallback

```kotlin
// OrderRepositoryImpl.kt
class OrderRepositoryImpl @Inject constructor(
    private val api: OrderApi,
    private val dao: OrderDao
) : OrderRepository {

    override suspend fun getOrders(): NetworkResult<List<Order>> {
        return try {
            val response = api.getOrders()
            val orders = response.map { it.toDomain() }

            // Cache to local DB
            dao.insertAll(orders.map { it.toEntity() })

            NetworkResult.Success(orders)
        } catch (e: HttpException) {
            NetworkResult.Error(e.message(), e.code())
        } catch (e: IOException) {
            // Offline fallback
            val cached = dao.getAll().firstOrNull()
            if (cached != null && cached.isNotEmpty()) {
                NetworkResult.Success(cached.map { it.toDomain() })
            } else {
                NetworkResult.Error("No internet and no cached data", null)
            }
        }
    }

    override suspend fun getOrder(id: String): NetworkResult<Order> {
        return try {
            val response = api.getOrder(id)
            NetworkResult.Success(response.toDomain())
        } catch (e: Exception) {
            // Try cache
            val cached = dao.getById(id)
            if (cached != null) {
                NetworkResult.Success(cached.toDomain())
            } else {
                NetworkResult.Error(e.message ?: "Unknown error")
            }
        }
    }
}
```

### Frontend — TanStack Query Hooks

```typescript
// hooks/useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Order, CreateOrderDTO } from '@/types/order';

// Query key factory — one source of truth for invalidation
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// Fetch functions separated from hooks for testability
async function fetchOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<ApiResponse<Order[]>>(endpoints.orders.list);
  return data.data;
}

async function fetchOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get<ApiResponse<Order>>(endpoints.orders.detail(id));
  return data.data;
}

async function createOrder(dto: CreateOrderDTO): Promise<Order> {
  const { data } = await apiClient.post<ApiResponse<Order>>(endpoints.orders.create, dto);
  return data.data;
}

// Hooks
export function useOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: fetchOrders,
    staleTime: 30_000,              // 30s before background refetch
    gcTime: 5 * 60_000,             // keep in memory 5min
    retry: 2,
    refetchOnWindowFocus: true,
    // Structural sharing — data stays referentially stable if shape unchanged
    structuralSharing: true,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrder(id),
    enabled: !!id,                  // don't fetch if id is empty
    staleTime: 60_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    // On success: invalidate list to refetch
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    // Optimistic update: update cache before server responds
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      const previous = queryClient.getQueryData<Order[]>(orderKeys.lists());

      if (previous) {
        queryClient.setQueryData<Order[]>(orderKeys.lists(), [
          { id: 'temp', ...dto, status: 'pending', createdAt: new Date().toISOString() } as Order,
          ...previous,
        ]);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(orderKeys.lists(), context.previous);
      }
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
```

---

## 5. ViewModel / Screen Usage

### iOS — SwiftUI + ViewModel

```swift
@MainActor
final class OrdersViewModel: ObservableObject {
    @Published var state: ViewState<[Order]> = .idle
    @Published var selectedOrder: Order?

    private let repository: OrderRepositoryProtocol
    private var currentTask: Task<Void, Never>?

    init(repository: OrderRepositoryProtocol = OrderRepository()) {
        self.repository = repository
    }

    func load() {
        currentTask?.cancel()
        currentTask = Task {
            state = .loading
            do {
                try Task.checkCancellation()
                let orders = try await repository.fetchOrders()
                state = .loaded(orders)
            } catch is CancellationError {
                return
            } catch {
                state = .error(APIError.networkFailed(error))
            }
        }
    }

    func refresh() { load() }

    func retry() { load() }

    deinit { currentTask?.cancel() }
}

// ViewState enum — no "isLoading" booleans
enum ViewState<T> {
    case idle
    case loading
    case loaded(T)
    case error(Error)

    var data: T? {
        if case .loaded(let value) = self { return value }
        return nil
    }
}

// Screen
struct OrdersScreen: View {
    @StateObject private var vm = OrdersViewModel()

    var body: some View {
        Group {
            switch vm.state {
            case .idle, .loading:
                ProgressView()
            case .loaded(let orders):
                List(orders, id: \.id) { order in
                    Text(order.customerName)
                }
                .refreshable { vm.refresh() }
            case .error(let error):
                VStack {
                    Text(error.localizedDescription)
                    Button("Retry") { vm.retry() }
                }
            }
        }
        .task { vm.load() }
    }
}
```

### Android — Compose + StateFlow

```kotlin
@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val repository: OrderRepository
) : ViewModel() {

    private val _state = MutableStateFlow<NetworkResult<List<Order>>>(NetworkResult.Loading)
    val state: StateFlow<NetworkResult<List<Order>>> = _state.asStateFlow()

    init { getOrders() }

    fun getOrders() {
        viewModelScope.launch {
            _state.value = NetworkResult.Loading
            _state.value = repository.getOrders()
        }
    }

    fun refresh() { getOrders() }
}

@Composable
fun OrdersScreen(
    viewModel: OrdersViewModel = hiltViewModel(),
    onOrderClick: (String) -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    when (state) {
        is NetworkResult.Loading -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        is NetworkResult.Success -> {
            val orders = (state as NetworkResult.Success<List<Order>>).data
            LazyColumn {
                items(orders, key = { it.id }) { order ->
                    OrderCard(order = order, onClick = { onOrderClick(order.id) })
                }
            }
        }
        is NetworkResult.Error -> {
            val error = state as NetworkResult.Error
            Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text(error.message, textAlign = TextAlign.Center)
                Spacer(Modifier.height(16.dp))
                Button(onClick = { viewModel.refresh() }) {
                    Text("Retry")
                }
            }
        }
    }
}
```

### Frontend — React Component

```typescript
// components/features/orders/OrdersScreen.tsx
import { useOrders, useCreateOrder } from '@/hooks/useOrders';
import { OrderCard } from './OrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorView } from '@/components/ui/ErrorView';

export function OrdersScreen() {
  const { data, isLoading, isError, error, refetch } = useOrders();
  const createOrder = useCreateOrder();

  // Render by state — no nested ternaries
  if (isLoading) return <LoadingSpinner />;

  if (isError) {
    return <ErrorView message={error?.message} onRetry={refetch} />;
  }

  return (
    <div>
      <button
        onClick={() => createOrder.mutate({ customerName: 'New', total: 0 })}
        disabled={createOrder.isPending}
      >
        {createOrder.isPending ? 'Creating...' : 'Add Order'}
      </button>

      <ul>
        {data?.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>
    </div>
  );
}
```

---

## 6. WebSocket / Real-time

### iOS — URLSessionWebSocketTask

```swift
final class WebSocketService: NSObject {
    private var task: URLSessionWebSocketTask?
    private var onMessage: ((String) -> Void)?

    func connect(url: URL, onMessage: @escaping (String) -> Void) {
        self.onMessage = onMessage
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
        task = session.webSocketTask(with: url)
        task?.resume()
        receive()
    }

    func send(_ text: String) async throws {
        try await task?.send(.string(text))
    }

    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
    }

    private func receive() {
        task?.receive { [weak self] result in
            switch result {
            case .success(let message):
                if case .string(let text) = message {
                    self?.onMessage?(text)
                }
                self?.receive() // listen for next message
            case .failure:
                break
            }
        }
    }
}
```

### Android — OkHttp WebSocket

```kotlin
class LiveOrderService(
    private val client: OkHttpClient
) {
    private var webSocket: WebSocket? = null

    private val _orders = MutableSharedFlow<Order>(extraBufferCapacity = 64)
    val orders: SharedFlow<Order> = _orders.asSharedFlow()

    fun connect(token: String) {
        val request = Request.Builder()
            .url("wss://api.example.com/ws/orders")
            .addHeader("Authorization", "Bearer $token")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                val order = Json.decodeFromString<Order>(text)
                viewModelScope.launch { _orders.emit(order) }
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                // Reconnect with exponential backoff
                delay(1000)
                connect(token)
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "Client closing")
    }
}
```

### Frontend — WebSocket + React

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { orderKeys } from './useOrders';

export function useOrderWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/orders`, token!);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as { type: string; payload: unknown };

      switch (data.type) {
        case 'order_created':
        case 'order_updated':
          // Invalidate list — triggers background refetch
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
          break;
        case 'order_deleted':
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
          break;
      }
    };

    ws.onclose = () => {
      // Reconnect after 3s
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);
}
```

---

## 7. File Upload

### iOS

```swift
func uploadImage(_ data: Data, fieldName: String = "file") async throws -> ImageResponse {
    let boundary = UUID().uuidString
    var body = Data()
    body.append("--\(boundary)\r\n".data(using: .utf8)!)
    body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"image.jpg\"\r\n".data(using: .utf8)!)
    body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
    body.append(data)
    body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

    var request = URLRequest(url: URL(string: "\(baseURL)/upload")!)
    request.httpMethod = "POST"
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    request.httpBody = body

    let (responseData, response) = try await URLSession.shared.data(for: request)
    // Handle response
}
```

### Android — OkHttp MultipartBody

```kotlin
interface UploadApi {
    @Multipart
    @POST("upload")
    suspend fun uploadImage(
        @Part file: MultipartBody.Part
    ): UploadResponse
}

// Usage
val filePart = MultipartBody.Part.createFormData(
    name = "file",
    filename = "image.jpg",
    body = requestBody
)
val result = api.uploadImage(filePart)
```

### Frontend — FormData

```typescript
async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<ApiResponse<UploadResponse>>(
    endpoints.upload,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Upload progress
      onUploadProgress: (e) => {
        const progress = Math.round((e.loaded * 100) / (e.total ?? 1));
        console.log(`${progress}%`);
      },
    }
  );

  return data.data;
}
```

---

## 8. Pagination

### iOS — Cursor-based

```swift
final class PaginatedOrderRepository {
    private var cursor: String?
    private(set) var hasMore = true

    func fetchNext() async throws -> [Order] {
        guard hasMore else { return [] }
        var endpoint = Endpoint(path: "/orders", method: .get)
        if let cursor = cursor {
            endpoint.query = [URLQueryItem(name: "cursor", value: cursor)]
        }
        let response: PaginatedResponse<Order> = try await client.request(endpoint)
        cursor = response.nextCursor
        hasMore = response.nextCursor != nil
        return response.data
    }
}
```

### Android — Paging 3

```kotlin
class OrderPagingSource(
    private val api: OrderApi
) : PagingSource<Int, Order>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Order> {
        return try {
            val page = params.key ?: 1
            val response = api.getOrders(page = page, size = params.loadSize)
            LoadResult.Page(
                data = response.data.map { it.toDomain() },
                prevKey = if (page > 1) page - 1 else null,
                nextKey = if (response.data.isNotEmpty()) page + 1 else null
            )
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }
}
```

### Frontend — Infinite Query

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

async function fetchOrdersPage({ pageParam = 1 }): Promise<PaginatedResult<Order>> {
  const { data } = await apiClient.get('/orders', {
    params: { page: pageParam, size: 20 },
  });
  return data.data;
}

export function useInfiniteOrders() {
  return useInfiniteQuery({
    queryKey: orderKeys.infinite(),
    queryFn: fetchOrdersPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}
```

---

## Rules

- Never hardcode URLs — use `baseURL` config + endpoint constants.
- Error types must be exhaustive — every failure path handled.
- Loading state must be explicit — no `isLoading` booleans, use enum/sealed sum type.
- Data state must be immutable — no direct mutation, always replace via state setter.
- Cancel in-flight requests on unmount/navigate-away — `Task.cancel()`, `viewModelScope`, query cancellation.
- Auth token injection must be centralized — interceptor/delegate layer, not in each call.
- Repository is the single source of truth for data operations — screen/viewmodel never calls HTTP directly.
- Cache strategy must be explicit — `staleTime`, `gcTime`, local DB fallback, not implicit caching.
- Optimistic updates must rollback on error — always keep `previous` snapshot.
