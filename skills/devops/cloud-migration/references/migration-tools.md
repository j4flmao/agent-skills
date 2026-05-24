# Cloud Migration Tools

## Server Migration

| Cloud | Agentless | Agent-based | Bulk Transfer |
|-------|-----------|-------------|---------------|
| AWS | AWS MGN (CloudEndure) | AWS SMS | AWS Snowball/Family |
| Azure | Azure Migrate (appliance) | Azure Migrate (agents) | Azure Data Box |
| GCP | Migrate for Compute | Migrate for Compute (agent) | Transfer Appliance |

## Database Migration

| Source | Target | Tool | Method |
|--------|--------|------|--------|
| MySQL | RDS/Aurora | DMS | CDC, full load |
| PostgreSQL | RDS Aurora | DMS + pglogical | CDC, read replica |
| Oracle | RDS/EC2 | DMS + GoldenGate | CDC, export/import |
| SQL Server | RDS/EC2 | DMS | CDC, backup/restore |
| MongoDB | DocumentDB | DMS | Full load only |
| Cassandra | Keyspaces | Migrate tool | Full + CDC |
| Elasticsearch | OpenSearch | Logstash, reindex | Snapshot/restore |

## Data Transfer

| Volume | Tool | Time Estimate | Cost |
|--------|------|---------------|------|
| < 1TB | AWS CLI / AzCopy / gsutil | Hours | Free |
| 1-10TB | Snowcone / Data Box Disk | Days | Low |
| 10-50TB | Snowball Edge | 1-2 weeks | Medium |
| 50-500TB | Snowmobile / Data Box Heavy | 2-4 weeks | High |
| > 500TB | Direct Connect (10Gbps+) | 2+ weeks | High recurring |

## Migration Testing Strategy

| Phase | What to Test | Success Criteria |
|-------|-------------|-----------------|
| Smoke test | Basic connectivity, DNS resolution | All services reachable |
| Functional test | Core business flows work | 100% pass |
| Performance test | Latency, throughput comparison | Within 20% of source |
| Load test | Sustained traffic handling | No degradation at peak |
| Cutover dry run | Full cutover with rollback | Complete in 4 hours |
| User acceptance | Business users validate | Sign-off required |

## Cutover Checklist

```yaml
# Pre-cutover (24h before)
- [ ] Final full synchronization complete
- [ ] DNS TTL lowered to 60 seconds
- [ ] Monitoring on target environment verified
- [ ] Rollback plan confirmed
- [ ] Stakeholders notified

# Cutover window
- [ ] Application traffic drained from source
- [ ] Final CDC replication applied
- [ ] Target database promoted to read-write
- [ ] DNS updated to target environment
- [ ] Health checks passing
- [ ] Smoke tests passing

# Post-cutover
- [ ] Monitoring dashboards healthy
- [ ] Alerts configured and tested
- [ ] Backup/DR on target configured
- [ ] Source environment decommissioned or read-only
```

## Rollback Triggers

| Condition | Action |
|-----------|--------|
| DNS propagation issues | Increase TTL, wait, retry |
| Performance degradation > 20% | Switch back to source |
| Critical error rate > 0.5% | Switch back to source |
| Data sync latency > 1 minute | Halt cutover, investigate |
| Security/compliance finding | Halt cutover, remediate |
| Stakeholder escalation | Decision required |
