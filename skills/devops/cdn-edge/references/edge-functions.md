# Edge Functions — Workers, Lambda@Edge, Compute@Edge

## Why Edge Compute
Execute application logic in 320+ PoPs globally with ≤ 50ms latency to any user. Push routing,
auth, personalization, A/B logic, and even small APIs to the edge. Reduces origin load and
roundtrip latency.

## Platform Comparison

| Platform                   | Runtime       | CPU/req | Memory | Cold start | Storage                  |
|----------------------------|---------------|---------|--------|------------|--------------------------|
| Cloudflare Workers         | V8 JS/TS, WASM | 50ms (free) / 30s (paid) | 128MB | ~0ms (isolates) | KV, D1 (SQLite), R2 (S3-compat), Durable Objects |
| Lambda@Edge                | Node.js, Python | 5s viewer / 30s origin | 128-10240MB | 100ms+ | None (call origin) |
| CloudFront Functions       | JS (subset)   | 1ms     | 2MB    | ~0ms       | None                     |
| Fastly Compute@Edge        | WASM (Rust, Go, JS, AS) | 50ms (default) | 128MB | <1ms | KV Store, Config Store, Secret Store |
| Akamai EdgeWorkers         | JS            | 50ms    | 128MB  | low        | EdgeKV                   |
| Vercel Edge Functions      | V8 JS/TS, WASM | 30s    | 128MB  | ~0ms       | Edge Config, KV          |
| Deno Deploy                | V8 JS/TS      | n/a     | 512MB  | low        | KV                       |

## Cloudflare Workers — Production Pattern

```ts
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // 1. Authentication at edge — verify JWT
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return new Response('Unauthorized', { status: 401 })
    const user = await verifyJWT(token, env.JWT_SECRET)
    if (!user) return new Response('Forbidden', { status: 403 })

    // 2. A/B test routing
    const variant = Math.random() < 0.1 ? 'v2' : 'v1'
    const origin = variant === 'v2' ? 'https://v2.origin.example.com' : 'https://v1.origin.example.com'

    // 3. Cache via Workers Cache API
    const cache = caches.default
    const cacheKey = new Request(`${origin}${url.pathname}`, request)
    let response = await cache.match(cacheKey)
    if (response) return response

    // 4. Fetch origin
    response = await fetch(`${origin}${url.pathname}${url.search}`, {
      method: request.method,
      headers: { ...Object.fromEntries(request.headers), 'X-User-Id': user.id, 'X-AB-Variant': variant }
    })

    // 5. Modify + cache
    response = new Response(response.body, response)
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  }
}
```

```toml
# wrangler.toml
name = "edge-api"
main = "src/index.ts"
compatibility_date = "2026-05-01"

[[kv_namespaces]]
binding = "SESSIONS"
id = "abcd1234..."

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "static-assets"

[[d1_databases]]
binding = "DB"
database_name = "edge-db"
database_id = "uuid..."

[vars]
JWT_SECRET_KEY = "set via wrangler secret put"
```

## Lambda@Edge Pattern

```js
// origin-request function — runs before request to origin
exports.handler = async (event) => {
  const request = event.Records[0].cf.request

  // Route /api/* to API origin, else to static origin
  if (request.uri.startsWith('/api')) {
    request.origin = {
      custom: {
        domainName: 'api.example.com',
        port: 443,
        protocol: 'https',
        path: '',
        sslProtocols: ['TLSv1.2'],
        readTimeout: 30,
        keepaliveTimeout: 5,
        customHeaders: {}
      }
    }
    request.headers.host = [{ key: 'host', value: 'api.example.com' }]
  }

  return request
}
```

## Use Cases (in order of common adoption)

```
1. Auth / token verification (offload origin)
2. Routing rewrites (A/B, geo-based, header-based)
3. Personalization (geo, device class, language)
4. Image / video resize on the fly
5. Bot mitigation logic
6. Header sanitization / security headers
7. API rate limit at edge (combined with provider limits)
8. Microsites / static SSR
9. Webhook receivers (lightweight)
10. Full API (Workers KV + D1 backend)
```

## Distributed State at Edge

```
Cloudflare:
  KV          eventually consistent, ≤ 60s, key/value, multi-region
  D1          SQLite-compatible, per-region or replicated, ~ms latency
  R2          S3-compatible object storage, no egress fees
  Durable Objects  strongly-consistent per-key actor model

Fastly:
  KV Store           eventually consistent
  Config Store       cached at every PoP, instant
  Secret Store       for credentials

Vercel:
  Edge Config        small global key/value
  KV (Upstash)       Redis-compatible
```

Choose:
- **Hot path, eventual ok**: KV / Edge Config
- **Hot path, must be strong**: Durable Objects or origin DB
- **Reads tolerate seconds of staleness**: KV
- **Real database**: D1 / Upstash / origin DB

## Patterns to Avoid

- **Edge function calling origin DB on every request**: defeats latency advantage
- **CPU-heavy compute at edge**: exceeds CPU limits, expensive per-CPU-ms
- **Stateful long-running** (websocket lifetime, etc.): Durable Objects only for some platforms
- **Sharing state via origin**: latency spike per write

## Cost Math (Cloudflare Workers, 2026)

```
Workers Paid:         $5/month + $0.30 per 1M requests + $12.50/million GB-s
Workers KV:           free 100k reads/day; $0.50 per 1M reads after; writes more
D1:                   free 5M reads/day; $0.001 per 1M reads after
R2:                   free 10 GB storage + 1M Class A ops; $0.015/GB-month after; NO egress

Compare to Lambda@Edge:
  $0.60 per 1M requests + $0.0000125125 per 128MB-ms
  Cold starts factored in (100ms+ on first hit per PoP)
```

Edge functions are typically 30-70% cheaper than equivalent origin compute + bandwidth, before
counting latency improvement.

## Local Dev

```bash
# Cloudflare
npm i -g wrangler
wrangler dev                    # local dev server with Miniflare
wrangler deploy

# Fastly
npm i -g @fastly/cli
fastly compute init
fastly compute serve --addr 127.0.0.1:7676

# Vercel
vercel dev
```

## Observability

```
Cloudflare:  Workers Analytics, Tail (live log stream), Trace Workers
Fastly:      Real-Time Log Streaming (S3, Datadog, Splunk)
Lambda@Edge: CloudWatch Logs (per region, hard to aggregate)
Vercel:      Built-in observability, Logs UI

Key metrics:
  Request volume per PoP
  CPU time per req (p50, p99)
  Error rate
  Origin call rate (when not satisfied by edge)
  KV / DB latency per call
```

## Migration Pattern: Origin Logic → Edge

```
Phase 1: identify high-traffic, low-CPU endpoints
Phase 2: implement at edge in canary (1-5% traffic)
Phase 3: shadow mode (compare edge vs origin responses)
Phase 4: ramp to 100% with monitoring
Phase 5: deprecate origin path after bake
```

## Common Failures

- Edge function with origin-fetch on every request → latency benefit minimal
- KV race conditions assumed transactional → not (eventually consistent)
- Forgetting cold-start cost in Lambda@Edge → p99 spike on cold PoPs
- Hardcoded secrets in code → use Workers/Fastly secret stores
- CPU exceeds limit silently → request fails 50ms in
- Local dev different from production env vars → bugs only on deploy
- Edge function timeout (50ms) on legit slow upstream → user sees 524 / error
