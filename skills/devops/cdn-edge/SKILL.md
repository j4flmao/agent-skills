---
name: cdn-edge
description: >
  Use this skill when the user says 'CDN', 'edge', 'content delivery',
  'CloudFront', 'Cloud CDN', 'Azure CDN', 'Akamai', 'Fastly', 'Cloudflare',
  'edge computing', 'edge functions', 'WAF', 'DDoS protection',
  'cache invalidation', 'signed URL', 'origin shield'.
  Covers: CDN architecture, caching strategies, edge computing (CloudFront Functions,
  Lambda@Edge, Cloudflare Workers, Fastly Compute@Edge), WAF rules, DDoS mitigation,
  CDN provider comparison, origin configuration, SSL/TLS, signed URLs/cookies.
  Do NOT use for: general DNS, Kubernetes ingress.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cdn, edge, performance, security, phase-5]
---

# CDN and Edge Computing

## Purpose
Design and implement content delivery networks with caching strategies, edge computing, WAF, DDoS mitigation, and performance optimization across major CDN providers.

## Agent Protocol

### Trigger
"CDN", "edge", "content delivery", "CloudFront", "Cloud CDN", "Azure CDN", "Akamai", "Fastly", "Cloudflare", "edge functions", "WAF", "DDoS protection", "cache invalidation", "signed URL".

### Input Context
Content type (static, API, video, dynamic), user geography, CDN provider, origin config, caching TTL requirements, security needs (WAF, DDoS, bot management), compliance (GDPR data residency).

### Output Artifact
Terraform HCL for CDN resources, provider config (CloudFront, Fastly VCL, Cloudflare Workers), WAF rules, edge function code.

### Completion Criteria
- [ ] CDN distribution with proper origins and cache behaviors.
- [ ] Cache rules per content type.
- [ ] WAF rules configured (OWASP top 10, rate limiting).
- [ ] SSL/TLS with proper certificate.
- [ ] Signed URLs/cookies for private content.
- [ ] Monitoring for origin errors and cache hit ratio.

## Architecture Decision Trees

### CDN Provider Comparison
| Provider | POPs | Edge Compute | WAF | Best For |
|---|---|---|---|---|
| CloudFront | 450+ | Functions + Lambda@Edge | AWS WAF | AWS-native stacks |
| Azure Front Door | 150+ | Front Door Rules | Azure WAF | Azure-native stacks |
| Google Cloud CDN | 150+ | Cloud Functions | Cloud Armor | GCP-native stacks |
| Cloudflare | 310+ | Workers, Pages, R2 | Built-in WAF | Performance + DDoS |
| Fastly | 100+ | Compute@Edge (Wasm) | Next-Gen WAF | Customizable, high-perf |
| Akamai | 4100+ | EdgeWorkers | Kona Site Defender | Enterprise, global |

### Caching Strategy by Content Type
| Content | Default TTL | Query String | Best Practice |
|---|---|---|---|
| Static assets (JS/CSS/img) | 1 year | Ignore | Content hash in URL |
| HTML pages | 0-5 min | Key params | ETag/Last-Modified |
| API responses | 0-60 sec | Respect | Cache-Control headers |
| Video (HLS/DASH) | 10-30 min | Ignore | Segment-level caching |
| User-specific content | No cache | N/A | Signed URLs |

### Edge Compute: CloudFront Functions vs Lambda@Edge vs Workers
| Feature | CloudFront Functions | Lambda@Edge | Cloudflare Workers |
|---|---|---|---|
| Max execution | 50μs | 5s | 50ms |
| Runtime | JS | Node.js, Python | JS, Wasm |
| Network access | None | Full (VPC, DB) | Fetch API |
| Cold start | No | Yes | No |
| Use case | Header rewrite, URL redirect | Auth, A/B test | Full edge apps |

## Quick Start
CDN distribution → Cache behaviors (static:1y, API:60s) → WAF (OWASP, rate limit) → SSL cert → Edge function for A/B testing → Signed URLs for private content.

## Core Workflow

### Step 1: CloudFront with Terraform
```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
    origin_shield {
      enabled              = true
      origin_shield_region = var.region
    }
  }

  origin {
    domain_name = aws_lb.api.dns_name
    origin_id   = "APIOrigin"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_verify.result
    }
  }

  default_cache_behavior {
    target_origin_id = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    compress         = true
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    min_ttl = 0
    default_ttl = 31536000
    max_ttl     = 31536000
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "APIOrigin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    compress         = true
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies { forward = "whitelist"; whitelisted_names = ["session"] }
    }
    min_ttl = 0
    default_ttl = 60
    max_ttl     = 300
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cdn.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  web_acl_id = aws_wafv2_web_acl.main.arn

  logging_config {
    bucket = aws_s3_bucket.logs.bucket_domain_name
    prefix = "cdn/"
  }
}
```

### Step 2: WAF Rules
```hcl
resource "aws_wafv2_web_acl" "main" {
  name        = "cdn-waf"
  scope       = "CLOUDFRONT"
  default_action { allow {} }

  rule { # AWS managed common rules
    name = "AWSCommonRuleSet"; priority = 0
    override_action { none {} }
    statement { managed_rule_group_statement {
      vendor_name = "AWS"; name = "AWSManagedRulesCommonRuleSet"
    }}
  }
  rule { # SQLi protection
    name = "SQLiRuleSet"; priority = 1
    override_action { none {} }
    statement { managed_rule_group_statement {
      vendor_name = "AWS"; name = "AWSManagedRulesSQLiRuleSet"
    }}
  }
  rule { # Rate limiting
    name = "RateLimit"; priority = 10
    action { block {} }
    statement { rate_based_statement {
      limit = 2000; aggregate_key_type = "IP"
    }}
  }
}
```

### Step 3: Edge Function (CloudFront Functions)
```javascript
// viewer-request.js — SPA routing + security headers
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // SPA routing
    if (!uri.includes('.') && !uri.startsWith('/api/')) {
        request.uri = '/index.html';
    }
    return request;
}
```

```javascript
// viewer-response.js — cache + security headers
function handler(event) {
    var response = event.response;
    var request = event.request;

    response.headers['strict-transport-security'] = { value: 'max-age=31536000' };
    response.headers['x-content-type-options'] = { value: 'nosniff' };

    if (request.uri.startsWith('/static/')) {
        response.headers['cache-control'] = { value: 'public, max-age=31536000, immutable' };
    }
    if (request.uri.startsWith('/api/')) {
        response.headers['cache-control'] = { value: 'no-store' };
    }
    return response;
}
```

### Step 4: Cloudflare Workers for A/B Testing
```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/variant=(A|B)/);
    const variant = match ? match[1] : (Math.random() < 0.5 ? 'A' : 'B');

    const originRequest = new Request(request);
    originRequest.headers.set('X-Variant', variant);
    const response = await fetch(originRequest);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Variant', variant);
    return newResponse;
  }
};
```

### Step 5: Signed URLs for Private Content
```python
# generate_signed_url.py
import boto3
from botocore.signers import CloudFrontSigner
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import base64, json, datetime

def rsa_signer(message):
    with open('private_key.pem', 'rb') as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)
    return private_key.sign(message, padding.PKCS1v15(), hashes.SHA1())

cloudfront_signer = CloudFrontSigner('KEY_ID', rsa_signer)
url = "https://d123.cloudfront.net/private/video.mp4"
signed_url = cloudfront_signer.generate_presigned_url(
    url, datetime.utcnow() + timedelta(hours=1))
print(signed_url)
```

## Anti-Patterns

### Anti-Pattern 1: No Cache Strategy
Serving all content with no-cache or wrong TTL. Static assets should have 1y TTL with hash in URL; APIs should have short TTL with ETag validation.

### Anti-Pattern 2: Exposing Origin IP
Allowing direct origin access bypassing CDN. Origin should only accept requests from CDN IP ranges (via security group/WAF).

### Anti-Pattern 3: No Origin Shield
Direct origin traffic for every cache miss. Enable origin shield to coalesce requests and reduce origin load.

### Anti-Pattern 4: Ignoring Cache Invalidation Cost
Frequent wildcard invalidations are expensive (CloudFront: $0.005/path, first 1000 free). Use versioned URLs to avoid invalidations entirely.

### Anti-Pattern 5: No WAF on CDN
Serving traffic without WAF filtering. CDN is the first line of defense — WAF should always be associated.

## Production Considerations

### Security
- Enable WAF with OWASP Top 10 managed rules and rate limiting.
- Use signed URLs/cookies for private content (expire after 1-24h).
- Restrict origin access to CDN IP ranges only.
- Enable HSTS, CSP, and other security headers at edge.
- Configure geo-blocking for regions without business need.

### Performance
- Enable brotli/gzip compression at edge.
- Use origin shield to improve cache hit ratio.
- Enable HTTP/2 and HTTP/3 (QUIC) for faster connections.
- Configure proper cache TTLs per content type.
- Use adaptive bitrate streaming for video.

### Cost Optimization
- Use price class to limit edge locations (PriceClass_100 = US/Europe only).
- Reduce origin requests with high cache hit ratio (>90%).
- Use compression to reduce egress costs.
- Monitor cache hit ratio in CloudWatch/CDN analytics.

## Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| Cache miss ratio high | Short TTL or unique query strings | Increase TTL; normalize query params |
| Origin overloaded | No origin shield | Enable origin shield |
| HTTPS error | Certificate mismatch | Update ACM certificate |
| WAF false positive | Overly aggressive rule | Create WAF exception rule |
| Signed URL 403 | Expired or wrong key | Check expiration; verify private key |

## Rules & Constraints
- Always use HTTPS (redirect HTTP to HTTPS) at CDN level.
- Enable compression (gzip/brotli) for text-based content.
- Block direct origin access — accept traffic only from CDN.
- Set Cache-Control headers from origin; configure CDN to respect them.
- Log CDN requests to S3/Blob for analysis.
- Configure origin shield for all production distributions.

## References
  - references/cdn-edge-advanced.md
  - references/cdn-edge-fundamentals.md
  - references/cdn-providers.md
  - references/ddos-mitigation.md
  - references/edge-functions.md
  - references/waf-rules.md
  - references/signed-urls-guide.md

## Handoff
Next: **waf-rules** — deeper WAF configuration. Pass: distribution ID, WAF ACL ARN, edge function names.
