# API Response Compression

## Overview

Compress API responses to reduce bandwidth and improve load times. Especially critical for mobile clients and high-traffic APIs.

## Compression Algorithms

| Algorithm | Compression Ratio | Speed (compress) | Speed (decompress) | Browser Support |
|-----------|-----------------|-----------------|-------------------|-----------------|
| gzip | ~5:1 | Medium | Fast | Universal |
| Brotli | ~7:1 | Slow | Fast | 95%+ |
| Zstandard | ~6:1 | Fast | Fast | Limited |
| Deflate | ~4:1 | Medium | Medium | Universal (legacy) |

### Recommendation
- **Brotli** for web BFF responses (static-like, less frequent, CPU for compression OK)
- **gzip** for mobile BFF (fast decompression, battery efficient)
- **Zstandard** for M2M/internal APIs (best speed/ratio trade-off)
- **No compression** for real-time/streaming APIs (<1KB responses)

## Dynamic vs Static Compression

### Dynamic (per-request)
```nginx
# nginx
gzip on;
gzip_types application/json application/vnd.api+json;
gzip_min_length 1000;
gzip_comp_level 6;
```

```typescript
// Express
import compression from 'compression';
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req) => !req.headers['x-no-compression'],
}));
```

### Pre-compressed (static files from CDN)
```nginx
# nginx — serve pre-compressed variants
location ~ \.json$ {
    gzip_static on;
    brotli_static on;
}
```

## Compression Level Tuning

| Level | gzip Ratio | gzip Time (1KB) | gzip Time (100KB) |
|-------|-----------|-----------------|-------------------|
| 1 | 3.2:1 | 0.1ms | 2ms |
| 3 | 3.8:1 | 0.2ms | 4ms |
| 6 | 4.5:1 | 0.4ms | 8ms |
| 9 | 5.0:1 | 1.0ms | 20ms |

**Rule of thumb:** Level 6 for most APIs. Level 9 adds 2x CPU for 10% better ratio. Level 1-3 for high-throughput APIs.

## Security Considerations

### Compression Oracle Attack (BREACH)
Attackers can guess secrets in compressed responses by observing size changes.

**Mitigation:**
```typescript
// Disable compression for responses containing secrets
app.use(compression({
  filter: (req, res) => {
    const contentType = res.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return !res.get('X-Contains-Secrets'); // Mark sensitive responses
    }
    return true;
  },
}));

// Add random padding to sensitive responses
function padResponse(body: object, minSize: number = 1024): object {
  const serialized = JSON.stringify(body);
  if (serialized.length >= minSize) return body;
  return { ...body, _pad: ' '.repeat(minSize - serialized.length) };
}
```

## Client Negotiation

```typescript
// Server checks Accept-Encoding header
app.get('/api/data', (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (acceptEncoding.includes('br')) {
    // Brotli
  } else if (acceptEncoding.includes('gzip')) {
    // gzip
  }

  res.set('Vary', 'Accept-Encoding');
  res.set('Content-Encoding', encoding);
});
```
