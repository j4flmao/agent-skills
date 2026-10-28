# Code Organization for Lake Pipelines

How to lay out a repository that owns lake tables: table definitions as code, transformation jobs, maintenance jobs, tests and configuration per environment. Examples assume PySpark jobs plus SQL (dbt or plain), packaged with uv.

## Repository Layout

```
lake-pipelines/
  pyproject.toml              # uv-managed; pyspark/delta-spark/pyiceberg pinned
  uv.lock
  src/lakejobs/
    __init__.py
    config.py                 # env-driven settings (catalog URI, warehouse, buckets)
    session.py                # SparkSession builder (one place for catalog configs)
    io/
      readers.py              # source readers (Kafka, JDBC, files)
      writers.py              # merge/append helpers with idempotency guards
    jobs/
      bronze_orders.py        # one module per table-producing job
      silver_orders.py
      gold_daily_revenue.py
    maintenance/
      compaction.py
      retention.py            # vacuum / expire_snapshots / orphan cleanup
    quality/
      checks.py               # reusable assertions
  tables/                     # DDL as code, one file per table
    bronze/orders.sql
    silver/orders.sql
    gold/daily_revenue.sql
  migrations/                 # ordered schema changes (ALTER TABLE ...)
    0007_add_channel_to_orders.sql
  dags/                       # orchestrator definitions (Airflow/Dagster) - thin
  tests/
    unit/                     # pure transformation functions, local Spark
    integration/              # write/read real tables in a temp warehouse
  conf/
    dev.toml
    prod.toml
```

## Principles

| Principle | Practice |
|---|---|
| Transformations are pure functions | `def build_silver(df: DataFrame) -> DataFrame` with no I/O; jobs do I/O around them |
| One job owns one table | Writers for a table live in exactly one module |
| DDL is versioned | Table creation and `ALTER` statements in `tables/` and `migrations/`, applied by CI |
| Config by environment | No bucket names or catalog URIs in code; load from env/config |
| Orchestrator is thin | DAG files call `python -m lakejobs.jobs.silver_orders --date ...` |

## Session Factory

```python
# src/lakejobs/session.py
from __future__ import annotations

from pyspark.sql import SparkSession

from lakejobs.config import Settings


def build_session(settings: Settings, app_name: str) -> SparkSession:
    return (
        SparkSession.builder.appName(app_name)
        .config("spark.sql.extensions",
                "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
        .config("spark.sql.catalog.lake", "org.apache.iceberg.spark.SparkCatalog")
        .config("spark.sql.catalog.lake.type", "rest")
        .config("spark.sql.catalog.lake.uri", settings.catalog_uri)
        .config("spark.sql.catalog.lake.warehouse", settings.warehouse)
        .config("spark.sql.sources.partitionOverwriteMode", "dynamic")
        .getOrCreate()
    )
```

## Job Skeleton

```python
# src/lakejobs/jobs/silver_orders.py
from __future__ import annotations

import argparse
import logging

from pyspark.sql import DataFrame, functions as F

from lakejobs.config import Settings
from lakejobs.io.writers import merge_by_key
from lakejobs.session import build_session

log = logging.getLogger(__name__)


def transform(bronze: DataFrame) -> DataFrame:
    return (bronze
            .filter(F.col("order_id").isNotNull())
            .withColumn("amount", F.col("amount").cast("decimal(18,2)"))
            .dropDuplicates(["order_id", "source_lsn"]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since-snapshot", type=int, required=True)
    args = parser.parse_args()
    settings = Settings.from_env()
    spark = build_session(settings, "silver_orders")
    bronze = (spark.read.format("iceberg")
              .option("start-snapshot-id", args.since_snapshot)
              .load("lake.bronze.orders"))
    result = transform(bronze)
    merge_by_key(result, target="lake.silver.orders", keys=["order_id"], version_col="source_lsn")
    log.info("silver_orders merged rows=%d since_snapshot=%d", result.count(), args.since_snapshot)


if __name__ == "__main__":
    main()
```

Note: `start-snapshot-id` incremental reads only include append snapshots; for upstream tables with overwrites/deletes use a changelog view instead.

## Table Definition Files

```sql
-- tables/silver/orders.sql
CREATE TABLE IF NOT EXISTS lake.silver.orders (
  order_id    BIGINT NOT NULL,
  customer_id BIGINT,
  amount      DECIMAL(18,2),
  order_ts    TIMESTAMP,
  source_lsn  BIGINT
)
USING iceberg
PARTITIONED BY (days(order_ts))
TBLPROPERTIES (
  'format-version' = '2',
  'write.merge.mode' = 'merge-on-read',
  'write.target-file-size-bytes' = '268435456'
);
```

Migrations are forward-only, idempotent where possible (`ADD COLUMN IF NOT EXISTS` is not universal; check the engine), and recorded in a `_schema_migrations` control table.

## dbt Alongside Spark Jobs

When SQL transformations dominate, keep dbt models in `models/` with the same zone split, use incremental models with `unique_key` and the adapter's merge strategy, and keep Python jobs only for ingestion and maintenance.

## Pitfalls
- SparkSession built in many places with diverging catalog configs.
- Transformation logic mixed with reads/writes, making it untestable without a cluster.
- Hand-run DDL in notebooks; production schema drifts from the repo.
- Maintenance jobs owned by nobody; tables accumulate small files and snapshots.

## Checklist
- [ ] One module per produced table, pure `transform` function tested
- [ ] DDL and migrations versioned and applied by CI
- [ ] Single session factory, config from environment
- [ ] Maintenance jobs in repo and scheduled
- [ ] Orchestrator files contain no business logic
