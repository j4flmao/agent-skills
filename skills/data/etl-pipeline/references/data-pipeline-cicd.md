# Data Pipeline CI/CD

## Why Pipeline CI/CD
Data pipelines require the same rigor as application code: version control, automated testing, peer review, and deployment automation. CI/CD for data pipelines ensures changes are validated before reaching production.

## Pipeline Testing Strategy

### Test Pyramid for Data Pipelines
| Layer | Tests | Speed | Confidence |
|-------|-------|-------|------------|
| Unit | Individual transform functions, SQL snippets | ms | Low |
| Integration | End-to-end on sample data, connector tests | seconds | Medium |
| Contract | Schema validation, column-level tests | minutes | High |
| Acceptance | Business rule verification, reconciliation | minutes | High |
| Performance | Resource profiling, volume tests | hours | Highest |

### Unit Testing Transforms
```python
# test_transforms.py
import pytest
import pandas as pd
from transforms import clean_data, aggregate_orders

def test_remove_duplicates():
    input_df = pd.DataFrame({
        "order_id": [1, 1, 2, 3],
        "amount": [100, 100, 200, 300]
    })
    rules = [{"type": "deduplicate", "subset": ["order_id"]}]
    result = clean_data(input_df, rules)
    assert len(result) == 3
    assert result["order_id"].is_unique

def test_fill_null_mean():
    input_df = pd.DataFrame({
        "value": [10, None, 30, None, 50]
    })
    rules = [{
        "type": "fill_nulls",
        "columns": {"value": "mean"}
    }]
    result = clean_data(input_df, rules)
    assert result["value"].isnull().sum() == 0
    assert result["value"].iloc[1] == 30.0
```

### SQL Transformation Tests
```sql
-- test_dbt_models.sql
-- Test: Order total should always be positive
SELECT COUNT(*) as failures
FROM {{ ref('fact_orders') }}
WHERE total_amount <= 0

-- Test: Every order must have a valid customer
SELECT COUNT(*) as failures
FROM {{ ref('fact_orders') }} f
LEFT JOIN {{ ref('dim_customer') }} c
    ON f.customer_id = c.customer_id
WHERE c.customer_id IS NULL

-- Test: Order date should not be in the future
SELECT COUNT(*) as failures
FROM {{ ref('fact_orders') }}
WHERE order_date > CURRENT_DATE
```

## CI/CD Pipeline Configuration

### GitHub Actions for dbt
```yaml
name: dbt CI/CD
on:
  pull_request:
    branches: [main]
    paths:
      - 'transform/**'
      - 'tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          pip install dbt-snowflake dbt-bigquery
          dbt deps --profiles-dir .

      - name: Run unit tests (data tests)
        run: dbt test --select tag:unit --profiles-dir .

      - name: Build and test
        run: |
          dbt build \
            --select staging+ \
            --target ci \
            --profiles-dir .
        env:
          DBT_PROFILE: ${{ secrets.DBT_PROFILE }}

      - name: Generate docs
        run: dbt docs generate --profiles-dir .

      - name: Upload docs
        uses: actions/upload-artifact@v3
        with:
          name: dbt-docs
          path: target/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          dbt build \
            --select prod_models+ \
            --target prod \
            --full-refresh \
            --profiles-dir .
        env:
          DBT_PROFILE: ${{ secrets.DBT_PROFILE_PROD }}
```

### Airflow DAG CI/CD
```yaml
name: Airflow DAG CI/CD
on:
  push:
    branches: [main]
    paths:
      - 'dags/**'
      - 'plugins/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: airflow
          POSTGRES_PASSWORD: airflow
          POSTGRES_DB: airflow
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Validate DAGs
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/dags:/opt/airflow/dags \
            -e AIRFLOW__CORE__LOAD_EXAMPLES=False \
            apache/airflow:2.8.0 \
            airflow dags list -o yaml

      - name: Unit test DAGs
        run: |
          pip install -r requirements.txt
          pytest tests/dags/ --cov=dags/ --junitxml=report.xml

      - name: Deploy DAGs
        run: |
          aws s3 sync dags/ s3://${{ secrets.AIRFLOW_BUCKET }}/dags/
          aws s3 sync plugins/ s3://${{ secrets.AIRFLOW_BUCKET }}/plugins/
```

## Environment Management

### Environment-Specific Configs
```yaml
# environments/dev.yaml
env: dev
warehouse: analytics_dev
snowflake_schema: staging
compute_size: small
notifications: false
data_retention_days: 7

# environments/prod.yaml
env: prod
warehouse: analytics_prod
snowflake_schema: public
compute_size: large
notifications: true
notify_slack_channel: "#data-alerts"
data_retention_days: 365
```

### dBT Target Configuration
```yaml
# profiles.yml
data_pipeline:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: myaccount
      user: "{{ env_var('DBT_USER') }}"
      password: "{{ env_var('DBT_PASSWORD') }}"
      database: analytics_dev
      schema: dbt_{{ env_var('USER') }}
      warehouse: transform_dev
      threads: 4

    ci:
      type: snowflake
      account: myaccount
      user: "{{ env_var('DBT_USER') }}"
      password: "{{ env_var('DBT_PASSWORD') }}"
      database: analytics_ci
      schema: dbt_ci
      warehouse: transform_ci
      threads: 8

    prod:
      type: snowflake
      account: myaccount
      user: "{{ env_var('DBT_USER') }}"
      password: "{{ env_var('DBT_PASSWORD') }}"
      database: analytics_prod
      schema: public
      warehouse: transform_prod
      threads: 16
```

## Version Control for Data

### Data Versioning with Git LFS
```yaml
# .gitattributes
*.parquet filter=lfs diff=lfs merge=lfs -text
*.csv filter=lfs diff=lfs merge=lfs -text
*.feather filter=lfs diff=lfs merge=lfs -text
seeds/** filter=lfs diff=lfs merge=lfs -text
```

### Schema Versioning
```python
# schema_registry.py
from jsonschema import validate, ValidationError

SCHEMA_REGISTRY = {
    "orders": {
        "version": "2.1.0",
        "columns": [
            {"name": "order_id", "type": "STRING", "required": True},
            {"name": "customer_id", "type": "STRING", "required": True},
            {"name": "order_date", "type": "TIMESTAMP", "required": True},
            {"name": "status", "type": "STRING",
             "enum": ["pending", "confirmed", "shipped", "delivered"]},
            {"name": "total_amount", "type": "DECIMAL(10,2)"},
        ],
        "compatible_versions": ["2.0.0", "1.5.0"]
    }
}

def validate_schema(data, dataset_name, version):
    schema = SCHEMA_REGISTRY[dataset_name]
    for col in schema["columns"]:
        if col.get("required") and col["name"] not in data.columns:
            raise SchemaError(f"Missing required column: {col['name']}")
```

## Key Points
- Apply the same CI/CD rigor to data pipelines as application code
- Implement a test pyramid with unit, integration, contract, and acceptance tests
- Use environment-specific configurations for dev, CI, and production
- Test dbt models, SQL transformations, and Airflow DAGs in CI
- Version control schema definitions and data contracts
- Automate deployment to different environments with proper gating
- Include data quality tests in the CI/CD pipeline
- Use branch strategies that promote isolation and review
- Implement zero-downtime migrations for schema changes
- Monitor deployment success with data reconciliation checks
