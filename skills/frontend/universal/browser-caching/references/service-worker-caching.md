# Service Worker Caching

## Service Worker Registration

```typescript
function registerServiceWorker(swPath: string): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported')
  }

  return navigator.serviceWorker.register(swPath, {
    scope: '/',
    updateViaCache: 'none',
  })
}

async function setupServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await registerServiceWorker('/sw.js')

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification(registration)
        }
      })
    }
  })

  return registration
}
```

## Cache Strategies

```typescript
// Cache First
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
  }
  return response
}

// Network First
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const response = await fetch(request)
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    throw new Error('Offline and no cached response')
  }
}

// Stale While Revalidate
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(async response => {
    if (response.ok) {
      await cache.put(request, response.clone())
    }
    return response
  }).catch(() => cached)

  return cached || fetchPromise
}
```

## Cache Versioning

```typescript
const CACHE_VERSION = 'v2'
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  fonts: `fonts-${CACHE_VERSION}`,
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !Object.values(CACHE_NAMES).includes(name))
          .map(name => caches.delete(name))
      )
    })
  )
})
```

## Background Sync

```typescript
async function queueRequest(request: Request): Promise<void> {
  const queue = await getBackgroundSyncQueue('pending-requests')
  await queue.push({
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: await request.clone().text(),
  })
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(processQueue())
  }
})

async function processQueue(): Promise<void> {
  const queue = await getBackgroundSyncQueue('pending-requests')
  while (queue.length > 0) {
    const entry = await queue.shift()
    try {
      await fetch(entry.url, {
        method: entry.method,
        headers: new Headers(entry.headers),
        body: entry.body,
      })
    } catch {
      await queue.unshift(entry)
      break
    }
  }
}
```

## Key Points

- Register service workers early but update after page load
- Implement appropriate cache strategies per resource type
- Version cache names and clean up old caches on activate
- Use Cache First for immutable assets (versioned bundles)
- Use Network First for dynamic API responses
- Use Stale While Revalidate for frequently updated resources
- Implement background sync for offline request queuing
- Handle service worker lifecycle with update notifications
- Test service worker behavior in incognito mode
- Provide offline fallback pages for navigation requests
- Limit cache storage to prevent quota issues
- Use Workbox for complex caching strategies
