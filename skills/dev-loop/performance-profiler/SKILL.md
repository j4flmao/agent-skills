---
name: dev-loop-performance-profiler
description: >
  Use when the user asks about performance profiling, application performance, profiling tools, performance optimization, bottleneck analysis, or performance testing. Do NOT use for: debugging bugs (dev-loop-debugging-strategy), or code review (dev-loop-code-review).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, performance, profiling, optimization]
---

# Performance Profiler

## Purpose
Identify, analyze, and resolve performance bottlenecks in applications — CPU profiling, memory profiling, I/O analysis, database query optimization, and frontend rendering performance — using systematic measurement and optimization.

## Agent Protocol

### Trigger
Exact user phrases: "performance profiling", "profiling", "slow application", "performance bottleneck", "CPU profiler", "memory leak", "heap dump", "database slow query", "performance optimization", "flame graph", "page speed", "LCP", "FID", "CLS".

### Input Context
- Performance symptom (slow response, high CPU, memory growth, network latency, UI jank)
- Application type (web frontend, API server, database, desktop, mobile)
- Environment (local development, staging, production, specific user)
- Scale (single user, concurrent, burst traffic, sustained load)
- Recent changes (deployment, dependency update, config change, migration)
- Available tools (built-in profiler, APM, browser DevTools, database tools)

### Output Artifact
Performance analysis report with measured metrics, bottleneck identification, and optimized code.

### Completion Criteria
- [ ] Baseline performance metrics established
- [ ] Profiling tool selected and configured
- [ ] CPU/memory/IO hot spots identified
- [ ] Root cause of bottleneck documented
- [ ] Optimization implemented and measured
- [ ] Improvement verified with before/after metrics
- [ ] Regression benchmark added
- [ ] Monitoring alert configured (if in production)

### Max Response Length
200 lines.

## Framework/Methodology

### Performance Analysis Decision Tree
```
What is the performance symptom?
├── Slow API response time → Server-side profiling
│   → APM (DataDog, New Relic) → flame graph → database query analysis
│   → Cache strategy → N+1 query → index → pagination
├── High CPU usage → CPU profiling
│   → Sampling profiler → hot functions → algorithm optimization
│   → Worker threads → microservices → resource limits
├── Memory growth / leak → Memory profiling
│   → Heap dump → retained size → leak suspect → fix
│   → Event listener cleanup → cache size → object pooling
├── Slow page load (frontend) → Browser DevTools
│   → Lighthouse → Largest Contentful Paint → bundle analysis
│   → Code splitting → image optimization → lazy loading
├── Slow database queries → Query profiling
│   → EXPLAIN ANALYZE → missing index → full table scan
│   → Query rewrite → denormalization → read replica
└── Network latency → Request waterfall
    → Waterfall chart → CDN → compression → HTTP/2 → prefetch
```

### Performance Optimization Process
```
1. MEASURE  → Establish baseline (not assumptions!)
2. IDENTIFY → Find the bottleneck (not everything is slow)
3. ANALYZE  → Understand WHY it's slow
4. OPTIMIZE → Make targeted change (one change at a time)
5. MEASURE  → Verify improvement (same conditions as baseline)
6. REPEAT   → Find next bottleneck
```

### Amdahl's Law
```
Speedup = 1 / ((1 - P) + (P/S))

Where P = proportion of execution time improved
      S = speedup of that portion

Key insight: Optimize what matters most. A 10x improvement on 5% of execution
time only yields 4.7% overall speedup.
```

## Workflow

### Step 1: Profile CPU (Server-Side)

```bash
# Node.js: built-in profiler
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Node.js: clinic.js (flame graphs)
npx clinic doctor -- node app.js
npx clinic flame -- node app.js

# Python: cProfile
python -m cProfile -o output.prof app.py
python -m pstats output.prof  # Interactive analysis
# Or use snakeviz for visualization: snakeviz output.prof

# Rust: perf + flamegraph
perf record --call-graph dwarf target/release/myapp
perf script | inferno-collapse-perf > stacks.folded
inferno-flamegraph stacks.folded > flamegraph.svg

# C# / .NET: dotnet-counters + dotnet-trace
dotnet-counters monitor --process-id <pid>
dotnet-trace collect --process-id <pid> --providers Microsoft-DotNETCore-SampleProfiler
```

### Step 2: Profile Memory

```typescript
// Node.js: heap snapshot
import * as v8 from 'v8';
import * as fs from 'fs';

// Take heap snapshot programmatically
const snapshot = v8.getHeapSnapshot();
snapshot.pipe(fs.createWriteStream('heap.heapsnapshot'));
// Open in Chrome DevTools → Memory → Load

// Track memory over time
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    rss: `${(usage.rss / 1024 / 1024).toFixed(1)} MB`,    // Resident Set Size
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(1)} MB`,
  });
}, 5000);
```

```python
# Python: memory profiler
from memory_profiler import profile

@profile
def my_function():
    # ... heavy operation
```

```bash
# Java: jmap heap dump
jmap -dump:live,format=b,file=heap.hprof <pid>
# Analyze with Eclipse MAT, JProfiler, or YourKit

# .NET: dotnet-gcdump
dotnet-gcdump collect -p <pid> -o heap.gcdump
```

### Step 3: Profile Database Queries

```sql
-- PostgreSQL: slow query log
-- In postgresql.conf:
log_min_duration_statement = 200  -- Log queries taking >200ms
log_connections = on
log_disconnections = on

-- EXPLAIN ANALYZE (actual execution)
EXPLAIN ANALYZE
SELECT u.*, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2026-01-01'
GROUP BY u.id
ORDER BY order_count DESC;

-- Look for: Seq Scan (full table scan), high cost, large actual rows
-- Solutions: missing index → CREATE INDEX CONCURRENTLY

-- Slow query identification
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Index usage analysis
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 10;  -- Unused indexes
```

```bash
# MongoDB: slow query profiler
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find({ millis: { $gt: 200 } }).sort({ ts: -1 }).limit(10)

# Redis: slow log
SLOWLOG GET 10
SLOWLOG RESET
```

### Step 4: Profile Frontend (Browser)

```javascript
// Performance API (User Timing)
performance.mark('start-load');
await loadData();
performance.mark('end-load');
performance.measure('data-loading', 'start-load', 'end-load');
console.log(performance.getEntriesByType('measure'));

// Web Vitals (Core Web Vitals)
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

onCLS(console.log);     // Cumulative Layout Shift
onFCP(console.log);     // First Contentful Paint
onLCP(console.log);     // Largest Contentful Paint
onTTFB(console.log);    // Time to First Byte

// Performance Observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.duration);
  }
});
observer.observe({ entryTypes: ['resource', 'longtask', 'layout-shift'] });
```

### Step 5: Load Testing

```yaml
# k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.05'],              // Error rate under 5%
  },
};

export default function () {
  const res = http.get('https://api.example.com/items');
  check(res, { 'status is 200': (r) => r.status === 200 });
  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  sleep(1);
}
```

### Step 6: Common Optimizations

```yaml
optimizations:
  database:
    - "Add missing indexes (query WHERE, JOIN, ORDER BY columns)"
    - "N+1 query detection → eager loading (JOIN, IN, includes)"
    - "Pagination with cursor-based (not OFFSET) for large datasets"
    - "Connection pooling (pgBouncer, HikariCP)"
    - "Read replicas for reporting queries"
    - "Materialized views for expensive aggregations"

  caching:
    - "HTTP caching headers (Cache-Control, ETag)"
    - "CDN for static assets"
    - "Redis/Memcached for API response cache"
    - "Client-side SWR/stale-while-revalidate"
    - "Database query cache (redis cache-aside pattern)"

  code:
    - "Avoid N+1 in ORM queries (use eager loading)"
    - "Lazy loading for heavy resources (code splitting, dynamic import)"
    - "Memoization for expensive function calls"
    - "Debounce/throttle for frequent events (scroll, resize)"
    - "Web Workers for CPU-heavy computation (browser)"
    - "Worker threads for CPU tasks (Node.js)"
    - "Stream large responses (don't buffer in memory)"

  frontend:
    - "Bundle analysis → code splitting → tree shaking"
    - "Image optimization (WebP, AVIF, responsive srcset)"
    - "Font subsetting and preloading"
    - "Preconnect to third-party origins"
    - "Virtual scrolling for long lists"
    - "Avoid layout thrashing (batch DOM reads/writes)"
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Optimizing without measuring | "Fixing" what might not be the bottleneck | Always profile first, measure before and after |
| Premature optimization | Complicated code for unproven bottlenecks | Make it work, then make it fast |
| Ignoring P95/P99 latencies | Average hides the tail latency | Track percentiles, not just averages |
| One-size cache | Caching everything without strategy | Cache the right data with appropriate TTL |
| Not testing with production data | Benchmarks with toy data miss real patterns | Use production data or realistic scale |
| Optimizing cold start | Improving startup but not steady state | Measure both warm and cold performance |
| Ignoring GC pauses | Memory freed but app pauses | Use real-time GC logs, measure pause times |
| Over-optimizing SQL | Complex query with marginal gain | Profile shows what to optimize |
| No performance regression testing | Reverting gains with future changes | CI performance benchmarks |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Measure before optimizing | Assumptions about bottlenecks are often wrong |
| Use percentile metrics | P50, P95, P99 tell the real story |
| Profile in production-like environment | Dev and staging behavior differs from production |
| One optimization at a time | Multiple changes = unknown what worked |
| Add benchmarks to CI | Prevent performance regression |
| Monitor continuously | Performance changes over time |
| Set performance budgets | Enforce limits on bundle size, response time |
| Profile with realistic data | Small datasets hide performance issues |
| Use flame graphs for CPU | Visualize where time is actually spent |
| Check GC logs for memory issues | Allocation rate = GC frequency |

## References
   - references/performance-profiler-advanced.md — Performance Profiler Advanced Topics
   - references/performance-profiler-database.md — Database Profiling Reference
   - references/performance-profiler-frontend.md — Frontend Profiling Reference
   - references/performance-profiler-fundamentals.md — Performance Profiler Fundamentals

## Implementation Patterns

### Performance Profiler CLI

```python
#!/usr/bin/env python3
import time
import functools
import statistics
import logging
from typing import Callable, Any, Dict, List, Optional
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("perf-profiler")

@dataclass
class ProfileResult:
    name: str
    calls: int = 0
    total_time: float = 0.0
    min_time: float = float("inf")
    max_time: float = 0.0
    times: List[float] = field(default_factory=list)

    @property
    def avg_time(self) -> float:
        return self.total_time / max(self.calls, 1)

    @property
    def median_time(self) -> float:
        return statistics.median(self.times) if self.times else 0.0

    @property
    def p95_time(self) -> float:
        if not self.times:
            return 0.0
        sorted_times = sorted(self.times)
        idx = int(len(sorted_times) * 0.95)
        return sorted_times[idx]

    @property
    def p99_time(self) -> float:
        if not self.times:
            return 0.0
        sorted_times = sorted(self.times)
        idx = int(len(sorted_times) * 0.99)
        return sorted_times[idx]


class ProfilerManager:
    def __init__(self):
        self.results: Dict[str, ProfileResult] = {}

    def profile(self, name: str) -> Callable:
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs) -> Any:
                start = time.perf_counter()
                result = func(*args, **kwargs)
                elapsed = time.perf_counter() - start
                if name not in self.results:
                    self.results[name] = ProfileResult(name=name)
                result_obj = self.results[name]
                result_obj.calls += 1
                result_obj.total_time += elapsed
                result_obj.min_time = min(result_obj.min_time, elapsed)
                result_obj.max_time = max(result_obj.max_time, elapsed)
                result_obj.times.append(elapsed)
                return result
            return wrapper
        return decorator

    @contextmanager
    def measure(self, name: str):
        start = time.perf_counter()
        try:
            yield
        finally:
            elapsed = time.perf_counter() - start
            if name not in self.results:
                self.results[name] = ProfileResult(name=name)
            result = self.results[name]
            result.calls += 1
            result.total_time += elapsed
            result.min_time = min(result.min_time, elapsed)
            result.max_time = max(result.max_time, elapsed)
            result.times.append(elapsed)

    def report(self, sort_by: str = "total_time") -> str:
        sorted_results = sorted(
            self.results.values(),
            key=lambda r: getattr(r, sort_by),
            reverse=True,
        )
        lines = ["## Performance Profile Report"]
        lines.append(f"{'Name':<40} {'Calls':<8} {'Total':<10} {'Avg':<10} {'P95':<10} {'P99':<10}")
        lines.append("-" * 88)
        for r in sorted_results:
            lines.append(
                f"{r.name:<40} {r.calls:<8} {r.total_time*1000:<10.2f} "
                f"{r.avg_time*1000:<10.2f} {r.p95_time*1000:<10.2f} {r.p99_time*1000:<10.2f}"
            )
        lines.append(f"\nTotal profiled: {sum(r.calls for r in sorted_results)} calls")
        total = sum(r.total_time for r in sorted_results)
        lines.append(f"Total time: {total*1000:.2f}ms")
        return "\n".join(lines)

    def find_hotspots(self, threshold_pct: float = 5.0) -> List[ProfileResult]:
        total = sum(r.total_time for r in self.results.values())
        hotspots = []
        for r in self.results.values():
            pct = (r.total_time / total) * 100 if total > 0 else 0
            if pct >= threshold_pct:
                hotspots.append(r)
        return sorted(hotspots, key=lambda r: r.total_time, reverse=True)

profiler = ProfilerManager()
```

### Memory Usage Snapshot Tool

```python
import tracemalloc
import gc
from typing import Dict, List, Optional

class MemoryProfiler:
    def __init__(self):
        self.snapshots = []
        self.tracemalloc_started = False

    def start_tracing(self):
        if not self.tracemalloc_started:
            tracemalloc.start(25)
            self.tracemalloc_started = True

    def snapshot_memory(self, label: str = ""):
        if self.tracemalloc_started:
            snapshot = tracemalloc.take_snapshot()
            self.snapshots.append((label, snapshot, tracemalloc.get_traced_memory()))

    def compare_snapshots(self, idx1: int = 0, idx2: int = -1, top_n: int = 10) -> str:
        if len(self.snapshots) < 2:
            return "Need at least 2 snapshots for comparison"
        label1, snap1, mem1 = self.snapshots[idx1]
        label2, snap2, mem2 = self.snapshots[idx2]
        diff = snap2.compare_to(snap1, "traceback")
        stats = diff[:top_n]
        lines = [f"## Memory Comparison: {label1} \u2192 {label2}"]
        lines.append(f"Memory: {mem1[0]/1024:.1f}KB \u2192 {mem2[0]/1024:.1f}KB ({mem2[0]-mem1[0]:+.1f}B)")
        lines.append(f"\nTop {top_n} allocations:\n")
        for stat in stats:
            lines.append(f"  +{stat.size_diff / 1024:.1f}KB ({stat.count_diff} blocks):")
            for frame in stat.traceback[:3]:
                lines.append(f"    {frame.filename}:{frame.lineno} in {frame.function}")
        return "\n".join(lines)

    def analyze_garbage(self) -> Dict:
        unreachable = gc.collect()
        objects = gc.get_objects()
        type_counts = {}
        for obj in objects:
            t = type(obj).__name__
            type_counts[t] = type_counts.get(t, 0) + 1
        sorted_types = sorted(type_counts.items(), key=lambda x: -x[1])[:15]
        return {
            "unreachable_objects": unreachable,
            "total_objects": len(objects),
            "top_types": sorted_types,
        }
```

## Architecture Decision Trees

### Performance Issue Diagnosis

```
What's the symptom?
├── Slow response time
│   ├── API latency \u2192 Check database queries, external calls, serialization
│   ├── Page load \u2192 Check bundle size, render blocking resources, images
│   └── File processing \u2192 Check I/O, algorithms, concurrent processing
│
├── High CPU usage
│   ├── Tight loops \u2192 Check algorithmic complexity, add breaks/yields
│   ├── Excessive GC \u2192 Reduce allocation rate, object pooling
│   └── Infinite recursion \u2192 Add base case or recursion limit
│
├── Memory growth
│   ├── Object accumulation \u2192 Check collection cleanup, weak references
│   ├── Cache bloat \u2192 Add TTL, size limit, eviction policy
│   └── Closure references \u2192 Check captured variables scope
│
└── I/O bottleneck
    ├── Database \u2192 Add indexes, connection pool, query optimization, caching
    ├── Network \u2192 Reduce payload, compression, batching requests
    └── Disk \u2192 Async I/O, buffering, sequential reads
```

### Optimization Strategy Selection

```
What's the impact/effort ratio?
├── Quick wins (low effort, high impact)
│   ├── Add caching (Redis, in-memory, CDN)
│   ├── Database query optimization (missing index, N+1)
│   ├── Compression (gzip, brotli, image optimization)
│   └── Bundle splitting (lazy loading, code splitting)
│
├── Strategic (high effort, high impact)
│   ├── Algorithm replacement (O(N\u00b2) \u2192 O(N log N))
│   ├── Architecture change (sync \u2192 async, monolith \u2192 microservice)
│   ├── Data structure change (list \u2192 set, dict \u2192 specialized)
│   └── Database denormalization or migration
│
└── Low priority (high effort, low impact)
    ├── Micro-optimizations (switch to for loop, use let instead of var)
    └── Premature optimization (memoizing fast functions)
```

## Production Considerations

- **Continuous profiling**: Deploy always-on profilers like Pyroscope or Google Cloud Profiler. Provides flame graphs 24/7 without manual triggering. Distinguishes routine patterns from anomalies.
- **APM integration**: Use Application Performance Monitoring (Datadog, New Relic, Grafana) for real-time trace sampling. Correlate slow traces with deployments, feature flags, and region.
- **Performance budgets**: Set budgets for bundle size (JS/CSS), API latency (p95 < 200ms), and memory usage (< 500MB). Fail CI when budgets are exceeded. Publish to dashboards.
- **Synthetic monitoring**: Set up synthetic transactions that exercise critical user journeys. Alert on latency regressions in top percentiles (p95, p99). Run from multiple geographic regions.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Optimizing without profiling | Guessing, may optimize wrong thing | Profile first, optimize based on data |
| Premature optimization | Wastes time on non-hotpaths | Analyze hot paths, optimize only those |
| Ignoring the bottleneck hierarchy | Fixing wrong layer has no impact | Profile end-to-end, find the actual bottleneck |
| Single environment profiling | Dev perf != prod perf | Profile in production-like conditions |
| Micro-optimizations over algorithms | Don't fix algorithmic complexity | Fix O(N\u00b2) before optimizing constants |
| No baseline comparison | Don't know if it improved | Measure before and after |
| Forgetting cascading effects | Improving one path may overload another | Test overall system impact |
| Only load testing | Misses code-level hotspots | Combine synthetic load with fine-grained profiling |
| Talking about memory without measuring | Memory issues are hard to reason about | Use tracemalloc or heap profiler to measure |

## Performance Optimization

- **Add caching layer**: Identify frequently computed values. Add Redis or in-memory cache with appropriate TTL and eviction policy. Cache invalidation strategy: time-based or event-driven.
- **Database query optimization**: Use EXPLAIN ANALYZE to find missing indexes. Fix N+1 queries with eager loading or batching. Paginate large result sets. Use connection pooling to reduce overhead.
- **Reduce serialization overhead**: Use Protocol Buffers or MessagePack instead of JSON for high-throughput paths. Pre-compile templates. Use zero-copy serialization where possible.
- **Algorithm replacement**: Map code hotspots to algorithmic complexity. Replace O(N\u00b2) algorithms with O(N log N) alternatives. Use appropriate data structures (hash sets, binary trees, prefix tries).
- **Lazy loading and code splitting**: Split bundles by route. Defer non-critical JavaScript. Load images lazily with IntersectionObserver. Use dynamic imports for rarely-used modules.

## Handoff
Hand off to `dev-loop-debugging-strategy` if profiling reveals a bug. Hand off to `dev-loop-code-review` for code-level optimization review. Hand off to `dev-loop-refactor-guide` for performance-related refactoring.
