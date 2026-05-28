# Longhorn Performance Tuning

## Overview

Performance tuning for Longhorn involves optimizing disk selection, network configuration, replica strategy, engine parameters, and workload placement to achieve desired IOPS, throughput, and latency objectives. This reference covers the performance characteristics of Longhorn, tuning parameters, benchmarking methodology, and configuration for different workload types.

## Performance Fundamentals

### Longhorn I/O Path

Understanding the I/O path is essential for performance tuning.

```
[Application / Pod]
       |
       | (Kubernetes CSI)
       v
[Longhorn Volume Frontend]
(block device or iSCSI)
       |
       | (Replication and synchronization)
       v
[Longhorn Engine]
(one engine per volume on a node)
       |                    |
       v                    v
[Local Replica] ---- [Remote Replica]
(disk on same node)   (disk on other node)
```

**I/O Flow for Write Operations**:
1. Application writes to block device
2. Longhorn frontend receives I/O
3. Engine sends write to all replicas in parallel
4. Each replica writes to local disk
5. Replicas acknowledge completion
6. Engine acknowledges write completion (after quorum)
7. Application receives write confirmation

**I/O Flow for Read Operations**:
1. Application reads from block device
2. Engine selects nearest replica (with locality)
3. Replica reads from local disk
4. Data returned to engine
5. Data returned to application

### Performance Bottlenecks

| Bottleneck | Impact | Mitigation |
|---|---|---|
| Disk IOPS | Write latency, throughput | Use NVMe SSDs, dedicated storage disks |
| Network bandwidth | Replica sync throughput | 10GbE+ dedicated storage network |
| Network latency | Write acknowledgment time | < 1ms between nodes (same AZ) |
| CPU (engine) | I/O processing overhead | Reserved engine CPU > 0.25 cores |
| Replica count | Write amplification | 3 replicas is optimal balance |
| Concurrency | Multiple volumes competing | Distribute volumes across nodes |

## Disk Configuration

### Disk Type Performance Characteristics

| Disk Type | Sequential Read | Sequential Write | Random Read IOPS | Random Write IOPS | Latency |
|---|---|---|---|---|---|
| NVMe | 3000-7000 MB/s | 2000-5000 MB/s | 500K-1M | 300K-600K | < 100us |
| SSD SATA | 500-550 MB/s | 300-500 MB/s | 50K-100K | 30K-80K | < 1ms |
| HDD 7200 RPM | 150-200 MB/s | 100-150 MB/s | 100-200 | 100-200 | 5-15ms |

**Recommendation**: Use NVMe SSDs for all volumes requiring > 1000 IOPS. For general-purpose production, enterprise SSDs (SAS/SATA) are adequate. HDDs should only be used for archival data.

### Disk Selection Criteria

```yaml
disk_recommendations:
  high_performance:
    type: "NVMe"
    min_speed: "3000 MB/s sequential read"
    use_cases:
      - "Production databases"
      - "High-throughput applications"
      - "Latency-sensitive workloads"

  general_purpose:
    type: "SSD (SATA/SAS)"
    min_speed: "500 MB/s sequential read"
    use_cases:
      - "Web applications"
      - "CI/CD build artifacts"
      - "Dev/test environments"

  capacity:
    type: "HDD or SSD"
    use_cases:
      - "Backup staging"
      - "Archive data"
      - "Non-critical logs"
```

### Dedicated Storage Disks

```yaml
# Best practice: dedicated disk for Longhorn, not OS disk
disk_configuration:
  os_disk:
    purpose: "Operating system"
    size: "40-100 GB"
    type: "SSD"
    longhorn_enabled: false

  longhorn_disk:
    purpose: "Longhorn volume data"
    size: "200 GB+ per node"
    type: "NVMe or high-performance SSD"
    longhorn_enabled: true
    path: "/var/lib/longhorn"

  optional_cache:
    purpose: "Write cache / temp"
    size: "50-100 GB"
    type: "NVMe"
```

## Network Configuration

### Network Requirements

| Workload | Bandwidth | Latency | Jitter |
|---|---|---|---|
| General purpose | 1 Gbps | < 2ms | < 1ms |
| Production databases | 10 Gbps | < 1ms | < 100us |
| High IOPS workloads | 25 Gbps+ | < 500us | < 50us |
| Cross-AZ replication | 10 Gbps | < 5ms | < 2ms |

### Dedicated Storage Network

```yaml
# Separate network for storage traffic
network_configuration:
  storage_network:
    vlan: 100
    subnet: "10.100.0.0/16"
    bandwidth: "10 Gbps or higher"
    jumbo_frames: true
    mtu: 9000
    
  application_network:
    vlan: 200
    subnet: "10.200.0.0/16"
    bandwidth: "1-10 Gbps"
    
  management_network:
    vlan: 300
    subnet: "10.300.0.0/16"
    bandwidth: "1 Gbps"
```

### Network Tuning

```bash
# Enable jumbo frames on storage network interfaces
ip link set eth1 mtu 9000

# Network sysctl tuning
cat >> /etc/sysctl.conf <<EOF
# Increase network buffer sizes for storage traffic
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 16777216
net.core.wmem_default = 16777216

# Increase TCP buffer sizes
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1

# Reduce TIME_WAIT
net.ipv4.tcp_fin_timeout = 15

# Enable faster TCP connection reuse
net.ipv4.tcp_tw_reuse = 1
EOF

# Apply and verify
sysctl -p
```

## Replica and Engine Tuning

### Replica Count Impact

| Replicas | Write IO Penalty | Read IO Benefit | Fault Tolerance | Storage Overhead |
|---|---|---|---|---|
| 1 | None | None | None | 1x |
| 2 | 2x network writes | 1x local read | None (no quorum with 1 loss) | 2x |
| 3 | 3x network writes | Up to 1x local read | 1 node failure | 3x |
| 4 | 4x network writes | Up to 1x local read | 2 node failures | 4x |

**Write amplification**: Each write to a 3-replica volume results in 3 writes across the network. This is the primary performance cost of replication.

### Engine CPU Reservation

```yaml
# Engine CPU reservation setting
engineCPURequest: 0.25  # cores reserved per engine

# Impact: Higher reservation reduces I/O latency
# but reduces available CPU for applications
#
# Recommended values:
#   General purpose: 0.25
#   High IOPS workloads: 1.0
#   Maximum performance: 2.0
```

### Guaranteed Instance Manager CPU

```yaml
# Instance Manager CPU settings
guaranteed-instance-manager-cpu: 0.25
# This reserves CPU for instance manager pods
# that manage engines and replicas

# For high-performance environments:
guaranteed-instance-manager-cpu: 1
```

### Concurrency Settings

```yaml
# Concurrent backup and restore operations
backup_concurrent_limit: 5
restore_concurrent_limit: 3

# Concurrent volume operations
concurrent_volume_backup_restore_limit: 10

# Replica rebalance
replica_rebalance_interval: 300  # seconds between rebalance checks
```

## Data Locality

### Locality Modes

| Mode | Description | Read Performance | Write Performance | Use Case |
|---|---|---|---|---|
| disabled | Replicas placed anywhere | Remote read (network) | Standard | General purpose |
| best-effort | Prefer 1 replica on same node | Local read (fast) | Standard | Default for production |
| strict-local | All replicas on same node | Local read (fast) | No network writes | Low latency, no HA |

### Configuring Data Locality

```yaml
# StorageClass with best-effort locality
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  dataLocality: best-effort
  replicaAutoBalance: best-effort
```

**Trade-offs**:
- `best-effort`: Local replica provides fast reads. Replicas spread across nodes for HA.
- `strict-local`: All replicas on same node removes network I/O for replication. No HA against node failure.

## Replica Auto Balance

### Balance Modes

| Mode | Behavior | Use Case |
|---|---|---|
| disabled | No automatic rebalancing | Predictable manual placement |
| best-effort | Rebalance when disk usage imbalance detected | General production |
| immediate | Rebalance as soon as node/disk added | Elastic clusters |

### Impact on Performance

- Rebalancing consumes I/O and network bandwidth
- Schedule rebalancing during low-traffic periods
- For immediate mode, monitor for performance impact during rebalance
- Best-effort mode limits rebalance frequency

## Performance Benchmarking

### Benchmarking with fio

```yaml
# fio job file for Longhorn performance testing
benchmark:
  job: "longhorn-perf-test.fio"
  
  sequential_read:
    - name: "seq-read-1m"
      bs: "1M"
      rw: "read"
      iodepth: 32
      
  sequential_write:
    - name: "seq-write-1m"
      bs: "1M"
      rw: "write"
      iodepth: 32
      
  random_read:
    - name: "rand-read-4k"
      bs: "4K"
      rw: "randread"
      iodepth: 64
      
  random_write:
    - name: "rand-write-4k"
      bs: "4K"
      rw: "randwrite"
      iodepth: 64
      
  mixed_workload:
    - name: "mixed-70-30"
      bs: "8K"
      rw: "randrw"
      rwmixread: 70
      iodepth: 32
```

```bash
# Run benchmark
kubectl run fio-benchmark --image=alpine:latest \
  -- sh -c "apk add fio && fio /benchmark/*.fio" \
  --volume mount=/benchmark --volume name=fio-benchmark-cm

# Run on a PVC
kubectl run fio-test --image=louren/ubuntu-fio:latest \
  -- fio --name=test --size=10G \
  --filename=/mnt/testfile \
  --bs=4k --iodepth=64 --rw=randread

# Capture results
kubectl logs fio-test
```

### Expected Performance Ranges

| Configuration | 4K Random Read | 4K Random Write | 1M Sequential Read | 1M Sequential Write |
|---|---|---|---|---|
| 1 replica, NVMe, 10GbE | 80K IOPS | 40K IOPS | 1000 MB/s | 600 MB/s |
| 3 replicas, NVMe, 10GbE | 50K IOPS | 20K IOPS | 600 MB/s | 300 MB/s |
| 3 replicas, SSD, 1GbE | 15K IOPS | 6K IOPS | 100 MB/s | 60 MB/s |
| 3 replicas, HDD, 1GbE | 200 IOPS | 100 IOPS | 50 MB/s | 30 MB/s |

**Note**: Actual performance depends on hardware, concurrency, and workload characteristics. Always benchmark with production-like workloads.

## Performance Optimization Settings

### Longhorn Settings Reference

```yaml
# Performance-related Longhorn settings
settings:
  # Disk settings
  default-data-path: "/var/lib/longhorn"
  storage-min-allocated-percentage: 20
  
  # Engine settings
  engine-cpu-request: 0.25
  guaranteed-instance-manager-cpu: 0.25
  
  # Replica settings
  replica-auto-balance: "best-effort"
  replica-replenishment-wait-interval: 600
  
  # Network settings
  storage-network: ""
  v2-data-engine: false
  
  # Snapshot settings
  snapshot-data-integrity: "fast-check"
  snapshot-max-count: 250
  
  # Backup settings
  backup-concurrent-limit: 5
  restore-concurrent-limit: 3
  
  # Performance tuning
  taint-toleration: ""
  priority-class: "longhorn-critical"
```

### Priority Class for Longhorn

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: longhorn-critical
value: 1000000
globalDefault: false
description: "Priority class for Longhorn components"

# Apply in Helm values
global:
  priorityClass: longhorn-critical
```

## Workload-Specific Tuning

### Database Workloads

```yaml
# Optimized StorageClass for databases
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-database
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  dataLocality: best-effort
  staleReplicaTimeout: "30"
  fsType: ext4
  fromBackup: ""
  frontend: blockdev
  diskSelector: ssd
  nodeSelector: database-node
  recurringJobSelector: '[{"name":"hourly-backup"},{"name":"daily-backup"}]'
```

**Database-specific tuning**:
- Use `dataLocality: best-effort` for local read performance
- Reserve engine CPU: 0.5-1.0 cores
- Use NVMe disks with dedicated storage network
- Config `staleReplicaTimeout: 30` for quick replica replacement
- Enable backup recurring jobs for data protection

### High-Throughput Workloads

```yaml
# Optimized StorageClass for high throughput
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-throughput
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "2"
  dataLocality: best-effort
  staleReplicaTimeout: "30"
  fsType: xfs  # XFS better for large sequential I/O
  fromBackup: ""
  frontend: blockdev
```

**Throughput tuning**:
- Consider 2 replicas instead of 3 for increased throughput
- Use XFS filesystem for large sequential I/O workloads
- Jumbo frames (MTU 9000) on storage network
- Direct I/O in application for filesystem overhead reduction

### High-IOPS Workloads

```yaml
# Optimized StorageClass for IOPS
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-iops
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  dataLocality: best-effort
  staleReplicaTimeout: "30"
  fsType: ext4
  discard: true  # Enable TRIM for SSD/NVMe
  unmapMarkSnapChainRemoved: ignored
```

**IOPS tuning**:
- Enable `discard: true` for TRIM support on SSDs
- Use dedicated NVMe disks
- Reserve 1.0+ CPU for engine
- Ensure < 1ms network latency between nodes
- Consider `dataLocality: best-effort` for local reads

### CI/CD Workloads

```yaml
# Optimized StorageClass for CI/CD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-cicd
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "1"
  dataLocality: disabled
  staleReplicaTimeout: "10"
  fsType: ext4
  replicaAutoBalance: disabled
```

**CI/CD tuning**:
- 1 replica acceptable for ephemeral build data
- Fast provisioning (no replica sync overhead)
- Volume can be recreated per build rather than reused

## Monitoring Performance

### Key Performance Metrics

```yaml
# Prometheus metrics for Longhorn performance
metrics:
  longhorn_volume_iops:
    type: gauge
    description: "Current IOPS per volume"
    labels:
      - volume
      - volume_type

  longhorn_volume_throughput:
    type: gauge
    description: "Current throughput in bytes per second"
    labels:
      - volume
      - direction (read/write)

  longhorn_volume_latency:
    type: gauge
    description: "Average I/O latency in microseconds"
    labels:
      - volume
      - operation_type

  longhorn_volume_cpu_usage:
    type: gauge
    description: "CPU usage of volume engine"
    labels:
      - volume

  longhorn_disk_iops:
    type: gauge
    description: "Disk IOPS per replica"
    labels:
      - disk
      - node
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Longhorn Performance",
    "panels": [
      {
        "title": "Volume IOPS (Top 10)",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, longhorn_volume_iops)",
            "legendFormat": "{{volume}}"
          }
        ]
      },
      {
        "title": "Volume Latency",
        "type": "heatmap",
        "targets": [
          {
            "expr": "longhorn_volume_latency",
            "legendFormat": "{{volume}}"
          }
        ]
      },
      {
        "title": "Disk Utilization",
        "type": "gauge",
        "targets": [
          {
            "expr": "longhorn_disk_storage_available_bytes / longhorn_disk_storage_maximum_bytes * 100",
            "legendFormat": "{{disk}}"
          }
        ]
      }
    ]
  }
}
```

### Alerting Thresholds

```yaml
# Performance alert rules
alerts:
  high_latency:
    condition: "longhorn_volume_latency > 50000"  # 50ms
    for: "5m"
    severity: warning
    action: "Investigate disk and network performance"

  high_cpu:
    condition: "longhorn_volume_cpu_usage > 0.8"  # 80% of reserved CPU
    for: "10m"
    severity: warning
    action: "Increase engine CPU reservation"

  disk_capacity:
    condition: "longhorn_disk_storage_available_bytes < 0.10 * longhorn_disk_storage_maximum_bytes"
    for: "5m"
    severity: critical
    action: "Add more disks or clean up old snapshots"

  instance_manager_restart:
    condition: "increase(kube_pod_restarts{namespace='longhorn-system'}[15m]) > 0"
    for: "1m"
    severity: critical
    action: "Check instance manager logs and node health"
```

## Advanced Performance Tuning

### V2 Data Engine

Longhorn V2 data engine uses SPDK for improved performance.

**Benefits**:
- Lower latency (userspace I/O bypasses kernel)
- Higher IOPS (polling mode instead of interrupt)
- Better CPU efficiency

**Requirements**:
- Huge pages enabled on nodes (2MB pages)
- Kernel support for SPDK
- Dedicated CPU cores for SPDK

**Configuration**:
```yaml
# Enable V2 data engine in Helm values
engineReplicaV2:
  enabled: true
  hugePages:
    size: "2Gi"
    count: 2
```

### I/O Tuning Parameters

```bash
# Linux I/O scheduler for NVMe
# NVMe devices should use 'none' scheduler
echo none > /sys/block/nvme0n1/queue/scheduler

# Increase read-ahead for sequential workloads
blockdev --setra 4096 /dev/nvme0n1

# Disable merging for latency-sensitive workloads
# (only if workload is primarily random I/O)
echo 2 > /sys/block/nvme0n1/queue/nomerges

# Queue depth
echo 256 > /sys/block/nvme0n1/queue/nr_requests
```

### Filesystem Tuning

```yaml
# ext4 mount options for Longhorn
mount_options:
  - noatime           # Disable access time updates
  - nodiratime        # Disable directory access time
  - nobarrier         # Disable write barriers (NVMe with power loss protection)
  - data=ordered      # Ordered data mode (default)
  - discard           # Enable TRIM for SSD/NVMe
```

```bash
# Format with optimal options for SSDs
mkfs.ext4 -E stride=128,stripe_width=256 /dev/nvme0n1

# Mount with optimal options
mount -o noatime,nodiratime,nobarrier,discard /dev/nvme0n1 /mnt/longhorn
```

## Performance Testing Methodology

### Pre-Production Testing

```yaml
performance_test:
  objectives:
    - "Establish baseline IOPS and throughput"
    - "Verify SLA compliance"
    - "Identify bottlenecks before production"
    
  tests:
    - name: "sequential-read"
      expected_min: "500 MB/s"
      expected_max: "1000 MB/s"
      
    - name: "sequential-write"
      expected_min: "300 MB/s"
      expected_max: "600 MB/s"
      
    - name: "random-read-4k"
      expected_min: "30000 IOPS"
      expected_max: "60000 IOPS"
      
    - name: "random-write-4k"
      expected_min: "15000 IOPS"
      expected_max: "30000 IOPS"
      
    - name: "mixed-70-30"
      expected_min: "20000 IOPS"
      expected_max: "40000 IOPS"
```

### Production Monitoring

```yaml
monitoring_plan:
  baseline_period: "2 weeks"
  
  metrics_to_track:
    - "Volume IOPS (average and peak)"
    - "Volume latency (average and p99)"
    - "Disk utilization percentage"
    - "Network bandwidth usage"
    - "Engine CPU usage"
    
  review_cadence: "monthly"
  
  tuning_triggers:
    - "Latency p99 > 20ms consistently"
    - "IOPS below requirement"
    - "Disk utilization > 70%"
    - "Network saturation > 60%"
```

## Key Points

- NVMe SSDs provide 10x+ IOPS compared to HDDs for Longhorn volumes
- Dedicated storage network with 10GbE+ is essential for production
- 3 replicas balance fault tolerance with write amplification
- Data locality `best-effort` optimizes read performance
- Engine CPU reservation of 0.25-1.0 cores reduces I/O latency
- Replica auto-balance `best-effort` maintains even distribution
- Jumbo frames (MTU 9000) improve throughput on storage network
- V2 data engine with SPDK offers lower latency but requires huge pages
- Benchmark with production-like workloads before deploying
- Monitor IOPS, latency, and throughput per volume
- Tune filesystem options (noatime, discard) for SSD/NVMe
- Priority class for Longhorn components ensures performance isolation
- Disk selection should match workload requirements (NVMe for DB, SSD for general)
- Replica count is the primary trade-off between durability and performance
- Regular performance testing validates configuration and hardware
