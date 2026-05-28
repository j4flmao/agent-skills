# Longhorn Disaster Recovery

## Overview

Disaster recovery for Longhorn storage involves protecting data against node failures, cluster failures, and regional outages through backup, replication, and DR volume strategies. This reference covers backup target configuration, recurring jobs, DR volumes, restore procedures, and multi-cluster DR architectures.

## Disaster Recovery Fundamentals

### Key Concepts

- **RPO (Recovery Point Objective)**: Maximum acceptable data loss measured in time. Determines backup frequency.
- **RTO (Recovery Time Objective)**: Maximum acceptable downtime. Determines restore procedure complexity.
- **Backup**: Point-in-time copy of volume data to external storage (S3, NFS, SMB).
- **DR Volume**: Persistent volume in a secondary cluster that continuously syncs from backup target.
- **Snapshot**: Instant point-in-time copy within the Longhorn cluster (not a backup).
- **Backup Target**: External storage location for volume backups.

### RPO and RTO by Strategy

| Strategy | RPO | RTO | Cost | Complexity |
|---|---|---|---|---|
| No backup | Unlimited | N/A (data lost) | Lowest | None |
| Daily backup to S3 | 24 hours | 1-4 hours | Low (S3 storage) | Low |
| Hourly backup to S3 | 1 hour | 30-60 minutes | Low-Medium | Low |
| DR volume (continuous) | Minutes | 15-30 minutes | Medium (DR cluster) | Medium |
| Active-active (stretch) | Near-zero | < 1 minute | High (sync replication) | High |

## Backup Target Configuration

### Supported Backup Targets

| Target | Type | Pros | Cons |
|---|---|---|---|
| S3-compatible | Object | Durable, scalable, standard | Egress costs |
| NFS | File | Simple, local network | Single point of failure |
| SMB | File | Windows compatible | Performance overhead |
| Azure Blob | Object | Azure-native | Azure-only |

### S3 Backup Target Setup

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-backup-secret
  namespace: longhorn-system
stringData:
  AWS_ACCESS_KEY_ID: "YOUR_ACCESS_KEY"
  AWS_SECRET_ACCESS_KEY: "YOUR_SECRET_KEY"
  AWS_ENDPOINTS: "https://s3.us-east-1.amazonaws.com"
  # For MinIO or custom endpoint:
  # AWS_ENDPOINTS: "https://minio.example.com"
```

```yaml
# Backup target settings via Longhorn UI or CLI
backupTarget: "s3://longhorn-backups@us-east-1/"
backupTargetCredentialSecret: "longhorn-backup-secret"
# Optional: backup target certificate for TLS
backupTargetCA: ""
```

### NFS Backup Target Setup

```yaml
# NFS backup target
backupTarget: "nfs://nfs-server.example.com:/export/longhorn-backups"
backupTargetCredentialSecret: ""  # Not needed for NFS
```

### Backup Target Validation

```bash
# Check backup target status
kubectl -n longhorn-system get setting longhorn-backup-target

# List backups
kubectl -n longhorn-system get backups

# Poll backup state
kubectl -n longhorn-system get backup -o wide

# Check backup volume status
kubectl -n longhorn-system get backupvolume
```

## Recurring Backup Jobs

### Job Types

| Job Type | Description | Use Case |
|---|---|---|
| backup | Full volume backup | Regular data protection |
| snapshot | Point-in-time snapshot | Quick restore within cluster |
| backup-force | Backup even if degraded | Emergency data capture |
| snapshot-force | Snapshot even if degraded | Emergency capture |
| backup-cleanup | Remove old backups | Retention management |

### Backup Schedule Configuration

```yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: hourly-backup
  namespace: longhorn-system
spec:
  cron: "0 * * * *"
  task: backup
  retain: 24
  concurrency: 2
  labels:
    backup-type: hourly
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"
  task: backup
  retain: 30
  concurrency: 2
  labels:
    backup-type: daily
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-backup
  namespace: longhorn-system
spec:
  cron: "0 3 * * 0"
  task: backup
  retain: 12
  concurrency: 2
  labels:
    backup-type: weekly
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: snapshot-cleanup
  namespace: longhorn-system
spec:
  cron: "0 4 * * *"
  task: snapshot-cleanup
  retain: 48
  concurrency: 2
  labels:
    task: cleanup
```

### Assigning Recurring Jobs to Volumes

```yaml
# Assign via StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-backed-up
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  recurringJobSelector: '[{"name":"hourly-backup"},{"name":"daily-backup"}]'

# Assign via Volume spec
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: pvc-orders-db
  namespace: longhorn-system
spec:
  recurringJobSelector:
    - name: hourly-backup
      isGroup: false
    - name: daily-backup
      isGroup: false
```

## Snapshots

### Snapshot Management

```bash
# Create snapshot via CLI
kubectl -n longhorn-system create -f - <<EOF
apiVersion: longhorn.io/v1beta2
kind: Snapshot
metadata:
  name: pre-upgrade-snapshot
  namespace: longhorn-system
spec:
  volume: pvc-orders-db
EOF

# List snapshots for a volume
kubectl -n longhorn-system get snapshot -l "longhornvolume=pvc-orders-db"

# Delete old snapshots
kubectl -n longhorn-system delete snapshot old-snapshot-name
```

### Snapshot vs Backup Decision

| Aspect | Snapshot | Backup |
|---|---|---|
| Location | Local cluster | External target (S3, NFS) |
| Speed | Instant | Depends on data size and network |
| Protection against cluster failure | No (stored in cluster) | Yes (external storage) |
| Restore speed | Instant | Requires download from backup target |
| Storage cost | Uses cluster disk | S3/NFS costs |
| Use case | Quick rollback, dev/test | DR, cluster failure |
| Retention | Limited by cluster disk | Configurable, indefinite |

**Rule**: Snapshots for operational recovery (upgrade rollback). Backups for disaster recovery.

## Disaster Recovery Volume

### DR Volume Overview

A DR Volume is a volume in a secondary cluster that continuously restores from a backup stored on the backup target. When a new backup is created in the primary cluster, the DR volume automatically syncs.

### DR Volume Architecture

```
[Primary Cluster]
   Volume (pvc-orders-db)
        |
        | (Recurring backup job)
        v
   [S3 Backup Target]
   s3://longhorn-backups/
        |
        | (DR volume syncs from backup)
        v
[DR Cluster]
   DR Volume (dr-orders-db)
        |
   (Activated on failover)
        v
   Active Volume
```

### Creating a DR Volume

```yaml
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: dr-orders-db
  namespace: longhorn-system
spec:
  fromBackup: "s3://longhorn-backups@us-east-1/?backup=backup-orders-v1&volume=pvc-orders-db"
  numberOfReplicas: 3
  staleReplicaTimeout: 30
  nodeSelector:
    region: dr-region
  recurringJobSelector:
    - name: daily-backup
      isGroup: false
```

### Monitoring DR Volume Status

```bash
# Check DR volume state
kubectl -n longhorn-system get volume dr-orders-db -o yaml

# DR volume states:
#   restoring: initial backup restore in progress
#   running: active DR sync, waiting for new backups
#   activated: DR volume has been activated for use
#   degraded: sync is behind or failed

# Check last backup sync time
kubectl -n longhorn-system get volume dr-orders-db \
  -o jsonpath='{.status.lastBackup}'

# Check backup volume status on backup target
kubectl -n longhorn-system get backupvolume pvc-orders-db
```

### Activating a DR Volume

```bash
# When primary cluster fails:

# 1. Verify DR volume is fully synced
kubectl -n longhorn-system get volume dr-orders-db | grep dr-orders-db

# 2. Activate the DR volume (converts to regular volume)
kubectl -n longhorn-system edit volume dr-orders-db
# Remove: fromBackup
# Set:  spec.disableFrontend: false  (if set to true)

# 3. Create PVC pointing to the activated volume
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-db-pvc
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-dr
  resources:
    requests:
      storage: 100Gi
  volumeName: dr-orders-db
```

### Failback Procedure

```bash
# When primary cluster recovers:

# 1. Create backup of DR volume (now active in DR cluster)
kubectl -n longhorn-system create -f - <<EOF
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: failback-backup
  namespace: longhorn-system
spec:
  cron: "*/5 * * * *"
  task: backup
  retain: 10
  concurrency: 2
EOF

# 2. Create DR volume in recovered primary cluster
#    (from the DR cluster's latest backup)

# 3. Once primary DR volume is synced, activate it
#    (repeat activation procedure above)

# 4. Update DNS / application config to point to primary

# 5. Verify data consistency

# 6. Decommission DR cluster volumes
kubectl -n longhorn-system delete volume dr-orders-db
```

## Restore Procedures

### Restore from Backup

```yaml
# Method 1: Restore via Longhorn UI
#   - Go to Backup tab
#   - Select backup
#   - Click "Restore"
#   - Configure volume name, size, number of replicas

# Method 2: Restore via CRD
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: restored-orders-db
  namespace: longhorn-system
spec:
  fromBackup: "s3://longhorn-backups@us-east-1/?backup=backup-20250115-020000&volume=pvc-orders-db"
  numberOfReplicas: 3
  staleReplicaTimeout: 30
  nodeSelector:
    region: primary
```

### Restore Validation

```bash
# 1. Verify volume is created and healthy
kubectl -n longhorn-system get volume restored-orders-db

# 2. Check restore progress
kubectl -n longhorn-system get volume restored-orders-db \
  -o jsonpath='{.status.conditions}' | jq

# 3. Once healthy, create PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-db-restored
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: longhorn-restored
  volumeName: restored-orders-db

# 4. Verify data integrity
kubectl run verify-restore --image=postgres:15 \
  --namespace production \
  --rm -it --restart=Never -- \
  psql -h orders-db-restored -c "SELECT count(*) FROM orders"
```

## Multi-Cluster DR Architecture

### Active-Passive DR

```
[Primary Region: us-east-1]
   [K8s Cluster 1]
   [Longhorn: 3 replicas]
        |
   [Recurring backup: hourly to S3]
        |
        v
[S3 Bucket: Cross-Region Replication]
        |
        v
[DR Region: us-west-2]
   [K8s Cluster 2]
   [DR Volumes: continuous sync]
   [Standby capacity: reduced resources]
```

**Failover Steps**:
1. Detect primary region failure
2. Activate DR volumes (convert to regular)
3. Scale up DR cluster capacity
4. Update DNS to point to DR region
5. Verify application health
6. Monitor DR cluster

### Active-Active (with Read Replicas)

```
[Region: us-east-1]
   [Primary DB: ReadWrite]
   [Longhorn Volume Replicas]
        |
   [Hourly Backup]
        |
        v
[Region: eu-west-1]     [Region: ap-southeast-1]
   [DR Volume Read Replica]  [DR Volume Read Replica]
   [App: Read-Only]          [App: Read-Only]
```

**Limitations**: Writes must go to primary. Read-only workloads can use DR volumes.

### Backup Replication Strategy

```yaml
# S3 bucket replication for cross-region DR
Source bucket: longhorn-backups-us-east-1
Destination bucket: longhorn-backups-us-west-2
Replication rules:
  - Status: Enabled
    Prefix: ""
    Destination:
      Storage class: STANDARD_IA
    Delete marker replication: Enabled
    Replica modifications:
      - Server-side encryption: AES256
```

## Testing Disaster Recovery

### DR Test Plan

```yaml
dr_test:
  frequency: "quarterly"
  scope: "critical volumes only"
  
  test_scenarios:
    - name: "single_node_failure"
      description: "One node in cluster goes down"
      expected_rpo: "0 (replicas on other nodes)"
      expected_rto: "< 5 minutes"
      
    - name: "cluster_failure"
      description: "Entire primary cluster unavailable"
      expected_rpo: "1 hour (based on backup frequency)"
      expected_rto: "1 hour (DR volume activation)"
      
    - name: "backup_corruption"
      description: "Latest backup is corrupted"
      expected_rpo: "2 hours (fallback to previous backup)"
      expected_rto: "2 hours"
      
  test_steps:
    1. "Document current volume configuration"
    2. "Simulate failure scenario"
    3. "Execute recovery procedure"
    4. "Verify data integrity"
    5. "Document lessons learned"
    6. "Update runbooks"
```

### DR Test Procedure

```bash
# DR Test: Cluster Failure Recovery

# Phase 1: Setup
echo "Creating test volume and data"
kubectl create namespace dr-test
kubectl -n dr-test create -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-volume
  namespace: dr-test
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: longhorn
EOF

# Write test data
kubectl -n dr-test run writer --image=busybox \
  -- sh -c "echo 'test data' > /data/test.txt; sleep 3600" \
  --volume mount=/data --volume name=test-volume

# Phase 2: Simulate cluster failure
# (In production, this would be physical or network isolation)
echo "Simulating cluster failure: disconnecting primary"

# Phase 3: Activate DR volume
# (Execute on DR cluster)
kubectl -n longhorn-system edit volume dr-test-volume
# Remove fromBackup field

# Phase 4: Verify data
kubectl -n dr-restored run verifier --image=busybox \
  --rm -it --restart=Never -- \
  cat /mnt/test.txt
# Expected output: 'test data'

# Phase 5: Cleanup
kubectl delete namespace dr-test dr-restored
```

## Backup Encryption

### In-Transit Encryption

```yaml
# S3: TLS enabled by default for HTTPS endpoints
backupTarget: "https://s3.us-east-1.amazonaws.com"

# Verify TLS is enabled in Longhorn settings
settings:
  backup-target:
    value: "s3://longhorn-backups@us-east-1/"
  backup-target-credential-secret:
    value: "longhorn-backup-secret"
  backup-store-poll-interval:
    value: "300"
```

### At-Rest Encryption

```yaml
# S3 server-side encryption
# Add encryption headers via backup secret
stringData:
  AWS_ACCESS_KEY_ID: "access_key"
  AWS_SECRET_ACCESS_KEY: "secret_key"
  AWS_ENDPOINTS: "https://s3.us-east-1.amazonaws.com"
  # SSE-S3 or SSE-KMS
  AWS_SSE: "AES256"
  # For KMS:
  # AWS_SSE_KMS_KEY_ID: "arn:aws:kms:us-east-1:123456789012:key/abc-123"
```

## Backup Monitoring

### Prometheus Metrics

```yaml
# Backup-related Longhorn metrics
longhorn_backup_state:
  type: gauge
  description: "State of backup (0=InProgress, 1=Completed, 2=Error)"
  alert: "backup_state != Completed for > 30 minutes"

longhorn_backup_progress:
  type: gauge
  description: "Backup progress percentage"

longhorn_backup_size:
  type: gauge
  description: "Size of backup in bytes"

longhorn_backup_last_sync:
  type: gauge
  description: "Timestamp of last successful backup sync"
```

### Alert Rules

```yaml
# Prometheus alert rules for backup monitoring
groups:
  - name: longhorn-backup
    rules:
      - alert: BackupFailed
        expr: longhorn_backup_state{state=~"Error|Unknown"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Longhorn backup has failed"
          description: "Backup {{ $labels.backup }} for volume {{ $labels.volume }} has been in Error state for 5+ minutes"

      - alert: BackupStalled
        expr: longhorn_backup_progress < 100 and time() - longhorn_backup_last_sync > 3600
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Longhorn backup is stalling"
          description: "Backup {{ $labels.backup }} has not progressed in 1+ hour"

      - alert: DRVolumeOutOfSync
        expr: longhorn_volume_robustness{volume=~"dr-.*"} != "healthy"
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "DR volume out of sync"
          description: "DR volume {{ $labels.volume }} is not healthy for 15+ minutes"

      - alert: BackupTargetNotAccessible
        expr: longhorn_backup_target_status == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backup target not accessible"
          description: "Backup target is unreachable or authentication failed"
```

## Troubleshooting Backup/DR Issues

### Common Issues

| Issue | Symptom | Resolution |
|---|---|---|
| Backup target connection failed | Volume backup stuck in "InProgress" | Check credentials, network, endpoint |
| Backup target permissions | "Access Denied" errors | Verify IAM permissions for S3 bucket |
| DR volume stuck in restoring | Large volumes take time | Monitor progress, increase concurrency |
| Backup target space | "No space left" | Increase bucket quota or add retention |
| Snapshot cleanup failure | Disk usage growing | Manually delete old snapshots |
| Recurring job not running | No recent backups | Check cron syntax, job status |

### Debug Commands

```bash
# Check Longhorn manager logs for backup errors
kubectl -n longhorn-system logs -l app=longhorn-manager --tail=100

# Check backup target connectivity
kubectl -n longhorn-system exec -it deploy/longhorn-manager-xxx -- \
  curl -I https://s3.us-east-1.amazonaws.com/longhorn-backups

# Verify backup secret
kubectl -n longhorn-system get secret longhorn-backup-secret -o yaml

# Check backup volume status
kubectl -n longhorn-system get backupvolume -o yaml

# Force backup retry
kubectl -n longhorn-system annotate backup <backup-name> longhorn.io/backup-retry=true

# Check instance manager logs
kubectl -n longhorn-system logs -l app=longhorn-instance-manager --tail=100
```

## Backup Lifecycle Management

### Retention Strategy

```yaml
retention_policy:
  hourly:
    retain: 24  # 1 day of hourly backups
    cleanup: "delete oldest when count > retain"
    
  daily:
    retain: 30  # 1 month of daily backups
    cleanup: "delete oldest when count > retain"
    
  weekly:
    retain: 12  # 3 months of weekly backups
    cleanup: "delete oldest when count > retain"
    
  monthly:
    retain: 12  # 1 year of monthly backups
    # Manual archival to long-term storage
```

### Backup Verification Schedule

```yaml
backup_verification:
  frequency: "monthly"
  scope: "sample 10% of volumes"
  
  verification_steps:
    1. "Select backup to test"
    2. "Restore to test namespace"
    3. "Mount to test pod"
    4. "Verify data integrity (checksums)"
    5. "Document results"
    6. "Cleanup test resources"
```

## Key Points

- Backup target (S3 minimum) is mandatory for data durability
- Recurring jobs ensure automated backup schedules
- DR volumes enable continuous sync to secondary clusters
- RPO and RTO targets determine backup frequency and DR strategy
- Snapshots are for operational recovery; backups are for DR
- Test DR procedures quarterly to validate runbooks
- Backup encryption (in-transit and at-rest) protects sensitive data
- Prometheus alerting on backup state and DR volume health
- Retention policies balance cost and recovery needs
- Backup verification (monthly test restores) ensures recoverability
- Cross-region S3 replication enables region-level DR
- Failback procedure should be documented and tested
- Monitor backup target disk space and permissions
- DR volumes cannot be used while in sync mode
- Activation converts DR volume to regular, writable volume
