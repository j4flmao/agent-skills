---
name: data-distributed-storage
description: >
  Use this skill when designing or operating HDFS, Ceph, MinIO, GlusterFS, or S3-compatible distributed storage. This skill enforces: NameNode HA design, block replication and placement strategy, rack awareness, HDFS federation or erasure coding, and S3-compatible object store deployment (MinIO, Ceph RADOS, Gateway). Do NOT use for: local filesystem, block storage on single node, NAS, or tape archival.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, storage, distributed, phase-11]
---

# Data Distributed Storage

## Purpose
Design reliable, scalable distributed storage systems for big data workloads — HDFS for analytics and S3-compatible object stores for modern lake architectures. Covers NameNode HA, block replication, rack awareness, federation, erasure coding, and standalone MinIO/Ceph deployment.

## Agent Protocol

### Trigger
Exact user phrases: "HDFS", "distributed storage", "Ceph", "MinIO", "GlusterFS", "namenode", "datanode", "block replication", "rack awareness", "HDFS federation", "erasure coding", "S3-compatible storage", "object store", "storage tiering", "NameNode HA", "fsimage", "edits log".

### Input Context
Before activating, verify:
- Workload profile (analytics batch, streaming writes, data lake, backup/archive)
- Scale: number of nodes, total capacity, throughput requirements
- Replication factor and durability SLA
- Network topology (rack layout, cross-rack bandwidth)
- Hardware spec: JBOD vs RAID, HDD vs SSD, network 10/25/100GbE
- S3 compatibility requirement (MinIO, Ceph, or AWS S3 SDK)

### Output Artifact
Distributed storage architecture with cluster topology, replication strategy, failure recovery plan, and configuration YAML.

### Response Format
```
Storage System: {HDFS | MinIO | Ceph | GlusterFS}
Topology: {nodes x racks, replication factor}
HA Config: {Quorum Journal Manager | shared edits | external metadata store}
Replication: {block replication factor | erasure coding policy}
Failure Domain: {rack | node | disk}
Recovery RTO/RPO: {minutes}
```
```yaml
# hdfs-site.xml or docker-compose or Helm values
# Key configuration parameters
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Storage system selected with justification
- [ ] Block replication or erasure coding policy defined
- [ ] Rack awareness topology mapped
- [ ] NameNode HA or metadata service HA configured
- [ ] Failure domain and recovery plan documented
- [ ] Capacity planning (raw vs usable vs effective) calculated
- [ ] S3-compatible deployment config for MinIO/Ceph

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Choose Storage System
HDFS: best for Hadoop/Spark analytics, large sequential reads/writes, files >128MB. MinIO: lightweight S3-compatible, containers/K8s-native, best for modern data lakes. Ceph: unified storage (block/object/file), RADOS for object, best when multi-protocol required. GlusterFS: POSIX-compatible, good for elastic file shares, less common for big data.

```
HDFS use case:  Hadoop/Spark cluster, 10+ nodes, 100TB+, append-heavy
MinIO use case: K8s-native object store, S3 SDK apps, multi-tenant, lakehouse
Ceph use case:  Unified storage, OpenStack, mixed workloads (block + object + file)
```

### Step 2: HDFS Architecture
NameNode: manages filesystem namespace (fsimage + edits log), block-to-Datanode mapping. DataNode: stores blocks, serves read/write requests, reports block status via heartbeat. Block: default 128MB, configurable. Replication: default 3. Pipeline replication: client writes to first DataNode, which forwards to second, then third.

```
Client -> NN (metadata) + Client -> DN1 -> DN2 -> DN3 (data pipeline)
                    +---+
 Block 128MB        | NN|  fsimage + edits
                    +-+-+
         +-----------+ +-----------+
         v                         v
   +-----+------+           +-----+------+
   | DataNode 1 | <-pipe<- | DataNode 2 |
   | Block A_1   |         | Block A_2   |
   | Block B_2   |         | Block B_1   |
   +------------+           +------------+
```

### Step 3: Block Replication and Placement
Placement policy (default): 1st replica on same node as writer (or same rack), 2nd on a different rack, 3rd on same rack as 2nd (different node). Rack awareness: minimize cross-rack write traffic, ensure cross-rack redundancy. Replication factor: 3 for production (2-rack minimum), 2 for dev, 1 for temp data.

Replica placement strategy:
```
Rack A: /rackA/node1 (primary)  -> 1st replica local
Rack A: /rackA/node2             -> 3rd replica
Rack B: /rackB/node1             -> 2nd replica (cross-rack)
```

Reconsider for erasure coding (RS-6-3): 9 data + 3 parity = 12 blocks, same fault tolerance as RF3 but 1.33x overhead vs 3x. Use EC for cold/warm data, replication for hot data.

### Step 4: NameNode High Availability
Active NameNode: serves all client requests, writes edits log. Standby NameNode: hot standby, applies edits, ready to take over. Quorum Journal Manager (QJM): 3 or 5 JournalNodes, edits written to quorum (majority). ZKFailoverController: monitors NN health, triggers failover via ZooKeeper.

```
          +-------+
          | ZK    |  quorum
          +---+---+
              |
    +---------+---------+
    v                   v
+---+----+        +----+---+
| NN Act |<------>| NN Std |
| edits ----> | QJM (3/5 JN) | <---- edits
+--------+        +--------+
    |                   |
+---+-----+       +-----+---+
| DataNode|       | DataNode|
+---------+       +---------+
```

Fsimage: merged checkpoint every 1h or 1M transactions. Edits log: rolling, max 1M txns per segment. Checkpointing: Standby NN merges fsimage + edits.

### Step 5: HDFS Federation
Multiple NameNodes manage independent namespaces (volumes). Each NN manages a pool of DataNodes (block pool). Client uses ViewFs or mount table to access across namespaces. Use case: multi-tenancy, separation of concerns, scale beyond single NN memory limit.

```
+--------+  +--------+  +--------+
| NN App |  | NN Hive|  | NN User|
| logs    |  | tables |  | homes  |
+-+----+-+  +-+----+-+  +-+----+-+
  |    |      |    |      |    |
  v    v      v    v      v    v
  +----+------+----+------+----+-----+
  |        DataNode Pool              |
  | Block pools: BP-1, BP-2, BP-3    |
  +-----------------------------------+
```

### Step 6: MinIO Deployment
Single-tenant or multi-tenant. Erasure coding: default N/2 parity (e.g., 16 drives = 8 data + 8 parity). MinIO distributed mode: multiple servers, multiple drives per server. Gateway mode (deprecated): use sidecar instead. K8s: Helm chart, StatefulSet, persistent volumes.

```yaml
# docker-compose distributed MinIO
services:
  minio1:
    image: quay.io/minio/minio
    command: server --console-address ":9001" http://minio{1...4}/data{1...4}
    volumes:
      - d1:/data1; d2:/data2; d3:/data3; d4:/data4
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_STORAGE_CLASS_STANDARD: EC:4   # 4 parity drives
```

### Step 7: Ceph RADOS
RADOS: Reliable Autonomic Distributed Object Store. OSDs (object storage daemons) per disk. MONs (monitors) for cluster state quorum. CRUSH map controls data placement. Pools: replicated or erasure-coded. PG (placement group) count: (OSDs * 100) / replication factor, rounded to nearest power of 2.

```
Ceph cluster:
  MONs: 3 or 5 for quorum
  OSDs: 1 per disk (no RAID, Ceph handles replication)
  MGR: ceph-mgr for metrics/balancing
  MDS: ceph-mds for CephFS (POSIX)
  Pools: data-replicated, metadata-replicated, data-ec
  CRUSH: failure domain = host/rack/room
```

### Step 8: Storage Tiering
Tier 1 (hot): SSD/NVMe, RF3, low-latency, active workloads. Tier 2 (warm): HDD 10K/15K, RF3 or EC-6-3, moderate access. Tier 3 (cold): HDD 7.2K or archival, EC-9-3 or EC-12-4, infrequent reads. Cold migrates to object store or tape after X days.

## Rules
- RF3 minimum for production, RF2 for dev, EC-6-3 for cold data
- Rack awareness must be configured in any multi-rack cluster
- NameNode HA with QJM (not shared NFS) for HDFS
- MinIO erasure coding set so usable = total * (1 - parity/N)
- Never use RAID with Ceph or MinIO — let the storage layer handle redundancy
- fsimage checkpoint every 1h or 1M txns; monitor edits log size
- Capacity planning: raw = disk * nodes, usable = raw * (1 - 1/replication) for RF3 = 33% usable
- Block size 128MB minimum for HDFS, larger for bigger datasets (256MB-1GB)

## References
- `references/hdfs-architecture.md` — NameNode HA, block management, rack awareness, federation, erasure coding, fsimage, edits log
- `references/s3-compatible.md` — MinIO deployment, Ceph RADOS, bucket policies, versioning, lifecycle, S3 gateway

## Handoff
`data-distributed-compute` for Spark/HDFS locality and YARN scheduling
`data-data-lake` for object store as lake storage backend
`data-data-replication` for cross-region bucket replication
