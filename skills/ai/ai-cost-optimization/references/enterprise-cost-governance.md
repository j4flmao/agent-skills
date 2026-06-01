# Enterprise Cost Governance Framework

## Overview
Enterprise cost governance for AI inference goes beyond individual optimizations to establish organizational structures, policies, and processes that ensure AI costs remain predictable, accountable, and aligned with business value. This framework covers budget lifecycle management, chargeback/showback models, cost review boards, policy enforcement, and FinOps maturity for AI.

## Governance Structure

### Cost Governance Organization

```
Executive Sponsor (VP/Director)
├── AI Cost Review Board (monthly)
│   ├── Engineering Lead — model usage decisions
│   ├── FinOps Lead — budget allocation, forecasting
│   ├── Product Lead — feature cost trade-offs
│   └── ML Lead — optimization implementation
│
├── Team-Level Cost Owners (weekly)
│   ├── Track team spend vs budget
│   ├── Review optimization opportunities
│   └── Escalate budget issues
│
└── Optimization Working Group (bi-weekly)
    ├── Implement cost-saving features
    ├── Monitor optimization ROI
    └── Share best practices
```

### Roles and Responsibilities

| Role | Responsibilities | Authority |
|---|---|---|
| Executive Sponsor | Approve AI budget, resolve escalations | Budget approval, policy exceptions |
| Cost Review Board | Set cost policies, review monthly spend, approve major optimizations | Policy creation, budget allocation |
| Engineering Lead | Optimize model usage, implement routing/caching | Model selection, routing config |
| FinOps Lead | Track spend, forecast costs, manage chargeback | Budget tracking, cost allocation |
| ML Lead | Evaluate quality-cost tradeoffs, manage distillation | Model evaluation, optimization prioritization |
| Team Cost Owners | Monitor team budget, implement team-level optimizations | Team-level routing, cache config |

## Budget Lifecycle

### Annual Budget Planning

```python
class BudgetPlanner:
    def plan_annual(
        self,
        current_monthly_spend: float,
        expected_growth_rate: float,  # e.g., 0.15 for 15%
        optimization_savings_expected: float,  # e.g., 0.30 for 30%
        buffer_pct: float = 0.10,
    ) -> dict:
        monthly_growing = current_monthly_spend * (1 + expected_growth_rate)
        monthly_optimized = monthly_growing * (1 - optimization_savings_expected)
        monthly_budget = monthly_optimized * (1 + buffer_pct)
        return {
            "current_monthly": round(current_monthly_spend, 2),
            "projected_monthly_no_opt": round(monthly_growing, 2),
            "projected_monthly_with_opt": round(monthly_optimized, 2),
            "recommended_monthly_budget": round(monthly_budget, 2),
            "annual_budget": round(monthly_budget * 12, 2),
            "optimization_target_pct": round(optimization_savings_expected * 100, 1),
            "growth_assumption_pct": round(expected_growth_rate * 100, 1),
        }

    def allocate_to_teams(self, total_budget: float,
                          team_allocations: dict[str, float]) -> dict[str, float]:
        allocated = {}
        remaining = total_budget
        for team, pct in sorted(team_allocations.items(), key=lambda x: -x[1]):
            team_budget = total_budget * pct
            allocated[team] = round(team_budget, 2)
            remaining -= team_budget
        allocated["shared_reserve"] = round(remaining, 2)
        return allocated
```

### Quarterly Budget Review

```
Review Cadence:
1. Actual spend vs budget (last quarter)
2. Volume growth vs forecast
3. Optimization savings realized vs target
4. New model releases and pricing changes
5. Adjustment recommendations for next quarter
6. Major optimization investments (distillation, self-hosting)
```

## Cost Allocation Models

### Allocation Dimensions

| Dimension | Granularity | Effort | Best For |
|---|---|---|---|
| Per-team | Team ID on API calls | Low | Most organizations |
| Per-user | User ID on API calls | Medium | Customer-facing apps |
| Per-feature | Feature flag in metadata | High | Product cost analysis |
| Per-customer | Customer ID in context | Medium | SaaS with per-customer costing |
| Per-environment | dev/staging/prod | Low | Internal cost management |

### Allocation Implementation

```python
from collections import defaultdict
from typing import Optional
import time

class CostAllocationEngine:
    def __init__(self):
        self.allocation_keys: dict[str, Callable] = {}
        self.unallocated_cost = 0.0

    def register_allocator(self, name: str, allocator_fn: Callable[[dict], Optional[str]]):
        self.allocation_keys[name] = allocator_fn

    def allocate(self, cost_record: dict) -> tuple[str, list[str]]:
        allocations = []
        for name, fn in self.allocation_keys.items():
            result = fn(cost_record)
            if result:
                allocations.append(f"{name}={result}")
        if not allocations:
            self.unallocated_cost += cost_record.get("cost", 0)
            return "unallocated", []
        return allocations[0].split("=")[1], allocations

    def summary(self, records: list[dict]) -> dict:
        by_team = defaultdict(lambda: {"cost": 0.0, "queries": 0, "tokens": 0})
        for r in records:
            team, _ = self.allocate(r)
            by_team[team]["cost"] += r.get("cost", 0)
            by_team[team]["queries"] += 1
            by_team[team]["tokens"] += r.get("input_tokens", 0) + r.get("output_tokens", 0)
        return {
            "by_team": dict(sorted(by_team.items(), key=lambda x: -x[1]["cost"])),
            "unallocated": round(self.unallocated_cost, 2),
            "total_allocated": round(sum(v["cost"] for v in by_team.values()), 2),
        }
```

### Showback Reporting

```python
class ShowbackReport:
    def generate(self, records: list[dict], period: str = "monthly",
                 allocation_engine: Optional[CostAllocationEngine] = None) -> str:
        if allocation_engine:
            summary = allocation_engine.summary(records)
        else:
            summary = self._basic_summary(records)
        lines = [
            f"AI Cost Showback Report - {period.upper()}",
            f"{'=' * 50}",
            "",
            f"Total AI Spend: ${summary.get('total_cost', 0):.2f}",
            f"Total Queries: {summary.get('total_queries', 0)}",
            f"Avg Cost/Query: ${summary.get('avg_cost', 0):.4f}",
            "",
            "Cost by Team:",
            "--------------",
        ]
        for team, data in sorted(summary.get("by_team", {}).items(),
                                  key=lambda x: -x[1]["cost"]):
            pct = data["cost"] / max(summary.get("total_cost", 1), 0.01) * 100
            lines.append(f"  {team:25s} ${data['cost']:>8.2f}  ({pct:5.1f}%)  {data['queries']:>6d} queries")
        lines.extend([
            "",
            "Cost by Model:",
            "--------------",
        ])
        for model, data in sorted(summary.get("by_model", {}).items(),
                                  key=lambda x: -x[1]["cost"]):
            lines.append(f"  {model:25s} ${data['cost']:>8.2f}  {data['queries']:>6d} queries")
        return "\n".join(lines)

    def _basic_summary(self, records: list[dict]) -> dict:
        by_team = defaultdict(lambda: {"cost": 0.0, "queries": 0, "tokens": 0})
        by_model = defaultdict(lambda: {"cost": 0.0, "queries": 0})
        total_cost = 0.0
        for r in records:
            team = r.get("team", "unknown")
            model = r.get("model", "unknown")
            cost = r.get("cost", 0)
            by_team[team]["cost"] += cost
            by_team[team]["queries"] += 1
            by_model[model]["cost"] += cost
            by_model[model]["queries"] += 1
            total_cost += cost
        return {
            "total_cost": total_cost,
            "total_queries": len(records),
            "avg_cost": total_cost / max(len(records), 1),
            "by_team": dict(by_team),
            "by_model": dict(by_model),
        }
```

## Policy Enforcement Framework

### Policy Types

```python
from enum import Enum

class PolicyAction(Enum):
    ALERT = "alert"
    AUTO_FALLBACK = "auto_fallback"
    RATE_LIMIT = "rate_limit"
    BLOCK = "block"

class PolicyScope(Enum):
    GLOBAL = "global"
    TEAM = "team"
    MODEL = "model"
    FEATURE = "feature"

@dataclass
class CostPolicy:
    name: str
    scope: PolicyScope
    scope_value: str  # e.g., team name, model name
    threshold: float  # e.g., 0.8 for 80% of budget
    action: PolicyAction
    fallback_model: Optional[str] = None
    enabled: bool = True
```

### Policy Engine

```python
class PolicyEngine:
    def __init__(self):
        self.policies: list[CostPolicy] = []

    def add_policy(self, policy: CostPolicy):
        self.policies.append(policy)

    def evaluate(self, request: dict, team_spend: dict,
                 model_spend: dict) -> list[tuple[CostPolicy, str]]:
        triggered = []
        for p in self.policies:
            if not p.enabled:
                continue
            if p.scope == PolicyScope.GLOBAL:
                ratio = team_spend.get("total", 0) / max(team_spend.get("budget", 1), 0.01)
            elif p.scope == PolicyScope.TEAM:
                ratio = team_spend.get(p.scope_value, 0) / max(team_spend.get(f"{p.scope_value}_budget", 1), 0.01)
            elif p.scope == PolicyScope.MODEL:
                ratio = model_spend.get(p.scope_value, 0) / max(model_spend.get(f"{p.scope_value}_budget", 1), 0.01)
            else:
                continue
            if ratio >= p.threshold:
                triggered.append((p, f"{p.name}: spend ratio {ratio:.0%} >= {p.threshold:.0%}"))
        return triggered

    def apply_action(self, triggered: list[tuple[CostPolicy, str]],
                     request: dict) -> dict:
        result = {"allowed": True, "actions": [], "model": request.get("model")}
        for policy, msg in triggered:
            result["actions"].append(msg)
            if policy.action == PolicyAction.BLOCK:
                result["allowed"] = False
                result["reason"] = msg
            elif policy.action == PolicyAction.AUTO_FALLBACK and policy.fallback_model:
                result["model"] = policy.fallback_model
            elif policy.action == PolicyAction.RATE_LIMIT:
                result["rate_limited"] = True
        return result
```

### Policy Templates

```python
class PolicyTemplates:
    @staticmethod
    def standard_three_tier(daily_budget: float) -> list[CostPolicy]:
        return [
            CostPolicy(
                name="Soft Warning",
                scope=PolicyScope.GLOBAL,
                scope_value="total",
                threshold=0.70,
                action=PolicyAction.ALERT,
            ),
            CostPolicy(
                name="Auto-Fallback to Cheap",
                scope=PolicyScope.GLOBAL,
                scope_value="total",
                threshold=0.85,
                action=PolicyAction.AUTO_FALLBACK,
                fallback_model="gpt-4o-mini",
            ),
            CostPolicy(
                name="Block Non-Critical",
                scope=PolicyScope.GLOBAL,
                scope_value="total",
                threshold=1.0,
                action=PolicyAction.BLOCK,
            ),
        ]

    @staticmethod
    def team_budget_policy(team: str, budget: float) -> list[CostPolicy]:
        return [
            CostPolicy(
                name=f"{team} Warning",
                scope=PolicyScope.TEAM,
                scope_value=team,
                threshold=0.80,
                action=PolicyAction.ALERT,
            ),
            CostPolicy(
                name=f"{team} Auto-Fallback",
                scope=PolicyScope.TEAM,
                scope_value=team,
                threshold=0.95,
                action=PolicyAction.AUTO_FALLBACK,
                fallback_model="gpt-4o-mini",
            ),
        ]
```

## Cost Visibility and Dashboard

### Key Dashboard Metrics

```
┌──────────────────────────────────────────────────────────────┐
│ AI Cost Dashboard — Real-Time                               │
├──────────────────────────────────────────────────────────────┤
│ Today's Spend: $452.30   Daily Budget: $1,000   Burn: 45%   │
│ MTD Spend: $8,230.45    MTD Budget: $30,000    ━━━━━━━ 27%  │
│ Monthly Forecast: $27,500 ▲ 8% vs last month                │
├──────────────────────────────────────────────────────────────┤
│ Cost by Model:            Cost by Team:                     │
│ GPT-4o         $3,200 ██  Engineering   $4,100 █████        │
│ GPT-4o-mini    $2,100 ██  Product       $2,300 ███          │
│ Claude Sonnet  $1,500 █   Research      $1,200 ██           │
│ Other          $1,430 █   Unallocated   $  630 ▓             │
├──────────────────────────────────────────────────────────────┤
│ Trends (7-day):                           Optimization ROI: │
│ Cost/Query: $0.0021 ────     Cache savings: $3,200/month    │
│ Cache Hit Rate: 32% ──▁▁    Routing savings: $5,400/month   │
│ Queries/Day: 185K ──▁▅▇    Total: $8,600/month ▓▓▓▓▓▓▓░░  │
└──────────────────────────────────────────────────────────────┘
```

### Dashboard Data Exporter

```python
class DashboardExporter:
    def __init__(self):
        self.metrics: dict[str, float] = {}

    def update_from_records(self, records: list[dict],
                            budgets: dict[str, float]):
        now = time.time()
        today_start = now - (now % 86400)
        month_start = now - (now % (86400 * 30))
        today_cost = sum(r["cost"] for r in records if r["timestamp"] >= today_start)
        month_cost = sum(r["cost"] for r in records if r["timestamp"] >= month_start)
        daily_budget = budgets.get("daily", 1000)
        monthly_budget = budgets.get("monthly", 30000)
        by_model = defaultdict(float)
        by_team = defaultdict(float)
        for r in records:
            by_model[r.get("model", "unknown")] += r.get("cost", 0)
            by_team[r.get("team", "unknown")] += r.get("cost", 0)
        month_days = (now - month_start) / 86400
        daily_avg = month_cost / max(month_days, 1)
        forecast = daily_avg * 30
        return {
            "timestamp": now,
            "today_cost": round(today_cost, 2),
            "month_cost": round(month_cost, 2),
            "daily_budget": daily_budget,
            "monthly_budget": monthly_budget,
            "daily_burn_pct": round(today_cost / max(daily_budget, 1) * 100, 1),
            "monthly_burn_pct": round(month_cost / max(monthly_budget, 1) * 100, 1),
            "forecast": round(forecast, 2),
            "forecast_vs_budget_pct": round(forecast / max(monthly_budget, 1) * 100, 1),
            "cost_by_model": dict(sorted(by_model.items(), key=lambda x: -x[1])),
            "cost_by_team": dict(sorted(by_team.items(), key=lambda x: -x[1])),
        }
```

## FinOps Maturity for AI

### Maturity Levels

| Level | Name | Characteristics | Governance | Automation |
|---|---|---|---|---|
| 1 | Ad-hoc | No tracking, no budgets, reactive | None | None |
| 2 | Aware | Basic cost tracking, manual reports | Monthly review | Manual alerts |
| 3 | Managed | Per-team budgets, cost allocation, showback | Cost review board | Automated alerts, basic enforcement |
| 4 | Optimized | Real-time dashboards, chargeback, optimization targets | Bi-weekly optimization reviews | Auto-fallback, anomaly detection |
| 5 | Automated | ML-driven cost optimization, predictive budgeting | Quarterly strategic reviews | Full policy automation, auto-scaling |

### Maturity Assessment

```python
class FinOpsMaturity:
    def __init__(self):
        self.dimensions = {
            "visibility": {
                "1": "No cost tracking",
                "2": "Monthly manual reports",
                "3": "Real-time dashboard per team",
                "4": "Real-time + forecasting + anomaly detection",
                "5": "Predictive + automated recommendations",
            },
            "accountability": {
                "1": "No ownership",
                "2": "Central FinOps team tracks costs",
                "3": "Team-level cost owners with showback",
                "4": "Chargeback with team budgets",
                "5": "Automated budget enforcement with fallback",
            },
            "optimization": {
                "1": "No optimization",
                "2": "Manual cache + routing",
                "3": "Automated routing + batching",
                "4": "ML-driven routing + cascade + distillation",
                "5": "Self-optimizing pipeline with A/B testing",
            },
            "governance": {
                "1": "No policies",
                "2": "Informal budget caps",
                "3": "Written policies with monthly review",
                "4": "Automated policy enforcement with escalation",
                "5": "Adaptive policies based on usage patterns",
            },
        }

    def assess(self, scores: dict[str, int]) -> dict:
        overall = []
        details = {}
        for dim, score in scores.items():
            level = str(min(max(score, 1), 5))
            desc = self.dimensions.get(dim, {}).get(level, "Unknown")
            details[dim] = {"score": score, "description": desc}
            overall.append(score)
        avg = sum(overall) / max(len(overall), 1)
        maturity = "Ad-hoc" if avg < 1.5 else "Aware" if avg < 2.5 else "Managed" if avg < 3.5 else "Optimized" if avg < 4.5 else "Automated"
        return {
            "overall_score": round(avg, 1),
            "maturity_level": maturity,
            "details": details,
            "recommendations": self._recommendations(details),
        }

    def _recommendations(self, details: dict) -> list[str]:
        recs = []
        if details.get("visibility", {}).get("score", 0) < 3:
            recs.append("Implement real-time cost dashboard with per-team breakdowns")
        if details.get("accountability", {}).get("score", 0) < 3:
            recs.append("Assign team-level cost owners and implement showback reporting")
        if details.get("optimization", {}).get("score", 0) < 3:
            recs.append("Automate model routing and implement semantic caching")
        if details.get("governance", {}).get("score", 0) < 3:
            recs.append("Establish cost policies with automated enforcement tiers")
        return recs
```

## Cost Review Process

### Weekly Team Review

```
Agenda (30 min):
1. Team spend vs budget (5 min)
2. Optimization savings this week (5 min)
3. New cost anomalies or trends (5 min)
4. Optimization opportunities (10 min)
5. Action items for next week (5 min)
```

### Monthly Board Review

```
Agenda (60 min):
1. Executive summary: total spend, forecast, variance (10 min)
2. Model usage trends and routing effectiveness (10 min)
3. Optimization ROI: savings vs implementation cost (10 min)
4. Budget allocation review and adjustments (10 min)
5. Major investment decisions (distillation, self-hosting) (10 min)
6. Policy updates and exceptions (10 min)
```

### Quarterly Strategic Review

```
Agenda (90 min):
1. Year-to-date vs annual budget (15 min)
2. Model landscape changes (new models, pricing changes) (15 min)
3. Growth projections and capacity planning (15 min)
4. Optimization roadmap and investment decisions (20 min)
5. Policy and governance framework updates (15 min)
6. Executive decisions and escalations (10 min)
```

## Exception Handling

### Budget Exception Process

```python
@dataclass
class BudgetException:
    requestor: str
    team: str
    amount: float
    reason: str
    duration_days: int
    approved_by: Optional[str] = None
    approved_at: Optional[float] = None
    status: str = "pending"  # pending, approved, rejected

class ExceptionManager:
    def __init__(self):
        self.exceptions: list[BudgetException] = []
        self.approvers = {
            "< $500": "team lead",
            "$500 - $5,000": "engineering director",
            "$5,000 - $50,000": "cost review board",
            "> $50,000": "executive sponsor",
        }

    def request_exception(self, exc: BudgetException) -> str:
        self.exceptions.append(exc)
        approval_level = self._determine_approval_level(exc.amount)
        return f"Exception requested. Required approval: {approval_level}"

    def _determine_approval_level(self, amount: float) -> str:
        if amount < 500:
            return self.approvers["< $500"]
        elif amount < 5000:
            return self.approvers["$500 - $5,000"]
        elif amount < 50000:
            return self.approvers["$5,000 - $50,000"]
        return self.approvers["> $50,000"]

    def approve(self, exception_id: int, approver: str):
        for exc in self.exceptions:
            if id(exc) == exception_id:
                exc.status = "approved"
                exc.approved_by = approver
                exc.approved_at = time.time()
                return True
        return False

    def active_exceptions(self) -> list[BudgetException]:
        now = time.time()
        return [
            e for e in self.exceptions
            if e.status == "approved"
            and e.approved_at
            and (now - e.approved_at) < e.duration_days * 86400
        ]
```

## Key Points
- Enterprise AI cost governance requires organizational structure, not just tooling
- Budget lifecycle: plan (annual) → allocate (quarterly) → track (daily) → review (monthly)
- Showback (information only) before chargeback (budget deduction)
- Three-tier budget enforcement: soft (alert), warning (fallback), hard (block)
- Policy engine enables automated enforcement without manual intervention
- Cost allocation requires metadata (team, feature, customer) on every API call
- Maturity model: Ad-hoc → Aware → Managed → Optimized → Automated
- Weekly team reviews catch issues early; monthly board reviews drive strategy
- Exception process prevents bureaucracy from blocking legitimate needs
- Forecasting with growth and optimization assumptions enables proactive budgeting
- Unallocated costs should be < 5% of total — missing metadata is a governance gap
- Dashboard visibility is the foundation of accountability
- FinOps for AI differs from cloud FinOps — focus on token economics, not just GPU hours
- Cost review board should include engineering, finance, product, and ML representatives
- Every exception creates a follow-up action to prevent recurrence
