# Data Quality Monitoring

## Continuous Data Quality Monitoring
Data quality monitoring is the practice of continuously measuring, tracking, and alerting on the quality of data as it flows through pipelines. Unlike one-time validation, monitoring provides ongoing visibility into data health trends.

## Quality Metrics Framework

### Core Dimensions
| Dimension | Definition | Example |
|-----------|------------|---------|
| Completeness | All required data is present | No NULLs in required columns |
| Accuracy | Data reflects real-world values | Order totals match source system |
| Consistency | Data agrees across systems | Customer email same in CRM and warehouse |
| Timeliness | Data is available when needed | Orders visible within 5 minutes |
| Uniqueness | No unwanted duplicates | No duplicate order_ids |
| Integrity | Relationships are maintained | Every order has a valid customer |
| Validity | Data conforms to schema | Values within allowed ranges |

### Trend-Based Monitoring
```python
class TrendMonitor:
    def __init__(self, warehouse, alert_threshold=3):
        self.warehouse = warehouse
        self.alert_threshold = alert_threshold

    def detect_anomaly(self, table, column, metric):
        """Detect anomalies using z-score against 30-day rolling window."""
        query = f"""
            WITH stats AS (
                SELECT
                    AVG({metric}) as mean,
                    STDDEV({metric}) as stddev
                FROM quality_metrics
                WHERE table_name = '{table}'
                AND column_name = '{column}'
                AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
            ),
            current AS (
                SELECT {metric} as current_value
                FROM quality_metrics
                WHERE table_name = '{table}'
                AND column_name = '{column}'
                AND metric_date = CURRENT_DATE
            )
            SELECT
                current_value,
                mean,
                stddev,
                ABS(current_value - mean) / NULLIF(stddev, 0) as z_score
            FROM current CROSS JOIN stats
        """
        result = self.warehouse.query(query)
        if result and result["z_score"] > self.alert_threshold:
            return {
                "table": table,
                "column": column,
                "metric": metric,
                "current": result["current_value"],
                "expected": result["mean"],
                "z_score": result["z_score"],
                "status": "anomaly"
            }
        return {"table": table, "column": column, "status": "normal"}
```

## Quality Monitoring Architecture

### Pipeline Integration
```python
from datetime import datetime

class QualityMonitorPipeline:
    def __init__(self, db_connection):
        self.db = db_connection
        self.metrics_table = "quality_metrics"

    def record_metric(self, table_name, dimension, metric_name, metric_value):
        """Record a quality metric measurement."""
        query = f"""
            INSERT INTO {self.metrics_table}
            (table_name, dimension, metric_name, metric_value, measured_at)
            VALUES (:table, :dim, :metric, :value, :ts)
        """
        self.db.execute(query, {
            "table": table_name,
            "dim": dimension,
            "metric": metric_name,
            "value": metric_value,
            "ts": datetime.utcnow()
        })

    def record_completeness(self, table, column, total_rows, null_count):
        completeness = 1 - (null_count / total_rows) if total_rows > 0 else 1
        self.record_metric(table, "completeness", f"{column}_null_rate", completeness)

    def record_uniqueness(self, table, column, total_rows, unique_count):
        uniqueness = unique_count / total_rows if total_rows > 0 else 1
        self.record_metric(table, "uniqueness", f"{column}_unique_rate", uniqueness)

    def record_timeliness(self, table, max_timestamp, sla_hours):
        age_hours = (datetime.utcnow() - max_timestamp).total_seconds() / 3600
        on_time = 1 if age_hours <= sla_hours else 0
        self.record_metric(table, "timeliness", "sla_met", on_time)
```

### Automated Collection
```yaml
# quality_monitor_config.yaml
monitors:
  - table: fact_orders
    dimensions:
      - completeness
      - accuracy
      - uniqueness
    schedule: "every 15 minutes"
    checks:
      - type: row_count
        min: 10000
        max: 1000000
      - type: null_rate
        columns: [order_id, customer_id, total_amount]
        max_null_rate: 0.001
      - type: freshness
        timestamp_column: created_at
        max_lag_minutes: 30
        sla_hours: 24

  - table: dim_customer
    dimensions:
      - completeness
      - uniqueness
    schedule: "hourly"
    checks:
      - type: row_count
        min: 1000
      - type: null_rate
        columns: [customer_id, email]
        max_null_rate: 0
      - type: duplicate_rate
        key_columns: [customer_id]
        max_duplicate_rate: 0
```

## Visualization and Dashboards

### Quality Score Dashboard
```sql
-- Daily quality score by dimension
SELECT
    measured_at::date as metric_date,
    dimension,
    AVG(metric_value) as avg_score,
    COUNT(*) as measurement_count,
    SUM(CASE WHEN metric_value >= 0.99 THEN 1 ELSE 0 END) as passing_count
FROM quality_metrics
WHERE measured_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY 1, 2
```

### Alert Configuration
```yaml
alerts:
  completeness:
    - condition: null_rate > 0.05
      severity: critical
      channel: pagerduty
    - condition: null_rate > 0.01
      severity: warning
      channel: slack

  freshness:
    - condition: sla_miss
      severity: critical
      channel: pagerduty

  accuracy:
    - condition: total_amount_mismatch > 0.001
      severity: critical
      channel: pagerduty
    - condition: row_count_deviation > 0.2
      severity: warning
      channel: slack
```

## Key Points
- Monitor data quality continuously, not just at pipeline runtime
- Track quality metrics over time for trend-based anomaly detection
- Record metrics at multiple dimensions: completeness, accuracy, consistency, timeliness, uniqueness
- Use statistical methods (z-score, moving averages) for anomaly detection
- Integrate quality monitoring into data pipeline orchestration
- Create dashboards showing quality trends and current status
- Set up alerting with appropriate severity levels and notification channels
- Store quality metrics in a dedicated warehouse schema for historical analysis
- Implement automated quality checks as part of CI/CD pipelines
- Establish data quality SLAs and track performance against them
