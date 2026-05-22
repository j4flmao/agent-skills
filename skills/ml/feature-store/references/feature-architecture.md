# Feature Architecture & Tecton

## Tecton Declarative Features

```python
# Tecton feature definition
from tecton import Entity, BatchSource, FeatureView, Aggregation
from tecton.types import Field, String, Float64, Int64
import tecton

# Entity
user = Entity(
    name="user",
    join_keys=["user_id"],
    description="Platform user",
)

# Batch source
user_transactions = BatchSource(
    name="user_transactions",
    batch_engine="spark",
    data_format="parquet",
    path="s3://data/transactions/",
    timestamp_field="timestamp",
)

# Feature view with aggregations
user_spend_features = FeatureView(
    name="user_spend_features",
    entities=[user],
    ttl="7 days",
    batch_schedule="1 day",
    online=True,
    aggregations=[
        Aggregation(column="amount", function="sum", time_window="1d"),
        Aggregation(column="amount", function="avg", time_window="7d"),
        Aggregation(column="amount", function="count", time_window="30d"),
        Aggregation(column="amount", function="max", time_window="90d"),
    ],
    source=user_transactions,
)
```

## Online/Offline Architecture

```
                     ┌──────────────┐
                     │  Data Sources│
                     │ Batch/Stream │
                     └──────┬───────┘
                            │
                    ┌───────▼────────┐
                    │  Transformation│
                    │ (Spark/SQL/Pandas)│
                    └───────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
     ┌────────▼────────┐       ┌─────────▼─────────┐
     │  Offline Store  │       │   Online Store    │
     │ (Parquet/BQ/S3) │       │ (Redis/DynamoDB)  │
     │ Training data   │       │ Low-latency serve │
     │ Point-in-time   │       │ <10ms p99         │
     └────────┬────────┘       └─────────┬─────────┘
              │                           │
     ┌────────▼────────┐       ┌─────────▼─────────┐
     │  Feature Registry│      │   Feature Serving  │
     │ (Metadata store) │      │  (gRPC/REST API)   │
     └─────────────────┘       └───────────────────┘
```

## Feature Validation

```python
# Feature freshness monitoring
from datetime import datetime, timedelta

class FeatureMonitor:
    def __init__(self, store):
        self.store = store

    def check_freshness(self, feature_view, max_age=timedelta(hours=1)):
        """Check when features were last materialized."""
        metadata = self.store.get_feature_view_metadata(feature_view)
        last_materialized = metadata.last_materialized
        age = datetime.now() - last_materialized
        if age > max_age:
            return {"status": "stale", "age": age, "max_age": max_age}
        return {"status": "fresh", "age": age}

    def check_distribution(self, feature_name, reference_stats, tolerance=0.1):
        """Compare current distribution against reference."""
        current_stats = self.store.compute_feature_stats(feature_name)
        drift = abs(current_stats.mean - reference_stats.mean) / reference_stats.mean
        if drift > tolerance:
            return {"status": "drift_detected", "drift": drift}
        return {"status": "normal", "drift": drift}
```

## Feature Registry

```python
# Registry structure
class FeatureRegistry:
    def __init__(self, backend="sqlite"):
        self.backend = backend
        self.registry = {
            "users": {
                "features": {
                    "avg_session_duration": {
                        "type": "float",
                        "description": "Average session duration in seconds",
                        "owner": "data-team",
                        "source": "clickstream",
                        "freshness_sla": "1h",
                    }
                }
            }
        }

    def register_feature(self, namespace, feature_def):
        if namespace not in self.registry:
            self.registry[namespace] = {"features": {}}
        self.registry[namespace]["features"][feature_def["name"]] = feature_def

    def search(self, query):
        results = []
        for ns, data in self.registry.items():
            for fname, fdef in data["features"].items():
                if query.lower() in fname or query.lower() in fdef.get("description", ""):
                    results.append({f"{ns}.{fname}": fdef})
        return results
```

## Feature Sharing Across Teams

```yaml
# feature_catalog.yaml
namespaces:
  payments:
    owner: payments-team
    features:
      payment_method:
        type: categorical
        values: [credit_card, debit_card, paypal, crypto]
      transaction_amount_7d:
        type: continuous
        aggregation: sum
        window: 7d
      fraud_score:
        type: continuous
        range: [0, 1]
        higher_is: worse

  recommendations:
    owner: ml-team
    features:
      item_embedding:
        type: embedding
        dimension: 384
        model: all-MiniLM-L6-v2
      user_cluster:
        type: categorical
        values: [cluster_1, cluster_2, cluster_3]
      popularity_score:
        type: continuous
        aggregation: count
        window: 1d

  pricing:
    owner: growth-team
    features:
      price_elasticity:
        type: continuous
        range: [-5, 0]
      competitor_price_ratio:
        type: continuous
        range: [0.5, 2.0]
```

## Online Store Selection

| Store | Latency | Throughput | Persistence | Cost |
|---|---|---|---|---|
| Redis | <1ms | 100k QPS | In-memory | Low |
| DynamoDB | <10ms | 10k QPS | SSD | Medium |
| Firestore | <20ms | 10k QPS | SSD | Medium |
| MySQL/PG | <50ms | 5k QPS | Disk | Low |
