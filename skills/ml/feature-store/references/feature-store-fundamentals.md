# Feature Store Fundamentals: Concepts and When You Need One

Core concepts of feature stores — entities, feature definitions, offline and online stores, materialization, and point-in-time correctness — and a decision guide for adopting one. Tool-specific usage is in `feast-patterns.md` and `feature-architecture.md`; computation pipelines in `feature-computation.md`; serving in `feature-serving.md`.

## Problems a Feature Store Solves

| Problem | Without a feature store | With one |
|---------|------------------------|----------|
| Training/serving skew | Features computed differently in notebooks and production services | One definition used for both |
| Data leakage | Training joins use values that were not known at prediction time | Point-in-time joins built in |
| Duplicate work | Each team recomputes "customer 30-day spend" | Registry with discoverable, reusable features |
| Online latency | Models query warehouses at request time | Precomputed values in a low-latency store |
| Governance | Unknown owners and lineage | Ownership, versioning, and lineage metadata |

## Core Concepts

| Concept | Meaning |
|---------|---------|
| Entity | The object features describe, identified by a join key (`customer_id`, `merchant_id`, `(user_id, item_id)`) |
| Feature | A named, typed value computed for an entity at a point in time |
| Feature view / feature group | A set of features from one source with shared entity, timestamp, and TTL |
| Event timestamp | When the feature value became true in the real world |
| Offline store | Historical feature values for training and batch scoring (warehouse or lakehouse tables) |
| Online store | Latest feature values per entity for low-latency inference (Redis, DynamoDB, Bigtable, Cassandra, managed stores) |
| Materialization | Copying latest values from offline sources into the online store |
| Registry | Metadata catalog of entities, features, sources, owners, versions |
| Feature service | Named set of features a model consumes; ties a model version to exact features |

## Data Flow

```
Raw data (warehouse, lake, streams)
   ─► Feature pipelines (batch SQL/Spark, streaming Flink/Spark)
        ─► Offline store (full history, event timestamps)
             ├─► Training datasets via point-in-time joins
             └─► Materialization ─► Online store ─► Inference service (get_online_features)
```

Streaming features can be written to both stores directly ("push" sources) for freshness in seconds.

## Point-in-Time Correctness

For each training example (entity, label timestamp), use the most recent feature value with `event_timestamp <= label_timestamp` (and within the feature's TTL).

```sql
-- Equivalent logic of a point-in-time join for one feature table
SELECT l.customer_id, l.label_ts, l.label, f.spend_30d
FROM labels l
LEFT JOIN LATERAL (
  SELECT spend_30d
  FROM customer_spend_features f
  WHERE f.customer_id = l.customer_id
    AND f.event_ts <= l.label_ts
    AND f.event_ts > l.label_ts - INTERVAL '7 days'      -- TTL
  ORDER BY f.event_ts DESC
  LIMIT 1
) f ON TRUE;
```

A plain join on `customer_id` to the latest feature table leaks future information and produces models that look good offline and fail in production.

Also account for **availability latency**: a value computed by a nightly job for day D is only available on D+1. Use the time the value became available (or shift event timestamps) when that delay matters.

## Feature Types by Freshness

| Type | Freshness | Computation | Example |
|------|-----------|-------------|---------|
| Batch | Hours to a day | Scheduled SQL/Spark | 90-day purchase count |
| Streaming | Seconds to minutes | Flink/Spark Streaming windows | Transactions in last 10 minutes |
| On-demand / request-time | Per request | Computed in the inference path from request data (+ stored features) | Distance between request location and home address |

Choose the slowest freshness that still serves the model's purpose; streaming features cost more to build and operate.

## Build vs Buy vs Skip

| Situation | Recommendation |
|-----------|----------------|
| Few batch models, scoring offline | Skip a feature store; use versioned tables + careful PIT joins |
| Several online models sharing entities | Open-source (Feast) or platform-native store |
| Many teams, streaming features, strict SLAs | Managed/enterprise (Tecton, Databricks Feature Engineering, Vertex AI Feature Store, SageMaker Feature Store) or a mature in-house platform |

Signs you need one: repeated skew incidents, the same features reimplemented across teams, online models needing many features at low latency.

## Minimal Feast Example

```python
from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource
from feast.types import Float32, Int64

customer = Entity(name="customer", join_keys=["customer_id"])

spend_source = FileSource(path="data/customer_spend.parquet", timestamp_field="event_ts")

customer_spend = FeatureView(
    name="customer_spend",
    entities=[customer],
    ttl=timedelta(days=7),
    schema=[Field(name="spend_30d", dtype=Float32), Field(name="orders_30d", dtype=Int64)],
    source=spend_source,
)
```

```python
training_df = store.get_historical_features(
    entity_df=labels_df,                       # customer_id + event_timestamp + label
    features=["customer_spend:spend_30d", "customer_spend:orders_30d"],
).to_df()

online = store.get_online_features(
    features=["customer_spend:spend_30d"], entity_rows=[{"customer_id": 1234}]
).to_dict()
```

## Design Guidelines

- Define features close to the source domain with owners; name them descriptively (`spend_30d_eur`, not `f17`).
- Keep transformations deterministic and versioned; changing a definition creates a new feature or version.
- Set TTLs so stale values are treated as missing rather than silently served.
- Decide default values for missing features consistently between training and serving.

## Pitfalls

- Using processing time instead of event time for timestamps.
- Computing training features with SQL and serving features with separate application code.
- Ignoring entity key mismatches (types, casing) between offline and online paths.
- Adopting a feature store before having models in production that need it.

## Checklist

- [ ] Entities and join keys defined consistently
- [ ] Every feature has event timestamp, TTL, owner, description
- [ ] Training data built only through point-in-time joins
- [ ] Freshness tier chosen per feature
- [ ] Same definitions used offline and online
- [ ] Adoption decision documented against simpler alternatives
