# High Availability Fundamentals

High availability (HA) means a system keeps serving users despite component failures. This reference covers availability math, redundancy patterns, failure domains, health checking and failover, RTO/RPO, and the design habits that remove single points of failure. Tier definitions are in `availability-tiers.md`; load balancing in `load-balancing.md`; replication topologies in `replica-topologies.md`.

## Availability Math

| Availability | Downtime per year | Per 30 days |
|--------------|-------------------|-------------|
| 99% | about 3.65 days | about 7.2 hours |
| 99.9% | about 8.76 hours | about 43 minutes |
| 99.95% | about 4.38 hours | about 22 minutes |
| 99.99% | about 52.6 minutes | about 4.3 minutes |
| 99.999% | about 5.3 minutes | about 26 seconds |

Composition:
- Serial dependencies multiply: `A_total = A1 x A2 x ... x An`. Three 99.9% services in series give about 99.7%.
- Redundant (parallel) components with independent failures: `A = 1 - (1 - A1)(1 - A2)`. Two independent 99% instances give 99.99%, but only if failures are truly independent and failover works.

Implication: every synchronous dependency lowers your ceiling. A 99.99% target is not achievable on top of a single 99.9% dependency without redundancy or graceful degradation.

## Key Terms

| Term | Meaning |
|------|---------|
| SLA | Contractual commitment, often with credits |
| SLO | Internal target, stricter than the SLA |
| MTBF | Mean time between failures |
| MTTR | Mean time to recovery (detect + diagnose + repair) |
| RTO | Maximum acceptable time to restore service |
| RPO | Maximum acceptable data loss, measured in time |
| Failure domain | Set of components that fail together (host, rack, AZ, region, provider, deploy) |

Availability improves by raising MTBF (fewer failures) or lowering MTTR (faster recovery). Lowering MTTR is usually cheaper: good detection, automated failover, fast rollback.

## Redundancy Patterns

| Pattern | Description | Failover time | Cost |
|---------|-------------|---------------|------|
| Active-active | All instances serve traffic | Near zero (LB removes failed node) | Higher; must handle state consistency |
| Active-passive (hot standby) | Standby running and synchronized | Seconds to minutes | Standby capacity idle |
| Warm standby | Scaled-down copy, data replicated | Minutes | Moderate |
| Pilot light | Core data replicated, compute provisioned on failover | Tens of minutes to hours | Low |
| Backup and restore | Restore from backups | Hours | Lowest |

## Failure Domains

Spread redundant components across independent domains:
- Instances across hosts (anti-affinity) and Availability Zones.
- Databases with replicas in other AZs; consider regions for higher tiers.
- Avoid shared hidden dependencies: one DNS provider, one identity provider, one config service, one deploy pipeline pushing to all regions at once.

N+1 / N+2 capacity: after losing one domain (an AZ), the remaining capacity must carry peak load. With three AZs, each must handle 50% of peak if one fails.

## Stateless vs Stateful

- Stateless services: easy HA; run multiple replicas behind a load balancer, keep sessions in shared stores.
- Stateful services (databases, queues): HA depends on replication and leader election. Choose synchronous replication for RPO near zero (higher latency), asynchronous for performance (possible data loss on failover).

## Health Checks and Failover

| Check | Purpose |
|-------|---------|
| Liveness | Is the process stuck? Restart it. Must not depend on downstream services |
| Readiness | Can it serve traffic now? Remove from LB if not |
| Deep health | Dependencies reachable; use for dashboards, not for liveness |

Failover design:
- Automated detection with thresholds that avoid flapping (several consecutive failures).
- Fencing to prevent split brain: only one primary may accept writes (leases, quorum, STONITH in classic clusters).
- Quorum-based consensus (Raft/Paxos) with odd member counts across three or more domains.
- Test failover regularly; untested failover often fails when needed.

## Graceful Degradation

When a dependency fails, keep the core working:
- Serve cached or stale data with a notice.
- Disable non-critical features via feature flags.
- Queue writes for later processing.
- Timeouts, circuit breakers (Resilience4j, Polly) and bulkheads to stop failures cascading.

## Change Is the Top Cause of Outages

Many incidents start with deploys or configuration changes. HA practices therefore include:
- Progressive rollouts (canary, one AZ/region at a time).
- Fast, tested rollback.
- Config changes through the same review and rollout process as code.

## Data Protection Is Separate from HA

Replication copies corruption and deletes instantly. Keep point-in-time backups, test restores, and protect backups from the same credentials that can delete production.

## Checklist

- [ ] Availability target set per user journey with dependency math
- [ ] RTO/RPO defined and mapped to redundancy pattern
- [ ] No single point of failure across host, AZ and key shared services
- [ ] N+1 capacity after losing a failure domain
- [ ] Liveness/readiness checks separated; failover automated with fencing
- [ ] Graceful degradation paths for non-critical dependencies
- [ ] Progressive rollouts and rehearsed rollback
- [ ] Backups independent of replication, restores tested
