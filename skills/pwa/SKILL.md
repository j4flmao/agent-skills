# Progressive Web App Skill

## Overview
Progressive Web Apps (PWAs) provide native-app-like experiences on the web with offline support, push notifications, and installability. This skill covers service workers, caching strategies, manifest configuration, and performance optimization.

## Decision Tree: PWA Requirements

### Should I Build a PWA?
```
Does my app need PWA features?
├── Users have unreliable connectivity → YES (offline support is critical)
├── Need to reduce bounce rate → YES (faster loading, install prompt)
├── Want app-like experience without App Store → YES (installable web app)
├→ Need push notifications → YES (re-engagement without native app)
├── Already have a native app → PWA as complement (lightweight alternative)
├── Complex hardware access (Bluetooth, NFC) → Native app (PWA limitations)
├── Heavy background processing → Native app (PWA service worker has limits)
└── Simple content site → PWA optional (benefits minimal for static content)
```

### Service Worker Strategy Selection
```
What kind of content?
├── Static assets (CSS, JS, images) → Cache-first (fastest, works offline)
├── API data that changes frequently → Network-first (fresh, falls back to cache)
├── API data that rarely changes → Stale-while-revalidate (instant, updates async)
├── Critical page shell → Cache-first (app shell architecture)
├── User-specific data → Network-only (must be fresh)
├── Analytics pings → Network-only (no cache needed)
└── Media files (images, video) → Cache-first with size limits
```

## Caching Strategies

### Cache-First Pattern
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetchAndCache(event.request);
    })
  );
});

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const clone = response.clone();
    caches.open('dynamic-v1').then((cache) => {
      cache.put(request, clone);
    });
  }
  return response;
}
```

### Network-First Pattern
```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return cacheAndReturn(event.request, response);
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
```

### Stale-While-Revalidate Pattern
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          caches.open('revalidated-v1').then((cache) => cache.put(event.request, response));
          return response.clone();
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
```

### App Shell Pattern
```javascript
const PRECACHE = 'app-shell-v1';
const PRECACHE_URLS = [
  '/', '/index.html', '/app.js', '/styles.css',
  '/offline.html', '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
  }
});
```

## Push Notifications

### Subscribe Pattern
```javascript
// Client side
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

// Service worker
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Default title', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      data: { url: data.url },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    clients.openWindow(event.notification.data.url);
  }
});
```

## Web App Manifest

### Complete Manifest
```json
{
  "name": "My Progressive Web App",
  "short_name": "MyPWA",
  "description": "A full-featured progressive web application",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "scope": "/",
  "lang": "en-US",
  "dir": "ltr",
  "categories": ["business", "productivity"],
  "prefer_related_applications": false,
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/desktop.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" },
    { "src": "/screenshots/mobile.png", "sizes": "720x1280", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

## Background Sync

### Sync Pattern
```javascript
// Client: register sync
async function queueAction(data) {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('sync-actions');
  // Store data in IndexedDB for service worker to process
}

// Service worker: handle sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(processQueuedActions());
  }
});

async function processQueuedActions() {
  const actions = await getQueuedActions(); // from IndexedDB
  for (const action of actions) {
    try {
      await fetch(action.url, { method: action.method, body: action.body });
      await removeQueuedAction(action.id);
    } catch (e) {
      console.error('Background sync failed:', e);
    }
  }
}
```

## Performance Optimization

### Loading Performance
```html
<!-- Preload critical resources -->
<link rel="preload" href="/app.js" as="script">
<link rel="preload" href="/styles.css" as="style">

<!-- Preconnect to origins -->
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- Lazy load non-critical -->
<link rel="preload" href="/hero-image.jpg" as="image" media="(min-width: 768px)">
```

### Webpack/Vite PWA Plugins
```javascript
// Vite PWA plugin
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['**/*.{png,jpg,svg}'],
      manifest: {
        name: 'My App',
        short_name: 'MyApp',
        theme_color: '#3b82f6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});
```

## Testing PWA Features

### Lighthouse Audit Checklist
```
□ Service worker registered
□ Page loads offline (200 from cache)
□ HTTPS used
□ Manifest has start_url
□ Manifest has 192px and 512px icons
□ Redirects HTTP to HTTPS
□ Configured for custom splash screen
□ Sets background_color
□ Has <meta name="theme-color">
□ Uses <meta name="viewport">
□ Content sized correctly for viewport
□ font-display: swap on custom fonts
□ Minimizes main-thread work
```

### Manual Testing
```bash
# Chrome DevTools → Application → Service Workers
# Check: offline checkbox, update on reload, push simulation
# Chrome DevTools → Application → Cache Storage
# Chrome DevTools → Application → Manifest
# Check install prompt behavior
```

## Key Anti-Patterns
- **Caching uncacheable content**: Never cache user-specific data across sessions
- **No cache versioning**: Always version cache names for clean upgrades
- **Service worker without `skipWaiting`**: Users stuck on old version
- **Not cleaning old caches**: Storage quota exceeded errors
- **Overfetching in precache**: Only cache what's needed for app shell
- **Caching large files in install**: Causes install to fail; use runtime caching
- **Missing offline fallback**: Users see browser error page instead of branded offline page
- **Not handling `fetch` errors**: Always provide cache fallback
- **Push without permission context**: Ask after user takes an action, not on load
- **Ignoring `display` modes**: Test standalone, minimal-ui, and browser modes
- **Not testing on slow networks**: DevTools network throttling
- **No `update` event handling**: Prompt users to refresh for new version
