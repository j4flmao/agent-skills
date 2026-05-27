---
name: data-relational-database
description: >
  Use this skill when asked about PostgreSQL, MySQL, relational database, partitioning, replication, indexing, vacuum, connection pooling, query optimization, EXPLAIN, CTE, window functions, or transaction isolation. This skill enforces: PostgreSQL architecture understanding (MVCC, WAL, vacuum), indexing strategies (B-tree, GiST, GIN, BRIN), partitioning (range, list, hash), replication (streaming, logical), connection pooling (PgBouncer), query optimization (EXPLAIN ANALYZE, CTE, window functions), transaction isolation levels, and migration tools. Do NOT use for: NoSQL database design, graph database modeling, or search engine configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, database, relational, phase-11]
---

# Data Relational Database

## Purpose
Design relational database schemas with proper indexing, partitioning, replication, connection pooling, and query optimization strategies.

## Agent Protocol

### Trigger
Exact user phrases: "PostgreSQL", "MySQL", "relational database", "partitioning", "replication", "indexing", "vacuum", "connection pooling", "query optimization", "EXPLAIN", "CTE", "window function", "transaction isolation", "migration", "PgBouncer", "MVCC", "WAL", "B-tree", "GiST", "GIN", "BRIN".

### Input Context
Before activating, verify:
- Database platform (PostgreSQL, MySQL, MariaDB, SQLite)
- Data volume (rows, growth rate, total size in GB/TB)
- Query workload (OLTP, OLAP, mixed)
- Current schema and migration tool (Alembic, Sqitch, Flyway, Liquibase)
- Existing indexing strategy and planner statistics
- Replication needs (read replicas, disaster recovery, logical replication)
- Connection pooling requirements (client count, max connections)

### Output Artifact
Database schema with indexes, partition configuration, replication setup, and query optimization plan as SQL and YAML.

### Response Format
```sql
-- Table DDL with partitioning
-- Index creation statements
-- Replication configuration
-- Migration statements
```
```yaml
# Connection pool config
# Replication setup
# Vacuum settings
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Normalized schema with appropriate constraints (PK, FK, CHECK, UNIQUE)
- [ ] Indexing strategy covering slow queries (EXPLAIN ANALYZE output reviewed)
- [ ] Partitioning scheme configured for large tables
- [ ] Replication setup (streaming for HA, logical for data distribution)
- [ ] Connection pool configured (PgBouncer transaction mode default)
- [ ] Vacuum and autovacuum settings tuned
- [ ] Transaction isolation levels chosen per workload
- [ ] Migration plan with rollback strategy

### Max Response Length
300 lines of SQL and configuration.

## Workflow

### Step 1: Schema Design
Normalize to 3NF by default. Denormalize only for read-heavy analytical queries. Every table needs a primary key (UUID or BIGSERIAL). Foreign keys with indexes on referencing columns. Naming: `snake_case` for tables, columns, indexes; `uq_` unique, `ix_` index, `fk_` foreign key, `pk_` primary key. Use CHECK constraints for domain integrity. Use ENUM or reference tables for constrained values.

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status customer_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Step 2: Indexing Strategy
B-tree: default for equality and range queries on high-cardinality columns. GiST: full-text search, geometric data, range type overlap. GIN: JSONB, array containment, full-text search tsvector. BRIN: large sequential tables where rows are physically ordered (time-series). Partial indexes for filtered queries. Composite indexes with leading column matching the most selective filter. Covering indexes (INCLUDE columns) for index-only scans. Avoid over-indexing on write-heavy tables.

```sql
-- B-tree composite: equality then range
CREATE INDEX ix_orders_customer_created
    ON orders (customer_id, created_at DESC);

-- Partial: only active orders
CREATE INDEX ix_orders_active
    ON orders (created_at DESC)
    WHERE status = 'pending';

-- GIN: JSONB path operations
CREATE INDEX ix_products_attrs
    ON products USING GIN (attributes jsonb_path_ops);

-- BRIN: time-series with 100000 block range
CREATE INDEX ix_events_ts
    ON events USING BRIN (occurred_at)
    WITH (pages_per_range = 100000);
```

### Step 3: Partitioning
Range partition by date for time-series data. List partition by category/region. Hash partition for load balancing when no natural partition key. Sub-partitioning for multi-dimensional data. Each partition is a table — indexes must be created per partition or on parent (PG 12+). Partition pruning requires WHERE clause on partition key. Avoid too many partitions (>1000).

```sql
CREATE TABLE events (
    id BIGSERIAL, occurred_at TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL, payload JSONB
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2025_q1 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE events_2025_q2 PARTITION OF events
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
```

### Step 4: Replication
Streaming replication: primary ships WAL to standbys. Synchronous for zero data loss (2 safe). Asynchronous for performance (slight lag). Cascading replication for geographic distribution. Logical replication: publish/subscribe at table level, cross-version compatible, supports selective replication. Conflict resolution for bidirectional: last-write-wins or custom handler.

```yaml
# postgresql.conf streaming replication
wal_level: replica
max_wal_senders: 10
wal_keep_size: 1024  # MB
synchronous_standby_names: 'FIRST 2 (standby1, standby2)'
```

### Step 5: Connection Pooling
PgBouncer in transaction mode (default). Pool size = max_connections * 0.9 / pool_mode_transaction. Reserve pools for admin connections. Statement mode only for prepared-statement-free workloads. Session mode for session-scoped features (LISTEN/NOTIFY, temp tables). Configure timeouts to prevent idle consumption.

```yaml
# pgbouncer.ini
[databases]
* = host=localhost port=5432

[pgbouncer]
pool_mode: transaction
default_pool_size: 25
max_client_conn: 200
reserve_pool_size: 5
reserve_pool_timeout: 5.0
server_idle_timeout: 300
client_idle_timeout: 600
```

### Step 6: Query Optimization
EXPLAIN ANALYZE to find seq scans, nested loops, sorts. Identify: sequential scans on large tables, nested loop joins without indexes, excessive tuple deformations, temp file sorts. CTE optimization: PG 12+ inlines CTEs automatically when no side effects; use `MATERIALIZED` or `NOT MATERIALIZED` to control. Window functions: prefer ROWS frame over RANGE for performance; filter early with subqueries.

```sql
-- Check for sequential scans
EXPLAIN (ANALYZE, BUFFERS, TIMING) SELECT * FROM orders
WHERE customer_id = 'abc' AND created_at > '2025-01-01';

-- CTE with explicit materialization control
WITH filtered AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE status = 'shipped'
)
SELECT customer_id, COUNT(*) FROM filtered
WHERE total > 100
GROUP BY customer_id;
```

### Step 7: Transaction Isolation
READ COMMITTED: default PostgreSQL, row-level lock only for concurrent writes. REPEATABLE READ: snapshot isolation, no dirty/non-repeatable reads, serialization failures on conflict. SERIALIZABLE: true serial execution, highest overhead, retry on 40001. Snapshot isolation in PostgreSQL prevents read-write conflicts that InnoDB allows. Use explicit locks (SELECT FOR UPDATE) sparingly and always with NOWAIT or SKIP LOCKED.

```sql
-- Safe concurrent counter with SKIP LOCKED
UPDATE counters SET value = value + 1
WHERE id = 'xyz'
RETURNING value;

-- SKIP LOCKED for job queues
BEGIN;
SELECT * FROM jobs
WHERE status = 'pending'
ORDER BY priority DESC
LIMIT 10
FOR UPDATE SKIP LOCKED;
-- process jobs...
COMMIT;
```

### Step 8: Migration Management
Tools: Alembic (Python), Flyway (Java), Sqitch (language-agnostic), Liquibase (XML/YAML/JSON). Principles: every migration has forward and rollback script; migrations are idempotent; never modify existing migrations after merge; test migrations against a copy of production data. Zero-downtime migrations require additive schema changes (new columns nullable, backfill, then add NOT NULL). Avoid long-running locks by using `CREATE INDEX CONCURRENTLY` and `ALTER TABLE ... SET NOT NULL` with low lock timeouts.

```sql
-- Safe index creation without blocking writes
CREATE INDEX CONCURRENTLY ix_orders_new
    ON orders (customer_id, created_at DESC);

-- Safe NOT NULL addition (requires valid data first)
ALTER TABLE orders VALIDATE CONSTRAINT orders_discount_not_null;
```

### Step 9: Monitoring and Observability
pg_stat_statements for query performance tracking. pg_stat_activity for active connections and long-running queries. auto_explain for logging slow queries automatically. pg_stat_bgwriter for checkpoint and buffer management. pg_stat_replication for replication lag monitoring. Set up alerting for: replication lag > 10 seconds, long-running queries > 30 seconds, deadlocks, connection pool exhaustion, WAL generation rate spikes.

```sql
-- Long running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND now() - pg_stat_activity.query_start > interval '30 seconds'
ORDER BY duration DESC;

-- Replication lag
SELECT application_name, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

### Step 10: Backup and Point-in-Time Recovery
WAL archiving enables PITR to any point in time between the base backup and the last archived WAL. Configure `archive_mode = on` and `archive_command` to copy completed WAL segments to durable storage. Use `pg_basebackup` for physical base backups. Test recovery by restoring to a separate instance and running consistency checks. Retention policy varies: 7-30 days of PITR for most production systems, longer for compliance. Barman, pgBackRest, and WAL-G provide enterprise backup management.

```sql
-- Enable WAL archiving (postgresql.conf)
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
archive_timeout = 60

-- Take base backup
-- pg_basebackup -D /backup/base/$(date +%Y%m%d) -X stream -P -v
```

### Step 11: Distributed SQL Databases
CockroachDB, YugabyteDB, and Google Spanner are distributed SQL databases providing horizontal scalability and global replication with ACID transactions and PostgreSQL-compatible SQL.

CockroachDB is a cloud-native distributed SQL database on a transactional key-value store with Raft consensus. Auto-replicates across nodes/regions with configurable replication factor. Provides serializable isolation, online schema changes (no locks), and geo-partitioning for data residency. Use for multi-region deployments needing strong consistency, SaaS apps needing horizontal scale without manual sharding.

YugabyteDB is a distributed SQL database compatible with PostgreSQL (query layer) via a distributed document store (DocDB) using Raft. Supports hash and range sharding, geo-distributed deployment with zone-aware replicas, and read replicas. Use for PG-compatible workloads needing horizontal write scaling, IoT/time-series with geo-distribution.

```sql
-- CockroachDB: geo-partitioned table
CREATE TABLE user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region STRING NOT NULL, name STRING, data JSONB
) PARTITION BY LIST (region) (
  PARTITION us_east VALUES IN ('us-east-1'),
  PARTITION eu_west VALUES IN ('eu-west-1')
);
ALTER PARTITION us_east OF TABLE user_data
  CONFIGURE ZONE USING constraints = '[+region=us-east-1]';
```

### Step 12: Google Cloud Spanner
Spanner is a globally-distributed, strongly consistent relational database from Google Cloud. Combines relational (ACID, SQL) with NoSQL horizontal scalability. Uses TrueTime (GPS + atomic clocks) for external consistency across global deployments. Key features: interleaved tables (parent-child row locality), automatic sharding, global secondary indexes with consistent reads, multi-region instances. Use for global-scale apps needing strong consistency, financial systems with cross-region ACID, or OLTP that has outgrown single-region databases.

```sql
CREATE TABLE orders (
  id INT64 NOT NULL, customer_id INT64 NOT NULL,
  total NUMERIC NOT NULL, created_at TIMESTAMP NOT NULL
) PRIMARY KEY (id, created_at);

CREATE TABLE order_items (
  order_id INT64 NOT NULL, item_id INT64 NOT NULL,
  product_id INT64 NOT NULL, quantity INT64 NOT NULL,
  CONSTRAINT FK_order_items FOREIGN KEY (order_id) REFERENCES orders (id)
) PRIMARY KEY (order_id, item_id),
  INTERLEAVE IN PARENT orders ON DELETE CASCADE;
```

## Rules
- Normalize to 3NF, denormalize only for specific read-heavy use cases
- Index every foreign key column
- Use UUID primary keys for distributed systems, BIGSERIAL for monolithic
- EXPLAIN ANALYZE before adding any index to confirm necessity
- B-tree for most queries, GIN for JSONB/arrays, BRIN for time-series
- Partition tables over 100 GB or 50 million rows
- Streaming replication for HA, logical replication for data integration
- PgBouncer transaction mode as default connection pool
- Set autovacuum thresholds per table based on write volume
- Use SKIP LOCKED for job queues to prevent deadlocks
- No DDL in transactions — use versioned migration tools
- Every migration must have a rollback script

## References
  - references/cockroachdb-yugabyte.md — CockroachDB and YugabyteDB Operational Guide
  - references/database-indexing.md — Database Indexing Reference
  - references/database-migration-strategies.md — Database Migration Strategies Reference
  - references/distributed-sql-databases.md — Distributed SQL Databases
  - references/postgres-advanced.md — PostgreSQL Advanced Internals
  - references/query-optimization.md — Query Optimization
## Handoff
`data-etl-pipeline` for loading data into relational schemas
`data-data-warehouse` for dimensional modeling from relational sources
