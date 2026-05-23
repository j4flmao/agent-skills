# Profiling Tools Comparison

## CPU Profilers

| Tool | Language | Method | Overhead | Output | Best For |
|------|----------|--------|----------|--------|----------|
| perf | Linux (all) | Hardware counters | < 2% | Flame graphs, reports | System-wide CPU profiling |
| VTune | C/C++, .NET | Hardware + sampling | 1-5% | Timeline, hotspots | Intel-optimized deep analysis |
| perf record | Linux | Sampling | < 5% | perf.data, scriptable | Production profiling |
| Py-Spy | Python | Sampling | < 3% | SVG flame graphs | Python without code changes |
| cProfile | Python | Instrumentation | 10-50x | Call counts, cumulative | Development profiling |
| pprof | Go | Sampling | < 5% | Web UI, flame graphs | Go runtime profiling |
| async-profiler | Java | Sampling + events | < 2% | Flame graphs, jfr | JVM profiling |
| JMC | Java | JFR events | < 1% | Java Flight Recorder | Always-on production |
| dotTrace | .NET | Sampling + tracing | 1-10% | Timeline, call tree | .NET performance analysis |
| PerfView | .NET | ETW events | < 3% | Flame graphs, stacks | Windows .NET profiling |
| Instruments | Swift/ObjC | Sampling | < 5% | Timeline, allocations | Apple platform profiling |

## Memory Profilers

| Tool | Language | Method | Overhead | Best For |
|------|----------|--------|----------|----------|
| Valgrind | C/C++ | Instrumentation | 10-20x | Memory leaks, invalid access |
| AddressSanitizer | C/C++ | Compile-time | 2x | Buffer overflow, use-after-free |
| heaptrack | C/C++ | LD_PRELOAD | 2-5x | Allocation hotspots |
| jemalloc heap profiling | C/C++ | Sampling | < 5% | Production memory profiling |
| dotMemory | .NET | Snapshot diff | Pause | .NET memory leaks |
| .NET GC dump | .NET | Snapshot | Pause | GC heap analysis |
| Chrome DevTools | JS | Snapshot | Pause | JS heap analysis |
| Memory profiler (py) | Python | Object tracking | 2-10x | Python memory usage |
| tracemalloc | Python | Allocation tracking | 10x | Python allocation origins |
| heap dump (jmap) | Java | Snapshot | Pause | Java heap analysis |
| Eclipse MAT | Java | Offline analysis | None | Java memory leak detection |

## I/O Profilers

| Tool | Focus | Command | Output |
|------|-------|---------|--------|
| iostat | Disk I/O | `iostat -x 1` | r/s, w/s, await, %util |
| iotop | Per-process I/O | `iotop -o` | Per-pid read/write |
| strace | System calls | `strace -e trace=file,network -p <pid>` | Every syscall |
| FileMon / Process Monitor | Windows I/O | GUI | File, registry, network ops |
| tcpdump | Network I/O | `tcpdump -i eth0 port 80` | Packet capture |
| Wireshark | Network I/O | GUI | Full packet analysis |
| nstat | Network stats | `nstat -az` | Interface statistics |

## Async / Concurrency Profilers

| Tool | Runtime | Method | Detects |
|------|---------|--------|---------|
| ThreadSanitizer | C/C++, Go | Compile | Race conditions |
| Helgrind | C/C++ (Valgrind) | Instrumentation | Lock ordering, races |
| Go race detector | Go | Compile | Data races |
| Lockdep | Linux kernel | Static analysis | Deadlock potential |
| event-loop-lag | Node.js | Sampling | Event loop blocking |
| async-profiler | Java | AsyncGetCallTrace | Lock contention, park |
| .NET Task Debugger | .NET | ETW | Async deadlocks |

## Flame Graph Tools

| Tool | Input | Output | Features |
|------|-------|--------|----------|
| FlameGraph (Brendan Gregg) | perf/stacks | SVG | Interactive differential |
| Inferno | perf/DTrace | SVG HTML | Collapse + generate |
| Speedscope | Chrome CPU profile | Web viewer | Interactive, remote |
| pprof | Go profiles | Web UI, SVG | Top, graph, flame |
| 0x | Node.js | SVG | Automatic, zero-config |
| async-profiler | Java | SVG | C++/Java mixed frames |

## Database Profiling Tools

| Tool | Database | Method | Key Features |
|------|----------|--------|--------------|
| EXPLAIN ANALYZE | PostgreSQL | Query plan | Row estimates, actual timing |
| pg_stat_statements | PostgreSQL | Extension | Aggregated query stats |
| slow_query_log | MySQL | Config | Configurable threshold |
| Performance Schema | MySQL | Instrumentation | Waits, stages, statements |
| Database Profiler | MongoDB | Always-on | Slow queries, index usage |
| pgBadger | PostgreSQL | Log analyzer | HTML reports, charts |
| pgbadger | PostgreSQL | Log parser | Daily/weekly trends |
| Dex | PostgreSQL | Query suggester | Index recommendations |

## Selection Guide

### By Scenario

| Scenario | Recommended Tools |
|----------|------------------|
| CPU spike in production | perf (Linux), py-spy (Python), async-profiler (Java), pprof (Go) |
| Memory leak | Valgrind (native), heap snapshot diff (managed), heaptrack (C++) |
| Slow API endpoint | Distributed tracing (OpenTelemetry) + CPU profiler |
| N+1 queries | EXPLAIN ANALYZE + ORM query logger |
| High GC pause | JMC (Java), dotnet-gcdump (.NET), --trace-gc (Node/V8) |
| Production debugging | Always-on sampling profiler + structured logs |
| CI regression | Microbenchmark harness (bench, pytest-benchmark) |

### By Language

| Language | CPU Profiler | Memory Profiler | Async Profiler |
|----------|-------------|-----------------|----------------|
| Node.js | Clinic.js, 0x, --prof | Heap snapshots | event-loop-lag |
| Python | py-spy, cProfile | tracemalloc, memray | asyncio debug mode |
| Go | pprof, execution tracer | pprof (heap) | Go race detector |
| Rust | perf,火焰图 | heaptrack, dhat | ThreadSanitizer |
| Java | async-profiler, JMC | Eclipse MAT, JFR | async-profiler |
| .NET | dotTrace, PerfView | dotMemory, dotnet-gcdump | Task Debugger |
| C/C++ | perf, VTune | Valgrind, ASan | ThreadSanitizer |

## Profiling Checklist

- [ ] Profile under realistic load (not idle)
- [ ] Establish baseline before any optimization
- [ ] Measure in percentiles, not averages
- [ ] Profile each resource separately (CPU, memory, I/O)
- [ ] Include warm-up period in measurements
- [ ] Run at least 5 trials for statistical significance
- [ ] Check for measurement overhead (especially instrumentation)
- [ ] Profile in production or production-like environment
- [ ] Profile during peak traffic hours
- [ ] One change at a time with before/after comparison
- [ ] Document profiling conditions (load, duration, environment)
