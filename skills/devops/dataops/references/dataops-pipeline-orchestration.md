# DataOps Pipeline Orchestration

## Overview

DataOps pipeline orchestration covers the design, implementation, and operation of CI/CD pipelines for data transformations, testing, environment management, and deployment. This reference covers dbt CI/CD patterns, SQL linting integration, environment promotion strategies, data contract validation, rollback procedures, and lineage tracking across environments.

## Pipeline Architecture

### Core Components

```
                    [Source Control]
                          |
                    [Pull Request]
                          |
                    +-----+------+
                    |            |
              [CI Pipeline]  [Contract Check]
                    |            |
              [Lint + Test]  [Schema Validation]
                    |            |
              [Build Models]  [Freshness Check]
                    |            |
              [Artifact: manifest.json]
                          |
                    [Merge to Main]
                          |
                    [CD Pipeline]
                          |
              +-----------+-----------+
              |           |           |
          [Dev]      [Staging]    [Production]
        (validate)  (integrate)   (deploy)
```

### Pipeline Stages

| Stage | Purpose | Tools | Duration Target |
|---|---|---|---|
| Lint | Code style and anti-pattern detection | SQLFluff | < 2 min |
| Compile | Syntax checking, model compilation | dbt compile | < 5 min |
| Test | Data quality validation | dbt test, Great Expectations | < 10 min |
| Freshness | Source data staleness check | dbt source freshness | < 2 min |
| Build | Model materialization | dbt build (slim CI) | < 15 min |
| Contract | Schema and SLA validation | Custom + dbt | < 5 min |
| Lineage | Impact analysis | dbt docs, custom | < 2 min |
| Promote | Environment deployment | Git tags, CI/CD | < 10 min |

## dbt CI/CD Pipeline

### Slim CI Configuration

Slim CI builds only models that have changed since the last production deployment, drastically reducing pipeline time for large dbt projects.

```yaml
# .github/workflows/dbt-ci.yml
name: dbt CI

on:
  pull_request:
    paths:
      - 'models/**'
      - 'tests/**'
      - 'macros/**'
      - 'dbt_project.yml'
      - 'packages.yml'

jobs:
  slim-ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dbt
        run: |
          pip install dbt-core dbt-postgres
          pip install -r requirements.txt

      - name: Install dbt packages
        run: dbt deps

      - name: Download production manifest
        id: manifest
        continue-on-error: true
        run: |
          aws s3 cp s3://my-dbt-artifacts/production/manifest.json \
            target/manifest.json
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: SQL Lint
        run: |
          pip install sqlfluff
          sqlfluff lint models/ --dialect postgres --config .sqlfluff

      - name: Run slim CI
        run: |
          if [ "${{ steps.manifest.outcome }}" == "success" ]; then
            dbt build --select state:modified+ \
              --state target/ \
              --vars '{ci: true}'
          else
            echo "No production manifest found, running full build"
            dbt build --vars '{ci: true}'
          fi

      - name: Source freshness check
        run: dbt source freshness

      - name: Upload CI artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dbt-artifacts
          path: target/
```

### dbt CD Pipeline

```yaml
# .github/workflows/dbt-cd.yml
name: dbt CD

on:
  push:
    branches:
      - main
    paths:
      - 'models/**'
      - 'tests/**'
      - 'macros/**'
      - 'dbt_project.yml'

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Setup dbt
        run: |
          pip install dbt-core dbt-postgres
          dbt deps

      - name: Deploy to staging
        id: deploy_staging
        run: |
          dbt build --target staging --full-refresh \
            --select state:modified+
          dbt docs generate --target staging

      - name: Run staging tests
        run: dbt test --target staging

      - name: Validate data contracts
        run: |
          python scripts/validate_contracts.py \
            --env staging \
            --manifest target/manifest.json

      - name: Upload staging manifest
        run: |
          aws s3 cp target/manifest.json \
            s3://my-dbt-artifacts/staging/manifest.json

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup dbt
        run: |
          pip install dbt-core dbt-postgres
          dbt deps

      - name: Download staging manifest
        run: |
          aws s3 cp s3://my-dbt-artifacts/staging/manifest.json \
            target/manifest.json

      - name: Manual approval gate
        uses: trstringer/manual-approval@v1
        with:
          secret: ${{ secrets.APPROVAL_TOKEN }}
          approvers: data-engineering-leads

      - name: Deploy to production
        id: deploy_production
        run: |
          dbt build --target production \
            --select state:modified+
          dbt docs generate --target production

      - name: Run critical tests in production
        run: |
          dbt test --target production \
            --select tag:critical

      - name: Upload production manifest
        run: |
          aws s3 cp target/manifest.json \
            s3://my-dbt-artifacts/production/manifest.json

      - name: Notify deployment
        if: always()
        run: |
          if [ "${{ job.status }}" == "success" ]; then
            echo "Production deployment successful"
          else
            echo "Production deployment failed - initiating rollback"
          fi
```

## SQL Linting with SQLFluff

### Configuration

```ini
# .sqlfluff
[sqlfluff]
dialect = postgres
templater = dbt
max_line_length = 120
indent_unit = space
tab_space_size = 4

[sqlfluff:indentation]
allow_implicit_indents = True
indented_joins = True
indented_ctes = True

[sqlfluff:layout:type:comma]
line_position = trailing

[sqlfluff:layout:type:join_condition]
line_position = trailing

[sqlfluff:rules:capitalisation.keywords]
capitalisation_policy = upper

[sqlfluff:rules:capitalisation.functions]
capitalisation_policy = lower

[sqlfluff:rules:capitalisation.literals]
capitalisation_policy = upper

[sqlfluff:rules:aliasing.length]
min_alias_length = 2

[sqlfluff:rules:aliasing.self_alias.force]
force_enable = True

[sqlfluff:rules:structure.column_order]
enable = True
clause_layout:
  select:
    start_with: select
    column_order:
      - id
      - reference_keys
      - foreign_keys
      - metric_columns
      - date_columns

[sqlfluff:rules:L010]
# Keywords
capitalisation_policy = upper

[sqlfluff:rules:L014]
# Unquoted identifiers
capitalisation_policy = lower

[sqlfluff:rules:L016]
# Line length
ignore_comment_lines = True

[sqlfluff:rules:L026]
# References in GROUP BY/ORDER BY
force_enable = True

[sqlfluff:rules:L030]
# Function names
capitalisation_policy = lower

[sqlfluff:rules:L031]
# Avoid table aliases in from clauses
force_enable = True
```

### CI Integration

```yaml
# SQLFluff in CI
sqlfluff_ci:
  stage: lint
  script:
    # Lint all models
    - sqlfluff lint models/ --dialect postgres

    # Fail on errors, warn on style
    - sqlfluff lint models/ --dialect postgres \
      --rules L010,L014,L016,L026 \
      --require-error

    # Generate parse tree for debugging
    - sqlfluff parse models/staging/stg_orders.sql \
      --dialect postgres
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## Environment Promotion

### Promotion Strategy

```yaml
# Environment promotion rules
promotion:
  dev:
    trigger: "merge to main"
    action: "dbt build --target dev"
    validation: "tests pass, lint passes"
    artifacts:
      - "manifest.json"
      - "run_results.json"

  staging:
    trigger: "dev deployment success"
    action: "dbt build --select state:modified+ --target staging"
    validation:
      - "all tests pass"
      - "data contracts valid"
      - "source freshness check"
      - "lineage comparison"
    artifacts:
      - "manifest.json"
      - "run_results.json"

  production:
    trigger: "staging validation success + manual approval"
    action: "dbt build --select state:modified+ --target production"
    validation:
      - "critical tests pass"
      - "schema backward compatible"
      - "data contracts valid"
    post_deploy:
      - "monitor for 30 minutes"
      - "verify data quality"
      - "notify stakeholders"
    rollback:
      - "git revert to previous tag"
      - "dbt build --target production --select state:modified+"
      - "verify rollback success"
```

### Environment Configuration

```yaml
# profiles.yml
config:
  dev:
    type: postgres
    threads: 4
    schema: dbt_dev
    extras:
      full_refresh_on_merge: true

  staging:
    type: postgres
    threads: 8
    schema: dbt_staging
    extras:
      slim_ci: true
      borrow_production_manifest: true

  production:
    type: postgres
    threads: 16
    schema: dbt_prod
    extras:
      incremental_on_changed: true
      full_refresh_on_schema_change: true
```

## Data Contract Validation

### Contract Definition

```yaml
# data_contracts/orders.yml
version: 1
contracts:
  - model: "fct_orders"
    description: "Orders fact table with transaction data"

    schema:
      - name: "order_id"
        type: "integer"
        constraints:
          - "not_null"
          - "unique"
        description: "Primary key for orders"

      - name: "customer_id"
        type: "integer"
        constraints:
          - "not_null"
        references: "dim_customers.customer_id"
        description: "Foreign key to customers"

      - name: "order_date"
        type: "date"
        constraints:
          - "not_null"
        description: "Date order was placed"

      - name: "order_amount"
        type: "decimal(10,2)"
        constraints:
          - "not_null"
        description: "Total order amount"

      - name: "order_status"
        type: "varchar(20)"
        constraints:
          - "not_null"
          - "accepted_values: pending,shipped,delivered,cancelled"
        description: "Current order status"

    quality:
      row_count:
        min: 1000
        max: 100000000
        sla: "daily"

      freshness:
        max_lag: "24h"
        sla: "daily"

      completeness:
        column_completeness:
          - name: "order_id"
            threshold: 1.0
          - name: "customer_id"
            threshold: 0.95
          - name: "order_amount"
            threshold: 0.99

    consumers:
      - "team-billing"
      - "team-analytics"
      - "team-reports"

    owner: "team-data-engineering"
    sla: "99.9% uptime"
```

### Contract Validation in CI

```python
# scripts/validate_contracts.py
import yaml
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta


def validate_contracts(env, manifest_path):
    """
    Validate data contracts against actual model state
    """
    with open(manifest_path) as f:
        manifest = json.load(f)

    contracts_dir = Path('data_contracts')
    errors = []

    for contract_file in contracts_dir.glob('*.yml'):
        with open(contract_file) as f:
            contract = yaml.safe_load(f)

        for c in contract.get('contracts', []):
            model_name = c['model']
            model_node = manifest['nodes'].get(
                f'model.{manifest["metadata"]["project_name"]}.{model_name}'
            )

            if not model_node:
                errors.append(f"Model {model_name} not found in manifest")
                continue

            # Validate schema compatibility
            actual_columns = model_node['columns']
            expected_columns = {col['name']: col for col in c.get('schema', [])}

            for expected_name, expected_col in expected_columns.items():
                if expected_name not in actual_columns:
                    errors.append(
                        f"Missing column {expected_name} in {model_name}"
                    )
                    continue

                actual_type = actual_columns[expected_name].get('data_type', '')
                expected_type = expected_col.get('type', '')

                if not is_type_compatible(actual_type, expected_type):
                    errors.append(
                        f"Type mismatch for {model_name}.{expected_name}: "
                        f"expected {expected_type}, got {actual_type}"
                    )

    if errors:
        print("Contract validation failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

    print(f"Contract validation passed for {env}")
    return True


def is_type_compatible(actual, expected):
    """
    Check if actual type is compatible with expected type
    Backward compatibility: can add fields, cannot remove or change types
    """
    type_mapping = {
        'integer': ['integer', 'bigint', 'smallint', 'numeric'],
        'varchar': ['varchar', 'text', 'char'],
        'decimal': ['decimal', 'numeric', 'float', 'double'],
        'date': ['date', 'timestamp', 'timestamptz'],
        'boolean': ['boolean', 'bool'],
    }

    expected_base = expected.split('(')[0].lower()
    actual_base = actual.split('(')[0].lower()

    # Backward compatible: actual type can be wider but not narrower
    compatible_types = type_mapping.get(expected_base, [expected_base])
    return actual_base in compatible_types
```

## Data Lineage Tracking

### dbt Lineage Artifacts

```yaml
# dbt_project.yml lineage configuration
lineage:
  generate_docs: true
  catalog_targets:
    - schema: dbt_prod
      database: analytics

  column_level:
    enabled: true
    track_downstream_columns: true

  exposure_definitions:
    - name: "Revenue Dashboard"
      type: "dashboard"
      depends_on:
        - ref('fct_orders')
        - ref('dim_customers')
      owner:
        name: "Analytics Team"
        email: "analytics@company.com"

    - name: "Customer 360 Report"
      type: "dashboard"
      depends_on:
        - ref('dim_customers')
        - ref('fct_transactions')
      owner:
        name: "Product Team"
        email: "product@company.com"
```

### Automating Lineage Capture

```python
# scripts/capture_lineage.py
import json
from pathlib import Path


def compare_lineage_changes(base_manifest, target_manifest):
    """
    Compare lineage between environments for impact analysis
    """
    with open(base_manifest) as f:
        base = json.load(f)

    with open(target_manifest) as f:
        target = json.load(f)

    changes = {
        'new_models': [],
        'removed_models': [],
        'modified_models': [],
        'impacted_downstream': []
    }

    base_models = set(base['nodes'].keys())
    target_models = set(target['nodes'].keys())

    # New models
    changes['new_models'] = list(target_models - base_models)

    # Removed models
    changes['removed_models'] = list(base_models - target_models)

    # Modified models
    for model in target_models & base_models:
        base_hash = base['nodes'][model].get('checksum', {}).get('current', '')
        target_hash = target['nodes'][model].get('checksum', {}).get('current', '')
        if base_hash != target_hash:
            changes['modified_models'].append(model)

    # Impact analysis: find downstream models affected by changes
    for model in changes['modified_models'] + changes['removed_models']:
        downstream = find_downstream_models(target, model)
        changes['impacted_downstream'].extend(downstream)

    return changes


def find_downstream_models(manifest, model_name):
    """
    Find all models that depend on the given model
    """
    downstream = []
    for name, node in manifest['nodes'].items():
        if 'depends_on' in node:
            deps = node['depends_on'].get('nodes', [])
            if model_name in deps:
                downstream.append(name)
                # Recursively find further downstream models
                downstream.extend(
                    find_downstream_models(manifest, name)
                )
    return downstream


def generate_lineage_report(changes, output_path):
    """
    Generate lineage change report
    """
    report = {
        'summary': {
            'new_models': len(changes['new_models']),
            'removed_models': len(changes['removed_models']),
            'modified_models': len(changes['modified_models']),
            'impacted_downstream': len(set(changes['impacted_downstream']))
        },
        'details': changes
    }

    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)

    return report
```

## Rollback Procedures

### Rollback Strategy

```yaml
# rollback.yml
rollback:
  strategy: "git_revert_and_redeploy"

  steps:
    - name: "Assess Impact"
      actions:
        - "Check affected models"
        - "Identify downstream consumers"
        - "Determine rollback scope"

    - name: "Revert Deployment"
      actions:
        - "Revert git to previous tag: git revert HEAD"
        - "Push revert: git push origin main"
        - "Trigger rebuild via CI/CD"

    - name: "Rebuild Previous Version"
      actions:
        - "dbt build --target production --select state:modified+"
        - "Use previous manifest for state comparison"

    - name: "Verify Rollback"
      actions:
        - "Run critical tests: dbt test --select tag:critical"
        - "Check data quality metrics"
        - "Verify downstream consumers functional"

  scenarios:
    compilation_error:
      response: "Immediate rollback"
      criteria: "dbt run fails with compilation error"

    test_failure:
      response: "Evaluate severity"
      criteria:
        - "Critical test failure: rollback"
        - "Non-critical failure: investigate"

    data_corruption:
      response: "Restore from backup + rollback"
      criteria: "Wrong data written to production"
      additional_steps:
        - "Restore affected tables from snapshot"
        - "Refresh downstream models from restored data"

  safety:
    test_rollback_in_staging: true
    maintain_n_1_deployable: true
    version_pin_packages: true
```

### Automated Rollback

```yaml
# .github/workflows/rollback.yml
name: dbt Rollback

on:
  workflow_dispatch:
    inputs:
      target_version:
        description: 'Tag to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.target_version }}

      - name: Setup dbt
        run: |
          pip install dbt-core dbt-postgres
          dbt deps

      - name: Download rollback manifest
        run: |
          aws s3 cp \
            s3://my-dbt-artifacts/rollback/manifest.json \
            target/manifest.json

      - name: Build rollback version
        run: |
          dbt build --target production \
            --select state:modified+

      - name: Verify rollback
        run: |
          dbt test --target production --select tag:critical

      - name: Notify teams
        run: |
          echo "Rollback to ${{ github.event.inputs.target_version }} complete"
```

## Great Expectations Integration

### GE Configuration

```yaml
# great_expectations.yml
great_expectations:
  datasources:
    - name: "production_dw"
      class_name: Datasource
      execution_engine:
        class_name: SqlAlchemyExecutionEngine
      data_connectors:
        default_inferred_data_connector:
          class_name: InferredAssetSqlDataConnector
          name: whole_table

  expectations_suite:
    - name: "orders_suite"
      expectations:
        - expectation_type: expect_column_values_to_be_unique
          kwargs:
            column: order_id
          meta:
            critical: true

        - expectation_type: expect_column_values_to_not_be_null
          kwargs:
            column: order_id
            column_list:
              - order_id
              - customer_id
              - order_date
              - order_amount
          meta:
            critical: true

        - expectation_type: expect_column_values_to_be_between
          kwargs:
            column: order_amount
            min_value: 0
            max_value: 1000000
          meta:
            severity: error

        - expectation_type: expect_column_value_lengths_to_be_between
          kwargs:
            column: order_status
            min_value: 3
            max_value: 20
          meta:
            severity: warning

        - expectation_type: expect_column_values_to_be_in_set
          kwargs:
            column: order_status
            value_set:
              - pending
              - shipped
              - delivered
              - cancelled
          meta:
            severity: error

  checkpoint:
    - name: "production_checkpoint"
      action_list:
        - name: store_validation_result
          action:
            class_name: StoreValidationResultAction

        - name: update_data_docs
          action:
            class_name: UpdateDataDocsAction

        - name: send_slack_notification
          action:
            class_name: SlackNotificationAction
            slack_webhook: ${SLACK_WEBHOOK}
            notify_on: all
```

### GE in CI/CD

```yaml
# GE integration in CI
great_expectations_ci:
  stage: test
  script:
    - great_expectations checkpoint run production_checkpoint

    # Fail on critical failures only
    - |
      python << EOF
      import json
      with open('gx_results.json') as f:
          results = json.load(f)
      failures = [
          r for r in results['run_results']
          if not r['success']
          and r['meta'].get('critical', False)
      ]
      if failures:
          raise Exception(f"Critical GE failures: {failures}")
      EOF
```

## Monitoring and Observability

### dbt Run Monitoring

```yaml
# dbt run monitoring configuration
monitoring:
  metrics:
    - name: "dbt_run_duration"
      description: "Duration of dbt run"
      threshold_seconds: 1800  # 30 minutes
      alert_on_exceed: true

    - name: "dbt_test_pass_rate"
      description: "Percentage of tests passed"
      threshold_percent: 99.5
      alert_on_below: true

    - name: "dbt_model_freshness"
      description: "Source data freshness in hours"
      threshold_hours: 24
      alert_on_exceed: true

    - name: "dbt_error_count"
      description: "Number of model errors"
      threshold_count: 0
      alert_on_exceed: true

  alerts:
    - name: "dbt_deployment_failure"
      channels:
        - "slack:#data-alerts"
        - "email:data-engineering@company.com"
      response_time: "15 minutes"

    - name: "dbt_test_failure_critical"
      channels:
        - "slack:#data-critical"
        - "pagerduty:data-engineering"
      response_time: "5 minutes"

  dashboards:
    - name: "dbt Performance"
      metrics:
        - "run_duration"
        - "model_count"
        - "test_count"
        - "error_rate"

    - name: "Data Quality"
      metrics:
        - "test_pass_rate"
        - "freshness_violations"
        - "contract_violations"
```

## Pipeline Performance Optimization

### Slim CI Optimization

```yaml
# Slim CI optimization strategies
optimization:
  model_selection:
    state_modified_plus: true
    production_manifest: "s3://artifacts/prod/manifest.json"

  parallelization:
    model_threads: 8
    test_threads: 4
    parallel_tests: true

  caching:
    dbt_packages_cache: true
    pip_cache: true
    manifest_cache: true

  incremental_builds:
    enabled: true
    strategy: "insert_overwrite"
    unique_key: "id"
    on_schema_change: "fail"

  selective_tests:
    run_tests_only_on_changed: true
    critical_tests_always: true
```

## Key Points

- Slim CI is essential for large dbt projects -- only build changed models
- SQLFluff enforces consistent SQL style and catches anti-patterns
- Environment promotion requires validation gates at each stage
- Data contracts protect downstream consumers from breaking changes
- Rollback procedures must be tested in staging before production use
- Lineage tracking enables impact analysis for schema and code changes
- Great Expectations provides comprehensive data quality validation
- Pipeline monitoring with alerting ensures rapid issue detection
- Incremental builds reduce deployment time for production
- Version-pin dbt packages and dependencies for reproducibility
- Manual approval gate recommended for production deployments
- Test coverage targets ensure minimum quality standards
- Freshness checks prevent stale data from reaching downstream models
- Automatic rollback via git revert and redeploy
- Parallel execution reduces pipeline duration
