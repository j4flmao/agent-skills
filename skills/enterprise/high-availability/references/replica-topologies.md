# Replica Topologies — Master-Slave to Multi-Region Active-Active

## Topology Decision Tree

```
write TPS < 5k, read TPS < 50k, single region acceptable
   → master + 2 read replicas in 2 AZs (active-passive HA)

write TPS < 50k, reads can scale horizontally, single region
   → master + 4–5 read replicas across 3 AZs + auto-failover (Patroni/Orchestrator)

writes from multiple regions, latency < 100ms required globally
   → multi-master (CockroachDB, Spanner, YugabyteDB, Aurora Global Writer)

read-heavy global, writes accept eventual consistency
   → primary in region A + async replicas in regions B,C (read-local, write-remote)
```

## Master-Slave (Primary-Replica)

```
                Writes
                  │
                  ▼
           ┌──────────────┐
           │   PRIMARY    │   (AZ-a)
           │  (writable)  │
           └──┬───────┬───┘
              │ sync  │ async
              ▼       ▼
        ┌─────────┐ ┌─────────┐
        │ STANDBY │ │ REPLICA │
        │ (AZ-b)  │ │ (AZ-c)  │
        │  read   │ │  read   │
        └─────────┘ └─────────┘
```

Sync mode trade-off:
- `synchronous_commit = on` (PG) / `AFTER_SYNC` (MySQL semi-sync) → RPO=0, +1–5ms write latency
- `synchronous_commit = remote_apply` → guarantees standby visible reads, +5–20ms
- `async` → RPO = lag time, lowest write latency, can lose data on primary loss

## Multi-AZ Active-Passive (Standard 99.95% Tier)

```
   Application Tier (multi-AZ)
   │
   ▼ writes
  ┌─────────────┐  semi-sync   ┌─────────────┐
  │   PRIMARY   │ ────────────▶│  STANDBY    │
  │   AZ-a      │              │  AZ-b       │
  └─────────────┘ ◀───── promote on failure
                                 │
                                 ▼ async
                              ┌─────────────┐
                              │  REPLICA    │
                              │  AZ-c       │ (reporting)
                              └─────────────┘

Failover: lease timeout 5s → quorum elects standby → reroute via VIP/Consul → 30–60s RTO
```

## Multi-AZ Active-Active Reads (99.99% Tier)

```
                      Writes
                        │
                        ▼
                ┌──────────────┐
                │   PRIMARY    │
                └──┬───────┬───┘
                   │       │
             ┌─────┴─┐   ┌─┴─────┐
             │ rep-a │   │ rep-b │
             └───────┘   └───────┘
                  ▲           ▲
                  └──L7 LB────┘   (read pool, leastconn / latency-based)
```

Read-after-write consistency options:
- Route reads of same user-session to primary for N seconds after write
- Use `synchronous_commit = remote_apply` and route reads to any replica
- Causal token: client passes LSN/GTID, replica blocks read until ≥ token

## Multi-Region Active-Passive (DR)

```
Region us-east-1 (primary)        Region eu-west-1 (DR)
┌────────────────────────┐         ┌────────────────────────┐
│ App + Primary DB       │  async  │ App (warm) + Standby   │
│ Live traffic           │ ───────▶│ DB (read-only)         │
└────────────────────────┘  RPO 5s └────────────────────────┘
        ▲                                  │
        │            GeoDNS / Route53 health-check failover
        └──────────────── 60s TTL ─────────┘
```

Failover playbook:
1. Detect: 3 consecutive health-check failures from external prober (60s)
2. Promote: `pg_ctl promote` on DR standby, lift `read_only`
3. Reroute: change Route53 weighted/failover record → DR endpoint
4. App: restart with new DSN (or use proxy with auto-rediscovery)
5. Old primary: when recovered, reseed as standby of new primary (`pg_rewind`)
6. RPO accepted: in-flight writes within last async window are lost

## Multi-Region Active-Active (99.999% Tier)

Requires database with built-in multi-master consensus:
- **Spanner / Cloud SQL Spanner** — TrueTime, external consistency
- **CockroachDB / TiDB / YugabyteDB** — Raft per range, SQL on top
- **Aurora Global Database** — 1 writer region + readable secondaries (write fail-over <1min)
- **DynamoDB Global Tables** — async multi-master, LWW conflict resolution

```
        Global LB / Anycast
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
   us-east   eu-west   ap-south
   ┌─────┐  ┌─────┐  ┌─────┐
   │ R/W │◀▶│ R/W │◀▶│ R/W │   (Raft consensus, per-range leaders)
   └─────┘  └─────┘  └─────┘
```

Trade-offs:
- Write latency: cross-region consensus = ≥ 1 inter-region RTT (50–200ms)
- Conflict surface: same-row concurrent writes need resolution (LWW or app-merge)
- Cost: 3× storage minimum + cross-region egress

## Slave (Replica) Promotion — Step by Step

```bash
# PostgreSQL (modern)
pg_ctl promote -D /var/lib/postgresql/data
# or via SQL on standby
SELECT pg_promote(wait := true, wait_seconds := 60);

# MySQL (semi-sync slave promote)
STOP REPLICA;
RESET REPLICA ALL;
SET GLOBAL read_only = OFF;
SET GLOBAL super_read_only = OFF;

# Verify
SELECT pg_is_in_recovery();   -- must be false
SHOW REPLICA STATUS\G          -- empty on new primary
```

After promotion, reconfigure surviving replicas to follow new primary:
```sql
-- old replicas
CHANGE REPLICATION SOURCE TO SOURCE_HOST='new-primary', SOURCE_AUTO_POSITION=1;
START REPLICA;
```

## Replication Lag Monitoring

```sql
-- PostgreSQL
SELECT client_addr, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       EXTRACT(EPOCH FROM (now() - reply_time)) AS lag_seconds
FROM pg_stat_replication;

-- MySQL
SHOW REPLICA STATUS\G    -- Seconds_Behind_Source
```

Alert thresholds:
- Sync replica: page if lag > 0 for > 30s (sync replication degraded)
- Semi-sync: warn @ 1s lag, page @ 10s
- Async same-region: warn @ 5s, page @ 30s
- Async cross-region: warn @ 30s, page @ 5min
