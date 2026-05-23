---
name: data-pipeline-cicd
description: >
  Use this skill when asked about data pipeline CI/CD, dbt Cloud CI/CD, SQLFluff, SQL linting, Atlantis for SQL, data pipeline testing, environment promotion, schema change management, dbt test, data quality in CI, dataops, or database change management. This skill enforces: dbt Cloud CI/CD with environment promotion gates, SQL linting with SQLFluff in CI, schema change management with migration scripts, data pipeline testing (dbt test, data diff), and Atlantis-style SQL review workflows. Do NOT use for: application CI/CD, infrastructure CI/CD, standard Terraform Atlantis, or API pipeline testing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, cicd, dataops, dbt, sqlfluff, phase-11]
---

# Data Pipeline CI/CD

## Purpose
Establish continuous integration and delivery for data pipelines covering SQL code quality, dbt model testing, schema change management, and environment promotion from dev to production.

## Agent Protocol

### Trigger
Exact user phrases: "data pipeline CI/CD", "dbt CI/CD", "SQLFluff", "SQL linting", "Atlantis SQL", "data pipeline testing", "environment promotion", "schema change management", "dbt test", "data CI", "database CI/CD", "data quality CI", "SQL review", "data deployment".

### Input Context
Before activating, verify:
- Data transformation framework (dbt, SQLMesh, Dataform, custom SQL)
- Data warehouse (Snowflake, BigQuery, Redshift, Databricks, Postgres)
- CI platform (GitHub Actions, GitLab CI, CircleCI, Jenkins)
- Environments (dev, staging, prod) and promotion strategy
- Testing framework (dbt test, Great Expectations, data-diff, Soda)
- Schema migration tool (Alembic, Flyway, dbt migrations)

### Output Artifact
CI/CD pipeline configuration with SQL linting rules, dbt test setup, environment promotion workflow, and schema change management as YAML, SQL, and configuration.

### Response Format
```yaml
# CI/CD pipeline configuration
```
```yaml
# SQLFluff config
```
```sql
-- dbt test example
```
```yaml
-- dbt Cloud job config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] CI pipeline with SQLFluff linting configured
- [ ] dbt test suite with singular and generic tests
- [ ] Environment promotion workflow (dev -> staging -> prod) defined
- [ ] Schema change management with migration scripts
- [ ] Data diff or comparison testing in staging
- [ ] Rollback strategy documented

### Max Response Length
4096

## Workflow

### CI Pipeline for dbt Projects

```yaml
# .github/workflows/dbt-ci.yml
name: dbt CI
on:
  pull_request:
    branches: [main]
    paths: ['transform/**', 'profiles.yml']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install sqlfluff==3.0.0 sqlfluff-templater-dbt
      - run: sqlfluff lint transform/models/ --dialect snowflake --templater dbt

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install dbt-snowflake dbt-core==1.7.0
      - run: dbt deps --project-dir transform
      - run: dbt build --project-dir transform --target ci
      - run: dbt docs generate --project-dir transform
```

### SQLFlint Configuration

```ini
# .sqlfluff
[sqlfluff]
dialect = snowflake
templater = dbt
max_line_length = 80
indent_unit = space
tab_space_size = 4

[sqlfluff:indentation]
indented_joins = False
indented_ctes = True
indented_on_contents = True

[sqlfluff:rules:L003]
force_equal_tab_space = True

[sqlfluff:rules:L010]
capitalisation_policy = upper

[sqlfluff:rules:L014]
capitalisation_policy = lower

[sqlfluff:rules:L030]
capitalisation_policy = upper

[sqlfluff:rules:L040]
capitalisation_policy = upper

[sqlfluff:rules:L042]
force_divide_by_zero = False

[sqlfluff:rules:AM04]
allow_scalar = False

[sqlfluff:rules:CP01]
ignore_words = ["customer", "company", "vendor"]
```

### dbt Environment Promotion

```yaml
# dbt_project.yml
name: analytics
version: "1.0.0"
config-version: 2
profile: analytics

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

models:
  analytics:
    staging:
      +materialized: view
      +schema: stg
      tags: ["staging"]
    intermediate:
      +materialized: ephemeral
      +schema: int
      tags: ["intermediate"]
    marts:
      +materialized: table
      +schema: marts
      tags: ["marts"]

    marketing:
      +schema: marketing
      tags: ["marketing"]
```

```yaml
# .github/workflows/promote-to-prod.yml
name: Promote to Production
on:
  workflow_dispatch:
    inputs:
      commit-sha:
        description: 'Commit SHA to promote'
        required: true

jobs:
  diff:
    runs-on: ubuntu-latest
    outputs:
      has_changes: ${{ steps.dbt-diff.outputs.has_changes }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: dbt data diff
        id: dbt-diff
        run: |
          git checkout ${{ github.event.inputs.commit-sha }}
          # Compare staging vs prod with data-diff
          pip install data-diff
          data-diff \
            --d1 "snowflake://${{ secrets.SF_STAGING }}" \
            --d2 "snowflake://${{ secrets.SF_PROD }}" \
            --table analytics.marts.orders \
            --key order_id \
            --output diff_output.json
          echo "has_changes=true" >> $GITHUB_OUTPUT

  approve:
    needs: diff
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Manual approval required
        run: echo "Approved by ${{ github.actor }}"

  deploy:
    needs: [diff, approve]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: pip install dbt-snowflake dbt-core==1.7.0
      - run: dbt deps --project-dir transform
      - name: Run dbt in production
        run: dbt build --project-dir transform --target prod --full-refresh
        env:
          DBT_TARGET: prod
```

### Schema Change Management

```yaml
# migrations/001_add_created_at.sql
-- Migration: Add created_at column to customer_orders
-- Date: 2026-05-15
-- Author: j4flmao

-- Step 1: Add column as nullable
ALTER TABLE analytics.marts.customer_orders
ADD COLUMN created_at TIMESTAMP_NTZ;

-- Step 2: Backfill existing rows
UPDATE analytics.marts.customer_orders
SET created_at = (
  SELECT MIN(order_date)
  FROM analytics.stg.orders o
  WHERE o.customer_id = customer_orders.customer_id
)
WHERE created_at IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE analytics.marts.customer_orders
ALTER COLUMN created_at SET NOT NULL;
```

```yaml
# .github/workflows/schema-migration.yml
name: Schema Migration
on:
  pull_request:
    paths: ['migrations/**']

jobs:
  lint-migration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install sqlfluff
      - run: sqlfluff lint migrations/ --dialect snowflake
      - run: |
          # Check migration naming convention
          for f in migrations/*.sql; do
            basename=$(basename "$f")
            if ! echo "$basename" | grep -qE '^[0-9]{3}_.+\.sql$'; then
              echo "ERROR: Migration $basename must match pattern 3-digit-number_description.sql"
              exit 1
            fi
          done

  dry-run:
    runs-on: ubuntu-latest
    steps:
      - run: |
          # Simulate migration ordering
          pip install sqlparse
          python -c "
            import os, glob
            migrations = sorted(glob.glob('migrations/*.sql'))
            print(f'Found {len(migrations)} migrations to apply:')
            for m in migrations:
              print(f'  {os.path.basename(m)}')
          "
```

### dbt Test Patterns

```sql
-- tests/generic/test_positive_revenue.sql
{% test positive_revenue(model, column_name) %}
SELECT *
FROM {{ model }}
WHERE {{ column_name }} < 0
{% endtest %}

-- tests/singleton/customer_id_not_null.sql
SELECT *
FROM {{ ref('dim_customers') }}
WHERE customer_id IS NULL

-- tests/singleton/order_after_customer.sql
SELECT
  o.order_id,
  o.customer_id,
  o.order_date,
  c.first_order_date
FROM {{ ref('fact_orders') }} o
LEFT JOIN {{ ref('dim_customers') }} c
  ON o.customer_id = c.customer_id
WHERE o.order_date < c.first_order_date
```

```yaml
# models/marts/schema.yml
version: 2

models:
  - name: fact_orders
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
      - name: order_amount
        tests:
          - positive_revenue
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 1000000
      - name: order_status
        tests:
          - accepted_values:
              values: ['pending', 'shipped', 'delivered', 'cancelled']
```

### Atlantis for SQL Workflow

```yaml
# atlantis.yml
version: 3
projects:
  - name: analytics-dbt
    dir: transform
    workflow: dbt-plan
    autoplan:
      enabled: true
      when_modified: ["models/**/*.sql", "models/**/*.yml"]

workflows:
  dbt-plan:
    plan:
      steps:
        - run: pip install dbt-snowflake dbt-core==1.7.0
        - run: dbt deps --project-dir $DIR
        - run: dbt compile --project-dir $DIR
        - run: dbt ls --project-dir $DIR --output json > $DIR/model_list.txt
        - run: |
            echo "## dbt Model Changes"
            cat $DIR/model_list.txt | python -c "
            import json, sys
            models = json.load(sys.stdin)
            for m in models:
                print(f'- {m.get('name', 'unknown')} ({m.get('materialized', 'view')})')
            "
    apply:
      steps:
        - run: pip install dbt-snowflake dbt-core==1.7.0
        - run: dbt deps --project-dir $DIR
        - run: |
            if [[ "${{.Environment}}" == "production" ]]; then
              dbt run --project-dir $DIR --target prod
              dbt test --project-dir $DIR --target prod
            else
              dbt build --project-dir $DIR
            fi
```

### dbt Cloud CI/CD Job

```yaml
# dbt Cloud API job configuration (created via dbt Cloud API)
job:
  name: "CI - PR Checks"
  environment_id: 12345
  dbt_version: "1.7.0"
  triggers:
    - pull_request
  execute_steps:
    - "dbt deps"
    - "dbt build --select state:modified+ --target ci"
    - "dbt test --select tag:ci"
  defer_to_production: true
  job_type: ci

# ---

job:
  name: "Deploy to Production"
  environment_id: 67890
  dbt_version: "1.7.0"
  triggers:
    - merge
  execute_steps:
    - "dbt deps"
    - "dbt build --target prod --full-refresh"
    - "dbt test --target prod"
  defer_to_production: true
  job_type: merge
```

### Environment Promotion Gates

| Gate | Check | Blocking | Auto or Manual |
|---|---|---|---|
| Developer | SQLFluff pass, dbt test pass | Yes | Auto |
| Code Review | PR approval from senior engineer | Yes | Manual |
| Staging | dbt build success, data-diff < 0.5% variance | Yes | Auto |
| Performance | model run time, query profile review | Warning | Auto |
| Business | Data quality score > 95% | Yes | Manual |
| Prod Deploy | All gates passed, run during maintenance window | Yes | Manual |

### Rollback Strategy

```sql
-- Rollback script: revert_schema_change_v001.sql
-- Reverts migration 001: Remove created_at column

-- Step 1: Drop dependent objects first
DROP VIEW IF EXISTS analytics.marts.customer_kpi_view;

-- Step 2: Drop NOT NULL constraint
ALTER TABLE analytics.marts.customer_orders
ALTER COLUMN created_at DROP NOT NULL;

-- Step 3: Clean up data
UPDATE analytics.marts.customer_orders
SET created_at = NULL;

-- Step 4: Drop column
ALTER TABLE analytics.marts.customer_orders
DROP COLUMN created_at;

-- Step 5: Recreate view
-- (original CREATE VIEW statement here)
```

```yaml
# Rollback procedure in CI
rollback:
  steps:
    - trigger: dbt build --select tag:rollback --target prod
    - execute: rollback.sql migration in reverse order
    - verify: dbt test --select tag:critical --target prod
    - notify: slack #data-alerts with rollback summary
```

## Rules
- Every PR must pass SQLFluff linting and dbt test suite before merge
- Use environment promotion gates: dev -> staging -> prod with manual approval for prod
- Name migrations sequentially (`001_description.sql`, `002_description.sql`)
- Never run `dbt build --full-refresh` on prod without a prior successful staging run
- Test schema changes with `ALTER TABLE ... ADD COLUMN ... NULL` before adding NOT NULL
- Always have a rollback SQL script for each migration
- Defer to production state in CI to avoid false positives from schema drift
- Monitor dbt run duration; alert on runs exceeding SLA by 50%
- Enforce consistent SQL formatting via `.sqlfluff` in the repository root
- Use `data-diff` in staging to detect unexpected data changes before prod promotion

## References
- `references/dbt-ci-cd-pipeline.md` — Full dbt CI/CD pipeline setup including GitHub Actions, dbt Cloud API jobs, environment promotion, and branch strategy
- `references/sql-linting-and-testing.md` — SQLFluff rule configuration, dbt test patterns (singular, generic, freshness), data-diff comparison, and Atlantis SQL review workflow

## Handoff
`data-data-quality` for data quality monitoring and alerting in production
`data-etl-pipeline` for pipeline orchestration and execution
`data-workflow-orchestration` for scheduling and dependency management
