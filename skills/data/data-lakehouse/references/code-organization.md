# Lakehouse Project Code Organization

How to lay out a repository that holds lakehouse pipelines: Spark/Flink jobs, dbt models, table DDL, maintenance jobs, orchestration, and tests. The aim is that every table has one owner, one definition, and one deploy path.

## 1. Repository Layout

```
lakehouse/
├── pyproject.toml                # job package, pinned Spark/PyIceberg/delta versions
├── conf/
│   ├── base.yaml                 # catalog name, warehouse, defaults
│   ├── dev.yaml
│   └── prod.yaml
├── ddl/
│   ├── bronze/orders.sql         # CREATE TABLE IF NOT EXISTS + TBLPROPERTIES
│   ├── silver/orders.sql
│   └── migrations/
│       └── 2026_10_20_add_channel.sql
├── src/lakehouse/
│   ├── io/                       # readers/writers, catalog session factory
│   │   ├── session.py
│   │   └── tables.py
│   ├── transforms/               # pure DataFrame -> DataFrame functions
│   │   ├── orders.py
│   │   └── customers.py
│   ├── jobs/                     # entry points: parse args, read, transform, write
│   │   ├── bronze_orders_stream.py
│   │   └── silver_orders_merge.py
│   ├── maintenance/              # compaction, expire snapshots, orphan cleanup
│   └── quality/                  # expectations shared by jobs
├── dbt/                          # gold layer if SQL-modelled
│   ├── dbt_project.yml
│   └── models/{staging,marts}/
├── orchestration/                # Airflow DAGs / Dagster assets / Databricks bundle
├── tests/
│   ├── unit/                     # transforms with small local DataFrames
│   ├── integration/              # local catalog + MinIO or temp dir
│   └── fixtures/
└── docs/tables/                  # one page per gold table: owner, grain, SLAs
```

## 2. Layering Inside Code

| Layer | Contains | Must not contain |
|---|---|---|
| `transforms/` | Pure functions over DataFrames | Reads, writes, `spark.conf` changes |
| `io/` | Catalog/session creation, table read/write helpers | Business rules |
| `jobs/` | Argument parsing, wiring, logging, metrics | Transformation logic |
| `maintenance/` | Table upkeep procedures | Data changes |
| `ddl/` | Table definitions and migrations | Data loading |

Pure transforms are what make unit tests fast and deterministic.

```python
# src/lakehouse/transforms/orders.py
from pyspark.sql import DataFrame, functions as F, Window

def latest_per_key(df: DataFrame, key: str, order_col: str) -> DataFrame:
    w = Window.partitionBy(key).orderBy(F.col(order_col).desc())
    return df.withColumn("_rn", F.row_number().over(w)).filter("_rn = 1").drop("_rn")

def clean_orders(raw: DataFrame) -> DataFrame:
    return (raw
            .filter(F.col("order_id").isNotNull())
            .withColumn("amount", F.col("amount").cast("decimal(18,2)"))
            .withColumn("status", F.lower("status")))
```

```python
# src/lakehouse/jobs/silver_orders_merge.py
import argparse, logging
from lakehouse.io.session import build_session
from lakehouse.io.tables import merge_into
from lakehouse.transforms.orders import clean_orders, latest_per_key

log = logging.getLogger(__name__)

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--env", required=True)
    p.add_argument("--batch-date", required=True)
    args = p.parse_args()

    spark, cfg = build_session(args.env)
    src = spark.table(f"{cfg.catalog}.bronze.orders").where(f"ingest_date = '{args.batch_date}'")
    staged = latest_per_key(clean_orders(src), "order_id", "updated_at")
    merge_into(spark, f"{cfg.catalog}.silver.orders", staged, key="order_id", order_col="updated_at")
    log.info("merged silver.orders batch_date=%s", args.batch_date)

if __name__ == "__main__":
    main()
```

## 3. Configuration

- Environment differences live in `conf/<env>.yaml` (catalog URI, warehouse path, table prefixes). Code references logical names only.
- Secrets (catalog tokens, cloud credentials) come from the runtime identity (instance profile, workload identity, Databricks service principal), never from config files.
- Pin engine and format library versions together: Iceberg runtime JAR version must match the Spark minor version (`iceberg-spark-runtime-3.5_2.12`), Delta Lake version must match Spark.

## 4. DDL and Migrations

- One file per table with `CREATE TABLE IF NOT EXISTS`; changes go in dated migration files applied in order by the deploy pipeline.
- Migrations are additive where possible (add column, add partition field). Destructive changes (drop column, type narrowing, re-partition with rewrite) need a backfill plan and review.
- Record applied migrations in a small control table so reruns are no-ops.

## 5. dbt Alongside Spark Jobs

- Use dbt for SQL-expressible silver→gold modelling; keep ingestion and complex streaming in code jobs.
- `dbt-spark` / `dbt-databricks` / `dbt-trino` adapters support Iceberg/Delta materializations; set `file_format` (`delta`, `iceberg`) and `incremental_strategy` (`merge`, `insert_overwrite`, `append`) per model.
- Sources point at silver tables; dbt never writes bronze.

## 6. Naming Conventions

| Object | Convention | Example |
|---|---|---|
| Namespace | `<layer>` or `<domain>_<layer>` | `silver`, `sales_gold` |
| Table | snake_case noun, grain explicit | `fct_order_line`, `dim_customer` |
| Job | `<layer>_<table>_<mode>` | `silver_orders_merge` |
| Checkpoint path | `<bucket>/checkpoints/<job>` | `s3://lake-ckpt/bronze_orders_stream` |

## Pitfalls

- Transform logic inside notebooks only: untestable and unreviewable. Notebooks may call package functions.
- Hard-coded `s3://prod-...` paths in jobs make dev runs write to production.
- DDL created implicitly by `saveAsTable` on first write: properties and partitioning drift between environments.

## Checklist

- [ ] Transforms are pure and unit-tested.
- [ ] Table DDL and migrations versioned in the repo.
- [ ] Config per environment; no secrets in the repo.
- [ ] Engine and table-format library versions pinned together.
- [ ] Every gold table documented with owner, grain, freshness SLA.
