# Qwik Deployment and Scaling

## Overview

Qwik applications deploy to standard JavaScript runtimes (Node.js, Cloudflare Workers, Deno) but with unique considerations due to the resumability model. Unlike traditional SSR frameworks, Qwik generates HTML with serialized state and QRL (Qwik Resource Locator) references that point to lazily-loaded JavaScript chunks. This affects caching, CDN configuration, server resources, and scaling strategy.

## Deployment Architecture

### Request Flow

```
Client Browser
    |
    |-- 1. GET /
    v
CDN (Cloudflare, Fastly, Vercel Edge)
    |
    |-- 2. Cache hit? Serve static HTML
    |-- 3. Cache miss? Forward to origin
    v
Origin Server (Node, Cloudflare Worker, Deno)
    |
    |-- 4. SSR renders HTML with serialized state
    |-- 5. QRL references point to /build/q-*.js chunks
    v
Response: HTML + serialized state + QRLs
    |
Client Browser renders HTML immediately (no JS needed)
    |
    |-- 6. On interaction: fetch /build/q-*.js via QRL
    v
CDN serves static JS chunks (cachable forever)
```

### Key Difference from React SSR

| Aspect | React SSR | Qwik SSR |
|--------|-----------|----------|
| HTML output | HTML + script tags for hydration | HTML + serialized JSON + QRLs |
| Client JS | Must download + hydrate all components | Downloads only interaction handlers |
| First interaction | Waits for hydration to complete | Fetches handler chunk on demand |
| State in HTML | In `<script>` tags (JSON) | In `<script type="qwik/json">` |
| Caching | HTML caches poorly (hydration-bound) | HTML caches well (no hydration) |

## Deployment Targets

### Node.js (Self-Hosted or Fly.io)

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/kit'
import { qwikCity } from '@builder.io/qwik-city/vite'

export default defineConfig({
  plugins: [
    qwikCity(),
    qwikVite(),
  ],
})
```

Production server:

```ts
// server/entry.node.tsx
import { createServer } from 'http'
import { createQwikCity } from '@builder.io/qwik-city/middleware/node'
import render from '../dist/entry.ssr'

const { router, notFound } = createQwikCity({ render })

createServer(async (req, res) => {
  // Add cache headers
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300')

  // Serve static files from dist/
  if (req.url?.startsWith('/build/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }

  const result = await router(req, res)
  if (!result) await notFound(req, res)
}).listen(3000)
```

### Cloudflare Pages / Workers

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/kit'
import { qwikCity } from '@builder.io/qwik-city/vite'
import cloudflarePages from '@builder.io/qwik-city/vite/cloudflare-pages'

export default defineConfig({
  plugins: [
    qwikCity(),
    qwikVite({
      platforms: { cloudflarePages: {} },
    }),
    cloudflarePages(),
  ],
})
```

Cloudflare-specific considerations:
- Workers have 128MB memory limit — keep route loaders efficient
- Durable Objects can coordinate state across requests
- KV storage for session data (cookies are preferred for simple auth)
- Minify HTML and enable auto-minify in Cloudflare dashboard

### Vercel

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/kit'
import { qwikCity } from '@builder.io/qwik-city/vite'
import vercel from '@builder.io/qwik-city/vite/vercel'

export default defineConfig({
  plugins: [
    qwikCity(),
    qwikVite(),
    vercel(),
  ],
})
```

Vercel specifics:
- Edge Functions vs Serverless Functions: Qwik works on both
- ISR (Incremental Static Regeneration) for route-level caching
- Vercel Analytics can track Qwik chunk loading
- Configure `vercel.json` for headers and redirects

### Netlify

```ts
import netlify from '@builder.io/qwik-city/vite/netlify'

export default defineConfig({
  plugins: [
    qwikCity(),
    qwikVite(),
    netlify(),
  ],
})
```

Netlify specifics:
- Deploy to Netlify Edge Functions for global distribution
- Large HTML payloads (with serialized state) fit within Netlify limits
- Form handling with Netlify Forms works alongside Qwik Form component
- Branch deploys for preview environments

## Caching Strategy

### Build Artifacts (Immutable)

Files in `/build/` (Qwik chunks) contain content hashes in filenames:

```
q-abc123.js     -- Component A handler
q-def456.js     -- Component B render
q-ghi789.js     -- Shared utility
q-abc123.js.map -- Source map (exclude in production)
```

Set these headers:

```
Cache-Control: public, max-age=31536000, immutable
```

These chunks never change — the hash changes when content changes.

### HTML Pages (Conditionally Cacheable)

Qwik-generated HTML contains:
- Rendered HTML structure
- Serialized state in `<script type="qwik/json">`
- QRL references to lazy chunks

Because state changes per user for authenticated pages, caching depends on the route:

```ts
// Public route — cacheable
export const useProductLoader = routeLoader$(async () => {
  const product = await getProduct()
  return product
})
// Response gets: Cache-Control: public, max-age=300, s-maxage=3600

// Authenticated route — not cacheable
export const useDashboardLoader = routeLoader$(async ({ request }) => {
  const user = await getUserFromRequest(request)
  return getDashboard(user.id)
})
// Response gets: Cache-Control: private, no-store
```

### Service Worker Prefetch

Qwik's PrefetchServiceWorker preloads likely chunks based on user behavior:

```tsx
// root.tsx
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'

export default component$(() => {
  return (
    <html>
      <head>
        <PrefetchServiceWorker />
      </head>
      <body>
        <Router />
      </body>
    </html>
  )
})
```

The service worker:
- Intercepts link hover events to prefetch route chunks
- Preloads visible component chunks on page load
- Caches prefetched chunks for instant navigation
- Falls back to network for uncached chunks

### CDN Configuration

```
// Cloudflare Pages headers
/_headers:
  /build/*
    Cache-Control: public, max-age=31536000, immutable
  /assets/*
    Cache-Control: public, max-age=31536000, immutable
  /*
    Cache-Control: public, max-age=0, s-maxage=300
```

## Scaling Considerations

### SSR Request Cost

Qwik SSR is more expensive per request than React SSR because:
1. Component tree traversal with state serialization
2. QRL generation for all `$` boundaries
3. JSON serialization of all useStore/useSignal state
4. HTML generation with data-qwik attributes

Mitigation strategies:

```ts
// 1. Reduce serialization size
// Bad — serializes everything
const state = useStore({ data: massiveList, metadata: {}, config: {} })

// Good — only serialize what's needed
const data = useSignal(massiveList)  // Only data, not metadata/config

// 2. Use routeLoader$ instead of component state for server data
// routeLoader$ state can be cached server-side

// 3. Stream large responses
export const useData = routeLoader$(async () => {
  const stream = await fetchLargeDataset()
  // Process and return only what's needed
  return stream.slice(0, 100)
})
```

### Memory Usage

| Element | Memory per Request |
|---------|-------------------|
| Route loader result | Proportional to data size |
| useStore state | Proportional to keys + values |
| useSignal | ~64 bytes per signal |
| QRL map | ~256 bytes per route |
| Serialized JSON | ~1.5x the data size |

For high-traffic routes:
- Minimize signal/store usage in layout components
- Use routeLoader$ with external caching (Redis, Vercel KV)
- Avoid storing large arrays in useStore — paginate instead

### Horizontal Scaling

Node.js deployments:

```ts
// Use cluster mode
import cluster from 'cluster'
import { cpus } from 'os'

if (cluster.isPrimary) {
  const workerCount = cpus().length
  for (let i = 0; i < workerCount; i++) cluster.fork()
} else {
  // Run Qwik server
}
```

Cloudflare Workers scale automatically. No cluster configuration needed.

Vercel scales per region automatically. Configure regions via `vercel.json`:
```json
{
  "regions": ["iad1", "hkg1", "lhr1"]
}
```

### Database Connection Pooling

Qwik route loaders run on every request. Database connections should be pooled:

```ts
// lib/db.ts
import { PrismaClient } from '@prisma/client'

let db: PrismaClient

export function getDb() {
  if (!db) db = new PrismaClient({ log: ['error'] })
  return db
}

// In route loader
export const useProducts = routeLoader$(async () => {
  return getDb().product.findMany({ take: 50 })
})
```

## Environment Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [qwikCity(), qwikVite()],
  define: {
    'process.env.API_URL': JSON.stringify(
      mode === 'production'
        ? 'https://api.example.com'
        : 'http://localhost:4000'
    ),
  },
}))
```

Use environment variables for:
- API endpoints
- Database URLs
- Session secrets
- Feature flags
- CDN origins

## Monitoring and Observability

### Server Timing

```tsx
export const useData = routeLoader$(async ({ request }) => {
  const start = Date.now()
  const data = await fetchData()
  const duration = Date.now() - start

  // Add server-timing header
  request.headers.set('Server-Timing', `db;dur=${duration}`)
  return data
})
```

### Error Tracking

```tsx
// entry.ssr.tsx
import { logError } from './lib/error-tracking'

export function handleError(error: unknown) {
  logError(error)
  return { status: 500, message: 'Internal Server Error' }
}
```

### Performance Metrics to Monitor

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| SSR duration | Time to render + serialize HTML | <200ms |
| HTML size | Includes serialized state | <100KB |
| QRL chunks per page | Number of lazy boundaries | <50 |
| First chunk fetch | Time to load first interaction chunk | <100ms |
| Serialized state size | JSON in HTML | <50KB |

## Build Optimization

### Production Build

```bash
npm run build
# Output:
#   dist/
#     build/          # Qwik chunks (immutable, cachable)
#     assets/         # Static assets (images, fonts)
#     entry.ssr.js    # SSR entry
#     index.html      # Client shell
#     q-manifest.json # QRL mapping
```

### Bundle Analysis

```bash
# Analyze chunk sizes
npx qwik inspect

# Output sample:
# Route: /products/[id]
#   Chunks: 5
#   Total size: 12.3KB
#   Largest chunk: q-abc123.js (4.1KB) — ProductDetail component
#   State serialization: 2.1KB
```

### Reducing Chunk Count

While Qwik's per-`$` splitting is a feature, hundreds of tiny chunks can cause connection overhead:

```tsx
// If you have many small event handlers, consider grouping:
// Before: 5 separate chunks
<button onClick$={handler1} onMouseEnter$={handler2} onFocus$={handler3} />

// After: 1 chunk (group related handlers)
const handlers = $(() => {
  return { onClick: handler1, onMouseEnter: handler2, onFocus: handler3 }
})
```

## Static Generation (SSG)

Qwik City supports SSG for content pages:

```tsx
// src/routes/blog/[slug]/index.tsx
export const onGet: RequestHandler = async ({ params, staticGenerate }) => {
  if (staticGenerate) {
    const post = await getPost(params.slug)
    return post
  }
}

export async function onStaticGenerate() {
  const posts = await getAllPosts()
  return posts.map(post => ({ params: { slug: post.slug } }))
}
```

SSG output goes to `dist/` as static HTML files. These can be served from any CDN without an origin server.

## Emergency Scaling Playbook

1. **High SSR Latency**: Move to SSG for content routes, enable CDN caching for public routes
2. **Memory Pressure**: Reduce serialized state size, paginate large datasets
3. **Chunk Loading Slow**: Verify PrefetchServiceWorker is enabled, check CDN cache hit rate
4. **Database Overload**: Add connection pooling, implement dataloader pattern, cache loader results
5. **HTML Too Large**: Minimize useStore depth, split state across multiple signals, defer non-critical data

## Summary

| Consideration | Recommendation |
|--------------|---------------|
| Default platform | Cloudflare Pages (global, cheap, Worker-compatible) |
| Authentication | Cookie-based sessions (no DB needed) |
| HTML caching | Public routes: s-maxage=3600 |
| Build chunks | Cache-Control: immutable, 1 year |
| State size | Keep serialized state under 50KB per page |
| Route loaders | Use external caching (Redis, KV) for expensive queries |
| Scaling | Horizontal with load balancer or Workers auto-scaling |
| Monitoring | Track SSR duration, HTML size, chunk fetch times |
