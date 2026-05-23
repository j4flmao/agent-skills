# Apache NiFi and Mage.ai ETL Patterns

## Apache NiFi

### Core Concepts
- **FlowFile**: unit of data moving through the pipeline, with attributes (metadata) and content (payload)
- **Processor**: atomic operation (GetFile, PutS3, ConvertRecord, UpdateAttribute)
- **Connection**: FlowFile queue between processors, supports backpressure
- **Process Group**: logical grouping of processors for modularity
- **Controller Service**: shared resources (DB connection pools, credential providers)

### Common Processor Patterns

**File Ingestion Pipeline**
```
GetFile → UpdateAttribute (add source metadata) → ConvertRecord (CSV → Avro) → PutS3
         ↓
   MergeContent (batch small files before S3)
```

**CDC from Database**
```
CaptureChangeMySQL → RouteOnAttribute (INSERT/UPDATE/DELETE) → SplitJson → PutKafka
```
Key settings: `Distribute Map` for parallel processing, backpressure at 10k queued FlowFiles.

### NiFi Cluster
- Zero-master clustering via ZooKeeper (primary node elected automatically)
- Flow configuration stored in a `flow.xml.gz` on shared volume (NFS/S3) or in a database
- Site-to-Site (S2S) protocol for multi-cluster data transfer
- NiFi Registry for versioned flow storage (Git-like flow versioning)

### Backpressure Configuration
```xml
<!-- Stop producing if queue exceeds threshold -->
<backPressureObjectThreshold>10000</backPressureObjectThreshold>
<backPressureDataSizeThreshold>1 GB</backPressureDataSizeThreshold>
```

---

## Mage.ai

### Pipeline Structure
Mage pipelines are composed of **blocks** — each block is a separate Python file in a pipeline directory:
```
pipelines/
  sales_pipeline/
    __init__.py
    data_loaders/
      load_orders.py
    transformers/
      clean_orders.py
      aggregate_revenue.py
    exporters/
      export_to_snowflake.py
    io_config.yaml
    metadata.yaml
```

### Block Types
- **Data Loader**: `@data_loader` decorator, reads from source (API, DB, file, stream)
- **Transformer**: `@transformer` decorator, processes data in memory
- **Exporter**: `@exporter` decorator, writes to target (warehouse, lake, file)
- **Sensor**: `@sensor` decorator, checks upstream conditions before pipeline runs

### Pattern: Incremental Load with dbt
```python
@data_loader
def load_orders(*args, **kwargs):
    from mage_ai.data_preparation.repo_manager import get_repo_path
    from mage_ai.io.bigquery import BigQuery
    return BigQuery.with_config(io_config).load(
        "SELECT * FROM raw_orders WHERE created_at > '{{ yesterday_dt }}'"
    )

@transformer
def transform(orders, *args, **kwargs):
    return orders.dropna(subset=["order_id"]).astype({"amount": "float64"})

@exporter
def export(df, *args, **kwargs):
    from mage_ai.io.dbt import DbtBlock
    DbtBlock.run("models/staging/stg_orders.sql", profiles_dir="~/.dbt")
```

### Execution Model
- Trigger types: schedule, event (webhook, Kafka), API
- Runtime: Python process per block (isolated execution)
- Retry per block: configurable retries and retry delay
- Block concurrency: parallel execution for independent blocks

### Key Config (io_config.yaml)
```yaml
version: 0.1.0
default:
  BIGQUERY:
    project: my-project
    dataset: raw_data
    location: US
    credentials:
      type: service_account
      path: /home/src/.gcp/credentials.json
```

## Selection Guide

| Factor | NiFi | Mage.ai |
|--------|------|---------|
| Interface | Visual drag-drop | Code-first + visual debugger |
| Best for | Protocol-heavy ingestion, real-time routing | Python-native ELT, dbt integration |
| Scaling | Cluster with ZooKeeper | Single node + K8s worker pool |
| State management | FlowFile attributes | In-memory DataFrame |
| Schema handling | ConvertRecord with Avro schema | Pandas/PyArrow schema inference |
| Learning curve | Medium (visual) | Low (Python) |
