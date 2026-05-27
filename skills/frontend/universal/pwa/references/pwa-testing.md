# PWA Testing Reference

## Manifest Testing

```javascript
test('manifest has required properties', async () => {
  const response = await fetch('/manifest.json');
  const manifest = await response.json();
  
  expect(manifest.name).toBeDefined();
  expect(manifest.short_name).toBeDefined();
  expect(manifest.start_url).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});
```

## Service Worker Testing

```javascript
// Test SW registration
test('registers service worker', async () => {
  const registration = await navigator.serviceWorker.register('/sw.js');
  expect(registration.active).toBeTruthy();
});

// Test cache strategy
test('caches responses on fetch', async () => {
  const cache = await caches.open('v1');
  const response = new Response('{"ok":true}');
  cache.put('/api/health', response);
  
  const cached = await cache.match('/api/health');
  expect(cached).toBeTruthy();
});
```

## Key Points

- Manifest provides installable PWA metadata
- Service worker registration tested in browser context
- Cache strategies verified with Cache API assertions
- Offline page served when network unavailable
- Background sync tested with SyncManager API
- Push notifications tested with Notification API mock
- Lighthouse audit scores performance, accessibility, PWA
- Install prompt event tested with beforeinstallprompt
- Update flow verified with updatefound and statechange
- IndexedDB persistence tested for offline data storage
