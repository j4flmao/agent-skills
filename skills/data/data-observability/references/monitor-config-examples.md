# Monitor Configuration Examples

Concrete, copyable monitor definitions for the main data observability dimensions (freshness, volume, schema, field quality, distribution) using open tooling: dbt source freshness and tests, Elementary anomaly tests, Soda Core (SodaCL), and plain SQL monitors. Commercial platforms (Monte Carlo, Bigeye, Sifflet, Anomalo, etc.) offer equivalents with their own configuration formats; consult their current documentation rather than copying syntax across tools. Platform setup is in `observability-setup.md`.

## Dimension-to-Monitor Map

| Dimension | Example check | Typical tool |
|---|---|---|
| Freshness | Max `loaded_at` within 1 h | dbt source freshness, Soda `freshness`, Elementary `freshness_anomalies` |
| Volume | Daily row count within learned range | Elementary `volume_anomalies`, Soda anomaly checks |
| Schema | Required columns present, types unchanged | Soda `schema`, Elementary `schema_changes` |
| Field quality | Null %, duplicates, accepted values, referential integrity | dbt tests, Soda |
| Distribution | Mean/percentiles stable per segment | Elementary `column_anomalies` / `dimension_anomalies` |

## dbt: Source Freshness and Core Tests

```yaml
# models/sources.yml
version: 2
sources:
  - name: shop
    schema: raw_shop
    loaded_at_field: _loaded_at
    freshness:
      warn_after: {count: 2, period: hour}
      error_after: {count: 6, period: hour}
    tables:
      - name: orders
      - name: customers
        freshness:
          warn_after: {count: 24, period: hour}
```

```yaml
# models/marts/fct_orders.yml
version: 2
models:
  - name: fct_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: customer_id
        data_tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: status
        data_tests:
          - accepted_values:
              values: ['pending', 'paid', 'shipped', 'cancelled']
      - name: total_amount
        data_tests:
          - not_null:
              config:
                severity: warn
                where: "status <> 'pending'"
```

```bash
dbt source freshness            # writes target/sources.json; non-zero exit on error_after
dbt build --select fct_orders   # runs models and tests
```

`data_tests:` is the key name since dbt 1.8 (`tests:` still accepted).

## Elementary: Anomaly Tests in dbt

```yaml
# models/marts/fct_orders.yml (continued)
models:
  - name: fct_orders
    config:
      elementary:
        timestamp_column: created_at
    data_tests:
      - elementary.volume_anomalies:
          training_period: {period: day, count: 28}
          detection_period: {period: day, count: 2}
          time_bucket: {period: day, count: 1}
          anomaly_sensitivity: 3            # z-score threshold
      - elementary.freshness_anomalies
      - elementary.schema_changes:
          config: {severity: error}
      - elementary.dimension_anomalies:
          dimensions: [payment_method]
    columns:
      - name: total_amount
        data_tests:
          - elementary.column_anomalies:
              column_anomalies: [null_count, average, max]
```

Run with `dbt test`; send alerts with the Elementary CLI (`edr monitor --slack-token ... --slack-channel-name data-alerts`, token from a secret store) and publish the report with `edr report`.

Tuning: increase `training_period` for seasonal data, use `seasonality: day_of_week` for weekly patterns, raise `anomaly_sensitivity` for noisy tables.

## Soda Core (SodaCL)

```yaml
# checks/fct_orders.yml
checks for fct_orders:
  - freshness(created_at) < 1h
  - row_count > 0
  - duplicate_count(order_id) = 0
  - missing_percent(total_amount) < 1%
  - invalid_count(status) = 0:
      valid values: [pending, paid, shipped, cancelled]
  - avg(total_amount) between 10 and 500:
      name: Average order value in expected band
  - schema:
      fail:
        when required column missing: [order_id, customer_id, total_amount, created_at]
        when wrong column type:
          order_id: bigint
          total_amount: numeric
      warn:
        when forbidden column present: [card_number, ssn]
  - values in (customer_id) must exist in dim_customers (customer_id)
```

```yaml
# configuration.yml
data_source warehouse:
  type: postgres
  host: ${POSTGRES_HOST}
  port: "5432"
  username: ${POSTGRES_USER}
  password: ${POSTGRES_PASSWORD}
  database: analytics
  schema: marts
```

```bash
soda scan -d warehouse -c configuration.yml checks/fct_orders.yml
```

Exit code is non-zero on failures, so the scan can gate an orchestrator task. Anomaly-detection checks in SodaCL require Soda Cloud for historical metric storage.

## Plain SQL Monitors

When no tool is available, schedule SQL that returns one row per violated expectation and alert on non-empty results.

```sql
-- Freshness and volume for the last complete day, compared with the trailing 28-day average
WITH daily AS (
  SELECT date_trunc('day', created_at) AS d, count(*) AS n
  FROM marts.fct_orders
  WHERE created_at >= current_date - INTERVAL '29 days' AND created_at < current_date
  GROUP BY 1
), stats AS (
  SELECT avg(n) AS mean_n, stddev_samp(n) AS sd_n FROM daily WHERE d < current_date - INTERVAL '1 day'
)
SELECT 'volume_anomaly' AS check_name, y.n AS observed, s.mean_n, s.sd_n
FROM daily y CROSS JOIN stats s
WHERE y.d = current_date - INTERVAL '1 day'
  AND abs(y.n - s.mean_n) > 3 * nullif(s.sd_n, 0)
UNION ALL
SELECT 'stale_table', NULL, NULL, NULL
FROM (SELECT max(_loaded_at) AS last_load FROM marts.fct_orders) f
WHERE f.last_load < now() - INTERVAL '1 hour';
```

## Alert Routing

| Severity | Condition examples | Route |
|---|---|---|
| Critical | Tier-1 table stale past SLA, schema break on contract column, duplicate primary keys | Pager (on-call data engineer) |
| High | Volume anomaly on tier-1, referential failures | Team channel + ticket |
| Medium | Distribution drift, tier-2 freshness | Channel digest |
| Low | Tier-3 issues, warnings | Daily report |

Every alert includes: table, check, observed vs expected, owner, runbook link, and lineage (downstream assets affected).

## Coverage Matrix

| Dataset | Tier | Freshness | Volume | Schema | Field tests | Distribution |
|---|---|---|---|---|---|---|
| fct_orders | 1 | 1 h | daily anomaly | on every run | keys, accepted values, FK | daily |
| dim_customers | 1 | 24 h | daily anomaly | on every run | keys | weekly |
| stg_orders | 2 | 1 h | daily anomaly | on every run | keys | none |
| marketing_attribution | 3 | 24 h | weekly | weekly | none | none |

## Tuning Practice

- Review monitor noise weekly in the first month, then monthly; track false-positive rate per monitor and fix or remove noisy ones.
- Prefer learned baselines for volume/distribution and static thresholds for contracts (keys, schema, accepted values).
- Disable or adjust monitors during known events (backfills, migrations) with expiry, not indefinitely.

## Checklist
- [ ] Tier-1 tables covered for all five dimensions
- [ ] Contract checks (keys, schema, accepted values) as hard failures
- [ ] Anomaly monitors with adequate training windows and seasonality
- [ ] Credentials via environment/secret store in all configs
- [ ] Alerts routed by severity with owner, runbook and lineage context
- [ ] Noise reviewed and monitors tuned on a schedule
