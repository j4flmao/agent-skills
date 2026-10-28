# Medallion Architecture: Bronze, Silver, Gold

The medallion pattern organizes lakehouse tables by refinement level. Each layer has a contract: what it holds, how it is written, who may read it, and what quality it guarantees.

## 1. Layer Contracts

| | Bronze | Silver | Gold |
|---|---|---|---|
| Purpose | Raw, replayable copy of sources | Cleaned, conformed, de-duplicated entities | Business-ready aggregates, marts, features |
| Grain | As delivered by source | One row per entity/event (keyed) | Per business question |
| Schema | Source schema + ingestion metadata; evolves automatically | Enforced, typed, documented | Stable, versioned, consumer-facing |
| Write pattern | Append (CDC log, files, events) | MERGE / dedupe / SCD | Overwrite partitions, MERGE, rebuild |
| Quality | Completeness of capture | Validity, uniqueness, referential checks | Business rules, reconciliation |
| Readers | Data engineers, replay jobs | Engineers, analysts, data scientists | BI, apps, partners, ML |
| Retention | Long (replay source of truth) | Business-driven | Business-driven |

## 2. Data Flow

```
Sources ──► Bronze (append, raw + _ingest metadata)
               │ parse, cast, dedupe, conform keys, quarantine bad rows
               ▼
            Silver (entity tables, CDC applied, SCD2 dims)
               │ join, aggregate, apply business logic
               ▼
            Gold (facts/dims for BI, metrics tables, feature tables, shares)
```

Rules:
- Data flows forward only; gold never writes back into silver.
- Each layer can be rebuilt from the previous one. Bronze is rebuilt only from the source.
- Incremental processing between layers uses change feeds, streaming reads, or watermark columns.

## 3. Bronze

```python
from pyspark.sql import functions as F

raw = (spark.readStream.format("kafka").option("subscribe", "orders")
       .option("kafka.bootstrap.servers", brokers).load())

bronze = raw.select(
    F.col("value").cast("string").alias("payload"),
    F.col("topic"), F.col("partition"), F.col("offset"),
    F.col("timestamp").alias("kafka_ts"),
    F.current_timestamp().alias("_ingested_at"))

(bronze.writeStream.format("delta")
   .option("checkpointLocation", ckpt("bronze_orders"))
   .trigger(processingTime="1 minute")
   .toTable("bronze.orders"))
```

- Keep raw payloads (string/binary or variant) so parsing bugs can be fixed by reprocessing.
- Add lineage columns: source, offset/file, ingestion time, batch/run ID.
- No business filtering in bronze.

## 4. Silver

```python
parsed = (spark.readStream.table("bronze.orders")
          .select(F.from_json("payload", order_schema).alias("o"), "_ingested_at")
          .select("o.*", "_ingested_at"))

def upsert(batch, batch_id):
    clean = latest_per_key(validate(batch), "order_id", "updated_at")
    merge_into(spark, "silver.orders", clean, key="order_id", order_col="updated_at")

(parsed.writeStream.foreachBatch(upsert)
   .option("checkpointLocation", ckpt("silver_orders"))
   .trigger(availableNow=True).start())
```

- Standardize types, time zones (UTC), units, and codes; conform keys across sources.
- Apply CDC deletes; maintain SCD2 for dimensions that need history.
- Bad rows go to quarantine tables, not dropped.
- Enforce constraints (`NOT NULL`, `CHECK`) and declared schemas.

## 5. Gold

- Model for consumption: star schemas, wide marts, metric tables, ML feature tables.
- Naming and definitions match the business glossary/semantic layer.
- Publish with write-audit-publish or blue/green for critical tables (see `deployment_strategies.md`).
- Grant consumer access at gold (and selected silver) only.

## 6. Declarative Pipelines Variant (Databricks)

```sql
CREATE OR REFRESH STREAMING TABLE bronze_orders
AS SELECT * FROM STREAM read_files('s3://landing/orders/', format => 'json');

CREATE OR REFRESH STREAMING TABLE silver_orders (
  CONSTRAINT valid_id EXPECT (order_id IS NOT NULL) ON VIOLATION DROP ROW
) AS SELECT * FROM STREAM(bronze_orders);

CREATE OR REFRESH MATERIALIZED VIEW gold_daily_revenue
AS SELECT order_date, sum(amount) AS revenue FROM silver_orders GROUP BY order_date;
```

Lakeflow Declarative Pipelines (formerly Delta Live Tables) manage dependencies, checkpoints, and expectations; `APPLY CHANGES INTO` / `AUTO CDC` handle CDC and SCD.

## 7. Organizing Layers in the Catalog

| Option | Example | When |
|---|---|---|
| Schema per layer | `prod.bronze.orders`, `prod.silver.orders` | Small/medium platforms |
| Catalog per layer | `bronze.sales.orders` | Strong isolation of raw data permissions |
| Domain first, layer second | `sales_silver.orders`, `sales_gold.revenue` | Data mesh, domain ownership |

Bronze often contains PII in raw form; restrict it to pipeline identities and a small engineer group.

## 8. Variations

- Some teams add a "platinum" or "semantic" layer for certified metrics; keep the number of layers small.
- Not every source needs all three layers: a clean reference file may go straight to silver.
- Streaming-only paths still benefit from a bronze table for replay.

## Pitfalls

- Business logic in bronze, making replay impossible.
- Gold tables built directly from bronze, skipping conformance.
- Each team building its own "silver customers": no conformed entities.
- Granting broad read on bronze, exposing raw PII.
- Copying full tables between layers every run instead of processing increments.

## Checklist

- [ ] Layer contracts documented (schema policy, quality, access, retention).
- [ ] Bronze keeps raw payload and lineage columns.
- [ ] Silver enforces types, keys, dedupe, quarantine.
- [ ] Gold published with audits for critical tables.
- [ ] Incremental processing between layers; rebuild procedure tested.
