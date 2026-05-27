# Data Product Lifecycle

## Data Product Lifecycle Management

Data products in a mesh architecture follow a structured lifecycle from creation to retirement.

### Lifecycle Stages

```python
from enum import Enum
from datetime import datetime

class ProductStage(Enum):
    DESIGN = "design"
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    DEPRECATED = "deprecated"
    RETIRED = "retired"

class DataProduct:
    def __init__(self, product_id: str, domain: str):
        self.id = product_id
        self.domain = domain
        self.stage = ProductStage.DESIGN
        self.versions: list[ProductVersion] = []
        self.consumers: list[Consumer] = []
        self.sla: SLA = SLA.default()
        self.created_at = datetime.utcnow()

    def promote(self, target_stage: ProductStage):
        self._validate_promotion(target_stage)
        self.stage = target_stage
        self._notify_consumers(target_stage)

    def _validate_promotion(self, target: ProductStage):
        if target == ProductStage.PRODUCTION and not self.versions:
            raise ValueError("Must have at least one version to promote to production")
        if target == ProductStage.DEPRECATED and not self.consumers:
            self.stage = ProductStage.RETIRED
```

### Consumption Tracking

```python
class ConsumptionTracker:
    def __init__(self):
        self.consumptions: dict[str, list[ConsumptionRecord]] = {}

    def record_access(self, product_id: str, consumer: str, query: str):
        if product_id not in self.consumptions:
            self.consumptions[product_id] = []
        self.consumptions[product_id].append(ConsumptionRecord(
            consumer=consumer,
            query_pattern=self._hash_query(query),
            timestamp=datetime.utcnow(),
        ))

    def get_active_consumers(self, product_id: str, days: int = 30) -> list[str]:
        threshold = datetime.utcnow() - timedelta(days=days)
        records = self.consumptions.get(product_id, [])
        consumers = {r.consumer for r in records if r.timestamp >= threshold}
        return list(consumers)

    def get_usage_trend(self, product_id: str) -> UsageTrend:
        records = self.consumptions.get(product_id, [])
        if not records:
            return UsageTrend(trend="unknown")

        weekly_counts = {}
        for r in records:
            week = r.timestamp.isocalendar()[1]
            weekly_counts[week] = weekly_counts.get(week, 0) + 1

        return UsageTrend(trend=self._compute_trend(weekly_counts))
```

## Key Points

- Data products follow design → development → staging → production → retired
- Promotion validation ensures quality gates at each stage
- SLA definitions required before production promotion
- Consumption tracking enables deprecation decisions
- 30-day inactivity threshold for retirement consideration
- Consumer notification at each stage transition
- Version history maintained for rollback capability
- Product catalog discovery requires production stage
- Deprecated products maintain read access for 6 months
- Domain ownership preserved throughout lifecycle
