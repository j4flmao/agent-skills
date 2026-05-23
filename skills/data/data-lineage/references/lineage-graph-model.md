# Lineage Graph Model

## Core Graph Model
```
Nodes: Datasets, Jobs (transformations), Runs (executions)
Edges: Dataset → Job (input), Job → Dataset (output)
```
Lineage is a DAG where edges represent data flow direction. Upstream traversal finds sources; downstream finds consumers.

| Node Type | Properties | Example |
|---|---|---|
| Dataset | namespace, name, schema, owner | `pg://warehouse/prod.public.orders` |
| Job | namespace, name, type, owner | `airflow.prod.extract_orders` |
| Run | runId, status, startTime, endTime | `uuid-abc` |

## Column-Level Lineage with sqllineage
```python
from sqllineage.runner import LineageRunner

sql = """
CREATE TABLE mart.user_features AS
SELECT u.user_id, u.email, COALESCE(o.total_orders, 0) AS total_orders_30d,
    CASE WHEN o.total_orders > 10 THEN 'active' ELSE 'casual' END AS user_segment
FROM raw.users u LEFT JOIN (
    SELECT user_id, COUNT(*) AS total_orders FROM raw.orders GROUP BY user_id
) o ON u.user_id = o.user_id
"""
result = LineageRunner(sql)
for col, sources in result.column_mapping.items():
    print(f"{col} ← {sources}")
# user_id ← raw.users.user_id
# email ← raw.users.email
# total_orders_30d ← raw.orders.order_id
# user_segment ← (computed: CASE expression)
```

## Column Lineage Facet (OpenLineage)
```json
{
  "columnLineage": {
    "fields": {
      "user_id": {"inputFields": [{"namespace": "raw_db", "name": "raw.users.user_id"}]},
      "total_orders_30d": {
        "inputFields": [{"namespace": "raw_db", "name": "raw.orders.order_id"}],
        "transformationType": "AGGREGATION",
        "transformationDescription": "COUNT(order_id) GROUP BY user_id"
      }
    }
  }
}
```

## Upstream Traversal (SQL)
```sql
WITH RECURSIVE upstream AS (
    SELECT dataset_name, 0 AS depth FROM lineage_edges
    WHERE dataset_name = 'mart.daily_orders'
    UNION ALL
    SELECT e.input_dataset_name, u.depth + 1
    FROM upstream u JOIN lineage_edges e
        ON e.output_dataset_name = u.dataset_name
    WHERE u.depth < 10
)
SELECT * FROM upstream ORDER BY depth;
```

## Downstream Traversal (Python)
```python
import networkx as nx

def build_graph(edges):
    G = nx.DiGraph()
    for e in edges:
        G.add_edge(e['input'], e['output'], job=e['job'])
    return G

def impact_analysis(G, dataset, depth=3):
    return nx.descendants_at_distance(G, dataset, depth)

G = build_graph(lineage_edges)
print(f"Changing staging.orders affects: {impact_analysis(G, 'staging.orders')}")
```

## Lineage Storage Schema
```sql
CREATE TABLE lineage_runs (
    run_id UUID PRIMARY KEY, job_name VARCHAR(500), job_namespace VARCHAR(200),
    event_type VARCHAR(20), event_time TIMESTAMP WITH TIME ZONE, facets JSONB
);
CREATE TABLE lineage_edges (
    id BIGSERIAL PRIMARY KEY, run_id UUID REFERENCES lineage_runs(run_id),
    input_dataset_name VARCHAR(500), output_dataset_name VARCHAR(500)
);
CREATE TABLE lineage_column_mapping (
    id BIGSERIAL PRIMARY KEY, edge_id BIGINT REFERENCES lineage_edges(id),
    output_column VARCHAR(200), input_column VARCHAR(200),
    transformation_type VARCHAR(50), transformation_expression TEXT
);
CREATE INDEX idx_edges_input ON lineage_edges(input_dataset_name);
CREATE INDEX idx_edges_output ON lineage_edges(output_dataset_name);
```

## Visualization Layout
```
Raw Layer          Staging            Mart              Consumers
raw.orders ──→ stg_orders ──→ fct_orders ──→ orders_dashboard
                                └──→ fct_summary ──→ sales_report
raw.customers ──→ stg_customers ──→ dim_customers ──→ churn_model (ML)
```

## Impact Analysis Query
```sql
WITH RECURSIVE downstream AS (
    SELECT dataset_name, ARRAY[dataset_name] AS path FROM lineage_edges
    WHERE dataset_name = 'staging.orders'
    UNION ALL
    SELECT e.output_dataset_name, d.path || e.output_dataset_name
    FROM downstream d JOIN lineage_edges e
        ON e.input_dataset_name = d.dataset_name
    WHERE NOT e.output_dataset_name = ANY(d.path)
)
SELECT DISTINCT dataset_name FROM downstream ORDER BY dataset_name;
```

## Rules
- Every dataset has a unique fully qualified name (FQN)
- Column-level lineage uses SQL parsing, not manual mapping
- Schema changes trigger lineage re-scrape automatically
- Failed jobs still record lineage with failure status
- Lineage is versioned — historical state is queryable
