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
- Data sizes and source locations
- Security and compliance needs
- Team expertise with query engines
- User personas and access patterns
- BI tool compatibility requirements

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
- [ ] Resource groups and query queues configured

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Select Engine

#### Engine Comparison Matrix

| Engine | Strengths | Weaknesses | Use Case |
|---|---|---|---|
| **Trino** | Open-source, broad connector support, large community | No built-in auth, no caching (vanilla) | Open-source federated query |
| **Starburst** | Enterprise Trino, data lake caching, built-in security, RBAC | License cost, vendor dependency | Enterprise with compliance needs |
| **Dremio** | Reflections (acceleration), BI-friendly, data lineage | Smaller connector ecosystem | BI optimization, self-service |

#### Engine Selection Decision Tree
```
Primary requirement?
├── Open-source, community-driven, broadest connector support
│   └── Trino (vanilla)
├── Enterprise security, caching, managed service
│   ├── On-prem / self-managed → Starburst Enterprise
│   └── Serverless multi-cloud → Starburst Galaxy
├── BI optimization, acceleration, self-service
│   └── Dremio (Reflections, VDS, lineage)
├── Hadoop-native, older ecosystem
│   └── PrestoSQL (legacy — prefer Trino)
└── Lightweight, embedded, or building custom
    └── Trino embedded JDBC driver
```

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

Coordinator splits query into tasks, schedules on workers. Workers read from connectors in parallel, exchange data via HTTP. Discovery service handles worker registration and health checks.

#### Cluster Sizing Guidelines

| Workload | Workers | Worker Spec | Coordinator Spec | Storage |
|---|---|---|---|---|
| Light (5-20 concurrent queries) | 2-4 | 8 CPU, 32GB RAM | 4 CPU, 16GB RAM | None |
| Medium (20-100 concurrent) | 4-8 | 16 CPU, 64GB RAM | 8 CPU, 32GB RAM | None |
| Heavy (100-500 concurrent) | 8-16 | 32 CPU, 128GB RAM | 16 CPU, 64GB RAM | None |
| Enterprise (500+ concurrent) | 16-32 | 64 CPU, 256GB RAM | 32 CPU, 128GB RAM | Cache SSDs |

### Step 3: Configure Connectors

#### Connector Configuration Patterns

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

# etc/catalog/mongodb.properties (MongoDB)
connector.name=mongodb
mongodb.connection-url=mongodb://${MONGO_USER}:${MONGO_PASS}@mongo-prod:27017
mongodb.read-preference=primaryPreferred

# etc/catalog/elasticsearch.properties
connector.name=elasticsearch
elasticsearch.host=elasticsearch-prod
elasticsearch.port=9200
elasticsearch.security=basicauth
elasticsearch.auth.user=${ES_USER}
elasticsearch.auth.password=${ES_PASSWORD}
elasticsearch.query-timeout=30s
```

#### Connector Security Best Practices
Credentials stored in secrets manager (Vault, AWS Secrets Manager, Kubernetes secrets). Never hardcode passwords in property files. Use `${VARIABLE}` substitution for environment variables or encrypted secrets. TLS enabled for all JDBC connections. Read-only access for production connectors wherever possible.

### Step 4: Query Pushdown

#### Pushdown Capabilities by Source

| Source | Pushdown | Capabilities |
|---|---|---|
| **PostgreSQL** | Full SQL pushdown (filter, agg, join, sort, limit) | Predicate, aggregation, limit |
| **Hive/Iceberg** | Partial pushdown (partition pruning, filter) | Partition filter, row filter |
| **MongoDB** | Partial (filter, project) | Predicate pushdown only |
| **Kafka** | N/A (stream data) | Topic + partition filter only |
| **Elasticsearch** | Full (query DSL → filter/agg) | Predicate, aggregation |
| **MySQL** | Full SQL pushdown | Predicate, aggregation, limit |
| **SQL Server** | Full SQL pushdown | Predicate, aggregation, limit, top N |
| **BigQuery** | Full SQL pushdown | Predicate, aggregation, limit |
| **Snowflake** | Full SQL pushdown | Predicate, aggregation, limit |
| **ClickHouse** | Full SQL pushdown | Predicate, aggregation, sort |

#### Pushdown Configuration
```properties
# Global pushdown settings
pushdown_filter_enabled=true
pushdown_aggregation_enabled=true
pushdown_join_enabled=true
pushdown_project_enabled=true
pushdown_topn_enabled=true

# Per-connector pushdown overrides
connector.name=postgresql
pushdown_filter_enabled=true
pushdown_aggregation_enabled=true

connector.name=mongodb
pushdown_filter_enabled=true
pushdown_aggregation_enabled=false  # MongoDB aggregation pushdown limited
```

### Step 5: Cross-Source Join Strategy

#### Join Strategy Selection
Broadcast join: small table (< 1GB) sent to all workers for in-memory hash join. Use when: one side is small (dimension table), join key has low cardinality. Partitioned join: both sides partitioned by join key across workers. Use when: both sides are large (fact-to-fact join). Colocated join: both tables stored on same worker (same connector). Use when: tables are in same source system.

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

#### Dynamic Filtering
Dynamic filtering reduces scanned data by pushing filters derived from one side of a join to the other side. 

```properties
enable-dynamic-filtering=true
dynamic-filtering-max-size=1MB
dynamic-filtering-max-per-driver-row-count=100
dynamic-filtering-range-row-limit=10000
```

Example: query joins small customer table with large orders table. Dynamic filter pushes customer IDs from the customer scan into the orders scan, reducing the data read from orders.

### Step 6: Performance Tuning

#### Memory Configuration

```properties
# config.properties
# Per-node memory limits
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

# Query management
query.initial-hash-partitions=100
query.max-stage-count=100
query.min-schedule-split-batch-size=500
```

#### Query Queues and Resource Groups

```properties
# resource-groups.properties
resource-groups.configuration-manager=file
resource-groups.config-file=etc/resource-groups.json
```

```json
{
  "rootGroups": [{
    "name": "global",
    "maxQueued": 1000,
    "maxRunning": 100,
    "subGroups": [{
      "name": "analyst",
      "maxQueued": 100,
      "maxRunning": 50,
      "softMemoryLimit": "40%",
      "hardConcurrencyLimit": 50,
      "maxQueuedQueries": 100,
      "subGroups": [{
        "name": "ad-hoc",
        "maxQueued": 50,
        "maxRunning": 10,
        "softMemoryLimit": "20%",
        "hardConcurrencyLimit": 10
      }, {
        "name": "dashboard",
        "maxQueued": 20,
        "maxRunning": 20,
        "softMemoryLimit": "50%",
        "hardConcurrencyLimit": 20
      }]
    }, {
      "name": "etl",
      "maxQueued": 50,
      "maxRunning": 25,
      "softMemoryLimit": "60%",
      "hardConcurrencyLimit": 25
    }]
  }]
}
```

### Step 7: Security Configuration

```properties
# Security config
http-server.authentication.type=oauth2
http-server.https.enabled=true
http-server.https.port=8443
http-server.https.keystore.path=/etc/trino/keystore.jks

# OAuth2 configuration
http-server.authentication.oauth2.issuer=https://auth.company.com
http-server.authentication.oauth2.client-id=trino-client
http-server.authentication.oauth2.client-secret=${OAUTH_SECRET}

# System access control
access-control.manager=file
access-control.config-file=etc/rules.json
```

```json
{
  "rules": [
    {
      "user": "analyst*",
      "privileges": ["SELECT"],
      "schema": "analytics",
      "table": "*"
    },
    {
      "user": "data_engineer*",
      "privileges": ["SELECT", "INSERT", "DELETE"],
      "schema": "staging",
      "table": "*"
    },
    {
      "user": "admin",
      "privileges": ["SELECT", "INSERT", "DELETE", "GRANT"],
      "schema": "*",
      "table": "*"
    }
  ]
}
```

### Step 8: Monitoring

#### Query Performance Metrics

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

#### Key Performance Indicators

| Metric | Good | Warning | Critical |
|---|---|---|---|
| Query p50 latency | < 1s | 1-5s | > 5s |
| Query p99 latency | < 10s | 10-30s | > 30s |
| Queries per second | > 10/node | 5-10/node | < 5/node |
| Cache hit ratio | > 80% | 50-80% | < 50% |
| Active connections | < 50% capacity | 50-80% | > 80% |
| Failed query rate | < 0.5% | 0.5-2% | > 2% |
| Worker CPU | < 70% | 70-90% | > 90% |
| Data scanned per query | < 1GB | 1-10GB | > 10GB |

### Step 9: Deep Dremio and Starburst

#### Dremio Reflections
Dremio accelerates federated queries via Reflections — materialized pre-computed views in Dremio's internal Parquet format. Raw reflections aggregate/sort for quick scans; aggregation reflections pre-compute GROUP BY. Data lineage tracks column-level provenance.

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

#### Starburst Enterprise Features
Data lake caching: auto-caches hot data from S3/ADLS/GCS to local SSD. Built-in RBAC: table/row/column-level via Ranger. Warp Speed native engine for faster queries. Security: Kerberos, LDAP, OAuth, TLS. Starburst Galaxy offers serverless multi-cloud managed service. Use Starburst for regulated enterprises needing enterprise security or multi-cloud analytics with caching.

#### Alluxio — Data Virtualization Layer
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

### Query Optimization Patterns

#### Aggregate Pushdown
```sql
-- Poor: bring all rows to Trino, aggregate in engine
SELECT customer_id, SUM(amount)
FROM postgres.analytics.orders;  -- Scans all rows

-- Good: push aggregation to PostgreSQL (if enabled)
-- Trino translates to: SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id
```

#### Partition Pruning
```sql
-- Poor: full table scan
SELECT * FROM hive.analytics.orders WHERE year(created_at) = 2026;

-- Good: partition filter pushed down
SELECT * FROM hive.analytics.orders
WHERE created_at >= DATE '2026-01-01' AND created_at < DATE '2027-01-01';
```

#### Predicate Pushdown
```sql
-- Poor: filter after join
SELECT * FROM (
  SELECT o.*, c.name
  FROM postgres.analytics.orders o
  JOIN postgres.analytics.customers c ON o.customer_id = c.customer_id
) WHERE o.total_amount > 1000;

-- Good: filter before join (predicate pushdown)
SELECT o.*, c.name
FROM postgres.analytics.orders o
JOIN postgres.analytics.customers c ON o.customer_id = c.customer_id
WHERE o.total_amount > 1000;
```

## Rules
- Pushdown filters enabled on all connectors — process data at source
- Cross-source joins use broadcast for small tables, partitioned for large
- Dynamic filtering enabled to reduce scanned data in multi-table queries
- Connector credentials stored in secrets manager, never in config files
- Query history logged for audit and performance analysis
- Resource groups enforce query concurrency limits per team
- No full table scans on OLTP sources without explicit query rules
- Each connector configured with timeouts and retry limits
- Monitor query latency by source to identify slow connectors
- Use Presto/Trino query plan visualizer to identify bottlenecks
- Cache hot data with Starburst/Warp Speed or Dremio Reflections
- Test schema changes on connectors before production rollout
- Budget 20% overhead on worker memory for query peak usage

## References
  - references/federation-deployment.md — Federation Deployment
  - references/federation-optimization.md — Federation Query Optimization Reference
  - references/trino-architecture.md — Trino Architecture
  - references/virtualization-connectors.md — Virtualization Connectors
  - references/virtualization-cost-analysis.md — Virtualization Cost Analysis
  - references/virtualization-platforms.md — Data Virtualization Platforms
  - references/virtualization-query-optimization.md — Virtualization Query Optimization
  - references/virtualization-security.md — Virtualization Security Reference
## Handoff
`data-data-platform` for Trino cluster deployment on K8s. `data-data-catalog` for registering engine as data source. `data-data-observability` for query performance monitoring. `data-data-security` for RBAC and TLS setup.
