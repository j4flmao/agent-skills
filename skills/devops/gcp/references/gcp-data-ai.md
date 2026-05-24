# GCP Data & AI

## BigQuery

| Feature | Capability | Cost Model |
|---------|------------|------------|
| Serverless data warehouse | Auto-scaling, up to petabytes | On-demand ($5/TB) or flat-rate |
| BI Engine | In-memory acceleration (sub-second) | Per-slot reservation |
| Omni | Query across AWS/Azure (cross-cloud) | Per-TB scanned |
| BigLake | Unified lakehouse (GCS, S3, Azure) | Per-TB scanned |
| ML | SQL-based ML (CREATE MODEL) | Per-TB + ML compute |
| Streaming | Real-time ingestion | Per-GB streamed |

```sql
-- Partitioned and clustered table
CREATE TABLE my_dataset.orders
(
  order_id STRING,
  customer_id STRING,
  amount NUMERIC,
  created_at TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY customer_id
OPTIONS(
  partition_expiration_days = 365,
  require_partition_filter = true
);

-- ML model in BigQuery
CREATE MODEL my_dataset.ltv_model
OPTIONS(model_type='linear_reg') AS
SELECT
  lifetime_value AS label,
  order_count,
  avg_order_value,
  tenure_days
FROM my_dataset.customer_features;
```

## Dataflow

| Pipeline Type | Use Case | Processing |
|---------------|----------|------------|
| Batch | Scheduled ETL, backfill | Bounded data |
| Streaming | Real-time ingestion, enrichment | Unbounded data |
| FlexRS | Batch with 6h SLA (cheaper) | Discounted batch |
| Template | Pre-built pipelines | No-code deployment |

```bash
# Run Dataflow streaming job
gcloud dataflow jobs run stream-processing \
  --region=us-central1 \
  --gcs-location=gs://dataflow-templates/latest/PubSub_to_BigQuery \
  --parameters=inputTopic=projects/my-project/topics/events,outputTableSpec=my-project:dataset.events
```

## Pub/Sub

| Feature | Capability |
|---------|------------|
| Throughput | Unlimited (auto-scaled) |
| Delivery | At-least-once |
| Ordering | Message ordering per ordering key |
| Retention | Up to 7 days (default), 31 days (max) |
| Dead letter | Configurable DLQ topic |
| Schema | Avro, Protobuf enforcement |

## Vertex AI

| Service | Purpose |
|---------|---------|
| AutoML | No-code model training (tabular, image, text, video) |
| Custom Training | Distributed training with GPUs/TPUs |
| Prediction | Online (endpoints) and batch prediction |
| Model Registry | Versioned model management, deployment |
| Feature Store | Online and offline feature serving |
| Pipelines | ML pipeline orchestration (Kubeflow) |
| LangChain | LLM application framework integration |

## Cloud Storage

| Storage Class | Min Duration | Retrieval | Use Case |
|---------------|-------------|-----------|----------|
| Standard | None | Instant | Active data |
| Nearline | 30 days | Instant | Monthly access |
| Coldline | 90 days | Instant | Quarterly access |
| Archive | 365 days | >1 hour | Compliance/backup |

## Dataproc

```bash
# Create Spark cluster
gcloud dataproc clusters create spark-cluster \
  --region=us-central1 \
  --master-machine-type=n2-standard-4 \
  --worker-machine-type=n2-standard-4 \
  --num-workers=5 \
  --image-version=2.0-debian10 \
  --optional-components=JUPYTER \
  --enable-component-gateway

# Submit Spark job
gcloud dataproc jobs submit spark \
  --region=us-central1 \
  --cluster=spark-cluster \
  --class=com.example.ETLJob \
  --jars=gs://my-bucket/jobs/etl.jar
```
