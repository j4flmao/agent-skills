# Data Quality in CI/CD Reference

## Great Expectations Checkpoints

Great Expectations integration in CI/CD validates data quality before deployment.

### Checkpoint Configuration

```yaml
# great_expectations/checkpoints/production_deploy.yml
name: production_deploy_checkpoint
config_version: 3.0
class_name: Checkpoint
module_name: great_expectations.checkpoint
batch_request:
  datasource_name: warehouse
  data_connector_name: default_inferred_data_connector_name
  data_asset_name: analytics.fct_orders
  data_connector_query:
    index: -1
expectation_suite_name: orders_quality
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
  - name: check_validity
    action:
      class_name: MicrosoftTeamsNotificationAction
      # Fail CI if validation fails
      notify_on: failure
      notify_with: all
```

### CI/CD Integration

```yaml
# .github/workflows/data-quality-ci.yml
name: Data Quality CI
on:
  pull_request:
    paths:
      - 'models/**/*.sql'
      - 'great_expectations/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5

      - name: Run Great Expectations
        run: |
          pip install great_expectations snowflake-connector-python
          great_expectations checkpoint run production_deploy_checkpoint

      - name: Check for failures
        run: |
          python scripts/check_ge_results.py \
            --results-dir great_expectations/uncommitted/results/ \
            --fail-on-warning true \
            --required-success-rate 95
```

## Data Quality Gates

Quality gates block deployments when data quality thresholds are not met.

### Gate Configuration

```yaml
# quality-gates.yml
quality_gates:
  - name: row_count
    description: "Table row count within expected range"
    tables:
      - analytics.fct_orders
      - analytics.dim_customers
    type: row_count
    threshold:
      min_rows: 1000
      max_rows: 10000000
      change_tolerance: 0.2  # 20% change allowed from previous run

  - name: freshness
    description: "Data loaded within expected time window"
    tables:
      - analytics.fct_orders
      - analytics.dim_customers
    type: freshness
    threshold:
      max_hours_since_update: 24
      column: etl_created_at

  - name: null_rates
    description: "Null percentage below threshold for critical columns"
    tables:
      analytics.fct_orders:
        columns:
          order_id: { max_null_pct: 0 }
          customer_id: { max_null_pct: 1 }
          amount: { max_null_pct: 0 }
      analytics.dim_customers:
        columns:
          customer_id: { max_null_pct: 0 }
          customer_name: { max_null_pct: 5 }

  - name: referential_integrity
    description: "Foreign key relationships valid"
    relationships:
      - source_table: analytics.fct_orders
        source_column: customer_id
        target_table: analytics.dim_customers
        target_column: customer_id
        max_orphan_pct: 0.5
```

### Gate Implementation

```python
class DataQualityGate:
    """Enforce data quality gates in CI/CD pipeline."""

    def __init__(self, warehouse_conn: str):
        self.conn = warehouse_conn

    def check_row_count_gate(self, table: str, min_rows: int, max_rows: int, tolerance: float) -> dict:
        """Check row count gate with tolerance for expected variation."""
        current_count = self._get_row_count(table)
        previous_count = self._get_previous_count(table)

        result = {
            'gate': 'row_count',
            'table': table,
            'current_count': current_count,
            'previous_count': previous_count,
            'passed': True,
            'issues': []
        }

        if current_count < min_rows:
            result['passed'] = False
            result['issues'].append(f"Row count {current_count} below minimum {min_rows}")

        if current_count > max_rows:
            result['passed'] = False
            result['issues'].append(f"Row count {current_count} exceeds maximum {max_rows}")

        if previous_count and abs(current_count - previous_count) / previous_count > tolerance:
            result['passed'] = False
            result['issues'].append(f"Row count changed by {abs(current_count - previous_count) / previous_count:.1%} > {tolerance:.1%} tolerance")

        return result
```

## Data Contract Enforcement in CI

Data contracts define the expected schema and quality of data between producers and consumers.

### Data Contract Specification

```yaml
# contracts/orders_contract.yml
contract:
  name: "Orders Data Contract"
  version: "1.2.0"
  owner: "data-platform"
  producer:
    system: "order-service"
    contact: "orders-team@company.com"
  consumers:
    - system: "analytics-warehouse"
      contact: "analytics-team@company.com"
    - system: "ml-platform"
      contact: "ml-team@company.com"

  schema:
    columns:
      - name: order_id
        type: STRING
        required: true
        unique: true
        description: "Unique order identifier"
      - name: customer_id
        type: STRING
        required: true
        description: "Customer identifier"
      - name: amount
        type: DECIMAL(10,2)
        required: true
        constraints:
          min: 0
          max: 100000
      - name: status
        type: STRING
        required: true
        allowed_values: ["pending", "confirmed", "shipped", "delivered", "cancelled"]

  quality_slas:
    freshness: "1 hour"
    completeness: 99.5
    accuracy: 99.0
    uniqueness:
      order_id: 100.0

  change_management:
    notification_period: "14 days"
    approval_required: true
    breaking_changes:
      - "Removing a column"
      - "Changing column type"
      - "Adding NOT NULL constraint"
```

### Contract Validation in CI

```python
class DataContractValidator:
    """Validate data contracts in CI/CD pipeline."""

    def validate_contract(self, contract: dict, actual_data: pd.DataFrame) -> dict:
        """Validate actual data against contract."""
        results = {
            'contract': contract['name'],
            'version': contract['version'],
            'passed': True,
            'violations': []
        }

        # Validate schema
        for col_def in contract['schema']['columns']:
            col_name = col_def['name']

            if col_name not in actual_data.columns:
                results['violations'].append({
                    'type': 'missing_column',
                    'column': col_name,
                    'severity': 'critical'
                })
                results['passed'] = False
                continue

            if col_def.get('required'):
                null_pct = actual_data[col_name].isnull().mean() * 100
                if null_pct > 0:
                    results['violations'].append({
                        'type': 'null_check',
                        'column': col_name,
                        'actual': null_pct,
                        'expected': 0,
                        'severity': 'critical'
                    })
                    results['passed'] = False

        return results
```

## Pipeline Validation

### Pre-Deployment Validation Workflow

```yaml
# .github/workflows/pre-deploy-validation.yml
name: Pre-Deployment Data Validation
on:
  workflow_run:
    workflows: ["Build Data Models"]
    types: [completed]

jobs:
  validate:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Great Expectations validation
        run: |
          ge checkpoint run staging_validation

      - name: Data Contract validation
        run: |
          python scripts/validate_contracts.py \
            --contract-dir contracts/ \
            --warehouse-conn "${{ secrets.WAREHOUSE_CONN }}"

      - name: data-diff comparison
        run: |
          data-diff \
            --warehouse-type snowflake \
            --warehouse-type snowflake \
            --warehouse-conn "${{ secrets.STAGING_CONN }}" \
            --warehouse-conn "${{ secrets.PROD_CONN }}" \
            "analytics.fct_orders" "analytics.fct_orders" \
            -k order_id \
            --min-age 1h

      - name: Pipeline dry run
        run: |
          dbt build --target staging --full-refresh --dry-run

      - name: SQLFluff linting
        run: |
          sqlfluff lint models/ --dialect snowflake

      - name: Check quality gates
        run: |
          python scripts/check_quality_gates.py \
            --results quality_gates_results.json

      - name: Approve or block
        if: failure()
        run: |
          echo "Data quality checks failed. Deployment blocked."
          exit 1
```

## Deployment Guardrails

### Guardrail Rules

```yaml
guardrails:
  - rule: "No full-refresh on prod without staging verification"
    check: "dbt build --target prod --full-refresh must be preceded by staging run"
    enforcement: "block"
    override: "data-engineering-lead approval required"

  - rule: "All new columns must be nullable"
    check: "ALTER TABLE ADD COLUMN ... NOT NULL is blocked"
    enforcement: "block"
    override: "data-architect approval required"

  - rule: "Query cost below threshold"
    check: "dbt model query profile shows bytes scanned < 1TB"
    enforcement: "warn"
    threshold: 1e12

  - rule: "Data quality score > 95%"
    check: "Great Expectations validation success rate"
    enforcement: "block"
    threshold: 95

  - rule: "Change impact assessment"
    check: "Number of downstream consumers affected"
    enforcement: "warn"
    threshold: 5
```

### Guardrail Implementation

```python
class DeploymentGuardrail:
    """Enforce deployment guardrails based on data quality."""

    def __init__(self, rules: list[dict]):
        self.rules = rules

    def check_all(self, context: dict) -> list[dict]:
        """Check all guardrails for this deployment."""
        results = []
        for rule in self.rules:
            check_fn = getattr(self, f"_check_{rule['check'].replace(' ', '_')}")
            result = check_fn(context)
            result['rule'] = rule['rule']
            result['enforcement'] = rule.get('enforcement', 'warn')
            result['blocking'] = result['enforcement'] == 'block' and not result['passed']
            results.append(result)
        return results

    def should_block_deployment(self, results: list[dict]) -> bool:
        """Determine if deployment should be blocked."""
        blocking = [r for r in results if r.get('blocking')]
        if blocking:
            return True
        return False

    def _check_no_full_refresh_without_staging(self, context) -> dict:
        has_staging_run = context.get('staging_completed', False)
        is_full_refresh = context.get('is_full_refresh', False)
        return {'passed': not is_full_refresh or has_staging_run}
```

## Rules
- Great Expectations checkpoints run in CI to validate data before deployment
- Data quality gates block deployments when row counts, freshness, or null rates exceed thresholds
- Data contracts define expected schema and quality; validate in CI
- Pipeline validation includes GE checks, data-diff, and dry runs
- Deployment guardrails prevent breaking changes to production
- Override mechanisms exist for legitimate exceptions
- All validation results are logged and available for audit
- Quality gates must have defined thresholds and enforcement levels
- Automate contract validation on both producer and consumer sides
- Review guardrail effectiveness quarterly and adjust thresholds
