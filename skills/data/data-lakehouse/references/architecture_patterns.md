# Streaming Lakehouse Patterns

Patterns for writing continuous data into Iceberg, Delta, and Paimon tables with Spark Structured Streaming and Apache Flink: commit cadence, exactly-once, small-file control, and reading tables as streams. Batch write patterns are in `architecture-patterns.md`.

## 1. Reference Topology

```
Kafka / Kinesis / CDC
        │
        ▼
Streaming job (Spark Structured Streaming or Flink)
        │  commit every N seconds/minutes
        ▼
Bronze table (append) ──► incremental read ──► Silver (MERGE) ──► Gold (aggregates)
        │                                                     ▲
        └──────────── compaction / snapshot expiry ───────────┘
```

Each commit is a new table snapshot. Commit interval is the main lever: shorter means fresher data and more small files and metadata.

## 2. Engine and Format Fit

| Need | Good fit |
|---|---|
| Spark-centric platform, Delta tables | Structured Streaming + Delta, CDF for downstream reads |
| Spark or Flink with Iceberg | Iceberg Spark/Flink sinks; Iceberg Kafka Connect sink for simple ingestion |
| High-rate upserts with sub-minute freshness | Paimon primary-key tables (LSM) with Flink |
| Database CDC into open tables | Flink CDC or Debezium → Kafka → sink |

## 3. Spark Structured Streaming → Iceberg

```python
stream = (spark.readStream.format("kafka")
          .option("kafka.bootstrap.servers", brokers)
          .option("subscribe", "orders")
          .option("startingOffsets", "earliest")
          .load())

parsed = stream.selectExpr("CAST(value AS STRING) AS json", "timestamp AS ingest_ts")

(parsed.writeStream
   .format("iceberg")
   .outputMode("append")
   .trigger(processingTime="1 minute")
   .option("checkpointLocation", "s3://lake-checkpoints/bronze_orders")
   .option("fanout-enabled", "true")      # skip local sort by partition
   .toTable("lake.bronze.orders"))
```

Exactly-once comes from the checkpoint (source offsets) plus the sink recording the batch ID in the commit. One checkpoint location per query; never share or delete it casually.

## 4. Spark Structured Streaming → Delta with Upserts

```python
from delta.tables import DeltaTable

def upsert(batch_df, batch_id):
    latest = (batch_df
              .withColumn("rn", F.row_number().over(
                  Window.partitionBy("order_id").orderBy(F.col("lsn").desc())))
              .filter("rn = 1").drop("rn"))
    (DeltaTable.forName(spark, "silver.orders").alias("t")
        .merge(latest.alias("s"), "t.order_id = s.order_id")
        .whenMatchedUpdateAll(condition="s.lsn > t.lsn")
        .whenNotMatchedInsertAll()
        .execute())

(bronze_stream.writeStream
   .foreachBatch(upsert)
   .option("checkpointLocation", "s3://lake-checkpoints/silver_orders")
   .trigger(processingTime="2 minutes")
   .start())
```

`foreachBatch` is at-least-once: a batch can re-run after failure. The `lsn` guard makes the merge idempotent. For plain appends inside `foreachBatch`, pass `txnAppId` and `txnVersion=batch_id` to Delta writes.

## 5. Flink → Iceberg / Paimon

```sql
-- Flink SQL: Iceberg catalog
CREATE CATALOG lake WITH (
  'type' = 'iceberg',
  'catalog-type' = 'rest',
  'uri' = 'https://catalog.example.com',
  'warehouse' = 's3://lake/warehouse'
);

SET 'execution.checkpointing.interval' = '60 s';

INSERT INTO lake.bronze.orders
SELECT order_id, customer_id, amount, order_ts FROM kafka_orders;
```

Flink sinks commit on checkpoint completion, so the checkpoint interval equals the commit interval. Iceberg tables used as upsert targets need `'write.upsert.enabled' = 'true'` and identifier fields (primary key) declared.

Paimon equivalent:

```sql
CREATE TABLE paimon.ods.orders (
  order_id BIGINT, amount DECIMAL(18,2), lsn BIGINT,
  PRIMARY KEY (order_id) NOT ENFORCED
) WITH ('merge-engine' = 'deduplicate', 'sequence.field' = 'lsn',
        'changelog-producer' = 'lookup');
```

## 6. Reading Tables as Streams

| Format | Incremental read |
|---|---|
| Delta | `spark.readStream.table("bronze.orders")`; CDF with `readChangeFeed=true` for updates/deletes |
| Iceberg (Spark) | `spark.readStream.format("iceberg").load("lake.bronze.orders")` (append snapshots only) |
| Iceberg (Flink) | `/*+ OPTIONS('streaming'='true', 'monitor-interval'='30s') */` hint |
| Paimon | streaming read of the changelog produced by `changelog-producer` |

Spark's Iceberg streaming source fails on overwrite/delete snapshots unless `streaming-skip-overwrite-snapshots` / `streaming-skip-delete-snapshots` is set; skipping means those changes are not propagated.

## 7. Small Files and Maintenance

- Commit interval: start at 1–5 minutes for bronze; go lower only with a measured freshness requirement.
- Run compaction on recent partitions on a schedule (Iceberg `rewrite_data_files` with a `where` filter; Delta `OPTIMIZE ... WHERE`). Compaction and streaming writes can conflict; streaming appends rarely conflict with bin-pack rewrites, but MERGE streams do.
- Expire snapshots frequently on streaming tables: each commit adds a snapshot and a manifest list.
- Delta auto compaction / optimized writes (`delta.autoOptimize.*`) reduce small files at write time on platforms that support them.

## Pitfalls

- Changing the query (source topics, aggregation keys) and reusing the old checkpoint: Spark may refuse to start or produce wrong state.
- Deleting a checkpoint to "fix" a stream re-reads from `startingOffsets` and duplicates data.
- Snapshot expiry or `VACUUM` shorter than a downstream stream's lag removes files it still needs.
- Late events written into old partitions spread small files across the table; route them or compact those partitions.

## Checklist

- [ ] Commit interval chosen from a freshness target, not the default.
- [ ] Checkpoint location durable, unique per query, and backed up with the job definition.
- [ ] Upsert streams idempotent (ordering column or transaction IDs).
- [ ] Compaction and snapshot expiry scheduled for every streaming table.
- [ ] Downstream incremental readers' retention needs known.
