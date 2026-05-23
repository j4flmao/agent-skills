# Service Worker Reference

## Service Worker Lifecycle

```
Download → Install → Activate → (idle) → Fetch
                ↓                      ↓
            (waiting)             (terminated)
```

## Registration

```js
// src/sw-register.js — app entry point
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('SW registered:', registration.scope);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(registration);
          }
        });
      });
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  });
}
```

Scope defaults to SW file location. Use `scope: '/'` to control the entire app.

## Lifecycle Events

### Install — Pre-cache Critical Assets
```js
const CACHE_VERSION = 'v1';
const PRECACHE_URLS = ['/', '/offline', '/styles/main.css', '/scripts/main.js', '/images/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});
```

### Activate — Clean Old Caches
```js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});
```

### Fetch — Intercept and Respond
```js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

### Message — Handle Skip-Waiting
```js
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

## Update Flow — Client Side

```js
// src/sw-update.js
function showUpdateToast(registration) {
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.innerHTML = `<span>New version available</span><button id="update-btn">Refresh</button>`;
  document.body.appendChild(toast);

  document.getElementById('update-btn').addEventListener('click', () => {
    registration.waiting?.postMessage('SKIP_WAITING');
    window.location.reload();
  });
}

// Auto-reload on controller change
let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});
```

## Workbox Integration

```js
// sw.js — Workbox via CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  workbox.setConfig({ debug: false });

  // Precache build assets (auto-generated)
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Static assets: CacheFirst
  workbox.routing.registerRoute(
    /\.(?:js|css|html)$/,
    new workbox.strategies.CacheFirst({ cacheName: 'static-resources' })
  );

  // Images: CacheFirst
  workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    new workbox.strategies.CacheFirst({ cacheName: 'images', plugins: [new workbox.expiration.Plugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })] })
  );

  // API calls: NetworkFirst
  workbox.routing.registerRoute(
    /^https:\/\/api\./,
    new workbox.strategies.NetworkFirst({ cacheName: 'api', networkTimeoutSeconds: 3 })
  );
}
```

## Build Tool Plugin Integration

### Vite (`vite-plugin-pwa`)
```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp}'] },
      manifest: { name: 'My PWA', short_name: 'MyPWA', theme_color: '#2563eb' },
    }),
  ],
});
```

### Next.js (`next-pwa` / `@serwist/next`)
```js
import withPWA from 'next-pwa';
export default withPWA({ dest: 'public', register: true, skipWaiting: true })(nextConfig);
```

## Security

- SW only works on HTTPS (or localhost)
- Always check `navigator.serviceWorker` before registering
- Never cache authenticated responses or user data
- Content Security Policy: avoid `eval` and `new Function` in SW
- Set appropriate `Cache-Control` headers on SW file itself: `max-age=0, must-revalidate`

## Debugging

```js
// sw.js — verbose logging for development
self.addEventListener('install', (e) => console.log('[SW] Install', e));
self.addEventListener('activate', (e) => console.log('[SW] Activate', e));
self.addEventListener('fetch', (e) => console.log('[SW] Fetch:', e.request.url));
self.addEventListener('message', (e) => console.log('[SW] Message:', e.data));
```

View in: Chrome DevTools > Application > Service Workers.
