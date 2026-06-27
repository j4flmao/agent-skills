---
name: data-data-quality
description: >
  Use this skill when asked about data quality, data validation, data profiling, Great Expectations, dbt tests, data observability, Soda, Monte Carlo, data contracts, schema validation, or data SLAs. This skill enforces: data quality dimensions (completeness, accuracy, timeliness, consistency, uniqueness, integrity), automated validation with Great Expectations (expectations suites, data docs, checkpoints) and dbt tests (singular, generic, freshness), data observability with Soda/Monte Carlo monitoring, data SLAs with escalation, and data contract enforcement between producers and consumers. Do NOT use for: ETL pipeline design, data warehouse schema design, or BI dashboard configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, quality, phase-10]
---

# Data Data Quality

## Purpose
Build a data quality framework covering quality dimensions
(completeness, accuracy, timeliness, consistency, uniqueness,
integrity), automated validation tests (Great Expectations
expectations suites, data docs, checkpoints; dbt singular,
generic, freshness tests), data observability (Soda, Monte Carlo,
Elementary), data SLAs with escalation paths, and data contracts.

## Agent Protocol

### Trigger
Exact user phrases: "data quality", "data validation",
"data profiling", "Great Expectations", "dbt tests",
"data observability", "data contract", "schema validation",
"data quality check", "data testing", "data monitoring",
"quality dimensions", "data freshness", "data completeness",
"Soda", "Monte Carlo", "data SLA", "data integrity".

### Input Context
Before activating, verify:
- Data stack (warehouse, lake, streaming platform)
- Transformation tool (dbt, Spark, custom SQL)
- Data sources and producers (internal, external, partner)
- Existing monitoring and alerting infrastructure
- Critical data assets for business operations
- Data consumers and their quality SLAs

### Output Artifact
Data quality framework with dimension definitions,
test configurations, monitoring setup, and contract templates.

### Response Format
```yaml
# Quality dimension definitions
# Great Expectations suite
# dbt test config
# Data contract template
# Alert rules
# SLA definitions
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Quality dimensions defined with measurement approach
- [ ] Automated validation suite (Great Expectations + dbt)
- [ ] Data profiling established for baseline expectations
- [ ] Data observability with monitoring and alerting
- [ ] Data contracts between producers and consumers
- [ ] Quality SLAs documented with escalation paths
- [ ] Soda checks configured for in-storage validation
- [ ] Data integrity checks across referential relationships

### Max Response Length
300 lines of configuration.

## Workflow

### Step 1: Quality Dimensions
Completeness: percentage of non-null values for required columns.
Measure: `COUNT(column) / COUNT(*) * 100`.
Critical columns: 100% required.
High: over 99% for business-required fields.

Accuracy: values represent real-world facts.
Cross-reference order total against sum of line items.
Range validation: age between 0 and 150, price above 0.

Timeliness: data freshness against expected SLA.
Measure: `CURRENT_TIMESTAMP - MAX(updated_at)`.
Critical: within 5 minutes. High: within 1 hour.

Consistency: same values across different systems.
Compare counts between source and warehouse.
Check date formats and currency conversions.

Uniqueness: no duplicate records for defined keys.
Measure: `COUNT(*) - COUNT(DISTINCT key)`.
Primary keys: 0% duplicate rate.

Integrity: referential integrity checks.
Every foreign key exists in parent table.
No orphan records or dangling references.

Validity: conforms to format and domain rules.
Email regex, ISO date format, enum values.

Weight each dimension for composite score.
Default: completeness 20%, accuracy 25%, consistency 15%,
timeliness 15%, uniqueness 10%, validity 15%.

### Step 2: Great Expectations
Expectation suites per critical table.
Types: not_null, unique, between (range),
match_regex (format), pair_equal (cross-column).

Profiling: auto-generate from sample data.
Analyzes null rate, min/max, distinct values,
value frequency, type inference.
Review and adjust before production deployment.

Validation: run as checkpoint in CI pipeline.
`great_expectations checkpoint run orders_checkpoint`.
Block pipeline on critical expectation failures.

Data docs: auto-generated HTML documentation.
Expectation results per run, validation timeline,
data source overview. Host on S3 or GCS.

Rules: every critical table has 10+ expectations.

### Step 2a: Great Expectations Suite YAML

```yaml
# expectations/orders_suite.yml
expectations:
  - expectation_type: expect_column_values_to_not_be_null
    kwargs: { column: order_id, mostly: 1.0 }
    meta: { dimension: completeness, critical: true }
  - expectation_type: expect_column_values_to_be_unique
    kwargs: { column: order_id }
    meta: { dimension: uniqueness, critical: true }
  - expectation_type: expect_column_values_to_be_between
    kwargs: { column: total_amount, min_value: 0, max_value: 100000 }
    meta: { dimension: accuracy, critical: true }
  - expectation_type: expect_table_row_count_to_be_between
    kwargs: { min_value: 1000, max_value: 5000000 }
    meta: { dimension: volume }
  - expectation_type: expect_column_pair_values_to_be_equal
    kwargs: { column_A: currency, column_B: currency_code }
    meta: { dimension: consistency }
```

```yaml
# checkpoints/orders_checkpoint.yml
name: orders_checkpoint
config_version: 1.0
class_name: SimpleCheckpoint
validations:
  - batch_request:
      datasource_name: warehouse
      data_asset_name: analytics.fct_orders
    expectation_suite_name: orders_suite
    action_list:
      - name: store_validation_result
        action: { class_name: StoreValidationResultAction }
      - name: update_data_docs
        action: { class_name: UpdateDataDocsAction }
      - name: send_slack_notification
        action:
          class_name: SlackNotificationAction
          slack_webhook: ${SLACK_WEBHOOK}
          notify_on: failure
```

### Step 3: dbt Tests
Generic tests: unique, not_null, accepted_values,
relationships (referential integrity).

Custom generic tests:
- freshness: age of latest record versus threshold
- row_count_threshold: minimum and maximum rows
- distribution_outlier: value distribution drift

Singular tests: custom SQL returning failing rows.
`SELECT * FROM fct_orders WHERE total_amount < 0`.

CI integration:
`dbt test --select tag:critical` blocks pipeline.
`dbt test --select severity:warn` informational only.
`dbt test --store_failures` for trend analysis.

Coverage: every column in critical tables has one test.

### Step 3a: dbt Test Definitions YAML

```yaml
# models/schema.yml — generic and singular tests
version: 2
models:
  - name: fct_orders
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [order_id, line_item_id]
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
          - relationships:
              to: ref('dim_orders')
              field: order_id
      - name: total_amount
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 100000
              where: "status = 'completed'"
      - name: status
        tests:
          - accepted_values:
              values: [pending, completed, cancelled, refunded]
      - name: created_at
        tests:
          - fresh:
              warn_after: { count: 12, period: hour }
              error_after: { count: 24, period: hour }
```

```sql
-- singular test: negative amounts
SELECT order_id, total_amount
FROM {{ ref('fct_orders') }}
WHERE total_amount < 0;
```

Run: `dbt test --select tag:critical --store_failures`

### Step 4: Soda Checks
In-storage quality checks with SQL-based metrics.
YAML configuration per table.

Check types: freshness under N hours, row count minimum,
missing percentage threshold, duplicate percentage equals 0,
schema change detection.

Execution: `soda scan -d warehouse -c config.yml checks.yml`.
Soda Cloud for visualization and alerting.
Open-source CLI for CI pipeline integration.

Rules: every production table has checks before deployment.

### Step 4a: Soda Check YAML Examples

```yaml
# checks/orders_checks.yml
checks for analytics.fct_orders:
  - freshness(created_at) < 6h
  - row_count between 10000 and 5000000
  - duplicate_count(order_id) = 0
  - schema:
      name: Schema validation
      fail:
        when required column missing: [order_id, customer_id, total_amount]
        when wrong column type:
          order_id: string
          total_amount: numeric
  - missing_percent(customer_id) < 0.1
  - avg(total_amount) > 0
  - min(total_amount) >= 0
  - max(total_amount) <= 100000
  - values in (status) must_exist_in [pending, completed, cancelled, refunded]

checks for analytics.fct_orders:
  - values in (customer_id) must_exist_in analytics.dim_customers (customer_id)
  - anomaly detection for row_count:
      sensitivity: normal
      training_period: 30
```

```yaml
# configuration.yml
data_source warehouse:
  type: postgres
  connection:
    host: ${POSTGRES_HOST}
    port: 5432
    database: analytics
    schema: analytics
soda_cloud:
  host: cloud.soda.io
  api_key_id: ${SODA_API_KEY_ID}
  api_key_secret: ${SODA_API_KEY_SECRET}
```

Run: `soda scan -d warehouse -c configuration.yml checks/orders_checks.yml`

### Step 5: Data Contracts
Contract between producer and consumer.

Fields: table schema (columns, types, constraints),
freshness SLA (updated by 6am daily),
row count range (min 1000, max 10M),
nullability thresholds (over 99.5% complete),
integrity rules (referential checks).

Producer signs contract.
Consumer validates at ingestion.

Enforcement chain:
Schema validation at ingestion.
Great Expectations at landing.
dbt tests at transformation.
Soda freshness monitors continuous.

Breach action:
Alert producer and consumer via Slack or PagerDuty.
Pause downstream data pipelines.
Document in quality dashboard.

Contract versioned alongside pipeline code.
Changes require both parties to approve.

### Step 5a: Automated Quality Gate CI Config

```yaml
# .github/workflows/quality-gate.yml
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Great Expectations Validation
        run: great_expectations checkpoint run orders_checkpoint
      - name: dbt Test Suite
        run: dbt test --select tag:critical --store_failures
      - name: Soda Scan
        run: soda scan -d warehouse -c configuration.yml checks/orders_checks.yml
      - name: Upload Quality Report
        if: always()
        run: |
          aws s3 sync great_expectations/uncommitted/data_docs/ s3://ge-data-docs/
      - name: Block Pipeline on Failure
        if: failure()
        run: |
          curl -X POST -H "Content-type: application/json" \
            --data '{"text":"Quality gate failed for fct_orders — pipeline blocked"}' \
            ${{ secrets.SLACK_WEBHOOK }}
```

Gate blocks deploy on: critical GE expectation failure, dbt test failure on tag:critical, Soda scan finding invalid schema or referential integrity violation. Warnings pass through but log to quality dashboard.

### Step 6: Observability (Monte Carlo / Elementary)
Key metrics:
Freshness: time since last successful load.
Volume: row count versus expected range.
Schema: new, missing, or renamed columns.
Quality: test pass rate over time.
Lineage: data flow from source to consumption.

Monte Carlo: SaaS end-to-end observability.
ML-based anomaly detection, no manual config.

Elementary: open-source, dbt-native.
Quality dashboard and Slack alerts.
Column-level lineage and impact analysis.

Dashboard: quality score per table, pass rate trends,
oldest failing test, schema change history.
Alerts: Slack for warnings, PagerDuty for critical.

### Step 7: Data SLAs and Escalation
Tiers:
Critical: 99.5% quality score, 5-min alert SLA.
Financial reporting, customer-facing data.
PagerDuty notification.

High: 99% quality score, 15-min alert SLA.
Operational reports, team dashboards.
Slack notification.

Medium: 95% quality score, daily digest.
Internal analysis.

Low: weekly report.
Exploratory data.

Escalation path:
Test fails → team channel → on-call engineer → data quality lead.
SLA breach documented in post-mortem with root cause.

### Step 8: Data Quality Ecosystem Tools
re_data is an open-source framework that tracks row count, freshness, null rates, and distributions over time, building baselines for anomaly detection. Configure tables with YAML thresholds; auto-generates dbt tests from observed patterns. Use for automated baseline-driven quality monitoring without manual expectations.

dbt-audit-helper is a dbt package that compares two relations row-by-row on specified columns, reporting differences, missing rows, and mismatches. Essential for validating refactored dbt models produce identical results to originals.

ODD (Open Data Discovery) is an open-source observability platform ingesting metadata from data sources, tracking quality scores over time, with catalog and lineage. Integrates with dbt, Airflow, and Great Expectations. Use for centralized quality metric aggregation.

data-diff is an open-source tool for diffing tables across databases using checksum-based algorithms. Reports added, removed, and changed rows. Supports cross-database comparison (Postgres vs Snowflake). Use for migration validation, ETL QA, and source-target reconciliation.

```bash
# data-diff: compare tables across databases
data-diff --dbs postgresql://user@pg-host/db snowflake://user@sf-account/db \
  --table public.orders public.orders \
  --key order_id \
  --columns status,total_amount,updated_at
```

### Step 9: Extended Observability Integration
Combine re_data (baseline tracking) + dbt-audit-helper (migration validation) + ODD (centralized observability) + data-diff (cross-database comparison). Pipeline: re_data profiles new tables → generates expectations → feeds ODD quality metrics → data-diff validates ETL output → dbt-audit-helper validates refactoring → ODD alerts on score regression. This stack provides automated baselining, migration safety nets, and cross-system reconciliation without SaaS observability costs.

## Rules
- Every critical table has a data contract
- Automated tests run on every pipeline execution
- Quality dimensions measured and trended weekly
- Freshness SLA defined per table, enforced by monitor
- Data contracts versioned alongside pipeline code
- Pipeline pauses on critical quality failure
- Quality score dashboard visible to data team and stakeholders
- No dashboard or report without quality metadata
- Soda checks for every production table
- Referential integrity verified across all related tables

## References
  - references/data-quality-automation.md — Data Quality Automation
  - references/data-quality-ecosystem.md — Data Quality Ecosystem Tools
  - references/data-quality-incident-management.md — Data Quality Incident Management
  - references/data-quality-management.md — Data Quality Management
  - references/data-quality-metrics.md — Data Quality Metrics
  - references/data-quality-monitoring.md — Data Quality Monitoring
  - references/ge-advanced-patterns.md — Great Expectations Advanced Patterns
  - references/quality-automation.md — Quality Automation
  - references/quality-dimensions.md — Data Quality Dimensions
  - references/soda-check-examples.md — Soda Check Examples
## Architecture Decision Trees

```
Data Quality Framework
├── Real-time quality checks?
│   ├── Yes → Great Expectations with Spark streaming / Deequ streaming
│   └── No → Batch quality checks (dbt tests, Soda)
├── Column-level quality needed?
│   ├── Yes → Great Expectations (rich expectation suite)
│   └── No → dbt generic tests (not null, unique, referential)
├── ML data quality?
│   ├── Yes → TensorFlow Data Validation (TFDV) for feature drift
│   └── No → Row-level checks (freshness, completeness)
└── Centralized quality platform?
    ├── Yes → Soda Cloud / Monte Carlo / Great Expectations Data Context
    └── No → Per-pipeline inline checks
```

**Decision criteria**: Evaluate real-time requirements, team size, existing dbt usage, and ML data pipeline maturity.

## Implementation Patterns

### Great Expectations Checkpoint
```python
# data_quality/ge_checkpoint.py
import great_expectations as ge
from great_expectations.core.batch import RuntimeBatchRequest

class DataQualityPipeline:
    def __init__(self, context_path: str = "./great_expectations"):
        self.context = ge.get_context(context_root_dir=context_path)

    def run_checks(self, df, suite_name: str, datasource_name: str):
        batch_request = RuntimeBatchRequest(
            datasource_name=datasource_name,
            data_connector_name="default_runtime_data_connector_name",
            data_asset_name=suite_name,
            runtime_parameters={"batch_data": df},
            batch_identifiers={"default_identifier_name": "pipeline_run"},
        )
        validator = self.context.get_validator(
            batch_request=batch_request,
            expectation_suite_name=suite_name,
        )
        results = validator.validate()
        validator.save_expectation_suite(discard_failed_expectations=False)
        return results
```

### dbt Quality Tests
```yaml
# data_quality/dbt_tests.yml
version: 2

models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('customers')
              field: customer_id
      - name: total_amount
        tests:
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 100000
  - name: silver_orders
    tests:
      - dbt_utils.expression_is_true:
          expression: "order_date >= '2020-01-01'"
```

## Production Considerations

- **Alert routing**: Route quality failures to domain team Slack channels; page on gold-level failures.
- **Tiered severity**: Bronze failures → log only; Silver failures → alert; Gold failures → page + block downstream.
- **Quality SLAs**: Define freshness (99% of tables within 24h), completeness (< 5% null rate), accuracy (< 1% error).
- **Historical tracking**: Store quality check results in a quality warehouse (table per dataset) for trend analysis.
- **Data contracts**: Enforce contracts via CI checks on schema change; block PR if contract compatibility fails.
- **Root cause analysis**: Link failures to upstream source changes via lineage; auto-file Jira tickets.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Testing everything equally | Noise, ignored alerts | Tier quality checks by criticality |
| No baseline for thresholds | False positives from unfamiliar data | Profile data first, set dynamic thresholds |
| Quality checks on production only | Bad data reaches consumers | Block at staging/Bronze layer |
| No observability integration | Alerts with no context | Link to catalog, lineage, dashboard |
| Ignoring data distribution drift | Static thresholds become obsolete | Periodic retraining of expectation baselines |

## Performance Optimization

- **Partitioned validation**: Run quality checks per partition; only validate new/modified partitions.
- **Sampling**: Use stratified sampling for very large tables (10M+ rows); validate 100% only for critical columns.
- **Parallel validation**: Run table-level checks in parallel (Dask/Spark) for 5x faster quality runs.
- **Caching expectations**: Cache compiled expectations to avoid re-parsing suite definitions on each run.
- **Incremental checks**: Validate only changed rows using CDC streams instead of full table scans.

## Security Considerations

- **Quality metadata access**: Restrict quality historical data access to data stewards and domain owners.
- **PII in expectations**: Never reference raw PII values in expectation parameters; use hashed references.
- **Alert channels**: Encrypt Slack webhook URLs; avoid including sensitive data values in alert messages.
- **Schema validation**: Validate quality results schema before writing to warehouse; reject malformed records.
- **Audit trail**: Log all quality configuration changes and threshold modifications for compliance.

## Handoff
`data-etl-pipeline` for embedding quality checks into pipeline
`data-bi-tools` for displaying quality metadata on dashboards
