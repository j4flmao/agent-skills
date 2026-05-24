---
name: longhorn
description: >
  Use this skill when deploying and managing Longhorn distributed storage on Kubernetes — installation, volume management, backup, disaster recovery, performance tuning, monitoring. This skill enforces: minimum 3 nodes for production, replica count 3 for all production volumes, S3-compatible backup target, monitoring alerts for volume degraded and disk space. Do NOT use for: non-Kubernetes storage solutions, other CSI drivers, cloud-managed storage (EBS, GCE PD).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, longhorn, phase-5]
---

# Longhorn Storage

## Purpose
Define and enforce Longhorn distributed storage patterns for installation, volume management, backup, and DR.

## Agent Protocol

### Trigger
User request includes: `longhorn`, `distributed storage`, `block storage`, `rancher longhorn`, `persistent volume`, `storageclass`, `backup target`, `disaster recovery`, `volume snapshot`, `longhorn replication`.

### Input Context
- Kubernetes cluster version and size
- Existing storage solution (if migrating)
- Storage requirements (IOPS, capacity, replication factor)
- Backup target (S3, NFS, SMB)
- Network configuration (nodes, disks)

### Output Artifact
A markdown document containing:
- Longhorn installation method (Helm, Rancher Marketplace)
- StorageClass configuration with parameters
- Volume scheduling and replica strategy
- Backup and disaster recovery setup
- Performance tuning (disk selection, network, settings)
- Monitoring and alerting configuration
- Upgrade and maintenance procedures

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Installation method selected with version
- StorageClass defined with replica count and parameters
- Backup target configured with schedule
- DR volume strategy documented
- Monitoring integration with Prometheus/Grafana

### Max Response Length
4096 tokens

## Workflow

### Step 1: Install Longhorn via Helm

```bash
helm repo add longhorn https://charts.longhorn.io
helm repo update
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.replicaCount=3 \
  --set defaultSettings.defaultDataPath="/var/lib/longhorn" \
  --set persistence.defaultClassReplicaCount=3 \
  --version 1.6.0
```

**Pre-requisites**:

| Requirement | Minimum | Recommended |
|---|---|---|
| **Kubernetes** | 1.21+ | 1.28+ |
| **Nodes** | 3 (for HA) | 3+ |
| **CPU per node** | 1 core | 4 cores |
| **RAM per node** | 2 GB | 8 GB |
| **Disk per node** | 40 GB (SSD) | 200 GB (NVMe) |
| **Open ports** | 9500-9504 (instance manager) | Same |
| **iscsiadm** | Required | — |
| **open-iscsi** | Required | — |
| **nfs-client** | Required (for backup) | — |

### Step 2: Configure StorageClasses

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  fromBackup: ""
  fsType: ext4
  dataLocality: best-effort
  replicaAutoBalance: "best-effort"
  diskSelector: ""
  nodeSelector: ""
  recurringJobSelector: ""
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-slow
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
parameters:
  numberOfReplicas: "1"
  dataLocality: disabled
  replicaAutoBalance: "disabled"
```

### Step 3: Apply Replica Strategy

| Replicas | Fault Tolerance | Storage Cost | Use Case |
|---|---|---|---|
| 1 | No tolerance | 1x | Dev/test, non-critical |
| 2 | 1 node failure | 2x | Semi-critical (not recommended) |
| 3 | 1 node failure | 3x | Production (default) |
| 4+ | 2+ node failures | 4x+ | Critical, multi-AZ |

### Step 4: Configure Backup

**Backup Target Setup**
```yaml
# Settings → Backup
backupTarget: "s3://my-backup-bucket@us-east-1/"
backupTargetCredentialSecret: longhorn-backup-secret
```

```yaml
# Secret for S3 backup target
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-backup-secret
  namespace: longhorn-system
stringData:
  AWS_ACCESS_KEY_ID: "AKIA..."
  AWS_SECRET_ACCESS_KEY: "..."
  AWS_ENDPOINTS: "https://s3.us-east-1.amazonaws.com"
```

**Recurring Job**
```yaml
# Recurring backup schedule
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"
  task: backup
  retain: 7
  concurrency: 2
  labels:
    backup-type: daily
```

### Step 5: Set Up Disaster Recovery

**DR Volume**
```yaml
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: dr-volume-orders
  namespace: longhorn-system
spec:
  fromBackup: "s3://backup-bucket@us-east-1/backup/orders-v1"
  numberOfReplicas: 3
  staleReplicaTimeout: 30
  nodeSelector:
    region: dr-region
```

**DR Process**:
1. Create DR volume from backup in DR cluster
2. Activate DR volume when primary down
3. Point applications to DR volume
4. When primary recovered, reverse sync

### Step 6: Tune Performance

| Parameter | Setting | Rationale |
|---|---|---|
| **Disk type** | NVMe > SSD > HDD | IOPS critical for storage performance |
| **Replica count** | 3 (balance) | More replicas = more IO overhead |
| **Data locality** | `best-effort` | Prefer local replica for read performance |
| **Enable SFTP** | `false` | Disable if not needed |
| **Guaranteed engine CPU** | 0.25 | Reserved CPU for engine |
| **Storage network** | 10GbE+ separate | Storage traffic isolation |
| **Replica rebalance** | `immediate` | Rebalance when new node added |

### Step 7: Configure Monitoring

**Prometheus Metrics**
```yaml
# ServiceMonitor for Longhorn
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn
  namespace: longhorn-system
spec:
  selector:
    matchLabels:
      app: longhorn-manager
  endpoints:
    - port: manager
      path: /metrics
```

**Key Metrics**

| Metric | Alert Threshold | Description |
|---|---|---|
| `longhorn_volume_state` | != healthy | Volume degraded/faulted |
| `longhorn_disk_storage_available_bytes` | < 10% | Disk space low |
| `longhorn_node_status` | != true | Node offline |
| `longhorn_volume_robustness` | != healthy | Volume degraded |
| `longhorn_backup_state` | != Completed | Backup failed |

### Step 8: Upgrade Procedure

```bash
# 1. Check current version
helm list -n longhorn-system

# 2. Update repo
helm repo update longhorn

# 3. Upgrade (minor version)
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --reuse-values \
  --version 1.6.1

# 4. Verify
kubectl -n longhorn-system get pods -w
```

**Rules**: Always upgrade one minor version at a time. Check release notes for breaking changes. Test upgrade on non-production first.

## Rules
- Minimum 3 nodes for production deployment.
- Replica count 3 for all production volumes.
- Backup target configured with S3-compatible storage.
- Monitoring alerts for volume degraded and disk space.
- Engine upgrade before instance manager upgrade.
- Network between nodes must have <1ms latency for sync.

## References

### Reference Files
- `references/longhorn-config.md` — Longhorn settings reference, tuning parameters, troubleshooting
- `references/longhorn-backup.md` — Backup strategies, DR procedures, restore workflows
- `references/longhorn-manager.md` — Web UI operations, recurring jobs, encryption, multi-disk, node maintenance, troubleshooting
- `references/longhorn-perf.md` — RWX volumes, performance tuning, storage classes, IOPS, monitoring, best practices

### Related Skills
- `devops/helm-patterns/SKILL.md` — Helm-based deployment
- `devops/monitoring/SKILL.md` — Prometheus monitoring integration
- `devops/terraform/SKILL.md` — Infrastructure provisioning for storage

## Handoff
Hand off to `devops/monitoring/SKILL.md` for monitoring integration. Hand off to `devops/helm-patterns/SKILL.md` for Helm deployment best practices.
