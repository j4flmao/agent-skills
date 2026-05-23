# Apache XTable Multi-Format Interoperability

## Overview

Apache XTable (formerly OneTable) provides multi-format table interoperability across Delta Lake, Apache Iceberg, and Apache Hudi. It maintains one authoritative table format and synchronizes metadata to other formats, enabling cross-engine querying without data duplication.

## Architecture

```
  ┌─────────────────────────┐
  │    Delta Lake (source)  │ ← Databricks, Spark writes here
  │    _delta_log/          │
  └─────────┬───────────────┘
            │ XTable sync (incremental)
            ▼
  ┌─────────────────────────┐
  │   Iceberg (target)      │ ← Trino, Athena, Spark read here
  │   metadata/             │
  └─────────────────────────┘
```

XTable reads the timeline of the source format (e.g., Delta Lake transaction log), computes the set of active data files, and writes the corresponding metadata files for the target format (e.g., Iceberg manifest files).

## Setup and Configuration

### Spark-Based Sync
```python
# build.sbt / pom.xml: org.apache.xtable:xtable-spark:0.1.0

from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("XTableSync") \
    .config("spark.sql.extensions", "org.apache.xtable.spark.extensions.XTableSparkExtensions") \
    .config("spark.sql.catalog.my_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.my_catalog.type", "hadoop") \
    .config("spark.sql.catalog.my_catalog.warehouse", "s3://data-lake/") \
    .getOrCreate()

# Sync Delta → Iceberg (incremental)
spark.sql("""
  CALL xtable.sync(
    source_table => 'delta.`s3://data-lake/tables/orders`',
    target_format => 'ICEBERG',
    target_table => 'my_catalog.analytics.orders'
  )
""")
```

### Standalone Client (Java)
```java
// XTable client configuration
TableType sourceFormat = TableType.DELTA;
String sourceBasePath = "s3://data-lake/tables/orders";
String targetFormat = "ICEBERG";
String targetBasePath = "s3://data-lake/iceberg-views/orders";

// Full sync: rewrite all metadata
SyncResult result = XTableSync.builder()
    .sourceFormat(sourceFormat)
    .sourceBasePath(sourceBasePath)
    .targetFormat(targetFormat)
    .targetBasePath(targetBasePath)
    .build()
    .sync();
```

## Sync Strategies

| Strategy | When to Use | Performance |
|----------|------------|-------------|
| **Full sync** | First time, after long pause | Scans all source files |
| **Incremental sync** | Regular intervals (every N commits) | Only new/changed files |
| **On-demand** | After critical writes | Triggered by pipeline |

## Use Cases

### Multi-Engine Lakehouse
```
Write:  Spark (Delta Lake) → s3://lake/orders/ → XTable sync
Read:   Trino (Iceberg)    → SELECT * FROM lake.analytics.orders
Read:   Athena (Iceberg)   → SELECT * FROM lake.analytics.orders
Read:   Flink (Iceberg)    → SELECT * FROM lake.analytics.orders
```

### Format Migration (Hudi → Iceberg)
```python
# Step 1: Sync all existing Hudi tables to Iceberg
CALL xtable.sync(
  source_table => 'hudi.`s3://lake/hudi-tables/orders`',
  target_format => 'ICEBERG',
  target_table => 'my_catalog.analytics.orders'
);

# Step 2: Switch writers to Iceberg
# Step 3: When all writers migrated, stop XTable sync
# Step 4: Eventually drop old Hudi metadata
```

## Limitations
- **Write amplification**: each sync write generates metadata for the target format
- **Latency**: sync adds minutes of delay between source write and target read
- **Format features**: some format-specific features don't sync (e.g., Delta's CDF, Hudi's record-level indexes)
- **Schema evolution**: limited support — complex schema changes may require manual intervention
