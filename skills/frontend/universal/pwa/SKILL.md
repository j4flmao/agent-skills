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
Turn web applications into installable, offline-capable progressive web apps with robust service workers, manifest configuration, and caching strategies.

## Agent Protocol

### Trigger
Exact phrases: "add pwa", "service worker", "offline support", "web manifest", "workbox", "install prompt", "offline first", "cache strategy", "pwa audit", "progressive web app"

### Input Context
- Check for existing `sw.js`, `service-worker.js`, or Workbox-generated service worker files
- Verify presence and content of `manifest.json` or `manifest.webmanifest`
- Identify the build tool (Vite, Webpack, Next.js, Astro, etc.) for plugin-based SW generation
- Determine caching requirements: static assets, API responses, full offline vs. degraded offline

### Output Artifact
No file output unless requested.

### Response Format
1. Output service worker registration code and SW logic in full — never truncate with `/* ... */`.
2. For Workbox-based setups, output the `workbox-config.js` plus the import statement.
3. For the manifest, output the complete JSON object with all required and recommended fields.
4. Always include the registration snippet to be placed in the app entry point.
5. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Service worker registers without errors in Chrome DevTools > Application > Service Workers
- [ ] At least one offline page (custom or app shell) renders when network is disconnected
- [ ] `manifest.json` includes `name`, `short_name`, `start_url`, `display`, `icons` (192 and 512), `theme_color`, `background_color`
- [ ] Caching strategy is appropriate for resource type (CacheFirst for static, NetworkFirst for API, StaleWhileRevalidate for mixed)
- [ ] Service worker handles updates properly: `install` activates immediately, `activate` cleans old caches, `message` event listens for skip-waiting
- [ ] Lighthouse PWA audit passes all "installable" and "PWA optimized" checks
- [ ] HTTPS is enforced or a note is added that SW requires HTTPS (or localhost)

### Max Response Length
150 lines for SW + manifest output combined.

## Workflow

### Step 1: Choose SW Approach
If the build tool supports it (Vite via `vite-plugin-pwa`, Next.js via `next-pwa`, Webpack via `workbox-webpack-plugin`), use the plugin. For vanilla setups, write a raw service worker with `self.addEventListener` and Workbox `importScripts`.

### Step 2: Create Manifest
Write a `manifest.json` with at minimum: `name`, `short_name`, `start_url`, `display: 'standalone'`, `icons` (192x192 and 512x512 PNGs), `theme_color`, `background_color`. Add `description`, `categories`, `screenshots` for rich install experience.

### Step 3: Define Caching Strategies
- **Static assets** (JS, CSS, fonts, images): `CacheFirst` with versioned cache name
- **API calls**: `NetworkFirst` with 3-second timeout, fallback to cache
- **Third-party resources**: `StaleWhileRevalidate`
- **Navigation requests**: `NetworkFirst` with app shell fallback

### Step 4: Implement Update Flow
In `install` event, `waitUntil` pre-caches critical assets. In `activate`, `waitUntil` deletes old cache versions. Listen for `message` events from the client to call `self.skipWaiting()`. On the client, listen for `statechange` on the registration to show an "Update available" toast.

### Step 5: Test Offline
Use Chrome DevTools > Network tab > Offline checkbox. Verify: page loads from cache, API data shows cached response, and any offline-specific UI (banner, indicator) appears.

## Rules
- Never cache user-specific or sensitive data (auth tokens, personal info) in the service worker.
- Always version cache names with a `CACHE_VERSION` constant at the top of the SW file.
- Never use `CacheFirst` for API requests that return dynamic data — use `NetworkFirst` or `StaleWhileRevalidate`.
- Always register the service worker from the app entry point (not from inside a component or route).
- Always handle `skip-waiting` via a `message` event listener — never force update without user consent.
- Never use `eval` or `new Function` inside a service worker (Content Security Policy restriction).
- Always purge unused caches in the `activate` event to prevent storage quota issues.

## References
- `references/service-worker.md`
- `references/offline-strategies.md`
- `references/manifest-config.md`
- `references/pwa-audit.md`

## Handoff
No artifact produced unless requested.
Next skill: `frontend-seo` (if the PWA needs search engine discoverability)
Carry forward: SW registration pattern, manifest values, caching strategy decisions
