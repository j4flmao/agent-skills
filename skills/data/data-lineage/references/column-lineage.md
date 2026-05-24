# Column-Level Lineage Reference

## SQL Parsing for Lineage

Column-level lineage traces how individual columns flow from source to destination through transformations.

### SQL Parsing Approaches

| Approach | Tool | Accuracy | Complexity | Performance |
|----------|------|----------|------------|-------------|
| Regex-based | Basic scripts | Low | Low | Fast |
| SQL parser | sqllineage, sqlparse | Medium | Medium | Fast |
| AST parser | sqlglot, pglast | High | High | Medium |
| Query execution | OpenLineage, dbt-spark | Highest | Very high | Slow |

### sqllineage Python Library

```python
from sqllineage.runner import LineageRunner

# Parse SQL and extract column-level lineage
sql = """
CREATE TABLE analytics.daily_orders AS
SELECT
    o.order_id,
    o.order_date,
    c.customer_name,
    c.customer_segment,
    SUM(oi.quantity * oi.unit_price) AS total_amount,
    COUNT(DISTINCT oi.product_id) AS unique_products
FROM raw.orders o
JOIN raw.customers c ON o.customer_id = c.customer_id
JOIN raw.order_items oi ON o.order_id = oi.order_id
WHERE o.status = 'completed'
GROUP BY o.order_id, o.order_date, c.customer_name, c.customer_segment;
"""

result = LineageRunner(sql)

# Source tables
for table, columns in result.source_tables.items():
    print(f"Source: {table}")
    for col in columns:
        print(f"  └─ {col}")

# Target table
for table, columns in result.target_tables.items():
    print(f"Target: {table}")
    for col in columns:
        print(f"  └─ {col}")

# Column mapping
print("\nColumn-level lineage:")
for col, sources in result.column_mapping.items():
    print(f"  {col} ← {', '.join(sources)}")
```

### sqlglot for Complex SQL

```python
import sqlglot
from sqlglot import exp
from sqlglot.lineage import lineage

# Parse with SQLGlot for CTE, subquery, and complex transforms
query = """
WITH customer_orders AS (
    SELECT
        customer_id,
        MIN(order_date) AS first_order_date,
        MAX(order_date) AS last_order_date,
        COUNT(order_id) AS total_orders,
        SUM(amount) AS lifetime_value
    FROM raw.orders
    GROUP BY customer_id
),
customer_segments AS (
    SELECT
        customer_id,
        CASE
            WHEN lifetime_value > 10000 THEN 'platinum'
            WHEN lifetime_value > 5000 THEN 'gold'
            WHEN lifetime_value > 1000 THEN 'silver'
            ELSE 'bronze'
        END AS segment,
        first_order_date,
        last_order_date,
        total_orders
    FROM customer_orders
)
SELECT
    c.customer_id,
    c.customer_name,
    cs.segment,
    cs.first_order_date,
    cs.total_orders,
    cs.lifetime_value
FROM raw.customers c
JOIN customer_segments cs ON c.customer_id = cs.customer_id;
"""

# Get column-level lineage for specific column
result = lineage(
    "segment",
    sql=query,
    dialect="snowflake",
    sources={
        "raw.orders": {"order_id": "INT", "customer_id": "INT", "amount": "FLOAT", "order_date": "DATE"},
        "raw.customers": {"customer_id": "INT", "customer_name": "STRING"},
    }
)

for step in result.walk():
    print(f"  {step.node.alias_or_name}: {step.expression}")
```

### dbt Column-Level Lineage

```yaml
# dbt_project.yml
models:
  analytics:
    +schema: analytics
    +materialized: table
    +meta:
      openlineage:
        enabled: true
        dataset_namespace: snowflake://warehouse

# models/staging/stg_orders.sql
SELECT
    order_id,
    customer_id,
    order_date,
    amount,
    status
FROM {{ source('source', 'orders') }}
WHERE status != 'deleted'

# models/marts/dim_customers.sql
SELECT
    customer_id,
    customer_name,
    customer_email,
    acquired_date
FROM {{ ref('stg_customers') }}
```

## OpenLineage Column Lineage

OpenLineage captures column-level lineage through facets attached to dataset events.

### Column Lineage Facet

```json
{
  "eventType": "COMPLETE",
  "eventTime": "2026-05-24T12:00:00Z",
  "run": {
    "runId": "run-uuid-123",
    "facets": {}
  },
  "job": {
    "namespace": "dbt",
    "name": "analytics.daily_orders"
  },
  "inputs": [
    {
      "namespace": "snowflake://warehouse",
      "name": "raw.orders",
      "facets": {
        "schema": {
          "fields": [
            {"name": "order_id", "type": "INTEGER"},
            {"name": "customer_id", "type": "INTEGER"},
            {"name": "order_date", "type": "DATE"},
            {"name": "amount", "type": "DECIMAL"},
            {"name": "status", "type": "STRING"}
          ]
        }
      }
    }
  ],
  "outputs": [
    {
      "namespace": "snowflake://warehouse",
      "name": "analytics.daily_orders",
      "facets": {
        "schema": {
          "fields": [
            {"name": "order_id", "type": "INTEGER"},
            {"name": "order_date", "type": "DATE"},
            {"name": "total_amount", "type": "DECIMAL"},
            {"name": "unique_products", "type": "INTEGER"}
          ]
        },
        "columnLineage": {
          "fields": {
            "order_id": {
              "inputFields": [
                {"namespace": "snowflake://warehouse", "name": "raw.orders.order_id"}
              ]
            },
            "total_amount": {
              "inputFields": [
                {"namespace": "snowflake://warehouse", "name": "raw.orders.amount"},
                {"namespace": "snowflake://warehouse", "name": "raw.order_items.quantity"},
                {"namespace": "snowflake://warehouse", "name": "raw.order_items.unit_price"}
              ]
            }
          }
        }
      }
    }
  ]
}
```

## Impact and Source Analysis

### Downstream Impact Analysis

```python
def analyze_downstream_impact(
    dataset_fqn: str,
    column_name: str = None,
    max_depth: int = 5
) -> list[dict]:
    """Find all downstream datasets and columns affected by a change."""

    query = f"""
    WITH RECURSIVE downstream AS (
        -- Anchor: starting dataset
        SELECT
            d.name AS dataset_name,
            cf.input_fields AS columns,
            0 AS depth
        FROM lineage_datasets d
        JOIN lineage_column_fields cf ON d.id = cf.dataset_id
        WHERE d.fully_qualified_name = '{dataset_fqn}'
            {'AND cf.field_name = \'' + column_name + '\'' if column_name else ''}

        UNION ALL

        -- Recursive: follow lineage edges
        SELECT
            d_out.name,
            cf_output.input_fields,
            depth + 1
        FROM downstream ds
        JOIN lineage_column_edges ce ON ce.input_dataset_name = ds.dataset_name
        JOIN lineage_datasets d_out ON ce.output_dataset_id = d_out.id
        JOIN lineage_column_fields cf_output ON cf_output.dataset_id = d_out.id
        WHERE depth < {max_depth}
    )
    SELECT DISTINCT dataset_name, depth
    FROM downstream
    ORDER BY depth, dataset_name;
    """
    return execute_lineage_query(query)
```

### Upstream Source Analysis

```python
def analyze_upstream_sources(
    dataset_fqn: str,
    column_name: str = None,
    max_depth: int = 5
) -> list[dict]:
    """Trace a dataset's columns back to their original source(s)."""

    query = f"""
    WITH RECURSIVE upstream AS (
        SELECT
            d.name AS dataset_name,
            cf.input_fields AS columns,
            0 AS depth
        FROM lineage_datasets d
        JOIN lineage_column_fields cf ON d.id = cf.dataset_id
        WHERE d.fully_qualified_name = '{dataset_fqn}'
            {'AND cf.field_name = \'' + column_name + '\'' if column_name else ''}

        UNION ALL

        SELECT
            d_in.name,
            cf_input.input_fields,
            depth + 1
        FROM upstream us
        JOIN lineage_column_edges ce ON ce.output_dataset_name = us.dataset_name
        JOIN lineage_datasets d_in ON ce.input_dataset_id = d_in.id
        JOIN lineage_column_fields cf_input ON cf_input.dataset_id = d_in.id
        WHERE depth < {max_depth}
    )
    SELECT DISTINCT dataset_name, depth
    FROM upstream
    ORDER BY depth, dataset_name;
    """
    return execute_lineage_query(query)
```

### Change Impact Report

```sql
-- Find all consumers of a column that is changing
SELECT
    consumer_dataset,
    consumer_column,
    transformation_job,
    owner_team,
    last_updated,
    CASE
        WHEN DATEDIFF('day', last_updated, CURRENT_DATE) > 90 THEN 'stale'
        WHEN owner_team IS NULL THEN 'unowned'
        ELSE 'active'
    END AS consumer_health
FROM column_lineage_consumers
WHERE source_dataset = 'raw.customers'
  AND source_column = 'email'
ORDER BY consumer_health, consumer_dataset;
```

## Rules
- SQL parsing is the foundation of automated column-level lineage
- Use sqlglot for complex SQL (CTEs, subqueries, window functions)
- dbt provides automatic column-level lineage through ref() macro
- OpenLineage column lineage facets capture input→output field mappings
- Recursive queries traverse upstream (source) and downstream (impact) lineage
- Column-level lineage is essential for regulatory compliance
- Test lineage accuracy by comparing parsed results with known transformations
- Store lineage data in a graph database for efficient traversal
- Version lineage metadata alongside data model changes
- Monitor lineage coverage to identify undocumented transformations
