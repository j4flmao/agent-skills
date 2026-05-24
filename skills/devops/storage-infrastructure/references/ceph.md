# Ceph — Cluster Design, OSDs, RBD/CephFS/RGW

## Why Ceph
Single distributed system that provides block (RBD), file (CephFS), and object (RGW) storage at
scale, with no single point of failure. Open source, no vendor lock. Complex to operate; rewarding
above ~50 TB usable.

## Cluster Components

```
MON     monitors — store cluster map, quorum-based (3 or 5)
MGR     managers — metrics, dashboard (active/standby)
OSD     object storage daemons — one per drive (typical)
MDS     metadata server — CephFS only (active + standby)
RGW     RADOS Gateway — S3/Swift API for object
```

## Minimum Production Setup

```
3 MON nodes (small VMs OK)
2 MGR (often colocated with MON)
≥ 5 OSD nodes (more = better; min 4 for RF=3 + rebuild room)
Per OSD node: 10–30 drives + 2× 25G NIC + 64–256 GB RAM
Network: separate public + cluster networks, jumbo MTU
```

## Per-OSD Resource Sizing

```
1 GB RAM per 1 TB OSD (HDD)
2-4 GB RAM per 1 TB OSD (SSD)
CPU: ~0.5 core per HDD OSD, 1+ core per NVMe OSD
DB/WAL on NVMe: 4% of OSD data size (e.g., 8 TB HDD → 320 GB NVMe partition)
```

## Pool Design

```
Replicated pool (RF=3) — hot, low-latency
ceph osd pool create rbd-hot 256 256 replicated
ceph osd pool set rbd-hot size 3 min_size 2
ceph osd pool application enable rbd-hot rbd
ceph osd pool set rbd-hot crush_rule replicated_host

# Erasure-coded pool — cold/archive
ceph osd erasure-code-profile set ec83 k=8 m=3 \
  crush-failure-domain=host plugin=jerasure technique=reed_sol_van
ceph osd pool create ec-cold 512 512 erasure ec83
ceph osd pool set ec-cold allow_ec_overwrites true   # for RBD on EC
```

PG count: target ~100 PGs per OSD. Modern Ceph autoscales (`ceph osd pool autoscale-status`).

## RBD (block)

```bash
# Create image
rbd create vol1 --size 100G --pool rbd-hot --image-feature layering,exclusive-lock,object-map,fast-diff,deep-flatten

# Map on client
rbd map rbd-hot/vol1
mkfs.xfs /dev/rbd0
mount /dev/rbd0 /mnt/data

# Snapshot
rbd snap create rbd-hot/vol1@snap1
rbd snap protect rbd-hot/vol1@snap1
rbd clone rbd-hot/vol1@snap1 rbd-hot/clone1     # CoW clone

# Performance
rbd bench --io-type write --io-size 4k --io-threads 16 --io-total 10G rbd-hot/vol1
```

Performance expectation (NVMe cluster):
- 4k random IOPS: 100k-500k+ depending on OSD count
- Throughput: line-rate of cluster NIC
- Latency: ~0.5-2ms typical writes

## CephFS (file)

```bash
ceph fs volume create cephfs
# auto-creates pools cephfs.cephfs.data + cephfs.cephfs.meta
# auto-deploys MDS

# Client mount (kernel)
mount -t ceph -o name=admin,secret=$(ceph auth get-key client.admin) \
  mon1,mon2,mon3:/ /mnt/cephfs

# Snapshot any dir
mkdir /mnt/cephfs/.snap/snap1
```

## RGW (object / S3)

```bash
# Deploy
ceph orch apply rgw default --realm=default --zonegroup=default --zone=default --count=2

# Create user
radosgw-admin user create --uid=app --display-name="App" --access-key=AK --secret-key=SK

# S3 client
aws --endpoint-url=http://rgw:7480 s3 mb s3://bucket
aws --endpoint-url=http://rgw:7480 s3 cp file.bin s3://bucket/
```

RGW features: multi-tenancy, lifecycle policies, bucket notifications, multisite replication.

## Day-2 Ops Commands

```bash
ceph -s                              # cluster status
ceph health detail                   # all warnings/errors
ceph osd tree                        # CRUSH hierarchy + state
ceph osd df                          # per-OSD fill
ceph df                              # cluster-wide capacity
ceph osd pool stats                  # IO per pool
ceph pg dump_stuck                   # PGs misbehaving
ceph osd perf                        # commit/apply latency per OSD
```

## Drive Replacement

```bash
# 1. Mark out
ceph osd out osd.17

# 2. Wait for rebalance
watch ceph -s

# 3. Stop & remove from CRUSH
ceph orch daemon stop osd.17
ceph orch osd rm 17 --replace --force

# 4. Physically swap drive

# 5. Re-add (use orchestrator)
ceph orch device ls           # find new drive
# orch auto-deploys if all-available-devices spec
```

## Scrub Schedule

```bash
# Defaults:
osd_scrub_min_interval = 86400        # 24h
osd_scrub_max_interval = 604800       # 7d
osd_deep_scrub_interval = 604800      # 7d deep

# Throttle during business hours
ceph config set osd osd_scrub_begin_hour 22
ceph config set osd osd_scrub_end_hour 6
ceph config set osd osd_scrub_load_threshold 1.5
```

## CRUSH Failure Domain

```
ceph osd crush rule create-replicated rep-rack default rack hdd
ceph osd pool set <pool> crush_rule rep-rack
```

Requires CRUSH map to have rack-level buckets; assign hosts to racks:
```
ceph osd crush add-bucket rack1 rack
ceph osd crush move host-osd01 rack=rack1
```

## Monitoring (Prometheus)

```bash
ceph mgr module enable prometheus
# scrape http://mgr-host:9283/metrics
```

Key alerts:
- `ceph_health_status != 1` (not HEALTHY)
- `ceph_osd_up` per-OSD down
- Pool fill > 85%
- PGs `stuck` or `inactive`
- Deep-scrub overdue > 14d
- Recovery rate < 1 GB/s on Tier-1 cluster

## Multisite Replication (RGW)

Active-active or active-passive across regions:
```
realm = top-level namespace
zonegroup = collection of zones (sites)
zone = single cluster within a zonegroup

radosgw-admin realm pull --rgw-realm=default --url=http://master-zone/
```

## Common Failures

- Single MON survives (split-brain risk) → always 3 or 5 MONs
- min_size = size (no writes during single failure) → use size=3, min_size=2
- Cluster fill > 85% → can't rebalance, performance collapses
- EC pool used for OLTP → high latency on small writes
- Forgetting MTU consistency → silent fragmentation, replication lag
- Cluster network on same NIC as public → client traffic starves replication
- OSD count too low → single failure too disruptive (need rebuild headroom)
