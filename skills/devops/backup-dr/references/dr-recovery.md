# Disaster Recovery Patterns

## RPO and RTO by Pattern

| Pattern | RPO | RTO | Cost | Complexity |
|---------|-----|-----|------|------------|
| Backup & Restore | Hours | Hours | Low | Low |
| Pilot Light | Minutes | 10-30min | Medium | Medium |
| Warm Standby | Seconds | 5-15min | High | Medium |
| Active-Active | <1s | <1s | Very High | High |
| Multi-region Active | <1s | 0 | Very High | Very High |

## Pilot Light

Core services run continuously in DR region (minimal footprint). On failover, scale up DR to full capacity.

```
Normal:               DR:
[Production]          [Database replica]
  App Servers           App Servers (stopped)
  Database              Database (replica, running)
  Queue                 SQS replica
  Cache                 Cache (empty, running)

Failover:
- Start app servers in DR
- Update DNS to DR
- Scale DR to match production

Fallback:
- Sync data back to production
- Switch DNS to production
- Scale down DR
```

## Warm Standby

DR region runs at reduced capacity (50%). On failover, scale to 100%.

| Component | Primary | DR |
|-----------|---------|-----|
| App servers | 10 (100%) | 5 (50%) |
| Database | Primary | Read replica |
| Cache | Full | Warm (populated) |
| Queue | Active | Replicating |
| DNS | Primary | Standby (health check) |

## Active-Active

Both regions serve traffic. Traffic split via DNS (Traffic Manager, Route53, Global Load Balancer).

| Consideration | Solution |
|--------------|----------|
| Data consistency | Conflict resolution (CRDT, last-writer-wins) |
| Session affinity | Sticky sessions or distributed session store |
| Failover | Remove region from DNS rotation |
| Data sync | Bidirectional replication (DynamoDB Global Tables, Spanner, CockroachDB) |

## Failover Runbook Template

```
## Service: {service-name}
## DR Pattern: {pilot-light | warm-standby | active-active}

### Pre-requisites
- [ ] DR region resources provisioned
- [ ] Database replication active and lag < threshold
- [ ] DNS health checks configured
- [ ] Alerting configured for DR region

### Failover Steps
1. [ ] Verify primary region status
2. [ ] If database: promote DR replica to primary
3. [ ] Scale DR compute to production capacity
4. [ ] Run health checks on DR environment
5. [ ] Update DNS to point to DR region
6. [ ] Verify end-to-end functionality
7. [ ] Announce failover to stakeholders

### Fallback Steps
1. [ ] Fix root cause in primary region
2. [ ] Verify primary region health
3. [ ] Replicate data from DR to primary
4. [ ] Switch DNS back to primary
5. [ ] Scale down DR region
6. [ ] Announce return to primary
```

## DR Testing

| Test Type | Frequency | What We Validate |
|-----------|-----------|-----------------|
| Tabletop | Monthly | Team knows their role |
| Component test | Quarterly | Individual systems failover |
| Full DR drill | Bi-annual | End-to-end failover + fallback |
| Chaos day | Annual | Unexpected failure scenarios |
