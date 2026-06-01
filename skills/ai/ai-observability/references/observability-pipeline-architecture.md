# Observability Pipeline Architecture

## Overview

The observability pipeline for AI systems transforms raw telemetry (traces, metrics, logs) from instrumented applications into actionable insights on dashboards. This reference covers the end-to-end architecture: agent instrumentation, collector layer, storage layer, and dashboard layer, with a focus on AI-specific concerns like tail-based sampling, token attribution, and cost analytics.

## Pipeline Stages

### Stage 1: Agent Instrumentation

The application layer emits telemetry via OpenTelemetry SDKs, platform SDKs (LangFuse, LangSmith), or custom instrumentation.

**Instrumentation strategies by language and framework:**

| Stack | Recommended Approach |
|-------|---------------------|
| Python + LangChain | LangChain callbacks + OpenTelemetry |
| Python + direct API | OpenTelemetry SDK with manual spans |
| Node.js + LangChain | LangChain callbacks + OpenTelemetry JS |
| Node.js + direct API | OpenTelemetry JS SDK |
| Python + FastAPI | OpenTelemetry instrumentator + LLM middleware |
| Any + OpenAI SDK | OpenAI's built-in OTel support (v1.31+) |

**Instrumentation surface area:**
```python
instrumentation_points = {
    "llm_call": {                  # Always instrument
        "spans": ["llm.completion"],
        "metrics": ["latency", "tokens", "cost", "status"],
        "logs": True,
    },
    "chain": {                     # If using LangChain or custom chains
        "spans": ["chain.step"],
        "metrics": ["step_latency"],
        "logs": True,
    },
    "tool_invocation": {           # If using function calling / tools
        "spans": ["tool.call"],
        "metrics": ["tool_latency", "tool_success"],
        "logs": True,
    },
    "retriever": {                 # If using RAG
        "spans": ["retriever.query"],
        "metrics": ["retrieved_docs", "retrieval_latency"],
        "logs": True,
    },
    "guardrail": {                 # If using guardrails
        "spans": ["guardrail.check"],
        "metrics": ["guardrail_result", "guardrail_latency"],
        "logs": True,
    },
    "router": {                    # If using multi-model routing
        "spans": ["router.decision"],
        "metrics": ["routed_model", "score_spread"],
        "logs": True,
    },
}
```

### Stage 2: Telemetry Export

Applications export telemetry to collectors via:
- **OTLP gRPC** (preferred): Port 4317, binary protocol, lower overhead
- **OTLP HTTP**: Port 4318, JSON or protobuf, easier firewalls
- **Prometheus pull**: Port 8000, /metrics endpoint, scrape-based
- **File log**: stdout/stderr in JSON format, collected by filelog receiver

**Export configuration (environment variables):**
```bash
# OpenTelemetry SDK configuration
export OTEL_SERVICE_NAME="llm-app"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"
export OTEL_EXPORTER_OTLP_COMPRESSION="gzip"
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=abc123"
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_RESOURCE_ATTRIBUTES="service.version=2.1.0,deployment.environment=production"
```

### Stage 3: Collector Layer

The OpenTelemetry Collector is the central routing and processing hub. It provides:

**Receivers:** OTLP, Prometheus, filelog, Kafka, host metrics
**Processors:** batch, memory_limiter, attributes, filter, tail_sampling, k8s_attributes, transform, span_metrics
**Exporters:** OTLP, Prometheus, Loki, Datadog, Splunk, S3/GCS, Kafka

**Deployment topologies:**

| Topology | Description | Best For |
|----------|-------------|----------|
| Sidecar | One collector per pod/service | Small deployments, simplicity |
| DaemonSet | One collector per node | Kubernetes, container orchestration |
| Standalone | Central collector cluster | High volume, dedicated infrastructure |
| Gateway | Multiple collectors with load balancer | Multi-region, high availability |

**Tail-based sampling processor strategy:**

The tail_sampling processor (available in OpenTelemetry Collector Contrib) evaluates complete traces before deciding whether to export:

```yaml
tail_sampling:
  decision_wait: 30s        # Wait for trace to complete
  num_traces: 100000        # Max traces in memory buffer
  expected_new_traces_per_sec: 500  # For memory estimation
  policies:
    # Always keep errors
    - name: errors
      type: status_code
      config: { status_code: ERROR }

    # Always keep slow traces
    - name: slow
      type: latency
      config: { threshold_ms: 5000 }

    # Always keep expensive traces (gpt-4o, long context)
    - name: high_cost
      type: and
      config:
        and_sub_policy:
          - name: expensive_model
            type: string_attribute
            config:
              key: gen_ai.request.model
              values: [gpt-4o, claude-3-5-sonnet]
          - name: long_context
            type: numeric_attribute
            config:
              key: gen_ai.usage.total_tokens
              min_value: 4000

    # Sample the rest probabilistically
    - name: probabilistic
      type: probabilistic
      config: { sampling_percentage: 10 }
```

**Pipeline reliability patterns:**
- Use disk-backed queues to buffer spans when backends are unavailable
- Enable retry_on_failure with exponential backoff (max 30s interval, 5min total)
- Set sending_queue queue_size to at least 5000 for production
- Monitor otelcol_exporter_queue_size and otelcol_exporter_send_failed_spans
- Deploy at least 2 collector replicas for high availability

### Stage 4: Storage Layer

Storage backends for the three pillars:

| Pillar | Recommended Backends | Retention Strategy |
|--------|---------------------|-------------------|
| Traces | Grafana Tempo, Jaeger, Datadog | 7d hot, 30d warm, 1y cold S3 |
| Metrics | Grafana Mimir/Cortex, Prometheus, Datadog | 30d raw, 12m aggregated |
| Logs | Grafana Loki, Elasticsearch, Datadog | 3d hot, 14d warm, 90d cold |
| Cost data | PostgreSQL, BigQuery, custom | 90d active, 7y archived |
| Feedback | PostgreSQL, platform-native | 90d active, indefinite archive |

**Trace storage sizing estimate:**
```
Average span size: 500 bytes (with attributes, without prompt content)
Average trace spans: 8 spans (1 LLM call + chain + tool + guardrails)
Average trace size: 4 KB

Per 1M requests:
  Trace data per day: 1M × 4KB = 4 GB/day
  With 10% sampling: 400 MB/day
  Monthly storage (no sampling): 120 GB
  Monthly storage (10% sampling): 12 GB
  Cost at $0.02/GB/month (S3): $2.40/month cold

Metrics per 1M requests:
  Time series per model: ~20 (latency P50/P95/P99, count, tokens in/out, cost, errors)
  Storage at 1s resolution: ~50 MB/day per time series
  Storage at 1m resolution: ~1 MB/day per time series
  Monthly: ~600 MB at 1m resolution
```

**Cold archiving strategy:**
```python
class TraceArchiver:
    def __init__(self, hot_backend, cold_backend, archive_after_days: int = 30):
        self.hot = hot_backend
        self.cold = cold_backend
        self.archive_after = archive_after_days

    def archive_old_traces(self):
        cutoff = datetime.utcnow() - timedelta(days=self.archive_after)
        old_traces = self.hot.query_traces(end_time=cutoff)
        batch = []
        for trace in old_traces:
            summary = {
                "trace_id": trace["trace_id"],
                "start_time": trace["start_time"],
                "end_time": trace["end_time"],
                "total_cost": self.summarize_cost(trace),
                "num_spans": len(trace.get("spans", [])),
                "models_used": list(set(
                    s["attributes"].get("gen_ai.request.model", "unknown")
                    for s in trace.get("spans", [])
                )),
                "error_spans": sum(1 for s in trace.get("spans", []) if s.get("status", {}).get("code") == "ERROR"),
                "user_id": trace.get("metadata", {}).get("user_id"),
                "feature": trace.get("metadata", {}).get("feature"),
            }
            batch.append(summary)
            self.hot.delete_trace(trace["trace_id"])
        if batch:
            self.cold.store_batch(batch)
        return {"archived": len(batch)}

    def summarize_cost(self, trace: dict) -> float:
        pricing = {"gpt-4o": {"input": 0.0025, "output": 0.01}}
        total = 0.0
        for span in trace.get("spans", []):
            if span.get("kind") != "LLM":
                continue
            attrs = span.get("attributes", {})
            model = attrs.get("gen_ai.request.model", "unknown")
            p = pricing.get(model, {"input": 0.001, "output": 0.002})
            total += (attrs.get("gen_ai.usage.prompt_tokens", 0) * p["input"] / 1000)
            total += (attrs.get("gen_ai.usage.completion_tokens", 0) * p["output"] / 1000)
        return round(total, 4)
```

### Stage 5: Dashboard Layer

Dashboards aggregate data from storage into visual representations. Organize dashboards hierarchically:

**Dashboard hierarchy for AI observability:**
```
Level 1: Executive Summary
├── Daily active users, total requests, total cost
├── Overall feedback score, overall latency P95
└── Active incidents, budget health

Level 2: Model Performance
├── Latency comparison (P50/P95/P99 by model)
├── Cost breakdown (by model, by feature, by team)
├── Token usage (input vs output trends)
├── Error rate by model and provider
└── Feedback score trend by model

Level 3: Operational Detail
├── Per-model latency heatmap (hour × model)
├── Cost-per-trace distribution histogram
├── Guardrail violation rate by type
├── Embedding drift score over time
├── Router decision distribution
└── Provider availability and latency

Level 4: Debugging
├── Trace explorer with full-text search
├── Individual trace waterfall view
├── Log correlation (trace_id search)
├── Span attribute browser
└── Metric anomaly explorer
```

**Query patterns for common dashboard panels:**

```python
# Latency heatmap by model
QUERY_LATENCY_HEATMAP = """
histogram_quantile(0.95,
  sum(rate(llm_latency_ms_bucket{model=~"$model"}[$__range])) by (le, model)
)
"""

# Cost breakdown by model
QUERY_COST_BREAKDOWN = """
sum by (model) (
  rate(llm_cost_usd_total[$__range])
)
"""

# Token usage trend
QUERY_TOKEN_TREND = """
sum by (direction) (
  rate(llm_token_usage_total{model=~"$model"}[$__range])
)
"""

# Feedback score trend
QUERY_FEEDBACK_TREND = """
avg_over_time(llm_feedback_score{model=~"$model"}[$__interval])
"""

# Error rate
QUERY_ERROR_RATE = """
(
  rate(llm_requests_total{status="error", model=~"$model"}[5m])
  /
  rate(llm_requests_total{model=~"$model"}[5m])
) * 100
"""

# Active users
QUERY_ACTIVE_USERS = """
sum by (tier) (
  llm_active_users
)
"""

# Guardrail violations
QUERY_GUARDRAIL_RATE = """
sum by (guardrail_type) (
  rate(llm_guardrail_violations_total[$__range])
)
"""

# Budget burn rate
QUERY_BUDGET_RATE = """
(
  rate(llm_daily_cost_usd[$__range])
  /
  (llm_daily_budget / 24)
) * 100
"""
```

### Pipeline Observability (Meta-Monitoring)

Monitor the pipeline itself with dedicated dashboards:

**Pipeline health metrics:**

| Metric | What It Measures | Critical Threshold |
|--------|-----------------|-------------------|
| `otelcol_exporter_send_failed_spans` | Spans that failed to export | > 1% of total |
| `otelcol_processor_dropped_spans` | Spans dropped by processors | > 0.1% of total |
| `otelcol_receiver_accepted_spans` | Total spans ingested | Sudden drop = outage |
| `otelcol_exporter_queue_size` | Current queue depth | > 80% capacity |
| `otelcol_process_runtime_total_sys_memory_bytes` | Collector memory | > 80% of limit |
| `otelcol_scraper_scraped_metric_points` | Metrics scraped | Expected baseline ± 20% |
| `otelcol_otelcol_process_cpu_seconds` | Collector CPU usage | > 70% sustained |

**Alerting rules for pipeline health:**
```yaml
groups:
  - name: opentelemetry_pipeline
    rules:
      - alert: CollectorHighDropRate
        expr: rate(otelcol_processor_dropped_spans[5m]) / rate(otelcol_receiver_accepted_spans[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Collector dropping >1% of spans"

      - alert: CollectorQueueBackpressure
        expr: otelcol_exporter_queue_size > 4000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Collector exporter queue near capacity"

      - alert: CollectorHighMemory
        expr: otelcol_process_runtime_total_sys_memory_bytes > 800000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Collector memory >800MB"

      - alert: TraceIngestionStopped
        expr: rate(otelcol_receiver_accepted_spans[5m]) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No trace data being received by collector"
```

## Pipeline Configuration by Scale

### Small Scale (< 10K requests/day)

```yaml
# Single collector, all-in-one
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
processors:
  batch:
    timeout: 1s
    send_batch_size: 512
exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }
  prometheus:
    endpoint: 0.0.0.0:8889
service:
  pipelines:
    traces: { receivers: [otlp], processors: [batch], exporters: [otlp/tempo] }
    metrics: { receivers: [otlp], processors: [batch], exporters: [prometheus] }
```

### Medium Scale (10K – 500K requests/day)

```yaml
# Collector with tail sampling + attribute processing
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317, max_concurrent_streams: 100 }
processors:
  memory_limiter: { check_interval: 1s, limit_mib: 512 }
  batch: { timeout: 1s, send_batch_size: 2048 }
  attributes:
    actions:
      - key: prompt_content
        action: delete
      - key: response_content
        action: hash
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    expected_new_traces_per_sec: 100
    policies:
      - { name: errors, type: status_code, config: { status_code: ERROR } }
      - { name: slow, type: latency, config: { threshold_ms: 5000 } }
      - { name: probabilistic, type: probabilistic, config: { sampling_percentage: 20 } }
exporters:
  otlp/tempo: { endpoint: tempo:4317, tls: { insecure: true }, compression: gzip }
  prometheus: { endpoint: 0.0.0.0:8889 }
  loki: { endpoint: http://loki:3100/loki/api/v1/push }
service:
  pipelines:
    traces: { receivers: [otlp], processors: [memory_limiter, attributes, tail_sampling, batch], exporters: [otlp/tempo] }
    metrics: { receivers: [otlp], processors: [memory_limiter, batch], exporters: [prometheus] }
    logs: { receivers: [otlp], processors: [memory_limiter, batch], exporters: [loki] }
```

### Large Scale (> 500K requests/day)

```yaml
# Multi-collector: edge collectors + aggregation layer
# Edge collector (per cluster, DaemonSet)
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }
processors:
  memory_limiter: { check_interval: 1s, limit_mib: 256 }
  batch: { timeout: 500ms, send_batch_size: 4096 }
  attributes:
    actions:
      - { key: prompt_content, action: delete }
      - { key: response_content, action: hash }
exporters:
  otlp/aggregation:
    endpoint: aggregation-collector:4317
    tls: { insecure: false }
    compression: gzip
    sending_queue: { enabled: true, queue_size: 5000 }
    retry_on_failure: { enabled: true, max_elapsed_time: 60s }

# Aggregation collector
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317, max_concurrent_streams: 1000 }
processors:
  memory_limiter: { check_interval: 1s, limit_mib: 1024 }
  batch: { timeout: 1s, send_batch_size: 8192 }
  tail_sampling:
    decision_wait: 30s
    num_traces: 200000
    expected_new_traces_per_sec: 500
    policies:
      - { name: errors, type: status_code, config: { status_code: ERROR } }
      - { name: slow, type: latency, config: { threshold_ms: 3000 } }
      - { name: probabilistic, type: probabilistic, config: { sampling_percentage: 5 } }
  span_metrics:
    metrics_exporter: prometheus
    latency_histogram_buckets: [2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000]
    dimensions:
      - key: gen_ai.request.model
      - key: gen_ai.system
      - key: gen_ai.response.finish_reason
exporters:
  otlp/tempo:
    endpoint: tempo-cluster:4317
    tls: { insecure: false }
    compression: gzip
    sending_queue: { enabled: true, queue_size: 10000, num_consumers: 20 }
  otlp/s3:
    endpoint: s3-gateway:4317
    tls: { insecure: false }
    sending_queue: { enabled: true, queue_size: 10000 }
  prometheus:
    endpoint: 0.0.0.0:8889
    resource_to_telemetry_conversion: { enabled: true }
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/tempo, otlp/s3]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

## Key Points

- The pipeline has five stages: instrumentation, export, collection, storage, and dashboard.
- Use tail-based sampling to retain error, slow, and expensive traces while sampling the rest.
- Configure collectors with memory_limiter and disk-backed queues for reliability.
- PII redaction should happen at the attribute processor stage before sampling.
- Archive traces to object storage after hot retention period with cost summaries.
- Monitor the pipeline itself with dedicated metrics and alerting.
- Scale from single collector (small) to multi-layer edge+aggregation (large).
- Always set compression (gzip) and batching for OTLP export to reduce bandwidth.
- Use span_metrics processor to derive Prometheus metrics directly from trace data.
- Match retention policies to compliance requirements, not just cost.
