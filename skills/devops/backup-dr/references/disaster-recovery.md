# Disaster Recovery

## RTO/RPO by System Tier

| Tier | RPO | RTO | Examples | DR Strategy |
|------|-----|-----|----------|-------------|
| 1 - Critical | <5 min | <1 hr | Payment processing, user auth, core API | Multi-region active-active or warm standby |
| 2 - Important | <1 hr | <4 hrs | Order management, reporting, notifications | Warm standby or pilot light |
| 3 - Non-critical | <24 hr | <24 hrs | Logs, analytics, batch jobs | Backup-restore |
| 4 - Best effort | No RPO | No RTO | Dev/test, ephemeral workloads | None required |

## DR Patterns

### Backup-Restore
Cheapest, slowest recovery. Backups stored in separate region. On failover: provision infrastructure, restore from backup, update DNS. RTO: hours, RPO: minutes. Suitable for Tier 3 workloads. Example: S3 cross-region replication + RDS snapshot restore.

### Pilot Light
Core services (database, config, DNS) running in DR region at minimum scale. On failover: scale up compute, promote standby database, shift traffic. RTO: <1hr, RPO: <5min. Suitable for Tier 2 workloads. Example: RDS cross-region read replica + scaled-down EKS node pool.

### Warm Standby
Full DR environment running at reduced capacity. Database with synchronous or near-sync replication. Compute scaled to minimum, scale up on failover. DNS health checks automate failover. RTO: <30min, RPO: <5min. Suitable for Tier 1 workloads with budget constraints.

### Multi-Region Active-Active
Traffic distributed across multiple regions via global load balancer. Database multi-master with conflict resolution or application-level replication. Near-zero RTO/RPO. Most expensive. Requires stateless or carefully designed stateful applications. Suitable for mission-critical Tier 1 workloads.

## Failover Runbook
```bash
# Step 1: Verify incident severity and declare DR event
# Step 2: Notify stakeholders via PagerDuty incident

# Step 3: Promote standby database
aws rds promote-read-replica --db-instance-identifier myapp-dr
az sql db replica promote --name myapp --server myapp-dr --resource-group rg-dr
gcloud sql instances promote-replica myapp-dr

# Step 4: Scale up compute in DR region
kubectl scale deployment myapp --replicas=10 -n myapp
aws ecs update-service --cluster myapp --service myapp --desired-count 10

# Step 5: Update DNS to point to DR
aws route53 change-resource-record-sets --hosted-zone-id ZONEID \
  --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"api.example.com","Type":"A","SetIdentifier":"dr","Failover":"PRIMARY","AliasTarget":{"HostedZoneId":"DR_LB_ZONE_ID","DNSName":"dr-lb.us-west-2.elb.amazonaws.com","EvaluateTargetHealth":true}}}]}'

# Step 6: Verify system health
curl -f https://api.example.com/health

# Step 7: Monitor for 30 minutes before declaring DR complete
# Step 8: Communicate status and begin RCA
```

## DR Runbook Template
```markdown
# DR Runbook: myapp-prod

## System Details
- Application: myapp (Tier 1)
- Primary Region: us-east-1
- DR Region: us-west-2
- RTO: 1 hour | RPO: 5 minutes

## Prerequisites
- [ ] DR infrastructure validated within last 30 days
- [ ] Backups verified within last 7 days
- [ ] DR team contacts current
- [ ] Runbook reviewed and approved

## Failover Steps
1. Declare incident in PagerDuty
2. Verify DR infra running: `kubectl get nodes -n myapp`
3. Promote database: run `scripts/promote-db.sh`
4. Point DNS to DR: run `scripts/failover-dns.sh dr`
5. Validate health: `curl https://api.example.com/health`
6. Monitor for 30 minutes before declaring DR complete

## Fallback
1. Fix primary region issue
2. Replicate data back from DR to primary
3. Run `scripts/failback.sh` to return traffic to primary
```

## DR Testing Schedule
```yaml
testing:
  tier1_critical:
    failover_test: quarterly
    backup_restore: monthly
    tabletop: quarterly
  tier2_important:
    failover_test: semi-annually
    backup_restore: monthly
    tabletop: semi-annually
  tier3_noncritical:
    backup_restore: quarterly
    tabletop: annually
```

## Backup Restore Test
```bash
velero restore create --from-backup daily-20260521 \
  --namespace-mappings myapp:myapp-restore-test \
  --labels restore-test=true

kubectl get pods -n myapp-restore-test
kubectl exec deploy/myapp -n myapp-restore-test -- curl localhost:8080/health
```

## Key Points
- DR strategy selected per system tier based on RTO/RPO requirements
- Warm standby offers best balance of cost and recovery speed
- Active-active is expensive but provides near-zero RTO/RPO
- Tabletop exercises validate RTO assumptions without infrastructure cost
- Full failover tests quarterly for Tier 1 — no excuses
- Runbooks version-controlled, tested, and reviewed after each drill
- DR documentation includes primary/secondary contacts for each system
