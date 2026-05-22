# CDN and Caching

## CloudFront Distribution
- Origin: S3 bucket via OAC (Origin Access Control)
- Behaviors: default path pattern /*, custom for /api/* if needed
- Price class: PriceClass_100 (US+Europe) or PriceClass_All (global)
- SSL: custom certificate via ACM in us-east-1
- WAF: rate limiting, IP blocking, geo-restriction

## Cache Strategy
```
Versioned files (hash in name): TTL = 31536000s (1 year)
  → immutable, never needs invalidation
Non-versioned files: TTL = 300s (5 minutes)
  → short TTL, stale content tolerated
API responses: TTL = 0 or use Cache-Control headers
  → dynamic content not cached at edge
```

## Cache Invalidation
- Prefer version hash in filename over invalidation
- When invalidation needed: use paths, not wildcards
- Limit: 1000 paths per invalidation request
- Cost: invalidation calls are billable (first 1000 free/month)

## Signed URLs and Cookies
```typescript
cloudfront.getSignedUrl({
  url: `https://d123.cloudfront.net/${key}`,
  expires: Date.now() + 3600 * 1000,
  keyPairId: 'K12345',
  privateKey: fs.readFileSync('private-key.pem'),
});
```

## Best Practices
- Gzip/Brotli compression at origin
- Cache-Control: public, max-age=31536000, immutable for static assets
- Conditional requests via ETag/Last-Modified
- Origin shield for single-region origins
- Real-time logs to S3/Athena for analysis
