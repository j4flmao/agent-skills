# Longhorn Configuration Reference

## Key Settings

| Setting | Default | Production | Rationale |
|---------|---------|------------|-----------|
| replica-count | 3 | 3 | Production minimum for HA |
| default-data-path | /var/lib/longhorn | /data/longhorn | Separate disk/partition |
| backup-target | "" | s3://bucket | Required for DR |
| stale-replica-timeout | 30 | 30 | Minutes before cleanup |
| replica-auto-balance | disabled | best-effort | Rebalance on node add/remove |
| data-locality | disabled | best-effort | Local read performance |
| guaranteed-engine-cpu | 0 | 0.25 | Reserve CPU for engine processes |
| storage-min-available | 25% | 25% | Stop scheduling below this threshold |
| storage-over-provisioning-percentage | 200 | 200 | Allow 2x over-provisioning |
| storage-reserved-percentage-for-default-disk | 30 | 30 | Reserved for system usage |

## Backup Configuration

### S3 Backup Target
```yaml
backup-target: s3://my-bucket/longhorn-backups@us-east-1/
backup-target-credential-secret: longhorn-backup-secret
```

### NFS Backup Target
```yaml
backup-target: nfs://nfs.example.com:/exports/longhorn
```

## StorageClass Configuration
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  fromBackup: ""
  fsType: ext4
  dataLocality: best-effort
  diskSelector: ssd
  nodeSelector: "storage-node"
  recurringJobSelector: '[{"name":"snapshot-daily","isGroup":false},{"name":"backup-weekly","isGroup":false}]'
```

## Recurring Jobs
```yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: snapshot-daily
spec:
  cron: "0 2 * * *"
  task: snapshot
  groups:
  - default
  retain: 7
  concurrency: 1
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: backup-weekly
spec:
  cron: "0 3 * * 0"
  task: backup
  groups:
  - default
  retain: 4
```

## Monitoring
- Expose Prometheus metrics on port 9500 (Longhorn manager).
- Alert on: `longhorn_volume_actual_size_bytes` exceeding threshold, replica count below 3, disk pressure (storage < 20%).
- Enable `Longhorn` dashboard in Grafana (community dashboard ID: 16420).

## Maintenance
- Draining a node: `kubectl cordon NODE` then let Longhorn auto-rebalance replicas.
- Backup validation: restore from backup into an isolated namespace quarterly.
- Engine image upgrade: use UI "Upgrade Engine" feature (live migration, no downtime).
- Disk replacement: add new disk, let Longhorn rebuild replicas, then remove old disk.

## Troubleshooting
- **Volume stuck in Degraded**: Check replica count, node connectivity, disk space.
- **Engine/Eye process crash**: Check `longhorn-engine-*` pod logs, increase CPU reservation.
- **Backup failing**: Verify backup target credentials, S3/NFS connectivity, bucket permissions.
- **Slow I/O**: Check `dataLocality` setting, storage network latency, disk health (iostat).
