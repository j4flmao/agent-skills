---
name: devops-opentelemetry
description: >
  OpenTelemetry observability framework for distributed systems.
  Covers: OTel concepts (traces, metrics, logs, SDK, API, Collector, OTLP),
  Collector pipeline (receiver, processor, exporter, batch, sampling,
  tail sampling, attributes), SDK instrumentation (automatic and manual
  for Java, Python, Node.js, Go, .NET), trace sampling strategies
  (head-based, tail-based, probabilistic, consistent), multi-backend
  export (Jaeger, Zipkin, Prometheus, Datadog, Grafana).
  Do NOT use for: Vendor-specific APM agent configuration without OTel.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, opentelemetry, observability, tracing, metrics, phase-5]
---

# OpenTelemetry

## Purpose
Implement OpenTelemetry for vendor-neutral observability across distributed systems, covering traces, metrics, and logs collection, processing, and export to multiple backends.

## Agent Protocol

### Trigger
Exact user phrases: "OpenTelemetry", "OTel", "OTLP", "tracing", "distributed tracing", "OpenTelemetry Collector", "OTel SDK", "auto-instrumentation", "tail sampling", "OTel exporter", "Jaeger", "Zipkin", "context propagation", "span", "trace".

### Input Context
Before activating, verify:
- Programming language(s) and framework(s) used.
- Existing observability backends (Jaeger, Prometheus, Datadog, etc.).
- Deployment environment (Kubernetes, VMs, serverless).
- Collection, sampling, and export requirements.

### Output Artifact
Writes to OTel Collector YAML configuration, SDK initialization code, and deployment manifests.

### Response Format
Configuration files and code snippets with OTel SDK imports, no extraneous explanation.

### Completion Criteria
This skill is complete when:
- [ ] Collector pipeline configured with receivers, processors, exporters.
- [ ] SDK initialized in application code (auto or manual instrumentation).
- [ ] Sampling strategy configured for appropriate trace volume.
- [ ] Multi-backend export configured for redundancy.
- [ ] Context propagation verified across service boundaries.

### Max Response Length
Direct file write. No response text.

## Quick Start
Deploy OTel Collector → Configure receiver (OTLP) → Add batch processor → Configure exporters → Instrument application with SDK → Set sampling → Verify traces flowing.

## Decision Tree: Sampling Strategy
- Low-traffic service (< 100 req/s), need full traces → Head-based sampling, 100% rate
- High-traffic service, errors + slow traces critical → Tail-based sampling (keep errors, keep slow, probabilistic rest)
- Consistent sampling across services (e.g., for SLO calculation) → Consistent probability sampling (consistentProbability)
- Cost-sensitive, multi-backend → Head-based probabilistic (10-30%), plus tail for error sample
- GDPR/PCI compliance, need PII filtering → Tail-based with attributes processor for redaction before export
- Dev environment → 100% head-based sampling

## Core Workflow

### Step 1: Collector Configuration — Full Pipeline
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
          - http://localhost:3000
  filelog:
    include: [/var/log/app/*.log]
    start_at: beginning
    operators:
    - type: regex_parser
      regex: '^(?P<time>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z)\s+(?P<level>\w+)\s+(?P<message>.*)$'
      timestamp:
        parse_from: attributes.time
        layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      severity:
        parse_from: attributes.level

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
    send_batch_max_size: 2048
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
  attributes:
    actions:
    - key: environment
      value: production
      action: upsert
    - key: datacenter
      value: us-east-1
      action: upsert
    - key: db.connection_string
      action: delete
    - key: user.email
      action: hash
  filter:
    error_mode: ignore
    traces:
      span:
      - 'attributes["http.method"] == "OPTIONS"'
      - 'attributes["healthcheck"] == true'
  k8sattributes:
    extract:
      metadata:
      - k8s.pod.name
      - k8s.namespace.name
      - k8s.deployment.name
      - k8s.node.name
    pod_association:
    - sources:
      - from: resource_attribute
        name: k8s.pod.uid

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  otlp/grafana:
    endpoint: grafana-tempo:4317
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889
    resource_to_telemetry_conversion:
      enabled: true
  debug:
    verbosity: detailed
    sampling_initial: 2
    sampling_thereafter: 500

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, attributes, filter, batch]
      exporters: [otlp/jaeger, otlp/grafana, debug]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, debug]
    logs:
      receivers: [otlp, filelog]
      processors: [memory_limiter, batch]
      exporters: [otlp/grafana]
```

### Step 2: Tail Sampling Processor
```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    expected_new_rates_per_second: 1000
    policies:
    - name: always-sample-errors
      type: status_code
      config:
        status_code_source: OC
        status_codes:
        - ERROR
        - UNSET
    - name: always-sample-slow
      type: latency
      config:
        threshold_ms: 500
    - name: sample-probabilistic
      type: probabilistic
      config:
        sampling_percentage: 20
    - name: sample-by-attribute
      type: string_attribute
      config:
        key: priority
        values:
        - high
        - critical
```

### Step 3: Application Instrumentation — Java (Auto-Instrumentation)
```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=payment-service \
  -Dotel.traces.exporter=otlp \
  -Dotel.metrics.exporter=otlp \
  -Dotel.logs.exporter=otlp \
  -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
  -Dotel.propagators=tracecontext,baggage \
  -Dotel.resource.attributes=deployment.environment=production \
  -jar app.jar
```

### Step 4: Application Instrumentation — Python (Manual)
```python
from opentelemetry import trace, metrics
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.flask import FlaskInstrumentor

resource = Resource.create({
    "service.name": "payment-service",
    "service.version": "1.2.3",
    "deployment.environment": "production"
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

# Manual span creation
with tracer.start_as_current_span("process_payment") as span:
    span.set_attribute("payment.amount", 99.99)
    span.set_attribute("payment.currency", "USD")
    span.add_event("payment.processed", {"provider": "stripe"})
    result = process()
    if result.error:
        span.set_status(trace.Status(trace.StatusCode.ERROR, result.error))

# Flask auto-instrumentation
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
```

### Step 5: Application Instrumentation — Go (Manual)
```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initTracer() *sdktrace.TracerProvider {
    exporter, _ := otlptrace.New(ctx, otlptracehttp.NewClient(
        otlptracehttp.WithEndpoint("otel-collector:4318"),
        otlptracehttp.WithInsecure(),
    ))
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("payment-service"),
            semconv.DeploymentEnvironmentKey.String("production"),
        )),
    )
    otel.SetTracerProvider(tp)
    return tp
}

// Manual span
ctx, span := otel.Tracer("payment").Start(ctx, "process_payment")
span.SetAttributes(
    attribute.Float64("payment.amount", 99.99),
    attribute.String("payment.currency", "USD"),
)
defer span.End()
```

### Step 6: Context Propagation (W3C TraceContext)
```yaml
processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  # Propagation headers:
  # traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
  # tracestate: congo=t61rcWkgMzE
  # baggage: user_id=12345, session_id=abc
```

### Step 7: Metrics Pipeline with Views
```go
import (
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/sdk/metric"
)

meter := otel.Meter("payment")
requestCounter, _ := meter.Int64Counter("payment.requests.total",
    metric.WithDescription("Total payment requests"))

// Metric views for aggregation customization
provider := metric.NewMeterProvider(
    metric.WithView(metric.NewView(
        metric.Instrument{Name: "payment.duration"},
        metric.Stream{Aggregation: metric.AggregationExplicitBucketHistogram{
            Boundaries: []float64{10, 50, 100, 200, 500, 1000, 2000},
        }},
    )),
)
```

### Step 8: Collector Deployment Patterns
| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Agent** | Sidecar or DaemonSet per node | Lightweight, low latency, simple routing |
| **Gateway** | Centralized deployment, separate from apps | Multi-backend, routing logic, sampling decisions |
| **Sidecar** | One collector per pod | Isolated configs, per-app filtering |
| **Agent + Gateway** | Agent per node + Gateway fan-out | High volume, central sampling + routing |

### Step 9: OTel Collector as Gateway (Deployment)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.102.0
        args: ["--config=/conf/otel-config.yaml"]
        ports:
        - containerPort: 4317  # OTLP gRPC
        - containerPort: 4318  # OTLP HTTP
        - containerPort: 8889  # Prometheus metrics
        env:
        - name: MY_POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        volumeMounts:
        - name: config
          mountPath: /conf
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

### Step 10: OTLP Exporter with Multi-Backend Fanout
```yaml
exporters:
  otlp/prod:
    endpoint: tempo-prod:4317
    tls:
      insecure: true
    headers:
      x-auth-token: "${PROD_TOKEN}"
    sending_queue:
      enabled: true
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s
  otlp/dev:
    endpoint: tempo-dev:4317
    tls:
      insecure: true
    sending_queue:
      enabled: false
    retry_on_failure:
      enabled: false
```

### Step 11: OTel Logs with Filelog Receiver
Best for Kubernetes environments where logs are written to stdout/stderr. The collector reads container logs from `/var/log/pods/*/*/*.log` or `/var/log/containers/*.log`.

```yaml
receivers:
  filelog:
    include:
    - /var/log/pods/*/*/*.log
    include_file_name: false
    include_file_path_resolved: true
    operators:
    - type: container
      id: container-parser
    - type: recombine
      id: multi-line-recombine
      combine_field: body
      is_first_entry: 'body matches "^\\{"'
    - type: json_parser
      id: json-parse
      parse_to: body
```

## Rules & Constraints
- Never send PII in span attributes or log records.
- Always configure batch processing to avoid overwhelming backends.
- Set memory limits on Collector to prevent OOM.
- Use tail-based sampling for production (keep all errors + slow traces).
- Configure TLS for OTLP export in production.
- Always set `memory_limiter` processor before batch processor.
- Use `k8sattributes` processor to enrich traces with Kubernetes metadata.
- Never instrument health check endpoints — use filter processor.
- Set `send_batch_max_size` to prevent large batches from causing OOM.
- Always configure retry_on_failure for production backends.
- Use consistent probability sampling for multi-service trace correlation.

## Production Considerations
- Size Collector memory: 512Mi per 1000 spans/second minimum.
- Use OTLP over gRPC (port 4317) for lower latency vs HTTP.
- Enable TLS for cross-cluster OTLP export.
- Configure sending_queue to handle backend outages without data loss.
- Use OTel-Collector-Contrib for additional processors and receivers.
- Monitor Collector itself: expose Prometheus metrics on port 8889.
- Deploy at least 2 Collector replicas for HA.
- Use tail-based sampling at the gateway for central decision making.
- Set `sampling_initial` and `sampling_thereafter` on debug exporter to avoid log flooding.
- Use k8sattributes processor to add pod/namespace/deployment metadata to spans.
- Configure CORS on HTTP receiver for browser-based instrumentation.

## Anti-Patterns
- No batch processor — overwhelms backends.
- No memory limiter — Collector OOM on traffic spike.
- Head-based sampling only — loses error traces in high-volume services.
- Sampling decision at the SDK (agent-level) instead of collector (gateway).
- No k8sattributes processor — struggle to identify which pod generated spans.
- Over-instrumentation — every function call traced (high overhead).
- Excluding error details from spans — makes debugging impossible.
- Sending PII in span attributes — compliance violation.
- No retry config on exporters — data loss during transient backend failures.
- One Collector per pipeline — duplicated resources.
- Debug exporter enabled in production without sampling control.
- No propagation configuration — breaks distributed tracing across services.

## Comparison: Sampling Strategies
| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| Head-based probabilistic | Simple, low resource | Misses errors if rate low | Dev, low-traffic prod |
| Tail-based | Keeps errors + slow traces | Higher memory, latency | High-traffic prod |
| Consistent probability | Correlated across services | Complex setup | SLO monitoring |
| Rate limiting | Predictable volume | No intelligent selection | Budget-constrained |

## Troubleshooting
- No traces arriving: check Collector endpoint, verify OTLP port, check network policies.
- High Collector memory: reduce `memory_limiter.limit_mib`, increase `send_batch_size`.
- Missing spans: verify propagation headers in service-to-service calls.
- Sampling too aggressive: adjust `sampling_percentage` in tail_sampling.
- Collector OOMKilled: configure memory_limiter, reduce `num_traces` in tail_sampling.
- Slow traces not sampled: reduce `decision_wait` in tail_sampling.
- Prometheus metrics missing: verify `resource_to_telemetry_conversion` is enabled.
- Invalid config: run `otelcol --validate --config otel-config.yaml`.
- Context propagation broken: verify `traceparent` header is passed in all HTTP/gRPC calls.

## References
  - references/collector-pipeline.md — OpenTelemetry Collector Pipeline
  - references/multi-backend-export.md — Multi-Backend OTLP Export
  - references/opentelemetry-advanced.md — Opentelemetry Advanced Topics
  - references/opentelemetry-fundamentals.md — Opentelemetry Fundamentals
  - references/otel-concepts.md — OpenTelemetry Concepts
  - references/sdk-instrumentation.md — OpenTelemetry SDK Instrumentation
  - references/trace-sampling.md — OpenTelemetry Trace Sampling
## Handoff
After completing this skill:
- Next skill: **devops-apm-observability** — APM platforms receiving OTel data
- Pass context: Collector endpoint, service names, sampling config, backend URLs

## Architecture Decision Trees

### Agent vs Collector Architecture

| Decision | Agent-only | Collector (Gateway) |
|---|---|---|
| Deployment | Sidecar per pod | Separate deployment/DaemonSet |
| Scalability | Grows with app replicas | Independent scaling |
| Processing | Per-pod batching | Global aggregation |
| Filtering | Per-pod config | Central rules |
| Resilience | Lost if pod dies | Buffered, retries |
| Resource usage | Per-pod overhead | Shared, tunable |
| Best for | Simple setups, single service | Multi-service, filtering, enrichment |

### Head vs Tail Sampling

| Aspect | Head Sampling | Tail Sampling |
|---|---|---|
| Decision point | At span creation | After full trace collected |
| Performance | Low overhead | Higher (buffers traces) |
| Completeness | Partial traces | Complete or none |
| Use case | High-volume, acceptable loss | Error analysis, critical tracing |
| Implementation | SDK sampling | Collector `tailsampling` processor |
| Memory | Minimal | Proportional to throughput |

## Implementation Patterns

### YAML: OpenTelemetry Collector Pipeline

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 10s
          static_configs:
            - targets: ['0.0.0.0:8888']

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  attributes:
    actions:
      - key: environment
        value: production
        action: upsert
      - key: datacenter
        value: us-east-1
        action: upsert

  tailsampling:
    policies:
      - name: errors-only
        type: status_code
        config:
          status_code_source: status
          rules:
            - status_code: ERROR
      - name: slow-traces
        type: latency
        config:
          threshold_ms: 1000

exporters:
  otlp:
    endpoint: "https://api.honeycomb.io:443"
    headers:
      "x-honeycomb-team": "${HONEYCOMB_KEY}"

  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: otel

  logging:
    verbosity: normal

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes, batch, tailsampling]
      exporters: [otlp, logging]
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

### Bash: Automated Instrumentation Script

```bash
#!/usr/bin/env bash
set -euo pipefail

instrument_service() {
  local service=$1
  local lang=$2

  case "$lang" in
    node)
      npm install @opentelemetry/api @opentelemetry/sdk-node \
        @opentelemetry/auto-instrumentations-node
      cat > instrumentation.ts << EOF
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: '${OTEL_COLLECTOR_ENDPOINT:-http://localhost:4317}',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
EOF
      ;;
    python)
      pip install opentelemetry-distro opentelemetry-exporter-otlp
      opentelemetry-bootstrap -a install
      export OTEL_TRACES_EXPORTER=otlp
      export OTEL_METRICS_EXPORTER=otlp
      export OTEL_EXPORTER_OTLP_ENDPOINT="${OTEL_COLLECTOR_ENDPOINT:-http://localhost:4317}"
      ;;
    java)
      curl -Lo opentelemetry-javaagent.jar \
        "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar"
      export JAVA_OPTS="$JAVA_OPTS -javaagent:./opentelemetry-javaagent.jar"
      ;;
  esac
}
```

## Production Considerations

- Deploy **Collector as DaemonSet** per node — reduces network hop and allows host-level metrics
- Configure **memory_limiter processor** before all others — prevents OOM from high-throughput spans
- Implement **tail sampling** for traces — head sampling loses context; tail sampling preserves full error traces
- Enable **gRPC keepalive** on Collector (`keepalive: maxConnectionAge: 30s`) for connection rebalancing
- Use **OTLP exporter compression** (`compression: gzip`) to reduce egress bandwidth
- Set **service.name** as a resource attribute consistently — tag every service in CI/CD pipeline
- Monitor **Collector health** via its internal metrics endpoint (`/metrics`) and alert on dropped spans

## Anti-Patterns

- Sending **raw traces without sampling** at high throughput — overwhelms both Collector and backend
- Using **`always_on` sampler** in production — generates massive volume; use probability sampling
- Ignoring **Collector resource limits** — under-provisioned Collector drops spans under load
- Instrumenting **only HTTP spans** — miss database, messaging, and async operation bottlenecks
- Using **same service name** across environments — dev vs prod traces mix in the backend
- Neglecting **span attribute cardinality** — high-cardinality attributes (`user_id`, `request_id`) explode storage
- Deploying **Collector without retry/backup queue** — network blips cause permanent span loss

## Performance Optimization

- Set **batch processor** `timeout: 1s` and `send_batch_size: 1024` for optimal throughput
- Use **probability sampler** (`sampling.priority`) at the SDK level before exporting to Collector
- Enable **gRPC compression** (`compression: gzip`) in both exporter and receiver
- Tune **`memory_limiter`** to 80% of Collector's memory limit, with 20% spike allowance
- Split **pipelines by signal type** — traces through `tailsampling`, metrics through `batch` only
- Use **OTLP exporter with load balancing** (`balancer_name: round_robin`) for multi-collector deployment
- Set **span attribute exclusions** for known high-volume dimensions (health check traces, liveness probes)

## Security Considerations

- Enable **TLS** on all OTLP endpoints — never send traces unencrypted over the network
- Use **API key or OAuth headers** on Collector exporters to authenticate to backends
- Restrict **Collector metrics endpoint** — expose sensitive operation metrics only to Prometheus
- Set **redaction processor** to strip PII from span attributes (user emails, credit cards, IPs)
- Audit **Collector configuration changes** — a misconfigured exporter can leak trace data to wrong backend
- Run **Collector as non-root** with read-only root filesystem
- Secure **gRPC reflection endpoint** — disable if not needed to prevent information disclosure
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.