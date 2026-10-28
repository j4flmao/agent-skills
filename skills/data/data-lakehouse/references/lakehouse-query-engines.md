# Lakehouse Query Engines

Capabilities and configuration of engines that read and write lakehouse tables, and how to pick one per workload. Catalog wiring is in `lakehouse-catalog-integration.md`.

## 1. Engine Comparison

| Engine | Workload | Iceberg | Delta | Writes | Notes |
|---|---|---|---|---|---|
| Apache Spark | Batch ETL, MERGE, ML prep, streaming | Full | Full | Yes | Reference implementation for most features |
| Apache Flink | Streaming, CDC, Paimon | Full streaming read/write | Connector (limited) | Yes | Commits on checkpoints |
| Trino / Starburst | Interactive SQL, federation | Strong (MERGE, procedures, time travel) | Read + write via Delta connector | Yes | Coordinator memory and spill tuning matter |
| Databricks SQL | BI, SQL warehouse | Managed/foreign Iceberg | Native | Yes | Photon engine, serverless |
| Snowflake | SQL, BI | Iceberg tables (managed or external catalog) | Read via Iceberg metadata (UniForm) | Managed tables | Governance and sharing integrated |
| Amazon Athena | Serverless SQL on AWS | Read/write, MERGE, OPTIMIZE, VACUUM | Read | Iceberg | Per-TB-scanned pricing |
| BigQuery | Serverless SQL on GCP | BigLake Iceberg tables | Read (BigLake) | BigQuery-managed Iceberg | Slot-based or on-demand |
| DuckDB | Local/embedded analytics | Read; REST catalog attach; writes in recent releases | Read (`delta` extension) | Limited | Great for dev, tests, small data |
| StarRocks / Doris | Low-latency BI | Read, materialized views | Read | Limited | Caching for dashboards |
| Dremio | BI, semantic layer | Read/write, reflections | Read | Yes | Reflections act as accelerators |

Feature support evolves quickly; verify MERGE, row-level deletes, v3 features, and time travel for the exact engine version.

## 2. Choosing Per Workload

| Workload | First choice | Alternatives |
|---|---|---|
| Nightly ETL with large joins/MERGE | Spark | Databricks SQL, Trino (fault-tolerant execution) |
| Sub-minute streaming ingestion | Flink or Spark Structured Streaming | Kafka Connect sink |
| Many concurrent BI users | Databricks SQL, Snowflake, Trino with caching, StarRocks | Athena/BigQuery for spiky load |
| Ad hoc analysis by engineers | Trino, DuckDB | Spark notebooks |
| CI tests and local dev | DuckDB, local Spark | |

## 3. Trino Iceberg Connector

```properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://catalog.example.com/api/catalog
iceberg.file-format=PARQUET
iceberg.compression-codec=ZSTD
iceberg.expire-snapshots.min-retention=7d
iceberg.remove-orphan-files.min-retention=7d
fs.native-s3.enabled=true
s3.region=eu-west-1
```

```sql
SELECT * FROM lake.silver.orders FOR VERSION AS OF 5729182;
SELECT * FROM lake.silver.orders FOR TIMESTAMP AS OF TIMESTAMP '2026-10-01 00:00:00 UTC';
ALTER TABLE lake.silver.orders EXECUTE optimize(file_size_threshold => '128MB');
ALTER TABLE lake.silver.orders EXECUTE expire_snapshots(retention_threshold => '7d');
ALTER TABLE lake.silver.orders EXECUTE remove_orphan_files(retention_threshold => '7d');
SELECT * FROM lake.silver."orders$snapshots";      -- metadata tables use $ suffix
```

Trino time-travel syntax (`FOR VERSION AS OF`) differs from Spark (`VERSION AS OF`).

## 4. Spark Settings Relevant to Lakehouse Reads

| Setting | Default | Purpose |
|---|---|---|
| `spark.sql.adaptive.enabled` | true (3.2+) | AQE: coalesce partitions, handle skew, switch join strategy |
| `spark.sql.autoBroadcastJoinThreshold` | 10 MB | Broadcast small dimension tables |
| `spark.sql.files.maxPartitionBytes` | 128 MB | Input split size for file sources |
| `read.split.target-size` (Iceberg table/read option) | 128 MB | Iceberg split planning |
| `spark.sql.iceberg.vectorization.enabled` / `read.parquet.vectorization.enabled` | true | Vectorized Parquet reads |

## 5. DuckDB for Local and CI

```python
import duckdb
con = duckdb.connect()
con.sql("INSTALL iceberg; LOAD iceberg; INSTALL delta; LOAD delta;")
con.sql("SELECT count(*) FROM iceberg_scan('s3://lake/warehouse/silver/orders')").show()
con.sql("SELECT status, sum(amount) FROM delta_scan('s3://lake/gold/daily_revenue') GROUP BY 1").show()
```

`iceberg_scan` on a path needs a metadata file or version hint; attaching a REST catalog is more robust.

## 6. Performance Considerations Across Engines

- Planning cost scales with manifests/log size: keep metadata compact (see `lakehouse-performance-optimization.md`).
- Engines differ in which statistics they use (partition values, file min/max, Parquet page indexes, bloom filters). Check before relying on a feature for skipping.
- Concurrency: Trino coordinators and Spark drivers are single points of planning; size them for metadata-heavy queries.
- Caching: Trino/Starburst file system cache, Databricks disk cache, StarRocks data cache reduce object-store reads for hot data.

## 7. Write Ownership

Allow multiple engines to read; restrict writes:
- Spark (or Flink) owns ingestion and silver/gold tables.
- Trino/Athena write only to sandbox or specific mart tables if needed.
- Maintenance runs in one engine per table to avoid conflicting procedures.

## Pitfalls

- Assuming identical SQL semantics across engines (time travel, MERGE behaviour, timestamp types).
- Running heavy ETL on an interactive cluster sized for BI.
- Different engines using different catalogs for the same table.
- Ignoring engine-level minimum retention settings that block maintenance procedures.

## Checklist

- [ ] Engine per workload chosen and documented.
- [ ] Feature support verified for the engine versions in use.
- [ ] Write ownership per table defined.
- [ ] Engine configs version-controlled; credentials from vending or service identities.
