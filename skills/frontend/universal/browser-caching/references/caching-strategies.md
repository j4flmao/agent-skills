# Caching Strategies

## Resource-Specific Strategy Map

| Resource | Strategy | Cache-Control | SW Behavior | Stale OK? |
|----------|----------|---------------|-------------|-----------|
| JS/CSS bundles | Cache-first | `max-age=31536000, immutable` | Pre-cache on install | Yes |
| Images | Cache-first | `max-age=31536000, immutable` | Cache on fetch | Yes |
| Fonts | Cache-first | `max-age=31536000, immutable` | Pre-cache | Yes |
| HTML pages | Network-first | `no-cache` | Network with offline fallback | Short-term |
| API responses | SWR | `max-age=60, stale-while-revalidate=600` | SWR handler | Yes (configurable) |
| User profile | Network-only | `private, no-cache` | Bypass cache | No |
| Search results | SWR | `max-age=300, stale-while-revalidate=3600` | SWR handler | Yes |
| Analytics | Network-only | `no-store` | Bypass | No |

## Cache Strategy Implementation Matrix

```typescript
// Cache-First: serve from cache, fall back to network
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open('static')
    cache.put(request, response.clone())
  }
  return response
}

// Network-First: try network, fall back to cache
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request)
    const cache = await caches.open('pages')
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? caches.match('/offline.html')
  }
}

// Stale-While-Revalidate: serve cache instantly, update in background
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open('api')
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone())
    return res
  })
  return cached ?? fetchPromise
}
```

## CDN Caching Strategy

```
┌──────────┐    Cache Hit    ┌──────────┐    Cache Miss    ┌──────────┐
│  Browser  │ ←───────────── │    CDN    │ ──────────────→ │  Origin  │
│  Cache    │                │   Cache   │                 │  Server  │
└──────────┘                └──────────┘                 └──────────┘
     │                            │                            │
     │  Cache-Control:            │  Surrogate-Control:       │
     │  max-age=3600              │  max-age=86400            │
     └────────────────────────────┴────────────────────────────┘
```

## Cache Invalidation Strategies

| Strategy | Mechanism | Trade-off |
|----------|-----------|-----------|
| Content hash | Filename contains hash of content | Perfect, requires build |
| Versioned URL | `/assets/v1/main.js` | Manual version bumps |
| Purge by tag | CDN API purge by cache tag | Complex, race conditions |
| Short TTL | `max-age=60` | More origin requests |
| Stale-while-revalidate | Serve stale, update in bg | Stale data window |

## Cache Key Design

```typescript
// Default cache key is request URL
// For API responses, vary by:
const cacheKey = new Request(url, {
  headers: {
    'Accept-Language': userLanguage,
    'Authorization': userNeedsAuth ? 'authenticated' : 'anonymous',
  },
})
```

## Cache Warming

```typescript
// Pre-populate cache after deploy
const CRITICAL_URLS = ['/', '/products', '/api/settings']

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all(
      CRITICAL_URLS.map(url =>
        fetch(url).then(res => {
          if (res.ok) {
            caches.open('warm').then(cache => cache.put(url, res))
          }
        })
      )
    )
  )
})
```

## Cache Size Management

```typescript
async function trimCache(cacheName: string, maxItems: number) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems)
    await Promise.all(toDelete.map(key => cache.delete(key)))
  }
}

// Called periodically
setInterval(() => trimCache('api', 50), 5 * 60 * 1000)
```

## Cache Debug Headers

```http
X-Cache: HIT   ← served from CDN edge cache
X-Cache: MISS  ← fetched from origin
Age: 123       ← seconds since cached
CF-Cache-Status: HIT  ← Cloudflare
```

Verify cache behavior in DevTools → Network tab. Check `Size` column: "(from disk cache)", "(from service worker)", or actual size from network.
