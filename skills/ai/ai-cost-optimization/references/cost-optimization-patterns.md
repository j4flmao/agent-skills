# Cost Optimization Patterns

## Token Caching Strategies

| Strategy | Hit Rate | Savings | Complexity |
|----------|----------|---------|------------|
| Exact-match cache | 10-20% | Low | Simple |
| Semantic cache (cosine > 0.95) | 20-35% | Medium | Moderate |
| Prefix cache (shared prompt prefixes) | 15-25% | Medium | Simple |
| Session cache (same user, same context) | 30-50% | High | Moderate |
| Result cache (idempotent operations) | 40-70% | High | Low |

### Multi-Level Cache
```python
class TieredLLMCache:
    def __init__(self):
        self.l1 = ExactMatchCache(capacity=1000, ttl=300)
        self.l2 = SemanticCache(threshold=0.95, ttl=3600)
        self.l3 = PersistentCache(ttl=86400)

    def get(self, query, context=None):
        result = self.l1.get(query)
        if result: return result
        result = self.l2.get(query, context)
        if result:
            self.l1.set(query, result)
            return result
        return None
```

## Model Selection Strategies

| Query Type | Recommended Model | Cost/1K tokens |
|------------|------------------|----------------|
| Simple Q&A, classification | GPT-4o-mini / Claude Haiku | $0.00015 |
| Code generation | GPT-4o / Claude Sonnet | $0.003 |
| Complex reasoning | o1-mini / Claude Opus | $0.015 |
| Data extraction | Fine-tuned small model | $0.0001 |
| Summarization | GPT-4o-mini | $0.00015 |

### Router Implementation
```python
class CostAwareRouter:
    def __init__(self):
        self.routes = {
            "simple": {"model": "gpt-4o-mini", "cost_per_1k": 0.00015},
            "medium": {"model": "gpt-4o", "cost_per_1k": 0.0025},
            "complex": {"model": "o1-mini", "cost_per_1k": 0.015},
        }
        self.daily_budget = 50.0
        self.daily_spend = 0.0

    def route(self, query, complexity):
        selected = self.routes[complexity]
        estimated_cost = self.estimate_cost(query, selected)
        if self.daily_spend + estimated_cost > self.daily_budget:
            return self.routes["simple"]
        return selected
```

## Batch Optimization

| Pattern | Description | Latency Impact | Cost Savings |
|---------|-------------|----------------|--------------|
| Dynamic batching | Group requests by arrival window | +50-200ms | 30-50% |
| Continuous batching | Fill slots as responses complete | +20-100ms | 40-60% |
| Prompt batching | Same prefix, different suffixes | +100-500ms | 50-70% |

## Prompt Compression Methods

| Method | Compression Ratio | Quality Impact |
|--------|-------------------|----------------|
| LLMLingua | 40-60% | < 2% drop |
| Selective context | 50-70% | Variable |
| Summary substitution | 70-90% | 5-10% drop |
| Keyword extraction | 80-95% | 10-20% drop |

## Implementation Checklist

| Step | Action | Expected Savings |
|------|--------|-----------------|
| 1 | Add semantic cache | 20-35% |
| 2 | Implement model routing | 40-70% |
| 3 | Compress system prompts | 5-15% |
| 4 | Enable prompt caching (API-level) | 10-50% |
| 5 | Quantize embeddings to INT8 | 75% storage reduction |
| 6 | Batch parallel requests | 30-50% per-batch |
| 7 | Set daily budget alerts | Prevent cost overruns |
| 8 | Monitor and iterate on hit rates | Continuous |

### Cost Tracking Dashboard
```python
class CostDashboard:
    def __init__(self, daily_budget):
        self.daily_budget = daily_budget
        self.daily_spend = 0
        self.hourly_spend = defaultdict(float)

    def track(self, model, tokens_in, tokens_out, cost):
        hour = datetime.now().hour
        self.hourly_spend[hour] += cost
        self.daily_spend += cost

    def alert_if_over_budget(self):
        if self.daily_spend > self.daily_budget * 0.8:
            send_alert(f"Daily spend at {self.daily_spend}/{self.daily_budget}")
```
