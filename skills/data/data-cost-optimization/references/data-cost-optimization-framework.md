# Data Cost Optimization Framework

## Optimization Lifecycle

Data cost optimization follows a continuous cycle of measurement, analysis, optimization, and verification.

### Framework Structure

```python
class CostOptimizationFramework:
    def __init__(self):
        self.phases = [
            MeasurementPhase(),
            AnalysisPhase(),
            OptimizationPhase(),
            VerificationPhase(),
        ]
        self.optimizations: list[Optimization] = []

    def run_cycle(self, environment: str):
        report = CostReport(environment=environment)
        for phase in self.phases:
            phase.execute(report)
            if phase.blocking_issues:
                report.add_blockers(phase.blocking_issues)
        self.optimizations.extend(report.recommendations)
        return report
```

### Measurement Phase

```python
class MeasurementPhase:
    def execute(self, report: CostReport):
        metrics = {
            "compute_cost": self._measure_compute(),
            "storage_cost": self._measure_storage(),
            "network_cost": self._measure_network(),
            "query_cost": self._measure_queries(),
            "idle_cost": self._measure_idle(),
            "overprovisioned": self._measure_overprovisioned(),
        }
        report.add_metrics(metrics)

        # Cost breakdown by category
        breakdown = self._cost_breakdown()
        report.add_breakdown(breakdown)

        # Identify top 10 most expensive resources
        top_spenders = self._top_n(10)
        report.add_top_spenders(top_spenders)

    def _measure_idle(self) -> Decimal:
        # Resources running 24/7 with less than 10% utilization
        idle_resources = []
        for resource in self._get_resources():
            utilization = self._avg_utilization(resource, days=30)
            if utilization < 0.1:
                idle_resources.append(resource)
        return sum(r.monthly_cost for r in idle_resources)
```

### Analysis Phase

```python
class AnalysisPhase:
    def execute(self, report: CostReport):
        opportunities = []

        # Storage optimization
        storage = report.metrics["storage_cost"]
        cold_data = self._find_cold_data()
        if cold_data.estimated_savings > storage * 0.1:
            opportunities.append(OptimizationOpportunity(
                category="storage",
                action="Move cold data to cheaper tier",
                estimated_savings=cold_data.estimated_savings,
                effort="medium",
            ))

        # Compute optimization
        idle = report.metrics["idle_cost"]
        if idle > 100:
            opportunities.append(OptimizationOpportunity(
                category="compute",
                action="Implement auto-scaling and resource scheduling",
                estimated_savings=idle * 0.6,
                effort="high",
            ))

        # Query optimization
        query = report.metrics["query_cost"]
        inefficient = self._find_inefficient_queries()
        if inefficient.estimated_savings > query * 0.05:
            opportunities.append(OptimizationOpportunity(
                category="query",
                action="Optimize top expensive queries",
                estimated_savings=inefficient.estimated_savings,
                effort="medium",
            ))

        report.add_opportunities(opportunities)
```

## Implementation Priority Matrix

```python
class PriorityMatrix:
    def prioritize(self, opportunities: list[OptimizationOpportunity]) -> list[RankedOptimization]:
        ranked = []
        for opp in opportunities:
            score = self._compute_priority_score(opp)
            ranked.append(RankedOptimization(
                opportunity=opp,
                priority_score=score,
                recommendation=self._recommend_action(score),
            ))
        ranked.sort(key=lambda r: r.priority_score, reverse=True)
        return ranked

    def _compute_priority_score(self, opp: OptimizationOpportunity) -> float:
        savings_score = min(opp.estimated_savings / 1000, 10)
        effort_score = {"low": 10, "medium": 5, "high": 2}[opp.effort]
        risk_score = {"low": 1.0, "medium": 0.7, "high": 0.3}[opp.risk]
        return savings_score * 0.4 + effort_score * 0.35 + risk_score * 0.25
```

## Verification

```python
class VerificationPhase:
    def execute(self, report: CostReport):
        for opt in report.implemented_optimizations:
            before = opt.cost_before
            after = self._measure_cost(opt.resource)
            savings = before - after
            roi = savings / opt.implementation_cost if opt.implementation_cost > 0 else 0

            report.add_verification(OptimizationResult(
                optimization=opt,
                cost_before=before,
                cost_after=after,
                savings=savings,
                roi=roi,
                payback_days=opt.implementation_cost / savings * 30 if savings > 0 else None,
            ))
```

## Key Points

- Continuous cycle: measure → analyze → optimize → verify
- Identify idle resources (less than 10% utilization)
- Cold data tiering for storage savings
- Auto-scaling and scheduling for compute savings
- Query optimization targets top expensive queries
- Priority scoring by savings, effort, and risk
- ROI calculation for each implemented optimization
- 30-day measurement baseline before optimization
- Verification phase confirms actual vs estimated savings
- Monthly reporting tracks optimization progress over time
