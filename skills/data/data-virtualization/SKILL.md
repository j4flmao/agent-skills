---
name: data-data-virtualization
description: >
  Use this skill when asked about data virtualization, Trino, Presto, Starburst, Dremio, query federation, federated query, cross-source join, pushdown, connector, or data lake query engine. This skill enforces: Trino/Presto architecture (coordinator/worker), connector patterns for query federation, query pushdown optimization, cross-source join strategies, Starburst enterprise features, Dremio reflections for acceleration, and performance tuning. Do NOT use for: ETL pipeline development, data warehouse schema design, or OLTP database query optimization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, virtualization, query, phase-11]
---

# Data Data Virtualization

## Purpose
Design and deploy data virtualization with Trino/Presto for federated queries across data sources, with connector configuration, pushdown optimization, performance tuning, and enterprise features.

## Agent Protocol

### Trigger
Exact user phrases: "data virtualization", "Trino", "Presto", "Starburst", "Dremio", "query federation", "federated query", "cross-source join", "pushdown", "connector", "data lake query engine", "federated analytics".

### Input Context
- Data sources to federate (databases, lakes, streaming)
- Query patterns and performance requirements
- Existing data infrastructure
- Dat a sizes and source locations
- Security and compliance needs
- Team expertise with query engines

### Output Artifact
Data virtualization architecture with engine selection (Trino/Starburst/Dremio), connector configuration for each data source, pushdown optimization rules, cross-source join strategy, and performance tuning guide.

### Response Format
```yaml
# Engine selection matrix
# Connector configurations
# Pushdown rules per source
# Cross-source join strategy
# Performance tuning parameters
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Query engine selected with rationale
- [ ] Connectors configured for all data sources
- [ ] Pushdown rules defined per connector and query type
- [ ] Cross-source join strategy documented with cost model
- [ ] Performance tuning parameters set (memory, concurrency, threads)
- [ ] Security configured (TLS, auth, RBAC)
- [ ] Monitoring dashboard for query performance

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Select Engine

| Engine | Strengths | Weaknesses | Use Case |
|---|---|---|---|
| **Trino** | Open-source, broad connector support, large community | No built-in auth, no caching (vanilla) | Open-source federated query |
| **Starburst** | Enterprise Trino, data lake caching, built-in security, RBAC | License cost, vendor dependency | Enterprise with compliance needs |
| **Dremio** | Reflections (acceleration), BI-friendly, data lineage | Smaller connector ecosystem | BI optimization, self-service |

Default: Trino for open-source teams with existing auth infrastructure. Starburst for regulated enterprises needing caching and RBAC. Dremio for BI-heavy workloads with repetitive queries.

### Step 2: Trino Cluster Architecture

```
┌──────────────────────────────────────┐
│  Coordinator                          │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ Query Planner│  │ Query        │  │
│  │ & Optimizer  │  │ Scheduler    │  │
│  └──────────────┘  └──────────────┘  │
│  Resource Manager  │  Metadata API   │
└──────────┬───────────────────────────┘
           │
    ┌──────┴──────┐
    │  Discovery   │
    │  Service     │
    └──────┬──────┘
           │
┌──────────┴───────────────────────────┐
│  Worker Pool                          │
│  ┌──────────┐ ┌──────────┐ ┌───────┐  │
│  │ Worker 1 │ │ Worker 2 │ │ ...  │  │
│  │ (data    │ │ (data    │ │       │  │
│  │  source) │ │  source) │ │       │  │
│  └──────────┘ └──────────┘ └───────┘  │
└──────────────────────────────────────┘
```

Coordinator splits query into tasks, schedules on workers. Workers read from connectors in parallel, exchange data via HTTP.

### Step 3: Configure Connectors

```properties
# etc/catalog/hive.properties (Hive/Iceberg)
connector.name=hive
hive.metastore.uri=thrift://metastore:9083
hive.config.resources=/etc/hadoop/core-site.xml
hive.allow-drop-table=false
hive.parallel-partitioned-bucketed-writes=true

# etc/catalog/postgres.properties (PostgreSQL)
connector.name=postgresql
connection-url=jdbc:postgresql://postgres-prod:5432/analytics
connection-user=${POSTGRES_USER}
connection-password=${POSTGRES_PASSWORD}

# etc/catalog/kafka.properties (Kafka streaming)
connector.name=kafka
kafka.nodes=kafka-broker:9092,kafka-broker:9093
kafka.table-names=orders,events
kafka.hide-internal-columns=false
```

### Step 4: Query Pushdown

| Source | Pushdown | Capabilities |
|---|---|---|
| **PostgreSQL** | Full SQL pushdown (filter, agg, join, sort, limit) | Predicate, aggregation, limit |
| **Hive/Iceberg** | Partial pushdown (partition pruning, filter) | Partition filter, row filter |
| **MongoDB** | Partial (filter, project) | Predicate pushdown only |
| **Kafka** | N/A (stream data) | Topic + partition filter only |
| **Elasticsearch** | Full (query DSL → filter/agg) | Predicate, aggregation |

Enable pushdown: `pushdown_filter_enabled=true`, `pushdown_aggregation_enabled=true`, `pushdown_join_enabled=true` in connector config.

### Step 5: Cross-Source Join Strategy

```sql
-- Cross-source join: orders (Postgres) + customers (Hive) + payments (MongoDB)
SELECT
    o.order_id,
    o.total_amount,
    c.name AS customer_name,
    p.payment_status
FROM postgres.analytics.orders o
JOIN hive.dimensions.customers c ON o.customer_id = c.customer_id
LEFT JOIN mongodb.payments.transactions p ON o.order_id = p.order_id
WHERE o.created_at >= DATE '2026-05-01';
```

Trino coordinates the join: reads from each source in parallel, performs distributed hash join on coordinator. Smallest table broadcast, largest table partitioned.

### Step 6: Performance Tuning

```properties
# config.properties
query.max-memory-per-node=4GB
query.max-memory=20GB
query.max-total-memory-per-node=8GB
query.max-total-memory=40GB

# Worker parallelism
task.max-worker-threads=16
task.concurrency=8

# Join optimization
join-distribution-type=PARTITIONED
enable-dynamic-filtering=true
dynamic-filtering-max-size=1MB

# Exchange (shuffle)
exchange.max-buffer-size=64MB
exchange.max-response-size=16MB
sink.max-buffer-size=64MB
```

### Step 7: Monitoring

```properties
# event-listener.properties
event-listener.type=jmx
# + Prometheus + Grafana tracking:
# - Queries per second
# - Query latency (p50, p95, p99)
# - Worker CPU/memory/network
# - Data read per source
# - Failed queries / errors
# - Active connections
```

### Step 8: Deep Dremio and Starburst
Dremio accelerates federated queries via Reflections — materialized pre-computed views in Dremio's internal Parquet format. Raw reflections aggregate/sort for quick scans; aggregation reflections pre-compute GROUP BY. Data lineage tracks column-level provenance. Key features: VDS (Virtual Datasets) for in-engine transforms without copying data, PDS (Physical Datasets) for source tables, namespace mounting for multi-source federation. Dremio's BI optimizer rewrites dashboard queries (Tableau, Power BI) to use Reflections transparently.

```sql
-- Dremio: create a Reflection on frequently queried table
ALTER TABLE "s3"."lake"."orders" CREATE RAW REFLECTION orders_raw REFLECTION
USING DISPLAY FIELDS (order_id, customer_id, total_amount)
PARTITION BY (order_date) DISTRIBUTE BY (customer_id);

-- Dremio VDS: virtual dataset without data copy
CREATE VDS "analytics"."customer_orders" AS
SELECT c.name, c.segment, o.total_amount, o.order_date
FROM "postgres"."public"."customers" c
JOIN "s3"."lake"."orders" o ON c.customer_id = o.customer_id;
```

Starburst is the enterprise Trino distribution with: data lake caching (auto-caches hot data from S3/ADLS/GCS to local SSD), built-in RBAC (table/row/column-level via Ranger), and Warp Speed native engine. Security: Kerberos, LDAP, OAuth, TLS. Starburst Galaxy offers serverless multi-cloud managed service. Use Starburst for regulated enterprises needing enterprise security or multi-cloud analytics with caching.

### Step 9: Alluxio — Data Virtualization Layer
Alluxio is a virtual distributed file system that unifies data access across disparate storage. Acts as caching and metadata layer between compute engines and storage backends. Caches hot data on local SSDs/memory for 10-100x faster data access on repeated queries. Supports any storage (S3, ADLS, GCS, HDFS, NFS) and any compute (Spark, Trino, MapReduce, Flink). Namespace service provides a single mounted namespace across storage systems.

```yaml
# alluxio-site.properties
alluxio.master.hostname=alluxio-master
alluxio.underfs.address=s3://data-lake/
alluxio.user.file.cachepartiallyread.block=true
alluxio.user.block.size.bytes.default=64MB
alluxio.worker.memory.size=16GB
alluxio.worker.tieredstore.level0.alias=SSD
alluxio.worker.tieredstore.level0.dirs.path=/mnt/ssd/cache
alluxio.worker.tieredstore.level0.dirs.quota=500GB
```

Use Alluxio as a transparent caching layer between compute (Trino/Spark) and storage (S3/ADLS) to accelerate federated queries and reduce storage egress costs.

## Rules
- Pushdown filters enabled on all connectors — process data at source
- Cross-source joins use broadcast for small tables, partitioned for large
- Dynamic filtering enabled to reduce scanned data in multi-table queries
- Connector credentials stored in secrets manager, never in config files
- Query history logged for audit and performance analysis
- Resource groups enforce query concurrency limits per team
- No full table scans on OLTP sources without explicit query rules
- Each connector configured with timeouts and retry limits

## References
- `references/trino-architecture.md` — Coordinator, worker, connector, query planning, pushdown, federated joins, tuning
- `references/virtualization-platforms.md` — Dremio reflections/VDS, Starburst caching/RBAC, Alluxio tiered caching, namespace mounting
- `references/federation-optimization.md` — Pushdown, stats-based optimization, caching, join strategies
- `references/virtualization-security.md` — Data masking, RLS across sources, credential management, audit

## Handoff
`data-data-platform` for Trino cluster deployment on K8s. `data-data-catalog` for registering engine as data source. `data-data-observability` for query performance monitoring. `data-data-security` for RBAC and TLS setup.
