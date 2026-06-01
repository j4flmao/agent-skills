---
name: apm-observability
description: >
  Use this skill when the user says 'APM', 'observability', 'monitoring',
  'Datadog', 'New Relic', 'Grafana', 'Prometheus', 'OpenTelemetry',
  'distributed tracing', 'metrics', 'logging', 'SLI', 'SLO', 'error budget',
  'application performance monitoring', 'trace', 'span', 'telemetry',
  'instrumentation', 'RUM', 'synthetics', 'alerting'.
  Covers: metrics collection, distributed tracing, log aggregation,
  alerting and on-call, dashboards, SLI/SLO/error budget, RUM, synthetics,
  OpenTelemetry instrumentation, cost optimization for observability tools.
  Do NOT use for: infrastructure monitoring only (use monitoring skill),
  SIEM/security monitoring (use security skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, observability, monitoring, apm, phase-5]
---

# APM and Observability

## Purpose
Design and implement observability for distributed systems using metrics, traces, and logs with OpenTelemetry, SLI/SLO frameworks, and actionable alerting.

## Agent Protocol

### Trigger
Exact user phrases: "APM", "observability", "Datadog", "New Relic", "Grafana", "Prometheus", "OpenTelemetry", "distributed tracing", "SLI", "SLO", "error budget", "application performance monitoring", "RUM", "synthetics", "instrumentation".

### Input Context
Before activating, verify:
- Stack/language (for SDK selection: Java, Python, Go, Node.js, .NET).
- Infrastructure type (Kubernetes, VMs, serverless).
- Existing monitoring tools (if migrating from legacy).
- Budget constraints (observability tools can be expensive).
- Compliance requirements (log retention, audit trails, PII masking).

### Output Artifact
Writes to OpenTelemetry instrumentation config, Prometheus rules, Grafana dashboard JSON, Datadog/New Relic config, alert rules, SLI/SLO definitions.

### Response Format
Configuration YAML, Prometheus rules, dashboard JSON, or Terraform HCL for monitoring resources.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Three pillars configured: metrics, traces, logs (at least 2 of 3).
- [ ] OpenTelemetry instrumentation for key services.
- [ ] SLIs and SLOs defined for critical user journeys.
- [ ] Alerting rules with proper severity levels and escalation.
- [ ] Dashboard created for system overview.
- [ ] Cost budget set for observability tool spend.

### Max Response Length
Direct file write. No response text.

## Architecture Decision Trees

### Observability Tool Selection
| Tool | Best For | Cost | Self-Hosted |
|---|---|---|---|
| Datadog | Full-stack observability, large enterprises | $$$ (per-host + per-event) | No |
| Grafana + Prometheus | Metrics-first, Kubernetes-native | Free (OSS) / $$ (Grafana Cloud) | Yes |
| New Relic | APM-focused, polyglot apps | $$ (per-host + data ingested) | No |
| OpenTelemetry | Vendor-neutral instrumentation | Free (standards) | N/A |
| Elastic (ELK) | Log-centric, search-heavy | $ (self-hosted) / $$ (cloud) | Yes |
| SigNoz | OpenTelemetry-native APM | $$$ (cloud) / Free (self-hosted) | Yes |
| Dynatrace | Enterprise, automatic instrumentation | $$$$ | No |

### Metrics vs Traces vs Logs: When to Use
| Signal | What It Answers | Storage Cost | Retention |
|---|---|---|---|
| Metrics | What's happening? How many/long? | Low | Months-years |
| Traces | Why is it slow? Where's the error? | High (per-span) | Days-weeks |
| Logs | What exactly happened? Debug context | Medium-high | Days-months |

### Instrumentation Strategy
| Approach | Effort | Accuracy | Maintainability |
|---|---|---|---|
| Auto-instrumentation (agent) | Low | Medium | Low (magic) |
| Manual instrumentation (SDK) | High | High | High |
| eBPF (kernel-level) | Low | Medium (Linux only) | Medium |
| Service mesh (sidecar) | Medium | Medium (network only) | Medium |

### Sampling Decision
| Sampling Strategy | Use Case | Trace Retention |
|---|---|---|
| Head-based (fixed % ) | Low traffic, debug | 100% for low-traffic |
| Tail-based (error + slow) | High traffic, production errors | 100% errors, 5% success |
| Probabilistic (random %) | High traffic, stats only | 1-10% |
| Rate-limited | Burst traffic | N traces/second |

## Quick Start
OpenTelemetry SDK → Export metrics/traces to collector → Prometheus for metrics → Grafana for dashboards → Alertmanager for alerts → SLI/SLO tracking.

## Core Workflow

### Step 1: OpenTelemetry Instrumentation
```yaml
# otel-collector-config.yaml
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

  jaeger:
    protocols:
      grpc:
        endpoint: 0.0.0.0:14250

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

  filter:
    error_mode: ignore
    metrics:
      exclude:
        match_type: regexp
        metric_names:
          - 'container\.network\.*'

  probabilistic_sampler:
    hash_seed: 42
    sampling_percentage: 10.0

exporters:
  otlp:
    endpoint: "backend-otlp:4317"
    tls:
      insecure: false
    headers:
      api-key: "${OTEL_API_KEY}"

  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "app"

  debug:
    verbosity: basic

extensions:
  health_check:
    endpoint: "0.0.0.0:13133"
  pprof:
    endpoint: "0.0.0.0:1777"

service:
  extensions: [health_check, pprof]
  pipelines:
    traces:
      receivers: [otlp, jaeger]
      processors: [memory_limiter, batch, attributes, probabilistic_sampler]
      exporters: [otlp, debug]
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch, attributes, filter]
      exporters: [otlp, prometheus, debug]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [otlp, debug]
```

### Step 2: Service Instrumentation (Python Example)
```python
# app/instrumentation.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

resource = Resource.create({
    "service.name": "payment-service",
    "service.version": "1.2.0",
    "deployment.environment": "production",
})

# Tracing
trace_provider = TracerProvider(resource=resource)
trace_exporter = OTLPSpanExporter(
    endpoint="http://otel-collector:4317",
    insecure=True,
)
trace_provider.add_span_processor(
    BatchSpanProcessor(trace_exporter, max_export_batch_size=512)
)
trace.set_tracer_provider(trace_provider)

# Metrics
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317", insecure=True),
    export_interval_millis=10000,
)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

# Auto-instrumentation
FlaskInstrumentor().instrument()
RequestsInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument()

# Custom metrics
meter = metrics.get_meter("payment-service")
payment_counter = meter.create_counter(
    "payments.processed",
    description="Number of payments processed",
    unit="1",
)
payment_duration = meter.create_histogram(
    "payments.duration",
    description="Payment processing duration",
    unit="ms",
)
active_payments = meter.create_up_down_counter(
    "payments.active",
    description="Currently active payments",
    unit="1",
)
```

```python
# app/routes.py
from opentelemetry import trace
from opentelemetry import metrics

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

payment_counter = meter.create_counter("payments.processed")
payment_duration = meter.create_histogram("payments.duration")

@app.route("/api/payments", methods=["POST"])
def create_payment():
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("payment.amount", request.json["amount"])
        span.set_attribute("payment.currency", request.json["currency"])
        span.add_event("payment.started", {"method": request.json["method"]})

        start = time.time()
        try:
            result = payment_service.process(request.json)
            span.set_status(trace.StatusCode.OK)
            payment_counter.add(1, {"status": "success", "method": request.json["method"]})
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            payment_counter.add(1, {"status": "error", "error_type": type(e).__name__})
            raise
        finally:
            duration_ms = (time.time() - start) * 1000
            payment_duration.record(duration_ms, {"method": request.json["method"]})

        return jsonify(result), 201
```

### Step 3: Prometheus Recording Rules and Alerts
```yaml
# prometheus-rules.yml
groups:
  - name: app-slos
    interval: 30s
    rules:
      - record: namespace:request_duration_seconds:99percentile
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, namespace)
          )
      - record: namespace:error_rate:ratio5m
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (namespace)
          /
          sum(rate(http_requests_total[5m])) by (namespace)

  - name: app-alerts
    interval: 15s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service) > 0.01
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "{{ $labels.service }} error rate > 1%"
          description: |
            Service {{ $labels.service }} has {{ humanize $value }} error rate
            over the last 5 minutes.

      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) > 2.0
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "{{ $labels.service }} P99 latency > 2s"

      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} down"

      - alert: SLOBurnRate
        expr: |
          (
            1 - (
              sum(rate(http_requests_total{status!~"5.."}[1h])) by (service)
              /
              sum(rate(http_requests_total[1h])) by (service)
            )
          ) > (1 - 0.999) * 14.4
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SLO burn rate exceeded for {{ $labels.service }}"
```

### Step 4: Grafana Dashboard Definition
```json
{
  "title": "Payment Service Overview",
  "uid": "payment-service-overview",
  "tags": ["service", "payment"],
  "editable": false,
  "time": { "from": "now-6h", "to": "now" },
  "refresh": "30s",
  "panels": [
    {
      "title": "Request Rate",
      "type": "timeseries",
      "fieldConfig": {
        "defaults": {
          "unit": "reqps",
          "min": 0
        }
      },
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{service=\"payment-service\"}[5m]))",
          "legendFormat": "Total",
          "refId": "A"
        },
        {
          "expr": "sum(rate(http_requests_total{service=\"payment-service\",status=~\"5..\"}[5m]))",
          "legendFormat": "Errors",
          "refId": "B"
        }
      ]
    },
    {
      "title": "P99 Latency",
      "type": "timeseries",
      "fieldConfig": {
        "defaults": {
          "unit": "s",
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "green", "value": null },
              { "color": "yellow", "value": 1.0 },
              { "color": "red", "value": 2.0 }
            ]
          }
        }
      },
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service=\"payment-service\"}[5m])) by (le))",
          "legendFormat": "P99"
        }
      ]
    },
    {
      "title": "Service Health",
      "type": "stat",
      "targets": [
        {
          "expr": "up{job=\"payment-service\"}",
          "legendFormat": ""
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "red", "value": null },
              { "color": "green", "value": 1 }
            ]
          }
        }
      }
    }
  ]
}
```

### Step 5: SLI and SLO Definition
```yaml
# slo-definitions.yml
service: payment-service
version: "1.0"
owners:
  - team-payments@company.com

slis:
  - name: availability
    description: "Proportion of successful requests"
    indicator: |
      sum(rate(http_requests_total{service="payment-service",status!~"5.."}[5m]))
      /
      sum(rate(http_requests_total{service="payment-service"}[5m]))
    unit: "%"
    threshold_type: upper

  - name: latency_p99
    description: "P99 request duration"
    indicator: |
      histogram_quantile(0.99,
        sum(rate(http_request_duration_seconds_bucket{service="payment-service"}[5m])) by (le)
      )
    unit: "s"
    threshold_type: lower

  - name: throughput
    description: "Requests per second"
    indicator: |
      sum(rate(http_requests_total{service="payment-service"}[5m]))
    unit: "req/s"
    threshold_type: lower

slos:
  - name: payment-availability-99.9
    description: "Payment API availability SLO"
    sli: availability
    target: 99.9
    window: 30d
    error_budget: 0.1
    burn_rate_alerts:
      - window: 1h
        multiplier: 14.4
        severity: critical
      - window: 6h
        multiplier: 6
        severity: warning

  - name: payment-latency-p99-2s
    description: "Payment API latency SLO"
    sli: latency_p99
    target: 2.0
    window: 28d
    error_budget: 0.5
    burn_rate_alerts:
      - window: 1h
        multiplier: 14.4
        severity: critical
```

### Step 6: Logging Configuration
```yaml
# structured-logging-config.yaml
# Application-side structured logging (JSON format)
formatters:
  json:
    type: json
    timestamp_format: "2006-01-02T15:04:05.000Z07:00"
    fields:
      - key: severity
        source: level
      - key: timestamp
        source: time
      - key: logger
        source: name
      - key: message
        source: message
      - key: trace_id
        source: trace_id
      - key: span_id
        source: span_id
      - key: service
        source: service

# Log format example:
# {"severity":"error","timestamp":"2025-06-01T10:30:00.000Z","logger":"payment.service",
#  "message":"Payment processing failed","trace_id":"abc123def456","span_id":"span789",
#  "service":"payment-service","payment_id":"pay_001","error":"insufficient_funds",
#  "duration_ms":245}
```

## Tool Comparison: Observability Platforms

| Feature | Datadog | Grafana Cloud | New Relic | Self-Hosted (Prom + Grafana) |
|---|---|---|---|---|
| Metrics | Mature | Excellent | Good | Excellent |
| Traces | Good | Good (Tempo) | Excellent | Moderate (Tempo/Jaeger) |
| Logs | Excellent (Log Management) | Good (Loki) | Good | Good (Loki/ELK) |
| RUM/Synthetics | Built-in | Built-in (k6) | Built-in | Third-party |
| APM Agents | Many languages | Many languages | Many languages | OpenTelemetry |
| Alerting | Good | Excellent (Grafana Alerting) | Good | Prometheus + Alertmanager |
| Cost per host | ~$15-23/host/month | ~$8-16/host/month | ~$10-20/host/month | Infrastructure only |
| Learning curve | Medium | Medium | Medium | High |
| Multi-cloud | Excellent | Excellent | Excellent | Excellent |
| Kubernetes support | Native | Native | Native | Native |
| OpenTelemetry support | Native | Native | Native | Native |

## Anti-Patterns

### Anti-Pattern 1: Observability as an Afterthought
Adding instrumentation after the system is built. Instrumentation must be part of the development process — include in definition of done.

### Anti-Pattern 2: Dashboard Sprawl
Creating hundreds of dashboards that nobody looks at. Focus on a small number of high-quality dashboards aligned to team ownership.

### Anti-Pattern 3: Alert Fatigue
Too many noisy alerts desensitize responders. Define alerts based on SLO burn rates, not every minor metric fluctuation.

### Anti-Pattern 4: No Sampling for Traces
Collecting 100% of traces in high-throughput systems. Use tail-based sampling to capture all errors and a representative sample of success traces.

### Anti-Pattern 5: Logging Without Structure
Free-form text logs instead of structured JSON. Without structure, you can't filter, aggregate, or alert on log content.

### Anti-Pattern 6: Ignoring Observability Costs
Letting observability spend grow unchecked. Set budgets, monitor data ingestion, and adjust retention/sampling to control costs.

## Production Considerations

### Security
- Mask PII in logs before ingestion (credit cards, SSNs, emails).
- Use mutual TLS for telemetry transport between agents and collectors.
- Restrict dashboard access using RBAC (viewer vs editor vs admin).
- Audit who modifies dashboards and alert rules.
- Encrypt logs at rest in the storage backend.

### Cost Optimization
- Use tail-based sampling: collect 100% errors, sample success traces at 5-10%.
- Reduce metric cardinality: limit unique label values (avoid user_id, email as labels).
- Set log retention tiers: hot 7d, warm 30d, cold 365d.
- Use aggregated metrics (histograms) instead of per-request metrics.
- Set ingestion budgets per team/service with alerts when approaching limits.

### High Availability
- Run multiple OpenTelemetry Collector instances behind a load balancer.
- Use batch processing to handle telemetry spikes.
- Configure memory limits on collectors to prevent OOM.
- Buffer telemetry to disk when backend is unavailable.
- Deploy collectors in each region/availability zone.

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|---|---|---|
| Missing traces | Sampling dropping them | Check sampling rate; increase for debug |
| High data ingestion cost | Too many metrics/traces | Reduce cardinality; implement sampling |
| Alerts not firing | Recording rules not evaluated | Check Prometheus rule evaluation interval |
| Dashboards show no data | Grafana data source not configured | Verify data source URL and access |
| Collector OOM | Memory limit too low | Reduce batch size; increase memory limit |
| Traces not correlated | Missing trace context propagation | Ensure traceparent header passed between services |

## Rules & Constraints
- Instrument with OpenTelemetry SDK — avoid vendor-specific agents.
- Every service must export RED metrics (Rate, Errors, Duration).
- All production services must have defined SLOs with error budgets.
- Alerts must have runbooks — no alert without documented response.
- Dashboards must be version-controlled (Grafana as code).
- PII must be filtered before log ingestion — never in raw logs.
- Set ingestion budgets per team — prevent cost surprises.
- Use structured logging (JSON) — never unstructured text logs.
- Pin collector and SDK versions — auto-updates can break pipelines.
- Test alerting rules in staging before deploying to production.

## Output Format
OpenTelemetry collector config, Prometheus rules, Grafana dashboard JSON, SLI/SLO definitions, instrumentation code snippets.

## References
  - references/apm-instrumentation.md
  - references/apm-observability-advanced.md
  - references/apm-observability-fundamentals.md
  - references/datadog-setup.md
  - references/grafana-cloud.md
  - references/new-relic-setup.md
  - references/synthetic-monitoring.md
  - references/otel-sampling-guide.md

## Handoff
After completing this skill:
- Next skill: **monitoring** — infrastructure monitoring, Prometheus operator
- Pass context: OTEL endpoint, Grafana dashboard UIDs, SLO definitions, alert routing
