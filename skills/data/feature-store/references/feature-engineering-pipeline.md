# Feature Engineering Pipeline Reference

## Feast Feature Views

Feature views define the compute logic and schema for feature transformations.

### Feature View Types

```python
from datetime import timedelta
from feast import (
    Entity, FeatureView, Field, FileSource, ValueType
)
from feast.types import Float32, Int32, String, Array

# Batch Feature View
user_features = FeatureView(
    name="user_features",
    entities=["user_id"],
    ttl=timedelta(days=30),
    schema=[
        Field(name="user_id", dtype=Int32),
        Field(name="total_orders_30d", dtype=Int32),
        Field(name="avg_order_value_30d", dtype=Float32),
        Field(name="days_since_last_order", dtype=Int32),
        Field(name="preferred_category", dtype=String),
        Field(name="recent_categories", dtype=Array(String)),
    ],
    source=user_batch_source,
    tags={"team": "data-science", "domain": "user"},
    online=True,
)

# Stream Feature View (Feast 0.31+)
# Requires Kafka source and stream processor
user_stream_features = FeatureView(
    name="user_stream_features",
    entities=["user_id"],
    ttl=timedelta(minutes=30),
    schema=[
        Field(name="user_id", dtype=Int32),
        Field(name="page_views_5m", dtype=Int32),
        Field(name="cart_adds_5m", dtype=Int32),
        Field(name="session_duration_5m", dtype=Float32),
    ],
    source=user_stream_source,
    tags={"team": "data-science", "domain": "user", "type": "stream"},
    online=True,
)
```

### Entity Definitions

```python
from feast import Entity, ValueType

user = Entity(
    name="user_id",
    value_type=ValueType.INT64,
    description="Customer identifier",
    join_key="user_id",
)

order = Entity(
    name="order_id",
    value_type=ValueType.STRING,
    description="Order identifier",
    join_key="order_id",
)

product = Entity(
    name="product_id",
    value_type=ValueType.INT64,
    description="Product identifier",
    join_key="product_id",
)
```

## Stream Feature Engineering

### Kafka + Flink Feature Pipeline

```python
# stream_feature_job.py
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment, DataTypes
from pyflink.table.udf import udf

env = StreamExecutionEnvironment.get_execution_environment()
t_env = StreamTableEnvironment.create(env)

# Define Kafka source
t_env.execute_sql("""
    CREATE TABLE user_events (
        user_id INT,
        event_type STRING,
        event_data STRING,
        amount DOUBLE,
        event_time TIMESTAMP(3),
        WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
    ) WITH (
        'connector' = 'kafka',
        'topic' = 'user-events',
        'properties.bootstrap.servers' = 'kafka:9092',
        'properties.group.id' = 'feast-stream-processor',
        'format' = 'json',
        'scan.startup.mode' = 'latest-offset'
    )
""")

# Define Redis sink (Feast online store)
t_env.execute_sql("""
    CREATE TABLE redis_features (
        user_id INT,
        page_views_5m BIGINT,
        cart_adds_5m BIGINT,
        session_duration_5m DOUBLE,
        PRIMARY KEY (user_id) NOT ENFORCED
    ) WITH (
        'connector' = 'redis',
        'format' = 'json',
        'redis.host' = 'redis-feast',
        'redis.port' = '6379',
        'redis.mode' = 'single',
        'lookup.cache.max-rows' = '1000'
    )
""")

# Streaming aggregation
t_env.execute_sql("""
    INSERT INTO redis_features
    SELECT
        user_id,
        COUNT(*) AS page_views_5m,
        SUM(CASE WHEN event_type = 'cart_add' THEN 1 ELSE 0 END) AS cart_adds_5m,
        AVG(CASE WHEN event_type = 'page_view' THEN 
            CAST(event_data AS DOUBLE) END) AS session_duration_5m
    FROM user_events
    GROUP BY
        user_id,
        TUMBLE(event_time, INTERVAL '5' MINUTE)
""")
```

### Event Time and Watermarks

```python
# Watermark strategy for late data handling
from pyflink.datastream import WatermarkStrategy
from pyflink.common.time import Duration

watermark_strategy = WatermarkStrategy.for_bounded_out_of_orderness(
    Duration.of_seconds(10)
).with_timestamp_assigner(
    lambda event, timestamp: event.event_time
)

# Late data handling
t_env.execute_sql("""
    INSERT INTO redis_features
    SELECT
        user_id,
        COUNT(*) AS page_views_5m
    FROM user_events
    GROUP BY
        user_id,
        TUMBLE(event_time, INTERVAL '5' MINUTE)
    WITH (
        'allowed_lateness' = '30s',
        'late_data_output' = 'side_output'
    )
""")
```

## Feature Validation

### Pre-Materialization Validation

```python
class FeatureValidator:
    """Validate features before materialization."""

    def __init__(self, store: FeatureStore):
        self.store = store

    def validate_feature_values(
        self,
        feature_view: str,
        entity_df: pd.DataFrame,
        rules: dict
    ) -> list[dict]:
        """Validate feature values against rules."""
        features = self.store.get_historical_features(
            entity_df=entity_df,
            features=[f"{feature_view}:*"]
        ).to_df()

        violations = []
        for feature_name, rule in rules.items():
            if feature_name not in features.columns:
                continue

            values = features[feature_name].dropna()

            if 'min' in rule and values.min() < rule['min']:
                violations.append({
                    'feature': feature_name,
                    'check': 'min',
                    'expected': rule['min'],
                    'actual': values.min()
                })

            if 'max' in rule and values.max() > rule['max']:
                violations.append({
                    'feature': feature_name,
                    'check': 'max',
                    'expected': rule['max'],
                    'actual': values.max()
                })

            if 'null_pct' in rule:
                actual_null = features[feature_name].isnull().mean()
                if actual_null > rule['null_pct']:
                    violations.append({
                        'feature': feature_name,
                        'check': 'null_pct',
                        'expected': rule['null_pct'],
                        'actual': actual_null
                    })

            if 'distinct_count' in rule:
                distinct = values.nunique()
                if distinct > rule['distinct_count']:
                    violations.append({
                        'feature': feature_name,
                        'check': 'distinct_count',
                        'expected': rule['distinct_count'],
                        'actual': distinct
                    })

        return violations

# Validation rules for user features
validation_rules = {
    "total_orders_30d": {"min": 0, "max": 1000, "null_pct": 0},
    "avg_order_value_30d": {"min": 0.0, "max": 50000.0, "null_pct": 0.05},
    "days_since_last_order": {"min": 0, "max": 365, "null_pct": 0.1},
    "preferred_category": {"null_pct": 0.2},
}
```

### Feature Distribution Monitoring

```python
def monitor_feature_distributions(
    store: FeatureStore,
    feature_view: str,
    entity_df: pd.DataFrame,
    reference_stats: dict
) -> dict:
    """Monitor feature distributions for drift."""
    features = store.get_historical_features(
        entity_df=entity_df,
        features=[f"{feature_view}:*"]
    ).to_df()

    drift_alerts = []

    for column in features.columns:
        if column in ['event_timestamp', 'created_timestamp', 'user_id']:
            continue

        current_mean = features[column].mean()
        current_std = features[column].std()
        reference_mean = reference_stats[column]['mean']
        reference_std = reference_stats[column]['std']

        # Z-score for drift detection
        if reference_std > 0:
            z_score = abs(current_mean - reference_mean) / reference_std
            if z_score > 3:
                drift_alerts.append({
                    'feature': column,
                    'z_score': z_score,
                    'reference_mean': reference_mean,
                    'current_mean': current_mean,
                    'severity': 'high' if z_score > 5 else 'medium'
                })

    return {
        'feature_view': feature_view,
        'alerts': drift_alerts,
        'alert_count': len(drift_alerts),
        'timestamp': datetime.utcnow().isoformat()
    }
```

## Point-in-Time Joins

Point-in-time correctness ensures training data has no future data leakage.

### How Feast Ensures Point-in-Time Correctness

```python
import pandas as pd
from feast import FeatureStore

store = FeatureStore(repo_path="./feature_repo")

# Entity DataFrame with event timestamps
entity_df = pd.DataFrame.from_dict({
    "user_id": [1001, 1001, 1002, 1003],
    "event_timestamp": [
        "2026-05-01 12:00:00",  # First order
        "2026-05-10 14:30:00",  # Second order
        "2026-05-05 09:00:00",
        "2026-05-15 16:00:00",
    ],
})

# Feast automatically:
# 1. For each entity row, finds the latest feature value
#    with event_timestamp <= entity's event_timestamp
# 2. Never uses future feature values (no data leakage)
# 3. Orders features by event_timestamp and takes latest

training_data = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "user_features:total_orders_30d",
        "user_features:avg_order_value_30d",
    ],
).to_df()

# Result:
# user_id=1001, event_timestamp=2026-05-01 12:00
#   → total_orders_30d from feature computed at 2026-05-01 06:00 (not 2026-05-10)
# user_id=1001, event_timestamp=2026-05-10 14:30
#   → total_orders_30d from feature computed at 2026-05-10 06:00
```

### Manual Point-in-Time Join (Without Feast)

```python
def point_in_time_join(
    entity_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    entity_key: str,
    feature_timestamp_col: str,
    entity_timestamp_col: str
) -> pd.DataFrame:
    """Manual point-in-time join (simulating what Feast does)."""
    # Sort feature data by entity and timestamp
    feature_df = feature_df.sort_values(
        [entity_key, feature_timestamp_col]
    )

    # For each entity row, find the most recent feature
    # with timestamp <= entity timestamp
    result = []
    for _, entity_row in entity_df.iterrows():
        entity_id = entity_row[entity_key]
        entity_ts = entity_row[entity_timestamp_col]

        # Filter features for this entity before entity timestamp
        mask = (
            feature_df[entity_key] == entity_id
        ) & (
            feature_df[feature_timestamp_col] <= entity_ts
        )

        matching_features = feature_df[mask]
        if not matching_features.empty:
            most_recent = matching_features.iloc[-1]
            merged = {**entity_row.to_dict(), **most_recent.to_dict()}
            result.append(merged)

    return pd.DataFrame(result)
```

## Rules
- Feature views define the schema and source for each feature group
- Stream feature views for real-time features (Kafka + Flink)
- Validate features before materialization (null rates, ranges, distributions)
- Point-in-time joins prevent future data leakage in training data
- Monitor feature distributions for drift (z-score > 3 = alert)
- Batch materialization for historical features, stream for real-time
- Entity definitions must use consistent ID types across feature views
- Feature TTL prevents stale features from being served
- Test feature engineering pipelines with sample data before production
- Version feature definitions alongside ML model versions
