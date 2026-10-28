# Table Format API Reference (Delta Lake, Iceberg, Hudi)

Programmatic APIs for creating, writing, maintaining and time-traveling lake tables. Covers the Spark APIs (Scala/PySpark), the JVM-free Python libraries (`deltalake` / delta-rs, PyIceberg), and the SQL procedures each format exposes. Check exact method availability against the library version you pin.

## Delta Lake — PySpark (`delta-spark`)

```python
from delta.tables import DeltaTable
from pyspark.sql import functions as F

# Create (idempotent)
(DeltaTable.createIfNotExists(spark)
    .tableName("lake.silver.orders")
    .addColumn("order_id", "BIGINT", nullable=False)
    .addColumn("customer_id", "BIGINT")
    .addColumn("amount", "DECIMAL(18,2)")
    .addColumn("order_date", "DATE")
    .partitionedBy("order_date")
    .property("delta.enableChangeDataFeed", "true")
    .execute())

dt = DeltaTable.forName(spark, "lake.silver.orders")   # or DeltaTable.forPath(spark, "s3://...")

# Upsert
(dt.alias("t")
   .merge(updates.alias("s"), "t.order_id = s.order_id")
   .whenMatchedUpdateAll()
   .whenNotMatchedInsertAll()
   .whenNotMatchedBySourceDelete()        # optional: full-sync semantics
   .execute())

dt.delete(F.col("order_date") < "2020-01-01")
dt.update(condition="amount < 0", set={"amount": "0"})

# Maintenance
dt.optimize().executeCompaction()
dt.optimize().where("order_date >= '2026-10-01'").executeZOrderBy("customer_id")
dt.vacuum(168)                            # hours; default retention 7 days

# Introspection / recovery
dt.history(20).select("version", "timestamp", "operation", "operationMetrics").show()
dt.detail().show()
dt.restoreToVersion(42)                   # or restoreToTimestamp("2026-10-26")
```

Reading a version or change feed:

```python
spark.read.option("versionAsOf", 42).table("lake.silver.orders")
spark.read.option("timestampAsOf", "2026-10-26T00:00:00Z").table("lake.silver.orders")
(spark.read.option("readChangeFeed", "true")
      .option("startingVersion", 40).table("lake.silver.orders"))   # _change_type, _commit_version
```

## Delta Lake — Python without Spark (`deltalake`)

```python
import pyarrow as pa
from deltalake import DeltaTable, write_deltalake

write_deltalake("s3://lake/silver/orders", arrow_tbl, mode="append",
                partition_by=["order_date"], storage_options={"AWS_REGION": "eu-west-1"})

dt = DeltaTable("s3://lake/silver/orders")
(dt.merge(source=arrow_tbl, predicate="t.order_id = s.order_id",
          source_alias="s", target_alias="t")
   .when_matched_update_all()
   .when_not_matched_insert_all()
   .execute())

dt.optimize.compact()
dt.optimize.z_order(["customer_id"])
dt.vacuum(retention_hours=168, dry_run=False)
dt.load_as_version(10)        # time travel on the same object
dt.to_pyarrow_table(filters=[("order_date", ">=", "2026-10-01")])
```

## Apache Iceberg — Spark SQL procedures

All procedures run as `CALL <catalog>.system.<proc>(...)`.

| Procedure | Purpose |
|---|---|
| `rewrite_data_files(table => 'db.t', strategy => 'binpack' \| 'sort', sort_order => 'zorder(a,b)', where => '...')` | Compaction / clustering |
| `rewrite_position_delete_files(table => 'db.t')` | Compact MoR position deletes |
| `rewrite_manifests('db.t')` | Re-cluster manifests for planning speed |
| `expire_snapshots(table => 'db.t', older_than => TIMESTAMP '...', retain_last => 10)` | Drop old snapshots and unreferenced files |
| `remove_orphan_files(table => 'db.t', older_than => TIMESTAMP '...')` | Delete files never committed (failed writes) |
| `rollback_to_snapshot('db.t', <id>)` / `rollback_to_timestamp` | Revert current state |
| `set_current_snapshot`, `cherrypick_snapshot`, `fast_forward('db.t', 'main', 'audit')` | Branch / WAP workflows |
| `create_changelog_view(table => 'db.t', options => map('start-snapshot-id','...'))` | CDC-style view over snapshots |
| `snapshot`, `migrate`, `add_files` | Adopt existing Parquet/Hive tables |

Time travel and metadata tables:

```sql
SELECT * FROM lake.db.orders VERSION AS OF 8812345678;
SELECT * FROM lake.db.orders TIMESTAMP AS OF '2026-10-26 00:00:00';
SELECT * FROM lake.db.orders.snapshots;      -- also .history .files .manifests .partitions .refs
```

## Apache Iceberg — PyIceberg

```python
from pyiceberg.catalog import load_catalog
from pyiceberg.types import StringType

catalog = load_catalog("lake", **{"type": "rest", "uri": "https://catalog.internal/api/catalog",
                                   "warehouse": "prod"})
tbl = catalog.load_table("silver.orders")

arrow = tbl.scan(row_filter="order_date >= '2026-10-01'",
                 selected_fields=("order_id", "amount")).to_arrow()
tbl.append(new_rows)                         # pyarrow.Table
tbl.overwrite(rows, overwrite_filter="order_date = '2026-10-26'")
tbl.delete(delete_filter="amount < 0")
tbl.upsert(rows, join_cols=["order_id"])     # PyIceberg >= 0.9

with tbl.update_schema() as upd:
    upd.add_column("channel", StringType())
```

## Apache Hudi — Spark datasource options

```python
opts = {
    "hoodie.table.name": "orders",
    "hoodie.datasource.write.recordkey.field": "order_id",
    "hoodie.datasource.write.precombine.field": "updated_at",   # latest wins on duplicates
    "hoodie.datasource.write.partitionpath.field": "order_date",
    "hoodie.datasource.write.table.type": "MERGE_ON_READ",       # or COPY_ON_WRITE
    "hoodie.datasource.write.operation": "upsert",               # insert | bulk_insert | delete
}
df.write.format("hudi").options(**opts).mode("append").save("s3://lake/silver/orders")

# Incremental pull since an instant
(spark.read.format("hudi")
   .option("hoodie.datasource.query.type", "incremental")
   .option("hoodie.datasource.read.begin.instanttime", "20261026000000")
   .load("s3://lake/silver/orders"))
```

## API Choice Guide

| Need | Use |
|---|---|
| Large batch / MERGE on clusters | Spark APIs of the format |
| Small services, Lambdas, notebooks without JVM | `deltalake`, PyIceberg, DuckDB readers |
| Multi-engine, catalog-managed access control | Iceberg REST catalog + any engine |
| Streaming upserts | Spark Structured Streaming / Flink sinks |

## Pitfalls
- Calling `vacuum`/`expire_snapshots` with retention shorter than the longest-running reader or streaming lag breaks those readers.
- `whenNotMatchedBySourceDelete` deletes every target row not in the source; only use with a full snapshot source.
- Python libraries and Spark must agree on enabled table features (deletion vectors, column mapping, Iceberg v3); an older writer will refuse or corrupt nothing but fail.

## Checklist
- [ ] Library versions pinned and protocol/table features compatible with all writers
- [ ] Every MERGE has a deterministic key and dedupes the source first
- [ ] Maintenance (compaction, vacuum/expire, orphan cleanup) scheduled
- [ ] Time-travel retention documented for consumers
