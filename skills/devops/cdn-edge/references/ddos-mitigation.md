# DDoS Mitigation — L3/L4 and L7 Defense

## Attack Types

```
L3 Volumetric
  UDP flood       send packets to fill bandwidth
  ICMP flood      similar
  Amplification   spoofed source → reflector (DNS/NTP/Memcached) → victim, 10-50,000× amplification
  Targets:        link capacity (Gbps to Tbps)

L4 Protocol
  SYN flood       half-open TCP connections fill backlog
  ACK flood       saturate stateful devices
  Targets:        firewalls, load balancers, connection tables

L7 Application
  HTTP flood      legitimate-looking HTTP requests overwhelm app/DB
  Slow loris      open connections, send headers very slowly
  Large POST      legit requests with huge body (DB write storm)
  Cache busting   randomize query params to bypass cache → origin overload
  Targets:        app servers, DB, business logic

Sophisticated (modern)
  Multi-vector    combine L3+L7 in same attack
  Adaptive        attacker observes mitigation and adapts
  Slow + low      stays under per-IP rate-limit thresholds
  Targets:        all of the above, hardest to defend
```

## Mitigation Tiers

```
Tier 0 — Always-on edge
  CDN absorbs L3/L4 automatically (Cloudflare DDoS, AWS Shield Standard, GCP Cloud Armor)
  Anycast spreads load globally
  Provider has Tbps+ capacity

Tier 1 — Managed L7 defense
  Vendor-managed WAF rulesets specifically for L7 DDoS
  Rate limits (per IP / per session / per route)
  Bot management (managed challenge, CAPTCHA)
  Behavioral / ML-based detection

Tier 2 — Scrubbing center
  Akamai Prolexic, Cloudflare Magic Transit, AWS Shield Advanced, Voxility, Radware
  Customer's IP traffic routed via scrubbing facility on attack
  Clean traffic delivered back via GRE tunnel / dedicated link
  10-300+ Tbps capacity

Tier 3 — BGP RTBH (last resort)
  Tag attacked prefix with community 65000:666 → upstream blackholes
  Sacrifice victim IP; rest of service continues
```

## Per-Tier Setup

### Tier 0 — Cloudflare automatic
- Cloudflare Free/Pro/Business: L3/L4 absorbed transparently
- Enterprise: dedicated capacity, account team, custom rules
- No config needed for typical attacks (≤ 1 Tbps)

### Tier 1 — Rate limits + managed rules
```yaml
# Cloudflare Ruleset Engine
- expression: '(http.request.uri.path eq "/api/expensive-endpoint")'
  action: challenge
  ratelimit:
    threshold: 50
    period: 60
    counting_expression: 'cf.ipv4_aggregate'   # /24 aggregation for IPv4
    mitigation_timeout: 600

- expression: 'http.request.method eq "POST" and http.request.body.size gt 1048576'
  action: block  # block POSTs > 1MB
```

### Tier 2 — Scrubbing example (Magic Transit)
```
You announce your /24 BGP prefix from Cloudflare (instead of your transit)
Cloudflare scrubs traffic, returns clean via GRE tunnel to your DC
Mid-attack: failover automatic; capacity: Tbps; cost: ~$10-100k/month

Setup:
  1. Cross-connect to Cloudflare (or via cloud)
  2. Announce prefix from Cloudflare ASN (with permission)
  3. Configure GRE tunnel back to your origin routers
  4. Test failover quarterly
```

### Tier 3 — RTBH
```bash
# FRR: announce blackhole community
ip community-list standard blackhole permit 65000:666
route-map blackhole-out permit 10
  set community 65000:666 additive
neighbor 192.0.2.1 route-map blackhole-out out
neighbor 192.0.2.1 prefix-list blackhole-prefixes out
ip prefix-list blackhole-prefixes seq 10 permit 198.51.100.42/32
```

Upstream (transit provider) must support `666` blackhole community (most do).

## Detection

```
Volumetric:        bandwidth utilization > 80% of link, sudden spike
Protocol:          SYN/ACK ratio anomaly, connection table fill
Application:       requests/sec spike, p99 latency spike, error rate up
Cache busting:     cache hit ratio collapse, origin traffic spike

Source-side signals:
  Surge in unique source IPs (botnet pattern)
  Surge from specific ASN / country
  Specific URI pattern
```

Tools: netflow / sFlow exporters, CDN analytics dashboards, anomaly alerts.

## Response Runbook

```
T+0     Alert fires (latency / errors / bandwidth)
T+1m    On-call confirms: real attack vs traffic spike (sale, launch?)
T+5m    Engage incident commander; war room opened
T+10m   Tier 0 already active (CDN absorbs L3/L4)
        Activate Tier 1: emergency rate limits, challenge to suspicious traffic
T+15m   If still degraded: Tier 2 scrubbing engagement (call provider hotline)
T+30m   Customer comms: status page + holding statement
T+1h    Adjust mitigations as attacker adapts
T+24h   Post-attack: identify patterns, harden, postmortem
```

## Pre-Attack Hardening

```
[ ] Origin IP hidden (CDN-only ingress, allowlist origin to CDN IPs)
[ ] Anycast for stateless services
[ ] Cache hit ratio ≥ 90% for cacheable content (less origin pressure)
[ ] Rate limits in place even at normal times
[ ] Bot management baseline
[ ] Tier 2 scrubbing contract + tested failover
[ ] L7 quarantine playbook (kick suspicious sessions)
[ ] Capacity headroom ≥ 2× peak
[ ] On-call DDoS runbook practiced quarterly
```

## Cost Considerations

```
Tier 0 / Cloudflare basic     included with plan
Tier 1 / managed L7           included Pro+; Enterprise unlimited
Tier 2 / scrubbing
  Cloudflare Magic Transit    $10-30k/month base
  AWS Shield Advanced         $3,000/month + ELB/CloudFront fees
  Akamai Prolexic             custom, $50-500k/year
  Voxility                    pay-as-you-go option
```

Estimate: attacks above ~50 Gbps require Tier 2; under that, Tier 0/1 of major CDN sufficient.

## Real-World Capacity (2024-2026)

```
Single attack records: 71+ million requests per second (Cloudflare blocked, 2023)
Bandwidth records:     5+ Tbps reported by AWS Shield (2020)
Provider capacity:     Cloudflare 200+ Tbps, Akamai 350+ Tbps, AWS 200+ Tbps
Typical attack:        10-100 Gbps, few minutes to few hours
```

If you self-host without CDN: you cannot defend against modern volumetric attacks beyond your link
capacity. Bandwidth alone makes self-defense impractical above 1-10 Gbps attack size.

## Common Failures

- Origin IP leaked (DNS history, email server with same IP, GitHub commit) → CDN bypass
- Rate limit set too high → DDoS still gets through; too low → real users hit
- No bot management → app-level requests with valid TLS, normal UA, look "real"
- L7 attack treated as L3 → wrong mitigation, attack continues
- BGP RTBH on /24 when /32 sufficient → unnecessary collateral damage
- Tier 2 scrubbing never tested → activation fails during real attack
- Capacity rented "for peak" without verifying provider can deliver
