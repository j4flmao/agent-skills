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

### Max Response Length
250 lines of config.

## Workflow

### Step 1: Framework Selection

#### Framework Comparison

| Feature | Apache Spark | Dask | Ray | Hadoop MapReduce |
|---|---|---|---|---|
| Execution model | Driver-executor | Scheduler-worker | GCS (Global Control Store) | JobTracker-TaskTracker |
| Language | Scala, Python, R, SQL | Python | Python, Java | Java, streaming |
| In-memory | Yes (RDD/DataFrame) | Yes (dataframes) | Yes (object store) | No (disk-based) |
| Streaming | Micro-batch | Streaming dataframes | Streaming actors | N/A |
| ML | MLlib | Dask-ML, XGBoost | Ray Tune, RLlib | Apache Mahout |
| Best for | Batch ETL, SQL, ML | Pandas-scale, custom Python | ML training, RL, serving | Legacy batch |
| Maturity | Very high | High | High | Declining |

#### Decision Tree
```
Primary workload?
├── Batch ETL, large-scale SQL, data warehouse processing
│   └── Apache Spark (most mature, best ecosystem)
├── Python-native dataframes, NumPy/Pandas-scale workloads
│   └── Dask (Python-native, familiar API)
├── ML training, reinforcement learning, hyperparameter tuning
│   └── Ray (Ray Train, Ray Tune, RLlib)
├── Real-time inference, serving, distributed actors
│   └── Ray Serve (low-latency model serving)
└── Legacy Hadoop infrastructure, no in-memory requirement
    └── MapReduce (maintenance mode, prefer Spark)
```

### Step 2: Cluster Configuration

#### Spark Executor Sizing

```yaml
spark_conf:
  # Formula: executor_memory = (node_memory - overhead) / executors_per_node
  # Overhead: OS (2-4GB) + yarn overhead (1-2GB) + spark overhead (10% of executor)
  
  # Example: 16-node cluster, 64GB RAM, 32 cores per node
  spark.executor.instances: 32
  spark.executor.cores: 4            # 4 cores per executor
  spark.executor.memory: 16g         # 16GB per executor
  spark.executor.memoryOverhead: 2g  # 2GB overhead
  # Calculation: 32 cores/node / 4 cores/executor = 8 executors/node
  # Memory: (64GB - 3GB OS - 2GB overhead) / 8 = ~7.4GB → round to 16GB with fewer executors
  
  # Alternative: fewer large executors (HDFS-heavy workloads)
  spark.executor.instances: 16
  spark.executor.cores: 8
  spark.executor.memory: 32g
  spark.executor.memoryOverhead: 4g
  # 8 cores/executor enables larger shuffle blocks, better for large joins
```

#### Dask Worker Sizing

```yaml
dask_config:
  # Dask scheduler + workers
  scheduler:
    resources: { cpu: 2, memory: 4GB }
  workers:
    count: 32
    resources: { cpu: 4, memory: 16GB }
  
  # Threading: "processes" for CPU-bound, "threads" for I/O-bound
  worker_class: "distributed.Nanny"
  multiprocessing: true
  threads_per_worker: 1  # 1 thread per process for CPU workloads
```

#### Ray Cluster Config

```yaml
ray_config:
  # Ray head + worker nodes
  head:
    resources: { CPU: 4, memory: 8GB }
  workers:
    min: 4
    max: 32
    resources: { CPU: 8, memory: 32GB }
    autoscaling:
      target_num_workers: 16
      idle_timeout_minutes: 5
      upscaling_speed: 1.0
```

### Step 3: Shuffle Optimization

#### Shuffle Types

| Type | Description | When to Use |
|---|---|---|
| Sort-based (default Spark) | Map writes sorted data, reduce fetches | Large datasets, stable |
| Hash-based | Map writes to hash buckets | Smaller datasets, fast |
| Tungsten shuffle (Spark) | Off-heap sort, bypasses JVM | Large datasets, no serialization |
| External shuffle (YARN) | Push-based shuffle, auxiliary service | Large clusters, HDFS-backed |

#### Shuffle Tuning Parameters

```yaml
# Spark shuffle tuning
spark.shuffle.manager: "tungsten-sort"  # Default, optimized
spark.shuffle.sort.bypassMergeThreshold: 200  # Bypass merge for < 200 partitions
spark.shuffle.file.buffer: 64k  # Buffer for shuffle writes
spark.shuffle.spill.compress: true
spark.shuffle.compress: true
spark.shuffle.io.maxRetries: 3
spark.shuffle.io.retryWait: 5s
spark.reducer.maxSizeInFlight: 96m  # Aggregate fetch buffer per reducer
spark.reducer.maxReqsInFlight: 5    # Max concurrent fetch requests
spark.maxRemoteBlockSizeFetchToMem: 256m  # Fetch blocks > this to disk

# Adaptive Query Execution (Spark 3+)
spark.sql.adaptive.enabled: true
spark.sql.adaptive.coalescePartitions.enabled: true
spark.sql.adaptive.coalescePartitions.parallelismFirst: false
spark.sql.adaptive.coalescePartitions.minPartitionSize: 64MB
spark.sql.adaptive.advisoryPartitionSizeInBytes: 128MB
spark.sql.adaptive.skewJoin.enabled: true
spark.sql.adaptive.skewJoin.skewedPartitionFactor: 5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes: 256MB
```

### Step 4: Data Locality

#### Locality Levels

| Level | Description | Latency |
|---|---|---|
| PROCESS_LOCAL | Data in same JVM process | Fastest |
| NODE_LOCAL | Data on same node, different process | Fast |
| RACK_LOCAL | Data on same rack | Moderate |
| ANY | Data anywhere in cluster | Slowest |

#### Locality Configuration

```yaml
# Spark locality settings
spark.locality.wait: 3s       # Wait for PROCESS_LOCAL before moving to NODE_LOCAL
spark.locality.wait.node: 3s  # Wait for NODE_LOCAL before moving to RACK_LOCAL
spark.locality.wait.rack: 3s  # Wait for RACK_LOCAL before moving to ANY

# For high-throughput ETL, reduce wait times
# spark.locality.wait: 0s  (forces immediate scheduling, ignores locality)
```

### Step 5: Speculative Execution

#### When to Enable
Enable for: heterogeneous clusters (spot instances), long-running batch jobs, unreliable hardware, large shuffles. Disable for: short jobs (< 5 minutes), latency-sensitive workloads, homogeneous clusters.

```yaml
# Spark speculative execution
spark.speculation: true
spark.speculation.interval: 100ms     # Check frequency
spark.speculation.multiplier: 2       # Slow task threshold relative to median
spark.speculation.quantile: 0.9       # Speculate when 90% of tasks complete
spark.speculation.enabled: true       # Spark 3.4+ unified control

# Task blacklisting
spark.blacklist.enabled: true
spark.blacklist.timeout: 1h
spark.task.maxFailures: 8
```

### Step 6: Dynamic Allocation

```yaml
# Dynamic resource allocation
spark.dynamicAllocation.enabled: true
spark.dynamicAllocation.minExecutors: 2
spark.dynamicAllocation.maxExecutors: 64
spark.dynamicAllocation.initialExecutors: 4
spark.dynamicAllocation.executorIdleTimeout: 60s
spark.dynamicAllocation.schedulerBacklogTimeout: 5s
spark.dynamicAllocation.sustainedSchedulerBacklogTimeout: 5s

# Shuffle tracking (required for dynamic allocation with shuffle services)
spark.shuffle.service.enabled: true
spark.shuffle.service.port: 7337
```

### Step 7: Memory Management

#### Spark Memory Breakdown

```yaml
spark.memory.fraction: 0.6       # Fraction of JVM heap for execution + storage
spark.memory.storageFraction: 0.5  # Fraction of unified memory for storage (rest for execution)
spark.memory.offHeap.enabled: false
spark.memory.offHeap.size: 0

# For read-heavy workloads (cache, broadcast)
# spark.memory.storageFraction: 0.7

# For write-heavy workloads (shuffle, sort)
# spark.memory.storageFraction: 0.3

# Tungsten off-heap
spark.sql.tungsten.enabled: true  # Spark 2+, enabled by default
spark.unsafe.sorter.spill.buffer.size: 1MB
```

#### Dask Memory Management

```yaml
# Dask memory limits
distributed.worker.memory.target: 0.6     # Spill at 60%
distributed.worker.memory.spill: 0.7      # Spill to disk at 70%
distributed.worker.memory.pause: 0.8      # Pause worker at 80%
distributed.worker.memory.terminate: 0.95 # Restart worker at 95%
distributed.comm.timeouts.connect: 60s
distributed.comm.timeouts.tcp: 60s
```

### Step 8: Execution Engine Optimization

#### Spark Tungsten / Whole-Stage Codegen

```yaml
spark.sql.codegen.wholeStage: true  # Whole-stage code generation (default true)
spark.sql.codegen.maxFields: 200     # Max fields for code gen
spark.sql.codegen.hugeMethodLimit: 8000  # Bytecode limit
spark.sql.codegen.fallback: true

# Vectorized reads
spark.sql.parquet.enableVectorizedReader: true  # Parquet vectorized (default true)
spark.sql.orc.enableVectorizedReader: true      # ORC vectorized (default true)
spark.sql.inMemoryColumnarStorage.enableVectorizedReader: true
```

#### CBO (Cost-Based Optimization)

```yaml
spark.sql.cbo.enabled: true
spark.sql.cbo.joinReorder.enabled: true
spark.sql.cbo.joinReorder.dp.threshold: 12  # Dynamic programming threshold
spark.sql.statistics.histogram.enabled: true
spark.sql.statistics.size.autoUpdate.enabled: true

# Collect statistics for tables
# ANALYZE TABLE orders COMPUTE STATISTICS;
# ANALYZE TABLE orders COMPUTE STATISTICS FOR COLUMNS customer_id, status;
```

### Step 9: Join Optimization

#### Broadcast vs Sort-Merge Join

```yaml
# Broadcast join threshold (default 10MB, tune based on dimension size)
spark.sql.autoBroadcastJoinThreshold: 100MB
# For large dimensions, increase:
# spark.sql.autoBroadcastJoinThreshold: 500MB

# Force broadcast hint
# SELECT /*+ BROADCAST(d) */ * FROM fact f JOIN dim d ON f.key = d.key

# Sort-merge join (for large tables)
spark.sql.join.preferSortMergeJoin: true
spark.sql.sortMergeJoinExec.buffer.spill.threshold: 33554432  # 32MB
```

#### Shuffled Hash Join
Use when one side is small enough to hash but too large to broadcast.

```yaml
spark.sql.join.forceApplyShuffledHashJoin: false
spark.sql.smJoin.skewedWriteLimit: 16GB  # Shuffle hash join threshold
```

### Step 10: Serialization

```yaml
# Kryo serialization (faster than Java serialization)
spark.serializer: org.apache.spark.serializer.KryoSerializer
spark.kryo.classesToRegister: "com.example.MyClass1,com.example.MyClass2"
spark.kryo.referenceTracking: false
spark.kryo.registrationRequired: true  # Required for production
spark.kryoserializer.buffer.max: 256m
spark.kryoserializer.buffer: 64k
```

### Resource Manager Comparison

| Feature | YARN | Kubernetes | Standalone | Slurm |
|---|---|---|---|---|
| Maturity | Very high | High | Medium | High |
| Spark support | Native | Spark Operator | Native | Via wrapper |
| Multi-tenancy | Queues + ACLs | Namespaces + RBAC | None | Partitions |
| Auto-scaling | Limited | Horizontal Pod Autoscaler | No | No |
| GPU support | Yes (via YARN) | Native (device plugin) | Limited | Native |
| Dynamic allocation | Requires shuffle service | Supports | Supports | N/A |
| Best for | Hadoop ecosystems | Cloud-native, CI/CD | Dev/test | HPC clusters |

## Rules
- Right-size executors: 4-8 cores each, 16-32GB memory — not too large (GC pressure) or too small (too many connections)
- Enable adaptive query execution (Spark 3+) for automatic partition coalescing and skew join
- Use Kryo serialization for custom classes — faster than Java serialization
- Enable whole-stage code generation for compute-heavy queries
- Broadcast small dimension tables (use AQE or explicit hints)
- Monitor shuffle spill — excessive spill means insufficient memory
- Enable speculative execution for spot/preemptible instances
- Use dynamic allocation for variable workloads, static for predictable
- Collect table statistics for CBO to produce better query plans
- Avoid wide transformations after filter — push filters before joins
- Cache hot data in memory for iterative algorithms, not for one-pass ETL
- Monitor GC time — >10% GC overhead means memory tuning needed

### Network Tuning

```yaml
# Network I/O
spark.shuffle.io.maxRetries: 3
spark.shuffle.io.retryWait: 5s
spark.shuffle.io.numConnectionsPerPeer: 1
spark.shuffle.io.preferDirectBufs: true
spark.shuffle.io.backLog: 1024
spark.shuffle.io.serverThreads: 2
spark.shuffle.io.clientThreads: 2

# For 10Gb+ networks, increase buffer sizes
spark.shuffle.file.buffer: 128k
spark.unsafe.sorter.spill.buffer.size: 2MB
spark.reducer.maxSizeInFlight: 128m
spark.maxRemoteBlockSizeFetchToMem: 512m
```

### GC Tuning

```yaml
# G1GC for Spark executors (preferred for 16GB+ heaps)
spark.executor.extraJavaOptions: >
  -XX:+UseG1GC
  -XX:MaxGCPauseMillis=200
  -XX:InitiatingHeapOccupancyPercent=35
  -XX:+ParallelRefProcEnabled
  -XX:+PrintGCDetails
  -XX:+PrintGCTimeStamps
  -XX:+PrintGCDateStamps
  -verbose:gc
  -XX:+UseStringDeduplication

# For small heaps (< 16GB), use ParallelGC
# -XX:+UseParallelGC -XX:ParallelGCThreads=4

# Monitor GC: look for >10% GC time, frequent Full GCs
# Full GC symptoms: task timeouts, executor heartbeats missed
```

### Spark on Kubernetes

```yaml
# Spark Operator deployment
apiVersion: spark.apache.org/v1beta2
kind: SparkApplication
metadata:
  name: etl-pipeline
spec:
  sparkConf:
    spark.kubernetes.container.image: ghcr.io/org/spark:3.5.0
    spark.kubernetes.authenticate.driver.serviceAccountName: spark
    spark.kubernetes.allocation.maxExecutors: 50
    spark.kubernetes.executor.deleteOnTermination: true
    spark.kubernetes.memoryOverheadFactor: 0.1
    spark.kubernetes.node.selector.role: spark-worker
    spark.kubernetes.executor.label.app: spark-job
    spark.kubernetes.driver.label.app: spark-job
  driver:
    cores: 4
    memory: "16g"
  executor:
    instances: 12
    cores: 4
    memory: "16g"
```

## References
Coming soon.

## Handoff
`data-batch-processing` for Spark SQL and Hive-specific optimizations
`data-data-platform` for cluster provisioning and infrastructure
`data-data-lakehouse` for lake-wide compute integration
