# Write-Path Performance Tuning

Making ingestion, MERGE and overwrite jobs faster and cheaper on lake tables: output file control, shuffle/distribution, MERGE optimization, CoW vs MoR trade-offs and object-store throughput.

## Where Write Time Goes

| Phase | Symptom | Lever |
|---|---|---|
| Reading the target for MERGE | Full scan of target | Partition/cluster predicates in the ON clause |
| Shuffle | Large shuffle write, spill | Distribution mode, AQE, partition count |
| Writing files | Many tiny files, slow tasks | Target file size, distribution, fewer output partitions per task |
| Rewriting unchanged rows | CoW MERGE rewrites big files | MoR / deletion vectors, smaller files |
| Commit | Long commit, retries | Fewer concurrent writers, manifest maintenance |

## Controlling Output Files

Iceberg:

```sql
ALTER TABLE lake.silver.orders SET TBLPROPERTIES (
  'write.distribution-mode' = 'hash',          -- one writer per partition: fewer files
  'write.target-file-size-bytes' = '268435456'
);
```

Spark settings that interact:
- `spark.sql.adaptive.enabled=true` and `spark.sql.adaptive.advisoryPartitionSizeInBytes` steer post-shuffle task sizes, which bound file sizes.
- Iceberg Spark writes request a distribution/ordering from Spark; avoid manual `repartition()` that conflicts with it.

Delta:
- Optimized writes (`delta.autoOptimize.optimizeWrite=true` on Databricks; `spark.databricks.delta.optimizeWrite.enabled` in recent OSS Delta) add a shuffle to produce fewer, larger files.
- Auto compaction (`delta.autoOptimize.autoCompact`) compacts small files after writes where supported.

Hudi:
- `hoodie.parquet.small.file.limit` lets inserts pad existing small files; `hoodie.parquet.max.file.size` caps them.
- `bulk_insert` for initial loads (no index lookup, sort modes via `hoodie.bulkinsert.sort.mode`).

## MERGE Optimization

1. Dedupe the source per key first.
2. Constrain the target scan with partition/cluster predicates:

```sql
MERGE INTO lake.silver.orders t
USING staged s
ON t.order_id = s.order_id
   AND t.order_date >= DATE '2026-10-20'          -- target pruning; source only covers recent dates
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

3. Choose write mode by change rate:

| Change pattern | Mode |
|---|---|
| Few large batch updates, read-heavy | Copy-on-write |
| Frequent small updates/deletes | Merge-on-read (Iceberg), deletion vectors (Delta), MoR (Hudi) |

4. Cluster the target by the merge key (or a bucket of it) so matched rows sit in few files.
5. Hudi: choose the index (`BUCKET` for fixed-size keyed tables, `RECORD_INDEX` for global key lookups in newer versions) to avoid scanning for keys.

## Overwrite Patterns

- `INSERT OVERWRITE` with `spark.sql.sources.partitionOverwriteMode=dynamic` replaces only touched partitions.
- Iceberg `writeTo(t).overwritePartitions()` is the DataFrame equivalent.
- Delta `replaceWhere` replaces rows matching a predicate atomically:

```python
(df.write.format("delta").mode("overwrite")
   .option("replaceWhere", "order_date >= '2026-10-20' AND order_date < '2026-10-27'")
   .saveAsTable("lake.gold.daily_revenue"))
```

## Concurrency

- Parallel writers to disjoint partitions are fine; to the same partitions they conflict.
- Serialize writers per table through the orchestrator, or use MERGE predicates that make Delta's conflict detection see disjoint partitions.
- Compaction concurrent with writers: restrict to cold partitions.

## Object Storage Throughput

- S3 scales request rates per prefix; large numbers of small files raise request cost more than bandwidth.
- Iceberg `write.object-storage.enabled=true` adds hash components to file paths to spread load across prefixes (useful for very high write rates).
- Use the format's native IO (Iceberg `S3FileIO`) and multipart uploads; avoid rename-based committers.

## Streaming Writes

- Trigger interval sets commit rate and file size; minute-level triggers are a common balance.
- `trigger(availableNow=True)` for incremental batch processing on a schedule.
- Keep stateful logic before the sink lean; use `foreachBatch` MERGE only when upserts are needed.

## Measuring

Track per job: input rows, files written, average file size, bytes shuffled, MERGE matched/inserted/deleted counts (Delta `operationMetrics` in history; Iceberg snapshot summary), commit duration and retries.

## Pitfalls
- `coalesce(1)` to "fix" small files: one task does all writing.
- Repartitioning by a high-cardinality key before writing a date-partitioned table.
- CoW on tables with constant tiny updates: rewriting GBs per change.
- MERGE without target predicates scanning the entire history.

## Checklist
- [ ] Distribution mode and target file size set on the table
- [ ] Source deduped and MERGE constrained by partition/cluster predicates
- [ ] Write mode (CoW/MoR) chosen from change rate
- [ ] Writers per table serialized or partition-disjoint
- [ ] Per-job write metrics recorded
