# Nessie — Git for Iceberg

## How It Works

Nessie versions Iceberg table metadata at the catalog level. Each Nessie reference (branch/tag) points to a commit hash. A commit captures the state of all tables in the catalog as a content snapshot:

```
Reference: main → Hash: abc123
  ┌──────────────────────────────────────────┐
  │ Commit abc123                            │
  │ Parent: def456                          │
  │ Message: "ETL: refresh daily metrics"   │
  │ Content:                                 │
  │   analytics.orders → snapshot-123        │
  │   analytics.customers → snapshot-456     │
  │   analytics.daily_metrics → snapshot-789 │
  └──────────────────────────────────────────┘
```

## Integration with Query Engines

### Spark
```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.nessie", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.nessie.catalog-impl", "org.apache.iceberg.nessie.NessieCatalog") \
    .config("spark.sql.catalog.nessie.uri", "http://nessie:19120/api/v1") \
    .config("spark.sql.catalog.nessie.ref", "dev_ml") \
    .config("spark.sql.catalog.nessie.warehouse", "s3://lakehouse/iceberg/") \
    .getOrCreate()

# Write to a branch
spark.sql("""
  MERGE INTO nessie.analytics.orders AS t
  USING source_data AS s ON t.order_id = s.order_id
  WHEN MATCHED THEN UPDATE SET t.status = s.status
  WHEN NOT MATCHED THEN INSERT *
""")
```

### Flink
```sql
CREATE CATALOG nessie_catalog WITH (
  'type' = 'iceberg',
  'catalog-impl' = 'org.apache.iceberg.nessie.NessieCatalog',
  'uri' = 'http://nessie:19120/api/v1',
  'ref' = 'dev_flink',
  'warehouse' = 's3://lakehouse/iceberg/'
);
```

### Trino
```sql
CREATE SCHEMA nessie.analytics
WITH (location = 's3://lakehouse/iceberg/nessie/analytics');
```

## Branch Lifecycle Patterns

### Development Branch
```python
# Create isolated environment for ML experiment
client.create_branch('experiment-ab-test', 'main')

# Data engineer works on experiment branch
# Spark reads/writes on 'experiment-ab-test'
# All changes isolated from main

# When satisfied:
client.merge('experiment-ab-test', 'main')

# Or discard:
client.delete_branch('experiment-ab-test')
```

### Release Tagging
```python
# Before training: tag the exact catalog state
client.create_tag('training-2024-05-01', 'main')

# Months later: reproduce the exact training environment
# spark.conf.set('ref', 'training-2024-05-01')
client.create_branch('reproduce-training', 'training-2024-05-01')
```

## Nessie vs LakeFS

| Feature | Nessie | LakeFS |
|---------|--------|--------|
| Scope | Iceberg catalog (table metadata) | Object store (entire data lake) |
| Granularity | Table-level versioning | File-level versioning |
| Zero-copy branches | Yes (metadata only) | Yes (metadata + data) |
| Conflict detection | Table-level (last-write-wins or merge) | File-level (diff-based merge) |
| Engine integration | Iceberg REST catalog (native) | S3 gateway or SDK integration |
| Multi-table atomic | Yes (single commit = all tables) | Yes (single commit = all files) |
| Storage format | Works with Iceberg only | Works with any file format |
| GC | Separate GC service | Automatic via garbage collection |
| Use case | Iceberg lakehouse, CI/CD for tables | Large data lakes, multi-format |

## Configuration Example

```yaml
# Docker Compose for Nessie + Iceberg + Spark
services:
  nessie:
    image: ghcr.io/projectnessie/nessie:latest
    ports:
      - "19120:19120"
    environment:
      - QUARKUS_DATASOURCE_DB_KIND=postgresql
      - QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://postgres:5432/nessie
  spark:
    image: alexmerced/spark34-iceberg13-nessie:latest
    ports:
      - "8888:8888"
    environment:
      - NESSIE_URI=http://nessie:19120/api/v1
      - WAREHOUSE=s3://lakehouse/iceberg/
```

## GC (Garbage Collection)
Nessie references track live table snapshots. Files not referenced by any live snapshot are candidates for garbage collection. Run GC periodically:
```bash
# Identify unreferenced files
nessie gc --repo nessie-repo --identify

# Delete unreferenced files older than 7 days
nessie gc --repo nessie-repo --sweep --older-than 7d
```
