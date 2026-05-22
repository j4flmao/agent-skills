# LLM Monitoring

## Token Tracking

### Per-Model Cost Matrix

```yaml
gpt-4o:
  input_per_1k: $0.005
  output_per_1k: $0.015
gpt-4o-mini:
  input_per_1k: $0.00015
  output_per_1k: $0.0006
claude-3-5-sonnet:
  input_per_1k: $0.003
  output_per_1k: $0.015
```

### Cost Attribution
Tag every trace with `user_id`, `team_id`, `cost_center`. Aggregate cost by tag. Generate daily cost reports. Set per-user/monthly limits.

### Implementation

```python
# Track tokens from LLM response
tokens = {
    "input": response.usage.prompt_tokens,
    "output": response.usage.completion_tokens,
    "total": response.usage.total_tokens,
    "cost": calculate_cost(
        model="gpt-4o",
        input_tokens=response.usage.prompt_tokens,
        output_tokens=response.usage.completion_tokens
    )
}
```

## Latency Monitoring

### Key Metrics
- **TTFT** (Time to First Token): Time until first output token. Critical for streaming.
- **End-to-end**: Total time from input to final output.
- **Per-step**: Breakdown by chain step, tool call, retrieval.

### Budgets

| Percentile | Target | Alert |
|------------|--------|-------|
| P50 | < 500ms | - |
| P95 | < 2s | Warning at 3s |
| P99 | < 5s | Critical at 8s |

### Monitoring Setup

```python
# LangSmith latency metrics
from langsmith import evaluate
results = evaluate(
    runs,  # Recent traces
    evaluators=[latency_evaluator]
)
# Alert on P95 > 2s
```

## Feedback Collection

### Types
- **Thumbs up/down**: Binary, easy to collect. Min feedback per turn.
- **Star rating** (1-5): More granular. Post-interaction.
- **Free-text**: Optional comments for qualitative analysis.

### Integration

```python
# LangFuse score
langfuse.score(
    trace_id=trace_id,
    name="user_satisfaction",
    value=1,  # 1 (thumbs up) or 0 (thumbs down)
    comment="Optional user comment"
)
```

### Analysis
Track feedback score trends over time. Segment by model, chain type, user segment. Use negative feedback to identify degradation.

## Guardrail Monitoring

### Guardrail Types
- Content safety (toxicity, PII, jailbreak)
- Output quality (relevance, conciseness)
- Business rules (cost limits, scope enforcement)

### Metrics
- **Invocation count**: Total guardrail calls
- **Pass rate**: % of calls that pass
- **Violation type**: Breakdown by guardrail type
- **Latency overhead**: Guardrail processing time

### Alerting
Alert on: violation rate > 5% in 5 minutes, latency overhead > 200ms, guardrail service down.

## Dashboards

### Key Metrics Layout
1. **Overview**: Total calls, active users, cost, error rate (last 24h)
2. **Latency**: P50/P95/P99 line chart by model
3. **Cost**: Daily cost breakdown by model and team
4. **Feedback**: Thumbs up/down ratio, avg rating trend
5. **Guardrails**: Violation rate, top violation types
6. **Errors**: Error rate by chain step, error type breakdown

### Alert Channels
- Slack: medium severity (latency warning, cost spike)
- PagerDuty: high severity (error rate spike, service down)
- Email: low severity (daily cost report, weekly trends)

### Automation
Auto-remediate on threshold breach: downgrade model, throttle requests, fallback chain.
