# Lake Operations Reference

## Compaction

### Delta Lake OPTIMIZE
```sql
-- Compact small files, target 256MB
OPTIMIZE sales_data
WHERE order_date >= '2024-01-01'
AND order_date < '2024-02-01';

-- With Z-order (multi-dimensional clustering)
OPTIMIZE sales_data
ZORDER BY (customer_id, product_id)
WHERE order_date >= '2024-01-01';

-- Auto compaction (Delta on Databricks)
ALTER TABLE sales_data
SET TBLPROPERTIES (delta.autoOptimize.optimizeWrite = true);
```

### Iceberg rewrite_data_files
```sql
-- Rewrite data files to target size
CALL catalog.system.rewrite_data_files(
  table => 'sales.sales_data',
  options => map(
    'target-file-size-bytes', '268435456',
    'min-file-size-bytes', '134217728',
    'rewrite-all', 'false'
  ),
  where => 'order_date >= "2024-01-01"'
);

-- With sort order
CALL catalog.system.rewrite_data_files(
  table => 'sales.sales_data',
  strategy => 'sort',
  sort_order => 'customer_id ASC NULLS LAST'
);
```

### Hudi Clustering
```sql
-- Inline clustering during write
CALL run_clustering(
  table => 'sales_data',
  order => 'customer_id, product_id',
  options => 'hoodie.clustering.inline.max.commits=4'
);

-- Async clustering (schedule + execute)
-- Schedule: adds clustering plan to timeline
-- Execute: runs clustering on scheduled plan
```

## Vacuum

### Delta Vacuum
```sql
-- Dry run (list files that would be deleted)
VACUUM sales_data RETAIN 168 HOURS DRY RUN;

-- Actual deletion
VACUUM sales_data RETAIN 168 HOURS;

-- Disable for time travel > 7 days
ALTER TABLE sales_data
SET TBLPROPERTIES (delta.deletedFileRetentionDuration = 'interval 30 days');
```

### Iceberg Expire Snapshots
```sql
-- Remove snapshots older than N days
CALL catalog.system.expire_snapshots(
  table => 'sales.sales_data',
  older_than => TIMESTAMP '2024-01-01 00:00:00',
  retain_last => 5
);

-- Remove orphan files (not referenced by any snapshot)
CALL catalog.system.remove_orphan_files(
  table => 'sales.sales_data',
  older_than => TIMESTAMP '2024-01-01 00:00:00'
);
```

## Z-Order / Clustering

### Z-Order Curve
```
Z-order maps multi-dimensional points to 1D by interleaving bits:
  X = 3 (011), Y = 5 (101)
  Interleaved: 0 1 1 0 1 1 = 27
  Data sorted by Z-value colocates nearby points in both dimensions

Hilbert curve: better locality preservation than Z-order
  Same clustering but preserves spatial proximity better
  Available in Delta 3.0+ (Hilbert)
```

```sql
-- Delta Z-order
OPTIMIZE sales_data ZORDER BY (customer_id, order_date);

-- Iceberg sort order (equivalent to clustering)
CALL catalog.system.rewrite_data_files(
  table => 'sales.sales_data',
  strategy => 'sort',
  sort_order => 'customer_id ASC NULLS LAST, order_date DESC NULLS FIRST'
);
```

### Benefits
```
Query analysis before Z-order:
  SELECT * FROM sales_data
  WHERE customer_id = 'abc123' AND order_date = '2024-01-15'
  -> Scans all partitions, all files (full table scan)

After Z-order on (customer_id, order_date):
  -> Prunes to < 5% of files (colocated data)
  -> 20x-100x query speedup for selective queries
```

## Schema Evolution Patterns

```sql
-- Safe evolutions:
ALTER TABLE sales_data ADD COLUMN discount DECIMAL(5,2);
ALTER TABLE sales_data RENAME COLUMN old_name TO new_name;
ALTER TABLE sales_data DROP COLUMN deprecated_field;
ALTER TABLE sales_data ALTER COLUMN price TYPE DOUBLE;  -- widening

-- Unsafe (will fail):
ALTER TABLE sales_data DROP COLUMN required_field;  -- no downstream consumers?
ALTER TABLE sales_data ALTER COLUMN id TYPE INT;     -- narrowing from LONG
```

## Time Travel

```sql
-- Delta Lake
SELECT * FROM sales_data VERSION AS OF 42;
SELECT * FROM sales_data TIMESTAMP AS OF '2024-01-15 10:30:00';

RESTORE TABLE sales_data TO VERSION AS OF 42;
RESTORE TABLE sales_data TO TIMESTAMP AS OF '2024-01-15 10:30:00';

-- Iceberg
SELECT * FROM sales_data FOR SYSTEM_VERSION AS OF 391184759034827;
SELECT * FROM sales_data FOR SYSTEM_TIME AS OF '2024-01-15 10:30:00';

-- Hudi
SELECT * FROM sales_data TIMESTAMP AS OF '20240115103000';
```

## Optimization Scheduling

```python
# Spark optimization script (can run as Airflow task)
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("lake-optimize").getOrCreate()

# Delta optimization for all tables
tables = [
    ("sales.sales_data", ["customer_id", "product_id"]),
    ("sales.orders", ["order_id", "order_date"]),
    ("marketing.campaigns", ["campaign_id"]),
]

for table_name, zorder_cols in tables:
    spark.sql(f"OPTIMIZE {table_name} ZORDER BY ({','.join(zorder_cols)})")
    spark.sql(f"VACUUM {table_name} RETAIN 168 HOURS")
    spark.sql(f"ANALYZE TABLE {table_name} COMPUTE STATISTICS FOR ALL COLUMNS")
```

## Rules for Lake Table Design

```
1. VARCHAR(MAX) or STRING -> use STRING (not VARCHAR with length)

2. Partition on date dimension with moderate cardinality:
     Good: order_date (365 partitions/yr)
     Bad: user_id (millions of partitions)

3. Target file size: 256MB-1GB after compaction
     Check: DESCRIBE DETAIL sales_data (see numFiles, sizeInBytes)
     Avg file = sizeInBytes / numFiles, target = 256MB

4. Enable file-level statistics for data skipping:
     Delta: automatic (stats in transaction log)
     Iceberg: automatic (Puffin format / column stats)
     Hudi: automatic (metadata table)

5. Vacuum retention = 7 days minimum (168 hours)
     Allows 7-day time travel for reprocessing
```
