# PWA Audit Reference

## Lighthouse PWA Checks

### Installable (Required)

| Check                | Requirement                                  |
|----------------------|----------------------------------------------|
| manifest exists      | JSON served from `<link rel="manifest">`     |
| manifest has name    | `name` or `short_name` present               |
| manifest has icons   | 192x192 + 512x512 PNGs                       |
| manifest display     | `standalone`, `minimal-ui`, or `fullscreen`  |
| manifest start_url   | Valid URL, same-origin                       |
| service worker       | Registered on HTTP 200                        |
| SW controls start_url| Fetch event handler present                  |
| HTTPS                | Served over HTTPS (except localhost)         |

### PWA Optimized (Recommended)

| Check                   | Requirement                                  |
|-------------------------|----------------------------------------------|
| Content-width           | Content fits viewport without scroll         |
| Page load on 3G         | Interactive in < 5s                          |
| Manifest theme_color    | Matches page theme-color meta tag            |
| Splash screen           | Generated from manifest icons + background_color |
| Address bar matches     | `theme_color` in manifest and meta tag match  |
| Offline fallback        | Custom offline page or app shell             |

## Common Audit Failures & Fixes

### SW Registration Returns 404

```
Fix: Move sw.js to public/ directory. Verify path matches registration call.
```

### Manifest Icon Missing or Wrong Size

```
Required: 192x192 and 512x512 PNGs
Fix: Generate via pwa-asset-generator or manually create both sizes.
```

### Start URL Not Controlled by SW

```
Fix: Ensure SW scope covers start_url. Use scope: '/' in SW registration.
Precache start_url in SW install event.
```

### No Splash Screen

```
Fix: manifest must have background_color + icons[192] and icons[512].
Apple: <link rel="apple-touch-startup-image"> is not needed — iOS generates
splash from manifest automatically in iOS 16.4+.
```

### Page Load Not Fast Enough on 3G

```
Target: First meaningful paint < 5s on simulated 3G.
Fix: Precache critical CSS/JS in SW install step. Minimize render-blocking
resources. Use <link rel="preload"> for above-the-fold assets.
```

## Testing Checklist

- [ ] Register SW — DevTools > Application > Service Workers shows "activated"
- [ ] Offline navigation — DevTools > Network > Offline + reload → page loads
- [ ] Manifest loads — DevTools > Application > Manifest shows all fields
- [ ] Install prompt — `beforeinstallprompt` fires (Chrome only, requires user gesture)
- [ ] Icons render — Home screen icon appears correctly on Android/iOS
- [ ] Splash screen — Colored splash screen shows on cold start
- [ ] Cache invalidation — New SW version → old cache cleared, update toast shown
- [ ] HTTPS — `curl -I https://example.com/sw.js` returns 200
- [ ] No console errors — SW registration errors logged in DevTools Console

## Tools

| Tool                      | Purpose                              |
|---------------------------|--------------------------------------|
| Chrome DevTools > Application | Full SW, manifest, cache inspection |
| Lighthouse                | Automated PWA audit                  |
| Workbox CLI               | Generate SW from config              |
| PWA Asset Generator       | Generate all icon sizes              |
| PWABuilder                | Package for app stores               |
| pwmetrics                 | PWA performance metrics              |
| Chrome Web Store          | Publish packaged PWA                 |

## Debugging SW Lifecycle

```js
// sw.js — verbose logging
self.addEventListener('install', (event) => {
  console.log('[SW] Install', event);
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate', event);
});

self.addEventListener('fetch', (event) => {
  console.log('[SW] Fetch:', event.request.url);
});

self.addEventListener('message', (event) => {
  console.log('[SW] Message:', event.data);
});
```

## Lighthouse Score Targets

```
Production PWA:  90+ across all categories
Minimum PWA:     80+ installable, pass all required checks
MVP/Trial:       50+ with all required checks passing
```
