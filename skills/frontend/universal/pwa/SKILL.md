---
name: frontend-pwa
description: >
  Use this skill when the user says 'PWA', 'progressive web app', 'service worker', 'offline support', 'web app manifest', 'installable web app', 'Workbox', 'vite-plugin-pwa', 'web push notifications', 'background sync', 'update available prompt'. It makes a web app installable and offline-capable: manifest, service worker caching strategies with Workbox, safe update flow, web push and offline write queues, with real browser-support limits. Do NOT use for: HTTP cache headers and CDN caching (use frontend-browser-caching), native mobile apps (use the mobile skills), or Core Web Vitals tuning (use web-performance).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [frontend, pwa, service-worker, workbox, manifest, offline, web-push]
---

# Progressive Web Apps

## Purpose
A PWA is a web app with a manifest (installability, app identity) and a service worker (network proxy enabling offline, caching and push). This skill produces a manifest that installs on all major platforms, a Workbox service worker with per-resource caching strategies, an update flow that never strands users on stale code, and offline/push features with honest support caveats.

## Agent Protocol

### Trigger
"pwa", "service worker", "offline", "manifest.json", "install prompt", "workbox", "vite-plugin-pwa", "web push", "background sync", "new version available".

### Input Context
- Framework/bundler (Vite, Next.js, Angular — `@angular/pwa`, SvelteKit).
- Which routes/data must work offline; is data user-specific?
- Target platforms (iOS Safari constraints matter) and need for push.

### Output Artifact
`manifest.webmanifest`, service worker (Workbox or plugin config), registration/update UI code.

### Response Format
```
Install: manifest fields + icons {sizes, purpose}
Precache: {app shell files}
Runtime routes: {pattern -> strategy, cache name, expiration}
Offline: {fallback page | IndexedDB queue}
Update flow: {prompt | auto} 
Push: {VAPID, permission trigger, platforms}
```

## Do You Need It?
| Need | PWA fit |
|------|---------|
| Works on flaky networks, field/retail apps | Strong |
| Installable icon, standalone window without app stores | Strong |
| Re-engagement via notifications | Good (iOS/iPadOS 16.4+ only for home-screen-installed apps) |
| Bluetooth/NFC/background location, heavy background work | Weak — Web Bluetooth/NFC are Chromium-only; SW background execution is limited |
| Static content site | Optional; a simple offline page may be enough |

## Manifest

```json
{
  "id": "/",
  "name": "Acme Field Service",
  "short_name": "Acme",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/wide.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" },
    { "src": "/screenshots/narrow.png", "sizes": "720x1280", "type": "image/png", "form_factor": "narrow" }
  ]
}
```
- Provide separate `any` and `maskable` icons (a combined `"any maskable"` icon gets cropped or padded badly in one of the contexts).
- `screenshots` enable the richer install UI in Chromium.
- iOS: add `<link rel="apple-touch-icon" href="/icons/apple-180.png">`; iOS has no `beforeinstallprompt` — users install via Share → Add to Home Screen.
- HTTPS (or localhost) is required for service workers.

## Strategy per Resource
| Resource | Strategy | Notes |
|----------|----------|-------|
| Hashed JS/CSS from the build | Precache (installed with SW) | Revisioned automatically by Workbox |
| HTML navigations | NetworkFirst with short timeout, offline fallback | Avoid serving stale HTML that references deleted chunks |
| Images | StaleWhileRevalidate or CacheFirst + expiration | Cap entries; opaque cross-origin responses cost quota |
| Public API reads (non-personal) | NetworkFirst (timeout) or StaleWhileRevalidate | |
| Authenticated/personal API data | NetworkOnly, or cache per user and clear on logout | Shared devices leak data otherwise |
| Analytics, payments, auth endpoints | NetworkOnly | |

## Workbox Service Worker (injectManifest)

```ts
// src/sw.ts
/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);   // includes /offline.html via globPatterns
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(
    new NetworkFirst({ cacheName: 'pages', networkTimeoutSeconds: 3, plugins: [new CacheableResponsePlugin({ statuses: [200] })] }),
    { denylist: [/^\/api\//, /^\/auth\//] },
  ),
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600, purgeOnQuotaError: true })],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/public/'),
  new NetworkFirst({ cacheName: 'api-public', networkTimeoutSeconds: 3, plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })] }),
);

// Offline writes: failed POSTs are queued and replayed (Background Sync API in Chromium; Workbox
// falls back to replaying on the next SW startup in other browsers)
registerRoute(
  ({ url, request }) => url.pathname === '/api/notes' && request.method === 'POST',
  new NetworkOnly({ plugins: [new BackgroundSyncPlugin('notes-queue', { maxRetentionTime: 24 * 60 })] }),
  'POST',
);

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    const offline = await caches.match('/offline.html');
    if (offline) return offline;
  }
  return Response.error();
});

// Update flow: only activate when the page asks (user accepted the prompt)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});
```
POST replays must be idempotent on the server (send an `Idempotency-Key`), because a request can be delivered more than once.

## vite-plugin-pwa

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: false, // using public/manifest.webmanifest
    }),
  ],
});
```

```tsx
// UpdatePrompt.tsx (React; vue/svelte variants exist)
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) { console.error('Service worker registration failed', error); },
  });
  if (!needRefresh) return null;
  return (
    <div role="status">
      A new version is available.
      <button onClick={() => updateServiceWorker(true)}>Reload</button>
      <button onClick={() => setNeedRefresh(false)}>Later</button>
    </div>
  );
}
```

## Update Lifecycle Rules
- A new SW installs, then **waits** until all tabs using the old one close. Calling `skipWaiting()` unconditionally swaps code under open pages, which can break lazy-loaded chunks; prefer the prompt flow above.
- `clients.claim()` makes the first SW control already-open pages; use it deliberately.
- Serve `sw.js` with `Cache-Control: no-cache` (browsers also revalidate it at most every 24 h regardless).
- Precached assets must be revisioned (hashed names or Workbox revisions) or users never get updates.

## Web Push

```ts
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported in this browser (on iOS, install to Home Screen first)');
  }
  const permission = await Notification.requestPermission(); // call from a click handler
  if (permission !== 'granted') throw new Error(`Notification permission ${permission}`);
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey });
  const res = await fetch('/api/push/subscriptions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub),
  });
  if (!res.ok) throw new Error(`Saving push subscription failed: ${res.status}`);
  return sub;
}
```
```ts
// in sw.ts
self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title: string; body: string; url: string } | undefined;
  if (!data) return;
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icons/icon-192.png', data: { url: data.url } }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
```
- `applicationServerKey` accepts the base64url VAPID public key string in modern browsers (or a `Uint8Array`).
- Every push must show a notification (`userVisibleOnly: true`); silent push is not allowed.
- Server sends via Web Push protocol (e.g. `web-push` npm library) with the VAPID private key from a secret store; delete subscriptions that return 404/410.
- Ask for permission after a user action that explains the value, never on page load.

## Storage
- Check usage with `navigator.storage.estimate()`; request durability with `navigator.storage.persist()` for offline-critical data.
- Safari may evict script-writable storage for sites not visited for ~7 days unless installed to the Home Screen; treat caches as rebuildable.
- Use IndexedDB (e.g. via `idb`) for structured offline data, not Cache Storage.

## Testing
- DevTools → Application: Manifest (installability errors), Service Workers (update on reload, offline), Cache Storage, Storage quota.
- Lighthouse removed its PWA category in v12 (2024); use DevTools installability checks and Playwright tests with `context.setOffline(true)`.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| Unconditional `skipWaiting()` + lazy chunks | Prompt-based update |
| CacheFirst for HTML | NetworkFirst with offline fallback |
| Caching personal API responses in shared caches | NetworkOnly or per-user caches cleared on logout |
| Permission prompt on load | Ask in context after user intent |
| No `cleanupOutdatedCaches()` / cache versioning | Clean old caches on activate |
| Assuming Background Sync everywhere | Workbox fallback + visible "pending" UI |

## Checklist
- [ ] Manifest with `id`, separate `any`/`maskable` icons, screenshots; Apple touch icon.
- [ ] SW precaches revisioned shell; per-route strategies documented.
- [ ] Offline fallback page and offline write queue (idempotent server).
- [ ] Update prompt flow; `sw.js` served `no-cache`.
- [ ] Push permission requested in context; dead subscriptions pruned.
- [ ] Offline and update behaviour covered by automated tests.
