# Table Format Internals: Iceberg, Delta Lake, Hudi, Paimon

How each open table format stores metadata, tracks files, handles deletes, and evolves. Knowing the internals explains their performance behaviour and maintenance needs.

## 1. Apache Iceberg

```
catalog ──► metadata/00042-<uuid>.metadata.json   (schemas, partition specs, sort orders,
                 │                                  snapshots, refs: branches/tags, properties)
                 └─► snap-<id>.avro  (manifest list: one entry per manifest + partition summaries)
                          └─► <uuid>-m0.avro  (manifest: data/delete file paths, partition
                                   │           tuple, record counts, column bounds/null counts)
                                   └─► data/*.parquet, delete files
```

- Snapshot = complete table state. Commit = write new metadata JSON and swap the catalog pointer.
- Planning prunes in three steps: manifest list partition summaries → manifest entries' partition values → per-file column min/max stats.
- Hidden partitioning: partition values derived from source columns by transforms (`days(ts)`, `bucket(16, id)`); queries filter on the source column.
- Partition evolution: specs are versioned; old files keep the old spec, new files use the new one, no rewrite required.
- Row-level deletes (format v2): position delete files (file path + row position) and equality delete files (rows matching column values, used mainly by Flink upserts). Format v3 replaces position deletes with deletion vectors stored in Puffin files, adds row lineage, default column values, and new types (variant, geometry, nanosecond timestamps). Check engine support before adopting v3.
- Refs: `main` plus named branches and tags with their own retention.

## 2. Delta Lake

```
table/
├── _delta_log/
│   ├── 00000000000000000000.json      # commit 0: protocol, metaData, add actions
│   ├── 00000000000000000001.json      # add/remove/commitInfo actions
│   ├── 00000000000000000010.checkpoint.parquet   # periodic full state snapshot
│   └── _last_checkpoint
└── part-*.parquet (optionally in Hive-style partition dirs)
```

- Version N = checkpoint + replay of later JSON commits. Each `add` action carries per-file stats (min/max/nullCount on the first 32 columns by default).
- Commit = create the next numbered JSON file with put-if-absent semantics.
- Protocol versioning: `minReaderVersion`/`minWriterVersion` plus named table features (`deletionVectors`, `columnMapping`, `timestampNtz`, `v2Checkpoint`, `liquid clustering`/`clustering`, `rowTracking`, `typeWidening`). Enabling a feature can lock out older readers.
- Deletion vectors: bitmaps marking deleted rows in existing files, stored alongside data; avoid rewriting files on DELETE/UPDATE/MERGE.
- Liquid clustering: `CLUSTER BY` keys; `OPTIMIZE` incrementally clusters data; keys can be changed later.
- Change Data Feed: when enabled, writes change files (`_change_data/`) or derives changes from add/remove actions.

## 3. Apache Hudi

- Timeline under `.hoodie/` records instants (commit, deltacommit, compaction, clean, rollback) with states requested → inflight → completed.
- Table types: Copy-on-Write (Parquet base files rewritten on update) and Merge-on-Read (base files + Avro/Parquet log files, compacted later).
- Record keys (`hoodie.datasource.write.recordkey.field`) and an ordering/precombine field decide which version wins; indexes (bloom, simple, bucket, record-level index in the metadata table) map keys to file groups.
- Metadata table (`.hoodie/metadata`) stores file listings and column stats to avoid object-store listings.

## 4. Apache Paimon

- LSM tree per bucket: writes go to sorted files in level 0; background compaction merges levels.
- Primary-key tables with merge engines: `deduplicate` (last wins), `partial-update` (non-null fields merge), `aggregation` (per-column aggregate functions), `first-row`.
- `changelog-producer` (`none`, `input`, `lookup`, `full-compaction`) controls whether complete changelogs are produced for downstream streaming reads.
- Append tables (no primary key) for log-style data.
- Snapshots and manifests similar to Iceberg; can expose Iceberg-compatible metadata for Iceberg readers.

## 5. Feature Comparison

| Capability | Iceberg | Delta | Hudi | Paimon |
|---|---|---|---|---|
| ACID via | Catalog pointer swap | Log file put-if-absent | Timeline + locks for multi-writer | Snapshot commit |
| Partition evolution | Yes, metadata-only | Via liquid clustering (no Hive partition evolution) | Limited | Limited |
| Hidden partitioning | Yes | Generated columns | No | No |
| Row-level deletes | Position/equality deletes; deletion vectors (v3) | Deletion vectors | MoR log files | LSM merge |
| Branches/tags | Yes | No (versions only) | Savepoints | Tags, branches |
| Change feed | Changelog view procedure | CDF | Incremental queries | Changelog producers |
| Primary write engines | Spark, Flink, Trino, many vendors | Spark, Databricks, delta-rs, Flink | Spark, Flink | Flink, Spark |

## 6. Interoperability

- Delta UniForm writes Iceberg (and Hudi) metadata for Delta tables so Iceberg readers can query them; the Delta table remains the source of truth, with some feature limits (e.g. deletion vectors historically incompatible with UniForm Iceberg in some versions).
- Apache XTable (incubating) converts metadata among Delta, Iceberg, and Hudi on demand.
- Paimon can generate Iceberg-compatible metadata.

Translation layers are read-side interop; keep one native writer per table.

## 7. What Internals Imply for Operations

| Internal | Operational consequence |
|---|---|
| Every commit adds metadata | Expire snapshots / clean logs regularly |
| Stats only on some columns | Choose which columns get stats; order columns accordingly in Delta |
| Deletes as separate files/vectors | Compact or purge to keep reads fast and to physically delete data |
| Files written before commit | Orphan file cleanup after failures |
| Optimistic concurrency | Design writers to avoid overlapping partitions |

## Pitfalls

- Choosing a format by benchmark headlines rather than ecosystem fit (engines, catalog, team skills).
- Enabling new protocol features (Delta table features, Iceberg v3) before every reader supports them.
- Assuming a logical delete removes data physically; GDPR erasure needs compaction plus expiry/vacuum.

## Checklist

- [ ] Format version / table features recorded per table.
- [ ] Reader compatibility checked before upgrades.
- [ ] Maintenance aligned with the format's metadata growth pattern.
- [ ] Interop (UniForm/XTable) used only for reads.
