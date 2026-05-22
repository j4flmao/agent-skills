# Quality Automation

## Great Expectations

### Expectation Suite
```python
import great_expectations as ge

suite = ge.core.ExpectationSuite("orders_suite")

# Column expectations
suite.add_expectation(
    ge.core.ExpectationConfiguration(
        expectation_type="expect_column_values_to_not_be_null",
        kwargs={"column": "order_id"}
    )
)
suite.add_expectation(
    ge.core.ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_unique",
        kwargs={"column": "order_id"}
    )
)
suite.add_expectation(
    ge.core.ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_between",
        kwargs={
            "column": "total_amount",
            "min_value": 0,
            "max_value": 100000
        }
    )
)
suite.add_expectation(
    ge.core.ExpectationConfiguration(
        expectation_type="expect_column_values_to_match_regex",
        kwargs={
            "column": "email",
            "regex": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        }
    )
)
```

### Profiling
```bash
# Auto-generate expectations from sample data
great_expectations profile --profile_file profiling.yml
```
Profiling analyzes data distribution and suggests expectations: null rate, min/max, distinct values, value frequency, type inference. Review and adjust auto-generated expectations before deploying to production.

### Validation
```python
batch = context.get_batch(batch_request)
results = batch.validate(suite)
for result in results.results:
    if not result.success:
        print(f"Failed: {result.expectation_config.expectation_type} on {result.expectation_config.kwargs}")
```
Run in CI: `great_expectations checkpoint run orders_checkpoint`. Block pipeline on critical failures.

### Data Docs
```bash
great_expectations docs build
```
Auto-generated HTML: expectation results per run, validation timeline, data source overview. Hosted on S3/GCS or local filesystem.

## dbt Tests

### Generic Tests
```yaml
version: 2
models:
  - name: dim_customers
    columns:
      - name: customer_id
        tests: [unique, not_null]
      - name: email
        tests:
          - not_null
          - unique
      - name: status
        tests:
          - accepted_values:
              values: ['active', 'inactive', 'churned']
  - name: fct_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
```

### Custom Generic Tests
```sql
-- tests/generic/test_freshness.sql
{% test freshness(model, column_name, max_age_hours=24) %}
    select * from {{ model }}
    where {{ column_name }} < CURRENT_TIMESTAMP - interval '{{ max_age_hours }} hours'
{% endtest %}

-- tests/generic/test_row_count_threshold.sql
{% test row_count_threshold(model, min_count=100, max_count=1000000) %}
    with counts as (
        select count(*) as row_count from {{ model }}
    )
    select * from counts
    where row_count < {{ min_count }} or row_count > {{ max_count }}
{% endtest %}
```

### Singular Tests
```sql
-- tests/assert_no_negative_order_totals.sql
select * from {{ ref('fct_orders') }}
where total_amount < 0
```

### CI Integration
```bash
dbt test --select tag:critical  # block pipeline
dbt test --select severity:error  # block on errors
dbt test --select severity:warn  # informational only
dbt test --store_failures  # store failed rows for analysis
```

## Data Observability

### Key Metrics
- Freshness: time since last successful data load
- Volume: row count vs expected range
- Schema: detect new, missing, or renamed columns
- Quality: test pass rate over time
- Lineage: data flow from source to consumption

### Tools
- Monte Carlo: SaaS, end-to-end observability, automated monitoring
- Sifflet: SaaS, column-level lineage, root cause analysis
- Elementary: open-source, dbt-native, Slack alerts, dashboard
- Lightup: SaaS, continuous quality monitoring
- Databand: observability for data pipelines

### Elementary Configuration
```yaml
# edr/config.yml
monitored_schemas:
  - "marts"
  - "integration"
monitors:
  - freshness
  - volume
  - schema_change
slack:
  token: "{{ env_var('SLACK_TOKEN') }}"
  channel: "#data-quality"
  notification_targets:
    - warn
    - error
```

### Dashboard
Quality score per table (weighted by dimension), trend of pass rates, oldest failing test, schema change history, freshness timeline.

## Data Contracts

### Contract Template
```yaml
# data-contracts/orders-contract.yml
version: "1.0.0"
table: "fct_orders"
owner: "data-platform"
producer: "orders-service"
consumers:
  - "analytics-team"
  - "ml-platform"
  - "finance-reports"
schema:
  columns:
    - name: order_id
      type: STRING
      constraints: [NOT_NULL, UNIQUE]
    - name: customer_id
      type: STRING
      constraints: [NOT_NULL]
    - name: total_amount
      type: DECIMAL(12,2)
      constraints: [NOT_NULL]
      validation:
        min: 0
        max: 100000
    - name: order_status
      type: STRING
      constraints: [NOT_NULL]
      validation:
        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"]
freshness:
  sla_hours: 24
  critical: true
volume:
  min_rows: 1000
  max_rows: 10000000
quality:
  min_completeness_pct: 99.5
  max_null_rate_pct: 0.5
  min_uniqueness_pct: 100
notifications:
  on_breach:
    - channel: "#data-quality"
    - pagerduty: true
```

### Contract Enforcement
- Schema validation at ingestion (column count, names, types, constraints)
- Great Expectations at landing (null rates, uniqueness, ranges, formats)
- dbt tests at transformation (referential integrity, business rules)
- Freshness monitor (time since last successful load)
- Breach action: alert producer and consumer, pause downstream pipelines

## Alerting

### Alert Routing
- Critical: PagerDuty, 5min response SLA
- High: Slack #data-quality channel, immediate attention
- Medium: email digest, daily
- Low: weekly report

### Alert Rules
```yaml
alerts:
  - name: daily_orders_freshness
    type: freshness
    table: fct_orders
    threshold_hours: 26  # SLA 24h + 2h grace
    severity: critical
    action: page_on_call

  - name: orders_row_count_drop
    type: volume_change
    table: fct_orders
    threshold_pct: -50  # 50% drop from baseline
    severity: high
    action: slack_notify

  - name: customers_nulls
    type: null_rate
    table: dim_customers
    column: email
    threshold_pct: 1.0  # >1% nulls
    severity: medium
    action: daily_digest
```
