---
name: mobile-networking
description: >
  Use this skill when the user asks about mobile networking, REST client, GraphQL,
  offline-first, API caching, retry, pagination, background sync, or API
  interceptors.
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
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

——

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up HTTP Client
Configure platform-specific client (Dio, Axios, Retrofit, URLSession) with base URL, timeouts, and default headers.

### Step 2: Add Interceptors
Implement auth token injection, retry on 401, request logging, and error transformation interceptors.

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
  - references/caching.md — Mobile Caching
  - references/graphql-mobile.md — Mobile GraphQL Integration
  - references/mobile-networking-patterns.md — Mobile Networking Patterns
  - references/network-layer-architecture.md — Cross-Platform Network Layer Architecture
  - references/offline-first.md — Offline-First Architecture
  - references/rest-client.md — REST Client Setup
## Handoff

Hand off to stack-specific skill for implementation.
