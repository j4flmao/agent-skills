# Performance Optimization in Python

## Overview
Python's dynamic nature and the GIL pose unique performance challenges. This document covers Asyncio, the GIL, multiprocessing, profiling, and memory management.

## 1. Asyncio Pitfalls and Best Practices
Asyncio is for I/O-bound workloads, not CPU-bound workloads.

### Pitfalls
- **Blocking the Event Loop:** Running synchronous CPU-heavy code or blocking I/O (like `requests` or standard SQLAlchemy) inside an `async def` function. This halts the entire loop.

### Best Practices
- Use `aiohttp` or `httpx` for HTTP.
- Use `asyncpg` or async SQLAlchemy for databases.
- Offload CPU-bound tasks to thread or process pools.

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

def cpu_bound_task(data):
    return sum(i * i for i in range(data))

async def main():
    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, cpu_bound_task, 10000000)
        print(result)
```

## 2. The GIL and Multiprocessing
The Global Interpreter Lock (GIL) prevents multiple native threads from executing Python bytecodes at once.
- **Threads:** Good for I/O bound (waiting on network/disk).
- **Processes:** Good for CPU bound. Bypasses the GIL by spawning separate OS processes, but uses more memory.

## 3. Profiling Tools
Never guess performance bottlenecks; always measure.

### cProfile
Built-in deterministic profiler. Good for macro-level analysis.
```bash
python -m cProfile -o output.pstats my_script.py
```

### py-spy
Sampling profiler. Can attach to running processes without modifying code. Low overhead.
```bash
py-spy top --pid 12345
py-spy record -o profile.svg --pid 12345
```

## 4. Memory Leaks and Tracemalloc
Python uses reference counting and a garbage collector. Leaks happen via circular references or infinitely growing global caches.

### Using tracemalloc
```python
import tracemalloc

tracemalloc.start()
# ... run problematic code ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

for stat in top_stats[:10]:
    print(stat)
```

## 5. Pydantic v2 Performance
Pydantic v2 is rewritten in Rust (pydantic-core), offering 5-50x speedups over v1.
- Use `model_dump()` instead of `dict()`.
- Use `TypeAdapter` for parsing arbitrary data without creating model instances.

## 6. Gunicorn / Uvicorn Worker Tuning
Proper worker configuration is critical for deployment.

- **Sync Workers (Gunicorn):** `workers = (2 * CPU_CORES) + 1`
- **Async Workers (Uvicorn):** Fewer workers, highly concurrent.
```bash
# Running a FastAPI app with Gunicorn and Uvicorn workers
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```
