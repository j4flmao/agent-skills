# Feature Registry & Governance

Central catalog for ML features: discovery, versioning, lineage, access control.

## Registry Structure

```yaml
feature_registry:
  storage:
    sqlite: "Local dev, single-user"
    gcs_s3: "Production, team-wide"
    snowflake: "Enterprise, SQL-backed"
    dataproc: "GCP-native, BigQuery integration"

  caching:
    local_ttl: 60  # seconds
    cache_size: 1000  # feature views
    refresh: "Background refresh on TTL expiry"
```

## Feature View Definition

```python
from feast import FeatureView, Field
from feast.types import Float32, Int64, String

user_features = FeatureView(
    name="user_transaction_features",
    entities=["user_id"],
    ttl=timedelta(days=7),
    features=[
        Field(name="avg_transaction_7d", dtype=Float32),
        Field(name="transaction_count_7d", dtype=Int64),
        Field(name="preferred_category", dtype=String),
    ],
    online=True,
    source=transaction_stats_source,
    tags={"team": "payments", "tier": "critical"},
    owner="ml-platform-team",
)
```

## Governance Controls

| Concern | Mechanism | Implementation |
|---------|-----------|----------------|
| Discovery | Feature registry search | `feast list`, `feast describe` |
| Versioning | Dated feature views | `FeatureView(name="v2", created=...)` |
| Lineage | Source tracking | `source=feature_table` in definitions |
| Access control | Registry ACL | Service account scoping per project |
| Data quality | Validation | Freshness checks, null-rate monitors |
| Deprecation | TTL + tag | `status: deprecated` tag, removal after TTL |

## Point-in-Time Correctness

```sql
-- Training dataset with correct historical features
SELECT
  e.event_timestamp,
  e.user_id,
  f.avg_transaction_7d,
  f.transaction_count_7d
FROM events e
LEFT JOIN feature_table f
  ON e.user_id = f.user_id
  AND f.created_timestamp <= e.event_timestamp
  AND f.created_timestamp > e.event_timestamp - INTERVAL '7 days'
```

## Retrieval Patterns

```python
# Offline - training datasets
training_df = fs.get_historical_features(
    entity_df=entity_df,
    features=[
        "user_transaction_features:avg_transaction_7d",
        "user_transaction_features:transaction_count_7d",
    ],
).to_df()

# Online - real-time inference
feature_vector = fs.get_online_features(
    features=["user_transaction_features:avg_transaction_7d"],
    entity_rows=[{"user_id": "abc123"}],
).to_dict()
```

## Monitoring & Alerting

| Metric | Threshold | Action |
|--------|-----------|--------|
| Feature freshness | > 30 min stale | Alert on-call |
| Online retrieval latency | p99 > 50ms | Scale online store |
| Registry sync failure | > 1 min | Fallback to cache |
| Missing feature rate | > 1% | Investigate upstream |
