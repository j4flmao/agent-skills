# AI Observability Fundamentals

## Overview

AI observability is the practice of monitoring, understanding, and debugging AI systems (particularly LLM-powered applications) through traces, metrics, logs, and feedback signals. Unlike traditional software observability, AI observability must account for non-deterministic outputs, token-based cost models, prompt sensitivity, and quality dimensions unique to generative AI.

This reference covers the essential concepts, pillars, challenges, and basic instrumentation techniques for AI observability.

## What is AI Observability?

AI observability extends traditional observability (logs, metrics, traces) with AI-specific concerns:

| Traditional Observability | AI Observability |
|---------------------------|------------------|
| Deterministic outputs | Non-deterministic, probabilistic outputs |
| Cost per request fixed | Cost varies by token count per request |
| Errors are binary (pass/fail) | Quality is a spectrum (relevance, safety, accuracy) |
| Latency is uniform | Latency varies by input length, model, provider |
| No drift concerns | Model drift, prompt drift, embedding drift |
| User feedback optional | Feedback essential for quality measurement |
| Simple attribution | Multi-model, multi-provider cost attribution |

### Why AI Observability Matters

- **Cost management**: LLM costs scale with usage — without tracking, bills surprise teams.
- **Quality assurance**: Non-deterministic outputs require continuous quality monitoring.
- **Safety & compliance**: Guardrail violations, toxic outputs, and PII leaks must be detected immediately.
- **Performance debugging**: TTFT, token generation rate, and provider-level latency vary widely.
- **Model comparison**: Data-driven decisions for model selection, prompt tuning, and provider switching.

## Three Pillars of AI Observability

### Pillar 1: Traces

Traces capture the end-to-end execution path of a single request. For AI systems, a trace typically contains:

```
Trace (user request)
├── Span: Guardrail check (input)
│   ├── Attributes: {guardrail_type, passed, latency_ms}
├── Span: Retriever query
│   ├── Attributes: {top_k, result_count, avg_score}
├── Span: LLM call
│   ├── Attributes: {model, prompt_tokens, completion_tokens, temperature, latency_ms}
├── Span: Tool call (if agent)
│   ├── Attributes: {tool_name, success, result_size}
├── Span: Guardrail check (output)
│   ├── Attributes: {guardrail_type, passed, latency_ms}
└── Span: Response formatting
```

Every span carries attributes (key-value metadata) and status (OK/ERROR). Traces are collected via OpenTelemetry SDK, LangChain callbacks, or platform-specific SDKs (LangFuse, LangSmith).

**Key tracing attributes for LLM spans (OpenTelemetry semantic conventions):**

| Attribute | Example | Purpose |
|-----------|---------|---------|
| `gen_ai.system` | `"openai"` | Provider identifier |
| `gen_ai.request.model` | `"gpt-4o"` | Requested model |
| `gen_ai.response.model` | `"gpt-4o-2024-08-06"` | Resolved model version |
| `gen_ai.usage.prompt_tokens` | `450` | Input token count |
| `gen_ai.usage.completion_tokens` | `120` | Output token count |
| `gen_ai.usage.total_tokens` | `570` | Sum of input and output |
| `gen_ai.response.finish_reason` | `"stop"` | Why generation ended |
| `gen_ai.response.id` | `"chatcmpl-abc"` | Provider response ID |

### Pillar 2: Metrics

Metrics are numeric aggregations collected over time windows. For AI systems, the essential metrics are:

**Volume metrics:**
- Requests per second (by model, endpoint, status)
- Active users (unique user count in time window)
- Token throughput (tokens/second by model)
- Concurrent requests (by model)

**Performance metrics:**
- Latency: P50/P95/P99 (by model, operation)
- TTFT: Time to first token (by model, provider)
- Token generation rate: Tokens/second (by model)
- Queue time: Time spent in request queue

**Cost metrics:**
- Cost per time unit (hourly/daily by model, team)
- Cost per query (by model, feature)
- Budget remaining percentage (by period)
- Cost per user (by tier, team)

**Quality metrics:**
- Feedback score (average rating by model, category)
- Hallucination rate (fraction of responses with factual errors)
- Guardrail violation rate (by guardrail type, severity)
- Toxicity score (by content category)
- Refusal rate (fraction of legitimate requests refused)

### Pillar 3: Logs

Structured logs capture every LLM interaction with searchable fields. Each LLM call produces a log entry:

```json
{
  "timestamp": "2026-05-31T10:00:00.123Z",
  "level": "info",
  "service": "chat-api",
  "trace_id": "tr_abc123def456",
  "span_id": "sp_789012",
  "event": "llm_completion",
  "model": "gpt-4o",
  "provider": "openai",
  "temperature": 0.7,
  "max_tokens": 2048,
  "input_tokens": 342,
  "output_tokens": 89,
  "total_tokens": 431,
  "cost": 0.00231,
  "latency_ms": 1450,
  "finish_reason": "stop",
  "status": "success",
  "user_id": "usr_abc123",
  "session_id": "sess_def456",
  "prompt_hash": "sha256:a1b2c3...",
  "response_hash": "sha256:d4e5f6...",
  "guardrail_passed": true
}
```

Logs are shipped to a centralized store (Elasticsearch, Loki, CloudWatch) and indexed by trace_id, user_id, model, and timestamp.

## LLM-Specific Observability Challenges

### Challenge 1: Non-Determinism
The same prompt can produce different outputs on each call. This means:
- Error detection must use statistical baselines, not exact matches.
- Quality regression detection requires aggregation over windows (100+ calls).
- A/B comparisons between models need statistical significance testing.

### Challenge 2: Token-Based Cost Model
Cost is proportional to token count, which varies per request:
- Longer prompts cost more — monitor prompt length trends.
- Models charge different rates for input vs output tokens.
- System prompts and few-shot examples contribute to every call's cost.
- Multi-turn conversations accumulate cost across turns.

### Challenge 3: Latency Variability
LLM latency is not uniform:
- TTFT can range from 200ms to 5s+ depending on provider and load.
- Total generation time scales with output token count.
- Different providers have different response time distributions.
- Streaming vs non-streaming changes the latency profile entirely.

### Challenge 4: Quality at Scale
Measuring quality in production requires:
- User feedback collection (thumbs, stars, comments).
- Automated quality evaluation (LLM-as-judge, semantic similarity).
- Anomaly detection for sudden quality drops.
- Guardrail pass/fail tracking for safety monitoring.

### Challenge 5: Multi-Model Complexity
Organizations often use multiple models and providers:
- Each model has different pricing, latency, and quality profiles.
- Routing decisions (which model handles which request) need tracking.
- Provider outages require fallback strategy observability.
- Cross-provider cost comparison requires normalized metrics.

## Basic Instrumentation

### Step 1: Choose an Approach

| Approach | Effort | Flexibility | Best For |
|----------|--------|-------------|----------|
| Platform SDK (LangFuse, LangSmith) | Low | Medium | Quick setup, LangChain projects |
| OpenTelemetry SDK | Medium | High | Custom stacks, multi-cloud |
| API Proxy (Helicone) | Very Low | Low | No-code, quick wins |
| Custom (Prometheus + logging) | High | Very High | Full control, maximum flexibility |

### Step 2: Instrument a Single LLM Call

**OpenTelemetry approach:**
```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def call_llm(prompt: str, model: str = "gpt-4o"):
    with tracer.start_as_current_span("llm.completion") as span:
        span.set_attribute("gen_ai.system", "openai")
        span.set_attribute("gen_ai.request.model", model)
        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
        span.set_attribute("gen_ai.usage.prompt_tokens", response.usage.prompt_tokens)
        span.set_attribute("gen_ai.usage.completion_tokens", response.usage.completion_tokens)
        span.set_attribute("gen_ai.response.model", response.model)
        return response.choices[0].message.content
```

**LangFuse approach:**
```python
from langfuse import Langfuse
from langfuse.decorators import observe

langfuse = Langfuse()

@observe(name="llm_call", as_type="generation")
def call_llm(prompt: str, model: str = "gpt-4o"):
    response = openai_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    langfuse_context.update_current_observation(
        usage={
            "input": response.usage.prompt_tokens,
            "output": response.usage.completion_tokens,
            "unit": "TOKENS",
        },
        model=model,
    )
    return response.choices[0].message.content
```

**LangSmith approach:**
```python
from langsmith import traceable

@traceable(run_type="llm", project_name="my-app")
def call_llm(prompt: str, model: str = "gpt-4o"):
    response = openai_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return {
        "content": response.choices[0].message.content,
        "token_usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        },
    }
```

### Step 3: Add Metadata

Every traced call should carry:
```python
metadata = {
    "user_id": "usr_abc123",
    "session_id": "sess_def456",
    "environment": "production",
    "app_version": "2.1.0",
    "feature": "chat",
    "user_tier": "premium",
}
```

### Step 4: Expose Metrics via Prometheus

```python
from prometheus_client import Counter, Histogram, start_http_server

llm_requests = Counter("llm_requests_total", "Total LLM requests", ["model", "status"])
llm_latency = Histogram("llm_latency_ms", "LLM latency", ["model"],
                        buckets=[100, 250, 500, 1000, 2000, 5000, 10000])

def tracked_call(prompt: str, model: str):
    start = time.time()
    try:
        result = call_llm(prompt, model)
        llm_requests.labels(model=model, status="success").inc()
        llm_latency.labels(model=model).observe((time.time() - start) * 1000)
        return result
    except Exception:
        llm_requests.labels(model=model, status="error").inc()
        raise

start_http_server(8000)
```

## Key Points

- AI observability extends traditional observability with LLM-specific dimensions: tokens, cost, model, quality, drift.
- The three pillars (traces, metrics, logs) all apply but must be augmented with AI-specific attributes.
- Trace every LLM call with provider, model, token counts, latency, and user metadata.
- Metrics must cover volume, performance, cost, and quality — each with model-level breakdown.
- Log LLM interactions as structured JSON with trace_id for correlation.
- Non-deterministic outputs require statistical baselines and windowed aggregation.
- Start with one instrumented LLM call, then expand to cover chains, tools, and guardrails.
- Always add user_id and session_id metadata for attribution and debugging.
- Expose latency and request count as Prometheus-style metrics from day one.
- Hash prompt contents to enable deduplication without storing raw PII.
