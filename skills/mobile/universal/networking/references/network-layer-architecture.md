# Cross-Platform Network Layer Architecture

## Overview

A robust cross-platform networking layer abstracts HTTP communication behind repository interfaces, enabling consistent caching, retry, authentication, and error handling across iOS, Android, Flutter, and React Native. This guide covers repository pattern implementation, API client abstraction, interceptors, retry strategies, connection management, and security.

## Architecture Layers

### Layer Structure

```
Presentation Layer (ViewModels/Blocs/Cubits)
       |
Repository Layer (data source orchestration)
       |
   |          |
API Client  Cache Layer
   |          |
HTTP Layer  Local Storage
   |
Network Stack
```

### Repository Pattern

```dart
// repository.dart
abstract class Repository<T> {
  Future<Result<T>> get({required String id, bool forceRefresh = false});
  Future<Result<List<T>>> getAll({bool forceRefresh = false});
  Future<Result<T>> create(T entity);
  Future<Result<T>> update(T entity);
  Future<Result<void>> delete(String id);
}

typedef Result<T> = Either<AppError, T>;

class Either<L, R> {
  final L? left;
  final R? right;
  Either.left(this.left) : right = null;
  Either.right(this.right) : left = null;
  bool get isLeft => left != null;
  bool get isRight => right != null;
}
```

```kotlin
// Repository.kt
interface Repository<T> {
    suspend fun get(id: String, forceRefresh: Boolean = false): Result<T>
    suspend fun getAll(forceRefresh: Boolean = false): Result<List<T>>
    suspend fun create(entity: T): Result<T>
    suspend fun update(entity: T): Result<T>
    suspend fun delete(id: String): Result<Unit>
}

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: AppException) : Result<Nothing>()
}
```

```swift
// Repository.swift
protocol Repository {
    associatedtype T
    func get(id: String, forceRefresh: Bool) async -> Result<T, AppError>
    func getAll(forceRefresh: Bool) async -> Result<[T], AppError>
    func create(_ entity: T) async -> Result<T, AppError>
    func update(_ entity: T) async -> Result<T, AppError>
    func delete(id: String) async -> Result<Void, AppError>
}

enum Result<Success, Failure: Error> {
    case success(Success)
    case failure(Failure)
}
```

```typescript
// repository.ts
interface Repository<T> {
  get(id: string, forceRefresh?: boolean): Promise<Result<T>>;
  getAll(forceRefresh?: boolean): Promise<Result<T[]>>;
  create(entity: T): Promise<Result<T>>;
  update(entity: T): Promise<Result<T>>;
  delete(id: string): Promise<Result<void>>;
}

type Result<T> = Success<T> | Failure;
type Success<T> = { kind: 'success'; data: T };
type Failure = { kind: 'failure'; error: AppError };
```

### Repository Implementation

```dart
class OrderRepositoryImpl implements OrderRepository {
  final OrderRemoteDataSource remote;
  final OrderLocalDataSource local;
  final ConnectivityMonitor connectivity;

  OrderRepositoryImpl({
    required this.remote,
    required this.local,
    required this.connectivity,
  });

  @override
  Future<Result<List<Order>>> getAll({bool forceRefresh = false}) async {
    try {
      // Check cache first unless forced refresh
      if (!forceRefresh) {
        final cached = await local.getAll();
        if (cached.isNotEmpty) {
          // Return cached immediately, refresh in background
          _refreshInBackground();
          return Result.right(cached);
        }
      }

      // Fetch from network
      final remoteOrders = await remote.getAll();

      // Cache the results
      await local.cacheAll(remoteOrders);

      return Result.right(remoteOrders);
    } on NetworkException catch (e) {
      // Network failure - fall back to cache
      final cached = await local.getAll();
      if (cached.isNotEmpty) {
        return Result.right(cached);
      }
      return Result.left(AppError.offline(e.message));
    } on ServerException catch (e) {
      return Result.left(AppError.server(e.statusCode, e.message));
    } on AuthException catch (e) {
      return Result.left(AppError.unauthorized(e.message));
    }
  }

  Future<void> _refreshInBackground() async {
    try {
      final remoteOrders = await remote.getAll();
      await local.cacheAll(remoteOrders);
    } catch (_) {
      // Silent failure - cached data is already served
    }
  }
}
```

## API Client Abstraction

### Platform-Specific Clients

```dart
// Flutter: ApiClient using Dio
class ApiClient {
  late final Dio _dio;

  ApiClient({
    required String baseUrl,
    required TokenProvider tokenProvider,
    Duration connectTimeout = const Duration(seconds: 10),
    Duration receiveTimeout = const Duration(seconds: 10),
  }) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: connectTimeout,
      receiveTimeout: receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.addAll([
      AuthInterceptor(tokenProvider),
      RetryInterceptor(),
      LogInterceptor(requestBody: true, responseBody: true),
      ErrorInterceptor(),
    ]);
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
  }) {
    return _dio.get<T>(
      path,
      queryParameters: queryParameters,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    CancelToken? cancelToken,
  }) {
    return _dio.put<T>(path, data: data, cancelToken: cancelToken);
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    CancelToken? cancelToken,
  }) {
    return _dio.delete<T>(path, data: data, cancelToken: cancelToken);
  }
}
```

```typescript
// React Native: ApiClient using Axios
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor(config: {
    baseURL: string;
    timeout?: number;
    tokenProvider: () => Promise<string | null>;
  }) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (reqConfig) => {
        const token = await config.tokenProvider();
        if (token) {
          reqConfig.headers.Authorization = `Bearer ${token}`;
        }
        return reqConfig;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      this.handleError
    );
  }

  private async handleError(error: any): Promise<never> {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          throw new UnauthorizedError(data?.message ?? 'Unauthorized');
        case 403:
          throw new ForbiddenError(data?.message ?? 'Forbidden');
        case 404:
          throw new NotFoundError(data?.message ?? 'Not found');
        case 429:
          throw new RateLimitError(data?.message ?? 'Rate limited');
        case 500:
        case 502:
        case 503:
          throw new ServerError(data?.message ?? 'Server error');
        default:
          throw new ApiError(status, data?.message ?? 'Unknown error');
      }
    }
    if (error.code === 'ECONNABORTED') {
      throw new TimeoutError('Request timed out');
    }
    throw new NetworkError(error.message ?? 'Network error');
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(path, config);
    return response.data;
  }

  async post<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(path, data, config);
    return response.data;
  }

  async put<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(path, data, config);
    return response.data;
  }

  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(path, config);
    return response.data;
  }
}
```

```swift
// iOS: ApiClient using URLSession
actor ApiClient {
    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder
    private let tokenProvider: TokenProvider

    init(
        baseURL: URL,
        tokenProvider: TokenProvider,
        configuration: URLSessionConfiguration = .default
    ) {
        self.baseURL = baseURL
        self.tokenProvider = tokenProvider
        self.decoder = JSONDecoder()
        configuration.timeoutIntervalForRequest = 10
        configuration.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: configuration)
    }

    func get<T: Decodable>(
        _ path: String,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: true)!
        components.queryItems = queryItems

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        try await authenticate(&request)

        let (data, response) = try await session.data(for: request)
        try validateResponse(response, data: data)
        return try decoder.decode(T.self, from: data)
    }

    func post<T: Decodable, B: Encodable>(
        _ path: String,
        body: B
    ) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(body)
        try await authenticate(&request)

        let (data, response) = try await session.data(for: request)
        try validateResponse(response, data: data)
        return try decoder.decode(T.self, from: data)
    }

    private func authenticate(_ request: inout URLRequest) async throws {
        if let token = await tokenProvider.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ApiError.invalidResponse
        }
        switch httpResponse.statusCode {
        case 200...299: return
        case 401: throw ApiError.unauthorized
        case 403: throw ApiError.forbidden
        case 404: throw ApiError.notFound
        case 429: throw ApiError.rateLimited
        case 500...599: throw ApiError.serverError(httpResponse.statusCode)
        default: throw ApiError.unexpectedStatusCode(httpResponse.statusCode)
        }
    }
}
```

## Request/Response Interceptors

### Auth Interceptor

```dart
class AuthInterceptor extends Interceptor {
  final TokenProvider tokenProvider;

  AuthInterceptor(this.tokenProvider);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = tokenProvider.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final refreshed = await tokenProvider.refreshToken();
      if (refreshed) {
        // Retry the original request with new token
        final token = tokenProvider.getToken();
        err.requestOptions.headers['Authorization'] = 'Bearer $token';
        try {
          final response = await Dio().fetch(err.requestOptions);
          handler.resolve(response);
          return;
        } catch (retryError) {
          handler.reject(retryError as DioException);
          return;
        }
      }
    }
    handler.next(err);
  }
}
```

### Logging Interceptor

```typescript
// Logging interceptor for debugging
class LoggingInterceptor {
  private readonly enabled: boolean;

  constructor(enabled: boolean = __DEV__) {
    this.enabled = enabled;
  }

  onRequest(config: any): any {
    if (!this.enabled) return config;
    console.log(
      `[NETWORK] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      config.data ? `\nBody: ${JSON.stringify(config.data)}` : ''
    );
    return config;
  }

  onResponse(response: any): any {
    if (!this.enabled) return response;
    console.log(
      `[NETWORK] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      `\nResponse: ${JSON.stringify(response.data).substring(0, 200)}`
    );
    return response;
  }

  onError(error: any): never {
    if (!this.enabled) throw error;
    console.error(
      `[NETWORK] ERROR ${error.response?.status ?? 'NO RESPONSE'} ${error.config?.url}`,
      `\n${error.message}`
    );
    throw error;
  }
}
```

## Retry with Exponential Backoff

### Retry Strategy

```dart
class RetryInterceptor extends Interceptor {
  final int maxRetries;
  final Duration baseDelay;
  final double backoffMultiplier;

  RetryInterceptor({
    this.maxRetries = 3,
    this.baseDelay = const Duration(seconds: 1),
    this.backoffMultiplier = 2.0,
  });

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (_shouldRetry(err)) {
      final retryCount = _getRetryCount(err.requestOptions);
      if (retryCount < maxRetries) {
        final delay = _calculateDelay(retryCount);
        await Future.delayed(delay);
        _setRetryCount(err.requestOptions, retryCount + 1);
        try {
          final response = await Dio().fetch(err.requestOptions);
          handler.resolve(response);
          return;
        } catch (retryError) {
          handler.next(retryError as DioException);
          return;
        }
      }
    }
    handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    // Retry on network errors and server errors (5xx), not client errors (4xx)
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError) {
      return true;
    }
    if (err.response != null) {
      final statusCode = err.response!.statusCode;
      return statusCode == 429 || (statusCode != null && statusCode >= 500);
    }
    return false;
  }

  Duration _calculateDelay(int attempt) {
    final delay = baseDelay * pow(backoffMultiplier, attempt);
    // Add jitter: randomize up to 25% of the delay
    final jitter = delay * (0.25 * Random().nextDouble());
    return delay + jitter;
  }

  int _getRetryCount(RequestOptions options) {
    return options.extra['retryCount'] ?? 0;
  }

  void _setRetryCount(RequestOptions options, int count) {
    options.extra['retryCount'] = count;
  }
}
```

## Request Queuing

### Queue Manager

```dart
class RequestQueueManager {
  final Queue<QueuedRequest> _queue = Queue();
  bool _isProcessing = false;
  final int _maxConcurrent;
  int _activeCount = 0;

  RequestQueueManager({int maxConcurrent = 3}) : _maxConcurrent = maxConcurrent;

  Future<Response> enqueue(QueuedRequest request) {
    final completer = Completer<Response>();
    _queue.add(request..completer = completer);
    _processNext();
    return completer.future;
  }

  Future<void> _processNext() async {
    if (_isProcessing || _activeCount >= _maxConcurrent) return;
    _isProcessing = true;

    while (_queue.isNotEmpty && _activeCount < _maxConcurrent) {
      final request = _queue.removeFirst();
      _activeCount++;
      _executeRequest(request).whenComplete(() {
        _activeCount--;
        _processNext();
      });
    }

    _isProcessing = false;
  }

  Future<void> _executeRequest(QueuedRequest request) async {
    try {
      final response = await request.execute();
      request.completer?.complete(response);
    } catch (e) {
      request.completer?.completeError(e);
    }
  }

  void cancelAll() {
    _queue.clear();
  }
}

class QueuedRequest {
  final Future<Response> Function() execute;
  Completer<Response>? completer;
  final RequestPriority priority;

  QueuedRequest({required this.execute, this.priority = RequestPriority.normal});
}

enum RequestPriority { low, normal, high, critical }
```

## Connection Manager

### Network Status Monitoring

```dart
class ConnectivityMonitor {
  final BehaviorSubject<ConnectivityStatus> _statusController;
  StreamSubscription? _subscription;

  ConnectivityMonitor() : _statusController = BehaviorSubject.seeded(
    ConnectivityStatus.unknown,
  );

  Stream<ConnectivityStatus> get status => _statusController.stream;
  ConnectivityStatus get current => _statusController.value;

  Future<void> initialize() async {
    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      final status = _mapConnectivity(results);
      _statusController.add(status);
    });
  }

  ConnectivityStatus _mapConnectivity(List<ConnectivityResult> results) {
    if (results.contains(ConnectivityResult.wifi) ||
        results.contains(ConnectivityResult.mobile) ||
        results.contains(ConnectivityResult.ethernet)) {
      return ConnectivityStatus.connected;
    }
    return ConnectivityStatus.disconnected;
  }

  Future<bool> hasInternetAccess() async {
    try {
      final result = await InternetAddress.lookup('google.com');
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  void dispose() {
    _subscription?.cancel();
    _statusController.close();
  }
}

enum ConnectivityStatus { connected, disconnected, unknown }
```

## SSL Pinning and Certificate Management

### Certificate Pinning

```dart
// Flutter SSL pinning with http client
class PinnedHttpClient extends BaseClient {
  final HttpClient _inner;
  final Set<List<int>> _pinnedHashes;
  final List<String> _allowedHosts;

  PinnedPinnedHttpClient({
    required Set<List<int>> pinnedHashes,
    required List<String> allowedHosts,
  })  : _pinnedHashes = pinnedHashes,
        _allowedHosts = allowedHosts,
        _inner = HttpClient()
          ..badCertificateCallback = (cert, host, port) {
            return _validateCertificate(cert, host);
          };

  bool _validateCertificate(X509Certificate cert, String host) {
    if (!_allowedHosts.contains(host)) return false;
    final sha256 = sha256.convert(cert.der).bytes;
    return _pinnedHashes.contains(sha256);
  }

  @override
  Future<StreamedResponse> send(BaseRequest request) async {
    return _inner.send(request);
  }
}
```

```swift
// iOS SSL pinning with URLSession delegate
class PinnedURLSessionDelegate: NSObject, URLSessionDelegate {
    private let pinnedHashes: Set<String>
    private let allowedHosts: Set<String>

    init(pinnedHashes: Set<String>, allowedHosts: Set<String>) {
        self.pinnedHashes = pinnedHashes
        self.allowedHosts = allowedHosts
    }

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge
    ) async -> (URLSession.AuthChallengeDisposition, URLCredential?) {
        guard let serverTrust = challenge.protectionSpace.serverTrust,
              challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust else {
            return (.performDefaultHandling, nil)
        }

        guard let cert = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            return (.cancelAuthenticationChallenge, nil)
        }

        let remoteHost = challenge.protectionSpace.host
        guard allowedHosts.contains(remoteHost) else {
            return (.cancelAuthenticationChallenge, nil)
        }

        // Compute SHA-256 of certificate
        var data = SecCertificateCopyData(cert) as Data
        var hash = Data(SHA256.hash(data: data))
        let hashString = hash.map { String(format: "%02x", $0) }.joined()

        guard pinnedHashes.contains(hashString) else {
            return (.cancelAuthenticationChallenge, nil)
        }

        return (.useCredential, URLCredential(trust: serverTrust))
    }
}
```

## Key Points

- Repository pattern abstracts data sources behind a unified interface with offline-first fallback behavior
- API client abstraction with platform-specific implementations (Dio, Axios, URLSession) ensures consistent request/response handling
- Interceptor chain handles auth token injection, transparent 401 retry, logging, and error mapping
- Retry with exponential backoff and jitter prevents thundering herd on transient failures (429, 5xx)
- Request queue manager with priority levels and concurrency limits prevents resource exhaustion
- Connectivity monitor provides real-time network status with internet access verification
- SSL pinning with certificate hash validation prevents man-in-the-middle attacks
- Error mapping converts HTTP errors to domain-specific types (UnauthorizedError, ServerError, NetworkError)
