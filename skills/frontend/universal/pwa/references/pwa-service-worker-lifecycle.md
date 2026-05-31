# PWA Service Worker Lifecycle

## Overview

The service worker lifecycle is the most critical concept in PWA development. Understanding install, activate, fetch, message, push, and sync events — and how they interact with cache versioning, update flows, and client control — is essential for building reliable offline experiences.

## Lifecycle States

### Flow Diagram

```
Registered (installing)
    |
    v
Installing (install event)
    |
    ├── install fails → Redundant
    |
    v
Installed (waiting)
    |
    ├── skipWaiting() called
    |       OR
    ├── All clients closed → new SW takes over
    |
    v
Activating (activate event)
    |
    v
Activated (fetch/message events)
    |
    ├── New version registered → Downloading
    |       |
    |       v
    |   Installing (new)
    |       |
    |       v
    |   Installed (waiting)
    |
    v
Redundant (when newer version activates)
```

### State Transitions

```javascript
// Listen for SW state changes from the client
navigator.serviceWorker.register('/sw.js').then((registration) => {
  console.log('SW state:', registration.active?.state)

  if (registration.installing) {
    registration.installing.addEventListener('statechange', () => {
      console.log('State:', registration.installing.state)
      // 'installing' -> 'installed' -> 'activating' -> 'activated'
    })
  }
})
```

## Install Event

### Purpose

The `install` event fires when the browser downloads and executes the service worker file. Use it to precache critical assets.

```javascript
const CACHE_VERSION = 'v2'
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/styles/main.abcd1234.css',
  '/scripts/main.wxyz5678.js',
  '/fonts/inter-var.woff2',
  '/images/logo.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})
```

### Best Practices for Install

- Keep precache list small (core shell only, not every page).
- Use content-hashed URLs for cache-busting.
- If precaching fails (e.g., a resource 404s), the entire install fails. Validate URLs.
- Call `self.skipWaiting()` to activate immediately instead of waiting for reload.
- Do NOT put heavy computation in install — it delays the lifecycle.

### Install Error Handling

```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to precache ${url}:`, err)
              return null
            })
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})
```

## Activate Event

### Purpose

The `activate` event fires after install, when the old SW is no longer controlling any clients. Use it to clean up old caches and take control of clients.

```javascript
self.addEventListener('activate', (event) => {
  const expectedCaches = [CACHE_VERSION, 'api-v1', 'images-v1']

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !expectedCaches.includes(name))
          .map((name) => {
            console.log(`Deleting old cache: ${name}`)
            return caches.delete(name)
          })
      )
    }).then(() => self.clients.claim())
  )
})
```

### Cache Cleanup Strategy

```javascript
async function cleanupCaches() {
  const cacheNames = await caches.keys()
  const deletionPromises = []

  for (const name of cacheNames) {
    // Delete caches not matching current version pattern
    if (name.startsWith('static-') && name !== `static-${CACHE_VERSION}`) {
      deletionPromises.push(caches.delete(name))
    }
    if (name.startsWith('images-') && name !== `images-${CACHE_VERSION}`) {
      deletionPromises.push(caches.delete(name))
    }
  }

  return Promise.all(deletionPromises)
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    cleanupCaches().then(() => self.clients.claim())
  )
})
```

### clients.claim()

`self.clients.claim()` immediately makes the SW control all uncontrolled clients (tabs). Without it, pages loaded before the SW activates won't use the SW until the next navigation.

## Fetch Event

### Purpose

The `fetch` event intercepts all network requests from controlled pages. This is where caching strategies are implemented.

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip browser extension requests
  if (!url.protocol.startsWith('http')) return

  // Different strategies based on URL patterns
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request))
  } else if (url.pathname.match(/\.(js|css|woff2?)$/)) {
    event.respondWith(cacheFirstStrategy(request))
  } else if (url.pathname.match(/\.(png|jpg|webp|svg)$/)) {
    event.respondWith(cacheFirstStrategy(request))
  } else {
    event.respondWith(networkFirstStrategy(request))
  }
})
```

### Navigation Handling

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline'))
    )
  }
})
```

## Update Flow

### How Updates Work

```javascript
// Client-side update detection
let registration = null

async function registerSW() {
  if (!('serviceWorker' in navigator)) return

  registration = await navigator.serviceWorker.register('/sw.js', {
    updateViaCache: 'none', // Always check for updates
  })

  // Check for updates on page load and periodically
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing
    console.log('New SW found:', newWorker.state)

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New version available, show update prompt
        showUpdatePrompt(registration)
      }
    })
  })

  // Periodic update check
  setInterval(() => {
    registration.update()
  }, 60 * 60 * 1000) // Check every hour
}
```

### Update Prompt UI

```javascript
function showUpdatePrompt(registration) {
  const banner = document.createElement('div')
  banner.className = 'update-banner'
  banner.innerHTML = `
    <p>New version available</p>
    <button id="update-btn">Update</button>
    <button id="dismiss-btn">Dismiss</button>
  `

  document.body.appendChild(banner)

  document.getElementById('update-btn').addEventListener('click', () => {
    registration.waiting.postMessage('SKIP_WAITING')
    window.location.reload()
  })

  document.getElementById('dismiss-btn').addEventListener('click', () => {
    banner.remove()
  })
}
```

### Handling the SKIP_WAITING Message

```javascript
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
```

### Forced Update (Without User Consent)

Use only for critical updates (security patches):

```javascript
registration.addEventListener('updatefound', () => {
  const newWorker = registration.installing
  newWorker.addEventListener('statechange', () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      // Force update without user consent
      registration.waiting.postMessage('SKIP_WAITING')
      window.location.reload()
    }
  })
})
```

## Message Events

### Client to SW

```javascript
// Client side
navigator.serviceWorker.controller.postMessage({
  type: 'CACHE_URL',
  url: '/api/data',
})

// SW side
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_URL') {
    caches.open('dynamic-v1').then((cache) => {
      cache.add(event.data.url)
    })
  }
})
```

### SW to Client

```javascript
// SW side — send message to all clients
self.clients.matchAll().then((clients) => {
  clients.forEach((client) => {
    client.postMessage({
      type: 'CACHE_UPDATED',
      url: cachedUrl,
    })
  })
})

// Client side
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_UPDATED') {
    console.log('Cache updated for:', event.data.url)
  }
})
```

### SW to Specific Client

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then((response) => {
      // Clone the response so we can cache it
      const clonedResponse = response.clone()

      caches.open('api-v1').then((cache) => {
        cache.put(event.request, clonedResponse)
      })

      // Notify the specific client that data was cached
      event.clientId && self.clients.get(event.clientId).then((client) => {
        client.postMessage({
          type: 'DATA_CACHED',
          url: event.request.url,
        })
      })

      return response
    })
  )
})
```

## Push Events

### Receiving Push Notifications

```javascript
self.addEventListener('push', (event) => {
  let data = null

  try {
    data = event.data.json()
  } catch {
    data = {
      title: 'New Update',
      body: event.data.text(),
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})
```

### Notification Click Handler

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const url = event.notification.data.url

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If a tab with the URL exists, focus it
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }

        // Otherwise, open new tab
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
```

## Sync Events (Background Sync)

### Registering a Sync

```javascript
// Client side
async function registerSync() {
  const registration = await navigator.serviceWorker.ready

  try {
    await registration.sync.register('sync-pending-data')
    console.log('Background sync registered')
  } catch (err) {
    console.error('Background sync failed:', err)
    // Fallback: try to sync immediately
    await syncData()
  }
}
```

### Handling a Sync Event

```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData())
  }
})

async function syncPendingData() {
  const db = await openDB('offline-store', 1)
  const pendingItems = await db.getAll('pending')

  for (const item of pendingItems) {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(item),
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        await db.delete('pending', item.id)
      }
    } catch (err) {
      console.error('Sync failed for item:', item.id, err)
      // Sync will be retried automatically
    }
  }
}
```

### Periodic Background Sync

```javascript
// Client side — request periodic sync
const registration = await navigator.serviceWorker.ready
await registration.periodicSync.register('content-sync', {
  minInterval: 24 * 60 * 60 * 1000, // Once per day
})

// SW side
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(refreshContentCache())
  }
})
```

## Debugging Lifecycle

### Chrome DevTools

```
Application > Service Workers panel:
  - Shows all registered SWs
  - Offline checkbox
  - Update on reload checkbox
  - Bypass for network checkbox
  - Each SW's status and clients
  - Push and Sync test buttons

Application > Cache Storage:
  - View and delete cache contents
  - Inspect cached responses
```

### Dev Logging

```javascript
// Add to SW file during development
const DEV = self.location.hostname === 'localhost'

self.addEventListener('install', (event) => {
  if (DEV) console.log('[SW] Install event')
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        if (DEV) console.log('[SW] Precaching:', PRECACHE_URLS)
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  if (DEV) console.log('[SW] Activate event')
  // ...
})

self.addEventListener('fetch', (event) => {
  if (DEV) console.log('[SW] Fetch:', event.request.url)
  // ...
})
```

### Update Testing

```javascript
// Force update check in DevTools console
navigator.serviceWorker.register('/sw.js').then((reg) => {
  reg.update()
})

// Or check update status
navigator.serviceWorker.getRegistration().then((reg) => {
  console.log('Update found:', reg.installing !== null)
  console.log('Waiting:', reg.waiting !== null)
  console.log('Active:', reg.active !== null)
})
```

## Lifecycle Timing

| Event | Typical Timing | Purpose |
|-------|---------------|---------|
| Download | First visit + when SW file changes | Browser fetches sw.js |
| Install | After download | Precache assets |
| Activate | After all old SW clients close | Clean old caches, claim clients |
| Fetch | Every controlled request | Serve cached/network responses |
| Message | When client posts message | Communication channel |
| Push | When server sends push | Display notification |
| Sync | When browser decides | Retry failed operations |
| PeriodicSync | Scheduled interval | Background content refresh |
| NotificationClick | When user clicks notification | Navigate or action |

## Lifecycle Rules

- SW file must be at the root of the scope (or use Service-Worker-Allowed header).
- SW file changes are detected by byte comparison — even a single character change triggers update flow.
- Install fails if any precached resource fails — handle errors with Promise.allSettled.
- Activate does not run until all clients of the old SW are closed (unless skipWaiting).
- Without clients.claim(), already-open pages won't use the new SW until next navigation.
- The SW is killed after ~30 seconds of inactivity (after event handlers complete).
- Use event.waitUntil() to extend the SW's lifetime during async operations.
