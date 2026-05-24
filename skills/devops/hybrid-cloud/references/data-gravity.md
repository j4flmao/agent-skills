# Data Gravity — Placement Decisions

## The Concept
"Data has gravity." Large datasets are expensive and slow to move. Compute is small and mobile.
Place compute near data, not the other way around. This drives architecture in hybrid + multi-cloud.

## When Data Gravity Dominates

```
Dataset > 10 TB                     moving is days, costs thousands
Dataset > 100 TB                    moving is weeks, costs tens of thousands
Continuously growing dataset        each move repeats; pin location
Regulated dataset                   residency forces location anyway
Hot dataset (high read rate)        cache locality matters; replicate selectively
```

## Decision Framework

```
For each dataset, answer:
  1. WHERE was it created? (on-prem app, SaaS app, IoT, etc.)
  2. WHO consumes it? (BI tools, ML training, downstream apps, partners)
  3. HOW BIG is it? (current + growth/month)
  4. HOW HOT? (queries/sec, latency tolerance)
  5. REGULATED? (GDPR, HIPAA, sector rules)
  6. WHAT is the move cost? (egress $ + time + ops effort)

Then choose:
  A) Keep where it is; bring compute to data
  B) Move once to better location, keep there
  C) Replicate to multiple locations (full or subset)
  D) Federated query (no replication, queries hit source)
```

## Pattern 1 — Keep On-Prem + Cloud Compute via Direct Connect

```
On-prem DB (1 TB, growing 50GB/month, regulated)
  ↑
  Direct Connect (low-latency, low-cost egress)
  ↓
Cloud compute (analytics, ML, microservices)
```

Use when: data must stay on-prem (regulation, gravity), compute scales better in cloud.
Watch: DX bandwidth and latency for chatty queries.

## Pattern 2 — CDC to Cloud Lake

```
On-prem OLTP (operational DB, 5 TB)
   │ Debezium captures changes
   ▼
Kafka (on-prem or hybrid)
   │ stream
   ▼
Cloud data lake (S3 / Iceberg / Delta)
   │
Cloud analytics (Spark / Databricks / BigQuery / Snowflake)
```

Use when: operational data must stay on-prem, analytics consumes a copy in cloud.
Latency to lake: typically seconds to minutes.
Cost: CDC stream (continuous low bandwidth) + storage in cloud.

## Pattern 3 — Federated Query (no replication)

```
Analyst query
   ↓
Federated engine (Trino, Starburst, BigQuery Omni, Snowflake external tables, Athena Federated)
   ↓
   ├─ scans S3 (cloud)
   ├─ pushes down to on-prem Postgres (via JDBC)
   └─ pulls from another cloud's BigQuery
   ↓
Joined result
```

Pros: no data movement, no stale copies, residency satisfied
Cons: query latency = slowest source; per-query cost; harder to optimize

## Pattern 4 — Tiered Storage

```
Hot tier (cloud, expensive, fast)    last 30 days, ~100 GB
   ↓ lifecycle policy
Warm tier (cloud, cheaper)            30-180 days, ~1 TB
   ↓
Cold tier (cloud archive / on-prem)   > 180 days, ~50 TB

Movement automated; queries adapt to tier latency
```

## Pattern 5 — Cloud-First with Hybrid Fallback

```
Workload runs in cloud by default
On-prem keeps a copy for DR / compliance
Sync direction: cloud → on-prem (CDC reverse)
```

Use when: cloud is primary, on-prem is regulatory checkpoint.

## Egress Cost Reality Check

```
Egress 1 TB from AWS to on-prem via Internet:    ~$50-90
Egress 1 TB from AWS to on-prem via DX:          ~$20-30
Egress 1 TB AWS → GCP (cross-cloud Internet):    ~$80-120
Egress 1 TB AWS → GCP via Megaport (cloud exchange): ~$30-50

For 100 TB/month cross-cloud Internet egress: $8,000-12,000/month
For same via cloud exchange: $3,000-5,000/month
```

## Compliance / Residency

```
GDPR              EU citizen data must process in EU (or with explicit consent)
HIPAA             US PHI must be in BAA-covered region/services
PCI DSS           card data must be in PCI-compliant scope (region + services)
China (PIPL)      data in China stays in China (or strict transfer process)
Russia            data of Russian citizens must be primary-located in Russia
Sector rules      finance, healthcare, defense have additional constraints
```

Effect on data gravity:
- Regulated data is pinned to compliant region; compute must come to it
- Cross-border transfer often requires legal framework (SCCs, BCRs)
- Audit logs themselves are regulated data → store with same constraints

## Latency Budgets by Workload

```
OLTP queries:     sub-10ms (same DC or sub-2ms cloud region)
API to DB:        same as above
Search queries:   sub-100ms (region-local OK)
Analytics ad-hoc: seconds (cross-region OK)
Batch ETL:        minutes-hours (cross-cloud OK)
ML training:      hours-days (move data once, train where GPU is)
Backup / archive: any latency (lowest $/TB wins)
```

## When to Move Data

Move only when:
- Move cost (egress + time + ops) < ongoing cost of leaving it
- New location significantly reduces query latency for primary consumer
- Regulatory change requires re-location
- Provider switch (multi-cloud migration)

For occasional movement: AWS Snowball / Azure Data Box / GCP Transfer Appliance (physical drives shipped).
For 100+ TB one-shot transfers, the cost is often lower than network egress.

## Anti-Patterns

- "Lift and shift" of huge databases to cloud without analyzing egress (cost shock later)
- Maintaining 2 copies (on-prem + cloud) both as source of truth → divergence
- Federated query for hot OLTP path → unacceptable latency
- Replicating regulated data to another region "just in case" → compliance breach
- Treating cloud-to-cloud as free → bill surprise
- No data catalog → no idea what's where, can't optimize placement
