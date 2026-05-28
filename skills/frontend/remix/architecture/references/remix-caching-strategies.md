# Remix Caching Strategies

## Introduction

Remix uses web-native HTTP caching through Cache-Control headers. Unlike frameworks that implement their own caching layers (Next.js ISR, Nuxt render cache), Remix embraces the web platform: if it can be cached via HTTP, it's handled by the browser and CDN. This makes Remix applications naturally cacheable with any CDN provider.

## Caching Philosophy

### Remix's Approach

1. **Loaders produce responses** — Every loader returns a Response with headers
2. **Cache-Control is declarative** — Set headers on loader responses
3. **CDN handles caching** — No framework-level cache layer
4. **ETag and Last-Modified for validation** — Conditional requests
5. **Stale-while-revalidate for freshness** — Background refresh

### Cache Layers

```
Browser Cache (private)
  |
  CDN Cache (public)
    |
  Origin Server (loaders)
```

Each layer respects Cache-Control directives from the origin.

## Cache-Control Directives

### Directive Reference

```
Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=60
```

| Directive | Affects | Purpose |
|-----------|---------|---------|
| public | CDN + Browser | Any cache can store |
| private | Browser only | Only browser cache |
| no-cache | All | Must revalidate with origin |
| no-store | All | Never cache |
| max-age | Browser | Browser cache duration (seconds) |
| s-maxage | CDN | CDN cache duration (seconds) |
| stale-while-revalidate | CDN | Serve stale while refetching (seconds) |
| stale-if-error | CDN | Serve stale on origin error (seconds) |
| must-revalidate | All | Obey freshness lifetime |

### Common Cache Profiles

```ts
// Public, short cache — public content
Cache-Control: public, max-age=60, s-maxage=300

// Public, long cache — rarely changing
Cache-Control: public, max-age=3600, s-maxage=86400

// Public, stale-while-revalidate — content pages
Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=60

// Private — user-specific data
Cache-Control: private, max-age=60

// Private, no cache — sensitive data
Cache-Control: private, no-cache

// No cache at all
Cache-Control: no-store

// Custom (CDN revalidate)
Cache-Control: public, max-age=0, s-maxage=600, must-revalidate
```

## Loader Caching Patterns

### Pattern 1: Static Content

```tsx
// app/routes/blog.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const posts = await db.post.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  return json(
    { posts },
    {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=60',
      },
    }
  )
}
```

### Pattern 2: Dynamic but Cacheable

```tsx
// app/routes/products/$slug.tsx
export async function loader({ params, request }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
  })

  if (!product) throw new Response('Not Found', { status: 404 })

  return json(
    { product },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding',
      },
    }
  )
}
```

### Pattern 3: Authenticated Routes (Never Cache)

```tsx
// app/routes/dashboard.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  const dashboard = await db.dashboard.findUnique({
    where: { userId },
  })

  return json(
    { dashboard },
    {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    }
  )
}
```

### Pattern 4: ETag-Based Caching

```tsx
// app/routes/api/data.ts
import { json } from '@remix-run/node'
import crypto from 'crypto'

export async function loader({ request }: LoaderFunctionArgs) {
  const data = await fetchExpensiveData()
  const dataJson = JSON.stringify(data)
  const etag = crypto.createHash('md5').update(dataJson).digest('hex')

  // If-None-Match check
  const ifNoneMatch = request.headers.get('If-None-Match')
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 })
  }

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'ETag': etag,
    },
  })
}
```

### Pattern 5: Conditional Headers

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const data = await fetchData()
  const lastModified = data.updatedAt.toUTCString()

  // If-Modified-Since check
  const ifModifiedSince = request.headers.get('If-Modified-Since')
  if (ifModifiedSince && new Date(ifModifiedSince) >= data.updatedAt) {
    return new Response(null, { status: 304 })
  }

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Last-Modified': lastModified,
    },
  })
}
```

## Resource Route Caching

### API Endpoint Caching

```tsx
// app/routes/api.products.ts
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')

  const products = await db.product.findMany({
    where: category ? { category } : undefined,
    orderBy: { name: 'asc' },
  })

  return json(products, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=1800',
      'Vary': 'Accept-Encoding',
    },
  })
}
```

### Server-Sent Events (No Cache)

```tsx
// app/routes/api.events.ts
export async function loader({ request }: LoaderFunctionArgs) {
  return new Response(null, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
    },
  })
}
```

## CDN-Specific Configurations

### Cloudflare

```toml
# wrangler.toml
[[rules]]
  {action = "set_headers", glob = "*/assets/*", headers = {"Cache-Control" = "public, max-age=31536000, immutable"}}

[[rules]]
  {action = "set_headers", glob = "*/build/*", headers = {"Cache-Control" = "public, max-age=31536000, immutable"}}

# Page rules in Cloudflare dashboard
# Cache Level: Standard
# Edge Cache TTL: 1 hour for /*
```

### Vercel

```json
// vercel.json
{
  "headers": [
    {
      "source": "/build/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

Vercel ISR:

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
```

### Fly.io

```ts
// fly.toml
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
```

## Advanced Caching Patterns

### Pattern 1: Cache-First with Background Refresh

```tsx
// app/services/cache.server.ts
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<any>>()

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const existing = this.store.get(key)

    if (existing && existing.expiresAt > Date.now()) {
      // Serve stale, refresh in background
      if (existing.expiresAt - Date.now() < ttlMs * 0.2) {
        fetcher().then(data => {
          this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
        })
      }
      return existing.data
    }

    const data = await fetcher()
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
    return data
  }

  invalidate(key: string) {
    this.store.delete(key)
  }
}

export const cache = new MemoryCache()
```

```tsx
// In loader
export async function loader({ request }: LoaderFunctionArgs) {
  const data = await cache.getOrSet(
    'products',
    () => db.product.findMany({ take: 100 }),
    60_000 // 1 minute TTL
  )

  return json(
    { products: data },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    }
  )
}
```

### Pattern 2: DataLoader Pattern

```tsx
import DataLoader from 'dataloader'

// app/services/dataloader.server.ts
export function createProductLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const products = await db.product.findMany({
      where: { id: { in: ids as string[] } },
    })

    const productMap = new Map(products.map(p => [p.id, p]))
    return ids.map(id => productMap.get(id) ?? null)
  })
}
```

```tsx
// In loader
export async function loader({ request }: LoaderFunctionArgs) {
  // DataLoader batches and caches per-request
  const loader = createProductLoader()

  const [product, related] = await Promise.all([
    loader.load(params.id),
    loader.loadMany(relatedIds),
  ])
}
```

### Pattern 3: Stale-While-Revalidate Pattern

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const data = await db.post.findMany()

  return json(data, {
    headers: {
      // CDN caches for 1 hour, serves stale for 1 hour while refreshing
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=3600',
    },
  })
}
```

This is the most important caching pattern for content websites:
- First request: CDN caches response for 1 hour
- Within 1 hour: CDN serves cached copy
- 1-2 hours: CDN serves stale copy while fetching fresh version in background
- After 2 hours: CDN fetches fresh version (stale-while-revalidate expired)

### Pattern 4: Cache Invalidation

```tsx
// app/routes/admin.products.$id.tsx
export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'update') {
    await db.product.update({
      where: { id: params.id },
      data: { name: formData.get('name') },
    })

    // Invalidate cache by purging CDN
    await purgeCache(`/products/${params.id}`)
    return redirect(`/products/${params.id}`)
  }
}
```

### Pattern 5: Vary Header

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const userAgent = request.headers.get('User-Agent') ?? ''
  const isMobile = /mobile/i.test(userAgent)

  const data = isMobile
    ? await getMobileData()
    : await getDesktopData()

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Vary': 'User-Agent, Accept-Encoding',
    },
  })
}
```

## Static Asset Caching

### Build Artifacts

```tsx
// app/root.tsx
export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: '/build/main.css',
  },
]

// Serve build files with immutable cache
```

Configure in remix.config or reverse proxy:

```ts
// Server-side
if (request.url.pathname.startsWith('/build/')) {
  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
```

### Image Assets

```tsx
// Resource route for optimized images
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const imagePath = url.searchParams.get('path')

  const image = await processImage(imagePath)
  return new Response(image, {
    headers: {
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Type': 'image/webp',
    },
  })
}
```

## Deferred Data Caching

```tsx
// app/routes/dashboard.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  // Critical data — add cache control
  const criticalData = await getCriticalData()

  // Non-critical data — defer loading
  const nonCriticalData = getNonCriticalData()

  return defer(
    {
      criticalData,
      nonCriticalData,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    }
  )
}
```

## Caching Decision Matrix

| Content Type | Cache-Control | CDN TTL | Revalidation |
|-------------|---------------|---------|--------------|
| Blog posts | public, max-age=3600 | 1 hour | stale-while-revalidate |
| Product pages | public, max-age=300 | 5 minutes | stale-while-revalidate |
| User settings | private, no-cache | None | Always fresh |
| API catalog | public, max-age=600 | 10 minutes | ETag |
| Static assets | immutable, 1 year | 1 year | Never |
| RSS feed | public, max-age=1800 | 30 minutes | stale-while-revalidate |
| Search results | public, max-age=60 | 1 minute | Vary on query |
| Auth pages | private, no-store | None | Never |

## Caching Headers Helper

```tsx
// app/services/cache.server.ts
type CacheProfile = 'static' | 'content' | 'dynamic' | 'private' | 'api' | 'never'

const cacheProfiles: Record<CacheProfile, string> = {
  static: 'public, max-age=31536000, immutable',
  content: 'public, max-age=600, s-maxage=3600, stale-while-revalidate=60',
  dynamic: 'public, max-age=60, s-maxage=300, stale-while-revalidate=30',
  private: 'private, max-age=60',
  api: 'public, max-age=30, s-maxage=60',
  never: 'private, no-cache, no-store',
}

export function cacheHeaders(profile: CacheProfile): HeadersInit {
  return { 'Cache-Control': cacheProfiles[profile] }
}

// Usage
export async function loader() {
  return json(data, { headers: cacheHeaders('content') })
}
```

## Monitoring Cache Hit Rates

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const cacheStatus = request.headers.get('CF-Cache-Status') || 'MISS'

  // Log cache performance
  console.log(`[Cache] ${request.url}: ${cacheStatus}`)

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'X-Cache-Status': cacheStatus,
    },
  })
}
```

CDN cache status values:
- HIT: Served from CDN cache
- MISS: Not in cache, fetched from origin
- REVALIDATED: Served stale, revalidated
- EXPIRED: TTL expired, re-fetched
- DYNAMIC: Bypassed cache (no-store)

## Summary

| Strategy | Implementation | Use Case |
|----------|---------------|----------|
| max-age | Cache-Control header | Browser caching |
| s-maxage | Cache-Control header | CDN caching |
| stale-while-revalidate | Cache-Control header | Background refresh |
| ETag | ETag + If-None-Match | Conditional requests |
| Last-Modified | Last-Modified + If-Modified-Since | Time-based validation |
| Immutable | Cache-Control: immutable | Build artifacts |
| Vary | Vary header | Content negotiation |
| In-memory cache | Map/Redis | Server-side caching |
| DataLoader | dataloader library | Batched/request-level cache |
