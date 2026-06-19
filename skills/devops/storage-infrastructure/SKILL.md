---
name: storage-infrastructure
description: >
  Use this skill when the user says 'storage', 'SAN', 'NAS', 'NVMe',
  'NVMe-oF', 'iSCSI', 'FC', 'Fibre Channel', 'Ceph', 'glusterfs',
  'minio', 'LUN', 'volume', 'ZFS', 'ZoL', 'RAID', 'JBOD', 'HDD',
  'SSD', 'NAND', 'flash', '3D XPoint', 'Optane', 'SATA', 'SAS',
  'NVMe', 'M.2', 'U.2', 'E1.S', 'E3.S', 'EBOF', 'JBOF',
  'storage-class', 'PersistentVolume', 'PVC', 'CSI', 'storage
  policy', 'software-defined storage', 'SDS', 'distributed
  storage', 'object storage', 'block storage', 'file storage',
  'backup', 'snapshot', 'clone', 'deduplication', 'compression',
  'thin provisioning', 'overprovisioning', 'TRIM', 'discard',
  'wear leveling', 'write amplification', 'read cache',
  'write cache', 'battery-backed write cache', 'BBWC', 'NVDIMM',
  'storage tiering', 'tiered storage', 'hot tier', 'cold tier',
  'archive tier', 'storage performance', 'IOPS', 'throughput',
  'latency', 'iostat', 'fio', 'blktrace', 'seekwatcher'.
  Covers: Storage architecture, protocols, RAID levels, NVMe,
  software-defined storage with Ceph, CSI drivers for K8s,
  backup strategies, storage performance benchmarking.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, storage, ceph, nvme, san, nas, phase-3]
---

# Storage Infrastructure

## Purpose
Design, deploy, and operate storage infrastructure for block, file, and object workloads. Cover SAN/NAS, NVMe-oF, Ceph, MinIO, CSI drivers, storage performance, and backup integration.

## Agent Protocol

### Trigger
Exact user phrases: "storage", "SAN", "NAS", "NVMe", "Ceph", "MinIO", "CSI", "PersistentVolume", "iSCSI", "Fibre Channel", "RAID", "ZFS", "software-defined storage", "object storage", "block storage", "file storage", "IOPS", "throughput", "latency", "fio", "iostat".

### Input Context
- Workload: block (database / VM), file (NFS / SMB), or object (S3 / blob).
- Scale: number of nodes, total capacity, IOPS target.
- Connectivity: ethernet (iSCSI/NVMe-oF TCP), InfiniBand, or Fibre Channel.
- Budget: pure flash, hybrid, or HDD.
- Filesystem: XFS, ext4, ZFS, Btrfs, or CephFS.

### Output Artifact
Storage architecture summary: protocol, media, RAID level, redundancy model, performance target, provisioning strategy.

### Response Format
```
Protocol: {NVMe-oF | FC | iSCSI | NFS | SMB | S3}
Media: {NVMe | SAS SSD | SATA SSD | HDD | hybrid}
Redundancy: {RAID10 | RAID6+hot | Ceph EC | Ceph replica 3x}
Target: {IOPS ~X, throughput ~Y, latency ~Z}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Protocol selected and justified.
- [ ] Media type and quantity specified.
- [ ] RAID or erasure coding scheme defined.
- [ ] Redundancy model with failure domain mapping.
- [ ] Performance target with benchmark results from `fio`.
- [ ] CSI driver configured for Kubernetes with StorageClass.
- [ ] Monitoring: capacity, performance, wear, errors.

### Max Response Length
400 lines.

## Quick Start
Identify workload type (DB = block NVMe-oF, app = NFS, backup = object S3) → size capacity+IOPS → select media+RAID → configure SAN/NAS or SDS (Ceph/MinIO) → provision in K8s with CSI driver → benchmark with `fio` → set up monitoring.

## Decision Tree: Storage Protocol
| Protocol | Latency | Throughput | Use Case |
|---|---|---|---|
| **NVMe-oF (TCP/RoCE/FC)** | <10µs | 10+ GB/s per device | High-performance DB, VM storage |
| **Fibre Channel (32/64G)** | <5µs | 6.4 GB/s per link | Legacy SAN, most predictable |
| **iSCSI** | 100-500µs | 1-10 Gbps | Mid-range, cost-effective block |
| **NFSv4** | 200-1000µs | 1-10 Gbps | File shares, home dirs, K8s PVC |
| **SMB3** | 200-2000µs | 1-10 Gbps | Windows workloads, file shares |
| **S3** | 5-50ms | Variable | Object storage, backup, data lake |

### Protocol Selection Decision
```
Workload type?
├── Block (database, VM) → Latency sensitive?
│   ├── Yes (< 10µs) → NVMe-oF (RoCE or FC)
│   ├── Medium (< 500µs) → iSCSI on dedicated network
│   └── No (> 1ms) → NFS with RBD backend
├── File (NFS, SMB, home dirs) → Multi-platform access?
│   ├── Yes → NFSv4 (Linux/Unix) or SMB3 (Windows)
│   └── No → CephFS or NFSv4
└── Object (S3, backup, data lake) → S3-compatible?
    ├── Yes → MinIO (self-hosted) or cloud S3
    └── No → Ceph RGW (S3 + Swift)
```

## Core Workflow

### Step 1: Media Selection
```
NVMe (U.2 / E1.S / E3.S):
  Optane 905p/5800X:  <10µs latency, 2.5M IOPS, endurance leader
  Samsung PM9A3:      1M IOPS read, 2.5 GB/s write,  1 DWPD
  Kioxia CD8P:        1M IOPS, 6.4 GB/s sequential,  1 DWPD
  Solidigm D7-P5510:  1M IOPS, 7GB/s seq read,       1 DWPD
  Kioxia CM7:         2.5M IOPS, 14 GB/s sequential,  3 DWPD

SAS SSD:
  Samsung PM1653:     400K IOPS, 2.5 DWPD
  Seagate Nytro 5050: 350K IOPS, 1 DWPD

SATA SSD:
  Samsung 870 EVO:    98K IOPS read, 560 MB/s seq
  Crucial MX500:      95K IOPS read, 560 MB/s

HDD:
  Seagate Exos X22:   22 TB, 270 MB/s seq, 140 IOPS random
  WD Gold:            22 TB, 255 MB/s seq, 130 IOPS random
  Toshiba MG10:       22 TB, 260 MB/s seq, 180 IOPS random
```

### Step 2: RAID Configuration
```yaml
RAID levels:
  RAID0:     Striping, no redundancy — ephemeral scratch only
  RAID1:     Mirroring — boot drives, small DB logs (50% overhead)
  RAID5:     Striping + 1 parity — archive, read-heavy; NOT for writes
  RAID6:     Striping + 2 parity — large capacity, good for HDD
  RAID10:    Stripe of mirrors — DB, VMs, general purpose (best)
  RAID50:    RAID5 across stripes — vSAN, some legacy storage
  RAID60:    RAID6 across stripes — large archive (2+ parity per stripe)

# RAID10 with NVMe over JBOD
# 24 x 3.84TB NVMe → 12 mirror pairs → ~46 TB usable, 1M+ IOPS

# RAID6 with HDD over DAS
# 60 x 22TB HDD → 5 + 1 spare per shelf → 10 shelves → ~1 PB usable
```

### Step 3: Filesystem Selection
```
XFS:    Default RHEL/Debian, excellent parallel performance
        Best for large files, good for NVMe with reflink/dedupe
        mkfs.xfs -m reflink=1 -m crc=1 -d agcount=16 /dev/sda

ext4:   Universal compatibility, good for boot and small deployments
        mkfs.ext4 -O ^has_journal (disable journal = skip write-ahead for scratch)
        mkfs.ext4 -O encrypt (native encryption)

ZFS:    Checksumming, snapshots, compression, deduplication
        Best for NFS/SMB, backup targets
        zpool create tank mirror /dev/nvme0n1 /dev/nvme1n1
        zfs set compression=lz4 tank/data
        zfs set atime=off tank/data
        zfs set recordsize=1M tank/data (for large sequential)

Btrfs:  CoW, subvolumes, send/receive
        Good for Docker/Moby storage, but not production DBs
```

### Step 4: Ceph Cluster
```yaml
# /etc/ceph/ceph.conf
[global]
  fsid = 12345678-1234-1234-1234-123456789abc
  public_network = 10.0.1.0/24
  cluster_network = 10.0.2.0/24
  osd_pool_default_size = 3
  osd_pool_default_min_size = 2
  osd_pool_default_pg_num = 128
  osd_pool_default_pg_autoscale_mode = on

# CRUSH map for failure domain isolation
# root=default
#   host host1
#     osd.0 osd.1 osd.2
#   host host2
#     osd.3 osd.4 osd.5
#   host host3
#     osd.6 osd.7 osd.8

# Each OSD: dedicated NVMe device, 1 OSD per physical drive
# BlueStore backend (default)
# ceph osd pool create replicated_pool 128 128 replicated
# ceph osd pool create ec_pool 128 128 erasure
# ceph osd erasure-code-profile set myprofile k=4 m=2
```

### Step 5: CSI Driver for Kubernetes
```yaml
# Ceph CSI RBD StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd
provisioner: rbd.csi.ceph.com
parameters:
  clusterID: "12345678-1234-1234-1234-123456789abc"
  pool: "kubernetes"
  imageFeatures: "layering"
  csi.storage.k8s.io/provisioner-secret-name: csi-rbd-secret
  csi.storage.k8s.io/controller-expand-secret-name: csi-rbd-secret
  csi.storage.k8s.io/fstype: xfs
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```yaml
# Local NVMe with symlink — direct attach, no network overhead
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-nvme
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-nvme-pv
spec:
  capacity:
    storage: 1.5Ti
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-nvme
  local:
    path: /mnt/nvme/disk1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - worker-3
```

### Step 6: MinIO for Object Storage
```yaml
# MinIO distributed mode (16+ drives for erasure coding)
apiVersion: v1
kind: Service
metadata:
  name: minio
spec:
  ports:
  - port: 9000
    name: api
  - port: 9001
    name: console
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: minio
spec:
  serviceName: minio
  replicas: 4
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        args:
        - server
        - --console-address=:9001
        - http://minio-{0...3}.minio:9000/data{0...3}
        env:
        - name: MINIO_ROOT_USER
          valueFrom:
            secretKeyRef: { name: minio-secret, key: root-user }
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef: { name: minio-secret, key: root-password }
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Ti
      storageClassName: ceph-rbd
```

### Step 7: Performance Benchmarking
```bash
# fio — Random read, 4K, NVMe target
fio --name=randread --ioengine=libaio --rw=randread --bs=4k \
    --direct=1 --numjobs=4 --iodepth=64 --runtime=60 \
    --filename=/dev/nvme0n1 --time_based

# fio — Sequential write, 1M, throughput test
fio --name=seqwrite --ioengine=libaio --rw=write --bs=1m \
    --direct=1 --numjobs=1 --iodepth=16 --runtime=60 \
    --filename=/dev/nvme0n1 --time_based

# fio — Mixed workload (70/30 read/write, 8K, database-sim)
fio --name=dbmix --ioengine=libaio --rw=randrw --rwmixread=70 \
    --bs=8k --direct=1 --numjobs=8 --iodepth=64 --runtime=300 \
    --filename=/dev/nvme0n1 --time_based

# iostat — Live monitoring
iostat -x 2 nvme0n1
# blktrace — I/O tracing for latency breakdown
blktrace -d /dev/nvme0n1 -o - | blkparse -i -
```

### Step 8: Storage Monitoring
```yaml
Key metrics:
  Capacity:    used / total bytes, % full, growth rate
  IOPS:        read + write IOPS, queue depth
  Throughput:  read + write MB/s, peak vs sustained
  Latency:     average + P99 latency (µs)
  Errors:      read errors, write errors, CRC mismatch
  Wear:        percentage of NAND endurance used (SMART 177/233)
  Temperature: NVMe temp should be 35-55°C; throttle at >70°C

Tools:
  Prometheus:  node_exporter (NVMe metrics), ceph_exporter, smartctl_exporter
  Grafana:     Ceph dashboard, node detail dashboard
  Smartctl:    nvme smart-log /dev/nvme0n1
  Ceph:        ceph status, ceph osd perf, ceph osd df
  MinIO:       mc admin info, /minio/v2/metrics/cluster
```

### Step 9: NVMe-oF Target Configuration
```bash
# NVMe-oF target (Linux kernel)
modprobe nvmet
modprobe nvmet-tcp

# Create target subsystem
mkdir /sys/kernel/config/nvmet/subsystems/nvme-test-target
cd /sys/kernel/config/nvmet/subsystems/nvme-test-target

# Allow any host (for testing)
echo 1 > attr_allow_any_host

# Create namespace (point to block device)
mkdir namespaces/1
cd namespaces/1
echo -n /dev/nvme0n1 > device_path
echo 1 > enable

# Create TCP port
mkdir /sys/kernel/config/nvmet/ports/1
cd /sys/kernel/config/nvmet/ports/1
echo 4420 > addr_trsvcid
echo tcp > addr_trtype
echo 10.0.1.10 > addr_traddr
echo ipv4 > addr_adrfam
ln -s /sys/kernel/config/nvmet/subsystems/nvme-test-target subsystems/nvme-test-target
```

### Step 10: Ceph RBD Performance Tuning
```bash
# RBD configuration optimization
rbd config pool set kubernetes rbd_qos_bps_limit 1048576000  # 1 GB/s per image
rbd config pool set kubernetes rbd_qos_iops_limit 100000
rbd config pool set kubernetes rbd_qos_bps_burst 2097152000
rbd config pool set kubernetes rbd_qos_iops_burst 200000

# RBD cache settings for VM/DB workloads
rbd config image set <pool>/<image> rbd_cache true
rbd config image set <pool>/<image> rbd_cache_size 268435456  # 256 MB
rbd config image set <pool>/<image> rbd_cache_max_dirty 134217728  # 128 MB

# Pre-allocate RBD images for consistent performance
rbd create --size 10T --image-format 2 --image-feature layering,striping \
  --stripe-unit 4096 --stripe-count 16 kubernetes/db-image

# krbd (kernel RBD) tuning
echo 128 > /sys/block/rbd0/queue/nr_requests
echo 2 > /sys/block/rbd0/queue/rq_affinity
```

### Step 11: ZFS Pool Configuration
```bash
# ZFS for high-performance NFS storage
zpool create -o ashift=12 tank \
  mirror /dev/nvme0n1 /dev/nvme1n1 \
  mirror /dev/nvme2n1 /dev/nvme3n1 \
  mirror /dev/nvme4n1 /dev/nvme5n1

# Enable compression and tuning
zfs set compression=lz4 tank
zfs set atime=off tank
zfs set xattr=sa tank
zfs set recordsize=128k tank
zfs set primarycache=all tank
zfs set secondarycache=all tank

# ARC size limit (50% of system RAM for pure ZFS)
echo "options zfs zfs_arc_max=$((16 * 1024 * 1024 * 1024))" > /etc/modprobe.d/zfs.conf

# ZFS SLOG for synchronous write acceleration (dedicated NVMe)
zpool add tank log mirror /dev/nvme6n1 /dev/nvme7n1

# ZFS L2ARC for read cache (large NVMe or Optane)
zpool add tank cache /dev/nvme8n1
```

### Step 12: S.M.A.R.T Monitoring Configuration
```yaml
# node_exporter textfile collector for SMART metrics
# /etc/node_exporter/smart-wrapper.sh
collectors:
  smartctl:
    devices:
      - /dev/nvme0n1
      - /dev/nvme1n1
      - /dev/nvme2n1
    metrics:
      - nvme_smart_critical_warning  # 0 = healthy
      - nvme_smart_temperature
      - nvme_smart_available_spare   # % remaining
      - nvme_smart_percentage_used   # endurance consumed
      - nvme_smart_media_errors
      - nvme_smart_data_units_read
      - nvme_smart_data_units_written

alert_rules:
  - alert: NVMeEnduranceLow
    expr: nvme_smart_percentage_used > 80
    for: 24h
    labels: { severity: warning }
    annotations:
      summary: "NVMe endurance > 80% on {{ $labels.device }}"
  - alert: NVMeTemperatureHigh
    expr: nvme_smart_temperature > 70
    for: 5m
    labels: { severity: critical }
    annotations:
      summary: "NVMe temperature > 70°C on {{ $labels.device }}"
  - alert: NVMeMediaError
    expr: rate(nvme_smart_media_errors[5m]) > 0
    for: 5m
    labels: { severity: critical }
```

## Tool Comparison: Software-Defined Storage

| Feature | Ceph | MinIO | GlusterFS | Longhorn |
|---|---|---|---|---|
| Type | Unified (block/file/object) | Object only | File only | Block (K8s-native) |
| Protocol | RBD, CephFS, S3 | S3-compatible | GlusterFS (FUSE/NFS) | iSCSI, NFS |
| Redundancy | Replication (3x) or EC (k+m) | EC (data+parity) | Replication (2x/3x) | Replication (2x/3x) |
| Consistency | Strong | Eventual (read-after-write) | Strong | Strong |
| K8s CSI | Yes (RBD, CephFS) | Yes (MinIO Operator) | Yes (glusterfs) | Yes (native) |
| Performance (4K IOPS) | 100-500K per OSD | 5-50K per node | 10-50K per brick | 50-200K per node |
| Latency | 1-5ms | 5-50ms | 2-10ms | 0.5-2ms |
| Complexity | High | Medium | Medium | Low |
| Scale-out | Yes (add OSDs) | Yes (add nodes) | Yes (add bricks) | Yes (add nodes) |

## Security Considerations
- CephX authentication required for all clients (enabled by default)
- MinIO TLS must be configured — never expose S3 API on plain HTTP
- NVMe-oF TCP must be on isolated storage VLAN with ACLs (no encryption in spec)
- Ceph at-rest encryption: `ceph-osd --set-osd-uuid --osd-encryption-key` with dm-crypt
- MinIO IAM policies scoped to bucket-level: never use root credentials for applications
- Disable MinIO anonymous buckets in production
- ZFS encryption: `zfs encryption -o encryption=aes-256-gcm tank/data`
- RBD mirroring for DR must use dedicated replication network with encryption
- CephFS subvolume groups for multi-tenant isolation in shared clusters
- Rotate CephX keys quarterly, MinIO access keys on team member departure

## Production Considerations
- Ceph OSDs need dedicated network — separate cluster_network from public_network.
- Ceph PG count: ~100 PGs per OSD for balanced distribution.
- ZFS recordsize: 8K for DB, 1M for file/VM storage.
- NVMe SSD endurance: 1 DWPD for cache, 3+ DWPD for write-intensive DB.
- MinIO erasure coding: 16 drives → 8 data + 8 parity (tolerates 8 failures).
- MinIO uses `mc admin prometheus generate` for Prometheus integration.
- Filesystem atime updates add significant write amplification — use noatime.
- S.M.A.R.T monitoring for HDD: pre-fail attributes (5 Reallocated Sectors, 187 Reported Uncorrectable).
- NVMe SSD: watch Temperature, Percentage Used, Available Spare, Media Errors.
- Storage network: use RoCE (RDMA over Converged Ethernet) with PFC + ECN for lossless fabric.
- Query Ceph OSD latency per OSD: `ceph osd perf` — fix OSDs with high commit latency.
- Use Stripe Width of 16+ for large sequential writes on Ceph RBD pools.
- Always benchmark with `fio` on raw block device, not filesystem.
- Document and label all storage connections and VLAN assignments.
- Plan for 20% capacity headroom for wear leveling and performance.

## Rules
- Always benchmark with `fio` before declaring storage ready.
- Never RAID0 production data — accept 2x space cost for RAID10 safety.
- Ceph replica 3x minimum for production; erasure coding k=4,m=2 for cold data.
- NVMe-oF requires RoCE or FC for latency < 10µs; TCP adds ~50µs.
- ZFS ARC must be limited to 50% of system RAM unless exclusively ZFS.
- MinIO on K8s requires StatefulSet + anti-affinity across nodes.
- Storage expansion: always leave 10-20% headroom in capacity and IOPS.
- Cluster OSD count: minimum 3 hosts, ideally 3 OSDs per host.
- Monitor wear level of NVMe devices — replace when endurance reaches 80%.
- Enable TRIM/discard on all SSD volumes weekly.
- Storage network must be physically or logically isolated.

## Anti-Patterns
- Ceph with mixed HDD/NVMe in same CRUSH root — slow devices dominate performance.
- Using default Ceph PG count — too few PGs = imbalance, too many = CPU overhead.
- RAID5 on NVMe — parity calculation wastes CPU; performance degrades during rebuild.
- No ECC RAM with ZFS — memory corruption silently damages data.
- MinIO without erasure coding — single disk failure loses all data on that node.
- Running `fio` on filesystem instead of raw block device — filesystem overhead skews results.
- No wear level monitoring — surprise SSD failures at end of life.
- Mixing HDD and SSD in same RAID group — group-wide performance limited by slowest.
- Overwriting existing data on same LBAs — use `blkdiscard` / `nvme format` first.
- Ceph OSDs sharing same physical disk as OS — resource contention and data loss risk.

## References
  - references/nvme-of.md — NVMe-oF — TCP, RoCE, Fibre Channel
  - references/ceph.md — Ceph — RBD, CephFS, Object Gateway, CRUSH, BlueStore
  - references/minio.md — MinIO — Erasure Coding, Distributed Mode, S3 Gateway
  - references/storage-infrastructure-advanced.md — Storage Infrastructure Advanced Topics
  - references/storage-infrastructure-fundamentals.md — Storage Infrastructure Fundamentals
## Handoff
- `devops-backup-dr` for backup strategies tied to storage infrastructure.
- `devops-datacenter` for physical cabling and power for storage arrays.
- `devops-kubernetes` for CSI driver deployment and PVC lifecycle.
- `devops-monitoring` for Prometheus-based storage monitoring.
