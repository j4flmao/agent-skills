---
name: data-testing
description: >
  Use this skill when asked about data testing, dbt unit testing, data-diff, datafold, Soda, Great Expectations, data regression testing, data quality testing, data contract testing, or data validation automation. This skill enforces: dbt unit testing with dbt-unit-testing package, regression detection with data-diff and datafold, data quality validation with Soda and Great Expectations, data contract enforcement, and CI/CD integration for automated data testing. Do NOT use for: pipeline monitoring (use data-observability), schema design (use data-warehouse), or generic software testing (use testing skill).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [data, testing, quality, phase-11]
---

# Data Testing

## Purpose
Implement automated data testing across the data platform: unit tests for dbt models, regression detection between environments, data quality validation with Soda/Great Expectations, and CI/CD gates for data pipeline changes.

## Agent Protocol

### Trigger
Exact user phrases: "data testing", "dbt testing", "dbt unit test", "data-diff", "datafold", "Soda", "Great Expectations", "data regression", "data quality test", "data contract test", "data testing framework", "data validation test", "test data pipeline".

### Input Context
Before activating, verify:
- Data transformation tool (dbt, SQLMesh, custom)
- Testing infrastructure (Soda Cloud, Great Expectations, datafold, data-diff)
- CI/CD platform (GitHub Actions, GitLab CI, Jenkins)
- Environments (dev, staging, prod) and data sources
- Data contracts or SLAs in place
- Existing test coverage and failure patterns

### Output Artifact
Test suite configuration with dbt unit tests, Soda checks, Great Expectations suites, data regression test configs, and CI pipeline integration.

### Response Format
```yaml
# dbt test config
# Soda checks
```
```sql
# Unit test fixtures and assertions
# Regression diff queries
```
```python
# Great Expectations suite
# CI pipeline
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] dbt unit tests written for all critical transformation models
- [ ] Regression tests configured between staging and production
- [ ] Soda or Great Expectations checks for row count, freshness, null rates, uniqueness
- [ ] Data contract tests enforcing schema and shape on every deploy
- [ ] CI pipeline runs tests and blocks on failures
- [ ] Alerting on test failure with Slack/PagerDuty integration
- [ ] Test coverage measured and reported

### Max Response Length
300 lines of code and configuration.

## dbt Unit Testing

### Unit Test Setup
```yaml
# packages.yml
packages:
  - package: equalexperts/dbt_unit_testing
    version: 1.0.0
```

### Unit Test Definition
```sql
-- tests/unit/test_stg_orders.sql
{{ dbt_unit_testing.test('stg_orders') }}

{{ dbt_unit_testing.mock_ref('raw_orders', [
    {'order_id': 1, 'customer_id': 100, 'amount': 50.00, 'status': 'completed'},
    {'order_id': 2, 'customer_id': 101, 'amount': 100.00, 'status': 'pending'},
    {'order_id': 3, 'customer_id': 100, 'amount': -10.00, 'status': 'refunded'},
]) }}

{{ dbt_unit_testing.expect_model_columns([
    'order_id', 'customer_id', 'amount', 'status',
    'is_refund', 'amount_abs', 'row_num'
]) }}

{{ dbt_unit_testing.expect_row_count(3) }}

{{ dbt_unit_testing.expect_specific_row(
    'order_id', 1,
    {'customer_id': 100, 'amount': 50.00, 'is_refund': false}
) }}
```

### dbt Test Configuration
```yaml
# dbt_project.yml
tests:
  +severity: warn  # default severity, override per test

# tests/schema.yml
version: 2
models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('stg_customers')
              field: customer_id
      - name: amount
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 100000
```

## Data Regression Testing

### data-diff CLI
```bash
# Diff tables across environments
data-diff \
  --warehouse-type postgresql \
  --warehouse-type postgresql \
  --warehouse-conn "postgresql://user:pass@prod:5432/warehouse" \
  --warehouse-conn "postgresql://user:pass@staging:5432/warehouse" \
  "SELECT order_id, customer_id, amount, status FROM orders WHERE order_date >= '2026-05-01'" \
  "SELECT order_id, customer_id, amount, status FROM orders WHERE order_date >= '2026-05-01'" \
  -k order_id

# Generate diff report
data-diff \
  --warehouse-type snowflake \
  --warehouse-type snowflake \
  --warehouse-conn "snowflake://user:pass@account/prod" \
  --warehouse-conn "snowflake://user:pass@account/staging" \
  "prod.analytics.fct_orders" \
  "staging.analytics.fct_orders" \
  -k order_id \
  --output diff_report.json
```

### datafold Integration
```yaml
# .datafold/config.yml
environments:
  - name: production
    data_source: prod_warehouse
  - name: staging
    data_source: staging_warehouse

monitors:
  - name: orders_pipeline
    schedule: "0 6 * * *"
    description: "Daily regression check on orders models"
    models:
      - fct_orders
      - dim_customers
      - fct_payments

diff_config:
  primary_keys:
    fct_orders: order_id
    dim_customers: customer_id
  compare_columns: all
  threshold_percentage: 0.01  # 0.01% allowed diff before alert
```

### Custom Regression Queries
```sql
-- Row count comparison
SELECT 'staging' as env, COUNT(*) as row_count FROM staging.fct_orders
UNION ALL
SELECT 'production', COUNT(*) FROM prod.fct_orders;

-- Distribution drift detection
SELECT
    status,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pct_staging,
    NULL as pct_prod
FROM staging.fct_orders
GROUP BY status
UNION ALL
SELECT
    status,
    NULL,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)
FROM prod.fct_orders
GROUP BY status;

-- Aggregation comparison
SELECT
    'diff' as metric,
    staging.total - prod.total as amount_diff,
    ROUND((staging.total - prod.total) / NULLIF(prod.total, 0) * 100, 4) as pct_diff
FROM (
    SELECT SUM(amount) as total FROM staging.fct_orders
) staging,
    (SELECT SUM(amount) as total FROM prod.fct_orders) prod;
```

## Soda Data Quality Checks

### Soda Configuration
```yaml
# soda/configuration.yml
data_source: prod_warehouse
connection:
  type: postgres
  host: ${POSTGRES_HOST}
  port: 5432
  username: ${POSTGRES_USER}
  password: ${POSTGRES_PASSWORD}
  database: warehouse

# soda/checks/orders.yml
checks for orders:
  - row_count > 0
  - missing_count(order_id) = 0
  - missing_percent(customer_id) < 1:
      name: Customer ID fill rate
  - duplicate_count(order_id) = 0
  - freshness(order_date) < 24h:
      name: Data freshness SLA
  - min(amount) >= 0:
      name: No negative amounts
  - max(amount) < 1000000:
      name: Amount sanity check
  - avg(amount) between 10 and 500:
      name: Reasonable average amount
  - values in (status) must be in ('pending', 'completed', 'refunded', 'cancelled'):
      name: Valid status values

# soda/checks/cross_table.yml
checks for customers:
  - rows_exist_in(orders, customer_id = customer_id):
      name: Customer has at least one order
```

## Great Expectations

### Expectation Suite
```python
# suites/orders_suite.py
import great_expectations as ge

def build_orders_suite():
    context = ge.get_context()
    datasource = context.sources.add_snowflake("orders_ds", ...)
    batch = datasource.add_table_asset("orders_table")

    suite = context.add_expectation_suite("orders_quality")

    # Column presence
    batch.expect_table_columns_to_match_set([
        "order_id", "customer_id", "amount", "status", "order_date"
    ])

    # Column types
    batch.expect_column_values_to_be_of_type("order_id", "INTEGER")
    batch.expect_column_values_to_be_of_type("amount", "FLOAT")

    # Value constraints
    batch.expect_column_values_to_not_be_null("order_id")
    batch.expect_column_values_to_be_unique("order_id")
    batch.expect_column_values_to_be_between("amount", 0, 1000000)
    batch.expect_column_values_to_be_in_set("status", [
        "pending", "completed", "refunded", "cancelled"
    ])

    # Distribution
    batch.expect_column_pair_values_to_be_equal(
        "customer_id", "customer_id"
    )
    batch.expect_column_distinct_values_to_be_in_set(
        "status",
        ["pending", "completed", "refunded", "cancelled"]
    )

    suite.save()
```

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/data-tests.yml
name: Data Tests
on:
  pull_request:
    paths:
      - 'models/**/*.sql'
      - 'tests/**/*.sql'
      - 'soda/**/*.yml'

jobs:
  dbt-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install dbt-postgres dbt-unit-testing
      - run: dbt deps
      - run: dbt run --models state:modified+
      - run: dbt test --models state:modified+
      - run: dbt-unit-testing run
      - name: data-diff regression
        run: |
          data-diff \
            --warehouse-type postgresql \
            --warehouse-conn "${{ secrets.PROD_DB }}" \
            --warehouse-conn "${{ secrets.STAGING_DB }}" \
            "SELECT * FROM orders WHERE order_date >= CURRENT_DATE - 7" \
            "SELECT * FROM orders WHERE order_date >= CURRENT_DATE - 7" \
            -k order_id

  soda-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install soda-core-postgres
      - run: soda scan -d prod_warehouse checks/orders.yml
```

### Testing Pyramid for Data

```
                    ┌────────────────────────────┐
                    │  Production Monitoring     │  Anomaly detection,
                    │  (Observability checks)    │  freshness alerts
                    ├────────────────────────────┤
                    │  End-to-End Tests          │  Cross-system diffs,
                    │  (Soda/GE scans)           │  row counts, schema
                    ├────────────────────────────┤
                    │  Integration Tests         │  CI pipeline checks,
                    │  (dbt build --select)      │  contract enforcement
                    ├────────────────────────────┤
                    │  Regression Tests          │  Stage vs prod diffs,
                    │  (DataDiff)                │  column value comparison
                    ├────────────────────────────┤
                    │  Unit Tests                │  dbt test, custom SQL
                    │  (dbt test)                │  assertions, GE suites
                    └────────────────────────────┘
```

### Test Types Matrix

```yaml
test_types:
  schema_test:
    scope: "Column names, types, nullability"
    tool: "dbt contract, Soda schema check"
    frequency: "Every deploy"
    failure: "Block deployment"
  
  integrity_test:
    scope: "Primary key uniqueness, FK relationships"
    tool: "dbt test (unique, not_null, relationships)"
    frequency: "Every build"
    failure: "Block deployment"
  
  quality_test:
    scope: "Null rates, value ranges, accepted values, distribution"
    tool: "Soda, Great Expectations, dbt_expectations"
    frequency: "Every deploy + scheduled runs"
    failure: "Block deploy (critical), warn (non-critical)"
  
  regression_test:
    scope: "Row counts, column values, aggregations match previous"
    tool: "DataDiff, custom SQL comparison"
    frequency: "Every deploy (stage vs prod 7-day window)"
    failure: "Investigate difference — may indicate logic change or bug"
  
  contract_test:
    scope: "Schema, SLA, and quality terms match contract"
    tool: "Custom contract validation in CI/CD"
    frequency: "Every PR"
    failure: "Block PR merge"
  
  performance_test:
    scope: "Query runtime, resource consumption"
    tool: "Query profiling (warehouse-native)"
    frequency: "Weekly"
    failure: "Alert on > 50% regression in runtime"
  
  end_to_end_test:
    scope: "Full pipeline from source → staging → mart"
    tool: "dbt build --select tag:e2e, Soda scan"
    frequency: "Daily"
    failure: "PagerDuty alert"
```

### Decision Tree

#### Test Selection
```
What aspect of the data pipeline are we validating?
├── Schema correctness
│   ├── Column names and types → dbt contract
│   └── Schema evolution → Schema registry compatibility check
├── Data integrity
│   ├── PK uniqueness → unique + not_null test
│   ├── FK validity → relationships test
│   └── Referential integrity → custom SQL assertion
├── Data quality
│   ├── Value ranges → accepted_values, range check
│   ├── Completeness → null rate check
│   ├── Distribution stability → distribution comparison (KS/chi-squared)
│   └── Freshness → source freshness threshold
├── Pipeline correctness
│   ├── Business logic → dbt unit test (v1.8+)
│   ├── Row count consistency → equal_rowcount test
│   └── Cross-environment consistency → DataDiff
└── Production behavior
    ├── Anomaly detection → Soda/Monte Carlo monitoring
    └── SLA compliance → contract monitoring
```

## Rules
- Every dbt model must have at least unique + not_null tests on its primary key
- Unit tests for models with CASE WHEN, window functions, or aggregations
- Regression diffing on every deploy comparing staging vs production
- Soda/GE checks for row count, freshness, null rate, uniqueness, value range
- CI pipeline must fail and block merge on test failure
- Data contract tests run pre-deploy to validate schema compatibility
- Alert on test failure immediately, not next business day
- Test coverage reports generated monthly
- Cross-environment diffs limited to last 7 days of data for performance
- Apply testing pyramid: unit > integration > regression > E2E > monitoring
- Match test type to data risk — schema failures block, quality failures alert

## References
  - references/contract-driven-testing.md — Contract-Driven Testing
  - references/data-comparison-tools.md — Data Comparison Tools
  - references/data-quality-catalog.md — Data Quality Test Catalog Reference
  - references/data-testing-performance.md — Data Testing Performance
  - references/data-testing-pipeline.md — Data Testing Pipeline Integration
  - references/dbt-testing-framework.md — dbt Testing Framework
  - references/schema-testing.md — Schema Testing Reference
  - references/testing-strategy-framework.md — Testing Strategy Framework
## Architecture Decision Trees

```
Data Testing Strategy
├── Pipeline testing approach?
│   ├── SQL transformation tests → dbt tests (singular + generic)
│   ├── Python transformation tests → pytest + chispa (PySpark)
│   └── End-to-end pipeline tests → Jenkins/GitHub Actions with test datasets
├── Data quality testing?
│   ├── Row-level (not null, unique) → dbt generic tests
│   ├── Statistical (distribution, outliers) → Great Expectations
│   └── Schema validation → dbt schema tests + protobuf schema registry
├── Test environment?
│   ├── Dedicated staging DB → dbt test --target staging
│   └── CI ephemeral environment → dbt test with fresh clone
└── Test frequency?
    ├── On every PR → Fast smoke tests (< 5 min)
    └── Daily → Full regression suite (sampled data)
```

**Decision criteria**: Balance test speed vs coverage, data volume limits in CI, and criticality of the data pipeline.

## Implementation Patterns

### PySpark Testing with Chispa
```python
# data_testing/pyspark_test.py
import pytest
from chispa import assert_df_equality
from pyspark.sql import SparkSession

def test_transform_orders():
    spark = SparkSession.builder.getOrCreate()
    source_data = [
        (1, "2024-01-01", 100.0, "pending"),
        (2, "2024-01-02", 200.0, "shipped"),
    ]
    source_schema = ["order_id", "order_date", "amount", "status"]
    source_df = spark.createDataFrame(source_data, source_schema)

    result = transform_orders(source_df)

    expected_data = [
        (1, "2024-01-01", 100.0, "pending", "2024-01", "Q1"),
        (2, "2024-01-02", 200.0, "shipped", "2024-01", "Q1"),
    ]
    expected_schema = ["order_id", "order_date", "amount", "status", "month", "quarter"]
    expected_df = spark.createDataFrame(expected_data, expected_schema)
    assert_df_equality(result, expected_df)
```

### dbt Singular Test
```sql
-- data_testing/tests/assert_orders_total_positive.sql
SELECT order_id, total_amount
FROM {{ ref('orders') }}
WHERE total_amount < 0
```

## Production Considerations

- **Test data management**: Use sampled production data (1% stratified) for CI; never use full prod volume.
- **Test isolation**: Run tests in isolated schemas/databases; tear down after completion using dbt `--target`.
- **Seeded test data**: Maintain a `data/seeds/` directory with canonical test CSVs for deterministic outcomes.
- **CI integration**: Run data tests as parallel CI job; fail PR on any test failure in `gold` layer tests.
- **Test coverage targets**: Require 80%+ model coverage (each model has at least one test) for gold models.
- **Flaky test handling**: Retry flaky tests 3x with exponential backoff; quarantine consistently failing tests.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Testing on full production data in CI | CI runs for hours | Use sampled data (1-5%) in CI |
| No test data seed files | Non-deterministic test results | Maintain versioned seed CSVs |
| Only testing happy path | Downstream pipelines break on edge cases | Add null, empty, boundary tests |
| Tests without assertion on row count | Silent empty output passes | Always assert row_count > 0 |
| Ignoring schema drift in test data | Tests pass on old schema | Regular test data refresh from prod |

## Performance Optimization

- **Parallel test execution**: Use pytest-xdist or dbt `--threads` for parallel model testing.
- **Test tiering**: Run fast (< 1 min) unit tests on every commit; slow integration tests nightly.
- **Data skipping**: Test only changed models + their downstream dependencies using `dbt test --select +model_name+`.
- **Result caching**: Cache full-refresh model builds across test runs using ephemeral volumes.
- **Minimal test data**: Design test cases with minimal row counts (3-10 rows per edge case).

## Security Considerations

- **Test data de-identification**: Use synthetic or masked data in CI; never commit production PII to test seeds.
- **Credential isolation**: Use separate test DB credentials with read-only access; rotate CI secrets.
- **Test artifact storage**: Encrypt test result artifacts at rest; purge CI logs after 90 days.
- **Access control**: Restrict test environment modification to pipeline maintainers; audit test data changes.
- **Compliance**: Ensure test data complies with data retention policies; purge test schemas after 7 days.

## Handoff
`data-data-quality` for broader quality framework and data contract enforcement
`data-data-observability` for production monitoring and anomaly detection
