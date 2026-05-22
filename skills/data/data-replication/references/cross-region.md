# Cross-Region Replication Reference

## Latency and Consistency

### Network Latency Between Regions
```
Regions                     RTT (p95)      Bandwidth
us-east-1 <-> us-west-2     60-80ms        10-25 Gbps
us-east-1 <-> eu-west-1     80-100ms       5-10 Gbps
us-east-1 <-> eu-central-1   90-120ms       5-10 Gbps
us-east-1 <-> ap-southeast-1 180-250ms      2-5 Gbps
us-east-1 <-> ap-northeast-1 150-200ms      2-5 Gbps
us-east-1 <-> sa-east-1      140-180ms      2-5 Gbps

Cross-cloud (aws -> azure):
  us-east-1 (AWS) <-> eastus (Azure): 2-5ms (Direct Connect)
  Without DX: 10-50ms via internet
```

### Consistency Models
```
Strong consistency (sync replication):
  - Write must be ack'd by all or majority of replicas before commit
  - Latency = local commit + max(RTT to replicas) + fsync
  - Not practical for cross-region (100-250ms per write)
  - Use: same-region only

Read-your-writes consistency:
  - After write, subsequent reads from same client see the write
  - Implementation: session stickiness to primary + local replica
  - Or: read-after-write delay (wait N ms before reading from replica)

Eventual consistency (async replication):
  - Replica may lag behind primary by seconds to minutes
  - Default model for cross-region async replication
  - Acceptable for: analytics, reporting, non-transactional reads

Monotonic reads:
  - Once client reads a value, subsequent reads are >= that value
  - Implementation: stickiness to same replica across session
```

## Failover Procedures

### Active-Passive Failover
```
Phase 1 - Detection:
  - Health check every 5s (SELECT 1 or database ping)
  - 3 consecutive failures = suspected down
  - 2nd opinion: check from different region

Phase 2 - Decision:
  - Is primary actually down? (network partition vs node crash)
  - Do we have quorum? (majority of monitors agree)
  - Is the standby healthy? (replication lag, data integrity)
  - Decision: initiate failover

Phase 3 - Promotion:
  - Stop accepting writes on old primary (fence: firewall block)
  - Promote standby: SELECT pg_promote() / SET ACTIVE
  - Wait for promotion to complete (seconds)
  - Verify: can read latest committed data

Phase 4 - Reroute:
  - Update DNS CNAME (TTL 60s, point to new primary)
  - Or update connection string in app config
  - Or update load balancer target group
  - Wait for DNS propagation (5-10min with 60s TTL)

Phase 5 - Recovery:
  - Old primary comes back online
  - Do NOT auto-promote (risk of split-brain)
  - Rebuild old primary as replica of new primary
  - Verify data consistency (row count, checksum)
```

### GoldenGate for Cross-Region

```
GoldenGate architecture:
  Source DB -> Extract (redo logs) -> Trail files -> Pump (async, TCP) -> Trail files -> Replicat -> Target DB

Oracle GoldenGate:
  Extract:   reads redo logs, captures committed transactions
  Pump:      sends trail files across network (compressed, encrypted)
  Replicat:  applies trail to target DB (batched, parallel)
  Trail:     intermediate files (./dirdat/xx000000, roll at configurable size)

  Config files:
    extract.prm:  EXTRACT ext_src, USERIDALIAS src, EXTTRAIL ./dirdat/xx
    pump.prm:     EXTRACT pump_src, RMTHOST target.com, MGRPORT 7809, RMTTRAIL ./dirdat/yy
    replicat.prm: REPLICAT rep_tgt, USERIDALIAS tgt, ASSUMETARGETDEFS, MAP src.orders, TARGET tgt.orders

  Conflict resolution:
    RESOLVECONFLICT (APPENDROWS, UPDATEROWEXISTS, UPDATEROWMISSING, DELETEROWEXISTS, DELETEROWMISSING)
    Each conflict type has separate resolution rule

  Monitoring:
    GGSCI> INFO ALL                     (manager, extract, replicat status)
    GGSCI> LAG EXTRACT ext_src          (seconds behind source)
    GGSCI> STATS REPLICAT rep_tgt       (rows inserted/updated/deleted)
```

## Read Replica Scaling

### Topology
```
                +-----------+
                | Primary   |  (us-east-1, writes only)
                +-----+-----+
                      |
           +----------+----------+
           |                     |
   +-------v-------+     +-------v-------+
   | Replica 1     |     | Replica 2     |  (same region, local reads)
   | az=us-east-1a |     | az=us-east-1b |
   +-------+-------+     +-------+-------+
           |                      |
   +-------v-------+     +-------v-------+
   | Replica 3     |     | Replica 4     |  (cross-region, remote reads)
   | region=eu-w-1 |     | region=ap-s-1 |
   +---------------+     +---------------+

  Routing:
    Write: always go to primary (region A)
    Local reads: go to replicas 1, 2 (same region, <1ms)
    Remote reads: go to replicas 3, 4 (cross-region, reads only)
```

### Load Balancing Config

```yaml
# ProxySQL configuration (read-write split)
mysql_servers:
  - { host: primary.int, port: 3306, hostgroup: 0, weight: 100 }   # write
  - { host: replica1.int, port: 3306, hostgroup: 1, weight: 100 }  # read
  - { host: replica2.int, port: 3306, hostgroup: 1, weight: 100 }  # read

mysql_query_rules:
  - { rule_id: 1, match: "^SELECT .* FOR UPDATE", destination_hostgroup: 0 }
  - { rule_id: 2, match: "^SELECT ", destination_hostgroup: 1 }
  - { rule_id: 3, match: ".*", destination_hostgroup: 0 }
```

### Lag Management

```sql
-- MySQL: check replication lag
SHOW REPLICA STATUS\G
-- Second_Behind_Master: 0 (synced), > 30 = alert

-- PostgreSQL: check replication lag
SELECT
  pid,
  application_name,
  pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) / 1024 / 1024 AS lag_mb,
  state
FROM pg_stat_replication;

-- Route read-after-write to primary if lag is critical
-- Application pattern:
def query_user(user_id):
    if last_write_user == user_id and time_since_write < 5:
        return query_primary(f"SELECT * FROM users WHERE id = {user_id}")
    else:
        return query_replica(f"SELECT * FROM users WHERE id = {user_id}")
```

## DR Plan Template

```
Recovery Plan: sales-db-multi-region
====================================
Primary:     us-east-1 (prod-db-primary.internal)
Standby:     eu-west-1 (prod-db-standby.internal)
Replication: async streaming, target lag < 5s

Failover triggers:
  - Primary health check fails 3/3 attempts
  - Cross-region health check confirms primary unreachable
  - RDS/Aurora auto-failover triggers (for managed DB)

Steps:
  1. Confirm primary is down (ssh + pg_isready + app check)
  2. Set primary to read-only: ALTER SYSTEM SET transaction_read_only = on;
  3. Promote standby: SELECT pg_promote();
  4. Verify promotion: SELECT pg_is_in_recovery() -> false
  5. DNS: change CNAME prod-db -> prod-db-standby.eu-west-1
  6. Wait TTL (60s) + propagation buffer (5min)
  7. App validation: run canary SELECT 1 + SELECT COUNT(*) FROM orders
  8. Communication: notify stakeholders of failover

Fallback (planned):
  1. Rebuild old primary as replica (pg_basebackup or pg_rewind)
  2. Verify replication lag = 0
  3. Reverse failover: promote old primary, demote current primary
  4. DNS: change CNAME back to prod-db-primary

DR test schedule:
  - Quarterly: failover + run for 24h
  - Semi-annual: switchback test
  - Annual: full DR drill with simulated region outage
```
