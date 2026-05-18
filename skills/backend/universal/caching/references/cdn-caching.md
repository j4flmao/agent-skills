# CDN Caching

## How CDN Caching Works
```
Client → Edge Server (CDN PoP) → Origin Server (backend)

1. Client requests resource
2. CDN edge checks cache
3. Cache HIT → return cached response
4. Cache MISS → forward to origin, cache response, return to client
```

## Cache Control Headers

### Response Headers (Origin → CDN)
```
Cache-Control: public, max-age=3600, s-maxage=3600
  public:        can be cached by any cache (CDN + browser)
  private:       only cache in browser (not CDN)
  max-age:       TTL in seconds for browser cache
  s-maxage:      TTL in seconds for CDN (overrides max-age for shared caches)
  no-cache:      must revalidate with origin before using cached version
  no-store:      never cache
  must-revalidate: origin must validate stale responses

ETag: "abc123"        → validation token (strong, content-based)
Last-Modified: Mon, 18 May 2026 10:00:00 GMT  → validation timestamp (weak)

Surrogate-Key: user_abc123  → CDN-specific tag for batch purge
CDN-Cache-Control: max-age=86400  → CDN-only directive (non-standard)
```

### Request Headers (CDN → Origin)
```
If-None-Match: "abc123"       → conditional request (ETag match → 304 Not Modified)
If-Modified-Since: ...        → conditional request (timestamp match → 304 Not Modified)
```

## Caching Strategies by Content Type

### Static Assets (JS, CSS, Images, Fonts)
```
Cache-Control: public, max-age=31536000, immutable
ETag + content hash in filename: main.a1b2c3d4.js

Benefits: infinite cache, never revalidate, content-hash ensures instant updates
```

### API Responses
```
Strategy 1: Cache GET endpoints with Cache-Control
  GET /api/v1/products
  Cache-Control: public, max-age=60, s-maxage=60

Strategy 2: Use Surrogate-Key for fine-grained purge
  Surrogate-Key: products product_123
  PURGE request by key when product changes

Strategy 3: Cache with vary
  Vary: Accept-Encoding, Authorization
  Cache-Control: private (for authenticated responses)
```

### HTML Pages
```
Cache-Control: public, max-age=300, s-maxage=300

For dynamic pages:
  Cache-Control: no-cache  → always revalidate
  ETag header              → conditional 304 responses
```

## CDN Purge Strategies

### Tag-Based Purge (Recommended)
```
Set Surrogate-Key header on origin responses:
  Surrogate-Key: user_abc123 order_xyz

On data change:
  PURGE Surrogate-Key: user_abc123
  → All resources tagged with "user_abc123" evicted simultaneously

Advantages:
  - Single purge clears all related resources
  - No need to track individual URLs
  - Supported by: Fastly (surrogate-key), Cloudflare (Cache-Tag)
```

### URL-Based Purge
```
PURGE /api/v1/users/abc123
PURGE /api/v1/products?category=electronics

Fallback when tag-based not available.
```

### Directory/Pattern Purge
```
PURGE /api/v1/products/*
PURGE /assets/images/*

Wildcard support varies by CDN provider.
```

### Full Purge
```
PURGE / *  → evict entire CDN cache

Emergency-only — massive load spike on origin after purge.
```

## Cache Hit Ratio Optimization

```
Target: 90%+ for static assets, 60-80%+ for API responses

Low hit ratio causes:
  - Too short TTLs (s-maxage too low)
  - Unique URLs per user (no Vary handling)
  - Missing Cache-Control headers
  - Session-based URLs (never cache)
  - Too many unique query parameter combinations

Fixes:
  - Increase s-maxage
  - Use Surrogate-Key for tags
  - Normalize query parameters (ignore ordering)
  - Remove session tokens from cache key
  - Use CDN's cache key customization
```

## Cache Key Design
```
Default cache key: scheme + host + path + query string

Customize via CDN config:
  - Include: Host, Path, Selected query params
  - Exclude: Session tokens, timestamps, utm_* params
  - Add: Custom headers (Accept-Encoding)

Example:
  /api/v1/products?page=1&limit=20&sid=xyz123
  → cache key: /api/v1/products?page=1&limit=20 (strip session id)
```

## Security Considerations
```
Never cache:
  - 4xx/5xx responses (unless configured)
  - Set-Cookie responses
  - Authenticated user data (Cache-Control: private, no-cache)
  - CSRF tokens
  - Payment details

Cache poisoning prevention:
  - Validate all inputs before they enter cache key
  - Use CDN's request validation features
  - Don't cache based on Host header alone (host injection)
```
