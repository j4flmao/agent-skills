# Backup Strategies

## Database Backup (PostgreSQL)
```bash
pg_dump -h prod-db.example.com -U myapp -d myapp \
  -F c -f /backups/myapp_$(date +%Y%m%d_%H%M%S).dump

pg_restore -h new-db -U myapp -d myapp \
  --clean --if-exists /backups/myapp_20260522_030000.dump
```

### WAL Archiving (Continuous Archiving)
```conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://myapp-db-backups/wal/%f'
archive_timeout = 300
```
WAL archiving enables point-in-time recovery to any second within retention. Archive stored in separate region from production. Test WAL restore monthly — corrupted archive is as good as no archive.

### RDS Automated Backups
```bash
aws rds create-db-snapshot \
  --db-instance-identifier myapp-prod \
  --db-snapshot-identifier myapp-prod-$(date +%Y%m%d-%H%M)

aws rds modify-db-instance \
  --db-instance-identifier myapp-prod \
  --backup-retention-period 35 \
  --preferred-backup-window 02:00-03:00
```

### Backup Types Comparison
| Type | Speed | Storage | RPO | Use Case |
|------|-------|---------|-----|----------|
| Full | Slow | High | N/A | Weekly baseline |
| Incremental | Fast | Low | Minutes | Daily changes |
| Differential | Medium | Medium | Hours | Fast daily restore |
| WAL archive | Continuous | Medium | Seconds | PITR capability |

## Kubernetes Backup with Velero

### Installation
```bash
velero install --provider aws --bucket myapp-velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --plugins velero/velero-plugin-for-aws:v1.7 \
  --use-volume-snapshots=true

velero install --provider azure --bucket myapp-velero-backups \
  --backup-location-config resourceGroup=rg-platform,storageAccount=myappbackups \
  --plugins velero/velero-plugin-for-microsoft-azure:v1.7
```

### Backup Commands
```bash
velero backup create myapp-full-$(date +%Y%m%d) \
  --include-namespaces myapp \
  --include-resources deployments,configmaps,secrets,pvc \
  --ttl 720h

velero schedule create daily-myapp \
  --schedule "0 2 * * *" --include-namespaces myapp \
  --ttl 168h --include-resources '*'

velero restore create --from-backup myapp-full-20260522

velero restore create --from-backup myapp-full-20260522 \
  --namespace-mappings myapp:myapp-restore-test

velero backup get
velero restore get
```

### Backup Validation
After restore, verify: pods running (`kubectl get pods -n myapp-restore-test`), data accessible, service endpoints responding, ingress configured. Automate via `velero restore create ... --wait` in CI.

## File Storage Replication
```bash
aws s3api put-bucket-replication --bucket myapp-primary \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789:role/s3-replication-role",
    "Rules": [{"Status": "Enabled", "Priority": 1,
      "DeleteMarkerReplication": {"Status": "Disabled"},
      "Filter": {"Prefix": ""},
      "Destination": {"Bucket": "arn:aws:s3:::myapp-dr", "StorageClass": "STANDARD_IA"}
    }]
  }'

gcloud storage buckets update gs://myapp-primary \
  --recovery-point-objective=15m \
  --replication-region=us-central1,us-east1
```

## Retention Policies
```yaml
retention:
  database:
    daily: 7 days
    weekly: 4 weeks
    monthly: 12 months
    yearly: 7 years
  kubernetes:
    daily: 14 days
    weekly: 8 weeks
  file_storage:
    versioning: true
    noncurrent_version_retention: 90 days
  snapshots:
    max_age: 30 days
    auto_delete_orphaned: true
```

## 3-2-1 Rule
3 copies of data (1 primary + 2 backups), 2 different storage types (e.g., object storage + tape, or local + cloud), 1 copy offsite (different region, different account). For critical systems: 3-2-1-1-0 rule adds 1 immutable copy and 0 errors after restore verification.

## Key Points
- Full weekly + incremental daily + WAL continuous for database
- Velero for K8s cluster state and PV snapshots
- Untested backup is not a backup — restore test monthly
- WAL archive corruption detection via periodic restore validation
- Retention policies balanced against compliance requirements and cost
- Cross-region replication automatic for blob storage, manual for databases
- Backup monitoring with Grafana dashboards and PagerDuty alerts
