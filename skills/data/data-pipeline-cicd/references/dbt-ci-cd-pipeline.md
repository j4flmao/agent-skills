# dbt CI/CD Pipeline

## Branch Strategy

```
main (production)
  ├── staging (staging environment)
  │     └── feat/abc-123-add-model (feature branches)
  │     └── fix/abc-456-fix-typo (fix branches)
  └── release/v2.3.0 (release branches for backports)
```

| Branch | Environment | dbt Target | Deploy Trigger |
|---|---|---|---|
| `feat/*` | Developer sandbox | `dev` | Manual `dbt build` |
| `staging` | Staging warehouse | `ci` | PR merged to staging |
| `main` | Production warehouse | `prod` | PR merged to main |
| `release/*` | Production (hotfix) | `prod` | Manual approval |

## GitHub Actions: Full dbt Pipeline

```yaml
name: dbt Pipeline
on:
  pull_request:
    branches: [main, staging]
    paths: ['transform/**', 'profiles.yml', 'dbt_project.yml']
  push:
    branches: [main]
    paths: ['transform/**', 'profiles.yml', 'dbt_project.yml']

env:
  DBT_PROFILES_DIR: transform/profiles
  DBT_PROJECT_DIR: transform

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip
      - run: pip install -r transform/requirements.txt
      - run: sqlfluff lint transform/models/ --dialect snowflake --templater dbt
      - run: sqlfluff lint transform/tests/ --dialect snowflake --templater dbt

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip
      - uses: actions/cache@v4
        with:
          path: ~/.dbt
          key: dbt-${{ hashFiles('transform/dbt_project.yml') }}
      - run: pip install -r transform/requirements.txt
      - name: dbt deps
        run: dbt deps --project-dir ${{ env.DBT_PROJECT_DIR }}
      - name: dbt build (CI)
        run: >
          dbt build
          --project-dir ${{ env.DBT_PROJECT_DIR }}
          --target ci
          --select state:modified+
          --defer
          --state ./prod-manifest
        env:
          DBT_SNOWFLAKE_CI_SCHEMA: dbt_ci_${{ github.sha }}
      - name: dbt test
        run: dbt test --project-dir ${{ env.DBT_PROJECT_DIR }} --target ci
      - name: Upload CI artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dbt-ci-artifacts
          path: transform/target/

  data-diff:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: pip install data-diff
      - name: Compare staging vs prod
        run: |
          data-diff \
            --d1 "snowflake://${{ secrets.STAGING_SNOWFLAKE }}" \
            --d2 "snowflake://${{ secrets.PROD_SNOWFLAKE }}" \
            --table analytics.marts.orders \
            --key order_id \
            --min-confidence 0.95 \
            --output diff_report.json
      - name: Upload diff report
        uses: actions/upload-artifact@v4
        with:
          name: data-diff-report
          path: diff_report.json

  deploy-prod:
    runs-on: ubuntu-latest
    needs: [test, data-diff]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r transform/requirements.txt
      - name: dbt deps
        run: dbt deps --project-dir ${{ env.DBT_PROJECT_DIR }}
      - name: dbt build (prod)
        run: dbt build --project-dir ${{ env.DBT_PROJECT_DIR }} --target prod
      - name: dbt source freshness
        run: dbt source freshness --project-dir ${{ env.DBT_PROJECT_DIR }} --target prod
      - name: dbt docs generate
        run: dbt docs generate --project-dir ${{ env.DBT_PROJECT_DIR }} --target prod
      - name: Deploy dbt docs to S3
        run: |
          aws s3 sync transform/target/ s3://dbt-docs/ --delete --exclude "*" --include "index.html" --include "manifest.json" --include "catalog.json" --include "run_results.json"
```

## dbt Cloud CI/CD Configuration

```yaml
# dbt Cloud CI job
job:
  name: "CI Checks"
  environment_id: 12345
  dbt_version: "1.7.6"
  triggers:
    - pull_request
    - push
  execute_steps:
    - "dbt deps"
    - "dbt build --select state:modified+ --target ci --defer --state ./prod-manifest"
    - "dbt test --select tag:ci"
  defer_to_production: true
  generate_docs: true
  threads: 8
  target_name: ci
  schema: dbt_ci_{{ env_var('DBT_CLOUD_PR_ID') }}

# dbt Cloud production deployment job
job:
  name: "Production Deploy"
  environment_id: 67890
  dbt_version: "1.7.6"
  triggers:
    - merge
  execute_steps:
    - "dbt deps"
    - "dbt seed --target prod"
    - "dbt run --target prod"
    - "dbt snapshot --target prod"
    - "dbt test --target prod"
    - "dbt source freshness --target prod"
  schedule:
    cron: "0 6 * * *"
    timezone: America/New_York
  generate_docs: true
  threads: 8
  target_name: prod
```

## State-Based Deployment (Defer and Compare)

Deferring to production manifest avoids rebuilding models that haven't changed:

```bash
# Download production manifest
aws s3 cp s3://dbt-artifacts/prod/manifest.json transform/prod-manifest/manifest.json

# Build only modified models and their downstream dependencies
dbt build \
  --select "state:modified+" \
  --defer \
  --state ./prod-manifest \
  --target ci

# Rebuild all models (full refresh)
dbt build --target prod --full-refresh
```

## dbt Project Structure for CI/CD

```
transform/
├── .sqlfluff
├── .sqlfluffignore
├── dbt_project.yml
├── requirements.txt
├── profiles/
│   ├── ci.profiles.yml
│   └── prod.profiles.yml
├── models/
│   ├── staging/
│   │   ├── schema.yml
│   │   ├── stg_orders.sql
│   │   └── stg_customers.sql
│   ├── intermediate/
│   │   ├── schema.yml
│   │   ├── int_order_payments.sql
│   │   └── int_customer_metrics.sql
│   └── marts/
│       ├── schema.yml
│       ├── dim_customers.sql
│       ├── dim_products.sql
│       └── fct_orders.sql
├── tests/
│   ├── generic/
│   │   ├── test_positive_revenue.sql
│   │   └── test_unique_email.sql
│   └── singular/
│       ├── assert_order_total_matches.sql
│       └── assert_no_future_dates.sql
├── macros/
│   ├── grant_select.sql
│   └── generate_schema_name.sql
├── snapshots/
│   └── scd_customers.sql
├── seeds/
│   └── country_codes.csv
└── analyses/
    └── exploratory_queries.sql
```

## Environment-Specific Configurations

```yaml
# profiles/ci.profiles.yml
analytics:
  target: ci
  outputs:
    ci:
      type: snowflake
      account: "{{ env_var('DBT_SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('DBT_SNOWFLAKE_USER') }}"
      password: "{{ env_var('DBT_SNOWFLAKE_PASSWORD') }}"
      role: DBT_CI_ROLE
      warehouse: DBT_CI_WAREHOUSE
      database: ANALYTICS_CI
      schema: "dbt_{{ env_var('DBT_CLOUD_PR_ID', 'dev') }}"
      threads: 8

    prod:
      type: snowflake
      account: "{{ env_var('DBT_SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('DBT_SNOWFLAKE_USER') }}"
      password: "{{ env_var('DBT_SNOWFLAKE_PASSWORD') }}"
      role: DBT_PROD_ROLE
      warehouse: DBT_PROD_WAREHOUSE
      database: ANALYTICS_PROD
      schema: "{{ env_var('DBT_USER_SCHEMA', 'analytics') }}"
      threads: 16
```

## CI Failure Recovery

| Failure | Action | Recovery |
|---|---|---|
| SQLFluff violation | Block PR merge | Fix formatting, re-run checks |
| dbt test failure | Block PR merge | Fix model logic, add data fix |
| Schema change conflict | Block PR merge | Rebase on main, resolve conflicts |
| Run timeout ( > 60 min) | Cancel job | Split model into smaller pieces |
| Source freshness failure | Warning, non-blocking | Alert data owner, investigate delay |
| Data diff > 1% variance | Block prod deploy | Investigate root cause, run reconciliation |
