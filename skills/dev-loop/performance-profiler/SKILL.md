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
Identify and fix performance bottlenecks using a measurement-first, data-driven approach.

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

## Workflow

### Step 1: Establish Baseline
Measure current performance using profiling tools (APM, flamegraphs, profiler output). Record p50/p95/p99 latency, throughput, error rate, resource utilization (CPU, memory, I/O). Without a baseline, you cannot measure improvement.

### Step 2: Identify Bottleneck
Analyze profiling data to pinpoint the bottleneck. Common categories:
- **Database**: N+1 queries, missing indexes, slow joins, lock contention
- **Network**: chatty API calls, serialization overhead, TLS handshake, bandwidth
- **CPU**: tight loops, regex backtracking, serialization/deserialization, compression
- **Memory**: leaks, GC pressure, cache bloat, excessive object allocation
- **I/O**: synchronous blocking, connection pool exhaustion, disk saturation

### Step 3: Formulate Hypothesis
State what change you expect to improve which metric and by how much. Use Amdahl's law to estimate maximum possible gain from fixing the identified bottleneck. Document expected before/after delta.

### Step 4: Apply Fix
One change at a time. Implement fix with minimal scope. No speculative optimizations. If fix is complex, break into independently measurable sub-fixes.

### Step 5: Verify & Document
Re-measure same metrics under same conditions. Record before/after. If improvement matches hypothesis, move to next bottleneck. If not, roll back and retry next hypothesis. Never skip verification.

## Rules

- Never optimize without measurement — intuition about what is slow is wrong >50% of the time
- One change at a time — measure before and measure after
- Fix the biggest bottleneck first — optimizing a minor contributor gives negligible gains
- Cache invalidation is harder than caching — always have a clear eviction strategy
- Profile in production-like environment (or production under low traffic) — dev environment is not representative
- Document every optimization with before/after metrics — so you know what worked
- Measure in percentiles, not averages — averages hide high-tail-latency problems
- Set a performance budget before optimizing — know what "good enough" looks like

## Handoff
Next skill: devops-observability for distributed tracing setup.
Carry forward: profile results, bottleneck list, fix priorities.