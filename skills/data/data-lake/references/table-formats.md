# Open Table Format Comparison: Iceberg, Delta Lake, Hudi and Paimon

Feature-by-feature comparison for choosing a format per platform or per table, with the questions that decide it. Capabilities change quickly; confirm against current release notes before committing.

## At a Glance

| | Apache Iceberg | Delta Lake | Apache Hudi | Apache Paimon |
|---|---|---|---|---|
| Origin | Netflix → Apache | Databricks → Linux Foundation | Uber → Apache | Flink Table Store → Apache |
| Metadata | metadata.json + manifest lists + manifests | `_delta_log` JSON commits + checkpoints | Timeline + metadata table | Snapshots + manifests over LSM |
| Catalog model | Catalog required (REST spec, Glue, Hive, JDBC, Nessie) | Path-based or catalog (Unity, HMS, Glue) | Path-based or HMS/Glue | Filesystem, Hive, JDBC, REST |
| Row-level updates | CoW, position/equality deletes; deletion vectors in v3 | CoW, deletion vectors | CoW, MoR with log files | Primary-key tables (LSM merge) |
| Partitioning | Hidden partitioning with transforms; partition evolution | Explicit columns; liquid clustering | Explicit; clustering | Explicit; buckets |
| Schema evolution | Full (field IDs) | Full with column mapping | Supported | Supported |
| Time travel | Snapshots, branches, tags | Versions/timestamps | Instants, savepoints | Snapshots, tags |
| Streaming | Flink/Spark append; upserts via equality deletes | Spark Structured Streaming source/sink, CDF | Spark/Flink upserts, incremental queries | Built for Flink streaming upserts, changelog producers |
| Engine breadth | Broadest (Spark, Flink, Trino, Snowflake, BigQuery, Athena, DuckDB, ...) | Strong in Spark/Databricks; others via connectors/delta-rs/UniForm | Spark, Flink, Trino/Presto (read), Hive | Flink, Spark, Trino/StarRocks/Doris (varying) |

## Decision Questions

1. Which engines must read and write? If many vendors (Snowflake + Trino + Spark + Flink), Iceberg with a REST catalog is the safest common denominator.
2. Is the platform Databricks-centric? Delta is native; enable UniForm if other engines need Iceberg reads.
3. Is the workload high-frequency upserts with record-level indexing and incremental pulls? Hudi or Paimon.
4. Is Flink the primary writer with continuous CDC upserts? Paimon or Iceberg (with aggressive compaction), or Hudi.
5. Do you need multi-table branching? Iceberg + Nessie.

## Upsert Mechanics Compared

| Format | Write | Read | Maintenance |
|---|---|---|---|
| Iceberg CoW | rewrite files | plain | compaction |
| Iceberg MoR | delete files | apply deletes | `rewrite_position_delete_files`, rewrite data files |
| Delta + DVs | bitmap per file | filter by bitmap | `OPTIMIZE`, `REORG ... APPLY (PURGE)` |
| Hudi MoR | append log files | merge base + logs (or read-optimized view) | compaction, clustering, cleaning |
| Paimon PK table | LSM sorted runs | merge on read (or read compacted) | background compaction |

## Concurrency

| Format | Multi-writer support |
|---|---|
| Iceberg | Optimistic concurrency via catalog atomic swap; validation per operation |
| Delta | Optimistic concurrency via atomic log write; conflict detection by partitions/files touched |
| Hudi | OCC with external lock provider; non-blocking concurrency control in Hudi 1.x for some workloads |
| Paimon | Typically one writer job per table/partition; dedicated compaction jobs supported |

## Interoperability Options

- Delta UniForm: Delta tables also expose Iceberg (and Hudi) metadata for readers.
- Apache XTable (incubating): translates metadata between Iceberg, Delta and Hudi without copying data (see `xtable-multi-format.md`).
- Iceberg REST catalogs that front other formats (e.g. Unity Catalog serving Iceberg reads).

## Migration Paths

| From | To | Approach |
|---|---|---|
| Hive Parquet tables | Iceberg | `CALL sys.snapshot(...)` (test) then `migrate` or `add_files` |
| Hive Parquet | Delta | `CONVERT TO DELTA parquet.\`path\`` |
| Delta | Iceberg | UniForm (read) or CTAS rewrite for full ownership |
| Any | Any | CTAS rewrite when metadata translation is not acceptable |

## Pitfalls
- Choosing by benchmark blog posts instead of your engines and write patterns.
- Mixing formats per table without a catalog strategy; consumers need per-table connector knowledge.
- Assuming "supports Iceberg" means writes, MoR reads and v3 features in every engine.
- Converting formats with translation layers and then writing from both sides.

## Checklist
- [ ] Engine inventory (read/write) mapped to format support
- [ ] Upsert pattern and frequency known per table
- [ ] Catalog choice made together with the format
- [ ] Interop path (UniForm/XTable) defined for secondary engines
- [ ] Decision recorded in an ADR with revisit date
