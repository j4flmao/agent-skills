---
name: database-internals-mechanics
description: >
  Use this skill when the user says 'database internals', 'b-tree vs lsm', 'lsm tree', 'storage engine', 'write amplification', 'compaction', 'wal', 'write-ahead log', 'mvcc', 'isolation level', 'write skew', 'serializable snapshot isolation', 'vacuum bloat'. Explains how storage engines, logging/recovery and concurrency control work, and turns that into concrete engine choice, schema/key design and isolation-level decisions. Do NOT use for: SQL schema/query tuning in a specific RDBMS (data-relational-database), NoSQL data modeling (data-nosql-database), sharding/replication topology (system-design database sharding), migrations (database-migration).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [data, database-internals, b-tree, lsm-tree, wal, mvcc, isolation]
---

# Database Internals

## Purpose
Explain why a database behaves the way it does under a workload: why random-key inserts hurt a B-tree, why an LSM store has read and space amplification, what a commit actually waits for, and which anomalies each isolation level permits in a specific engine. Use this to choose engines, keys and isolation levels from mechanism rather than folklore.

## Agent Protocol

### Trigger
"database internals", "b-tree", "lsm", "storage engine", "write amplification", "compaction", "wal", "fsync", "mvcc", "isolation level", "phantom", "write skew", "ssi", "vacuum", "bloat".

### Input Context
- Engine and version (PostgreSQL, MySQL/InnoDB, RocksDB, Cassandra/ScyllaDB, SQLite...).
- Workload: read/write ratio, key pattern (sequential vs random), row size, update vs append, consistency needs.

### Output Artifact
Mechanism explanation + recommendation (engine, key, isolation, settings). No file unless requested.

### Response Format
```
Mechanism: {what the engine does}
Impact on workload: {amplification/anomaly/latency}
Recommendation: {change}
Verify: {metric or query}
```

### Completion Criteria
- [ ] Claims tied to the specific engine (isolation semantics differ between engines).
- [ ] Recommendation has a measurable check (e.g. `pg_stat_*`, RocksDB stats, compaction metrics).

## Storage Structures
| | B+tree | LSM-tree |
|--|--------|----------|
| Write path | Find leaf page, modify page (in buffer pool), WAL record | Append to WAL + insert into in-memory memtable; flush as immutable sorted file (SSTable) |
| Read path | Root→leaf, O(log_B N) pages; typically 3-4 levels | Memtable + several SSTables per level; Bloom filters skip files |
| Write amplification | Page writes + WAL (+ full-page images after checkpoints in PostgreSQL) | Rewrites during compaction (leveled: high, tiered: lower) |
| Read amplification | Low | Higher, mitigated by Bloom filters, block cache |
| Space amplification | Page free space, fragmentation | Obsolete versions/tombstones until compaction |
| Typical engines | PostgreSQL indexes, InnoDB, SQLite | RocksDB, LevelDB, Cassandra, ScyllaDB, CockroachDB (Pebble) |

Notes:
- InnoDB stores rows in a clustered B+tree on the primary key; secondary indexes point to the primary key. Random primary keys (UUIDv4) cause page splits and poor locality; time-ordered keys (UUIDv7, ULID, sequences) append to the right edge.
- PostgreSQL stores rows in an unordered heap; B-tree indexes point to tuple ids. Updates write new tuple versions; HOT updates avoid index writes when no indexed column changes and the page has room (tune `fillfactor`).
- Compaction strategies: leveled (bounded read/space amp, more write amp), size-tiered (less write amp, more space amp), time-window (time series with TTL).

## Write-Ahead Logging and Recovery
- Rule: the log record describing a change reaches stable storage before the changed page does; a commit is durable once its commit record is flushed (`fsync`).
- Checkpoints flush dirty pages so recovery only replays the log since the last checkpoint.
- ARIES-style recovery (InnoDB, many commercial engines): analysis, redo, undo. PostgreSQL replays redo only; aborted transactions are invisible through MVCC status instead of undo.
- Group commit batches many transactions per `fsync`. Relaxing durability (`synchronous_commit = off` in PostgreSQL, `innodb_flush_log_at_trx_commit = 2`) trades a small window of lost commits for latency; it does not risk corruption when configured this way, unlike disabling `fsync`.
- The WAL also feeds replication and change data capture (logical decoding, binlog).

## MVCC
Readers see a snapshot; writers create new versions, so reads do not block writes.
| Engine | Old versions live in | Cleanup |
|--------|----------------------|---------|
| PostgreSQL | Heap (dead tuples) | `VACUUM` / autovacuum; long-running transactions block cleanup → bloat |
| InnoDB | Undo log | Purge threads; long transactions grow history list length |
| LSM engines | Older versions in SSTables | Compaction once no snapshot needs them |

## Isolation Levels (what actually happens)
| Level | Anomalies prevented (ANSI) | PostgreSQL | MySQL InnoDB |
|-------|---------------------------|------------|--------------|
| Read Committed | dirty reads | Snapshot per statement | Snapshot per statement (consistent read) |
| Repeatable Read | + non-repeatable reads | Snapshot per transaction (snapshot isolation): no phantoms, but write skew possible; concurrent update of same row → serialization error | Default level. Snapshot for plain reads; locking reads/updates use next-key (gap) locks |
| Serializable | + phantoms, all anomalies | SSI: detects dangerous read-write dependency patterns and aborts one transaction (retry required) | Plain SELECTs become locking reads (shared next-key locks) |

Write skew example: two doctors each check "at least one other doctor on call", both go off call. Snapshot isolation allows it; Serializable (SSI) aborts one, or use `SELECT ... FOR UPDATE` on the rows that encode the constraint.

## Decision Rules
- Write-heavy append/time series, large datasets, SSD → LSM engine; read-heavy OLTP with range scans and secondary indexes → B-tree RDBMS.
- Invariants spanning multiple rows → Serializable with retry loop, or explicit row locks, or a database constraint.
- Never hold transactions open across network calls or user think time (bloat, lock waits).
- Choose time-ordered primary keys for clustered B-tree tables.

## Diagnostics
```sql
-- PostgreSQL: dead tuples and last autovacuum
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;
-- PostgreSQL: oldest running transactions (block vacuum)
SELECT pid, now() - xact_start AS age, state, query FROM pg_stat_activity WHERE xact_start IS NOT NULL ORDER BY age DESC LIMIT 5;
-- MySQL: history list length (purge lag)
SHOW ENGINE INNODB STATUS;
```

## Anti-Patterns
- Assuming "Repeatable Read" means the same thing in PostgreSQL and MySQL.
- Turning off `fsync` for speed on production data (corruption risk on crash).
- Serializable without retry logic for serialization failures (SQLSTATE 40001).
- Random UUIDv4 primary keys on large InnoDB tables.
- Ignoring compaction debt in LSM stores until write stalls appear.

## References
- `storage-engines.md` (B-tree vs LSM details, in this skill directory)
- `mvcc-and-wal.md` (WAL and MVCC walkthrough, in this skill directory)
- Kleppmann, *Designing Data-Intensive Applications*, ch. 3 and 7; Petrov, *Database Internals*.
