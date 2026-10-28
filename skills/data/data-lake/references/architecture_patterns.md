# Lake Ingestion and Write Patterns

Patterns for getting data into lake tables correctly: append-only events, CDC upserts, SCD Type 2, late-arriving data and streaming vs batch. Zone layout is covered in `architecture-patterns.md`.

## Pattern Selection

| Source shape | Pattern | Table write |
|---|---|---|
| Immutable events (clicks, logs) | Append | `INSERT INTO` / streaming append |
| Mutable entities with CDC (Debezium) | Upsert with deletes | `MERGE` keyed on PK, ordered by source LSN/ts |
| Full daily snapshot | Snapshot diff or partition overwrite | `MERGE ... WHEN NOT MATCHED BY SOURCE` or overwrite |
| Dimension needing history | SCD Type 2 | MERGE closing old rows + insert new |
| Late, out-of-order events | Append + windowed recompute | dynamic partition overwrite of trailing window |

## Append-Only Events

```python
(spark.readStream.format("kafka")
   .option("kafka.bootstrap.servers", brokers)
   .option("subscribe", "clickstream")
   .load()
   .selectExpr("CAST(value AS STRING) AS json", "timestamp AS _kafka_ts")
   .writeStream
   .format("delta")                     # or "iceberg"
   .option("checkpointLocation", "s3://lake/_chk/bronze_clickstream")
   .trigger(processingTime="1 minute")
   .toTable("lake.bronze.clickstream"))
```

Exactly-once into the table relies on the checkpoint location; never share it between queries and never delete it without resetting the target.

## CDC Upsert (Debezium envelope)

Order matters: within one micro-batch keep only the latest change per key, using a monotonic source position (LSN, binlog file+pos, or `ts_ms` + tiebreaker).

```python
from pyspark.sql import Window, functions as F

def upsert_batch(batch_df, batch_id):
    latest = (batch_df
        .withColumn("rn", F.row_number().over(
            Window.partitionBy("id").orderBy(F.col("source_lsn").desc())))
        .filter("rn = 1").drop("rn"))
    latest.createOrReplaceTempView("changes")
    batch_df.sparkSession.sql("""
      MERGE INTO lake.silver.accounts t
      USING changes s ON t.id = s.id
      WHEN MATCHED AND s.op = 'd' THEN DELETE
      WHEN MATCHED AND s.source_lsn > t.source_lsn THEN UPDATE SET *
      WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT *
    """)

cdc_stream.writeStream.foreachBatch(upsert_batch) \
    .option("checkpointLocation", "s3://lake/_chk/silver_accounts").start()
```

The `s.source_lsn > t.source_lsn` guard makes replays and out-of-order batches harmless.

Write mode per format:
- Iceberg: `write.merge.mode=merge-on-read` for frequent small upserts; compact regularly.
- Delta: deletion vectors (`delta.enableDeletionVectors=true`) reduce rewrite cost of MERGE/DELETE.
- Hudi: `MERGE_ON_READ` table type with async compaction.

## SCD Type 2

```sql
MERGE INTO lake.silver.dim_customer t
USING (
  SELECT s.customer_id AS merge_key, s.* FROM staged s
  UNION ALL
  -- second copy inserts the new version for changed rows
  SELECT NULL AS merge_key, s.* FROM staged s
  JOIN lake.silver.dim_customer d
    ON d.customer_id = s.customer_id AND d.is_current
  WHERE d.row_hash <> s.row_hash
) u
ON t.customer_id = u.merge_key AND t.is_current
WHEN MATCHED AND t.row_hash <> u.row_hash THEN
  UPDATE SET is_current = false, valid_to = u.effective_ts
WHEN NOT MATCHED THEN
  INSERT (customer_id, name, segment, row_hash, valid_from, valid_to, is_current)
  VALUES (u.customer_id, u.name, u.segment, u.row_hash, u.effective_ts, NULL, true);
```

`row_hash` = hash of tracked attributes (e.g. `sha2(concat_ws('||', name, segment), 256)`), so unchanged rows are skipped.

## Late-Arriving Data

- Partition by event date, not ingestion date, for query pruning; accept that late rows touch old partitions.
- Recompute gold over a trailing window (e.g. last 3 days) with dynamic partition overwrite.
- In streaming aggregations set a watermark (`withWatermark("event_ts", "2 hours")`) and route rows older than it to a late table.

## Batch vs Streaming

| Factor | Batch (hourly/daily) | Streaming (micro-batch / Flink) |
|---|---|---|
| Latency | minutes to hours | seconds to minutes |
| Files produced | fewer, larger | many small; needs compaction |
| Commit contention | low | high with concurrent maintenance |
| Cost | lower | always-on compute |

Use streaming into bronze and batch (or `availableNow` triggers) between later layers unless consumers need low latency.

## Pitfalls
- MERGE with duplicate source keys fails (Delta) or produces nondeterministic results; dedupe first.
- Using ingestion time to order CDC events reorders updates under retries.
- Streaming upserts every few seconds create thousands of small files and commits; batch to 1–5 minutes.
- Running compaction concurrently with streaming MERGE causes commit conflicts; schedule or scope compaction to cold partitions.

## Checklist
- [ ] Pattern chosen per source (append, CDC upsert, snapshot, SCD2)
- [ ] Source deduped per key with a monotonic ordering column
- [ ] Idempotency guard in MERGE (version/LSN comparison)
- [ ] Checkpoint locations unique and backed up with the table
- [ ] Late-data strategy and watermark defined
