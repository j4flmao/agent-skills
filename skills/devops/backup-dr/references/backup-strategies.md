# Backup Strategies

## Database Backup (PostgreSQL)

```bash
# Full backup
pg_dump -h prod-db.example.com -U myapp -d myapp \
  -F c -f /backups/myapp_$(date +%Y%m%d_%H%M%S).dump

# WAL archiving (continuous archiving)
archive_mode = on
archive_command = 'aws s3 cp %p s3://myapp-db-backups/wal/%f'

# Point-in-time recovery
pg_restore -h new-db -U myapp -d myapp \
  --clean --if-exists /backups/myapp_20260522_030000.dump

# AWS RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier myapp-prod \
  --db-snapshot-identifier myapp-prod-$(date +%Y%m%d-%H%M)

# Automated backup retention
aws rds modify-db-instance \
  --db-instance-identifier myapp-prod \
  --backup-retention-period 35 \
  --preferred-backup-window 02:00-03:00
```

## Kubernetes Backup with Velero

### Installation

```bash
# Install Velero with AWS S3 backend
velero install \
  --provider aws \
  --bucket myapp-velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --plugins velero/velero-plugin-for-aws:v1.7 \
  --use-volume-snapshots=true

# With Azure Blob
velero install \
  --provider azure \
  --bucket myapp-velero-backups \
  --backup-location-config resourceGroup=rg-platform,storageAccount=myappbackups \
  --plugins velero/velero-plugin-for-microsoft-azure:v1.7
```

### Backup Commands

```bash
# On-demand backup
velero backup create myapp-full-$(date +%Y%m%d) \
  --include-namespaces myapp \
  --include-resources deployments,configmaps,secrets,pvc \
  --ttl 720h

# Scheduled backup
velero schedule create daily-myapp \
  --schedule "0 2 * * *" \
  --include-namespaces myapp \
  --ttl 168h \
  --include-resources '*'

# Restore
velero restore create --from-backup myapp-full-20260522

# List backups
velero backup get
```

## File Storage Replication

```bash
# AWS S3 cross-region replication
aws s3api put-bucket-replication \
  --bucket myapp-primary \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789:role/s3-replication-role",
    "Rules": [{
      "Status": "Enabled",
      "Priority": 1,
      "DeleteMarkerReplication": {"Status": "Disabled"},
      "Filter": {"Prefix": ""},
      "Destination": {
        "Bucket": "arn:aws:s3:::myapp-dr",
        "StorageClass": "STANDARD_IA"
      }
    }]
  }'

# Azure Blob object replication
az storage account blob-service-properties update \
  --account-name myappstorage \
  --enable-change-feed true \
  --enable-versioning true

# GCP Cloud Storage replication
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
