# Data Quality Testing

## Why Data Quality Matters
Bad data costs organizations an average of 15-20% of revenue. Data quality testing ensures that analytics and machine learning are built on a trustworthy foundation. It should be automated, integrated into CI/CD pipelines, and continuously monitored.

## Testing Framework

### dbt Tests
dbt provides built-in test types:
- **Unique**: No duplicate values in a column
- **Not Null**: No NULL values in a column
- **Accepted Values**: Column values are in an allowed list
- **Relationships**: Foreign key integrity check
- **Custom**: User-defined SQL assertions

`yaml
# schema.yml
version: 2

models:
  - name: dim_customer
    columns:
      - name: customer_id
        tests:
          - unique
          - not_null
      - name: email
        tests:
          - not_null
          - accepted_values:
              values: ['@company.com']
              config:
                where: "email IS NOT NULL"
      - name: customer_type
        tests:
          - accepted_values:
              values: ['retail', 'wholesale', 'partner']

  - name: fact_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customer')
              field: customer_id
`

### Custom Generic Tests
`sql
-- tests/generic/test_no_nulls_in_dimensions.sql
{% test no_nulls_in_dimensions(model, columns) %}
SELECT *
FROM {{ model }}
WHERE
    {% for col in columns %}
        {{ col }} IS NULL
        {% if not loop.last %} OR {% endif %}
    {% endfor %}
{% endtest %}
`

### Custom Singular Tests
`sql
-- tests/singular/assert_positive_revenue.sql
-- Revenue should never be negative
SELECT
    order_id,
    total_amount
FROM {{ ref('fact_orders') }}
WHERE total_amount < 0

-- tests/singular/assert_order_date_after_customer_created.sql
SELECT
    o.order_id,
    o.order_date,
    c.created_at AS customer_created_at
FROM {{ ref('fact_orders') }} o
JOIN {{ ref('dim_customer') }} c
    ON o.customer_id = c.customer_id
WHERE o.order_date < c.created_at
`

## Great Expectations

### Setting Up Expectations
`python
import great_expectations as ge
from great_expectations.dataset import PandasDataset

def validate_source_data(df):
    dataset = PandasDataset(df)

    expectations = [
        dataset.expect_column_values_to_not_be_null("customer_id"),
        dataset.expect_column_values_to_be_unique("order_id"),
        dataset.expect_column_values_to_be_in_set(
            "status", ["pending", "shipped", "delivered", "cancelled"]
        ),
        dataset.expect_column_mean_to_be_between("total_amount", 0, 100000),
        dataset.expect_column_values_to_be_of_type("order_date", "datetime64[ns]"),
        dataset.expect_column_pair_values_a_to_be_greater_than_b(
            "delivery_date", "order_date"
        ),
    ]

    results = dataset.validate()
    return results

# Usage in Airflow
@task
def validate_orders(data_path):
    df = pd.read_parquet(data_path)
    results = validate_source_data(df)
    if not results["success"]:
        raise ValueError(f"Data validation failed: {results}")
    return data_path
`

### Data Docs
Great Expectations generates human-readable data documentation:
`ash
# Generate data docs
great_expectations docs build

# View expectations suite
great_expectations suite list
great_expectations suite show my_suite
`

## Automated Quality Gates in CI/CD

### GitHub Actions Integration
`yaml
# .github/workflows/data-quality.yml
name: Data Quality Checks
on:
  pull_request:
    paths:
      - 'models/**'
      - 'tests/**'
      - 'seeds/**'

jobs:
  data-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install dbt-postgres great-expectations

      - name: dbt test
        run: |
          dbt deps
          dbt test --select tag:ci_critical

      - name: Great Expectations validation
        run: |
          great_expectations checkpoint run production_checkpoint

      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: target/
`

## Monitoring Data Quality Over Time

### dbt Artifacts and Freshness
`yaml
# Configure freshness checks
sources:
  - name: raw_orders
    loaded_at_field: _loaded_at
    freshness:
      warn_after: {count: 6, period: hour}
      error_after: {count: 24, period: hour}
    tables:
      - name: orders
      - name: order_items
      - name: order_status_history
`

### Tracking Quality Metrics
`sql
-- Create a quality metrics table
CREATE TABLE analytics_quality.dq_metrics (
    check_date DATE NOT NULL,
    model_name VARCHAR(200) NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,  -- pass, fail, error
    rows_tested INT,
    failures INT,
    execution_time_ms INT,
    run_id VARCHAR(100)
);

-- Populate via post-hook
{{ config(
    post_hook=[
        "INSERT INTO analytics_quality.dq_metrics VALUES
        (CURRENT_DATE, '{{ this.name }}', 'row_count',
         'pass', {{ rows_tested }}, 0, 0, '{{ run_id }}')"
    ]
) }}
`

## Data Contracts
Define formal agreements between data producers and consumers:

`yaml
# data_contracts/orders_contract.yaml
dataset: orders
version: 1.0
schema:
  columns:
    order_id:
      type: STRING
      required: true
      constraints:
        - unique
    customer_id:
      type: STRING
      required: true
    order_date:
      type: TIMESTAMP
      required: true
    status:
      type: STRING
      required: true
      allowed_values:
        - pending
        - confirmed
        - shipped
        - delivered
    total_amount:
      type: DECIMAL(10,2)
      required: true
      constraints:
        - min_value: 0
freshness:
  max_latency_hours: 6
  sla: 99.9
owner: data-platform-team
consumers:
  - analytics
  - billing
`

## Key Points
- Automate data quality testing in CI/CD pipelines to catch issues before they reach production
- Combine dbt tests (schema validations) with Great Expectations (data profiling) for comprehensive coverage
- Define data contracts to establish clear ownership and expectations between producers and consumers
- Monitor data quality trends over time with a dedicated metrics table
- Set up alerting and notification for quality check failures
- Include both schema-level and content-level tests (uniqueness, completeness, accuracy, timeliness)
- Test source data freshness to ensure pipelines operate on current data
- Implement tiered testing: critical path vs exhaustive, with appropriate gating
- Document quality rules and expectations collaboratively with business stakeholders
