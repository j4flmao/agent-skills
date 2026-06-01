---
name: ai-ai-observability
description: >
  Use this skill when implementing AI observability: LLM monitoring, LangSmith, LangFuse, Arize, Helicone, tracing LLM calls, token usage tracking, latency monitoring, prompt logging, guardrail monitoring, feedback collection.
  This skill enforces: tracing configuration, token tracking, cost attribution, latency budgets, feedback collection, guardrail effectiveness monitoring.
  Do NOT use for: general application monitoring (use APM tools), model evaluation (use eval frameworks), prompt engineering.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, observability, monitoring, phase-11]
---

# AI Observability Agent

## Purpose
Design and implement end-to-end observability for AI systems: LLM tracing, token/cost tracking, latency monitoring, feedback collection, guardrail effectiveness, drift detection, and production alerting. Covers the full pipeline from agent instrumentation to collector to storage to dashboard.

## Decision Trees

### Scale Decision Tree
```
How many LLM calls per day?
├── < 1,000
│   └── Use LangFuse free tier or Helicone. Manual dashboard. No sampling.
├── 1,000 – 100,000
│   ├── Self-hosted? → LangFuse self-host or SigNoz
│   └── Managed? → LangSmith dev tier or Datadog LLM Obs
│   └── Sampling: 100% traces, aggregate metrics via Prometheus
├── 100,000 – 1,000,000
│   ├── Head-based sampling (store 10% of traces)
│   ├── Tail-based sampling (store error + slow traces, sample healthy)
│   └── Backend: Grafana + Tempo + Loki or Datadog
└── > 1,000,000
    ├── OpenTelemetry collector with tail-based sampling processor
    ├── Metrics aggregation at edge (statsd/stadshaper sidecar)
    ├── Storage: cloud-native (S3/GCS for traces, time-series DB for metrics)
    └── Dashboard: Grafana with hierarchical views
```

### Budget Decision Tree
```
Monthly observability budget?
├── < $100/month
│   ├── LangFuse self-host (free tier, single node)
│   ├── Prometheus + Grafana (self-managed)
│   └── Retention: 7 days traces, 30 days metrics
├── $100 – $1,000/month
│   ├── LangSmith dev tier + Grafana
│   └── Retention: 30 days traces, 90 days metrics
├── $1,000 – $10,000/month
│   ├── Datadog LLM Observability or Grafana Cloud
│   └── Retention: 90 days traces, 12 months metrics
└── > $10,000/month
    ├── Enterprise Datadog, Honeycomb, or self-managed OpenTelemetry stack
    ├── Dedicated observability engineer
    └── Custom retention policies per data class
```

### Stack Decision Tree
```
Existing infrastructure?
├── Kubernetes-native
│   ├── OpenTelemetry Collector (daemonset) → Tempo (traces) + Cortex (metrics) + Loki (logs)
│   └── Grafana dashboards with LLM-specific panels
├── Serverless / Lambda
│   ├── OTel Lambda layers → collector (Lambda extension) → backends
│   └── Managed: Datadog Serverless APM, Lumigo
├── Monolithic / Single service
│   ├── LangFuse or Helicone (minimal setup)
│   └── Native SDK tracing → built-in dashboard
└── Multi-service / Microservices
    ├── OpenTelemetry with context propagation (W3C traceparent)
    ├── Central collector per service mesh
    └── Trace correlation across service boundaries
```

## Core Patterns

### Pattern 1: Tracing (OpenTelemetry for LLM Calls)
Use OpenTelemetry semantic conventions for generative AI (semconv gen_ai). Every LLM call produces a span with:
- `gen_ai.system`: "openai", "anthropic", "google", "azure"
- `gen_ai.request.model`: model identifier
- `gen_ai.request.max_tokens`, `gen_ai.request.temperature`
- `gen_ai.response.model`: resolved model name
- `gen_ai.usage.prompt_tokens`, `gen_ai.usage.completion_tokens`, `gen_ai.usage.total_tokens`
- `gen_ai.response.finish_reason`: "stop", "length", "content_filter"

Trace every chain step, tool invocation, retriever query, and guardrail check as child spans. Root span carries user_id, session_id, and application version.

### Pattern 2: Metrics (Three Pillars)
Collect three metric categories with consistent label schemas:

**Latency metrics:**
```
llm_request_duration_ms{model, operation, provider}  # Histogram
llm_time_to_first_token_ms{model, provider}           # Histogram
llm_inter_token_latency_ms{model}                     # Gauge
llm_queue_wait_ms{queue_name}                         # Histogram
```

**Token & cost metrics:**
```
llm_token_usage_total{model, direction}               # Counter (direction: input/output)
llm_cost_usd_total{model, provider, team}             # Counter
llm_cost_per_query{model}                             # Gauge
```

**Quality & safety metrics:**
```
llm_feedback_score{model, category}                   # Gauge (0-1)
llm_guardrail_violations{guardrail_type, severity}    # Counter
llm_hallucination_rate{model}                         # Gauge
llm_toxicity_score{model, category}                   # Gauge
llm_refusal_rate{model}                               # Gauge
```

### Pattern 3: Logging (Structured, Searchable)
Emit structured JSON logs for every LLM interaction:
```json
{
  "timestamp": "2026-05-31T10:00:00Z",
  "level": "info",
  "event": "llm_completion",
  "trace_id": "abc123",
  "span_id": "def456",
  "model": "gpt-4o",
  "system_fingerprint": "fp_abc",
  "prompt_truncated": true,
  "prompt_hash": "sha256:...",
  "response_hash": "sha256:...",
  "input_tokens": 450,
  "output_tokens": 120,
  "total_tokens": 570,
  "cost_usd": 0.00375,
  "latency_ms": 1234,
  "finish_reason": "stop",
  "user_id": "usr_abc",
  "session_id": "sess_xyz",
  "application": "chat-app",
  "environment": "prod"
}
```
Ship logs via OTel log exporter or stdin redirect to collector. Index by trace_id for full-context debugging. Hash prompt contents for deduplication without storing raw PII.

### Pattern 4: Alerting (Multi-Window, Multi-Burn-Rate)
Configure alerts with burn-rate approach using two windows (short and long):
```yaml
# Burn-rate alert for latency SLO
alert: HighLatencyBurnRate
expr: (
  rate(llm_request_duration_ms_count{model="gpt-4o"}[1m])  # short window
  /
  rate(llm_request_duration_ms_count{model="gpt-4o"}[1h])  # long window
) - 1 > 0.1
for: 2m
labels:
  severity: critical
  slo: latency_p95_2s
annotations:
  summary: "Latency burn rate {{ $value | humanizePercentage }} for gpt-4o"
```
Alert tiers:
- **P0**: Safety incident, data leakage, full outage → 5min response
- **P1**: Quality degradation >10%, cost spike >3x → 15min response
- **P2**: Latency regression, minor availability dip → 1h response
- **P3**: Budget warning, trend alert → next business day

### Pattern 5: Drift Detection
Monitor embedding drift between baseline and production windows:
- Compute mean embedding vector over baseline period (e.g., last 7 days)
- Compute mean over sliding window (e.g., last 1 hour)
- Track Euclidean / cosine distance between the two
- Alert when distance exceeds 3 standard deviations from historical norm
- Segment drift by model, prompt template, user segment

## Observability Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ LLM Call │  │  Chain   │  │   Tool   │  │Guardrail│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │             │       │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐ │
│  │           OpenTelemetry SDK (Traces + Metrics)     │ │
│  │           + Structured Logger (Logs)               │ │
│  └───────────────────────┬───────────────────────────┘ │
└──────────────────────────┼─────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────┐
│                  COLLECTOR LAYER                        │
│  ┌───────────────────────┴───────────────────────────┐ │
│  │           OpenTelemetry Collector                  │ │
│  │                                                    │ │
│  │  Receivers:    Processors:        Exporters:       │ │
│  │  ┌─────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ OTLP    │  │ batch        │  │ Tempo/Cortex │ │ │
│  │  │ Prometheus│ │ tail_sampling│  │ Loki         │ │ │
│  │  │ Filelog │  │ attributes   │  │ S3/GCS       │ │ │
│  │  └─────────┘  │ transform    │  │ Datadog      │ │ │
│  │               │ filter       │  └──────────────┘ │ │
│  │               │ k8s_atttributes                 │ │ │
│  │               └──────────────┘                   │ │
│  └───────────────────────────────────────────────────┘ │
└──────────────────────────┼─────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────┐
│                   STORAGE LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Traces     │  │   Metrics    │  │    Logs      │ │
│  │ (Tempo/     │  │ (Cortex/     │  │ (Loki/       │ │
│  │  Jaeger/    │  │  Mimir/      │  │  Elastic-    │ │
│  │  Datadog)   │  │  Datadog)    │  │  search)     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘ │
│         │               │               │          │
│  ┌──────┴───────────────┴───────────────┴───────┐  │
│  │         Object Store (S3/GCS) for            │  │
│  │         long-term trace archival             │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────┼─────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────┐
│                  DASHBOARD LAYER                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Grafana / Datadog / LangFuse Dashboard            │ │
│  │                                                    │ │
│  │  Row 1: Overview (RPS, active users, error rate)   │ │
│  │  Row 2: Latency (P50/P95/P99 heatmap by model)     │ │
│  │  Row 3: Cost (daily stack by model/category/user)  │ │
│  │  Row 4: Quality (feedback score, guardrails, drift) │ │
│  │  Row 5: Alerts (firing, silenced, acknowledged)     │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Pipeline Configuration Reference

**OpenTelemetry Collector config (tail-based sampling):**
```yaml
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
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    policies:
      - name: errors-policy
        type: status_code
        config: { status_code: ERROR }
      - name: slow-policy
        type: latency
        config: { threshold_ms: 5000 }
      - name: probabilistic-policy
        type: probabilistic
        config: { sampling_percentage: 10 }

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }
  prometheus:
    endpoint: 0.0.0.0:8889
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

## Code Examples

### Instrumenting LLM Calls with OpenTelemetry (Generic)
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
import openai

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

def tracked_llm_call(messages: list, model: str = "gpt-4o", user_id: str = None, session_id: str = None) -> str:
    with tracer.start_as_current_span("llm.completion") as span:
        span.set_attribute("gen_ai.system", "openai")
        span.set_attribute("gen_ai.request.model", model)
        span.set_attribute("gen_ai.request.max_tokens", 4096)
        span.set_attribute("gen_ai.request.temperature", 0.7)
        span.set_attribute("user_id", user_id or "anonymous")
        span.set_attribute("session_id", session_id or "unknown")

        response = openai.chat.completions.create(model=model, messages=messages)

        span.set_attribute("gen_ai.response.model", response.model)
        span.set_attribute("gen_ai.usage.prompt_tokens", response.usage.prompt_tokens)
        span.set_attribute("gen_ai.usage.completion_tokens", response.usage.completion_tokens)
        span.set_attribute("gen_ai.usage.total_tokens", response.usage.total_tokens)
        span.set_attribute("gen_ai.response.finish_reason", response.choices[0].finish_reason)

        if response.usage.completion_tokens > 0:
            span.set_attribute("gen_ai.response.latency_ms", response.response_ms)

        return response.choices[0].message.content
```

### LangFuse Integration (Observe Decorator)
```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse()

@observe(name="chat_agent", as_type="agent")
def chat_agent(query: str, user_id: str, session_id: str):
    langfuse_context.update_current_trace(
        user_id=user_id,
        session_id=session_id,
        metadata={"environment": "production", "app_version": "2.1.0"},
    )

    with langfuse_context.span(name="retrieve_context", type="retrieval") as span:
        docs = vector_store.similarity_search(query, k=5)
        span.update(input=query, output=[d.page_content for d in docs])
        langfuse_context.update_current_observation(
            usage={"input": len(query.split()), "output": sum(len(d.page_content.split()) for d in docs)}
        )

    with langfuse_context.generation(
        name="llm_response",
        model="gpt-4o",
        model_parameters={"temperature": 0.7, "max_tokens": 1000},
    ) as gen:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": build_system_prompt(docs)},
                {"role": "user", "content": query},
            ],
        )
        content = response.choices[0].message.content
        gen.update(
            input=query,
            output=content,
            usage={
                "input": response.usage.prompt_tokens,
                "output": response.usage.completion_tokens,
                "unit": "TOKENS",
            },
        )

    langfuse_context.score_current_trace(
        name="response_quality",
        value=compute_relevance(query, content),
    )

    return content
```

### LangSmith Integration (Decorator + Metadata)
```python
from langsmith import traceable
from langsmith.run_helpers import get_current_run
import os

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "my-app"

@traceable(run_type="chain", project_name="my-app")
def qa_chain(question: str, user_id: str) -> dict:
    run = get_current_run()
    run.add_metadata({
        "user_id": user_id,
        "session_id": f"session_{user_id}",
        "app_version": "2.1.0",
        "feature": "qa",
    })

    docs = retriever.get_relevant_documents(question)
    response = llm.invoke(format_prompt(question, docs))

    run.add_outputs({
        "output": response,
        "source_documents": [d.metadata["source"] for d in docs],
        "tokens": {"input": count_tokens(question), "output": count_tokens(response)},
    })

    return {"answer": response, "sources": [d.metadata["source"] for d in docs]}
```

### Custom Metrics Pipeline (Prometheus Client)
```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

llm_requests = Counter("llm_requests_total", "Total LLM requests", ["model", "status"])
llm_latency = Histogram(
    "llm_latency_ms", "LLM latency in ms", ["model"],
    buckets=[50, 100, 200, 500, 1000, 2000, 5000, 10000, 30000],
)
llm_tokens = Counter("llm_tokens_total", "Total tokens used", ["model", "direction"])
llm_cost = Counter("llm_cost_usd", "Total cost in USD", ["model", "team"])
active_users = Gauge("llm_active_users", "Current active users", ["tier"])

def instrumented_call(model: str, team: str, user_id: str):
    start = time.time()
    try:
        response = call_llm(model)
        latency = (time.time() - start) * 1000
        llm_requests.labels(model=model, status="success").inc()
        llm_latency.labels(model=model).observe(latency)
        llm_tokens.labels(model=model, direction="input").inc(response.usage.prompt_tokens)
        llm_tokens.labels(model=model, direction="output").inc(response.usage.completion_tokens)
        cost = calculate_cost(model, response.usage.prompt_tokens, response.usage.completion_tokens)
        llm_cost.labels(model=model, team=team).inc(cost)
        return response
    except Exception as e:
        llm_requests.labels(model=model, status="error").inc()
        raise

start_http_server(8000)  # Prometheus scrape endpoint
```

### Cost-Per-Trace Analytics
```python
class CostPerTraceAnalyzer:
    def __init__(self):
        self.pricing = {
            "gpt-4o": {"input": 0.0025, "output": 0.01},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "claude-3-5-sonnet-20241022": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
            "gemini-1.5-pro": {"input": 0.00125, "output": 0.005},
            "gemini-1.5-flash": {"input": 0.000075, "output": 0.0003},
        }

    def trace_cost(self, trace: dict) -> dict:
        total = 0.0
        breakdown = {}
        for span in trace.get("spans", []):
            if span.get("kind") == "LLM":
                model = span["attributes"].get("gen_ai.response.model", "unknown")
                prompt_tokens = span["attributes"].get("gen_ai.usage.prompt_tokens", 0)
                completion_tokens = span["attributes"].get("gen_ai.usage.completion_tokens", 0)
                price = self.pricing.get(model, {"input": 0, "output": 0})
                span_cost = (prompt_tokens * price["input"] / 1000) + (completion_tokens * price["output"] / 1000)
                total += span_cost
                breakdown[model] = breakdown.get(model, 0) + span_cost
        return {
            "trace_id": trace.get("trace_id"),
            "total_cost": round(total, 6),
            "breakdown": breakdown,
            "num_llm_calls": sum(1 for s in trace.get("spans", []) if s.get("kind") == "LLM"),
            "total_tokens": sum(
                s["attributes"].get("gen_ai.usage.total_tokens", 0)
                for s in trace.get("spans", []) if s.get("kind") == "LLM"
            ),
        }

    def cost_per_user(self, traces: list[dict]) -> dict:
        user_costs = {}
        for trace in traces:
            user_id = trace.get("metadata", {}).get("user_id", "unknown")
            cost = self.trace_cost(trace)
            if user_id not in user_costs:
                user_costs[user_id] = {"total_cost": 0.0, "trace_count": 0}
            user_costs[user_id]["total_cost"] += cost["total_cost"]
            user_costs[user_id]["trace_count"] += 1
        return user_costs
```

### Multi-Model Router Observability
```python
class RouterObservability:
    def __init__(self):
        self.model_metrics = {}

    def record_routing_decision(self, request: dict, selected_model: str, candidates: list[str], scores: list[float]):
        labels = {
            "selected_model": selected_model,
            "num_candidates": len(candidates),
            "score_spread": max(scores) - min(scores) if scores else 0,
            "request_type": request.get("type", "unknown"),
        }
        llm_router_decisions_total.labels(**labels).inc()
        llm_router_score_spread.labels(**labels).observe(labels["score_spread"])

    def model_comparison_report(self, model_a: str, model_b: str, window_hours: int = 24) -> dict:
        return {
            "model_a": model_a,
            "model_b": model_b,
            "latency_diff": self.compare_metric(model_a, model_b, "avg_latency", window_hours),
            "cost_diff": self.compare_metric(model_a, model_b, "avg_cost", window_hours),
            "feedback_diff": self.compare_metric(model_a, model_b, "avg_feedback", window_hours),
        }

    def compare_metric(self, a: str, b: str, metric: str, window: int):
        a_series = self.query_metric(f'llm_{metric}{{model="{a}"}}', window)
        b_series = self.query_metric(f'llm_{metric}{{model="{b}"}}', window)
        return {
            f"{a}_avg": statistics.mean(a_series) if a_series else 0,
            f"{b}_avg": statistics.mean(b_series) if b_series else 0,
            "ratio": statistics.mean(a_series) / max(statistics.mean(b_series), 0.001) if a_series and b_series else None,
        }
```

## Anti-Patterns

### Over-Instrumentation
**Problem**: Tracing every function call, logging every variable, emitting metrics at sub-function granularity. Results in 10x data costs, noise drowning out signals, and engineer time wasted on irrelevant dashboards.

**Solution**:
- Trace only external boundaries: LLM calls, tool invocations, retriever queries, guardrails.
- Do NOT trace individual math operations, string manipulations, or internal helpers.
- Log at `info` for LLM calls, `debug` for internal details (and only ship `info+` to production).
- Use one summary metric per domain, not one per code path.

### Alert Fatigue
**Problem**: 50+ alert rules firing constantly. Engineers ignore alerts, miss real incidents, and burn out.

**Solution**:
- Follow the burn-rate pattern: alert only when SLO burn rate exceeds threshold over multiple windows.
- Set `for: 5m` duration on all alerts to suppress transients.
- Use alert cooldown: minimum 10 minutes between repeat firings.
- Target <5 firing alerts per on-call shift. If more, consolidate or raise thresholds.
- Classify every alert: P0 (page), P1 (page if not acknowledged), P2 (ticket), P3 (dashboard).

### Metric Explosion
**Problem**: Cardinality explosion from high-cardinality labels (user_id, request_id, prompt_hash). Prometheus/Cortex crashes under label cardinality.

**Solution**:
- Never use user_id or request_id as Prometheus label values.
- Aggregate user-level metrics into buckets (tier, percentile band).
- Use exemplars to link metrics to traces for per-request debugging.
- Limit label value cardinality to <100 per label.
- Monitor total time series count and set alerts at 80% of quota.

### Ignoring Baseline Drift
**Problem**: Deploying alert thresholds once and never updating them. Traffic patterns change, models change, and thresholds become meaningless.

**Solution**:
- Recompute baselines weekly using rolling window averages.
- Use dynamic thresholds based on percentile of last 7 days of data.
- Alert on anomaly relative to baseline, not absolute value.

### Storing PII in Traces
**Problem**: Full prompts and responses containing PII, secrets, or internal data stored in observability backends indefinitely.

**Solution**:
- Hash prompt contents; store hash, not raw text, unless explicitly needed.
- Use the OTel attributes processor to redact sensitive fields before export.
- Set trace retention to match compliance requirements (30-90 days typical).
- Implement trace scrubbing pipeline that removes PII before archival.

## Production Considerations

### Cost of Observability
Observability is not free. Typical costs break down as:
```
Data ingestion + storage: $0.50 – $2.00 per million spans
Metric time-series: $0.01 – $0.05 per series per month
Log ingestion: $0.50 – $1.00 per GB ingested
Total observability cost: typically 5-15% of total LLM API spend
```

**Cost control strategies:**
- Sample traces at collector level (head-based for homogeneous traffic, tail-based for heterogeneous)
- Downsample metrics: aggregate raw metrics into 1m, 5m, 1h rollups; delete raw data after 7 days
- Only store `info+` logs for LLM calls; store `debug` logs locally with 24h retention
- Archive cold traces to object storage (S3/GCS) after 30 days; query requires restore
- Use probabilisitic sampling for high-volume endpoints (e.g., embedding calls)

### Data Retention Policy
```
┌─────────────────┬───────────────┬───────────────────┬──────────────┐
│ Data Class      │ Hot Retention │ Warm Retention   │ Cold Archive │
├─────────────────┼───────────────┼───────────────────┼──────────────┤
│ LLM traces      │ 7 days        │ 30 days           │ 1 year (S3)  │
│ Aggregated      │ 30 days       │ 12 months         │ 7 years      │
│ metrics         │               │                   │              │
│ Feedback events │ 90 days       │ 2 years           │ Indefinite   │
│ Guardrail logs  │ 30 days       │ 12 months         │ 3 years      │
│ Cost data       │ 90 days       │ 3 years           │ 7 years      │
│ Raw logs        │ 3 days        │ 14 days           │ 90 days      │
└─────────────────┴───────────────┴───────────────────┴──────────────┘
```

### Privacy & Compliance
- **PII in prompts**: Never log raw user prompts without explicit consent. Use prompt hashing or token-count-only mode.
- **Data residency**: Store observability data in same region as model inference. Use self-hosted LangFuse or OTel stack for GDPR compliance.
- **HIPAA / SOC 2**: Enable trace redaction for PHI fields. Use BAA-compatible observability providers.
- **Audit trail**: Log all access to trace data. Immutable audit log for compliance.
- **Consent**: Allow users to opt out of tracing. Delete traces on user deletion request (right to erasure).

### Multi-Model Observability Strategy
When using multiple LLM providers:
- Normalize model names to a canonical form across providers (e.g., `provider/model-name`).
- Tag every metric and trace with both `provider` and `resolved_model`.
- Route cost attribution by both model and provider for apples-to-apples comparison.
- Maintain per-provider latency baselines (Azure OpenAI vs direct OpenAI can differ by 2x).
- Build model comparison dashboards showing cost/latency/quality side by side.

### On-Call & Runbooks
- **Primary on-call**: Observability alerts for LLM applications → AI platform team
- **Escalation**: If root cause is in base model → escalate to provider support
- **Runbooks**:
  - High latency → check model provider status, fallback to alternate provider
  - Cost spike → identify top-cost user/model, investigate traffic source
  - Quality drop → check for prompt template changes, recent model version updates
  - Hallucination spike → roll back to previous prompt, verify with eval dataset
  - Trace data gap → verify OTel collector health, check sampler configuration

### Sampling Strategies
| Strategy | When | Pros | Cons |
|----------|------|------|------|
| Head-based (fixed %) | Homogeneous traffic | Simple, predictable cost | Misses rare errors |
| Tail-based (dynamic) | Heterogeneous traffic | Captures errors + slow traces | Complex, memory-intensive |
| Rate-limited | Budget-constrained | Bounds max cost | Non-deterministic |
| Adaptive | Unknown traffic patterns | Auto-adjusts to traffic | Harder to predict storage |

## Rules
- Never hardcode API keys — use environment variables or secret management.
- Trace every LLM call — 100% trace rate until 100K calls/day, then implement sampling.
- Tag every trace with user_id, session_id, environment, and application version.
- Set latency budgets before deployment — not after incidents.
- Cost attribution requires consistent tagging across all services.
- Guardrail metrics must be separated from application metrics.
- Feedback must be linkable to specific traces.
- Never store full prompts containing PII in observability backends.
- Use Prometheus exemplars to bridge metrics and traces for high-cardinality debugging.
- Set retention policies before first data ingestion — backfilling retention is expensive.
- Alert fatigue is a product problem, not an ops problem — fix thresholds when alerts spam.
- Monitor the observability pipeline itself (collector health, exporter errors, dropped spans).

## References
  - references/ai-observability-advanced.md — Production observability architecture, drift, cost-per-trace
  - references/ai-observability-fundamentals.md — AI observability essentials, pillars, instrumentation
  - references/cost-tracking.md — Per-model pricing, budget enforcement, anomaly detection
  - references/dashboard-alerting.md — Dashboard design, Prometheus alerts, incident response
  - references/feedback-collection.md — Explicit/implicit feedback, annotation pipelines
  - references/llm-monitoring.md — Token tracking, latency budgets, guardrail monitoring
  - references/llm-tracing.md — LangSmith, LangFuse, Arize Phoenix tracing patterns
  - references/observability-incident-response.md — Severity levels, playbooks, post-mortems
  - references/observability-metrics.md — Latency, quality, drift, custom metrics collection
  - references/observability-tooling-comparison.md — Platform comparison matrix, selection guide
  - references/observability-pipeline-architecture.md — End-to-end pipeline from agent to dashboard
  - references/privacy-data-governance.md — PII redaction, retention, compliance in AI obs

## Handoff
For LangChain-specific observability, hand off to `ai-langchain-patterns`. For MCP server observability, hand off to `ai-mcp-patterns`. For model evaluation workflows, hand off to `ai-model-evaluation`. For agent tracing and monitoring, hand off to `ai-agent-patterns`.
