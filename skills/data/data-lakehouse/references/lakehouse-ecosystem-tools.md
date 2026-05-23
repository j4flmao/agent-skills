# Lakehouse Ecosystem Tools

## Apache XTable in the Lakehouse

XTable enables a multi-format lakehouse. Maintain one canonical format and expose others via metadata sync:

```
         Databricks (Delta)           Trino (Iceberg)           Hudi (Streaming)
              │                           │                         │
              ▼                           ▼                         ▼
         ┌──────────┐               ┌──────────┐              ┌──────────┐
         │ Delta    │               │ Iceberg  │              │ Hudi     │
         │ Metadata │               │ Metadata │              │ Metadata │
         └────┬─────┘               └────┬─────┘              └────┬─────┘
              │                          │                         │
              └──────────────────────────┼─────────────────────────┘
                                         │
                                   ┌─────▼─────┐
                                   │ Parquet   │
                                   │ Data Files│
                                   │ (S3/GCS)  │
                                   └───────────┘
```

### Configuration
```yaml
# xtable-config.yaml
sourceFormat: DELTA
targetFormats:
  - ICEBERG
  - HUDI
sourceBasePath: s3://lakehouse/raw/orders/
iceberg:
  targetBasePath: s3://lakehouse/iceberg-external/orders/
hudi:
  targetBasePath: s3://lakehouse/hudi-external/orders/
syncMode: incremental  # or FULL
schedule: "0 */2 * * *"  # sync every 2 hours
```

## Nessie Catalog Integration

Nessie serves as the Iceberg REST catalog for the lakehouse, providing Git semantics:

### Hybrid Governance Model
```
Databricks-managed tables: Unity Catalog (Delta)
                              │
Engine-agnostic tables : Nessie Catalog (Iceberg)
                              │
                              ├── main (production, immutable)
                              ├── dev/* (per-developer sandbox)
                              └── tags/release-* (snapshots)
```

### Configuration
```python
# Iceberg + Nessie + Spark
spark = SparkSession.builder \
    .config("spark.sql.catalog.lakehouse", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.lakehouse.catalog-impl", "org.apache.iceberg.nessie.NessieCatalog") \
    .config("spark.sql.catalog.lakehouse.uri", "http://nessie:19120/api/v1") \
    .config("spark.sql.catalog.lakehouse.ref", "dev_ml") \
    .config("spark.sql.catalog.lakehouse.warehouse", "s3://lakehouse/iceberg/") \
    .getOrCreate()
```

## Apache Paimon in the Lakehouse

Paimon fills the streaming ingestion gap in the lakehouse:

```
Kafka CDC (Flink CDC) → Paimon Tables (LSM, upsert) → Batch reads (Spark/Trino)
                              │
                              ├── Changelog stream → downstream consumers
                              ├── Snapshot reads → analytics queries
                              └── Time travel → historical analysis
```

### Paimon Merge Engines
| Engine | Behavior | Use Case |
|--------|----------|----------|
| Deduplicate | Keep latest record per key | Standard CDC |
| Partial Update | Merge specified columns | Gradual enrichment |
| Aggregation | Pre-aggregate metrics | Real-time rollups |
| First Row | Keep first value | Referential data |

## Tool Selection Matrix

| Tool | Slot | Key Strength | When to Use |
|------|------|-------------|-------------|
| XTable | Format bridge | Zero-copy multi-format | Multi-engine lakehouse |
| Nessie | Catalog versioning | Git semantics for tables | CI/CD for data |
| Paimon | Streaming lake format | LSM high-throughput upserts | Real-time CDC to lake |
| Delta Lake | Batch lake format | Databricks-native | Databricks lakehouse |
| Iceberg | Universal lake format | Engine interoperability | Multi-platform lakehouse |
