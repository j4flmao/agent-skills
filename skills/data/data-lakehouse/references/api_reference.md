# Lakehouse Table API Reference (Iceberg, Delta Lake, Paimon)

Quick reference for the programmatic surface of open table formats: Spark SQL DDL/DML, maintenance procedures, DataFrame read/write options, and the Python-native libraries (PyIceberg, delta-rs). Use it to look up a call; see `lakehouse-format-deep-dive.md` for how the formats work internally and `configuration_guide.md` for session/catalog setup.

## 1. DDL

### Iceberg (Spark SQL)

```sql
CREATE TABLE lake.sales.orders (
  order_id    BIGINT,
  customer_id BIGINT,
  amount      DECIMAL(18,2),
  status      STRING,
  order_ts    TIMESTAMP
)
USING iceberg
PARTITIONED BY (days(order_ts), bucket(16, customer_id))
TBLPROPERTIES (
  'format-version' = '2',
  'write.merge.mode' = 'merge-on-read',
  'write.parquet.compression-codec' = 'zstd'
);

-- Schema evolution (metadata-only, no rewrite)
ALTER TABLE lake.sales.orders ADD COLUMN channel STRING AFTER status;
ALTER TABLE lake.sales.orders RENAME COLUMN channel TO sales_channel;
ALTER TABLE lake.sales.orders ALTER COLUMN amount TYPE DECIMAL(20,2);  -- widening only

-- Partition and sort evolution (applies to new writes)
ALTER TABLE lake.sales.orders ADD PARTITION FIELD hours(order_ts);
ALTER TABLE lake.sales.orders DROP PARTITION FIELD days(order_ts);
ALTER TABLE lake.sales.orders WRITE ORDERED BY customer_id, order_ts;

-- Branches and tags
ALTER TABLE lake.sales.orders CREATE BRANCH audit;
ALTER TABLE lake.sales.orders CREATE TAG `eom-2026-09` RETAIN 365 DAYS;
```

Partition transforms: `identity`, `years`, `months`, `days`, `hours`, `bucket(N, col)`, `truncate(W, col)`.

### Delta Lake (Spark SQL)

```sql
CREATE TABLE sales.orders (
  order_id BIGINT, customer_id BIGINT, amount DECIMAL(18,2),
  status STRING, order_ts TIMESTAMP
)
USING delta
CLUSTER BY (customer_id, order_ts)            -- liquid clustering
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.enableDeletionVectors' = 'true'
);

ALTER TABLE sales.orders ADD COLUMNS (sales_channel STRING);
ALTER TABLE sales.orders SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name'); -- needed for RENAME/DROP COLUMN
ALTER TABLE sales.orders ADD CONSTRAINT positive_amount CHECK (amount >= 0);
```

### Paimon (Flink SQL)

```sql
CREATE TABLE orders (
  order_id BIGINT, customer_id BIGINT, amount DECIMAL(18,2),
  status STRING, dt STRING,
  PRIMARY KEY (order_id, dt) NOT ENFORCED
) PARTITIONED BY (dt) WITH (
  'bucket' = '-1',                    -- dynamic bucketing
  'merge-engine' = 'deduplicate',     -- or partial-update, aggregation, first-row
  'changelog-producer' = 'lookup'
);
```

## 2. DML

```sql
-- Upsert from a staging view (Iceberg and Delta share this syntax)
MERGE INTO lake.sales.orders t
USING staged_orders s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT *;

-- Overwrite only the partitions present in the source
SET spark.sql.sources.partitionOverwriteMode = dynamic;
INSERT OVERWRITE lake.sales.orders SELECT * FROM rebuilt_day;

DELETE FROM lake.sales.orders WHERE customer_id = 42;
UPDATE lake.sales.orders SET status = 'void' WHERE order_id = 1001;
```

Delta also supports `REPLACE WHERE` for predicate-scoped overwrite:

```python
(df.write.format("delta").mode("overwrite")
   .option("replaceWhere", "order_ts >= '2026-10-01' AND order_ts < '2026-10-02'")
   .saveAsTable("sales.orders"))
```

## 3. Time Travel and History

| Action | Iceberg | Delta |
|---|---|---|
| Read old version | `SELECT * FROM t VERSION AS OF 5729182` | `SELECT * FROM t VERSION AS OF 12` |
| Read at time | `SELECT * FROM t TIMESTAMP AS OF '2026-10-01 00:00:00'` | same syntax |
| Read a branch/tag | `SELECT * FROM t.branch_audit` / `VERSION AS OF 'eom-2026-09'` | n/a |
| List versions | `SELECT * FROM t.snapshots` / `t.history` | `DESCRIBE HISTORY t` |
| Roll back | `CALL cat.system.rollback_to_snapshot('db.t', 5729182)` | `RESTORE TABLE t TO VERSION AS OF 12` |
| Change feed | `CALL cat.system.create_changelog_view(table => 'db.t')` | `SELECT * FROM table_changes('t', 12)` |

## 4. Maintenance Procedures

### Iceberg (`CALL <catalog>.system.<proc>`)

```sql
CALL lake.system.rewrite_data_files(
  table => 'sales.orders',
  strategy => 'sort',
  sort_order => 'zorder(customer_id, order_ts)',
  options => map('target-file-size-bytes', '536870912')
);
CALL lake.system.rewrite_position_delete_files(table => 'sales.orders');
CALL lake.system.rewrite_manifests('sales.orders');
CALL lake.system.expire_snapshots(table => 'sales.orders',
                                  older_than => TIMESTAMP '2026-10-20 00:00:00',
                                  retain_last => 20);
CALL lake.system.remove_orphan_files(table => 'sales.orders');   -- default: files older than 3 days
CALL lake.system.fast_forward('sales.orders', 'main', 'audit');  -- publish a WAP branch
```

### Delta

```sql
OPTIMIZE sales.orders;                         -- bin-pack, or cluster when CLUSTER BY is set
OPTIMIZE sales.orders ZORDER BY (customer_id); -- tables without liquid clustering
VACUUM sales.orders RETAIN 168 HOURS;          -- default retention is 7 days
REORG TABLE sales.orders APPLY (PURGE);        -- rewrite files to drop deletion-vector rows
```

## 5. DataFrame API

```python
# Iceberg
df.writeTo("lake.sales.orders").append()
df.writeTo("lake.sales.orders").overwritePartitions()
spark.read.option("snapshot-id", 5729182).table("lake.sales.orders")

# Delta
from delta.tables import DeltaTable
dt = DeltaTable.forName(spark, "sales.orders")
(dt.alias("t").merge(updates.alias("s"), "t.order_id = s.order_id")
   .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())
spark.read.format("delta").option("readChangeFeed", "true") \
     .option("startingVersion", 12).table("sales.orders")
```

## 6. Python-Native Libraries (no JVM)

```python
# PyIceberg
from pyiceberg.catalog import load_catalog
cat = load_catalog("lake", **{"type": "rest", "uri": "https://catalog.example.com"})
tbl = cat.load_table("sales.orders")
arrow = tbl.scan(row_filter="status = 'paid'", selected_fields=("order_id", "amount")).to_arrow()
tbl.append(pa_table)            # pyarrow.Table with a matching schema

# delta-rs (package: deltalake)
from deltalake import DeltaTable, write_deltalake
write_deltalake("s3://bucket/sales/orders", pa_table, mode="append")
dt = DeltaTable("s3://bucket/sales/orders")
dt.optimize.compact()
dt.vacuum(retention_hours=168, dry_run=False)
```

## Pitfalls

- `INSERT OVERWRITE` without dynamic partition mode replaces the whole table in Spark's default static mode.
- Iceberg `rollback_to_snapshot` changes `main` only; branches and tags are untouched.
- Delta `RENAME COLUMN`/`DROP COLUMN` require column mapping, which upgrades the table protocol; older readers then cannot read it.
- `VACUUM` with a retention below the longest running query or stream causes `FileNotFoundException` for those readers.

## Checklist

- [ ] DDL declares partitioning/clustering and format version explicitly.
- [ ] Upserts use `MERGE` with a deterministic, de-duplicated source.
- [ ] Maintenance procedures are scheduled, not run ad hoc.
- [ ] Time-travel window documented and consistent with expire/vacuum retention.
