# Batch Processing API Reference: PySpark DataFrame and Spark SQL

The core API surface used in batch pipelines: reading and writing data, transformations, joins, aggregations, window functions, and table-format writes. Examples use PySpark (Spark 3.5 / 4.x); the Scala and Spark SQL APIs are equivalent. Configuration, tuning and deployment are covered in sibling references.

## Session

```python
import os
from pyspark.sql import SparkSession, functions as F, Window

spark = (
    SparkSession.builder
    .appName("orders-daily")
    .config("spark.sql.session.timeZone", "UTC")
    .getOrCreate()
)
```

On managed platforms (Databricks, EMR, Dataproc, Glue) the session already exists; do not hardcode cluster settings in code that belong in job configuration.

## Reading

```python
orders = (
    spark.read.format("parquet")
    .load("s3://lake/raw/orders/")                      # partition discovery: dt=YYYY-MM-DD/
    .where(F.col("dt") == "2026-10-26")                 # partition pruning
)

customers = spark.read.table("silver.customers")       # catalog table (Hive/Glue/Unity/Iceberg)

events = (
    spark.read.format("json")
    .schema("event_id STRING, user_id STRING, ts TIMESTAMP, payload STRING")  # explicit schema
    .option("mode", "PERMISSIVE")
    .option("columnNameOfCorruptRecord", "_corrupt")
    .load("s3://lake/landing/events/2026/10/26/")
)

pg = (
    spark.read.format("jdbc")
    .option("url", "jdbc:postgresql://db:5432/app")
    .option("dbtable", "public.invoices")
    .option("user", os.environ["PG_USER"]).option("password", os.environ["PG_PASSWORD"])
    .option("partitionColumn", "id").option("lowerBound", 1).option("upperBound", 50_000_000)
    .option("numPartitions", 16)
    .load()
)
```

| Option | Applies to | Purpose |
|--------|-----------|---------|
| `schema(...)` | JSON, CSV | Skip inference (slow, unstable) |
| `mode` = `PERMISSIVE` / `DROPMALFORMED` / `FAILFAST` | JSON, CSV | Bad-record handling |
| `mergeSchema` | Parquet | Reconcile evolving schemas (costly) |
| `partitionColumn`, `numPartitions` | JDBC | Parallel reads; without them JDBC reads in one task |
| `pathGlobFilter`, `recursiveFileLookup` | File sources | File selection |

## Transformations

```python
clean = (
    orders
    .dropDuplicates(["order_id"])
    .withColumn("amount", F.col("amount").cast("decimal(18,2)"))
    .withColumn("order_date", F.to_date("created_at"))
    .withColumn("is_large", F.col("amount") > 1000)
    .filter(F.col("status").isin("PAID", "SHIPPED"))
    .select("order_id", "customer_id", "order_date", "amount", "is_large")
)
```

Prefer built-in functions in `pyspark.sql.functions` over Python UDFs: built-ins run in the JVM and are optimized by Catalyst. If a UDF is unavoidable, use a vectorized pandas UDF (`@F.pandas_udf`) or Arrow-optimized Python UDFs.

## Joins

```python
enriched = clean.join(customers.select("customer_id", "segment"), on="customer_id", how="left")

# Broadcast a small dimension explicitly
from pyspark.sql.functions import broadcast
enriched = clean.join(broadcast(dim_country), "country_code", "left")
```

| Join type | Use |
|-----------|-----|
| `inner`, `left`, `right`, `full` | Standard |
| `left_semi` | Filter left rows that have a match (EXISTS) |
| `left_anti` | Left rows with no match (NOT EXISTS), e.g. new records |
| `cross` | Cartesian; requires explicit intent |

Join on columns with the same type; mismatched types (string vs bigint) force casts and can silently produce nulls.

## Aggregations and Windows

```python
daily = (
    enriched.groupBy("order_date", "segment")
    .agg(F.count("*").alias("orders"),
         F.sum("amount").alias("revenue"),
         F.approx_count_distinct("customer_id").alias("customers"))
)

w = Window.partitionBy("customer_id").orderBy(F.col("order_date").desc())
latest = (
    enriched.withColumn("rn", F.row_number().over(w))
    .filter("rn = 1").drop("rn")
)
```

`approx_count_distinct` (HyperLogLog++) is far cheaper than exact `countDistinct` for large cardinalities; use exact only when required.

## Writing

```python
# Dynamic partition overwrite: replace only partitions present in the DataFrame
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
(daily.write.mode("overwrite")
      .partitionBy("order_date")
      .format("parquet")
      .save("s3://lake/gold/daily_revenue/"))

# Table formats: Delta Lake / Apache Iceberg
daily.writeTo("gold.daily_revenue").overwritePartitions()          # DataFrameWriterV2

# Idempotent upsert (Delta or Iceberg via SQL)
enriched.createOrReplaceTempView("updates")
spark.sql("""
  MERGE INTO silver.orders t
  USING updates s
  ON t.order_id = s.order_id
  WHEN MATCHED THEN UPDATE SET *
  WHEN NOT MATCHED THEN INSERT *
""")
```

| Save mode | Behavior |
|-----------|----------|
| `append` | Adds data; reruns create duplicates |
| `overwrite` | Replaces the target (or only matching partitions with dynamic mode) |
| `errorifexists` (default) | Fails if target exists |
| `ignore` | No-op if target exists |

For reruns and backfills, use partition overwrite or `MERGE`, never plain `append`.

## Spark SQL Equivalents

```sql
INSERT OVERWRITE TABLE gold.daily_revenue PARTITION (order_date)
SELECT segment, count(*) AS orders, sum(amount) AS revenue, order_date
FROM silver.orders_enriched
WHERE order_date = DATE'2026-10-26'
GROUP BY order_date, segment;
```

## Inspecting Plans

```python
daily.explain(mode="formatted")   # physical plan: scans, pushed filters, exchanges, join strategy
```

Look for `PushedFilters` and `PartitionFilters` in scans, `BroadcastHashJoin` vs `SortMergeJoin`, and the number of `Exchange` (shuffle) nodes.

## Actions vs Transformations

Transformations are lazy; actions (`count`, `collect`, `write`, `show`, `toPandas`) trigger execution. Avoid `collect()` and `toPandas()` on large data (driver OOM). Each action re-executes the lineage unless the DataFrame is cached; cache only when reused multiple times, and `unpersist()` afterwards.

## Checklist

- [ ] Explicit schemas for semi-structured sources
- [ ] Partition filters on every large read
- [ ] Built-in functions instead of row-wise Python UDFs
- [ ] Writes are idempotent (partition overwrite or MERGE)
- [ ] Physical plan reviewed for pushdown and join strategy
- [ ] No `collect()` of unbounded data
