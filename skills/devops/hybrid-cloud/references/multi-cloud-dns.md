# Multi-Cloud DNS — Authoritative, Split-Horizon, Routing Policies

## Goals
- Resolve internal names consistently from anywhere (on-prem, cloud A, cloud B)
- Route external users to the best (closest / healthiest) endpoint
- Survive single cloud or DNS provider failure
- Maintain low TTLs without paying for excessive queries

## Authoritative DNS Provider Choice

| Provider          | Strength                                    | Notes                       |
|-------------------|---------------------------------------------|-----------------------------|
| Route 53 (AWS)    | tight AWS integration, health checks       | per-query billing           |
| Cloud DNS (GCP)   | GCP integration                            | flat-rate + per-query       |
| Azure DNS         | Azure integration                          | similar                     |
| Cloudflare DNS    | extremely fast (anycast everywhere), free  | included with CDN; no health-check on free tier |
| NS1               | feature-rich routing, real-user data       | commercial                  |
| DNSimple / DNSMadeEasy | mid-tier, decent features              | commercial                  |
| Akamai Edge DNS   | enterprise, heavily DDoS-resilient         | commercial                  |
| dnscontrol (OctoDNS) | multi-provider deploy from one config   | DIY automation              |

For hybrid + multi-cloud: Route 53 or Cloudflare DNS as primary. Pair with second provider for
resilience (DNSimple / NS1 / Cloudflare backup).

## Multi-Provider DNS for Resilience

```
example.com NS records:
  ns-1.route53.aws    (provider A)
  ns-2.route53.aws    (provider A)
  ns-3.cloudflare.com (provider B)
  ns-4.cloudflare.com (provider B)

Both providers serve the same zone (kept in sync via octoDNS / dnscontrol)
If one provider has outage, resolvers retry the other — most clients try ≥ 2 NS records
```

```yaml
# octoDNS config — deploy same zone to multiple providers
providers:
  config:
    class: octodns.provider.yaml.YamlProvider
    directory: ./config
  route53:
    class: octodns.provider.route53.Route53Provider
  cloudflare:
    class: octodns_cloudflare.CloudflareProvider
    email: env/CF_EMAIL
    token: env/CF_TOKEN

zones:
  example.com.:
    sources: [config]
    targets: [route53, cloudflare]
```

## Split-Horizon (Internal vs External)

```
Internal view (corp / VPC / on-prem):
  api.example.com → 10.10.0.5 (private IP)
  db.example.com  → 10.10.0.20

External view (Internet):
  api.example.com → 198.51.100.5 (public IP or CDN)
  db.example.com  → does not resolve (or NXDOMAIN, not leaked)
```

Implementation:
```
Route 53 Private Hosted Zone (per VPC)
  + Route 53 Public Hosted Zone (for external)
  
AWS Resolver Inbound Endpoint
  → on-prem resolvers forward *.internal.example.com to this
  → on-prem clients get private IPs

AWS Resolver Outbound Endpoint
  → VPC instances forward *.on-prem.example.com to on-prem DNS
  → cloud workloads resolve on-prem internal names
```

## Latency-Based Routing

Send users to the geographically closest healthy endpoint.

```
Route 53 latency-based:
  api.example.com →
    Latency record: us-east-1 ALB
    Latency record: eu-west-1 ALB
    Latency record: ap-south-1 ALB
  AWS resolves based on Route 53's latency table (refreshed continuously)
```

```yaml
# Cloudflare Load Balancing pool example
- name: api-multi-region
  origins:
  - name: us-east-1
    address: us-east-1.api.example.com
    weight: 1
  - name: eu-west-1
    address: eu-west-1.api.example.com
    weight: 1
  steering_policy: "dynamic_latency"     # picks fastest based on RUM
  monitor: health-monitor-id
```

## Geo / Geofencing

Force specific countries to specific regions (residency, regulation, compliance).
```
Route 53 geolocation policy:
  Country = DE → eu-central-1
  Country = JP → ap-northeast-1
  Continent = NA → us-east-1
  Default → us-east-1
```

## Health Checks + Failover

```
Health check (HTTP/HTTPS to /readyz)
  Interval: 30s (or 10s for fast detection at premium tier)
  Threshold: 3 consecutive failures
  On unhealthy: DNS record removed / failover record activated
```

```
Route 53 failover policy:
  Primary record: us-east-1, health-checked
  Secondary record: us-west-2 (DR), used only when primary unhealthy
  
TTL: 30-60s (must match desired RTO)
```

## TTL Strategy

```
Long TTL (hours)     stable infra (NS, MX records)
Medium (5-15 min)    typical A records under steady state
Short (30-60s)       records that may failover; during migrations

Watch: too-short TTLs increase query cost dramatically at scale
  10M users × 60s TTL = ~14M queries/hour per record vs 1.7M for 600s TTL
```

## Resolver Forwarding (Hybrid)

On-prem clients need to resolve cloud-internal names without exposing them publicly.

```
/etc/unbound/unbound.conf (on-prem resolver):
  forward-zone:
    name: "internal.example.com"
    forward-addr: 10.255.0.2          # AWS Route 53 Inbound Resolver Endpoint
    forward-addr: 10.255.0.3
  
  forward-zone:
    name: "gcp.internal.example.com"
    forward-addr: 10.255.1.2          # GCP Cloud DNS forwarder
```

Cloud-side (AWS):
```
Route 53 Resolver Outbound Endpoint forwards on-prem names to on-prem DNS:
  Rule: "on-prem.example.com" → 10.10.0.2 (on-prem BIND)
```

## DNSSEC

```
Sign zones to prevent cache poisoning + spoofing.
Most managed DNS supports auto-signing (Route 53, Cloudflare, Cloud DNS).

Caveat: not all client resolvers validate; benefit accumulates as ecosystem adopts.
Required by some compliance regimes; nice-to-have generally.
```

## Anycast DNS

```
Resolver-side anycast: 1.1.1.1, 8.8.8.8 (operator's gift to everyone)
Authoritative-side anycast: provider's NS IPs announced from many POPs
  → user query goes to closest NS instance → lowest latency
  → all major managed DNS providers do this by default
```

## CNAME Flattening

CNAME at zone apex (example.com → cdn.cloudflare.com) is non-RFC.
Cloudflare/Route 53 alias records: provider resolves CNAME at edge, returns A records to client.

```
Route 53 Alias:
  example.com → ALIAS d111111.cloudfront.net    (free, no per-query cost)

Cloudflare:
  example.com → CNAME (flattened transparently)
```

## DNS-Based Multi-CDN

```
example.com →
  Weighted records:
    50% → cloudflare CNAME
    50% → fastly CNAME
  Both CDNs configured with same backend
  Per-CDN health check; remove from rotation on outage
```

## Monitoring

```
Per-record query volume (catch unexpected spike → cost surprise)
Per-record cache miss ratio at downstream resolvers
Health check pass/fail trends
DNSSEC validation failures
NXDOMAIN response rate (catch broken records)
```

## Common Failures

- Single DNS provider → provider outage = nameless Internet for your zone
- Long TTL during planned failover → users stuck on dead endpoint
- Split-horizon misconfig → internal name leaks publicly OR external can't resolve
- No DNSSEC, public DNS used for sensitive name → spoofing risk
- CNAME chain too long → some resolvers truncate, lookup fails
- Forgetting MX / TXT (DMARC, SPF) when moving zone → email delivery breaks
- TTL too short on stable records → bill shock at scale
- Resolver Endpoint in single AZ → AZ outage = name resolution down for VPC
