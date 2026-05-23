# Quality Automation

## Great Expectations

### Expectation Suite
```python
import great_expectations as ge
suite = ge.core.ExpectationSuite("orders_suite")
for col in ["order_id"]:
    suite.add_expectation(ge.core.ExpectationConfiguration(
        expectation_type="expect_column_values_to_not_be_null", kwargs={"column": col}))
    suite.add_expectation(ge.core.ExpectationConfiguration(
        expectation_type="expect_column_values_to_be_unique", kwargs={"column": col}))
suite.add_expectation(ge.core.ExpectationConfiguration(
    expectation_type="expect_column_values_to_be_between",
    kwargs={"column": "total_amount", "min_value": 0, "max_value": 100000}))
suite.add_expectation(ge.core.ExpectationConfiguration(
    expectation_type="expect_column_values_to_match_regex",
    kwargs={"column": "email", "regex": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"}))
```

### Profiling & Validation
```bash
great_expectations profile --profile_file profiling.yml
great_expectations checkpoint run orders_checkpoint
```
Auto-generates expectations from sample data, then validates in CI.
Block on critical failures. Data docs: auto-generated HTML with results,
validation timeline, data source overview. Host on S3 or GCS.

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
        tests: [not_null, unique]
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
{% test freshness(model, column_name, max_age_hours=24) %}
    select * from {{ model }}
    where {{ column_name }} < CURRENT_TIMESTAMP - interval '{{ max_age_hours }} hours'
{% endtest %}

{% test row_count_threshold(model, min_count=100, max_count=1000000) %}
    with counts as (select count(*) as row_count from {{ model }})
    select * from counts
    where row_count < {{ min_count }} or row_count > {{ max_count }}
{% endtest %}
```

### Singular Tests
```sql
select * from {{ ref('fct_orders') }}
where total_amount < 0
```

### CI Integration
```bash
dbt test --select tag:critical
dbt test --select severity:error
dbt test --store_failures
```

## Soda Checks
```yaml
checks for dim_customers:
  - freshness(updated_at) < 24h
  - row_count > 1000
  - missing_percent(email) < 1
  - duplicate_percent(customer_id) = 0
  - schema_change: warn
```
Execution: `soda scan -d snowflake -c configuration.yml checks.yml`.

## Data Observability
Key metrics: freshness (time since load), volume (row count vs expected),
schema (new/missing columns), quality (pass rate over time),
lineage (source to consumption).

Monte Carlo: SaaS, ML-based anomaly detection, no manual config.
Elementary: open-source, dbt-native, quality dashboard, Slack alerts.
Sifflet: SaaS, column-level lineage, root cause analysis.

```yaml
# Elementary config
monitored_schemas: ["marts", "integration"]
monitors: [freshness, volume, schema_change]
slack: {token: "{{ env_var('SLACK_TOKEN') }}", channel: "#data-quality"}
```

## Data Contracts
```yaml
version: "1.0.0"
table: "fct_orders"
owner: "data-platform"
schema:
  columns:
    - {name: order_id, type: STRING, constraints: [NOT_NULL, UNIQUE]}
    - {name: customer_id, type: STRING, constraints: [NOT_NULL]}
    - {name: total_amount, type: DECIMAL(12,2), constraints: [NOT_NULL], validation: {min: 0}}
    - {name: order_status, type: STRING, constraints: [NOT_NULL], validation: {enum: ["pending","confirmed","shipped","delivered","cancelled"]}}
freshness: {sla_hours: 24, critical: true}
volume: {min_rows: 1000, max_rows: 10000000}
quality: {min_completeness_pct: 99.5, min_uniqueness_pct: 100}
notifications: {on_breach: [{channel: "#data-quality"}, {pagerduty: true}]}
```
Enforcement: schema at ingestion, Great Expectations at landing, dbt at transform.

## Alerting
Critical: PagerDuty, 5min SLA. High: Slack, immediate.
Medium: daily digest. Low: weekly report.
