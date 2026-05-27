# Warehouse Observability

## Monitoring Warehouse Health

Data warehouse observability covers query performance, storage, cost, and concurrency.

### Query Monitoring

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class QueryMetrics:
    query_id: str
    user: str
    warehouse: str
    duration_seconds: float
    bytes_scanned: int
    bytes_written: int
    credits_used: float
    queue_time_seconds: float
    start_time: datetime
    end_time: datetime

class WarehouseMonitor:
    def __init__(self, warehouse: WarehouseClient):
        self.warehouse = warehouse

    def get_active_queries(self) -> list[QueryMetrics]:
        return self.warehouse.execute("""
            SELECT query_id, user_name, warehouse_name,
                   DATEDIFF('second', start_time, CURRENT_TIMESTAMP) as duration,
                   bytes_scanned, bytes_written, credits_used,
                   queue_time
            FROM information_schema.query_history
            WHERE end_time IS NULL
            ORDER BY start_time DESC
        """)

    def get_slow_queries(self, threshold_seconds: int = 30) -> list[QueryMetrics]:
        return self.warehouse.execute(f"""
            SELECT *
            FROM query_history
            WHERE duration_seconds > {threshold_seconds}
              AND start_time >= DATEADD('hour', -24, CURRENT_TIMESTAMP)
            ORDER BY duration_seconds DESC
        """)
```

### Concurrency and Queuing

```python
class ConcurrencyMonitor:
    def __init__(self, warehouse: WarehouseClient):
        self.warehouse = warehouse

    def get_warehouse_utilization(self) -> WarehouseUtilization:
        metrics = self.warehouse.execute("""
            SELECT
                warehouse_name,
                running_queries,
                queued_queries,
                avg_queue_time_seconds,
                total_credits
            FROM information_schema.warehouse_metrics
            WHERE warehouse_name != 'CLOUD_SERVICES'
        """)
        return WarehouseUtilization(warehouses=metrics)

    def recommend_scaling(self, metrics: list[QueryMetrics]) -> ScalingRecommendation:
        avg_queue_time = sum(m.queue_time_seconds for m in metrics) / len(metrics)
        max_concurrency = max(m.concurrent_queries for m in metrics)

        if avg_queue_time > 30:
            return ScalingRecommendation(
                action="scale_up",
                reason=f"Average queue time {avg_queue_time:.0f}s exceeds 30s threshold",
                suggested_size=max_concurrency // 2 + 1,
            )
        elif avg_queue_time < 5 and self._is_underutilized():
            return ScalingRecommendation(
                action="scale_down",
                reason="Warehouse underutilized with low queue times",
                suggested_size=max(1, max_concurrency // 4),
            )

        return ScalingRecommendation(action="maintain", reason="Within acceptable thresholds")
```

## Key Points

- Monitor active queries, slow queries, and queue times
- Track credit/ slot consumption per warehouse
- Concurrency monitoring for warehouse sizing decisions
- Auto-scaling recommendations based on queue time thresholds
- Query profile analysis identifies expensive operations
- Storage usage trends for capacity planning
- Data freshness monitoring for loaded tables
- Clone and copy operation tracking for storage attribution
- Alert on warehouse suspension due to credit exhaustion
- History retention: 7 days detailed, 12 months aggregated
