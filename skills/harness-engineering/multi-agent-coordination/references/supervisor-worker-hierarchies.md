# Supervisor-Worker Hierarchies Reference Guide

## Overview

Supervisor-worker hierarchies are the most common multi-agent coordination pattern.
A supervisor agent decomposes complex tasks, assigns subtasks to specialized workers,
monitors their progress, and aggregates results. This guide covers supervisor design,
worker pool management, task assignment strategies, load balancing, health monitoring,
and fault-tolerant supervision.

---

## 1. Supervisor Agent Design

### Core Responsibilities

A supervisor agent manages the entire lifecycle of task execution:

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPERVISOR AGENT                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Task     │  │  Worker   │  │  Result   │  │  Health   │  │
│  │Decomposer│  │ Assigner  │  │Aggregator │  │ Monitor  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Priority  │  │  Retry    │  │  State    │  │  Metrics  │  │
│  │ Manager  │  │  Handler  │  │  Store    │  │ Collector │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Python Implementation

```python
import asyncio
import time
import uuid
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


class WorkerStatus(Enum):
    IDLE = "idle"
    BUSY = "busy"
    DRAINING = "draining"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"


class TaskPriority(Enum):
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3
    BACKGROUND = 4


@dataclass
class WorkerProfile:
    worker_id: str
    specializations: List[str]
    max_concurrent_tasks: int = 3
    current_tasks: Set[str] = field(default_factory=set)
    status: WorkerStatus = WorkerStatus.IDLE
    success_count: int = 0
    failure_count: int = 0
    avg_response_time_ms: float = 0.0
    last_heartbeat: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def load_factor(self) -> float:
        """Current load as a fraction of capacity (0.0 to 1.0)."""
        if self.max_concurrent_tasks == 0:
            return 1.0
        return len(self.current_tasks) / self.max_concurrent_tasks

    @property
    def reliability_score(self) -> float:
        """Calculate worker reliability from historical performance."""
        total = self.success_count + self.failure_count
        if total == 0:
            return 0.5  # Unknown reliability defaults to 50%
        return self.success_count / total

    @property
    def is_available(self) -> bool:
        return (
            self.status in (WorkerStatus.IDLE, WorkerStatus.BUSY)
            and len(self.current_tasks) < self.max_concurrent_tasks
        )


@dataclass
class SupervisorTask:
    task_id: str
    task_type: str
    payload: Dict[str, Any]
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_worker: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout_seconds: float = 60.0
    dependencies: List[str] = field(default_factory=list)

    @staticmethod
    def create(task_type: str, payload: Dict, **kwargs) -> "SupervisorTask":
        return SupervisorTask(
            task_id=str(uuid.uuid4()),
            task_type=task_type,
            payload=payload,
            **kwargs,
        )


class SupervisorAgent:
    """
    Full-featured supervisor agent with task decomposition, worker management,
    load balancing, health monitoring, and result aggregation.
    """

    def __init__(
        self,
        supervisor_id: str,
        heartbeat_interval: float = 5.0,
        health_check_interval: float = 10.0,
        dead_worker_threshold: float = 30.0,
    ):
        self.supervisor_id = supervisor_id
        self._workers: Dict[str, WorkerProfile] = {}
        self._pending_tasks: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._active_tasks: Dict[str, SupervisorTask] = {}
        self._completed_tasks: Dict[str, SupervisorTask] = {}
        self._task_handlers: Dict[str, Callable] = {}
        self._heartbeat_interval = heartbeat_interval
        self._health_check_interval = health_check_interval
        self._dead_threshold = dead_worker_threshold
        self._running = False
        self._metrics: Dict[str, Any] = defaultdict(int)

    # ── Worker Management ──────────────────────────────────────────

    def register_worker(self, worker: WorkerProfile) -> None:
        """Register a new worker with the supervisor."""
        self._workers[worker.worker_id] = worker
        self._metrics["workers_registered"] += 1
        logger.info(
            f"Worker {worker.worker_id} registered "
            f"(specializations={worker.specializations})"
        )

    def deregister_worker(self, worker_id: str) -> None:
        """Gracefully deregister a worker, reassigning its tasks."""
        if worker_id not in self._workers:
            return
        worker = self._workers[worker_id]
        # Reassign active tasks
        for task_id in list(worker.current_tasks):
            if task_id in self._active_tasks:
                task = self._active_tasks[task_id]
                task.assigned_worker = None
                asyncio.create_task(self._requeue_task(task))
        worker.status = WorkerStatus.OFFLINE
        del self._workers[worker_id]
        logger.info(f"Worker {worker_id} deregistered")

    def update_heartbeat(self, worker_id: str) -> None:
        """Update worker heartbeat timestamp."""
        if worker_id in self._workers:
            self._workers[worker_id].last_heartbeat = time.time()

    # ── Task Management ────────────────────────────────────────────

    async def submit_task(self, task: SupervisorTask) -> str:
        """Submit a task for supervised execution."""
        self._active_tasks[task.task_id] = task
        await self._pending_tasks.put((task.priority.value, task.task_id))
        self._metrics["tasks_submitted"] += 1
        logger.info(f"Task {task.task_id} submitted (type={task.task_type})")
        return task.task_id

    async def submit_batch(self, tasks: List[SupervisorTask]) -> List[str]:
        """Submit a batch of tasks."""
        task_ids = []
        for task in tasks:
            tid = await self.submit_task(task)
            task_ids.append(tid)
        return task_ids

    async def _requeue_task(self, task: SupervisorTask) -> None:
        """Requeue a task for reassignment."""
        task.retry_count += 1
        if task.retry_count > task.max_retries:
            task.error = "Max retries exceeded"
            self._complete_task(task, success=False)
            return
        await self._pending_tasks.put((task.priority.value, task.task_id))

    # ── Assignment Strategies ──────────────────────────────────────

    def _assign_least_loaded(self, task_type: str) -> Optional[str]:
        """Assign to the worker with the lowest current load."""
        candidates = self._get_capable_workers(task_type)
        if not candidates:
            return None
        return min(candidates, key=lambda wid: self._workers[wid].load_factor)

    def _assign_most_reliable(self, task_type: str) -> Optional[str]:
        """Assign to the worker with the highest reliability score."""
        candidates = self._get_capable_workers(task_type)
        if not candidates:
            return None
        return max(candidates, key=lambda wid: self._workers[wid].reliability_score)

    def _assign_fastest(self, task_type: str) -> Optional[str]:
        """Assign to the worker with the lowest average response time."""
        candidates = self._get_capable_workers(task_type)
        if not candidates:
            return None
        return min(
            candidates,
            key=lambda wid: self._workers[wid].avg_response_time_ms or float("inf"),
        )

    def _assign_weighted_score(self, task_type: str) -> Optional[str]:
        """Assign using a composite score of load, reliability, and speed."""
        candidates = self._get_capable_workers(task_type)
        if not candidates:
            return None

        def composite_score(wid: str) -> float:
            w = self._workers[wid]
            load_score = 1.0 - w.load_factor          # Lower load = higher score
            reliability = w.reliability_score           # Higher = better
            speed = 1.0 / (1.0 + w.avg_response_time_ms / 1000.0)  # Faster = higher
            return (load_score * 0.4) + (reliability * 0.4) + (speed * 0.2)

        return max(candidates, key=composite_score)

    def _get_capable_workers(self, task_type: str) -> List[str]:
        """Get all available workers capable of handling the task type."""
        return [
            wid for wid, w in self._workers.items()
            if w.is_available and task_type in w.specializations
        ]

    # ── Execution Engine ───────────────────────────────────────────

    async def _execute_task(self, task: SupervisorTask, worker_id: str) -> None:
        """Execute a task on the assigned worker with monitoring."""
        worker = self._workers.get(worker_id)
        if not worker or not worker.is_available:
            await self._requeue_task(task)
            return

        task.assigned_worker = worker_id
        task.started_at = time.time()
        worker.current_tasks.add(task.task_id)

        if worker.status == WorkerStatus.IDLE:
            worker.status = WorkerStatus.BUSY

        try:
            handler = self._task_handlers.get(task.task_type)
            if handler is None:
                raise ValueError(f"No handler for task type: {task.task_type}")

            result = await asyncio.wait_for(
                handler(task.payload, worker_id),
                timeout=task.timeout_seconds,
            )
            task.result = result
            task.completed_at = time.time()
            self._complete_task(task, success=True)
            worker.success_count += 1

            # Update average response time
            elapsed = (task.completed_at - task.started_at) * 1000
            total_tasks = worker.success_count + worker.failure_count
            worker.avg_response_time_ms = (
                (worker.avg_response_time_ms * (total_tasks - 1) + elapsed)
                / total_tasks
            )
        except asyncio.TimeoutError:
            task.error = f"Timeout after {task.timeout_seconds}s"
            worker.failure_count += 1
            await self._requeue_task(task)
        except Exception as e:
            task.error = str(e)
            worker.failure_count += 1
            await self._requeue_task(task)
        finally:
            worker.current_tasks.discard(task.task_id)
            if not worker.current_tasks:
                worker.status = WorkerStatus.IDLE

    def _complete_task(self, task: SupervisorTask, success: bool) -> None:
        """Move task to completed state."""
        if task.task_id in self._active_tasks:
            del self._active_tasks[task.task_id]
        self._completed_tasks[task.task_id] = task
        self._metrics["tasks_completed" if success else "tasks_failed"] += 1

    def register_handler(self, task_type: str, handler: Callable) -> None:
        """Register a task execution handler."""
        self._task_handlers[task_type] = handler

    # ── Health Monitoring ──────────────────────────────────────────

    async def _health_check_loop(self) -> None:
        """Periodically check worker health."""
        while self._running:
            await asyncio.sleep(self._health_check_interval)
            now = time.time()
            for wid, worker in list(self._workers.items()):
                if now - worker.last_heartbeat > self._dead_threshold:
                    logger.warning(f"Worker {wid} appears dead (no heartbeat)")
                    worker.status = WorkerStatus.UNHEALTHY
                    # Reassign tasks from dead workers
                    for task_id in list(worker.current_tasks):
                        if task_id in self._active_tasks:
                            await self._requeue_task(self._active_tasks[task_id])
                    worker.current_tasks.clear()

    # ── Main Loop ──────────────────────────────────────────────────

    async def run(self) -> None:
        """Main supervisor event loop."""
        self._running = True
        health_task = asyncio.create_task(self._health_check_loop())

        try:
            while self._running:
                try:
                    priority, task_id = await asyncio.wait_for(
                        self._pending_tasks.get(), timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue

                if task_id not in self._active_tasks:
                    continue

                task = self._active_tasks[task_id]

                # Check dependencies
                deps_met = all(
                    dep in self._completed_tasks
                    for dep in task.dependencies
                )
                if not deps_met:
                    await self._pending_tasks.put((priority, task_id))
                    await asyncio.sleep(0.1)
                    continue

                worker_id = self._assign_weighted_score(task.task_type)
                if worker_id is None:
                    # No available workers; requeue with backoff
                    await self._pending_tasks.put((priority, task_id))
                    await asyncio.sleep(0.5)
                    continue

                asyncio.create_task(self._execute_task(task, worker_id))
        finally:
            health_task.cancel()

    def stop(self) -> None:
        self._running = False
```

---

## 2. Worker Pool Management

### Dynamic Worker Pool

```python
class WorkerPool:
    """Dynamic worker pool with auto-scaling capabilities."""

    def __init__(
        self,
        min_workers: int = 2,
        max_workers: int = 20,
        scale_up_threshold: float = 0.8,
        scale_down_threshold: float = 0.2,
        cooldown_seconds: float = 30.0,
    ):
        self._workers: Dict[str, WorkerProfile] = {}
        self._min_workers = min_workers
        self._max_workers = max_workers
        self._scale_up_threshold = scale_up_threshold
        self._scale_down_threshold = scale_down_threshold
        self._cooldown = cooldown_seconds
        self._last_scale_action = 0.0
        self._worker_factory: Optional[Callable] = None

    def set_worker_factory(self, factory: Callable[[], WorkerProfile]) -> None:
        """Set the factory function for creating new workers."""
        self._worker_factory = factory

    @property
    def pool_load(self) -> float:
        """Calculate overall pool utilization."""
        if not self._workers:
            return 0.0
        total_capacity = sum(w.max_concurrent_tasks for w in self._workers.values())
        total_load = sum(len(w.current_tasks) for w in self._workers.values())
        return total_load / max(total_capacity, 1)

    @property
    def pool_size(self) -> int:
        return len(self._workers)

    def add_worker(self, worker: WorkerProfile) -> None:
        self._workers[worker.worker_id] = worker

    def remove_worker(self, worker_id: str) -> Optional[WorkerProfile]:
        return self._workers.pop(worker_id, None)

    async def evaluate_scaling(self) -> str:
        """Evaluate whether the pool should scale up or down."""
        now = time.time()
        if now - self._last_scale_action < self._cooldown:
            return "cooldown"

        load = self.pool_load

        if load > self._scale_up_threshold and self.pool_size < self._max_workers:
            await self._scale_up()
            self._last_scale_action = now
            return "scaled_up"
        elif load < self._scale_down_threshold and self.pool_size > self._min_workers:
            await self._scale_down()
            self._last_scale_action = now
            return "scaled_down"

        return "no_change"

    async def _scale_up(self) -> None:
        """Add a new worker to the pool."""
        if self._worker_factory:
            new_worker = self._worker_factory()
            self.add_worker(new_worker)
            logger.info(f"Scaled up: added worker {new_worker.worker_id}")

    async def _scale_down(self) -> None:
        """Remove the least-loaded idle worker from the pool."""
        idle_workers = [
            w for w in self._workers.values()
            if w.status == WorkerStatus.IDLE and not w.current_tasks
        ]
        if idle_workers:
            victim = min(idle_workers, key=lambda w: w.reliability_score)
            self.remove_worker(victim.worker_id)
            logger.info(f"Scaled down: removed worker {victim.worker_id}")

    def get_pool_stats(self) -> Dict[str, Any]:
        """Get comprehensive pool statistics."""
        return {
            "pool_size": self.pool_size,
            "pool_load": round(self.pool_load, 3),
            "idle_workers": sum(
                1 for w in self._workers.values() if w.status == WorkerStatus.IDLE
            ),
            "busy_workers": sum(
                1 for w in self._workers.values() if w.status == WorkerStatus.BUSY
            ),
            "unhealthy_workers": sum(
                1 for w in self._workers.values()
                if w.status == WorkerStatus.UNHEALTHY
            ),
            "total_capacity": sum(
                w.max_concurrent_tasks for w in self._workers.values()
            ),
            "current_total_load": sum(
                len(w.current_tasks) for w in self._workers.values()
            ),
        }
```

---

## 3. Task Assignment Strategies

### Strategy Pattern Implementation

```python
from abc import ABC, abstractmethod


class AssignmentStrategy(ABC):
    """Abstract base for task assignment strategies."""

    @abstractmethod
    def select_worker(
        self, task: SupervisorTask, workers: Dict[str, WorkerProfile]
    ) -> Optional[str]:
        pass


class RoundRobinStrategy(AssignmentStrategy):
    """Assign tasks in round-robin order."""

    def __init__(self):
        self._index = 0

    def select_worker(
        self, task: SupervisorTask, workers: Dict[str, WorkerProfile]
    ) -> Optional[str]:
        available = [wid for wid, w in workers.items() if w.is_available]
        if not available:
            return None
        selected = available[self._index % len(available)]
        self._index += 1
        return selected


class AffinityStrategy(AssignmentStrategy):
    """Assign tasks to workers that previously handled similar tasks."""

    def __init__(self):
        self._task_worker_history: Dict[str, List[str]] = defaultdict(list)

    def select_worker(
        self, task: SupervisorTask, workers: Dict[str, WorkerProfile]
    ) -> Optional[str]:
        history = self._task_worker_history.get(task.task_type, [])
        for wid in reversed(history):
            if wid in workers and workers[wid].is_available:
                return wid
        # Fall back to least-loaded
        available = [wid for wid, w in workers.items() if w.is_available]
        if not available:
            return None
        return min(available, key=lambda wid: workers[wid].load_factor)

    def record_assignment(self, task_type: str, worker_id: str) -> None:
        self._task_worker_history[task_type].append(worker_id)


class PowerOfTwoChoicesStrategy(AssignmentStrategy):
    """
    Pick two random workers and assign to the one with lower load.
    This provides near-optimal load balancing with minimal coordination.
    """

    def select_worker(
        self, task: SupervisorTask, workers: Dict[str, WorkerProfile]
    ) -> Optional[str]:
        import random
        available = [wid for wid, w in workers.items() if w.is_available]
        if not available:
            return None
        if len(available) == 1:
            return available[0]
        choices = random.sample(available, min(2, len(available)))
        return min(choices, key=lambda wid: workers[wid].load_factor)


class PriorityAwareStrategy(AssignmentStrategy):
    """Route high-priority tasks to the most reliable workers."""

    def select_worker(
        self, task: SupervisorTask, workers: Dict[str, WorkerProfile]
    ) -> Optional[str]:
        available = [
            wid for wid, w in workers.items()
            if w.is_available and task.task_type in w.specializations
        ]
        if not available:
            return None

        if task.priority in (TaskPriority.CRITICAL, TaskPriority.HIGH):
            # Prefer most reliable worker
            return max(available, key=lambda wid: workers[wid].reliability_score)
        else:
            # Prefer least-loaded worker
            return min(available, key=lambda wid: workers[wid].load_factor)
```

---

## 4. Load Balancing Algorithms

### Weighted Load Balancer

```python
import hashlib


class WeightedLoadBalancer:
    """
    Consistent hashing-based load balancer for sticky routing
    with weighted distribution.
    """

    def __init__(self, replicas: int = 100):
        self._replicas = replicas
        self._ring: Dict[int, str] = {}
        self._sorted_keys: List[int] = []
        self._weights: Dict[str, float] = {}

    def add_worker(self, worker_id: str, weight: float = 1.0) -> None:
        """Add a worker to the hash ring with specified weight."""
        self._weights[worker_id] = weight
        num_replicas = int(self._replicas * weight)
        for i in range(num_replicas):
            key = self._hash(f"{worker_id}:{i}")
            self._ring[key] = worker_id
        self._sorted_keys = sorted(self._ring.keys())

    def remove_worker(self, worker_id: str) -> None:
        """Remove a worker from the hash ring."""
        weight = self._weights.pop(worker_id, 1.0)
        num_replicas = int(self._replicas * weight)
        for i in range(num_replicas):
            key = self._hash(f"{worker_id}:{i}")
            self._ring.pop(key, None)
        self._sorted_keys = sorted(self._ring.keys())

    def get_worker(self, task_key: str) -> Optional[str]:
        """Get the worker responsible for a given task key."""
        if not self._ring:
            return None
        hash_val = self._hash(task_key)
        # Binary search for the first key >= hash_val
        import bisect
        idx = bisect.bisect_left(self._sorted_keys, hash_val)
        if idx >= len(self._sorted_keys):
            idx = 0
        return self._ring[self._sorted_keys[idx]]

    @staticmethod
    def _hash(key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
```

---

## 5. Worker Specialization

### Specialization Taxonomy

```
Worker Specialization Hierarchy
────────────────────────────────
├── Code Workers
│   ├── CodeGenerationWorker
│   ├── CodeReviewWorker
│   ├── TestGenerationWorker
│   └── RefactoringWorker
├── Research Workers
│   ├── WebSearchWorker
│   ├── DocumentAnalysisWorker
│   └── SummarizationWorker
├── Data Workers
│   ├── DataExtractionWorker
│   ├── DataTransformWorker
│   └── DataValidationWorker
└── Integration Workers
    ├── APICallWorker
    ├── FileIOWorker
    └── DatabaseWorker
```

### TypeScript Implementation

```typescript
interface WorkerCapability {
  name: string;
  proficiency: number; // 0.0 to 1.0
  maxConcurrent: number;
  averageLatencyMs: number;
}

interface SpecializedWorker {
  workerId: string;
  workerType: string;
  capabilities: WorkerCapability[];
  status: "idle" | "busy" | "draining" | "offline";
  metadata: Record<string, unknown>;
}

class WorkerSpecializationRegistry {
  private workers = new Map<string, SpecializedWorker>();
  private capabilityIndex = new Map<string, Set<string>>();

  register(worker: SpecializedWorker): void {
    this.workers.set(worker.workerId, worker);
    for (const cap of worker.capabilities) {
      if (!this.capabilityIndex.has(cap.name)) {
        this.capabilityIndex.set(cap.name, new Set());
      }
      this.capabilityIndex.get(cap.name)!.add(worker.workerId);
    }
  }

  findBestWorker(requiredCapability: string, minProficiency = 0.5): SpecializedWorker | null {
    const workerIds = this.capabilityIndex.get(requiredCapability);
    if (!workerIds) return null;

    let bestWorker: SpecializedWorker | null = null;
    let bestScore = -1;

    for (const wid of workerIds) {
      const worker = this.workers.get(wid)!;
      if (worker.status === "offline" || worker.status === "draining") continue;

      const cap = worker.capabilities.find((c) => c.name === requiredCapability);
      if (!cap || cap.proficiency < minProficiency) continue;

      const score = cap.proficiency * (1 / (1 + cap.averageLatencyMs / 1000));
      if (score > bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }
    return bestWorker;
  }

  getCapabilityMatrix(): Record<string, { workerId: string; proficiency: number }[]> {
    const matrix: Record<string, { workerId: string; proficiency: number }[]> = {};
    for (const [capName, workerIds] of this.capabilityIndex) {
      matrix[capName] = [];
      for (const wid of workerIds) {
        const worker = this.workers.get(wid)!;
        const cap = worker.capabilities.find((c) => c.name === capName);
        if (cap) {
          matrix[capName].push({ workerId: wid, proficiency: cap.proficiency });
        }
      }
      matrix[capName].sort((a, b) => b.proficiency - a.proficiency);
    }
    return matrix;
  }
}
```

---

## 6. Health Monitoring System

### Comprehensive Health Monitor

```python
from dataclasses import dataclass
from typing import Deque
from collections import deque


@dataclass
class HealthMetrics:
    timestamp: float
    cpu_utilization: float
    memory_utilization: float
    active_tasks: int
    error_rate: float
    p99_latency_ms: float


class WorkerHealthMonitor:
    """Monitors worker health using sliding window metrics."""

    def __init__(
        self,
        window_size: int = 100,
        error_rate_threshold: float = 0.3,
        latency_threshold_ms: float = 5000.0,
        consecutive_failures_limit: int = 5,
    ):
        self._window_size = window_size
        self._error_threshold = error_rate_threshold
        self._latency_threshold = latency_threshold_ms
        self._consecutive_limit = consecutive_failures_limit
        self._worker_metrics: Dict[str, Deque[HealthMetrics]] = {}
        self._consecutive_failures: Dict[str, int] = defaultdict(int)
        self._circuit_breaker_state: Dict[str, str] = {}  # closed, open, half-open

    def record_success(self, worker_id: str, latency_ms: float) -> None:
        self._consecutive_failures[worker_id] = 0
        if self._circuit_breaker_state.get(worker_id) == "half-open":
            self._circuit_breaker_state[worker_id] = "closed"

    def record_failure(self, worker_id: str) -> None:
        self._consecutive_failures[worker_id] += 1
        if self._consecutive_failures[worker_id] >= self._consecutive_limit:
            self._circuit_breaker_state[worker_id] = "open"

    def is_healthy(self, worker_id: str) -> bool:
        """Determine if a worker is healthy based on metrics."""
        cb_state = self._circuit_breaker_state.get(worker_id, "closed")
        if cb_state == "open":
            return False

        metrics = self._worker_metrics.get(worker_id)
        if not metrics or len(metrics) < 5:
            return True  # Not enough data to make a judgment

        recent = list(metrics)[-10:]
        avg_error_rate = sum(m.error_rate for m in recent) / len(recent)
        avg_latency = sum(m.p99_latency_ms for m in recent) / len(recent)

        return (
            avg_error_rate < self._error_threshold
            and avg_latency < self._latency_threshold
        )

    def get_worker_health_report(self, worker_id: str) -> Dict[str, Any]:
        """Generate a health report for a specific worker."""
        metrics = self._worker_metrics.get(worker_id, deque())
        if not metrics:
            return {"status": "unknown", "data_points": 0}

        recent = list(metrics)[-20:]
        return {
            "status": "healthy" if self.is_healthy(worker_id) else "unhealthy",
            "circuit_breaker": self._circuit_breaker_state.get(worker_id, "closed"),
            "consecutive_failures": self._consecutive_failures.get(worker_id, 0),
            "data_points": len(metrics),
            "avg_error_rate": sum(m.error_rate for m in recent) / len(recent),
            "avg_latency_ms": sum(m.p99_latency_ms for m in recent) / len(recent),
            "avg_cpu": sum(m.cpu_utilization for m in recent) / len(recent),
            "avg_memory": sum(m.memory_utilization for m in recent) / len(recent),
        }
```

---

## 7. Supervision Strategies

### Erlang/OTP-Inspired Supervision Trees

```
Supervision Strategies:
───────────────────────

one_for_one:     If a worker crashes, only that worker is restarted.
                 Other workers continue unaffected.

one_for_all:     If any worker crashes, ALL workers are restarted.
                 Used when workers have tight interdependencies.

rest_for_one:    If a worker crashes, that worker and all workers
                 started AFTER it are restarted.

simple_one_for_one: A simplified one_for_one for dynamically
                    spawned workers of the same type.
```

```python
class SupervisionStrategy(Enum):
    ONE_FOR_ONE = "one_for_one"
    ONE_FOR_ALL = "one_for_all"
    REST_FOR_ONE = "rest_for_one"


@dataclass
class SupervisorSpec:
    strategy: SupervisionStrategy
    max_restarts: int = 3
    max_restart_window_seconds: float = 60.0
    children: List[str] = field(default_factory=list)


class SupervisionTree:
    """Erlang/OTP-inspired supervision tree for agent processes."""

    def __init__(self, spec: SupervisorSpec):
        self._spec = spec
        self._restart_history: List[float] = []
        self._children_order: List[str] = list(spec.children)

    async def handle_child_failure(self, failed_child: str) -> List[str]:
        """Determine which children to restart based on strategy."""
        self._restart_history.append(time.time())
        self._prune_restart_history()

        if len(self._restart_history) > self._spec.max_restarts:
            raise RuntimeError(
                f"Max restarts ({self._spec.max_restarts}) exceeded "
                f"in {self._spec.max_restart_window_seconds}s window"
            )

        if self._spec.strategy == SupervisionStrategy.ONE_FOR_ONE:
            return [failed_child]
        elif self._spec.strategy == SupervisionStrategy.ONE_FOR_ALL:
            return list(self._children_order)
        elif self._spec.strategy == SupervisionStrategy.REST_FOR_ONE:
            idx = self._children_order.index(failed_child)
            return self._children_order[idx:]
        return [failed_child]

    def _prune_restart_history(self) -> None:
        """Remove restart entries older than the window."""
        cutoff = time.time() - self._spec.max_restart_window_seconds
        self._restart_history = [
            t for t in self._restart_history if t > cutoff
        ]
```

---

## 8. Result Aggregation Patterns

### Aggregation Strategies

```python
from abc import ABC, abstractmethod


class ResultAggregator(ABC):
    @abstractmethod
    def aggregate(self, results: List[Any]) -> Any:
        pass


class MergeAggregator(ResultAggregator):
    """Merge dictionaries from multiple workers."""

    def aggregate(self, results: List[Dict]) -> Dict:
        merged = {}
        for result in results:
            if isinstance(result, dict):
                merged.update(result)
        return merged


class VotingAggregator(ResultAggregator):
    """Select the most common result via majority voting."""

    def aggregate(self, results: List[Any]) -> Any:
        from collections import Counter
        hashable = [str(r) for r in results]
        counter = Counter(hashable)
        winner, _ = counter.most_common(1)[0]
        # Return the original result object
        for r, h in zip(results, hashable):
            if h == winner:
                return r
        return results[0]


class ConcatenationAggregator(ResultAggregator):
    """Concatenate list results from multiple workers."""

    def aggregate(self, results: List[List]) -> List:
        combined = []
        for result in results:
            if isinstance(result, list):
                combined.extend(result)
        return combined


class QualityRankedAggregator(ResultAggregator):
    """Select the highest-quality result based on a scoring function."""

    def __init__(self, scorer: Callable[[Any], float]):
        self._scorer = scorer

    def aggregate(self, results: List[Any]) -> Any:
        if not results:
            return None
        return max(results, key=self._scorer)
```

---

## Cross-References

- Orchestration patterns: `orchestrator-patterns.md`
- Communication protocols: `inter-agent-protocols.md`
- Task decomposition: `dag-task-decomposition.md`
- Shared state: `state-sharing-mechanisms.md`
- Failure handling: `failure-rate-mitigation.md`
- Role design: `role-specialization-patterns.md`
- Consensus: `consensus-coordination.md`
