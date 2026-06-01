# Performance Profiler Fundamentals

## Overview
Performance profiling measures code execution time, memory usage, CPU utilization, and I/O to identify bottlenecks and guide optimization. Measure first, optimize second.

## Core Concepts

### Concept 1: Profiling Types
CPU profiling (function call times, hot paths), memory profiling (allocations, GC pressure, leaks), I/O profiling (disk reads/writes, network latency), and concurrency profiling (lock contention, thread starvation). Each type requires the right profiler.

### Concept 2: Tools Selection
Language-specific: dotMemory/dotTrace (.NET), Instruments (macOS), perf (Linux), Chrome DevTools (web), VTune (Intel), and custom instrumentation via OpenTelemetry spans. Tool selection depends on symptom type.

### Concept 3: Metrics to Collect
Latency (p50, p90, p99 response times), throughput (requests/second), allocation rate (MB/s), GC pause duration, lock contention %, I/O wait time, and cache miss ratio. Collet baseline before changes.

### Concept 4: The 80/20 Rule
80% of execution time is spent in 20% of the code. Identify hot paths before optimizing. A 50% improvement on a function taking 1ms is irrelevant vs 5% improvement on a function taking 10 seconds.

### Concept 5: Optimization Process
Profile → Identify bottleneck → Hypothesis → Optimize → Re-profile → Repeat. Never assume — measure. Each optimization should be one change at a time with before/after measurements.

## Best Practices

- Profile on production-like hardware
- Profile with realistic data volumes
- Measure before and after (one change at a time)
- Focus on p95/p99 latency, not average
- Profile in release mode (debug mode skews results)
- Warm up before sampling (JIT, cache)
- Sample over sufficient duration (captures variance)
- Set performance budgets (explicit targets)
- Profile all layers (client, server, database)

## Anti-Patterns

- Optimizing before profiling (guessing)
- Incomplete sampling (cold runs, no warm-up)
- Inconsistent baseline (different conditions)
- Micro-optimizations that reduce readability
- Optimizing cold paths (diminishing returns)
- Vanity metrics (focusing on easy-to-measure, not impactful)
- No regression tracking (performance regressions not caught)
- Production profiling without load isolation
