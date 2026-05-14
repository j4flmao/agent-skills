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

## References
- Never optimize without measurement — intuition about what is slow is wrong >50% of the time
- One change at a time — measure before and measure after
- Fix the biggest bottleneck first — optimizing a minor contributor gives negligible gains
- Cache invalidation is harder than caching — always have a clear eviction strategy
- Profile in production-like environment (or production under low traffic) — dev environment is not representative
- Document every optimization with before/after metrics — so you know what worked

## Output Format
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
No filler. Strip articles where unambiguous. Why use many token when few do trick.