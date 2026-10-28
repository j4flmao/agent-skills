# Spark Batch Job Configuration Guide

Key Spark configuration properties for batch jobs: resources, shuffle, adaptive query execution, memory, I/O and table formats. Values shown are starting points to adjust after observing the Spark UI; defaults are noted where relevant. Performance diagnosis and tuning workflow are in `performance_tuning.md`.

## Where Configuration Lives

| Level | Example | Use for |
|-------|---------|---------|
| Cluster / platform defaults | `spark-defaults.conf`, EMR configurations, Databricks cluster policy | Organization-wide settings |
| Job submission | `spark-submit --conf k=v`, job definition JSON | Per-job resources |
| Session runtime | `spark.conf.set("spark.sql.shuffle.partitions", 400)` | SQL settings that may change per step |

Resource settings (executor memory, cores) must be set at submission; changing them in a running session has no effect.

## Resources

```bash
spark-submit \
  --master yarn --deploy-mode cluster \
  --driver-memory 4g \
  --executor-memory 16g \
  --executor-cores 4 \
  --conf spark.executor.memoryOverhead=2g \
  --conf spark.dynamicAllocation.enabled=true \
  --conf spark.dynamicAllocation.minExecutors=2 \
  --conf spark.dynamicAllocation.maxExecutors=50 \
  --conf spark.dynamicAllocation.shuffleTracking.enabled=true \
  jobs/daily_orders.py --run-date 2026-10-26
```

| Property | Default | Guidance |
|----------|---------|----------|
| `spark.executor.cores` | 1 on YARN, all cores in standalone | 4 to 5 is a common balance between parallelism and per-executor overhead |
| `spark.executor.memory` | 1g | Size so `memory + overhead` fits the node/container with room for OS and daemons |
| `spark.executor.memoryOverhead` | max(384 MB, 10% of executor memory) | Increase for PySpark, Arrow, large shuffles, or off-heap use |
| `spark.driver.memory` | 1g | Increase only when collecting results, broadcasting large tables, or planning huge jobs |
| `spark.dynamicAllocation.enabled` | false | Enable for variable stages; on Kubernetes use `shuffleTracking` (no external shuffle service) |

## Shuffle and Parallelism

| Property | Default | Guidance |
|----------|---------|----------|
| `spark.sql.shuffle.partitions` | 200 | With AQE, set high enough for the largest stage and let AQE coalesce |
| `spark.default.parallelism` | Total cores (cluster-dependent) | Affects RDD operations, not DataFrame shuffles |
| `spark.sql.files.maxPartitionBytes` | 128 MB | Input split size for file scans |
| `spark.sql.files.openCostInBytes` | 4 MB | Raise to pack many small files into fewer tasks |

## Adaptive Query Execution (AQE)

AQE is enabled by default since Spark 3.2 and re-optimizes plans at shuffle boundaries using runtime statistics.

| Property | Default | Effect |
|----------|---------|--------|
| `spark.sql.adaptive.enabled` | true | Master switch |
| `spark.sql.adaptive.coalescePartitions.enabled` | true | Merges small shuffle partitions |
| `spark.sql.adaptive.advisoryPartitionSizeInBytes` | 64 MB | Target post-shuffle partition size |
| `spark.sql.adaptive.skewJoin.enabled` | true | Splits skewed partitions in sort-merge joins |
| `spark.sql.adaptive.skewJoin.skewedPartitionFactor` | 5.0 | A partition is skewed if larger than factor x median size and |
| `spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes` | 256 MB | larger than this threshold |
| `spark.sql.adaptive.autoBroadcastJoinThreshold` | Same as `spark.sql.autoBroadcastJoinThreshold` | Runtime conversion to broadcast joins |

## Joins and Broadcast

| Property | Default | Guidance |
|----------|---------|----------|
| `spark.sql.autoBroadcastJoinThreshold` | 10 MB | Raise (for example 64 to 256 MB) if executors and driver have memory; `-1` disables |
| `spark.sql.broadcastTimeout` | 300 s | Increase if large broadcasts time out; better to reduce broadcast size |

## Memory Management

| Property | Default | Notes |
|----------|---------|-------|
| `spark.memory.fraction` | 0.6 | Share of heap (minus 300 MB reserved) for execution + storage |
| `spark.memory.storageFraction` | 0.5 | Portion of the above protected for cached data |
| `spark.sql.execution.arrow.pyspark.enabled` | false | Enable for faster `toPandas()` / `createDataFrame(pandas_df)` |
| `spark.sql.execution.arrow.maxRecordsPerBatch` | 10000 | Lower if pandas UDFs hit memory limits |

## I/O, Formats and Object Storage

| Property | Purpose |
|----------|---------|
| `spark.sql.parquet.compression.codec` (default `snappy`) | `zstd` gives better ratio at similar speed for many datasets |
| `spark.sql.sources.partitionOverwriteMode` = `dynamic` | Overwrite only partitions present in output |
| `spark.sql.parquet.filterPushdown` (default true) | Predicate pushdown into Parquet |
| `spark.hadoop.fs.s3a.connection.maximum` | Raise for high-parallelism S3A jobs |
| `spark.hadoop.fs.s3a.committer.name` = `magic` or `directory` | S3A committers avoid slow, unsafe rename-based commits on S3 |
| `spark.sql.session.timeZone` = `UTC` | Consistent timestamp semantics |

On EMR use the EMRFS S3-optimized committer (default for Parquet); table formats (Delta, Iceberg, Hudi) handle commits themselves.

## Table Format Extensions

```bash
# Apache Iceberg with a REST catalog
--packages org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:<version>
--conf spark.sql.extensions=org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions
--conf spark.sql.catalog.lake=org.apache.iceberg.spark.SparkCatalog
--conf spark.sql.catalog.lake.type=rest
--conf spark.sql.catalog.lake.uri=https://catalog.example.com

# Delta Lake (OSS)
--packages io.delta:delta-spark_2.12:<version>
--conf spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension
--conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog
```

Match the runtime artifact to your Spark and Scala versions (Spark 4.x uses Scala 2.13 artifacts).

## Spark on Kubernetes Specifics

| Property | Purpose |
|----------|---------|
| `spark.kubernetes.container.image` | Job image (pin a version) |
| `spark.kubernetes.namespace` | Target namespace |
| `spark.kubernetes.authenticate.driver.serviceAccountName` | Driver service account with pod create rights |
| `spark.kubernetes.executor.request.cores` / `limit.cores` | CPU requests separate from `executor.cores` |
| `spark.kubernetes.node.selector.*`, pod templates | Placement on spot / specific node pools |
| `spark.decommission.enabled` | Graceful executor decommissioning (useful with spot) |

## Configuration Hygiene

- Keep job configs in version control next to job code; review changes like code.
- Avoid copying large lists of settings from blog posts: each setting should have a reason recorded.
- Log effective configuration at job start (`spark.sparkContext.getConf().getAll()`) minus secrets.
- Never put credentials in `--conf` values visible in the UI and logs; use instance roles, workload identity, or secret managers (Spark redacts keys matching `spark.redaction.regex`, but do not rely on it).

## Checklist

- [ ] Executor size fits nodes including overhead
- [ ] AQE enabled; shuffle partitions sized for the largest stage
- [ ] Broadcast threshold matched to memory
- [ ] Safe output committer for object storage, or a table format
- [ ] Session time zone fixed to UTC
- [ ] Configs versioned with code; no secrets in configuration
