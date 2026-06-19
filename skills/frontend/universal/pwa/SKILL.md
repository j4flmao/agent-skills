---
name: frontend-pwa
description: >
  Use this skill when the user says 'PWA', 'service worker', 'offline support', 'web manifest', 'caching strategy', 'progressive web app', 'install prompt', 'workbox'. This skill enforces service worker best practices, offline-first caching strategies, manifest configuration, and Lighthouse PWA audit compliance. Applies to any frontend stack.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, pwa, phase-3, universal]
---

# Frontend PWA (Progressive Web App)

## Purpose
Turn web applications into installable, offline-capable progressive web apps with robust service workers, manifest configuration, and caching strategies. Covers the full service worker lifecycle, Workbox integration, push notifications, background sync, and update management.

## Agent Protocol

### Trigger
Exact phrases: "add pwa", "service worker", "offline support", "web manifest", "workbox", "install prompt", "offline first", "cache strategy", "pwa audit", "progressive web app", "sw lifecycle", "push notification", "background sync", "vite pwa", "next pwa"

### Input Context
- Check for existing `sw.js`, `service-worker.js`, or Workbox-generated service worker files
- Verify presence and content of `manifest.json` or `manifest.webmanifest`
- Identify the build tool (Vite, Webpack, Next.js, Astro, etc.) for plugin-based SW generation
- Determine caching requirements: static assets, API responses, full offline vs degraded offline

### Output Artifact
No file output unless requested.

### Response Format
1. Output service worker registration code and SW logic in full — never truncate with `/* ... */`
2. For Workbox-based setups, output the `workbox-config.js` plus the import statement
3. For the manifest, output the complete JSON object with all required and recommended fields
4. No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Service worker registers without errors
- [ ] At least one offline page renders when network is disconnected
- [ ] `manifest.json` includes name, short_name, start_url, display, icons (192 and 512), theme_color, background_color
- [ ] Caching strategy appropriate for resource type
- [ ] Service worker handles updates properly
- [ ] Lighthouse PWA audit passes all checks
- [ ] Update notification shown when new SW version is available

### Max Response Length
150 lines for SW + manifest output combined.

## PWA Architecture / Decision Trees

### Service Worker Approach Decision Tree
```
Build tool?
  |-- Vite --> vite-plugin-pwa (auto SW generation, best DX)
  |-- Next.js --> @serwist/next (successor to next-pwa)
  |-- Webpack --> workbox-webpack-plugin (full control)
  |-- Astro --> @astrojs/service-worker
  |-- Vanilla / no build tool --> Raw sw.js + workbox CDN
  |
  |-- Need full offline support?
       |-- YES: Workbox with precache + runtime cache
       |-- NO:  Custom sw.js with minimal caching (offline page only)
```

### Caching Strategy Decision Tree
```
What resource type?
  |-- Build-time asset (JS/CSS/img with hash) -->
  |     CacheFirst — never changes, cache once and serve forever
  |
  |-- HTML navigation -->
  |     NetworkFirst — prefer fresh HTML, fallback to cache
  |     Timeout: 3s for fast fallback
  |
  |-- API GET request -->
  |     |-- User-specific (profile, dashboard) -->
  |     |     NetworkFirst with timeout (3s)
  |     |     Never cache auth tokens or personal data
  |     |
  |     |-- Public API (products, posts) -->
  |           StaleWhileRevalidate — instant cached response, update in background
  |
  |-- Third-party resource (CDN, analytics) -->
  |     StaleWhileRevalidate
  |     Handle opaque responses (no CORS) carefully
  |
  |-- User-generated content (avatars, uploads) -->
        CacheFirst with versioning
        Purge and re-cache when user updates
```

### Update Flow Decision Tree
```
New SW version detected?
  |-- Critical update (security fix, breaking change) -->
  |     Auto skipWaiting + refresh all active tabs
  |     Toast: "App updated" (information only)
  |
  |-- Non-critical update (feature, bug fix) -->
  |     Wait for next navigation or user consent
  |     Toast: "New version available. Update?" with Refresh button
  |
  |-- User clicks "Refresh" / accepts update -->
        postMessage({ type: 'SKIP_WAITING' })
        SW activates, page reloads with new version
```

---

## Workflow

### Step 1: Choose SW Approach
| Setup | Tool | Config File |
|-------|------|-------------|
| Vite | `vite-plugin-pwa` | `vite.config.ts` |
| Next.js | `next-pwa` / `@serwist/next` | `next.config.js` |
| Webpack | `workbox-webpack-plugin` | `webpack.config.js` |
| Vanilla | Raw `sw.js` | — |
| Astro | `@astrojs/service-worker` | `astro.config.mjs` |

### Step 2: Create Manifest
```json
{
  "name": "My Progressive Web App",
  "short_name": "MyPWA",
  "description": "Fully featured PWA",
  "start_url": "/",
  "display": "standalone",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
```

### Step 3: Implement Service Worker Lifecycle
```js
const CACHE_VERSION = 'v1';
const PRECACHE_URLS = ['/', '/offline', '/styles/main.css', '/scripts/main.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
```

### Step 4: Define Caching Strategies
| Resource | Strategy | Cache Name | Timeout |
|----------|----------|------------|---------|
| JS/CSS/fonts | CacheFirst | static-v1 | — |
| Build images | CacheFirst | images-v1 | — |
| API GET | NetworkFirst | api-v1 | 3s |
| HTML pages | NetworkFirst | pages-v1 | — |
| User content | StaleWhileRevalidate | content-v1 | — |
| Third-party CDN | StaleWhileRevalidate | cdn-v1 | — |

### Step 5: Implement Update Flow
```js
registration.addEventListener('updatefound', () => {
  const installingWorker = registration.installing;
  installingWorker.addEventListener('statechange', () => {
    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
      showUpdateToast(registration);
    }
  });
});
```

### Step 6: Add Offline Fallback
```js
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline'))
    );
  }
});
```

### Step 7: Push Notifications
```js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, { body: data.body, icon: '/icons/icon-192.png' });
});
```

### Step 8: Background Sync
```js
// Register sync in the app
navigator.serviceWorker.ready.then((registration) => {
  registration.sync.register('sync-pending-orders');
});

// Handle sync in SW
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-orders') {
    event.waitUntil(syncPendingOrders());
  }
});
```

### Step 9: Test Offline
Use Chrome DevTools > Network > Offline. Verify: page loads from cache, API shows cached response, offline-specific UI appears.

### Step 10: Vite PWA Plugin Config
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'My App',
        short_name: 'MyApp',
        theme_color: '#2563eb',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
})
```

## Common Pitfalls

1. **Caching authenticated responses**: Never cache user-specific API responses or auth tokens.
2. **Missing cache version upgrade**: Old caches accumulate. Always purge in activate event.
3. **No update UX**: Users don't know new version is available. Show a toast with Refresh button.
4. **Registering SW inside a component**: Must register from entry point, not a lazy-loaded component.
5. **Using CacheFirst for dynamic API**: API data changes — use NetworkFirst or StaleWhileRevalidate.
6. **Forgetting fetch handler**: Without fetch listener, SW does nothing for navigation.
7. **No offline fallback**: Users see browser's generic offline page. Provide a branded offline page.
8. **Over-caching**: Caching too much data leads to quota exceeded errors.

## Service Worker Lifecycle Deep Dive

```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// New SW detected → waiting → user accepts → skipWaiting → activate → reload
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast(() => newWorker.postMessage({ type: 'SKIP_WAITING' }));
        }
      });
    });
  });
}
```

## Advanced Caching Strategies

```javascript
// Network-first with timeout and stale fallback
async function networkFirstWithTimeout(request, timeoutMs) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    if (response.ok) {
      const cache = await caches.open('api-v1');
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

## Cache Strategy Decision Tree
```
Request URL matches?
  |-- Same-origin static asset (.js, .css, .png, .woff2) -->
  |     CacheFirst — precached in install, instant load
  |     No network request needed
  |
  |-- Same-origin API (/api/*) -->
  |     |-- GET requests (read data) -->
  |     |     NetworkFirst with timeout (3s) — fresh data, stale fallback
  |     |
  |     |-- POST/PUT/DELETE (write data) -->
  |           NetworkOnly — never cache mutations
  |
  |-- Third-party CDN (fonts, analytics) -->
  |     StaleWhileRevalidate — serve cached quickly, update in background
  |
  |-- Navigation requests (HTML pages) -->
  |     NetworkFirst — always try network first, fall back to offline page
  |
  |-- Image requests -->
        CacheFirst with maxEntries (50) + maxAge (30d)
        LRU eviction when limit reached
```

## Background Sync

```javascript
// App: queue data when offline
async function submitOrder(data) {
  if (!navigator.onLine) {
    await saveToIndexedDB('pending-orders', data);
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-orders');
    return { queued: true };
  }
  return fetch('/api/orders', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
}

// SW: process queue when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(processPendingOrders());
  }
});

async function processPendingOrders() {
  const orders = await getAllFromIndexedDB('pending-orders');
  for (const order of orders) {
    try {
      await fetch('/api/orders', { method: 'POST', body: JSON.stringify(order.data) });
      await removeFromIndexedDB('pending-orders', order.id);
    } catch { /* will retry on next sync event */ }
  }
}
```

## Push Notification Pattern
```javascript
// Request permission and subscribe
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY),
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

// Service worker: show notification
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge.png',
      data: { url: data.url },
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    clients.openWindow(event.notification.data.url);
  }
});
```

## Web App Manifest Configuration
```json
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "categories": ["productivity"],
  "description": "Does the thing, offline.",
  "scope": "/app/",
  "orientation": "portrait-primary"
}
```

## Compared With

| Aspect | Raw SW | Workbox | vite-plugin-pwa |
|--------|--------|---------|-----------------|
| Setup complexity | High | Medium | Low |
| Strategy library | Manual | Built-in | Automatic |
| Bundle splitting | Manual | Manual | Automatic |
| TypeScript support | Manual | Good | Excellent |
| Update management | Manual | Manual | Built-in |
| Dev tools | Browser DevTools | Browser + Workbox | Browser + Vite |
| Caching strategies | Manual | Precise control | Good defaults |
| Offline analytics | Manual | via workbox-google-analytics | Built-in |

## Performance Considerations

- SW registration is async and non-blocking — does not affect page load
- CacheFirst serves assets from cache instantly (0ms network wait)
- NetworkFirst with timeout balances freshness and performance (3s default timeout)
- Precache critical assets in install event — all pages get instant load after first visit
- SW runs in separate thread — no main thread blocking
- Cache storage quota: ~6% of available disk space per origin
- Lighthouse PWA score impact: passing all audits requires SW, manifest, HTTPS, and 200 offline
- Precache size should stay under 5MB to avoid install timeout on mobile 3G
- Runtime cache entries limited via maxEntries/maxAgeSeconds to prevent quota exceeded

## Accessibility Considerations

- Offline pages should maintain the same accessibility structure as online pages
- Push notifications must provide meaningful information, not just "New update"
- Update toasts need keyboard-dismissible and screen-reader-announceable patterns
- Install prompts should have proper focus management
- Offline indicator (banner/icon) must be detectable by screen readers via aria-live
- Push notification actions should be keyboard accessible

## Security Considerations

- Service worker scope restricts which paths the SW controls — keep it narrow
- Never cache `Cache-Control: no-store` responses
- Always use HTTPS for SW registration (required by spec)
- Push notification data must be encrypted end-to-end
- Background sync should not expose user data without authentication
- Never cache authenticated API responses — use NetworkOnly for auth endpoints
- SW scope: `/` controls all paths, `/app/` only under /app/ — keep scope minimal

## Rules
- Never cache user-specific or sensitive data (auth tokens, personal info) in the service worker.
- Always version cache names with a CACHE_VERSION constant at the top of the SW file.
- Never use CacheFirst for API requests that return dynamic data — use NetworkFirst or StaleWhileRevalidate.
- Always register the service worker from the app entry point (not from inside a component or route).
- Always handle skip-waiting via a message event listener — never force update without user consent.
- Never use eval or new Function inside a service worker (Content Security Policy restriction).
- Always purge unused caches in the activate event to prevent storage quota issues.
- Always check navigator.serviceWorker availability before registering.
- Use Background Sync for offline mutations — never rely on periodic polling.
- Keep SW scope as narrow as possible — never use `/` unless the whole app is a PWA.

## References
  - references/caching-strategies.md — Caching Strategies Reference
  - references/manifest-config.md — Manifest Configuration Reference
  - references/offline-strategies.md — Offline Strategies Reference
  - references/pwa-audit.md — PWA Audit Reference
  - references/pwa-testing.md — PWA Testing Reference
  - references/service-worker.md — Service Worker Reference
  - references/pwa-service-worker-lifecycle.md — Service Worker Lifecycle Reference
  - references/pwa-offline-sync.md — Offline Sync Reference

## Handoff
No artifact produced unless requested.
Next skill: `frontend-seo` (if the PWA needs search engine discoverability)
Carry forward: SW registration pattern, manifest values, caching strategy decisions
