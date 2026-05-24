# Feature Computation

## Stream Feature Computation

| Framework | Source | Sink | State | Best For |
|-----------|--------|------|-------|----------|
| Kafka Streams | Kafka | Kafka, DB | RocksDB | Java ecosystem |
| Flink | Kafka, Kinesis | Kafka, DB, S3 | RocksDB, FS | Complex event processing |
| Spark Structured Streaming | Kafka, Kinesis, S3 | Kafka, DB, S3 | Checkpoint | Batch + stream unification |
| Bytewax | Kafka, SQS | Kafka, DB | Stateful operators | Python-native |

```python
# Flink feature computation (Python API)
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.common import WatermarkStrategy

env = StreamExecutionEnvironment.get_execution_environment()
ds = env.from_source(kafka_source, WatermarkStrategy.no_watermarks(), "events")

# Compute sliding window features
features = (
    ds.key_by(lambda e: e.user_id)
    .window(SlidingEventTimeWindows.of(Time.hours(24), Time.hours(1)))
    .aggregate(AggregateFeatureComputation())
)

# Compute session features
sessions = (
    ds.key_by(lambda e: e.user_id)
    .interval_join(ds.key_by(lambda e: e.user_id))
    .between(Time.minutes(-30), Time.seconds(0))
    .process(SessionFeatureJoin())
)
```

## Batch Computation

| Pattern | Frequency | Trigger | Example |
|---------|-----------|---------|---------|
| Scheduled | Daily/hourly | Cron/Airflow | Daily customer aggregates |
| Incremental | Continuous | New data arrival | Append-only features |
| Snapshot | Weekly | Scheduled | Full recompute of all features |
| Backfill | One-time | Manual | Historical feature computation |

```python
# Feast batch materialization
from feast import FeatureStore

store = FeatureStore(repo_path="feature_repo/")

# Scheduled materialization
store.materialize_incremental(
    end_date=datetime.now(),
    feature_views=["customer_features", "order_features"]
)

# Backfill specific date range
store.materialize(
    start_date=datetime(2023, 1, 1),
    end_date=datetime(2024, 1, 1),
    feature_views=["customer_features"]
)
```

## Point-in-Time Correctness

```python
# Point-in-time join — avoid future data leakage
feature_data = """
SELECT
    f.entity_id,
    f.feature_timestamp,
    f.feature_value,
    l.label_timestamp,
    l.label_value
FROM feature_table f
JOIN label_table l
    ON f.entity_id = l.entity_id
    AND f.feature_timestamp <= l.label_timestamp
    AND f.feature_timestamp > l.label_timestamp - INTERVAL '30 days'
"""
```

| Violation | Symptom | Fix |
|-----------|---------|-----|
| Future feature used | Overly optimistic metrics during training | Point-in-time join in offline store |
| Feature computed after label | Leakage in training data | Ensure feature timestamp <= label timestamp |
| Different computation logic online vs offline | Training/serving skew | Same code path for both |
| Feature at inference different from training | Feature drift, degraded accuracy | Monitor feature distribution shift |

## Feature Freshness SLA

| Feature Type | Freshness SLA | Computation | Online Store Sync |
|-------------|---------------|-------------|-------------------|
| User profile | 1h | Batch hourly | Write-through cache |
| Session features | 1min | Stream computation | Real-time write |
| Real-time stats | <1s | Stream computation | Inline computation |
| ML embeddings | 24h | Batch daily | Pre-computed + cached |
| Aggregations (7d window) | 1h | Incremental update | Streaming update |
