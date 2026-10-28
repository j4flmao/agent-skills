# Distributed Compute Fundamentals for Data Processing

Core concepts shared by Spark, Dask, Ray, Flink and similar engines: when to distribute at all, how work is partitioned, what a shuffle is, lazy execution, fault tolerance, and how to choose an engine. Engine internals are covered in `spark-execution.md`, memory in `distributed-compute-memory.md`, scheduling in `distributed-compute-scheduling.md`.

## Do You Need a Cluster?

Single-node engines handle far more than they used to:

| Data size (compressed columnar) | Typical choice |
|---------------------------------|----------------|
| Fits in memory of one machine | Polars, DuckDB, pandas (with Arrow) |
| Larger than memory, single machine | DuckDB / Polars streaming, out-of-core processing |
| Many machines' worth, or needs to be shared/scheduled | Spark, Dask, Ray Data, Trino (SQL) |
| Continuous streams | Flink, Spark Structured Streaming, Kafka Streams |

Distribution adds network, serialization, coordination and operational cost. Start single-node and scale out when measurements show it is needed.

## Execution Model

```
Driver / scheduler
   │ builds a logical plan (DAG of operations)
   │ optimizes it (predicate pushdown, projection pruning, join reordering)
   ▼
Physical plan split into stages at shuffle boundaries
   │ each stage = many tasks, one per partition
   ▼
Executors / workers run tasks in parallel
```

| Term | Meaning |
|------|---------|
| Partition | Chunk of data processed by one task |
| Task | Unit of work on one partition |
| Stage | Set of tasks that can run without data exchange |
| Shuffle | Redistribution of data across workers by key (network + disk) |
| Narrow transformation | Each output partition depends on one input partition (map, filter) |
| Wide transformation | Output depends on many inputs (groupBy, join, distinct, repartition) |

## Lazy Evaluation

Spark DataFrames, Dask, Polars lazy frames and Ray Data build a plan and execute only on an action (`count`, `collect`, `write`, `compute`). Benefits: whole-plan optimization. Consequences:
- Errors surface at the action, not the line that caused them.
- Reusing an intermediate result without caching recomputes it.
- `collect()`/`to_pandas()` on large data pulls everything to the driver and can crash it.

## Shuffles Are the Main Cost

A shuffle writes partitioned data to local disk, transfers it over the network and reads it back. Reduce shuffles by:
- Filtering and projecting early (engines push down automatically when possible).
- Broadcasting small tables in joins instead of shuffling both sides.
- Pre-partitioning or bucketing data on common join keys for repeated jobs.
- Avoiding unnecessary `repartition`/`distinct`/global sorts.

## Partitioning Basics

- Too few partitions: idle cores, large tasks, memory pressure.
- Too many: scheduling overhead, tiny files on write.
- Rule of thumb: partitions sized to roughly 100-200 MB of input each for batch jobs, and at least 2-4x total cores. Adaptive engines (Spark AQE) coalesce shuffle partitions automatically.
- Data skew (a few keys with most rows) makes one task run far longer than others; see `distributed-compute-advanced.md`.

## Fault Tolerance

| Engine | Mechanism |
|--------|-----------|
| Spark | Lineage-based recomputation of lost partitions; shuffle files on disk; checkpointing for long lineages and streaming |
| Dask | Recomputes lost tasks from the graph; worker memory spill |
| Ray | Task retries, object reconstruction via lineage, actor restarts (configurable) |
| Flink | Distributed snapshots (checkpoints) of operator state, exactly-once with transactional sinks |

Design jobs to be idempotent at the output: overwrite partitions or use table formats with atomic commits, so retries do not duplicate data.

## Data Formats and I/O

- Columnar formats (Parquet, ORC) with compression enable column pruning and predicate pushdown.
- Table formats (Iceberg, Delta, Hudi) add atomic commits, schema evolution and time travel.
- Avoid many small input files; compact them.
- Co-locate compute with storage region to avoid egress and latency.

## Choosing an Engine

| Engine | Strengths | Consider when |
|--------|-----------|---------------|
| Apache Spark | Mature SQL/DataFrame engine, wide ecosystem, batch + streaming | Large ETL, lakehouse pipelines |
| Dask | Pandas/NumPy-like APIs, Python-native | Scaling existing Python analytics |
| Ray (Core, Data, Train, Tune) | General distributed Python, actors, ML workloads, GPUs | ML pipelines, heterogeneous CPU/GPU tasks |
| Apache Flink | Low-latency stateful streaming, event time | Real-time pipelines |
| Trino / Presto | Distributed SQL over many sources | Interactive analytics, federation |
| Polars / DuckDB | Very fast single-node | Data that fits one machine |

## Resource Sizing Basics

- Executors with a moderate number of cores each (commonly 4-5 for Spark on YARN/K8s) balance parallelism and GC/I/O contention.
- Leave memory headroom for overhead (off-heap, Python workers, native libraries).
- Measure with the engine UI (Spark UI, Dask dashboard, Ray dashboard): task durations, spill, shuffle sizes, GC time.

## Common Mistakes

- Python UDFs row-by-row where built-in functions exist (serialization overhead); use vectorized/pandas UDFs or native expressions.
- Collecting large results to the driver.
- Caching everything; cache only reused, expensive intermediates and unpersist afterward.
- Ignoring skew and blaming cluster size.
- Writing thousands of tiny output files.

## Checklist

- [ ] Single-node option evaluated first
- [ ] Plan inspected (`explain`) for unnecessary shuffles
- [ ] Partition sizes reasonable; adaptive execution enabled
- [ ] Columnar formats with pushdown; small files compacted
- [ ] Idempotent, atomic output writes
- [ ] Engine UI used to diagnose before scaling the cluster
