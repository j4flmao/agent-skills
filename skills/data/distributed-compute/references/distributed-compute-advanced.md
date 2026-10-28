# Advanced Distributed Compute: Skew, Joins, Adaptive Execution, Autoscaling, Cost

Techniques for making large distributed jobs fast and economical once the fundamentals are in place: diagnosing and fixing skew, join strategy selection, adaptive query execution, shuffle infrastructure, autoscaling, spot capacity, and Ray/Dask-specific patterns.

## Diagnosing a Slow Job

| Symptom in UI | Likely cause | Action |
|---------------|--------------|--------|
| One or few tasks run much longer than median | Data skew | Skew handling below |
| High spill (memory/disk) | Partitions too large, wide aggregations | More partitions, more memory per task |
| Long GC time | Large JVM heaps with many objects, caching too much | Tune memory, reduce cached data, use off-heap/columnar formats |
| Huge shuffle read/write | Joins/aggregations on large data | Broadcast, pre-aggregation, bucketing |
| Many tiny tasks | Over-partitioning, small files | Coalesce, compact input |
| Executors idle | Too few partitions or driver bottleneck | Increase parallelism; avoid driver-side loops |

## Data Skew

Detect: compare max vs median task duration and shuffle read size; count rows per key.

```python
df.groupBy("customer_id").count().orderBy("count", ascending=False).show(20)
```

Fixes:

1. Spark AQE skew join (Spark 3.x):

```properties
spark.sql.adaptive.enabled=true
spark.sql.adaptive.skewJoin.enabled=true
spark.sql.adaptive.skewJoin.skewedPartitionFactor=5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes=256MB
```

2. Salting hot keys manually:

```python
from pyspark.sql import functions as F
SALT = 16
big = big.withColumn("salt", (F.rand(seed=7) * SALT).cast("int"))
small = small.withColumn("salt", F.explode(F.array([F.lit(i) for i in range(SALT)])))
joined = big.join(small, ["key", "salt"]).drop("salt")
```

3. Two-phase aggregation: aggregate by `(key, salt)` first, then by `key`.
4. Handle null or default keys separately (a common source of skew).
5. Isolate the few hot keys and process them with a broadcast path.

## Join Strategies

| Strategy | When | Notes |
|----------|------|-------|
| Broadcast hash join | One side small (fits in executor memory) | No shuffle of large side; Spark `spark.sql.autoBroadcastJoinThreshold` (default 10 MB) or `F.broadcast(df)` hint |
| Shuffle hash join | Medium sides, one smaller | Hash table per partition |
| Sort-merge join | Both large | Default in Spark for large equi-joins; sorts both sides |
| Bucketed join | Repeated joins on same key | Tables bucketed identically avoid shuffle at join time |
| Storage-partitioned join | Iceberg/Delta tables partitioned on join keys | Spark 3.3+ can skip shuffles when layouts match |

Check the physical plan (`df.explain("formatted")`) to confirm the chosen strategy.

## Adaptive Query Execution (Spark)

AQE re-optimizes at stage boundaries using runtime statistics:
- Coalesces small shuffle partitions (`spark.sql.adaptive.coalescePartitions.enabled`).
- Switches sort-merge to broadcast join when a side turns out small.
- Splits skewed partitions.

Set a generous initial `spark.sql.shuffle.partitions` and let AQE coalesce, or use `spark.sql.adaptive.advisoryPartitionSizeInBytes` to target partition size.

## Shuffle Infrastructure

- Dynamic allocation needs shuffle data to outlive executors: external shuffle service on YARN, or shuffle tracking (`spark.dynamicAllocation.shuffleTracking.enabled=true`) on Kubernetes.
- Remote shuffle services (Apache Celeborn, Apache Uniffle) decouple shuffle storage from executors, improving stability with spot instances and autoscaling.
- Fast local disks (NVMe) for shuffle spill matter more than CPU for shuffle-heavy jobs.

## Autoscaling and Spot Capacity

| Practice | Reason |
|----------|--------|
| Driver/head node on on-demand capacity | Losing it fails the job |
| Executors/workers on spot with diversified instance types | Cost savings with acceptable interruption |
| Decommissioning support (Spark graceful decommission, migrating shuffle/cached blocks) | Reduce recompute on preemption |
| Upper bounds on autoscaling | Cost control |
| Checkpoint long streaming/iterative jobs | Bounded recovery time |

## Caching and Persistence

- Cache only when reused at least twice and expensive to recompute.
- Prefer `MEMORY_AND_DISK` for large reuse; unpersist when done.
- For iterative ML, `checkpoint()` truncates lineage to avoid ever-growing plans.

## Python Performance

- Use native column expressions; avoid row-wise Python UDFs.
- When Python is needed, use Arrow-based pandas UDFs / `mapInPandas` / `applyInPandas` (enable `spark.sql.execution.arrow.pyspark.enabled`).
- Spark Connect separates client and server, useful for remote notebooks and multi-language clients.

## Ray-Specific Patterns

```python
import ray
ray.init()

@ray.remote(num_cpus=1)
def preprocess(batch_path: str) -> str:
    out_path = transform(batch_path)   # write result to object storage
    return out_path                    # return references/paths, not large objects

refs = [preprocess.remote(p) for p in input_paths]
results = ray.get(refs)
```

- Pass large data via the object store (`ray.put`) or storage paths; avoid returning huge objects repeatedly.
- Use Ray Data for streaming batch inference across CPU preprocessing and GPU model stages (`map_batches` with actor pools).
- Bound in-flight tasks (`ray.wait`) to avoid flooding the object store.
- Set resource requirements (`num_gpus`, custom resources) so the scheduler places tasks correctly.

## Dask-Specific Patterns

- Partition sizes around 100 MB; `df.repartition(partition_size="100MB")`.
- Use `persist()` for reuse on the cluster; avoid `compute()` on large intermediates.
- Prefer Parquet with `pyarrow` engine and filters for pushdown.
- Watch the dashboard task stream for long gray (communication) bars.

## Cost Engineering

- Measure cost per job run (cluster-hours x price) and per TB processed; track over time.
- Right-size: many jobs are I/O-bound; more cores do not help.
- Prune input: partition filters, column projection, incremental processing of only new partitions.
- Use table-format compaction and clustering (Z-order, Iceberg sort orders) to reduce scanned data.
- Consider native vectorized engines (Databricks Photon, Apache Gluten/Velox, DataFusion Comet) where supported; benchmark on your workloads.

## Checklist

- [ ] Task duration distribution checked for skew
- [ ] AQE enabled; join strategies confirmed in plan
- [ ] Salting or isolation for persistent hot keys
- [ ] Shuffle durability compatible with autoscaling/spot
- [ ] Python logic vectorized via Arrow
- [ ] Caching deliberate; lineage truncated for iterative jobs
- [ ] Cost per run tracked and input pruning applied
