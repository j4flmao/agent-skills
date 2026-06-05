---
name: agent-observability
description: >
  Comprehensive skill for tracing reasoning paths, debugging non-deterministic
  agent loops, and monitoring agent behavior in production systems. Covers
  reasoning trace visualization, OpenTelemetry integration for agent systems,
  distributed tracing across multi-agent chains, decision audit logging,
  performance profiling, anomaly detection, cost tracking and optimization,
  and latency analysis for AI agent deployments.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - harness-engineering
  - observability
  - tracing
  - monitoring
  - opentelemetry
  - debugging
  - performance
  - cost-optimization
  - anomaly-detection
---

# Agent Observability

## Purpose

This skill provides the complete knowledge required to build production-grade
observability systems for AI agent deployments. Unlike traditional software where
execution paths are deterministic and debuggable with standard tools, agent systems
exhibit non-deterministic reasoning loops, branching decision trees, variable-length
tool call chains, and stochastic output variations that demand specialized observability
infrastructure.

The skill covers every dimension of agent observability: capturing and visualizing
reasoning traces that show *why* an agent made each decision, integrating OpenTelemetry
to instrument every LLM call and tool invocation, propagating distributed trace context
across multi-agent chains, maintaining tamper-evident decision audit logs, profiling
performance bottlenecks in agent pipelines, detecting anomalous behavior patterns that
indicate drift or failure, tracking costs across model providers and optimizing token
usage, and analyzing latency to identify and eliminate bottlenecks in the agent execution
critical path.

## Core Principles

1. **Trace Everything, Sample Intelligently**: Every LLM call, tool invocation, and
   decision point must be instrumentable. In production, use head-based and tail-based
   sampling to control volume while guaranteeing capture of errors and anomalies.

2. **Reasoning is the Primary Signal**: Traditional metrics (latency, throughput, errors)
   are necessary but insufficient. The agent's reasoning trace—the chain of observations,
   thoughts, and actions—is the primary debugging and auditing artifact.

3. **Correlation Across Boundaries**: A single user request may traverse multiple agents,
   tools, sandboxes, and external APIs. Trace context must propagate across all boundaries
   to enable end-to-end visibility.

4. **Cost is a First-Class Metric**: Token consumption, API call counts, and dollar costs
   must be tracked with the same rigor as latency and error rates. Cost anomalies often
   indicate reasoning loops or prompt inefficiencies.

5. **Detect Drift Before Failure**: Anomaly detection on agent behavior distributions
   (response length, tool call frequency, reasoning depth) catches degradation before
   it manifests as user-visible failures.

## Agent Protocol

### Triggers
- Agent system deployed to production requiring monitoring
- Debugging non-deterministic agent behavior or reasoning failures
- Cost overruns detected in agent API usage
- Compliance requirement for decision audit trails
- Performance degradation in agent response times
- New agent chain requiring end-to-end trace instrumentation

### Input Context Required
- Agent system architecture (single agent, chain, graph, swarm)
- Current instrumentation state (none, partial, full OpenTelemetry)
- Observability backend (Jaeger, Tempo, Datadog, Honeycomb, custom)
- Compliance requirements (audit retention period, tamper evidence)
- Cost tracking requirements (per-request, per-agent, per-model)
- Alert thresholds (latency P99, error rate, cost per request)

### Output Artifact
- Instrumentation configuration (OpenTelemetry SDK setup)
- Dashboard definitions (Grafana JSON, Datadog monitors)
- Alert rules (Prometheus alerting rules, PagerDuty integrations)
- Reasoning trace schema (structured JSON for trace storage)
- Cost attribution report (per-agent, per-model breakdown)

### Response Formats

```json
{
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "agent_id": "agent-planner-01",
  "request_id": "req-7f8a9b0c",
  "reasoning_trace": {
    "steps": [
      {
        "step_id": 1,
        "type": "observation",
        "content": "User requests weather forecast for Tokyo",
        "timestamp": "2026-06-04T09:00:00.123Z",
        "tokens_in": 47,
        "tokens_out": 0
      },
      {
        "step_id": 2,
        "type": "thought",
        "content": "Need to call weather API tool with location=Tokyo",
        "timestamp": "2026-06-04T09:00:00.456Z",
        "tokens_in": 0,
        "tokens_out": 32,
        "model": "claude-sonnet-4-20250514",
        "cost_usd": 0.00048
      },
      {
        "step_id": 3,
        "type": "action",
        "tool": "weather_api",
        "input": {"location": "Tokyo", "units": "metric"},
        "output": {"temp_c": 22, "condition": "partly_cloudy"},
        "latency_ms": 340,
        "timestamp": "2026-06-04T09:00:00.796Z"
      }
    ],
    "total_steps": 5,
    "total_tokens": 847,
    "total_cost_usd": 0.00127,
    "total_latency_ms": 2340
  },
  "metrics": {
    "llm_calls": 2,
    "tool_calls": 1,
    "retries": 0,
    "cache_hits": 1,
    "reasoning_depth": 5
  }
}
```

## Decision Matrix

```
START: Observability requirement identified
│
├─ What is the primary goal?
│  ├─ DEBUGGING → Focus on reasoning trace capture
│  │  ├─ Single agent? → Instrument with local span collection
│  │  └─ Multi-agent? → Deploy distributed tracing with context propagation
│  │
│  ├─ COMPLIANCE → Focus on decision audit logging
│  │  ├─ Tamper-evident required? → Use append-only log with Merkle tree
│  │  └─ Standard audit? → Structured JSON logs with retention policy
│  │
│  ├─ COST CONTROL → Focus on cost tracking & optimization
│  │  ├─ Per-request attribution? → Tag spans with cost metadata
│  │  └─ Aggregate trends? → Build cost dashboards with model breakdown
│  │
│  └─ PERFORMANCE → Focus on latency analysis
│     ├─ Identify bottleneck first → Capture critical path analysis
│     ├─ LLM latency dominant? → Optimize prompts, enable caching
│     └─ Tool latency dominant? → Parallelize tool calls, add timeouts
│
├─ What sampling strategy?
│  ├─ Development → 100% sampling (capture everything)
│  ├─ Staging → Head-based 10% + tail-based on errors
│  └─ Production → Head-based 1% + tail-based on errors/anomalies
│
└─ What alerting is needed?
   ├─ Latency P99 > threshold → PagerDuty critical alert
   ├─ Error rate > 5% over 5min → Slack warning + auto-investigation
   ├─ Cost per request > 2x baseline → Cost alert + reasoning review
   └─ Anomaly score > 3σ → Anomaly alert + full trace capture
```

## Detailed Architectural Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                       AGENT RUNTIME                               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                 INSTRUMENTATION LAYER                         │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │ │
│  │  │ LLM Call   │  │ Tool Call  │  │ Reasoning Step         │  │ │
│  │  │ Interceptor│  │ Interceptor│  │ Recorder               │  │ │
│  │  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────────┘  │ │
│  │        │               │                     │                │ │
│  │        ▼               ▼                     ▼                │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │          OPENTELEMETRY SDK (Traces + Metrics)            │ │ │
│  │  │  ┌──────────┐  ┌───────────┐  ┌───────────────────────┐ │ │ │
│  │  │  │ Tracer   │  │ Meter     │  │ Context Propagator    │ │ │ │
│  │  │  │ Provider │  │ Provider  │  │ (W3C TraceContext)    │ │ │ │
│  │  │  └──────────┘  └───────────┘  └───────────────────────┘ │ │ │
│  │  └──────────────────────┬───────────────────────────────────┘ │ │
│  └─────────────────────────┼────────────────────────────────────┘ │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌─────────────┐ ┌──────────────────┐
│  TRACE BACKEND   │ │  METRICS    │ │  LOG AGGREGATOR  │
│  ┌────────────┐  │ │  BACKEND    │ │  ┌────────────┐  │
│  │ Jaeger /   │  │ │ ┌─────────┐│ │  │ Loki /     │  │
│  │ Tempo /    │  │ │ │Prometheus││ │  │ Elastic /  │  │
│  │ Honeycomb  │  │ │ │/ Mimir  ││ │  │ CloudWatch │  │
│  └────────────┘  │ │ └─────────┘│ │  └────────────┘  │
└──────────────────┘ └─────────────┘ └──────────────────┘
              │              │              │
              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                   ANALYSIS LAYER                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Reasoning   │  │ Anomaly      │  │ Cost           │ │
│  │ Trace       │  │ Detection    │  │ Attribution    │ │
│  │ Visualizer  │  │ Engine       │  │ Engine         │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Latency     │  │ Decision     │  │ Alert          │ │
│  │ Critical    │  │ Audit        │  │ Manager        │ │
│  │ Path        │  │ Explorer     │  │ (PagerDuty)    │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Observability Data Flow

```
  LLM Call ──► Span Created ──► Attributes Added ──► Span Exported
      │              │                │                    │
      ▼              ▼                ▼                    ▼
  Token Count    Trace Context   Model, Tokens,       OTLP Collector
  Recorded       Propagated     Cost Metadata          │
                                                       ├──► Traces → Jaeger
                                                       ├──► Metrics → Prometheus
                                                       └──► Logs → Loki
```

## Workflow Steps

### Phase 1: Instrumentation Setup
1. Install OpenTelemetry SDK and configure tracer/meter providers for the agent runtime.
2. Implement LLM call interceptors that capture model, tokens, latency, and cost per call.
3. Implement tool call interceptors that capture tool name, input/output, and latency.
4. Configure W3C TraceContext propagation for cross-agent and cross-service boundaries.

### Phase 2: Reasoning Trace Capture
1. Define the reasoning step schema (observation, thought, action, result) with unique step IDs.
2. Instrument the agent's reasoning loop to emit structured trace events at each step.
3. Attach reasoning metadata (confidence scores, alternative paths considered) to trace spans.
4. Configure trace sampling strategy appropriate to the deployment environment.

### Phase 3: Metrics & Dashboards
1. Define key metrics: LLM call latency (P50/P95/P99), tool call success rate, tokens per request, cost per request, reasoning depth distribution.
2. Configure metric exporters to the chosen backend (Prometheus, Datadog, CloudWatch).
3. Build dashboards showing real-time agent health, cost trends, and performance distributions.
4. Set up SLO-based monitoring with error budget tracking and burn-rate alerts.

### Phase 4: Decision Audit System
1. Design the audit log schema with request context, agent identity, decision rationale, and outcome.
2. Implement append-only audit log storage with cryptographic integrity verification.
3. Build an audit log query interface for compliance investigators and debugging workflows.
4. Configure retention policies aligned with regulatory requirements (30 days to 7 years).

### Phase 5: Anomaly Detection
1. Establish behavioral baselines for key agent metrics (response length, tool call frequency, reasoning depth, cost per request).
2. Deploy statistical anomaly detection (z-score, IQR, isolation forest) on rolling windows.
3. Configure anomaly-triggered actions: increase sampling rate, capture full traces, alert on-call.
4. Build feedback loops where confirmed anomalies update detection thresholds.

### Phase 6: Cost & Latency Optimization
1. Implement per-request cost attribution by tagging each LLM span with model pricing metadata.
2. Build cost breakdown reports by agent, model, tool, and customer/tenant.
3. Perform critical path analysis on latency traces to identify sequential bottlenecks.
4. Implement optimization recommendations: prompt caching, parallel tool calls, model downgrades.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Traces missing for some agent steps | Async context lost in callback chains | Use OpenTelemetry context propagation utilities; ensure async hooks are instrumented |
| High cardinality metric explosion | Unique trace/request IDs used as metric labels | Use bounded label sets; move unique IDs to trace attributes, not metric labels |
| Reasoning trace shows infinite loop | Agent re-evaluating same observation without progress | Add loop detection middleware; set max_reasoning_steps per request |
| Cost tracking shows $0 for all requests | Model pricing metadata not configured | Configure per-model token pricing in the cost attribution engine |
| Latency P99 10x higher than P50 | Tail latency from cold LLM inference or rate limiting | Implement request hedging; add LLM response caching; monitor rate limit headers |
| Audit log gaps during high traffic | Log buffer overflow dropping entries | Use durable queue (Kafka) between agent and audit log; increase buffer capacity |
| Anomaly detector fires too many false positives | Baselines computed during non-representative period | Retrain baselines on 7+ days of production data; implement adaptive thresholds |
| Distributed trace context not propagating | Missing W3C TraceContext headers in HTTP/gRPC calls | Verify auto-instrumentation covers all HTTP clients; add manual propagation for custom protocols |

## Complete Execution Scenario

```
User Request: "Summarize the Q3 financial report and compare to Q2"
│
▼
┌──────────────────────────────────────────────────────────────┐
│ 1. TRACE INITIATED                                            │
│    trace_id: 4bf92f3577b34da6                                 │
│    root_span: "user_request" (agent-planner-01)               │
│    Sampling decision: RECORD (matches 1% head-based sample)   │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. REASONING TRACE CAPTURED                                   │
│    Step 1: [observation] Parse user intent → "compare Q3/Q2"  │
│    Step 2: [thought] Need to retrieve both reports first      │
│    Step 3: [action] tool=doc_retriever input={q: "Q3 report"} │
│    Step 4: [action] tool=doc_retriever input={q: "Q2 report"} │
│    Step 5: [thought] Both retrieved, now analyze differences  │
│    Step 6: [action] tool=llm_analyze input={docs: [q3, q2]}   │
│    Step 7: [result] Summary generated with comparison table   │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. METRICS EMITTED                                            │
│    llm_call_count: 3 | tool_call_count: 2                     │
│    total_tokens: 12,847 | total_cost: $0.0193                 │
│    total_latency: 4,230ms | reasoning_depth: 7                │
│    Critical path: LLM analyze (2,100ms) → doc_retriever (890ms)│
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. AUDIT LOG ENTRY                                            │
│    request_id: req-7f8a9b0c | agent: agent-planner-01        │
│    decision: "Retrieved Q3+Q2 reports, performed comparative  │
│    analysis using claude-sonnet-4-20250514"                             │
│    outcome: SUCCESS | confidence: 0.92                        │
│    hash_chain: sha256(prev_entry + this_entry)                │
└─────────────────────┬────────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. ANOMALY CHECK                                              │
│    Reasoning depth 7: within 1σ of baseline (μ=6.2, σ=2.1)  │
│    Cost $0.0193: within normal range                          │
│    Latency 4,230ms: slightly above P90 (3,800ms) → MONITOR   │
│    No anomaly alert triggered                                 │
└──────────────────────────────────────────────────────────────┘
```

## Rules and Guidelines

1. **Never log raw prompts or completions in metrics**: Prompts and completions contain
   sensitive data and have unbounded cardinality. Store them in traces with appropriate
   access controls, never as metric labels.

2. **Propagate trace context through every boundary**: Every HTTP call, gRPC call, queue
   message, and sandbox invocation must carry W3C TraceContext headers. Broken trace
   context creates observability blind spots.

3. **Cost attribution must be real-time**: Cost data older than 5 minutes is too stale for
   anomaly detection. Compute cost at span-completion time using pre-configured pricing
   tables.

4. **Audit logs are append-only and immutable**: Once written, audit entries must never be
   modified or deleted within the retention period. Use cryptographic hash chains to detect
   tampering.

5. **Alert on absence, not just presence**: Missing traces, gaps in metric streams, and
   silent agents are often more dangerous than explicit errors. Monitor heartbeats and
   expected event rates.

## Reference Guides

- [Reasoning Trace Visualization](references/reasoning-trace-visualization.md) — Visualizing and exploring agent reasoning paths
- [OpenTelemetry Agent Integration](references/opentelemetry-agent-integration.md) — Full OpenTelemetry setup for agent systems
- [Distributed Tracing for Agents](references/distributed-tracing-agents.md) — Cross-agent and cross-service trace propagation
- [Decision Audit Logging](references/decision-audit-logging.md) — Tamper-evident audit log architecture
- [Performance Profiling](references/performance-profiling.md) — Profiling agent performance and identifying bottlenecks
- [Anomaly Detection for Agents](references/anomaly-detection-agents.md) — Statistical and ML-based anomaly detection
- [Cost Tracking & Optimization](references/cost-tracking-optimization.md) — Token cost tracking and optimization strategies
- [Latency Analysis & Optimization](references/latency-analysis-optimization.md) — Critical path analysis and latency reduction

## Handoff

- **sandbox-execution**: Sandbox telemetry is a key input to the observability pipeline
- **prompt-engineering**: Reasoning traces inform prompt optimization and debugging
- **safety-guardrails**: Anomaly detection feeds into safety monitoring systems

<!-- COMPRESSION: agent-observability | reasoning-traces + otel + distributed-tracing + audit-logs + anomaly-detection + cost-tracking | v2.0.0 -->
