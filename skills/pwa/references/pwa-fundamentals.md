# Progressive Web App Fundamentals

## Overview
PWAs deliver native-app experiences on the web with offline support, installability, push notifications, and background sync. This reference covers service workers, caching strategies, manifest configuration, and performance optimization.

## Service Worker Lifecycle

### Registration
```javascript
// Register service worker with scope
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      console.log('SW registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePrompt(registration); // New version available
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

// Update prompt
function showUpdatePrompt(registration: ServiceWorkerRegistration) {
  const shouldUpdate = confirm('A new version is available. Update now?');
  if (shouldUpdate) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}
```

### Install Event
```javascript
// sw.js
const CACHE_NAME = 'app-v2';  // Increment on each deployment
const STATIC_ASSETS = [
  '/', '/index.html', '/app.js', '/styles.css',
  '/offline.html', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('Pre-cache failed:', err);
        // Don't fail install — partial cache is okay
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});
```

### Activate Event
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});
```

## Caching Strategies

### Strategy Decision Tree
```
Resource type → best caching strategy:
├── App shell (HTML, CSS, JS) → Cache First
├── API responses (frequently changing) → Network First
├── API responses (rarely changing) → Stale While Revalidate
├── Images, fonts, media → Cache First (with size limit)
├── User-specific content → Network Only
├── Analytics requests → Network Only
└── Offline fallback page → Precache (install event)
```

### Cache First (Static Assets)
```javascript
self.addEventListener('fetch', (event) => {
  if (isStaticAsset(event.request)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetchAndCache(event.request);
      })
    );
  }
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(js|css|png|jpg|svg|woff2?)$/.test(url.pathname);
}

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

### Network First (API Data)
```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open('api-cache-v1').then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || new Response(
              JSON.stringify({ error: 'offline', message: 'You are offline' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
  }
});
```

### Stale-While-Revalidate
```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/config/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          caches.open('config-cache-v1').then((cache) => cache.put(event.request, response));
          return response.clone();
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
```

## Web App Manifest

### Complete Manifest
```json
{
  "name": "My Progressive App",
  "short_name": "MyApp",
  "description": "A progressive web application with full offline support",
  "start_url": "/?source=pwa&utm_medium=standalone",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "scope": "/",
  "lang": "en-US",
  "dir": "ltr",
  "categories": ["business", "productivity"],
  "prefer_related_applications": false,
  "related_applications": [],
  "display_override": ["window-controls-overlay", "minimal-ui"],
  "edge_side_panel": {},
  "handle_links": "preferred",
  "launch_handler": {
    "client_mode": ["navigate-existing", "auto"]
  },
  "icons": [
    { "src": "/icons/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png", "sizes": "144x144", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/home.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/desktop.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" }
  ]
}
```

## Push Notifications

### Server-Side Push
```javascript
// Node.js server — send push notification
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid — remove from DB
      await removeSubscription(subscription);
    }
  }
}
```

### Client-Side Push Handler
```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const options = {
    title: data.title || 'New Notification',
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    image: data.image,
    vibrate: [200, 100, 200],
    timestamp: data.timestamp || Date.now(),
    data: { url: data.url, id: data.id },
    tag: data.tag || 'default',
    renotify: data.renotify || false,
    requireInteraction: data.persistent || false,
    silent: data.silent || false,
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) => c.url === url && 'focus' in c);
        if (existing) {
          existing.focus();
        } else {
          clients.openWindow(url);
        }
      })
  );
});
```

## Background Sync

### Periodic Background Sync
```javascript
// Register periodic sync
async function registerPeriodicSync() {
  const registration = await navigator.serviceWorker.ready;
  if ('periodicSync' in registration) {
    try {
      await registration.periodicSync.register('content-sync', {
        minInterval: 24 * 60 * 60 * 1000, // Once per day
      });
    } catch (error) {
      console.error('Periodic sync not supported:', error);
    }
  }
}

// Service worker handler
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(refreshCachedContent());
  }
});
```

## Key Points
- Register service worker with scope and update strategy
- Implement cache-first strategy for static assets
- Use network-first strategy for dynamic content
- Stale-while-revalidate for frequently accessed mutable data
- Cache API responses for offline data access
- Create offline fallback page (avoid browser error page)
- Use web app manifest for installability and splash screen
- Support display modes: standalone, fullscreen, minimal-ui
- Provide icons in multiple sizes with maskable support
- Set theme and background colors for native feel
- Implement push notifications with VAPID keys
- Use background sync for deferred actions (form submissions)
- Test PWAs with Lighthouse audits
- Handle service worker updates gracefully (update prompt)
- Clean old caches in activate event to avoid storage quota issues
- Use IndexedDB for structured offline data storage
- Implement periodic background sync for content refresh
- Handle offline analytics with queued requests
- Use Cache-Control and SW together for optimal performance
- Test on real devices with throttled network conditions

## Key Anti-Patterns
- Caching user-specific data across sessions without clearing
- No cache versioning → old caches accumulate
- Missing skipWaiting → users stay on old version
- Not cleaning old caches in activate → quota exceeded
- Overfetching in precache → install fails
- No offline fallback → users see network error
- Caching everything → storage quota exceeded
- Not testing with real network conditions
- Push notifications without clear value proposition
- Ignoring display mode differences (standalone vs browser)
- No update prompt → users stuck on cached old version
