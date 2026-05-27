# Data Strategy Metrics

## Measuring Data Strategy Success

Data strategy effectiveness requires quantitative metrics across adoption, quality, and business impact.

### Key Performance Indicators

```python
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class DataStrategyKPIs(BaseModel):
    date: datetime
    data_literacy_score: float  # % of team trained
    data_quality_score: float   # weighted quality score
    catalog_coverage: float     # % of datasets documented
    self_service_ratio: float   # % of queries via self-service
    data_time_to_value: float   # hours from request to delivery
    data_roi: Decimal           # $ return per $ spent on data

class KPIHistory:
    def __init__(self):
        self.kpis: list[DataStrategyKPIs] = []

    def add_snapshot(self, kpi: DataStrategyKPIs):
        self.kpis.append(kpi)

    def get_trend(self, metric: str, months: int = 6) -> Trend:
        recent = sorted(self.kpis, key=lambda k: k.date)[-months:]
        if len(recent) < 2:
            return Trend(stable=True)

        values = [getattr(k, metric) for k in recent]
        slope = self._compute_slope(values)

        return Trend(
            direction="up" if slope > 0.01 else "down" if slope < -0.01 else "stable",
            slope=slope,
            current=values[-1],
            change_pct=((values[-1] - values[0]) / values[0] * 100) if values[0] != 0 else 0,
        )
```

### Maturity Progression

```python
class MaturityTracker:
    def __init__(self):
        self.levels = ["ad_hoc", "repeatable", "defined", "managed", "optimized"]

    def assess(self, capabilities: dict[str, float]) -> MaturityAssessment:
        scores = {}
        for capability, score in capabilities.items():
            level_idx = min(int(score * 5), 4)
            scores[capability] = {
                "score": score,
                "level": self.levels[level_idx],
                "next_milestone": self._next_milestone(capability, score),
            }

        overall = sum(capabilities.values()) / len(capabilities)

        return MaturityAssessment(
            overall_score=overall,
            overall_level=self.levels[min(int(overall * 5), 4)],
            capabilities=scores,
            recommended_focus=self._recommend_focus(scores),
        )
```

## Value Realization

```python
class ValueRealization:
    def __init__(self):
        self.initiatives: list[DataInitiative] = []

    def track_initiative(self, name: str, cost: Decimal, expected_roi: float):
        self.initiatives.append(DataInitiative(
            name=name,
            total_cost=cost,
            expected_roi=expected_roi,
            start_date=datetime.utcnow(),
        ))

    def report_value(self) -> ValueReport:
        total_investment = sum(i.total_cost for i in self.initiatives)
        realized_value = sum(i.measured_value for i in self.initiatives if i.measured_value)
        active_initiatives = [i for i in self.initiatives if i.status == "active"]

        return ValueReport(
            total_investment=total_investment,
            realized_value=realized_value,
            roi_ratio=realized_value / total_investment if total_investment > 0 else 0,
            active_initiatives=len(active_initiatives),
            data_products_count=sum(i.data_products for i in self.initiatives),
        )
```

## Key Points

- Six KPI categories: literacy, quality, catalog coverage, self-service, time-to-value, ROI
- Trend tracking over 6-month rolling window
- Maturity levels: ad hoc → repeatable → defined → managed → optimized
- Capability assessment per area with next milestone guidance
- Value realization tracking from initiative investment to measured returns
- Monthly KPI snapshots for reporting cadence
- ROI ratio shows return per dollar invested in data
- Self-service ratio measures democratization success
- Time-to-value tracks efficiency of data delivery
- Data literacy program completion tracked quarterly
