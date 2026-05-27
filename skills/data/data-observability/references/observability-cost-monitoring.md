# Observability Cost Monitoring

## Cost of Data Observability

Monitoring data pipelines and quality has its own cost that must be managed.

### Monitoring Cost Sources

```python
@dataclass
class MonitoringCost:
    category: str
    description: str
    monthly_cost: Decimal
    cost_driver: str
    optimization_potential: str

class CostAnalyzer:
    def analyze_monitoring_costs(self) -> list[MonitoringCost]:
        return [
            MonitoringCost("compute", "Monitor query execution", Decimal("500"),
                           "Query complexity and frequency", "medium"),
            MonitoringCost("storage", "Monitor result storage", Decimal("200"),
                           "Retention period", "high"),
            MonitoringCost("data_scan", "Full table scans for profiling", Decimal("1500"),
                           "Table size and scan frequency", "high"),
            MonitoringCost("alerting", "Alert infrastructure", Decimal("300"),
                           "Number of alert rules", "low"),
        ]

    def get_monitoring_cost_ratio(self, total_platform_cost: Decimal) -> float:
        return sum(c.monthly_cost for c in self.analyze_monitoring_costs()) / total_platform_cost
```

### Optimization Strategies

```python
class MonitoringOptimizer:
    def optimize_scan_frequency(self, tables: list[TableProfile]):
        recommendations = []
        for table in tables:
            if table.change_frequency == "low" and table.scan_frequency == "high":
                recommendations.append(ScanOptimization(
                    table=table.name,
                    current_frequency=table.scan_frequency,
                    recommended_frequency="daily",
                    estimated_savings=table.scan_cost * 0.6,
                ))
            elif table.size_gb > 100 and table.profile_type == "full":
                recommendations.append(ScanOptimization(
                    table=table.name,
                    current_frequency="full_scan",
                    recommended_frequency="sampled",
                    sample_rate=0.1,
                    estimated_savings=table.scan_cost * 0.9,
                ))
        return recommendations

    def optimize_retention(self, current_retention_days: int) -> RetentionRecommendation:
        savings_by_day = {
            7: current_retention_days > 7 and (current_retention_days - 7) * 50,
            14: current_retention_days > 14 and (current_retention_days - 14) * 30,
            30: current_retention_days > 30 and (current_retention_days - 30) * 10,
        }
        best = min(
            (days for days, saving in savings_by_day.items() if saving),
            key=lambda d: savings_by_day[d],
            default=None,
        )
        if best and best < current_retention_days:
            return RetentionRecommendation(
                current_days=current_retention_days,
                recommended_days=best,
                estimated_monthly_savings=savings_by_day[best],
            )
        return None
```

## Budgeting for Observability

```python
class ObservabilityBudgeter:
    def __init__(self, monthly_budget: Decimal):
        self.budget = monthly_budget
        self.allocation = {
            "compute_queries": monthly_budget * Decimal("0.3"),
            "storage": monthly_budget * Decimal("0.15"),
            "data_profiling": monthly_budget * Decimal("0.35"),
            "alerting_infra": monthly_budget * Decimal("0.1"),
            "dashboard_hosting": monthly_budget * Decimal("0.1"),
        }

    def track_spend(self, category: str, amount: Decimal):
        remaining = self.allocation[category] - amount
        if remaining < 0:
            AlertManager.send(
                severity="warning",
                message=f"Observability budget exceeded for {category}",
            )
        return remaining
```

## Key Points

- Monitoring costs 3-8% of total data platform spend
- Full table scans are the largest cost driver
- Optimize scan frequency based on table change frequency
- Sampled profiling reduces cost by 90% for large tables
- Reduce monitor result retention from 30 to 7-14 days
- Budget allocation: 35% profiling, 30% compute, 15% storage, 10% each for alerts/dashboards
- Monitor the cost of monitoring itself
- Consolidate redundant monitors across teams
- Use incremental profiling instead of full scans
- Cache profile results for stable schemas
