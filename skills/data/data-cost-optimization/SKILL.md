---
name: data-cost-optimization
description: >
  Use this skill when asked about data cost optimization, Snowflake cost management, BigQuery slot management, S3 storage tiering, warehouse cost optimization, FinOps for data, cloud data cost reduction, or query cost analysis. This skill enforces: Snowflake credit usage analysis with query optimization, BigQuery slot commitment planning and reservation management, S3 lifecycle policies for storage tiering, warehouse auto-scaling and clustering configuration, and FinOps practices for data platform cost allocation. Do NOT use for: general cloud FinOps (use dedicated FinOps skill), data pipeline design (use data-etl-pipeline), or infrastructure cost estimation (use infra-costing skill).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [data, cost, finops, optimization, phase-11]
---

# Data Cost Optimization

## Purpose
Analyze, optimize, and manage cloud data platform costs across Snowflake, BigQuery, and S3, implementing FinOps practices for cost allocation, budgeting, and continuous optimization.

## Agent Protocol

### Trigger
Exact user phrases: "cost optimization", "cost reduction", "Snowflake cost", "BigQuery cost", "S3 cost", "warehouse cost", "FinOps data", "query cost analysis", "storage tiering", "slot management", "credit usage", "data platform cost", "cloud data cost".

### Input Context
Before activating, verify:
- Cloud data platform (Snowflake, BigQuery, Redshift, Databricks)
- Storage systems (S3, GCS, Azure Blob)
- Current monthly spend and growth trend
- Query patterns (ad-hoc, scheduled, BI)
- Data retention requirements (compliance, archival)
- Team structure for cost allocation

### Output Artifact
Cost optimization plan with warehouse configuration, query tuning, storage lifecycle policies, and FinOps dashboards.

### Response Format
```sql
-- Snowflake cost analysis queries
-- Warehouse configuration
```
```yaml
# BigQuery reservation config
# S3 lifecycle policies
```
```python
# Cost allocation script
# Budget monitoring
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Current spend analyzed by warehouse, query, user, and dataset
- [ ] Warehouse auto-scaling and multi-cluster configuration optimized
- [ ] Query performance tuned to reduce compute consumption
- [ ] Storage lifecycle policies implemented for tiered archival
- [ ] Cost allocation tags applied and budgets configured
- [ ] Monitoring dashboards with cost-per-team breakdown
- [ ] Optimization recommendations documented with expected savings

### Max Response Length
300 lines of code and configuration.

## Snowflake Cost Management

### Warehouse Configuration
```sql
-- Optimal warehouse config for production workloads
CREATE WAREHOUSE prod_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  AUTO_SUSPEND = 60           -- suspend after 1 minute idle
  AUTO_RESUME = TRUE
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 3
  SCALING_POLICY = 'ECONOMY'  -- prioritize cost over performance
  STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 30
  STATEMENT_TIMEOUT_IN_SECONDS = 3600;

-- For ad-hoc/exploratory workloads
CREATE WAREHOUSE analytics_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 300
  AUTO_RESUME = TRUE
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 1;
```

### Credit Usage Analysis
```sql
-- Credit consumption by warehouse (last 30 days)
SELECT
    warehouse_name,
    SUM(credits_used) as total_credits,
    SUM(credits_used_compute) as compute_credits,
    SUM(credits_used_cloud_services) as cloud_credits,
    ROUND(SUM(credits_used) * 2.0, 2) as estimated_cost_usd
FROM snowflake.account_usage.warehouse_metering_history
WHERE start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY total_credits DESC;

-- Most expensive queries
SELECT
    query_id,
    query_text,
    warehouse_name,
    warehouse_size,
    credits_used_cloud_services,
    execution_time / 1000 as execution_seconds,
    partitions_scanned,
    bytes_scanned
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY credits_used_cloud_services DESC
LIMIT 20;
```

### Query Optimization for Cost
```sql
-- Before: Full scan (expensive)
SELECT * FROM orders WHERE YEAR(order_date) = 2026;
-- After: Partition prune
SELECT * FROM orders WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01';

-- Before: Wide scan
SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;
-- After: Clustering on high-cardinality join key
ALTER TABLE orders CLUSTER BY (customer_id);

-- Materialized views for expensive aggregations
CREATE MATERIALIZED VIEW mv_daily_orders
  AS SELECT order_date, COUNT(*), SUM(amount)
     FROM orders GROUP BY order_date;
```

## BigQuery Slot Management

### Reservation Configuration
```yaml
# reservation.yaml
reservations:
  - name: prod-reservation
    project: my-data-prod
    location: US
    slot_count: 100
    plan: FLEX  # FLEX, MONTHLY, ANNUAL
    autoscale:
      min_slots: 50
      max_slots: 200

  - name: analytics-reservation
    project: my-data-analytics
    location: US
    slot_count: 50
    plan: MONTHLY

assignments:
  - reservation: prod-reservation
    job_type: QUERY
    project: my-data-prod
  - reservation: analytics-reservation
    job_type: QUERY
    project: my-data-analytics
```

### Slot Usage Monitoring
```sql
-- Slot utilization by project
SELECT
    project_id,
    job_type,
    COUNT(*) as job_count,
    SUM(total_slot_ms) / 3600000 as total_slot_hours,
    ROUND(AVG(total_slot_ms) / 1000, 2) as avg_slot_seconds
FROM `region-US`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY project_id, job_type
ORDER BY total_slot_hours DESC;

-- Unreserved slot usage (gap between demand and committed)
SELECT
    TIMESTAMP_TRUNC(period_start, HOUR) as hour,
    SUM(slots_used_by_reservation) as reserved_slots,
    SUM(slots_used_other) as on_demand_slots,
    SUM(slots_requested) as total_demand
FROM `my-project`.region-US.INFORMATION_SCHEMA.RESERVATIONS_TIMELINE
WHERE period_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY hour
HAVING on_demand_slots > 0;
```

### Cost-Reducing Query Patterns
```sql
-- Use approximate functions for large count distincts
SELECT APPROX_COUNT_DISTINCT(user_id) as unique_users FROM events;

-- Cluster on filter/join columns
CREATE TABLE orders
  CLUSTER BY customer_id, order_date
  AS SELECT * FROM raw_orders;

-- Partition by date for time-range pruning
CREATE TABLE events
  PARTITION BY DATE(event_timestamp)
  CLUSTER BY event_type
  OPTIONS(require_partition_filter=true);

-- Use materialized views for common aggregations
CREATE MATERIALIZED VIEW mv_agg
  AS SELECT user_id, COUNT(*) as cnt FROM events GROUP BY user_id;
```

## S3 Storage Tiering

### Lifecycle Policy
```yaml
# s3-lifecycle.yaml
LifecycleConfiguration:
  Rules:
    - Id: data-tiering
      Status: Enabled
      Filter:
        Prefix: data/landing/
      Transitions:
        - Days: 30
          StorageClass: STANDARD_IA
        - Days: 90
          StorageClass: GLACIER_INSTANT_RETRIEVAL
        - Days: 365
          StorageClass: GLACIER_DEEP_ARCHIVE
      Expiration:
        Days: 2555  # 7 year max retention

    - Id: logs-tiering
      Status: Enabled
      Filter:
        Prefix: logs/
      Transitions:
        - Days: 7
          StorageClass: STANDARD_IA
        - Days: 30
          StorageClass: GLACIER
```

### Storage Cost Analysis
```python
import boto3

s3 = boto3.client('s3')
storage_buckets = ['data-lake-prod', 'data-lake-analytics']

for bucket in storage_buckets:
    metrics = s3.get_bucket_statistics(Bucket=bucket)
    total_bytes = metrics['StorageBytes']
    total_cost = total_bytes * pricing_tiers['STANDARD'] / (1024**4)

    print(f"Bucket: {bucket} | Size: {total_bytes/1e9:.2f} GB | Est Cost: ${total_cost:.2f}/month")
```

### Intelligent Tiering Strategy
| Data Type | Hot Tier | Warm Tier | Cold Tier | Archive |
|---|---|---|---|---|
| Landing data | 0-7 days (STANDARD) | 7-30d (S3-IA) | 30-90d (Glacier IR) | 90d+ (Deep Archive) |
| Transformed data | 0-30d (STANDARD) | 30-90d (S3-IA) | 90-365d (Glacier) | 1y+ (Deep Archive) |
| Logs | 0-1d (STANDARD) | 1-7d (S3-IA) | 7-30d (Glacier) | 30d+ (Deep Archive) |
| ML training data | 0-90d (STANDARD) | 90-180d (STANDARD IA) | 180-365d (Glacier) | 1y+ (Deep Archive) |

## FinOps for Data

### Cost Allocation
```sql
-- Snowflake: Tag warehouses with cost centers
ALTER WAREHOUSE prod_wh SET
  TAG cost_center = 'data-platform',
  TAG team = 'analytics',
  TAG environment = 'production';

-- BigQuery: Label datasets
ALTER DATASET analytics_data
SET OPTIONS (
  labels = [
    ('cost_center', 'analytics'),
    ('team', 'bi'),
    ('environment', 'prod')
  ]
);
```

### Budget Monitoring
```python
# budget_config.py
BUDGET_THRESHOLDS = {
    'snowflake': {
        'prod': {'monthly_budget': 5000, 'alert_at': [50, 80, 90, 100]},
        'analytics': {'monthly_budget': 2000, 'alert_at': [80, 100]},
        'dev': {'monthly_budget': 500, 'alert_at': [90, 100]},
    },
    'bigquery': {
        'prod': {'monthly_budget': 3000, 'alert_at': [50, 80, 90, 100]},
        'analytics': {'monthly_budget': 1500, 'alert_at': [80, 100]},
    },
    's3': {
        'data-lake': {'monthly_budget': 1000, 'alert_at': [80, 90, 100]},
    }
}
```

### BigQuery Slot Management

#### Slot Commitment Strategy

```yaml
bigquery_slots:
  commitment_types:
    - type: "annual"
      discount: "~40% vs on-demand"
      commitment: "1 year minimum"
      best_for: "Stable baseline workload (60-70% of peak)"
    - type: "monthly"
      discount: "~20% vs on-demand"
      commitment: "1 month minimum"
      best_for: "Seasonal workloads, growth phase"
    - type: "flex"  # On-demand
      discount: "0%"
      commitment: "None"
      best_for: "Variable spikes, dev/test environments"
  
  sizing_formula:
    baseline: "Average daily slot usage over trailing 30 days"
    buffer: "1.2x baseline (for unexpected spikes)"
    growth: "1.3x baseline (for 30% YoY growth)"
    recommended_commitment: "baseline * buffer * growth"
  
  reservation_policies:
    - "Separate reservations for prod vs non-prod workloads"
    - "Idle slots from prod can be borrowed by non-prod (flex slots)"
    - "BI dashboards: dedicated reservation for consistent performance"
    - "Ad-hoc queries: lower-priority reservation (idle slots only)"
    - "ELT pipelines: reservation sized for peak load, auto-scale"
```

```sql
-- BigQuery slot usage query
SELECT
  job_type,
  ROUND(SUM(total_slot_ms) / (1000 * 60 * 60), 2) AS slot_hours,
  ROUND(SUM(total_bytes_billed) / POW(1024, 4), 2) AS ti_billed,
  COUNT(*) AS job_count,
  ROUND(AVG(IFNULL(SAFE.DIVIDE(total_slot_ms, TIMESTAMP_DIFF(end_time, start_time, MILLISECOND)), 0)), 2) AS avg_slots
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE DATE(creation_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
GROUP BY job_type
ORDER BY slot_hours DESC;
```

### Cost Allocation Framework

```yaml
allocation_method:
  type: "Activity-based costing"
  
  dimensions:
    - team:
        description: "Engineering team owning the pipeline"
        tags: { cost_center: "data-platform", team: "analytics-eng" }
    - domain:
        description: "Business domain (finance, marketing, product)"
        tags: { domain: "marketing" }
    - environment:
        description: "Deployment stage"
        tags: { env: "production" }
    - dataset:
        description: "Target dataset / warehouse schema"
        tags: { dataset: "analytics.fct_orders" }
    
  allocation_formulas:
    compute:
      # Snowflake: credits by warehouse ÷ queries per dataset
      allocation: "SUM(credits * (query_duration / total_warehouse_duration))"
    
    storage:
      # S3: bytes by bucket ÷ prefix
      allocation: "SUM(bytes * (prefix_bytes / total_bucket_bytes))"
    
    compute_storage:
      # Overlap: combined cost
      allocation: "compute_allocation * 0.7 + storage_allocation * 0.3"
```

### Query Optimization Patterns

```sql
-- Before: expensive full scan
SELECT customer_id, COUNT(*) as order_count
FROM orders
WHERE status = 'completed'
GROUP BY customer_id;

-- After: use materialized view (Snowflake / BigQuery)
CREATE MATERIALIZED VIEW daily_orders_mv AS
SELECT order_date, customer_id, status, COUNT(*) as order_count
FROM orders
GROUP BY order_date, customer_id, status;

-- Query against MV (scans only relevant partitions)
SELECT customer_id, SUM(order_count) as total_orders
FROM daily_orders_mv
WHERE order_date >= '2026-01-01'
  AND status = 'completed'
GROUP BY customer_id;

-- Before: self-join anti-pattern
SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2026-01-01';

-- After: clustering on join key
-- ALTER TABLE orders CLUSTER BY (customer_id);
-- ALTER TABLE customers CLUSTER BY (customer_id);
-- Cluster both tables on the join key for Co-located joins
```

### Reserved Capacity Planning

```yaml
capacity_planning:
  snowflake:
    credits_estimate: "AVG(credits_per_hour) * hours_per_day * 30"
    example:
      warehouses: [ prod_wh(XS), reporting_wh(S), etl_wh(M) ]
      avg_hourly_credits: 4.5
      monthly: 4.5 * 24 * 30 = 3,240 credits
      annual: 3,240 * 12 * 0.85(pre-pay discount) = $33,048
  
  bigquery:
    slots_estimate: "AVG(slots_per_query) * concurrent_queries * growth_factor"
    example:
      avg_slots_per_query: 200
      concurrent_queries: 5
      growth_factor: 1.3
      recommended_slots: 200 * 5 * 1.3 = 1,300 slots
      monthly: 1,300 * $0.04 * 24 * 30 = $37,440 (annual commitment)
  
  databricks:
    dbu_estimate: "AVG(DBU_per_hour) * hours_per_day * 30"
    example:
      clusters: [ jobs(medium), interactive(large) ]
      avg_hourly_dbu: 15
      monthly: 15 * 24 * 30 = 10,800 DBU
      annual: 10,800 * 12 * $0.55/photon_dbu = $71,280
```

### FinOps Maturity Model

```yaml
finops_maturity:
  level_1_crawl:
    practices: ["Manual cost tracking", "Monthly review emails"]
    tools: ["Billing console", "Spreadsheet"]
    coverage: "50-70% of costs tracked"
  
  level_2_walk:
    practices: [
      "Tag-based cost allocation",
      "Weekly cost dashboards",
      "Budget alerts per team"
    ]
    tools: [
      "Cloud cost management (AWS Cost Explorer, GCP Billing)",
      "Snowflake ACCOUNT_USAGE views",
      "Automated budget alerts"
    ]
    coverage: "80-95% of costs tracked"
  
  level_3_run:
    practices: [
      "Per-query cost attribution",
      "Unit economics (cost per query, cost per report)",
      "Automated anomaly detection",
      "Chargeback/showback to teams"
    ]
    tools: [
      "Custom cost attribution pipeline",
      "Query profiling (Snowflake QUERY_HISTORY, BigQuery INFORMATION_SCHEMA)",
      "Automated anomaly detection",
      "FinOps dashboards (Tableau, Power BI)"
    ]
    coverage: "95-100% of costs tracked"
  
  level_4_optimize:
    practices: [
      "Predictive cost modeling",
      "Automatic resource right-sizing",
      "Cost-aware query optimization",
      "Cross-cloud cost optimization"
    ]
    tools: [
      "ML-based cost forecasting",
      "Auto-scaling policies",
      "Query rewriting for cost",
      "Multi-cloud FinOps platform"
    ]
    coverage: "Near-real-time cost tracking"
```

### Snowflake Cost Analysis Queries

```sql
-- Top 10 most expensive queries (last 7 days)
SELECT
  query_id,
  query_text,
  warehouse_name,
  warehouse_size,
  credits_used as credits,
  ROUND(credits_used * 4, 2) as estimated_cost_usd,  -- ~$4/credit
  execution_time / 1000 as duration_seconds,
  partitions_scanned,
  partitions_total,
  ROUND(partitions_scanned / NULLIF(partitions_total, 0) * 100, 1) as scan_efficiency_pct
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY(
  DATEADD('days', -7, CURRENT_TIMESTAMP()),
  CURRENT_TIMESTAMP()
))
ORDER BY credits_used DESC
LIMIT 10;

-- Cost by warehouse (last 30 days)
SELECT
  warehouse_name,
  COUNT(*) as query_count,
  SUM(credits_used) as total_credits,
  SUM(credits_used) * 4 as total_cost,
  AVG(credits_used) as avg_credits_per_query,
  SUM(execution_time) / 60000 as total_minutes
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY(
  DATEADD('days', -30, CURRENT_TIMESTAMP()),
  CURRENT_TIMESTAMP()
))
GROUP BY warehouse_name
ORDER BY total_cost DESC;
```

### Decision Trees

#### Storage Tier Selection
```
Data access frequency?
├── Accessed daily → Hot tier (SSD, standard storage class)
├── Accessed weekly → Warm tier (standard_ia, nearline)
├── Accessed monthly → Cold tier (glacier, coldline)
├── Accessed quarterly/yearly → Archive tier (deep archive)
├── Unknown → Intelligent tiering (auto-moves between hot/warm)
└── Compliance hold only → Archive with Object Lock (WORM)
```

#### Compute Optimization Strategy
```
Query performance issue?
├── Long-running full scan → Add partitioning on filter column
├── Join-heavy query → Cluster both tables on join key
├── Repeated expensive aggregation → Materialized view
├── Small query but slow → Check warehouse auto-scaling
├── Many concurrent queries → Increase max_cluster_count
├── Ad-hoc query costly → Use warehouse with lower priority
└── Data not updated frequently → Use result caching (Snowflake)
```

## Rules
- Right-size warehouses: use XSMALL for dev, MEDIUM max for prod
- Auto-suspend idle warehouses within 60 seconds
- Use economy scaling policy for production workloads
- Cluster tables on high-cardinality filter/join columns
- Partition large tables on date columns
- Prefer materialized views over repeated expensive aggregations
- Implement S3 lifecycle transitions at 30/90/365 day thresholds
- Tag all resources with cost_center, team, and environment
- Review top 10 most expensive queries weekly
- Set budget alerts at 50%, 80%, 90%, and 100% of monthly budget
- Use annual commitments for baseline workloads, flex for spikes
- Allocate costs by team/domain for accountability
- Track slot hours and credits per query for unit economics
- Progress through FinOps maturity levels systematically
- Profile queries for scan efficiency — high scan ratio = waste

## References
  - references/data-cost-budgeting.md — Data Cost Budgeting
  - references/data-cost-optimization-framework.md — Data Cost Optimization Framework
  - references/data-finops.md — Data FinOps Reference
  - references/query-cost-optimization.md — Query Cost Optimization Reference
  - references/storage-tiering-strategies.md — Storage Tiering Strategies
  - references/warehouse-cost-optimization.md — Warehouse Cost Optimization
## Handoff
`data-etl-pipeline` for pipeline efficiency and incremental loading
`data-data-warehouse` for schema design that minimizes compute
