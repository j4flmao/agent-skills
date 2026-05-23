---
name: data-distributed-compute
description: >
  Use this skill when designing distributed compute for Hadoop MapReduce, Spark, Dask, Ray, YARN, or K8s resource management. This skill enforces: execution model selection, cluster topology, shuffle optimization, data locality, speculative execution, and resource tuning. Do NOT use for: single-node compute, GPU-only training, or SQL-only batch queries (see data-batch-processing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, compute, distributed, phase-11]
---

# Data Distributed Compute

## Purpose
Design and tune distributed compute systems for large-scale data processing. Select the right framework (Spark, Dask, Ray, MapReduce), configure YARN/K8s resource management, optimize shuffle and data locality, and tune executors for throughput.

## Agent Protocol

### Trigger
Exact user phrases: "Hadoop MapReduce", "Spark", "Dask", "Ray", "YARN", "cluster computing", "resource manager", "shuffle", "data locality", "executor", "worker", "task scheduling", "distributed compute", "cluster mode", "dynamic allocation", "speculative execution".

### Input Context
Before activating, verify:
- Compute framework preference (Spark, Dask, Ray, MapReduce)
- Data size and shape (TB per run, row counts, join complexity)
- Cluster size and resource per node (cores, memory, network)
- Workload type (batch ETL, ML training, real-time inference, iterative algorithms)
- Storage backend (HDFS, S3, local SSD)
- Scheduling layer (YARN, K8s, standalone)

### Output Artifact
Distributed compute architecture with framework selection, cluster configuration, and tuning parameters.

### Response Format
```
Compute Framework: {Spark | Dask | Ray | MapReduce}
Cluster Mode: {YARN | K8s | Standalone | Slurm}
Execution Model: {driver-executor | scheduler-worker | GCS}
Resource: {N executors x M cores x G memory}
Shuffle: {sort-based | hash-based | external}
Locality: {PROCESS_LOCAL | NODE_LOCAL | RACK_LOCAL | ANY}
```
```yaml
# spark-submit or Ray cluster config
# Tuning parameters
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Framework selected with trade-off analysis
- [ ] Cluster resource config calculated (executors, cores, memory, overhead)
- [ ] Shuffle strategy defined with spill/tune settings
- [ ] Data locality configuration set
- [ ] Speculative execution policy defined
- [ ] Dynamic allocation or static partitioning configured
- [ ] Memory management plan (execution vs storage) documented

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Choose Compute Framework
```
Spark:         In-memory batch + streaming, SQL, ML, graph. Mature, richest ecosystem.
              Best for: ETL, SQL analytics, streaming, ML pipelines (5min+ batches)
              Not ideal for: sub-second latency, Python-only teams

Dask:         Python-native parallel computing. Scheduler + workers. Task graph auto-parallelized.
              Best for: NumPy/Pandas at scale, custom Python logic, ML preprocessing
              Not ideal for: Java/Scala shops, strict ACID, streaming

Ray:          Distributed AI framework. Remote functions (tasks) + actors.
              Best for: RL, model serving, hyperparameter tuning, distributed training
              Not ideal for: SQL, batch ETL, traditional BI

MapReduce:    Disk-based, Java, high latency. Legacy.
              Best for: compatibility with old Hadoop clusters, simple aggregation
              Not ideal for: anything new — use Spark instead
```

### Step 2: Resource Management — YARN
YARN ResourceManager (RM): global scheduler, allocates containers. NodeManager (NM): per-node agent, launches containers, reports resources. ApplicationMaster (AM): per-app, negotiates resources, runs DAG.

```
                    +---+
          RM <- ZK | RM | RM <- ZK (HA pair)
                    +-+-+
         +-----------+ +-----------+
         v                         v
   +-----+------+           +-----+------+
   | NM node1    |           | NM node2    |
   | Container   |           | Container   |
   | Container   |           | Container   |
   | AM (driver) |           |             |
   +------------+            +------------+

YARN memory: yarn.nodemanager.resource.memory-mb = node total - OS overhead
YARN vcores: yarn.nodemanager.resource.cpu-vcores = physical cores (or 1.5x for hyperthread)
```

### Step 3: Spark Execution Model
Driver: runs main() and SparkContext, schedules tasks via DAGScheduler. DAGScheduler: builds stage DAG, splits into tasks. TaskScheduler: launches tasks on executors via cluster manager. Executors: run tasks, cache data, return results. SchedulerBackend: communicates with cluster manager.

```
Driver JVM:
  +-------------------+
  | SparkContext       |
  | DAGScheduler       |  -> Stage boundary at shuffle
  | TaskScheduler      |
  | SchedulerBackend   |
  +-------------------+
       |
       | launch tasks
       v
+-------+-------+   +-------+-------+
| Executor       |   | Executor       |
| Cache Manager  |   | Cache Manager  |
| BlockManager   |   | BlockManager   |
| Task (thread)  |   | Task (thread)  |
| Task (thread)  |   | Task (thread)  |
+---------------+   +---------------+
```

### Step 4: Shuffle Optimization
Sort-based shuffle: default since Spark 1.2, writes sorted files per partition, merges in fetch. Tungsten shuffle: unsafe row-based, off-heap, avoids serialization for simple types. Shuffle spill: when memory > spark.shuffle.memoryFraction (0.2 of execution memory). Tuning: increase spark.shuffle.partitions (default 200, tune to 2-3x cores). Enable shuffle compression: true (snappy or lz4). Reduce shuffle blocks: coalesce or repartition after shuffle.

```
Before shuffle:
  Stage N partitions (P1, P2) -> map output -> shuffle write -> sorted files per partition

Shuffle read:
  Stage N+1 fetches files from Stage N mappers
  P1 fetches: mapper1/data_P1, mapper2/data_P1 (HTTP or external shuffle service)
  P2 fetches: mapper1/data_P2, mapper2/data_P2

Tuning:
  spark.shuffle.file.buffer: 32k -> 64k (reduce disk seeks)
  spark.shuffle.spill.compress: true
  spark.shuffle.service.enabled: true (dynamic allocation)
  spark.reducer.maxSizeInFlight: 48m -> 96m (increase for better throughput)
```

### Step 5: Data Locality
Locality levels: PROCESS_LOCAL (same JVM), NODE_LOCAL (same host), RACK_LOCAL (same rack), ANY. Spark waits spark.locality.wait (3s) per level before dropping down. Tune for data locality when data is colocated with compute (HDFS). For remote storage (S3), NODE_LOCAL is typically the best you get — reduce wait times.

```
PROCESS_LOCAL: data in executor's cache       -> 0s wait (instant)
NODE_LOCAL:    data on same host's HDFS        -> 3s wait
RACK_LOCAL:    data on same rack               -> 3s wait
ANY:           data anywhere in cluster        -> no wait

Config:
  spark.locality.wait         = 3s  (default)
  spark.locality.wait.process = 3s  (for PROCESS_LOCAL)
  spark.locality.wait.node    = 3s  (for NODE_LOCAL)
  spark.locality.wait.rack    = 3s  (for RACK_LOCAL)
```

### Step 6: Speculative Execution
Speculative execution launches duplicate tasks for slow stragglers. Enable for long-running jobs where stragglers dominate. Disable for short jobs or when cluster is near capacity (creates contention). Blacklisting: hosts with >3 failures are blacklisted by the application.

```
Config:
  spark.speculation: true
  spark.speculation.interval: 100ms
  spark.speculation.multiplier: 1.5    (task must be 1.5x slower than median)
  spark.speculation.quantile: 0.75     (only after 75% tasks complete)
```

### Step 7: Memory Management
Spark memory = Reserved (300MB) + User (spark.memory.fraction = 0.6) + Spark (1 - fraction = 0.4). Within user memory: Execution (0.5) + Storage (0.5). Execution and Storage share: execution can evict storage, storage cannot evict execution. Off-heap: spark.memory.offHeap.enabled + spark.memory.offHeap.size.

```
Executor JVM:
  +---------------------------------------------+
  | Reserved (300MB)                            |
  +---------------------------------------------+
  | User Memory (60%)                           |
  |  +---------------------------------------+  |
  |  | Execution (50%)  | Storage (50%)       | |
  |  | - shuffle        | - cache RDD/DF      | |
  |  | - join/agg       | - broadcast vars    | |
  |  | - sort           |                     | |
  |  +---------------------------------------+  |
  +---------------------------------------------+
  | Spark Memory (40%) — internal metadata       |
  +---------------------------------------------+
```

### Step 8: Dask Distributed
Scheduler: handles task graph, state machine, futures. Workers: execute tasks, hold data in distributed memory. Client: submits computation, gathers results. Adaptive scaling: auto-scale workers based on task queue.

```python
from dask.distributed import Client, LocalCluster
cluster = LocalCluster(
    n_workers=4,
    threads_per_worker=2,
    memory_limit='8GB',
    scheduler_port=8786
)
client = Client(cluster)
# or deploy on K8s
```

### Step 9: Ray Distributed
Task: @ray.remote def f(): runs remotely as stateless task. Actor: @ray.remote class Counter: runs as stateful actor. ObjectStore: shared-memory object store (Plasma) for zero-copy data sharing.

```python
import ray
ray.init(address='auto')

@ray.remote(num_returns=2, num_cpus=1, num_gpus=0)
def map_task(data):
    return process(data)

@ray.remote
class Aggregator:
    def __init__(self): self.count = 0
    def add(self, v): self.count += v
    def result(self): return self.count
```

### Step 10: NVIDIA RAPIDS and GPU-Accelerated Compute
RAPIDS is a suite of GPU-accelerated data science libraries. cuDF provides a pandas-like DataFrame API on GPU, delivering 10-50x speedups for transformations on large datasets. cuML offers GPU-accelerated ML (XGBoost, Random Forest, KNN, PCA) with scikit-learn API. cuGraph implements GPU graph analytics. RAPIDS integrates with Dask for multi-GPU, multi-node scaling — Dask + cuDF distributes GPU DataFrames across a cluster. Data loading uses Apache Arrow for zero-copy GPU transfer. Memory: set `CUDA_VISIBLE_DEVICES`, monitor with `nvidia-smi`, use spill-to-host for datasets exceeding GPU memory. Best for: ETL on large tabular datasets, feature engineering, ML preprocessing — any task where pandas is the bottleneck.

### Step 11: Polars DataFrame Library
Polars is a DataFrame library in Rust with Python bindings, leveraging Apache Arrow columnar format with aggressive query optimization (predicate/projection pushdown, query plan optimization). Outperforms pandas by 5-20x through multi-threading, cache-efficient algorithms, and zero-copy Arrow data sharing. Key features: lazy execution (`pl.LazyFrame`) for automatic optimization, streaming mode for out-of-core processing of datasets larger than RAM, expression-based composable API, and no index concept. Use Polars for data manipulation on datasets up to 100GB as a pandas replacement, or as the transformation layer in Rust-based pipelines alongside Spark for cluster-scale operations.

## Rules
- Spark on YARN: set spark.yarn.executor.memoryOverhead (10% of executor memory, min 384MB)
- Never exceed spark.cores.max > cluster capacity * 0.8 (leave room for system)
- Shuffle partitions = executors * cores * 2-3, not the default 200
- Dynamic allocation for variable workloads; static allocation for predictable ones
- Disable speculation for latency-sensitive or near-capacity clusters
- Spark memory fraction 0.6 unless heavy UDF usage (lower to 0.5)
- Dask: use adaptive scaling for elastic workloads, fixed workers for steady-state
- Ray: set object_store_memory = heap_memory for data-intensive tasks

## References
- `references/spark-execution.md` — Driver/executor, DAG scheduler, shuffle, memory management, tuning
- `references/distributed-frameworks.md` — MapReduce, Dask, Ray comparison, YARN/K8s integration
- `references/gpu-accelerated-compute.md` — NVIDIA RAPIDS cuDF, cuML, cuGraph, Dask+cuDF multi-GPU, memory management
- `references/polars-dataframe.md` — Polars Arrow-native, lazy execution, streaming mode, expression API, query optimization

## Handoff
`data-distributed-storage` for HDFS colocation and rack topology
`data-batch-processing` for Spark SQL optimization and file format tuning
`data-workflow-orchestration` for pipeline DAG scheduling on the cluster
