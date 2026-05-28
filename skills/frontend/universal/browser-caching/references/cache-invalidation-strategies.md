# Cache Invalidation Strategies

## The Cache Invalidation Problem

Cache invalidation is famously one of the two hard things in computer science. The core challenge: once a resource is cached, how do you ensure users receive the updated version when it changes?

### Levels of Caching

```
Browser Cache          -- Cache-Control headers in the browser
Service Worker Cache   -- Programmatic cache in the SW
CDN / Proxy Cache      -- Edge/Origin caching at infrastructure level
Application Cache      -- In-memory or IndexedDB caches in the app
```

Invalidation must be coordinated across all these layers. A stale resource at any layer can cause the wrong version to be served.

## Content-Hash Based Invalidation

The most reliable invalidation strategy is to never invalidate -- instead, serve different URLs for different versions.

### How Content Hashing Works

A hash function (MD5, SHA-256) is applied to the file's content at build time. The resulting hash is embedded in the filename:

```
Before (no hash): /assets/app.js
After (with hash): /assets/app.a1b2c3d4.js
```

When the content changes, the hash changes, producing a different URL. The old URL is naturally evicted from caches as usage drops.

### Build Tool Configuration

```js
// Vite (automatic)
// Output: assets/index.a1b2c3d4.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
});
```

```js
// Webpack
module.exports = {
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
    assetModuleFilename: 'assets/[hash:8][ext][query]',
  },
};
```

### Hash Types Comparison

| Hash Type | What Changes | Stability | Use Case |
|-----------|-------------|-----------|----------|
| `[contenthash]` | File content | Stable per content | JS/CSS files |
| `[fullhash]` | Build compilation | Changes on any build | Manifest files |
| `[chunkhash]` | Chunk content | Stable per chunk | Chunk names |
| `[hash]` (asset modules) | Asset content | Stable per asset | Images, fonts |

### When Content Hashing Is Not Enough

Content hashing only covers static build artifacts. Dynamic content requires different strategies:
- API responses that change without a new deploy
- HTML pages that include dynamic user data
- Images uploaded by users in CMS
- Configuration served from external sources

## ETag and Conditional Requests

For resources that cannot use content-hashed URLs, ETags provide a freshness mechanism.

### How ETags Work

1. Server includes `ETag: "abc123"` in the response header
2. On subsequent requests, browser sends `If-None-Match: "abc123"`
3. If the resource has NOT changed, server responds `304 Not Modified` with no body
4. If the resource HAS changed, server responds `200 OK` with new content and new ETag

```http
# First request
GET /api/products
Response:
  HTTP/1.1 200 OK
  ETag: "v2-abc123"
  Content-Type: application/json
  Cache-Control: no-cache

# Subsequent request
GET /api/products
If-None-Match: "v2-abc123"
Response:
  HTTP/1.1 304 Not Modified
  # No body -- browser uses cached version
```

### Server-Side ETag Generation

```js
// Express.js ETag middleware
const etag = require('etag');

app.get('/api/products', (req, res) => {
  const data = getProducts();
  const body = JSON.stringify(data);
  const hash = etag(body);

  // Check conditional request
  if (req.headers['if-none-match'] === hash) {
    return res.status(304).end();
  }

  res.set({
    'ETag': hash,
    'Cache-Control': 'no-cache',
  });
  res.json(data);
});
```

### ETag Strategies by Content Type

| Content Type | ETag Source | Strength |
|-------------|-------------|----------|
| Static JSON | Content hash (ETag of body) | Strong |
| Database query | Row version / updated_at timestamp | Weak (but practical) |
| File download | File inode/mtime + size | Weak |
| Computed response | Hash of computed result | Strong |

## Cache Busting Parameters

Another approach for non-hashed resources: append a version parameter to the URL.

```js
// Version parameter in URL
fetch('/api/products?_t=20250101')
```

### Parameter Strategies

```js
// Strategy 1: Date-based (changes daily)
const cacheBuster = new Date().toISOString().split('T')[0]; // "2025-01-01"

// Strategy 2: Build-time version
const cacheBuster = __BUILD_TIMESTAMP__; // "1704067200"

// Strategy 3: Content hash of data
const cacheBuster = computeHash(data); // "a1b2c3d4"

// Strategy 4: Manual version increment
const cacheBuster = API_VERSION; // "v2"
```

### Limitations of Query Parameter Busting

Query-parameter-based busting has a significant issue: many CDNs and proxies ignore query parameters when caching:

```http
# These may be treated as the same resource by some proxies
/api/products
/api/products?_t=20250101
/api/products?_t=20250102
```

To ensure CDN invalidation, use path-based versioning instead:

```
# Before (query param)
cdn.example.com/api/products?v=2

# After (path-based)
cdn.example.com/api/v2/products
```

## CDN Cache Purge

When you cannot use content hashing or ETags, you must purge the CDN cache explicitly.

### CDN Purge Methods

```bash
# Cloudflare
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files": ["https://example.com/index.html", "https://example.com/api/products"]}'

# Purge everything
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'

# Fastly
curl -X POST "https://api.fastly.com/service/SERVICE_ID/purge/index.html" \
  -H "Fastly-Key: API_KEY"

# AWS CloudFront
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/index.html" "/api/*"
```

### Automated Purge in CI/CD

```yaml
- name: Deploy to production
  run: |
    npm run build
    aws s3 sync dist/ s3://bucket/

- name: Invalidate CDN cache
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
      --paths "/*"
```

## Service Worker Cache Versioning

Service worker caches are programmatic and require explicit versioning.

### Versioning Strategy

```js
// Build-time constant for cache version
const CACHE_VERSION = '2025-01-01-001'; // Updated on deploy

const CACHE_NAMES = {
  static: `static-v${CACHE_VERSION}`,
  api: `api-v${CACHE_VERSION}`,
  images: `images-v${CACHE_VERSION}`,
};
```

### Automatic Version Injection

```js
// webpack.config.js
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      __CACHE_VERSION__: JSON.stringify(new Date().toISOString()),
    }),
  ],
};
```

```ts
// vite.config.ts
export default defineConfig({
  define: {
    __CACHE_VERSION__: JSON.stringify(Date.now().toString()),
  },
});
```

### Cache Migration on Version Change

```js
self.addEventListener('activate', (event) => {
  const activeCaches = Object.values(CACHE_NAMES);

  event.waitUntil(
    caches.keys().then((allCaches) => {
      const staleCaches = allCaches.filter((name) => !activeCaches.includes(name));
      return Promise.all(staleCaches.map((name) => caches.delete(name)));
    })
  );
});
```

## Stale-While-Revalidate and Cache Invalidation

SWR provides a middle ground: serve stale data instantly, but trigger a background refresh.

### Manual Cache Invalidation in SWR

```js
// Invalidate a specific cache entry
async function invalidateCache(request) {
  const cache = await caches.open('api-cache');
  await cache.delete(request);
}

// Use with mutation
async function updateUser(id, data) {
  // Optimistic update
  setUser(data);

  // Send to server
  const response = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (response.ok) {
    // Invalidate the cached GET request
    await invalidateCache(new Request(`/api/users/${id}`));
  }
}
```

### Time-Based vs Event-Based Invalidation

| Strategy | How | Latency | Complexity |
|----------|-----|---------|------------|
| Time-based TTL | `max-age` or `stale-while-revalidate` | Up to TTL | Low |
| Event-based purge | Server-sent event / WebSocket push | Sub-second | High |
| Mutation-triggered | After write, invalidate related reads | Real-time | Medium |
| Manual (admin) | Admin UI button to purge | On-demand | Medium |

## Cache Invalidation for API Data

### Stale-While-Revalidate with Server-Sent Events

```js
// Server: SSE endpoint for invalidation events
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send invalidation event when data changes
  function onDataChange(event) {
    res.write(`event: invalidate\ndata: ${JSON.stringify(event)}\n\n`);
  }

  dataChangeEmitter.on('change', onDataChange);

  req.on('close', () => {
    dataChangeEmitter.off('change', onDataChange);
  });
});
```

```js
// Client: Invalidate cache on SSE event
const eventSource = new EventSource('/events');

eventSource.addEventListener('invalidate', (event) => {
  const { cacheName, urlPattern } = JSON.parse(event.data);

  caches.open(cacheName).then((cache) => {
    cache.keys().then((requests) => {
      requests.forEach((request) => {
        if (request.url.includes(urlPattern)) {
          cache.delete(request);
        }
      });
    });
  });
});
```

### Mutation-Triggered Invalidation (SWR Libraries)

```tsx
// React Query / TanStack Query with optimistic updates
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => fetch('/api/users', { method: 'PUT', body: JSON.stringify(data) }),
    onMutate: async (newData) => {
      // Cancel outgoing queries for users
      await queryClient.cancelQueries({ queryKey: ['users'] });
      // Snapshot previous value
      const previous = queryClient.getQueryData(['users']);
      // Optimistically update
      queryClient.setQueryData(['users'], (old) => ({ ...old, ...newData }));
      return { previous };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(['users'], context.previous);
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Cache Invalidation for Images

### Responsive Images and Cache

```html
<!-- Use srcset for responsive images with different cache keys -->
<img
  src="/images/photo-400.jpg"
  srcset="
    /images/photo-400.jpg 400w,
    /images/photo-800.jpg 800w,
    /images/photo-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, 800px"
  alt="Description"
/>
```

Each image variant has its own URL and thus its own cache entry. Uploading a new image produces a new URL.

### Uploaded Image Cache Busting

```js
// After user uploads a new avatar
const formData = new FormData();
formData.append('avatar', file);

const response = await fetch('/api/users/avatar', {
  method: 'POST',
  body: formData,
});

const { url } = await response.json();

// The new URL has a different hash -- old URLs naturally expire
// URL: /uploads/avatars/user-123-a1b2c3d4.jpg

// Update the image src with the new URL
imgElement.src = url;
```

## Cache Invalidation Strategy Summary

| Strategy | Resources | Freshness | Effort | Best For |
|----------|-----------|-----------|--------|----------|
| Content hash | JS, CSS, assets | Instant on deploy | Low | Build artifacts |
| ETag + no-cache | HTML, some API responses | Conditional | Medium | Dynamic HTML |
| Time-based TTL | Public API, images | Up to max-age | Low | Stable data |
| Stale-while-revalidate | API data | Trade-off freshness/speed | Medium | Dashboards, lists |
| CDN purge | All CDN-cached | On-demand | Medium | Emergency fix |
| SW cache versioning | SW-managed assets | On deploy | Low | PWA assets |
| SSE/WebSocket push | Real-time data | Sub-second | High | Live dashboards |
| Mutation-triggered | API data | After write | Medium | CRUD apps |
| Query param busting | Non-hashed resources | On param change | Low | Quick fix |

## Invalidation Checklist

- [ ] All static assets use content hashes in filenames
- [ ] HTML pages use `Cache-Control: no-cache` with ETag
- [ ] API responses have appropriate `Cache-Control` headers
- [ ] API mutation endpoints invalidate related GET caches
- [ ] Service worker updates cache version on deploy
- [ ] Service worker removes old caches on activate
- [ ] CDN purge is automated in CI/CD pipeline
- [ ] User-uploaded resources use content-hashed URLs
- [ ] Stale-while-revalidate is configured for public API endpoints
- [ ] Offline fallback does not cache sensitive user data
