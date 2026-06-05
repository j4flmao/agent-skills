# OpenTelemetry Agent Integration

## Overview

OpenTelemetry (OTel) provides a vendor-neutral observability framework for instrumenting
agent systems. This reference covers the complete integration pattern: creating spans for
each agent step, propagating trace context across boundaries, attaching LLM-specific
attributes, collecting token/latency/cost metrics, and configuring exporters for
production workloads.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Runtime                            │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ LLM Call │  │ Tool Use │  │ Decision │  │ Output   │       │
│  │  Span    │  │  Span    │  │  Span    │  │  Span    │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────────────┴──────────────┴──────────────┘             │
│                          │                                       │
│               ┌──────────▼──────────┐                           │
│               │   OTel SDK Layer     │                           │
│               │  - TracerProvider    │                           │
│               │  - MeterProvider     │                           │
│               │  - LoggerProvider    │                           │
│               └──────────┬──────────┘                           │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌────▼────┐
        │  Jaeger  │ │Prometheus│ │ OTLP    │
        │ Exporter │ │ Exporter │ │Exporter │
        └──────────┘ └──────────┘ └─────────┘
```

---

## 2. SDK Setup and Configuration

### 2.1 Python — Full Provider Setup

```python
"""
otel_setup.py — Initialize OpenTelemetry for agent observability.
"""
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    ConsoleSpanExporter,
)
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import (
    PeriodicExportingMetricReader,
    ConsoleMetricExporter,
)
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
import os


def setup_otel(
    service_name: str = "agent-service",
    otlp_endpoint: str = "http://localhost:4317",
    sampling_rate: float = 1.0,
    console_export: bool = False,
) -> tuple[trace.Tracer, metrics.Meter]:
    """
    Initialize OpenTelemetry tracing and metrics for an agent service.

    Args:
        service_name: Name of the agent service for resource identification.
        otlp_endpoint: gRPC endpoint for OTLP collector.
        sampling_rate: Fraction of traces to sample (0.0 - 1.0).
        console_export: Also export spans/metrics to console for debugging.

    Returns:
        Tuple of (Tracer, Meter) for instrumenting agent code.
    """
    resource = Resource.create({
        SERVICE_NAME: service_name,
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
        "deployment.environment": os.getenv("DEPLOYMENT_ENV", "development"),
        "agent.framework": "custom",
        "agent.runtime": "python",
    })

    # --- Tracing ---
    sampler = TraceIdRatioBased(sampling_rate)
    tracer_provider = TracerProvider(resource=resource, sampler=sampler)

    # OTLP exporter (production)
    otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    if console_export:
        tracer_provider.add_span_processor(
            BatchSpanProcessor(ConsoleSpanExporter())
        )

    trace.set_tracer_provider(tracer_provider)
    tracer = trace.get_tracer("agent.tracer", "1.0.0")

    # --- Metrics ---
    metric_readers = []
    otlp_metric_exporter = OTLPMetricExporter(endpoint=otlp_endpoint, insecure=True)
    metric_readers.append(
        PeriodicExportingMetricReader(otlp_metric_exporter, export_interval_millis=30000)
    )

    if console_export:
        metric_readers.append(
            PeriodicExportingMetricReader(ConsoleMetricExporter(), export_interval_millis=10000)
        )

    meter_provider = MeterProvider(resource=resource, metric_readers=metric_readers)
    metrics.set_meter_provider(meter_provider)
    meter = metrics.get_meter("agent.meter", "1.0.0")

    return tracer, meter
```

### 2.2 TypeScript — Full Provider Setup

```typescript
/**
 * otel-setup.ts — OpenTelemetry initialization for Node.js agent services.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import {
  PeriodicExportingMetricReader,
  MeterProvider,
} from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";
import { trace, metrics, Tracer, Meter } from "@opentelemetry/api";

interface OtelConfig {
  serviceName: string;
  otlpEndpoint: string;
  samplingRate: number;
}

export function initializeOtel(config: OtelConfig): { tracer: Tracer; meter: Meter } {
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: process.env.SERVICE_VERSION || "1.0.0",
    "deployment.environment": process.env.DEPLOYMENT_ENV || "development",
    "agent.framework": "custom",
    "agent.runtime": "node",
  });

  const traceExporter = new OTLPTraceExporter({
    url: config.otlpEndpoint,
  });

  const metricExporter = new OTLPMetricExporter({
    url: config.otlpEndpoint,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    sampler: new TraceIdRatioBasedSampler(config.samplingRate),
  });

  sdk.start();

  const tracer = trace.getTracer("agent.tracer", "1.0.0");
  const meter = metrics.getMeter("agent.meter", "1.0.0");

  return { tracer, meter };
}
```

---

## 3. Span Creation for Agent Steps

### 3.1 Agent Step Instrumentation (Python)

```python
"""
agent_spans.py — Create spans for each agent reasoning step.
"""
from opentelemetry import trace, context
from opentelemetry.trace import StatusCode, SpanKind
from typing import Any, Callable, Optional
from functools import wraps
import time
import json


tracer = trace.get_tracer("agent.steps", "1.0.0")


# ── Semantic Conventions for Agent Spans ──────────────────────────────

AGENT_STEP_TYPE = "agent.step.type"
AGENT_STEP_NAME = "agent.step.name"
AGENT_SESSION_ID = "agent.session.id"
AGENT_TURN_NUMBER = "agent.turn.number"
AGENT_MODEL_NAME = "agent.model.name"
AGENT_MODEL_PROVIDER = "agent.model.provider"

LLM_REQUEST_MODEL = "llm.request.model"
LLM_RESPONSE_MODEL = "llm.response.model"
LLM_REQUEST_MAX_TOKENS = "llm.request.max_tokens"
LLM_REQUEST_TEMPERATURE = "llm.request.temperature"
LLM_USAGE_PROMPT_TOKENS = "llm.usage.prompt_tokens"
LLM_USAGE_COMPLETION_TOKENS = "llm.usage.completion_tokens"
LLM_USAGE_TOTAL_TOKENS = "llm.usage.total_tokens"

TOOL_NAME = "tool.name"
TOOL_DESCRIPTION = "tool.description"
TOOL_PARAMETERS = "tool.parameters"
TOOL_RESULT_STATUS = "tool.result.status"


def agent_step_span(
    step_type: str,
    step_name: str,
    session_id: Optional[str] = None,
):
    """Decorator to wrap an agent step in an OTel span."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            with tracer.start_as_current_span(
                name=f"agent.{step_type}.{step_name}",
                kind=SpanKind.INTERNAL,
                attributes={
                    AGENT_STEP_TYPE: step_type,
                    AGENT_STEP_NAME: step_name,
                    AGENT_SESSION_ID: session_id or "unknown",
                },
            ) as span:
                try:
                    result = func(*args, **kwargs)
                    span.set_status(StatusCode.OK)
                    return result
                except Exception as exc:
                    span.set_status(StatusCode.ERROR, str(exc))
                    span.record_exception(exc)
                    raise
        return wrapper
    return decorator


class AgentSpanManager:
    """Manage span lifecycle for agent execution steps."""

    def __init__(self, session_id: str, agent_id: str):
        self.session_id = session_id
        self.agent_id = agent_id
        self._turn_counter = 0

    def start_turn_span(self, user_input: str) -> trace.Span:
        """Start a new span for an agent turn (user message → response)."""
        self._turn_counter += 1
        span = tracer.start_span(
            name=f"agent.turn.{self._turn_counter}",
            kind=SpanKind.SERVER,
            attributes={
                AGENT_SESSION_ID: self.session_id,
                AGENT_TURN_NUMBER: self._turn_counter,
                "agent.id": self.agent_id,
                "agent.user_input_length": len(user_input),
            },
        )
        return span

    def create_llm_span(
        self,
        model: str,
        provider: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> trace.Span:
        """Create a span for an LLM inference call."""
        span = tracer.start_span(
            name=f"llm.call.{model}",
            kind=SpanKind.CLIENT,
            attributes={
                LLM_REQUEST_MODEL: model,
                AGENT_MODEL_PROVIDER: provider,
                LLM_REQUEST_MAX_TOKENS: max_tokens,
                LLM_REQUEST_TEMPERATURE: temperature,
            },
        )
        return span

    def record_llm_usage(
        self,
        span: trace.Span,
        prompt_tokens: int,
        completion_tokens: int,
        response_model: str = "",
    ) -> None:
        """Record LLM token usage on a span."""
        span.set_attribute(LLM_USAGE_PROMPT_TOKENS, prompt_tokens)
        span.set_attribute(LLM_USAGE_COMPLETION_TOKENS, completion_tokens)
        span.set_attribute(LLM_USAGE_TOTAL_TOKENS, prompt_tokens + completion_tokens)
        if response_model:
            span.set_attribute(LLM_RESPONSE_MODEL, response_model)

    def create_tool_span(
        self,
        tool_name: str,
        tool_description: str = "",
        parameters: Optional[dict] = None,
    ) -> trace.Span:
        """Create a span for a tool invocation."""
        attrs = {
            TOOL_NAME: tool_name,
            TOOL_DESCRIPTION: tool_description,
        }
        if parameters:
            attrs[TOOL_PARAMETERS] = json.dumps(parameters)[:1024]  # truncate

        span = tracer.start_span(
            name=f"tool.call.{tool_name}",
            kind=SpanKind.CLIENT,
            attributes=attrs,
        )
        return span

    def record_tool_result(
        self,
        span: trace.Span,
        status: str,
        result_size: int = 0,
    ) -> None:
        """Record the result status of a tool call."""
        span.set_attribute(TOOL_RESULT_STATUS, status)
        span.set_attribute("tool.result.size_bytes", result_size)

    def create_decision_span(
        self,
        question: str,
        options: list[str],
    ) -> trace.Span:
        """Create a span for a decision point."""
        span = tracer.start_span(
            name="agent.decision",
            kind=SpanKind.INTERNAL,
            attributes={
                AGENT_STEP_TYPE: "decision",
                "agent.decision.question": question,
                "agent.decision.option_count": len(options),
                "agent.decision.options": json.dumps(options),
            },
        )
        return span

    def record_decision_outcome(
        self,
        span: trace.Span,
        selected_option: str,
        confidence: float,
        reasoning: str = "",
    ) -> None:
        """Record the outcome of a decision."""
        span.set_attribute("agent.decision.selected", selected_option)
        span.set_attribute("agent.decision.confidence", confidence)
        if reasoning:
            span.set_attribute("agent.decision.reasoning", reasoning[:512])
```

---

## 4. Custom Attributes for LLM Calls

### 4.1 LLM Semantic Conventions

The OpenTelemetry community has proposed semantic conventions for GenAI/LLM operations.
Below is the recommended attribute set:

```yaml
# Semantic conventions for LLM spans (based on OTel GenAI SIG)

# Request attributes
gen_ai.system: "openai"             # Provider: openai, anthropic, google, etc.
gen_ai.request.model: "gpt-4o"      # Requested model
gen_ai.request.max_tokens: 4096     # Max output tokens
gen_ai.request.temperature: 0.7     # Sampling temperature
gen_ai.request.top_p: 0.95          # Nucleus sampling
gen_ai.request.stop_sequences: ["END"]  # Stop sequences
gen_ai.request.frequency_penalty: 0.0
gen_ai.request.presence_penalty: 0.0

# Response attributes
gen_ai.response.model: "gpt-4o-2024-08-06"  # Actual model used
gen_ai.response.id: "chatcmpl-abc123"        # Provider response ID
gen_ai.response.finish_reasons: ["stop"]     # Why generation stopped

# Usage attributes
gen_ai.usage.input_tokens: 1250      # Prompt/input tokens
gen_ai.usage.output_tokens: 340      # Completion/output tokens
gen_ai.usage.total_tokens: 1590      # Total tokens

# Cost attributes (custom)
gen_ai.cost.input_cost_usd: 0.00375   # Cost for input tokens
gen_ai.cost.output_cost_usd: 0.0102   # Cost for output tokens
gen_ai.cost.total_cost_usd: 0.01395   # Total cost

# Agent-specific attributes (custom)
agent.step.index: 3                    # Step number in reasoning chain
agent.step.type: "tool_selection"      # What the agent was doing
agent.context_window.used_pct: 0.65    # Percentage of context used
agent.cache.hit: true                  # Whether prompt caching was used
```

### 4.2 Attribute Helper Functions

```python
"""
llm_attributes.py — Helper functions for setting LLM span attributes.
"""
from opentelemetry.trace import Span
from typing import Optional


# Token pricing per 1M tokens (as of 2026)
TOKEN_PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-4.1-mini": {"input": 0.40, "output": 1.60},
    "gpt-4.1-nano": {"input": 0.10, "output": 0.40},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
    "claude-opus-4-20250514": {"input": 15.00, "output": 75.00},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.00},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
}


def set_llm_request_attributes(
    span: Span,
    system: str,
    model: str,
    max_tokens: int = 4096,
    temperature: float = 0.7,
    top_p: float = 0.95,
) -> None:
    """Set standard LLM request attributes on a span."""
    span.set_attribute("gen_ai.system", system)
    span.set_attribute("gen_ai.request.model", model)
    span.set_attribute("gen_ai.request.max_tokens", max_tokens)
    span.set_attribute("gen_ai.request.temperature", temperature)
    span.set_attribute("gen_ai.request.top_p", top_p)


def set_llm_response_attributes(
    span: Span,
    model: str,
    response_id: str,
    finish_reason: str,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int = 0,
) -> None:
    """Set standard LLM response attributes on a span."""
    span.set_attribute("gen_ai.response.model", model)
    span.set_attribute("gen_ai.response.id", response_id)
    span.set_attribute("gen_ai.response.finish_reasons", [finish_reason])
    span.set_attribute("gen_ai.usage.input_tokens", input_tokens)
    span.set_attribute("gen_ai.usage.output_tokens", output_tokens)
    span.set_attribute("gen_ai.usage.total_tokens", input_tokens + output_tokens)

    if cached_tokens > 0:
        span.set_attribute("gen_ai.usage.cached_tokens", cached_tokens)
        span.set_attribute("agent.cache.hit", True)

    # Calculate cost
    pricing = TOKEN_PRICING.get(model)
    if pricing:
        effective_input = input_tokens - cached_tokens
        input_cost = (effective_input / 1_000_000) * pricing["input"]
        cached_cost = (cached_tokens / 1_000_000) * pricing["input"] * 0.1  # 90% discount
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        total_cost = input_cost + cached_cost + output_cost

        span.set_attribute("gen_ai.cost.input_cost_usd", round(input_cost, 6))
        span.set_attribute("gen_ai.cost.output_cost_usd", round(output_cost, 6))
        span.set_attribute("gen_ai.cost.total_cost_usd", round(total_cost, 6))
```

---

## 5. Metric Collection

### 5.1 Agent Metrics Definition

```python
"""
agent_metrics.py — Define and record agent-specific metrics.
"""
from opentelemetry import metrics


meter = metrics.get_meter("agent.meter", "1.0.0")

# ── Counters ──────────────────────────────────────────────────────────

llm_calls_total = meter.create_counter(
    name="agent.llm.calls.total",
    description="Total number of LLM API calls",
    unit="1",
)

tool_calls_total = meter.create_counter(
    name="agent.tool.calls.total",
    description="Total number of tool invocations",
    unit="1",
)

tokens_used_total = meter.create_counter(
    name="agent.tokens.used.total",
    description="Total tokens consumed across all LLM calls",
    unit="tokens",
)

cost_incurred_total = meter.create_counter(
    name="agent.cost.incurred.total",
    description="Total cost incurred in USD",
    unit="USD",
)

errors_total = meter.create_counter(
    name="agent.errors.total",
    description="Total agent errors",
    unit="1",
)

# ── Histograms ────────────────────────────────────────────────────────

llm_latency = meter.create_histogram(
    name="agent.llm.latency",
    description="Latency of LLM API calls",
    unit="ms",
)

tool_latency = meter.create_histogram(
    name="agent.tool.latency",
    description="Latency of tool invocations",
    unit="ms",
)

turn_latency = meter.create_histogram(
    name="agent.turn.latency",
    description="End-to-end latency of agent turns",
    unit="ms",
)

tokens_per_call = meter.create_histogram(
    name="agent.tokens.per_call",
    description="Token count distribution per LLM call",
    unit="tokens",
)

steps_per_turn = meter.create_histogram(
    name="agent.steps.per_turn",
    description="Number of reasoning steps per agent turn",
    unit="1",
)

# ── Gauges (via UpDownCounter or Observable) ──────────────────────────

active_sessions = meter.create_up_down_counter(
    name="agent.sessions.active",
    description="Number of currently active agent sessions",
    unit="1",
)

context_window_utilization = meter.create_histogram(
    name="agent.context_window.utilization",
    description="Percentage of context window used",
    unit="%",
)


# ── Recording Functions ───────────────────────────────────────────────

def record_llm_call(
    model: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: float,
    cost_usd: float,
    status: str = "success",
) -> None:
    """Record metrics for a single LLM API call."""
    labels = {
        "model": model,
        "provider": provider,
        "status": status,
    }
    llm_calls_total.add(1, labels)
    tokens_used_total.add(input_tokens + output_tokens, labels)
    cost_incurred_total.add(cost_usd, labels)
    llm_latency.record(latency_ms, labels)
    tokens_per_call.record(input_tokens + output_tokens, labels)


def record_tool_call(
    tool_name: str,
    latency_ms: float,
    status: str = "success",
) -> None:
    """Record metrics for a tool invocation."""
    labels = {"tool_name": tool_name, "status": status}
    tool_calls_total.add(1, labels)
    tool_latency.record(latency_ms, labels)


def record_turn_completion(
    latency_ms: float,
    step_count: int,
    context_pct: float,
) -> None:
    """Record metrics for a completed agent turn."""
    turn_latency.record(latency_ms)
    steps_per_turn.record(step_count)
    context_window_utilization.record(context_pct)
```

---

## 6. Exporter Configurations

### 6.1 OTLP Configuration

```yaml
# otel-collector-config.yaml
# OpenTelemetry Collector configuration for agent observability

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:
    timeout: 5s
    send_batch_size: 512
    send_batch_max_size: 1024

  memory_limiter:
    check_interval: 5s
    limit_mib: 512
    spike_limit_mib: 128

  attributes:
    actions:
      - key: "deployment.environment"
        value: "production"
        action: upsert

  filter:
    spans:
      # Drop health check spans
      exclude:
        match_type: strict
        span_names:
          - "health.check"
          - "readiness.probe"

exporters:
  # Jaeger for trace visualization
  otlp/jaeger:
    endpoint: "jaeger:4317"
    tls:
      insecure: true

  # Prometheus for metrics
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "agent"
    const_labels:
      service: "agent-observability"

  # Loki for logs
  loki:
    endpoint: "http://loki:3100/loki/api/v1/push"

  # File exporter for debugging
  file:
    path: "/var/log/otel/agent-traces.json"
    rotation:
      max_megabytes: 100
      max_days: 7

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, filter, attributes]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]

  telemetry:
    logs:
      level: "info"
    metrics:
      address: "0.0.0.0:8888"
```

### 6.2 Docker Compose for Observability Stack

```yaml
# docker-compose.observability.yaml
version: "3.9"

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.100.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Collector metrics
      - "8889:8889"   # Prometheus exporter
    depends_on:
      - jaeger
      - prometheus

  jaeger:
    image: jaegertracing/all-in-one:1.56
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Accept spans
    environment:
      COLLECTOR_OTLP_ENABLED: "true"

  prometheus:
    image: prom/prometheus:v2.52.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.4.0
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: "agent-observability"
    volumes:
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - ./grafana/provisioning:/etc/grafana/provisioning
```

---

## 7. End-to-End Instrumented Agent Example

```python
"""
instrumented_agent.py — Fully instrumented agent with OTel observability.
"""
import time
from opentelemetry import trace, context
from opentelemetry.trace import StatusCode

from otel_setup import setup_otel
from agent_metrics import record_llm_call, record_tool_call, record_turn_completion
from llm_attributes import set_llm_request_attributes, set_llm_response_attributes


tracer, meter = setup_otel(service_name="research-agent")


class InstrumentedAgent:
    """Agent with full OpenTelemetry instrumentation."""

    def __init__(self, agent_id: str, model: str = "gpt-4o"):
        self.agent_id = agent_id
        self.model = model
        self._session_count = 0

    def handle_request(self, user_input: str, session_id: str) -> str:
        """Handle a user request with full tracing."""
        with tracer.start_as_current_span(
            "agent.turn",
            attributes={
                "agent.id": self.agent_id,
                "agent.session.id": session_id,
                "agent.user_input_length": len(user_input),
            },
        ) as turn_span:
            start = time.monotonic()
            step_count = 0

            try:
                # Step 1: Planning
                with tracer.start_as_current_span("agent.step.plan") as plan_span:
                    plan_span.set_attribute("agent.step.type", "planning")
                    plan = self._call_llm(
                        prompt=f"Plan approach for: {user_input}",
                        span=plan_span,
                    )
                    step_count += 1

                # Step 2: Tool execution
                with tracer.start_as_current_span("agent.step.execute") as exec_span:
                    exec_span.set_attribute("agent.step.type", "execution")
                    tool_result = self._call_tool("web_search", {"query": user_input})
                    step_count += 1

                # Step 3: Synthesis
                with tracer.start_as_current_span("agent.step.synthesize") as synth_span:
                    synth_span.set_attribute("agent.step.type", "synthesis")
                    response = self._call_llm(
                        prompt=f"Synthesize: plan={plan}, data={tool_result}",
                        span=synth_span,
                    )
                    step_count += 1

                turn_span.set_status(StatusCode.OK)
                elapsed_ms = (time.monotonic() - start) * 1000
                record_turn_completion(elapsed_ms, step_count, 0.55)
                return response

            except Exception as exc:
                turn_span.set_status(StatusCode.ERROR, str(exc))
                turn_span.record_exception(exc)
                raise

    def _call_llm(self, prompt: str, span: trace.Span) -> str:
        """Simulate an LLM call with instrumentation."""
        set_llm_request_attributes(span, "openai", self.model)
        start = time.monotonic()

        # Simulated LLM response
        response = f"LLM response to: {prompt[:50]}..."
        input_tokens = len(prompt.split()) * 2
        output_tokens = len(response.split()) * 2
        elapsed_ms = (time.monotonic() - start) * 1000

        set_llm_response_attributes(
            span, self.model, "resp-123", "stop",
            input_tokens, output_tokens,
        )

        cost = (input_tokens / 1_000_000) * 2.50 + (output_tokens / 1_000_000) * 10.00
        record_llm_call(self.model, "openai", input_tokens, output_tokens, elapsed_ms, cost)

        return response

    def _call_tool(self, tool_name: str, params: dict) -> str:
        """Simulate a tool call with instrumentation."""
        with tracer.start_as_current_span(
            f"tool.call.{tool_name}",
            attributes={"tool.name": tool_name},
        ) as tool_span:
            start = time.monotonic()
            result = f"Tool {tool_name} result"  # Simulated
            elapsed_ms = (time.monotonic() - start) * 1000

            tool_span.set_attribute("tool.result.status", "success")
            record_tool_call(tool_name, elapsed_ms)
            return result
```

---

## 8. Prometheus Alert Rules

```yaml
# agent-alerts.rules.yml
groups:
  - name: agent_observability
    rules:
      - alert: HighAgentLatency
        expr: histogram_quantile(0.95, rate(agent_turn_latency_bucket[5m])) > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Agent p95 latency exceeds 10s"

      - alert: HighTokenUsage
        expr: rate(agent_tokens_used_total[1h]) > 1000000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Token consumption exceeds 1M/hour"

      - alert: HighErrorRate
        expr: rate(agent_errors_total[5m]) / rate(agent_llm_calls_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Agent error rate exceeds 5%"

      - alert: HighCostRate
        expr: rate(agent_cost_incurred_total[1h]) > 50
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "Agent cost exceeds $50/hour"
```

---

## 9. Best Practices

| Practice | Description |
|----------|-------------|
| Use semantic conventions | Follow OTel GenAI semantic conventions for interoperability |
| Batch span export | Always use BatchSpanProcessor in production |
| Set sampling rates | Use TraceIdRatioBased sampling to control volume |
| Record costs as metrics | Emit cost counters alongside latency histograms |
| Use baggage for context | Propagate session_id, user_id via OTel baggage |
| Limit attribute sizes | Truncate large strings (prompts, tool params) to 1-4KB |
| Add resource attributes | Include service name, version, environment on every telemetry signal |
| Monitor the collector | Watch collector memory and queue metrics |

---

## 10. Cross-Reference

- For trace visualization techniques, see `reasoning-trace-visualization.md`
- For distributed tracing patterns, see `distributed-tracing-agents.md`
- For performance metric analysis, see `performance-profiling.md`
- For cost tracking details, see `cost-tracking-optimization.md`
