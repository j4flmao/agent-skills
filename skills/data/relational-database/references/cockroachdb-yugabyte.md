# CockroachDB and YugabyteDB Operational Guide

## CockroachDB

### Deployment Topology
```yaml
# Multi-region deployment (3 regions, 3 nodes each)
regions:
  - name: us-east-1
    nodes: 3
    zones: [us-east-1a, us-east-1b, us-east-1c]
  - name: eu-west-1
    nodes: 3
    zones: [eu-west-1a, eu-west-1b, eu-west-1c]
  - name: ap-southeast-1
    nodes: 3
    zones: [ap-southeast-1a, ap-southeast-1b, ap-southeast-1c]

survival_goal: region  # Survive entire region failure
```

### Online Schema Changes
CockroachDB supports online schema changes without locking:
```sql
-- Add column (non-blocking, backfill in background)
ALTER TABLE orders ADD COLUMN discount DECIMAL(5,2) DEFAULT 0.00;

-- Add index (non-blocking, like CREATE INDEX CONCURRENTLY in PG)
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- Change primary key (requires backfill)
ALTER TABLE orders ALTER PRIMARY KEY USING COLUMNS (id, tenant_id);
```

### Backup and Restore
```sql
-- Full cluster backup to S3
BACKUP INTO 's3://backups/cockroachdb?AWS_ACCESS_KEY_ID=...&AWS_SECRET_ACCESS_KEY=...';

-- Incremental backup (after initial full backup)
BACKUP INTO LATEST IN 's3://backups/cockroachdb?...';

-- Point-in-time restore
RESTORE FROM LATEST IN 's3://backups/cockroachdb?...'
  AS OF SYSTEM TIME '2024-05-01 12:00:00+00:00';
```

---

## YugabyteDB

### Multi-Zone Deployment
```yaml
# RF-3 cluster across 3 availability zones
yb_servers:
  - cloud: aws
    region: us-east-1
    zone: us-east-1a
  - cloud: aws
    region: us-east-1
    zone: us-east-1b
  - cloud: aws
    region: us-east-1
    zone: us-east-1c

replication_factor: 3
```
### Colocated Tables
For small tables (< 10 GB), use colocation to avoid tablet overhead:
```sql
CREATE TABLE lookup_table (
    code TEXT PRIMARY KEY,
    description TEXT
) WITH (colocated = true);
```

### Read Replicas
```sql
-- Add read replicas in remote regions for low-latency reads
ALTER TABLE orders ADD REPLICA PLACEMENT '{
  "num_replicas": 2,
  "cloud": "aws",
  "region": "eu-west-1"
}';
```

### Performance Monitoring
```sql
-- Slow queries (YugabyteDB)
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Tablet distribution
SELECT tablet_id, table_name, partition_key_start, partition_key_end
FROM yb_tablets
WHERE table_name = 'orders';
```

## Migration from PostgreSQL

| PostgreSQL | CockroachDB | YugabyteDB |
|-----------|-------------|------------|
| Serializable isolation | Serializable (SSI) | Serializable (SSI) |
| Sequence | Sequences (multi-region) | Sequences |
| Triggers | Not supported | Supported |
| Stored procedures | Supported (PL/pgSQL) | Supported |
| Foreign keys | Supported (cross-range) | Supported |
| Row-level locks | Supported (optimistic) | Supported |

### Migration Tooling
```bash
# CockroachDB: import from PostgreSQL dump
cockroach workload pgdump --url="postgres://user:pass@pg-host:5432/db" --out=./dump.sql
cockroach sql --url="cockroachdb://..." --file=./dump.sql

# YugabyteDB: yb-voyager for assessment and migration
yb-voyager assess migration --source-db-type postgresql --source-db-host pg-host ...
yb-voyager export schema --export-dir /tmp/export --source-db-host pg-host ...
yb-voyager import schema --target-db-host yb-host ...
yb-voyager import data --target-db-host yb-host ...
```

## Operational Differences

| Operation | CockroachDB | YugabyteDB |
|-----------|-------------|------------|
| Rolling upgrade | `cockroach upgrade` | `yb-ctl restart_node` |
| Rebalance time | Minutes after node change | Minutes after node change |
| Disk failure | Range re-replicates | Tablet re-replicates |
| Decommission | `cockroach node decommission` | `yb-ts-cli set_server_offline` |
| Monitoring | DB Console (built-in) | YugabyteDB Anywhere |
| WAL archiving | `BACKUP` into S3 | Snapshots to S3 |
