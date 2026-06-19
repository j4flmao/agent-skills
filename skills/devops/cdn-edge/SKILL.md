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

### DDoS Mitigation Decision Tree
```
Is traffic above baseline?
├── Yes → Is it application layer (L7)?
│   ├── Yes → WAF rate limiting + bot management + challenge
│   └── No → Is it network layer (L3/4)?
│       ├── Yes → DDoS scrubber (AWS Shield, Cloud Armor, Cloudflare magic transit)
│       └── No → Volume-based (amplification, reflection)?
│           ├── Yes → Null route / blackhole + upstream filtering
│           └── No → Monitor and investigate
└── No → Normal traffic, allow through
```

### CDN Origin Selection
| Origin Type | Latency | Cost | Scaling | Best For |
|---|---|---|---|---|
| S3/Cloud Storage | Low | Low | Automatic | Static assets |
| ALB/GLB | Medium | Medium | Auto-scaling | Dynamic APIs |
| Custom (EC2/VM) | Variable | Varies | Manual | Legacy apps |
| Multi-region origin | Low (geo-routed) | High | Complex | Global apps |

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

  rule {
    name = "AWSCommonRuleSet"; priority = 0
    override_action { none {} }
    statement { managed_rule_group_statement {
      vendor_name = "AWS"; name = "AWSManagedRulesCommonRuleSet"
    }}
  }
  rule {
    name = "SQLiRuleSet"; priority = 1
    override_action { none {} }
    statement { managed_rule_group_statement {
      vendor_name = "AWS"; name = "AWSManagedRulesSQLiRuleSet"
    }}
  }
  rule {
    name = "RateLimit"; priority = 10
    action { block {} }
    statement { rate_based_statement {
      limit = 2000; aggregate_key_type = "IP"
    }}
  }
  rule {
    name = "AWSReputationList"; priority = 2
    override_action { none {} }
    statement { managed_rule_group_statement {
      vendor_name = "AWS"; name = "AWSManagedRulesAmazonIpReputationList"
    }}
  }
  rule {
    name = "BotControl"; priority = 3
    override_action { none {} }
    statement { managed_rule_group_statement {
      vendor_name = "AWS"; name = "AWSManagedRulesBotControlRuleSet"
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

    // Security headers
    request.headers['x-forwarded-proto'] = { value: 'https' };
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
    response.headers['x-frame-options'] = { value: 'DENY' };
    response.headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };

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

    // Set sticky cookie
    newResponse.headers.set('Set-Cookie', `variant=${variant}; Path=/; Max-Age=86400`);
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

### Step 6: Azure Front Door Configuration (HCL)
```hcl
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "frontdoor-main"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard_AzureFrontDoor"
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "myapp-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

resource "azurerm_cdn_frontdoor_origin_group" "main" {
  name                     = "main-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = true

  health_probe {
    interval_in_seconds = 30
    path                = "/health"
    protocol            = "Https"
    request_type        = "GET"
  }

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "primary" {
  name                          = "primary-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  enabled                       = true
  host_name                     = aws_lb.api.dns_name
  http_port                     = 80
  https_port                    = 443
  origin_host_header            = "api.example.com"
  priority                      = 1
  weight                        = 100
}

resource "azurerm_cdn_frontdoor_rule_set" "main" {
  name                     = "CachingRules"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}
```

### Step 7: Fastly VCL for Custom Caching
```vcl
# Fastly VCL — custom cache behavior per content type
sub vcl_recv {
    # Static assets: cache 1 year
    if (req.url ~ "^/static/") {
        set req.http.X-Cache-TTL = "31536000";
        set req.http.X-Static = "true";
    }
    # API responses: cache 10s, stale-while-revalidate 1h
    if (req.url ~ "^/api/") {
        set req.http.X-Cache-TTL = "10";
        set req.http.X-Stale-While-Revalidate = "3600";
    }
    # Block known bad user agents
    if (req.http.User-Agent ~ "(bot|crawler|spider)" && req.http.User-Agent ~ "bad-actor") {
        error 403 "Forbidden";
    }
}

sub vcl_fetch {
    # Override origin Cache-Control
    if (req.http.X-Cache-TTL) {
        set beresp.ttl = std.duration(req.http.X-Cache-TTL, "10s");
    }
    # Enable stale-while-revalidate
    if (req.http.X-Stale-While-Revalidate) {
        set beresp.stale_while_revalidate = std.duration(req.http.X-Stale-While-Revalidate, "0s");
    }
    # Shield coalescing
    if (req.http.X-Static == "true") {
        set beresp.http.Cache-Control = "public, max-age=31536000, immutable";
    }
}
```

### Step 8: CDN Monitoring and Alerting
```hcl
resource "aws_cloudwatch_metric_alarm" "cache_hit_ratio" {
  alarm_name          = "cdn-cache-hit-ratio-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "HitRatio"
  namespace           = "AWS/CloudFront"
  period              = 3600
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CDN cache hit ratio below 80%"
  
  alarm_actions = [aws_sns_topic.cdn_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "origin_error_rate" {
  alarm_name          = "cdn-origin-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  extended_statistic  = "p99"
  
  alarm_actions = [aws_sns_topic.cdn_alerts.arn]
}
```

### Step 9: Purge/Invalidation Strategies
```bash
# CloudFront: path-based invalidation ($0.005/path, first 1000 free)
aws cloudfront create-invalidation \
  --distribution-id E123456 \
  --paths "/index.html" "/static/css/*"

# Cloudflare: purge everything (free, unlimited)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'

# Fastly: soft purge (purge from cache, keep stale)
curl -X PURGE -H "Fastly-Soft-Purge:1" "https://www.example.com/index.html"

# Best practice: versioned URLs avoid invalidation entirely
# /static/js/main.a1b2c3d4.js (content hash in filename)
# When content changes: filename changes = new cache entry
```

## Anti-Patterns

### Anti-Pattern 1: No Cache Strategy
Serving all content with no-cache or wrong TTL. Static assets should have 1y TTL with hash in URL; APIs should have short TTL with ETag validation.

### Anti-Pattern 2: Exposing Origin IP
Allowing direct origin access bypassing CDN. Origin should only accept requests from CDN IP ranges (via security group/WAF). The CDN is your security boundary.

### Anti-Pattern 3: No Origin Shield
Direct origin traffic for every cache miss. Enable origin shield to coalesce requests and reduce origin load. Can reduce origin requests by 80%+.

### Anti-Pattern 4: Ignoring Cache Invalidation Cost
Frequent wildcard invalidations are expensive (CloudFront: $0.005/path, first 1000 free). Use versioned URLs to avoid invalidations entirely.

### Anti-Pattern 5: No WAF on CDN
Serving traffic without WAF filtering. CDN is the first line of defense — WAF should always be associated. DDoS protection should be layered (CDN + WAF + origin).

### Anti-Pattern 6: Overly Complex Edge Functions
Using Lambda@Edge (5s timeout) when CloudFront Functions (50μs) would suffice. CF Functions are cheaper, faster, and always available. Use Lambda@Edge only when you need network/DB access.

### Anti-Pattern 7: Not Compressing at Edge
Serving uncompressed content increases egress costs and hurts performance. Enable brotli/gzip compression at CDN edge for all text-based content types.

## Production Considerations

### Security
- Enable WAF with OWASP Top 10 managed rules and rate limiting.
- Use signed URLs/cookies for private content (expire after 1-24h).
- Restrict origin access to CDN IP ranges only.
- Enable HSTS, CSP, and other security headers at edge.
- Configure geo-blocking for regions without business need.
- Enable AWS Shield Advanced for L3/L4 DDoS protection.
- Use Origin Access Control (OAC) instead of OAI for S3 origins.

### Performance
- Enable brotli/gzip compression at edge.
- Use origin shield to improve cache hit ratio.
- Enable HTTP/2 and HTTP/3 (QUIC) for faster connections.
- Configure proper cache TTLs per content type.
- Use adaptive bitrate streaming for video.
- Enable preconnect/preload hints for critical resources.
- Use regional edge caches (CloudFront origin shield).

### Cost Optimization
- Use price class to limit edge locations (PriceClass_100 = US/Europe only).
- Reduce origin requests with high cache hit ratio (>90%).
- Use compression to reduce egress costs.
- Monitor cache hit ratio in CloudWatch/CDN analytics.
- Versioned URLs vs. invalidations — prefer versioning.
- Consider multi-CDN for mission-critical delivery.

### Multi-CDN Strategy
- Primary CDN: CloudFront (AWS-native, deep integration).
- Secondary CDN: Cloudflare (DDoS, performance).
- Failover: DNS-based (Route53 latency routing) or client-side.
- Cost: Multi-CDN increases complexity and cost by 20-40%.
- Use case: Only for mission-critical global applications.

## Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| Cache miss ratio high | Short TTL or unique query strings | Increase TTL; normalize query params |
| Origin overloaded | No origin shield | Enable origin shield |
| HTTPS error | Certificate mismatch | Update ACM certificate |
| WAF false positive | Overly aggressive rule | Create WAF exception rule |
| Signed URL 403 | Expired or wrong key | Check expiration; verify private key |
| High egress cost | Low cache hit ratio | Optimize caching; improve TTLs |
| Slow first byte | No origin shield, distant origin | Enable shield; move origin closer |
| Stale content served | Cache TTL too long | Reduce TTL; implement purge on deploy |

## Rules & Constraints
- Always use HTTPS (redirect HTTP to HTTPS) at CDN level.
- Enable compression (gzip/brotli) for text-based content.
- Block direct origin access — accept traffic only from CDN.
- Set Cache-Control headers from origin; configure CDN to respect them.
- Log CDN requests to S3/Blob for analysis.
- Configure origin shield for all production distributions.
- Version static assets in URL (content hash) to avoid invalidations.
- Monitor cache hit ratio and alert below 80%.

## References
  - references/cdn-edge-advanced.md
  - references/cdn-edge-fundamentals.md
  - references/cdn-providers.md
  - references/ddos-mitigation.md
  - references/edge-functions.md
  - references/waf-rules.md
  - references/signed-urls-guide.md
  - references/multi-cdn-strategy.md
  - references/cdn-monitoring.md

## Handoff
Next: **waf-rules** — deeper WAF configuration. Pass: distribution ID, WAF ACL ARN, edge function names.
