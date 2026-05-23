# Cloud ETL Services

## AWS Glue

### Architecture
- **Glue Data Catalog**: Hive-compatible metastore for schema discovery and storage
- **Glue Crawler**: scans data sources, infers schema, populates catalog
- **Glue ETL Jobs**: serverless Spark (Python/Scala) or Ray runtime
- **Glue Studio**: visual job editor with drag-and-drop transforms
- **Glue Workflows**: orchestration of crawlers, jobs, and triggers

### ETL Job Pattern
```python
import sys
from awsglue.transforms import *
from awsglue.context import GlueContext
from pyspark.context import SparkContext

sc = SparkContext()
glueContext = GlueContext(sc)

# DynamicFrame (Glue's schema-on-read abstraction)
dyf = glueContext.create_dynamic_frame.from_catalog(
    database="sales_db",
    table_name="raw_orders",
    transformation_ctx="raw_orders"
)

# Built-in transforms
dyf = DropNullFields.apply(dyf)
dyf = ResolveChoice.apply(dyf, choice="make_cols")
dyf = ApplyMapping.apply(dyf, mappings=[
    ("order_id", "string", "order_id", "string"),
    ("amount", "double", "amount", "double"),
    ("created_at", "string", "created_at", "timestamp")
])

# Write to target
s3_path = "s3://data-lake/silver/orders/"
glueContext.write_dynamic_frame.from_options(
    frame=dyf,
    connection_type="s3",
    connection_options={"path": s3_path},
    format="parquet"
)
```

### Glue Job Configuration
- DPU (Data Processing Units): 1 DPU = 4 vCPU + 16 GB RAM
- Worker type: Standard (4 vCPU, 16 GB), G.1X (Spark), G.2X (Spark/Ray)
- Auto-scaling: enabled by default for Spark 3.3+
- Job bookmark: stateful tracking of processed data for incremental loads

---

## Azure Data Factory (ADF)

### Core Components
- **Pipeline**: logical grouping of activities
- **Activity**: individual step (Copy Data, Data Flow, Stored Procedure, Web)
- **Linked Service**: connection string to data source (SQL, Blob, REST)
- **Dataset**: data structure representation (table, file, folder)
- **Integration Runtime**: compute infrastructure for data movement (Azure IR, Self-hosted IR, Azure-SSIS IR)

### Mapping Data Flow (No-Code Transform)
```json
{
  "name": "SalesTransform",
  "type": "MappingDataFlow",
  "properties": {
    "sources": [{
      "name": "RawOrders",
      "dataset": "ds_raw_orders"
    }],
    "transformations": [
      {"name": "Filter", "filter": "status != 'cancelled'"},
      {"name": "DerivedColumn", "columns": [{
        "name": "revenue", "value": "quantity * unit_price"
      }]},
      {"name": "Aggregate", "groupBy": ["product_id"],
       "aggregates": [{"name": "total_revenue", "function": "sum", "column": "revenue"}]}
    ],
    "sink": {"name": "SilverOrders", "dataset": "ds_silver_orders"}
  }
}
```

### Trigger Types
- Schedule: cron-based recurrence
- Tumbling Window: fixed-size non-overlapping windows for incremental loads
- Storage Event: blob created/deleted
- Custom Event: Event Grid events

---

## GCP Dataflow

### Architecture
- **Apache Beam** SDK (Java, Python, Go) defines pipeline logic
- **Runner**: Dataflow Runner translates Beam pipeline to cloud resources
- **Worker**: auto-scaled GCE VMs executing pipeline steps
- **Shuffle Service**: managed data shuffling (eliminates shuffle disk)
- **Flexible Resource Scheduling**: use preemptible VMs for cost savings

### Streaming ETL Pipeline
```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions(
    streaming=True,
    project="my-project",
    region="us-central1",
    staging_location="gs://dataflow-staging/",
    temp_location="gs://dataflow-temp/"
)

with beam.Pipeline(options=options) as pipeline:
    events = (
        pipeline
        | "ReadFromPubSub" >> beam.io.ReadFromPubSub(
            subscription="projects/my-project/subscriptions/events"
        )
        | "ParseJSON" >> beam.Map(lambda msg: json.loads(msg.decode('utf-8')))
        | "FilterValid" >> beam.Filter(lambda e: e.get("status") != "invalid")
        | "AddTimestamp" >> beam.Map(lambda e: beam.window.TimestampedValue(e, e["timestamp"]))
        | "Window" >> beam.WindowInto(beam.window.FixedWindows(60))
        | "WriteToBigQuery" >> beam.io.WriteToBigQuery(
            table="project:dataset.silver_events",
            schema="order_id:STRING, amount:FLOAT, event_time:TIMESTAMP",
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
        )
    )
```

### Dataflow Key Features
- Auto-scaling: scales workers based on CPU utilization and backlog
- Watermark tracking: handles late data with configurable allowed lateness
- Exactly-once processing guarantees in streaming mode
- Streaming engine: moves state processing to backend, reduces worker resource needs

## Selection Matrix

| Feature | AWS Glue | ADF | GCP Dataflow |
|---------|----------|-----|-------------|
| Processing engine | Spark/Ray | Spark (mapping flows) | Apache Beam |
| Best for | Schema discovery, catalog | Visual pipeline, connectors | Streaming, Beam SDK |
| Incremental | Job bookmarks | Watermark/tumbling window | Watermark + windows |
| Pricing | DPU-hour | Activity execution | Worker-hour + data |
| Serverless | Yes | Yes | Yes |
| Multi-cloud | No (AWS) | No (Azure) | No (GCP) |
