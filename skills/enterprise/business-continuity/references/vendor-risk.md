# Vendor Risk — Classification, Fallback, SLA Monitoring

## Vendor Classification

| Class | Definition                          | Example          | Requirement                            |
|-------|-------------------------------------|------------------|----------------------------------------|
| V1    | Outage = Tier-1 service down        | Stripe, Auth0    | Pre-tested fallback ≤ MAO              |
| V2    | Outage = degraded Tier-1, full T-2  | DataDog, GitHub  | Documented manual workaround           |
| V3    | Outage = inconvenience              | Notion, Linear   | Note only, no fallback required        |

## Fallback Patterns

```
1. Multi-vendor active-active     (writes go to both, reconcile)
2. Multi-vendor primary/standby   (primary handles, standby pre-warmed)
3. Multi-vendor manual cutover    (DNS flip / config change, documented)
4. In-house fallback              (degraded internal impl when vendor down)
5. Graceful degradation           (feature off, app keeps running)
```

## Critical-Vendor Inventory (template)

| Vendor      | Used for         | Class | SLA     | Fallback              | Last drill |
|-------------|------------------|-------|---------|-----------------------|------------|
| Stripe      | Payments         | V1    | 99.95%  | Adyen (pre-integrated)| 2026-Q1    |
| Auth0       | SSO              | V1    | 99.99%  | In-house SAML         | 2026-Q2    |
| Cloudflare  | DNS + CDN + WAF  | V1    | 100%    | Fastly + Route53      | 2026-Q1    |
| SendGrid    | Email transactional | V1 | 99.95%  | AWS SES               | 2026-Q2    |
| Twilio      | SMS              | V1    | 99.95%  | MessageBird           | 2026-Q3    |
| GitHub      | Source + CI      | V2    | 99.9%   | Local cache + Gitea   | 2026-Q4    |
| DataDog     | Observability    | V2    | 99.9%   | Grafana Cloud         | 2026-Q4    |
| AWS         | Core infra       | V1    | 99.99%  | GCP DR region         | annual     |

## Vendor SLA vs Reality

Always discount stated SLAs by ~20–30% to account for partial outages not credited.
Track measured monthly availability per vendor; renegotiate if 3 consecutive misses.

```
Vendor monthly availability = (window − sum(outage_minutes_user_observed)) / window
```

## Lock-In Mitigation

- Use vendor-agnostic abstractions where critical (S3-compatible storage, OIDC, SMTP)
- Avoid vendor-specific SQL extensions in Tier-1 paths
- Keep export-ready data formats (JSON, parquet, CSV)
- Capacity for full data export within 7 days
- Negotiate exit clauses + data portability in contracts

## Vendor Failover Drill Template

```
1. Notify customer success: "drill in progress, expect short blip"
2. Disable primary vendor at LB / API gateway level
3. Verify fallback handles traffic (success rate ≥ 99% within 5 min)
4. Run for 30 min with 10% traffic, then full traffic if green
5. Restore primary; reconcile any state delta
6. Postmortem: time-to-detect, time-to-cut, time-to-recover, drift
```

## Insurance + Contractual Levers

- Demand uptime credits in vendor SLA (penalty for breach)
- Require breach notification ≤ 24h in DPA
- Cyber insurance addendum covering vendor-caused outage
- Right-to-audit clause for V1 vendors (SOC 2 Type II + pen test reports)
