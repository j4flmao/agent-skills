---
name: devops-cdn-edge
description: >
  Use this skill when designing CDN, edge, WAF, and DDoS protection: Cloudflare, Fastly, Akamai, AWS
  CloudFront, GCP Cloud CDN, Bunny, edge compute (Workers, Lambda@Edge, Compute@Edge), WAF rules,
  bot management, rate limiting, anti-DDoS at L3/L4/L7, cache strategies, origin shield, multi-CDN.
  This skill enforces: choose CDN provider per traffic pattern, cache headers + invalidation strategy,
  WAF ruleset baseline (OWASP CRS), DDoS mitigation tiering, edge-function placement, origin
  protection. Do NOT use for: in-DC L7 LB (see enterprise-high-availability), DNS authoritative
  config (see devops-network-infrastructure), or backend code (see backend-* skills).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cdn, edge, waf, ddos, cloudflare, fastly, phase-2]
---

# DevOps CDN & Edge

## Purpose
Push as much traffic as possible to the edge: static assets cached globally, dynamic responses
accelerated via TCP termination + HTTP/3, WAF + bot mitigation absorbing attack traffic, and edge
compute for personalization/auth at sub-50ms global latency. Protect origin from direct exposure.

## Agent Protocol

### Trigger
Exact user phrases: "CDN", "Cloudflare", "Fastly", "Akamai", "CloudFront", "Bunny", "edge compute",
"Workers", "Lambda@Edge", "Compute@Edge", "WAF", "DDoS", "L7 DDoS", "rate limit", "bot management",
"cache", "TTL", "stale-while-revalidate", "edge cache", "origin shield", "multi-CDN", "anycast HTTPS",
"BGP DDoS", "Magic Transit", "Prolexic".

### Input Context
- Traffic profile: static-heavy / API-heavy / video / mixed
- Geographic distribution of users
- Bandwidth (Gbps peak) + requests/sec peak
- DDoS attack history / threat model
- Compliance (PCI, HIPAA, GDPR data residency)
- Budget (CDN costs are per-GB egress + per-request)
- Existing CDN if any

### Output Artifact
Edge design with provider choice, cache rules, WAF baseline, DDoS tiering, edge function placement,
origin protection.

### Response Format
```
Provider: {Cloudflare | Fastly | Akamai | CloudFront | Bunny | multi-CDN}
Cache: {policy per route, TTL, vary, key, purge strategy}
WAF: {ruleset, mode (block/log), custom rules}
DDoS: {plan / scrubbing tier / autonomous + on-call}
Edge functions: {use cases, runtime, deployment}
Origin: {IP allowlist, mTLS, secret token, hidden behind tunnel}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] CDN provider selected with cost/feature justification
- [ ] Cache rules per route (TTL, vary, cache-key)
- [ ] WAF baseline (OWASP CRS or vendor managed ruleset) deployed
- [ ] DDoS protection plan with auto + manual response
- [ ] Origin protected (allowlist / mTLS / token / tunnel)
- [ ] Edge compute use cases identified (or explicit "not needed")
- [ ] Purge / invalidation workflow documented
- [ ] Monitoring: cache hit ratio, error rate, RUM (real user monitoring)
- [ ] Multi-CDN fallback if vendor risk warrants

### Max Response Length
350 lines.

## Workflow

### Step 1: Pick CDN Provider

| Provider     | Strengths                              | Weaknesses                     |
|--------------|----------------------------------------|--------------------------------|
| Cloudflare   | broad features, free tier, Workers, BGP DDoS | enterprise pricing complex  |
| Fastly       | low-latency, VCL flexibility, fast purge | smaller PoP count             |
| Akamai       | largest network, enterprise            | expensive, slow change         |
| AWS CloudFront | AWS integration, Lambda@Edge         | mediocre cache hit, expensive  |
| GCP Cloud CDN | GCP integration                       | smaller than the big 3         |
| Bunny CDN    | cheap, simple, good for media          | fewer enterprise features      |
| KeyCDN       | cheap, simple                          | basic                          |
| Multi-CDN    | resilience, geographic optimization    | operational complexity         |

Default: **Cloudflare** for most teams (best price/feature). **Fastly** if VCL flexibility critical.
**Akamai** for media-heavy enterprise. **Multi-CDN** when vendor risk is unacceptable.

### Step 2: Cache Strategy
```
Static assets (immutable): Cache-Control: public, max-age=31536000, immutable
Versioned files (fingerprinted): same
HTML / API: Cache-Control: public, max-age=60, stale-while-revalidate=300
Private / per-user: Cache-Control: private, no-store
Dynamic JSON API: Cache-Control: public, max-age=10, s-maxage=60   (browser short, edge longer)
```

Cache key design:
- Default: scheme + host + URL + query
- Add Vary: Accept-Encoding, Cookie (carefully — kills hit rate), Authorization
- Strip non-functional query params (utm_*, fbclid) → much higher hit rate

### Step 3: Purge / Invalidation
```
Methods:
  By URL          surgical, low cost
  By tag          group resources with surrogate-key header, purge by tag
  By pattern      Akamai/Fastly support wildcards
  Full purge      nuclear option, expensive (cold cache)

Purge propagation: 150ms (Fastly), 30s (Cloudflare), minutes (Akamai)
Use tag-based purge for content groups (product image set, blog category, etc.)
```

```bash
# Cloudflare API purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"files":["https://example.com/style.css","https://example.com/app.js"]}'
```

### Step 4: WAF Baseline
```
Start with OWASP Core Rule Set (CRS) in BLOCK mode for:
  - SQLi
  - XSS
  - Path traversal
  - Remote file inclusion
  - Command injection
  - HTTP protocol violation
Plus vendor-managed rules (Cloudflare Managed, AWS Managed, etc.)
Plus custom rules for app-specific (e.g., block /admin from non-VPN IPs)
```

Deployment phases:
```
1. Log-only mode for 2-4 weeks (capture false positives)
2. Tune custom exclusions
3. Switch to block mode in canary geo
4. Full block mode after bake
```

### Step 5: DDoS Defense Tiering
```
L3/L4 (volumetric: SYN flood, UDP flood, amplification)
  Always-on at CDN/scrubbing layer (Cloudflare automatic, Akamai Prolexic, AWS Shield)
  Scale: 100 Gbps to 100 Tbps depending on provider

L7 (application: HTTP flood, slow loris, large POST)
  Rate limiting per IP / per session / per route
  Bot detection (managed challenge, JS challenge, CAPTCHA)
  Behavioral analysis (request shape, header anomalies)

Last resort: BGP RTBH (blackhole) for attacked prefix; sacrifice IP to save the rest
```

```yaml
# Cloudflare Ruleset Engine — rate limit example
- expression: '(http.request.uri.path eq "/api/login")'
  action: challenge
  ratelimit:
    threshold: 5
    period: 60         # 5 per minute per IP, then challenge
    mitigation_timeout: 600
```

### Step 6: Origin Protection
```
1. IP allowlist: only accept connections from CDN published IP ranges
2. mTLS: CDN presents client cert to origin
3. Shared secret header: origin checks X-Origin-Secret on every request
4. Cloudflare Tunnel / Fastly Origin Shield: no public IP at all
5. Origin DNS hidden (use private DNS or random hostname behind CDN)
```

```nginx
# Origin nginx: only allow Cloudflare IPs
include /etc/nginx/cloudflare-ips.conf;     # auto-updated via cron
deny all;
real_ip_header CF-Connecting-IP;
set_real_ip_from 173.245.48.0/20;            # cloudflare ranges
# ...
```

### Step 7: Edge Compute
Push logic to the edge for sub-50ms global latency.

```
Cloudflare Workers       JS/TS, 50ms CPU limit per req, KV/D1/R2 attached
Lambda@Edge / CloudFront Functions  JS/Python, AWS-locked
Fastly Compute@Edge      WASM (Rust/Go/JS/AssemblyScript), VCL alternative
Akamai EdgeWorkers       JS, mature edge platform
Vercel/Netlify Edge      JS/TS, hosted-platform layer

Use cases:
  - A/B test routing
  - Authentication token validation
  - Personalization (location, device)
  - Image resizing on the fly
  - API request rewriting
  - Bot mitigation logic
```

### Step 8: Monitoring + RUM
```
Per-edge metrics:        cache hit ratio (target ≥ 90% for cacheable), latency, errors
Origin metrics:          requests reaching origin (cache miss = potential issue)
RUM:                     real user latency, geographic distribution, error rate
                         tools: Cloudflare Web Analytics, Google Web Vitals, Datadog RUM
Synthetic monitoring:    multi-region probers hitting key endpoints
```

### Step 9: Multi-CDN (for vendor resilience)
```
Active-active by DNS:    Round-robin or weighted between 2+ CDNs
Active-passive:          Primary CDN; standby DNS record swapped on outage
Performance-based:       CDN selector chooses fastest in real-time (Cedexis, Citrix)

Use when: vendor lock unacceptable, audit requires fallback, history of CDN outages affecting you
Cost: roughly 1.5-2× single-CDN; ops complexity higher
```

## Rules
- Origin never directly reachable from Internet (allowlist / mTLS / tunnel).
- WAF in log-only ≥ 2 weeks before block mode (false positives).
- Cache TTL set explicitly per route; never accept default.
- Cache key minimization: strip tracking params, normalize cookies.
- DDoS plan with auto-mitigation enabled AND human escalation runbook.
- Edge functions stateless or backed by edge-native KV (no origin round-trip).
- Purge by tag, not full purge (full purge thrashes origin).
- Multi-CDN if a single-CDN outage = > 1h of MAO.

## References
- `references/cdn-providers.md` — Provider comparison, pricing, features
- `references/waf-rules.md` — OWASP CRS, custom rules, tuning, false-positive workflow
- `references/ddos-mitigation.md` — L3/L4 and L7 attacks, mitigation tiers, runbook
- `references/edge-functions.md` — Workers, Lambda@Edge, Compute@Edge patterns

## Handoff
- `devops-network-infrastructure` for BGP / anycast / scrubbing transport.
- `enterprise-high-availability` for app-layer LB behind CDN.
- `security-*` for WAF policy deeper tuning, threat intel.
- `devops-aws / gcp / azure` for cloud-native CDN integration with origin.
