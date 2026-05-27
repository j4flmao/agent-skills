# Data Quality Metrics

## Measuring Data Quality

Quantifiable data quality metrics enable objective assessment and improvement tracking.

### Quality Dimensions Framework

```python
from enum import Enum
from pydantic import BaseModel
from datetime import datetime

class QualityDimension(str, Enum):
    COMPLETENESS = "completeness"     # Are all records present?
    ACCURACY = "accuracy"             # Are values correct?
    CONSISTENCY = "consistency"       # Are values consistent across sources?
    TIMELINESS = "timeliness"         # Is data fresh enough?
    UNIQUENESS = "uniqueness"         # Are there duplicates?
    VALIDITY = "validity"             # Do values conform to format?
    INTEGRITY = "integrity"           # Are relationships intact?

class QualityMetric(BaseModel):
    dimension: QualityDimension
    table: str
    value: float  # 0.0 to 1.0
    threshold: float
    passed: bool
    timestamp: datetime
    sample_size: int

class QualityScorecard(BaseModel):
    table: str
    overall: float
    dimensions: dict[QualityDimension, float]
    trend: str  # improving, stable, declining
    data_volume: int
```

### Score Calculation

```python
class QualityScorer:
    def __init__(self):
        self.weights = {
            QualityDimension.COMPLETENESS: 0.2,
            QualityDimension.ACCURACY: 0.3,
            QualityDimension.CONSISTENCY: 0.15,
            QualityDimension.TIMELINESS: 0.1,
            QualityDimension.UNIQUENESS: 0.1,
            QualityDimension.VALIDITY: 0.1,
            QualityDimension.INTEGRITY: 0.05,
        }

    def compute_score(self, metrics: list[QualityMetric]) -> QualityScorecard:
        dim_scores = {}
        for dim in QualityDimension:
            dim_metrics = [m for m in metrics if m.dimension == dim]
            if dim_metrics:
                dim_scores[dim] = sum(m.value for m in dim_metrics) / len(dim_metrics)

        overall = sum(
            dim_scores.get(dim, 0) * weight
            for dim, weight in self.weights.items()
        )

        return QualityScorecard(
            table=metrics[0].table,
            overall=round(overall, 3),
            dimensions=dim_scores,
            trend=self._determine_trend(metrics),
            data_volume=sum(m.sample_size for m in metrics),
        )

    def _determine_trend(self, metrics: list[QualityMetric]) -> str:
        if len(metrics) < 2:
            return "stable"
        recent = [m.value for m in metrics[-3:]]
        if len(recent) > 1 and all(recent[i] >= recent[i-1] for i in range(1, len(recent))):
            return "improving"
        if len(recent) > 1 and all(recent[i] <= recent[i-1] for i in range(1, len(recent))):
            return "declining"
        return "stable"
```

## Threshold Management

```python
class ThresholdManager:
    def __init__(self):
        self.defaults = {
            QualityDimension.COMPLETENESS: 0.99,
            QualityDimension.ACCURACY: 0.95,
            QualityDimension.CONSISTENCY: 0.98,
            QualityDimension.TIMELINESS: 0.90,
            QualityDimension.UNIQUENESS: 0.99,
            QualityDimension.VALIDITY: 0.95,
            QualityDimension.INTEGRITY: 1.0,
        }
        self.overrides: dict[str, dict[QualityDimension, float]] = {}

    def get_threshold(self, table: str, dimension: QualityDimension) -> float:
        table_overrides = self.overrides.get(table, {})
        return table_overrides.get(dimension, self.defaults[dimension])
```

## Key Points

- Seven quality dimensions: completeness, accuracy, consistency, timeliness, uniqueness, validity, integrity
- Weighted scoring with higher weight on accuracy and completeness
- Threshold management with table-level overrides
- Trend detection: improving, stable, declining
- Scorecard provides single-number quality summary per table
- Alert when any dimension falls below threshold
- Calculate scores on scheduled basis (daily for critical tables)
- Track dimension scores over time for trend analysis
- Weighted overall score enables cross-table comparison
- Sample size tracking ensures statistical significance
