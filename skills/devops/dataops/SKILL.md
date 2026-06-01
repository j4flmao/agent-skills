---
name: devops-dataops
description: >
  Use this skill when implementing DataOps: CI/CD for data pipelines, dbt CI/CD,
  SQLFluff, Great Expectations, data pipeline versioning, data testing in CI,
  data environment management, data contract CI, data lineage in CI/CD.
  Do NOT use for: data warehouse schema design (use data-warehouse),
  ETL pipeline design (use etl-pipeline), general CI/CD (use cicd-pipeline).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, dataops, data, phase-11]
---

# DataOps Agent

## Purpose
Implements CI/CD pipelines for data transformations, testing, environment management, and data contract enforcement.

## Agent Protocol

### Trigger
User request includes: DataOps, CI/CD for data, data pipeline CI/CD, data testing CI, dbt CI/CD, SQLFluff, data pipeline deployment, data environment management, data contract CI.

### Input Context
- Data transformation framework (dbt, SQLFluff, custom).
- Target warehouse (Snowflake, BigQuery, Redshift, Postgres, Databricks).
- Source data freshness SLA and update cadence.
- Testing strategy (dbt tests, Great Expectations, Soda, custom).
- Environment layout (dev/staging/prod or branch-based).
- Deployment method (dbt Cloud, self-hosted, Airflow-triggered).

### Output Artifact
DataOps pipeline CI/CD configuration, dbt project setup, data testing config, environment promotion rules, data contracts.

### Response Format
`
## DataOps Pipeline
### CI Configuration
Framework: {dbt/sqlfluff/custom}
Linting: {sqlfluff config} | Threshold: {strict/warn}
Testing: {dbt test / Great Expectations / both}
Model Compilation: {enabled/disabled}
Data Contract Validation: {schema check / row count / freshness}

### CD Pipeline
Environments: [{dev, staging, prod}]
Promotion Gates:
  dev-staging: {tests pass, lint pass}
  staging-prod: {tests pass, schema compat, manual approval}
Rollback Strategy: {dbt source freshness / version pin / reverse migration}
`

No preamble. No postamble. No explanations.

### Completion Criteria
- CI pipeline lints and tests all data models on every PR.
- CD pipeline promotes models through environments with validation gates.
- Data contracts validated in CI with enforcement configured.
- Rollback strategy documented and tested.
- Data lineage tracked across environments.
- dbt slim CI or equivalent for incremental runs.
- Source freshness checked before every deployment.

## Architecture / Decision Trees

### Data Transformation Framework Decision Tree
- Standard SQL transformations, small team: dbt (best DX).
- Complex multi-language (Python, Scala, SQL): custom framework on Airflow/Dagster.
- Heavy data quality requirements: dbt + Great Expectations.
- Real-time transformations: streaming (Flink, Kafka Streams, Spark Streaming).
- Legacy SQL exists: wrap incrementally in dbt.
- Airflow exists in org: Airflow orchestrates, dbt transforms.
- Large enterprise compliance: dbt Cloud (managed, RBAC, audit).

### CI/CD Architecture Options

| Approach | Description | Best For |
|---|---|---|
| dbt Slim CI | Only build models changed vs production manifest | Large dbt projects (100+ models) |
| Full Rebuild CI | Build all models every time | Small projects (<50 models) |
| GE + dbt | Great Expectations quality + dbt transformation | Data quality focused teams |
| dbt-expectations | GE tests as dbt package | dbt-centric teams |
| Soda + dbt | Soda checks in CI pipeline | Teams wanting SQL-based quality |
| Dagster + dbt | Dagster orchestrates, dbt transforms | Complex pipeline DAGs |

### Environment Strategy

| Environment | Data Freshness | CI/CD Trigger | Validation Gates | Data Volume |
|---|---|---|---|---|
| Dev | Stale snapshot | PR created | SQLFluff, compile, unit tests | Subset (10%) |
| Staging | Near-production | PR merged | Slim CI, integration tests, contracts | Subset (50%) |
| Prod | Live | Manual approval | Full tests, source freshness, contracts | Full (100%) |

### Testing Framework Choice

| Tool | Scope | Language | Integration | Coverage Type |
|---|---|---|---|---|
| dbt test | dbt models | SQL/YAML | Native in dbt | Schema, uniqueness, relationships |
| Great Expectations | Any data source | Python | Standalone, Airflow, dbt | Profiling, expectations, validation |
| dbt-expectations | dbt models | SQL/YAML | dbt package | GE-style tests in dbt |
| Soda | Any data source | YAML | CI, Airflow, K8s | Row count, freshness, schema |
| Deequ | Spark data | Scala/Python | Spark jobs | Column metrics, constraints |
| data-diff | Any DB | CLI/Python | CI | Cross-DB diff, regression |

## Core Workflow

### Step 1: dbt Project CI Configuration
`yaml
name: dbt CI
on:
  pull_request:
    paths:
      - 'models/**'
      - 'tests/**'
      - 'macros/**'
      - 'dbt_project.yml'

env:
  DBT_PROFILES_DIR: ./
  DBT_TARGET: ci

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install sqlfluff sqlfluff-templater-dbt
      - run: dbt deps
      - run: sqlfluff lint models/ --dialect postgres --processes 4

  slim-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install dbt-bigquery
      - run: dbt deps
      - name: Download production manifest
        uses: actions/download-artifact@v4
        with:
          name: prod-manifest
          path: target-manifest/
      - run: dbt build --select state:modified+ --state target-manifest/
      - run: dbt source freshness

  data-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install dbt-bigquery great-expectations
      - run: dbt deps
      - run: dbt build
      - run: great_expectations checkpoint run ci_checkpoint
`

### Step 2: dbt Project Structure
`
my-dbt-project/
  models/
    staging/
      stg_customers.sql
      stg_orders.sql
      _stg_sources.yml
    intermediate/
      int_customer_orders.sql
      _int_models.yml
    marts/
      fct_orders.sql
      dim_customers.sql
      _marts.yml
  tests/
    generic/
      assert_positive_total.sql
      assert_valid_email.sql
    singular/
      expected_row_count.sql
      referential_integrity.sql
  macros/
    grant_permissions.sql
    generate_schema_name.sql
  analyses/
  seeds/
  snapshots/
  dbt_project.yml
  packages.yml
  profiles.yml
  .sqlfluff
`

### Step 3: SQLFluff Configuration
`ini
[sqlfluff]
dialect = postgres
templater = dbt
max_line_length = 120
indent_unit = space
tab_space_size = 4

[sqlfluff:indentation]
indented_joins = True
indented_ctes = True
indented_on_contents = True

[sqlfluff:layout:type:comma]
line_position = trailing

[sqlfluff:rules]
capitalisation.keywords = upper
capitalisation.functions = upper
capitalisation.literals = upper
`

### Step 4: Data Contracts
`yaml
contracts:
  - name: stg_customers
    description: Cleaned customer data
    columns:
      - name: customer_id
        data_type: integer
        not_null: true
        unique: true
      - name: email
        data_type: varchar(255)
        not_null: true
        unique: true
      - name: signup_date
        data_type: timestamp
        not_null: true
        freshness:
          warn: { lookback: 1 }
          error: { lookback: 2 }
    row_count:
      min: 1000
      max: 10000000
    sla:
      availability: 99.9%
      freshness: 1h
    owners: [data-team@example.com]
    downstream: [int_customer_orders, dim_customers]
`

### Step 5: dbt YAML Tests
`yaml
version: 2

sources:
  - name: raw_data
    database: raw
    schema: public
    tables:
      - name: customers
        loaded_at_field: _etl_loaded_at
        freshness:
          warn: { rule: max_bucket, lookback: 1 }
          error: { rule: max_bucket, lookback: 3 }
        columns:
          - name: id
            tests: [unique, not_null]
          - name: email
            tests: [not_null, unique]
      - name: orders
        loaded_at_field: _etl_loaded_at
        freshness:
          warn: { rule: max_bucket, lookback: 1 }
          error: { rule: max_bucket, lookback: 6 }
        columns:
          - name: id
            tests: [unique, not_null]
          - name: user_id
            tests: [not_null]
          - name: user_id
            tests:
              - relationships:
                  to: source('raw_data', 'customers')
                  field: id

models:
  - name: stg_customers
    columns:
      - name: customer_id
        tests: [unique, not_null]
      - name: email
        tests: [unique, not_null]
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
    tests:
      - dbt_utils.expression_is_true:
          expression: "total_amount >= 0"
      - dbt_utils.recency:
          datepart: day
          field: order_date
          interval: 1
`

### Step 6: Environment Promotion CD
`yaml
name: dbt Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install dbt-bigquery
      - run: dbt deps
      - run: dbt seed --target staging
      - run: dbt run --target staging
      - run: dbt test --target staging
      - run: dbt source freshness --target staging
      - uses: actions/upload-artifact@v4
        with:
          name: staging-manifest
          path: target/manifest.json

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    concurrency: dbt-prod
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install dbt-bigquery
      - run: dbt deps
      - run: dbt compile --target prod
      - run: dbt run --target prod --selector prod_deploy
      - run: dbt test --target prod --exposure:critical
      - run: dbt source freshness --target prod
      - uses: actions/upload-artifact@v4
        with:
          name: prod-manifest
          path: target/manifest.json
`

### Step 7: Data Lineage and Documentation
`ash
# Generate and deploy documentation
dbt docs generate
dbt docs serve --port 8080

# Deploy to static hosting for team access
aws s3 sync target/ s3://dbt-docs-prod/ --delete
`

## Anti-Patterns

### Anti-Pattern 1: Full Rebuild in Large Projects
Building all models on every PR takes hours for 100+ model projects. Without slim CI, CI pipeline time grows linearly with model count. Always use state:modified+ with production manifest stored as artifact.

### Anti-Pattern 2: Ignoring Source Freshness
Models compile and tests pass against stale sources, then fail in production because source data changed or stopped arriving. Run dbt source freshness before any deployment. Set freshness thresholds with warn and error buckets.

### Anti-Pattern 3: No Data Contract Validation
Downstream consumers are surprised when column types change, columns are dropped, or row counts drop below thresholds. Define contracts per model with schema, row count range, and freshness SLA. Validate breaking changes in CI.

### Anti-Pattern 4: Insufficient Test Coverage
Tests pass means nothing if there are no tests. Every model must have uniqueness and not_null on primary keys. Set explicit coverage targets. Track test coverage in CI dashboard.

### Anti-Pattern 5: Full Refresh Without Testing
Running dbt run --full-refresh in production without testing can break downstream models. Always test full refresh in staging first. Use targeted --select for specific models. Backup tables before destructive operations.

### Anti-Pattern 6: Environment Config Drift
Dev, staging, and prod configurations diverge over time. Use dbt profiles in version control with environment variables for secrets. Test in staging with production-like data volume.

### Anti-Pattern 7: No Rollback Plan
When a dbt deployment fails mid-run, partial state corrupts downstream models. Have a documented rollback procedure tested in staging. Maintain N-1 versions deployable.

## Production Considerations

### Pipeline Performance
- Target CI pipeline completion under 30 minutes for dev/staging.
- Use slim CI for large projects - only build changed models.
- Parallelize independent model builds with dbt --threads.
- Use incremental models for large tables, not full refresh.
- Materialize staging as views, intermediate as tables, marts as tables.

### Source Freshness
- Define freshness thresholds per source table.
- Use warn.buckets for proactive notification.
- Use error.buckets for blocking deployment.
- Monitor with dbt source freshness in every deploy.
- Alert on freshness violations via Slack/PagerDuty.

### Testing Cadence
- Per commit: dbt compile, SQLFluff lint.
- Per PR: dbt slim CI, dbt test (changed models).
- Per deploy: dbt test (all models), GE suite, contract validation.
- Daily: source freshness, data quality monitoring.
- Weekly: full test suite, test coverage report.

### Incident Response
1. Identify failed model from dbt run output.
2. Determine failure type: compilation, test failure, timeout.
3. Compilation error: fix SQL, open PR, redeploy.
4. Test failure: check source data quality, adjust tests.
5. Timeout: optimize SQL, increase timeout, add indexes.
6. Rollback: revert Git commit, redeploy previous version.
7. Document root cause and add preventive test.

## Rules
- Always use slim CI for dbt -- never rebuild entire project on every PR.
- SQLFluff errors block merge -- warnings do not.
- Every model must have uniqueness and not_null tests on primary key.
- Environment promotion must be gated on all tests passing.
- Schema changes must be backward compatible or have migration plan.
- Data contracts must include SLA expectations for freshness and volume.
- Rollback must be tested in staging before production use.
- Source freshness checked before every deployment.
- Model directory must follow staging/intermediate/mart convention.
- dbt packages version-pinned in packages.yml.
- CI pipeline must complete within 30 minutes for dev.
- CD to production requires manual approval gate.
- Run history retained for minimum 90 days.
- Data contracts enforced in CI for all production-facing models.

## Compared With

### DataOps vs MLOps
DataOps: CI/CD for data pipelines, testing, environment promotion, contracts. MLOps: CI/CD for ML models, feature stores, model registry, A/B testing. Overlap in CI/CD tooling but different artifacts (SQL vs models). DataOps is deterministic transformations; MLOps is statistical models.

### dbt vs SQLFluff vs Great Expectations
dbt: transformation framework (build, run, test SQL). SQLFluff: SQL linter (style and anti-patterns only). Great Expectations: data quality testing (profiling, expectations, validation). These are complementary -- use all three.

### dbt vs Airflow
dbt: transformation layer (SELECT statements). Airflow: orchestration layer (DAG of tasks, scheduling). dbt runs inside Airflow DAG. Complementary -- Airflow triggers dbt runs.

## Operations & Maintenance

### Weekly Tasks
- Review dbt run history for failures and latency.
- Check source freshness adherence.
- Review test pass rates.
- Investigate slow-running models.

### Monthly Tasks
- Update dbt version and test compatibility.
- Review model performance and optimize slow queries.
- Update package dependencies.
- Audit contract definitions for completeness.

### Quarterly Tasks
- Full test coverage audit.
- Data contract review and update.
- Performance benchmark against baseline.
- Disaster recovery drill (rollback from backup).

## References
- references/dataops-fundamentals.md -- Dataops Fundamentals
- references/dataops-advanced.md -- Dataops Advanced Topics
- references/data-cicd.md -- Data CI/CD
- references/data-testing.md -- Data Testing
- references/data-contracts-ops.md -- Data Contracts Operations
- references/data-observability.md -- DataOps Observability
- references/dataops-pipeline-orchestration.md -- Pipeline Orchestration
- references/dataops-data-quality-monitoring.md -- Data Quality Monitoring

## Handoff
For data warehouse schema design, hand off to data-warehouse. For data pipeline ETL, hand off to etl-pipeline. For quality monitoring, hand off to data-quality.
