# CDN and Edge Fundamentals

## Overview
Content Delivery Networks (CDNs) distribute content across geographically distributed servers (edge locations) to reduce latency, improve availability, and reduce origin server load. Edge computing extends this with compute capabilities at edge locations.

## Core Concepts

### CDN Architecture
Origin: source server storing original content. Edge nodes: cached content distributed globally. Points of Presence (PoPs): data centers hosting edge nodes. Regional caches: intermediate cache layer between edges and origin for cache misses.

### Caching Strategies
Cache-control headers: max-age (TTL), s-maxage (shared cache), private/public, no-cache, no-store. Cache hit ratio: percentage of requests served from cache. Higher ratio means less origin load. Cache purge/invalidation: remove cached content before TTL expires. Cache warming: pre-populate cache with predicted content.

### Content Types Cached
Static content: images, CSS, JS, fonts, videos (long TTL, high cache hit ratio). Dynamic content: HTML, API responses (short TTL, varying). Streaming: HLS/DASH fragments, live stream chunks. API responses: JSON, GraphQL, REST (with appropriate cache headers).

## Key CDN Features

### Performance
Anycast routing: single IP served from multiple locations, requests route to nearest edge. TCP optimizations: faster connection establishment, keepalive. TLS termination: SSL offload at edge, reduces origin TLS overhead. HTTP/2 and HTTP/3: multiplexing, server push, reduced latency. Brotli compression: better compression ratio than gzip.

### Security
DDoS protection: absorb attacks at edge before reaching origin. WAF: web application firewall at edge. Bot management: identify and block malicious bots. Token authentication: signed URLs and cookies for access control. Geo-blocking: restrict access by geographic region.

### Edge Compute
CloudFront Functions: lightweight JavaScript for request/response manipulation (sub-ms). Cloudflare Workers: full JavaScript/WebAssembly at edge. Lambda@Edge: Node.js/Python at CloudFront edge locations. Edge compute enables: A/B testing, URL rewrites, authentication, personalization.

## Basic Configuration

### AWS CloudFront Distribution
```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled = true
  aliases = ["www.example.com"]
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
  }
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "my-origin"
    viewer_protocol_policy = "redirect-to-https"
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
    compress    = true
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  origin {
    domain_name = aws_s3_bucket.main.bucket_regional_domain_name
    origin_id   = "my-origin"
  }
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["US", "CA", "GB"]
    }
  }
}
```

## Best Practices
- Set appropriate cache TTLs based on content change frequency.
- Use cache-control headers from origin, not CDN defaults.
- Implement cache warming for critical content before launches.
- Monitor cache hit ratio and origin load.
- Use origin shield to reduce load on primary origin.
- Enable compression (Brotli/gzip) for text content.
- Use signed URLs for private content access control.
- Configure geo-restrictions for region-specific content.

## References
- cdn-edge-advanced.md -- Advanced CDN and Edge topics
- cloudfront-setup.md -- CloudFront Setup
- edge-compute.md -- Edge Compute
- caching-strategies.md -- Caching Strategies
- cdn-security.md -- CDN Security
