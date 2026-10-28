# Table State and Metadata Management

How each table format records table state over time (Delta transaction log, Iceberg snapshots and refs, Hudi timeline), how that metadata grows, and how to inspect, bound and repair it.

## Delta Transaction Log

```
_delta_log/
  00000000000000000120.json        # one commit: add/remove/metaData/protocol/commitInfo/txn actions
  00000000000000000120.checkpoint.parquet
  _last_checkpoint                 # pointer to latest checkpoint
  00000000000000000121.crc         # optional checksum/stats file
```

- State = last checkpoint + later JSON commits. Checkpoints are written periodically (`delta.checkpointInterval`).
- Newer Delta versions support V2 checkpoints and log compaction files for very large tables.
- `txn` actions store `(appId, version)` for idempotent writers (`txnAppId`/`txnVersion`).
- Log retention: `delta.logRetentionDuration` (default 30 days) — log files older than this are cleaned at checkpoint time; this bounds time travel together with VACUUM.

Inspection:

```sql
DESCRIBE HISTORY lake.silver.orders LIMIT 20;   -- version, operation, operationMetrics, userName
DESCRIBE DETAIL lake.silver.orders;             -- numFiles, sizeInBytes, protocol versions, features
SHOW TBLPROPERTIES lake.silver.orders;
```

## Iceberg Metadata

```
metadata/
  00012-<uuid>.metadata.json   # schemas, partition specs, sort orders, snapshots, refs, properties
  snap-<id>-<uuid>.avro        # manifest list for one snapshot
  <uuid>-m0.avro               # manifest: data/delete files with partition values and column stats
```

- Snapshot = full table state at a commit; `refs` = branches and tags pointing at snapshots.
- Snapshot summary records operation, added/deleted files and records, and custom properties (`snapshot-property.*`).
- Each commit writes a new `metadata.json`; old ones are kept unless `write.metadata.delete-after-commit.enabled=true` (with `write.metadata.previous-versions-max`).

Inspection via metadata tables:

```sql
SELECT committed_at, snapshot_id, operation, summary['added-data-files'] AS added
FROM lake.silver.orders.snapshots ORDER BY committed_at DESC LIMIT 20;

SELECT * FROM lake.silver.orders.refs;              -- branches/tags
SELECT * FROM lake.silver.orders.metadata_log_entries;
SELECT count(*), sum(added_data_files_count) FROM lake.silver.orders.manifests;
```

## Hudi Timeline

```
.hoodie/
  timeline/ (or directly under .hoodie in older layouts)
    <instant>.commit / .deltacommit / .compaction / .clean / .rollback / .replacecommit
    states: requested -> inflight -> completed
  metadata/          # metadata table: files, column_stats, bloom_filters, record_index partitions
```

- Active timeline holds recent instants; older ones are archived (`hoodie.keep.min.commits`, `hoodie.keep.max.commits`).
- Hudi 1.x introduced an LSM-based timeline with long-term history; layout differs from 0.x.
- Failed inflight writes are rolled back automatically by the next writer (`hoodie.cleaner.policy.failed.writes`).

Inspection: Hudi CLI (`commits show`, `compactions show all`, `cleans show`) or Spark SQL procedures (`CALL show_commits(table => 'db.t', limit => 20)`).

## Metadata Growth and Its Effects

| Growth source | Effect | Bound with |
|---|---|---|
| Many commits (streaming) | More log/metadata files, slower planning | Longer commit intervals, checkpoints, metadata cleanup |
| Many snapshots retained | Larger `metadata.json` | `expire_snapshots`, `history.expire.*` |
| Many small manifests | Slow Iceberg planning | `rewrite_manifests` |
| Many files | Large manifests / checkpoints | Compaction |
| Wide schemas with full stats | Large manifests | Limit metrics columns |

## Recovering From Metadata Problems

| Situation | Action |
|---|---|
| Bad commit (wrong data) | Delta `RESTORE`; Iceberg `rollback_to_snapshot`; Hudi rollback |
| Iceberg catalog points to a missing metadata file | Re-register the table to the last valid `metadata.json` (`CALL sys.register_table(...)`) |
| Table dropped from catalog but files remain | Iceberg `register_table`; Delta `CREATE TABLE ... LOCATION` |
| Delta checkpoint corrupt | Restore checkpoint file from bucket versioning; Delta can rebuild state from JSON commits if they are still retained |
| Inflight Hudi commit stuck | Let the next write roll back, or `rollback` via CLI |

Never hand-edit metadata files; use format tools so checksums and references stay consistent.

## Metadata Backups

- Bucket versioning protects metadata files from accidental deletion.
- Iceberg: catalog database (Postgres for JDBC/REST catalogs, Glue) must be backed up; it holds the current pointers.
- Record the current snapshot/version of critical tables in an ops table daily to speed point-in-time recovery.

## Checklist
- [ ] Commit frequency bounded per table
- [ ] Snapshot/log retention configured and consistent with time travel
- [ ] Manifest/metadata cleanup enabled for high-commit tables
- [ ] Catalog backend backed up; bucket versioning on metadata
- [ ] Recovery runbooks for bad commits and lost catalog pointers
