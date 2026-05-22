# Medallion Architecture Reference

## Layer Definitions

```
Bronze Layer (raw ingestion):
  Purpose: immutable record of source data
  Format: preserves original format (JSON, Avro, Parquet, CSV)
  Schema: schema-on-read, minimal validation
  Write: append-only, no modifications
  Retention: 30-90 days raw, 1+ year summarized
  Examples: bronze.orders_raw, bronze.clickstream_logs, bronze.inventory_snapshots

Silver Layer (cleaned and validated):
  Purpose: clean, deduplicated, conformed data for analysis
  Format: Parquet (Delta/Iceberg/Hudi)
  Schema: enforced, validated, nullable constrained
  Write: upserts, CDC applied, deduplicated by business key
  Retention: 1-3 years
  Examples: silver.orders_validated, silver.customer_enriched, silver.inventory_fact

Gold Layer (consumption-ready):
  Purpose: business-level aggregates, KPIs, ML features
  Format: Parquet (Delta/Iceberg)
  Schema: business-facing names, denormalized, metrics calculated
  Write: scheduled refresh or materialized view
  Retention: indefinite or per data retention policy
  Examples: gold.daily_revenue, gold.customer_360, gold.product_performance

Data flow: Source -> Bronze (append) -> Silver (CDC/upsert) -> Gold (aggregate)
```

## Data Flow Diagram

```
Sources                     Bronze                        Silver                        Gold                    Consumers
+---------+          +-------------------+        +--------------------+        +-------------------+        +--------+
| OLTP DB | --CDC--> | bronze.orders_raw | ----> | silver.orders       | ----> | gold.daily_sales   | ----> | BI     |
+---------+   (log) | (append-only)     |  dedup| (PK upsert, valid)  |  agg  | (daily revenue)    |        | tools  |
                     +-------------------+       +--------------------+        +-------------------+        +--------+
+---------+          +--------------------+       +------------------------+    +-------------------+        +--------+
| API     | --JSON-> | bronze.api_events  | ----> | silver.customer_events | -> | gold.customer_360  | ----> | ML     |
+---------+          | (raw JSON per line)| clean | (enriched, sessionized)| join| (features for churn)|       | models |
                     +--------------------+       +------------------------+    +-------------------+        +--------+
+---------+          +--------------------+       +------------------------+    +-------------------+        +--------+
| Logs    | --Kafka->| bronze.app_logs    | ----> | silver.sessions        | -> | gold.kpi_mart      | ----> | Alerts |
+---------+          | (append-only)      |  agg  | (sessionized, cleaned) |  agg| (dashboards)       |        +--------+
                     +--------------------+       +------------------------+    +-------------------+

Quality gates:
  Bronze -> Silver:   schema compliance, null check, deduplication, referential integrity
  Silver -> Gold:     aggregate totals match, trend consistency, SLA freshness
  Gold -> BI:         metric definitions verified, row count > threshold, no negative measures
```

## Pipeline Implementation (Delta + Spark)

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, input_file_name

spark = SparkSession.builder.appName("medallion-etl").getOrCreate()

# Bronze: raw ingestion
bronze_path = "s3://lake/bronze/orders_raw"

def ingest_to_bronze(source_path, bronze_table):
    df = spark.read.format("json").load(source_path)
    df.withColumn("_ingested_at", current_timestamp()) \
      .withColumn("_source_file", input_file_name()) \
      .write.format("delta") \
      .mode("append") \
      .save(bronze_path)

# Silver: clean and validate
def silver_transform(bronze_path, silver_path):
    df = spark.read.format("delta").load(bronze_path)
    df_clean = df.dropDuplicates(["order_id"]) \
                 .filter(col("order_id").isNotNull()) \
                 .filter(col("amount") > 0) \
                 .withColumn("_processed_at", current_timestamp())
    df_clean.write.format("delta") \
            .mode("merge") \
            .option("mergeKey", "order_id") \
            .save(silver_path)

# Gold: aggregate
def gold_daily_sales(silver_path, gold_path):
    df = spark.read.format("delta").load(silver_path)
    df.groupBy("order_date") \
      .agg({"amount": "sum", "order_id": "count"}) \
      .withColumnRenamed("sum(amount)", "total_revenue") \
      .withColumnRenamed("count(order_id)", "total_orders") \
      .write.format("delta") \
      .mode("overwrite") \
      .save(gold_path)
```

## Quality Gate Implementation

```python
# Bronze -> Silver gate
def validate_bronze_to_silver(df):
    checks = []
    # Schema check
    expected_cols = {"order_id", "amount", "order_date", "customer_id"}
    actual_cols = set(df.columns)
    checks.append(("schema", expected_cols.issubset(actual_cols)))
    # Not null on PK
    null_pks = df.filter(col("order_id").isNull()).count()
    checks.append(("null_pk", null_pks == 0))
    # No negative amount
    neg_amt = df.filter(col("amount") < 0).count()
    checks.append(("negative_amount", neg_amt == 0))
    # Data freshness (max age < 48h)
    if "order_date" in df.columns:
        max_date = df.selectExpr("max(order_date)").collect()[0][0]
        checks.append(("freshness", max_date is not None))
    return all(passed for _, passed in checks)

# Silver -> Gold gate
def validate_silver_to_gold(df_silver, df_gold):
    # Row count threshold
    silver_count = df_silver.count()
    gold_count = df_gold.count()
    checks = [("row_count_ratio", abs(gold_count - silver_count) / silver_count < 0.5)]
    # Total revenue exceeds zero
    total_rev = df_gold.selectExpr("sum(total_revenue)").collect()[0][0]
    checks.append(("positive_revenue", total_rev > 0))
    return all(passed for _, passed in checks)
```

## Catalog Configuration

```sql
-- Unity Catalog medallion setup
CREATE CATALOG IF NOT EXISTS sales_data;
USE CATALOG sales_data;

-- Bronze schemas
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- Bronze tables (append-only)
CREATE TABLE IF NOT EXISTS bronze.orders_raw (
  order_id STRING,
  raw_payload STRING,
  _ingested_at TIMESTAMP
) USING DELTA
TBLPROPERTIES (delta.appendOnly = true);

-- Silver tables (upsert)
CREATE TABLE IF NOT EXISTS silver.orders (
  order_id STRING NOT NULL,
  customer_id STRING,
  amount DECIMAL(10,2),
  order_date DATE,
  status STRING,
  _updated_at TIMESTAMP
) USING DELTA;

-- Gold tables (aggregated)
CREATE TABLE IF NOT EXISTS gold.daily_revenue (
  order_date DATE NOT NULL,
  total_revenue DECIMAL(15,2),
  total_orders BIGINT,
  _computed_at TIMESTAMP
) USING DELTA;
```
