---
name: frontend-performance
description: >
  Enhances frontend performance analysis, caching strategies,
  and memory leak detection. Deep integration with V8 profiling
  and Service Worker lifecycle management.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, performance, caching, memory-leaks, service-worker]
---
# Frontend Performance

## Purpose - comprehensive description
This skill provides comprehensive capabilities for analyzing, diagnosing, and resolving frontend performance bottlenecks. It focuses on rendering optimization, memory leak detection using flamegraphs, and advanced Service Worker caching strategies.

## Core Principles - 5 numbered principles
1. Measure first, optimize second.
2. Prioritize perceived performance over raw metrics.
3. Cache aggressively but invalidate safely.
4. Keep the main thread free.
5. Prevent memory leaks through strict lifecycle management.

## Agent Protocol
- Triggers: "Analyze frontend performance", "Fix memory leak"
- Input Context Required: Webpack bundle stats, lighthouse report, V8 heap snapshots
- Output Artifact: Markdown report with flamegraphs and caching configurations
- Response Formats:
```json
{
  "status": "optimized",
  "metrics": {
    "fcp": "1.2s",
    "lcp": "2.5s"
  }
}
```

## Decision Matrix
```
[Performance Issue]
       |
       +--> (High Memory Usage) --> Analyze Heap Snapshot
       |
       +--> (Slow Load) --> Check Service Worker Cache
       |
       +--> (Jank) --> Profile Main Thread
```

## Detailed Architectural Overview
```
+---------------+      +----------------+
| Service Worker| ---> | Cache Storage  |
+---------------+      +----------------+
       |
       v
+---------------+      +----------------+
| Main Thread   | <--- | V8 Engine      |
+---------------+      +----------------+
```
Lifecycle: Registration -> Installation -> Activation -> Fetching

## Workflow Steps
Phase 1: Discovery
1. Collect metrics
2. Identify bottlenecks
3. Establish baseline
4. Define targets

Phase 2: Analysis
1. Parse heap snapshots
2. Generate flamegraphs
3. Analyze network waterfall
4. Review cache hit rates

Phase 3: Strategy
1. Select caching strategy
2. Plan memory cleanup
3. Define lazy loading boundaries
4. Outline rendering optimizations

Phase 4: Implementation
1. Write Service Worker logic
2. Implement cleanup routines
3. Add performance marks
4. Configure bundle splitting

Phase 5: Verification
1. Run Lighthouse
2. Verify cache hits
3. Check memory stability
4. Compare with baseline

Phase 6: Deployment
1. Rollout gradually
2. Monitor real user metrics
3. Setup alerts
4. Document regressions

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Memory growth over time | Detached DOM elements | Nullify references on unmount |
| Cache miss on reload | Stale Service Worker | Update SW version/registration |
| Main thread blocked | Heavy synchronous JS | Move to Web Worker |
| High layout shifts | Missing image dimensions| Add width/height attributes |
| Late LCP | Render blocking resources | Defer/async scripts, inline critical CSS |
| Excessive GC pauses | High allocation rate | Object pooling, reduce object creation |

## Complete Execution Scenario
```
Start -> Gather Metrics -> Detect Memory Leak -> 
Generate Flamegraph -> Identify Detached Nodes -> 
Fix Code -> Re-test -> Deploy -> End
```

## Rules and Guidelines
1. Always use relative paths for reference links.
2. Never block the main thread for >50ms.
3. Ensure Service Workers have a fallback strategy.
4. Memory usage should plateau, not grow unbounded.
5. All images must be lazy-loaded below the fold.

## Reference Guides
1. [Memory Leak Flamegraphs - Part 1](references/ref_flamegraph_1.md)
2. [Memory Leak Flamegraphs - Part 2](references/ref_flamegraph_2.md)
3. [Service Worker Strategies - Part 1](references/ref_sw_1.md)
4. [Service Worker Strategies - Part 2](references/ref_sw_2.md)
5. [V8 Engine Internals](references/ref_v8.md)
6. [Network Waterfall Optimization](references/ref_network.md)
7. [Rendering Performance](references/ref_rendering.md)
8. [Advanced Caching Math](references/ref_math.md)

## Handoff
Refer to backend-performance for API latency issues.

<!-- compression footer -->
