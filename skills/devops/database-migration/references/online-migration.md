# Online Database Migration

## CDC-Based Live Migration

| Tool | Source Support | Target Support | Latency |
|------|---------------|----------------|---------|
| AWS DMS | MySQL, PG, Oracle, SQL Server, MongoDB | RDS, Aurora, S3, Redshift | <1s |
| Debezium | MySQL, PG, MongoDB, SQL Server, Oracle | Kafka, Pulsar | <100ms |
| Azure DMS | SQL Server, MySQL, PG | Azure SQL, Azure DB | <1s |
| Striim | 100+ sources | Cloud DBs, data warehouses | <1s |
| Qlik Replicate | Multiple DBs | Multiple targets | <1s |

## Dual-Writes Pattern

```
Phase 1: Deploy dual-write code
  Application writes to both source AND target DB
  Read from source only
  Monitor write success rate

Phase 2: Validation
  Background job compares source vs target
  Fix discrepancies via backfill

Phase 3: Switch reads
  Application reads from target
  Write to both (source + target)
  Monitor read performance

Phase 4: Stop writes to source
  Write to target only
  Source becomes read-only (fallback)

Phase 5: Decommission source
  Remove dual-write code
  Archive source DB
```

| Phase | Duration | Risk |
|-------|----------|------|
| 1 | 1-2 sprints | Low (source still primary) |
| 2 | 1 week | Low (async comparison) |
| 3 | 1 day | Medium (read behavior change) |
| 4 | 1 day | Low (source still available) |
| 5 | 1 sprint | Low (source archived) |

## Replication Lag Monitoring

```sql
-- PostgreSQL: check replication lag
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- MySQL: check replica lag
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master

-- AWS DMS: check task latency
aws dms describe-replication-tasks --query 'ReplicationTasks[*].{Status:Status,LastStopTime:ReplicationTaskStats.LastStopTime,FullLoadProgress:ReplicationTaskStats.FullLoadProgressPercent}'
```

## Rollback During CDC

```sql
-- Stop CDC replication
-- Source DB still has all data
-- Configure reverse CDC (target → source)
-- Point application back to source
-- Resolve any data conflicts from dual-writes
```

## Schema Migration with CDC

```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Step 2: Wait for CDC schema propagation
-- (DMS may require task restart for schema changes)

-- Step 3: Backfill data
UPDATE users SET email_verified = TRUE WHERE email_confirmed_at IS NOT NULL;

-- Step 4: Start using new column in application
-- (Old column still maintained for fallback)

-- Step 5: Drop old column after stabilization
ALTER TABLE users DROP COLUMN email_confirmed_at;
```
