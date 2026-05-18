# REST Client Setup

## Interceptor patterns

```dart
// Auth interceptor (Dio)
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Authorization'] = 'Bearer ${storage.read('token')}';
    handler.next(options);
  }
}
```

```typescript
// Axios interceptor
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Error handling

```kotlin
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val code: Int, val message: String) : ApiResult<Nothing>()
}
```

## Request logging

```swift
// Custom URLSession with logging
class LoggingURLProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override func startLoading() {
        print("[NETWORK] \(request.httpMethod!) \(request.url!)")
        // forward
    }
}
```
