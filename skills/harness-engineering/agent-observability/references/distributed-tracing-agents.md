# Distributed Tracing for Multi-Agent Systems

## Overview

Distributed tracing enables end-to-end visibility across multi-agent architectures where
a single user request may traverse multiple autonomous agents, external services, and
tool invocations. This reference covers trace propagation strategies, parent-child span
modeling, baggage items for cross-cutting context, and sampling strategies optimized
for agentic workloads.

---

## 1. Multi-Agent Trace Architecture

```
User Request
    │
    ▼
┌──────────────┐    trace_id: abc123
│ Orchestrator │    span: orchestrator.handle
│    Agent     │
└──────┬───────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌──────────────┐                    ┌──────────────┐
│  Research    │ trace_id: abc123   │  Code Gen    │ trace_id: abc123
│    Agent     │ parent: orch.span  │    Agent     │ parent: orch.span
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       ├─────────┐                         │
       ▼         ▼                         ▼
┌──────────┐ ┌──────────┐          ┌──────────┐
│ Web API  │ │ Database │          │  LLM API │
│  Service │ │  Service │          │  Service │
└──────────┘ └──────────┘          └──────────┘

All spans share trace_id: abc123
Parent-child hierarchy preserved across network boundaries
```

---

## 2. Trace Context Propagation

### 2.1 W3C Trace Context Standard

The W3C Trace Context specification defines two HTTP headers for propagation:

```
traceparent: 00-<trace-id>-<parent-span-id>-<trace-flags>
tracestate:  <vendor-key>=<vendor-value>

Example:
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate:  agent=research-v2,session=sess_abc123
```

### 2.2 Python — Context Propagation Across Agent Boundaries

```python
"""
trace_propagation.py — Propagate trace context across agent-to-agent calls.
"""
from opentelemetry import trace, context
from opentelemetry.context.context import Context
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry import baggage
from typing import Optional
import json


# Composite propagator: trace context + baggage
propagator = CompositePropagator([
    TraceContextTextMapPropagator(),
    W3CBaggagePropagator(),
])


class AgentTraceContext:
    """
    Manages trace context propagation between agents.
    Supports both synchronous (in-process) and asynchronous (HTTP/gRPC/queue) patterns.
    """

    @staticmethod
    def inject_context(carrier: dict, ctx: Optional[Context] = None) -> dict:
        """
        Inject current trace context into a carrier dict for outgoing requests.

        Args:
            carrier: Mutable dict to inject headers into.
            ctx: Optional explicit context; uses current if None.

        Returns:
            The carrier dict with trace headers injected.
        """
        propagator.inject(carrier, context=ctx)
        return carrier

    @staticmethod
    def extract_context(carrier: dict) -> Context:
        """
        Extract trace context from incoming request headers.

        Args:
            carrier: Dict containing trace propagation headers.

        Returns:
            Context object with restored trace information.
        """
        return propagator.extract(carrier=carrier)

    @staticmethod
    def create_agent_handoff_context(
        session_id: str,
        source_agent: str,
        target_agent: str,
        task_description: str,
    ) -> dict:
        """
        Create a context carrier for handing off work to another agent.

        Includes trace context + baggage with agent-specific metadata.
        """
        # Set baggage items for cross-agent context
        ctx = baggage.set_baggage("agent.session_id", session_id)
        ctx = baggage.set_baggage("agent.source", source_agent, context=ctx)
        ctx = baggage.set_baggage("agent.target", target_agent, context=ctx)
        ctx = baggage.set_baggage("agent.task", task_description[:256], context=ctx)

        carrier: dict[str, str] = {}
        propagator.inject(carrier, context=ctx)
        return carrier

    @staticmethod
    def restore_agent_context(carrier: dict) -> dict:
        """
        Restore trace context and extract agent baggage from a carrier.

        Returns:
            Dict with extracted baggage values.
        """
        ctx = propagator.extract(carrier=carrier)

        # Activate the extracted context
        token = context.attach(ctx)

        return {
            "session_id": baggage.get_baggage("agent.session_id", ctx) or "",
            "source_agent": baggage.get_baggage("agent.source", ctx) or "",
            "target_agent": baggage.get_baggage("agent.target", ctx) or "",
            "task": baggage.get_baggage("agent.task", ctx) or "",
            "context_token": token,
        }
```

### 2.3 TypeScript — HTTP-Based Context Propagation

```typescript
/**
 * trace-propagation.ts — Propagate OTel context across HTTP agent calls.
 */
import {
  context,
  trace,
  propagation,
  SpanKind,
  SpanStatusCode,
} from "@opentelemetry/api";

interface AgentRequest {
  targetAgent: string;
  task: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}

interface AgentResponse {
  result: unknown;
  agentId: string;
  traceId: string;
}

const tracer = trace.getTracer("agent.distributed", "1.0.0");

/**
 * Call a remote agent with propagated trace context.
 */
async function callRemoteAgent(request: AgentRequest): Promise<AgentResponse> {
  return tracer.startActiveSpan(
    `agent.call.${request.targetAgent}`,
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        // Inject trace context into outgoing headers
        const headers: Record<string, string> = { ...request.headers };
        propagation.inject(context.active(), headers);

        // Add agent-specific headers
        headers["X-Agent-Source"] = "orchestrator";
        headers["X-Agent-Target"] = request.targetAgent;
        headers["X-Agent-Task"] = request.task;

        span.setAttribute("agent.target", request.targetAgent);
        span.setAttribute("agent.task", request.task);

        // Make HTTP call to remote agent
        const response = await fetch(
          `http://${request.targetAgent}:8080/agent/execute`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify(request.payload),
          }
        );

        if (!response.ok) {
          throw new Error(`Agent ${request.targetAgent} returned ${response.status}`);
        }

        const data = (await response.json()) as AgentResponse;
        span.setStatus({ code: SpanStatusCode.OK });
        return data;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Handle an incoming agent request with extracted trace context.
 */
async function handleAgentRequest(
  incomingHeaders: Record<string, string>,
  payload: Record<string, unknown>
): Promise<AgentResponse> {
  // Extract trace context from incoming request
  const extractedContext = propagation.extract(context.active(), incomingHeaders);

  return context.with(extractedContext, async () => {
    return tracer.startActiveSpan(
      "agent.handle",
      { kind: SpanKind.SERVER },
      async (span) => {
        const sourceAgent = incomingHeaders["X-Agent-Source"] || "unknown";
        const task = incomingHeaders["X-Agent-Task"] || "unknown";

        span.setAttribute("agent.source", sourceAgent);
        span.setAttribute("agent.task", task);

        try {
          // Process the request...
          const result = await processAgentTask(task, payload);

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            result,
            agentId: "current-agent",
            traceId: span.spanContext().traceId,
          };
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  });
}

async function processAgentTask(
  task: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  // Agent processing logic
  return { status: "completed", task };
}
```

---

## 3. Parent-Child Span Relationships

### 3.1 Span Hierarchy Model

```
Trace abc123
│
├── [SERVER] orchestrator.handle (root span)
│   │ agent.id: orchestrator
│   │ agent.session_id: sess_001
│   │ duration: 12340ms
│   │
│   ├── [INTERNAL] agent.step.plan
│   │   │ agent.step.type: planning
│   │   │ duration: 2100ms
│   │   │
│   │   └── [CLIENT] llm.call.gpt-4o
│   │       gen_ai.usage.total_tokens: 1520
│   │       duration: 1890ms
│   │
│   ├── [CLIENT] agent.call.research-agent
│   │   │ agent.target: research-agent
│   │   │ duration: 5200ms
│   │   │
│   │   └── [SERVER] agent.handle (in research-agent)
│   │       │
│   │       ├── [CLIENT] tool.call.web_search
│   │       │   duration: 1200ms
│   │       │
│   │       └── [CLIENT] llm.call.gpt-4o-mini
│   │           gen_ai.usage.total_tokens: 3200
│   │           duration: 2800ms
│   │
│   ├── [CLIENT] agent.call.code-gen-agent
│   │   │ agent.target: code-gen-agent
│   │   │ duration: 4500ms
│   │   │
│   │   └── [SERVER] agent.handle (in code-gen-agent)
│   │       │
│   │       └── [CLIENT] llm.call.claude-sonnet-4
│   │           gen_ai.usage.total_tokens: 2800
│   │           duration: 3900ms
│   │
│   └── [INTERNAL] agent.step.synthesize
│       duration: 2100ms
```

### 3.2 Span Link Patterns

```python
"""
span_links.py — Model complex relationships between spans.
"""
from opentelemetry import trace
from opentelemetry.trace import Link, SpanContext, TraceFlags


tracer = trace.get_tracer("agent.links", "1.0.0")


class SpanLinkManager:
    """Manage span links for complex agent relationships."""

    @staticmethod
    def create_fan_out_spans(
        parent_span: trace.Span,
        agent_targets: list[str],
    ) -> list[trace.Span]:
        """
        Create child spans for parallel agent calls (fan-out pattern).
        Each child span is linked to the parent but runs concurrently.
        """
        child_spans = []
        parent_ctx = parent_span.get_span_context()

        for target in agent_targets:
            child = tracer.start_span(
                name=f"agent.call.{target}",
                links=[
                    Link(
                        parent_ctx,
                        attributes={"link.type": "fan_out", "agent.target": target},
                    )
                ],
            )
            child_spans.append(child)

        return child_spans

    @staticmethod
    def create_fan_in_span(
        contributing_spans: list[trace.Span],
        merge_label: str = "merge",
    ) -> trace.Span:
        """
        Create a merge span that links back to all contributing spans (fan-in pattern).
        Used when combining results from multiple parallel agent calls.
        """
        links = [
            Link(
                span.get_span_context(),
                attributes={"link.type": "fan_in", "link.label": merge_label},
            )
            for span in contributing_spans
        ]

        return tracer.start_span(
            name=f"agent.merge.{merge_label}",
            links=links,
        )

    @staticmethod
    def create_retry_link(
        original_span: trace.Span,
        retry_number: int,
    ) -> trace.Span:
        """
        Create a retry span linked to the original failed span.
        """
        return tracer.start_span(
            name=f"agent.retry.{retry_number}",
            links=[
                Link(
                    original_span.get_span_context(),
                    attributes={
                        "link.type": "retry",
                        "retry.number": retry_number,
                    },
                )
            ],
        )

    @staticmethod
    def create_continuation_link(
        previous_session_trace_id: str,
        previous_session_span_id: str,
    ) -> trace.Span:
        """
        Link a new session trace to a previous session's trace.
        Enables cross-session trace correlation.
        """
        prev_ctx = SpanContext(
            trace_id=int(previous_session_trace_id, 16),
            span_id=int(previous_session_span_id, 16),
            is_remote=True,
            trace_flags=TraceFlags(0x01),
        )

        return tracer.start_span(
            name="agent.session.continue",
            links=[
                Link(
                    prev_ctx,
                    attributes={"link.type": "continuation"},
                )
            ],
        )
```

---

## 4. Baggage Items for Cross-Agent Context

### 4.1 Baggage Strategy

```python
"""
agent_baggage.py — Manage OTel baggage for cross-agent context propagation.
"""
from opentelemetry import baggage, context
from opentelemetry.context import Context
from typing import Optional


# ── Standard Agent Baggage Keys ──────────────────────────────────────

BAGGAGE_SESSION_ID = "agent.session_id"
BAGGAGE_USER_ID = "agent.user_id"
BAGGAGE_TENANT_ID = "agent.tenant_id"
BAGGAGE_REQUEST_ID = "agent.request_id"
BAGGAGE_COST_BUDGET = "agent.cost_budget_usd"
BAGGAGE_PRIORITY = "agent.priority"
BAGGAGE_SOURCE_AGENT = "agent.source"
BAGGAGE_TASK_TYPE = "agent.task_type"
BAGGAGE_MAX_DEPTH = "agent.max_depth"
BAGGAGE_CURRENT_DEPTH = "agent.current_depth"


class AgentBaggageManager:
    """
    Manage baggage items that propagate across all agents in a request chain.

    Baggage items are propagated automatically via W3C Baggage headers.
    Use them for values that ALL downstream agents need access to.
    """

    @staticmethod
    def set_request_baggage(
        session_id: str,
        user_id: str,
        tenant_id: str,
        cost_budget_usd: float = 1.0,
        priority: str = "normal",
        max_depth: int = 5,
    ) -> Context:
        """Set initial baggage for a new request."""
        ctx = baggage.set_baggage(BAGGAGE_SESSION_ID, session_id)
        ctx = baggage.set_baggage(BAGGAGE_USER_ID, user_id, context=ctx)
        ctx = baggage.set_baggage(BAGGAGE_TENANT_ID, tenant_id, context=ctx)
        ctx = baggage.set_baggage(BAGGAGE_COST_BUDGET, str(cost_budget_usd), context=ctx)
        ctx = baggage.set_baggage(BAGGAGE_PRIORITY, priority, context=ctx)
        ctx = baggage.set_baggage(BAGGAGE_MAX_DEPTH, str(max_depth), context=ctx)
        ctx = baggage.set_baggage(BAGGAGE_CURRENT_DEPTH, "0", context=ctx)
        return ctx

    @staticmethod
    def increment_depth(ctx: Optional[Context] = None) -> Context:
        """Increment the current depth counter in baggage."""
        current = baggage.get_baggage(BAGGAGE_CURRENT_DEPTH, context=ctx) or "0"
        new_depth = int(current) + 1
        return baggage.set_baggage(
            BAGGAGE_CURRENT_DEPTH, str(new_depth), context=ctx
        )

    @staticmethod
    def check_depth_limit(ctx: Optional[Context] = None) -> bool:
        """Check if current depth exceeds the max depth limit."""
        max_depth = int(baggage.get_baggage(BAGGAGE_MAX_DEPTH, context=ctx) or "5")
        current = int(baggage.get_baggage(BAGGAGE_CURRENT_DEPTH, context=ctx) or "0")
        return current < max_depth

    @staticmethod
    def get_remaining_budget(ctx: Optional[Context] = None) -> float:
        """Get the remaining cost budget from baggage."""
        budget = baggage.get_baggage(BAGGAGE_COST_BUDGET, context=ctx) or "1.0"
        return float(budget)

    @staticmethod
    def deduct_cost(amount_usd: float, ctx: Optional[Context] = None) -> Context:
        """Deduct cost from the budget and update baggage."""
        remaining = AgentBaggageManager.get_remaining_budget(ctx)
        new_budget = max(0.0, remaining - amount_usd)
        return baggage.set_baggage(
            BAGGAGE_COST_BUDGET, str(round(new_budget, 6)), context=ctx
        )

    @staticmethod
    def get_all_baggage(ctx: Optional[Context] = None) -> dict[str, str]:
        """Extract all agent baggage items."""
        return {
            "session_id": baggage.get_baggage(BAGGAGE_SESSION_ID, context=ctx) or "",
            "user_id": baggage.get_baggage(BAGGAGE_USER_ID, context=ctx) or "",
            "tenant_id": baggage.get_baggage(BAGGAGE_TENANT_ID, context=ctx) or "",
            "cost_budget_usd": baggage.get_baggage(BAGGAGE_COST_BUDGET, context=ctx) or "0",
            "priority": baggage.get_baggage(BAGGAGE_PRIORITY, context=ctx) or "normal",
            "max_depth": baggage.get_baggage(BAGGAGE_MAX_DEPTH, context=ctx) or "5",
            "current_depth": baggage.get_baggage(BAGGAGE_CURRENT_DEPTH, context=ctx) or "0",
        }
```

---

## 5. Sampling Strategies

### 5.1 Custom Agent-Aware Sampler

```python
"""
agent_sampler.py — Custom sampling strategies for agent traces.
"""
from opentelemetry.sdk.trace.sampling import (
    Sampler,
    SamplingResult,
    Decision,
    ParentBased,
    TraceIdRatioBased,
    ALWAYS_ON,
    ALWAYS_OFF,
)
from opentelemetry.trace import Link, SpanKind
from opentelemetry.context import Context
from opentelemetry.util.types import Attributes
from typing import Optional, Sequence
import hashlib


class AgentAwareSampler(Sampler):
    """
    Intelligent sampler that adjusts sampling rate based on agent context.

    Sampling rules:
    1. Always sample error traces (tail sampling via collector)
    2. Always sample traces exceeding cost threshold
    3. Always sample traces with high latency
    4. Use ratio-based sampling for normal traces
    5. Always sample first N traces per session (head sampling)
    """

    def __init__(
        self,
        base_rate: float = 0.1,
        high_priority_rate: float = 1.0,
        session_head_count: int = 5,
        cost_threshold_usd: float = 0.10,
    ):
        self.base_rate = base_rate
        self.high_priority_rate = high_priority_rate
        self.session_head_count = session_head_count
        self.cost_threshold_usd = cost_threshold_usd
        self._session_counts: dict[str, int] = {}

    def should_sample(
        self,
        parent_context: Optional[Context],
        trace_id: int,
        name: str,
        kind: Optional[SpanKind] = None,
        attributes: Attributes = None,
        links: Optional[Sequence[Link]] = None,
    ) -> SamplingResult:
        attrs = dict(attributes or {})

        # Rule 1: Always sample high-priority requests
        priority = attrs.get("agent.priority", "normal")
        if priority in ("high", "critical"):
            return SamplingResult(Decision.RECORD_AND_SAMPLE, attrs)

        # Rule 2: Head-sample first N traces per session
        session_id = attrs.get("agent.session.id", "")
        if session_id:
            count = self._session_counts.get(session_id, 0)
            self._session_counts[session_id] = count + 1
            if count < self.session_head_count:
                return SamplingResult(Decision.RECORD_AND_SAMPLE, attrs)

        # Rule 3: Ratio-based sampling for everything else
        hash_val = hashlib.md5(str(trace_id).encode()).hexdigest()
        hash_ratio = int(hash_val[:8], 16) / 0xFFFFFFFF
        if hash_ratio < self.base_rate:
            return SamplingResult(Decision.RECORD_AND_SAMPLE, attrs)

        return SamplingResult(Decision.DROP, attrs)

    def get_description(self) -> str:
        return f"AgentAwareSampler(base={self.base_rate}, head={self.session_head_count})"


class TailSamplingConfig:
    """
    Configuration for OTel Collector tail sampling.
    Tail sampling makes decisions after seeing the complete trace.
    """

    @staticmethod
    def generate_collector_config() -> dict:
        return {
            "processors": {
                "tail_sampling": {
                    "decision_wait": "10s",
                    "num_traces": 100000,
                    "expected_new_traces_per_sec": 1000,
                    "policies": [
                        {
                            "name": "errors-policy",
                            "type": "status_code",
                            "status_code": {"status_codes": ["ERROR"]},
                        },
                        {
                            "name": "high-latency-policy",
                            "type": "latency",
                            "latency": {"threshold_ms": 5000},
                        },
                        {
                            "name": "high-cost-policy",
                            "type": "numeric_attribute",
                            "numeric_attribute": {
                                "key": "gen_ai.cost.total_cost_usd",
                                "min_value": 0.10,
                            },
                        },
                        {
                            "name": "probabilistic-policy",
                            "type": "probabilistic",
                            "probabilistic": {"sampling_percentage": 10},
                        },
                    ],
                }
            }
        }
```

### 5.2 Sampling Decision Matrix

```
┌───────────────────────────────────────────────────────────────────┐
│                    SAMPLING DECISION MATRIX                       │
├──────────────────────┬────────────┬───────────────────────────────┤
│ Condition            │ Sample?    │ Rationale                     │
├──────────────────────┼────────────┼───────────────────────────────┤
│ Error in trace       │ ALWAYS     │ Errors need full visibility   │
│ Latency > 5s         │ ALWAYS     │ Performance issues must trace │
│ Cost > $0.10         │ ALWAYS     │ Expensive requests need audit │
│ Priority = critical  │ ALWAYS     │ Business-critical paths       │
│ Priority = high      │ ALWAYS     │ Important user flows          │
│ First 5 per session  │ ALWAYS     │ Head sampling for debugging   │
│ Priority = normal    │ 10%        │ Ratio-based baseline          │
│ Priority = low       │ 1%         │ Minimal overhead              │
│ Health checks        │ NEVER      │ Noise reduction               │
│ Internal keepalives  │ NEVER      │ Noise reduction               │
└──────────────────────┴────────────┴───────────────────────────────┘
```

---

## 6. Message Queue Trace Propagation

### 6.1 Async Agent Communication (Python)

```python
"""
queue_propagation.py — Propagate trace context through message queues.
"""
import json
from opentelemetry import trace, context
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from opentelemetry.propagators.composite import CompositePropagator
from typing import Any


propagator = CompositePropagator([
    TraceContextTextMapPropagator(),
    W3CBaggagePropagator(),
])

tracer = trace.get_tracer("agent.queue", "1.0.0")


class QueueMessage:
    """Message wrapper with embedded trace context."""

    def __init__(self, payload: dict, headers: dict[str, str] | None = None):
        self.payload = payload
        self.headers = headers or {}

    def serialize(self) -> str:
        return json.dumps({
            "payload": self.payload,
            "headers": self.headers,
        })

    @classmethod
    def deserialize(cls, data: str) -> "QueueMessage":
        parsed = json.loads(data)
        return cls(payload=parsed["payload"], headers=parsed.get("headers", {}))


def publish_agent_task(
    queue_client: Any,
    topic: str,
    task: dict,
) -> None:
    """Publish a task to a message queue with trace context."""
    with tracer.start_as_current_span(
        f"queue.publish.{topic}",
        kind=trace.SpanKind.PRODUCER,
    ) as span:
        # Inject trace context into message headers
        headers: dict[str, str] = {}
        propagator.inject(headers)

        message = QueueMessage(payload=task, headers=headers)
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.destination.name", topic)
        span.set_attribute("messaging.message.body_size", len(message.serialize()))

        queue_client.publish(topic, message.serialize())


def consume_agent_task(
    raw_message: str,
) -> tuple[dict, context.Context]:
    """Consume a task from a queue and restore trace context."""
    message = QueueMessage.deserialize(raw_message)

    # Extract trace context from message headers
    extracted_ctx = propagator.extract(carrier=message.headers)

    with context.attach(extracted_ctx):
        span = tracer.start_span(
            "queue.consume",
            kind=trace.SpanKind.CONSUMER,
            context=extracted_ctx,
        )
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.operation", "process")

    return message.payload, extracted_ctx
```

---

## 7. Trace Correlation Across Agent Chains

### 7.1 Correlation ID Management

```python
"""
correlation.py — Manage correlation IDs across multi-agent chains.
"""
from dataclasses import dataclass, field
from typing import Optional
import uuid


@dataclass
class AgentCorrelation:
    """Correlation context for a multi-agent chain."""
    trace_id: str
    session_id: str
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    chain: list[str] = field(default_factory=list)  # agent IDs in order
    depth: int = 0
    max_depth: int = 10

    def fork(self, target_agent: str) -> "AgentCorrelation":
        """Create a child correlation for a delegated task."""
        return AgentCorrelation(
            trace_id=self.trace_id,
            session_id=self.session_id,
            request_id=self.request_id,
            chain=[*self.chain, target_agent],
            depth=self.depth + 1,
            max_depth=self.max_depth,
        )

    def is_at_depth_limit(self) -> bool:
        return self.depth >= self.max_depth

    def has_cycle(self, agent_id: str) -> bool:
        """Check if delegating to agent_id would create a cycle."""
        return agent_id in self.chain

    def to_headers(self) -> dict[str, str]:
        return {
            "X-Trace-Id": self.trace_id,
            "X-Session-Id": self.session_id,
            "X-Request-Id": self.request_id,
            "X-Agent-Chain": ",".join(self.chain),
            "X-Agent-Depth": str(self.depth),
            "X-Agent-Max-Depth": str(self.max_depth),
        }

    @classmethod
    def from_headers(cls, headers: dict[str, str]) -> "AgentCorrelation":
        return cls(
            trace_id=headers.get("X-Trace-Id", str(uuid.uuid4())),
            session_id=headers.get("X-Session-Id", ""),
            request_id=headers.get("X-Request-Id", str(uuid.uuid4())),
            chain=headers.get("X-Agent-Chain", "").split(",") if headers.get("X-Agent-Chain") else [],
            depth=int(headers.get("X-Agent-Depth", "0")),
            max_depth=int(headers.get("X-Agent-Max-Depth", "10")),
        )
```

---

## 8. Visualization and Debugging

### 8.1 Distributed Trace Visualization

```
Trace: abc123 | Duration: 12.3s | Agents: 3 | Services: 5

Time ──────────────────────────────────────────────────▶

Orchestrator  ╔══════════════════════════════════════════╗
              ║ orchestrator.handle                      ║ 12340ms
              ╠═══════╗                                  ║
              ║ plan  ║                                  ║
              ╠═══════╝                                  ║
              ║    ╔════════════════════╗                 ║
              ║    ║ research-agent     ║  5200ms        ║
              ║    ╠═════╗             ║                 ║
              ║    ║ web ║             ║                 ║
              ║    ╠═════╝             ║                 ║
              ║    ║    ╔══════════╗   ║                 ║
              ║    ║    ║ LLM call ║   ║  2800ms        ║
              ║    ║    ╚══════════╝   ║                 ║
              ║    ╚════════════════════╝                 ║
              ║         ╔═══════════════════╗            ║
              ║         ║ code-gen-agent    ║  4500ms    ║
              ║         ║  ╔══════════════╗ ║            ║
              ║         ║  ║ LLM call     ║ ║  3900ms   ║
              ║         ║  ╚══════════════╝ ║            ║
              ║         ╚═══════════════════╝            ║
              ║                        ╔══════╗          ║
              ║                        ║synth ║  2100ms  ║
              ║                        ╚══════╝          ║
              ╚══════════════════════════════════════════╝
```

---

## 9. Best Practices

| Practice | Description |
|----------|-------------|
| Propagate context always | Never break the trace chain between agents |
| Use W3C standards | Stick to `traceparent`/`tracestate` for interop |
| Limit baggage size | Keep baggage items small (< 8KB total) |
| Detect cycles | Check agent chain for cycles before delegating |
| Enforce depth limits | Prevent infinite agent-to-agent recursion |
| Use span links for fan-out | Model parallel calls with links, not parent-child |
| Tail-sample in collector | Make final sampling decisions after seeing full trace |
| Include cost in baggage | Propagate remaining budget to prevent overspend |

---

## 10. Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|--------------|--------------|-----|
| Creating new trace_id per agent | Breaks correlation across the chain | Propagate parent context |
| Putting prompts in baggage | Massive header sizes, privacy risk | Use span attributes instead |
| No depth limiting | Infinite agent recursion | Enforce max_depth via baggage |
| Synchronous-only tracing | Misses async/queue-based agents | Implement queue context propagation |
| Ignoring sampling | Overwhelming collector/storage | Implement head + tail sampling |

---

## 11. Cross-Reference

- For OpenTelemetry SDK setup details, see `opentelemetry-agent-integration.md`
- For trace visualization, see `reasoning-trace-visualization.md`
- For performance profiling with traces, see `performance-profiling.md`
- For audit logging of traced decisions, see `decision-audit-logging.md`
