# Relational Database High Availability

## Overview

High availability (HA) for relational databases ensures that data remains accessible and durable during failures, maintenance, and disasters. This reference covers HA architectures, replication strategies, failover mechanisms, and operational procedures for PostgreSQL and MySQL-based systems.

## HA Architecture Patterns

### Active-Passive (Primary-Standby)

```
                 ┌──────────┐
                 │  Client   │
                 │  Traffic  │
                 └────┬─────┘
                      │
                 ┌────▼─────┐
                 │  HAProxy  │
                 │ /VIP:5432 │
                 └────┬─────┘
                      │
           ┌──────────┼──────────┐
           │          │           │
     ┌─────▼────┐ ┌──▼───┐ ┌───▼───┐
     │ Primary  │ │Sync  │ │Async  │
     │ (active) │ │Stby1 │ │Stby2  │
     └─────┬────┘ └──────┘ └───────┘
           │ WAL streaming
```

Characteristics:
- Primary handles all writes
- Standbys receive WAL changes in real-time
- Failover promotes one standby to primary
- RPO: 0 (sync) or < 1MB (async)
- RTO: 30-120 seconds with automation

### Active-Active (Multi-Primary)

```
┌──────────┐            ┌──────────┐
│   DC-1   │  logical   │   DC-2   │
│ Primary  │◄──────────►│ Primary  │
└────┬─────┘ replication└────┬─────┘
     │                        │
┌────▼────┐             ┌────▼────┐
│  App    │             │  App    │
│ Writes  │             │ Writes  │
└─────────┘             └─────────┘
```

Characteristics:
- Each node accepts writes
- Logical replication syncs changes bidirectionally
- Conflict resolution: last-write-wins, custom, or application-managed
- RPO: near-zero
- RTO: seconds (no failover needed, just reroute)

### Geo-Distributed

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   us-east   │    │  eu-west    │    │  ap-southeast│
│  Primary    │───►│  Standby    │───►│  Standby    │
│  (write)    │    │  (read)     │    │  (read)     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                   │
   ┌───┴───┐          ┌───┴───┐           ┌───┴───┐
   │ App   │          │ App   │           │ App   │
   │ WO    │          │ RO    │           │ RO    │
   └───────┘          └───────┘           └───────┘
```

Characteristics:
- Primary region handles all writes
- Other regions have read replicas with local latency
- Cross-region replication lag: 0.5-5 seconds
- Failover promotes closest region if primary goes down
- RPO: < 1 second (sync between regions) or async
- RTO: 1-5 minutes for regional failover

## Streaming Replication Deep Dive

### PostgreSQL Streaming Replication Setup

```yaml
# Primary postgresql.conf
wal_level: replica
max_wal_senders: 10
wal_keep_size: 1024  # MB, or use replication slots
max_replication_slots: 10
hot_standby: on

# primary pg_hba.conf
host replication replicator standby1.ip/32 md5
host replication replicator standby2.ip/32 md5
```

```bash
# Standby setup
pg_basebackup -h primary -D /var/lib/postgresql/data \
    -U replicator -X stream -P -v

# standby.signal file (PG 12+)
touch /var/lib/postgresql/data/standby.signal

# Standby postgresql.conf
primary_conninfo = 'host=primary port=5432 user=replicator password=xxx'
primary_slot_name = 'standby1'
hot_standby = on
```

### Synchronous vs Asynchronous Replication

```yaml
# Synchronous: primary waits for standby confirmation
# RPO = 0 (no data loss on primary failure)
synchronous_standby_names = 'FIRST 2 (standby1, standby2)'
synchronous_commit = 'on'

# Asynchronous: primary does not wait
# Best performance, slight lag
synchronous_commit = 'off'

# Remote write: confirmed by OS but not flushed to disk on standby
synchronous_commit = 'remote_write'

# Remote apply: standby has applied the transaction
synchronous_commit = 'remote_apply'
```

Trade-offs:
| Mode | Data Loss | Primary Performance | Standby Query Lag |
|---|---|---|---|
| off | Up to WAL segments | Best | Higher |
| on | Zero (with sync standby) | Reduced | Low to zero |
| remote_write | Very low | Good | Very low |
| remote_apply | Zero | Reduced (same as on) | Zero |

### Replication Slot Management

```sql
-- Create replication slot
SELECT pg_create_physical_replication_slot('standby1');

-- Monitor slot activity
SELECT slot_name, slot_type, active,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS restart_lag,
       pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS flush_lag
FROM pg_replication_slots;

-- WARNING: unused slots prevent WAL cleanup, can fill disk!
-- Monitor slot lag and alert if > threshold
```

## Logical Replication

### Setup

```sql
-- Publisher (source)
CREATE PUBLICATION orders_pub FOR TABLE orders, order_items;
CREATE PUBLICATION customers_pub FOR TABLE customers
    WHERE (status = 'active');  -- filtered publication

-- Subscriber (target)
CREATE SUBSCRIPTION orders_sub
    CONNECTION 'host=primary dbname=proddb user=replicator'
    PUBLICATION orders_pub, customers_pub;
```

### Use Cases

1. **Upgrade with minimal downtime**: logical replication between PG 15 and PG 16 during upgrade.
2. **Data distribution**: subset of tables replicated to analytics database.
3. **Cross-version replication**: PG 14 primary → PG 16 standby.
4. **Bidirectional replication**: two primaries with conflict resolution.
5. **Zero-downtime migration**: replicate to new server, switch application.

### Conflict Resolution

```yaml
# Logical replication conflicts occur when same row modified on subscriber
# PostgreSQL 15+ subcriber options:
conflict_resolution: 'apply'      # last-write-wins (default)
conflict_resolution: 'skip'       # skip conflicting changes
conflict_resolution: 'error'      # stop subscription (old default)

# Monitor conflicts
SELECT * FROM pg_stat_subscription_worker;
```

## Failover and Switchover

### Automated Failover with Patroni

```yaml
# patroni.yml
scope: orders-db
namespace: /service/
name: pg-primary

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.1:8008
  authentication:
    username: patroni
    password: xxx

etcd:
  hosts:
    - 10.0.0.10:2379
    - 10.0.0.11:2379
    - 10.0.0.12:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_log_hints: "on"

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.1:5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/15/bin
  authentication:
    superuser:
      username: postgres
      password: xxx
    replication:
      username: replicator
      password: xxx
  parameters:
    unix_socket_directories: /var/run/postgresql
  use_pg_rewind: true
  use_slots: true

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

### Failover Procedure Manual

```bash
# Check current primary
patronictl -c patroni.yml list

# Manual switchover (planned maintenance)
patronictl -c patroni.yml switchover --master pg-primary --candidate pg-standby1

# Failover (emergency, no candidate)
patronictl -c patroni.yml failover --master pg-primary

# Post-failover: verify new primary
patronictl -c patroni.yml list
```

## Connection Management

### HAProxy for Database Load Balancing

```haproxy
# haproxy.cfg
frontend pg_frontend
    bind *:5432
    mode tcp
    option tcplog
    default_backend pg_backend

backend pg_backend
    mode tcp
    option httpchk OPTIONS /master
    option tcp-check
    balance roundrobin
    default-server inter 3s fall 3 rise 2

    server pg-primary 10.0.0.1:5432 check port 8008
    server pg-standby1 10.0.0.2:5432 check port 8008
    server pg-standby2 10.0.0.3:5432 check port 8008
```

### Connection Pool Failover

```yaml
# pgbouncer.ini with multiple backends
[databases]
proddb = host=pg-primary host=pg-standby1 host=pg-standby2 \
         port=5432 dbname=proddb \
         auth_user=pgbouncer
```

## Backup and Point-in-Time Recovery

### WAL Archiving Setup

```bash
# Archive command with WAL-G
archive_command = 'wal-g wal-push %p'
archive_mode = on
archive_timeout = 60

# Restore command
restore_command = 'wal-g wal-fetch %f %p'
```

### PITR Recovery Procedure

```bash
# 1. Stop PostgreSQL
systemctl stop postgresql

# 2. Restore base backup
wal-g backup-fetch /var/lib/postgresql/data LATEST

# 3. Configure recovery.conf (PG 11 and earlier) or
#    create recovery.signal (PG 12+)
touch /var/lib/postgresql/data/recovery.signal

# 4. Set recovery target
# postgresql.conf (temporary):
recovery_target_time = '2026-05-22 14:30:00 UTC'
recovery_target_action = 'pause'

# 5. Start PostgreSQL — it will replay WAL to target time
systemctl start postgresql

# 6. Verify data
# 7. Resume recovery or promote
SELECT pg_wal_replay_resume();
-- or promote directly:
SELECT pg_promote();
```

### Backup Retention Strategy

```yaml
backup_strategy:
  tool: pgBackRest
  retention:
    full: 4  # keep 4 full backups
    differential: 14  # keep 14 days of differentials
    incremental: 7  # keep 7 days of incrementals
  schedule:
    full: weekly (Sunday)
    differential: daily
    incremental: every 6 hours
  archive:
    wal_retention_days: 30
  verification:
    test_restore: monthly
    consistency_check: weekly
```

## Health Checks and Monitoring

### HA Health Check Queries

```sql
-- Is this node the primary?
SELECT pg_is_in_recovery();

-- Current WAL position
SELECT pg_current_wal_lsn(), pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();

-- Replication lag (apply delay)
SELECT application_name,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       now() - pg_last_xact_replay_timestamp() AS lag_time
FROM pg_stat_replication;

-- Standby lag
SELECT application_name,
       state,
       sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), write_lag) AS write_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lag) AS flush_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lag) AS replay_lag_bytes
FROM pg_stat_replication;
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|---|---|---|---|
| Replication lag (bytes) | > 100MB | > 1GB | Check network, standby resources |
| Replication lag (time) | > 10 seconds | > 60 seconds | Check WAL archiving, standby CPU |
| Standby count | < 2 | 0 | Add standby |
| Connection count | > 80% of max | > 95% of max | Scale pool, check connection leaks |
| Transaction age | > 5 minutes | > 15 minutes | Check for long-running transactions |
| Deadlock rate | > 1/hour | > 10/hour | Review application locking |
| Checkpoint frequency | < 5 min | < 1 min | Increase max_wal_size |

## Disaster Recovery Testing

### Recovery Drill Template

```
Objective: Test cross-region failover
Expected RTO: 5 minutes
Expected RPO: < 10 seconds

1. Pre-flight check (15 min)
   ├── Verify backups exist
   ├── Verify WAL archive is accessible from DR region
   ├── Verify DNS records for DR
   └── Notify stakeholders

2. Execute failover (5 min)
   ├── Promote DR standby to primary
   ├── Update DNS/VIP
   ├── Verify application connectivity
   └── Validate data integrity

3. Post-flight (15 min)
   ├── Run data reconciliation
   ├── Verify all tables accessible
   ├── Run application smoke tests
   └── Document issues found

4. Failback (as needed)
   ├── Restore original region as standby
   ├── Resync from new primary
   └── If needed, reverse failover
```

## HA for Different Scales

### Small Deployment (< 500 GB, < 100 QPS)

```
Patroni + 2 nodes (primary + async standby)
- PgBouncer local to application
- WAL-G for backups
- RTO: 2 minutes
- RPO: < 1 MB
```

### Medium Deployment (1-10 TB, 500-5000 QPS)

```
Patroni + 3 nodes (primary + sync standby + async standby)
- HAProxy for load balancing
- PgBouncer as sidecar per application
- pgBackRest for backup
- Replication slots monitored
- RTO: 30 seconds
- RPO: 0 with sync standby
```

### Large Deployment (> 10 TB, > 5000 QPS)

```
Patroni + 5+ nodes (primary + 2 sync + 2 async)
- HAProxy with health checks
- PgBouncer dedicated pools per app tier
- Cascading replication for geo-distribution
- Logical replication for data distribution
- pgBackRest with S3 WAL archive
- Automated failover with canary checks
- RTO: 15 seconds
- RPO: 0
```

## Common Failure Scenarios

### Split-Brain Prevention

Split-brain occurs when two nodes both think they are primary. Prevention mechanisms:
- DCS-based leader election (etcd, Consul, Zookeeper)
- STONITH (Shoot The Other Node In The Head): fence the old primary
- Lease-based locking with TTL expiration
- Majority quorum requirement

```yaml
# Patroni split-brain prevention
ttl: 30                    # leader key TTL in seconds
loop_wait: 10              # loop interval
retry_timeout: 10          # DCS retry timeout
maximum_lag_on_failover: 1048576  # don't promote too-laggy standby
check_timeline: true       # verify timeline before promoting
```

### Handling Network Partitions

| Scenario | Effect | Mitigation |
|---|---|---|
| Primary isolated from standbys | Continues serving writes | WAL accumulates locally |
| Standby isolated from primary | Serves stale reads | Reconnect retry |
| Primary isolated from DCS | Demotes to read-only after TTL | Fencing script |
| Majority of standbys lost | Primary continues | Add new standby |


## References

- PostgreSQL streaming replication
- Logical replication setup
- Patroni HA configuration
- PgBouncer connection pooling
- WAL-G / pgBackRest backup tools
- Database migration strategies
- Query optimization for relational databases
