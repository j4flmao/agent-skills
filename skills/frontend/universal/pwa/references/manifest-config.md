# Manifest Configuration Reference

## Minimal Manifest

```json
{
  "name": "My Progressive Web App",
  "short_name": "MyPWA",
  "start_url": "/",
  "display": "standalone",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
```

## Full Manifest

```json
{
  "name": "My Progressive Web App",
  "short_name": "MyPWA",
  "description": "A fully featured progressive web application",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "display_override": ["window-controls-overlay", "standalone"],
  "icons": [
    { "src": "/icons/icon-48.png", "sizes": "48x48", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-72.png", "sizes": "72x72", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-96.png", "sizes": "96x96", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-128.png", "sizes": "128x128", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-144.png", "sizes": "144x144", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-152.png", "sizes": "152x152", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-384.png", "sizes": "384x384", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/desktop.png", "sizes": "1280x800", "form_factor": "wide" },
    { "src": "/screenshots/mobile.png", "sizes": "390x844", "form_factor": "narrow" }
  ],
  "categories": ["productivity", "utilities"],
  "lang": "en-US",
  "dir": "ltr",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "prefer_related_applications": false,
  "related_applications": [],
  "edge_side_panel": {}
}
```

## Field Reference

| Field                      | Required | Description                              |
|----------------------------|----------|------------------------------------------|
| `name`                     | Yes      | Full app name (displayed on splash)      |
| `short_name`               | Yes      | 12-char max, shown on home screen        |
| `start_url`                | Yes      | Entry point URL                          |
| `display`                  | Yes      | `fullscreen`, `standalone`, `minimal-ui`, `browser` |
| `icons`                    | Yes      | At least 192x192 + 512x512               |
| `theme_color`              | No       | Browser toolbar color                    |
| `background_color`         | No       | Splash screen background                 |
| `description`              | No       | App store-style description              |
| `scope`                    | No       | Navigation scope (default: manifest dir) |
| `orientation`              | No       | Lock orientation: `portrait`, `landscape` |
| `categories`               | No       | Play Store category                      |
| `screenshots`              | No       | Store listing screenshots (wide/narrow)  |
| `display_override`         | No       | Fallback display modes                   |
| `prefer_related_applications` | No    | Suggest native app installation           |

## Display Modes

```
browser → minimal-ui → standalone → fullscreen
(least immersive)                    (most immersive)
```

## Icon Generation

```bash
# Generate all sizes from a single source
npx pwa-asset-generator logo.svg icons/ --background "#ffffff" --padding "20%"
```

## Link Manifest in HTML

```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#2563eb" />
```

## Build Tool Integration

### Vite

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  manifest: {
    name: 'My PWA',
    short_name: 'MyPWA',
    theme_color: '#2563eb',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
});
```

### Next.js (next-pwa)

```js
// next.config.js — manifest goes in public/manifest.json
```

## Validation

```bash
# Lighthouse audit
npx lighthouse https://example.com --view

# Manual checks
```

## Install Prompt Trigger

```js
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  showInstallButton();
});

async function handleInstallClick() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  console.log('Install outcome:', outcome);
}
```
