---
name: frontend-browser-caching
description: >
  Use this skill when the user says 'browser caching', 'cache headers', 'service worker', 'SW', 'stale-while-revalidate', 'SWR', 'cache strategy', 'Cache-Control', 'ETag', 'cache busting', 'offline caching', or when optimizing frontend load performance. This skill enforces: Cache-Control headers with appropriate max-age, service worker caching with stale-while-revalidate pattern, cache-busted asset URLs, and offline fallback. Works with any frontend framework. Do NOT use for: backend response caching, CDN configuration, database query caching.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, caching, performance, universal]
---

# Browser Caching

## Purpose
Optimize load performance via HTTP cache headers, service worker caching, and stale-while-revalidate. Minimize network round-trips while serving fresh content.

## Agent Protocol

### Trigger
Exact user phrases: "browser caching", "cache headers", "service worker", "SW", "stale-while-revalidate", "SWR", "cache strategy", "Cache-Control", "ETag", "cache busting", "offline caching".

### Input Context
Before activating, verify:
- Whether the focus is HTTP cache headers, service worker, or both.
- The build tool (Vite, Webpack, Next.js) for cache-busting config.

### Output Artifact
No file output. Produces caching strategy, header configs, or service worker code as text.

### Response Format
```
Resource: {type}
Strategy: {cache strategy}
Config: {code block}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Static assets use `Cache-Control: public, max-age=31536000, immutable`.
- [ ] HTML uses `Cache-Control: no-cache` for freshness validation.
- [ ] API responses use appropriate `Cache-Control` or `ETag`.
- [ ] Service worker registers and caches static assets on install.
- [ ] Stale-while-revalidate pattern for data fetching.
- [ ] Cache-busting via content hashes in filenames.

### Max Response Length
4096 tokens.

## Workflow

### Step 1: HTTP Cache Headers by Resource Type
```http
# Static assets (JS, CSS, images, fonts)
Cache-Control: public, max-age=31536000, immutable

# HTML pages
Cache-Control: no-cache
ETag: "abc123"

# API responses
Cache-Control: public, max-age=60, stale-while-revalidate=600

# User-specific content
Cache-Control: private, no-cache
```

### Step 2: Service Worker Install & Cache
```typescript
const CACHE_NAME = 'static-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css',
  '/logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})
```

### Step 3: Stale-While-Revalidate Fetch Handler
```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()))
        }
        return response
      })
      // Return cached immediately, update in background
      return cached ?? fetchPromise
    })
  )
})
```

### Step 4: Cache Busting with Content Hash
```typescript
// Vite — automatic content hashing
// build.rollupOptions.output.entryFileNames: '[name]-[hash].js'

// Webpack
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].js',
}

// Import will resolve to cache-busted URL
import('/assets/app-abc123def.js')
```

### Step 5: Cache Strategy Decision Table
| Resource | Strategy | Cache-Control | SW Behavior |
|----------|----------|---------------|-------------|
| JS/CSS bundles | Cache-first | `max-age=31536000, immutable` | Pre-cache on install |
| Images | Cache-first | `max-age=31536000, immutable` | Cache on first fetch |
| HTML pages | Network-first | `no-cache` | Network with fallback |
| API data | SWR | `max-age=60, stale-while-revalidate=600` | Stale-while-revalidate |
| User data | Network-only | `private, no-cache` | Bypass cache |

## Rules
- Static assets: `immutable` + `max-age=1 year` + content hash in filename.
- HTML: `no-cache` with `ETag` — never cache HTML without revalidation.
- Service worker: update version (cache name) on every deploy.
- SWR: serve cached instantly, fetch fresh in background, update cache.
- Never cache user-specific or sensitive data in shared caches.
- Use `Cache-Control: private` for authenticated responses.

## References
  - references/cache-strategies.md — Cache Strategies
  - references/caching-headers.md — Caching Headers
  - references/caching-strategies.md — Caching Strategies
  - references/local-storage-strategies.md — Local Storage and Cache Strategies
  - references/service-worker-caching.md — Service Worker Caching
  - references/sw-caching.md — Service Worker Caching
## Handoff
No artifact produced.
Next skill: `performance` — combine caching with other perf optimization.
Carry forward: cache strategy per resource type, SW cache name version, hash config.
