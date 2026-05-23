# Feature Engineering Pipeline

## Architecture
```
Batch Sources (Warehouse/S3) ──► Spark/dbt ──► Offline Store (Parquet)
                                                        │
                        ┌────────────────────────────────┤
                        ▼                                ▼
                Training Dataset                  Online Store (Redis)
                        │                                │
                        ▼                                ▼
                Model Training                    Real-time Inference

Streaming (Kafka) ──► Flink/Spark Streaming ──► Online Store (Redis)
                        │
                        └──► Batch Sink (Parquet) ──► Offline Store
```

## Spark Batch Pipeline
```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import *

spark = SparkSession.builder.appName("user-features") \
    .config("spark.sql.shuffle.partitions", "200").getOrCreate()

orders = spark.table("warehouse.orders") \
    .filter(col("order_date") >= date_sub(current_date(), 90))

user_features = orders.groupBy("customer_id").agg(
    count("*").alias("total_orders_all"),
    count(when(col("order_date") >= date_sub(current_date(), 7), True)).alias("total_orders_7d"),
    count(when(col("order_date") >= date_sub(current_date(), 30), True)).alias("total_orders_30d"),
    sum(col("amount")).alias("total_spend_all"),
    sum(when(col("order_date") >= date_sub(current_date(), 30), col("amount"))).alias("total_spend_30d"),
    avg(when(col("order_date") >= date_sub(current_date(), 30), col("amount"))).alias("avg_order_value_30d"),
    countDistinct("product_category").alias("unique_categories_90d"),
    sum(when(col("status") == "returned", 1).otherwise(0)).alias("return_count_90d"),
).withColumn("days_since_last_order",
    datediff(current_date(), spark_max("order_date")))
  .withColumn("return_rate_90d", coalesce(col("return_count_90d") / col("total_orders_all"), lit(0.0)))

user_features.write.mode("overwrite").parquet("gs://ml-features/user_batch/")
```

## dbt Feature Pipeline
```sql
-- models/features/user_features.sql
{{ config(materialized='incremental', unique_key='customer_id',
    on_schema_change='append_new_columns', tags=['features']) }}

WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
    WHERE order_date >= CURRENT_DATE - 90
    {% if is_incremental() %}
        AND order_date >= (SELECT MAX(last_computed) FROM {{ this }})
    {% endif %}
)
SELECT customer_id,
    COUNT(*) AS total_orders_90d,
    COUNT(DISTINCT CASE WHEN order_date >= CURRENT_DATE - 7 THEN order_id END) AS total_orders_7d,
    SUM(amount) AS total_spend_90d,
    AVG(CASE WHEN order_date >= CURRENT_DATE - 30 THEN amount END) AS avg_order_value_30d,
    MAX(order_date) AS last_order_date,
    DATEDIFF('day', MAX(order_date), CURRENT_DATE) AS days_since_last_order,
    CURRENT_DATE AS last_computed
FROM orders GROUP BY customer_id
```

## Flink Streaming Pipeline
```sql
-- Source: Kafka user events
CREATE TABLE user_events (
    user_id INT, event_type STRING, amount DOUBLE,
    event_time TIMESTAMP(3) METADATA FROM 'timestamp',
    WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'user-events',
    'properties.bootstrap.servers' = 'kafka:9092',
    'format' = 'json'
);

-- Sink: Redis for online serving
CREATE TABLE redis_features (
    user_id INT, order_count_5m BIGINT, total_amount_5m DOUBLE,
    PRIMARY KEY (user_id) NOT ENFORCED
) WITH (
    'connector' = 'redis', 'format' = 'json',
    'redis.host' = 'redis-feast', 'redis.port' = '6379'
);

INSERT INTO redis_features
SELECT user_id, COUNT(*) AS order_count_5m, COALESCE(SUM(amount), 0.0) AS total_amount_5m
FROM user_events
WHERE event_type = 'order_placed'
GROUP BY user_id, TUMBLE(event_time, INTERVAL '5' MINUTE);
```

## Point-in-Time Join Mechanics
```
For each entity row in training dataset:
    Time = entity_df['event_timestamp']
    Feast finds most recent feature value with event_timestamp <= Time
    NEVER uses feature rows with event_timestamp > Time (no data leakage)
```

## Manual Point-in-Time Join (SQL)
```sql
WITH entities AS (
    SELECT customer_id, '2026-05-01 12:00:00'::timestamp AS prediction_time, label
    FROM training_labels WHERE prediction_date = '2026-05-01'
)
SELECT DISTINCT ON (e.customer_id) e.*, f.total_orders_30d, f.avg_order_value_30d
FROM entities e
LEFT JOIN user_feature_snapshots f
    ON e.customer_id = f.customer_id AND f.computed_at <= e.prediction_time
ORDER BY e.customer_id, f.computed_at DESC;
```

## Feature Validation
```python
import pandas as pd
from feast import FeatureStore

store = FeatureStore(repo_path="./feature_repo")
fv = store.get_feature_view("user_batch_features")
features = store.get_historical_features(
    entity_df=sample_entity,
    features=[f"user_batch_features:{f.name}" for f in fv.schema if f.name != "user_id"],
).to_df()

for field in fv.schema:
    col = features[field.name]
    null_pct = col.isnull().mean()
    if null_pct > 0.1:
        print(f"WARN: {field.name} {null_pct:.1%} null (>10%)")
    if str(field.dtype).startswith(("Int", "Float")) and col.notnull().any():
        assert col.min() >= 0, f"{field.name}: negative values"
```

## Best Practices
- Batch features daily during off-peak hours (3-6 AM)
- Stream features use 5-15 min tumbling windows
- Validate feature distributions weekly for drift detection
- Target online serving p99 < 10ms for 100 entity keys
- Set feature TTL = 2x computation frequency
- Use Parquet for offline store; compress with zstd
- Partition batch output by date for incremental materialization
- Alert on feature retrieval errors immediately
- Version feature definitions in git alongside model code
