# Feast Patterns

## Setup

```bash
# Install Feast
pip install feast

# Initialize repository
feast init my_feature_repo
cd my_feature_repo

# Directory structure
feature_repo/
├── data_sources.py
├── entities.py
├── feature_views.py
├── feature_service.py
├── config.py
└── .feast.yaml
```

## Configuration

```yaml
# config.py
project: rides
registry: gs://feast-registry/registry.db
provider: gcp
online_store:
  type: redis
  connection_string: localhost:6379
offline_store:
  type: file
entity_key_serialization_format: proto
```

## Data Sources

```python
# data_sources.py
from feast import FileSource, BigQuerySource, KafkaSource
from feast.data_format import AvroFormat
from datetime import timedelta

# Batch source
driver_stats_batch = FileSource(
    name="driver_stats_source",
    path="gs://feature-store/data/driver_stats.parquet",
    event_timestamp_column="event_timestamp",
    created_timestamp_column="created",
)

# BigQuery source
customer_bq = BigQuerySource(
    name="customer_features",
    query="SELECT * FROM project.dataset.customer_features WHERE {timestamp_condition}",
    timestamp_field="event_timestamp",
)

# Streaming source (Kafka)
ride_stream = KafkaSource(
    name="ride_events",
    kafka_bootstrap_servers="localhost:9092",
    topic="ride-events",
    batch_size=100,
    message_format=AvroFormat(schema_json="..."),
    watermark_delay=timedelta(seconds=30),
)
```

## Entities

```python
# entities.py
from feast import Entity, ValueType

driver = Entity(
    name="driver_id",
    description="Driver identifier",
    value_type=ValueType.INT64,
    join_key="driver_id",
)

customer = Entity(
    name="customer_id",
    description="Customer identifier",
    value_type=ValueType.STRING,
)
```

## Feature Views

```python
# feature_views.py
from feast import FeatureView, Feature, Field, ValueType
from feast.types import Float32, Int64, String
from datetime import timedelta

driver_stats_fv = FeatureView(
    name="driver_stats",
    entities=["driver_id"],
    ttl=timedelta(days=7),
    schema=[
        Field(name="avg_daily_trips", dtype=Float32),
        Field(name="avg_rating", dtype=Float32),
        Field(name="lifetime_trips", dtype=Int64),
        Field(name="city", dtype=String),
    ],
    online=True,
    source=driver_stats_batch,
    tags={"team": "trip-pricing"},
)

# On-demand feature view (computed at serving time)
@on_demand_feature_view(
    sources=[driver_stats_fv],
    schema=[Field(name="avg_rating_normalized", dtype=Float32)],
)
def driver_rating_on_demand(inputs: pd.DataFrame) -> pd.DataFrame:
    df = pd.DataFrame()
    df["avg_rating_normalized"] = inputs["avg_rating"] / 5.0
    return df
```

## Point-in-Time Join

```python
# Historical feature retrieval (training data)
from feast import FeatureStore
import pandas as pd

store = FeatureStore(repo_path="feature_repo/")

# Entity dataframe with timestamps
entity_df = pd.DataFrame.from_dict({
    "driver_id": [1001, 1002, 1003],
    "event_timestamp": [
        pd.Timestamp("2024-01-01 12:00:00"),
        pd.Timestamp("2024-01-02 12:00:00"),
        pd.Timestamp("2024-01-03 12:00:00"),
    ],
})

training_data = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "driver_stats:avg_daily_trips",
        "driver_stats:avg_rating",
        "driver_stats:lifetime_trips",
    ],
).to_df()

# Feast automatically performs point-in-time join
# For each (driver_id, event_timestamp), it finds the most recent
# feature value BEFORE the event_timestamp
print(training_data.head())
```

## Online Serving

```python
# Online feature retrieval
feature_vector = store.get_online_features(
    features=[
        "driver_stats:avg_daily_trips",
        "driver_stats:avg_rating",
    ],
    entity_rows=[
        {"driver_id": 1001},
        {"driver_id": 1002},
    ],
).to_dict()

# Materialize batch features to online store
from datetime import datetime

# Full materialization
store.materialize(
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 2, 1),
)

# Incremental materialization (from last materialized timestamp)
store.materialize_incremental(end_date=datetime.now())

# Write features directly (for streaming sources)
from feast.infra.online_stores.helpers import get_online_store_from_config

online_store = get_online_store_from_config(store.config.online_store)
online_store.online_write_batch(
    config=store.config,
    table=driver_stats_fv,
    data=[
        ({"driver_id": 1001}, {"avg_daily_trips": 12.5, "avg_rating": 4.8}, datetime.now()),
    ],
)
```

## Feature Service

```python
# feature_service.py
from feast import FeatureService

driver_ranking_service = FeatureService(
    name="driver_ranking",
    features=[
        driver_stats_fv,
        driver_rating_on_demand,
    ],
)

# Retrieval via feature service
features = store.get_online_features(
    features=driver_ranking_service,
    entity_rows=[{"driver_id": 1001}],
).to_dict()
```

## CLI Commands

```bash
# Apply feature definitions
feast apply

# List features
feast features list

# Materialize
feast materialize 2024-01-01 2024-02-01
feast materialize-incremental

# Start local Feast server
feast serve

# Registry operations
feast registry-dump
```
