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

### Step 8: Test Offline
Use Chrome DevTools > Network > Offline. Verify: page loads from cache, API shows cached response, offline-specific UI appears.

## Component Architecture

### Service Worker Strategy Decision Tree
```
What resource type?
├── Build-time asset (JS/CSS/img with hash)
│   └── CacheFirst — never changes
├── HTML navigation
│   └── NetworkFirst — prefer fresh, fallback to cache
├── API GET request
│   ├── User-specific → NetworkFirst with timeout
│   └── Public → StaleWhileRevalidate
├── Third-party resource (CDN, analytics)
│   └── StaleWhileRevalidate
└── User-generated content (avatars, uploads)
    └── CacheFirst with versioning
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

## Best Practices

1. Version cache names (`v1`, `v2`) to enable clean upgrades without stale data.
2. Register SW on page load (not DOMContentLoaded) for immediate control.
3. Cache-first for versioned assets — content-hash URLs never change.
4. Network-first with timeout for API — fresh data preferred, cache as fallback.
5. `skipWaiting()` on install with user consent flow — new SW activates when ready.
6. Purge old caches on activate — prevents storage quota issues.
7. Use Workbox for complex strategies — it handles edge cases (range requests, opaque responses).
8. Test offline behavior with DevTools and real network throttling.

## Compared With

| Aspect | Raw SW | Workbox | vite-plugin-pwa |
|--------|--------|---------|-----------------|
| Setup complexity | High | Medium | Low |
| Strategy library | Manual | Built-in | Automatic |
| Bundle splitting | Manual | Manual | Automatic |
| TypeScript support | Manual | Good | Excellent |
| Update management | Manual | Manual | Built-in |
| Dev tools | Browser DevTools | Browser + Workbox | Browser + Vite |

## Performance

1. SW registration is async and non-blocking — does not affect page load.
2. CacheFirst serves assets from cache instantly (0ms network wait).
3. NetworkFirst with timeout balances freshness and performance (3s default timeout).
4. Precache critical assets in install event — all pages get instant load after first visit.
5. SW runs in separate thread — no main thread blocking.
6. Cache storage quota: ~6% of available disk space per origin.
7. Lighthouse PWA score impact: passing all audits requires SW, manifest, HTTPS, and 200 offline.

## Tooling

1. `workbox-cli` — generate service worker from config.
2. `workbox-webpack-plugin` — Webpack integration.
3. `vite-plugin-pwa` — Vite integration with auto-generation.
4. `@serwist/next` — Next.js PWA toolkit (successor to next-pwa).
5. Chrome DevTools > Application > Service Workers — debug SW lifecycle.
6. `pwa-asset-generator` — generate all icon sizes from a source image.
7. `Lighthouse` — audit PWA compliance.
8. `Workbox DevTools` — inspect cache contents and strategies.

## Rules
- Never cache user-specific or sensitive data (auth tokens, personal info) in the service worker.
- Always version cache names with a CACHE_VERSION constant at the top of the SW file.
- Never use CacheFirst for API requests that return dynamic data — use NetworkFirst or StaleWhileRevalidate.
- Always register the service worker from the app entry point (not from inside a component or route).
- Always handle skip-waiting via a message event listener — never force update without user consent.
- Never use eval or new Function inside a service worker (Content Security Policy restriction).
- Always purge unused caches in the activate event to prevent storage quota issues.
- Always check navigator.serviceWorker availability before registering.

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
