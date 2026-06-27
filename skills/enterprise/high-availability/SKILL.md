---
name: enterprise-high-availability
description: >
  Use this skill when architecting end-to-end high-availability systems combining database replicas,
  load balancers, slave/standby nodes, application version sync across nodes, data sync during rolling
  migrations, and availability tiering from 95% (two nines) up to 99.99% (four nines) or 99.999% (five nines).
  This skill enforces: availability budget math, replica topology selection, L4/L7 load balancer health-check
  contracts, zero-downtime app version rollout (blue-green, canary, rolling), backward/forward compatible
  schema migrations (expand-contract), data backfill + dual-write sync, quorum + split-brain prevention,
  RPO/RTO targeting per tier, and runbook-driven failover. Do NOT use for: pure SLA contract negotiation
  (see enterprise-sla-management), CDC streaming pipelines (see data-cdc-patterns), or basic Kubernetes
  rollout configs (see devops-kubernetes-patterns).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, high-availability, replica, load-balancer, migration, version-sync, ha, phase-8]
---

# Enterprise High Availability

## Purpose
Design and operate systems that hold availability targets from 95% to 99.999% across the full stack:
database replica + slave topology, load balancer health contracts, zero-downtime application version
rollout, schema/data sync during migration, and quorum-based failover. Applies equally to a solo-built
enterprise SaaS and a 10k-node Fortune-500 platform — only the budget, redundancy factor, and automation
depth change.

## Agent Protocol

### Trigger
Exact user phrases: "high availability", "HA", "99.9", "99.99", "99.999", "five nines", "four nines",
"three nines", "uptime target", "replica", "read replica", "slave db", "standby", "load balancer", "LB",
"HAProxy", "Nginx LB", "ALB", "NLB", "Envoy", "blue-green", "canary", "rolling update", "zero downtime",
"version sync", "schema migration", "data sync", "backfill", "dual write", "expand contract", "failover",
"quorum", "split brain", "RPO", "RTO", "active-active", "active-passive", "multi-AZ", "multi-region".

### Input Context
Before activating, verify:
- Target availability tier (95 / 99 / 99.9 / 99.99 / 99.999) and the SLA penalty if missed
- Current architecture: single node? master-slave? multi-AZ? multi-region?
- Database engine + replication mode (sync, semi-sync, async)
- Load balancer layer (L4 TCP, L7 HTTP) and current health-check semantics
- Deployment model (bare metal, VM, Kubernetes, serverless)
- Migration cadence (per-day / per-week) and current downtime per release
- Read/write ratio, peak TPS, dataset size, max acceptable replication lag
- Team size and on-call capacity (drives automation vs manual runbook split)
- Budget ceiling — five nines costs 10–100× more than three nines

### Output Artifact
HA architecture spec containing: availability tier + error budget, replica topology, LB config with
health-check contract, version rollout strategy, migration plan with data sync, failover runbook,
and monitoring/alerting matrix.

### Response Format
```
Tier: {99 | 99.9 | 99.99 | 99.999}
Error budget: {minutes/year, minutes/month}
Topology: {single-AZ | multi-AZ active-passive | multi-AZ active-active | multi-region active-active}
DB: {primary + N replicas, sync mode, RPO, RTO}
LB: {L4/L7, algorithm, health-check, drain time}
Rollout: {blue-green | canary | rolling}, batch size, bake time
Migration: {expand-contract phases, dual-write window, backfill plan}
Failover: {trigger, quorum, promotion, DNS/anycast cutover, rollback}
```

```yaml
# Concrete config snippets for LB, replication, deployment
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Availability tier selected with error-budget minutes computed
- [ ] Replica topology defined with sync mode and replica count per AZ/region
- [ ] Load balancer config with health-check path, interval, threshold, drain
- [ ] Version rollout strategy (blue-green / canary / rolling) with bake + rollback time
- [ ] Schema migration plan using expand-contract (N+1 compatible)
- [ ] Data sync plan: dual-write window, backfill job, cutover step, verify step
- [ ] Quorum and split-brain prevention mechanism documented
- [ ] Failover runbook with RPO/RTO targets and rollback path
- [ ] Monitoring: replication lag, LB pool health, error budget burn, deploy success
- [ ] DR drill cadence scheduled (quarterly minimum for ≥99.99%)

### Max Response Length
350 lines of code and configuration.

## Workflow

### Step 1: Pick Availability Tier and Compute Budget
Availability is a cost decision, not a vanity number. Pick the lowest tier that satisfies the SLA + revenue impact.
```
Tier      Yearly downtime   Monthly downtime   Typical use case
95%       18d 6h            36h 30m            Internal tools, dev/test
99%       3d 15h            7h 18m             Beta SaaS, B2C non-critical
99.9%     8h 45m            43m 12s            Standard SaaS, ecommerce
99.95%    4h 22m            21m 36s            Premium SaaS, B2B
99.99%    52m 35s           4m 19s             Fintech, healthcare, ads
99.999%   5m 15s            25.9s              Telecom, trading, life-safety
99.9999%  31.5s             2.59s              Tier-1 telco core, exchanges
```
Rule of thumb: each extra nine multiplies cost by ~5–10×. >99.99% requires multi-region active-active,
automated failover, anycast/GeoDNS, and full DR drills.

### Step 2: Choose Replica Topology
```
Single AZ + single node              → max 99.0%   (one EC2/PG box, daily snapshot)
Single AZ + primary + 1 sync replica → max 99.5%   (semi-sync, manual promote)
Multi-AZ active-passive              → max 99.95%  (primary + standby in AZ-b, auto promote)
Multi-AZ active-active (read)        → max 99.99%  (writes to primary, reads load-balanced across AZ replicas)
Multi-region active-passive          → max 99.99%  (DR region with async replica, GeoDNS failover)
Multi-region active-active           → 99.999%+    (multi-master / global DB: Spanner, Aurora Global, CockroachDB)
```
Replica count formula for read scaling: `replicas = ceil(read_tps / per_replica_tps) + 1 (spare)`.
Cap at 5 per primary — beyond that, fan out via cascading or use a sharded primary.

### Step 3: Slave/Standby DB Configuration
Always use semi-sync for same-AZ standby (ack from ≥1 replica before commit), async for cross-region.
GTID/LSN-based replication so promotion is deterministic.
```ini
# MySQL primary (my.cnf) — semi-sync, GTID, row-based
[mysqld]
server_id = 1
log_bin = mysql-bin
binlog_format = ROW
gtid_mode = ON
enforce_gtid_consistency = ON
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
plugin_load_add = semisync_master.so
rpl_semi_sync_master_enabled = 1
rpl_semi_sync_master_timeout = 3000        # fallback to async after 3s
rpl_semi_sync_master_wait_for_slave_count = 1
rpl_semi_sync_master_wait_point = AFTER_SYNC
```
```ini
# Replica
[mysqld]
server_id = 2
read_only = ON
super_read_only = ON
gtid_mode = ON
enforce_gtid_consistency = ON
relay_log_recovery = ON
plugin_load_add = semisync_slave.so
rpl_semi_sync_slave_enabled = 1
```
```conf
# PostgreSQL primary — streaming + slot, synchronous_commit per workload
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
synchronous_standby_names = 'ANY 1 (standby_az_b, standby_az_c)'
synchronous_commit = on            # use 'remote_apply' only for RPO=0 critical writes
```

### Step 4: Load Balancer in Front of App + DB Reads
L4 (TCP) for raw throughput, L7 (HTTP) for path routing, header-based canary, and rich health checks.
Active health check + passive ejection. Connection draining required for zero-downtime deploys.
```haproxy
# HAProxy — L7 with active+passive health, drain, retries
global
  maxconn 50000
  log stdout local0
defaults
  mode http
  timeout connect 2s
  timeout client 30s
  timeout server 30s
  option httplog
  retries 2
  option redispatch

frontend fe_app
  bind *:443 ssl crt /etc/ssl/app.pem alpn h2,http/1.1
  default_backend be_app

backend be_app
  balance leastconn
  option httpchk GET /healthz
  http-check expect status 200
  default-server inter 2s fall 3 rise 2 slowstart 30s observe layer7 error-limit 10 on-error mark-down
  server app-1 10.0.1.10:8080 check
  server app-2 10.0.1.11:8080 check
  server app-3 10.0.2.10:8080 check
  # drain via: socat - /var/run/haproxy.sock <<< "set server be_app/app-1 state drain"

backend be_db_reads
  balance roundrobin
  option mysql-check user haproxy_check
  server replica-1 10.0.1.20:3306 check
  server replica-2 10.0.2.20:3306 check
  server replica-3 10.0.3.20:3306 check backup   # last resort
```
Health-check contract MUST be defined by the app team:
- `/healthz` = process alive (liveness, fast, no deps)
- `/readyz`  = ready to serve (DB connected, cache warm, deps reachable)
- LB hits `/readyz`; orchestrator hits `/healthz`

### Step 5: Zero-Downtime App Version Rollout
Choose by error-budget pressure:
```
Rolling      → cheapest, slowest, partial blast radius. Default for stateless apps.
Blue-green   → instant cutover + instant rollback, 2× infra cost during deploy.
Canary       → safest, gradual % shift (1 → 5 → 25 → 50 → 100), needs metric automation.
Shadow       → mirror prod traffic to new version, compare results, zero user impact.
```
```yaml
# Kubernetes rolling — surge 25% / unavailable 0, preStop drain
apiVersion: apps/v1
kind: Deployment
metadata: {name: api}
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate: {maxSurge: 25%, maxUnavailable: 0}
  minReadySeconds: 20
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: api
        image: api:v2.4.0
        readinessProbe:
          httpGet: {path: /readyz, port: 8080}
          periodSeconds: 2
          failureThreshold: 3
        livenessProbe:
          httpGet: {path: /healthz, port: 8080}
          periodSeconds: 10
        lifecycle:
          preStop:
            exec: {command: ["/bin/sh","-c","sleep 15 && curl -X POST localhost:8080/drain"]}
```
```yaml
# Argo Rollouts canary with analysis gate
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
      - setWeight: 5
      - pause: {duration: 5m}
      - analysis: {templates: [{templateName: success-rate}]}
      - setWeight: 25
      - pause: {duration: 10m}
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 100
```

### Step 6: Version Sync Across Nodes (N and N+1 Must Coexist)
During rolling deploy, both `v1` and `v2` of the app run simultaneously and hit the same DB.
The system MUST be N/N+1 compatible:
- API: add new fields, never remove or rename in same release (deprecate over ≥2 releases)
- Wire format: new fields optional, old clients ignore unknown fields (protobuf, JSON)
- Feature flags: ship code dark, flip atomically after 100% rollout
- Config: new keys default to old behavior; remove old keys one release later
- Background jobs: queue payload versioned; consumers handle v1 and v2 simultaneously
```
Release N    Release N+1   Release N+2
add column   read+write    drop old column
write both   only new      ---
```
Pin compatibility matrix in CI: deploy v1 + v2 in same cluster, run smoke + contract tests against both.

### Step 7: Schema Migration — Expand / Contract
Never break running pods. Multi-phase migration over multiple releases.
```
Phase 1 EXPAND  (release N)
  - Add new column (nullable) / new table / new index CONCURRENTLY
  - App still reads + writes OLD shape
  - SAFE: zero downtime, fully reversible

Phase 2 DUAL WRITE  (release N)
  - App writes to BOTH old and new shape
  - App reads from OLD (source of truth)
  - Backfill historical rows into new shape (batched, throttled)

Phase 3 CUTOVER  (release N+1)
  - App reads from NEW shape (with fallback to OLD)
  - Verify row counts + checksums
  - Flip feature flag atomically

Phase 4 CONTRACT  (release N+2, after bake)
  - Stop writing to OLD shape
  - Drop OLD column / table (after retention window for rollback)
```
```sql
-- Phase 1: PostgreSQL safe DDL
ALTER TABLE orders ADD COLUMN customer_uuid uuid NULL;            -- instant
CREATE INDEX CONCURRENTLY idx_orders_customer_uuid ON orders(customer_uuid);
-- DO NOT: ADD COLUMN ... NOT NULL DEFAULT  (rewrites table on old PG)
-- DO NOT: rename in place — add new, dual-write, drop old
```
```sql
-- Backfill in throttled batches, idempotent
DO $$
DECLARE batch_size int := 10000; rows int;
BEGIN
  LOOP
    UPDATE orders o SET customer_uuid = c.uuid
    FROM customers c WHERE o.customer_id = c.id AND o.customer_uuid IS NULL
    AND o.id IN (SELECT id FROM orders WHERE customer_uuid IS NULL LIMIT batch_size);
    GET DIAGNOSTICS rows = ROW_COUNT;
    EXIT WHEN rows = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

### Step 8: Data Sync During Migration (Dual Write + Verify)
Use the *outbox pattern* + idempotent consumer, or transactional dual-write with reconciliation job.
```
App write
   |
   +-- INSERT INTO orders ...
   +-- INSERT INTO outbox (event_id, payload, status='pending')   -- same tx
   |
   v
Outbox relay (poll or Debezium) -> Kafka topic -> Consumer -> NEW store
                                                    |
                                                    +--> reconciliation: every 5m
                                                         compare row counts + checksum
                                                         alert if drift > 0.01%
```
Verification gates BEFORE cutover:
- Row count parity (per shard / per tenant)
- Checksum of canonical fields (xxhash64 of normalized JSON)
- Sample 1k recent rows, compare deep-equal
- Replay window: last 24h must match exactly

### Step 9: Quorum + Split-Brain Prevention
Any auto-failover needs an odd-numbered consensus group. Never 2 — it cannot survive a partition without
risk of split-brain (both sides think they are primary).
```
Group size   Failures tolerated   Notes
1            0                    no HA
3            1                    minimum viable
5            2                    standard prod
7            3                    geo-distributed
```
Use etcd / Consul / ZooKeeper / Raft built into the DB (CockroachDB, TiDB, MongoDB). Lease-based leader.
Fencing token on every primary action so a zombie old-primary cannot commit.

### Step 10: Failover Runbook (RPO/RTO Targets)
```
Tier      RPO target   RTO target   Failover mode
99.0%     1h           4h           Backup restore
99.9%     5m           30m          Async replica, semi-auto promote
99.95%    1m           5m           Semi-sync replica, auto promote in AZ
99.99%    <10s         <60s         Sync replica + LB pool swap, auto + GeoDNS
99.999%   0            <10s         Multi-master, anycast, no human in loop
```
Runbook skeleton (must be tested quarterly for ≥99.99%):
```
1. DETECT     — alert on primary unreachable for >N seconds (N = RTO/3)
2. FENCE      — revoke old primary's lease token; block its writes
3. PROMOTE    — quorum elects new primary (or manual cmd: pg_ctl promote / FAILOVER)
4. REROUTE    — update LB pool / VIP / DNS / Consul service; TTL ≤ RTO/2
5. VALIDATE   — health check + canary read + canary write succeed
6. NOTIFY     — page on-call, post status page, log incident
7. REBUILD    — old primary becomes new standby (pg_rewind / reseed)
8. POSTMORTEM — within 48h; update runbook; adjust budget
```

### Step 11: Monitoring + Burn-Rate Alerting
Required signals (alert before users notice):
- Replication lag: warn @ 5s, page @ 30s (async); warn @ 1s for semi-sync
- LB pool health: page if healthy < 50%
- App error rate: multi-window burn (2% budget in 1h → page; 5% in 6h → page)
- Deploy success rate: page if last 3 deploys failed
- DB connection pool saturation: warn @ 80%, page @ 95%
- Disk: warn @ 75%, page @ 85% (with 4h growth projection)

## Rules
- Pick the lowest availability tier the SLA allows; every extra nine costs 5–10× more.
- Two-node clusters are forbidden for auto-failover (use 3 or 5).
- Semi-sync for same-AZ, async for cross-region; sync only for RPO=0 financial writes.
- LB must use `/readyz` (deep) for pool membership, `/healthz` (shallow) for orchestrator.
- App releases MUST be backward + forward compatible across one release boundary.
- Schema migrations MUST follow expand-contract; no in-place rename / drop in same release.
- Every destructive DDL has a bake window ≥ 1 release before contract phase.
- Connection draining ≥ 15s, terminationGracePeriod ≥ 60s on Kubernetes.
- All auto-failover paths drilled quarterly with real traffic for ≥99.99%.
- Burn-rate alerts use multi-window (fast + slow burn), never single-threshold.
- Never deploy on Friday afternoon to a 99.99% system without senior approval.

## Architecture Decision Trees

### Rollout Strategy Selection
```
Error budget available?
├── Generous (> 50% remaining) → Rolling update
│   Cheapest. 25% surge, 0 unavailable. Bake time 20s.
│   Risk: partial blast radius, slow rollback (per pod).
├── Moderate (25-50%) → Canary
│   5% → 25% → 50% → 100% with analysis gates.
│   Automated rollback if error rate spikes.
└── Tight (< 25%) → Blue-green
    Instant cutover. Instant rollback. 2x infra cost.
    Best for: zero-downtime mandatory, critical compliance.
```

### Replication Mode Selection
```
RPO requirement?
├── Zero data loss → Synchronous replication
│   Commit waits for ≥1 replica ack. Increases p99 latency by 1-5ms.
│   Use only for financial transactions. Budget for latency impact.
├── < 5s data loss → Semi-synchronous
│   Default for same-AZ. Timeout falls back to async.
│   RPO = 0 during normal ops, < 1s during degredation.
└── < 60s data loss → Asynchronous
    Cross-region only. No latency impact on primary.
    Risk: replication lag causes data loss on failover.
```

## Implementation Patterns

### Pattern: Blue-Green Deployment with LB Swap

```yaml
# argo-rollouts/bluegreen.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: {name: api-service}
spec:
  replicas: 10
  strategy:
    blueGreen:
      activeService: api-active
      previewService: api-preview
      autoPromotionEnabled: false
      prePromotionAnalysis:
        templates:
        - templateName: smoke-test
      scaleDownDelaySeconds: 300  # keep old version for rollback
  template:
    spec:
      containers:
      - name: api
        image: api:v2.5.0
        readinessProbe:
          httpGet: {path: /readyz, port: 8080}
          periodSeconds: 2
          failureThreshold: 2
        lifecycle:
          preStop:
            exec: {command: ["/bin/sh","-c","sleep 15"]}
---
apiVersion: v1
kind: Service
metadata: {name: api-active}
spec:
  selector: {app: api, rollouts-pod-template-hash: "stable"}
```

### Pattern: Semi-Sync Replication with Auto-Failover

```ini
# Patroni configuration for PostgreSQL HA
scope: mydb
namespace: /service/
name: pg-primary

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.1.10:8008

etcd:
  hosts: ['10.0.1.100:2379', '10.0.1.101:2379', '10.0.1.102:2379']

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        wal_log_hints: "on"
        synchronous_standby_names: "ANY 1 (pg-replica-1, pg-replica-2)"

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.1.10:5432
  data_dir: /data/postgresql
  bin_dir: /usr/lib/postgresql/16/bin
  authentication:
    replication:
      username: replicator
      password: strongpassword
  parameters:
    max_connections: 200
```

## Production Considerations

### Disaster Recovery Drills
- Quarterly for ≥99.99%: scheduled failover exercise during maintenance window. Half production traffic routed to DR.
- Annual: full region failover. All traffic to DR region for 4 hours. Measure RPO and RTO.
- Game day: surprise failover scenario. Team follows runbook without prior notice. Measure response time.
- Post-drill: update runbook based on findings. Add automation for manual steps discovered during drill.

### Cost Management
- Multi-AZ DB: 2x compute cost for standby. ~20% increase for storage (replication).
- Blue-green deploy: 2x infra during deploy window. Use scaled-down preview environment for cost savings.
- Cross-region: minimum 2x infra cost. Data transfer costs between regions.
- TURN relay: $0.005-0.02 per GB egress. Budget 2-5 Mbps per active media stream.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| Two-node cluster | Split-brain on network partition. Neither side has quorum. | Minimum 3 nodes for auto-failover. |
| Schema change in same deploy | Migration breaks old pods. Rollback impossible. | Expand-contract over 3 releases. |
| No read-forward compatibility | Old client crashes on new field in response. | Add fields only. Never remove or rename. |
| No drain before shutdown | In-flight requests dropped. Users see 502. | 15s drain in preStop. LB marks unhealthy. |
| All eggs in one AZ | AZ outage = full outage. | Multi-AZ. Active-passive minimum. |
| No burn-rate alerts | Error budget exhausted before anyone notices. | Multi-window alerts. Fast + slow burn. |

## Performance Optimization

- Connection pooling with PgBouncer: reduce PostgreSQL connection overhead. Transaction pooling mode.
- Read replicas for reporting: offload analytics queries from primary. Allow 5-10 replicas.
- Database connection limit: 100 per application instance. Queue with `pgbouncer` for spikes.
- Caching layer at LB: cache GET responses for 30s. Reduces application load by 30-50%.
- Query optimization: slow query log (>200ms). Index recommendations from `pg_stat_statements`.
- Replica lag monitoring: alert on > 5s lag for async, > 1s for semi-sync. Investigate immediately.
- Disk throughput: provision IOPS at 3x baseline. Burst credits for gp3 volumes monitored.

## Security Considerations

- TLS everywhere: mTLS between services. Certificate rotation every 90 days. Auto-renew via cert-manager.
- Database encryption at rest: AWS RDS encryption / Azure TDE. Key rotation every 12 months.
- Network segmentation: app and DB in private subnets. Bastion host for admin access.
- Backup encryption: S3 bucket with SSE-KMS. Cross-region backup copy encrypted with different key.
- Access control: database credentials in Vault. Rotated every 30 days. Application reads at startup.
- Audit logging: all schema changes logged. DDL triggers in PostgreSQL. Review weekly.
- Failover authentication: failover commands require MFA. Human-in-the-loop for manual promotion.
- WAF in front of LB: rate limiting, SQL injection protection, IP blocklist for known bad actors.
## Handoff
- `enterprise-sla-management` for SLA contract wording, customer credits, multi-tier SLA structure.
- `data-data-replication` for deep dive on database-specific replication internals (GoldenGate, Patroni, etc).
- `data-cdc-patterns` when dual-write is implemented via Debezium / Kafka Connect.
- `devops-progressive-delivery` for Argo Rollouts / Flagger canary automation specifics.
- `devops-incident-response` for on-call paging, escalation, status page automation.
- `devops-backup-dr` for backup cadence, snapshot retention, restore drills.
