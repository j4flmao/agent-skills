# dbt Testing Framework

## Package Setup
```yaml
# packages.yml
packages:
  - package: equalexperts/dbt_unit_testing
    version: 1.0.0
  - package: dbt-labs/dbt_utils
    version: ">=1.0.0"
```
```bash
dbt deps
```

## Unit Test Patterns

### Basic Unit Test
```sql
-- tests/unit/test_stg_orders.sql
{{ dbt_unit_testing.test('stg_orders') }}

{{ dbt_unit_testing.mock_ref('raw_orders', [
    {'order_id': 1, 'customer_id': 100, 'amount': 50.00, 'status': 'completed'},
    {'order_id': 2, 'customer_id': 101, 'amount': 100.00, 'status': 'pending'},
    {'order_id': 3, 'customer_id': None, 'amount': 25.00, 'status': 'completed'},
]) }}

{{ dbt_unit_testing.expect_model_columns([
    'order_id', 'customer_id', 'amount', 'status', 'has_customer'
]) }}

{{ dbt_unit_testing.expect_row_count(3) }}

{{ dbt_unit_testing.expect_specific_row('order_id', 1, {
    'customer_id': 100, 'has_customer': true
}) }}

{{ dbt_unit_testing.expect_specific_row('order_id', 3, {
    'customer_id': None, 'has_customer': false
}) }}

{{ dbt_unit_testing.end() }}
```

### Testing Incremental Logic
```sql
-- tests/unit/test_int_orders_incremental.sql
{{ dbt_unit_testing.test('int_orders_incremental') }}

-- Full refresh: load all records
{{ dbt_unit_testing.mock_ref('stg_orders', [
    {'order_id': 1, 'amount': 50.00, 'order_date': '2026-04-30'},
    {'order_id': 2, 'amount': 75.00, 'order_date': '2026-05-01'},
], options={'is_incremental': false}) }}
{{ dbt_unit_testing.expect_row_count(2) }}

-- Incremental: only new/changed records
{{ dbt_unit_testing.mock_ref('stg_orders', [
    {'order_id': 2, 'amount': 80.00, 'order_date': '2026-05-01'},
    {'order_id': 3, 'amount': 200.00, 'order_date': '2026-05-02'},
], options={'is_incremental': true}) }}
{{ dbt_unit_testing.expect_row_count(2) }}
{{ dbt_unit_testing.end() }}
```

### Testing Snapshots (SCD Type 2)
```sql
{{ dbt_unit_testing.test('snapshot_orders') }}
{{ dbt_unit_testing.mock_ref('stg_orders', [
    {'order_id': 1, 'status': 'pending', 'updated_at': '2026-05-01 10:00:00'},
    {'order_id': 1, 'status': 'completed', 'updated_at': '2026-05-01 12:00:00'},
]) }}
{{ dbt_unit_testing.expect_row_count(2) }}
{{ dbt_unit_testing.expect_specific_row('order_id', 1, {
    'dbt_valid_to': None, 'status': 'completed'
}, position=1) }}
{{ dbt_unit_testing.end() }}
```

## Custom Generic Tests
```sql
-- tests/generic/fresh_enough.sql
{% test fresh_enough(model, column_name, max_hours=24) %}
WITH freshness AS (
    SELECT MAX({{ column_name }}) AS latest FROM {{ model }}
)
SELECT * FROM freshness
WHERE latest < CURRENT_TIMESTAMP - INTERVAL '{{ max_hours }} hours'
  AND latest IS NOT NULL
{% endtest %}

-- tests/generic/row_count_threshold.sql
{% test row_count_threshold(model, min_rows=1, max_rows=none) %}
WITH row_count AS (SELECT COUNT(*) AS cnt FROM {{ model }})
SELECT * FROM row_count WHERE cnt < {{ min_rows }}
{% if max_rows %} OR cnt > {{ max_rows }} {% endif %}
{% endtest %}
```

## Running Tests
```bash
# Run all unit tests
dbt-unit-testing run
# Run specific test
dbt-unit-testing run --select test_stg_orders
# Run with dbt tests
dbt test && dbt-unit-testing run --fail-fast
```

## CI Integration (GitHub Actions)
```yaml
# .github/workflows/dbt-unit-tests.yml
on: {pull_request: {paths: ['models/**', 'tests/**']}}
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: {POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test}
        ports: [5432:5432]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install dbt-postgres dbt-unit-testing && dbt deps
      - run: dbt run --select state:modified+
      - run: dbt test --select state:modified+
      - run: dbt-unit-testing run --fail-fast
```

## Best Practices
- Unit test every model with CASE WHEN, window functions, or business logic
- Test both incremental and full-refresh modes for incremental models
- Use descriptive mock data covering edge cases (nulls, boundaries)
- Keep test data small (3-5 rows per mock)
- Run unit tests in CI on every PR modifying SQL models
- >80% test coverage on mart models, >50% on intermediate
- Document each test's purpose and edge case coverage
