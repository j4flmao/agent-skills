---
name: data-lineage
description: >
  Use this skill when asked about data lineage, OpenLineage, Marquez, DataHub, column-level lineage, impact analysis, data provenance, data dependency tracking, or lineage graph models. This skill enforces: OpenLineage integration for standardized lineage collection, Marquez or DataHub deployment for lineage storage and querying, column-level lineage with SQL parsing, impact analysis for downstream dependency detection, and lineage graph visualization. Do NOT use for: data pipeline orchestration (use data-etl-pipeline), data quality validation (use data-data-quality), or data catalog search (use data-catalog).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [data, governance, lineage, phase-11]
---

# Data Lineage

## Purpose
Capture, store, query, and visualize end-to-end data lineage from source systems through transformations to dashboards, supporting impact analysis, root cause investigation, and data governance compliance.

## Agent Protocol

### Trigger
Exact user phrases: "data lineage", "OpenLineage", "Marquez", "DataHub lineage", "column-level lineage", "impact analysis", "data provenance", "lineage graph", "data dependency", "producer consumer lineage", "field-level lineage".

### Input Context
Before activating, verify:
- Source systems (databases, event streams, file systems)
- Transformation tools (dbt, Airflow, Spark, custom SQL)
- Existing lineage infrastructure (OpenLineage, DataHub, Amundsen, manual)
- Compliance requirements (GDPR, SOX, BCBS 239)
- Consumer tools (Looker, Tableau, custom dashboards)

### Output Artifact
Lineage configuration with OpenLineage integration, Marquez deployment, column-level lineage SQL parser config, and impact analysis report.

### Response Format
```yaml
# OpenLineage integration config
# Marquez deployment
```
```python
# Lineage event emission
# SQL parser setup
```
```sql
# Lineage extraction queries
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] OpenLineage configured for Airflow/dbt/Spark integration
- [ ] Marquez or DataHub deployed for lineage storage and querying
- [ ] Column-level lineage extracted via SQL parser
- [ ] Impact analysis queryable for any dataset
- [ ] Lineage visualized in UI with upstream/downstream navigation
- [ ] Automated lineage collection integrated into CI/CD
- [ ] Backward lineage (producers) and forward lineage (consumers) documented

### Max Response Length
300 lines of code and configuration.

## Lineage Graph Model

### Core Entities
```
Dataset (table, file, topic) → Transformation (dbt model, Spark job, SQL query) → Consumer (dashboard, report, ML model)
```
Each entity has a unique identifier (FQN), type, and metadata. Edges represent data flow: `Dataset —[produces]→ Transformation —[consumes]→ Dataset`.

### OpenLineage Facets
- `columnLineage`: input/output column mappings per transformation
- `dataSource`: connection details (JDBC URI, S3 bucket, Kafka topic)
- `schema`: field names, types, descriptions
- `ownership`: responsible team or individual
- `documentation`: markdown descriptions attached to datasets and runs

## OpenLineage Integration

### Airflow Integration
```python
from openlineage.airflow import DAG

dag = DAG(
    dag_id='orders_pipeline',
    schedule='0 3 * * *',
    catchup=False,
    description='Orders ETL with lineage tracking'
)

with dag:
    extract = PostgresOperator(
        task_id='extract_orders',
        postgres_conn_id='source_db',
        sql='SELECT * FROM orders WHERE created_at > :last_run'
    )
    transform = dbtRunOperator(
        task_id='transform_orders',
        models='orders'
    )
```

### dbt Integration
```yaml
# profiles.yml dbt-cloud config
openlineage:
  enabled: true
  url: http://marquez:5000
  namespace: prod_warehouse
  dataset_namespace: postgresql://warehouse:5432/prod

# dbt_project.yml
vars:
  openlineage_compression: true
  openlineage_flush_size: 100
```

### Spark Integration
```xml
<!-- spark-defaults.conf -->
spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener
spark.openlineage.host=http://marquez:5000
spark.openlineage.namespace=prod_spark
spark.openlineage.parentJobName=daily_aggregations
spark.openlineage.parentRunId=run-uuid-here
```

## Marquez Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  marquez:
    image: marquezproject/marquez:latest
    ports:
      - "5000:5000"
      - "5001:5001"
    environment:
      MARQUEZ_DB_HOST: postgres
      MARQUEZ_DB_PORT: 5432
      MARQUEZ_DB_USER: marquez
      MARQUEZ_DB_PASSWORD: marquez
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: marquez
      POSTGRES_PASSWORD: marquez
      POSTGRES_DB: marquez
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "marquez"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### API Queries
```bash
# List all datasets
curl http://localhost:5000/api/v1/namespaces/prod_warehouse/datasets

# Get lineage for a dataset
curl http://localhost:5000/api/v1/lineage?nodeId=postgresql://warehouse:5432/prod.public.orders

# List recent runs
curl http://localhost:5000/api/v1/namespaces/prod_warehouse/jobs
```

## Column-Level Lineage

### SQL Parsing with sqllineage
```python
from sqllineage.runner import LineageRunner

sql = """
CREATE TABLE mart.daily_orders AS
SELECT
    o.order_id,
    o.customer_id,
    c.customer_name,
    o.order_date,
    o.total_amount,
    oi.item_count
FROM staging.orders o
LEFT JOIN staging.customers c ON o.customer_id = c.customer_id
"""

result = LineageRunner(sql)

for table, columns in result.source_tables.items():
    print(f"Source: {table}")
    for col in columns:
        print(f"  -> {col}")

for table, columns in result.target_tables.items():
    print(f"Target: {table}")
    for col in columns:
        print(f"  <- {col}")

# Column-level mapping
for col, src in result.column_mapping.items():
    print(f"{col} ← {src}")
```

### OpenLineage Column Facet
```json
{
  "schema": {
    "fields": [
      {"name": "order_id", "type": "INTEGER", "description": "Unique order identifier"},
      {"name": "customer_id", "type": "INTEGER", "description": "FK to customers"}
    ]
  },
  "columnLineage": {
    "fields": {
      "order_id": {
        "inputFields": [
          {"namespace": "source_db", "name": "staging.orders.order_id"}
        ]
      },
      "customer_name": {
        "inputFields": [
          {"namespace": "source_db", "name": "staging.customers.customer_name"}
        ]
      }
    }
  }
}
```

## Impact Analysis

### Downstream Impact Query
```python
def get_downstream_impact(dataset_fqn: str, depth: int = 3):
    """Recursively find all downstream consumers of a dataset."""
    query = f"""
    WITH RECURSIVE downstream AS (
        SELECT dataset_fqn, 0 as level
        FROM lineage_edges
        WHERE dataset_fqn = '{dataset_fqn}'
        UNION ALL
        SELECT e.dataset_fqn, d.level + 1
        FROM lineage_edges e
        INNER JOIN downstream d ON e.parent_dataset = d.dataset_fqn
        WHERE d.level < {depth}
    )
    SELECT * FROM downstream
    """
    return execute_query(query)
```

### Change Impact Report
| Dataset | Change | Impacted Consumers | Severity |
|---|---|---|---|
| `staging.orders` | Column `amount` renamed to `total` | `mart.daily_orders`, `mart.weekly_summary` | High |
| `staging.orders` | Add `discount_code` column | 0 consumers (new column) | Low |
| `source.customers` | `email` column removed | `mart.customer_360`, `ml.churn_model` | Critical |

## Lineage Visualization

### Graph Structure
```
orders_pipeline (DAG)
  ├── extract_orders → staging.orders
  │     ├── column: order_id
  │     ├── column: customer_id
  │     └── column: total_amount
  ├── stg_orders (dbt) → staging.orders_clean
  │     └── column: total_amount_usd (transformed)
  └── fct_orders (dbt) → mart.daily_orders
        ├── → dashboard: orders_dashboard (Looker)
        └── → report: daily_sales_report (Tableau)
```

## Rules
- Every dataset must have a unique fully qualified name (FQN)
- Lineage is captured at job start and completion, never in-progress
- Column-level lineage uses SQL parsing, not manual mapping
- Impact analysis must traverse upstream AND downstream at least 3 levels
- OpenLineage is the standard protocol for all lineage events
- Lineage metadata stored in Marquez or DataHub for queryability
- Schema changes trigger lineage re-scrape automatically
- Failed jobs still record attempted lineage with failure status
- Lineage is versioned — historical state is queryable
- All production datasets must have documented consumers

## References
- `references/openlineage-integration.md` — OpenLineage client setup for Airflow, dbt, Spark, and custom applications; event schema; Marquez API
- `references/lineage-graph-model.md` — Column-level lineage, SQL parsing, graph traversal, impact analysis queries, visualization strategies
- `references/column-lineage.md` — SQL parsing (sqllineage, sqlglot), dbt column lineage, impact/source analysis
- `references/lineage-tools.md` — DataHub, Marquez, Atlan lineage, visualization, automation

## Handoff
`data-data-catalog` for metadata enrichment and dataset discovery
`data-data-observability` for freshness and quality integration with lineage
