# DataOps Observability

## Data Freshness

| Metric | Definition | Alert Threshold |
|--------|------------|-----------------|
| Table freshness | Time since last row update | > 1h (critical tables) |
| Pipeline latency | Time from source to target | > 2x expected duration |
| Batch delay | Scheduled run start time | > 15min late |
| Stream lag | Kafka consumer lag | > 1000 messages |

```sql
-- Data freshness check
SELECT
  table_name,
  MAX(updated_at) AS last_update,
  NOW() - MAX(updated_at) AS staleness
FROM information_schema.tables t
JOIN (
  SELECT 'orders' AS tbl, MAX(created_at) AS updated_at FROM orders
  UNION ALL
  SELECT 'payments', MAX(created_at) FROM payments
  UNION ALL
  SELECT 'inventory', MAX(updated_at) FROM inventory
) d ON d.tbl = t.table_name
GROUP BY table_name;
```

## Data Volume Monitoring

| Metric | What It Detects | Action |
|--------|-----------------|--------|
| Row count anomaly | Missing data or duplicates | Investigate source |
| Table size growth | Storage capacity planning | Scale storage/archive |
| Partition imbalance | Skewed data distribution | Repartition/rebalance |
| Null ratio spike | Data quality regression | Fix source pipeline |

## Schema Drift Detection

```yaml
# dbt exposure for column tracking
version: 2

models:
  - name: orders
    columns:
      - name: id
        data_type: UUID
        tests: [unique, not_null]
      - name: status
        data_type: VARCHAR
        accepted_values: ['pending', 'confirmed', 'shipped', 'cancelled']
      - name: total_amount
        data_type: DECIMAL(10,2)
```

```python
# Schema drift alert
def check_schema_drift(table: str, expected_schema: dict) -> List[str]:
    """Compare actual schema vs expected, return drift list."""
    actual = get_table_schema(table)
    drifts = []
    for col, expected_type in expected_schema.items():
        actual_type = actual.get(col)
        if actual_type and actual_type != expected_type:
            drifts.append(f"{col}: {actual_type} != {expected_type}")
        if col not in actual:
            drifts.append(f"{col}: missing")
    return drifts
```

## Data Lineage Integration

| Tool | Integration | Use Case |
|------|-------------|----------|
| dbt | Built-in lineage | Model dependency graph |
| Airflow / Dagster | DAG visualization | Pipeline dependency |
| OpenLineage | API-based | Cross-tool lineage |
| Atlan / DataHub | Catalog integration | Organizational lineage |

## Anomaly Detection

```python
# Statistical anomaly detection for data volume
import numpy as np
from scipy import stats

def detect_anomaly(current_count: int, historical_counts: List[int]) -> bool:
    """Z-score based anomaly detection."""
    mean = np.mean(historical_counts)
    std = np.std(historical_counts)
    if std == 0:
        return current_count != mean
    z_score = abs(current_count - mean) / std
    return z_score > 3  # 3 standard deviations
```

## Pipeline Observability

| Tool | Metrics | Alerts |
|------|---------|--------|
| Prometheus + Grafana | Run duration, success/fail, lag | Failure, timeout, lag > threshold |
| Datadog | Lineage, cost, freshness | Schema drift, freshness breach |
| Monte Carlo | Freshness, volume, schema, lineage | Auto-generated anomaly alerts |
| Soda | Data quality metrics | Quality check failures |
| Great Expectations | Expectation pass/fail rate | Below threshold pass rate |
