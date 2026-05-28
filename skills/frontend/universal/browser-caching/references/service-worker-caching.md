# Service Worker Caching Patterns

## Service Worker Lifecycle

A service worker goes through three stages: installation, activation, and idle/termination. Understanding this lifecycle is critical for correct caching behavior.

### Stage 1: Installation

The install event fires when the browser downloads and executes the service worker for the first time (or when an updated SW is detected).

```js
const CACHE_VERSION = 1;
const CACHE_NAME = `app-static-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css',
  '/manifest.json',
  '/fonts/inter-v12.woff2',
  '/images/logo.svg',
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become active immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // cache.addAll fails if ANY resource fails to fetch
      return cache.addAll(STATIC_ASSETS);
    })
  );
});
```

**Important**: `cache.addAll()` is atomic -- if any resource in the array fails, the entire install fails and the cache is discarded. Use individual `cache.add()` calls for non-critical assets:

```js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Critical assets -- must succeed
      await cache.add('/');
      await cache.add('/index.html');
      await cache.add('/app.js');
      await cache.add('/app.css');

      // Non-critical assets -- best effort
      STATIC_ASSETS.slice(4).forEach(async (url) => {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn(`Failed to cache ${url}:`, e);
        }
      });
    })
  );
});
```

### Stage 2: Activation

The activate event fires when the SW takes control of clients (pages). Use this to clean up old caches.

```js
self.addEventListener('activate', (event) => {
  // Take control of all open tabs immediately
  event.waitUntil(self.clients.claim());

  // Delete old cache versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
```

### Stage 3: Idle and Termination

Between events, the service worker stays idle. The browser may terminate it after ~30 seconds of inactivity to save memory. The SW is re-started when the next event fires. Do not rely on persistent global state -- use IndexedDB for any data that must survive termination.

## Caching Strategies

### Strategy 1: Cache First (Static Assets)

Serve from cache, fall back to network. Best for content-hashed static assets.

```js
self.addEventListener('fetch', (event) => {
  if (event.request.url.match(/\.(js|css|png|jpg|svg|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Return cached immediately, or fetch and cache
        return cached || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});
```

### Strategy 2: Network First (HTML Pages)

Try network first, fall back to cache. Best for HTML where freshness matters.

```js
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        // Cache the fresh HTML
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => {
        // Offline -- serve cached HTML
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/offline.html');
        });
      })
    );
  }
});
```

### Strategy 3: Stale-While-Revalidate (API Data)

Serve cached immediately, fetch fresh in background, update cache for next time.

```js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});
```

### Strategy 4: Network Only (User Data)

Never cache, always go to network. Best for authenticated/sensitive data.

```js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/user/') || event.request.url.includes('/api/auth/')) {
    // Do not intercept -- let it go to network normally
    return;
  }
});
```

### Strategy 5: Cache Only (Precached Assets)

Only serve from cache, never go to network. Best for app shell assets.

```js
self.addEventListener('fetch', (event) => {
  if (event.request.url.match(/\/shell\//)) {
    event.respondWith(caches.match(event.request));
  }
});
```

## Workbox Alternative

Using raw service worker code is error-prone. Workbox is the recommended production approach.

### Workbox Webpack Plugin

```js
// webpack.config.js (or next.config.js with next-pwa)
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  plugins: [
    new InjectManifest({
      swSrc: './src/sw.js',
      swDest: 'service-worker.js',
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
    }),
  ],
};
```

### Workbox Service Worker

```js
// src/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';

// Precaches all assets injected by the build tool
precacheAndRoute(self.__WB_MANIFEST);

// Cache Google Fonts with CacheFirst
registerRoute(
  /^https:\/\/fonts\.googleapis\.com/,
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Cache API responses with StaleWhileRevalidate
registerRoute(
  /\/api\//,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// Cache images with CacheFirst
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Navigate with NetworkFirst
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50 }),
    ],
  })
);
```

### Workbox with Vite (vite-plugin-pwa)

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'My App',
        short_name: 'App',
        theme_color: '#3b82f6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
  ],
});
```

## Offline Support Patterns

### Offline Fallback Page

```js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        // For non-navigation requests, return a placeholder
        return new Response('Offline', { status: 503 });
      })
  );
});
```

### Offline Analytics Queue

```js
// Queue failed requests for later retry
const queuedRequests = [];

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/analytics')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Store the request for later
        queuedRequests.push(event.request.clone());
        // Return a fake successful response
        return new Response(JSON.stringify({ queued: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
  }
});

// Replay queued requests when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(
      Promise.all(
        queuedRequests.map((request) => fetch(request))
      ).then(() => {
        queuedRequests.length = 0;
      })
    );
  }
});
```

### Cache-First with Background Refresh

```js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/public/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Return cached immediately
        const response = cached || fetch(event.request).then((response) => {
          cacheResponse(event.request, response);
          return response;
        });

        // Refresh cache in background (no await)
        fetch(event.request).then((response) => {
          if (response.ok) {
            cacheResponse(event.request, response);
          }
        }).catch(() => {});

        return response;
      })
    );
  }
});

async function cacheResponse(request, response) {
  const cache = await caches.open('api-cache');
  cache.put(request, response.clone());
}
```

## Service Worker Registration

### Recommended Registration Pattern

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', {
      updateViaCache: 'none', // Always check for SW updates
    }).then((registration) => {
      console.log('SW registered:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW available, show update prompt
            showUpdatePrompt(() => {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            });
          }
        });
      });
    }).catch((error) => {
      console.error('SW registration failed:', error);
    });
  });
}

// Handle SKIP_WAITING message
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active.postMessage({ type: 'SKIP_WAITING' });
    });
  }
});

// Reload on new SW activation
let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});
</script>
```

### Update Prompt UI

```js
function showUpdatePrompt(onAccept) {
  const banner = document.createElement('div');
  banner.setAttribute('role', 'alert');
  banner.style.cssText = `
    position: fixed; bottom: 16px; right: 16px;
    background: #333; color: white; padding: 16px 24px;
    border-radius: 8px; z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  banner.innerHTML = `
    <p style="margin: 0 0 8px">A new version is available.</p>
    <button id="update-btn" style="
      background: #3b82f6; color: white; border: none;
      padding: 8px 16px; border-radius: 4px; cursor: pointer;
    ">Update</button>
    <button id="dismiss-btn" style="
      background: transparent; color: #ccc; border: none;
      padding: 8px; cursor: pointer; margin-left: 8px;
    ">Later</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('update-btn').onclick = () => {
    onAccept();
    banner.remove();
  };
  document.getElementById('dismiss-btn').onclick = () => banner.remove();
}
```

## Cache Versioning Strategy

### Semantic Cache Versioning

```js
// Use build-time constants for cache naming
// webpack.DefinePlugin or Vite's define
const CACHE_VERSION = __CACHE_VERSION__; // e.g., "1.2.3"

const CACHE_NAMES = {
  static: `static-v${CACHE_VERSION}`,
  images: `images-v${CACHE_VERSION}`,
  api: `api-v${CACHE_VERSION}`,
  fonts: `fonts-v${CACHE_VERSION}`,
};
```

### Cache Cleanup on Version Change

```js
self.addEventListener('activate', (event) => {
  const currentCaches = Object.values(CACHE_NAMES);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => {
            console.log(`Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
});
```

## Debugging Service Workers

### Chrome DevTools

1. Open Chrome DevTools > Application > Service Workers
2. Check "Offline" checkbox to test offline behavior
3. Click "Update" to simulate SW update
4. Click "Unregister" to clear all SW registrations
5. Use "Cache Storage" section to inspect cached responses
6. Use "Background Services" > "Background Sync" to test sync events

### Common Debugging Commands

```js
// Unregister all service workers (in console)
navigator.serviceWorker.getRegistrations().then((regs) => {
  regs.forEach((reg) => reg.unregister());
});

// Bypass SW for current session (DevTools)
// Application > Service Workers > Bypass for Network

// Check SW status
navigator.serviceWorker.controller?.state;

// List all caches
caches.keys().then((keys) => console.log(keys));

// Inspect cache contents
caches.open('static-v1').then((cache) => {
  cache.keys().then((requests) => console.log(requests));
});

// Delete a specific cache
caches.delete('old-cache-name');
```

### Network Throttling for SW Testing

```js
// Simulate slow network for specific resources
// Use DevTools Network tab > Throttling > "Slow 3G"
// For offline testing: DevTools > Application > Service Workers > Offline
```

## Security Considerations

### HTTPS Requirement
Service workers only work on secure origins (HTTPS or localhost). Deploying to anything other than HTTPS will silently fail SW registration.

### Scope Restriction
A service worker can only intercept requests from its own scope (the path where it is registered). To cover the entire site, register at the root:

```js
navigator.serviceWorker.register('/service-worker.js', {
  scope: '/', // Default is the SW file's directory
});
```

### Content Security Policy
If your CSP includes `worker-src`, service workers must be explicitly allowed:

```http
Content-Security-Policy: worker-src 'self'; script-src 'self'
```

### Subresource Integrity for SW Script

```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js', {
    updateViaCache: 'none',
  });
}
</script>
```

The SW script cannot use integrity attributes directly (unlike `<script>`), but if your build process hashes it, you can verify:

```js
// In a build script, compute the hash and verify in the SW
// SW code:
self.addEventListener('install', (event) => {
  const expectedHash = 'sha384-abc123...';
  // Verify self integrity
});
```

## Service Worker Testing

### Unit Testing Caching Logic

```js
// sw.test.js
import { expect, test } from 'vitest';

// Mock the Cache API
const mockCache = {
  put: async () => {},
  match: async () => null,
  addAll: async () => {},
};

// Test cache strategy logic
function determineStrategy(url) {
  if (url.match(/\.(js|css|woff2)$/)) return 'CacheFirst';
  if (url.match(/\/api\//)) return 'StaleWhileRevalidate';
  if (url.match(/\.(png|jpg|svg)$/)) return 'CacheFirst';
  return 'NetworkFirst';
}

test('determines correct strategy for JS files', () => {
  expect(determineStrategy('https://app.com/app.js')).toBe('CacheFirst');
});

test('determines correct strategy for API calls', () => {
  expect(determineStrategy('https://api.example.com/users')).toBe('StaleWhileRevalidate');
});

test('determines correct strategy for HTML navigation', () => {
  expect(determineStrategy('https://app.com/about')).toBe('NetworkFirst');
});
```

### E2E Testing with Playwright

```ts
import { test, expect } from '@playwright/test';

test('service worker caches static assets', async ({ page, context }) => {
  // Register SW
  await page.goto('/');

  // Wait for SW activation
  await page.waitForFunction(() => navigator.serviceWorker.controller);

  // Verify SW is active
  const workers = context.serviceWorkers;
  expect(workers.length).toBe(1);

  // Go offline and verify cached page loads
  await context.setOffline(true);
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('offline fallback page works', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller);

  // Navigate to a page not in cache
  await context.setOffline(true);
  await page.goto('/non-existent-page');

  // Should show offline fallback
  await expect(page.locator('text=You are offline')).toBeVisible();
});
```

## Performance Budgets for SW

| Metric | Target | Measurement |
|--------|--------|-------------|
| SW registration time | < 500ms | DevTools > Application > SW |
| Install event duration | < 2s | DevTools > SW timing |
| Cache hit latency | < 10ms | Performance API |
| Cache miss fetch latency | Network dependent | Navigation timing |
| Total cache size | < 50MB | navigator.storage.estimate() |
| Cached entries | < 500 | Cache API keys count |
