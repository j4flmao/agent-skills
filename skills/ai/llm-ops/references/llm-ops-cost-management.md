# LLM Ops Cost Management

## Overview
Cost management for LLM operations encompasses model selection, deployment optimization, usage monitoring, and budget governance. Without active management, LLM costs can grow exponentially with adoption.

## Cost Components

### Cost Breakdown
```
Total LLM Cost = Inference Cost + Training Cost + Infrastructure + Tooling

Inference Cost Factors:
- Model size (parameter count)
- Input/output token ratio
- Request volume and concurrency
- Caching effectiveness (semantic, exact-match)
- Batch size and dynamic batching
- Hardware type (GPU vs CPU, generation)

Training Cost Factors:
- Base model size
- Dataset size and epochs
- Hardware type and count
- Training duration
- Checkpoint storage
- Experiment tracking overhead

Infrastructure:
- GPU compute (spot vs on-demand vs reserved)
- Storage (model weights, embeddings, datasets)
- Networking (data transfer between services)
- Monitoring and observability tools
```

## Budget Planning

### Usage Forecasting
```python
class CostForecaster:
    def __init__(self):
        self.model_pricing = {
            "gpt-4o": {"input": 0.0025, "output": 0.01},
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "gpt-4.1-nano": {"input": 0.0001, "output": 0.0004},
            "claude-3.5-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
        }

    def forecast_monthly(self, historical_data: list[dict], growth_rate: float = 0.2) -> dict:
        monthly_totals = defaultdict(float)
        for entry in historical_data:
            model = entry["model"]
            pricing = self.model_pricing.get(model, {"input": 0, "output": 0})
            input_cost = (entry["input_tokens"] / 1000) * pricing["input"]
            output_cost = (entry["output_tokens"] / 1000) * pricing["output"]
            monthly_totals[entry["month"]] += input_cost + output_cost

        recent_months = sorted(monthly_totals.keys())[-3:]
        avg_monthly = statistics.mean([monthly_totals[m] for m in recent_months])
        return {
            "current_monthly": avg_monthly,
            "next_month_forecast": avg_monthly * (1 + growth_rate),
            "quarterly_forecast": avg_monthly * (1 + growth_rate) ** 3,
            "annual_forecast": sum(
                avg_monthly * (1 + growth_rate) ** m
                for m in range(12)
            ),
            "growth_rate_assumed": growth_rate,
        }

    def what_if_scenario(self, current: dict, changes: dict) -> dict:
        new_monthly = current["current_monthly"]
        for change, value in changes.items():
            if change == "cache_hit_rate":
                new_monthly *= 1 - (value * 0.7)
            elif change == "model_switch":
                old_model, new_model = value
                old_price = self.model_pricing[old_model]
                new_price = self.model_pricing[new_model]
                ratio = (new_price["input"] + new_price["output"]) / (old_price["input"] + old_price["output"])
                new_monthly *= ratio
        return {"current": current["current_monthly"], "projected": new_monthly, "savings": current["current_monthly"] - new_monthly}
```

### Budget Allocation
```python
class BudgetManager:
    def __init__(self, total_budget: float):
        self.total_budget = total_budget
        self.allocations = {
            "production_inference": 0.6,
            "development_testing": 0.15,
            "evaluation": 0.1,
            "training": 0.1,
            "monitoring": 0.05,
        }

    def allocate(self) -> dict:
        return {
            category: self.total_budget * fraction
            for category, fraction in self.allocations.items()
        }

    def check_budget_health(self, spending: dict) -> dict:
        alerts = []
        for category, spent in spending.items():
            allocated = self.total_budget * self.allocations.get(category, 0)
            usage_ratio = spent / max(allocated, 1)

            if usage_ratio > 0.9:
                alerts.append(f"CRITICAL: {category} at {usage_ratio:.0%} of budget")
            elif usage_ratio > 0.75:
                alerts.append(f"WARNING: {category} at {usage_ratio:.0%} of budget")

        total_spent = sum(spending.values())
        total_ratio = total_spent / self.total_budget

        return {
            "total_usage_ratio": total_ratio,
            "category_breakdown": spending,
            "alerts": alerts,
            "remaining_budget": self.total_budget - total_spent,
            "on_track": total_ratio < 0.8,
        }
```

## Optimization Strategies

### Model Selection Optimization
```python
class ModelRouter:
    def __init__(self):
        self.routes = {
            "simple_qa": {"model": "gpt-4o-mini", "max_tokens": 200, "cost_per_call": 0.0003},
            "complex_reasoning": {"model": "gpt-4o", "max_tokens": 2000, "cost_per_call": 0.015},
            "code_generation": {"model": "claude-3.5-sonnet", "max_tokens": 4000, "cost_per_call": 0.03},
            "embedding": {"model": "text-embedding-3-small", "cost_per_call": 0.00002},
        }

    def route_request(self, request: dict) -> str:
        if self.is_simple_query(request):
            return "simple_qa"
        elif self.needs_code(request):
            return "code_generation"
        elif self.needs_reasoning(request):
            return "complex_reasoning"
        return "simple_qa"

    def is_simple_query(self, request: dict) -> bool:
        return len(request["input"]) < 100 and not any(
            kw in request["input"].lower()
            for kw in ["code", "explain", "analyze", "compare", "why", "how"]
        )
```

### Caching Strategy
```python
class MultiLayerCache:
    def __init__(self):
        self.hit_rates = {"exact": 0.0, "semantic": 0.0}

    def track_savings(self):
        daily_requests = 100000
        avg_cost = 0.002
        savings = 0

        if self.hit_rates["exact"] > 0:
            exact_saved = daily_requests * self.hit_rates["exact"] * avg_cost
            savings += exact_saved

        if self.hit_rates["semantic"] > 0:
            semantic_saved = daily_requests * self.hit_rates["semantic"] * avg_cost * 0.9
            savings += semantic_saved

        return {
            "daily_savings": savings,
            "monthly_savings": savings * 30,
            "annual_savings": savings * 365,
        }
```

## Cost Monitoring

```python
class CostMonitor:
    def __init__(self):
        self.daily_costs = defaultdict(float)
        self.model_costs = defaultdict(lambda: defaultdict(float))

    def record_call(self, model: str, input_tokens: int, output_tokens: int, user_id: str = ""):
        pricing = self.model_pricing.get(model, {"input": 0, "output": 0})
        cost = (input_tokens / 1000) * pricing["input"] + (output_tokens / 1000) * pricing["output"]
        date = datetime.utcnow().strftime("%Y-%m-%d")
        self.daily_costs[date] += cost
        self.model_costs[model][date] += cost
        return cost

    def report(self, days: int = 30) -> dict:
        recent_dates = sorted(self.daily_costs.keys())[-days:]
        return {
            "total_cost": sum(self.daily_costs[d] for d in recent_dates),
            "daily_average": statistics.mean([self.daily_costs[d] for d in recent_dates]),
            "model_breakdown": {
                model: sum(costs.values())
                for model, costs in self.model_costs.items()
            },
        }

    def detect_anomaly(self, model: str) -> bool:
        cost_history = list(self.model_costs[model].values())
        if len(cost_history) < 7:
            return False
        recent = statistics.mean(cost_history[-3:])
        historical = statistics.mean(cost_history[:-3])
        return recent > historical * 2
```

## Key Points
- Break down costs: inference, training, infrastructure, tooling
- Forecast usage with growth assumptions (20% month-over-month typical)
- Allocate budget by category (60% production, 15% dev, 10% eval, etc.)
- Route simple queries to cheaper models (40-70% savings)
- Implement multi-layer caching (exact + semantic)
- Set budgets per team/department for accountability
- Monitor daily cost per model and per user
- Alert on cost anomalies (>2x baseline)
- Review cost optimization opportunities monthly
- Consider self-hosting at >10M tokens/day threshold
