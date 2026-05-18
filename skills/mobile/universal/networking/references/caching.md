# Mobile Caching

## Cache strategies

| Strategy | When | Behavior |
|----------|------|----------|
| Cache-first | Mostly offline | Return cache, refresh in bg |
| Network-first | Fresh data req | Return network, fallback to cache |
| Stale-while-revalidate | Performance | Return cache, refresh in bg |
| Network-only | Real-time | Never cache |

## HTTP caching

```dart
// Dio cache interceptor
class CacheInterceptor extends Interceptor {
  final Map<String, CacheEntry> _cache = {};

  @override
  void onRequest(options, handler) {
    final cached = _cache[options.path];
    if (cached != null && !cached.isExpired) {
      return handler.resolve(Response(
        requestOptions: options,
        data: cached.data,
        statusCode: 200,
      ));
    }
    handler.next(options);
  }

  @override
  void onResponse(response, handler) {
    _cache[response.requestOptions.path] = CacheEntry(
      data: response.data,
      expiresAt: DateTime.now().add(Duration(minutes: 5)),
    );
    handler.next(response);
  }
}
```

## TTL guidelines

| Data type | TTL |
|-----------|-----|
| User profile | 5 min |
| Orders list | 1 min |
| Product catalog | 30 min |
| Configuration | 1 hour |
| Reference data | 24 hours |
