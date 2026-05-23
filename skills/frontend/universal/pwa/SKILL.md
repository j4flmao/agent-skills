---
name: frontend-pwa
description: >
  Use this skill when the user says 'PWA', 'service worker', 'offline support', 'web manifest', 'caching strategy', 'progressive web app', 'install prompt', 'workbox'. This skill enforces service worker best practices, offline-first caching strategies, manifest configuration, and Lighthouse PWA audit compliance. Applies to any frontend stack.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsure: true
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
- Check for existing notification permission requests or push notification setup
- Note the current Lighthouse PWA score

### Output Artifact
No file output unless requested.

### Response Format
1. Output service worker registration code and SW logic in full — never truncate with `/* ... */`
2. For Workbox-based setups, output the `workbox-config.js` plus the import statement
3. For the manifest, output the complete JSON object with all required and recommended fields
4. Always include the registration snippet to be placed in the app entry point
5. For push notifications, output both SW-side and client-side code
6. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Service worker registers without errors in Chrome DevTools > Application > Service Workers
- [ ] At least one offline page (custom or app shell) renders when network is disconnected
- [ ] `manifest.json` includes `name`, `short_name`, `start_url`, `display`, `icons` (192 and 512), `theme_color`, `background_color`
- [ ] Caching strategy is appropriate for resource type (CacheFirst for static, NetworkFirst for API, StaleWhileRevalidate for mixed)
- [ ] Service worker handles updates properly: `install` activates immediately, `activate` cleans old caches, `message` event listens for skip-waiting
- [ ] Lighthouse PWA audit passes all "installable" and "PWA optimized" checks
- [ ] HTTPS is enforced or a note is added that SW requires HTTPS (or localhost)
- [ ] Update notification shown to user when new SW version is available

### Max Response Length
150 lines for SW + manifest output combined.

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
On the client:
```js
registration.addEventListener('updatefound', () => {
  const installingWorker = registration.installing;
  installingWorker.addEventListener('statechange', () => {
    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
      showUpdateToast(registration); // "New version available — Refresh"
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

### Step 7: Push Notifications (Optional)
```js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, { body: data.body, icon: '/icons/icon-192.png' });
});
```

### Step 8: Test Offline
Use Chrome DevTools > Network > Offline. Verify: page loads from cache, API shows cached response, offline-specific UI appears.

## Best Practices

| Practice | Why |
|----------|-----|
| Version cache names (`v1`, `v2`) | Enables clean upgrades without stale data |
| Register SW on page load (not DOMContentLoaded) | Ensures SW controls page ASAP |
| Cache-first for versioned assets | Content-hash URLs never change, no network overhead |
| Network-first with timeout for API | Fresh data preferred, cache as fallback |
| `skipWaiting()` on install | New SW activates immediately (with user consent flow) |
| Purge old caches on activate | Prevents storage quota issues |

## Pitfalls to Avoid

- **Caching authenticated responses**: Never cache user-specific API responses or auth tokens.
- **Missing cache version upgrade**: Old caches accumulate. Always purge in `activate` event.
- **No update UX**: Users don't know new version is available. Show a toast with "Refresh" button.
- **Registering SW inside a component**: Must register from entry point, not a lazy-loaded component.
- **Using `CacheFirst` for dynamic API**: API data changes — use `NetworkFirst` or `StaleWhileRevalidate`.
- **Forgetting `fetch` handler**: Without a `fetch` listener, SW does nothing for navigation.
- **No offline fallback**: Users see browser's generic offline page. Provide a branded offline page.

## Rules
- Never cache user-specific or sensitive data (auth tokens, personal info) in the service worker
- Always version cache names with a `CACHE_VERSION` constant at the top of the SW file
- Never use `CacheFirst` for API requests that return dynamic data — use `NetworkFirst` or `StaleWhileRevalidate`
- Always register the service worker from the app entry point (not from inside a component or route)
- Always handle `skip-waiting` via a `message` event listener — never force update without user consent
- Never use `eval` or `new Function` inside a service worker (Content Security Policy restriction)
- Always purge unused caches in the `activate` event to prevent storage quota issues
- Always check `navigator.serviceWorker` availability before registering

## References
- `references/service-worker.md` — Lifecycle events, registration, Workbox, build tool plugins
- `references/caching-strategies.md` — CacheFirst, NetworkFirst, StaleWhileRevalidate, app shell, strategy decision tree
- `references/offline-strategies.md`
- `references/manifest-config.md`
- `references/pwa-audit.md`

## Handoff
No artifact produced unless requested.
Next skill: `frontend-seo` (if the PWA needs search engine discoverability)
Carry forward: SW registration pattern, manifest values, caching strategy decisions

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
