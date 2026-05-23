# Availability Tiers — Budget, Cost, Architecture

## Downtime Budget Table

| Tier      | Yearly       | Monthly    | Weekly    | Daily    |
|-----------|--------------|------------|-----------|----------|
| 90%       | 36.5d        | 73h        | 16.8h     | 2.4h     |
| 95%       | 18d 6h       | 36h 30m    | 8.4h      | 1.2h     |
| 99%       | 3d 15h 36m   | 7h 18m     | 1h 40m    | 14m 24s  |
| 99.5%     | 1d 19h 48m   | 3h 39m     | 50m 24s   | 7m 12s   |
| 99.9%     | 8h 45m 36s   | 43m 12s    | 10m 5s    | 1m 26s   |
| 99.95%    | 4h 22m 48s   | 21m 36s    | 5m 2s     | 43s      |
| 99.99%    | 52m 35s      | 4m 19s     | 1m 0s     | 8.6s     |
| 99.995%   | 26m 17s      | 2m 9s      | 30s       | 4.3s     |
| 99.999%   | 5m 15s       | 25.9s      | 6s        | 0.86s    |
| 99.9999%  | 31.5s        | 2.59s      | 0.6s      | 0.086s   |

Formula: `downtime = (1 - availability) × window`

## Cost Multiplier Heuristic (vs single-node baseline)

| Tier      | Approx infra cost | Engineering cost      | DR drill cadence |
|-----------|-------------------|-----------------------|------------------|
| 99%       | 1×                | 1 engineer part-time  | None             |
| 99.9%     | 2–3×              | 1 SRE                 | Annual           |
| 99.95%    | 3–5×              | 1–2 SRE               | Semi-annual      |
| 99.99%    | 6–10×             | Full SRE team         | Quarterly        |
| 99.999%   | 20–50×            | Dedicated reliability org | Monthly       |
| 99.9999%  | 100×+             | Custom hardware + multi-vendor | Continuous |

## Architecture Required Per Tier

```
99.0%      single node + nightly backup + monitoring
99.9%      primary + 1 standby (same region), semi-auto promote, hourly backup
99.95%     primary + standby across AZs, auto promote in <5m, 15m backup
99.99%     multi-AZ active-passive, auto failover, sync replica, multi-region DR
99.999%    multi-region active-active, anycast, sub-minute failover, no human
99.9999%   geo-distributed quorum, dual cloud, hardware redundancy at every layer
```

## Composite Availability (Serial Dependencies)

Services in series multiply: `A_total = A1 × A2 × A3 × ...`

```
LB (99.99) × App (99.95) × DB (99.99) × Cache (99.9) = 99.83% effective
```

→ Your weakest dependency caps your achievable tier. To hit 99.99% end-to-end,
every component on the critical path must be ≥ 99.995%.

## Composite Availability (Parallel Redundancy)

Redundant components compound: `A_redundant = 1 - (1-A)^N`

```
1 node @ 99%   = 99%
2 nodes @ 99%  = 99.99%   (independent failures only)
3 nodes @ 99%  = 99.9999%
```

Caveat: correlated failures (same AZ, same release, same dependency outage) break independence
and reduce effective N.

## Choosing the Right Tier — Decision Heuristic

```
Revenue per minute of downtime > $1000     → 99.99% minimum
Regulatory / safety critical               → 99.99%+
B2B contract with SLA penalties            → 99.9% (match SLA + 0.05 buffer)
Internal tool, non-blocking                → 99.0% acceptable
Free tier / beta                           → 95–99%
```

## Error Budget Policy (Burn Rate)

- 100% budget consumed in a window → feature freeze, reliability sprint
- 50% budget consumed in first 25% of window → cancel risky deploys
- Budget refreshed at window boundary (do NOT roll over)

Multi-window burn-rate alert (Google SRE):
```
fast: 2% budget in 1h    → page immediately
slow: 5% budget in 6h    → page within hours
slow: 10% budget in 3d   → ticket, address this sprint
```
