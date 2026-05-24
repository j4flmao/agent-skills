# Lineage Tools Integration Reference

## DataHub Lineage

DataHub is a metadata platform with comprehensive lineage support.

### DataHub Lineage Ingestion

```yaml
# recipe.yaml
source:
  type: snowflake
  config:
    account_id: my_account
    username: lineage_user
    password: ${SNOWFLAKE_PASSWORD}
    include_views: true
    include_tables: true
    include_lineage: true
    capture_lineage_queries: true
    lineage_parse_table_lineage: true
    lineage_parse_view_lineage: true
    profiling:
      enabled: true
      profile_table_level_only: true

sink:
  type: datahub-rest
  config:
    server: http://datahub-gms:8080
```

### DataHub Lineage API

```python
from datahub.emitter.mce_builder import make_dataset_urn
from datahub.emitter.rest_emitter import DatahubRestEmitter

emitter = DatahubRestEmitter(gms_server="http://datahub-gms:8080")

# Emit lineage between datasets
from datahub.metadata.schema_classes import (
    DatasetLineageTypeClass,
    UpstreamClass,
    UpstreamLineageClass,
)

upstream_table = UpstreamClass(
    dataset=make_dataset_urn(platform="snowflake", name="raw.orders", env="PROD"),
    type=DatasetLineageTypeClass.TRANSFORMED,
)

upstream_lineage = UpstreamLineageClass(upstreams=[upstream_table])

# Emit to DataHub
emitter.emit_mce(
    make_dataset_urn(platform="snowflake", name="analytics.fct_orders", env="PROD"),
    "schemaMetadata",
    upstream_lineage,
)
```

### Querying DataHub Lineage

```python
from datahub.ingestion.graph.client import DataHubGraph

graph = DataHubGraph(datahub_host="http://datahub-gms:8080")

# Get upstream lineage for a dataset
dataset_urn = "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.fct_orders,PROD)"
lineage = graph.get_lineage(dataset_urn, direction="upstream", depth=3)

# Print lineage tree
for upstream in lineage.get("upstream", []):
    print(f"  → {upstream['dataset']['name']}")
    for upstream2 in upstream.get("upstream", []):
        print(f"    → {upstream2['dataset']['name']}")

# Get downstream impact
impact = graph.get_lineage(dataset_urn, direction="downstream", depth=5)
for downstream in impact.get("downstream", []):
    print(f"  ← {downstream['dataset']['name']}")
```

## Marquez

Marquez is an open-source metadata service for data lineage.

### Marquez Integration

```python
from marquez_client import MarquezClient

client = MarquezClient(
    url="http://marquez:5000",
    namespace="prod_warehouse"
)

# Create lineage
client.create_lineage(
    event_type="COMPLETE",
    inputs=[{
        "namespace": "postgresql://warehouse:5432",
        "name": "raw.orders"
    }],
    outputs=[{
        "namespace": "postgresql://warehouse:5432",
        "name": "analytics.fct_orders"
    }],
    run_id="run-uuid-456"
)

# Query lineage
lineage = client.get_lineage(
    node_id="postgresql://warehouse:5432/analytics.fct_orders",
    depth=3
)

# Marquez REST API
# List datasets
# GET /api/v1/namespaces/prod_warehouse/datasets

# Get dataset
# GET /api/v1/namespaces/prod_warehouse/datasets/analytics.fct_orders

# Get column-level lineage
# GET /api/v1/namespaces/prod_warehouse/datasets/analytics.fct_orders/column_lineage
```

## Atlan Lineage

Atlan provides lineage visualization integrated with data catalog capabilities.

### Atlan Lineage API

```python
from atlan import AtlanClient

client = AtlanClient(
    base_url="https://your-instance.atlan.com",
    api_key="${ATLAN_API_KEY}"
)

# Search for dataset lineage
response = client.search(
    query={
        "query": {
            "bool": {
                "must": [
                    {"term": {"__typename": "Table"}},
                    {"term": {"name": "fct_orders"}},
                ]
            }
        }
    }
)

# Get lineage
asset = response.assets[0]
lineage = asset.get_lineage(depth=3)

# Column-level lineage
for column in asset.columns:
    column_lineage = column.get_lineage()
    print(f"Column: {column.name}")
    for upstream in column_lineage.upstreams:
        print(f"  → {upstream.qualified_name}")
```

## Lineage Visualization

### Graph Structure for Visualization

```json
{
  "nodes": [
    {"id": "raw_orders", "label": "raw.orders", "type": "source", "group": "raw"},
    {"id": "raw_customers", "label": "raw.customers", "type": "source", "group": "raw"},
    {"id": "stg_orders", "label": "stg.orders", "type": "transform", "group": "staging"},
    {"id": "fct_orders", "label": "fct.orders", "type": "transform", "group": "marts"},
    {"id": "dashboard", "label": "Sales Dashboard", "type": "consumer", "group": "bi"}
  ],
  "edges": [
    {"from": "raw_orders", "to": "stg_orders", "label": "order_id, customer_id..."},
    {"from": "raw_customers", "to": "stg_orders", "label": "customer_name..."},
    {"from": "stg_orders", "to": "fct_orders", "label": "all columns"},
    {"from": "fct_orders", "to": "dashboard", "label": "total_sales, count"}
  ]
}
```

### Web-Based Lineage Viewer

```html
<!-- Lineage visualization with vis.js or D3 -->
<div id="lineage-graph"></div>
<script>
const nodes = new vis.DataSet(lineageData.nodes.map(n => ({
    id: n.id,
    label: n.label,
    group: n.group,
    title: `<b>${n.type}</b>: ${n.label}`
})));

const edges = new vis.DataSet(lineageData.edges.map(e => ({
    from: e.from,
    to: e.to,
    title: e.label,
    arrows: 'to',
    smooth: true
})));

const container = document.getElementById('lineage-graph');
const data = { nodes, edges };
const options = {
    layout: { hierarchical: { direction: 'LR', sortMethod: 'directed' } },
    physics: { enabled: false },
    edges: { smooth: { type: 'curvedCW' } }
};
new vis.Network(container, data, options);
</script>
```

## Lineage Automation

### CI/CD Pipeline Integration

```yaml
# .github/workflows/lineage-check.yml
name: Lineage Validation
on:
  pull_request:
    paths:
      - 'models/**/*.sql'
      - 'transform/**/*.sql'

jobs:
  lineage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install sqllineage sqlglot

      - name: Extract lineage from changed models
        run: |
          python scripts/validate_lineage.py \
            --changed-files $(git diff --name-only origin/main...HEAD) \
            --lineage-cache lineage_cache.json

      - name: Check for broken lineage
        run: |
          python scripts/check_lineage_gaps.py \
            --missing-columns lineage_gaps.json

      - name: Update lineage documentation
        run: |
          python scripts/generate_lineage_docs.py \
            --output docs/lineage/
```

### Automated Lineage Collection

```python
# Airflow: auto-collect lineage on task completion
class LineageCollector:
    def __init__(self, backend: str = "datahub"):
        self.emitter = self._setup_emitter(backend)

    def on_task_complete(self, context):
        """Collect lineage when a task completes."""
        ti = context['task_instance']
        dag_id = context['dag'].dag_id
        task_id = ti.task_id

        # Get input/output tables from task metadata
        inlets = ti.task.inlets
        outlets = ti.task.outlets

        for inlet, outlet in zip(inlets, outlets):
            self.emitter.emit_lineage({
                "run_id": f"{dag_id}_{task_id}_{ti.run_id}",
                "inputs": [{"name": inlet.name, "namespace": inlet.namespace}],
                "outputs": [{"name": outlet.name, "namespace": outlet.namespace}],
                "event_time": datetime.utcnow().isoformat()
            })
```

## Rules
- DataHub for comprehensive lineage with column-level detail
- Marquez for lightweight lineage with REST API
- Atlan for lineage integrated with data catalog
- Store lineage in graph format for efficient traversal
- Visualize lineage with hierarchical directed graphs
- Collect lineage automatically via CI/CD and Airflow hooks
- Validate lineage on every PR to detect broken data flow
- Column-level lineage is critical for regulatory impact analysis
- Regular lineage audits to identify undocumented transformations
- Emit lineage events at both job start AND completion for accuracy
