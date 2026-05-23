# Warehouse Platforms

## Snowflake

### Architecture
Snowflake separates storage, compute, and services into three distinct layers. The storage layer compresses and columnar-formats data into micro-partitions (50-500MB each). The compute layer consists of virtual warehouses (clusters of EC2 instances) that can be independently scaled, suspended, or auto-scaled. The services layer handles authentication, metadata, query optimization, and transaction management. This separation allows concurrent workloads without contention.

### Key Features
- **Time Travel**: query or clone data as it existed up to 90 days ago using `AT` or `BEFORE` clauses
- **Zero-Copy Cloning**: instant clone of schemas, tables, or databases without copying data
- **Data Sharing**: share data across Snowflake accounts via readers and providers without copying
- **Snowpark**: write data pipelines in Python, Java, or Scala that execute on Snowflake compute
- **Dynamic Tables**: declarative incremental data pipelines that automatically refresh
- **Search Optimization Service**: accelerate point lookup queries on large tables

### Warehouse Sizing
| Size | Credits/Hour | Best For |
|---|---|---|
| X-Small | 1 | Dev, small ETL, light queries |
| Small | 2 | Small prod, moderate ETL |
| Medium | 4 | Prod queries, daily aggregations |
| Large | 8 | Heavy ETL, large aggregations |
| X-Large | 16 | Large fact table queries |
| 2X-Large | 32 | Critical batch processing |
| 3X-Large | 64 | Massive data processing |
| 4X-Large | 128 | Peak loads, complex queries |
| 5X-Large | 256 | Extreme compute needs |
| 6X-Large | 512 | Maximum compute |

### Multi-Cluster Warehouses
For high concurrency, Snowflake supports multi-cluster warehouses that add compute clusters automatically as query queues grow. Max clusters: 1 (default) to 10. Minimum clusters: 1. Scaling policy: economy (minimize cost, may queue) or standard (balance cost and performance). Best for: BI dashboards serving many concurrent users.

### Auto-Suspend and Auto-Resume
```sql
ALTER WAREHOUSE my_wh SET AUTO_SUSPEND = 300;  -- 5 minutes idle
ALTER WAREHOUSE my_wh SET AUTO_RESUME = TRUE;
```
Auto-suspend stops the warehouse after a configurable idle period. Auto-resume restarts on the next query. Set auto-suspend aggressively (5 minutes) for dev warehouses.

### Resource Monitors
```sql
CREATE RESOURCE MONITOR monthly_limit
  WITH CREDIT_QUOTA = 1000
  FREQUENCY = MONTHLY
  START_TIMESTAMP = '2026-01-01 00:00:00'
  TRIGGERS ON 80 PERCENT DO NOTIFY
           ON 100 PERCENT DO SUSPEND
           ON 110 PERCENT DO SUSPEND_IMMEDIATE;
ALTER WAREHOUSE my_wh SET RESOURCE_MONITOR = monthly_limit;
```

## BigQuery

### Architecture
BigQuery is serverless — there are no clusters to manage. Data is stored in Colossus (Google's distributed file system) in a columnar format (Capacitor). Compute uses slots (units of CPU + memory). Slots are shared across all queries in a project. On-demand pricing uses a shared slot pool (up to 2000 slots per project). Flat-rate pricing reserves dedicated slots.

### Key Features
- **BI Engine**: in-memory cache for dashboard queries, reduces slot usage
- **BigQuery ML**: create ML models using SQL (linear regression, XGBoost, deep learning)
- **BigLake**: unified query engine across BigQuery, GCS, and external sources
- **Streaming Buffer**: sub-second data availability for streaming inserts
- **Information Schema**: metadata tables for query monitoring, optimization, and auditing

### Partitioning and Clustering
```sql
CREATE TABLE project.dataset.fact_orders (
  order_id STRING,
  order_date DATE,
  customer_id STRING,
  amount FLOAT64,
  status STRING
)
PARTITION BY order_date
CLUSTER BY customer_id, status
OPTIONS(
  partition_expiration_days = 365,
  require_partition_filter = true
);
```
Partition by DATE, TIMESTAMP, or integer range. Max 4000 partitions per table. Cluster by up to 4 columns — most selective first. Clustering automatically re-clusters as data changes.

### Slot Management
- **On-demand**: pay per byte scanned (default). Max 2000 slots per project. Best for unpredictable workloads.
- **Flat-rate**: reserve dedicated slots (100-2000+). Best for predictable, steady-state workloads.
- **Flex slots**: short-term slot commitments (60 seconds minimum). Best for burst processing.

### Cost Control
```sql
-- Set max bytes billed per query
SET @max_bytes_billed = 1099511627776; -- 1 TB

-- Query total bytes processed
SELECT total_bytes_processed
FROM `region-US`.INFORMATION_SCHEMA.JOBS
WHERE job_id = 'job-id';
```

## Redshift

### Architecture
Redshift uses a leader node + compute node architecture. The leader node receives queries, generates execution plans, and distributes work to compute nodes. Compute nodes store data and execute query plan segments. Node types: DC2 (dense compute, SSD), DS2 (dense storage, HDD), RA3 (managed storage, SSD cache + S3).

### Key Features
- **RA3 Nodes**: managed storage — compute and storage scale independently
- **Concurrency Scaling**: automatically adds cluster capacity for burst traffic
- **AQUA**: hardware-accelerated cache for compression and encryption
- **Spectrum**: query S3 data directly without loading into Redshift
- **Materialized Views**: pre-computed query results with automatic refresh
- **Auto WLM**: workload management with automatic query queue management

### Distribution Styles
```sql
CREATE TABLE fact_orders (
  order_id BIGINT DISTKEY,
  customer_id INT,
  order_date DATE,
  amount DECIMAL(10,2)
)
DISTSTYLE KEY
DISTKEY (customer_id)
SORTKEY (order_date, customer_id);
```
- **KEY**: distribute rows by hash of specified column. Best for large tables joined on the distribution key.
- **EVEN**: round-robin distribution. Best for tables that don't join with others.
- **ALL**: full copy on all nodes. Best for small dimension tables (<1M rows).

### Sort Keys
**COMPOUND sort key**: multi-column, ordered by priority in WHERE clauses. Best for queries with range filters on the first column and equality on subsequent columns. **INTERLEAVED sort key**: equal weight to all columns. Best for queries with filters on any column combination.

### Workload Management
```sql
CREATE WLM QUEUE reporting_queue WITH (
  QUEUE_TYPE = 'auto',
  TOTAL_SLOTS = 5,
  MEMORY_LIMIT = 50,
  USER_GROUPS = ['reporting_users'],
  QUERY_GROUPS = ['reporting']
);
```

## Databricks SQL

### Architecture
Databricks SQL runs on the lakehouse architecture — data stored in Delta Lake format on cloud storage (S3, ADLS, GCS). SQL warehouses (formerly SQL endpoints) provide compute. Photon is a native vectorized engine for accelerated SQL query execution. Unity Catalog provides governance, lineage, and discovery.

### Key Features
- **Delta Lake**: ACID transactions, time travel, schema enforcement/unified batch and streaming
- **Photon Engine**: native C++ vectorized query engine for SQL and DataFrame operations
- **Serverless SQL Warehouses**: instant compute, auto-scaling, auto-termination
- **Unity Catalog**: fine-grained access control, data lineage, automated discovery
- **Delta Sharing**: open protocol for data sharing across platforms

## Platform Selection Guide

| Feature | Snowflake | BigQuery | Redshift | Databricks SQL |
|---|---|---|---|---|
| Management | Fully managed | Serverless | Managed clusters | Serverless/managed |
| Compute/storage | Separated | Separated | RA3: separated | Separated |
| Scaling | Manual/auto | Automatic | Manual/auto | Automatic |
| Performance | Good | Excellent | Excellent | Very good |
| Concurrency | Multi-cluster | Automatic | Concurrency scaling | Auto-scaling |
| Data format | Proprietary | Proprietary | Proprietary | Delta Lake (open) |
| ML integration | Snowpark | BQ ML | SageMaker | Native |
| Cost model | Credit/hour | Per byte/slot | Node/hour | DBU/hour |
| Best for | Multi-cloud | GCP-native | AWS-native | ML + analytics |
