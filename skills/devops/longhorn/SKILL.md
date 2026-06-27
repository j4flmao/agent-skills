---
name: longhorn
description: >
  Use this skill when deploying and managing Longhorn distributed storage on Kubernetes -- installation, volume management, backup, disaster recovery, performance tuning, monitoring. This skill enforces: minimum 3 nodes for production, replica count 3 for all production volumes, S3-compatible backup target, monitoring alerts for volume degraded and disk space. Do NOT use for: non-Kubernetes storage solutions, other CSI drivers, cloud-managed storage (EBS, GCE PD).
version: "1.1.0"
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
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output -- why use many token when few do trick.

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
| **iscsiadm** | Required | -- |
| **open-iscsi** | Required | -- |
| **nfs-client** | Required (for backup) | -- |

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
  replicaAutoBalance: best-effort
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
  replicaAutoBalance: disabled
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
# Settings -> Backup
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
| **Data locality** | best-effort | Prefer local replica for read performance |
| **Enable SFTP** | false | Disable if not needed |
| **Guaranteed engine CPU** | 0.25 | Reserved CPU for engine |
| **Storage network** | 10GbE+ separate | Storage traffic isolation |
| **Replica rebalance** | immediate | Rebalance when new node added |

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

## Architecture / Decision Trees

### Storage Topology Options

| Topology | Pros | Cons | Use Case |
|---|---|---|---|
| Collocated (same node as workload) | Low latency, simpler | Single point of failure for replicas on same node | Dev/test, non-critical |
| Dedicated storage nodes | Performance isolation, predictable | Extra infrastructure cost | High-performance workloads |
| All nodes with storage | Flexible, high aggregate IOPS | Resource contention | General production |
| Separate storage network | Storage traffic isolated from app | Complex networking | High-throughput, multi-TB |

### Replica Count Decision Tree
- 1 replica: dev/test only, no fault tolerance
- 2 replicas: not recommended -- write quorum requires 1/2 = 50% loss tolerance is poor
- 3 replicas: default for production, survives 1 node failure
- 4 replicas: multi-AZ, survives 2 node failures, 33% storage overhead
- 5+ replicas: regulatory/compliance, high storage overhead

### Backup Target Decision Tree

| Target | Pros | Cons | Use Case |
|---|---|---|---|
| S3-compatible (AWS, MinIO, Ceph) | Durable, scalable, standard | Egress costs, network dependency | Default |
| NFS | Simple, low overhead | Single point of failure, limited scalability | Small deployments |
| SMB | Windows compatibility | Performance overhead | Windows workloads |
| Internal (Longhorn volumes) | Simple setup | Not off-cluster, not DR | Backup to backup (not recommended) |

### Disaster Recovery Architecture

| Model | RPO | RTO | Complexity | Cost |
|---|---|---|---|---|
| S3 backup + restore | 24h (daily backup) | 1-4h | Low | Low (S3 storage only) |
| DR volume (continuous) | Minutes | 15-30min | Medium | Medium (DR cluster idle) |
| Active-active (stretch cluster) | Near-zero | < 1min | High | High (synchronous replication) |

## Common Pitfalls

### Pitfall 1: Running With Fewer Than 3 Nodes
Longhorn requires 3 nodes for replica quorum. With 2 nodes and 3 replicas, one node failure loses quorum (need 2/3 replicas, only 1 node left). With 2 replicas on 2 nodes, a single node failure loses all replicas. Minimum 3 nodes for any production use.

### Pitfall 2: Not Configuring Backup Target
Without backup target, all data is local to the cluster. A cluster failure loses all data. Always configure S3-compatible backup target. Test restore procedure. Without backup, Longhorn provides no data durability.

### Pitfall 3: Using Host Volumes Instead of CSI
Host volumes are simple bind mounts -- no replication, no snapshots, no backup integration. Always use CSI volumes for stateful workloads. Host volumes only for temporary or non-critical data.

### Pitfall 4: Inadequate Network Between Nodes
Storage sync traffic is latency-sensitive. Longhorn replica sync requires <1ms latency between nodes. Deploy nodes within same availability zone. Cross-AZ latency (1-2ms) may cause replica out-of-sync issues. Use placement groups for low latency.

### Pitfall 5: Not Monitoring Disk Space
Longhorn allocates disk space for replicas. Running out of disk causes volume to become read-only. Set up monitoring alerts for disk usage at 70%, 85%, 95%. Configure `storageMinAllocatedPercentage` to reserve capacity.

### Pitfall 6: Skipping Engine Upgrade Order
Always upgrade engine image before instance manager image. Check engine compatibility. In-place upgrade: engine upgrade is live, but tests should verify. Rolling back engine requires specific steps.

### Pitfall 7: Over-Provisioning Replicas
More replicas = more storage overhead + more sync I/O. 3 replicas = 3x storage cost. For 1TB volume, 3 replicas need 3TB storage. Plan storage capacity including replica overhead. Use thin provisioning carefully.

## Best Practices

### Deployment
- 3+ nodes, odd number preferred
- Dedicated disks for Longhorn (not OS disk)
- Separate storage network (10GbE+)
- Same instance type for consistent performance
- Enable admission webhook for validation
- Use StorageClass with `allowVolumeExpansion: true`
- Set `replicaAutoBalance: best-effort` for even distribution

### Volume Management
- 3 replicas for all production volumes
- Enable `dataLocality: best-effort` for read performance
- Set `staleReplicaTimeout: 30` for cleanup
- Use `fsType: ext4` for general workloads, `xfs` for large files
- Enable `snapshot` recurring jobs alongside backups
- Monitor volume health with Prometheus alerts

### Backup Strategy
- S3-compatible backup target minimum
- Daily backup with weekly retention minimum
- DR volume for critical applications
- Test restore procedure quarterly
- Backup encryption enabled
- Backup target in separate region from cluster

### Security
- Enable RBAC for Longhorn API access
- Use service accounts with minimal permissions
- Encrypt backup target (server-side encryption)
- Network isolate storage traffic
- Enable Longhorn UI authentication
- Audit volume creation and deletion

## Compared With

### Longhorn vs Rook/Ceph
| Aspect | Longhorn | Rook/Ceph |
|---|---|---|
| Setup complexity | Low (Helm install) | High (multiple operators) |
| Performance | Good for general workloads | Excellent (distributed) |
| Features | Volume, backup, DR, snapshots | Block, file, object, RBD, RGW |
| Resource usage | Lower (per-volume engines) | Higher (OSD daemons) |
| Operations | Simple (single binary) | Complex (Ceph admin) |
| Community | Moderate | Large |

### Longhorn vs OpenEBS
OpenEBS offers Mayastor (NVMe-oF), Jiva, and cStor engines. Longhorn is simpler to operate (single engine type). OpenEBS Mayastor is faster for NVMe workloads. Longhorn has better built-in backup and DR features. Choose Longhorn for simplicity, OpenEBS Mayastor for performance.

### Longhorn vs Cloud Managed Storage (EBS, GCE PD)
Cloud storage: higher cost per GB, no replica management, built-in HA (AWS handles replication). Longhorn: lower cost (use local disks), cross-cloud portability, snapshots and backup to S3. Longhorn best for on-premises, edge, or multi-cloud. Cloud storage best for single-cloud with deep AWS/Azure/GCP integration.

## Operations & Maintenance

### Regular Maintenance Tasks
- Daily: verify volume health, backup status, disk usage
- Weekly: review replica distribution, rebalance if needed
- Monthly: test backup restore, review monitoring alerts
- Quarterly: upgrade Longhorn minor version, review capacity
- As needed: node maintenance (drain/migrate replicas)

### Node Replacement Procedure
1. Create new node and join to cluster
2. Install prerequisites (open-iscsi, nfs-common)
3. Add disk to Longhorn via UI or CRD
4. Set `replicaAutoBalance: immediate` to distribute replicas
5. Drain old node: `kubectl cordon <old-node>`
6. Wait for all replicas to move
7. Remove old node from cluster

### Backup Restore Procedure
1. Ensure backup target accessible
2. Create volume from backup in UI or via CRD
3. Set `fromBackup` field in Volume spec
4. Wait for volume to become healthy
5. Create PVC from the restored volume
6. Verify data integrity
7. Point application to restored PVC

### Capacity Planning
- 3x storage capacity for 3-replica volumes
- 20% system overhead (engine, snapshots)
- Monitor disk usage trends monthly
- Add nodes when aggregate disk usage > 70%
- Use `storageMinAllocatedPercentage` to reserve space

## Rules
- Minimum 3 nodes for production deployment
- Replica count 3 for all production volumes
- Backup target configured with S3-compatible storage
- Monitoring alerts for volume degraded and disk space
- Engine upgrade before instance manager upgrade
- Network between nodes must have <1ms latency for sync
- Disk dedicated to Longhorn (not OS disk)
- StorageClass defined with explicit parameters
- Recurring backup job scheduled for all volumes
- Test restore procedure quarterly
- Node drain before any maintenance
- One minor version upgrade at a time
- Backup target in separate region from cluster
- UI authentication enabled in production
- RBAC enabled for Longhorn API

## References
- references/longhorn-fundamentals.md -- Longhorn Fundamentals
- references/longhorn-advanced.md -- Longhorn Advanced Topics
- references/longhorn-config.md -- Longhorn Configuration Reference
- references/longhorn-manager.md -- Longhorn Management
- references/longhorn-perf.md -- Longhorn Performance
- references/longhorn-backup.md -- Longhorn Backup & DR
- references/longhorn-disaster-recovery.md -- Longhorn Disaster Recovery
- references/longhorn-performance-tuning.md -- Longhorn Performance Tuning

## Handoff
Hand off to `devops/monitoring/SKILL.md` for monitoring integration. Hand off to `devops/helm-patterns/SKILL.md` for Helm deployment best practices.

## Architecture Decision Trees

### Longhorn vs Other K8s Storage Solutions

| Decision | Longhorn | Rook/Ceph | Portworx | OpenEBS |
|---|---|---|---|---|
| Complexity | Low (Helm install) | High (multiple operators) | Medium | Low to medium |
| Performance | Good (NVMe-backed) | Great (Ceph tuned) | Excellent | Varies by engine |
| Replication | 1-3 replicas, sync/async | 1-3 replicas, sync | 1-3 replicas, sync | 1-3 replicas, async |
| Built-in backup | Yes (S3, NFS) | Yes (RGW, OSD) | Yes (PX-Backup) | Via Velero |
| License | Open Source (Apache 2.0) | Open Source (Apache 2.0) | Commercial | Open Source (Apache 2.0) |
| Best for | Edge, small-medium K8s | Enterprise, large clusters | Enterprise, compliance | Simple attached storage |

### Replica Count Decision

| Replicas | Durability | Storage cost | Write performance |
|---|---|---|---|
| 1 | Low (single disk failure) | 1x | Fastest |
| 2 | Medium (one replica failure) | 2x | Moderate |
| 3 | High (two replica tolerance) | 3x | Slowest |

## Implementation Patterns

### YAML: Longhorn StorageClass with Replicas and Encryption

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: ext4
  encrypted: "true"
  unboundMountMode: "global"
  backingImage: ""
  backingImageURL: ""
  diskSelector: "ssd"
  nodeSelector: "storage-optimized"
  recurringJobSelector: |
    [
      {"name": "snapshot-daily"},
      {"name": "backup-weekly"},
      {"name": "filesystem-trim"}
    ]
reclaimPolicy: Delete
```

### Bash: Longhorn Backup and Restore

```bash
#!/usr/bin/env bash
set -euo pipefail

create_longhorn_backup() {
  local volume=$1
  local backup_target=${2:-"s3://backups/longhorn"}

  kubectl -n longhorn-system create job \
    "manual-backup-$(date +%s)" \
    --image=longhornio/longhorn-engine:v1.7.0 \
    --command -- \
    longhorn backup create \
    --backup-target "$backup_target" \
    --volume "$volume"
}

restore_from_backup() {
  local backup_url=$1
  local pvc_name=$2

  kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $pvc_name-restored
spec:
  storageClassName: longhorn
  dataSource:
    name: $backup_url
    kind: VolumeBackup
    apiGroup: longhorn.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
EOF
}

monitor_longhorn_health() {
  while true; do
    for node in $(kubectl get nodes -o name); do
      HEALTH=$(curl -sf "http://${node}:9500/v1/health" || echo "DOWN")
      echo "$(date): $node → $HEALTH"
    done
    sleep 60
  done
}
```

## Production Considerations

- Use **dedicated disks** for Longhorn (not OS disks) — separate data plane from system plane
- Configure **node selectors and disk selectors** to isolate storage workloads on storage-optimized nodes
- Set **`replica-auto-balance: best-effort`** to automatically redistribute replicas when nodes join/leave
- Enable **snapshot pruning** with recurring jobs to prevent disk exhaustion (keep last 7 daily snapshots)
- Deploy **Longhorn in dedicated nodes** with taints and tolerations for stable storage performance
- Configure **Storage Network** (separate from Kubernetes cluster network) for replica traffic
- Set **Orphaned Replica** auto-cleanup interval to 1 hour to reclaim space from failed nodes

## Anti-Patterns

- Using **OS disk for Longhorn storage** — I/O contention with kubelet, containerd, system logs
- Setting **replica count = 1** on production volumes — single disk failure causes data loss
- Running **Longhorn on unreliable network** — replica sync uses bandwidth; flapping nodes cause rebuild storms
- Ignoring **disk pressure** — Longhorn doesn't throttle writes; full disks cause volume failures
- Mixing **Longhorn volumes with hostPort** — port 9500 collides when running multiple engines per node
- Using **default reclaim policy** without backup — set `reclaimPolicy: Retain` for critical data
- Allowing **unrestricted volume expansion** — expanding too aggressively can deplete disk space across replicas

## Performance Optimization

- Use **NVMe SSDs** for Longhorn data disks — HDDs bottleneck sync I/O at high replica counts
- Tune **Longhorn engine CPU requests** — each volume engine requires ~0.5 CPU core for I/O processing
- Set **`disableRevisionCounter: true`** on volumes to reduce write amplification from metadata updates
- Enable **IOPS and throughput limits** on volumes to prevent noisy-neighbor scenarios
- Use **Local Volume Provisioner** for applications that don't need replication (DaemonSet logs, temp data)
- Configure **BackupStore poll interval** to 3600s — frequent polling for S3 backup metadata is expensive
- Increase **concurrent volume rebuild limit** per node from the default 1 for faster recovery after node failure

## Security Considerations

- Enable **Longhorn encryption** at the StorageClass level — uses LUKS with per-volume keys
- Restrict **Longhorn UI** access to cluster admins only via Kubernetes Ingress with OIDC auth
- Use **RBAC** to limit who can create/modify Longhorn volumes, snapshots, backups
- Configure **backup target** with IAM roles (S3) or service principal (Azure Blob) — never use access keys
- Encrypt **backup targets** with server-side encryption (SSE-S3 for AWS, AES-256 for Azure)
- Set **network policies** to restrict Longhorn engine traffic between pods in the same namespace
- Audit **volume snapshot and restore** operations — snapshots can bypass application-level access controls
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.