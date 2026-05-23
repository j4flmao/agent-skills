# Profiling Tools

## PerfView (.NET / Windows)

Microsoft's free performance analysis tool for .NET applications on Windows. Collects CPU samples, .NET GC events, JIT events, contention, and I/O.

### Setup
Download from Microsoft, no installation required (XCOPY deploy). Run as administrator for ETW kernel events.

### Common Workflows
```
# CPU sampling
PerfView.exe collect -ThreadTime -NoV2Rundown -KernelEvents:Process,Thread,ContextSwitch
# Run your application, then stop collection

# GC analysis
PerfView.exe collect -GCOnly
# Memory allocation
PerfView.exe collect -OnlyProviders:Microsoft-Windows-DotNETRuntime
```

### Key Views
- CPU Stacks: flame graph of CPU time by call stack. Switch to "CallTree" tab, set "GroupPats" to filter out framework noise.
- GC Heap Alloc: allocations by type and call stack. Look for unexpected allocation hot spots. High allocation rate causes frequent GCs even if individual allocations are small.
- JIT Stats: time spent in JIT compilation. High JIT time indicates too much code on cold start — consider tiered compilation, ReadyToRun images, or assembly trimming.
- Contention: .NET lock contention events. High contention on a specific lock indicates a synchronization bottleneck — reduce lock duration or switch to lock-free data structures.

## dotTrace (.NET)

JetBrains's .NET profiler with timeline and sampling modes.

### Modes
- Timeline: records every thread activity (CPU, I/O, blocking, GC). Best for finding synchronization issues, thread contention, and understanding overall application behavior.
- Sampling: periodic call stack sampling. Low overhead (~1-5%), good for production-adjacent environments. Statistical — may miss short-lived functions.
- Tracing: instrument every function entry/exit. High overhead (~10-100x slowdown), but produces exact call counts and timings. Use only in development.

### Workflow
1. Select application type (standalone, IIS, Windows Service).
2. Choose profiling mode (Timeline for first pass, Sampling for deeper CPU analysis).
3. Start profiling, reproduce the slow scenario, stop profiling.
4. In the snapshot: open "Threads" tab, select the blocked thread, view "Waiting" timeline to see what it blocked on.
5. For CPU bottlenecks: sort by "Own Time" in the call tree to find the function that spends the most CPU.

## Chrome DevTools Performance Tab

### Setup
Open DevTools (F12) → Performance tab. Click the gear icon to configure CPU throttling (4x or 6x slowdown for mobile simulation) and network throttling.

### Recording
Click "Record", perform the slow interaction, click "Stop". Wait for processing (5-30 seconds).

### Reading the Results
- FPS bar: red bars indicate frame drops. Click to inspect that frame.
- CPU chart: colors indicate activity type (blue = loading, yellow = scripting, purple = rendering, green = painting).
- Main thread flame chart: long yellow tasks (>50ms) block user interaction. >200ms is problematic.
- Summary tab: time breakdown by category. "Scripting" >50% means JavaScript is the bottleneck.
- Bottom-Up tab: sort by "Total Time" to find the single most expensive function.

### Key Metrics
- First Contentful Paint: when the first text/image is painted.
- Time to Interactive: when the page is fully interactive (main thread idle for >50ms).
- Layout Shift: cumulative layout shift score — unexpected movement of visible elements during load.
- Long Tasks: tasks on the main thread exceeding 50ms, blocking user input.

## Py-Spy (Python)

Sampling profiler for Python. No code changes required. Works with CPython. Supports both local and remote processes.

### Installation & Usage
```
pip install py-spy
py-spy record -o profile.svg --pid 12345
py-spy record -o profile.svg -- python my_script.py
py-spy top --pid 12345   # live top-like view
```

### Key Features
- Sampling rate: 100 samples/sec by default (adjust with `-r 500` for higher resolution).
- Native frame resolution: shows C extension frames (unlike cProfile which only shows Python frames).
- Subsecond resolution: `py-spy record -d 5` collects 5 seconds of data — good for characterizing short bursts.
- Remote profiling: `py-spy record --pid $(ssh host 'pgrep -f myapp')` with SSH port forwarding.

### Output
Generates SVG flame graphs. Open in browser. The widest Python-level frames indicate hot functions. Look for: excessive `str` concatenation, deep loop nesting without vectorization, repeated `hasattr` or getattr calls in hot paths, unnecessary logging at DEBUG level in production.

## pprof (Go / General)

Google's profiling tool, natively integrated with Go's runtime. Also supports CPU, heap, mutex, and goroutine profiles from non-Go programs via the `pprof` proto format.

### Go Profiling
```go
import _ "net/http/pprof"
// Access at /debug/pprof/
```

```
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/heap
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/goroutine
```

### Key Views
- Top: functions with the most cumulative time. Start here.
- Graph: directed call graph with edge weights. Thicker edges = more time in callee.
- Flame Graph: interactive SVG. Hover for function details, click to zoom.
- Peek: show callers and callees of a specific function. Use to understand why a function is called so often.

### Useful Flags
```
go tool pprof -sample_index=alloc_space http://...
go tool pprof -sample_index=inuse_objects http://...
go tool pprof -diff_base=before.pprof after.pprof   # compare two profiles
```

## Valgrind Callgrind (C/C++)

### Call Graph Profiling
```
valgrind --tool=callgrind --collect-jumps=yes ./myprogram
```

Output: `callgrind.out.<PID>`. Visualize with `kcachegrind` or `gprof2dot`.

### Key Metrics
- Ir: instruction count. Functions with the highest Ir are the hottest.
- Dr / Dw: data reads / writes. High counts indicate memory bandwidth-intensive code.
- L1 / LLC misses: cache miss counts. High miss rates suggest poor data locality.

### Selective Instrumentation
```
valgrind --tool=callgrind --fn-skip=memcpy,strlen ./myprogram
```

## General Tool Selection Guide

| Scenario | Tool | Platform |
|---|---|---|
| .NET CPU | PerfView / dotTrace | Windows / Linux |
| .NET Memory | dotMemory / PerfView | Windows |
| Go CPU/Memory | pprof | All |
| Python CPU | Py-Spy | All |
| Python Memory | memory_profiler / tracemalloc | All |
| C/C++ CPU | perf / Valgrind Callgrind | Linux |
| C/C++ Memory | Valgrind Memcheck / ASan | Linux / macOS |
| Java CPU | async-profiler / JMC | All |
| Java Memory | jmap / Eclipse MAT | All |
| Node.js CPU | --prof / clinic.js | All |
| Node.js Memory | heapdump / Chrome DevTools | All |
| Browser Frontend | Chrome DevTools Performance | All browsers |
| Database | EXPLAIN ANALYZE / pg_stat_statements | DB-specific |
