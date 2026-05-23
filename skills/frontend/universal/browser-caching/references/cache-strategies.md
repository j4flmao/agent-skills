# Cache Strategies

## Strategy Reference

| Strategy | Speed | Freshness | Use Case |
|----------|-------|-----------|----------|
| Cache First | Instant | Might be stale | Static assets, images |
| Network First | Slow on bad network | Always fresh | HTML pages, API |
| Stale-While-Revalidate | Instant | Fresh after background fetch | API data, non-critical content |
| Network Only | Depends on network | Always fresh | User-specific data, forms |
| Cache Only | Instant | Stale after deploy | Offline fallback page |

## Cache First

```typescript
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open('dynamic-v1')
    cache.put(request, response.clone())
  }
  return response
}
```

## Network First

```typescript
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request)
    const cache = await caches.open('pages-v1')
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return caches.match('/offline.html')
  }
}
```

## Stale-While-Revalidate (SWR)

```typescript
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open('api-v1')
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  })

  return cached ?? fetchPromise
}
```

## Cache Race (Fastest)

```typescript
function cacheRace(request: Request): Promise<Response> {
  const cacheResponse = caches.match(request)
  const networkResponse = fetch(request).then((res) => {
    if (res.ok) {
      caches.open('race-v1').then((c) => c.put(request, res.clone()))
    }
    return res
  })

  return Promise.race([cacheResponse, networkResponse]).then((r) => r ?? networkResponse)
}
```

## Cache-Control Directive Reference

| Directive | Meaning |
|-----------|---------|
| `public` | May be cached by any cache (CDN, proxy, browser) |
| `private` | May be cached only by browser |
| `no-cache` | Must revalidate with origin before using cached copy |
| `no-store` | Must not be cached at all |
| `max-age=N` | Cache considered fresh for N seconds |
| `immutable` | Content never changes during max-age |
| `stale-while-revalidate=N` | Serve stale for N seconds while re-fetching in background |
| `stale-if-error=N` | Serve stale for N seconds if origin errors |
| `must-revalidate` | Once stale, must revalidate before reuse |

## ETag and If-None-Match

```http
# Response
ETag: "abc123"

# Request (conditional)
If-None-Match: "abc123"

# Response if unchanged
HTTP/1.1 304 Not Modified
```

## Last-Modified and If-Modified-Since

```http
# Response
Last-Modified: Wed, 21 Oct 2023 07:28:00 GMT

# Request (conditional)
If-Modified-Since: Wed, 21 Oct 2023 07:28:00 GMT

# Response if unchanged
HTTP/1.1 304 Not Modified
```

## Vary Header

```http
# Cache varies based on Accept-Encoding
Vary: Accept-Encoding

# Cache varies based on Accept-Language
Vary: Accept-Language

# Multiple dimensions
Vary: Accept-Encoding, Accept-Language, Cookie
```
