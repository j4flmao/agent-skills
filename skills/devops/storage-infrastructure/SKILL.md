---
name: devops-storage-infrastructure
description: >
  Use this skill when designing or operating physical/software storage infrastructure: Ceph (RBD,
  CephFS, RGW), ZFS pools, MinIO, RAID levels (0/1/5/6/10/50/60), SAN (FC, FCoE), NAS (NFS, SMB),
  iSCSI, NVMe-oF, snapshots, replication, erasure coding, scrubbing, capacity planning, and
  performance tuning. This skill enforces: pick storage class per workload (block / file / object),
  durability + availability target, replica vs erasure trade-offs, scrub cadence, monitoring of
  smart/predictive failure, and replacement workflow. Do NOT use for: cloud-managed object stores
  (see devops-aws/gcp/azure), database replication (see data-data-replication), or DCIM hardware
  inventory (see devops-datacenter).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, storage, ceph, zfs, raid, san, nas, phase-2]
---

# DevOps Storage Infrastructure

## Purpose
Provide durable, available, performant storage for stateful workloads on bare metal or hybrid
infrastructure. Choose the right storage class (block / file / object) and engine (Ceph / ZFS /
MinIO / RAID arrays / SAN) per workload, with durability ≥ 11 9's for critical data.

## Agent Protocol

### Trigger
Exact user phrases: "Ceph", "ZFS", "MinIO", "RAID", "RAID-0", "RAID-1", "RAID-5", "RAID-6",
"RAID-10", "SAN", "NAS", "iSCSI", "FC", "NVMe-oF", "erasure coding", "EC", "replication factor",
"snapshot", "scrub", "RBD", "CephFS", "RGW", "S3-compatible", "block storage", "file storage",
"object storage", "JBOD", "HBA", "PERC", "LUN".

### Input Context
- Workload class: DB (random IOPS), analytics (sequential GB/s), object (HTTP), media (write-once)
- Capacity required + growth rate
- Durability target (9-nines)
- Availability target (RTO + RPO)
- Latency requirement (sub-ms for DB, sub-100ms for object, 5-10ms for file)
- Hardware: drive types (NVMe SSD / SATA SSD / HDD), node count, network speed
- Budget vs performance trade-off

### Output Artifact
Storage design with engine choice, layout, replication/EC, snapshot/scrub cadence, monitoring,
replacement workflow.

### Response Format
```
Engine: {Ceph | ZFS | MinIO | LVM+mdraid | hardware RAID | SAN/NAS}
Class: {block | file | object}
Layout: {RAID/EC scheme, replica factor, OSD count}
Durability: {N-nines target, math}
Performance: {expected IOPS, throughput, latency}
Snapshot: {cadence, retention, target}
Scrub: {weekly/monthly, throttling}
Monitoring: {SMART, OSD state, pool fill, latency}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Storage class matched to workload pattern
- [ ] Durability math: RF/EC chosen to meet target
- [ ] Failure domain design (node / rack / row)
- [ ] Network sized for replication traffic (jumbo MTU)
- [ ] Snapshot + retention policy
- [ ] Scrub schedule + throttle
- [ ] Drive failure replacement runbook
- [ ] Monitoring: SMART, perf, fill, replication health
- [ ] Restore drill ≥ quarterly

### Max Response Length
350 lines.

## Workflow

### Step 1: Pick Storage Class
```
Block      raw LUN / volume, mounted as fs by client (DB, VM disks)
           Examples: Ceph RBD, iSCSI LUN, FC LUN, EBS-style
File       posix file system over network (shared home, content, builds)
           Examples: NFS, SMB/CIFS, CephFS, GlusterFS, BeeGFS
Object     HTTP REST blob storage (backups, media, logs, ML datasets)
           Examples: MinIO, Ceph RGW (S3), S3, GCS
```

Rule:
- DB / VM → block
- Shared dev files / home dirs → file
- Bulk / backup / media / logs → object

### Step 2: Pick Engine

| Engine        | Block | File   | Object | Notes                              |
|---------------|-------|--------|--------|------------------------------------|
| Ceph          | RBD   | CephFS | RGW    | unified, scale-out, complex ops    |
| ZFS           | zvol  | yes    | (via Minio over ZFS) | single-node strong, ZFS send/recv |
| MinIO         | —     | —      | yes    | best-of-breed S3-compatible, simple|
| GlusterFS     | —     | yes    | —      | aging, simpler than Ceph           |
| LVM + mdraid  | yes   | (via xfs/ext4) | — | single-node                        |
| Hardware RAID | yes   | (via fs) | —    | single-node, no scale-out          |
| SAN (FC/FCoE) | yes (LUN) | —  | —    | enterprise, expensive, vendor-locked |
| NAS (NFS)     | —     | yes    | —     | simple, NFS share over Linux box   |

### Step 3: Durability Math (replicas vs EC)

```
Replication factor 3 (RF=3): 3 copies on different failure domains
  Durability: ~11 nines per Ceph documentation for typical hardware
  Storage efficiency: 33% (3× raw needed per usable)

Erasure coding (EC) k+m:
  k = data chunks, m = parity chunks
  Can lose m drives without data loss
  Storage efficiency: k / (k+m)
  Examples:
    EC 4+2  → 67% efficient, survive 2 losses
    EC 8+3  → 73% efficient, survive 3 losses
    EC 8+4  → 67% efficient, survive 4 losses
```

When to use replication vs EC:
```
RF=3       hot, latency-sensitive (DB, VMs, fast reads/writes)
EC 4+2     warm tier, mixed workloads
EC 8+3+    cold / archive, sequential, high efficiency
```

EC has higher latency for small writes (read-modify-write); avoid for OLTP block.

### Step 4: Failure Domain Design

```
"crush_failure_domain": rack (Ceph)
  → each replica on different rack
  → rack failure tolerated

Minimum nodes:
  RF=3 with host failure-domain   → ≥ 4 nodes (3+1 for rebuild headroom)
  EC 4+2 with host                → ≥ 7 nodes
  EC 8+3 with host                → ≥ 12 nodes
  EC 4+2 with rack                → ≥ 7 racks (or 1+ nodes per rack × 7+)

Always have spare capacity: cluster ≤ 80% full to allow rebuild on failure.
```

### Step 5: RAID Levels (single-node / array)

```
RAID-0     stripe (no redundancy)         max perf, ALL data lost on any drive fail
RAID-1     mirror (2-drive)               survives 1; usable = 50%
RAID-5     stripe + 1 parity              survives 1; usable = (n-1)/n; rebuild risk on large drives
RAID-6     stripe + 2 parity              survives 2; usable = (n-2)/n; preferred for HDD arrays
RAID-10    mirror + stripe                fast + safe; usable = 50%; preferred for DB
RAID-50    RAID-5 of RAID-5               legacy
RAID-60    RAID-6 of RAID-6               legacy
JBOD       no RAID, OS sees raw drives    required for Ceph OSDs
```

Rules:
- HDD ≥ 4TB: never RAID-5 (rebuild times exceed MTTDL window)
- SSD: RAID-10 for DB / hot; RAID-6 for archive
- Ceph / ZFS: JBOD (let software handle redundancy)

### Step 6: Ceph Reference Architecture

```
Min: 3 MON, 3 MGR, ≥ 5 OSD nodes (more = better)
Per OSD node: 10-30 HDDs or 4-12 SSDs (NVMe for journal/DB)
Network: 2 × 25G (public + cluster), jumbo MTU 9000
Pools: replicated for hot, EC for warm/cold
PGs: ~100 per OSD (auto-tune in modern Ceph)
```

```bash
# Pool creation
ceph osd pool create rbd-hot 256 256 replicated
ceph osd pool set rbd-hot size 3 min_size 2
ceph osd pool application enable rbd-hot rbd

# EC pool
ceph osd erasure-code-profile set ec-8-3 k=8 m=3 crush-failure-domain=host
ceph osd pool create ec-cold 256 256 erasure ec-8-3
```

### Step 7: ZFS Reference Architecture

```
Pool layout examples:
  RAIDZ1   1-parity, like RAID-5      (small / archive only)
  RAIDZ2   2-parity, like RAID-6      (general purpose)
  RAIDZ3   3-parity                   (huge HDDs, archive)
  Mirror   like RAID-1/10             (DB / hot)

# Create RAIDZ2 pool of 8 drives
zpool create tank raidz2 sda sdb sdc sdd sde sdf sdg sdh \
  -O compression=zstd -O atime=off -O xattr=sa -O recordsize=1M

# Snapshot
zfs snapshot tank/data@2026-05-23
# Send to remote
zfs send tank/data@2026-05-23 | ssh dr-host zfs receive tank2/data

# Auto snapshot (zfs-auto-snapshot or sanoid)
sanoid --configdir /etc/sanoid
```

### Step 8: Snapshot / Scrub Cadence

```
Snapshot retention (e.g., sanoid for ZFS):
  hourly  × 48
  daily   × 30
  weekly  × 8
  monthly × 12
  yearly  × 7

Scrub (consistency check):
  ZFS:   weekly for HDD, monthly for SSD
  Ceph:  deep-scrub weekly, light-scrub daily
  Throttle: cap scrub IO during business hours
```

### Step 9: Network Sizing

```
Ceph: replication = 2 × client traffic (one out for each replica)
EC: read = ~1× client, write = ~k+m × client (write amplification)
NFS sync writes: needs low-latency, jumbo MTU + RDMA helps
iSCSI: dedicated VLAN, jumbo, MPIO 2+ paths
NVMe-oF/TCP: 25G+ recommended, dedicated cluster network
```

### Step 10: Drive Replacement Workflow

```
1. SMART predicts failure (Reallocated, Pending, etc.) → alert
2. Mark OSD/zfs drive as 'failing' in monitoring
3. Order replacement (target ≤ 24h Tier-1 cluster)
4. Hot-swap (modern chassis); cold swap if not supported
5. Trigger rebuild: ceph osd in / zpool replace
6. Verify: rebuild progress monitored, SLO maintained
7. Update DCIM with new serial
8. Failed drive sanitized + RMA'd
```

## Rules
- Match storage class to workload (don't force objects into block).
- RF=3 for hot/latency, EC for cold/archive only.
- Failure domain ≥ rack for Tier-1 clusters.
- Cluster fill ≤ 80% always (rebuild headroom).
- Replace failed drive ≤ 24h for Tier-1 clusters.
- Snapshot cadence + retention defined per pool/dataset.
- Scrub weekly (HDD) or monthly (SSD), throttled.
- Replication traffic on dedicated VLAN with jumbo MTU.
- Restore drill quarterly (untested snapshot = no snapshot).

## References
- `references/ceph.md` — Cluster design, OSD layout, RBD/CephFS/RGW, ops commands
- `references/zfs-raid.md` — ZFS pools, RAIDZ, snapshots, send/recv; RAID levels
- `references/san-nas-iscsi.md` — SAN, NAS, iSCSI, NVMe-oF, MPIO
- `references/snapshots.md` — Snapshot strategies, retention, replication, restore

## Handoff
- `devops-bare-metal` for OSD node hardware spec and PXE provisioning.
- `devops-network-infrastructure` for storage VLAN, jumbo MTU, dedicated fabric.
- `data-data-replication` for DB replication on top of storage.
- `devops-backup-dr` for backup strategy beyond local snapshots.
- `enterprise-business-continuity` for storage loss scenarios.
