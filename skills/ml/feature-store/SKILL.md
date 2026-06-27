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

## Point-in-Time Join Patterns

### Problem
Training data must use feature values as they existed at the label time, not future values. Without point-in-time (PIT) joins, label leakage occurs — the model learns patterns that don't exist at prediction time.

### Pattern: Standard PIT Join
```sql
-- Goal: join features $feature with label at event time
-- Table: labels (user_id, event_timestamp, label)
-- Table: features (user_id, feature_timestamp, feature_value)

SELECT
  l.user_id,
  l.event_timestamp,
  l.label,
  f.feature_value
FROM labels l
LEFT JOIN features f
  ON l.user_id = f.user_id
  AND f.feature_timestamp <= l.event_timestamp  -- strict: <= not <
  AND f.feature_timestamp > l.event_timestamp - INTERVAL '30 days'  -- TTL window
```

### Pattern: Window-Based PIT Join
```sql
-- For features computed in windows (e.g., "7-day avg purchase")
-- The window must be computed BEFORE the event timestamp

SELECT
  l.user_id,
  l.event_timestamp,
  l.label,
  AVG(f.value) AS avg_7day_purchase
FROM labels l
LEFT JOIN features f
  ON l.user_id = f.user_id
  AND f.event_timestamp >= l.event_timestamp - INTERVAL '7 days'
  AND f.event_timestamp < l.event_timestamp  -- strict before
GROUP BY l.user_id, l.event_timestamp, l.label
```

### Pattern: Sequential PIT (Multiple Feature Versions)
```python
# When feature computation changed (e.g., feature v2 deployed on date D)
# Use feature v1 for events before D, feature v2 for events after D

def get_feature_at_time(user_id: str, event_time: datetime):
    deploy_cutoff = datetime(2026, 1, 15)  # feature v2 deployed
    if event_time < deploy_cutoff:
        return feature_v1_store.get(user_id, event_time)
    else:
        return feature_v2_store.get(user_id, event_time)
```

### Pattern: Streaming PIT Join
```python
# For real-time features (e.g., current session activity)
# Use Kafka + Flink: join label event with latest feature state

stream_env = StreamExecutionEnvironment.get_execution_environment()
label_stream = stream_env.add_source(kafka_consumer("labels"))
feature_stream = stream_env.add_source(kafka_consumer("features"))

# Temporal join: feature stream is keyed by user_id
joined = label_stream.join(feature_stream)
    .where(lambda l: l.user_id)
    .equal_to(lambda f: f.user_id)
    .window(TumblingEventTimeWindows.of(Time.seconds(5)))
    .apply(PITJoinFunction())
```

## Feature Validation Templates

### Basic Validation — Batch Feature Pipeline
```python
import pandera as pa
from datetime import datetime, timedelta

class FeatureValidationSchema(pa.DataFrameModel):
    user_id: str = pa.Field(nullable=False)
    feature_timestamp: datetime = pa.Field(nullable=False)
    feature_1: float = pa.Field(nullable=True, ge=0, le=1)
    feature_2: int = pa.Field(nullable=True, ge=0)
    category_feature: str = pa.Field(nullable=True, isin=["A", "B", "C"])

@pa.check_types(lazy=True)
def validate_features(df: pd.DataFrame) -> pd.DataFrame:
    schema = FeatureValidationSchema
    # Check no future dates
    assert (df["feature_timestamp"] <= datetime.utcnow()).all(), \
        "Future timestamps detected"
    # Check no stale features
    stale = (datetime.utcnow() - df["feature_timestamp"]) > timedelta(days=31)
    if stale.any():
        logging.warning(f"Found {stale.sum()} stale feature rows")
    return df
```

### Distribution Shift Detection
```python
from scipy.stats import ks_2samp
import numpy as np

def detect_feature_drift(
    production_values: np.ndarray,
    reference_values: np.ndarray,
    feature_name: str,
    p_threshold: float = 0.05,
    ks_threshold: float = 0.1,
):
    stat, p_value = ks_2samp(production_values, reference_values)
    drift_detected = (p_value < p_threshold) and (stat > ks_threshold)
    if drift_detected:
        alert(f"Feature {feature_name} drifted: KS={stat:.3f}, p={p_value:.3f}")
    return {
        "feature": feature_name,
        "ks_statistic": stat,
        "p_value": p_value,
        "drift_detected": drift_detected,
    }
```

### Feature Quality Dashboard
```
Feature            | Null Rate | Cardinality | Mean | Std | Min | Max | Drift Flag
feature_1          | 2.3%     | NA          | 0.45 | 0.12| 0.0 | 1.0 | No
feature_2          | 0.0%     | 18          | 3.2  | 1.1 | 1   | 18  | No
feature_3          | 15.0%    | NA          | -0.1 | 0.8 | -3  | 4   | YES - KS=0.15
```

### Validation Alert Severity
| Severity | Condition | Action |
|----------|-----------|--------|
| Info | Null rate > 5% | Log warning |
| Warning | Null rate > 20% or drift detected | Alert team |
| Error | Null rate > 50% or schema violation | Block pipeline |
| Critical | Feature store unreachable | Page on-call |

## Feature Store Anti-Patterns

1. **Training/Serving Skew**: Different feature computation logic in training vs. serving
   Fix: Serve features through the same feature store, use identical transformation code
2. **No TTL on Features**: Accumulating stale features in online store
   Fix: Set explicit TTL per feature view; purge expired entries
3. **Leaky Point-in-Time Joins**: Using future feature values in training
   Fix: Always join with `feature_timestamp <= label_timestamp`
4. **Over-materialization**: Materializing all features to online store
   Fix: Only materialize features used in production serving
5. **Feature Sprawl**: Thousands of undocumented features
   Fix: Feature registry with owner, description, and usage tracking

## Feature Store Comparison

| Capability | Feast | Tecton | Vertex AI Feature Store | Custom |
|-----------|-------|--------|------------------------|--------|
| Open source | Yes | No | No | N/A |
| PIT joins | Manual SQL | Automatic | Manual SQL | Custom |
| Online serving | Redis, DynamoDB | Managed | Managed | Any |
| Streaming | Kafka + Flink | Native | No | Custom |
| Cost | Free (self-managed) | $$$ | $$ | $$ (dev cost) |
| Complexity | High (must operate) | Low (managed) | Medium | Very high |
| Best for | Teams wanting control | Teams with budget | GCP-native teams | Specialized needs |

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

## Architecture Decision Trees

### Feature Store Architecture
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Deployment | Self-hosted Feast (open source) | Managed Tecton/Hopsworks | Team size, operational overhead budget |
| Storage backend | Offline: Parquet on S3 (batch) + Online: Redis (real-time) | Offline: BigQuery + Online: Datastore | Existing data infra, latency requirements |
| Feature computation | Batch (Airflow scheduled) | Streaming (Kafka + Flink) | Freshness needs, data source velocity |

### Feature Engineering Paradigm
- Point-in-time correct features → Use feature store with timestamp join
- Real-time features → Stream processing with feature materialization
- Window aggregation → Feature store with time-windowed transforms
- Embedding features → Pre-compute and store in vector DB

## Implementation Patterns

### Feast Feature Definition
`python
from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource, ValueType
from feast.types import Float32, Int64, String

customer = Entity(
    name="customer_id",
    value_type=ValueType.INT64,
    description="Customer identifier",
)

customer_transactions = FileSource(
    path="s3://feature-bucket/transactions/*.parquet",
    timestamp_field="event_timestamp",
    created_timestamp_column="created",
)

transaction_features = FeatureView(
    name="customer_transaction_features",
    entities=[customer],
    ttl=timedelta(days=7),
    schema=[
        Field(name="total_spend_7d", dtype=Float32),
        Field(name="transaction_count_7d", dtype=Int64),
        Field(name="avg_ticket_size_7d", dtype=Float32),
        Field(name="top_category", dtype=String),
    ],
    source=customer_transactions,
)
`

### Feature Serving API
`python
from feast import FeatureStore
import pandas as pd

store = FeatureStore(repo_path="./feature_repo")

# Online serving for real-time inference
features = store.get_online_features(
    features=[
        "customer_transaction_features:total_spend_7d",
        "customer_transaction_features:transaction_count_7d",
    ],
    entity_rows=[{"customer_id": 1234}, {"customer_id": 5678}]
).to_dict()

# Offline retrieval for training
training_df = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "customer_transaction_features:*",
        "customer_profile_features:age",
        "customer_profile_features:segment",
    ],
).to_df()
`

## Performance Optimization

### Query Performance
- **Feature caching**: Cache frequently accessed online features in Redis cluster. Set TTL based on feature staleness tolerance.
- **Pre-computation**: Pre-compute expensive window features on schedule. Avoid recomputing on every retrieval.
- **Batch retrieval**: Fetch features in batch for multi-entity requests. Use mget for Redis feature retrieval.

### Storage Optimization
- **Compression**: Use Parquet with snappy/zstd compression for offline store. Achieves 3-5x storage reduction.
- **Partitioning**: Partition offline store by timestamp and entity ID. Enable predicate pushdown for efficient queries.
- **Tiered storage**: Hot features in Redis, warm in S3, cold in Glacier. Define access frequency-based migration policy.

## Security Considerations

### Access Control
- **Feature-level ACL**: Restrict access to sensitive features by team. Use column-level access policies in feature store.
- **Entity encryption**: Hash or tokenize entity IDs in feature store. Never store raw PII as entity keys.
- **API authentication**: Secure feature serving API with OAuth2. Require service-to-service mTLS.

### Data Governance
- **Feature lineage**: Track which models consume which features. Document feature owner, source, and transformation logic.
- **Feature validation**: Validate feature values against defined ranges. Flag and quarantine anomalous feature values.
- **Audit trail**: Log all feature retrieval requests with identity and timestamp. Enable compliance audit of feature access.