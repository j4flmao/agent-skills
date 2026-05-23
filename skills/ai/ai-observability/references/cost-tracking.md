# Cost Tracking

## Cost Breakdown Structure

### Direct Costs
```
API Calls: input tokens × input price + output tokens × output price
Self-Hosted: GPU hours × instance cost + storage + networking
Embedding: documents indexed × avg tokens × price per token
Re-Ranking: queries × candidates × price per pair
```

### Indirect Costs
```
Observability: tracing ingestion + storage
Guardrails: moderation API calls per request
Caching: cache infrastructure (Redis, memory)
Monitoring: dashboarding, alerting tooling
```

## Per-Request Cost Tracking

### Instrumentation
```python
class CostTracker:
    def __init__(self):
        self.pricing = {
            "gpt-4o": {"input": 0.005, "output": 0.015},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "claude-3-5-sonnet": {"input": 0.003, "output": 0.015},
        }

    def track(self, model, input_tokens, output_tokens, metadata):
        pricing = self.pricing.get(model, {"input": 0, "output": 0})
        cost = (
            input_tokens * pricing["input"] / 1000 +
            output_tokens * pricing["output"] / 1000
        )
        return {
            "cost": cost,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "model": model,
            "timestamp": datetime.now().isoformat(),
            "user_id": metadata.get("user_id"),
            "application": metadata.get("application"),
        }
```

## Aggregation Dimensions

| Dimension | Granularity | Purpose |
|-----------|-------------|---------|
| Model | Per-model cost | Model selection decisions |
| Application | Per-service cost | Budget allocation per team |
| User | Per-user cost | Abuse detection, pricing tiers |
| Endpoint | Per-API cost | Usage pattern analysis |
| Time | Daily/weekly/monthly | Trend analysis, anomaly detection |

## Budget Enforcement

### Daily Budget Tracker
```python
class BudgetEnforcer:
    def __init__(self, daily_budget_usd=500):
        self.daily_budget = daily_budget_usd
        self.daily_spend = 0

    def check_request(self, estimated_tokens, model):
        estimated_cost = self.estimate_cost(estimated_tokens, model)
        if self.daily_spend + estimated_cost > self.daily_budget:
            return {"allowed": False, "reason": "budget_exceeded"}
        self.daily_spend += estimated_cost
        return {"allowed": True}
```

### Budget Tiers
```
Hard Cap: API calls rejected when exceeded
Soft Warning: Alert at 80% of budget
Auto-Throttle: Reduce model quality tier at 90%
```

## Cost Anomalies

### Spike Detection
- Day-over-day increase >50% without deployment
- New model appears in cost breakdown
- Single user accounts for >10% of total cost
- Unusual token patterns (10x average output length)

### Response Playbook
```
1. Identify: which model, which user, which endpoint
2. Diagnose: new feature, bug, abuse, traffic surge?
3. Act: throttle, downgrade model, block user, investigate
4. Retro: add guardrail, update budget, improve alert
```

## Reporting

### Daily Cost Report
```
Total Spend: $482.50 (↓12% vs yesterday)
By Model:
  GPT-4o: $210.40 (44%)
  GPT-4o-mini: $145.20 (30%)
  Claude Sonnet: $98.30 (20%)
  Embeddings: $28.60 (6%)

Top 5 Users:
  user_001: $42.30
  user_002: $38.10
  user_003: $31.50

Anomalies: None
Budget Remaining: $2,517.50 (84% of weekly)
```

### Cost Optimization Levers
| Lever | Impact | Effort | Timeline |
|-------|--------|--------|----------|
| Model downgrade | 30-50% | Low | Immediate |
| Prompt optimization | 10-30% | Medium | 1-2 weeks |
| Caching | 20-40% | Medium | 2-4 weeks |
| Batch processing | 20-30% | High | 1-2 months |
| Self-hosting | 50-90% | Very High | 2-6 months |
