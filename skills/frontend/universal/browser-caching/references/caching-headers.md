# Caching Headers

## Cache-Control Directive Reference

| Directive | Meaning | Example |
|-----------|---------|---------|
| `public` | Any cache (CDN, proxy, browser) may store | `Cache-Control: public` |
| `private` | Only browser may store | `Cache-Control: private` |
| `no-cache` | Must revalidate with origin before serving | `Cache-Control: no-cache` |
| `no-store` | Must not cache at all | `Cache-Control: no-store` |
| `max-age=N` | Fresh for N seconds | `max-age=3600` |
| `s-maxage=N` | Fresh for N seconds at shared cache (overrides max-age for CDN) | `s-maxage=86400` |
| `immutable` | Never changes during max-age | `max-age=31536000, immutable` |
| `stale-while-revalidate=N` | May serve stale for N seconds while re-fetching | `stale-while-revalidate=600` |
| `stale-if-error=N` | May serve stale for N seconds if origin fails | `stale-if-error=86400` |
| `must-revalidate` | Once stale, must revalidate before reuse | `must-revalidate` |
| `proxy-revalidate` | Same for shared caches | `proxy-revalidate` |
| `no-transform` | CDN must not modify content | `no-transform` |

## Cache Header Recipes

### Static Assets (JS, CSS, fonts, images)
```http
Cache-Control: public, max-age=31536000, immutable
```
Content hash in filename guarantees uniqueness. `immutable` tells browser never to revalidate.

### HTML Pages (SPA)
```http
Cache-Control: no-cache
ETag: "v2-index-abc123"
```
Browser always checks with `If-None-Match` header. Server returns `304 Not Modified` or fresh content.

### API Responses (Public)
```http
Cache-Control: public, max-age=60, stale-while-revalidate=600
```
Browser caches for 60s, then uses stale for up to 600s while re-fetching in background.

### API Responses (Authenticated)
```http
Cache-Control: private, no-cache
```
Private = only browser cache. No-cache = always revalidate.

### API Responses (Never Cache)
```http
Cache-Control: no-store
```
For sensitive data: balances, PII, tokens.

## ETag & Conditional Requests

```typescript
// Client-side conditional fetch
async function fetchWithETag(url: string, etag: string | null): Promise<Response> {
  const headers: HeadersInit = {}
  if (etag) headers['If-None-Match'] = etag

  const res = await fetch(url, { headers })

  if (res.status === 304) {
    // Content not modified — use cached version
    return getFromLocalCache(url)
  }

  return res
}
```

## Vary Header

```http
# Cache varies by encoding
Vary: Accept-Encoding

# Cache varies by language
Vary: Accept-Language

# Cache varies by both
Vary: Accept-Encoding, Accept-Language

# Cache varies by cookie (for A/B testing)
Vary: Cookie
```

Without proper Vary header, CDN may serve wrong language or wrong compression.

## Surrogate-Control (CDN-only)

```http
# Instruct CDN to cache longer than browser
Cache-Control: public, max-age=3600
Surrogate-Control: max-age=86400
```

Browser caches for 1 hour. CDN caches for 24 hours. Useful when you want fast CDN delivery but allow quick browser cache invalidation.

## Cache-Busting Approaches

| Method | How It Works | Pros | Cons |
|--------|-------------|------|------|
| Content hash | `app.a1b2c3.js` | Perfect cache invalidation | URL changes on every deploy |
| Version query | `app.js?v=2` | Simple | Proxies may not cache |
| Date-based | `app.js?d=20240101` | Human-readable | Doesn't reflect actual content |
| Fingerprint | `app.8f3d2a.js` | Combines hash + version | Requires build tool support |

## Debugging Cache Headers

```bash
# Check cache headers on a resource
curl -I https://example.com/app.js

# Response headers to inspect:
# cache-control: public, max-age=31536000, immutable
# age: 12345
# etag: "abc123"
# cf-cache-status: HIT
```

## Header Decision Flow

```
Resource type?
├── Static (JS, CSS, fonts, images)
│   └── Cache-Control: public, max-age=31536000, immutable
├── HTML
│   └── Cache-Control: no-cache + ETag
├── API — public
│   └── Cache-Control: public, max-age=60, stale-while-revalidate=600
├── API — authenticated
│   └── Cache-Control: private, no-cache
└── API — sensitive
    └── Cache-Control: no-store
```
