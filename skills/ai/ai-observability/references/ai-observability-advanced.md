# AI Observability Advanced

## Overview

This reference covers production-grade AI observability architecture, custom metric pipelines, drift detection, cost-per-trace analytics, multi-model observability, and advanced sampling strategies. It assumes familiarity with the fundamentals (tracing, metrics, logs) and focuses on scaling, reliability, and depth.

## Production Observability Architecture

### Architecture: Multi-Collector Pipeline

For production deployments serving 100K+ daily LLM calls, a single collector is insufficient. Use a layered collector topology:

```
Edge Collectors (per region / per cluster)
├── Lightweight, sidecar or DaemonSet
├── Tail-based sampling decisions
├── Local buffering (disk-backed queue)
└── Thin preprocessing (attribute redaction, PII scrubbing)

    ↓ OTLP (gRPC)

Aggregation Collectors
├── Deduplicate spans across edges
├── Compute summary metrics from trace data
├── Enrich with deployment metadata
└── Route to appropriate backends

    ↓ OTLP (gRPC, compressed)

Backend Gateways
├── Tempo / Mimir / Loki cluster
├── Datadog / Honeycomb / Grafana Cloud
└── S3/GCS cold storage via Tee exporter
```

### Collector Tuning

```yaml
# Production collector configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
        max_concurrent_streams: 1000
      http:
        endpoint: 0.0.0.0:4318
        max_request_body_size_mib: 16

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
  batch:
    timeout: 1s
    send_batch_size: 8192
    send_batch_max_size: 10000
  attributes:
    actions:
      - key: prompt_content
        action: delete
      - key: response_content
        action: hash
      - key: user_email
        action: delete
      - key: api_key
        action: delete
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    expected_new_traces_per_sec: 500
    policies:
      - name: error
        type: status_code
        config: { status_code: ERROR }
      - name: slow
        type: latency
        config: { threshold_ms: 5000 }
      - name: high_cost
        type: and
        config:
          and_sub_policy:
            - name: model_is_expensive
              type: string_attribute
              config:
                key: gen_ai.request.model
                values: [gpt-4o, claude-3-5-sonnet-20241022]
            - name: high_token_usage
              type: numeric_attribute
              config:
                key: gen_ai.usage.total_tokens
                min_value: 4000
      - name: probabilistic
        type: probabilistic
        config: { sampling_percentage: 10 }

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: false }
    compression: gzip
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
  otlp/s3:
    endpoint: s3-bucket-endpoint:4317
    tls: { insecure: false }

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes, tail_sampling, batch]
      exporters: [otlp/tempo, otlp/s3]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/prometheus]
```

### Health Monitoring for the Pipeline

Monitor the observability pipeline itself with dedicated metrics:
```
otelcol_exporter_send_failed_spans  # Spans that failed to export
otelcol_processor_dropped_spans     # Spans dropped by sampling/limiting
otelcol_receiver_accepted_spans     # Total spans ingested
otelcol_queue_size                  # Current queue depth
otelcol_process_runtime_total_sys_memory_bytes  # Collector memory usage
```

Alert thresholds:
- Dropped span rate > 1% → collector is overloaded, scale up
- Queue size > 80% of capacity → consumer lagging, add exporters
- Exporter error rate > 0.1% → backend unavailable, check connectivity
- Collector memory > 80% → reduce batch sizes or add memory limit
- Collector CPU > 70% → reduce sampling rate or add more collectors

## Custom Metric Pipelines

### Deriving Metrics from Traces

For platforms that don't natively expose LLM metrics, compute them from trace data using a metrics derivation pipeline:

```python
class TraceToMetrics:
    def compute_metrics(self, spans: list[dict], window_minutes: int = 5) -> dict:
        metrics = {
            "request_count": 0,
            "error_count": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "latency_values": [],
            "model_counts": {},
        }
        for span in spans:
            if span.get("kind") != "LLM":
                continue
            attrs = span.get("attributes", {})
            metrics["request_count"] += 1
            if span.get("status", {}).get("code") == "ERROR":
                metrics["error_count"] += 1
            prompt_tokens = attrs.get("gen_ai.usage.prompt_tokens", 0)
            completion_tokens = attrs.get("gen_ai.usage.completion_tokens", 0)
            metrics["total_tokens"] += prompt_tokens + completion_tokens
            metrics["latency_values"].append(span.get("end_time", 0) - span.get("start_time", 0))
            model = attrs.get("gen_ai.request.model", "unknown")
            metrics["model_counts"][model] = metrics["model_counts"].get(model, 0) + 1
        return metrics

    def to_prometheus(self, metrics: dict, labels: dict):
        for model, count in metrics["model_counts"].items():
            llm_requests_total.labels(**labels, model=model, status="success").inc(count)
        if metrics["latency_values"]:
            for v in metrics["latency_values"]:
                llm_latency_ms.labels(**labels).observe(v * 1000)
```

### Statds/StatsD Sidecar Pattern

For high-throughput environments, emit metrics via statsd from the application and aggregate in a sidecar:

```python
import statsd

c = statsd.StatsClient("localhost", 8125, prefix="llm")

def instrumented_llm_call(model: str, prompt: str):
    start = time.time()
    try:
        response = call_llm(model, prompt)
        latency = (time.time() - start) * 1000
        c.timing("latency", latency, tags={"model": model})
        c.incr("requests.success", tags={"model": model})
        c.gauge("tokens.total", response.usage.total_tokens, tags={"model": model})
        cost = calculate_cost(model, response.usage.prompt_tokens, response.usage.completion_tokens)
        c.gauge("cost", cost * 1000000, tags={"model": model})  # microdollars
        return response
    except Exception:
        c.incr("requests.error", tags={"model": model})
        raise
```

### Aggregating Metrics by Time Bucket

```python
class BucketedMetricsAggregator:
    def __init__(self, bucket_minutes: int = 5):
        self.bucket_minutes = bucket_minutes
        self.buckets = {}

    def _bucket_key(self, timestamp: float) -> str:
        bucket_start = int(timestamp) // (self.bucket_minutes * 60) * (self.bucket_minutes * 60)
        return datetime.fromtimestamp(bucket_start).isoformat()

    def record(self, model: str, tokens: int, cost: float, latency_ms: float, status: str, timestamp: float = None):
        ts = timestamp or time.time()
        key = self._bucket_key(ts)
        if key not in self.buckets:
            self.buckets[key] = {}
        if model not in self.buckets[key]:
            self.buckets[key][model] = {
                "calls": 0, "errors": 0, "total_tokens": 0, "total_cost": 0.0, "latencies": [],
            }
        b = self.buckets[key][model]
        b["calls"] += 1
        if status == "error":
            b["errors"] += 1
        b["total_tokens"] += tokens
        b["total_cost"] += cost
        b["latencies"].append(latency_ms)

    def flush_bucket(self, bucket_key: str) -> dict:
        bucket = self.buckets.pop(bucket_key, {})
        result = {}
        for model, data in bucket.items():
            latencies = data["latencies"]
            latencies.sort()
            n = len(latencies)
            result[model] = {
                "calls": data["calls"],
                "error_rate": data["errors"] / max(data["calls"], 1),
                "total_cost": round(data["total_cost"], 4),
                "avg_tokens": data["total_tokens"] // max(data["calls"], 1),
                "avg_latency_ms": sum(latencies) / max(n, 1),
                "p50_ms": latencies[n // 2] if n else 0,
                "p95_ms": latencies[int(n * 0.95)] if n else 0,
                "p99_ms": latencies[int(n * 0.99)] if n else 0,
            }
        return result
```

## Drift Detection

### Types of Drift in AI Systems

| Drift Type | What Changes | Detection Method | Response |
|------------|-------------|------------------|----------|
| Model drift | Underlying model behavior changes | Embedding distribution shift | Rollback to previous model version |
| Prompt drift | Prompt template changes affect outputs | Output distribution shift | Revert prompt, A/B test |
| Data drift | User input distribution changes | Input embedding drift | Retrain or adjust prompt |
| Concept drift | Desired output definition changes | Feedback score trend | Update evaluation criteria |
| Cost drift | Token usage patterns change | Cost-per-query trend | Investigate traffic source |
| Latency drift | Response time distribution shifts | Latency percentile trend | Check provider, fallback |

### Embedding-Based Drift Detection

```python
import numpy as np
from typing import Optional
from datetime import datetime, timedelta

class EmbeddingDriftDetector:
    def __init__(self, embedding_dim: int, threshold: float = 0.15, window_size: int = 1000):
        self.baseline: Optional[np.ndarray] = None
        self.baseline_size = 0
        self.window = []
        self.window_size = window_size
        self.threshold = threshold
        self.embedding_dim = embedding_dim
        self.drift_history = []

    def set_baseline(self, embeddings: list[np.ndarray]):
        self.baseline = np.mean(embeddings, axis=0)
        self.baseline_size = len(embeddings)

    def add_sample(self, embedding: np.ndarray, metadata: dict = None) -> Optional[dict]:
        self.window.append((embedding, metadata or {}, time.time()))
        if len(self.window) >= self.window_size:
            return self._detect()
        return None

    def _detect(self) -> Optional[dict]:
        if self.baseline is None:
            self.set_baseline([e for e, _, _ in self.window])
            self.window = []
            return None

        window_embeddings = np.array([e for e, _, _ in self.window])
        window_mean = np.mean(window_embeddings, axis=0)
        window_std = np.std(window_embeddings, axis=0)
        drift_score = float(np.linalg.norm(window_mean - self.baseline))

        per_dim_drift = np.abs(window_mean - self.baseline)
        top_drift_dims = np.argsort(per_dim_drift)[-10:]

        result = {
            "drift_score": drift_score,
            "threshold": self.threshold,
            "drifted": drift_score > self.threshold,
            "baseline_samples": self.baseline_size,
            "window_samples": len(self.window),
            "top_drifting_dimensions": top_drift_dims.tolist(),
            "window_std_mean": float(np.mean(window_std)),
            "timestamp": datetime.utcnow().isoformat(),
            "severity": "critical" if drift_score > self.threshold * 1.5 else (
                "warning" if drift_score > self.threshold else "info"
            ),
        }

        self.drift_history.append(result)
        self.window = []
        return result

    def get_drift_trend(self, hours: int = 168) -> list[dict]:
        cutoff = time.time() - hours * 3600
        return [d for d in self.drift_history if d["timestamp"] >= cutoff]
```

### Statistical Drift Detection (KL Divergence)

```python
class KLDivergenceDetector:
    def detect(self, baseline_distribution: dict, current_distribution: dict) -> float:
        all_keys = set(baseline_distribution.keys()) | set(current_distribution.keys())
        kl_div = 0.0
        for key in all_keys:
            p = baseline_distribution.get(key, 1e-10)
            q = current_distribution.get(key, 1e-10)
            kl_div += p * np.log(p / q)
        return kl_div

    def detect_token_distribution_drift(self, history: list[dict], window: int = 1000) -> dict:
        recent = history[-window:]
        baseline = history[:-window] if len(history) > window else history

        def to_distribution(data):
            total = sum(d.get("total_tokens", 0) for d in data) or 1
            dist = {}
            for d in data:
                model = d.get("model", "unknown")
                tokens = d.get("total_tokens", 0)
                dist[model] = dist.get(model, 0) + tokens / total
            return dist

        kl = self.detect(to_distribution(baseline), to_distribution(recent))
        return {
            "kl_divergence": kl,
            "drifted": kl > 0.1,
            "severity": "critical" if kl > 0.5 else ("warning" if kl > 0.1 else "normal"),
            "window_size": window,
        }
```

## Cost-Per-Trace Analytics

### Trace-Level Cost Breakdown

Understanding cost at the individual trace level enables per-feature, per-user, and per-experiment cost attribution.

```python
class TraceCostAnalyzer:
    PRICING = {
        "gpt-4o":               {"input": 0.00250, "output": 0.01000},
        "gpt-4o-mini":          {"input": 0.00015, "output": 0.00060},
        "gpt-4-turbo":          {"input": 0.01000, "output": 0.03000},
        "claude-3-5-sonnet-20241022": {"input": 0.00300, "output": 0.01500},
        "claude-3-haiku-20240307":    {"input": 0.00025, "output": 0.00125},
        "claude-opus":          {"input": 0.01500, "output": 0.07500},
        "gemini-1.5-pro":       {"input": 0.00125, "output": 0.00500},
        "gemini-1.5-flash":     {"input": 0.000075, "output": 0.00030},
    }

    def trace_cost_deep(self, trace: dict) -> dict:
        total_cost = 0.0
        per_model = {}
        per_step = []
        for span in trace.get("spans", []):
            attrs = span.get("attributes", {})
            model = attrs.get("gen_ai.response.model") or attrs.get("gen_ai.request.model", "unknown")
            prompt_tokens = attrs.get("gen_ai.usage.prompt_tokens", 0)
            completion_tokens = attrs.get("gen_ai.usage.completion_tokens", 0)
            price = self.PRICING.get(model, {"input": 0.001, "output": 0.002})
            cost = (prompt_tokens * price["input"] / 1000) + (completion_tokens * price["output"] / 1000)
            total_cost += cost
            per_model[model] = per_model.get(model, 0) + cost
            per_step.append({
                "span_name": span.get("name", "unknown"),
                "model": model,
                "input_tokens": prompt_tokens,
                "output_tokens": completion_tokens,
                "cost": round(cost, 6),
                "latency_ms": (span.get("end_time", 0) - span.get("start_time", 0)) * 1000,
            })

        return {
            "trace_id": trace.get("trace_id"),
            "total_cost": round(total_cost, 6),
            "num_llm_calls": len(per_step),
            "per_model": per_model,
            "per_step": per_step,
            "feature": trace.get("metadata", {}).get("feature"),
            "user_id": trace.get("metadata", {}).get("user_id"),
        }
```

### Cost Attribution by Dimension

```python
class CostAttributionReport:
    def __init__(self, traces: list[dict]):
        self.traces = traces
        self.analyzer = TraceCostAnalyzer()

    def by_user(self) -> list[dict]:
        user_costs = {}
        for trace in self.traces:
            cost = self.analyzer.trace_cost_deep(trace)
            uid = cost["user_id"] or "anonymous"
            if uid not in user_costs:
                user_costs[uid] = {"total": 0.0, "calls": 0, "models": {}}
            user_costs[uid]["total"] += cost["total_cost"]
            user_costs[uid]["calls"] += cost["num_llm_calls"]
            for model, model_cost in cost["per_model"].items():
                user_costs[uid]["models"][model] = user_costs[uid]["models"].get(model, 0) + model_cost
        return sorted(
            [{"user_id": k, **v} for k, v in user_costs.items()],
            key=lambda x: -x["total"],
        )

    def by_feature(self) -> list[dict]:
        feature_costs = {}
        for trace in self.traces:
            cost = self.analyzer.trace_cost_deep(trace)
            feature = cost["feature"] or "unclassified"
            if feature not in feature_costs:
                feature_costs[feature] = {"total": 0.0, "calls": 0}
            feature_costs[feature]["total"] += cost["total_cost"]
            feature_costs[feature]["calls"] += cost["num_llm_calls"]
        return sorted(
            [{"feature": k, **v} for k, v in feature_costs.items()],
            key=lambda x: -x["total"],
        )

    def by_hour(self, days: int = 7) -> list[dict]:
        hourly = {}
        for trace in self.traces:
            cost = self.analyzer.trace_cost_deep(trace)
            ts = trace.get("start_time", 0)
            hour_key = datetime.fromtimestamp(ts).strftime("%Y-%m-%dT%H:00:00")
            if hour_key not in hourly:
                hourly[hour_key] = 0.0
            hourly[hour_key] += cost["total_cost"]
        return sorted(
            [{"hour": k, "cost": round(v, 4)} for k, v in hourly.items()],
            key=lambda x: x["hour"],
        )

    def summary(self) -> dict:
        total_cost = sum(self.analyzer.trace_cost_deep(t)["total_cost"] for t in self.traces)
        total_calls = sum(len([s for s in t.get("spans", []) if s.get("kind") == "LLM"]) for t in self.traces)
        models = {}
        for t in self.traces:
            cost = self.analyzer.trace_cost_deep(t)
            for m, c in cost["per_model"].items():
                models[m] = models.get(m, 0) + c
        return {
            "total_cost": round(total_cost, 2),
            "total_llm_calls": total_calls,
            "cost_per_call": round(total_cost / max(total_calls, 1), 4),
            "cost_by_model": {m: round(c, 2) for m, c in sorted(models.items(), key=lambda x: -x[1])},
            "num_traces": len(self.traces),
        }
```

## Multi-Model Observability

### Unified Metrics Schema

When using multiple models and providers, normalize all metric labels to a common schema:

```python
NORMALIZED_LABELS = {
    "service": "my-app",         # Always set
    "provider": "openai",        # Provider name
    "model": "gpt-4o",           # Canonical model name
    "deployment": "prod-us",     # Deployment identifier
    "team": "platform",          # Cost center
    "feature": "chat",           # Feature or use case
    "environment": "production", # Deployment environment
}
```

### Provider-Specific Metrics

Each provider may expose different metrics. Normalize into a common format:

```python
class ProviderMetricNormalizer:
    def normalize_openai(self, response) -> dict:
        return {
            "provider": "openai",
            "model": response.model,
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
            "latency_ms": response.response_ms,
            "finish_reason": response.choices[0].finish_reason,
            "system_fingerprint": response.system_fingerprint,
        }

    def normalize_anthropic(self, response) -> dict:
        return {
            "provider": "anthropic",
            "model": response.model,
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            "latency_ms": None,  # Anthropic doesn't expose this directly
            "finish_reason": response.stop_reason,
            "system_fingerprint": None,
        }

    def normalize_google(self, response) -> dict:
        return {
            "provider": "google",
            "model": response._model,
            "prompt_tokens": response.usage_metadata.prompt_token_count,
            "completion_tokens": response.usage_metadata.candidates_token_count,
            "total_tokens": response.usage_metadata.total_token_count,
            "latency_ms": None,
            "finish_reason": response.candidates[0].finish_reason.name,
            "system_fingerprint": None,
        }
```

### Cross-Provider Comparison Dashboard

```python
class CrossProviderComparison:
    def compare(self, traces: list[dict], window: str = "24h") -> dict:
        models = {}
        for trace in traces:
            for span in trace.get("spans", []):
                attrs = span.get("attributes", {})
                model = attrs.get("gen_ai.response.model") or attrs.get("gen_ai.request.model", "unknown")
                provider = attrs.get("gen_ai.system", "unknown")
                if model not in models:
                    models[model] = {"provider": provider, "calls": 0, "latencies": [], "costs": [], "tokens": [], "errors": 0}
                m = models[model]
                m["calls"] += 1
                m["latencies"].append(attrs.get("gen_ai.response.latency_ms", 0))
                m["tokens"].append(attrs.get("gen_ai.usage.total_tokens", 0))
                if span.get("status", {}).get("code") == "ERROR":
                    m["errors"] += 1

        comparison = {}
        for model, data in models.items():
            lat = sorted(data["latencies"])
            n = len(lat)
            comparison[model] = {
                "provider": data["provider"],
                "calls": data["calls"],
                "error_rate": round(data["errors"] / max(data["calls"], 1) * 100, 2),
                "avg_latency_ms": round(sum(lat) / max(n, 1), 1),
                "p50_latency_ms": round(lat[n // 2], 1) if n else 0,
                "p95_latency_ms": round(lat[int(n * 0.95)], 1) if n else 0,
                "avg_tokens": round(sum(data["tokens"]) / max(n, 1), 0),
            }
        return comparison
```

### Router Observability

For systems that route requests between models:

```python
class RouterMetrics:
    def __init__(self):
        self.decisions = []

    def record_decision(self, request_type: str, selected: str, candidates: list[str], scores: list[float]):
        self.decisions.append({
            "timestamp": time.time(),
            "request_type": request_type,
            "selected": selected,
            "candidates": candidates,
            "scores": scores,
            "score_spread": max(scores) - min(scores) if scores else 0,
        })
        llm_router_decisions.labels(
            selected_model=selected,
            request_type=request_type,
        ).inc()

    def router_performance(self, hours: int = 24) -> dict:
        cutoff = time.time() - hours * 3600
        recent = [d for d in self.decisions if d["timestamp"] >= cutoff]
        if not recent:
            return {}
        model_counts = {}
        for d in recent:
            model_counts[d["selected"]] = model_counts.get(d["selected"], 0) + 1
        return {
            "total_decisions": len(recent),
            "model_distribution": model_counts,
            "avg_score_spread": sum(d["score_spread"] for d in recent) / len(recent),
        }
```

## Key Points

- Production observability requires layered collector architecture with tail-based sampling and PII redaction.
- Monitor the observability pipeline itself — dropped spans, queue depth, exporter errors.
- Derive metrics from traces for platforms without built-in metric exports.
- Use statsd/stadshaper sidecar patterns for high-throughput metric emission.
- Implement embedding-based drift detection with sliding windows and statistical thresholds.
- Compute cost-per-trace to attribute spending to specific features, users, and models.
- Normalize provider-specific metrics into a unified schema for cross-provider comparison.
- Track router decisions to understand model selection patterns and routing efficiency.
- Use bucketed aggregation for efficient metrics rollup and alerting.
- Archive cold traces to object storage, compute summaries before archiving.
- Implement cost-per-trace analytics to identify expensive users or features early.
- Multi-model setups require per-provider latency baselines and cost normalization.
- Alert on drift scores, cost anomalies, and latency regressions at the model level.
- Rotate baselines weekly to adapt to evolving traffic and model behavior.
