# Cloud Migration

## The 6 R Strategies

| Strategy | Description | Effort | Benefit |
|----------|-------------|--------|---------|
| Rehost (Lift & Shift) | Move as-is to cloud VMs | Low | Quick win, no code change |
| Replatform | Move with minimal cloud optimizations (e.g., RDS for self-managed DB) | Medium | Better perf, less ops |
| Refactor | Re-architect for cloud-native (microservices, serverless) | High | Full cloud benefit |
| Repurchase | Replace with SaaS alternative | Low | No migration needed |
| Retire | Decommission unused apps | Low | Cost savings |
| Retain | Keep on-premise for now | None | When not ready |

## Migration Phases

### Phase 1: Assessment
- Discover all workloads (agents, CMDB, API scans)
- Dependency mapping between apps, databases, network
- TCO analysis — current vs cloud cost for 3 years
- Compliance requirements checklist

### Phase 2: Plan
- Wave grouping by dependency, business priority
- Migration wave pattern: assess → pilot → wave 1-2 (low risk) → wave 3-5
- Landing zone design per environment
- Connectivity: Direct Connect / ExpressRoute / VPN

### Phase 3: Migrate
- Database: CDC replication first, cutover window
- Stateful workloads: storage sync, cutover
- Stateless: deploy to cloud, shift traffic via DNS/GSLB
- Cutover runbook per wave with rollback

### Phase 4: Optimize
- Right-size resources based on actual usage (30-50% downsizing typical)
- Reserved instances / savings plans after stable period
- Auto-scaling policies
- Delete orphaned resources
- Tag enforcement for cost allocation

## Migration Tools

| Cloud | Server Migration | Database Migration | Data Transfer |
|-------|-----------------|-------------------|---------------|
| AWS | MGN, SMS | DMS | Snowball, DataSync |
| Azure | Migrate | DMS | AzCopy, Data Box |
| GCP | Migrate for Compute | Database Migration Service | Transfer Appliance |

## Common Pitfalls

- Underestimating network latency between on-prem and cloud
- Security group rules too permissive during migration
- No rollback plan for each wave
- Missing dependency discovery (app talks to unexpected DB)
- Licensing costs in cloud (Oracle, SQL Server)
- Data egress costs for hybrid workloads
