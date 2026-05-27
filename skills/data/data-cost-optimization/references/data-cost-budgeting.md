# Data Cost Budgeting

## Budget Allocation Framework

Effective data cost management requires structured budgeting across teams, projects, and environments.

### Budget Model

```python
from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal

class DataBudget(BaseModel):
    id: str
    team: str
    project: str
    environment: str
    monthly_limit: Decimal
    quarterly_limit: Decimal
    annual_limit: Decimal
    start_date: date
    end_date: date
    alert_thresholds: list[float] = [0.5, 0.8, 0.9, 1.0]

class BudgetTracker:
    def __init__(self):
        self.budgets: dict[str, DataBudget] = {}
        self.spend: dict[str, list[DailySpend]] = {}

    def track_daily(self, budget_id: str, amount: Decimal, category: str):
        if budget_id not in self.spend:
            self.spend[budget_id] = []
        self.spend[budget_id].append(DailySpend(
            date=date.today(),
            amount=amount,
            category=category,
        ))

    def get_utilization(self, budget_id: str) -> BudgetUtilization:
        budget = self.budgets[budget_id]
        monthly = self._sum_period(budget_id, 30)
        quarterly = self._sum_period(budget_id, 90)
        annual = self._sum_period(budget_id, 365)

        return BudgetUtilization(
            budget_id=budget_id,
            monthly_spend=monthly,
            monthly_utilization=monthly / budget.monthly_limit,
            quarterly_spend=quarterly,
            quarterly_utilization=quarterly / budget.quarterly_limit,
            annual_spend=annual,
            annual_utilization=annual / budget.annual_limit,
        )
```

### Cost Allocation

```python
class CostAllocator:
    def __init__(self, tag_schema: dict[str, str]):
        self.tag_schema = tag_schema

    def allocate_query(self, query_info: QueryInfo) -> CostAllocation:
        # Determine cost center from tags
        cost_center = query_info.tags.get("cost_center", "unallocated")
        team = query_info.tags.get("team", "unknown")
        project = query_info.tags.get("project", "ad-hoc")

        return CostAllocation(
            cost_center=cost_center,
            team=team,
            project=project,
            environment=query_info.tags.get("environment", "production"),
            query_cost=query_info.cost,
            query_id=query_info.query_id,
        )

    def monthly_report(self, month: str) -> MonthlyReport:
        report = MonthlyReport(month=month)
        for allocation in self.allocations:
            if allocation.timestamp.strftime("%Y-%m") == month:
                report.add_allocation(allocation)
        report.compute_summaries()
        return report
```

## Budget Alerts

```python
class BudgetAlertManager:
    def __init__(self, notifier: Notifier):
        self.notifier = notifier

    def check_budgets(self, budgets: list[DataBudget]):
        for budget in budgets:
            utilization = self.compute_utilization(budget)
            for threshold in sorted(budget.alert_thresholds):
                if utilization >= threshold and not self._alerted(budget, threshold):
                    severity = "critical" if threshold >= 1.0 else \
                               "warning" if threshold >= 0.9 else "info"
                    self._send_alert(budget, threshold, utilization, severity)

    def compute_utilization(self, budget: DataBudget) -> float:
        current = self._get_current_spend(budget.id)
        return current / budget.monthly_limit if budget.monthly_limit > 0 else 0
```

## Key Points

- Budgets at team, project, and environment granularity
- Daily spend tracking with category breakdown
- Multi-period utilization: monthly, quarterly, annual
- Alert thresholds at 50%, 80%, 90%, and 100%
- Cost allocation via tags on queries and resources
- Monthly reports with cost center summaries
- Automatic alert acknowledgment to prevent duplicates
- Escalation to team leads at critical thresholds
- Budget rollover policies for unused allocation
- Chargeback/showback reports for cost transparency
