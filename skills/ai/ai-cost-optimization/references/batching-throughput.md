# Batching and Throughput Optimization

## Overview

Batching is one of the most effective techniques for reducing per-query costs and improving throughput in LLM inference. By grouping multiple requests together, you amortize the overhead of model loading, attention computation, and memory bandwidth across more queries.

## Batching Strategies

### Static Batching

Collect a fixed number of requests before processing.

```python
import asyncio
from typing import List, Dict, Any

class StaticBatcher:
    def __init__(self, model, batch_size: int = 8):
        self.model = model
        self.batch_size = batch_size
        self.queue: asyncio.Queue = asyncio.Queue()

    async def submit(self, prompt: str) -> str:
        future = asyncio.get_event_loop().create_future()
        await self.queue.put({"prompt": prompt, "future": future})
        return await future

    async def _process_loop(self):
        while True:
            items = []
            for _ in range(self.batch_size):
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=0.01)
                    items.append(item)
                except asyncio.TimeoutError:
                    break
            if items:
                prompts = [item["prompt"] for item in items]
                results = await self.model.generate(prompts)
                for item, result in zip(items, results):
                    item["future"].set_result(result)

    async def start(self):
        asyncio.create_task(self._process_loop())
```

### Dynamic Batching

Collect requests with a maximum wait time and batch size.

```python
import asyncio
import time
from typing import List, Dict, Optional

class DynamicBatcher:
    def __init__(self, model, max_batch_size: int = 16, max_wait_ms: int = 100):
        self.model = model
        self.max_batch_size = max_batch_size
        self.max_wait = max_wait_ms / 1000.0
        self.queue: asyncio.Queue = asyncio.Queue()

    async def submit(self, prompt: str) -> str:
        future = asyncio.get_event_loop().create_future()
        await self.queue.put({"prompt": prompt, "future": future, "arrived": time.time()})
        return await future

    async def _batch_loop(self):
        while True:
            batch = []
            deadline = time.time() + self.max_wait
            first_item = await self.queue.get()
            batch.append(first_item)
            while len(batch) < self.max_batch_size:
                remaining = deadline - time.time()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=remaining)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break
            results = await self.model.generate([b["prompt"] for b in batch])
            for item, result in zip(batch, results):
                item["future"].set_result(result)

    async def start(self, concurrency: int = 2):
        for _ in range(concurrency):
            asyncio.create_task(self._batch_loop())
```

### Continuous Batching

Found in production LLM servers like vLLM and TensorRT-LLM. New requests join an ongoing batch as completed sequences are removed.

```python
class ContinuousBatcher:
    def __init__(self, model, max_total_tokens: int = 4096):
        self.model = model
        self.max_total_tokens = max_total_tokens
        self.active_sequences: List[Dict] = []
        self.pending_queue: List[Dict] = []

    def add_request(self, prompt: str, max_tokens: int = 256):
        self.pending_queue.append({
            "prompt": prompt,
            "max_tokens": max_tokens,
            "generated": [],
            "completed": False,
        })

    def _select_batch(self) -> List[Dict]:
        batch = []
        total_tokens = 0
        for seq in self.active_sequences:
            tokens = len(seq["generated"])
            if tokens < seq["max_tokens"]:
                batch.append(seq)
                total_tokens += tokens
        for seq in self.pending_queue:
            if len(batch) >= 8 or total_tokens >= self.max_total_tokens:
                break
            batch.append(seq)
            total_tokens += len(seq["prompt"].split())
        self.pending_queue = [
            p for p in self.pending_queue if p not in batch
        ]
        return batch

    def step(self) -> List[str]:
        batch = self._select_batch()
        if not batch:
            return []
        outputs = self.model.generate_step(
            [b["prompt"] + "".join(b["generated"]) for b in batch]
        )
        results = []
        for seq, token in zip(batch, outputs):
            seq["generated"].append(token)
            if len(seq["generated"]) >= seq["max_tokens"]:
                seq["completed"] = True
                results.append("".join(seq["generated"]))
        self.active_sequences = [s for s in batch if not s["completed"]]
        return results

    def finish(self) -> List[str]:
        results = []
        while self.active_sequences or self.pending_queue:
            results.extend(self.step())
        return results
```

## Throughput Metrics

### Key Performance Indicators

```python
from dataclasses import dataclass
from typing import List

@dataclass
class ThroughputMeasurement:
    total_queries: int
    total_time_seconds: float
    total_tokens_generated: int
    total_tokens_input: int

class ThroughputAnalyzer:
    def __init__(self):
        self.measurements: List[ThroughputMeasurement] = []

    def add_measurement(self, m: ThroughputMeasurement):
        self.measurements.append(m)

    def queries_per_second(self) -> float:
        total_time = sum(m.total_time_seconds for m in self.measurements)
        total_q = sum(m.total_queries for m in self.measurements)
        return total_q / total_time if total_time > 0 else 0

    def tokens_per_second(self) -> float:
        total_time = sum(m.total_time_seconds for m in self.measurements)
        total_tokens = sum(
            m.total_tokens_generated + m.total_tokens_input
            for m in self.measurements
        )
        return total_tokens / total_time if total_time > 0 else 0

    def latency_p50(self, latencies: List[float]) -> float:
        sorted_lat = sorted(latencies)
        idx = len(sorted_lat) // 2
        return sorted_lat[idx]

    def latency_p99(self, latencies: List[float]) -> float:
        sorted_lat = sorted(latencies)
        idx = int(len(sorted_lat) * 0.99)
        return sorted_lat[idx]

    def cost_per_query(self, model_pricing: dict) -> float:
        total_cost = 0.0
        for m in self.measurements:
            input_cost = m.total_tokens_input * model_pricing.get("input", 0) / 1000
            output_cost = m.total_tokens_generated * model_pricing.get("output", 0) / 1000
            total_cost += input_cost + output_cost
        return total_cost / sum(m.total_queries for m in self.measurements) if self.measurements else 0.0
```

### Benchmark Harness

```python
import asyncio
import time
from typing import List, Dict, Callable, Awaitable

class BatchBenchmark:
    def __init__(self, model_fn: Callable[[List[str]], Awaitable[List[str]]]):
        self.model_fn = model_fn

    async def run_benchmark(
        self,
        prompts: List[str],
        batch_sizes: List[int],
        warmup: int = 10,
    ) -> Dict[int, Dict]:
        results = {}
        for batch_size in batch_sizes:
            batcher = DynamicBatcher(self.model_fn, max_batch_size=batch_size, max_wait_ms=50)
            asyncio.create_task(batcher._batch_loop())
            await asyncio.sleep(0.1)

            latencies = []
            start = time.perf_counter()
            tasks = [batcher.submit(p) for p in prompts[:warmup]]
            await asyncio.gather(*tasks)

            tasks = [batcher.submit(p) for p in prompts]
            t0 = time.perf_counter()
            await asyncio.gather(*tasks)
            elapsed = time.perf_counter() - t0

            results[batch_size] = {
                "queries": len(prompts),
                "total_time": elapsed,
                "qps": len(prompts) / elapsed,
            }
        return results

    async def find_optimal_batch_size(
        self, prompts: List[str], batch_sizes: List[int], latency_budget_ms: float = 500
    ) -> int:
        results = await self.run_benchmark(prompts, batch_sizes)
        best = batch_sizes[0]
        for bs, metrics in results.items():
            latency_per_query = metrics["total_time"] / metrics["queries"] * 1000
            if (latency_per_query < latency_budget_ms and
                metrics["qps"] > results[best]["qps"]):
                best = bs
        return best
```

## Cost-Performance Tradeoffs

### Efficiency Curves

```python
import matplotlib.pyplot as plt
from typing import List, Tuple

class EfficiencyAnalyzer:
    def __init__(self):
        self.data_points: List[Tuple[int, float, float]] = []  # (batch_size, latency, cost)

    def add_point(self, batch_size: int, latency_ms: float, cost_usd: float):
        self.data_points.append((batch_size, latency_ms, cost_usd))

    def pareto_frontier(self) -> List[Tuple[int, float, float]]:
        sorted_points = sorted(self.data_points, key=lambda x: x[1])
        frontier = []
        min_cost = float("inf")
        for bs, lat, cost in sorted_points:
            if cost < min_cost:
                frontier.append((bs, lat, cost))
                min_cost = cost
        return frontier

    def recommend_batch_size(self, latency_budget_ms: float, max_cost: float) -> int:
        feasible = [
            (bs, lat, cost)
            for bs, lat, cost in self.data_points
            if lat <= latency_budget_ms and cost <= max_cost
        ]
        if not feasible:
            return 1
        feasible.sort(key=lambda x: -x[0])
        return feasible[0][0]

    def cost_per_token_by_batch(self, batch_sizes: List[int], tokens_per_query: int) -> Dict:
        costs = {}
        for bs in batch_sizes:
            overhead = 0.1  # fixed overhead per batch
            per_query_overhead = overhead / bs
            costs[bs] = {
                "overhead_per_query": per_query_overhead,
                "total_per_query": per_query_overhead + 0.001 * tokens_per_query,
                "estimated_savings_vs_no_batch": (1 - (per_query_overhead + 0.001 * tokens_per_query) / (0.1 + 0.001 * tokens_per_query)) * 100
            }
        return costs
```

## Queue Management

### Priority Batching

```python
import asyncio
import heapq
from enum import IntEnum
from typing import Optional

class Priority(IntEnum):
    CRITICAL = 0
    HIGH = 1
    NORMAL = 2
    LOW = 3
    BULK = 4

class PriorityBatchQueue:
    def __init__(self, model, max_batch_size: int = 8):
        self.model = model
        self.max_batch_size = max_batch_size
        self.queues = {p: [] for p in Priority}
        self._running = False

    async def submit(self, prompt: str, priority: Priority = Priority.NORMAL) -> str:
        future = asyncio.get_event_loop().create_future()
        heapq.heappush(self.queues[priority], (time.time(), prompt, future))
        return await future

    async def _drain(self):
        batch = []
        for p in Priority:
            while len(batch) < self.max_batch_size and self.queues[p]:
                _, prompt, future = heapq.heappop(self.queues[p])
                batch.append({"prompt": prompt, "future": future})
            if len(batch) >= self.max_batch_size:
                break
        return batch

    async def process(self):
        self._running = True
        while self._running:
            batch = []
            for p in Priority:
                while len(batch) < self.max_batch_size and self.queues[p]:
                    _, prompt, future = heapq.heappop(self.queues[p])
                    batch.append({"prompt": prompt, "future": future})
                if batch:
                    break
            if not batch:
                await asyncio.sleep(0.01)
                continue
            results = await self.model.generate([b["prompt"] for b in batch])
            for item, result in zip(batch, results):
                item["future"].set_result(result)
```

### Request Coalescing

```python
class RequestCoalescer:
    def __init__(self, model, max_coalesce: int = 5, max_delay_ms: int = 50):
        self.model = model
        self.max_coalesce = max_coalesce
        self.max_delay = max_delay_ms / 1000.0
        self._pending: Dict[str, List[asyncio.Future]] = {}

    async def get_or_compute(self, cache_key: str, prompt_fn: Callable) -> str:
        if cache_key not in self._pending:
            self._pending[cache_key] = []
            asyncio.create_task(self._resolve(cache_key, prompt_fn))
        future = asyncio.get_event_loop().create_future()
        self._pending[cache_key].append(future)
        return await future

    async def _resolve(self, cache_key: str, prompt_fn: Callable):
        await asyncio.sleep(self.max_delay)
        prompt = prompt_fn()
        result = await self.model.generate([prompt])
        futures = self._pending.pop(cache_key, [])
        for f in futures:
            f.set_result(result[0])
```

## Hardware Considerations

### Memory-Bound vs Compute-Bound

```python
class BatchSizeTuner:
    def __init__(self, gpu_memory_gb: int, model_size_gb: float, kv_cache_per_token_mb: float):
        self.gpu_memory = gpu_memory_gb * 1024
        self.model_size = model_size_gb * 1024
        self.kv_cache_per_token = kv_cache_per_token_mb

    def max_batch_size(self, sequence_length: int, output_length: int) -> int:
        kv_per_sequence = (sequence_length + output_length) * self.kv_cache_per_token
        available = self.gpu_memory - self.model_size - 512  # 512MB overhead
        return max(1, int(available / kv_per_sequence))

    def recommend_batch_config(self, sequence_length: int) -> Dict:
        base_bs = self.max_batch_size(sequence_length, 256)
        return {
            "max_batch_size": base_bs,
            "recommended_batch": min(base_bs, 32),
            "throughput_estimate_qps": base_bs * (1000 / (200 + sequence_length * 0.5)),
            "memory_utilization_pct": (
                (self.model_size + base_bs * (sequence_length + 256) * self.kv_cache_per_token)
                / self.gpu_memory * 100
            ),
        }
```

## Production Batching Pipeline

### End-to-End Implementation

```python
from typing import List, Dict, Optional, Callable
import asyncio
import time
import logging

logger = logging.getLogger(__name__)

class BatchPipeline:
    def __init__(
        self,
        model_fn: Callable,
        max_batch_size: int = 16,
        max_wait_ms: int = 100,
        max_queue_size: int = 1000,
        retry_on_failure: bool = True,
        max_retries: int = 3,
    ):
        self.model_fn = model_fn
        self.max_batch_size = max_batch_size
        self.max_wait = max_wait_ms / 1000.0
        self.max_queue_size = max_queue_size
        self.retry_on_failure = retry_on_failure
        self.max_retries = max_retries
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self._stats = {"submitted": 0, "completed": 0, "failed": 0, "batches": 0}

    async def infer(self, prompt: str, timeout: float = 30.0) -> str:
        future = asyncio.get_event_loop().create_future()
        try:
            await asyncio.wait_for(
                self.queue.put({"prompt": prompt, "future": future, "arrived": time.time()}),
                timeout=timeout,
            )
            self._stats["submitted"] += 1
        except asyncio.TimeoutError:
            raise TimeoutError("Queue full, request rejected")
        return await asyncio.wait_for(future, timeout=timeout)

    async def _batch_processor(self):
        while True:
            batch = []
            deadline = time.time() + self.max_wait
            try:
                item = await asyncio.wait_for(self.queue.get(), timeout=self.max_wait)
                batch.append(item)
            except asyncio.TimeoutError:
                continue
            while len(batch) < self.max_batch_size:
                remaining = deadline - time.time()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=remaining)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break
            self._stats["batches"] += 1
            asyncio.create_task(self._execute_batch(batch))

    async def _execute_batch(self, batch: List[Dict]):
        prompts = [b["prompt"] for b in batch]
        for attempt in range(self.max_retries if self.retry_on_failure else 1):
            try:
                results = await self.model_fn(prompts)
                for item, result in zip(batch, results):
                    item["future"].set_result(result)
                self._stats["completed"] += len(batch)
                return
            except Exception as e:
                logger.warning(f"Batch attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
        for item in batch:
            item["future"].set_exception(RuntimeError("Batch processing failed"))
            self._stats["failed"] += 1

    async def start(self, workers: int = 1):
        for _ in range(workers):
            asyncio.create_task(self._batch_processor())

    def stats(self) -> Dict:
        return {**self._stats, "queue_size": self.queue.qsize()}
```

## Key Points

- Static batching works best for offline workloads with predictable request volume.
- Dynamic batching balances latency and throughput by using a max wait time.
- Continuous batching maximizes GPU utilization by allowing sequences to complete asynchronously.
- Priority batching ensures critical requests bypass queue delays.
- Request coalescing merges duplicate requests into a single computation.
- Measure queries per second, tokens per second, P50/P99 latency, and cost per query.
- Use Pareto frontier analysis to find the optimal batch size for your latency budget.
- Batch size is limited by GPU memory (model weights + KV cache per sequence).
- Always warm up the model with dummy requests before benchmarking.
- Monitor queue depth and rejection rates as early indicators of overload.
- Implement retry with exponential backoff for transient batch failures.
- The optimal batch size depends on the specific model, hardware, and workload characteristics.
- Test different batch sizes in production with A/B comparison before committing.
- Combining batching with caching yields multiplicative cost savings.
