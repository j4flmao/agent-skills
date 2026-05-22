# Data Observability Dimensions

## Freshness

### Measurement

```sql
-- Expected vs actual freshness per table
WITH last_load AS (
  SELECT
    table_name,
    MAX(load_timestamp) AS last_data_ts,
    CURRENT_TIMESTAMP - MAX(load_timestamp) AS age
  FROM metadata.load_history
  GROUP BY table_name
)
SELECT
  table_name,
  expected_interval,
  age,
  CASE
    WHEN age < expected_interval * 1.5 THEN 'HEALTHY'
    WHEN age < expected_interval * 3 THEN 'WARNING'
    ELSE 'BREACH'
  END AS freshness_status
FROM last_load
JOIN metadata.freshness_sla USING (table_name)
```

### Expected Interval Configuration

| Interval | Cron Check | Breach After |
|---|---|---|
| **Real-time** | Every 5 min | 15 min |
| **Hourly** | Every 30 min | 2 hours |
| **Daily** | Every 2 hours | 30 hours |
| **Weekly** | Every 6 hours | 8 days |
| **Monthly** | Daily | 35 days |

## Volume

### Statistical Volume Detection

```python
import numpy as np
from scipy import stats

def detect_volume_anomaly(current_count, history_30d):
    mean = np.mean(history_30d)
    std = np.std(history_30d)
    z_score = abs(current_count - mean) / max(std, 1)
    upper_bound = mean + 3 * std
    lower_bound = mean - 3 * std
    return {
        "is_anomaly": z_score > 3,
        "z_score": z_score,
        "expected_range": (lower_bound, upper_bound),
        "suggested_action": "investigate" if z_score > 3 else "ok"
    }
```

### Volume Alert Rules

| Pattern | Likely Cause | Action |
|---|---|---|
| **Sudden drop (-80%)** | Pipeline failure, filter change | Check upstream job |
| **Sudden spike (+200%)** | Duplicate data, reprocess | Check for double load |
| **Gradual decline (7d)** | Source data loss, retention policy | Verify source system |
| **Zero rows** | Empty source, truncation, schema change | Critical alert |

## Distribution

### Column Profile (automated)

```sql
SELECT
  column_name,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT column_name) AS cardinality,
  SUM(CASE WHEN column_name IS NULL THEN 1 ELSE 0 END) AS null_count,
  ROUND(AVG(column_name::numeric), 2) AS mean,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY column_name), 2) AS median,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY column_name), 2) AS q1,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY column_name), 2) AS q3,
  ROUND(STDDEV(column_name), 2) AS stddev,
  ROUND(MIN(column_name), 2) AS min,
  ROUND(MAX(column_name), 2) AS max
FROM target_table;
```

### Distribution Drift Detection (KS Test)

```python
from scipy import stats

def check_distribution_drift(current_values, historical_values, p_threshold=0.01):
    statistic, p_value = stats.ks_2samp(current_values, historical_values)
    return {
        "drift_detected": p_value < p_threshold,
        "ks_statistic": statistic,
        "p_value": p_value,
        "severity": "HIGH" if p_value < 0.001 else "MEDIUM" if p_value < p_threshold else "OK"
    }
```

## Schema

### Schema Diff Detection

```sql
-- Current schema vs registered schema
SELECT
  COALESCE(c.column_name, r.column_name) AS column_name,
  c.data_type AS current_type,
  r.data_type AS registered_type,
  CASE
    WHEN c.column_name IS NULL THEN 'MISSING'
    WHEN r.column_name IS NULL THEN 'NEW'
    WHEN c.data_type != r.data_type THEN 'TYPE_CHANGE'
    ELSE 'MATCH'
  END AS status
FROM current_schema c
FULL OUTER JOIN registered_schema r USING (column_name)
WHERE c.column_name IS NULL OR r.column_name IS NULL OR c.data_type != r.data_type;
```

### Schema Change Severity

| Change | Severity | Action |
|---|---|---|
| **New column (nullable)** | LOW | Add to catalog, no alert |
| **New column (required)** | MEDIUM | Alert owner, check downstream |
| **Dropped column** | HIGH | Block pipeline if critical |
| **Type change** | HIGH | Alert, check compatibility |
| **NULL→NOT NULL** | MEDIUM | Check data quality |

## Lineage-Based Root Cause

```
Table fct_orders → stale (freshness breach)
  └── Upstream: stg_orders → failed (volume drop)
       └── Upstream: source_postgres → unreachable (connection timeout)
            └── Root cause: VPC peering removed (infra change)
```

Lineage graph traversal: BFS from affected node upstream. First node with error is likely root cause. Cross-reference with incident timeline and deployment history.
