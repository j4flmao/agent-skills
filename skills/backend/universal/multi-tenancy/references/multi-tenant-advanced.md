# Advanced Multi-Tenancy: Noisy Neighbors, Quotas, Cells, Tenant Migration and Cost Attribution

Operating a multi-tenant platform at scale: limiting the impact of heavy tenants, per-tenant quotas and fairness, cell-based architecture, moving tenants between shards or cells, per-tenant observability and cost attribution. Fundamentals are in `multi-tenant-fundamentals.md`.

## Noisy Neighbor Controls

| Resource | Control |
|---|---|
| API requests | Per-tenant rate limits (token bucket) by tier at the gateway |
| Concurrency | Per-tenant in-flight limits in services and workers |
| Background jobs | Per-tenant queues or weighted fair scheduling; per-tenant concurrency caps |
| Database | Per-tenant statement timeouts, query cost limits, connection caps; move heavy tenants to dedicated shards |
| Storage | Quotas on objects/bytes per tenant |
| Search/analytics | Separate indices or resource groups for large tenants |

## Per-Tenant Rate Limiting (Redis, token bucket)

```lua
-- KEYS[1] = bucket key, ARGV: capacity, refill_per_sec, now_ms, cost
local cap, rate, now, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) / 1000 * rate)
local allowed = tokens >= cost
if allowed then tokens = tokens - cost end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000) + 1000)
return allowed and 1 or 0
```

Key: `rl:{tenantId}:{endpointClass}`. Capacity and rate come from the tenant's tier in the registry. Return `429` with `Retry-After`; expose limits in response headers (`RateLimit-*` style) so clients can adapt.

## Fair Job Scheduling

- Round-robin or weighted fair queuing across tenants instead of a single FIFO queue, so one tenant's 100k-job import does not starve others.
- Implementation options: per-tenant queues with a dispatcher; queue systems with group/partition keys and fairness (e.g. message group IDs with per-group concurrency); priority by tier.

## Database Hot Spots

- Monitor per-tenant query time (`pg_stat_statements` does not split by tenant; tag queries with a comment such as `/* tenant:123 */` or use application-side timing by tenant).
- Statement timeouts per role or per transaction (`SET LOCAL statement_timeout = '5s'`).
- Shard placement: tenant → shard mapping in the registry; move large tenants to their own shard (Citus tenant isolation, separate DB, or silo).

## Cell-Based Architecture

A cell is a complete, independent copy of the stack (compute, data, queues) serving a subset of tenants. A thin routing layer maps tenant → cell.

| Benefit | Detail |
|---|---|
| Blast radius | Failure or bad deploy affects one cell's tenants |
| Scale | Add cells instead of growing one huge system |
| Deploy safety | Roll out cell by cell (canary cell first) |
| Residency | Cells per region satisfy data residency |

Requirements: stateless router with cached tenant→cell map, no cross-cell synchronous dependencies in the request path, global services (identity, billing) kept minimal and highly available, cell sizing limits (max tenants/load per cell).

## Tenant Migration Between Shards or Cells

```
1. Mark tenant "migrating" (registry); keep serving from source
2. Copy data snapshot to target (logical replication / CDC per tenant, or bulk copy + change capture)
3. Catch up changes until lag is small
4. Brief write freeze for tenant (seconds): stop writes, drain queues, apply final changes
5. Verify (row counts, checksums per table)
6. Flip routing in registry to target; invalidate caches
7. Resume writes; keep source read-only for rollback window; then delete source data
```

Design prerequisites: every table has `tenant_id`; no cross-tenant joins in the data path; IDs globally unique (UUIDv7/ULID or tenant-scoped composite keys) so rows move without renumbering.

## Per-Tenant Observability

- Logs and traces carry `tenant_id`; dashboards filter by tenant for support.
- Metrics: avoid `tenant_id` as a label when tenants are numerous (cardinality); instead track top-N tenants, use exemplars, or compute per-tenant usage in a usage pipeline.
- Per-tenant SLOs for enterprise tiers, derived from request logs.
- Tenant health view: error rate, latency, throttled requests, job backlog.

## Cost Attribution

| Cost | Attribution method |
|---|---|
| Dedicated (silo) resources | Cloud cost allocation tags/labels per tenant |
| Shared compute | Proportional to measured usage (requests, CPU-seconds, job runtime) |
| Shared database | Proportional to storage bytes and query time per tenant |
| Storage | Per-tenant prefixes/buckets; storage inventory reports |
| Third-party APIs (e.g. LLM tokens) | Metered per call with tenant ID |

Emit usage events (`tenant_id`, metric, quantity, timestamp) to a usage store; the same data drives billing, quotas and unit economics (cost per tenant vs revenue per tenant).

## Tenant-Aware Deployments and Flags

- Feature flags targeted by tenant/tier for gradual rollout and enterprise-specific features.
- Version pinning for silo tenants with contractual change windows.
- Canary by tenant cohort (internal tenants first, then free tier, then paid).

## Pitfalls
- Global rate limits only: one tenant consumes everyone's capacity.
- Tenant ID as a Prometheus label with tens of thousands of tenants.
- Cells sharing a database "temporarily", defeating isolation.
- Sequential integer IDs shared across tenants, blocking migration.
- No per-tenant usage data, so pricing and quotas are guesses.

## Checklist
- [ ] Per-tenant rate, concurrency and job fairness controls by tier
- [ ] Per-tenant DB timeouts and shard placement for heavy tenants
- [ ] Cell or shard routing via tenant registry with cached lookup
- [ ] Tenant migration runbook tested, with verification and rollback
- [ ] Tenant-aware logs/traces; cardinality-safe metrics
- [ ] Usage events feeding cost attribution, quotas and billing
