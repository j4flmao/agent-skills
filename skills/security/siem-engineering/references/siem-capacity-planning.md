# SIEM Engineering: Capacity Planning & Performance Engineering

## Overview

Capacity planning for SIEM infrastructure is a critical discipline that balances data ingestion, storage, query performance, and cost. This reference covers the systematic approach to sizing, scaling, and optimizing SIEM deployments — from initial capacity modeling through ongoing performance tuning and cost governance.

## Core Architecture Concepts

### Capacity Dimensions

SIEM capacity spans four interdependent dimensions:

```
Data Volume Dimension
├── Ingestion rate (GB/day, EPS — events per second)
├── Peak factor (burst capacity = normal × 2-5x)
├── Compression ratio (raw:indexed:stored)
└── Growth rate (% monthly/yearly)

Storage Dimension
├── Hot storage (SSD, 7-30 day retention)
├── Warm storage (HDD, 30-90 day retention)
├── Cold storage (Object, 90-365+ day retention)
└── Archive storage (Glacier/tape, >365 days)

Compute Dimension
├── Ingestion nodes (CPU for parsing, enrichment)
├── Indexer nodes (CPU + memory for indexing)
├── Search nodes (CPU + memory for queries)
└── Management nodes (UI, API, orchestration)

Query Dimension
├── Concurrent users (analysts, dashboards, APIs)
├── Query complexity (simple lookup vs. statistical aggregation)
├── Query frequency (queries/second, scheduled reports)
└── Acceleration (data models, summary indexes, report accelerators)
```

### Capacity Planning Model

```
Base Capacity = f(EPS, Retention, Replication, Compression)

Ingestion EPS = Σ(Source EPS) × Peak Factor
  Source EPS = events_per_day / 86400

Storage_GB = Σ(Source_GB_day × Retention_days × Replication × Comp_ratio)

Compute_Cores = Ingestion_cores + Indexing_cores + Search_cores + Mgmt_cores

  Ingestion_cores = EPS / 5000 (typical: 5000 EPS per core)
  Indexing_cores = EPS / 3000 (typical: 3000 EPS per core per node)
  Search_cores = concurrent_users × 2 (base) + scheduled_queries × 0.5

Memory_GB = Hot_index_size_GB × 0.3 + Search_working_set + OS_overhead
```

### Sizing Reference Tables

#### Splunk Reference Sizing

| Environment | EPS | Daily Volume | Indexer Count | Storage (Hot 14d) | Storage (Warm 90d) |
|-------------|-----|-------------|---------------|-------------------|-------------------|
| Small | 500 | 50 GB | 2 | 1.4 TB | 4.5 TB |
| Medium | 5,000 | 500 GB | 6 | 14 TB | 45 TB |
| Large | 50,000 | 5 TB | 20 | 140 TB | 450 TB |
| Extra Large | 200,000 | 20 TB | 60 | 560 TB | 1.8 PB |

#### Elastic Security Reference Sizing

| Environment | EPS | Daily Volume | Data Nodes | Hot Storage | Warm Storage |
|-------------|-----|-------------|-----------|-------------|-------------|
| Small | 500 | 50 GB | 3 | 0.7 TB SSD | 2.5 TB HDD |
| Medium | 5,000 | 500 GB | 9 | 7 TB SSD | 25 TB HDD |
| Large | 50,000 | 5 TB | 27 | 70 TB SSD | 250 TB HDD |
| Extra Large | 200,000 | 20 TB | 60 | 280 TB SSD | 1 PB HDD |

## Architecture Decision Trees

### Decision 1: Scaling Model

```
Question: Scale up (vertical) vs scale out (horizontal)?
├── Vertical (larger instances)
│   ├── Pros: Simpler management, lower inter-node latency
│   ├── Cons: Hardware limits, higher failure blast radius, cost super-linearity
│   └── Best for: <5K EPS, single data center
├── Horizontal (more instances)
│   ├── Pros: Near-linear scaling, smaller blast radius, commodity hardware
│   ├── Cons: Higher complexity, rebalancing required, network overhead
│   └── Best for: >5K EPS, cloud native, HA requirements
└── Recommendation: Always choose horizontal at >5K EPS.
    Vertical for management/search head layers only.
```

### Decision 2: Retention Strategy

```
Question: How long to retain data at each tier?
├── Compliance-driven
│   ├── PCI DSS: 12 months online, 12 months offline
│   ├── SOC 2: 6-12 months online
│   ├── HIPAA: 6 years
│   ├── SOX: 7 years
│   └── GDPR: Subject to data minimization (delete when no longer needed)
├── Operational-driven
│   ├── Hot: 7-14 days (immediate investigation needs)
│   ├── Warm: 30-90 days (monthly trends, recent investigations)
│   ├── Cold: 12 months (year-over-year comparison, compliance)
│   └── Archive: 3-7 years (legal hold, compliance)
├── Cost-driven
│   ├── Hot cost: $X/GB/month (SSD)
│   ├── Warm cost: $X/GB/month × 0.3 (HDD)
│   ├── Cold cost: $X/GB/month × 0.05 (S3)
│   └── Archive cost: $X/GB/month × 0.01 (Glacier)
└── Decision: Model total cost at each tier. Find break-even where
    cold tier + restore cost < warm tier storage cost.
```

### Decision 3: Cloud vs On-Premises

| Factor | Cloud SIEM (SaaS) | Cloud SIEM (Self-managed) | On-Premises |
|--------|-------------------|--------------------------|-------------|
| Capex | None | Low (compute only) | High (servers, storage, networking) |
| Opex | Per-GB ingested | Compute + storage + licensing | Power, cooling, space, staff |
| Scaling | Instant, elastic | Minutes-hours | Weeks (hardware procurement) |
| Latency | Network-dependent | AZ-local | Lowest |
| Compliance | Provider certs | Full control | Full control |
| Staff needed | Minimal | SIEM admin + cloud ops | Full team (storage, compute, network, SIEM) |
| Upgrade mgmt | Provider-managed | Self-managed | Self-managed |
| Data egress | No cost | Potential cross-AZ cost | N/A |

**Decision matrix:**
- <1TB/day: Cloud SaaS (Splunk Cloud, Elastic Cloud, Sentinel)
- 1-10TB/day: Cloud self-managed (better cost control)
- >10TB/day or strict compliance: On-premises or dedicated cloud region

## Implementation Strategies

### Phase 1: Baseline Measurement (Weeks 1-2)
- Measure current EPS per source type (daily avg, peak, 95th percentile)
- Calculate compression ratios (raw event size / indexed size)
- Profile current query patterns (concurrent users, peak query times)
- Map data growth rate over last 12 months
- Document compliance retention requirements

### Phase 2: Capacity Model (Weeks 3-4)
- Build capacity model with current and projected volumes
- Run scenarios: normal growth, acquisition, new source onboarding
- Model cost for each retention tier
- Identify bottlenecks in current deployment
- Create 12-month and 36-month capacity projections

### Phase 3: Optimization (Weeks 5-10)
- Implement selective indexing (drop unneeded fields)
- Deploy data tiering with automated transitions
- Optimize index structure (rollover policy, shard sizing)
- Tune query performance (accelerated data models, summary indexes)
- Implement storage compression optimization
- Right-size compute resources based on utilization

### Phase 4: Automation (Weeks 11-16)
- Implement auto-scaling for variable load
- Deploy automated index life-cycle management
- Build capacity monitoring dashboard with forecasting
- Create automated right-sizing recommendations
- Implement storage cost allocation and chargeback

## Performance Optimization Patterns

### Index Optimization

```
Index Rollover Strategy:
├── Hot phase: Roll over at 50GB or 7 days
├── Warm phase: Convert to read-only, reduce replica count
├── Cold phase: Move to less performant storage
└── Delete phase: Purge after retention period

Shard Sizing:
├── Optimal shard size: 10-50GB
├── Too small (<1GB): Too many shards, management overhead
├── Too large (>100GB): Slow recovery, rebalancing issues
└── Formula: shard_count = total_index_size / target_shard_size

Replica Strategy:
├── Hot: 2 replicas (high availability + search parallelism)
├── Warm: 1 replica (search performance, less write critical)
├── Cold: 0 replicas (data at rest, reconstruct from source)
└── Archive: N/A (object storage has built-in redundancy)
```

### Query Acceleration

```
Data Model Acceleration:
├── Pre-aggregate common queries
├── Reduce query time from minutes to seconds
├── Storage overhead: 10-30% of source data
└── Refresh interval: 5-15 minutes

Summary Indexing:
├── Pre-compute statistical results
├── Best for: Time-based trends, top-N queries
├── Storage overhead: 1-5% of source data
└── Refresh interval: 1-5 minutes

Report Acceleration:
├── Cache report results
├── Invalidate on new data
├── Storage overhead: Minimal (metadata only)
└── Best for: Scheduled reports and dashboards
```

## Cost Optimization

### Ingestion Cost Reduction

| Strategy | Savings | Impact | Effort |
|----------|---------|--------|--------|
| Selective log source filtering | 20-50% | May miss critical events | Low |
| Event sampling (high-volume sources) | 30-60% | Reduces fidelity | Medium |
| Log aggregation before sending | 40-70% | Loses raw detail | High |
| Compression optimization | 10-30% | Reduces storage without data loss | Low |
| Retention policy enforcement | Variable | Limits data accessible | Low |
| Indexed field reduction | 20-40% | May slow queries on non-indexed fields | Medium |

### Storage Cost by Tier

| Tier | Technology | Cost/GB/Month | Query Performance | Use Case |
|------|------------|--------------|-------------------|----------|
| Hot | NVMe SSD | $0.20-0.40 | <1s | Active investigation |
| Warm | SATA SSD | $0.08-0.15 | 1-5s | Recent incidents |
| Cold | S3 Standard | $0.02-0.03 | 10-60s | Historical search |
| Archive | S3 Glacier | $0.001-0.004 | 1-12h restore | Compliance retention |

## Security Considerations

### Capacity as Security Control

```
Capacity Controls:
├── Ingestion rate limiting (prevent DOS via log flood)
│   ├── Per-source rate limit: max 2x normal
│   └── Global rate limit: max 3x normal aggregate
├── Storage watermark management
│   ├── Low watermark (75%): Alert operations
│   ├── High watermark (85%): Stop low-priority ingestion
│   └── Emergency (95%): Stop all ingestion except security-critical
├── Query resource limits
│   ├── Per-user: max concurrent queries, max time range
│   ├── Per-query: max result size, max buckets
│   └── Cluster-wide: max concurrent search jobs
└── Capacity SLA enforcement
    ├── Tier 1: 99.9% ingestion uptime
    ├── Tier 2: 99% query availability
    └── Tier 3: 95% dashboard responsiveness
```

## Operational Excellence

### Capacity Monitoring Dashboard

```
Capacity Dashboard KPIs:
├── Current EPS (by source, total, peak, average)
├── Daily ingestion volume (today, yesterday, 7-day avg, 30-day avg)
├── Storage utilization (by tier, by index, trend)
├── Growth rate (daily, weekly, monthly, yearly)
├── Time to full (at current growth rate)
├── Query latency (p50, p95, p99 by index type)
├── Indexer CPU/memory utilization
├── Consumer lag (per Kafka topic/partition)
└── Cost per GB ingested (by source, by index)
```

### Capacity Reviews

```
Daily: Automated capacity health check
├── Storage utilization trend
├── Consumer lag
├── Anomalous volume changes
└── Query latency outliers

Weekly: Capacity review
├── vs. capacity model
├── New source onboarding impact
├── Growth rate update
└── Upcoming capacity events

Monthly: Capacity planning
├── 3-month projection update
├── Budget vs. actual cost
├── Optimization opportunities
└── Procurement requests

Quarterly: Strategic planning
├── 12-month projection
├── Technology refresh evaluation
├── Retention policy review
└── Budget planning for next fiscal year
```

## Testing Strategy

### Capacity Testing

- **Load test**: Simulate 2x current EPS for 24 hours, measure pipeline stability
- **Peak test**: Simulate 5x normal EPS for 1 hour, verify graceful degradation
- **Query test**: Run 10x normal query load, verify SLA compliance
- **Storage test**: Fill to 90% capacity, verify watermark actions
- **Growth test**: Add 50% more sources, verify auto-scaling
- **Disaster recovery test**: Failover to DR, measure RPO/RTO
- **Retention test**: Verify data transitions between tiers

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Under-provisioning | Dropped events at peak | Sizing for average, not peak | Model at 95th percentile + 2x buffer |
| Over-provisioning | 40% utilization, wasted cost | Sizing for worst case | Auto-scaling, right-sizing reviews |
| Index bloat | Storage costs 3x projection | Indexing too many fields | Selective index, field allowlist |
| Query regression | Queries slowed 10x | Index structure not optimized | Data model, summary index validation |
| Retention surprises | Overage storage costs | Auto-renew without review | Monthly retention audit |
| Growth blindness | Capacity exhausted without warning | No forecasting | Automated capacity projection with alerts |

## Key Takeaways

- Model SIEM capacity across four dimensions: data volume, storage, compute, query
- Always plan for peak load (not average) with a 2x safety margin
- Choose horizontal scaling over vertical at >5K EPS
- Implement three-tier storage (hot/warm/cold) to balance performance and cost
- Use selective indexing to reduce storage costs by 20-50%
- Pre-accelerate common queries with data models and summary indexes
- Monitor ingestion rate, consumer lag, and storage utilization as primary KPIs
- Automate capacity forecasting with monthly review cycles
- Right-size resources quarterly based on utilization data
- Design capacity controls for security (rate limiting, watermark management)

## Related References
- references/siem-architecture.md — SIEM system architecture
- references/siem-data-pipeline-architecture.md — Data pipeline design
- references/log-sources-ingestion.md — Log source onboarding
- references/siem-tuning.md — Performance tuning
- references/detection-content.md — Detection rule optimization
- references/siem-engineering-fundamentals.md — Foundational concepts
