---
name: mobile-performance
description: >
  Advanced mobile performance auditing toolkit.
  Deep inspection of UI rendering, CPU flamegraphs,
  and memory allocations for Swift and Kotlin.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, performance, profiling]
---
# Mobile Performance Optimization

## Purpose
Deeply audits mobile application performance bottlenecks across CPU, Memory, and UI Rendering Pipelines.

## Core Principles
1. Maintain 60fps (16.6ms per frame) or 120fps (8.3ms per frame) strictly.
2. Eliminate main thread blocking I/O and intensive computations.
3. Minimize garbage collection pauses by preventing memory churn and leaks.
4. Avoid deep view hierarchies to reduce overdraw and layout traversal time.
5. Aggressively cache data and optimize network payloads.

## Agent Protocol
- Triggers: Jank detection, OOM crashes, high battery usage.
- Input Context Required: Profiling traces, heap dumps (hprof), UI snapshots.
- Output Artifact: Optimization recommendations and patched code.
- Response Formats:
```json
{
  "issue_type": "memory_leak",
  "severity": "critical",
  "remediation": "WeakReference<Context>"
}
```

## Decision Matrix
```text
[Performance Issue] --> [Frame Drops?] --(Yes)--> [GPU Overdraw?] --(Yes)--> Flatten Hierarchy
     |                        |                          +--(No)--> Profile Main Thread
     +--(No)--> [OOM?] --(Yes)--> Analyze Heap Dump --> Check GC Roots
     |
     +--(No)--> [High CPU?] --(Yes)--> CPU Flamegraph --> Offload to Worker Thread
```

## Detailed Architectural Overview
```text
+-----------------+       +-------------------+       +-----------------+
|  Main UI Thread | ----> | RenderThread (OS) | ----> | GPU Compositor  |
| (Measure/Layout)|       | (DisplayList Sync)|       | (Rasterization) |
+-----------------+       +-------------------+       +-----------------+
         ^                          |                         |
         |                          v                         v
   +-----------+            +---------------+         +---------------+
   | VSYNC Sig |            | VSYNC-Render  |         | Buffer Swap   |
   +-----------+            +---------------+         +---------------+
```

## Workflow Steps
1. Phase 1: Baseline Profiling
   1. Capture system trace during user journey.
   2. Identify skipped frames in logcat/instruments.
   3. Extract CPU usage and Memory footprints.
   4. Document baseline metrics.
2. Phase 2: CPU Flamegraph Analysis
   1. Identify wide blocks in main thread.
   2. Trace method execution times.
   3. Relocate heavy I/O to background.
   4. Optimize nested loops.
3. Phase 3: Memory Allocation Auditing
   1. Dump Java/Swift heap.
   2. Trace GC root paths for leaked Activities/ViewControllers.
   3. Analyze memory churn and large allocations.
   4. Implement object pools where necessary.
4. Phase 4: UI Rendering Pipeline
   1. Enable GPU overdraw debugging.
   2. Inspect layout hierarchy depth.
   3. Convert deep nested layouts to ConstraintLayout.
   4. Remove transparent backgrounds.
5. Phase 5: Battery & Network
   1. Trace wake locks usage.
   2. Batch network requests.
   3. Monitor background jobs execution.
   4. Implement WorkManager/BackgroundTasks.
6. Phase 6: Validation
   1. Run macrobenchmarks.
   2. Compare with baseline metrics.
   3. Ensure no functional regressions.
   4. Generate final report.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---|---|---|
| OOM Crash | Bitmaps held in memory | Downsample bitmaps, use caching libraries |
| UI Jank | Main thread database access | Move DB operations to Coroutines/GCD |
| High Overdraw | Multiple overlapping backgrounds | Remove unnecessary view backgrounds |
| App Freezes (ANR) | Deadlock or heavy parsing | Offload parsing to IO dispatcher |
| Battery Drain | Unreleased WakeLocks | Use structured background scheduling |
| Thermal Throttling | Endless tight loops on CPU | Implement delays or optimize logic |

## Complete Execution Scenario
```text
[Triggered by Slow Launch]
         |
         v
[Capture Method Trace] ---> [Identify Slow Init] ---> [Move Init to Background]
                                                                 |
[Final Validation] <---------------------------------------------+
```

## Rules and Guidelines
1. Never block the UI thread for more than 16ms.
2. Always release contextual references in onDestroy/deinit.
3. Avoid allocations inside onDraw() or rendering loops.
4. Prefer primitive data structures (SparseArray over HashMap) in memory-constrained areas.
5. Use R8/ProGuard for code shrinking and optimization.

## Reference Guides
1. [CPU Profiling Flamegraphs](references/cpu_profiling.md)
2. [Memory Allocation Tracing](references/memory_tracing.md)
3. [UI Rendering Pipeline](references/ui_pipeline.md)
4. [Network Optimization](references/network_optimization.md)
5. [Battery Life](references/battery_life.md)
6. [App Startup Metrics](references/app_startup.md)
7. [Concurrency & Threading](references/concurrency.md)
8. [Graphics Architecture](references/graphics_arch.md)

## Handoff
Review `network-performance` for API payload reduction.

<!-- HTML_COMPRESSION_FOOTER_998877 -->
