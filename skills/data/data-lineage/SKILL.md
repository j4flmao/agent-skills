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

### Automated Lineage Collection

#### OpenLineage Integration Patterns

```yaml
# Airflow integration via OpenLineage plugin
airflow_openlineage:
  config:
    transport:
      type: http
      url: http://marquez:5000/api/v1/lineage
      api_key: "${OPENLINEAGE_API_KEY}"
      compression: gzip
    namespace: "production_data_pipelines"
    job_namespace: "data_engineering"
  facets:
    - columnLineage: true
    - documentation: true
    - ownership: true
    - dataSource: true

# dbt integration via dbt-openlineage package
dbt_openlineage:
  enabled: true
  catalog: "production"
  schema: "analytics"
  include_sources: true
  include_tests: true
  column_level: true

# Spark integration
spark_openlineage:
  spark.sql.catalog.spark_catalog: "org.apache.spark.openlineage.catalog.OpenLineageCatalog"
  spark.openlineage.transport.type: "console"  # Or http, kafka
  spark.openlineage.namespace: "data_lake_jobs"
  spark.openlineage.parentJobName: "daily_etl"
```

#### SQL Parser for Column-Level Lineage

```python
# Column-level lineage extraction
from sqllineage.runner import LineageRunner
from sqlparse import parse

def extract_column_lineage(sql_query, default_schema="public"):
    runner = LineageRunner(sql_query)
    lineage = {}
    
    for table_col in runner.target_columns:
        col_name = str(table_col).split(".")[-1]
        sources = []
        for source_col in runner.source_columns:
            sources.append(str(source_col))
        lineage[col_name] = sources
    
    return lineage

# Parser handles: CTEs, subqueries, joins, window functions, UNION, 
# SELECT *, column aliases, function-wrapped columns
# Does NOT handle: dynamic SQL, UDFs with internal queries, stored procedures
```

### Lineage Storage and Query

#### Storage Backend Comparison

| Feature | Marquez | DataHub | OpenMetadata |
|---|---|---|---|
| OpenLineage native | Yes | Via plugin | Via plugin |
| Column-level lineage | SQL parser | SQL parser | SQL parser |
| Impact analysis UI | Yes | Yes | Yes |
| API | REST + GraphQL | GraphQL | REST + GraphQL |
| Search | Basic | Elasticsearch | Elasticsearch |
| Schema drift detection | No | Yes | Yes |
| Self-hosted complexity | Low | Medium | High |
| Governance features | Basic | Strong | Strong |

#### Impact Analysis API

```python
# Marquez API: find all downstream dependencies
import requests

def get_downstream_impact(dataset_fqn, depth=3):
    response = requests.get(
        f"http://marquez:5000/api/v1/lineage/{dataset_fqn}",
        params={"depth": depth}
    )
    data = response.json()
    
    # Graph traversal
    downstream = set()
    def traverse(node, remaining_depth):
        if remaining_depth <= 0:
            return
        for edge in node.get("outEdges", []):
            downstream.add(edge["destination"])
            traverse(edge["destination"], remaining_depth - 1)
    
    traverse(data["graph"], depth)
    return list(downstream)
```

### Lineage Visualization

```yaml
# DataHub lineage visualization configuration
lineage_ui:
  graph_layout:
    type: "dagre"  # Directed graph layout
    rankdir: "LR"  # Left-to-right flow
    
  display_options:
    show_column_lineage: true
    collapse_transformations: false
    max_nodes_expanded: 50
    max_depth_upstream: 5
    max_depth_downstream: 5
    
  color_scheme:
    source: "#4CAF50"       # Green — raw data sources
    staging: "#2196F3"      # Blue — staging area
    intermediate: "#FF9800" # Orange — transformations
    mart: "#9C27B0"         # Purple — consumption layer
    dashboard: "#F44336"    # Red — BI dashboards / reports
    failed: "#607D8B"       # Gray — failed dependencies
```

### Root Cause Analysis with Lineage

```yaml
rca_workflow:
  trigger: "Dashboard metric shows unexpected value"
  
  step_1_identify:
    - "Select the dashboard and specific metric"
    - "Trace lineage backward to find the dataset providing the metric"
    - "Identify the transformation producing that dataset"
  
  step_2_trace_upstream:
    - "Follow lineage from transformation → its input datasets"
    - "Check each dataset for quality failures (nulls, outliers)"
    - "Check freshness: was the dataset updated on schedule?"
    - "Check volume: row count within expected range?"
  
  step_3_isolate:
    - "Narrow to specific column or transformation step"
    - "Check schema: was a column renamed, removed, or type-changed?"
    - "Check business logic: was the transformation SQL modified?"
    - "Review git history for the transformation code"
  
  step_4_resolve:
    - "Fix the root cause (source, transform, or config)"
    - "Verify fix by re-running impacted transformations"
    - "Re-run quality checks on downstream datasets"
    - "Notify consumers when data is verified correct"
  
  step_5_prevent:
    - "Add lineage-based alert: if upstream schema changes, notify"
    - "Add quality check at the transformation output"
    - "Document the incident in the lineage metadata"
```

### Decision Tree

#### Lineage Collection Method
```
Data processing tool?
├── Airflow DAGs → OpenLineage Airflow integration
├── dbt transformations → dbt-openlineage package
├── Spark jobs → OpenLineage Spark listener
├── Flink streaming → OpenLineage Flink integration
├── Custom Python scripts → Manual OpenLineage events via Python client
├── SQL transformations → SQL parser (sqllineage, sqlfluff)
└── Manual / undocumented → Start with manual annotations, automate gradually
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
- Automate lineage collection — manual lineage is always stale
- Use column-level lineage for precise impact analysis
- Store lineage in graph-native storage for efficient traversal
- Color-code lineage visualization by data lifecycle stage
- Integrate lineage with incident response for faster root cause analysis
- Re-scrape lineage after schema changes

## References
  - references/column-lineage.md — Column-Level Lineage Reference
  - references/lineage-automation.md — Lineage Automation
  - references/lineage-governance.md — Lineage for Governance
  - references/lineage-graph-model.md — Lineage Graph Model
  - references/lineage-impact-analysis.md — Lineage Impact Analysis
  - references/lineage-tools.md — Lineage Tools Integration Reference
  - references/lineage-visualization.md — Lineage Visualization
  - references/openlineage-integration.md — OpenLineage Integration
## Handoff
`data-data-catalog` for metadata enrichment and dataset discovery
`data-data-observability` for freshness and quality integration with lineage
