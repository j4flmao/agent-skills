# Oak Performance Optimization

## Connection Pooling

Configure database connection pool for optimal throughput:

```typescript
import { Pool } from 'postgres'

const pool = new Pool(
  Deno.env.get('DATABASE_URL')!,
  20, // max connections
  true // lazy
)

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect()
  try {
    return await client.queryArray(text, params)
  } finally {
    client.release()
  }
}

// With Deno KV
const kv = await Deno.openKv()
```

## Response Compression

```typescript
import { Middleware } from 'oak'
import { compress } from 'std/http/compression.ts'

export const compressionMiddleware: Middleware = async (ctx, next) => {
  await next()
  const body = ctx.response.body
  if (body && typeof body === 'string' && body.length > 1024) {
    const accept = ctx.request.headers.get('Accept-Encoding') ?? ''
    if (accept.includes('gzip')) {
      ctx.response.headers.set('Content-Encoding', 'gzip')
      ctx.response.body = compress(body, 'gzip')
    }
  }
}
```

## Request Body Size Limits

```typescript
import { Middleware } from 'oak'

const MAX_BODY_SIZE = 1024 * 1024 // 1MB

export const bodyLimitMiddleware: Middleware = async (ctx, next) => {
  const contentLength = parseInt(ctx.request.headers.get('Content-Length') ?? '0')
  if (contentLength > MAX_BODY_SIZE) {
    ctx.response.status = 413
    ctx.response.body = { error: 'Request body too large' }
    return
  }
  await next()
}
```

## Caching Headers

```typescript
export const cacheMiddleware: Middleware = async (ctx, next) => {
  await next()
  if (ctx.response.status === 200) {
    ctx.response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    ctx.response.headers.set('Pragma', 'no-cache')
    ctx.response.headers.set('Expires', '0')
  }
}

// For static assets
export const staticCacheMiddleware: Middleware = async (ctx, next) => {
  await next()
  if (ctx.response.status === 200 && ctx.request.url.pathname.startsWith('/static')) {
    ctx.response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
}
```

## Deno KV Caching

```typescript
const kv = await Deno.openKv()

async function getCached<T>(key: string, ttlMs: number, fetch: () => Promise<T>): Promise<T> {
  const cached = await kv.get<string>([key])
  if (cached && cached.versionstamp) {
    const age = Date.now() - (await kv.get<number>([key, 'ts'])).value!
    if (age < ttlMs) {
      return JSON.parse(cached.value)
    }
  }
  const data = await fetch()
  await kv.set([key], JSON.stringify(data))
  await kv.set([key, 'ts'], Date.now())
  return data
}

// Usage
orderRouter.get('/dashboard', async (ctx) => {
  const stats = await getCached('dashboard-stats', 30000, () => orderService.getStats())
  ctx.response.body = { success: true, data: stats }
})
```

## Load Testing

```typescript
// bench.ts
import { createApp } from './app.ts'

const app = createApp()
const listener = app.listen({ port: 0 })
const port = (await listener).port

async function bench(endpoint: string, concurrent: number, requests: number) {
  const start = Date.now()
  const results = await Promise.all(
    Array.from({ length: concurrent }, async () => {
      for (let i = 0; i < requests / concurrent; i++) {
        await fetch(`http://localhost:${port}${endpoint}`)
      }
    })
  )
  const duration = Date.now() - start
  console.log(`${endpoint}: ${requests} requests in ${duration}ms (${(requests / duration * 1000).toFixed(0)} req/s)`)
}

await bench('/api/orders', 10, 1000)
listener.close()
```

## Profiling

```typescript
import { Middleware } from 'oak'

export const profilingMiddleware: Middleware = async (ctx, next) => {
  const start = performance.now()
  await next()
  const duration = performance.now() - start
  const path = ctx.request.url.pathname
  const method = ctx.request.method
  const status = ctx.response.status

  if (duration > 100) {
    console.warn(`SLOW: ${method} ${path} ${status} ${duration.toFixed(2)}ms`)
  }

  metrics.record(method, path, status, duration)
}

// Simple metrics collector
const metrics = {
  data: new Map<string, { count: number; total: number; max: number }>(),

  record(method: string, path: string, status: number, duration: number) {
    const key = `${method} ${path}`
    const existing = this.data.get(key) ?? { count: 0, total: 0, max: 0 }
    existing.count++
    existing.total += duration
    existing.max = Math.max(existing.max, duration)
    this.data.set(key, existing)
  },

  report() {
    for (const [key, val] of this.data) {
      console.log(`${key}: avg=${(val.total / val.count).toFixed(2)}ms max=${val.max.toFixed(2)}ms count=${val.count}`)
    }
  },
}

// Expose metrics endpoint
export function metricsRouter() {
  const r = new Router()
  r.get('/metrics', (ctx) => {
    ctx.response.body = metrics.report()
  })
  return r
}
```

## Timeout Handling

```typescript
export const timeoutMiddleware: Middleware = async (ctx, next) => {
  const timeout = setTimeout(() => {
    if (!ctx.response.writable) return
    ctx.response.status = 504
    ctx.response.body = { error: 'Gateway timeout' }
  }, 30000)

  try {
    await next()
  } finally {
    clearTimeout(timeout)
  }
}
```

## Rate Limiting with Deno KV

```typescript
import { Middleware } from 'oak'
import type { Context } from 'oak'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const kv = await Deno.openKv()

export function rateLimiter(config: RateLimitConfig): Middleware {
  return async (ctx, next) => {
    const ip = ctx.request.ip
    const now = Date.now()
    const windowStart = now - config.windowMs

    const key = ['ratelimit', ip, Math.floor(now / config.windowMs)]
    const count = await kv.get<number>(key)
    const currentCount = count?.value ?? 0

    if (currentCount >= config.maxRequests) {
      ctx.response.status = 429
      ctx.response.body = {
        error: 'Too many requests',
        retryAfter: Math.ceil(config.windowMs / 1000),
      }
      ctx.response.headers.set('Retry-After', String(Math.ceil(config.windowMs / 1000)))
      return
    }

    await kv.set(key, currentCount + 1, { expireIn: config.windowMs })
    await next()
  }
}
```

## Key Points

- Pool database connections to limit concurrent connections
- Compress responses over 1KB for bandwidth savings
- Limit request body size to prevent memory exhaustion
- Cache database results with TTL using Deno KV
- Profile slow endpoints with duration middleware
- Set request timeouts to prevent hanging connections
- Rate limit per IP to prevent abuse
- Use load testing benchmarks to validate performance
- Prefer streaming responses for large payloads
- Enable HTTP/2 via Deno's built-in support for multiplexing
