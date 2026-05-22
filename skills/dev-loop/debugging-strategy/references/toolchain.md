# Debug Toolchain Reference

## Debugger Setup per Language

### Node.js (Chrome DevTools)
```bash
node --inspect-brk src/index.js
# Open chrome://inspect in Chrome
# Or use: npx ndb src/index.js
```

### Python (pdb / ipdb)
```python
import ipdb; ipdb.set_trace()  # Breakpoint
# Commands: n(ext), c(ontinue), s(tep), l(ist), p(rint)
```

### Go (Delve)
```bash
dlv debug cmd/server/main.go
# Commands: b <file:line>, n, c, s, p <var>
```

### Rust (LLDB / GDB)
```bash
rust-gdb target/debug/binary
# Or use VS Code's CodeLLDB extension
```

### .NET
```bash
dotnet run
# Attach VS Code or JetBrains Rider debugger
```

### Java (JDB / IntelliJ)
```bash
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005 -jar app.jar
# Attach remote debugger at localhost:5005
```

## Logging Levels

| Level | Purpose | Example |
|-------|---------|---------|
| ERROR | System is broken | DB connection failed |
| WARN | Something unexpected but recoverable | Rate limit approaching |
| INFO | Normal operational messages | Server started on port 3000 |
| DEBUG | Detailed diagnostic info | SQL query executed |
| TRACE | Step-by-step execution flow | Entered function X with args Y |

### Structured logging pattern
```json
{"level":"ERROR","timestamp":"2026-05-14T10:30:00Z","message":"DB connection failed","service":"orders","error":"connection refused","host":"db.internal"}
```

## Tracing

### OpenTelemetry setup (Node.js)
```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter()));
provider.register();
```

## Profiling Tools per Language

| Language | CPU Profiler | Memory Profiler | Tracing |
|----------|-------------|----------------|---------|
| Node.js | --prof, clinic, 0x | heapdump, Chrome DevTools | OpenTelemetry |
| Python | cProfile, py-spy | memory_profiler, tracemalloc | OpenTelemetry |
| Go | pprof, trace | pprof | OpenTelemetry |
| Rust | perf, flamegraph | heaptrack | OpenTelemetry |
| .NET | dotnet-trace | dotnet-dump | OpenTelemetry |
| Java | JMC, async-profiler | JProfiler, jmap | OpenTelemetry |

## Error Tracking Services

| Service | Languages | Features |
|---------|-----------|----------|
| Sentry | All | Error grouping, breadcrumbs, releases |
| Datadog APM | All | Traces, profiles, logs correlation |
| New Relic | All | Distributed tracing, transaction traces |
| Elastic APM | All | OpenTelemetry native, log correlation |
