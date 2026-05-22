# Trino Architecture

## Component Overview

```
┌──────────────────────────────────────────────────┐
│  Coordinator                                      │
│                                                    │
│  SQL Statement → Parser → Analyzer → Planner ──┐  │
│                                              │  │  │
│  Optimizer ← Rule-based ← Cost-based ←───────┘  │  │
│      │                                            │  │
│      ▼                                            │  │
│  Distributed Execution Planner                     │  │
│      │                                            │  │
│  Stage → Stage → Stage (tree of stages)          │  │
└──────┬───────────────────────────────────────────┘  │
       │                                               │
┌──────┴───────────────────────────────────────────┐  │
│  Workers                                           │  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐              │  │
│  │ Stage 1 │ │ Stage 2 │ │ Stage 3 │              │  │
│  │ Task    │ │ Task    │ │ Task    │              │  │
│  └────┬────┘ └────┬────┘ └────┬────┘              │  │
│       │           │           │                     │
│  ┌────┴───────────┴───────────┴────┐              │  │
│  │  Exchange (shuffle data)        │              │  │
│  └─────────────────────────────────┘              │  │
└──────────────────────────────────────────────────┘
```

## Connector Configuration

### Iceberg (Data Lake)

```properties
connector.name=iceberg
hive.metastore.uri=thrift://metastore:9083
iceberg.catalog.type=hive
iceberg.file-format=PARQUET
iceberg.compression-codec=ZSTD
iceberg.sort-order=order_id
iceberg.statistics-files-write-enabled=true
pushdown_filter_enabled=true
pushdown_aggregation_enabled=true
```

### PostgreSQL (OLTP)

```properties
connector.name=postgresql
connection-url=jdbc:postgresql://pg-prod:5432/analytics?ssl=true&sslmode=require
connection-user=${POSTGRES_USER}
connection-password=${POSTGRES_PASSWORD}
case-insensitive-name-matching=true
pushdown_filter_enabled=true
pushdown_aggregation_enabled=false
allow-drop-table=false
```

### BigQuery (Cloud DW)

```properties
connector.name=bigquery
bigquery.project-id=my-project
bigquery.location=US
bigquery.views-enabled=true
bigquery.skip-cache=false
bigquery.queries-timeout=30m
pushdown_filter_enabled=true
pushdown_aggregation_enabled=true
pushdown_join_enabled=true
```

## Query Planning & Execution

```sql
-- Trino EXPLAIN output
EXPLAIN (TYPE DISTRIBUTED)
SELECT o.order_id, c.name
FROM postgres.analytics.orders o
JOIN hive.dimensions.customers c ON o.customer_id = c.customer_id
WHERE o.total_amount > 100;

-- Fragment 0 [SINGLE]
--     Output: order_id, name
--     │  Layout: [order_id:varchar, name:varchar]
--     └─ RemoteSource[1] → [col1, col2]
--
-- Fragment 1 [HASH(order_id)]
--     HashJoin[INNER, $hashvalue, $hashvalue_1]
--     │  Layout: [order_id:varchar, name:varchar]
--     │  Criterias: o.customer_id = c.customer_id
--     ├─ RemoteSource[2] → [order_id, customer_id]
--     └─ LocalExchange[HASH($hashvalue_1)] → [name, customer_id]
--        └─ RemoteSource[3] → [name, customer_id]
--
-- Fragment 2 [SOURCE(postgres)]
--     ScanFilter[table = postgres.analytics.orders, filter = (total_amount > 100)]
--     Layout: [order_id:varchar, customer_id:varchar]
--
-- Fragment 3 [SOURCE(hive)]
--     ScanFilter[table = hive.dimensions.customers]
--     Layout: [name:varchar, customer_id:varchar]
```

## Query Pushdown Verification

```sql
-- Check if pushdown is working
EXPLAIN
SELECT COUNT(*), AVG(total_amount)
FROM postgres.analytics.orders
WHERE created_at >= DATE '2026-05-01';

-- With pushdown: "ScanFilter[table = postgres..., filter = (created_at >= ...)]" shows filter
-- Without pushdown: full table scan then filter in Trino memory
```

## Performance Tuning Parameters

| Parameter | Default | Production | Description |
|---|---|---|---|
| `query.max-memory-per-node` | 4GB | 8-16GB | Max user memory per node |
| `query.max-total-memory-per-node` | 8GB | 16-32GB | Max total memory (user + system) |
| `task.max-worker-threads` | 8 | 16-32 | Threads per worker |
| `task.concurrency` | 4 | 8-16 | Parallel task execution |
| `join-distribution-type` | AUTOMATIC | PARTITIONED | Join strategy |
| `enable-dynamic-filtering` | false | true | Wait for build side filter |
| `dynamic-filtering-max-size` | 1MB | 10MB | Max dynamic filter size |
| `query.min-memory-per-node` | 128MB | 256MB | Minimum memory reservation |
