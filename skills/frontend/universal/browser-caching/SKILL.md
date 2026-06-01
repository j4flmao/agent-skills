---
name: frontend-browser-caching
description: >
  Use this skill when the user says 'browser caching', 'cache headers', 'service worker', 'SW', 'stale-while-revalidate', 'SWR', 'cache strategy', 'Cache-Control', 'ETag', 'cache busting', 'offline caching', or when optimizing frontend load performance. This skill enforces: Cache-Control headers with appropriate max-age, service worker caching with stale-while-revalidate pattern, cache-busted asset URLs, and offline fallback. Works with any frontend framework. Do NOT use for: backend response caching, CDN configuration, database query caching.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, caching, performance, universal]
---

# Browser Caching

## Purpose
Optimize load performance via HTTP cache headers, service worker caching, and stale-while-revalidate. Minimize network round-trips while serving fresh content. First load under 2s, repeat loads under 500ms. Full offline support for static assets.

## Agent Protocol

### Trigger
Exact user phrases: "browser caching", "cache headers", "service worker", "SW", "stale-while-revalidate", "SWR", "cache strategy", "Cache-Control", "ETag", "cache busting", "offline caching".

### Input Context
Before activating, verify:
- Whether the focus is HTTP cache headers, service worker, or both.
- The build tool (Vite, Webpack, Next.js) for cache-busting config.

### Output Artifact
No file output. Produces caching strategy, header configs, or service worker code as text.

### Response Format
```
Resource: {type}
Strategy: {cache strategy}
Config: {code block}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Static assets use `Cache-Control: public, max-age=31536000, immutable`.
- [ ] HTML uses `Cache-Control: no-cache` for freshness validation.
- [ ] API responses use appropriate `Cache-Control` or `ETag`.
- [ ] Service worker registers and caches static assets on install.
- [ ] Stale-while-revalidate pattern for data fetching.
- [ ] Cache-busting via content hashes in filenames.

### Max Response Length
4096 tokens.

## Component Architecture / Decision Trees

### Cache Strategy Decision Tree

```
Resource type?
  |-- Static asset (JS, CSS, image, font) -->
  |     |-- Content-hashed filename?
  |     |     |-- YES --> Cache-Control: public, max-age=31536000, immutable
  |     |     |-- NO  --> Add content hashing to build tool
  |-- HTML page -->
  |     |-- Static / pre-rendered? --> Cache-Control: public, max-age=300 (5 min), ETag
  |     |-- Dynamic / user-specific? --> Cache-Control: no-cache, private
  |-- API response -->
  |     |-- Public / shareable? --> Cache-Control: public, max-age=60, stale-while-revalidate=600
  |     |-- User-specific? --> Cache-Control: private, no-cache
  |-- Third-party resource -->
        |-- CDN-hosted? --> Use the CDN's cache headers, add integrity hash
```

### Cache Location Decision Tree

```
Where should the response be cached?
  |-- Browser (private cache) -->
  |     |-- Static asset: Cache-Control: private, max-age=31536000
  |     |-- Auth response: Cache-Control: private, no-cache
  |-- CDN / proxy (shared cache) -->
  |     |-- Public page: Cache-Control: public, s-maxage=3600, max-age=60
  |     |-- API response: Cache-Control: public, s-maxage=300
  |-- Service worker -->
        |-- Install-time: Precache all versioned assets
        |-- Runtime: Stale-while-revalidate for API + HTML
```

### Cache Invalidation Decision Tree

```
Content changed — how to invalidate?
  |-- Static asset changed -->
  |     |-- Content hash in URL? --> New URL = automatic invalidation
  |     |-- No hash? --> Versioned path (/v2/asset.js) or query string (?v=2)
  |-- API response changed -->
  |     |-- Use ETag? --> Conditional request validates freshness
  |     |-- No ETag? --> Short max-age or no-cache
  |-- HTML page changed -->
        |-- Use revalidation? --> no-cache + ETag = instant freshness check
        |-- Use CDN? --> Purge CDN cache for that path
```

### Service Worker Architecture Options

**Option A: Cache-first for static assets, network-first for HTML**
Best for: Content-heavy sites where assets change rarely. Provides offline capability.
```
Install: precache all static assets
Fetch: serve from cache, update in background (stale-while-revalidate)
HTML: network first, fallback to cache
API: stale-while-revalidate
```

**Option B: Network-first with cache fallback**
Best for: Dynamic apps where freshness is critical (dashboards, admin panels).
```
Install: precache shell (minimal HTML, CSS, JS)
Fetch: HTML and API always from network
Static assets: cache-first
Fallback: cached offline page
```

**Option C: Offline-first (fully cached)**
Best for: Progressive Web Apps that must work entirely offline.
```
Install: precache everything needed for full functionality
Fetch: cache-first for all resources, periodic background sync
API: IndexedDB local cache with background sync when online
```

## Workflow

### Step 1: HTTP Cache Headers by Resource Type
```http
# Static assets (JS, CSS, images, fonts)
Cache-Control: public, max-age=31536000, immutable

# HTML pages
Cache-Control: no-cache
ETag: "abc123"

# API responses
Cache-Control: public, max-age=60, stale-while-revalidate=600

# User-specific content
Cache-Control: private, no-cache
```

### Step 2: Service Worker Install & Cache
```typescript
const CACHE_NAME = 'static-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css',
  '/logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})
```

### Step 3: Stale-While-Revalidate Fetch Handler
```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()))
        }
        return response
      })
      return cached ?? fetchPromise
    })
  )
})
```

### Step 4: Cache Busting with Content Hash
```typescript
// Vite -- automatic content hashing
// build.rollupOptions.output.entryFileNames: '[name]-[hash].js'

// Webpack
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].js',
}

// Import will resolve to cache-busted URL
import('/assets/app-abc123def.js')
```

### Step 5: Cache Strategy Decision Table
| Resource | Strategy | Cache-Control | SW Behavior |
|----------|----------|---------------|-------------|
| JS/CSS bundles | Cache-first | `max-age=31536000, immutable` | Pre-cache on install |
| Images | Cache-first | `max-age=31536000, immutable` | Cache on first fetch |
| HTML pages | Network-first | `no-cache` | Network with fallback |
| API data | SWR | `max-age=60, stale-while-revalidate=600` | Stale-while-revalidate |
| User data | Network-only | `private, no-cache` | Bypass cache |

### Step 6: Offline Fallback Page
```html
<!-- offline.html -->
<!DOCTYPE html>
<html>
<head><title>Offline</title></head>
<body>
  <h1>You are offline</h1>
  <p>Please check your connection and try again.</p>
  <button onclick="location.reload()">Try again</button>
</body>
</html>
```

```typescript
// In service worker fetch handler
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
      .catch(() => caches.match('/offline.html'))
  )
})
```

### Step 7: Workbox Configuration
```javascript
// workbox-config.js
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,png,jpg,svg,woff2}'],
  swDest: 'dist/sw.js',
  runtimeCaching: [
    {
      urlPattern: /\/api\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 86400 },
      },
    },
  ],
}
```

### Step 8: Browser Caching Architecture

```
[Browser Request]
     |
     v
[Service Worker] --(not registered)--> [HTTP Cache]
     |                                       |
     |-- Cache hit? --> Return cached         |-- max-age fresh? --> Return cached
     |-- No cache? --> Fetch from network     |-- no-cache? --> [Server] (conditional via ETag)
          |                                       |
          v                                       v
     [Network Response]                      [Network Response]
          |                                       |
          v                                       v
     [Cache Update]                          [Cache Update]
```

### Step 9: Cache Partitioning
Modern browsers partition HTTP caches by site (top-level origin + frame origin). This means:
- Cache keys include both the requesting site and the resource origin
- A resource cached by site-a cannot be read by site-b even if same URL
- Benefits: privacy (no cross-site cache snooping)
- Tradeoffs: cache miss rate increases, more network requests
- Mitigation: use service worker for shared resources (fonts, libraries) across same-origin apps

### Step 10: Memory vs Disk Cache
- **Memory Cache**: Fastest, cleared on tab close. Holds current page's resources.
- **Disk Cache**: Persistent across sessions, slower than memory.
- Browsers automatically decide which cache to use (memory = recently used, disk = everything else).
- Service worker cache is separate from HTTP cache — always disk-backed.
- To control: Service Worker Cache API gives full control. HTTP Cache-Control is advisory.

## Common Pitfalls

### 1. Missing immutable Directive
`Cache-Control: public, max-age=31536000` without `immutable` causes browsers to revalidate on every page reload (Cmd+R) even though the asset has a content hash. Always add `immutable` for content-hashed assets.

### 2. Caching HTML Without Revalidation
Setting `max-age` on HTML without `ETag` means users see stale content until the cache expires. Use `no-cache` with `ETag` for HTML to ensure freshness while still allowing conditional requests.

### 3. Over-caching User-Specific Content
Setting `Cache-Control: public` on authenticated API responses means a shared cache (CDN, proxy) serves the same response to all users. Always use `private` for user-specific data.

### 4. Service Worker Update Without Version Bump
If you update the service worker's cached assets but don't change the cache name (`CACHE_NAME`), the old cache is not cleaned up and new assets are never cached. Always bump the version in the cache name on each deploy.

```typescript
// BAD -- same cache name, updates never applied
const CACHE_NAME = 'static-v1';

// GOOD -- versioned cache name
const CACHE_NAME = `static-v${new Date().getTime()}`;
// Or use a build-time constant
// const CACHE_NAME = `static-v${__CACHE_VERSION__}`;
```

### 5. Service Worker Blocking Updates
Without `skipWaiting()` in the install event, the new service worker waits for all tabs of the old service worker to close before activating. This delays updates indefinitely.

### 6. Cache Poisoning from Invalid Responses
The fetch handler caches ALL responses, including 404 and 500 errors. Only cache `response.ok` responses:

```typescript
const fetchPromise = fetch(event.request).then((response) => {
  if (response.ok) {
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()))
  }
  return response
})
```

### 7. Not Handling Opaque Responses
Cross-origin responses without CORS headers are "opaque" — they return status 0 and cannot be inspected with `.ok`. Cache them anyway for offline support:
```typescript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('cdn.example.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()))
          return response
        })
        return cached || fetchPromise
      })
    )
  }
})
```

### 8. Exceeding Storage Quota
Each origin has limited cache storage (~6% of disk in Chrome). Beyond this, `caches.put()` throws a QuotaExceededError. Always set maximum cache sizes.

## Compared With

| Strategy | Freshness | Speed | Offline | Complexity |
|----------|-----------|-------|---------|------------|
| Cache-first (immutable) | Stale until expiry | Fastest | Yes | Low |
| Network-first | Always fresh | Slow (network dependent) | Yes | Medium |
| Stale-while-revalidate | Stale served, fresh in background | Very fast (instant) | Yes | Medium |
| Network-only | Always fresh | Slowest | No | Low |
| Cache-only | Stale until expiry | Fastest | Yes | Low |
| Service worker + IndexedDB | Background sync | Fast (local) | Full | High |

## Performance Considerations

### Cache Hit Ratio Targets
- Static assets: 99%+ cache hit ratio (content hashing ensures cacheable URLs)
- HTML pages: 80%+ (ETag enables conditional revalidation)
- API responses: 60-90% depending on data freshness requirements

### Cache Size Management
Service worker caches can grow unbounded. Set a maximum cache size:

```typescript
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Call after adding to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cloned);
          trimCache(CACHE_NAME, 50); // Keep max 50 cached entries
        });
      }
      return response;
    })
  );
});
```

### Storage Quota Limits
Browsers limit storage per origin:
- Chrome: ~60% of available disk space
- Firefox: ~50% of available disk space
- Safari: ~1GB (on iOS), ~500MB (on macOS)
- Edge: same as Chrome

Use `navigator.storage.estimate()` to check available and used storage.

### Performance Budget Targets
- Initial load (cold cache): < 2s to interactive
- Repeat load (warm cache): < 500ms to interactive
- Cache hit ratio: > 95% for static assets
- Service worker install: < 3s on 3G
- Storage used: < 50MB for typical application

## Browser Compatibility

- **Cache-Control immutable**: Chrome, Firefox, Edge. Safari supports since iOS 16/macOS Ventura.
- **Service Worker**: All modern browsers except IE11. Partial support in Samsung Internet.
- **Cache-Control stale-while-revalidate**: Chrome, Firefox, Edge. Limited Safari support.
- **Private Cache-Control**: All modern browsers.

## Ecosystem & Tooling

### Service Worker Libraries
- **Workbox** -- Google's service worker library. High-level caching strategies, precaching, background sync, routing. Recommended for most projects.
- **Workbox Webpack Plugin** -- Generates service worker config from Webpack build.
- **vite-plugin-pwa** -- Vite plugin based on Workbox. Zero-config PWA setup.
- **next-pwa** -- Next.js plugin for service worker generation.
- **sw-precache / sw-toolbox** -- Legacy Workbox predecessors. Avoid in new projects.

### CDN and Reverse Proxy
- **Cloudflare** -- Cache rules, Argo Smart Routing, automatic static asset optimization.
- **Fastly** -- Instant purge, VCL-based cache control.
- **Vercel Edge Network** -- Automatic cache optimization for Next.js.
- **AWS CloudFront** -- Lambda@Edge for custom caching logic.
- **Nginx** -- `expires` and `add_header Cache-Control` directives.

### Monitoring
- Chrome DevTools > Network > Size column shows cache source (memory cache / disk cache / service worker / network)
- `navigator.storage.estimate()` shows storage usage
- Workbox generates debug logs in development mode
- Lighthouse "uses efficient cache policy" audit

## Security Considerations

- Never cache responses with `Set-Cookie` headers in shared caches (CDN, proxy).
- Use `Cache-Control: private` for authenticated content.
- Service workers can intercept and modify requests — use SRI hashes on cached scripts to verify integrity.
- Cache poisoning: validate response status before caching.
- Opaque responses from CDNs may fail silently — test offline behavior.
- `Clear-Site-Data` header can clear cache on logout.

## Rules
- Static assets: `immutable` + `max-age=1 year` + content hash in filename.
- HTML: `no-cache` with `ETag` -- never cache HTML without revalidation.
- Service worker: update version (cache name) on every deploy.
- SWR: serve cached instantly, fetch fresh in background, update cache.
- Never cache user-specific or sensitive data in shared caches.
- Use `Cache-Control: private` for authenticated responses.
- Always validate cache responses for status 200 before caching.
- Cap cache size to prevent quota exceeded errors.
- Use Workbox for production service workers (avoid raw SW code).
- Register SW with `updateViaCache: 'none'` to prevent SW script caching.

## References

- `references/cache-strategies.md` -- Cache Strategies
- `references/caching-headers.md` -- Caching Headers
- `references/caching-strategies.md` -- Caching Strategies
- `references/local-storage-strategies.md` -- Local Storage and Cache Strategies
- `references/service-worker-caching.md` -- Service Worker Caching
- `references/sw-caching.md` -- Service Worker Caching
- `references/service-worker-caching.md` -- Service Worker Caching Patterns
- `references/cache-invalidation-strategies.md` -- Cache Invalidation Strategies

## Handoff
No artifact produced.
Next skill: `performance` -- combine caching with other perf optimization.
Carry forward: cache strategy per resource type, SW cache name version, hash config.
