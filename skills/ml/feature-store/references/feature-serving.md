# Feature Serving

## Online Serving

| Storage | Latency | Throughput | Features |
|---------|---------|------------|----------|
| Redis | <1ms | 100K+/s | Simple key-value |
| DynamoDB | <5ms | 50K/s | Managed, DAX caching |
| Redis + S3 (Feast) | <3ms | 50K+/s | Hybrid online/offline |
| Alluxio | <5ms | High | In-memory, large datasets |
| Hazelcast | <1ms | Very high | Embedded, Java ecosystem |

```python
# Feast online serving
from feast import FeatureStore
import redis

store = FeatureStore(repo_path="feature_repo/")

# Online inference
features = store.get_online_features(
    features=[
        "customer_features:total_orders",
        "customer_features:avg_order_value",
        "customer_features:days_since_last_order",
        "order_features:7d_order_count",
        "order_features:30d_avg_basket_size",
    ],
    entity_rows=[{"customer_id": "abc123"}]
).to_dict()

# Online store is populated by materialization
# Feature retrieval < 5ms typically
```

## Feature Retrieval Optimization

| Technique | Latency Reduction | Complexity |
|-----------|------------------|------------|
| Batch entity retrieval | 10x (1 query for N entities) | Low |
| Embedding pre-computation | 100x (no compute at inference) | Medium |
| Feature caching (local LRU) | 5-10x | Low |
| Embedding index (ANN) | 1000x vs brute force | High |
| Feature pre-fetching | 2x (overlap compute + retrieve) | Medium |

```python
# Batch entity retrieval (10 entities at once)
entity_rows = [{"customer_id": cid} for cid in customer_ids]
features = store.get_online_features(
    features=["customer_features:*"],
    entity_rows=entity_rows
).to_dict()
```

## Offline Serving

| Storage | Query | Scale | Use Case |
|---------|-------|-------|----------|
| Parquet (S3/GCS) | Spark, Athena, Presto | Petabytes | Training, batch inference |
| BigQuery | SQL | Petabytes | Ad-hoc, large-scale training |
| Delta Lake | Spark, Trino | Petabytes | Lakehouse, incremental |
| Snowflake | SQL | Petabytes | Enterprise, Data Cloud |

```python
# Feast offline retrieval for training
from datetime import datetime

training_df = store.get_historical_features(
    entity_df=entity_df,  # DataFrame with entity IDs + timestamps
    features=[
        "customer_features:*",
        "order_features:*"
    ]
).to_df()

# Point-in-time correctness built-in
# Automatically handles: feature_timestamp <= label_timestamp
```

## Training/Serving Skew Prevention

| Skew Type | Detection | Prevention |
|-----------|-----------|------------|
| Feature computation diff | Compare online vs offline values for 1000 randomly sampled entities | Same computation code path |
| Missing feature handling | Log missing feature rate online vs offline | Consistent default values |
| Feature distribution shift | Monitor PSI between training and serving | Alerts + retraining |
| New features missing in online store | Feature validation gate in CI/CD | Feature registry consistency checks |

```python
# Training/serving skew detection
def check_skew(offline_values, online_values, threshold=0.01):
    """Check if online features match offline (training) features."""
    offline = np.array(offline_values)
    online = np.array(online_values)

    # Mean absolute percentage difference
    mape = np.mean(np.abs((offline - online) / (offline + 1e-8)))
    if mape > threshold:
        raise SkewDetected(f"MAPE={mape:.4f} > {threshold}")
    return True
```
