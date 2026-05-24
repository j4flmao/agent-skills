# CDN Providers — Comparison + Selection

## Provider Matrix

| Provider     | PoPs | Free tier | Edge compute | WAF | DDoS L3/L4 | DDoS L7 | Multi-CDN ready |
|--------------|------|-----------|--------------|-----|------------|---------|-----------------|
| Cloudflare   | 320+ | yes (real) | Workers      | yes | unlimited (paid plans) | yes | yes |
| Fastly       | 90+  | trial only| Compute@Edge | yes | scrubbing (paid) | yes | yes |
| Akamai       | 4000+| no        | EdgeWorkers  | yes | Prolexic   | yes     | yes (Akamai is often the second CDN) |
| AWS CloudFront | 600+ | trial   | Lambda@Edge + Functions | AWS WAF | AWS Shield (Std/Adv) | yes | yes |
| GCP Cloud CDN | 200+ | trial    | (limited)   | Cloud Armor | yes | yes | yes |
| Azure Front Door | 200+ | trial | (none)      | yes | Azure DDoS | yes | yes |
| Bunny CDN    | 100+ | no (cheap)| Edge Scripts | yes | basic     | basic   | yes |
| KeyCDN       | 35+  | no        | (none)      | basic | basic    | basic   | yes |
| StackPath    | 65+  | no        | Serverless Workers | yes | yes | yes | yes |

## Pricing (rough, USD per GB egress, 2026)

```
Cloudflare    free tier; Pro $20/mo; Business $200/mo; Enterprise custom; egress effectively free at all paid tiers
Fastly        $0.12/GB first 10TB, $0.08 next, drops with volume
Akamai        ~$0.30/GB list; heavily discounted enterprise (50-90% off)
CloudFront    $0.085/GB first 10TB → $0.02 at PB scale
GCP CDN       $0.08/GB → $0.02 at PB
Bunny         $0.005-0.04/GB (cheapest)
KeyCDN        $0.04/GB

Cloudflare is uniquely no-egress-charge: pay for plan / Workers / D1 / R2 but not per-GB
```

For media / high-volume: Bunny is unbeatable on price; Akamai for enterprise; Cloudflare for non-egress-charge model.

## Selecting Per Workload

```
Static website + assets:           Cloudflare (free works) or Bunny (cheap)
SaaS API + dashboard:              Cloudflare or Fastly
Video / streaming:                 Akamai, CloudFront, Bunny Stream
E-commerce (Tier-1):               Cloudflare Enterprise or Akamai (multi-CDN)
Heavy edge compute:                Cloudflare Workers or Fastly Compute@Edge
AWS-native app:                    CloudFront + Lambda@Edge
GCP-native app:                    GCP Cloud CDN + Cloud Armor
Strict data residency:             Akamai or CloudFront with regional restrictions
```

## Feature Deep-Dive

### Cloudflare
```
Pros:
  - Free plan is genuinely usable
  - No egress charge across all paid plans
  - Workers (V8 isolates, 50ms CPU, KV/D1/R2 attached)
  - Excellent DDoS auto-mitigation at L3-L7
  - 1.1.1.1 + 1.0.0.1 DNS resolvers (latency advantage)
  - Magic Transit for BGP-level protection
  - Tunnel (formerly Argo Tunnel) hides origin entirely
Cons:
  - Enterprise pricing opaque
  - Workers KV is eventually consistent (≤60s propagation)
  - D1 SQLite limited scale
  - Random outages have hit (June 2022, Oct 2023) — multi-CDN sometimes needed
```

### Fastly
```
Pros:
  - Sub-150ms purge globally (industry-leading)
  - VCL for ultra-flexible cache logic
  - Compute@Edge runs WASM (Rust, Go, JS, AssemblyScript)
  - Strong real-time logging (streaming to S3/Datadog/Splunk)
Cons:
  - 90+ PoPs vs Cloudflare's 320+ (matters in some geographies)
  - Smaller free tier (trial only)
  - No native object storage (use S3)
  - Documentation density steep
```

### Akamai
```
Pros:
  - Largest network (4000+ PoPs)
  - Prolexic DDoS scrubbing (industry gold standard)
  - Mature enterprise sales + support
  - Bot Manager Premier (best-in-class bot intel)
Cons:
  - Expensive without enterprise discount
  - Slow to change (UI legacy, contract-heavy)
  - Lock-in via custom configurations
  - Edge compute (EdgeWorkers) newer, smaller adoption
```

### AWS CloudFront
```
Pros:
  - Tight AWS integration (S3, ALB, Lambda@Edge, Shield)
  - Mature WAF (AWS WAF + Managed Rules)
  - Lambda@Edge in any AWS region origin
Cons:
  - Cache hit ratios usually worse than Cloudflare/Fastly
  - Lambda@Edge cold starts (sometimes 100ms+)
  - Per-GB egress pricing accumulates
  - DDoS Shield Advanced is +$3,000/month per org
```

## Switching CDN — Migration Plan

```
Week 1     Pre-prod: register account, configure DNS dry-run
Week 2     Deploy WAF rules (log only), compare with current
Week 3     Configure cache rules; test purge
Week 4     Canary: 5% traffic via new CDN (low-TTL DNS or per-route routing)
Week 5     Ramp to 50%, then 100%
Week 6     Decommission old CDN after bake
```

DNS TTL ≤ 60s during migration. Keep both running for ≥ 30 days for fast revert.

## Multi-CDN Patterns

```
Active-Active (Round Robin DNS):
  Simple, but no smart routing.
  Use weighted records for capacity-driven split.

Performance-Based Routing:
  Cedexis / NS1 Pulsar / Citrix ITM measure real-user perf per CDN per geo
  DNS returns best CDN per query
  Cost: ~$10-50k/year for routing platform

Active-Passive (Failover):
  Primary CDN handles all traffic
  Health probe → DNS swap on failure
  Cheapest multi-CDN, but failover takes DNS TTL
```

## Don't-Forget Items

- Certificate management: provider-managed cert (easy) vs BYO (more control). Pin SANs if API.
- HTTP/2, HTTP/3 (QUIC) — modern CDNs all support; enable
- IPv6 origin support: not all providers preserve IPv6 client → check
- Geo + regulatory blocks: CDN often has cleanest geo-blocking
- Image optimization: Cloudflare Polish/Resizing, Akamai Image Manager, Fastly IO
- Real IP propagation: set up trusted X-Forwarded-For / CF-Connecting-IP on origin
- Logging: stream to your SIEM (security has to see edge traffic)

## Compliance

```
GDPR EU users         data residency at edge — verify provider has EU-only routing option
PCI DSS               cardholder data path must be PCI-compliant CDN
HIPAA BAA             Cloudflare offers BAA on Enterprise; AWS Shield Advanced ditto
ISO 27001 / SOC 2     all major CDNs have these; verify current certification dates
```
