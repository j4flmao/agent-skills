# Read-Path Query Optimization on Lake Tables

Engine- and query-level techniques that make reads over Iceberg/Delta/Hudi faster: predicate pushdown, scan planning, caching, join strategies and metadata-only answers. Physical layout (partitioning, clustering, file sizes) is in `lake-performance-tuning.md`.

## Diagnose First

| Question | Where to look |
|---|---|
| How many files/bytes were read vs table size? | Spark UI scan node metrics; Trino `EXPLAIN ANALYZE`; Iceberg scan metrics reporter |
| Was the predicate pushed down? | Physical plan `PushedFilters` / Trino plan |
| Time spent planning vs executing? | Long gap before tasks start = planning (metadata) bound |
| Spill or skew in joins/aggregations? | Stage task time distribution |

## Predicate Pushdown Rules

Pushdown works when the filter compares a column to a literal of a compatible type.

| Breaks pruning | Works |
|---|---|
| `WHERE date(event_ts) = '2026-10-26'` on a non-transform partition | `WHERE event_ts >= '2026-10-26' AND event_ts < '2026-10-27'` |
| `WHERE cast(id AS STRING) = '42'` | `WHERE id = 42` |
| `WHERE upper(country) = 'DE'` | store normalized values; `WHERE country = 'DE'` |
| Filters only on a joined dimension | dynamic partition pruning / pass keys explicitly |

Iceberg hidden partitioning prunes `days(event_ts)` partitions from plain `event_ts` range predicates.

## Projection

Select only needed columns: Parquet is columnar and wide `SELECT *` on wide tables multiplies I/O. Nested struct pruning (`spark.sql.optimizer.nestedSchemaPruning.enabled`, on by default) reads only accessed sub-fields.

## Dynamic Partition / File Pruning

Star-schema joins benefit when the engine derives fact-table filters from the filtered dimension at runtime:
- Spark: `spark.sql.optimizer.dynamicPartitionPruning.enabled=true` (default).
- Trino: dynamic filtering (enabled by default) prunes partitions and files for Iceberg/Delta/Hive connectors.

## Planning Overhead

Large tables with many snapshots/manifests or small files make planning slow:
- Compact data files and `rewrite_manifests` (Iceberg); keep snapshot count bounded.
- Delta: frequent checkpoints keep log replay short; avoid tables with hundreds of thousands of tiny files.
- Iceberg distributed planning in Spark for very large tables (`spark.sql.iceberg.planning-mode`, newer versions) or REST server-side planning where supported.

## Caching

| Cache | Engine | Notes |
|---|---|---|
| Metadata/manifest caching | Iceberg (`io.manifest.cache-enabled`), Trino metadata cache | Speeds planning for repeated queries |
| Local SSD data cache | Trino file system cache (`fs.cache.enabled`), Databricks disk cache | Hot data on local disks |
| Result cache | Warehouses, some SQL gateways | Invalidated by new snapshots |

## Joins and Aggregations

- Broadcast small dimensions (`spark.sql.autoBroadcastJoinThreshold`, Trino `join_distribution_type=AUTOMATIC`).
- Storage-partitioned joins (Spark 3.3+ with Iceberg): two tables bucketed identically (`bucket(N, key)`) join without shuffle when `spark.sql.sources.v2.bucketing.enabled=true` and related settings are on.
- AQE handles skew (`spark.sql.adaptive.skewJoin.enabled`).

## Metadata-Only Answers

- Iceberg metadata tables answer counts and partitions without scanning data: `SELECT partition, record_count FROM t.partitions`.
- Delta stats let some engines answer `count(*)`/`min`/`max` from the log.
- Precompute gold aggregates or materialized views for dashboards instead of scanning silver.

## Merge-on-Read Cost

Reads of MoR tables (equality/position deletes, Hudi log files, Delta deletion vectors) do extra work proportional to the number of delete files. If read latency regresses, check delete-file counts and run compaction (`lake-operations.md`). Hudi offers read-optimized queries (`_ro` tables) that read only compacted base files.

## Engine-Specific Quick Wins

| Engine | Setting / practice |
|---|---|
| Spark | AQE on; `spark.sql.files.maxPartitionBytes` for scan task size; Iceberg `read.split.target-size` |
| Trino | `iceberg.split-manager-threads`, file system cache, `EXPLAIN ANALYZE` per query |
| DuckDB | Use metadata-based scans (`iceberg_scan`) with filters; local cache of remote files via httpfs settings |

## Pitfalls
- Functions on filter columns defeating pruning.
- Running many concurrent dashboards against silver tables instead of aggregates.
- Enabling every cache without measuring hit rate.
- Blaming the engine when the table has 100k tiny files.

## Checklist
- [ ] Slow queries profiled for files/bytes read and planning time
- [ ] Filters written in pushdown-friendly form
- [ ] Dynamic filtering/pruning enabled
- [ ] MoR delete files kept low by compaction
- [ ] Repeated heavy queries served from aggregates or materialized views
