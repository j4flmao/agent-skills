# Backup 3-2-1 Rule

## The 3-2-1 Rule

> 3 copies of data, on 2 different media, with 1 off-site copy.

| Component | Description | Implementation |
|-----------|-------------|----------------|
| 3 copies | Original + 2 backups | Production, local backup, off-site backup |
| 2 media | Different storage types | SSD + Tape, or Disk + Cloud |
| 1 off-site | Separate location | Different region, different cloud, or physical off-site |

## Backup Types

| Type | What It Saves | Storage | Recovery | Frequency |
|------|---------------|---------|----------|-----------|
| Full | Everything | Full size | Fast | Weekly |
| Incremental | Changes since last backup | Small | Slow (need all increments) | Daily |
| Differential | Changes since last full | Medium | Medium | Daily |
| Log | Transaction log entries | Tiny | Point-in-time | Continuous |

## Retention Policies

| Tier | Duration | Frequency | Purpose |
|------|----------|-----------|---------|
| Hourly | 24h | Every hour | Quick recovery |
| Daily | 30 days | Daily | Recent recovery |
| Weekly | 3 months | Weekly | Short-term |
| Monthly | 12 months | Monthly | Compliance |
| Yearly | 7 years | Yearly | Legal/regulatory |

## Backup Validation

| Test | Frequency | What It Validates |
|------|-----------|-------------------|
| Restore test | Monthly | Can restore from backup |
| Integrity check | Weekly | Backup file not corrupted |
| DR drill | Quarterly | Full recovery process works |
| RPO validation | Monthly | Actual data loss in recovery |

## Velero for Kubernetes

```bash
# Install Velero
velero install \
  --provider aws \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --plugins velero/velero-plugin-for-aws:v1.0.0

# Backup all namespaces
velero backup create daily-backup --ttl 168h

# Backup specific resources
velero backup create app-backup \
  --include-namespaces production \
  --include-resources deployments,configmaps,secrets,pvc

# Schedule
velero schedule create daily --schedule="0 2 * * *" --ttl 168h

# Restore
velero restore create --from-backup daily-backup
```

## Cross-Region Replication

| Service | Method | RPO | RTO |
|---------|--------|-----|-----|
| S3 | CRR | 15min | 1min |
| RDS | Cross-region read replica | <5min | 5min |
| Aurora | Global database | <1s | 1min |
| EBS | Snapshot copy | 1h | 2h |
| DynamoDB | Global tables | <1s | <1s |
| Route53 | DNS failover | 0 | 1min |
