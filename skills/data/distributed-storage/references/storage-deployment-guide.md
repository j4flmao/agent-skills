# Deploying Self-Hosted Distributed Storage: MinIO, Ceph (Rook), HDFS

Planning and deployment guidance for running object or distributed file storage yourself: hardware and capacity planning, Kubernetes deployment with operators, network design, monitoring, upgrades and day-2 operations.

## When Self-Hosting Makes Sense

- On-prem compute clusters needing local high-throughput storage.
- Data residency or air-gapped requirements.
- Very large, stable capacity where cloud storage plus egress costs exceed hardware and staff costs.

Otherwise prefer managed object storage; operating storage reliably requires on-call expertise.

## Capacity Planning

```
usable_capacity = raw_capacity x efficiency x fill_target
efficiency      = k / (k + m) for EC, 1/3 for 3x replication
fill_target     = about 0.7-0.8 (headroom for rebuilds, rebalancing, growth)
```

Example: 12 nodes x 12 drives x 16 TB = 2,304 TB raw. EC 8+4 efficiency 0.667 -> 1,536 TB; at 0.75 fill -> about 1,150 TB planned usable.

Also plan:
- Growth rate and procurement lead time.
- Failure domain count: EC k+m must fit across hosts (and racks if rack-level tolerance is required).
- Rebuild time: larger drives mean longer rebuild windows with reduced redundancy.

## Hardware Guidance

| Component | Guidance |
|-----------|----------|
| Drives | JBOD (no hardware RAID) for MinIO/Ceph/HDFS; NVMe for metadata/hot tiers |
| Network | 25 GbE or faster for dense nodes; separate client and cluster/replication networks for Ceph where possible |
| CPU | EC encoding and TLS need cores; Ceph OSDs roughly 1+ core each for HDD, more for NVMe |
| Memory | Ceph BlueStore default `osd_memory_target` 4 GiB per OSD; HDFS NameNode heap sized to file count |
| Homogeneity | Similar nodes per pool simplify balancing |

## MinIO on Kubernetes

Install via the MinIO Operator (or the commercial AIStor distribution); verify the current recommended installation method and licensing on MinIO's documentation, since packaging has changed over time.

Key decisions:
- Use local persistent volumes (DirectPV or local-path with `WaitForFirstConsumer`) rather than network block storage.
- One pool = N servers x M drives; erasure parity set per storage class (`EC:4` etc.). Expand by adding pools.
- Spread pods across nodes with anti-affinity and topology spread constraints.
- TLS enabled with certificates covering service names (and wildcard names if using virtual-host style).

Bare-metal (systemd) deployment with expansion notation:

```bash
# /etc/default/minio
MINIO_VOLUMES="https://minio{1...8}.internal:9000/mnt/disk{1...8}/minio"
MINIO_OPTS="--console-address :9001"
MINIO_ROOT_USER_FILE=/run/secrets/minio_root_user
MINIO_ROOT_PASSWORD_FILE=/run/secrets/minio_root_password
```

All nodes must have identical drive counts within a pool, synchronized clocks (NTP), and resolvable hostnames.

## Ceph with Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata: { name: rook-ceph, namespace: rook-ceph }
spec:
  cephVersion: { image: quay.io/ceph/ceph:v19.2.0 }   # pin a supported release
  dataDirHostPath: /var/lib/rook
  mon: { count: 3, allowMultiplePerNode: false }
  mgr: { count: 2 }
  dashboard: { enabled: true, ssl: true }
  network: { provider: host }
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: storage-1
        devices: [{ name: nvme0n1 }, { name: sdb }, { name: sdc }]
---
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata: { name: lake, namespace: rook-ceph }
spec:
  metadataPool: { failureDomain: host, replicated: { size: 3 } }
  dataPool: { failureDomain: host, erasureCoded: { dataChunks: 4, codingChunks: 2 } }
  gateway: { port: 80, securePort: 443, instances: 3, sslCertificateRef: rgw-tls }
```

- Use an odd number of monitors (3 or 5) on separate hosts.
- Keep metadata/index pools replicated on fast media; data pools may be EC.
- Create buckets via `ObjectBucketClaim` or users via `CephObjectStoreUser`.

## HDFS

Core configuration (excerpt):

```xml
<!-- hdfs-site.xml -->
<property><name>dfs.replication</name><value>3</value></property>
<property><name>dfs.blocksize</name><value>268435456</value></property>
<property><name>dfs.namenode.handler.count</name><value>100</value></property>
<property><name>dfs.nameservices</name><value>lake</value></property>
<property><name>dfs.ha.namenodes.lake</name><value>nn1,nn2</value></property>
<property><name>dfs.namenode.shared.edits.dir</name><value>qjournal://jn1:8485;jn2:8485;jn3:8485/lake</value></property>
<property><name>dfs.ha.automatic-failover.enabled</name><value>true</value></property>
<property><name>dfs.client.failover.proxy.provider.lake</name>
  <value>org.apache.hadoop.hdfs.server.namenode.ha.ConfiguredFailoverProxyProvider</value></property>
```

- HA with QJM and ZKFC for production; configure rack topology script.
- Size NameNode heap to the number of files and blocks; enforce small-file compaction.
- Enable Kerberos for authentication and HDFS transparent encryption zones where required.

## Network and Security

- Separate storage traffic (VLAN/dedicated NICs); jumbo frames only if consistently configured end to end.
- TLS for client endpoints; restrict admin APIs/consoles to admin networks.
- Integrate identity (LDAP/OIDC) for users; per-application access keys with least privilege; rotate keys.
- Encrypt at rest: drive-level (SED/LUKS) or service-level (MinIO SSE with KMS such as KES/Vault, Ceph RGW SSE with Vault).

## Monitoring

| Signal | Source |
|--------|--------|
| Capacity used / free, growth rate | Prometheus metrics (MinIO `/minio/v2/metrics/cluster`, Ceph mgr prometheus module, HDFS JMX exporter) |
| Drive/OSD/DataNode health | Health endpoints, `ceph health detail`, `hdfs dfsadmin -report` |
| Degraded/under-replicated objects or PGs | Ceph PG states, HDFS under-replicated blocks |
| Request latency and error rates (4xx/5xx) | Gateway metrics |
| Rebuild/healing progress | MinIO healing metrics, Ceph recovery rates |
| NameNode heap, RPC queue time | JMX |

Alert on degraded redundancy immediately; a second failure during rebuild may cause data loss.

## Upgrades and Day-2 Operations

- Read release notes; follow supported upgrade paths (Ceph: one major release at a time in most cases).
- Rolling upgrades with health checks between nodes; set Ceph `noout` during planned maintenance, then unset.
- Replace failed drives promptly; test drive replacement procedures.
- Backups: storage replication is not backup. Replicate to a separate site/account with versioning and Object Lock, and test restores.

## Checklist

- [ ] Capacity plan with redundancy efficiency, fill target and growth
- [ ] Failure domains sufficient for chosen EC/replication
- [ ] Local JBOD drives, dedicated storage networking
- [ ] Operator-based deployment with pinned versions
- [ ] TLS, identity integration, encryption at rest
- [ ] Prometheus metrics and alerts for capacity and degraded state
- [ ] Documented upgrade, drive replacement and restore procedures
