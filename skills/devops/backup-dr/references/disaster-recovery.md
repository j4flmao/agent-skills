# Disaster Recovery

## DR Patterns

### Active-Passive (Warm Standby)

```yaml
# Primary region: us-east-1
# DR region: us-west-2
dr:
  pattern: active-passive
  primary: us-east-1
  secondary: us-west-2
  failover:
    trigger: manual (with runbook) or automated (with health checks)
    rto: 1 hour
    rpo: 5 minutes
  components:
    database: cross-region read replica with promotion on failover
    storage: cross-region replication (S3 CRR / Blob object replication)
    compute: standby cluster scaled to minimum, scaled up on failover
    dns: Route53 / Traffic Manager with health probe
```

### Active-Active (Multi-Region)

```yaml
dr:
  pattern: active-active
  regions: [us-east-1, eu-west-1]
  failover:
    trigger: automated (DNS health probe)
    rto: near-zero (traffic shifted to remaining region)
    rpo: near-zero (synchronous replication)
  requirements:
    - application stateless or with conflict resolution
    - database multi-master or application-level replication
    - global load balancer (AWS Global Accelerator / Azure Front Door)
```

## RTO/RPO by System Tier

| Tier | RPO | RTO | Examples |
|------|-----|-----|----------|
| 1 - Critical | <5 min | <1 hr | Payment processing, user auth |
| 2 - Important | <1 hr | <4 hrs | Order management, reporting |
| 3 - Non-critical | <24 hr | <24 hrs | Logs, analytics, batch jobs |
| 4 - Best effort | No RPO | No RTO | Dev/test, ephemeral workloads |

## Failover Runbook

```bash
# Step 1: Verify incident severity
# Step 2: Declare DR event in incident management (PagerDuty/Opsgenie)

# Step 3: Promote standby database
# AWS RDS
aws rds promote-read-replica --db-instance-identifier myapp-dr
# Azure SQL
az sql db replica promote --name myapp --server myapp-dr --resource-group rg-dr
# GCP Cloud SQL
gcloud sql instances promote-replica myapp-dr

# Step 4: Scale up compute in DR region
# K8s: Scale deployments
kubectl scale deployment myapp --replicas=10 -n myapp

# Step 5: Update DNS
# Route53 failover
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONEID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "dr",
        "Failover": "PRIMARY",
        "AliasTarget": {
          "HostedZoneId": "DR_LB_ZONE_ID",
          "DNSName": "dr-lb-12345.us-west-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Step 6: Verify system health
curl -f https://api.example.com/health

# Step 7: Communicate status to stakeholders
# Step 8: Begin root cause analysis
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

```bash
# Backup restore test
velero restore create --from-backup daily-20260521 \
  --namespace-mappings myapp:myapp-restore-test \
  --labels restore-test=true

# Verify restore
kubectl get pods -n myapp-restore-test
kubectl exec deploy/myapp -n myapp-restore-test -- curl localhost:8080/health
```

## Runbook Template

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

## Failover Steps
1. Declare incident in PagerDuty
2. Verify DR infrastructure is running: `kubectl get nodes -n myapp`
3. Promote database: run `scripts/promote-db.sh`
4. Point DNS to DR: run `scripts/failover-dns.sh dr`
5. Validate health: `curl https://api.example.com/health`
6. Monitor for 30 minutes before declaring DR complete

## Fallback
1. Fix primary region issue
2. Replicate data back from DR to primary
3. Run `scripts/failback.sh` to return traffic to primary
```
