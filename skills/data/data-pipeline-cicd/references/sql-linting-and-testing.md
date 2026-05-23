# SQL Linting and Testing

## SQLFluff Rule Configuration

### Core Rules

```ini
# .sqlfluff
[sqlfluff]
dialect = snowflake
templater = dbt
max_line_length = 80
indent_unit = space
tab_space_size = 4

[sqlfluff:rules]
# Capitalization: enforce consistent keyword casing
L010 = upper      # Keywords: UPPER
L014 = lower      # Unquoted identifiers: lower
L030 = upper      # Function names: UPPER
L040 = upper      # Null/boolean literals: UPPER

# Layout and formatting
L001 = True       # No trailing whitespace
L003 = True       # Indent consistently
L004 = True       # Indent only with spaces
L005 = True       # Single space before/after operators
L006 = True       # Single space between keywords and brackets
L008 = True       # Comma before newline (Snowflake style)
L009 = True       # Single space after comma
L016 = True       # Line length check (80 chars)

# Structure
L022 = True       # Blank line before CTE closing bracket
L024 = True       # Single whitespace before AS keyword
L025 = True       # Tab/space consistency
L031 = True       # Aliases in FROM and JOIN
L034 = True       # Select wildcard check
L036 = True       # Select targets on new line
L050 = True       # No leading comma (use trailing)
L052 = True       # Semicolon required at statement end
L054 = True       # IN () clause parentheses
L058 = True       # Nested case formatting
L062 = True       # Quoted identifiers

# Anti-patterns
L042 = False      # Allow divide by zero (handled in code)
CP01 = True       # Unnecessary COALESCE
CV01 = True       # Implicit conversions
PR01 = True       # Unnecessary parentheses
LI01 = True       # Prefer != over <>
```

### dbt-Specific Rules

Custom SQLFluff rules for dbt projects enforce Jinja template best practices:

```ini
# .sqlfluff

[sqlfluff:rules:L010]
capitalisation_policy = upper

[sqlfluff:rules:L030]
capitalisation_policy = upper

# Jinja block formatting
[sqlfluff:rules:JINJA_LINTING]
single_quotes = True
block_indent = True
unused_refs = error
undef_refs = error
```

### SQLFluff Integration in Pre-commit

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/sqlfluff/sqlfluff
    rev: v3.0.0
    hooks:
      - id: sqlfluff-lint
        args: [--dialect, snowflake, --templater, dbt]
        files: ^transform/models/.*\.sql$
      - id: sqlfluff-fix
        args: [--dialect, snowflake, --templater, dbt]
        files: ^transform/models/.*\.sql$
```

## dbt Test Patterns

### Generic Tests (Reusable)

```sql
-- tests/generic/test_at_least_one.sql
{% test at_least_one(model, column_name, group_by_column) %}
SELECT
    {{ group_by_column }},
    COUNT(*) AS row_count
FROM {{ model }}
GROUP BY {{ group_by_column }}
HAVING COUNT(*) = 0
{% endtest %}

-- tests/generic/test_no_orphaned_records.sql
{% test no_orphaned_records(model, child_column, parent_model, parent_column) %}
SELECT
    c.{{ child_column }} AS orphan_id
FROM {{ model }} c
LEFT JOIN {{ parent_model }} p
    ON c.{{ child_column }} = p.{{ parent_column }}
WHERE p.{{ parent_column }} IS NULL
{% endtest %}
```

### Singular Tests (One-Off Business Logic)

```sql
-- tests/singular/order_total_matches_line_items.sql
SELECT
    o.order_id,
    o.total_amount AS order_total,
    SUM(li.unit_price * li.quantity) AS calculated_total,
    ABS(o.total_amount - SUM(li.unit_price * li.quantity)) AS difference
FROM {{ ref('fct_orders') }} o
JOIN {{ ref('int_order_line_items') }} li
    ON o.order_id = li.order_id
GROUP BY o.order_id, o.total_amount
HAVING ABS(o.total_amount - SUM(li.unit_price * li.quantity)) > 0.01

-- tests/singular/orders_without_customers.sql
SELECT
    o.order_id,
    o.customer_id
FROM {{ ref('fct_orders') }} o
LEFT JOIN {{ ref('dim_customers') }} c
    ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL
```

### Schema YML Test Configuration

```yaml
# models/marts/schema.yml
version: 2

models:
  - name: dim_customers
    description: "Customer dimension with latest attributes"
    columns:
      - name: customer_id
        description: "Unique customer identifier"
        tests:
          - unique
          - not_null
      - name: email
        tests:
          - unique
          - not_null
      - name: first_order_date
        description: "Date of the customer's first order"
        tests:
          - not_null
      - name: customer_status
        tests:
          - accepted_values:
              values: ['active', 'churned', 'inactive']

  - name: fct_orders
    description: "Order fact table"
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: order_date
        tests:
          - not_null
      - name: order_amount
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 1000000
      - name: order_status
        tests:
          - accepted_values:
              values: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

sources:
  - name: raw_orders
    schema: raw
    tables:
      - name: orders
        tests:
          - dbt_expectations.expect_table_row_count_to_be_between:
              min_value: 1
              max_value: 100000000

  - name: raw_customers
    schema: raw
    tables:
      - name: customers
        freshness:
          warn_after: {count: 24, period: hour}
          error_after: {count: 48, period: hour}
        loaded_at_field: updated_at
```

## Data-Diff for Staging vs Production Comparison

```bash
# Install data-diff
pip install data-diff

# Compare tables between staging and production
data-diff \
  --d1 "snowflake://user:pass@account/staging_db?warehouse=staging_wh&role=staging_role" \
  --d2 "snowflake://user:pass@account/prod_db?warehouse=prod_wh&role=prod_role" \
  --table analytics.marts.dim_customers \
  --key customer_id \
  --columns "customer_id,email,customer_status,lifetime_value,updated_at" \
  --min-confidence 0.95 \
  --output json://diff_report.json

# Check row counts match
python -c "
import json
with open('diff_report.json') as f:
    diff = json.load(f)
rows_only_in_d1 = diff.get('only_in_d1', [])
rows_only_in_d2 = diff.get('only_in_d2', [])
rows_different = diff.get('different', [])
print(f'Only in staging: {len(rows_only_in_d1)}')
print(f'Only in prod: {len(rows_only_in_d2)}')
print(f'Different values: {len(rows_different)}')
if len(rows_different) > 10:
    print('WARNING: >10 rows differ between environments')
    exit(1)
"
```

## Atlantis for SQL Review Workflow

```yaml
# atlantis.yaml for SQL projects
version: 3
automerge: false
parallel_plan: true
parallel_apply: false

projects:
  - name: warehouse-migrations
    dir: migrations
    workflow: migration-plan
    autoplan:
      enabled: true
      when_modified: ["**/*.sql"]

  - name: dbt-models
    dir: transform
    workflow: dbt-plan
    autoplan:
      enabled: true
      when_modified: ["models/**/*.sql", "models/**/*.yml"]

workflows:
  migration-plan:
    plan:
      steps:
        - run: pip install sqlfluff
        - run: sqlfluff lint $DIR --dialect snowflake
        - run: |
            python -c "
            import os, sys
            dir = '$DIR'
            files = sorted(os.listdir(dir))
            for f in files:
                if f.endswith('.sql'):
                    print(f'Migration: {f}')
                    version = f.split('_')[0]
                    if not version.isdigit() or len(version) != 3:
                        print(f'  ERROR: Expected 3-digit prefix, got {version}')
                        sys.exit(1)
            "
    apply:
      steps:
        - run: |
            for f in $DIR/*.sql; do
              echo "Applying $(basename $f)..."
              snowsql -c myconn -f $f
            done

  dbt-plan:
    plan:
      steps:
        - run: pip install dbt-snowflake dbt-core==1.7.0
        - run: dbt deps --project-dir $DIR
        - run: dbt compile --project-dir $DIR
        - run: |
            dbt ls --project-dir $DIR --output json --resource-type model > $DIR/model_list.json
            echo "## Models to be created/modified:"
            python -c "
            import json
            with open('$DIR/model_list.json') as f:
                for line in f:
                    model = json.loads(line)
                    print(f\"  - {model['name']} ({model['config']['materialized']})\")
            "
    apply:
      steps:
        - run: pip install dbt-snowflake dbt-core==1.7.0
        - run: dbt deps --project-dir $DIR
        - run: dbt build --project-dir $DIR --target prod
        - run: dbt test --project-dir $DIR --target prod
```

## Source Freshness Testing

```yaml
# models/sources.yml
version: 2

sources:
  - name: operational_db
    database: raw
    schema: public
    tables:
      - name: orders
        freshness:
          warn_after: {count: 1, period: hour}
          error_after: {count: 3, period: hour}
        loaded_at_field: updated_at
        tests:
          - unique:
              column_name: order_id

      - name: customers
        freshness:
          warn_after: {count: 24, period: hour}
          error_after: {count: 48, period: hour}
        loaded_at_field: updated_at

      - name: products
        freshness: null
```

```bash
# Run source freshness as part of CI
dbt source freshness --target prod

# Output: YAML report
# freshness.yml
# sources:
#   operational_db:
#     orders: ERROR (last loaded: 4 hours ago)
#     customers: PASS (last loaded: 1 hour ago)
```

## Performance Testing in CI

```yaml
# .github/workflows/dbt-performance.yml
name: dbt Performance Check
on:
  pull_request:
    paths: ['transform/models/**']

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install dbt-snowflake dbt-core==1.7.0
      - name: Measure model run time
        run: |
          dbt deps --project-dir transform
          dbt run --project-dir transform --target ci --select state:modified+
          # Extract run times from dbt run results
          python -c "
          import json, os
          results_path = 'transform/target/run_results.json'
          with open(results_path) as f:
              results = json.load(f)
          for r in results.get('results', []):
              name = r.get('unique_id', 'unknown')
              time_ms = r.get('execution_time', 0) * 1000
              status = 'SLOW' if time_ms > 600000 else 'OK'  # 10 min threshold
              print(f'{status}: {name} took {time_ms/1000:.1f}s')
          "
```
