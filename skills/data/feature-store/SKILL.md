---
name: data-feature-store
description: >
  Use this skill when asked about feature store, Feast, Tecton, feature engineering pipeline, online/offline serving, feature registry, point-in-time joins, feature serving, feature retrieval, ML feature pipeline, or feature management. This skill enforces: Feast deployment for feature management with offline and online serving, Tecton for managed feature platform, point-in-time correct feature joins for training datasets, feature registry for discovery and governance, and feature engineering pipeline design with batch and streaming sources. Do NOT use for: ML model training (use ML skill), data pipeline orchestration (use data-etl-pipeline), or real-time streaming infrastructure (use streaming skill).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [data, ml, features, mlo, phase-11]
---

# Feature Store

## Purpose
Manage ML features through their lifecycle: define feature definitions, compute from batch/streaming sources, serve at low latency for online inference, and generate point-in-time correct training datasets.

## Agent Protocol

### Trigger
Exact user phrases: "feature store", "Feast", "Tecton", "feature engineering", "feature serving", "feature registry", "point-in-time join", "online features", "offline features", "feature pipeline", "feature retrieval", "feature management", "ML feature".

### Input Context
Before activating, verify:
- ML framework (PyTorch, TensorFlow, scikit-learn)
- Inference mode (batch scoring, real-time API)
- Feature sources (data warehouse, streaming, real-time APIs)
- Infrastructure (Kubernetes, cloud provider, on-prem)
- Online serving requirements (latency, throughput, freshness)
- Existing feature definitions location

### Output Artifact
Feature store configuration with Feast deployment, feature definitions, serving infrastructure, and training dataset generation pipeline.

### Response Format
```yaml
# Feast feature definitions
# Serving config
```
```python
# Feature retrieval for training
# Online feature serving
# Point-in-time join
```
```sql
# Feature engineering queries
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Feast or Tecton deployed with offline and online store
- [ ] Feature definitions registered with types, sources, and owners
- [ ] Feature engineering pipeline producing batch and streaming features
- [ ] Point-in-time correct training dataset generation working
- [ ] Online serving endpoint providing features under 10ms p99
- [ ] Feature registry browsable for discovery and documentation
- [ ] Feature validation and monitoring configured

### Max Response Length
300 lines of code and configuration.

## Feast Feature Definitions

### Feature Repository Structure
```
feature_repo/
├── feature_store.yaml       # Feast config
├── features/
│   ├── user_features.py     # User-related features
│   ├── order_features.py    # Order-related features
│   └── merchant_features.py # Merchant features
└── analysis/
    └── feature_stats.py     # Feature distribution analysis
```

### feature_store.yaml
```yaml
project: ml_features
provider: gcp
registry:
  path: gs://ml-feature-registry/registry.db
  cache_ttl_seconds: 3600
online_store:
  type: redis
  connection_string: redis://redis-feast:6379
offline_store:
  type: bigquery
  dataset: feast_offline
```

### Feature Definition
```python
# features/user_features.py
from datetime import timedelta
from feast import (
    Entity, FeatureView, Field, FileSource, ValueType
)
from feast.types import Float32, Int32, String

user = Entity(
    name="user_id",
    value_type=ValueType.INT64,
    description="Customer identifier",
)

user_source = FileSource(
    path="gs://ml-data/features/users/*.parquet",
    timestamp_field="event_timestamp",
    created_timestamp_column="created_at",
)

user_features = FeatureView(
    name="user_features",
    entities=[user],
    ttl=timedelta(days=30),
    schema=[
        Field(name="user_id", dtype=Int32),
        Field(name="total_orders_30d", dtype=Int32),
        Field(name="avg_order_value_30d", dtype=Float32),
        Field(name="days_since_last_order", dtype=Int32),
        Field(name="customer_tenure_days", dtype=Int32),
        Field(name="preferred_category", dtype=String),
    ],
    source=user_source,
    tags={"team": "data-science", "domain": "user"},
)
```

## Point-in-Time Joins

### Training Dataset Generation
```python
import pandas as pd
from feast import FeatureStore

store = FeatureStore(repo_path="./feature_repo")
entity_df = pd.DataFrame.from_dict({
    "user_id": [1001, 1002, 1003, 1004],
    "event_timestamp": [
        "2026-05-01 12:00:00",
        "2026-05-01 13:00:00",
        "2026-05-02 09:00:00",
        "2026-05-03 15:00:00",
    ],
})

training_data = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "user_features:total_orders_30d",
        "user_features:avg_order_value_30d",
        "user_features:days_since_last_order",
        "user_features:customer_tenure_days",
        "order_features:order_count_7d",
        "order_features:total_spend_7d",
    ],
).to_df()

# Feast ensures each feature value is the value as-of the event_timestamp
# No data leaks — features from the future are never included
print(training_data.head())
```

### Point-in-Time Join Mechanics
```
Entity row: user_id=1001, event_timestamp=2026-05-01 12:00
    ↓
Feast looks up user_features table:
    Finds most recent row with event_timestamp <= 2026-05-01 12:00
    Returns total_orders_30d=12 (computed at 2026-05-01 06:00)
    Does NOT use total_orders_30d=14 (computed at 2026-05-01 14:00 — future)
    ↓
Result: clean training example with no future data leakage
```

## Online Feature Serving

### Low-Latency Retrieval
```python
from feast import FeatureStore
import time

store = FeatureStore(repo_path="./feature_repo")

def get_online_features(user_ids: list[int]) -> dict:
    """Retrieve latest features for real-time inference."""
    start = time.time()

    features = store.get_online_features(
        features=[
            "user_features:total_orders_30d",
            "user_features:avg_order_value_30d",
            "user_features:days_since_last_order",
        ],
        entity_rows=[{"user_id": uid} for uid in user_ids],
    ).to_dict()

    latency = (time.time() - start) * 1000
    return {"features": features, "latency_ms": latency}

# Usage in prediction API
@app.post("/predict")
def predict(request: PredictionRequest):
    features = get_online_features(request.user_ids)
    predictions = model.predict(features["features"])
    return {"predictions": predictions.tolist()}
```

### Redis Online Store Config
```yaml
# Redis cluster for production online serving
online_store:
  type: redis
  connection_string: redis://redis-cluster:6379
  key_ttl_seconds: 86400  # 24 hour TTL on feature keys
  password_encrypted: ${FEAST_REDIS_PASSWORD}

# Optional: Redis Sentinel
  redis_type: redis_cluster
  sentinel_master: feast-master
  sentinel_set:
    - host: redis-sentinel-0:26379
    - host: redis-sentinel-1:26379
```

## Feast Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  feast-server:
    image: feastdev/feature-server:0.38
    ports:
      - "6566:6566"
    environment:
      FEAST_FEATURE_STORE: /etc/feast/feature_store.yaml
      FEAST_REDIS_HOST: redis
      FEAST_REDIS_PORT: 6379
    volumes:
      - ./feature_repo:/etc/feast

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  feast-ui:
    image: feastdev/feast-ui:0.38
    ports:
      - "8888:80"
    environment:
      FEAST_UI_REGISTRY_URL: gs://ml-feature-registry/registry.db
```

## Feature Engineering Pipelines

### Batch Feature Pipeline (Spark)
```python
# spark_feature_pipeline.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, sum, avg, datediff, current_date, max as spark_max

spark = SparkSession.builder.appName("user-features").getOrCreate()

orders = spark.table("warehouse.orders")
customers = spark.table("warehouse.customers")

features = orders.join(customers, "customer_id").groupBy("customer_id").agg(
    count(when(col("order_date") >= date_sub(current_date(), 30), True)).alias("total_orders_30d"),
    avg(when(col("order_date") >= date_sub(current_date(), 30), col("amount"))).alias("avg_order_value_30d"),
    datediff(current_date(), spark_max("order_date")).alias("days_since_last_order"),
)

features.write.mode("overwrite").parquet("gs://ml-data/features/users/")
```

### Streaming Feature Pipeline (Kafka + Flink)
```python
# streaming_user_features.py
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment, DataTypes

env = StreamExecutionEnvironment.get_execution_context()
t_env = StreamTableEnvironment.create(env)

t_env.execute_sql("""
    CREATE TABLE user_events (
        user_id INT,
        event_type STRING,
        amount DOUBLE,
        event_time TIMESTAMP(3),
        WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
    ) WITH (
        'connector' = 'kafka',
        'topic' = 'user-events',
        'properties.bootstrap.servers' = 'kafka:9092',
        'format' = 'json'
    )
""")

t_env.execute_sql("""
    CREATE TABLE redis_sink (
        user_id INT,
        total_orders_5m BIGINT,
        total_amount_5m DOUBLE,
        PRIMARY KEY (user_id) NOT ENFORCED
    ) WITH (
        'connector' = 'redis',
        'format' = 'json',
        'redis.host' = 'redis-feast',
        'redis.port' = '6379'
    )
""")

t_env.execute_sql("""
    INSERT INTO redis_sink
    SELECT
        user_id,
        COUNT(*) as total_orders_5m,
        SUM(amount) as total_amount_5m
    FROM user_events
    WHERE event_type = 'order_placed'
    GROUP BY user_id, TUMBLE(event_time, INTERVAL '5' MINUTE)
""")
```

## Feature Validation and Monitoring

### Feature Validation
```python
# feature_stats.py
from feast import FeatureStore

store = FeatureStore(repo_path="./feature_repo")
fv = store.get_feature_view("user_features")
features = store.get_historical_features(
    entity_df=entity_df,
    features=[f"user_features:{f.name}" for f in fv.schema],
).to_df()

checks = {
    "total_orders_30d": {
        "min": 0,
        "max": 1000,
        "null_pct": 0,
    },
    "avg_order_value_30d": {
        "min": 0.0,
        "max": 50000.0,
        "null_pct": 0.05,
    },
    "days_since_last_order": {
        "min": 0,
        "max": 365,
        "null_pct": 0.1,
    },
}

for col, rules in checks.items():
    null_pct = features[col].isnull().mean()
    assert null_pct <= rules["null_pct"], f"{col}: null {null_pct:.2%} > {rules['null_pct']:.0%}"
    assert features[col].min() >= rules["min"], f"{col}: min {features[col].min()} < {rules['min']}"
    assert features[col].max() <= rules["max"], f"{col}: max {features[col].max()} > {rules['max']}"
```

### Feast Architecture

```yaml
feast_architecture:
  feature_repository:
    path: "features/"
    components:
      - feature_store.yaml  # Infrastructure config
      - features/           # Feature definitions (Python)
      - requirements.txt    # Feast version + dependencies
      - .feastignore        # Files to exclude from registry
  
  feature_store_yaml:
    project: "customer_features"
    registry: "gs://feature-registry/registry.db"  # Shared registry
    provider: "gcp"
    
    offline_store:
      type: "bigquery"
      dataset: "feature_store"
    
    online_store:
      type: "redis"
      connection_string: "redis://redis-cluster:6379"

  serving_patterns:
    batch_serving:
      - "Feast.get_historical_features(entity_df, features) → Pandas/Spark DF"
      - "Used for: training data generation, batch scoring"
    
    online_serving:
      - "feast_client.get_online_features(features, entity_keys) → Proto/JSON"
      - "Used for: real-time model inference, API serving"
      - "Latency: p99 < 10ms for 100 entity keys"
    
    streaming_serving:
      - "Push features to online store via Feast push API"
      - "Streaming feature computation → push → online store"
      - "Used for: real-time features in streaming ML"
```

### Feature Serving Decision Tree

```
Feature freshness requirement?
├── Historical data only (batch training)
│   └── Offline store: BigQuery/Redshift/Snowflake (point-in-time joins)
├── Batch serving (daily/hourly predictions)
│   ├── Materialized offline → batch inference
│   └── Online store fallback for recent features
├── Real-time serving (sub-second)
│   ├── Pre-computed features → Online store: Redis/DynamoDB
│   ├── Stream-computed features → Feature push API → Online store
│   └── Feature TTL: 24h-7d for freshness-staleness tradeoff
└── Streaming (event-time features)
    ├── Streaming feature computation (Kafka/Flink)
    ├── Push to online store via streaming sink
    └── Feature TTL: minutes-hours for event-time features
```

## Rules
- All features have point-in-time correctness — no future data leakage
- Entity definitions use the same ID type across all feature views
- Online store supports p99 < 10ms for batch of 100 entity keys
- Offline store uses columnar format (Parquet) for training data generation
- Feature TTL prevents staleness — stale features not served online
- Feature registry is the single source of truth for all feature definitions
- Feature validation runs before materialization
- Monitoring tracks feature freshness, serving latency, and retrieval errors
- Feature engineering pipelines are idempotent and incremental
- Match serving store to latency requirements — batch for training, online for inference
- Use Feast feature repository for version-controlled feature definitions

## References
  - references/feast-setup-guide.md — Feast Setup Guide
  - references/feature-engineering-pipeline.md — Feature Engineering Pipeline Reference
  - references/feature-registry.md — Feature Registry & Governance
  - references/feature-validation-monitoring.md — Feature Validation and Monitoring
  - references/offline-feature-computation.md — Offline Feature Computation
  - references/online-serving.md — Online Feature Serving Reference
## Architecture Decision Trees

```
Feature Store Selection
├── ML framework ecosystem?
│   ├── Python-heavy → Feast (Python-native, great with scikit-learn/XGBoost)
│   ├── Spark ecosystem → Feature Store on Databricks / SageMaker
│   └── Multi-language → Tecton (SaaS, Python + SQL + Spark)
├── Online serving required?
│   ├── Yes → Feast + Redis/DynamoDB (low-latency serving)
│   └── No → Offline-only (Feast BigQuery/Redshift)
├── Point-in-time correct joins?
│   ├── Yes → Feast (temporal join built-in)
│   └── No → Custom SQL with window functions
└── Feature sharing across teams?
    ├── Yes → Centralized registry (Feast with GCS/S3 registry)
    └── No → Per-team feature definitions
```

**Decision criteria**: Evaluate online/offline serving needs, team ML maturity, feature reuse goals, and infrastructure compatibility.

## Implementation Patterns

### Feast Feature Definition
```python
# feature_store/features.py
from feast import Entity, FeatureView, ValueType, FeatureService
from feast.infra.offline_stores.bigquery_source import BigQuerySource

customer = Entity(
    name="customer_id",
    value_type=ValueType.INT64,
    description="Customer identifier",
)

order_features = FeatureView(
    name="order_features",
    entities=[customer],
    ttl="90d",
    online=True,
    source=BigQuerySource(
        query="SELECT customer_id, order_count, avg_order_value, last_order_date FROM feature_store.order_aggregates"
    ),
    tags={"team": "fraud", "tier": "critical"},
)
```

### Online Feature Serving
```python
# feature_store/online_serving.py
from feast import FeatureStore

class FeatureServingClient:
    def __init__(self, repo_path: str = "./feature_repo"):
        self.store = FeatureStore(repo_path)

    def get_online_features(self, features: list[str], entities: list[dict]) -> dict:
        feature_vector = self.store.get_online_features(
            features=features,
            entities=entities,
        ).to_dict()
        return feature_vector

    def get_historical_features(self, entity_df, features: list[str]):
        job = self.store.get_historical_features(
            entity_df=entity_df,
            features=features,
        )
        return job.to_df()
```

## Production Considerations

- **Online store sizing**: Provision Redis cluster with enough memory for all active features (~2x expected size for overhead).
- **Feature freshness**: Set TTL per feature view based on update frequency; stale features auto-expire.
- **Feature validation**: Validate feature distributions against training baseline; alert on drift > 2σ.
- **Registry synchronization**: Sync feature registry across environments (dev → staging → prod) via CI/CD.
- **Point-in-time correctness**: Ensure training datasets use point-in-time joins to prevent data leakage.
- **Monitoring**: Track online serving latency (p99 < 10ms), feature retrieval rate, and cache hit rate.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| No point-in-time join in training | Data leakage, inflated model accuracy | Use Feast temporal joins |
| Features not shared between models | Duplicate computation, inconsistency | Register features in central registry |
| Overly long TTL on features | Serving stale features for inference | Set TTL based on feature update cadence |
| Online store without failover | Serving outage on Redis failure | Deploy Redis cluster with replica nodes |
| Ignoring feature correlation | Colinear features degrade models | Track feature correlation matrix in registry |

## Performance Optimization

- **Online store caching**: Add local cache (Redis on same node) for frequently accessed features; TTL 60s.
- **Batch feature materialization**: Pre-compute batch features hourly; use incremental materialization.
- **Vectorized serving**: Batch entity requests into groups of 100 for reduced network round-trips.
- **Feature embedding**: Pre-compute embedding features offline; serve from vector DB (FAISS, Pinecone).
- **Parquet optimization**: Store offline feature data in Parquet with partition pruning by date and entity key.

## Security Considerations

- **Feature ACLs**: Restrict feature access by team/service account; sensitive features require approval.
- **Online store encryption**: Enable Redis encryption in transit (TLS) and at rest (AES-256).
- **Registry protection**: Sign feature registry commits; verify signatures in CI/CD deployment.
- **Audit trail**: Log all feature registry changes, materialization runs, and online serving requests.
- **Compliance**: Tag features containing PII; strip or hash PII features in non-production environments.

## Handoff
`streaming` for real-time feature computation with Kafka and Flink
`etl-pipeline` for batch feature engineering orchestration with Airflow
