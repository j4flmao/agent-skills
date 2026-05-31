# Data Versioning Lineage Tracking

## Overview

Data lineage tracks the complete lifecycle of data from its origin through transformations to its final consumption. With data versioning, lineage is not just a graph of dependencies but a versioned, reproducible trail. This reference covers lineage modeling, collection strategies, integration with versioning tools, and operational practices.

## Lineage Model

### Core Concepts

```
Source ──► Transform ──► Dataset ──► Transform ──► Output
  │           │              │            │            │
  ▼           ▼              ▼            ▼            ▼
Version    Version        Version      Version      Version
  SHA256     DAG Hash      v2.1.0       DAG Hash    v3.0.0
```

Each node in the lineage graph has:
- **Identity**: unique identifier (table URI, file path, API endpoint)
- **Version**: immutable version identifier (content hash, semver, commit ID)
- **Provenance**: who/what created it, when, with what parameters
- **Schema**: column definitions, types, constraints
- **Checksums**: data integrity verification

### Lineage Granularity

| Level | Granularity | Example | Collection Cost |
|---|---|---|---|
| File-level | Per file | CSV ingested → Parquet output | Low |
| Table-level | Per table | orders table → daily_sales table | Low |
| Row-level | Per row | order_id = 123 → fct_orders row | High |
| Column-level | Per column | order.total → revenue.total | Medium |
| Feature-level | Per ML feature | customer_age → model feature | Medium |

Default: table-level for most pipelines, column-level for critical data, feature-level for ML models.

## Lineage Collection Strategies

### OpenLineage

OpenLineage is an open standard for lineage collection across the data ecosystem.

```yaml
# OpenLineage event (Spark example)
eventType: COMPLETE
eventTime: "2026-05-22T10:30:00Z"
producer: "https://github.com/OpenLineage/OpenLineage"
schemaURL: "https://openlineage.io/spec/1-0-5/OpenLineage.json"

job:
  namespace: orders-pipeline
  name: spark_etl.transform_orders

run:
  runId: "f99310b4-3c3c-4a1c-9f58-7d7b1f4e8a2c"

inputs:
  - namespace: snowflake://proddb
    name: "commerce.raw_orders"
    facets:
      version:
        property: "version"
        value: "2026-05-22T08:00:00Z"
      schema:
        fields:
          - name: order_id
            type: STRING
          - name: customer_id
            type: STRING
          - name: total
            type: DECIMAL(18,2)

outputs:
  - namespace: s3://data-lake
    name: "bronze/orders"
    facets:
      version:
        property: "version"
        value: "4f4a1c3b2d"
      columnLineage:
        fields:
          order_id: [{"namespace": "snowflake://proddb", "name": "commerce.raw_orders.order_id"}]
          customer_id: [{"namespace": "snowflake://proddb", "name": "commerce.raw_orders.customer_id"}]
          total_amount: [{"namespace": "snowflake://proddb", "name": "commerce.raw_orders.total"}]
```

### dbt Lineage

dbt automatically generates lineage from model definitions:

```yaml
# dbt artifacts: manifest.json, catalog.json, run_results.json
# dbt build produces lineage information automatically

# models/analytics/fct_orders.sql
{{ config(materialized='table') }}
SELECT
    o.order_id,
    o.customer_id,
    o.total_amount,
    c.customer_name,
    c.customer_tier
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('dim_customers') }} c ON o.customer_id = c.customer_id

# dbt docs generate → lineage graph
# dbt docs serve → web UI with column-level lineage
```

Extract lineage from dbt artifacts:

```python
import json

def extract_dbt_lineage(manifest_path):
    with open(manifest_path) as f:
        manifest = json.load(f)

    lineage = {}
    for node_name, node in manifest["nodes"].items():
        if node["resource_type"] == "model":
            lineage[node_name] = {
                "depends_on": node["depends_on"]["nodes"],
                "columns": node.get("columns", {}),
                "sources": [s for s in node["depends_on"]["nodes"] if "source" in s],
            }
    return lineage
```

### DVC Lineage

DVC tracks pipeline stage dependencies in `dvc.yaml`:

```yaml
# dvc.yaml — versioned pipeline, lineage from dependencies
stages:
  ingest:
    cmd: python src/ingest.py
    deps:
      - data/raw/orders.csv  # input data
      - src/ingest.py        # code version
    outs:
      - data/processed/orders_clean.parquet

  transform:
    cmd: python src/transform.py
    params:
      - params.yaml:
          - transform.min_order_value
    deps:
      - data/processed/orders_clean.parquet
      - src/transform.py
    outs:
      - data/final/orders_aggregated.parquet
    metrics:
      - metrics/transform_stats.json:
          cache: false
```

Query DVC lineage:

```bash
# Show pipeline DAG
dvc dag

# Show dependencies for a target
dvc data status --show-updates

# Lock specific stage version
dvc lock transform --checkout
```

### LakeFS Hooks for Lineage

```yaml
# LakeFS hook for post-commit lineage annotation
hooks:
  - id: annotate_lineage
    type: webhook
    properties:
      url: "http://lineage-server/events"
      timeout: 5s
      body: |
        {
          "event": "data_commit",
          "repository": "{{ .Repository.Name }}",
          "branch": "{{ .Branch.Name }}",
          "commit_id": "{{ .Commit.Id }}",
          "committer": "{{ .Commit.Committer }}",
          "timestamp": "{{ .Commit.CreationDate }}",
          "metadata": {{ .Commit.Metadata | toJson }}
        }
```

## Column-Level Lineage

### SQL Parsers for Column Lineage

```python
# Using sqllineage for Python
from sqllineage.runner import LineageRunner

sql = """
    CREATE TABLE analytics.fct_orders AS
    SELECT
        o.order_id,
        o.customer_id,
        o.total AS total_amount,
        c.email,
        c.tier AS customer_tier
    FROM staging.orders o
    JOIN staging.customers c ON o.customer_id = c.customer_id
"""

result = LineageRunner(sql)
for col_lineage in result.column_lineage:
    print(f"{col_lineage.target_table}.{col_lineage.target_column} "
          f"<- {col_lineage.source_table}.{col_lineage.source_column}")
```

### DataHub Column-Level Lineage

```python
from datahub.emitter.mce_builder import make_dataset_urn, make_schema_field_urn
from datahub.emitter.rest_emitter import DatahubRestEmitter

emitter = DatahubRestEmitter("http://datahub-gms:8080")

# Emit column-level lineage
column_lineage = [
    {
        "source": ("snowflake", "proddb", "staging", "orders"),
        "source_field": "total",
        "target": ("s3", "data-lake", "bronze", "orders"),
        "target_field": "total_amount",
    }
]

for cl in column_lineage:
    emitter.emit(
        make_schema_field_urn(
            make_dataset_urn(*cl["target"]),
            cl["target_field"],
        ),
        {
            "fineGrainedLineages": [{
                "sourceType": "COLUMN",
                "sourceFields": [{"resourceUrn": make_dataset_urn(*cl["source"])}],
                "sourceField": cl["source_field"],
            }]
        }
    )
```

## Versioning and Lineage Together

### Reproducible Lineage

The goal is: given a dataset and version, trace back to all inputs and their exact versions.

```python
# Reproducible lineage service
def get_provenance(dataset_uri: str, version: str) -> dict:
    """Return full provenance chain for a dataset version."""
    lineage_db = connect_lineage_store()

    # Get all upstream dependencies
    upstream = lineage_db.query("""
        MATCH (d:Dataset {uri: $uri, version: $version})
        <-[:PRODUCES]-(j:Job)
        -[:CONSUMES]->(up:Dataset)
        RETURN up.uri, up.version, j.name, j.params
    """, {"uri": dataset_uri, "version": version})

    # Recursively trace
    full_lineage = []
    for u in upstream:
        full_lineage.append({
            "uri": u.uri,
            "version": u.version,
            "job": u.job_name,
            "params": u.params,
            "upstream": get_provenance(u.uri, u.version) if u.version else [],
        })

    return full_lineage
```

### Lineage + DVC Workflow

```bash
# Step 1: version data with DVC
dvc add data/raw/orders.csv
git add data/raw/orders.csv.dvc
git commit -m "feat: add raw orders data"

# Step 2: run pipeline
dvc repro

# Step 3: lineage automatically recorded in dvc.lock
# dvc.lock contains versioned dependencies for every output

# Step 4: push to remote
dvc push
git push

# Step 5: trace lineage
dvc data status --show-updates
dvc dag --dot
```

### Lineage + LakeFS Workflow

```bash
# Step 1: branch for data development
lakectl branch create lakefs://data-lake/dev/order-fix --source lakefs://data-lake/main

# Step 2: make changes on branch
# (ETL runs against dev/order-fix branch)

# Step 3: commit data changes
lakectl commit lakefs://data-lake/dev/order-fix -m "fix: correct order total calculation"

# Step 4: create lineage tag
lakectl tag lakefs://data-lake/lineage/order-fix-dev lakefs://data-lake/dev/order-fix

# Step 5: merge after validation
lakectl merge lakefs://data-lake/dev/order-fix lakefs://data-lake/main

# Step 6: tag production release
lakectl tag lakefs://data-lake/release/v2.1.0 lakefs://data-lake/main
```

## Lineage Store

### Schema Design

```sql
-- Lineage store (can be backed by graph database or relational)
CREATE TABLE datasets (
    id UUID PRIMARY KEY,
    uri TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    owner TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (uri, version)
);

CREATE TABLE dataset_versions (
    id UUID PRIMARY KEY,
    dataset_id UUID REFERENCES datasets(id),
    version TEXT NOT NULL,
    schema_hash TEXT,
    checksum TEXT,
    size_bytes BIGINT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB,
    UNIQUE (dataset_id, version)
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    namespace TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_runs (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    run_id TEXT UNIQUE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    status TEXT,
    params JSONB,
    code_version TEXT,
    data_version TEXT
);

CREATE TABLE lineage_edges (
    id UUID PRIMARY KEY,
    input_dataset_version_id UUID REFERENCES dataset_versions(id),
    output_dataset_version_id UUID REFERENCES dataset_versions(id),
    job_run_id UUID REFERENCES job_runs(id),
    transformation TEXT,
    column_mapping JSONB,  -- column-level lineage
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Integration with Catalog

### DataHub Lineage Ingestion

```yaml
# datahub-ingestion-recipe.yaml
source:
  type: dbt
  config:
    manifest_path: ./target/manifest.json
    catalog_path: ./target/catalog.json
    sources_path: ./target/sources.json
    enable_meta_mapping: true
    column_lineage: true  # enable column-level lineage

sink:
  type: datahub-rest
  config:
    server: http://datahub-gms:8080
```

### OpenMetadata Lineage

```python
from openmetadata import OpenMetadata
from openmetadata.schema.entity.data.table import Table

metadata = OpenMetadata(base_url="http://openmetadata-server:8585/api")

# Add table lineage
table = metadata.get_by_name(entity=Table, fqn="proddb.analytics.fct_orders")
source1 = metadata.get_by_name(entity=Table, fqn="proddb.staging.orders")
source2 = metadata.get_by_name(entity=Table, fqn="proddb.staging.customers")

metadata.add_lineage(
    from_entity=source1,
    to_entity=table,
    description="Orders fact table built from staging tables",
    lineage_type="TRANSFORMED",
)
metadata.add_lineage(
    from_entity=source2,
    to_entity=table,
    description="Customer dimension joined into fact table",
    lineage_type="TRANSFORMED",
)
```

## Impact Analysis

### Upstream Impact (what depends on this?)

```cypher
// Neo4j lineage graph query
MATCH (d:Dataset {uri: 's3://data-lake/silver/orders'})
<-[:PRODUCES]-(j:Job)
-[:CONSUMES]->(up:Dataset)
OPTIONAL MATCH (d)-[:PRODUCES]->(down:Job)-[:CONSUMES]->(downstream:Dataset)
RETURN d, j, up, down, downstream
```

### Downstream Impact (what feeds this?)

```python
def get_downstream_lineage(dataset_uri: str, version: str, depth: int = 3) -> list:
    """Find all downstream consumers at specified depth."""
    impact = []
    current = [(dataset_uri, version, 0)]
    seen = set()

    while current:
        uri, ver, d = current.pop(0)
        if d > depth or (uri, ver) in seen:
            continue
        seen.add((uri, ver))

        consumers = lineage_store.query("""
            SELECT j.name, j.type, d_out.uri, d_out.version
            FROM lineage_edges le
            JOIN dataset_versions dv_in ON le.input_dataset_version_id = dv_in.id
            JOIN datasets ds_in ON dv_in.dataset_id = ds_in.id
            JOIN job_runs jr ON le.job_run_id = jr.id
            JOIN jobs j ON jr.job_id = j.id
            JOIN dataset_versions dv_out ON le.output_dataset_version_id = dv_out.id
            JOIN datasets ds_out ON dv_out.dataset_id = ds_out.id
            WHERE ds_in.uri = ? AND dv_in.version = ?
        """, (uri, ver))

        for c in consumers:
            impact.append({
                "uri": c.uri,
                "version": c.version,
                "job": c.job_name,
                "job_type": c.job_type,
                "depth": d + 1,
            })
            current.append((c.uri, c.version, d + 1))

    return impact
```

## Operational Practices

### Monitoring Lineage Completeness

```sql
-- Find datasets without lineage
SELECT d.uri, d.name, d.domain
FROM datasets d
LEFT JOIN lineage_edges le ON d.id IN (
    SELECT dv.dataset_id FROM dataset_versions dv
    WHERE dv.id = le.input_dataset_version_id
    OR dv.id = le.output_dataset_version_id
)
WHERE le.id IS NULL;

-- Find orphan datasets (no consumers in 90 days)
SELECT d.uri, dv.version, dv.created_at
FROM datasets d
JOIN dataset_versions dv ON d.id = dv.dataset_id
LEFT JOIN lineage_edges le ON dv.id = le.output_dataset_version_id
WHERE le.id IS NULL
  AND dv.version = (SELECT MAX(version) FROM dataset_versions WHERE dataset_id = d.id)
  AND dv.created_at < now() - interval '90 days';
```

### Alerting on Lineage Breaks

- **Orphan dataset**: dataset has no consumers for 90 days → notify owner
- **Broken lineage**: dependency specified in pipeline not found → block deploy
- **Unauthorized lineage**: data from restricted domain flowing to unauthorized domain → alert security
- **Version mismatch**: pipeline using wrong version of input → warn in CI/CD

### Lineage Governance

| Rule | Description | Enforcement |
|---|---|---|
| Every dataset has lineage | No orphan datasets in production | CI/CD gate |
| Column-level for critical | PII, financial, regulatory datasets | Auto-detection |
| Version-specific | Lineage includes exact versions | DVC/LakeFS integration |
| Owner documented | Every dataset has documented owner | Metadata validation |
| Impact assessed before change | Breaking change notification sent | PR workflow |
| Retention consistent | Lineage store retained per policy | Automated cleanup |

## References

- DVC patterns for ML pipeline lineage
- LakeFS patterns for data lake branching and lineage
- Nessie catalog-level versioning and lineage
- Data catalog metadata management
- Delta Lake time travel for versioned lineage
- Data versioning branching and strategy
