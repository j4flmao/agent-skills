---
name: ai-ai-observability
description: >
  Use this skill when implementing AI observability: LLM monitoring, LangSmith, LangFuse, Arize, Helicone, tracing LLM calls, token usage tracking, latency monitoring, prompt logging, guardrail monitoring, feedback collection.
  This skill enforces: tracing configuration, token tracking, cost attribution, latency budgets, feedback collection, guardrail effectiveness monitoring.
  Do NOT use for: general application monitoring (use APM tools), model evaluation (use eval frameworks), prompt engineering.
version: "1.0.0"
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
Implements LLM observability with tracing, token tracking, latency monitoring, feedback collection, and guardrail effectiveness dashboards.

## Agent Protocol

### Trigger
User request includes: AI observability, LLM monitoring, LangSmith, LangFuse, Arize, Helicone, tracing LLM calls, LLM latency, token usage tracking, LLM analytics, prompt logging, trace LLM.

### Protocol
1. Select observability platform (LangSmith, LangFuse, Arize, Helicone).
2. Configure tracing for LLM calls, chain steps, and tool invocations.
3. Set up token usage tracking and cost attribution.
4. Define latency budgets and monitoring thresholds.
5. Implement feedback collection mechanism.
6. Configure guardrail monitoring and alerts.
7. Design observability dashboard.

## Output
AI observability setup with tracing config, cost tracking, monitoring dashboards, alerts.

### Response Format
```
## AI Observability Configuration
### Platform
Provider: {name}
Endpoint: {url}
API Key: {configured/via env}

### Tracing
Traced Components: [{LLM, chains, tools, retrievers, ...}]
Trace Level: {all/default/errors-only}
Metadata: {user_id, session_id, tags}

### Token Tracking
Model: {model name} | Cost per 1K input: ${N} | Cost per 1K output: ${N}
Provider Markup: {N}x

### Latency Budget
P50 Target: {ms} | P95 Target: {ms} | P99 Target: {ms}
Alert Threshold: {ms}

### Feedback
Collection: {thumbs/star/comment}
Storage: {platform/for each trace}
Frequency: {every turn/periodic}

### Guardrails
Monitored: [{guardrail type}]
Alert On: {violation count / rate}
Channel: {slack/pagerduty/email}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Tracing platform configured and instrumented in application code.
- [ ] All LLM calls are traced with metadata (user_id, session_id).
- [ ] Token usage tracked per model with cost attribution.
- [ ] Latency budgets defined with P50/P95/P99 targets.
- [ ] Feedback collection mechanism implemented.
- [ ] Guardrail monitoring with alert channels configured.
- [ ] Dashboard with key metrics is operational.

## Workflow

### Step 1: Platform Selection

| Platform | Strengths | Best For |
|----------|-----------|----------|
| LangSmith | LangChain-native, trace comparisons, datasets | LangChain projects |
| LangFuse | Open-source, prompt management, cost tracking | Cost-conscious teams |
| Arize Phoenix | Open-source, LLM eval, drift detection | ML teams |
| Helicone | Simple API proxy, no-code setup | Quick wins |

### Step 2: Tracing Setup
Wrap LLM calls and chain invocations with platform SDK. Add metadata: user_id, session_id, application version, environment. Use environment variable for API keys.

```python
# LangSmith
from langsmith import Client
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "my-project"

# LangFuse
from langfuse import Langfuse
langfuse = Langfuse()
@langfuse.observe()
def my_llm_call(prompt: str) -> str: ...
```

### Step 3: Token Tracking
Define per-model token costs. Track input tokens, output tokens, and total per session. Attribute cost to users/teams/departments via metadata tags. Set up daily/weekly cost reports.

### Step 4: Latency Monitoring
Measure: TTFT (time to first token), end-to-end chain time, per-step breakdown. Set P50/P95/P99 targets. Alert when P95 exceeds threshold. Break down by model provider and chain type.

### Step 5: Feedback Collection
Collect explicit feedback: thumbs up/down, star rating (1-5), free-text comments. Associate feedback with specific traces. Use feedback to filter training data for RLHF/DPO. Display feedback scores on dashboard.

### Step 6: Guardrail Monitoring
Log guardrail invocations and results (pass/fail). Track violation types and rates. Alert on high violation rates. Monitor guardrail latency overhead. Track false positive / false negative rates for content safety.

### Step 7: Dashboard Design
Key metrics: total calls, token usage, cost, latency (P50/P95/P99), error rates, feedback scores, guardrail violation rate. Time range: last 24h, 7d, 30d. Break down by model, chain, user.

## Rules
- Never hardcode API keys — use environment variables or secret management.
- Trace every LLM call — no sampling in production until volume exceeds 100K/day.
- Tag every trace with user_id and session_id.
- Set latency budgets before deployment — not after incidents.
- Cost attribution requires consistent tagging across all services.
- Guardrail metrics must be separated from application metrics.
- Feedback must be linkable to specific traces.

## References
  - references/ai-observability-advanced.md — Ai Observability Advanced Topics
  - references/ai-observability-fundamentals.md — Ai Observability Fundamentals
  - references/cost-tracking.md — Cost Tracking
  - references/dashboard-alerting.md — Dashboard and Alerting
  - references/feedback-collection.md — Feedback Collection
  - references/llm-monitoring.md — LLM Monitoring
  - references/llm-tracing.md — LLM Tracing
  - references/observability-incident-response.md — Observability Incident Response
  - references/observability-metrics.md — Observability Metrics for AI Systems
  - references/observability-tooling-comparison.md — Observability Tooling Comparison
## Handoff
For LangChain-specific observability, hand off to `ai-langchain-patterns`. For MCP server observability, hand off to `ai-mcp-patterns`.
