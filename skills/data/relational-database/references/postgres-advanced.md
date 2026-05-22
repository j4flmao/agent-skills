# PostgreSQL Advanced Internals

## MVCC (Multi-Version Concurrency Control)

PostgreSQL keeps multiple row versions (tuples). Each transaction sees a snapshot from its start time. Tuple has `xmin` (creating XID), `xmax` (deleting XID), `ctid` (physical location), `t_ctid` (next version pointer).

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT * FROM accounts WHERE id = 1;  -- snapshot
-- concurrent update commits
SELECT * FROM accounts WHERE id = 1;  -- same snapshot
COMMIT;
```

## WAL (Write-Ahead Log)

Every change writes to WAL before data files — enables crash recovery and replication.

```yaml
wal_level: replica
fsync: on
synchronous_commit: on
wal_buffers: 64MB
max_wal_size: 4GB
min_wal_size: 1GB
```

```sql
SELECT pg_current_wal_lsn();
SELECT * FROM pg_stat_wal;
SELECT archived_count, last_archived_wal FROM pg_stat_archiver;
```

## Vacuum and Autovacuum

Vacuum reclaims dead tuple space. Autovacuum automates this.

```sql
VACUUM accounts;
VACUUM FULL accounts;    -- exclusive lock, returns space to OS
ANALYZE accounts;
VACUUM VERBOSE ANALYZE accounts;
```

```yaml
autovacuum: on
autovacuum_max_workers: 3
autovacuum_naptime: 1min
autovacuum_vacuum_threshold: 50
autovacuum_vacuum_scale_factor: 0.2
```

```sql
ALTER TABLE orders SET (
    autovacuum_vacuum_threshold = 1000,
    autovacuum_vacuum_scale_factor = 0.05
);

SELECT schemaname, relname, n_live_tup, n_dead_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

## Replication

### Streaming Replication
```yaml
# Primary
wal_level: replica
max_wal_senders: 10
wal_keep_size: 1024
hot_standby: on
```

```yaml
# Standby
hot_standby: on
primary_conninfo: host=primary-host port=5432 user=replicator
primary_slot_name: standby1
```

```bash
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -P -v --wal-method=stream
```

### Logical Replication
```sql
-- Publisher
CREATE PUBLICATION orders_pub FOR TABLE orders, customers;

-- Subscriber
CREATE SUBSCRIPTION orders_sub
    CONNECTION 'host=primary-host port=5432 dbname=mydb'
    PUBLICATION orders_pub;
```

## Partitioning

```sql
-- Detach and drop old partition
ALTER TABLE events DETACH PARTITION events_2020;
DROP TABLE events_2020;

-- Attach new partition
CREATE TABLE events_2025_q3 PARTITION OF events
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

EXPLAIN SELECT * FROM events WHERE occurred_at >= '2025-08-01';
```

## Indexing Strategies

### B-tree
```sql
CREATE INDEX ix_orders_customer_status_date
    ON orders (customer_id, status, created_at DESC);

CREATE INDEX ix_users_active ON users (last_login) WHERE status = 'active';

CREATE INDEX ix_orders_customer ON orders (customer_id) INCLUDE (total, status);
```

### GiST, GIN, BRIN
```sql
CREATE INDEX ix_reservations_during ON reservations USING GIST (during);
SELECT * FROM reservations WHERE during && '[2025-03-01, 2025-03-31]'::tsrange;

CREATE INDEX ix_products_attrs ON products USING GIN (attributes);
SELECT * FROM products WHERE attributes @> '{"color": "red"}'::jsonb;

CREATE INDEX ix_logs_ts ON logs USING BRIN (created_at) WITH (pages_per_range = 32);
```

## PgBouncer

```yaml
[databases]
* = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_port: 6432
auth_type: scram-sha-256
pool_mode: transaction
default_pool_size: 25
max_client_conn: 200
server_idle_timeout: 300
query_timeout: 30
```

### Monitoring Commands
```sql
SHOW POOLS;
SHOW STATS;
SHOW CLIENTS;
SHOW SERVERS;
```

## References
- PostgreSQL docs: https://www.postgresql.org/docs/current/
- PgBouncer config: https://www.pgbouncer.org/config.html
