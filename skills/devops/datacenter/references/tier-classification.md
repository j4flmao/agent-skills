# Uptime Institute Tier Classification

## Tiers At a Glance

| Tier | Availability | Annual downtime | Key trait                              |
|------|--------------|------------------|----------------------------------------|
| I    | 99.671%      | 28.8h            | single path, no redundancy             |
| II   | 99.741%      | 22h              | redundant components, single path      |
| III  | 99.982%      | 1.6h             | concurrently maintainable (CM)         |
| IV   | 99.995%      | 26.3m            | fault-tolerant (FT), 2N+1              |

(Note: Tier III achieves higher availability than Tier II via CM design even though both single-active-path.)

## Tier I — Basic Capacity

```
Power:    single utility, optional UPS, optional generator
Cooling:  single CRAC/CRAH, no redundancy
Network:  single ISP, single carrier
Maint:    requires full shutdown
Use:      small offices, dev/test, non-critical
```

## Tier II — Redundant Components

```
Power:    UPS + generator (redundant components on single path)
Cooling:  N+1 CRAC, single chiller loop
Network:  single ISP typically (2 acceptable but single path)
Maint:    component swap possible; path maintenance = downtime
Use:      SMB business systems, mid-tier SaaS
```

## Tier III — Concurrently Maintainable

```
Power:    multiple feeds + multiple UPS/gen; ONE active path at a time
          switchover via STS (static transfer switch) within 6s
Cooling:  multiple chillers, multiple distribution loops, N+1 minimum
Network:  multi-carrier, separate entry points, redundant routers
Maint:    any component can be taken offline without bringing down IT load
Use:      most enterprise workloads, standard SaaS
```

Tier III is the sweet spot for cost vs availability for most companies.

## Tier IV — Fault Tolerant

```
Power:    2N+1, two ACTIVE paths simultaneously; tolerates ANY single fault
Cooling:  2N+1, two active chiller plants
Network:  fully redundant from carrier entry → core router → leaf
Maint:    concurrently maintainable + tolerates concurrent failure
Use:      tier-1 financial, fintech clearing, hyperscale, life-safety
```

Tier IV typically costs 2–3× Tier III. Only worth it for genuine 99.99%+ requirements at facility level.

## Certified vs Designed vs Self-Claimed

```
Tier Certified Design Documents (TCDD)     blueprint reviewed by UI
Tier Certified Constructed Facility (TCCF) physical build inspected
Tier Certified Operational Sustainability  ongoing ops audit (rare)

Watch for "Tier III equivalent" or "Tier III aligned" in marketing — not certified.
For Tier III/IV compliance, demand the certificate # and verify on UI's website.
```

## Mapping Tier to App SLA

```
App 99.9%  → Tier II facility OK (3 nines × 3 nines composed gives ~99.5%; needs app-level redundancy)
App 99.95% → Tier III recommended
App 99.99% → Tier III + multi-DC active-passive  OR  Tier IV single DC
App 99.999% → multi-DC active-active across ≥ 2 Tier III/IV facilities
```

A single facility — no matter the tier — cannot deliver more 9s than its certification on its own.
Multi-DC is the only path to ≥ 99.99% reliably.

## Colo Provider Tiers (typical)

```
Equinix          Tier III+ at most metros, IX-rich, premium pricing
Digital Realty   Tier III to IV, large footprint, wholesale + retail
CoreSite         Tier III, US-centric, network-dense
NTT (RagingWire) Tier III to IV
QTS              Tier III
Iron Mountain    Tier III, secure facilities (former vaults)
Local providers  varies — verify certification, not claims
```

## Hyperscale (custom)

Hyperscalers (AWS, GCP, Azure, Meta, Google) operate their own DCs, often not formally tiered but
designed to higher availability through facility + region + AZ engineering. Their published SLAs are
~99.99% per AZ, ~99.995% per region.

## When Tier I/II is Acceptable

- Dev / staging environments
- Workloads with their own multi-DC replication (where DC outage just means traffic to other DC)
- Cost-sensitive workloads with low MAO
- Edge POPs (failure tolerated by anycast)

## When Tier IV is Required

- Single-DC workload with 99.99%+ SLA
- Regulated workloads where multi-DC adds compliance complexity
- Real-time systems with no usable failover window (trading, telco core)
- Mission-critical operations (hospitals, air traffic, military)
