# Lakehouse Platform Reference

## Databricks Lakehouse

### Workspace Architecture
```
Databricks workspace:
  Control plane (Databricks-managed):
    - Web application, REST API, cluster manager
    - Notebooks, jobs, MLflow, Unity Catalog UI
    - DBFS (root bucket for notebooks, libraries, init scripts)

  Compute plane (customer-managed):
    - Clusters: VMs with Spark runtime
    - Serverless SQL warehouses (Photon)
    - Jobs compute (ephemeral)

  Data plane (customer-managed storage):
    - S3/ADLS/GCS buckets (root bucket + external locations)
    - Unity Catalog managed schemas
    - Delta tables stored in customer buckets
```

### Clusters and SQL Warehouses
```yaml
# Cluster config (job cluster)
spark_version: "14.3.x-scala2.12"
node_type_id: "i3.xlarge"         # 4 vCPU, 30.5GB RAM, 1x950 NVMe
num_workers: 8
autoscale:
  min_workers: 2
  max_workers: 16
aws_attributes:
  availability: "SPOT_WITH_FALLBACK"
  zone_id: "us-east-1a"

# SQL Warehouse (serverless)
cluster_size: "X-Small"            # 2-8 clusters auto-scaled
max_num_clusters: 10
auto_stop_mins: 10
enable_photon: true
channel: "CHANNEL_NAME_CURRENT"
```

## Unity Catalog

### Metastore and Catalog Setup
```sql
-- Create metastore (one per region)
CREATE METASTORE IF NOT EXISTS
  LOCATION 's3://unity-catalog-bucket/metastore';

-- Create catalog
CREATE CATALOG IF NOT EXISTS production
  COMMENT 'Production data catalog';

-- Schemas
CREATE SCHEMA IF NOT EXISTS production.bronze;
CREATE SCHEMA IF NOT EXISTS production.silver;
CREATE SCHEMA IF NOT EXISTS production.gold;

-- External location (bring your own bucket)
CREATE EXTERNAL LOCATION IF NOT EXISTS my_bucket
  URL 's3://my-data-bucket/'
  WITH CREDENTIAL (ACCESS_KEY_ID '...' SECRET_ACCESS_KEY '...');
```

### RBAC and Permissions
```sql
-- Role-based access
CREATE ROLE data_analyst;
CREATE ROLE data_engineer;
CREATE ROLE admin;

-- Grant privileges
GRANT USAGE ON CATALOG production TO data_analyst;
GRANT SELECT ON SCHEMA production.gold TO data_analyst;
GRANT SELECT, MODIFY ON SCHEMA production.silver TO data_engineer;
GRANT ALL PRIVILEGES ON CATALOG production TO admin;

-- Column-level security
CREATE MASKING POLICY ssn_mask AS (val STRING) RETURNS STRING ->
  CASE WHEN is_member('admin') THEN val ELSE '***-**-' || SUBSTRING(val, -4) END;

ALTER TABLE production.silver.customers
  ALTER COLUMN ssn SET MASKING POLICY ssn_mask;

-- Row filters
CREATE ROW FILTER region_filter AS (region STRING) RETURNS BOOLEAN ->
  region = current_user_region();

ALTER TABLE production.silver.sales
  SET ROW FILTER region_filter ON (region);
```

## Delta Sharing

### Sharing Server Setup
```yaml
# delta-sharing-server.yaml
version: 1
server:
  host: "0.0.0.0"
  port: 8080
  endpoint: "/delta-sharing"
  tokenExpirationDays: 90

shares:
  - name: "marketing"
    schemas:
      - name: "campaigns"
        tables:
          - name: "campaign_performance"
            location: "/delta/campaign_performance"
          - name: "attribution"
            location: "/delta/attribution"

recipients:
  - name: "partner_analytics"
    authenticationType: "token"
    tokens:
      - "partner-token-xxxx"
    shares: ["marketing"]
```

### Client Consumption (Python)
```python
# Recipient side: pandas
import delta_sharing

client = delta_sharing.SharingClient(
  "http://server:8080/delta-sharing/marketing?token=partner-token-xxxx"
)
tables = client.list_tables()
df = delta_sharing.load_as_pandas(
  "http://server:8080/delta-sharing/marketing/sales/campaign_performance?token=partner-token-xxxx"
)
```

## Apache Paimon

### Table Types
```sql
-- Append-only table (event logs)
CREATE TABLE paimon_db.events (
  event_id BIGINT,
  event_time TIMESTAMP(3),
  event_type STRING,
  payload STRING
) WITH (
  'bucket' = '4',
  'bucket-key' = 'event_id'
);

-- Primary-key table (CDC upserts)
CREATE TABLE paimon_db.orders (
  order_id BIGINT,
  product_id INT,
  amount DECIMAL(10,2),
  status STRING,
  dt STRING,
  PRIMARY KEY (order_id, dt) NOT ENFORCED
) WITH (
  'bucket' = '4',
  'bucket-key' = 'order_id',
  'merge-engine' = 'deduplicate',
  'changelog-producer' = 'input',
  'snapshot.time-retained' = '7d'
);

-- Partial-update table (accumulating facts)
CREATE TABLE paimon_db.orders_partial (
  order_id BIGINT,
  status STRING,
  amount DECIMAL(10,2),
  _timestamp TIMESTAMP(3),
  PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
  'merge-engine' = 'partial-update',
  'partial-update.columns' = 'status,amount'
);
```

### Flink Integration
```sql
-- Flink SQL: write to Paimon
INSERT INTO paimon_db.orders
SELECT order_id, product_id, amount, status, dt
FROM kafka_orders;

-- Flink SQL: read with streaming
SELECT * FROM paimon_db.orders
/*+ OPTIONS('scan.mode' = 'from-timestamp', 'scan.timestamp-millis' = '1705334400000') */;
```

## Multi-Cloud Strategy

```
Primary region (us-east-1):
  S3 + Unity Catalog (primary) + Delta tables
  Write traffic, ingestion, ETL

Secondary region (eu-west-1):
  S3 + Unity Catalog (secondary, read-only)
  Read replicas via Delta clone or S3 replication

DR region (ap-southeast-1):
  S3 + catalog + compute on-demand
  Activated on primary region failure

Replication:
  S3 CRR (Cross-Region Replication): async, 15min typical lag
  Delta Clone: CREATE OR REPLACE TABLE gold.daily_revenue
    DEEP CLONE source_table;
  Delta Sharing: cross-region reads via sharing server (no data copy)
```

## Open Format Commitment

Always use Delta format as the single source of truth. Use Parquet for interchange with non-Delta engines. All layers are open-format (Parquet-based, can be read by Trino, Presto, Athena, Spark without Databricks). Avoid vendor-locked features (Databricks-only SQL extensions, DSIs) when cross-engine compatibility is required.

```sql
-- Minimum-common-denominator DDL for cross-engine compatibility
CREATE TABLE gold.daily_revenue (
  order_date DATE,
  total_revenue DECIMAL(15,2),
  total_orders BIGINT
) USING DELTA
LOCATION 's3://lake/gold/daily_revenue'
TBLPROPERTIES ('delta.columnMapping.mode' = 'name');
-- This table is readable by Trino, Athena, Spark 3.x, Presto
```
