---
name: ml-feature-store
description: >
  Use this skill when designing feature stores: Feast, Tecton, online features, offline features, point-in-time join, feature serving, feature registry, feature transformation, feature validation.
  This skill enforces: feature repository structure, point-in-time correctness, online/offline serving separation, feature validation with freshness checks, feature registry with documentation.
  Do NOT use for: model training pipeline, embedding storage, vector database configuration.
version: "1.0.0"
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

## Agent Protocol

### Trigger
User request includes: Feast, Tecton, feature store, online features, offline features, point-in-time join, feature serving, feature registry, feature transformation, feature validation, feature engineering.

### Protocol
1. Identify feature sources: batch, streaming, or real-time data.
2. Choose feature store tool based on infra and scale requirements.
3. Design feature repository with data sources, feature views, and entities.
4. Configure point-in-time joins for historical feature retrieval.
5. Set up online serving with low-latency materialization.
6. Define feature validation rules: freshness, distribution, null checks.
7. Plan feature registry and sharing across teams.

## Output
Feature store architecture with tool selection, feature definition, serving config, validation.

### Response Format
```
## Feature Store Configuration
### Tool
Engine: {Feast / Tecton}
Version: {version}
Deployment: {self-hosted / managed}

### Data Sources
| Source | Type | Format | Update Frequency |
|---|---|---|---|
| {name} | {batch/streaming} | {Parquet/BQ/Kafka} | {daily/continuous} |

### Feature Views
| Name | Entities | Features | TTL | Online |
|---|---|---|---|---|
| {view} | {entity} | {feature list} | {duration} | {true/false} |

### Point-in-Time Join
- Entity Key: {column}
- Timestamp Column: {event_timestamp}
- Lag: {max historical lag}

### Online Serving
- Store: {Redis/DynamoDB/Firestore}
- Materialization: {trigger/scheduled}
- Latency SLA: {ms}
- Throughput: {QPS}

### Validation Rules
- Freshness: {feature} must be < {age} old
- Null Ratio: {feature} < {threshold}% null
- Distribution: {feature} within [{min}, {max}] or alert
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Feature store tool selected with deployment model documented.
- [ ] Data sources defined with format, frequency, and access pattern.
- [ ] Feature views mapped to entities with TTL and online flag.
- [ ] Point-in-time join configuration for historical correctness.
- [ ] Online serving setup with latency SLA and throughput targets.
- [ ] Feature validation rules with freshness and quality checks.

## Workflow

### Step 1: Choose Feature Store
- **Feast**: Open-source, self-hosted, great for batch features. Supports Redis, DynamoDB for online store.
- **Tecton**: Managed, declarative, supports streaming + batch, built-in monitoring. Higher cost.

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
    name='driver_id',
    description='Driver identifier',
    value_type=ValueType.INT64,
)

# data_sources.py
from feast import FileSource

driver_stats_source = FileSource(
    path='/data/features/driver_stats.parquet',
    event_timestamp_column='event_timestamp',
    created_timestamp_column='created',
)
```

### Step 4: Define Feature Views
```python
# feature_views.py
from feast import FeatureView, Feature

driver_stats_fv = FeatureView(
    name='driver_stats',
    entities=['driver_id'],
    ttl=timedelta(days=7),
    features=[
        Feature(name='avg_daily_trips', dtype=ValueType.FLOAT),
        Feature(name='avg_rating', dtype=ValueType.FLOAT),
        Feature(name='lifetime_trips', dtype=ValueType.INT64),
    ],
    online=True,
    input=driver_stats_source,
)
```

### Step 5: Point-in-Time Join
```python
# Historical retrieval
from feast import FeatureStore

store = FeatureStore(repo_path='.')
training_df = store.get_historical_features(
    entity_df=entity_df,  # contains driver_id + event_timestamp
    features=[
        'driver_stats:avg_daily_trips',
        'driver_stats:avg_rating',
    ],
).to_df()
# Feast handles point-in-time join automatically
```

### Step 6: Online Serving
```python
# Online feature retrieval
feature_vector = store.get_online_features(
    features=['driver_stats:avg_daily_trips', 'driver_stats:avg_rating'],
    entity_rows=[{'driver_id': 1001}],
).to_dict()

# Materialize to online store
store.materialize_incremental(end_date=datetime.now())
```

## Rules
- Point-in-time joins mandatory for training data — never use latest values for historical training.
- Online store materialization scheduled regularly to maintain freshness.
- Feature views have explicit TTL — no infinite retention.
- Every feature has documented owner, description, and data source.
- Validation rules applied to all features — freshness, distribution, null checks.
- Online store chosen based on latency SLA: Redis for <10ms, DynamoDB for <50ms.
- Batch sources use Parquet or columnar formats for efficient retrieval.
- Feature registry versioned and shared across team workspaces.
- Never serve raw features without transformation logic documented.
- Feature drift triggers validation alert — automate monitoring.

## References
- `references/feast-patterns.md` — Feast setup, feature repository, point-in-time join, materialization
- `references/feature-architecture.md` — Tecton, online/offline architecture, validation, registry
- `references/feature-computation.md` — Stream feature computation, batch processing, transformation pipelines, feature engineering at scale
- `references/feature-serving.md` — Online serving, storage backends (Redis/DynamoDB), latency optimization, caching strategies

## Handoff
For model training with feature store integration, hand off to `ml-ml-pipeline`. For serving infrastructure, hand off to `ml-model-serving`. For data pipeline orchestration, hand off to `ml-pipeline`.
