# Data Diff Testing Reference

## Data Comparison Tools

### data-diff CLI

data-diff is an open-source tool for comparing tables across databases.

```bash
# Basic usage: compare two tables
data-diff \
  --warehouse-type postgresql \
  --warehouse-type postgresql \
  --warehouse-conn "postgresql://user:pass@staging:5432/warehouse" \
  --warehouse-conn "postgresql://user:pass@prod:5432/warehouse" \
  "staging.analytics.fct_orders" \
  "prod.analytics.fct_orders" \
  -k order_id

# Compare with custom query
data-diff \
  --warehouse-type snowflake \
  --warehouse-type snowflake \
  --warehouse-conn "snowflake://user:pass@account/staging" \
  --warehouse-conn "snowflake://user:pass@account/prod" \
  "SELECT order_id, amount, status FROM analytics.fct_orders WHERE order_date >= '2026-05-01'" \
  "SELECT order_id, amount, status FROM analytics.fct_orders WHERE order_date >= '2026-05-01'" \
  -k order_id \
  --min-age 1h \
  --max-age 1h

# Output differences to JSON
data-diff \
  --warehouse-type postgresql \
  --warehouse-type postgresql \
  --warehouse-conn "$STAGING_CONN" \
  --warehouse-conn "$PROD_CONN" \
  "analytics.orders" "analytics.orders" \
  -k order_id \
  --output diff_results.json \
  --stats-only

# Threaded comparison for better performance
data-diff \
  ... \
  --threads 8 \
  --bisect-threshold 1000
```

### data-diff as Python Library

```python
from data_diff import connect_to_table, diff_tables

# Connect to tables
table1 = connect_to_table(
    "postgresql://user:pass@staging:5432/warehouse",
    "analytics.fct_orders",
    "order_id"
)

table2 = connect_to_table(
    "postgresql://user:pass@prod:5432/warehouse",
    "analytics.fct_orders",
    "order_id"
)

# Run diff
differences = list(diff_tables(table1, table2))

# Categorize differences
added = [d for d in differences if d[0] == '+']
removed = [d for d in differences if d[0] == '-']
changed = [d for d in differences if d[0] == '!']

print(f"Added rows: {len(added)}")
print(f"Removed rows: {len(removed)}")
print(f"Changed rows: {len(changed)}")

# Show specific differences
for change in changed[:5]:
    print(f"Row {change[1]}: was {change[2]}, now {change[3]}")
```

### dbt Test for Data Comparison

```sql
-- tests/generic/test_data_diff.sql
{% test data_diff(model, target_model, unique_key, tolerance_pct=0.0) %}
WITH source AS (
    SELECT * FROM {{ model }}
),
target AS (
    SELECT * FROM {{ target_model }}
),
diff AS (
    SELECT
        COALESCE(s.{{ unique_key }}, t.{{ unique_key }}) AS key,
        CASE
            WHEN s.{{ unique_key }} IS NULL THEN 'missing_in_source'
            WHEN t.{{ unique_key }} IS NULL THEN 'missing_in_target'
            ELSE 'values_differ'
        END AS diff_type
    FROM source s
    FULL OUTER JOIN target t ON s.{{ unique_key }} = t.{{ unique_key }}
    WHERE s.{{ unique_key }} IS NULL
       OR t.{{ unique_key }} IS NULL
)
SELECT * FROM diff
{% endtest %}
```

## Row-Level Diff

### Comparing Row Counts

```sql
-- Quick row count comparison
SELECT 'staging' AS env, COUNT(*) AS row_count FROM staging.fct_orders
UNION ALL
SELECT 'production', COUNT(*) FROM prod.fct_orders;

-- Row count by partition
SELECT
    order_date,
    COUNT(*) AS staging_count,
    NULL AS prod_count
FROM staging.fct_orders
WHERE order_date >= CURRENT_DATE - 7
GROUP BY order_date
UNION ALL
SELECT
    order_date,
    NULL,
    COUNT(*)
FROM prod.fct_orders
WHERE order_date >= CURRENT_DATE - 7
GROUP BY order_date
ORDER BY order_date;
```

### Detailed Row Comparison

```sql
-- Find rows in staging but not in prod
SELECT s.*
FROM staging.fct_orders s
LEFT JOIN prod.fct_orders p ON s.order_id = p.order_id
WHERE p.order_id IS NULL;

-- Find rows with different values
SELECT
    s.order_id,
    s.amount AS staging_amount,
    p.amount AS prod_amount,
    s.status AS staging_status,
    p.status AS prod_status
FROM staging.fct_orders s
JOIN prod.fct_orders p ON s.order_id = p.order_id
WHERE s.amount != p.amount
   OR s.status != p.status
   OR s.customer_id != p.customer_id;

-- Hash-based comparison for wide tables
SELECT
    MD5(s.order_id || s.customer_id || s.amount || s.status) AS staging_hash,
    MD5(p.order_id || p.customer_id || p.amount || p.status) AS prod_hash,
    s.order_id
FROM staging.fct_orders s
JOIN prod.fct_orders p ON s.order_id = p.order_id
WHERE staging_hash != prod_hash;
```

## Schema Diff

### Comparing Table Schemas

```sql
-- INFORMATION_SCHEMA comparison
SELECT
    'staging' AS env,
    column_name,
    data_type,
    is_nullable
FROM staging.INFORMATION_SCHEMA.COLUMNS
WHERE table_name = 'fct_orders'
UNION ALL
SELECT
    'production',
    column_name,
    data_type,
    is_nullable
FROM prod.INFORMATION_SCHEMA.COLUMNS
WHERE table_name = 'fct_orders'
ORDER BY column_name, env;

-- Find columns in one env but not the other
WITH staging_cols AS (
    SELECT column_name, data_type
    FROM staging.INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = 'fct_orders'
),
prod_cols AS (
    SELECT column_name, data_type
    FROM prod.INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = 'fct_orders'
)
SELECT
    COALESCE(s.column_name, p.column_name) AS column_name,
    CASE
        WHEN s.column_name IS NULL THEN 'missing_in_staging'
        WHEN p.column_name IS NULL THEN 'missing_in_prod'
        WHEN s.data_type != p.data_type THEN 'type_mismatch'
    END AS diff
FROM staging_cols s
FULL OUTER JOIN prod_cols p ON s.column_name = p.column_name
WHERE s.column_name IS NULL
   OR p.column_name IS NULL
   OR s.data_type != p.data_type;
```

### Automated Schema Diff Script

```python
def schema_diff(source_conn, target_conn, table_name):
    """Compare schemas between two environments."""
    source_cols = get_columns(source_conn, table_name)
    target_cols = get_columns(target_conn, table_name)

    source_set = {c['name']: c for c in source_cols}
    target_set = {c['name']: c for c in target_cols}

    diffs = {
        'added': [name for name in target_set if name not in source_set],
        'removed': [name for name in source_set if name not in target_set],
        'changed': [
            name for name in source_set
            if name in target_set and source_set[name]['type'] != target_set[name]['type']
        ],
    }

    result = {
        'table': table_name,
        'source_columns': len(source_cols),
        'target_columns': len(target_cols),
        'compatible': len(diffs['added']) == 0 and len(diffs['removed']) == 0,
        'diffs': diffs,
    }
    return result
```

## Volume Diff

### Data Volume Comparison

```sql
-- Total volume comparison
SELECT
    'staging' AS env,
    COUNT(*) AS row_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM staging.fct_orders
WHERE order_date >= CURRENT_DATE - 1

UNION ALL

SELECT
    'production',
    COUNT(*),
    SUM(amount),
    AVG(amount),
    COUNT(DISTINCT customer_id)
FROM prod.fct_orders
WHERE order_date >= CURRENT_DATE - 1;

-- Percentage difference
WITH stats AS (
    SELECT
        (SELECT COUNT(*) FROM staging.fct_orders WHERE order_date >= CURRENT_DATE - 1) AS staging_rows,
        (SELECT COUNT(*) FROM prod.fct_orders WHERE order_date >= CURRENT_DATE - 1) AS prod_rows
)
SELECT
    staging_rows,
    prod_rows,
    ABS(staging_rows - prod_rows) AS abs_diff,
    ROUND(ABS(staging_rows - prod_rows) * 100.0 / NULLIF(GREATEST(staging_rows, prod_rows), 0), 2) AS pct_diff
FROM stats;
```

## Acceptance Thresholds

### Defining Thresholds

```yaml
# diff-thresholds.yml
tables:
  fct_orders:
    row_count_threshold: 0.01   # 1% max difference
    amount_threshold: 0.05      # 5% for aggregated values
    column_comparison: all
    exclude_columns:
      - etl_created_at
      - etl_updated_at

  dim_customers:
    row_count_threshold: 0.001  # 0.1% for dimensions
    column_comparison: all

  daily_aggregations:
    row_count_threshold: 0.0    # Exact match required
    column_comparison:
      - order_date
      - total_revenue
      - order_count
    metrics:
      total_revenue:
        threshold: 0.02         # 2% tolerance on revenue
      order_count:
        threshold: 0.0          # Exact match on counts
```

### Threshold Validation

```python
def validate_diff_thresholds(diff_results, threshold_config):
    """Validate diff results against configured thresholds."""
    violations = []
    for table_name, diff in diff_results.items():
        config = threshold_config.get(table_name, {})
        row_threshold = config.get('row_count_threshold', 0.01)

        if diff['row_diff_pct'] > row_threshold * 100:
            violations.append({
                'table': table_name,
                'check': 'row_count',
                'actual': diff['row_diff_pct'],
                'threshold': row_threshold * 100,
                'status': 'FAIL'
            })

        for metric, metric_config in config.get('metrics', {}).items():
            if metric in diff.get('metrics', {}):
                actual_diff = abs(diff['metrics'][metric]['diff_pct'])
                if actual_diff > metric_config['threshold'] * 100:
                    violations.append({
                        'table': table_name,
                        'check': metric,
                        'actual': actual_diff,
                        'threshold': metric_config['threshold'] * 100,
                        'status': 'FAIL'
                    })

    return {
        'passed': len(violations) == 0,
        'violations': violations,
        'summary': f"{len(violations)} threshold violations found"
    }
```

## Rules
- Run data-diff before every production deployment to catch unexpected changes
- Compare row counts, schemas, and critical column values between staging and prod
- Set acceptance thresholds per table (1% for facts, 0.1% for dimensions)
- Use hash-based comparison for wide tables to avoid per-column checks
- Automate schema diff checks in CI/CD to prevent breaking changes
- Exclude ETL metadata columns from comparison (timestamps, batch IDs)
- Alert on threshold violations; block deployment for critical violations
- Run diff only on recent data (last 7 days) for performance
- Log all diff results for audit trail and trend analysis
- Review and adjust thresholds quarterly based on observed variance
