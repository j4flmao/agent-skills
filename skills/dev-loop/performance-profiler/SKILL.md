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
## Handoff
Hand off to `dev-loop-debugging-strategy` if profiling reveals a bug. Hand off to `dev-loop-code-review` for code-level optimization review.
