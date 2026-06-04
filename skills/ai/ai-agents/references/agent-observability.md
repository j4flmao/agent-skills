# Agent Observability

## Overview
Observability for AI agents requires tracing across multiple dimensions: LLM calls, tool executions, planning decisions, memory operations, and inter-agent communication. Unlike traditional systems, agents have non-deterministic execution paths that make debugging and monitoring harder.

## Tracing Architecture

### Trace Structure
Every agent execution produces a trace tree:
```
Trace: session-abc123
├── Span: agent.reason (ReAct thought cycle 1)
│   ├── Span: llm.call (gpt-4o, 412 tokens)
│   ├── Span: tool.select (search_documents)
│   └── Span: tool.execute (search_documents, 230ms)
├── Span: agent.reason (ReAct thought cycle 2)
│   ├── Span: llm.call (gpt-4o, 890 tokens)
│   └── Span: tool.select (summarize)
└── Span: agent.final_answer
    └── Span: llm.call (gpt-4o, 234 tokens)
```

### OpenTelemetry Implementation
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

tracer = trace.get_tracer(__name__)

class ObservableAgent:
    def __init__(self):
        self.tracer = trace.get_tracer("ai-agent")

    async def run(self, task: str) -> str:
        with self.tracer.start_as_current_span("agent.run") as span:
            span.set_attribute("task", task)
            span.set_attribute("agent.type", "react")

            result = await self._execute_with_tracing(task)

            span.set_attribute("result.length", len(result))
            span.set_status(trace.StatusCode.OK)
            return result

    async def _execute_with_tracing(self, task: str):
        iteration = 0
        context = {"task": task}

        while not self.is_complete(context):
            with self.tracer.start_as_current_span(f"agent.iteration.{iteration}") as span:
                span.set_attribute("iteration", iteration)
                span.set_attribute("context_size", len(str(context)))

                thought = await self._traced_llm_call(context)
                span.add_event("thought_generated", {"thought": thought[:200]})

                if thought.contains_tool_call:
                    tool_result = await self._traced_tool_execution(
                        thought.tool_name, thought.tool_args
                    )
                    context = self.update_context(context, tool_result)
                    span.set_attribute("tool_executed", thought.tool_name)
                else:
                    return thought.final_answer

            iteration += 1
```

### Tool Execution Tracing
```python
class ObservableTool:
    def __init__(self, tool):
        self.tool = tool
        self.tracer = trace.get_tracer("tool")

    async def execute(self, **kwargs):
        with self.tracer.start_as_current_span(f"tool.{self.tool.name}") as span:
            span.set_attribute("tool.name", self.tool.name)
            span.set_attribute("tool.args", json.dumps(kwargs)[:500])

            start = time.monotonic()
            try:
                result = await self.tool.execute(**kwargs)
                duration = time.monotonic() - start

                span.set_attribute("tool.duration_ms", duration * 1000)
                span.set_attribute("tool.success", True)
                span.set_attribute("tool.result_size", len(str(result)))
                span.set_status(trace.StatusCode.OK)

                logger.info(f"Tool {self.tool.name}: {duration*1000:.0f}ms, success")
                return result

            except Exception as e:
                duration = time.monotonic() - start
                span.set_attribute("tool.duration_ms", duration * 1000)
                span.set_attribute("tool.success", False)
                span.record_exception(e)
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise
```

## Metrics Collection

### Agent Health Metrics
```python
from prometheus_client import Counter, Histogram, Gauge

agent_calls = Counter("agent_calls_total", "Total agent invocations", ["agent_type", "status"])
agent_duration = Histogram(
    "agent_duration_seconds",
    "Agent execution duration",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
    labelnames=["agent_type"]
)
tool_calls = Counter("tool_calls_total", "Total tool invocations", ["tool_name", "status"])
tool_duration = Histogram(
    "tool_duration_seconds",
    "Tool execution duration",
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0],
    labelnames=["tool_name"]
)
token_usage = Counter("agent_tokens_total", "Tokens consumed", ["model", "type"])
agent_iterations = Histogram(
    "agent_iterations_count",
    "Number of iterations per agent run",
    buckets=[1, 3, 5, 10, 15, 20],
    labelnames=["agent_type"]
)
loop_detection = Counter("agent_loop_detections_total", "Loop patterns detected", ["agent_type"])
```

### Feedback Integration
```python
class FeedbackCollector:
    def __init__(self):
        self.feedback_store = []

    def record_feedback(self, trace_id: str, rating: int, comment: str = ""):
        entry = {
            "trace_id": trace_id,
            "rating": rating,
            "comment": comment,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.feedback_store.append(entry)
        self._update_metrics(rating)

    def _update_metrics(self, rating: int):
        feedback_ratings.labels(bucket=self._bucket(rating)).inc()

    def get_agent_scores(self, agent_type: str) -> dict:
        scores = [f for f in self.feedback_store if f["rating"] >= 4]
        return {
            "total_feedback": len(self.feedback_store),
            "positive_ratio": len(scores) / max(len(self.feedback_store), 1),
            "average_rating": statistics.mean([f["rating"] for f in self.feedback_store]),
        }
```

## Logging Patterns

### Structured Agent Logging
```python
import structlog
logger = structlog.get_logger()

class AgentLogger:
    def log_thought(self, agent_id: str, iteration: int, thought: str, token_count: int):
        logger.info("agent.thought",
            agent_id=agent_id,
            iteration=iteration,
            thought_length=len(thought),
            tokens=token_count,
        )

    def log_tool_call(self, agent_id: str, tool: str, args: dict, result: str, duration_ms: float):
        logger.info("agent.tool_call",
            agent_id=agent_id,
            tool=tool,
            args=json.dumps(args)[:200],
            result_length=len(str(result)),
            duration_ms=round(duration_ms, 1),
        )

    def log_error(self, agent_id: str, iteration: int, error: str, recoverable: bool):
        logger.error("agent.error",
            agent_id=agent_id,
            iteration=iteration,
            error=error,
            recoverable=recoverable,
        )

    def log_completion(self, agent_id: str, total_iterations: int, total_tokens: int,
                       total_duration_ms: float, success: bool):
        logger.info("agent.complete",
            agent_id=agent_id,
            iterations=total_iterations,
            tokens=total_tokens,
            duration_ms=round(total_duration_ms, 1),
            success=success,
        )
```

## Debugging Tools

### Trace Viewer Integration
```python
class TraceExporter:
    def export_to_langfuse(self, trace_data: dict):
        from langfuse import Langfuse
        langfuse = Langfuse()

        trace = langfuse.trace(
            name=trace_data["agent_type"],
            input=trace_data["task"],
            output=trace_data["result"],
            metadata={
                "iterations": trace_data["iterations"],
                "tokens": trace_data["token_usage"],
            }
        )

        for span_data in trace_data["spans"]:
            span = trace.span(
                name=span_data["name"],
                input=span_data.get("input"),
                output=span_data.get("output"),
                start_time=span_data["start_time"],
                end_time=span_data["end_time"],
                metadata=span_data.get("metadata"),
            )
            if span_data.get("level") == "error":
                span.status = "error"
                span.level = "ERROR"
    def export_to_langsmith(self, trace_data: dict):
        from langsmith import Client
        client = Client()

        run = client.create_run(
            name=trace_data["agent_type"],
            run_type="chain",
            inputs={"task": trace_data["task"]},
            outputs={"result": trace_data["result"]},
            extra={"iterations": trace_data["iterations"]},
            start_time=trace_data["start_time"],
            end_time=trace_data["end_time"],
        )

        for span_data in trace_data["spans"]:
            client.create_run(
                name=span_data["name"],
                run_type=span_data.get("type", "tool"),
                inputs=span_data.get("input"),
                outputs=span_data.get("output"),
                parent_run_id=run.id,
                start_time=span_data["start_time"],
                end_time=span_data["end_time"],
            )
```

### Cost Attribution
```python
class AgentCostTracker:
    def __init__(self):
        self.model_costs = {
            "gpt-4o": {"input": 0.0025, "output": 0.01},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "claude-3.5-sonnet": {"input": 0.003, "output": 0.015},
        }

    def track_llm_cost(self, model: str, input_tokens: int, output_tokens: int, trace_id: str):
        costs = self.model_costs.get(model, {"input": 0, "output": 0})
        input_cost = (input_tokens / 1000) * costs["input"]
        output_cost = (output_tokens / 1000) * costs["output"]
        total = input_cost + output_cost

        logger.info("llm.cost",
            trace_id=trace_id,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=round(total, 6),
        )
        return total

    def track_session_cost(self, trace_ids: list[str]) -> dict:
        costs = [self.get_trace_cost(t) for t in trace_ids]
        return {
            "total_cost": sum(c["total"] for c in costs),
            "total_tokens": sum(c["tokens"] for c in costs),
            "trace_count": len(costs),
            "avg_cost_per_trace": statistics.mean([c["total"] for c in costs]),
        }
```

## Alerting Rules

### Critical Alerts
```
- agent_loop_detected: agent repeated same action >3 times
- agent_max_iterations: hit iteration limit without completing
- tool_failure_rate > 10%: excessive tool errors
- latency_p99 > 30s: agent taking too long
- cost_per_session > $1: unexpected cost spike
- agent_success_rate < 80%: general degradation
```

### Dashboard Widgets
```python
DASHBOARD_WIDGETS = {
    "Agent Success Rate": {
        "metric": "agent_calls_total",
        "query": "rate(agent_calls_total{status='success'}[1h]) / rate(agent_calls_total[1h])",
        "type": "timeseries",
        "threshold": 0.8,
    },
    "Iterations Distribution": {
        "metric": "agent_iterations_count",
        "query": "histogram_quantile(0.95, rate(agent_iterations_count[1h]))",
        "type": "heatmap",
        "threshold": 10,
    },
    "Tool Latency P99": {
        "metric": "tool_duration_seconds",
        "query": "histogram_quantile(0.99, rate(tool_duration_seconds[5m]))",
        "type": "timeseries",
        "threshold": 2.0,
    },
    "Cost per Session": {
        "metric": "cost_per_session",
        "query": "sum(rate(cost_per_session[1h]))",
        "type": "timeseries",
        "threshold": 1.0,
    },
}
```

## Key Points
- Trace every agent iteration with OpenTelemetry spans
- Collect both system metrics (latency, tokens) and business metrics (completion rate, user satisfaction)
- Log structured events for every thought, tool call, and decision
- Export traces to LangFuse or LangSmith for visual debugging
- Track cost per session and per user for budget management
- Alert on loop detection, excessive iterations, and tool failures
- Store feedback linked to specific traces for quality analysis
- Use histograms for latency distribution (P50/P95/P99)
- Tag all metrics with agent type, model, and environment
- Implement sampling only when volume exceeds 100K calls/day

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

