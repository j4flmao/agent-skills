# Data Quality Ecosystem Tools

## re_data — Baseline-Driven Quality

re_data profiles data warehouse tables and tracks metrics over time to establish baselines for anomaly detection.

### Configuration
```yaml
# re_data.yml
tables:
  - name: analytics.orders
    columns:
      - name: order_id
        tests:
          - not_null
      - name: amount
        tests:
          - not_null
          - min: 0
          - max: 100000
    metrics:
      - row_count
      - freshness
      - nulls_percent
    alert:
      - type: row_count
        threshold: median
        deviation: 0.3  # Alert if 30% below median
```

### Commands
```bash
# Profile a table (takes initial snapshot)
re_data profile --start-date 2024-01-01 --end-date 2024-01-31

# Run quality checks
re_data run --start-date 2024-05-01 --end-date 2024-05-23

# Generate dbt tests from observed patterns
re_data generate-dbt-tests --config re_data.yml > tests/re_data_tests.yml

# View alert history
re_data alerts --days-back 30
```

## dbt-audit-helper — Migration Validation

### Comparing Two Relations
```sql
-- Compare original model vs refactored model
{{ audit_helper.compare_relations(
    a_relation = ref('original_orders'),
    b_relation = ref('refactored_orders'),
    primary_key = 'order_id',
    columns = [
        'order_id',
        'customer_id',
        'amount',
        'status',
        'created_at'
    ]
) }}
```

### Output
```
Comparison results:
  ✅ 1,234,567 rows in both relations
  ❌    12,345 rows in A only (missing in refactored)
  ⚠️    5,678 rows in B only (extra in refactored)
  🔄       123 rows modified

Modified rows:
  order_id=98765: amount 100.00 → 100.50; status 'pending' → 'confirmed'
```

## ODD (Open Data Discovery)

### Data Source Integration
```yaml
# odd-platform configuration
platform:
  host: odd-platform.company.com
  port: 8080

collectors:
  - type: dbt
    config:
      project_dir: /app/dbt
      target: prod
      manifest: target/manifest.json
      catalog: target/catalog.json
  - type: airflow
    config:
      host: airflow.company.com
      dag_ids: [sales_pipeline, finance_etl]
```

### Quality Dashboard Metrics
ODD tracks per-dataset quality scores and trends. Data quality is shown as a composite score (0-100) based on:
- Completeness: % of non-null required columns
- Freshness: time since last successful data load
- Volume: row count deviation from expected range
- Validity: % of rows passing format/domain checks

## data-diff — Cross-Database Comparison

### Usage
```bash
# Compare tables across different databases
data-diff \
  --dbs postgresql://user:pass@pg-host/db \
         snowflake://user:pass@sf-account/db \
  --table public.orders public.orders \
  --key order_id \
  --columns status,total_amount,updated_at \
  --min-age 5m  # Skip very recent rows (still being written)

# Output format: JSON (for CI pipeline)
data-diff ... --output json  > diff-results.json
```

### Algorithm
data-diff uses a **checksum-based** algorithm:
1. Divide tables into segments using the key column
2. Compute checksums per segment (MURMURHASH or MD5)
3. Compare checksums between databases — only re-check segments that differ
4. For differing segments, fetch individual rows to identify specific changes

This makes it efficient even for billion-row tables — only segments with differences need row-level comparison.

## Integration Pattern

```yaml
# CI pipeline: validate data migration
jobs:
  validate-migration:
    steps:
      - run: data-diff --dbs "$OLD_DB" "$NEW_DB" --tables sales.orders
      - if: failure()
        run: data-diff --dbs "$OLD_DB" "$NEW_DB" --tables sales.orders --verbose > diff-report.md

  baseline-quality:
    steps:
      - run: re_data profile --table analytics.orders
      - run: re_data run --check
      - if: success()
        run: re_data generate-dbt-tests > tests/auto_tests.yml

  observability:
    steps:
      - run: odd-collector  # Push metadata to ODD platform
```
