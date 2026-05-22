# Spark Execution Model Reference

## Driver and Executor Lifecycle

```
1. Client submits application (spark-submit)
2. Driver starts on cluster (cluster mode) or client machine (client mode)
3. Driver registers with cluster manager (YARN/K8s/Standalone)
4. Cluster manager allocates executor containers
5. Executor JVMs start, register with driver
6. Driver runs main() -> SparkContext -> DAGScheduler
7. Action triggers job: DAGScheduler builds DAG of stages
8. Each stage: TaskScheduler creates tasks, sends to executors
9. Executors run tasks, result serialized back to driver
10. Application completes, driver exits, cluster manager releases resources
```

## DAG Scheduler

```
DAGScheduler phases:
  RDD lineage -> stages (shuffle boundaries) -> tasks per partition

  Action (count/save/collect):
    -> Stage 0: map (no shuffle, narrow dependencies)
       Tasks: process each partition, shuffle write
    -> Stage 1: reduceByKey (shuffle, wide dependency)
       Tasks: shuffle read, aggregate by key, shuffle write
    -> Stage 2: map + collect (narrow)
       Tasks: process, return results

  Stage boundary = when shuffle occurs (wide dependency)
  Narrow dep: map, filter, union (partition stays on same executor)
  Wide dep: reduceByKey, groupBy, join (repartition across executors)
```

## Shuffle Internals

```
Shuffle write (Spark 3.x):
  Each map task writes:
    - data files:   shuffle_${id}_${mapId}_${reduceId}.data
    - index files:  shuffle_${id}_${mapId}_${reduceId}.index
  Files written to spark.local.dir (local disk, not HDFS)

Shuffle read:
  Reducer fetches its partition from each mapper
  fetch.wait: timeout for blocking fetch (default 60s)
  maxSizeInFlight: max bytes fetched concurrently (default 48MB)

External shuffle service:
  Runs on each node, serves shuffle data independent of executors
  Required for dynamic allocation (executors may be removed mid-job)
  Configure: spark.shuffle.service.enabled=true
```

## Memory Management Tuning

```properties
# Production tuning (16GB executor, 4 cores)
spark.executor.memory: 16g
spark.executor.cores: 4
spark.executor.memoryOverhead: 2048m   # 12.5% of executor memory
spark.memory.fraction: 0.6              # unified pool fraction
spark.memory.storageFraction: 0.5       # within unified, storage gets 50%
spark.sql.codegen.wholeStage: true
spark.sql.adaptive.enabled: true
spark.sql.adaptive.coalescePartitions.enabled: true

# Executor calculation for 8-node cluster, 64GB RAM, 16 cores each:
#   Reserved for OS: 8GB -> 56GB per node
#   Executor memory: 56GB * 0.8 = 44.8GB -> 42GB per executor
#   Cores per executor: 5 (leave 1 for NM/OS)
#   Executors per node: 1
#   Total executors: 8 * 1 = 8 (minus 1 for AM = 7)
#   spark.executor.memory = 42g
#   spark.executor.cores = 5
#   spark.executor.memoryOverhead = 4200m
#   spark.default.parallelism = 7 * 5 * 3 = 105
```

## Dynamic Allocation

```properties
spark.dynamicAllocation.enabled: true
spark.dynamicAllocation.minExecutors: 1
spark.dynamicAllocation.maxExecutors: 20
spark.dynamicAllocation.initialExecutors: 5
spark.dynamicAllocation.executorIdleTimeout: 60s
spark.dynamicAllocation.cachedExecutorIdleTimeout: infinity
spark.shuffle.service.enabled: true  # required
```

## Broadcast Join Tuning

```properties
spark.sql.autoBroadcastJoinThreshold: 10485760  # 10MB, increase to 100MB
spark.sql.broadcastTimeout: 600                  # 10min timeout for broadcast

# Manual hint for large dimension tables
SELECT /*+ BROADCAST(dim) */ *
FROM fact f JOIN dim d ON f.key = d.key
```

## Performance Anti-Patterns

```
1. countDistinct on high-cardinality column
   Fix: approximate_count_distinct (HyperLogLog)

2. UDF with deserialization (DataFrame -> row field -> Scala)
   Fix: use native Spark SQL functions, or UDF with SQL expressions

3. Multiple actions on same DataFrame (each action recomputes lineage)
   Fix: cache/persist the DataFrame

4. Too many shuffle partitions (default 200)
   Fix: spark.sql.shuffle.partitions = 3 * cores * executors

5. Large RDD lineage (1000+ stages due to iterative algorithms)
   Fix: checkpoint every N iterations

6. Object overhead in Dataset (serialization round-trip for complex types)
   Fix: use DataFrame (Tungsten rows) instead of typed Dataset
```
