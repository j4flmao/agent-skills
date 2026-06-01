# Debugging Strategy Advanced

## Overview
Advanced debugging covers analysis of production incidents, memory and concurrency issues, debugging without source code, distributed system debugging, and root cause analysis frameworks.

## Advanced Concepts

### Concept 1: Production Incident Analysis
Post-mortem without replicating: analyze crash dumps (minidump, core dump), thread dumps (deadlock analysis), heap dumps (memory leak identification), and metrics correlation (deploy time + error spike). Use log aggregation (OpenTelemetry, Datadog, ELK) to trace request flow.

### Concept 2: Memory Forensics
Heap analysis: dump heap (dotnet-dump, jmap, pprof), identify largest objects and retention paths, find GC root chains, and detect memory leaks via retained size analysis. Compare heap dumps over time (growth = leak). Analyze finalizer queue for dispose issues.

### Concept 3: Concurrency Issues
Deadlock detection: thread dump → lock ordering analysis. Race condition debugging: add logging around shared state access, deterministic simulation (loom in JVM, test helpers), and thread sanitizers (TSan, Helgrind). Use happens-before analysis.

### Concept 4: Debugging Without Source
Third-party dependency issues: decompile with dnSpy/ILSpy, ILDASM/Roslyn for .NET, javap for Java, disassembly for native code. Check dependency source on GitHub. Reproduce with minimal reproduction (remove own code, isolate dependency).

### Concept 5: Root Cause Analysis (5 Whys)
Iterative questioning: "Why did the service return 500?" → "Why did the DB timeout?" → "Why didn't we have a connection timeout?" → "Why was the pool exhausted?" → "Why didn't we have circuit breaker?" Each answer drives deeper until a systemic fix emerges.

## Advanced Techniques

### Heap Diff Analysis
```bash
# Collect two snapshots
dotnet-dump collect -p 1234 -o dump1.dmp
# ... wait for leak ...
dotnet-dump collect -p 1234 -o dump2.dmp
# Analyze diff
dotnet-dump analyze dump2.dmp -c "dumpheap -stat"
```

### Thread Dump Deadlock Detection
```java
// Look for threads in BLOCKED state
// with waiting to lock <0x...> held by RUNNABLE thread
"pool-1-thread-1" #10 prio=5 os_prio=0 tid=0x... nid=0x...
  waiting to lock <0x000000076b5e5e50> (a java.lang.Object)
  locked <0x000000076b5e5e60> (a java.lang.Object)
```

## Anti-Patterns

- Healing the symptom (restarting without root cause)
- No core dumps from production (lost evidence)
- Skipping 5 Whys (treating symptoms as root cause)
- Debugging third-party code without reproduction
- Adding race conditions while debugging (more logging changes timing)
- Not collecting full thread dump during deadlock (deadlock resolved on collection)
- Guess-driven debugging (trying random fixes)
- Not automating the regression test after fix
