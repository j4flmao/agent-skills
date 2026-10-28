# Advanced High Availability: Multi-Region, Cell Architecture, Static Stability, Resilience Testing

Patterns for systems targeting very high availability: multi-region active-active and active-passive designs, cell-based architecture to limit blast radius, static stability, dependency isolation, global traffic management, and continuous verification through game days and chaos engineering.

## Multi-Region Options

| Design | Writes | RPO | RTO | Complexity |
|--------|--------|-----|-----|------------|
| Active-passive with async replication | Primary region only | Seconds to minutes of lag | Minutes (promotion + traffic shift) | Moderate |
| Active-passive with sync replication | Primary only | Near zero | Minutes | Latency cost on every write |
| Active-active, partitioned by user/tenant (home region) | Each region owns a subset | Per partition | Fast for unaffected partitions | Routing and data placement |
| Active-active, multi-writer | Any region | Depends on conflict resolution | Near zero | Highest: conflicts, ordering |

Multi-writer options: globally distributed SQL (Google Spanner, CockroachDB, YugabyteDB) with consensus-based replication; multi-region NoSQL tables with last-writer-wins (DynamoDB global tables, Cosmos DB multi-region writes with configurable conflict policies); CRDT-based data types. Understand each product's consistency guarantees before relying on them.

## Choosing a Region Strategy

```
Is regional outage tolerance required by business/regulation?
├─ no  → multi-AZ in one region (most systems)
└─ yes
   ├─ Can tolerate minutes of RTO and some data loss? → active-passive, async
   ├─ Data naturally partitions by user/tenant?        → active-active home-region
   └─ Needs global writes with strong consistency?     → consensus database across 3+ regions
```

Multi-region roughly doubles infrastructure and operational cost; justify it with RTO/RPO requirements.

## Cell-Based Architecture

Split the system into independent cells, each a full copy of the stack serving a subset of customers.

```
Router (thin, highly available) ──► cell 1 (customers A-F)
                                ├─► cell 2 (customers G-M)
                                └─► cell N
```

- Blast radius: a bad deploy, poison request or overload affects one cell.
- Deploy cell by cell; the first cell acts as a canary.
- Cell router must be simple and very reliable; keep its mapping data replicated and cached.
- Capacity per cell is bounded; add cells to scale rather than growing cells indefinitely.
- Shuffle sharding: assign each customer to a random subset of resources so one noisy customer cannot take down others sharing exactly the same set.

## Static Stability

A statically stable system keeps working during a failure without needing to make changes (scale up, call control planes) at that moment.

| Practice | Example |
|----------|---------|
| Pre-provision capacity | Run enough capacity in each AZ to absorb an AZ loss instead of relying on autoscaling during the event |
| Data plane independent of control plane | Services keep using cached config/credentials when the config service is down |
| Avoid failover paths that call failing APIs | DNS changes or instance launches during a regional event may be impaired |
| Long-lived credentials caches with safe expiry | Token validation with cached keys (JWKS) |

## Dependency Isolation

- Classify dependencies: critical (request fails without it) vs non-critical (degrade).
- Bulkheads: separate pools/threads/connections per dependency so one slow dependency does not exhaust shared resources.
- Timeouts shorter than callers' budgets; bounded retries with jitter at one layer only; retry budgets.
- Circuit breakers via Resilience4j, Polly or Envoy outlier detection (Hystrix is in maintenance mode).
- Load shedding: reject excess requests early (priority-aware) to keep goodput up under overload.
- Avoid cross-region synchronous calls on the request path.

## Global Traffic Management

| Mechanism | Failover speed | Notes |
|-----------|----------------|-------|
| DNS-based (health-checked records, latency/geo routing) | TTL-dependent; clients may cache longer | Simple; keep TTLs low for failover records |
| Anycast global load balancers (cloud global LBs, CDN) | Fast | Provider dependency |
| Client-side region selection | Fast if clients implement it | Mobile/SDK control needed |

Practice traffic evacuation regularly: drain a region on purpose to prove capacity and procedures.

## Data Consistency During Failover

- Async replication: promoting a replica may lose the last seconds of writes. Decide in advance how to reconcile (replay from source events, accept loss, manual repair).
- Prevent split brain: the old primary must be fenced before the new one accepts writes.
- Idempotency keys let clients retry safely across failovers.
- Outbox/event logs help rebuild downstream state.

## Deployment Safety at Scale

- Waves: one cell or AZ, then one region, then the rest, with bake time and automated health gates.
- Automatic rollback on SLO regression.
- Separate configuration pushes from code deploys, with the same staged rollout.
- Freeze or extra review for changes to global components (DNS, identity, routing).

## Verification: Game Days and Chaos Engineering

| Practice | Examples |
|----------|----------|
| Game days | Planned exercises: fail an AZ, revoke a dependency, restore a database |
| Chaos experiments | Inject latency, kill pods/instances, partition networks (AWS FIS, Azure Chaos Studio, Chaos Mesh, LitmusChaos, Gremlin) |
| DR drills | Full region failover with timing against RTO/RPO |
| Load tests | Validate N+1 capacity at peak |

Start in staging with hypotheses and abort conditions, then move to production with limited blast radius. Track action items to completion.

## Measuring

- SLOs per critical journey with burn-rate alerting.
- Track MTTD/MTTR and incident causes (change, capacity, dependency, hardware).
- Record failover drill results: actual RTO and RPO vs targets.

## Checklist

- [ ] Region strategy justified by explicit RTO/RPO
- [ ] Cells or shuffle sharding limit blast radius
- [ ] Statically stable: capacity pre-provisioned, data plane independent of control plane
- [ ] Bulkheads, timeouts, circuit breakers, load shedding
- [ ] Global traffic failover tested with low-TTL or anycast
- [ ] Split-brain fencing and post-failover reconciliation plan
- [ ] Wave-based deploys with automatic rollback
- [ ] Regular game days and DR drills with measured results
