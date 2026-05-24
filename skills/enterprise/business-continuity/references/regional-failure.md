# Regional Failure — Multi-Region Playbook

## Scenarios

```
Partial: 1 AZ out (network partition, power loss)        → in-region multi-AZ failover (auto)
Full:    1 region out (control plane down, fiber cut)    → cross-region failover (semi-auto)
Provider: entire cloud provider degraded                  → multi-cloud DR (manual)
```

## Pre-requisites for Cross-Region Failover

- Async replica of every Tier-1 datastore in DR region (RPO target documented)
- App images pre-pulled in DR region (or fast pull from regional registry)
- DR region warm-pool capacity ≥ 25% of prod (or autoscale guarantee from provider)
- DNS or anycast routing pre-configured with low TTL (≤ 60s)
- Secrets replicated to DR region (Vault, KMS, SecretManager cross-region)
- Runbook tested within last 6 months

## Detection → Decision Flow

```
T+0    Multi-region prober reports primary region 5xx > 50% for 3 consecutive minutes
T+2m   Incident commander declared; cross-region failover proposed
T+5m   IC + service owner confirm: temporary blip vs sustained outage
T+10m  Go/no-go: failover executed by 2-person rule (IC + on-call eng)
T+12m  DR DB promoted; reads/writes accepting in DR region
T+13m  GeoDNS / Route53 weighted record flipped 100% to DR endpoints
T+15m  Customer-facing health check returns green from DR
T+30m  Status page updated; customer success notified
```

## Promotion Sequence

```bash
# 1. Stop writes to old primary (if reachable, otherwise rely on quorum fencing)
psql -h primary.us-east-1 -c "ALTER SYSTEM SET default_transaction_read_only = on; SELECT pg_reload_conf();"

# 2. Promote DR standby
psql -h standby.eu-west-1 -c "SELECT pg_promote(wait := true, wait_seconds := 60);"

# 3. Verify
psql -h standby.eu-west-1 -c "SELECT pg_is_in_recovery();"   # must be false

# 4. Update DNS
aws route53 change-resource-record-sets --hosted-zone-id ZXXXX --change-batch file://failover.json

# 5. Application connect strings via Consul / SecretManager cross-region read
consul kv put db/primary/host standby-promoted.eu-west-1.internal
```

## Data Reconciliation (after failover)

Inevitable RPO gap on async replication. Capture, account, communicate.

```
1. Identify gap window: last_replicated_lsn on DR vs last_commit_lsn on dead primary
2. If dead primary later recovers:
     - Dump transactions between those LSNs (pg_waldump / mysqlbinlog)
     - Hand to data team for manual replay / customer comms
3. If lost permanently:
     - Compute affected rows/transactions/customers
     - Trigger customer comms + financial reconciliation
     - Log incident financial impact for postmortem
```

## Cutover-Back Strategy

Do NOT failover back immediately. Original region needs cleanup + verification first.

```
1. Original region fully recovered: ≥ 24h stable
2. Reseed original as new standby of current DR primary
3. Wait for replication catchup
4. Schedule cutback during low-traffic window (announce 48h ahead)
5. Reverse promotion sequence
6. Verify; bake; move to normal multi-region active-passive
```

## GeoDNS / Anycast Routing

```
Route53 failover record (primary + secondary)
  primary:   us-east-1 ALB, health check /readyz
  secondary: eu-west-1 ALB, only used when primary fails
  TTL:       30s (must be ≤ MAO / 4)

Anycast (BGP) — better but needs network ownership
  same IP announced from 2+ regions
  BGP withdrawal from failing region = traffic shifts in seconds
  used by: Cloudflare, AWS Global Accelerator, GCP Cloud Load Balancing
```

## Common Failures During Regional Drill

- Secrets not in DR region → app can't start
- DNS TTL too high (300s+) → 5+ minutes of broken traffic
- DR region cold capacity → autoscale takes 10+ min, cap exceeded
- Cross-region replication broken silently → DR data is days stale
- IAM roles assume in primary region only → permission denied in DR
- DR runbook in Confluence hosted in primary region → cannot read during outage
- Customer-managed KMS key region-pinned → decryption fails

## Drill Cadence (multi-region)

```
Monthly:    automated read failover test (DR replica handles 10% reads for 1h)
Quarterly:  full DB promotion drill (in DR region, isolated traffic)
Annual:     live regional failover drill (full traffic cutover, planned window)
On change:  re-test if datastore added or region added
```
