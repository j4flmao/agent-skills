# Performance Profiler Advanced

## Overview
Advanced performance profiling covers distributed tracing, flame graphs, JIT/AOT analysis, GC tuning, database query profiling, and production profiling with minimal overhead.

## Advanced Concepts

### Concept 1: Distributed Tracing
End-to-end request tracking across services: OpenTelemetry for trace context propagation (W3C TraceContext), sampling strategies (head-based, tail-based), span attributes for metadata, and trace correlation with logs/metrics. Identify latency in specific service boundaries.

### Concept 2: Flame Graphs and C2C
Flame graphs for CPU hotspots (stack sample aggregation), icicle graphs (inverted, top-down), and differential flame graphs (before vs after). Off-CPU analysis with async profiler for wait/blocked time. Context switch analysis for I/O bound work.

### Concept 3: JIT/AOT Analysis
JIT compiler statistics: method inlining decisions, tiered compilation (interpreter → C1 → C2), deoptimization events, and code cache usage. AOT (NativeAOT, GraalVM) eliminates JIT warmup time at cost of binary size and reflection support.

### Concept 4: GC Analysis
GC mode (Workstation vs Server, Concurrent, Background), pause time percentiles, allocation budget sizing, generation sizing (Gen0/1/2 collections per interval), large object heap fragmentation, and GC root count. Tune by adjusting gen size ratios and allocation budget.

### Concept 5: Database Query Profiling
Query execution plan analysis (sequential vs parallel scans), N+1 query detection, connection pool starvation, index usage stats, buffer cache hit ratio, and query parameter sniffing. Use database-specific tools: pg_stat_statements, Query Store (MSSQL), Performance Insights (RDS).

## Advanced Techniques

### Flame Graph Generation
```bash
# Linux perf
perf record -F 99 -a -g -- sleep 30
perf script | stackcollapse-perf.pl > out.folded
flamegraph.pl out.folded > flame.svg
```

### GC Tuning (.NET)
```xml
<ServerGarbageCollection>true</ServerGarbageCollection>
<ConcurrentGarbageCollection>true</ConcurrentGarbageCollection>
<GarbageCollectionAdaptationMode>true</GarbageCollectionAdaptationMode>
```

### OpenTelemetry Distributed Trace
```csharp
using var activity = tracer.StartActiveSpan("process-payment");
activity.SetAttribute("payment.method", method);
activity.SetAttribute("payment.amount", amount);
using var scope = db.CreateScope();
// traced operation
```

## Anti-Patterns

- Profiling dev environment only (production traffic patterns differ)
- GC tuning without baseline collection data
- Flame graphs without sample count labels (hiding sample counts)
- Too many spans in distributed traces (overhead)
- Not sampling production profiles (always-on overhead too high)
- Database query profiling without index usage analysis
- JIT analysis on code that's AOT compiled
- P99 optimization ignoring P50/P90 tradeoffs
