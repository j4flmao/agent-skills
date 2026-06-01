---
name: mobile-networking
description: >
  Use this skill when the user asks about mobile networking, REST client,
  GraphQL, offline-first, API caching, retry, pagination, background sync,
  or API interceptors.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, networking, phase-4, universal]
---

# Mobile Networking

## Purpose
Design mobile networking layers with offline-first architecture, caching strategy, retry logic, pagination, and authentication interceptors.

## Agent Protocol

### Trigger
User request includes: `mobile network`, `api client mobile`, `rest mobile`, `graphql mobile`, `offline first`, `api caching mobile`, `retry mobile`, `pagination mobile`, `background sync`, `api interceptor`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- API type (REST, GraphQL, gRPC)
- Current library (Retrofit, Apollo, Dio, Axios, URLSession)
- Offline requirements

### Output Artifact
A markdown document containing:
- Network layer architecture
- Client setup with interceptors
- Caching strategy
- Offline-first data flow
- Pagination approach

### Response Format
No preamble. No postamble. No explanations.

### Max Response Length
4096 tokens

## Decision Trees

### API Style Selection
```
What API style does the backend expose?
├── REST (standard CRUD, simple endpoints)
│   ├── iOS → URLSession + async/await or Alamofire
│   ├── Android → Retrofit + OkHttp
│   ├── Flutter → Dio or http
│   └── React Native → Axios or fetch
├── GraphQL (flexible queries, real-time subs)
│   ├── iOS → Apollo iOS
│   ├── Android → Apollo Kotlin
│   ├── Flutter → graphql_flutter
│   └── React Native → Apollo Client
├── gRPC (high-performance, streaming)
│   ├── Need protobuf codegen and HTTP/2
│   └── Limited mobile adoption; prefer REST/GraphQL for most apps
└── WebSocket (real-time, bidirectional)
    ├── iOS → URLSessionWebSocketTask
    └── Android → OkHttp WebSocket
```

### Caching Strategy
```
How fresh must the data be?
├── Real-time (chat, live scores) → No cache, invalidate on new data
├── Recent (feeds, listings) → Stale-while-revalidate (5 min TTL)
├── Reference (settings, product catalog) → Cache-first (24h TTL)
└── Offline-critical (map tiles, articles) → Preload + persistent cache
```

### Pagination Type
```
API response structure?
├── Has next/prev page tokens → Cursor-based (infinite scroll, preferred)
├── Offset + limit → Offset-based (page number, can skip)
├── HasMore boolean with last ID → Keyset pagination (efficient for large data)
└── Sort by timestamp → Time-based pagination (before/after timestamp)
```

### Offline-First Strategy
```
Is connectivity reliable?
├── Mostly online (social, messaging) → Network-first, cache fallback
├── Sometimes offline (news, reference) → Cache-first, background refresh
├── Often offline (field work, travel) → Offline-first with sync queue
└── Must work offline (aviation, medical) → Pre-sync all data, local-first
```

## Workflow

### Step 1: Set Up HTTP Client
Configure platform-specific client with base URL, timeouts, and default headers.

### Step 2: Add Interceptors
Implement auth token injection, retry on 401, request logging, and error transformation.

### Step 3: Implement Offline-First Strategy
Build cache-check-first flow: return cached data then refresh in background, with network failure fallback to cache.

### Step 4: Implement Pagination
Use cursor-based pagination with configurable page size, hasMore flag, and append behavior for infinite scroll.

### Step 5: Configure Background Sync
Queue failed write operations for retry when connectivity resumes, with conflict resolution strategy.

## Rules
- Network layer must be fully abstracted behind repository interfaces
- Auth token refresh must be transparent — interceptors handle 401 → refresh → retry
- Offline-first: always show cached data immediately, refresh in background
- Pagination must track loading state per page, not globally
- All network errors must be mapped to domain-specific error types
- Cache staleness TTL must be configurable per data type
- Retry with exponential backoff for transient failures (429, 503)
- SSL pinning required for production apps
- Never log sensitive data (tokens, passwords, PII)

## REST Client Setup

### Flutter — Dio
```dart
import 'package:dio/dio.dart';

final dio = Dio(BaseOptions(
  baseUrl: 'https://api.example.com',
  connectTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 10),
  sendTimeout: const Duration(seconds: 10),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
));

dio.interceptors.add(AuthInterceptor());
dio.interceptors.add(RetryInterceptor());
dio.interceptors.add(LogInterceptor(requestBody: true, error: true));
```

### React Native — Axios
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Android — Retrofit + OkHttp
```kotlin
// ApiClient.kt
object ApiClient {
  private val okHttpClient = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(10, TimeUnit.SECONDS)
    .writeTimeout(10, TimeUnit.SECONDS)
    .addInterceptor(AuthInterceptor())
    .addInterceptor(HttpLoggingInterceptor().apply {
      level = HttpLoggingInterceptor.Level.BODY
    })
    .build()

  val retrofit: Retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com/")
    .client(okHttpClient)
    .addConverterFactory(GsonConverterFactory.create())
    .build()
}

// OrderApi.kt
interface OrderApi {
  @GET("orders")
  suspend fun getOrders(
    @Query("cursor") cursor: String?,
    @Query("limit") limit: Int = 20
  ): OrdersResponse

  @POST("orders")
  suspend fun createOrder(@Body order: CreateOrderRequest): OrderResponse

  @GET("orders/{id}")
  suspend fun getOrder(@Path("id") id: String): OrderResponse
}

// AuthInterceptor.kt
class AuthInterceptor : Interceptor {
  override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
    val request = chain.request().newBuilder()
    val token = TokenManager.getAccessToken()
    token?.let { request.addHeader("Authorization", "Bearer $it") }
    val response = chain.proceed(request.build())

    if (response.code == 401) {
      response.close()
      val newToken = TokenManager.refreshToken()
      val retryRequest = chain.request().newBuilder()
        .addHeader("Authorization", "Bearer $newToken")
        .build()
      return chain.proceed(retryRequest)
    }
    return response
  }
}
```

### iOS — URLSession + async/await
```swift
import Foundation

actor APIClient {
  static let shared = APIClient()
  private let session: URLSession
  private let decoder = JSONDecoder()
  private let baseURL = URL(string: "https://api.example.com")!

  private init() {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 10
    config.timeoutIntervalForResource = 30
    config.waitsForConnectivity = true
    self.session = URLSession(configuration: config)
  }

  func request<T: Decodable>(
    _ endpoint: Endpoint,
    type: T.Type
  ) async throws -> T {
    var request = URLRequest(url: baseURL.appendingPathComponent(endpoint.path))
    request.httpMethod = endpoint.method.rawValue
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let token = await KeychainManager.shared.getAccessToken()
    if let token = token {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    if let body = endpoint.body {
      request.httpBody = try JSONEncoder().encode(body)
    }

    do {
      let (data, response) = try await session.data(for: request)
      guard let httpResponse = response as? HTTPURLResponse else {
        throw APIError.invalidResponse
      }
      guard (200...299).contains(httpResponse.statusCode) else {
        if httpResponse.statusCode == 401 {
          try await refreshToken()
          return try await request(endpoint, type: type)
        }
        throw APIError.statusCode(httpResponse.statusCode)
      }
      return try decoder.decode(T.self, from: data)
    } catch let error as URLError {
      throw APIError.network(error)
    } catch let error as DecodingError {
      throw APIError.decoding(error)
    }
  }

  private func refreshToken() async throws {
    let refreshToken = try await secureStorage.getRefreshToken()
    let (data, _) = try await session.data(for: refreshRequest(refreshToken))
    let response = try decoder.decode(TokenResponse.self, from: data)
    await secureStorage.saveTokens(access: response.accessToken, refresh: response.refreshToken)
  }
}
```

## GraphQL Client Setup

### iOS — Apollo
```swift
import Apollo

class Network {
  static let shared = Network()
  private(set) lazy var client: ApolloClient = {
    let cache = InMemoryNormalizedCache()
    let store = ApolloStore(cache: cache)
    let provider = NetworkInterceptorProvider(store: store, client: URLSessionClient())
    let url = URL(string: "https://api.example.com/graphql")!
    let transport = RequestChainNetworkTransport(
      interceptorProvider: provider,
      endpointURL: url
    )
    return ApolloClient(networkTransport: transport, store: store)
  }()
}

class TokenInterceptor: ApolloInterceptor {
  func interceptAsync<Operation: GraphQLOperation>(
    chain: RequestChain,
    request: HTTPRequest<Operation>,
    response: HTTPResponse<Operation>?,
    completion: @escaping (Result<GraphQLResult<Operation.Data>, Error>) -> Void
  ) {
    Task {
      let token = await TokenManager.getAccessToken()
      if let token = token {
        request.addHeader(name: "Authorization", value: "Bearer \(token)")
      }
      chain.proceedAsync(request: request, response: response, completion: completion)
    }
  }
}
```

### Android — Apollo Kotlin
```kotlin
val apolloClient = ApolloClient.Builder()
  .serverUrl("https://api.example.com/graphql")
  .normalizedCache(InMemoryNormalizedCacheFactory)
  .addInterceptor(AuthInterceptor())
  .build()

class AuthInterceptor : ApolloInterceptor {
  override fun <D : Operation.Data> intercept(
    request: ApolloRequest<D>,
    chain: ApolloInterceptorChain
  ): Flow<ApolloResponse<D>> {
    val token = TokenManager.getAccessToken()
    return chain.proceed(
      request.newBuilder()
        .addHttpHeader("Authorization", "Bearer $token")
        .build()
    )
  }
}
```

## Interceptors

### Auth Token Interceptor
```typescript
// Axios — transparent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await storage.getRefreshToken();
      const { data } = await axios.post('/auth/refresh', { refreshToken });
      await storage.setAccessToken(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    }
    return Promise.reject(mapError(error));
  }
);
```

### Retry Interceptor (Exponential Backoff)
```dart
class RetryInterceptor extends Interceptor {
  final int maxRetries;
  final Duration baseDelay;

  RetryInterceptor({this.maxRetries = 3, this.baseDelay = const Duration(seconds: 1)});

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (!_isRetryable(err)) return handler.next(err);

    for (var i = 0; i < maxRetries; i++) {
      await Future.delayed(baseDelay * pow(2, i));
      try {
        final response = await dio.fetch(err.requestOptions);
        return handler.resolve(response);
      } catch (_) {
        continue;
      }
    }
    handler.next(err);
  }

  bool _isRetryable(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
           err.type == DioExceptionType.receiveTimeout ||
           err.response?.statusCode == 429 ||
           err.response?.statusCode == 503;
  }
}
```

### Logging Interceptor
```kotlin
class LoggingInterceptor : Interceptor {
  override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
    val request = chain.request()
    Log.d("HTTP", "→ ${request.method} ${request.url}")

    val startTime = System.nanoTime()
    val response = chain.proceed(request)
    val duration = (System.nanoTime() - startTime) / 1_000_000

    Log.d("HTTP", "← ${response.code} ${request.url} (${duration}ms)")
    return response
  }
}
```

## Offline-First Implementation

### Architecture
```
Request
├── Check local cache
│   ├── HIT (data exists)
│   │   ├── Return cached data immediately
│   │   └── Fetch from network in background
│   │       ├── Success → Update cache → Notify UI
│   │       └── Failure → Silent (cache is fresh enough)
│   └── MISS (no cached data)
│       └── Fetch from network
│           ├── Success → Cache → Return
│           └── Failure
│               └── Return error OR stale cache if available
```

### Flutter — Repository Pattern with Connectivity
```dart
abstract class Repository<T> {
  Future<List<T>> getItems();
  Future<void> createItem(T item);
}

class OrderRepositoryImpl implements OrderRepository {
  final OrderRemoteDataSource remote;
  final OrderLocalDataSource local;
  final Connectivity connectivity;

  @override
  Future<List<Order>> getOrders() async {
    // Try cache first
    final cached = await local.getCachedOrders();
    if (cached.isNotEmpty) {
      // Return cached immediately, refresh in background
      _refreshOrders();
      return cached.map((e) => e.toEntity()).toList();
    }

    // No cache, fetch from network
    try {
      final remote = await this.remote.fetchOrders();
      await local.cacheOrders(remote);
      return remote.map((e) => e.toEntity()).toList();
    } catch (_) {
      rethrow;  // UI shows error state
    }
  }

  Future<void> _refreshOrders() async {
    try {
      final remote = await this.remote.fetchOrders();
      await local.cacheOrders(remote);
    } catch (_) {
      // Silent — cache data is already displayed
    }
  }

  @override
  Future<void> createOrder(Order order) async {
    // Optimistic write
    await local.saveOrder(order);
    try {
      await remote.createOrder(order);
    } catch (_) {
      // Queue for sync
      await local.queueForSync(order);
    }
  }
}
```

### iOS — Offline with Core Data
```swift
class OrderRepository {
  private let api: APIClient
  private let coreData: CoreDataStack
  private let monitor: NetworkMonitor

  func fetchOrders() async throws -> [Order] {
    // Check cache
    let cached = coreData.fetchOrders()

    if !cached.isEmpty {
      // Return cache immediately
      Task { try? await refreshOrders() }
      return cached
    }

    // No cache, fetch from network
    guard monitor.isConnected else {
      throw NetworkError.offline
    }

    let remote = try await api.getOrders()
    coreData.saveOrders(remote)
    return remote
  }

  @MainActor
  private func refreshOrders() async throws {
    let remote = try await api.getOrders()
    coreData.saveOrders(remote)
    NotificationCenter.default.post(name: .ordersUpdated, object: remote)
  }
}
```

## Pagination

### Cursor-Based Pagination
```kotlin
// Android — Paging 3
class OrderPagingSource : PagingSource<String, Order>() {
  override suspend fun load(params: LoadParams<String>): LoadResult<String, Order> {
    return try {
      val cursor = params.key
      val response = api.getOrders(cursor = cursor, limit = params.loadSize)
      LoadResult.Page(
        data = response.orders,
        prevKey = null,  // one-direction scroll
        nextKey = response.nextCursor  // null when no more
      )
    } catch (e: Exception) {
      LoadResult.Error(e)
    }
  }
}
```

```dart
// Flutter — cursor-based
class PaginatedDataSource<T> {
  int limit = 20;
  String? cursor;
  bool hasMore = true;
  bool isLoading = false;

  Future<List<T>> loadNext() async {
    if (!hasMore || isLoading) return [];
    isLoading = true;
    try {
      final response = await api.fetch(cursor: cursor, limit: limit);
      cursor = response.nextCursor;
      hasMore = response.hasMore;
      return response.items;
    } finally {
      isLoading = false;
    }
  }

  void reset() {
    cursor = null;
    hasMore = true;
  }
}
```

```swift
// iOS — cursor-based
actor PaginatedLoader<T> {
  var cursor: String?
  var hasMore = true
  let pageSize = 20

  func loadNext() async throws -> [T] {
    guard hasMore else { return [] }
    let response = try await api.fetch(after: cursor, limit: pageSize)
    cursor = response.nextCursor
    hasMore = response.hasMore
    return response.items
  }

  func reset() {
    cursor = nil
    hasMore = true
  }
}
```

## Background Sync

### Sync Queue
```dart
class SyncQueue {
  final Queue<SyncOperation> _queue = Queue();
  bool _isSyncing = false;

  Future<void> enqueue(SyncOperation op) async {
    _queue.add(op);
    await processQueue();
  }

  Future<void> processQueue() async {
    if (_isSyncing) return;
    _isSyncing = true;

    while (_queue.isNotEmpty) {
      final op = _queue.first;
      try {
        await op.execute();
        _queue.removeFirst();  // Success — remove
      } catch (e) {
        if (op.retryCount >= 3) {
          _queue.removeFirst();  // Give up after 3 retries
          logError('Sync failed permanently: $op');
        } else {
          op.retryCount++;
          break;  // Stop processing, retry later
        }
      }
    }

    _isSyncing = false;
    if (_queue.isNotEmpty) {
      // Schedule retry with backoff
      Future.delayed(Duration(seconds: 30), processQueue);
    }
  }
}
```

### Network Monitor
```kotlin
class NetworkMonitor(context: Context) {
  private val connectivityManager =
    context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

  val isOnline: Boolean
    get() = connectivityManager.activeNetwork?.let {
      connectivityManager.getNetworkCapabilities(it)?.hasCapability(
        NetworkCapabilities.NET_CAPABILITY_INTERNET
      )
    } == true

  fun observeConnectivity(): Flow<Boolean> = callbackFlow {
    val callback = object : ConnectivityManager.NetworkCallback() {
      override fun onAvailable(network: Network) { trySend(true) }
      override fun onLost(network: Network) { trySend(false) }
    }
    connectivityManager.registerDefaultNetworkCallback(callback)
    awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
  }
}
```

## SSL Pinning

### Android — OkHttp CertificatePinner
```kotlin
val certificatePinner = CertificatePinner.Builder()
  .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
  .add("api.example.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
  .build()

val client = OkHttpClient.Builder()
  .certificatePinner(certificatePinner)
  .build()
```

### iOS — URLSession with URLSessionDelegate
```swift
class PinnedURLSessionDelegate: NSObject, URLSessionDelegate {
  func urlSession(_ session: URLSession,
                  didReceive challenge: URLAuthenticationChallenge,
                  completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
          let serverTrust = challenge.protectionSpace.serverTrust else {
      completionHandler(.performDefaultHandling, nil)
      return
    }

    let policies = [SecPolicyCreateSSL(true, "api.example.com" as CFString)]
    SecTrustSetPolicies(serverTrust, policies as CFTypeRef)

    var result: CFError?
    let trusted = SecTrustEvaluateWithError(serverTrust, &result)

    if trusted {
      completionHandler(.useCredential, URLCredential(trust: serverTrust))
    } else {
      completionHandler(.cancelAuthenticationChallenge, nil)
    }
  }
}
```

## Error Handling

### Domain Error Types
```kotlin
sealed class Result<out T> {
  data class Success<T>(val data: T) : Result<T>()
  data class Error(val error: AppError) : Result<Nothing>()
}

sealed class AppError : Exception() {
  data class Network(val cause: Throwable) : AppError()
  data class Server(val code: Int, val message: String) : AppError()
  data class Auth(val message: String) : AppError()
  data class Validation(val errors: Map<String, String>) : AppError()
  data object Cancelled : AppError()
  data class Timeout(val cause: Throwable) : AppError()
  data object Offline : AppError()
  data class Unknown(val cause: Throwable) : AppError()
}
```

## File Upload/Download

### Flutter — Dio with Progress
```dart
Future<void> uploadFile(String path) async {
  final formData = FormData.fromMap({
    'file': await MultipartFile.fromFile(path, filename: 'photo.jpg'),
  });
  await dio.post(
    '/upload',
    data: formData,
    onSendProgress: (sent, total) {
      final progress = sent / total;
      print('Upload: ${(progress * 100).toStringAsFixed(0)}%');
    },
  );
}

Future<void> downloadFile(String url, String savePath) async {
  await dio.download(
    url,
    savePath,
    onReceiveProgress: (received, total) {
      final progress = received / total;
      print('Download: ${(progress * 100).toStringAsFixed(0)}%');
    },
  );
}
```

## Performance Considerations
- Connection pooling: OkHttp keeps alive connections by default; URLSession reuses HTTP/2 multiplexing
- Response caching with Etag/Last-Modified headers reduces bandwidth
- Compress request bodies with gzip for large payloads
- Use protobuf over JSON for high-throughput APIs (60% smaller payloads)
- Prefer WebSocket over polling for real-time updates
- Debounce search requests by 300ms to avoid API spam
- Cancel in-flight requests when leaving screens (use CancellationToken / auto-dispose)
- Background tasks should batch operations to reduce wake locks
- Use HTTP/2 multiplexing for parallel requests on a single connection
- Monitor network with Charles Proxy or Proxyman during development

## Anti-Patterns
- **Direct API calls in ViewModels**: Ties UI to networking. Always use repository abstraction
- **No timeout configuration**: Default timeouts are too long (minutes). Set 10s connect/read/write
- **Ignoring 401 globally**: Each request retrying auth independently causes race conditions. Queue and retry once
- **Blocking main thread with network calls**: ANR on Android, frozen UI on iOS. Always async
- **Caching without TTL**: Users see stale data forever. Configurable TTL per data type
- **Loading indicator per page instead of global**: Leads to flickering. Track loading per-page
- **No request cancellation leaving stale observers**: Memory leaks. Cancel on dispose
- **Logging sensitive data in production**: Security risk. Strip auth headers and PII from logs
- **Not handling HTTP 304 (Not Modified)**: Wastes bandwidth. Support conditional requests with Etag
- **Polling instead of push for real-time**: Battery drain. Use WebSocket or push notifications
- **Retrying non-idempotent requests blindly**: Duplicate order creation. Only retry reads and idempotent writes
- **Ignoring connectivity state**: Requests fail silently. Observe connectivity and show appropriate UI
- **One-size-fits-all base URL**: Dev/staging/prod configs leak to production. Use build configs

## References
- `references/caching.md` — Mobile Caching
- `references/graphql-mobile.md` — Mobile GraphQL Integration
- `references/mobile-networking-patterns.md` — Mobile Networking Patterns
- `references/network-layer-architecture.md` — Cross-Platform Network Layer Architecture
- `references/offline-first.md` — Offline-First Architecture
- `references/rest-client.md` — REST Client Setup

## Handoff
After networking setup, hand off to:
- `mobile/universal/offline-first` — Full offline-first sync strategy
- `mobile/universal/security` — SSL pinning, token storage
- `mobile/universal/testing` — Network mocking, API testing
- `mobile/universal/storage` — Cache persistence layer
- `mobile/universal/performance` — Network optimization, caching
- `mobile/android` — OkHttp, Retrofit specifics
- `mobile/ios` — URLSession, Alamofire specifics
- `mobile/flutter` — Dio, connectivity
- `mobile/react-native` — Axios, NetInfo
