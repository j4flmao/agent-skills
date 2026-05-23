# Caching Strategies Reference

## Strategy Overview

| Strategy | Behavior | Best For | Cache Freshness |
|----------|----------|----------|-----------------|
| CacheFirst | Serve from cache, never hit network | Versioned static assets | Stale (acceptable) |
| NetworkFirst | Try network, fall back to cache | HTML pages, API calls | Fresh (preferred) |
| StaleWhileRevalidate | Serve cached instantly, update in bg | User content, CDN resources | Trade-off |
| NetworkOnly | Always hit network | Mutations (POST/PUT/DELETE) | Always fresh |
| CacheOnly | Never hit network | Static shell | Stale (acceptable) |

## Strategy Selection by Resource Type

| Resource | Strategy | Cache Name | Max Age | Max Entries |
|----------|----------|------------|---------|-------------|
| JS/CSS bundles (content-hash) | CacheFirst | static-v1 | 30 days | 100 |
| Build images (content-hash) | CacheFirst | images-v1 | 30 days | 60 |
| Fonts (versioned) | CacheFirst | fonts-v1 | 365 days | 10 |
| HTML pages (navigations) | NetworkFirst | pages-v1 | 1 day | 30 |
| API GET requests | NetworkFirst | api-v1 | 1 day | 50 |
| User avatars | StaleWhileRevalidate | avatars-v1 | 7 days | 100 |
| Third-party CDN scripts | StaleWhileRevalidate | cdn-v1 | 7 days | 30 |
| POST/PUT/DELETE | NetworkOnly | — | — | — |

## CacheFirst

```js
// Workbox
new workbox.strategies.CacheFirst({
  cacheName: 'static-v1',
  plugins: [
    new workbox.cacheableResponse.Plugin({ statuses: [0, 200] }),
    new workbox.expiration.Plugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
  ],
});

// Vanilla SW
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
```

## NetworkFirst

```js
// Workbox with timeout
new workbox.strategies.NetworkFirst({
  cacheName: 'api-v1',
  networkTimeoutSeconds: 3,
  plugins: [new workbox.expiration.Plugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })],
});

// Vanilla SW
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open('api-v1').then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
```

## StaleWhileRevalidate

```js
// Workbox
new workbox.strategies.StaleWhileRevalidate({
  cacheName: 'cdn-v1',
  plugins: [new workbox.expiration.Plugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 })],
});

// Vanilla SW
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        caches.open('cdn-v1').then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
```

## App Shell Pattern

Pre-cache shell at install, serve from cache on repeat visits. Content fills dynamically.

```js
// Install — cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('shell-v1').then((cache) => cache.addAll(['/', '/offline', '/styles/main.css', '/scripts/main.js']))
  );
});

// Fetch — serve shell for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          caches.open('shell-v1').then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match('/'))
    );
  }
});
```

## Offline Page

```html
<!-- offline.html -->
<!DOCTYPE html>
<html><head><title>Offline</title></head><body>
  <h1>You're offline</h1>
  <p>Check your connection and try again.</p>
  <button onclick="window.location.reload()">Retry</button>
</body></html>
```

```js
// SW — fallback to offline page on navigation failure
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline').then((offline) => offline || new Response('Offline', { status: 503 }))
      )
    );
  }
});
```

## Strategy Decision Tree

```
Request received
├─ Is it a mutation (POST/PUT/DELETE)? → NetworkOnly
├─ Is it a navigation?
│  ├─ Yes → NetworkFirst, fallback to /offline
│  └─ No  → Continue
├─ Is it a versioned static asset (JS/CSS/font)?
│  ├─ Yes → CacheFirst
│  └─ No  → Continue
├─ Is it an image?
│  ├─ Build asset (hash in URL) → CacheFirst
│  └─ User content → StaleWhileRevalidate
├─ Is it an API GET?
│  ├─ Yes → NetworkFirst with 3s timeout
│  └─ No  → Continue
└─ Everything else → NetworkOnly
```

## Cache Size Management

```js
new workbox.expiration.Plugin({
  maxEntries: 100,
  maxAgeSeconds: 7 * 24 * 60 * 60,
  purgeOnQuotaError: true,
});
```

```js
// Vanilla — trim oldest entry when exceeding limit
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
  }
}
```
