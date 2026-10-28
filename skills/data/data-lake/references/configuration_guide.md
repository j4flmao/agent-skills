# Engine and Table Configuration Guide

Spark session settings to enable each table format and catalog, plus the table properties that matter most. Values shown are common starting points; defaults change between releases, so confirm against the docs of the version you pin.

## Spark Session: Delta Lake

```properties
spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension
spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog
# Package: io.delta:delta-spark_2.13:<version matching your Spark>
```

## Spark Session: Iceberg with REST Catalog

```properties
spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions
spark.sql.catalog.lake=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.lake.type=rest
spark.sql.catalog.lake.uri=https://catalog.internal/api/catalog
spark.sql.catalog.lake.warehouse=prod
spark.sql.catalog.lake.io-impl=org.apache.iceberg.aws.s3.S3FileIO
# OAuth2 client credentials supplied from env/secret store, never in code:
spark.sql.catalog.lake.credential=${CLIENT_ID}:${CLIENT_SECRET}
spark.sql.catalog.lake.header.X-Iceberg-Access-Delegation=vended-credentials
spark.sql.defaultCatalog=lake
# Packages: org.apache.iceberg:iceberg-spark-runtime-<spark>_<scala>:<ver>, iceberg-aws-bundle
```

Other catalog types: `type=hive` (`uri=thrift://...`), `type=glue` via `catalog-impl=org.apache.iceberg.aws.glue.GlueCatalog`, `type=hadoop` (path-based, not for concurrent writers on S3), `catalog-impl=org.apache.iceberg.nessie.NessieCatalog`, JDBC.

## Spark Session: Hudi

```properties
spark.serializer=org.apache.spark.serializer.KryoSerializer
spark.sql.extensions=org.apache.spark.sql.hudi.HoodieSparkSessionExtension
spark.sql.catalog.spark_catalog=org.apache.spark.sql.hudi.catalog.HoodieCatalog
spark.kryo.registrator=org.apache.spark.HoodieSparkKryoRegistrar
```

## General Spark Settings for Lake Workloads

| Setting | Suggested | Why |
|---|---|---|
| `spark.sql.adaptive.enabled` | `true` (default in Spark 3.2+) | Coalesces shuffle partitions, handles skew |
| `spark.sql.sources.partitionOverwriteMode` | `dynamic` | `INSERT OVERWRITE` replaces only written partitions |
| `spark.sql.shuffle.partitions` | size to data, or rely on AQE | Controls output file count of shuffles |
| `spark.hadoop.fs.s3a.*` | only for Delta/Hudi on S3A | Iceberg uses its own `S3FileIO` |

## Delta Table Properties

| Property | Default | Notes |
|---|---|---|
| `delta.logRetentionDuration` | `interval 30 days` | How long log entries (time travel metadata) are kept |
| `delta.deletedFileRetentionDuration` | `interval 7 days` | Minimum age before VACUUM deletes files |
| `delta.enableChangeDataFeed` | `false` | Enables CDF for incremental consumers |
| `delta.enableDeletionVectors` | engine-dependent | Faster DELETE/UPDATE/MERGE; readers must support the feature |
| `delta.columnMapping.mode` | `none` | `name` enables rename/drop column |
| `delta.dataSkippingNumIndexedCols` | `32` | Columns with min/max stats |
| `delta.dataSkippingStatsColumns` | unset | Explicit list of stats columns (overrides the count) |
| `delta.appendOnly` | `false` | Block updates/deletes (bronze tables) |
| `delta.checkpointInterval` | version-dependent | Commits between log checkpoints |

Enabling deletion vectors, column mapping or other table features upgrades the protocol; older readers/writers then cannot access the table.

## Iceberg Table Properties

| Property | Default | Notes |
|---|---|---|
| `format-version` | `2` in current releases | v2 adds row-level deletes; v3 adds deletion vectors, row lineage, new types |
| `write.target-file-size-bytes` | `536870912` (512 MB) | Lower (128–256 MB) for streaming or selective queries |
| `write.distribution-mode` | `hash` for partitioned tables in recent versions | `range` for sorted tables, `none` for max throughput |
| `write.delete.mode` / `write.update.mode` / `write.merge.mode` | `copy-on-write` | `merge-on-read` for frequent small changes |
| `write.parquet.compression-codec` | `zstd` (1.4+) | |
| `write.metadata.delete-after-commit.enabled` | `false` | `true` + `write.metadata.previous-versions-max` caps metadata files |
| `history.expire.max-snapshot-age-ms` | 5 days | Used by `expire_snapshots` when no explicit age is passed |
| `history.expire.min-snapshots-to-keep` | `1` | |
| `commit.retry.num-retries` | `4` | Raise for many concurrent writers |
| `write.parquet.bloom-filter-enabled.column.<col>` | `false` | High-cardinality equality lookups |
| `write.metadata.metrics.column.<col>` | `truncate(16)` default mode | `full`, `counts`, `none` per column |

```sql
ALTER TABLE lake.silver.orders SET TBLPROPERTIES (
  'write.merge.mode' = 'merge-on-read',
  'write.target-file-size-bytes' = '268435456',
  'write.metadata.delete-after-commit.enabled' = 'true',
  'write.metadata.previous-versions-max' = '50'
);
ALTER TABLE lake.silver.orders WRITE ORDERED BY customer_id, order_ts;
```

## Hudi Key Write Configs

| Config | Notes |
|---|---|
| `hoodie.datasource.write.table.type` | `COPY_ON_WRITE` (read-optimized) or `MERGE_ON_READ` (write-optimized) |
| `hoodie.datasource.write.recordkey.field` | Primary key column(s) |
| `hoodie.datasource.write.precombine.field` | Ordering field to pick the latest record |
| `hoodie.index.type` | e.g. `BLOOM`, `SIMPLE`, `BUCKET`, `RECORD_INDEX` |
| `hoodie.compact.inline` / `hoodie.compact.inline.max.delta.commits` | MoR compaction scheduling |
| `hoodie.cleaner.commits.retained` | Commits retained by the cleaner (time-travel horizon) |
| `hoodie.parquet.max.file.size` / `hoodie.parquet.small.file.limit` | File sizing |

## Secrets and Credentials
- Prefer catalog credential vending (REST catalog, Unity Catalog, Lake Formation) over static keys in Spark configs.
- Inject client secrets via environment/secret manager; never commit them in `spark-defaults.conf`.
- On AWS use instance/IRSA/Pod Identity roles; on GCP Workload Identity; on Azure managed identity.

## Checklist
- [ ] Format runtime JAR versions match the Spark/Scala version
- [ ] Catalog type supports concurrent commits on the chosen storage
- [ ] Table properties set in DDL, not only session defaults
- [ ] Feature/protocol upgrades checked against every reader
- [ ] No static credentials in configuration files
