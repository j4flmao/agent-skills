---
name: mobile-networking
description: Cross-platform mobile networking — REST clients, GraphQL, offline-first architecture, caching, retry, interceptors, pagination, background sync.
---

# Mobile Networking

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

### Max Response Length
4096 tokens

## REST Client Setup

```dart
// Flutter: Dio
final dio = Dio(BaseOptions(
  baseUrl: 'https://api.example.com',
  connectTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 10),
));
dio.interceptors.add(AuthInterceptor());
dio.interceptors.add(RetryInterceptor());
dio.interceptors.add(LogInterceptor());
```

```typescript
// RN: Axios
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

```kotlin
// Android: Retrofit
interface OrderApi {
    @GET("orders")
    suspend fun getOrders(@Query("page") page: Int): List<OrderResponse>
}
```

```swift
// iOS: URLSession + async/await
func fetchOrders() async throws -> [Order] {
    let (data, _) = try await URLSession.shared.data(from: url)
    return try decoder.decode([Order].self, from: data)
}
```

## Offline-First

```
Request → Cache check → If cached: return + refresh in background
                       → If not cached: fetch from network → cache → return
On failure → return cached data if available
```

```dart
class OrderRepositoryImpl implements OrderRepository {
  @override
  Future<List<Order>> getOrders() async {
    try {
      final remote = await remoteDataSource.fetchOrders();
      await localDataSource.cacheOrders(remote);
      return remote.map((e) => e.toEntity()).toList();
    } catch (_) {
      final cached = await localDataSource.getCachedOrders();
      if (cached.isNotEmpty) return cached.map((e) => e.toEntity()).toList();
      rethrow;
    }
  }
}
```

## Pagination

```dart
// Cursor-based
class OrderPagination {
  final int limit = 20;
  String? cursor;
  bool hasMore = true;

  Future<List<Order>> loadNext() async {
    if (!hasMore) return [];
    final response = await api.getOrders(cursor: cursor, limit: limit);
    cursor = response.nextCursor;
    hasMore = response.hasMore;
    return response.orders;
  }
}
```

## References

### Reference Files
- `references/rest-client.md` — interceptors, error handling, auth headers
- `references/offline-first.md` — cache strategy, sync queue, conflict resolution
- `references/caching.md` — HTTP caching, TTL, invalidation, cache-first vs network-first

### Related Skills
- `mobile/universal/security/SKILL.md` — secure networking, certificate pinning
- `mobile/universal/storage/SKILL.md` — local cache persistence

## Handoff

Hand off to stack-specific skill for implementation.
