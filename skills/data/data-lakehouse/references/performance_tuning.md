# Lakehouse Write Job Performance Tuning

Tuning Spark (and Flink) jobs that write to lakehouse tables: cluster sizing, shuffle and write distribution, MERGE performance, and streaming throughput. Read-side tuning is in `performance-optimization.md`.

## 1. Where Write Time Goes

| Phase | Symptom of trouble | Typical fix |
|---|---|---|
| Source read | Many small input files, slow listing | Compact sources, use file notification / incremental listing |
| Transform/shuffle | Large shuffle, spills, skewed tasks | AQE, partition counts, salting, broadcast |
| Write distribution | Thousands of small output files or one huge task | Set distribution mode and sort order |
| MERGE scan | Full target scan for small change sets | Partition predicates, clustering on merge key, MoR |
| Commit | Retries, long commit times | Fewer concurrent writers, smaller metadata, partial progress |

## 2. Cluster Sizing Basics (Spark)

- Executors with 4–8 cores and memory per core around 4–8 GB are a common starting point; measure spill and GC and adjust.
- `spark.sql.shuffle.partitions` (default 200) is too low for large jobs and too high for small ones; with AQE enabled, set a generous number and let `spark.sql.adaptive.coalescePartitions.enabled` shrink it. Advisory size: `spark.sql.adaptive.advisoryPartitionSizeInBytes` (default 64 MB).
- Use autoscaling or serverless for spiky batch; fixed clusters for steady streams.
- Spot/preemptible instances suit stateless batch; for long MERGE jobs enable decommissioning (`spark.decommission.enabled`) to reduce recomputation.

## 3. Write Distribution (Iceberg)

| `write.distribution-mode` | Behaviour | Use |
|---|---|---|
| `none` | Write directly from task layout | Data already clustered; very small writes |
| `hash` | Shuffle by partition key before write | Default for partitioned tables; avoids many files per partition |
| `range` | Range-partition by sort order | Tables with a sort order; produces well-clustered files |

```sql
ALTER TABLE lake.silver.events SET TBLPROPERTIES ('write.distribution-mode' = 'hash');
ALTER TABLE lake.silver.events WRITE DISTRIBUTED BY PARTITION LOCALLY ORDERED BY user_id;
```

`spark.sql.iceberg.distribution-mode` and write option `distribution-mode` override per job. Spark's AQE may coalesce the requested shuffle; Iceberg sets an advisory partition size based on target file size in recent versions.

Delta: optimized writes (`delta.autoOptimize.optimizeWrite` / `spark.databricks.delta.optimizeWrite.enabled` on Databricks) add a shuffle to produce larger files; OSS Delta has `optimizeWrite` support in recent versions.

## 4. MERGE Performance

```sql
MERGE INTO lake.silver.orders t
USING staged s
ON t.order_id = s.order_id
   AND t.order_date >= DATE '2026-10-20'          -- bound target scan to affected range
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

- Bound the target with predicates derived from the source (`min/max` of source dates); compute them first and inject literals so pruning works at planning time.
- Cluster or sort the target on the merge key so matched rows sit in few files.
- Use merge-on-read (Iceberg) or deletion vectors (Delta) for frequent small merges; compact later.
- Deduplicate and repartition the source to a sensible size before merging; a huge source with tiny target changes wastes shuffle.
- Delta low-shuffle merge (Databricks) and Iceberg MoR reduce rewrite of unmodified rows.

## 5. Skew

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionFactor", "5")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes", "256MB")
```

When AQE cannot fix it (e.g. skew in aggregations or writes to one partition), salt the key:

```python
salted = df.withColumn("salt", (F.rand(seed=7) * 16).cast("int"))
partial = salted.groupBy("tenant_id", "salt").agg(F.sum("amount").alias("amt"))
result = partial.groupBy("tenant_id").agg(F.sum("amt").alias("amount"))
```

## 6. Streaming Throughput

| Lever | Spark Structured Streaming | Flink |
|---|---|---|
| Batch/commit size | `trigger(processingTime=...)`, `maxOffsetsPerTrigger`, `maxFilesPerTrigger` | Checkpoint interval |
| Parallelism | Kafka partitions, `minPartitions` | Operator parallelism, Kafka partitions |
| State | RocksDB state store (`spark.sql.streaming.stateStore.providerClass`) for large state | RocksDB state backend, incremental checkpoints |
| Output files | Fanout writer, compaction afterwards | Iceberg sink write parallelism, compaction |

Watch processing rate vs input rate in `StreamingQueryProgress`; sustained input > processing means lag grows.

## 7. Object Storage Throughput

- S3 scales request rate per prefix; Iceberg's `write.object-storage.enabled=true` adds hash prefixes to data file paths to spread load.
- Increase connection pools (`fs.s3a.connection.maximum`, Iceberg `http-client.*` settings) for high-parallelism jobs.
- Retry on 503 SlowDown with backoff (S3A and S3FileIO do this by default; tune retry counts if throttling is frequent).

## 8. Measuring

- Spark UI: stage durations, shuffle read/write, spill, task time distribution (max vs median shows skew).
- Iceberg commit metrics (`CommitReport`) and Delta `operationMetrics` for files and bytes written.
- Track job runtime and cost per run; regressions often follow data growth, not code changes.

## Pitfalls

- Disabling AQE to "stabilize" plans, then hand-tuning partitions per job.
- `repartition(1)` or `coalesce(1)` before writing large data: one task writes everything.
- MERGE without target predicates on multi-TB tables.
- Scaling cluster size to fix skew; skew needs data-level fixes.

## Checklist

- [ ] AQE on; shuffle partitions sensible for data size.
- [ ] Distribution mode and sort order set per table.
- [ ] MERGE bounded by predicates; target clustered on key.
- [ ] Streaming rate and lag monitored.
- [ ] Runtime and cost per job tracked across releases.
