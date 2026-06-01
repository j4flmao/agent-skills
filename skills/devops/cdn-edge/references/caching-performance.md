# CDN Caching and Performance Optimization

## Cache Strategies
Cache-Control headers: max-age, s-maxage, stale-while-revalidate, stale-if-error. TTL tiers: static assets (1y), API responses (5m), HTML (10m). Cache keys: include query params or custom headers. Cache warmup: pre-populate cache after deployment. Origin shield: reduce origin load with regional cache layer.

## Cache Invalidation
Full purge: invalidate all files (use sparingly). Path-based: invalidate specific URLs or prefixes. Tag-based: invalidate by content tag (CloudFront Lambda@Edge, Fastly Surrogate-Key). Regex patterns for bulk invalidation. Staggered invalidation for large purges.

## Dynamic Content Acceleration
Origin connection: keep-alive, TLS 1.3, HTTP/2. Route optimization: direct origin routing instead of ISP transit. DSA (Dynamic Site Accelerator): Akamai, CloudFront origin shield. Prefetch: server push for predicted resources. Early hints: 103 Early Hints for preload.

## Compression
Gzip/Brotli: compress text-based responses. Brotli quality levels: 4 (speed) to 11 (ratio). Image optimization: WebP, AVIF with Accept negotiation. Minification: HTML, CSS, JS at edge. Conditional compression: compress only above minimum size threshold.

## Origin Configuration
Load balanced origins with health checks. Multiple origin groups for different content types. Origin failover: primary → secondary on 5xx. Shield regions to reduce origin requests. Origin keep-alive timeout alignment.

## Performance Monitoring
Cache hit ratio tracking per URL pattern. Origin latency percentiles (p50, p95, p99). End-user monitoring (RUM). Bandwidth and request count trends. Error rate tracking (4xx, 5xx, origin errors).

## References
- cdn-edge-fundamentals.md -- Fundamentals
- cdn-providers.md -- Provider Comparison
- ddos-mitigation.md -- DDoS Protection
- waf-rules.md -- WAF Configuration
- edge-functions.md -- Edge Functions
