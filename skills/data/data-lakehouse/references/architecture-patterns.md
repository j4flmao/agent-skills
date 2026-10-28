# Lakehouse Write Patterns: Append, Upsert, CDC, Copy-on-Write vs Merge-on-Read

How data gets into lakehouse tables determines file layout, read cost, and correctness. This reference covers the write-side patterns; medallion layering is in `medallion-architecture.md` and streaming specifics in `architecture_patterns.md`.

## 1. Pattern Selection

| Source shape | Pattern | Table setting |
|---|---|---|
| Immutable events (logs, clicks) | Append-only | Partition by event date; no deletes |
| Full snapshots of a small dimension | Overwrite (whole table or partition) | Dynamic partition overwrite |
| Changed rows with a key | Upsert via `MERGE` | Key-based; consider merge-on-read |
| Database change stream (insert/update/delete) | CDC apply with ordering column | Merge-on-read or Paimon primary-key table |
| Late, corrected facts | Partition-scoped `MERGE` or `replaceWhere` | Bound the merge to affected partitions |

## 2. Copy-on-Write vs Merge-on-Read

| | Copy-on-write (CoW) | Merge-on-read (MoR) |
|---|---|---|
| Update mechanics | Rewrite every data file that contains a changed row | Write delete files / deletion vectors plus new rows |
| Write cost | High for scattered updates | Low |
| Read cost | Lowest | Readers must apply deletes until compaction |
| Fits | Batch, read-heavy, infrequent updates | Frequent upserts, CDC, streaming |
| Iceberg | `write.{update,delete,merge}.mode = copy-on-write` (default) | `= merge-on-read` (format v2+) |
| Delta | default without deletion vectors | `delta.enableDeletionVectors = true` |
| Hudi | `COPY_ON_WRITE` table type | `MERGE_ON_READ` table type |
| Paimon | n/a | LSM tree with background compaction |

MoR moves cost from writers to readers. Schedule compaction (`rewrite_data_files`, `rewrite_position_delete_files`, `OPTIMIZE`, or `REORG ... APPLY (PURGE)`) so the delete backlog stays bounded.

## 3. Append-Only

```python
(events.write.format("iceberg")
    .mode("append")
    .saveAsTable("lake.bronze.clickstream"))
```

- Make retries idempotent: either write to a staging location and commit once, or use Delta's `txnAppId`/`txnVersion` options so a replayed batch is skipped.
- Partition by a coarse time grain (`days(ts)`); hourly partitions on low volume produce small files.

## 4. Upsert with MERGE

```sql
MERGE INTO lake.silver.customers t
USING (
  SELECT * FROM (
    SELECT *, row_number() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) AS rn
    FROM lake.bronze.customers_increment
  ) WHERE rn = 1
) s
ON t.customer_id = s.customer_id
WHEN MATCHED AND s.updated_at > t.updated_at THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

Rules:
- De-duplicate the source. Multiple source rows matching one target row fail the merge (Spark raises an error for ambiguous matches).
- Guard with an ordering column (`s.updated_at > t.updated_at`) so replays and late arrivals cannot regress a row.
- Add partition predicates to the `ON` clause when the change set is known to touch few partitions; otherwise the merge scans the whole target.

## 5. CDC Apply

A CDC feed (Debezium, DMS, Fivetran) carries an operation code and a log position.

```sql
MERGE INTO lake.silver.accounts t
USING (
  SELECT * FROM (
    SELECT *, row_number() OVER (PARTITION BY id ORDER BY lsn DESC) AS rn
    FROM lake.bronze.accounts_cdc
    WHERE batch_id = :batch_id
  ) WHERE rn = 1
) s
ON t.id = s.id
WHEN MATCHED AND s.op = 'd' THEN DELETE
WHEN MATCHED AND s.lsn > t.lsn THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT *;
```

- Keep the raw CDC log in bronze (append-only) so silver can be rebuilt.
- Store the source position (`lsn`, binlog offset, SCN) on every row; it is the ordering key.
- Paimon primary-key tables apply CDC natively with `merge-engine = deduplicate` and a `sequence.field`.

## 6. Overwrite Patterns

```python
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
daily.writeTo("lake.gold.daily_revenue").overwritePartitions()   # Iceberg

(daily.write.format("delta").mode("overwrite")
      .option("replaceWhere", "day = '2026-10-26'")
      .saveAsTable("gold.daily_revenue"))                         # Delta
```

Overwrite is the simplest idempotent pattern for aggregates: recomputing a partition and replacing it gives the same result on retry.

## 7. Slowly Changing Dimension Type 2

```sql
MERGE INTO lake.gold.dim_customer t
USING (
  SELECT s.customer_id AS merge_key, s.* FROM changes s
  UNION ALL
  SELECT NULL AS merge_key, s.* FROM changes s
  JOIN lake.gold.dim_customer t
    ON s.customer_id = t.customer_id AND t.is_current AND s.row_hash <> t.row_hash
) u
ON t.customer_id = u.merge_key AND t.is_current
WHEN MATCHED AND t.row_hash <> u.row_hash THEN
  UPDATE SET is_current = false, valid_to = u.updated_at
WHEN NOT MATCHED THEN
  INSERT (customer_id, name, segment, row_hash, valid_from, valid_to, is_current)
  VALUES (u.customer_id, u.name, u.segment, u.row_hash, u.updated_at, NULL, true);
```

The union produces one row that closes the current version and one with a `NULL` key that inserts the new version.

## Pitfalls

- Running many small `MERGE` commits per minute against one table causes commit conflicts and metadata growth; batch them.
- MoR without compaction: read latency grows with each commit.
- Using processing time instead of a source ordering column lets out-of-order CDC events overwrite newer data.
- Overwriting with static partition mode wipes partitions absent from the source.

## Checklist

- [ ] Write pattern chosen per table and documented.
- [ ] Source de-duplicated and ordered before every `MERGE`.
- [ ] CoW/MoR choice matches update frequency; compaction scheduled for MoR.
- [ ] Retries are idempotent (overwrite, ordering guard, or transaction IDs).
