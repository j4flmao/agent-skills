# Distributed Compute Scheduling

## Job Scheduling and Resource Management

Distributed compute frameworks require sophisticated scheduling for efficient resource utilization.

### Scheduler Architecture

```python
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

class SchedulingPolicy(Enum):
    FIFO = "fifo"                     # First in, first out
    FAIR = "fair"                     # Fair sharing across users
    CAPACITY = "capacity"             # Guaranteed capacity per queue
    PRIORITY = "priority"             # Priority-based preemption

@dataclass
class JobDefinition:
    id: str
    name: str
    queue: str
    resources: ResourceRequest
    priority: int
    max_retries: int = 3
    timeout_minutes: int = 60

class Scheduler:
    def __init__(self, policy: SchedulingPolicy, cluster: ClusterManager):
        self.policy = policy
        self.cluster = cluster
        self.queues: dict[str, QueueConfig] = {}

    def submit_job(self, job: JobDefinition) -> JobHandle:
        if not self._has_capacity(job):
            self._queue_job(job)
            return JobHandle(job.id, status="queued")

        allocated = self.cluster.allocate(job.resources)
        if allocated:
            return JobHandle(job.id, status="running")

        self._queue_job(job)
        return JobHandle(job.id, status="queued")

    def _has_capacity(self, job: JobDefinition) -> bool:
        queue = self.queues.get(job.queue)
        if not queue:
            return True
        current = self._get_queue_usage(job.queue)
        return current + job.resources.cpu_cores <= queue.max_cpu
```

### Resource Allocation

```python
class ResourceAllocator:
    def __init__(self, total_resources: ClusterResources):
        self.total = total_resources
        self.allocated: dict[str, ResourceRequest] = {}

    def request_resources(self, job_id: str, request: ResourceRequest) -> bool:
        available = self._available_resources()
        if (request.cpu_cores <= available.cpu_cores and
            request.memory_gb <= available.memory_gb):
            self.allocated[job_id] = request
            return True
        return False

    def release_resources(self, job_id: str):
        self.allocated.pop(job_id, None)

    def _available_resources(self) -> ResourceRequest:
        used_cpu = sum(r.cpu_cores for r in self.allocated.values())
        used_mem = sum(r.memory_gb for r in self.allocated.values())
        return ResourceRequest(
            cpu_cores=self.total.cpu_cores - used_cpu,
            memory_gb=self.total.memory_gb - used_mem,
        )
```

## Dynamic Scaling

```python
class AutoScaler:
    def __init__(self, cluster: ClusterManager, min_nodes: int = 2, max_nodes: int = 20):
        self.cluster = cluster
        self.min_nodes = min_nodes
        self.max_nodes = max_nodes

    def evaluate_scale(self):
        queue_depth = self.cluster.get_queue_depth()
        available_nodes = self.cluster.get_available_nodes()

        if queue_depth > 10 and available_nodes < 2:
            scale_up_by = min(queue_depth // 5, self.max_nodes - self.cluster.node_count())
            self.cluster.add_nodes(scale_up_by)
        elif available_nodes > 5 and self.cluster.node_count() > self.min_nodes:
            scale_down_by = min(available_nodes - self.min_nodes, self.cluster.node_count() - self.min_nodes)
            self.cluster.remove_nodes(scale_down_by)
```

## Key Points

- Scheduling policies: FIFO, fair, capacity, priority
- Queue-based resource allocation with capacity limits
- Resource tracking: CPU, memory, GPU, ephemeral storage
- Dynamic auto-scaling based on queue depth
- Preemption for priority jobs in fair scheduling
- Queued job timeout prevents starvation
- Resource reservation for critical pipelines
- Gang scheduling for tightly-coupled parallel jobs
- Node-level resource isolation via YARN/K8s
- Scheduling metrics: queue wait time, resource utilization, preemption rate
