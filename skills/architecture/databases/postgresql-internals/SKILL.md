---
name: architecture-postgresql-internals
description: >
  Use this skill when the user says 'Postgres MVCC', 'table bloat', 'autovacuum', 'dead tuples', 'transaction ID wraparound', 'WAL', 'checkpoints', 'HOT updates', 'why is Postgres slow', 'EXPLAIN ANALYZE'. Explains PostgreSQL storage and concurrency internals (heap, tuples, MVCC visibility, VACUUM, WAL, checkpoints, buffer cache, planner) and turns them into diagnosis queries and tuning settings. Do NOT use for: schema design rules (data/relational-database), sharding/scaling topology (architecture/databases/scaling-and-sharding), or ORM usage (backend skills).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [architecture, database, postgresql, mvcc, vacuum, wal, performance]
---

# PostgreSQL Internals

## Purpose
Most PostgreSQL production issues (bloat, sudden slowdowns, replication lag, wraparound emergencies, bad plans) are direct consequences of how MVCC, VACUUM, WAL, and the planner work. This skill explains those mechanisms precisely and maps each one to the queries and settings used to diagnose and tune it.

## Agent Protocol

### Trigger
"MVCC", "bloat", "autovacuum", "VACUUM FULL", "dead tuples", "xid wraparound", "WAL", "checkpoint", "HOT update", "fillfactor", "shared_buffers", "EXPLAIN ANALYZE", "slow query".

### Input Context
- PostgreSQL major version, hardware/managed service, workload (OLTP/analytics, write rate).
- Symptoms with timestamps; `pg_stat_*` output; slow query plans.
- Long-running transactions or replication slots in use.

### Output Artifact
Diagnosis with evidence queries, root cause tied to the mechanism, and concrete setting/schema changes.

### Response Format
```
Symptom: {what}
Mechanism: {MVCC|VACUUM|WAL|checkpoint|planner|buffer}
Evidence: {query + key numbers}
Fix: {setting/table option/query change} (reload|restart required)
Verify: {metric to watch}
```

### Completion Criteria
- [ ] Root cause supported by catalog/statistics evidence.
- [ ] Changes state whether they need reload or restart.
- [ ] Long transactions, idle-in-transaction sessions, and stale replication slots checked.

## MVCC
- Every row version (tuple) stores `xmin` (creating transaction) and `xmax` (deleting/locking transaction).
- `UPDATE` = insert a new version + set `xmax` on the old one. `DELETE` sets `xmax`. Old versions stay in the heap.
- A snapshot decides visibility: a tuple is visible if `xmin` committed before the snapshot and `xmax` is unset, aborted, or not yet committed for that snapshot. Readers never block writers and vice versa; writers on the same row block each other.
- **HOT (heap-only tuple) updates**: if no indexed column changes and the page has free space, the new version stays on the same page and indexes are not updated. Lower `fillfactor` (e.g. 80-90) on update-heavy tables to leave room.

## VACUUM
- Removes dead tuples no snapshot can see anymore, marks space reusable (does not shrink the file), updates the visibility map (enables index-only scans) and free space map, and freezes old tuples.
- `VACUUM FULL` rewrites the table to return space to the OS but takes an `ACCESS EXCLUSIVE` lock; prefer `pg_repack` online.
- **What blocks cleanup**: long-running or idle-in-transaction sessions, abandoned replication slots, old prepared transactions, `hot_standby_feedback` from lagging replicas. Dead tuples newer than the oldest snapshot cannot be removed.
- **Autovacuum trigger**: dead tuples > `autovacuum_vacuum_threshold` (50) + `autovacuum_vacuum_scale_factor` (0.2) × reltuples. On large tables 20% is far too late; set per-table scale factors.

```sql
ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.01,
                        autovacuum_analyze_scale_factor = 0.02,
                        fillfactor = 90);
```

## Transaction ID Wraparound
XIDs are 32-bit and compared modulo 2^32, so tuples must be **frozen** before they are ~2 billion transactions old. Autovacuum forces an anti-wraparound vacuum when `age(relfrozenxid)` exceeds `autovacuum_freeze_max_age` (default 200 million). If freezing cannot keep up, PostgreSQL eventually refuses new XIDs to protect data.

```sql
SELECT datname, age(datfrozenxid) AS xid_age FROM pg_database ORDER BY 2 DESC;
SELECT relname, age(relfrozenxid) AS xid_age, pg_size_pretty(pg_total_relation_size(oid))
FROM pg_class WHERE relkind IN ('r','m','t') ORDER BY 2 DESC LIMIT 10;
```

## WAL and Checkpoints
- Changes are written to the write-ahead log before data pages are flushed; on commit the WAL is flushed (with `synchronous_commit = on`), which gives durability. Data pages are written later by the background writer and checkpointer.
- **Checkpoint**: flushes all dirty pages so recovery can start from that point. Triggered by `checkpoint_timeout` (default 5 min) or WAL volume reaching `max_wal_size` (default 1 GB). Frequent size-triggered checkpoints cause I/O spikes and extra **full-page writes** (first change to a page after a checkpoint logs the whole page).
- Tune: raise `max_wal_size` so checkpoints are time-triggered; `checkpoint_completion_target = 0.9` (default since PG 14) spreads I/O.
- WAL also feeds physical streaming replication and logical decoding (`wal_level = logical` for CDC).
- `synchronous_commit = off` trades a small window of possible loss of recent commits (not corruption) for lower commit latency; can be set per transaction.

## Memory and Planner
| Setting | Role | Starting point |
|---|---|---|
| `shared_buffers` | PostgreSQL buffer cache (default 128 MB) | ~25% of RAM on a dedicated server |
| `effective_cache_size` | Planner hint for OS + PG cache | 50-75% of RAM |
| `work_mem` | Per sort/hash node, per operation | Small globally; raise per session for reports |
| `maintenance_work_mem` | VACUUM, CREATE INDEX | 1-2 GB on large servers |
| `random_page_cost` | Planner cost of random I/O (default 4) | ~1.1 on SSD |

Plans depend on statistics: run `ANALYZE` after bulk loads; use `CREATE STATISTICS` for correlated columns; raise per-column statistics targets for skewed data.

## Diagnosis Queries

```sql
-- Dead tuples and vacuum recency
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;

-- Who is holding back cleanup?
SELECT pid, state, xact_start, now() - xact_start AS age, left(query, 80)
FROM pg_stat_activity WHERE xact_start IS NOT NULL ORDER BY xact_start LIMIT 10;
SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;

-- HOT update ratio
SELECT relname, n_tup_upd, n_tup_hot_upd,
       round(100.0 * n_tup_hot_upd / nullif(n_tup_upd, 0), 1) AS hot_pct
FROM pg_stat_user_tables ORDER BY n_tup_upd DESC LIMIT 10;

-- Top queries by total time (requires pg_stat_statements)
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time, 2) AS mean_ms, left(query, 80)
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

-- A plan with real timings and buffer usage
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
```

Protect against runaway sessions: `idle_in_transaction_session_timeout`, `statement_timeout` (per role), `lock_timeout` for migrations.

## Anti-Patterns
- Disabling autovacuum on busy tables.
- Long transactions in application code (open transaction around HTTP calls).
- Forgotten logical replication slots retaining WAL until the disk fills.
- `VACUUM FULL` in business hours.
- Random UUIDv4 primary keys on write-heavy tables (index page splits, more full-page writes); use identity, UUIDv7 (`uuidv7()` in PG 18+), or ULIDs.
- Raising `work_mem` globally to fix one query (multiplies per operation and connection).

## Checklist
- [ ] Per-table autovacuum settings on large/hot tables.
- [ ] Monitoring: dead tuples, xid age, checkpoint frequency, replication slot lag, long transactions.
- [ ] Session timeouts configured.
- [ ] `pg_stat_statements` enabled; top queries reviewed with `EXPLAIN (ANALYZE, BUFFERS)`.
- [ ] `max_wal_size` sized so checkpoints are mostly timed.
- [ ] Connection pooling (PgBouncer) instead of thousands of backends.

## References
- PostgreSQL documentation: "Concurrency Control", "Routine Vacuuming", "WAL Configuration", "Monitoring Database Activity".
- Rogov, "PostgreSQL 14 Internals" (Postgres Professional, free e-book).
