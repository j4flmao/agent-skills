# Advanced Distributed Storage: Erasure Coding, Placement, Replication, Commit Protocols

Deeper topics for teams operating or heavily tuning distributed storage: erasure coding internals, data placement (Ceph CRUSH, HDFS rack awareness), cross-region replication, concurrency control on object stores, HDFS federation/HA, and performance engineering.

## Erasure Coding in Practice

Reed-Solomon RS(k, m): data split into k data fragments plus m parity fragments; any k of k+m reconstruct the object.

| Concern | Effect |
|---------|--------|
| Write path | Encoding CPU; must write k+m fragments to distinct failure domains |
| Small objects | Overhead dominates; some systems inline or replicate small objects instead |
| Degraded reads | Reading with a lost fragment requires decoding from k others |
| Repair traffic | Rebuilding one fragment reads k fragments across the network |
| Failure domains | Need at least k+m hosts (or racks) to tolerate host/rack loss |

HDFS 3 erasure coding:

```bash
hdfs ec -listPolicies
hdfs ec -enablePolicy -policy RS-6-3-1024k
hdfs ec -setPolicy -path /warehouse/cold -policy RS-6-3-1024k
hdfs ec -getPolicy -path /warehouse/cold
```

EC in HDFS applies to new files; existing files must be rewritten (e.g. `distcp`) to convert. EC files do not support `hflush`/`hsync` for appends in the same way as replicated files, so keep streaming write paths on replication.

## Data Placement

### HDFS rack awareness

Default replica placement for 3x: first replica on the writer's node (or random), second on a different rack, third on the same rack as the second but a different node. Configure a topology script (`net.topology.script.file.name`) so the NameNode knows racks; without it, all nodes are in `/default-rack` and a rack failure can lose data.

### Ceph CRUSH

Ceph maps objects to placement groups (PGs), and PGs to OSDs via the CRUSH algorithm using a hierarchy (root -> datacenter -> rack -> host -> osd) and rules.

```bash
ceph osd crush rule create-replicated rep-racks default rack hdd
ceph osd erasure-code-profile set ec-6-3 k=6 m=3 crush-failure-domain=host
ceph osd pool create lake-ec 256 256 erasure ec-6-3
ceph osd pool set lake-ec allow_ec_overwrites true   # needed for RBD/CephFS on EC pools
ceph osd pool set rep-pool pg_autoscale_mode on
```

Keep the PG autoscaler on unless you have a reason; mis-sized PG counts cause imbalance.

### MinIO erasure sets

MinIO groups drives into erasure sets (sizes chosen at deployment) and uses a configurable parity (`MINIO_STORAGE_CLASS_STANDARD=EC:4`). Capacity is expanded by adding server pools, not by adding drives to an existing pool.

## Cross-Region and Multi-Site Replication

| Mechanism | Scope | Notes |
|-----------|-------|-------|
| S3 Cross-Region Replication (CRR) / Same-Region (SRR) | Bucket to bucket | Requires versioning; asynchronous; Replication Time Control offers an SLA-backed time target |
| S3 Multi-Region Access Points | Routing across replicated buckets | Failover controls |
| GCS dual-region / multi-region buckets | Built-in geo-redundancy | Turbo replication option for dual-region with a target RPO |
| Azure GRS / RA-GRS / GZRS | Account-level | Secondary region read access with RA- variants |
| Ceph RGW multisite | Zones/zonegroups | Active-active metadata and data sync |
| MinIO site replication | Multiple sites | Replicates buckets, IAM and config |

Replication is asynchronous: define RPO from replication lag metrics, and remember deletes and overwrites replicate too, so replication is not a backup. Combine with versioning and Object Lock or separate-account backups.

## Concurrency Control on Object Stores

Patterns for safe concurrent writers:

| Pattern | How |
|---------|-----|
| Create-if-absent | S3 `PutObject` with `If-None-Match: *` (412 if exists) |
| Compare-and-swap | S3 `If-Match: <etag>` on PUT; GCS `ifGenerationMatch`; Azure `If-Match` |
| External lock/catalog | DynamoDB/Glue/Hive Metastore/REST catalog (Iceberg) or Unity Catalog coordinating commits |
| Log-structured commits | Delta Lake `_delta_log/000...N.json` written with put-if-absent semantics |

Delta Lake on S3 historically needed a DynamoDB-based LogStore for multi-cluster writes; with S3 conditional writes now available, check your Delta/Iceberg version's support before choosing a coordination mechanism.

## HDFS High Availability and Federation

- HA: active and standby NameNodes with shared edits via JournalNodes (quorum journal), ZooKeeper Failover Controllers for automatic failover.
- Federation: multiple independent NameNodes, each owning a namespace volume; Router-Based Federation presents a unified view.
- Observer NameNodes serve reads to offload the active NameNode.

## Performance Engineering

Object store reads from analytics engines:
- Parallelize requests: many concurrent range GETs per file (S3A `fs.s3a.connection.maximum`, `fs.s3a.threads.max`).
- Use columnar formats with predicate pushdown and column pruning to read fewer bytes.
- Vectored/ranged reads (Hadoop vectored IO, Parquet readers) coalesce nearby ranges.
- Avoid LIST-heavy planning: table formats list manifests instead of directories.

Low-latency object tiers: S3 Express One Zone (directory buckets, single AZ, higher request rates, lower latency) suits ML training and interactive analytics scratch data; it uses a different bucket type and session-based auth.

Caching layers: Alluxio, local NVMe caches in engines (Trino file system cache, Databricks disk cache), JuiceFS for POSIX over object storage.

## Integrity

- Enable end-to-end checksums: S3 supports additional checksums (CRC32, CRC32C, SHA-1, SHA-256, and CRC64NVME) on upload; newer AWS SDKs compute CRC-based checksums by default.
- HDFS stores CRC checksums per chunk and verifies on read; run `hdfs fsck /` to find corrupt or under-replicated blocks.
- Ceph scrubbing (`ceph pg deep-scrub`) detects bit rot.

## Capacity and Rebalancing

- Keep clusters below roughly 70-80% full; rebuild and rebalance need headroom, and Ceph blocks writes at the full ratio (default 95%) with warnings at the nearfull ratio (85%).
- HDFS: `hdfs balancer -threshold 10` after adding nodes; disk balancer for intra-node imbalance.
- Ceph: the balancer module (`ceph balancer mode upmap`) evens PG distribution.

## Checklist

- [ ] EC used for warm/cold data with enough failure domains; replication for hot/append paths
- [ ] Rack/zone topology configured (HDFS topology script, CRUSH hierarchy)
- [ ] Replication lag monitored; backups independent from replication
- [ ] Concurrent writers coordinated via conditional writes or catalog
- [ ] Clients tuned for parallel ranged reads
- [ ] Checksums enabled end to end; scrubbing/fsck scheduled
- [ ] Capacity alerts well before full ratios
