# Longhorn Management

## Web UI Operations

| Section | Action | Description |
|---------|--------|-------------|
| Dashboard | Cluster status | Total/healthy/unhealthy nodes, volumes, engines, replicas |
| Volume | Create | Set size, number of replicas, backing image, access mode |
| Volume | Attach/Detach | Attach to running workload, detach for maintenance |
| Volume | Snapshot | Create on-demand snapshots for backup or revert |
| Volume | Recurring Job | Schedule snapshot/backup/trim at specified intervals |
| Volume | Revert | Restore volume to a previous snapshot |
| Volume | Clone | Clone a volume for dev/test without copying data |
| Backup | Target | Configure S3/NFS backup target |
| Backup | List | View available backups by volume |
| Setting | General | Set default replica count, node soft anti-affinity |
| Setting | Snapshot | Set snapshot space usage limit |
| Setting | Scheduling | Replica node-level soft anti-affinity scheduling |
| Setting | Dangling | Remove dangling resources |
| Node | Disk | Add/remove disks from nodes |

## Recurring Jobs

```yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
spec:
  cron: "0 2 * * *"
  task: backup
  groups:
  - default
  retain: 7
  concurrency: 2
  labels:
    type: backup
    retention: daily
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: hourly-snapshot
spec:
  cron: "0 * * * *"
  task: snapshot
  groups:
  - default
  retain: 24
  concurrency: 2
```

## Encryption

```bash
# Enable volume encryption
# 1. Create encryption key in Kubernetes
kubectl create secret generic longhorn-crypto \
  --from-literal=CRYPTO_KEY_VALUE=<base64-key> \
  --from-literal=CRYPTO_KEY_PROVIDER=secret

# 2. Set storageclass with encryption
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  encrypted: "true"
  encryptionSecret: longhorn-crypto
EOF
```

## Multi-Disk Management

```bash
# Add disk to node (via Longhorn UI or CLI)
# Each node can have multiple disks
# Disks can be different sizes, types (SSD/HDD)
# Tags can be assigned for scheduling (e.g., "fast", "capacity")

# Disk tags for scheduling
# Node 1: ssd-disk (tag: fast), hdd-disk (tag: capacity)
# Node 2: ssd-disk (tag: fast)
# Volume with tag "fast" → replicas on ssd disks only

# Remove disk: deactivate → wait for replica evacuation
```

## Node Maintenance

```bash
# Before node maintenance:
# 1. In Longhorn UI: Edit node → disable scheduling
# 2. Replicas will be automatically rebuilt on other nodes
# 3. Wait until all replicas are healthy (green status)
# 4. Proceed with node maintenance

# After node maintenance:
# 1. Enable scheduling on node
# 2. Longhorn rebalances replicas if needed
```

## Troubleshooting

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Volume stuck attaching | Node not ready, or engine crash | Check node status, force detach |
| Replica rebuild stuck | Network issue or disk space | Check disk usage, network connectivity |
| Backup failed | Backup target unreachable | Verify S3/NFS credentials and connectivity |
| Volume degraded | Replica unhealthy | Check replica pod logs, force rebuild |
| Engine process crash | OOM or disk full | Check engine memory limit, disk space |
| Snapshot cleanup not happening | Snapshot space limit reached | Increase snapshot limit, manually clean |
