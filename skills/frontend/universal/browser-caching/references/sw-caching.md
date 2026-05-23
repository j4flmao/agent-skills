# Service Worker Caching

## Lifecycle

```
Install -> Activate -> (Idle) -> Fetch
                        |
                    (new SW) -> Wait -> Activate -> (old SW deactivated)
```

```typescript
// install — pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('static-v2').then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/app.js',
        '/app.css',
        '/offline.html',
      ])
    )
  )
  self.skipWaiting()
})

// activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== 'static-v2')
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})
```

## Fetch Interception Patterns

```typescript
// Different strategies per URL pattern
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/')) {
    // API — stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request))
  } else if (url.pathname.match(/\.(js|css|png|jpg|woff2?)$/)) {
    // Static assets — cache first
    event.respondWith(cacheFirst(request))
  } else {
    // HTML — network first
    event.respondWith(networkFirst(request))
  }
})
```

## Offline Fallback

```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    networkFirst(event.request).catch(() => {
      // networkFirst failed — return offline page
      return caches.match('/offline.html')
    })
  )
})
```

## Background Sync

```typescript
// Register sync event (from main thread)
navigator.serviceWorker.ready.then((reg) => {
  reg.sync.register('sync-orders')
})

// Handle sync in SW
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders())
  }
})

async function syncPendingOrders() {
  const db = await openDB()
  const pending = await db.getAll('pending-orders')
  for (const order of pending) {
    await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

## Registration

```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.error('SW registration failed:', err))
  })
}
```

## SW Update Flow

```typescript
navigator.serviceWorker.register('/sw.js').then((reg) => {
  reg.addEventListener('updatefound', () => {
    const newSW = reg.installing
    newSW?.addEventListener('statechange', () => {
      if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
        // New SW installed, old one still active
        showUpdateBanner() // "New version available — refresh?"
      }
    })
  })
})
```

## Message Passing (SW ↔ Client)

```typescript
// Send from page
navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })

// Receive in SW
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Send from SW to clients
self.clients.matchAll().then((clients) => {
  clients.forEach((client) =>
    client.postMessage({ type: 'UPDATE_AVAILABLE' })
  )
})
```

## Cache Storage Limits

```typescript
// Estimate usage (Chrome)
const estimate = await navigator.storage.estimate()
console.log(`${estimate.usage} / ${estimate.quota} bytes used`)

// Persist storage to prevent eviction
const isPersisted = await navigator.storage.persist()
```
