# Budget Monitoring and Alerting

## Overview

Effective cost optimization requires continuous monitoring. Without visibility into token consumption, model usage, and spending patterns, optimization efforts are guesswork. This reference covers budget tracking, cost allocation, alerting rules, and dashboarding for AI inference costs.

## Cost Tracking Architecture

### Core Tracker

```python
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict

@dataclass
class CostRecord:
    timestamp: float
    model: str
    input_tokens: int
    output_tokens: int
    input_cost: float
    output_cost: float
    total_cost: float
    query_id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    route: Optional[str] = None
    cache_hit: bool = False
    latency_ms: Optional[float] = None

class CostTracker:
    def __init__(self, model_pricing: Dict[str, Dict[str, float]]):
        self.model_pricing = model_pricing
        self.records: List[CostRecord] = []
        self.daily_budgets: Dict[str, float] = {}
        self.monthly_budgets: Dict[str, float] = {}

    def set_daily_budget(self, model: str, budget: float):
        self.daily_budgets[model] = budget

    def set_monthly_budget(self, model: str, budget: float):
        self.monthly_budgets[model] = budget

    def record_query(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        query_id: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        route: Optional[str] = None,
        cache_hit: bool = False,
        latency_ms: Optional[float] = None,
    ) -> CostRecord:
        pricing = self.model_pricing.get(model, {"input": 0, "output": 0})
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        record = CostRecord(
            timestamp=time.time(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            input_cost=input_cost,
            output_cost=output_cost,
            total_cost=input_cost + output_cost,
            query_id=query_id,
            user_id=user_id,
            session_id=session_id,
            route=route,
            cache_hit=cache_hit,
            latency_ms=latency_ms,
        )
        self.records.append(record)
        return record

    def cost_today(self, model: Optional[str] = None) -> float:
        today = datetime.now().date()
        return sum(
            r.total_cost
            for r in self.records
            if datetime.fromtimestamp(r.timestamp).date() == today
            and (model is None or r.model == model)
        )

    def cost_this_month(self, model: Optional[str] = None) -> float:
        now = datetime.now()
        return sum(
            r.total_cost
            for r in self.records
            if datetime.fromtimestamp(r.timestamp).month == now.month
            and datetime.fromtimestamp(r.timestamp).year == now.year
            and (model is None or r.model == model)
        )

    def budget_remaining_today(self, model: Optional[str] = None) -> float:
        budget = self.daily_budgets.get(model or "total", float("inf"))
        return budget - self.cost_today(model)

    def budget_remaining_monthly(self, model: Optional[str] = None) -> float:
        budget = self.monthly_budgets.get(model or "total", float("inf"))
        return budget - self.cost_this_month(model)
```

### Multi-Tenant Cost Allocation

```python
from collections import defaultdict

class CostAllocator:
    def __init__(self, tracker: CostTracker):
        self.tracker = tracker

    def cost_by_user(self, top_n: int = 10) -> Dict[str, float]:
        user_costs = defaultdict(float)
        for r in self.tracker.records:
            if r.user_id:
                user_costs[r.user_id] += r.total_cost
        return dict(sorted(user_costs.items(), key=lambda x: -x[1])[:top_n])

    def cost_by_route(self) -> Dict[str, float]:
        route_costs = defaultdict(float)
        for r in self.tracker.records:
            if r.route:
                route_costs[r.route] += r.total_cost
        return dict(sorted(route_costs.items(), key=lambda x: -x[1]))

    def cost_by_model(self) -> Dict[str, Dict]:
        model_stats = defaultdict(lambda: {"cost": 0.0, "queries": 0, "tokens": 0})
        for r in self.tracker.records:
            model_stats[r.model]["cost"] += r.total_cost
            model_stats[r.model]["queries"] += 1
            model_stats[r.model]["tokens"] += r.input_tokens + r.output_tokens
        return dict(model_stats)

    def cost_by_hour(self, days: int = 7) -> Dict[str, float]:
        hourly = defaultdict(float)
        cutoff = time.time() - days * 86400
        for r in self.tracker.records:
            if r.timestamp >= cutoff:
                hour_key = datetime.fromtimestamp(r.timestamp).strftime("%Y-%m-%d %H:00")
                hourly[hour_key] += r.total_cost
        return dict(sorted(hourly.items()))
```

## Alerting Rules

### Budget Threshold Alerts

```python
import smtplib
from typing import List, Callable

class BudgetAlert:
    def __init__(self, name: str, threshold_pct: float, window: str = "daily"):
        self.name = name
        self.threshold = threshold_pct
        self.window = window
        self.triggered = False

    def check(self, tracker: CostTracker) -> Optional[str]:
        if self.window == "daily":
            for model in tracker.daily_budgets:
                spent = tracker.cost_today(model)
                budget = tracker.daily_budgets[model]
                if budget > 0 and (spent / budget * 100) >= self.threshold and not self.triggered:
                    self.triggered = True
                    return f"Alert: {self.name} - {model} spent {spent:.2f} ({spent/budget*100:.1f}% of daily budget)"
        return None

    def reset(self):
        self.triggered = False


class AnomalyDetector:
    def __init__(self, lookback_days: int = 30, std_dev_threshold: float = 3.0):
        self.lookback_days = lookback_days
        self.std_dev_threshold = std_dev_threshold

    def build_baseline(self, tracker: CostTracker) -> Dict[str, float]:
        cutoff = time.time() - self.lookback_days * 86400
        daily_costs = defaultdict(float)
        for r in tracker.records:
            if r.timestamp >= cutoff:
                day = datetime.fromtimestamp(r.timestamp).date().isoformat()
                daily_costs[day] += r.total_cost
        values = list(daily_costs.values())
        if not values:
            return {"mean": 0, "std": 0}
        import statistics
        return {"mean": statistics.mean(values), "std": statistics.stdev(values) if len(values) > 1 else 0}

    def detect_spike(self, tracker: CostTracker) -> Optional[str]:
        baseline = self.build_baseline(tracker)
        today_cost = tracker.cost_today()
        if baseline["std"] > 0:
            z_score = (today_cost - baseline["mean"]) / baseline["std"]
            if z_score > self.std_dev_threshold:
                return f"Spike detected: today {today_cost:.2f} is {z_score:.1f} std above mean {baseline['mean']:.2f}"
        return None

    def detect_model_shift(self, tracker: CostTracker) -> Optional[str]:
        cutoff = time.time() - 7 * 86400
        recent = [r for r in tracker.records if r.timestamp >= cutoff]
        older = [r for r in tracker.records if r.timestamp < cutoff and r.timestamp >= cutoff - 7 * 86400]
        if not older or not recent:
            return None
        def model_share(records):
            costs = defaultdict(float)
            total = sum(r.total_cost for r in records)
            for r in records:
                costs[r.model] += r.total_cost
            if total > 0:
                return {m: c/total*100 for m, c in costs.items()}
            return {}
        recent_share = model_share(recent)
        older_share = model_share(older)
        shifts = []
        for model in set(list(recent_share.keys()) + list(older_share.keys())):
            diff = abs(recent_share.get(model, 0) - older_share.get(model, 0))
            if diff > 20:
                shifts.append(f"{model}: {older_share.get(model,0):.0f}% -> {recent_share.get(model,0):.0f}%")
        if shifts:
            return f"Model usage shift detected: {', '.join(shifts)}"
        return None
```

### Alert Dispatchers

```python
class AlertDispatcher:
    def __init__(self):
        self.handlers: List[Callable] = []

    def add_handler(self, handler: Callable):
        self.handlers.append(handler)

    def dispatch(self, message: str):
        for handler in self.handlers:
            try:
                handler(message)
            except Exception as e:
                print(f"Alert handler failed: {e}")

def console_alert(message: str):
    print(f"[ALERT] {message}")

def email_alert(smtp_config: Dict):
    def send(message: str):
        with smtplib.SMTP(smtp_config["host"], smtp_config["port"]) as server:
            server.starttls()
            server.login(smtp_config["user"], smtp_config["password"])
            server.sendmail(
                smtp_config["from"],
                smtp_config["to"],
                f"Subject: AI Cost Alert\n\n{message}",
            )
    return send

def webhook_alert(webhook_url: str):
    import requests
    def send(message: str):
        requests.post(webhook_url, json={"text": message})
    return send
```

## Dashboard Integration

### Metrics Export for Prometheus

```python
from prometheus_client import Counter, Gauge, Histogram
import prometheus_client

cost_total = Counter("llm_cost_total_usd", "Total LLM cost in USD", ["model"])
tokens_input = Counter("llm_tokens_input_total", "Total input tokens", ["model"])
tokens_output = Counter("llm_tokens_output_total", "Total output tokens", ["model"])
cost_daily = Gauge("llm_cost_daily_usd", "Daily LLM cost in USD", ["model"])
latency = Histogram("llm_query_latency_ms", "Query latency in ms", ["model"], buckets=[50, 100, 200, 500, 1000, 2000, 5000])
queries = Counter("llm_queries_total", "Total queries", ["model", "route", "cache_hit"])
budget_remaining = Gauge("llm_budget_remaining_usd", "Remaining budget in USD", ["model", "window"])

class PrometheusExporter:
    def export_record(self, record: CostRecord):
        cost_total.labels(model=record.model).inc(record.total_cost)
        tokens_input.labels(model=record.model).inc(record.input_tokens)
        tokens_output.labels(model=record.model).inc(record.output_tokens)
        queries.labels(
            model=record.model,
            route=record.route or "unknown",
            cache_hit=str(record.cache_hit),
        ).inc()
        if record.latency_ms:
            latency.labels(model=record.model).observe(record.latency_ms)

    def export_budgets(self, tracker: CostTracker):
        for model in tracker.daily_budgets:
            remaining = tracker.budget_remaining_today(model)
            budget_remaining.labels(model=model, window="daily").set(remaining)
        for model in tracker.monthly_budgets:
            remaining = tracker.budget_remaining_monthly(model)
            budget_remaining.labels(model=model, window="monthly").set(remaining)

    def start_http_server(self, port: int = 8000):
        prometheus_client.start_http_server(port)
```

## Cost Report Generation

### Scheduled Reports

```python
from datetime import datetime, timedelta
from typing import Dict, Optional

class CostReport:
    def __init__(self, tracker: CostTracker, allocator: CostAllocator):
        self.tracker = tracker
        self.allocator = allocator

    def generate_daily_report(self) -> str:
        today = datetime.now().strftime("%Y-%m-%d")
        lines = [f"AI Cost Report - {today}", "=" * 40, ""]
        lines.append(f"Total cost today: ${self.tracker.cost_today():.2f}")
        lines.append(f"Total cost this month: ${self.tracker.cost_this_month():.2f}")
        lines.append("")
        lines.append("Cost by Model:")
        for model, stats in self.allocator.cost_by_model().items():
            lines.append(f"  {model}: ${stats['cost']:.2f} ({stats['queries']} queries)")
        lines.append("")
        lines.append("Top Users:")
        for user, cost in self.allocator.cost_by_user(5).items():
            lines.append(f"  {user}: ${cost:.2f}")
        lines.append("")
        lines.append("Cost by Route:")
        for route, cost in self.allocator.cost_by_route().items():
            lines.append(f"  {route}: ${cost:.2f}")
        return "\n".join(lines)

    def generate_weekly_trend(self) -> str:
        lines = ["Weekly Cost Trend", "=" * 30, ""]
        for i in range(6, -1, -1):
            day = datetime.now() - timedelta(days=i)
            day_start = datetime(day.year, day.month, day.day).timestamp()
            day_end = day_start + 86400
            cost = sum(
                r.total_cost for r in self.tracker.records
                if day_start <= r.timestamp < day_end
            )
            lines.append(f"  {day.strftime('%a %b %d')}: ${cost:.2f}")
        lines.append("")
        lines.append("Optimization Opportunities:")
        for r in self.tracker.records:
            if r.total_cost > 0.01 and r.route == "simple" and r.model != "gpt-4o-mini":
                lines.append(f"  Query {r.query_id[:8]} used {r.model} for simple route (${r.total_cost:.4f})")
        return "\n".join(lines)
```

## Budget Enforcement

### Hard and Soft Limits

```python
import asyncio
from typing import Dict, Optional

class BudgetEnforcer:
    def __init__(self, tracker: CostTracker):
        self.tracker = tracker
        self.soft_limits: Dict[str, float] = {}
        self.hard_limits: Dict[str, float] = {}
        self.blocked: Dict[str, bool] = {}

    def set_soft_limit(self, model: str, daily_limit: float):
        self.soft_limits[model] = daily_limit

    def set_hard_limit(self, model: str, daily_limit: float):
        self.hard_limits[model] = daily_limit

    def check_budget(self, model: str) -> Dict:
        today_cost = self.tracker.cost_today(model)
        result = {"allowed": True, "reason": None}
        hard = self.hard_limits.get(model)
        if hard and today_cost >= hard:
            self.blocked[model] = True
            result["allowed"] = False
            result["reason"] = f"Hard limit reached: ${hard}"
        soft = self.soft_limits.get(model)
        if soft and today_cost >= soft:
            result["warning"] = f"Soft limit reached: ${soft}"
        return result

    def get_fallback_model(self, blocked_model: str) -> Optional[str]:
        fallbacks = {
            "gpt-4o": "gpt-4o-mini",
            "claude-opus": "claude-sonnet",
            "gemini-ultra": "gemini-pro",
        }
        return fallbacks.get(blocked_model)

    async def enqueue_with_budget_check(
        self,
        model: str,
        queue,
        prompt: str,
    ) -> str:
        check = self.check_budget(model)
        if not check["allowed"]:
            fallback = self.get_fallback_model(model)
            if fallback:
                return await queue.submit(fallback, prompt)
            raise BudgetExceededError(f"Budget exceeded for {model}")
        return await queue.submit(model, prompt)

class BudgetExceededError(Exception):
    pass
```

## Optimization ROI Tracking

### Measuring Savings

```python
class SavingsTracker:
    def __init__(self, baseline_cost_per_query: float):
        self.baseline = baseline_cost_per_query
        self.optimization_records: List[Dict] = []

    def record_optimization(self, name: str, before_cost: float, after_cost: float):
        self.optimization_records.append({
            "name": name,
            "before": before_cost,
            "after": after_cost,
            "savings": before_cost - after_cost,
            "savings_pct": (1 - after_cost / before_cost) * 100,
        })

    def total_savings(self) -> float:
        return sum(r["savings"] for r in self.optimization_records)

    def savings_by_optimization(self) -> List[Dict]:
        return sorted(self.optimization_records, key=lambda x: -x["savings"])

    def roi_summary(self, implementation_cost: float) -> Dict:
        savings = self.total_savings()
        payback_days = implementation_cost / savings if savings > 0 else float("inf")
        return {
            "total_savings": savings,
            "implementation_cost": implementation_cost,
            "net_benefit": savings - implementation_cost,
            "payback_period_days": payback_days,
            "monthly_savings_projected": savings * 30,
            "roi_pct": (savings - implementation_cost) / implementation_cost * 100 if implementation_cost > 0 else 0,
        }
```

## Key Points

- Track every query with model, tokens, cost, user, and route identifiers.
- Set daily and monthly budgets per model with soft warnings and hard limits.
- Use anomaly detection to catch cost spikes and model usage shifts automatically.
- Export metrics to Prometheus for Grafana dashboards and historical analysis.
- Generate daily cost reports broken down by model, user, and route.
- Implement budget enforcement with automatic fallback to cheaper models.
- Track optimization ROI by measuring before/after costs for each optimization.
- Alert on budget thresholds, anomaly spikes, and model routing shifts.
- Use multi-tenant allocation to charge costs back to specific teams or customers.
- Monitor cache hit rate as a leading indicator of cost efficiency.
- Set up hourly cost tracking for rapid feedback on optimization changes.
- Log all budget enforcement actions for audit and compliance.
- Review cost reports weekly to identify new optimization opportunities.
- Combine cost tracking with latency monitoring to avoid sacrificing performance for savings.
