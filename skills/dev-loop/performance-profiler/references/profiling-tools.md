# Profiling Tools Reference

## Per-Language Profilers

### Node.js
```bash
# Built-in CPU profiler
node --prof src/index.js
node --prof-process isolate-*.log > profile.txt

# Clinic.js
npx clinic doctor -- node src/index.js
npx clinic flame -- node src/index.js
npx clinic bubbleprof -- node src/index.js

# 0x flamegraph
npx 0x src/index.js
```

### Python
```bash
# cProfile
python -m cProfile -o output.prof src/main.py
python -m pstats output.prof  # Interactive stats browser

# py-spy (sampling profiler, no code changes needed)
py-spy record -o profile.svg -- python src/main.py
py-spy top --pid 1234

# memory_profiler
python -m memory_profiler src/main.py
```

### Go
```go
import _ "net/http/pprof"

// Access: http://localhost:6060/debug/pprof/
```
```bash
go tool pprof http://localhost:6060/debug/pprof/heap
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
```

### Rust
```bash
# perf (Linux)
perf record --call-graph dwarf target/release/binary
perf report

# flamegraph
cargo install flamegraph
cargo flamegraph --bin myapp

# heaptrack (Linux)
heaptrack ./target/release/binary
```

### Java
```bash
# JMC (JDK Mission Control)
jmc
# Async Profiler
profiler.sh -d 30 -o flamegraph -f profile.svg <pid>
```

### .NET
```bash
dotnet-trace collect --process-id <pid> --providers Microsoft-DotNETCore-SampleProfiler
dotnet-dump collect --process-id <pid>
dotnet-gcdump collect --process-id <pid>
```

## Flame Graph Interpretation

```
Bottom: code path entry points (main, request handlers)
Top: actual CPU-consuming functions (hot methods)
Width: proportion of total CPU time
Color: random (differentiate adjacent frames)

Look for:
- Wide plateaus at top → hot functions to optimize
- Tall stacks → deep call chains with overhead
- Boxy patterns → repeated calls to same function
```

## Distributed Tracing

```bash
# OpenTelemetry collector
# Jaeger for traces visualization
# Zipkin as alternative backend
```

## APM Tools

| Tool | Type | Features |
|------|------|----------|
| Datadog APM | SaaS | Traces, profiles, metrics, logs |
| New Relic | SaaS | Transaction traces, slow queries |
| Grafana Faro | OSS | Frontend + backend tracing |
| SigNoz | OSS | OpenTelemetry-native APM |
| Elastic APM | OSS | Application performance monitoring |

## Profiling Checklist

- [ ] Profile in production-like environment
- [ ] Establish baseline before optimizing
- [ ] Profile during peak traffic
- [ ] One change at a time with before/after comparison
- [ ] Profile CPU, memory, I/O separately
- [ ] Check for garbage collection / allocation pressure
