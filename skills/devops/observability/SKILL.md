---
name: observability
description: >
  Use this skill when the user says 'observability', 'logging', 'metrics',
  'tracing', 'OpenTelemetry', 'Grafana', 'Prometheus', 'structured logs',
  'distributed tracing', 'monitoring', or when setting up observability for a
  service. Covers: three pillars (logs, metrics, traces), structured JSON logging,
  OpenTelemetry SDK setup per stack, SLO/SLI/SLA definitions, and alert design
  (alert on symptoms, not causes). Works with any language/stack.
  Do NOT use this for: infrastructure monitoring, database performance, or
  frontend analytics.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, observability, phase-5]
---

# Observability

## Purpose
Set up structured logging, metrics, and distributed tracing to understand system behavior in production.

## Agent Protocol

### Trigger
Exact user phrases: "observability", "logging", "metrics", "tracing", "OpenTelemetry", "Grafana", "Prometheus", "structured logs", "distributed tracing", "monitoring".

### Input Context
Before activating, verify:
- The stack is known (for OpenTelemetry SDK selection).
- The existing observability tooling is understood (Prometheus, Grafana, etc.).
- The traffic volume is known (for trace sampling strategy).

### Output Artifact
No file output. This skill produces an observability plan.

### Response Format
Observability plan: logging format, metrics list, trace sampling strategy, SLOs, alert rules.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of why observability is important.

### Completion Criteria
This skill is complete when:
- [ ] Structured JSON logging format is defined with required fields.
- [ ] Key metrics are listed (counters, gauges, histograms).
- [ ] Trace sampling strategy is specified.
- [ ] SLOs are defined with SLIs.
- [ ] Alert rules follow symptom-based (not cause-based) design.

### Max Response Length
40 lines.

## Quick Start
Three pillars: logs (what happened), metrics (how often/how much), traces (where it happened). Use JSON structured logging. OpenTelemetry for traces. Alert on symptoms (user impact), not causes.

## Decision Tree: Observability Strategy
- New microservice, no existing observability → Structured JSON logs + RED metrics + OpenTelemetry traces at 10% sampling
- Existing service with basic monitoring → Add distributed tracing, define SLOs, implement burn-rate alerts
- High-traffic service (>10k req/s) → Tail-based sampling, cardinality management, log sampling
- Compliance-heavy environment (PCI/HIPAA) → Structured logging with PII redaction, audit trails, trace sampling + attribute filtering
- Serverless/event-driven → Distributed context propagation, structured logs with correlation IDs, metrics on function duration

### Logging vs Metrics vs Traces Decision
```
What do you need to understand?
├── What happened? → Logs (structured, searchable, correlated)
├── How often / how much? → Metrics (counters, gauges, histograms)
├── Where did it happen in the request path? → Traces (span tree, timing)
└── All three → OpenTelemetry SDK + log correlation (traceId in logs)
```

### Sampling Strategy Decision
```
What is the request rate?
├── < 100 req/s → 100% sampling (cheap enough to keep everything)
├── 100-1000 req/s → 10% head-based probabilistic
├── 1000-10000 req/s → 1% head-based + tail-based for errors/slow
└── > 10000 req/s → Rate-limited (100 traces/sec) + tail-based for errors
```

## Core Workflow

### Step 1: Structured Logging
```json
// GOOD — structured JSON
{
  "level": "error",
  "message": "Payment processing failed",
  "service": "order-service",
  "traceId": "abc123",
  "userId": "user-456",
  "orderId": "order-789",
  "error": {
    "type": "PaymentTimeoutError",
    "message": "Payment gateway timeout after 30s",
    "stack": "..."
  },
  "duration_ms": 30042,
  "timestamp": "2026-05-14T10:30:00Z"
}

// BAD — unstructured text: "Error processing order: something went wrong"
```

**Required fields**: `level`, `message`, `service`, `timestamp`, `traceId`
**Context fields**: `userId`, `orderId`, `requestId`, `duration_ms`

### Step 2: Metrics — RED Method (for services)
| Metric | Type | Example |
|---|---|---|
| **Rate** | Counter | `http_requests_total{method, path, status}` |
| **Errors** | Counter | `http_requests_errors_total{method, path, status}` |
| **Duration** | Histogram | `http_request_duration_seconds{method, path}` |

### Step 3: Metrics — USE Method (for infrastructure)
| Metric | Type | Example |
|---|---|---|
| **Utilization** | Gauge | `cpu_usage_ratio`, `memory_usage_bytes` |
| **Saturation** | Gauge | `queue_depth`, `disk_io_wait_seconds` |
| **Errors** | Counter | `disk_io_errors_total`, `network_drops_total` |

### Step 4: Key Metrics for Every Service
```prometheus
# Request rate
sum(rate(http_requests_total[5m])) by (service, method, path)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)

# Latency p99
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# Active requests
sum(http_requests_active) by (service)

# SLO burn rate
(
  sum(rate(http_requests_total{status!~"5.."}[1h]))
  /
  sum(rate(http_requests_total[1h]))
)
```

### Step 5: Prometheus Recording Rules
```yaml
groups:
- name: service_slos
  interval: 30s
  rules:
  - record: service:error_rate_5m
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
      /
      sum(rate(http_requests_total[5m])) by (service)

  - record: service:latency_p99_5m
    expr: |
      histogram_quantile(0.99,
        sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
      )

  - record: service:availability_30d
    expr: |
      sum(rate(http_requests_total{status!~"5.."}[30d])) by (service)
      /
      sum(rate(http_requests_total[30d])) by (service)
```

### Step 6: SLO Burn Rate Alerts
```yaml
groups:
- name: slo_alerts
  rules:
  - alert: HighErrorRate
    expr: |
      (
        sum(rate(http_requests_total{status=~"5.."}[1h])) by (service)
        /
        sum(rate(http_requests_total[1h])) by (service)
      ) > 0.001  # 99.9% SLO
    for: 5m
    labels:
      severity: page
      slo: 99.9
    annotations:
      summary: "Error rate above SLO budget for {{ $labels.service }}"
      description: "Error rate {{ $value | humanizePercentage }} exceeds SLO threshold"

  - alert: BurnRateTooFast
    expr: |
      (
        sum(rate(http_requests_total{status!~"5.."}[1h])) by (service)
        /
        sum(rate(http_requests_total[1h])) by (service)
      ) < 0.999
      and on(service)
      (
        sum(rate(http_requests_total{status!~"5.."}[5m])) by (service)
        /
        sum(rate(http_requests_total[5m])) by (service)
      ) < 0.99
    labels:
      severity: page
    annotations:
      summary: "SLO burn rate too fast for {{ $labels.service }}"
```

### Step 7: Distributed Tracing with Sampling
| Strategy | Sampling Rate | Use Case |
|---|---|---|
| Head-based probabilistic | 1-10% | High-traffic services |
| Tail-based | Keep errors + slow | Production critical paths |
| Rate limiting | 100 traces/sec | Budget-constrained |
| Consistent probability | 10% per service | Multi-service trace correlation |

```typescript
// OpenTelemetry Node.js SDK with sampling
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4317' }),
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1), // 10% sampling
  }),
});
```

### Step 8: Log Aggregation with Loki
```yaml
scrape_configs:
- job_name: kubernetes-pods
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: keep
    regex: myapp
  - action: labelmap
    regex: __meta_kubernetes_pod_label_(.+)
  pipeline_stages:
  - json:
      expressions:
        level: level
        service: service
        traceId: traceId
        duration_ms: duration_ms
  - labels:
      level:
      service:
  - drop:
      expression: ".*healthcheck.*"
```

### Step 9: Grafana Dashboard Variables
```json
{
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "query": "label_values(up, service)"
      },
      {
        "name": "environment",
        "type": "query",
        "query": "label_values(up{service=\"$service\"}, environment)"
      }
    ]
  },
  "panels": [
    {
      "title": "Request Rate",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(http_requests_total{service=\"$service\"}[5m])) by (status)",
        "legendFormat": "{{ status }}"
      }]
    },
    {
      "title": "Latency p99",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service=\"$service\"}[5m])) by (le))",
        "legendFormat": "p99"
      }]
    }
  ]
}
```

### Step 10: Structured Logging per Language
```python
# Python
import structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)
log = structlog.get_logger()
log.info("order.placed", order_id="ord-123", amount=99.99)
```

```go
// Go with slog
import "log/slog"
slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
})))
slog.Info("payment processed",
    "order_id", "ord-123",
    "amount", 99.99,
    "trace_id", traceID)
```

```java
// Java with Logback + structured layout
// logback.xml
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
  <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
</appender>
```

### Step 11: Cardinality Management
```yaml
# Prometheus metrics with bounded cardinality
# BAD: label with unbounded values (user_id, email, request_id)
http_requests_total{method="GET", path="/api/users/:id", status="200", user_id="user-123"}

# GOOD: label with bounded values (method, path template, status)
http_requests_total{method="GET", path="/api/users/{id}", status="200"}

# Relabeling in Prometheus
metric_relabel_configs:
- source_labels: [path]
  regex: '/api/users/[^/]+'
  replacement: '/api/users/{id}'
  target_label: path
```

### Step 12: OpenTelemetry Collector Configuration
```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  attributes:
    actions:
      - key: environment
        value: production
        action: upsert
  filter:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.target"] == "/health"'

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes, filter]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [loki]
```

### Step 13: Business Metrics — Custom Instrumentation
```python
# metrics/business_metrics.py
from prometheus_client import Counter, Histogram, Gauge
import time

# Business counters
orders_created = Counter('orders_created_total', 'Total orders created', ['region', 'currency'])
orders_cancelled = Counter('orders_cancelled_total', 'Orders cancelled', ['reason'])
payment_success = Counter('payment_success_total', 'Successful payments', ['provider'])
payment_failed = Counter('payment_failed_total', 'Failed payments', ['provider', 'error_code'])

# Business histograms
order_value = Histogram('order_value_dollars', 'Order value distribution',
                         buckets=[10, 25, 50, 100, 250, 500, 1000, 2500, 5000])
checkout_duration = Histogram('checkout_duration_seconds', 'Checkout flow duration',
                               buckets=[1, 2, 5, 10, 30, 60, 120])

# Business gauges
active_users = Gauge('active_users', 'Currently active users', ['tier'])
cart_abandonment = Gauge('cart_abandonment_rate', 'Cart abandonment rate')

def track_order(region, currency, value):
    orders_created.labels(region=region, currency=currency).inc()
    order_value.observe(value)

def track_checkout(user_id, duration):
    checkout_duration.observe(duration)
    # Example: track user in business context
    active_users.layers(tier='premium').inc()
```

### Step 14: SLO Definition Template
```yaml
# slo-definitions.yaml
slos:
  - name: "API Availability"
    sli: "ratio of successful requests to total requests"
    measurement: "sum(rate(http_requests_total{status!~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
    target: 99.9%
    window: 30d
    burn_rate_alerts:
      - window: 1h
        threshold: 2x  # Exhaust SLO budget in 15 days
      - window: 5m
        threshold: 10x  # Exhaust SLO budget in 3 days

  - name: "API Latency"
    sli: "P99 response time"
    measurement: "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))"
    target: "< 500ms"
    window: 30d

  - name: "API Throughput"
    sli: "requests per second"
    measurement: "sum(rate(http_requests_total[5m]))"
    target: ">= 100 req/s at P99"
    window: 7d
```

### Step 15: Observability Maturity Model
| Level | Logs | Metrics | Traces | Alerts |
|---|---|---|---|---|
| 1: Crawl | Unstructured, grep-based | CPU/memory only | None | Basic threshold |
| 2: Walk | Structured JSON, aggregated | RED method per service | Head-based sampling | Symptom-based |
| 3: Run | Correlation IDs, PII redacted | USE + RED + business metrics | Tail-based + consistent | SLO burn-rate |
| 4: Fly | Auto-instrumented, real-time | Custom business metrics | 100% error traces | Predictive ML-based |

## Tool Comparison: Observability Platforms

| Feature | Grafana + Prometheus + Loki | Datadog | New Relic | Honeycomb |
|---|---|---|---|---|
| Logs | Loki (OSS, S3-backed) | Log Management | Logs | Log integration |
| Metrics | Prometheus (OSS, pull) | Datadog Agent | NRDB | Custom events |
| Traces | Tempo (OSS) | APM | Distributed Tracing | Events (no spans) |
| SLOs | Grafana SLO app | SLO management | SLOs | SLOs |
| Cost | OSS (infra cost only) | $$$ (per host + data) | $$$ (per GB) | $$$ (per event) |
| Cardinality | Limited by TSDB | High (no limit) | High | Unlimited |
| Best for | OSS-first, K8s-native | All-in-one, ease of use | Full-stack observability | Debugging, high-cardinality |
| Self-hosted | Yes | No | No | No |

## Security Considerations
- Never log credentials, tokens, PII, or PCI data — use log scrubbing / redaction pipelines
- OpenTelemetry collector should run in a trusted network zone with mTLS for gRPC
- Grafana authentication via OAuth/OIDC — never share dashboards publicly
- Loki log retention must comply with data privacy requirements (GDPR: 30d default)
- Trace attributes may contain sensitive query parameters — filter in OTel collector
- Prometheus remote write should use TLS + basic auth or mTLS
- Audit log access: who viewed what, when, and from where
- Rate-limit Grafana query API to prevent denial of service via expensive queries
- Encrypt Prometheus TSDB at rest if storing on persistent volumes

## Production Considerations
- Set log retention: 7-30 days for standard, 90+ days for audit compliance.
- Configure log sampling for high-volume services (1:10 or 1:100).
- Use recording rules to pre-compute expensive PromQL queries.
- Set up SLO burn-rate alerts (multi-window, multi-burn-rate) for faster detection.
- Implement log-based metrics for business-level indicators.
- Use Exemplars to correlate metrics with traces.
- Monitor observability pipeline itself: collector queue depth, export latency.
- Set up silent test alerts to verify alert pipeline end-to-end weekly.
- Use aggregation windows appropriate to pager load: 5m for paging, 15m for dashboards.
- Configure OTel collector memory limiter to prevent OOM on traffic spikes.
- Use `metric_relabel_configs` to drop high-cardinality labels before ingestion.
- Set up Prometheus `max_samples_per_send` to prevent rejected remote write batches.
- Tiered storage: hot (SSD) for 7d, warm (HDD) for 30d, cold (S3) for 90d+.

## Anti-Patterns
- Alerting on CPU/memory — these are causes, not symptoms of user impact.
- Unstructured logging — can't parse, filter, or correlate without regex hacks.
- No traceId in logs — impossible to correlate logs with traces.
- Over-sampling traces — unnecessary cost and storage.
- High cardinality metric labels — Prometheus performance degrades.
- No SLOs — no target for reliability, no basis for paging decisions.
- Dashboard per service instead of templated dashboards — maintenance burden.
- Alert fatigue from flapping alerts — tune for, tolerance before paging.
- Logging PII — compliance violation, potential data breach.
- Not testing alert configuration — alert fires but notification fails.

## References
  - references/alerting-strategies.md — Alerting Strategies
  - references/custom-metrics.md — Custom Metrics
  - references/log-aggregation.md — Log Aggregation
  - references/observability-advanced.md — Observability Advanced Topics
  - references/observability-fundamentals.md — Observability Fundamentals
  - references/observability-maturity.md — Observability Maturity Model
  - references/otel-guide.md — OpenTelemetry Setup per Stack
## Handoff
After completing this skill:
- Next skill: **performance-profiler** — using observability data to find bottlenecks
- Pass context: logging format, metrics configuration, trace sampling rate
