---
name: ml-feature-store
description: >
  Use this skill when designing feature stores: Feast, Tecton, online features, offline features, point-in-time join, feature serving, feature registry, feature transformation, feature validation.
  This skill enforces: feature repository structure, point-in-time correctness, online/offline serving separation, feature validation with freshness checks, feature registry with documentation.
  Do NOT use for: model training pipeline, embedding storage, vector database configuration.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, features, mlops, phase-11]
---

# Feature Store Agent

## Purpose
Design feature store architecture with Feast or Tecton for consistent feature computation, serving, and validation across training and inference.

## Architecture/Decision Trees

### Tool Selection
```
Feature requirements
  ├── Open-source, self-hosted, batch features
  │   └── Feast (Redis/DynamoDB online store, Parquet/ BigQuery offline)
  ├── Managed, streaming + batch, built-in monitoring
  │   └── Tecton (higher cost, less operational overhead)
  └── Cloud-native feature platform
      ├── AWS → SageMaker Feature Store (integrated with SageMaker)
      ├── GCP → Vertex AI Feature Store (integrated with Vertex AI)
      └── Databricks → Feature Store (Delta Lake-backed)
```

### Online Store Selection
```
Latency SLA requirement
  ├── <5ms p99, high throughput → Redis (in-memory)
  ├── <10ms p99, moderate throughput → ElastiCache / Memorystore
  ├── <50ms p99, large feature size >1MB → DynamoDB / Firestore
  └── <100ms, read-heavy workloads → Cassandra / ScyllaDB
```

### Feature Computation Pattern
```
Data freshness requirement
  ├── Batch (daily/hourly) → Scheduled Spark/Dataflow job
  │   Output: Parquet (offline) + push to online store
  ├── Streaming (near real-time, <1min)
  │   ├── Kafka → Flink → Online Store
  │   └── Kafka → Bytewax/RisingWave → Online Store
  └── Real-time (request-time computation)
      └── Feature transformations in serving code (on-the-fly)
```

## Agent Protocol

### Trigger
User request includes: Feast, Tecton, feature store, online features, offline features, point-in-time join, feature serving, feature registry, feature transformation.

### Protocol
1. Identify feature sources: batch, streaming, or real-time data.
2. Choose feature store tool based on infra and scale requirements.
3. Design feature repository with data sources, feature views, and entities.
4. Configure point-in-time joins for historical feature retrieval.
5. Set up online serving with low-latency materialization.
6. Define feature validation rules: freshness, distribution, null checks.
7. Plan feature registry and sharing across teams.

### Output
Feature store architecture with tool selection, feature definition, serving config, validation.

### Response Format
```
## Feature Store Configuration
### Tool
Engine: {Feast / Tecton}
Deployment: {self-hosted / managed}

### Data Sources
| Source | Type | Format | Update Frequency |

### Feature Views
| Name | Entities | Features | TTL |

### Point-in-Time Join
- Entity Key: {column}
- Timestamp Column: {event_timestamp}

### Online Serving
- Store: {Redis/DynamoDB/Firestore}
- Latency SLA: {ms}
- Throughput: {QPS}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Feature store tool selected with deployment model documented.
- [ ] Data sources defined with format, frequency, and access pattern.
- [ ] Feature views mapped to entities with TTL and online flag.
- [ ] Point-in-time join configuration for historical correctness.
- [ ] Online serving setup with latency SLA and throughput targets.
- [ ] Feature validation rules with freshness and quality checks.

## Workflow

### Step 1: Choose Feature Store
- **Feast**: Open-source, self-hosted, batch features. Supports Redis, DynamoDB. Python SDK.
- **Tecton**: Managed, declarative, streaming + batch, built-in monitoring. Higher cost.
- **SageMaker Feature Store**: Native AWS integration, good for SageMaker workflows.
- **Vertex AI Feature Store**: GCP-native, BigQuery-backed.
- **Databricks Feature Store**: Delta Lake-based, Spark-native.

### Step 2: Define Feature Repository
```
feature_repo/
├── data_sources.py      # Source definitions
├── entities.py           # Entity definitions  
├── feature_views.py      # Feature view definitions
├── feature_service.py    # Serving definitions
└── config.py             # Feast config
```

### Step 3: Configure Entities and Sources
```python
# entities.py
from feast import Entity

driver = Entity(
    name="driver_id",
    description="Driver identifier",
    value_type=ValueType.INT64,
)

# data_sources.py
from feast import FileSource

driver_stats_source = FileSource(
    path="/data/features/driver_stats.parquet",
    event_timestamp_column="event_timestamp",
    created_timestamp_column="created",
)
```

### Step 4: Define Feature Views
```python
# feature_views.py
from feast import FeatureView, Feature
from datetime import timedelta

driver_stats_fv = FeatureView(
    name="driver_stats",
    entities=["driver_id"],
    ttl=timedelta(days=7),
    features=[
        Feature(name="avg_daily_trips", dtype=ValueType.FLOAT),
        Feature(name="avg_rating", dtype=ValueType.FLOAT),
        Feature(name="lifetime_trips", dtype=ValueType.INT64),
    ],
    online=True,
    input=driver_stats_source,
)

# Streaming feature view
from feast import StreamFeatureView
from feast.data_format import AvroFormat

driver_stream_fv = StreamFeatureView(
    name="driver_stats_streaming",
    entities=["driver_id"],
    ttl=timedelta(hours=1),
    features=[
        Feature(name="trips_last_hour", dtype=ValueType.INT32),
    ],
    online=True,
    source=KafkaSource(
        kafka_bootstrap_servers="broker:9092",
        message_format=AvroFormat(schema_registry_url="registry:8081"),
        topic="driver-trips",
    ),
)
```

### Step 5: Point-in-Time Join
```python
from feast import FeatureStore

store = FeatureStore(repo_path='.')
training_df = store.get_historical_features(
    entity_df=entity_df,  # contains driver_id + event_timestamp
    features=[
        'driver_stats:avg_daily_trips',
        'driver_stats:avg_rating',
    ],
).to_df()
```

### Step 6: Online Serving
```python
# Online feature retrieval
feature_vector = store.get_online_features(
    features=['driver_stats:avg_daily_trips', 'driver_stats:avg_rating'],
    entity_rows=[{'driver_id': 1001}],
).to_dict()

# Materialize to online store
from datetime import datetime
store.materialize_incremental(end_date=datetime.now())

# Scheduled materialization
# feast materialize-incremental $(date +"%Y-%m-%dT%H:%M:%S")
```

### Step 7: Feature Validation
```python
from feast import Feature
from feast.infra.offline_stores.bigquery_source import BigQuerySource
from great_expectations.core import ExpectationSuite

def define_validation_rules():
    return {
        "avg_daily_trips": {
            "freshness": "1h",  # must be < 1 hour old
            "null_ratio": 0.05,  # max 5% null
            "min": 0,
            "max": 1000,
            "distribution": "exponential",
        },
        "avg_rating": {
            "freshness": "24h",
            "null_ratio": 0.01,
            "min": 1.0,
            "max": 5.0,
        },
    }

def validate_features(store, feature_view_name):
    """Run validation rules against feature view."""
    fv = store.get_feature_view(feature_view_name)
    df = store._get_offline_features(
        feature_view=fv,
        entity_df=entity_df,
    )
    rules = define_validation_rules()
    for feature_name, rule in rules.items():
        if feature_name in df.columns:
            null_pct = df[feature_name].isnull().mean()
            assert null_pct < rule["null_ratio"], \
                f"{feature_name}: null ratio {null_pct:.2%} > {rule['null_ratio']:.0%}"
    print("Validation passed")
```

## Anti-Patterns

- **No point-in-time join**: Using latest values for training causes data leakage — model sees future info.
- **Infinite TTL**: Feature views need explicit TTL. No infinite retention for stale features.
- **Serving raw features without transformation logic**: Must document all transforms.
- **Feature drift without alerting**: Should trigger validation alert on distribution shift.
- **No feature ownership**: Every feature must have documented owner, description, source.
- **Online store chosen for wrong latency**: Redis for <10ms, DynamoDB for <50ms, Cassandra for high write.
- **Training with stale features**: Point-in-time correctness requires event_timestamp alignment.

## Production Considerations

### Monitoring
- Feature freshness (age of online features).
- Feature value distribution (PSI, KS test for drift).
- Online serving latency (p50/p95/p99).
- Feature request throughput (QPS).
- Null ratio per feature.
- Online store memory utilization (Redis memory usage).

### Scaling
- Feast: supports horizontal scaling via multiple feature server replicas.
- Redis cluster for online store: shard by entity key.
- Offline store: partition by date for efficient time-range queries.
- Materialization: parallelize by feature view partitions.

### Deployment
- Feature server as sidecar or independent deployment.
- Health checks on feature serving endpoints.
- CI/CD for feature definition changes (validate + apply).
- Staged rollout of new feature views.

## Rules
- Point-in-time joins mandatory for training data.
- Online store materialization scheduled regularly.
- Feature views have explicit TTL.
- Every feature has documented owner, description, source.
- Validation rules applied to all features.
- Online store chosen based on latency SLA.
- Batch sources use columnar formats (Parquet).
- Feature registry versioned and shared across teams.
- Never serve raw features without documented transformations.
- Feature drift triggers validation alert.

## References
  - references/feast-patterns.md — Feast Patterns
  - references/feature-architecture.md — Feature Architecture & Tecton
  - references/feature-computation.md — Feature Computation
  - references/feature-serving.md — Feature Serving
  - references/feature-store-advanced.md — Feature Store Advanced Topics
  - references/feature-store-fundamentals.md — Feature Store Fundamentals
## Handoff
For model training with feature store integration, hand off to `ml-ml-pipeline`. For serving infrastructure, hand off to `ml-model-serving`.
