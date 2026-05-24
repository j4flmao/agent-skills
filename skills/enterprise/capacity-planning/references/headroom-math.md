# Headroom Math — Sizing With Failures, Spikes, Maintenance

## The Headroom Equation

```
required_capacity = forecast_peak × spike_factor × (N / (N - F)) × (1 + maintenance_buffer)

forecast_peak           = forecasted p99 demand
spike_factor            = unexpected spike multiplier (1.2–2.0)
N                       = total nodes
F                       = nodes that may fail concurrently (tier-driven)
maintenance_buffer      = 0.1 (10%) for rolling deploys / patching
```

## Headroom by Tier

| Tier | spike_factor | F (failures tolerated) | Effective overprovision |
|------|--------------|------------------------|-------------------------|
| 1    | 2.0          | 2                      | ~2.5× peak              |
| 2    | 1.5          | 1                      | ~1.7× peak              |
| 3    | 1.25         | 1                      | ~1.4× peak              |
| 4    | 1.1          | 0                      | 1.1× peak               |

## N+1, N+2 Pattern

```
N+1: at least 1 spare node always; tolerates 1 failure without degradation
N+2: 2 spares; tolerates 1 failure + 1 maintenance simultaneously
2N:  full redundancy (active-active across 2 sites/AZs)
2N+1: full redundancy + 1 spare
```

```
Example: serving 10k RPS, each node handles 1k RPS
  Need 10 nodes for load alone
  N+1: provision 11
  N+2: provision 12
  2N:  provision 20 (split across 2 AZs)
```

## CPU Utilization Target

```
Per-node target utilization:
  Tier-1   ≤ 50%   (room for 2× spike before saturation)
  Tier-2   ≤ 65%
  Tier-3   ≤ 75%
  Tier-4   ≤ 85%

Why not 90%? Because USL (Universal Scalability Law) — latency tail grows non-linearly
above ~70% CPU. p99 doubles at 80%, triples at 90%.
```

## DB Connection Pool Headroom

```
per-app-pool = (steady_concurrency × 1.5) + connection_burst_buffer
total = sum(per-app-pool across all clients) × N_app_replicas
must be < db_max_connections × 0.7    (leave 30% for admin, maintenance, runaway)
```

PgBouncer / ProxySQL multiplexing recommended at scale (10k client conns → 100 DB conns).

## Storage Headroom

```
Storage required = (current + forecast_growth) × replication_factor × (1 + retention)

Filesystem warning  @ 75%   (still time to procure)
Filesystem critical @ 85%   (urgent action)
Filesystem panic    @ 92%   (writes start failing; DBs may corrupt)
```

For HDFS / Ceph: cluster-level fill > 80% degrades rebalance + performance.

## Network Bandwidth Headroom

```
Tier-1 link target ≤ 50% utilization   (link redundancy: lose 1 = double the other)
Egress capacity ≥ 1.5× p99 measured + planned launches
ISP peak commit + burst billing: model both costs in capacity plan
```

## Spike Factor Examples (real-world)

```
Black Friday ecommerce       3–10×
Flash sale / drop            5–50× (sub-minute spike)
News-driven traffic          2–20× (unpredictable)
Cron-aligned writes          2× (3am batch, etc.)
End-of-month billing         3–5×
Sports event ticket onsale   100×+ (queue / waiting room required)
```

## Maintenance Buffer Justification

During rolling deploy:
```
maxSurge=25% maxUnavailable=0
  → temporary capacity = 125% of desired
  → if desired = peak_capacity, surge fits if 25% headroom available
```

## Burst vs Sustained

```
Sustained = sized capacity (always paid for)
Burst     = elastic capacity (cloud autoscale, spot fleet)

Hybrid pattern:
  Reserved instances for baseline 60% of demand
  On-demand for daily peak
  Spot for batch / non-critical surge
```

## Capacity Drill (validate the headroom)

```
1. Pick a service. Inject load to forecast_peak × 1.5
2. Verify p99 < SLO during load
3. Kill F nodes (chaos engineer test). Verify SLO holds
4. Resume normal load. Verify recovery within seconds
5. Document any breach, raise capacity if failed
```

Run quarterly minimum for Tier-1.
