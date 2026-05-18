# Service Worker Reference

## Registration

```js
// src/sw-register.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('SW registered:', registration.scope);

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
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

## Lifecycle Events

```js
// sw.js
const CACHE_VERSION = 'v1';
const PRECACHE_URLS = ['/', '/offline', '/styles/main.css', '/scripts/main.js'];

// INSTALL: pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// MESSAGE: handle skip-waiting
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
  toast.innerHTML = `
    <span>New version available</span>
    <button id="update-btn">Refresh</button>
  `;
  document.body.appendChild(toast);

  document.getElementById('update-btn').addEventListener('click', () => {
    registration.waiting.postMessage('SKIP_WAITING');
    window.location.reload();
  });
}

// Reload on controller change
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

  // Precache
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Cache strategies
  workbox.routing.registerRoute(
    /\.(?:js|css|html)$/,
    new workbox.strategies.CacheFirst({ cacheName: 'static-resources' })
  );

  workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    new workbox.strategies.CacheFirst({ cacheName: 'images' })
  );

  workbox.routing.registerRoute(
    /^https:\/\/api\./,
    new workbox.strategies.NetworkFirst({ cacheName: 'api' })
  );
}
```

## Build Tool Plugins

### Vite

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/api\./, handler: 'NetworkFirst' },
        ],
      },
    }),
  ],
});
```

### Next.js

```ts
// next.config.js
import withPWA from 'next-pwa';

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    { urlPattern: /\/api\//, handler: 'NetworkFirst' },
  ],
});
```

## Security & Best Practices

- Service worker only works on HTTPS (or localhost)
- SW scope defaults to file location — scope `/` to cover entire app
- Never cache user-specific or authenticated responses
- Always version cache names (`CACHE_V1`, `CACHE_V2`)
- Keep SW file small — import Workbox for complex logic
- Test offline with DevTools > Network > Offline
- Handle SW update gracefully (user consent before skip-waiting)
