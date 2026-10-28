# Lakehouse Configuration Guide: Spark Sessions, Catalogs, Table Properties

Configuration needed to run Spark against Iceberg and Delta tables, the table properties that matter most, and their defaults. Catalog products are compared in `lakehouse-catalog-integration.md`; performance knobs are in `performance_tuning.md`.

## 1. Spark + Iceberg

Package: `org.apache.iceberg:iceberg-spark-runtime-<spark>_<scala>:<version>` (e.g. `iceberg-spark-runtime-3.5_2.12`), plus `iceberg-aws-bundle` for S3/Glue or the GCP/Azure bundle for those clouds.

```properties
spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions

# REST catalog (Polaris, Lakekeeper, Unity Catalog's Iceberg endpoint, S3 Tables, Nessie)
spark.sql.catalog.lake=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.lake.type=rest
spark.sql.catalog.lake.uri=https://catalog.example.com/api/catalog
spark.sql.catalog.lake.warehouse=analytics
spark.sql.catalog.lake.credential=${CLIENT_ID}:${CLIENT_SECRET}
spark.sql.catalog.lake.header.X-Iceberg-Access-Delegation=vended-credentials

# AWS Glue catalog
spark.sql.catalog.glue=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.glue.catalog-impl=org.apache.iceberg.aws.glue.GlueCatalog
spark.sql.catalog.glue.warehouse=s3://lake-warehouse/
spark.sql.catalog.glue.io-impl=org.apache.iceberg.aws.s3.S3FileIO

# Hive Metastore
spark.sql.catalog.hms=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.hms.type=hive
spark.sql.catalog.hms.uri=thrift://metastore:9083

spark.sql.defaultCatalog=lake
```

Credentials for the REST catalog come from environment or a secret manager at submit time; do not commit them.

## 2. Spark + Delta Lake

Package: `io.delta:delta-spark_2.12:<version>` matching the Spark version (see the Delta release compatibility table).

```properties
spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension
spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog
```

```python
from pyspark.sql import SparkSession
from delta import configure_spark_with_delta_pip

builder = (SparkSession.builder.appName("silver-orders")
           .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
           .config("spark.sql.catalog.spark_catalog",
                   "org.apache.spark.sql.delta.catalog.DeltaCatalog"))
spark = configure_spark_with_delta_pip(builder).getOrCreate()
```

On Databricks these are preconfigured and Unity Catalog provides the catalog.

## 3. Iceberg Table Properties

| Property | Default | Notes |
|---|---|---|
| `format-version` | 2 (Iceberg 1.4+) | v2 enables row-level deletes; v3 adds deletion vectors, row lineage, new types |
| `write.format.default` | `parquet` | `orc`, `avro` also supported |
| `write.parquet.compression-codec` | `zstd` (1.4+) | `snappy` for faster writes |
| `write.target-file-size-bytes` | 536870912 (512 MB) | lower for streaming/small tables |
| `write.distribution-mode` | `hash` for partitioned tables in recent Spark integrations | `none`, `hash`, `range` |
| `write.delete.mode` / `update.mode` / `merge.mode` | `copy-on-write` | `merge-on-read` for frequent changes |
| `commit.retry.num-retries` | 4 | raise for concurrent writers |
| `commit.retry.min-wait-ms` / `max-wait-ms` | 100 / 60000 | backoff between commit attempts |
| `history.expire.max-snapshot-age-ms` | 432000000 (5 days) | used by `expire_snapshots` when no `older_than` |
| `history.expire.min-snapshots-to-keep` | 1 | |
| `write.metadata.delete-after-commit.enabled` | false | set true to cap old `metadata.json` files |
| `write.metadata.previous-versions-max` | 100 | how many old metadata files to keep |
| `write.metadata.metrics.default` | `truncate(16)` | per-column stats for file skipping |
| `write.parquet.bloom-filter-enabled.column.<col>` | false | for high-cardinality equality lookups |
| `write.wap.enabled` | false | write-audit-publish via `spark.wap.id` |

Defaults change between releases; confirm against the configuration page for the deployed Iceberg version.

## 4. Delta Table Properties

| Property | Default | Notes |
|---|---|---|
| `delta.logRetentionDuration` | `interval 30 days` | how long commit history (time travel metadata) is kept |
| `delta.deletedFileRetentionDuration` | `interval 1 week` | minimum age before `VACUUM` deletes files |
| `delta.enableDeletionVectors` | false in OSS (on by default for new tables on Databricks) | MoR-style deletes |
| `delta.enableChangeDataFeed` | false | required for `table_changes` / CDF reads |
| `delta.columnMapping.mode` | `none` | `name` enables rename/drop column |
| `delta.dataSkippingNumIndexedCols` | 32 | stats collected on the first N columns |
| `delta.dataSkippingStatsColumns` | unset | explicit list overrides the N-column rule |
| `delta.appendOnly` | false | blocks updates/deletes |
| `delta.checkpointInterval` | 10 (commits) | checkpoint frequency for the log |
| `delta.targetFileSize` | engine-dependent | target size for OPTIMIZE / writes where supported |

Enabling features such as deletion vectors or column mapping upgrades reader/writer protocol versions. Check every reader (Trino, DuckDB, Snowflake, older Spark) supports the new table features first.

## 5. Object Storage Settings

```properties
# Iceberg S3FileIO
spark.sql.catalog.lake.s3.sse.type=kms
spark.sql.catalog.lake.s3.sse.key=arn:aws:kms:eu-west-1:111122223333:key/abcd-...
spark.sql.catalog.lake.s3.path-style-access=true      # MinIO / some S3-compatible stores
spark.sql.catalog.lake.s3.endpoint=http://minio:9000  # local dev only

# Hadoop S3A (Delta, Hive tables)
spark.hadoop.fs.s3a.aws.credentials.provider=software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
spark.hadoop.fs.s3a.connection.maximum=200
```

Delta OSS on S3 with concurrent writers from multiple clusters needs the DynamoDB-backed `S3DynamoDBLogStore` (Databricks provides its own commit service); single-cluster writers are safe with the default store. Iceberg relies on the catalog for atomic commits.

## Pitfalls

- Mismatched runtime JAR and Spark minor version: class-loading errors at startup.
- Configuring a catalog named `spark_catalog` for Iceberg without `SparkSessionCatalog` breaks non-Iceberg tables in the same session.
- Setting properties at session level when they belong on the table: other writers do not see them.
- Enabling a Delta table feature that downstream readers cannot read.

## Checklist

- [ ] Runtime/library versions pinned and compatible with the Spark version.
- [ ] Catalog credentials injected at runtime; vended credentials preferred.
- [ ] Critical table properties set in DDL, not left to defaults.
- [ ] Retention properties agree with time-travel and compliance requirements.
- [ ] Reader compatibility verified before protocol upgrades.
