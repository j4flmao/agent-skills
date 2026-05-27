---
name: data-data-replication
description: >
  Use this skill when designing database replication topologies — master-slave, multi-master, active-active, cross-region, or log shipping. This skill enforces: replication topology selection, sync vs async trade-offs, conflict resolution strategies (last-writer-wins, CRDT, custom merge), cross-region consistency models, Oracle GoldenGate patterns, read replica scaling, and DR plan design. Do NOT use for: CDC pipelines to data lakes, ETL data movement, or Kafka event streaming (see data-cdc-patterns).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, replication, database, phase-11]
---

# Data Data Replication

## Purpose
Design robust database replication architectures for high availability, disaster recovery, read scaling, and multi-region deployments. Covering master-slave, multi-master, and active-active topologies, with conflict resolution strategies and cross-region consistency models.

## Agent Protocol

### Trigger
Exact user phrases: "database replication", "multi-master", "active-active", "cross-region replication", "GoldenGate", "log shipping", "read replica", "synchronous replication", "asynchronous replication", "conflict resolution", "database mirroring", "always on", "data guard", "replica set", "DR plan", "disaster recovery".

### Input Context
Before activating, verify:
- Database engine (MySQL, PostgreSQL, Oracle, SQL Server, MongoDB, Cassandra)
- Replication topology desired (master-slave, multi-master, active-active)
- Consistency requirements (RPO in seconds, RTO in minutes)
- Network latency between regions
- Write volume (TPS) and read ratio
- Conflict potential (multiple writers to same records)
- Existing infrastructure (cloud provider, peered VPCs, VPN, dedicated link)

### Output Artifact
Replication architecture with topology diagram, consistency model, conflict resolution strategy, and DR plan.

### Response Format
```
Topology: {master-slave | multi-master | active-active | fan-out}
Replication: {synchronous | asynchronous | semi-synchronous}
Consistency: {strong | eventual | read-your-writes}
Conflict Resolution: {LWW | CRDT | custom merge | manual}
DR: {RPO: X, RTO: Y}
```
```yaml
# Replication config (database-level)
# DNS/route configuration for multi-region
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Replication topology selected with trade-off analysis
- [ ] Sync vs async replication configured per workload
- [ ] Conflict resolution strategy defined
- [ ] Cross-region replication plan with consistency model
- [ ] DR plan with RPO/RTO targets
- [ ] Read replica scaling strategy documented
- [ ] Failover and fallback procedures defined
- [ ] Monitoring for replication lag and split-brain detection

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Choose Replication Topology
```
Master-Slave (Primary-Replica):
  - Single writer (master), multiple readers (slaves)
  - Async (default) or semi-sync replication
  - Best for: read scaling, analytics offload, regional read distribution
  - Failover: promote slave to master (manual or auto)
  - DB support: MySQL, PostgreSQL, SQL Server, Oracle (Data Guard), MongoDB

Multi-Master:
  - Multiple nodes accept writes, replicates to all peers
  - Conflict resolution critical (LWW, custom)
  - Best for: cross-region writes, active-active HA, zero-downtime maintenance
  - DB support: MySQL Group Replication (InnoDB Cluster), PostgreSQL BDR, Oracle GoldenGate, SQL Server Always On

Active-Active:
  - All nodes serve read + write concurrently
  - Just multi-master with full traffic splitting
  - Requires conflict-free data model or CRDTs
  - Best for: low contention workloads, geo-distributed users, global apps

Fan-out:
  - Single master writes to multiple slaves in different regions
  - Slaves can be read-only or cascaded (slave of slave)
  - Best for: distributing data to multiple data centers for local reads
```

### Step 2: Synchronous vs Asynchronous
```
Synchronous:
  - Master waits for at least N replicas to acknowledge write before committing
  - Guarantees: strong consistency, zero data loss (RPO=0)
  - Latency: write latency = RTT to slowest replica + fsync time
  - Availability: if N replicas are down, writes fail
  - Use for: financial transactions, critical metadata, any RPO=0 workload

Asynchronous:
  - Master commits locally, replicates async to replicas
  - Guarantees: eventual consistency, potential data loss (RPO > 0)
  - Latency: write latency = local commit only
  - Availability: replica failures don't affect writes
  - Use for: analytics replicas, cross-region, non-critical workloads

Semi-synchronous:
  - Master waits for at least 1 replica to ack, others async
  - Trade-off: better than async (at least one replica has data), lower latency than full sync
  - Use for: most production databases (balance of safety and performance)
```

### Step 3: Conflict Resolution Strategies
```
Last-Writer-Wins (LWW):
  - Each write has a timestamp. Highest timestamp wins.
  - Simplest, but loses conflicting writes silently.
  - Use: when data can tolerate loss (counters, status fields)

CRDT (Conflict-Free Replicated Data Types):
  - Data types designed to be mergeable without conflicts
  - Counters: G-Counter (increment-only), PN-Counter (inc+dec)
  - Sets: G-Set, 2P-Set, OR-Set (observed-remove)
  - Registers: LWW-Register, MV-Register (multi-value)
  - Maps: Map of CRDTs
  - Use: when concurrent writes expected and consistency matters

Application-Level Merge:
  - Application reads conflicting versions, applies business logic
  - E.g., shopping cart merge: union of items from both versions
  - Use: complex business objects (carts, documents, orders)

Custom Resolution:
  - Replication tool plugin (GoldenGate conflict handler)
  - Database-specific (Oracle conflict resolution groups)
  - Manual: log conflicts for human resolution (not for high volume)
```

### Step 4: MySQL Replication Configuration
GTID-based replication (vs file/position). Binary log: binlog_format=ROW (required for consistency). Channel: source -> replica. Semi-sync: after_commit, after_sync.

```ini
# Master config (my.cnf)
[mysqld]
server_id = 1
log_bin = mysql-bin
binlog_format = ROW
binlog_row_image = FULL
expire_logs_days = 7
gtid_mode = ON
enforce_gtid_consistency = ON

# Semi-sync on master
plugin_load_add = semisync_master.so
rpl_semi_sync_master_enabled = 1
rpl_semi_sync_master_timeout = 10000  # fallback to async after 10s
rpl_semi_sync_master_wait_for_slave_count = 1
rpl_semi_sync_master_commit_after_sync = ON  # safer

# Replica config
[mysqld]
server_id = 2
relay_log = mysql-relay-bin
read_only = 1
gtid_mode = ON
enforce_gtid_consistency = ON
log_replica_updates = ON

# Semi-sync on replica
plugin_load_add = semisync_slave.so
rpl_semi_sync_slave_enabled = 1
```

```sql
-- Set up replica
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='master.int',
  SOURCE_PORT=3306,
  SOURCE_USER='replicator',
  SOURCE_PASSWORD='****',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
SHOW REPLICA STATUS\G
```

### Step 5: PostgreSQL Replication
Streaming replication with WAL. Physical: identical copy, block-level. Logical: selective tables, cross-version, cross-schema. Patroni: HA management with etcd/consul for leader election.

```conf
# postgresql.conf (primary)
wal_level = logical          # or replica for physical
max_wal_senders = 10
wal_keep_size = 4096         # MB
max_replication_slots = 10
shared_preload_libraries = 'pgoutput'

# pg_hba.conf
host replication replicator 10.0.0.0/8 md5

# Standby (recovery.conf / PGDATA/standby.signal)
primary_conninfo = 'host=primary.int port=5432 user=replicator password=****'
primary_slot_name = 'standby_1'
hot_standby = on
hot_standby_feedback = on
```

### Step 6: Oracle GoldenGate
Extract: reads online redo logs, captures changes. Pump (optional): sends to remote Extract. Replicat: applies to target. Trail files: intermediary storage. Checkpoint: restart from last committed position.

```
Source DB
    |
  Extract (logminer/xstrm)
    | trail file ./dirdat/xx000000
  Pump (optional, for async / cross-region)
    | network
  Target DB
    |
  Replicat (batched apply, parallel or integrated)

GoldenGate configuration files:
  GLOBALS:       instance-level settings
  EXTRACT:       capture config (source tables, format)
  REPLICAT:      apply config (target tables, mapping)
  DEFGEN:        data definition generation
  PARAMS:        parameter files

Conflict resolution (GoldenGate):
  USEMAX (LWW):  keep row with max timestamp/column value
  OVERWRITE:     always apply incoming change
  MINMAX:        use min/max of column to resolve
  USELAST:       use last arriving record
  EXCEPTION:     log conflict to exception table for manual handling
```

### Step 7: Cross-Region Replication
Cross-region introduces latency (50-200ms RTT between AWS regions). Async replication mandatory for cross-region writes. Consistency: eventual (default), read-your-writes (stickiness via routing), or monotonic reads. Routing: DNS-based, application-level, or proxy (ProxySQL, Pgpool, HAProxy).

```
Region A (us-east-1)                          Region B (eu-west-1)
+---------------------+                       +---------------------+
| Primary (write)     |  -- async repl ---->  | Standby (read-only) |
| +---> Replica 1     |  <--- election -----  | +---> Replica 1     |
| |     (local reads) |                       | |     (local reads) |
| +--- App traffic    |                       | +--- App traffic    |
|   read + write      |                       |   read-only         |
+---------------------+                       +---------------------+

Failover steps:
  1. Detect primary failure (split-brain prevention via majority quorum)
  2. Promote standby to primary (PROMOTE STANDBY / SET ACTIVE)
  3. Re-point DNS to new primary (CNAME change, TTL 60s)
  4. Validate data consistency
  5. Route writes to new region
  6. Rebuild old primary as new standby when recovered

RPO with async cross-region:
  us-east-1 <-> eu-central-1: 50-100ms latency
  Typical RPO: 1-5 seconds of data loss on regional failure
  With synchronous: RPO=0, but write latency = 100ms+ (impractical for most apps)
```

### Step 8: Read Replica Scaling
Read replicas offload read queries from primary. Use cases: analytics queries, reporting, read-heavy APIs, geographic latency reduction. Replica count: 1-5 per primary (more creates replication lag pressure). Load balancing: round-robin, least connections, geographic.

```
Application
    |
    +-- Write: -> Primary
    |
    +-- Read: -> LB (ProxySQL / HAProxy / internal LB)
                    |
         +----------+----------+
         |          |          |
      Replica 1  Replica 2  Replica 3
      (az-1a)    (az-1b)    (az-1c)

Replication lag management:
  - Write-after-read consistency: send read-after-write to primary
  - Monotonic reads: session stickiness to same replica
  - Lag checking: MySQL SHOW REPLICA STATUS (second_behind_master)
  - Connection proxy routing: ProxySQL query rules for read-write split
```

### Step 9: Split-Brain Prevention
Split-brain: two nodes believe they are primary, accept writes independently. Prevention: majority quorum (etcd, Consul, ZK), STONITH (shoot the other node), lease-based (only one lease holder can be primary). Detection: heartbeat of replication, connection health checks. Recovery: manual reconciliation, keep last cluster timestamp.

```yaml
# Patroni / PostgreSQL HA with etcd
scope: sales-db
namespace: /service/
name: pg-us-east-1-0

etcd:
  host: etcd-cluster.internal:2379

postgresql:
  parameters:
    wal_level: logical
    hot_standby: 'on'
  use_pg_rewind: true
  use_slots: true
  recovery_conf:
    restore_command: ...

# Patroni ensures only one primary at any time
# DCS (etcd) stores lease: /service/sales-db/leader
# If primary loses connection to etcd, it demotes itself
```

### Step 10: Disaster Recovery Plan
RTO/RPO targets: hot (RTO<1min, RPO=0s), warm (RTO<15min, RPO<5min), cold (RTO<4h, RPO<1h). DR types: active-passive (replica promoted), active-active (dual writes), backup-restore (slowest). Testing: failover drills quarterly, switchback drills semi-annually.

```
DR categories:
  Hot standby:  fully replicated, read-only, takes over in seconds
  Warm standby: replica started but not accepting queries yet
  Cold standby: backup restored to new instance (hours)

Recovery strategies by RTO:
  RTO < 60s:    active-passive sync replication, automatic failover
  RTO < 15min:  active-passive async, semi-automated promotion
  RTO < 4h:     backup from snapshot + WAL archive restore

Post-failover validation:
  1. Row count consistency check
  2. Primary key uniqueness verification
  3. Latest timestamp comparison
  4. Application health check (canary read/write)
```

## Rules
- Async for cross-region (latency makes sync impractical for writes)
- Semi-sync for same-region replication (at least one replica ack'd)
- LWW for simple conflict resolution; CRDT for complex concurrent writes
- Read replicas 1-5 per primary (more increases lag risk)
- Always have a split-brain prevention mechanism (quorum, lease, STONITH)
- Test DR failover quarterly with actual traffic cutover
- Monitor replication lag (alert if > 30s for async, > 5s for semi-sync)
- Document runbook for failover: detect -> promote -> reroute -> validate

## References
  - references/conflict-resolution.md — Conflict Resolution Reference
  - references/cross-region.md — Cross-Region Replication Reference
  - references/replication-cdc-vs-etl.md — Replication Strategies: CDC vs ETL
  - references/replication-monitoring.md — Replication Monitoring
  - references/replication-performance.md — Replication Performance Reference
  - references/replication-security.md — Data Replication Security
  - references/replication-tools.md — Replication Tools
  - references/replication-topologies.md — Replication Topologies Reference
## Handoff
`data-cdc-patterns` for CDC-based replication (Debezium, Kafka Connect)
`data-distributed-storage` for HDFS and object store replication
`data-distributed-compute` for distributed cluster services (ZooKeeper, etcd) used in replication HA
