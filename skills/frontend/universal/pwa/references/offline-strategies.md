# Offline Strategies Reference

## Strategy Selection by Resource

| Resource Type     | Strategy              | Cache Name     | Rationale                          |
|-------------------|-----------------------|----------------|------------------------------------|
| JS/CSS bundles    | CacheFirst            | static-v1      | Versioned, never changes           |
| Images (build)    | CacheFirst            | images-v1      | Static assets, content hash URLs   |
| Fonts             | CacheFirst            | fonts-v1       | Rarely change, slow to re-download |
| HTML pages        | NetworkFirst          | pages-v1       | Fresh HTML, fallback to cache      |
| API GET requests  | NetworkFirst          | api-v1         | Fresh data, cached for offline     |
| User avatars      | StaleWhileRevalidate  | avatars-v1     | Display cached, update in bg       |
| Third-party CDN   | StaleWhileRevalidate  | cdn-v1         | Unreliable origin, serve cached    |
| POST/PUT/DELETE   | NetworkOnly           | —              | Never cache mutations              |

## CacheFirst

Best for versioned static assets. Serve from cache, never hit network.

```js
// Workbox
new workbox.strategies.CacheFirst({
  cacheName: 'static-v1',
  plugins: [
    new workbox.cacheableResponse.Plugin({
      statuses: [0, 200],
    }),
    new workbox.expiration.Plugin({
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    }),
  ],
});
```

```js
// Vanilla SW
self.addEventListener('fetch', (event) => {
  if (event.request.url.match(/\.(js|css)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
```

## NetworkFirst

Try network first, fall back to cache on timeout or offline.

```js
// Workbox
new workbox.strategies.NetworkFirst({
  cacheName: 'api-v1',
  networkTimeoutSeconds: 3,
  plugins: [
    new workbox.expiration.Plugin({
      maxEntries: 50,
      maxAgeSeconds: 24 * 60 * 60, // 1 day
    }),
  ],
});
```

```js
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

Serve cached instantly, then update cache from network.

```js
// Workbox
new workbox.strategies.StaleWhileRevalidate({
  cacheName: 'cdn-v1',
  plugins: [
    new workbox.expiration.Plugin({
      maxEntries: 50,
      maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
    }),
  ],
});
```

```js
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

Pre-cache shell at install time, serve from cache on repeat visits.

```js
// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('shell-v1').then((cache) =>
      cache.addAll([
        '/',
        '/offline',
        '/styles/main.css',
        '/scripts/main.js',
        '/images/logo.svg',
      ])
    )
  );
});

// Fetch — serve shell for navigation requests
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

```js
// Fallback to custom offline page
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline').then((offline) =>
          offline || new Response('Offline', { status: 503 })
        )
      )
    );
  }
});
```

```html
<!-- offline.html -->
<!DOCTYPE html>
<html>
<head><title>Offline</title></head>
<body>
  <h1>You're offline</h1>
  <p>Check your connection and try again.</p>
  <button onclick="window.location.reload()">Retry</button>
</body>
</html>
```

## Cache Size Management

```js
// Limit cache size
new workbox.expiration.Plugin({
  maxEntries: 100,       // Max items in cache
  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
  purgeOnQuotaError: true,
});
```

```js
// Vanilla cache cleanup
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
  }
}
```

## Strategy Decision Tree

```
Request received
├─ Is it a navigation?
│  ├─ Yes → NetworkFirst, fallback to /offline
│  └─ No  → Continue
├─ Is it a static asset (JS/CSS/font)?
│  ├─ Yes → CacheFirst
│  └─ No  → Continue
├─ Is it an image?
│  ├─ Yes → CacheFirst (build assets) or StaleWhileRevalidate (user content)
│  └─ No  → Continue
├─ Is it an API GET?
│  ├─ Yes → NetworkFirst with 3s timeout
│  └─ No  → Continue
└─ Everything else → NetworkOnly
```
