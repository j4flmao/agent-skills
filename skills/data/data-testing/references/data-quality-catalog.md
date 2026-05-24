# Data Quality Test Catalog Reference

## Freshness

Freshness measures how recently data was updated.

### Freshness Tests

```yaml
# dbt freshness tests
sources:
  - name: raw_orders
    freshness:
      warn_after: { count: 6, period: hour }
      error_after: { count: 24, period: hour }
    loaded_at_field: etl_loaded_at

  - name: raw_customers
    freshness:
      warn_after: { count: 24, period: hour }
      error_after: { count: 48, period: hour }
    loaded_at_field: etl_loaded_at
```

```sql
-- Custom freshness query
SELECT
    MAX(etl_loaded_at) AS last_loaded,
    DATEDIFF('hour', MAX(etl_loaded_at), CURRENT_TIMESTAMP) AS hours_since_load,
    CASE
        WHEN DATEDIFF('hour', MAX(etl_loaded_at), CURRENT_TIMESTAMP) > 24 THEN 'FAIL'
        WHEN DATEDIFF('hour', MAX(etl_loaded_at), CURRENT_TIMESTAMP) > 6 THEN 'WARN'
        ELSE 'PASS'
    END AS freshness_status
FROM analytics.fct_orders;

-- Per-partition freshness
SELECT
    order_date,
    MAX(etl_loaded_at) AS last_loaded,
    DATEDIFF('hour', MAX(etl_loaded_at), CURRENT_TIMESTAMP) AS hours_ago
FROM analytics.fct_orders
WHERE order_date >= CURRENT_DATE - 7
GROUP BY order_date
ORDER BY order_date;
```

## Volume

Volume tests check the expected size of datasets.

### Volume Tests

```yaml
checks for orders:
  - row_count > 0
  - row_count between 1000 and 10000000
  - row_count >= 0.8 * reference_value:
      reference_value: yesterday
  - avg(amount) between 10 and 500
  - max(amount) < 1000000
  - min(amount) >= 0
```

```sql
-- Volume trend monitoring
SELECT
    order_date,
    COUNT(*) AS row_count,
    SUM(amount) AS total_amount,
    COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY order_date) AS row_count_delta,
    (COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY order_date)) / NULLIF(LAG(COUNT(*)) OVER (ORDER BY order_date), 0) * 100 AS pct_change
FROM analytics.fct_orders
WHERE order_date >= CURRENT_DATE - 30
GROUP BY order_date
ORDER BY order_date;

-- Volume anomaly detection (3 sigma)
WITH stats AS (
    SELECT
        AVG(row_count) AS avg_count,
        STDDEV(row_count) AS std_count
    FROM (
        SELECT order_date, COUNT(*) AS row_count
        FROM analytics.fct_orders
        WHERE order_date >= CURRENT_DATE - 30
        GROUP BY order_date
    )
)
SELECT
    CURRENT_DATE AS today,
    COUNT(*) AS today_count,
    avg_count,
    std_count,
    CASE
        WHEN COUNT(*) < avg_count - 3 * std_count THEN 'ANOMALY_LOW'
        WHEN COUNT(*) > avg_count + 3 * std_count THEN 'ANOMALY_HIGH'
        ELSE 'NORMAL'
    END AS status
FROM analytics.fct_orders
WHERE order_date = CURRENT_DATE
GROUP BY avg_count, std_count;
```

## Completeness

Completeness measures whether required data is present.

### Completeness Tests

```yaml
checks for customers:
  - missing_count(customer_id) = 0
  - missing_percent(email) < 1
  - missing_percent(phone) < 5
  - missing_percent(company_name) < 10
  - missing_count(customer_tier):
      warn: when >= 100
      fail: when >= 1000
```

```sql
-- Completeness profile per column
SELECT
    'customer_id' AS column_name,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN customer_id IS NULL THEN 1 ELSE 0 END) AS missing_count,
    ROUND(AVG(CASE WHEN customer_id IS NULL THEN 1.0 ELSE 0.0 END) * 100, 2) AS missing_pct
FROM analytics.dim_customers
UNION ALL
SELECT
    'email',
    COUNT(*),
    SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END),
    ROUND(AVG(CASE WHEN email IS NULL THEN 1.0 ELSE 0.0 END) * 100, 2)
FROM analytics.dim_customers
UNION ALL
SELECT
    'phone',
    COUNT(*),
    SUM(CASE WHEN phone IS NULL THEN 1 ELSE 0 END),
    ROUND(AVG(CASE WHEN phone IS NULL THEN 1.0 ELSE 0.0 END) * 100, 2)
FROM analytics.dim_customers
UNION ALL
SELECT
    'company_name',
    COUNT(*),
    SUM(CASE WHEN company_name IS NULL THEN 1 ELSE 0 END),
    ROUND(AVG(CASE WHEN company_name IS NULL THEN 1.0 ELSE 0.0 END) * 100, 2)
FROM analytics.dim_customers;
```

## Accuracy

Accuracy measures whether the data correctly reflects reality.

### Accuracy Tests

```yaml
checks for orders:
  - invalid_count(amount) = 0:
      valid min: 0
      valid max: 100000
  - values in (status) must be in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
  - values in (currency) must be in ('USD', 'EUR', 'GBP')
  - invalid_count(email) = 0:
      valid format: email

checks for customers:
  - values in (tier) must be in ('bronze', 'silver', 'gold', 'platinum')
  - values in (country) must be in (SELECT country_code FROM ref_countries)
```

```sql
-- Cross-table accuracy: order total matches sum of line items
SELECT
    o.order_id,
    o.total_amount AS order_total,
    SUM(oi.quantity * oi.unit_price) AS calculated_total,
    ABS(o.total_amount - SUM(oi.quantity * oi.unit_price)) AS discrepancy
FROM analytics.fct_orders o
JOIN analytics.fact_order_items oi ON o.order_id = oi.order_id
WHERE o.order_date >= CURRENT_DATE - 1
GROUP BY o.order_id, o.total_amount
HAVING ABS(o.total_amount - SUM(oi.quantity * oi.unit_price)) > 0.01;

-- Business rule: order_date must be <= shipped_date
SELECT order_id, order_date, shipped_date
FROM analytics.fct_orders
WHERE order_date > shipped_date
  AND shipped_date IS NOT NULL;
```

## Consistency

Consistency measures whether data is uniform across systems.

### Consistency Tests

```yaml
checks for customers:
  - values in (country) must be consistently formatted:
      type: upper_case
  - phone numbers must match E.164 format:
      regex: "^\+[1-9]\d{1,14}$"
  - email addresses must be lowercase:
      custom_check: LOWER(email) = email

cross_table:
  - rows_exist_in(orders, customer_id = customer_id):
      name: "Customer has orders"
  - same_count_as(ref_customers, dim_customers):
      name: "Customer count matches reference"
```

```sql
-- Consistency: same metric across different tables
SELECT
    'source_a' AS source,
    COUNT(*) AS customer_count
FROM source_a.customers
WHERE created_at >= DATEADD('day', -1, CURRENT_DATE)
UNION ALL
SELECT
    'source_b',
    COUNT(*)
FROM source_b.customers
WHERE created_at >= DATEADD('day', -1, CURRENT_DATE);

-- Cross-system reconciliation
SELECT
    COALESCE(a.customer_id, b.customer_id) AS customer_id,
    a.total_orders AS system_a_orders,
    b.total_orders AS system_b_orders,
    CASE
        WHEN a.total_orders IS NULL THEN 'missing_in_a'
        WHEN b.total_orders IS NULL THEN 'missing_in_b'
        WHEN a.total_orders != b.total_orders THEN 'mismatch'
        ELSE 'match'
    END AS status
FROM (
    SELECT customer_id, COUNT(*) AS total_orders
    FROM source_a.orders GROUP BY customer_id
) a
FULL OUTER JOIN (
    SELECT customer_id, COUNT(*) AS total_orders
    FROM source_b.transactions GROUP BY customer_id
) b ON a.customer_id = b.customer_id
WHERE a.total_orders IS NULL
   OR b.total_orders IS NULL
   OR a.total_orders != b.total_orders;
```

## Timeliness

Timeliness measures how quickly data is available after the source event.

### Timeliness Tests

```sql
-- Data delay: time between source event and warehouse load
SELECT
    source_system,
    AVG(DATEDIFF('minute', source_timestamp, warehouse_loaded_at)) AS avg_delay_minutes,
    PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY DATEDIFF('minute', source_timestamp, warehouse_loaded_at)
    ) AS p95_delay_minutes,
    MAX(DATEDIFF('minute', source_timestamp, warehouse_loaded_at)) AS max_delay_minutes
FROM data_load_timeline
WHERE source_timestamp >= CURRENT_DATE - 7
GROUP BY source_system;

-- Timeliness SLA compliance
SELECT
    source_system,
    COUNT(*) AS total_batches,
    SUM(CASE WHEN delay_minutes <= sla_minutes THEN 1 ELSE 0 END) AS sla_compliant,
    ROUND(AVG(CASE WHEN delay_minutes <= sla_minutes THEN 1.0 ELSE 0.0 END) * 100, 1) AS sla_pct
FROM data_load_timeline
WHERE source_timestamp >= CURRENT_DATE - 30
GROUP BY source_system;
```

## Custom SLAs

### SLA Definition Template

```yaml
data_quality_slas:
  - dataset: analytics.fct_orders
    owner: data-platform
    dimensions:
      freshness: { threshold: 6h, severity: critical }
      completeness: { threshold: 99.5%, severity: high }
      accuracy: { threshold: 99.9%, severity: critical }
      volume: { min_rows: 1000, max_change_pct: 20, severity: medium }

  - dataset: analytics.dim_customers
    owner: customer-domain
    dimensions:
      freshness: { threshold: 24h, severity: high }
      completeness: { threshold: 99.0%, severity: high }
      uniqueness: { customer_id: 100%, severity: critical }

  - dataset: raw.orders_source
    owner: data-platform
    dimensions:
      freshness: { threshold: 30min, severity: critical }
      volume: { min_rows: 100, max_change_pct: 50, severity: low }
```

### SLA Monitoring Dashboard

```sql
-- SLA compliance report
SELECT
    dataset,
    quality_dimension,
    current_value,
    sla_threshold,
    CASE
        WHEN sla_status = 'pass' THEN '✅'
        WHEN sla_status = 'warn' THEN '⚠️'
        WHEN sla_status = 'fail' THEN '❌'
    END AS status_icon,
    last_checked
FROM data_quality_sla_status
WHERE dataset IN ('analytics.fct_orders', 'analytics.dim_customers')
ORDER BY dataset, quality_dimension;
```

## Severity Levels

### Severity Classification

| Severity | Definition | Response | Example |
|----------|------------|----------|---------|
| Critical | Data incorrect causing financial/legal impact | 1 hour response, immediate fix | Wrong financial aggregates |
| High | Data incorrect affecting business decisions | 4 hour response | Missing customer segments |
| Medium | Data quality issue with limited impact | 24 hour response | 5% null rate on non-critical column |
| Low | Cosmetic or minor issue | Next sprint | Inconsistent formatting |

### Alert Routing

```yaml
alert_routing:
  critical:
    channels: [pagerduty, slack-urgent, email-datal-lead]
    runbook: /runbooks/data-quality-critical.md
    auto_remediate: false
    escalation:
      - name: "On-call DBA"
        timeout: 30min
      - name: "Data Engineering Lead"
        timeout: 1h
      - name: "Director of Data"
        timeout: 4h

  high:
    channels: [slack-data-alerts, email]
    auto_remediate: false
    escalation:
      - name: "Data Engineering Team"
        timeout: 4h

  medium:
    channels: [slack-data-issues]
    auto_remediate: false
    triage: "Next business day"

  low:
    channels: [data-quality-dashboard]
    auto_remediate: false
    triage: "Next sprint planning"
```

## Ownership

### Quality Test Ownership

```yaml
quality_ownership:
  - dataset: analytics.fct_orders
    steward: orders-steward@company.com
    tests:
      - freshness: { owner: data-platform, sla: 6h }
      - row_count: { owner: data-platform, sla: 30min }
      - referential_integrity: { owner: orders-steward, sla: 1h }
      - accuracy_amount: { owner: finance-team, sla: 4h }

  - dataset: analytics.dim_customers
    steward: customer-steward@company.com
    tests:
      - uniqueness: { owner: marketing-team, sla: 1h }
      - completeness_email: { owner: marketing-team, sla: 4h }
      - freshness: { owner: data-platform, sla: 24h }
```

## Rules
- Every critical dataset must have freshness, volume, and completeness tests
- Set severity levels for all quality checks (critical > high > medium > low)
- Route alerts to appropriate teams with escalation paths
- Monitor SLA compliance weekly with dashboard reports
- Track quality trends over time to identify degradation
- Test accuracy with cross-table reconciliation and business rules
- Consistency tests ensure uniformity across systems
- Timeliness measures pipeline performance end-to-end
- Assign quality test ownership to specific teams/stewards
- Review quality thresholds quarterly and adjust based on observed patterns
