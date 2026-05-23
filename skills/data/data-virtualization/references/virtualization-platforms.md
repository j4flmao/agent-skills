# Data Virtualization Platforms

## Dremio Deep Dive

### Reflections — Acceleration for BI
Reflections are materialized pre-computed views stored in Dremio's internal Parquet format. Two types:
- **Raw Reflections**: store data sorted by specified fields — accelerate filter + sort queries
- **Aggregation Reflections**: pre-compute GROUP BY aggregations — accelerate dashboard queries

```sql
-- Raw reflection: optimize filters on frequently queried columns
ALTER TABLE "s3"."lake"."orders"
  CREATE RAW REFLECTION orders_customer_date
  USING DISPLAY FIELDS (order_id, customer_id, total_amount, status)
  PARTITION BY (order_date)
  DISTRIBUTE BY (customer_id);

-- Aggregation reflection: pre-compute dashboard queries
ALTER TABLE "s3"."lake"."orders"
  CREATE AGGREGATE REFLECTION orders_daily_revenue
  USING DIMENSIONS (order_date, status)
  MEASURES (count(*) AS cnt, sum(total_amount) AS revenue)
  PARTITION BY (order_date);
```

Reflections are transparent — queries automatically use them without SQL changes. Dremio's BI optimizer rewrites dashboard queries (Tableau, Power BI) to match available Reflections.

### Virtual Datasets (VDS)
VDS define transforms without copying data:
```sql
CREATE VDS "analytics"."customer_revenue" AS
SELECT
  c.customer_id,
  c.name,
  c.segment,
  SUM(o.total_amount) AS lifetime_value,
  COUNT(o.order_id) AS order_count
FROM "postgres"."public"."customers" c
JOIN "s3"."lake"."orders" o ON c.customer_id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.customer_id, c.name, c.segment;
```

## Starburst Enterprise

### Data Lake Caching
Starburst caches hot data from S3/ADLS/GCS to local SSD on workers:
```properties
# starburst/catalog/hive.properties
connector.name=hive
hive.metastore.uri=thrift://metastore:9083

# Caching configuration
cache.enabled=true
cache.base-directory=/mnt/ssd/cache
cache.ttl=2h
cache.disk-usage-percentage=80%
cache.data-sizes=1024MB
```

### Built-in RBAC
```sql
-- Access control rules via Starburst's built-in Ranger integration
CREATE ROLE analytics_users;
GRANT SELECT ON TABLE iceberg.analytics.* TO ROLE analytics_users;
GRANT SELECT (customer_name, order_total) ON TABLE iceberg.analytics.customers TO ROLE support_users;
DENY SELECT ON COLUMN iceberg.analytics.customers.ssn TO ROLE support_users;
```

### Warp Speed Engine
Starburst's native engine enhancement provides:
- Native vectorized execution (not JVM-based)
- LLVM code generation for hot query paths
- Automatic join order optimization based on table statistics

## Alluxio

### Architecture
Alluxio sits between compute and storage:
```
Compute (Spark/Trino)  ← Alluxio (cache layer) → Storage (S3/ADLS/HDFS)
```

### Namespace Mounting
```bash
# Mount multiple storage systems under a unified namespace
alluxio fs mount /sales s3://data-lake/sales/
alluxio fs mount /analytics hdfs://prod-nn:8020/analytics/
alluxio fs mount /external abfs://partner-data@storage.dfs.core.windows.net/

# Unified path: /sales → S3, /analytics → HDFS, /external → Azure
```

### Cache Configuration for Trino/Spark
```yaml
# alluxio-site.properties
alluxio.user.file.cachepartiallyread.block=true
alluxio.user.block.size.bytes.default=64MB
alluxio.worker.memory.size=32GB
alluxio.worker.tieredstore.level0.alias=SSD
alluxio.worker.tieredstore.level0.dirs.path=/mnt/ssd/cache
alluxio.worker.tieredstore.level0.dirs.quota=1TB
alluxio.worker.tieredstore.level1.alias=HDD
alluxio.worker.tieredstore.level1.dirs.path=/mnt/hdd/cache
alluxio.worker.tieredstore.level1.dirs.quota=10TB
```

## Platform Selection

| Feature | Dremio | Starburst | Alluxio |
|---------|--------|-----------|---------|
| Role | Query engine + acceleration | Enterprise Trino | Caching + namespace |
| Acceleration | Reflections | Data lake caching | Transparent cache |
| Lineage | Column-level lineage | Via OpenLineage | N/A |
| BI integration | Native (rewrites BI queries) | Standard JDBC/ODBC | N/A |
| Security | RBAC + VDS | Ranger RBAC + column mask | POSIX-style |
| Deployment | K8s, VMs | K8s, VMs, SaaS | K8s, VMs |
| Caching tier | Internal Parquet | Local SSD | SSD + memory tiered |
| Best for | Self-service BI acceleration | Enterprise federated SQL | Accelerating S3 reads |
