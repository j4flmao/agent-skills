---
name: performance-profiler
description: >
  Use this skill when the user says 'performance issue', 'slow API', 'high memory',
  'CPU spike', 'latency', 'profiling', 'optimize', 'response time', 'throughput',
  'bottleneck', or when analyzing performance problems. Covers: measurement-first
  approach, bottleneck identification (DB, network, CPU, memory), fix prioritization
  by impact (Amdahl's law), and before/after measurement validation. Works with
  any backend stack. Do NOT use this for: frontend performance (use
  frontend-performance), general code review, or database schema optimization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, performance, phase-4]
---

# Performance Profiler

## Purpose
Identify and fix performance bottlenecks using a measurement-first, data-driven approach. No optimization without data.

## Profiling Types

### CPU Profiling
Measures time spent in each function. Two modes: sampling (periodically sample the call stack — low overhead, statistical) and instrumentation (instrument every function entry/exit — high overhead, exact). Use sampling for production, instrumentation for dev. Output: flat profile (total time per function) and call graph (caller-callee relationships). Tools: perf, PerfView, dotTrace, Py-Spy, pprof, Chrome DevTools Performance tab.

Sampling profilers work by recording the current call stack at a fixed frequency (e.g., 100 Hz). The number of samples in each function is proportional to the time spent there. Statistical noise decreases with more samples: at 100 Hz for 60 seconds, you get 6000 samples, enough for 1% precision on hot paths. Instrumentation profilers add entry/exit hooks to every function — exact counts but 10-100x overhead.

### Memory Profiling
Measures allocation rate, object lifetime, GC pressure, and heap composition. Key metrics: allocation rate (MB/s), GC pause duration, GC frequency, heap size after GC, large object heap size, object retention depth. Memory leaks appear as: heap growing monotonically, Gen 2 objects that should be ephemeral, increasing thread-local storage, unbounded collections in static fields. Tools: dotMemory, Valgrind memcheck, Chrome DevTools Memory tab, Py-Spy, pprof.

Heap analysis workflow: take snapshot, force GC, take post-GC snapshot. Objects remaining after GC that should have been collected are the leak candidates. For each candidate, trace the retention path to find what holds the reference.

### I/O Profiling
Measures blocking time on disk, network, and IPC operations. Key metrics: iowait (blocked on storage), read/write latency, IOPS, queue depth, connection pool utilization, socket buffer occupancy. I/O bottlenecks appear as: high iowait % in `top`, thread pool starvation (all threads blocked on I/O), high variance in response latency under load, connection timeouts and socket exhaustion.

I/O profiling is often overlooked because the CPU is idle during I/O waits. If CPU utilization is low but latency is high, the bottleneck is I/O. Use async profilers that record thread state (running vs blocked) to measure I/O wait accurately.

### Network Profiling
Measures time spent transmitting and receiving data. Key metrics: bandwidth utilization, packet loss, round-trip time, TLS handshake time, serialization/deserialization time, payload size per request, number of round trips. Network bottlenecks appear as: waterfall chart with many sequential requests, large payload sizes, slow TLS negotiation, high retransmission rate, chunky HTTP headers.

### Async Profiling
Measures time spent in asynchronous operations: task continuations, promise chains, event loop latency, callback queues. Key metrics: event loop lag (Node.js, Python asyncio), task queue depth, continuation scheduling delay, I/O completion port utilization. Async bottlenecks appear as: growing event loop lag under load, scheduled callbacks taking longer to execute than the operation itself, high variance in callback execution order causing unexpected state.

### Database Query Profiling
Measures time spent in database operations. Key metrics: query execution time, rows examined, rows returned, temporary tables created, filesort operations, lock wait time, buffer pool hit ratio. Use `EXPLAIN ANALYZE` for individual queries, `pg_stat_statements` for aggregated query statistics, `slow_query_log` for identifying problematic queries. Database profiling often reveals N+1 queries, missing indexes, or inefficient joins as the root cause of application latency.

## Agent Protocol

### Trigger
Exact user phrases: "performance issue", "slow API", "high memory", "CPU spike", "latency", "profiling", "optimize", "response time", "throughput", "bottleneck".

### Input Context
Before activating, verify:
- The measured metrics or profiling data is provided (no optimization without data).
- The system's current performance baseline is known.
- The bottleneck type is identifiable from available data.

### Output Artifact
No file output. This skill produces a performance report.

### Response Format
Answer exactly:
```
## Performance Report
### Baseline
- p50: {value} | p95: {value} | p99: {value}
- Throughput: {value} req/s
- Bottleneck: {identified component}
### Fix Applied
- Change: {what was changed}
- Rationale: {why this fix addresses the bottleneck}
### Result
- p50: {value} | p95: {value} | p99: {value}
- Improvement: {x-factor}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

## Flame Graphs

Flame graphs are the primary visualization for CPU profiling data. Each horizontal segment represents a function call stack at a point in time. Segment width is proportional to total time spent in that function and its descendants. Color indicates the function or library.

Reading: find the widest segment at the top of the graph — that is the hottest code path (most cumulative time). Then trace downward to see the call chain leading to it. The widest segment in your own application code (not library/framework) is your primary optimization target.

Generating: capture stack samples with `perf record`, `DTrace`, or language-specific profiler. Fold stacks with `stackcollapse-*.pl` scripts. Render SVG with `flamegraph.pl`. For Linux: `perf record -F 99 -a -g -- sleep 30 && perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg`.

Variants: icicle graph (inverted, root at bottom), differential flame graph (red = slower, blue = faster, compare two profiles), heat graph (color-coded by metric other than time).

## Workflow

### GC Analysis Special Topic

Garbage collection is a common hidden bottleneck. Key aspects to analyze: GC frequency (how often collections occur), GC duration (pause time per collection), generation sizing (Gen 0/1/2 collection counts), allocation rate (MB/s), large object heap fragmentation, and pinning (pinned objects prevent heap compacting).

GC tuning knobs by runtime: .NET (Server GC vs Workstation GC, latency mode, GCHeapCount, gcAllowVeryLargeObjects), JVM (GC algorithm choice: G1, ZGC, Shenandoah, Parallel, CMS — each with different pause time vs throughput tradeoffs), V8 (Node.js: --max-old-space-size, --optimize-for-size).

Symptoms of GC problems: sawtooth memory usage pattern, frequent STW (stop-the-world) pauses, high "% Time in GC" metric, allocation rate exceeding 100 MB/s in managed runtimes. Fix strategies: reduce allocation rate (object pooling, value types), reduce survivor promotions (tune generation sizes), switch GC algorithm (latency-sensitive apps should prefer low-pause collectors like ZGC or Shenandoah).

### Step 1: Establish Baseline
Measure current performance using profiling tools. Record p50/p95/p99 latency, throughput (req/s), error rate, resource utilization (CPU, memory, I/O, network). Without a baseline you cannot measure improvement. Profile under realistic load — idle systems hide bottlenecks. Use the same workload for before and after measurements.

### Step 2: Identify Bottleneck
Analyze profiling data to pinpoint the bottleneck. Common categories: database (N+1 queries, missing indexes, slow joins, lock contention), network (chatty API calls, serialization overhead, TLS handshake, bandwidth limits), CPU (tight loops, regex backtracking, serialization, compression), memory (leaks, GC pressure, cache bloat, excessive allocation), I/O (synchronous blocking, connection pool exhaustion, disk saturation).

### Step 3: Formulate Hypothesis
State what change you expect to improve which metric and by how much. Use Amdahl's law to estimate maximum speedup from optimizing the identified bottleneck (speedup = 1 / ((1 - P) + P/S), where P is the fraction of time spent in the parallelizable portion and S is the speedup of that portion). Document expected before/after.

### Step 4: Apply Fix
One change at a time. Implement with minimal scope. No speculative optimizations. If fix is complex, break into independently measurable sub-fixes. Measure after each sub-fix.

### Step 5: Verify & Document
Re-measure same metrics under same conditions. Record before/after. If improvement matches hypothesis, move to next bottleneck. If not, roll back and retry next hypothesis. Never skip verification.

## Benchmark Methodology

### Scientific Benchmarking
- Warm-up: discard initial measurements (JIT compilation, cache warm-up, connection pool filling). Typically 1000 iterations or 10 seconds.
- Steady state: measure after warm-up when metrics stabilize (variance <5% between consecutive measurements).
- Measurement window: minimum 30 seconds, minimum 1000 samples for latency percentiles.
- Isolation: run benchmarks in isolation (no other user processes, no background services). In cloud environments, run multiple times on different instances.
- Statistical significance: run at least 5 trials, report mean and standard deviation. Use Cohen's d to determine if a difference is practically significant, not just statistically significant.

### Pitfalls
- Compiler optimizations: benchmark code is often dead-code eliminated. Verify the compiler did not optimize away the work you intend to measure.
- GC interference: garbage collection pauses introduce outliers in latency measurements. Report GC pause frequency and duration separately.
- Measurement overhead: the act of measuring changes performance. Use sampling profilers for low overhead, calibrate instrumentation overhead.
- Coordinated omission: if you stop measuring when the system is overloaded (dropping requests), you undercount high-latency events. Always report tail latency at the offered load rate, not the completed request rate.

## Rules

- Never optimize without measurement — intuition about what is slow is wrong >50% of the time.
- One change at a time — measure before and measure after.
- Fix the biggest bottleneck first — optimizing a minor contributor gives negligible gains.
- Cache invalidation is harder than caching — always have a clear eviction strategy.
- Profile in production-like environment or production under low traffic — dev is not representative.
- Document every optimization with before/after metrics — so you know what worked.
- Measure in percentiles, not averages — averages hide high-tail-latency problems.
- Set a performance budget before optimizing — know what "good enough" looks like.
- CPU, memory, I/O, and network interact — optimizing one can expose another as the new bottleneck.
- Regression test every optimization — performance fixes should not break correctness.

## References
- `references/bottleneck-analysis.md` — Bottleneck Analysis
- `references/bottleneck-patterns.md` — Bottleneck Patterns
- `references/profiling-tools-comparison.md` — Profiling Tools Comparison
- `references/profiling-tools.md` — Profiling Tools

## Handoff
Next skill: devops-observability for distributed tracing setup.
Carry forward: profile results, bottleneck list, fix priorities.
