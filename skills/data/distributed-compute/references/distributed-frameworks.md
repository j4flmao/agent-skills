# Distributed Frameworks Comparison Reference

## MapReduce

```
Legacy Hadoop MapReduce flow:
  InputSplit -> RecordReader -> Mapper -> Combiner(optional) -> Partitioner -> Shuffle -> Reducer -> OutputFormat

Execution:
  - MRAppMaster negotiates containers from YARN RM
  - Map phase: N maps based on input splits (typically = blocks)
  - Shuffle: all intermediate data sorted, partitioned, spilled to disk
  - Reduce phase: M reduces configured by job.setNumReduceTasks()

Performance characteristics:
  - Map output written to local disk (not kept in memory)
  - Shuffle is HTTP-based fetch between nodes
  - Default sort buffer: 100MB (mapreduce.task.io.sort.mb)
  - Not ideal for iterative algorithms (each pass = new job)
```

## Dask Distributed

```
Architecture:
  Scheduler (single process): maintains task graph, state machine, worker info
  Workers (N processes): execute tasks, hold distributed memory
  Client: connects to scheduler, submits tasks, gathers futures

Task execution flow:
  client.submit(func, arg) -> Future -> distributed to worker
  client.gather(futures) -> collects results

DataFrames:
  dask.dataframe: split pandas DataFrames (partitions) across workers
  Lazy evaluation: build task graph, call .compute() to execute
  Operations: map_partitions, groupby-apply, merge, join
  Shuffle: rearrange_by_division (expensive, like Spark shuffle)
```

```python
import dask.dataframe as dd
from dask.distributed import Client

client = Client(n_workers=4, threads_per_worker=2, memory_limit='8GB')

df = dd.read_parquet('s3://bucket/data/*.parquet')
result = df.groupby('category').amount.mean().compute()

# Custom task graph
def process(x): return x ** 2
futures = client.map(process, range(100))
results = client.gather(futures)
```

## Ray

```
Architecture:
  Head node: GCS (Global Control Store), scheduler, object store (Plasma)
  Worker nodes: Raylet (local scheduler + object store), workers

Programming model:
  @ray.remote def f(x): y = g(x); return y
    -> returns ObjectRef (future)
    -> task scheduled to node with data locality (if args are ObjectRefs)

  Actors:
    @ray.remote class Counter:
      def __init__(self): self.n = 0
      def inc(self): self.n += 1
      def read(self): return self.n
    -> stateful, methods called remotely, live on one node
```

```python
import ray
ray.init(address='auto')

@ray.remote(num_cpus=0.5, num_gpus=0)
def map_task(chunk):
    return compute(chunk)

@ray.remote
class Aggregator:
    def __init__(self):
        self.partials = []
    def add(self, val):
        self.partials.append(val)
    def result(self):
        return sum(self.partials)

agg = Aggregator.remote()
chunks = split_data(data)
refs = [map_task.remote(c) for c in chunks]
for r in refs: agg.add.remote(r)
print(ray.get(agg.result.remote()))
```

## YARN Integration

```
YARN resource negotiation:
  Client -> ResourceManager (request container for AM)
  AM -> ResourceManager (request containers for executors)
  RM -> NodeManager (launch containers)

Scheduling:
  FIFO: simple queue, one job at a time (dev)
  Capacity: guaranteed capacities per queue (shared prod cluster)
  Fair: fair share over time, preemption (default)

Memory:
  yarn.nodemanager.resource.memory-mb = total allocatable per node
  yarn.scheduler.maximum-allocation-mb = max per container
  spark.executor.memory <= yarn.scheduler.maximum-allocation-mb
  spark.yarn.executor.memoryOverhead (10% or 384MB min)
```

## K8s Integration

```
Spark on K8s:
  spark-submit --master k8s://https://<k8s-api>:6443
  Driver runs in K8s pod (cluster mode)
  Executors run as ephemeral pods (per-stage or per-task)
  Resource: cpu/memory requests and limits

  spark.kubernetes.container.image: spark:3.5
  spark.kubernetes.driver.request.cores: 1
  spark.kubernetes.executor.request.cores: 4
  spark.kubernetes.executor.limit.cores: 4
  spark.kubernetes.memoryOverheadFactor: 0.1
  spark.kubernetes.authenticate.driver.serviceAccountName: spark
  spark.kubernetes.allocation.dynamicAllocation.enabled: true

Ray on K8s:
  ray-operator: K8s-native Ray cluster management
  RayCluster CRD: head group spec + worker group spec
  Autoscaler: worker pods added/removed based on pending tasks
```

## Framework Selection Matrix

```
Criterion          Spark          Dask          Ray          MapReduce
==========         =====          ====          ===          =========
SQL                Excellent      Basic (SQL)   Not built    Hive-only
Batch ETL          Excellent      Good          Good         Legacy
Streaming          Streaming      Not native    Streaming    No
ML Training        MLlib          sklearn      RL/Train     No
Python-native      PySpark        Native        Native       No
Java/Scala         Native         No            No           Native
Latency            >1s            >100ms        >10ms        >1min
Ecosystem          Largest        Growing       Growing      Shrinking
Learning curve     Medium         Low           Medium       Medium
```
