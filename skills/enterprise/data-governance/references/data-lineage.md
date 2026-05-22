# Data Lineage Tracking

## Lineage Levels

### Level 1: Table-Level Lineage
- Source table → transformation → target table
- Suitable for high-level impact analysis
- Automated via SQL parser

### Level 2: Column-Level Lineage
- Source column → transform logic → target column
- Required for regulated data fields
- Traceable through joins, aggregations, UDFs

### Level 3: Row-Level Lineage
- Individual row tracking through pipeline
- Used for debugging and compliance
- Requires data fingerprinting

## Lineage Metadata Schema

```yaml
lineage_entry:
  source:
    system: "order-service"
    database: "orders_db"
    table: "orders"
    columns: ["id", "customer_email", "total", "created_at"]
  transform:
    type: "dbt_model"
    name: "customer_orders"
    sql: "SELECT customer_email, COUNT(*) as order_count..."
    run_id: "dbt_run_20260315_001"
  target:
    system: "analytics"
    database: "analytics_wh"
    table: "customer_summary"
    columns: ["email", "order_count", "total_spent", "last_order_date"]
  metadata:
    updated_at: "2026-03-15T10:30:00Z"
    updated_by: "deploy_pipeline_v42"
    classification: "confidential"
```

## Automated Lineage Collection

### SQL Parser Approach
```python
import sqlparse

def extract_lineage(sql_query):
    parsed = sqlparse.parse(sql_query)
    tables = []
    columns = []
    for token in parsed[0].tokens:
        if isinstance(token, sqlparse.sql.Identifier):
            tables.append(str(token))
    return {"source_tables": tables, "raw_sql": sql_query}
```

### OpenLineage Integration
```yaml
# Spark lineage config
spark.openlineage:
  transport.type: http
  transport.url: http://marquez:5000
  namespace: production
  jobName: etl_customer_orders
```

## Impact Analysis

### Use Cases
- "Which dashboards break if I drop this column?"
- "Which downstream systems consume this API field?"
- "Which ETL jobs need re-run after backfill?"

### Query Pattern
```cypher
MATCH (source:Dataset {name: 'orders'})-[r:PRODUCES]->(downstream)
RETURN source, r, downstream
```

## Governance Integration

### Data Contract Example
```yaml
contract:
  producer: order-service
  consumer: analytics-pipeline
  schema:
    customer_email:
      type: string
      classification: restricted
      retention: 2190_days
      nullable: false
  sla:
    freshness: 5_minutes
    completeness: 99.9%
  change_process: notify consumer 14 days before change
```
