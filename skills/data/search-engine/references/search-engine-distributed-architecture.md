# Search Engine Distributed Architecture

## Overview

Search engine clusters distribute data and query load across multiple nodes for scalability, high availability, and performance. This reference covers Elasticsearch/OpenSearch cluster topology, node roles, shard management, data tiers, replication, discovery, fault tolerance, and capacity planning. It also covers the distributed architecture of Meilisearch and Typesense for comparison.

## Elasticsearch Cluster Architecture

### Node Roles

```
Node roles define what each node does in the cluster:

Master nodes (cluster management):
├── Role: cluster state management, node tracking, index operations
├── Minimum: 3 master-eligible nodes for production
├── Count: odd number (3, 5, 7) for quorum
├── Resources: moderate CPU, low memory, low storage
├── Critical: never overload with data/indexing work
├── Settings: node.roles: [master]
└── Quorum: (master_nodes / 2) + 1 for elections

Data nodes (data storage and querying):
├── Role: store data, execute queries, indexing
├── Sub-types:
│   ├── data_hot: SSDs, high IOPS, recent data
│   ├── data_warm: standard storage, older data
│   ├── data_cold: HDD/cheap storage, rarely accessed
│   └── data_frozen: searchable snapshots, minimal cost
├── Resources: high CPU, high memory, large storage
├── Scaling: add more data nodes for capacity
└── Settings: node.roles: [data_hot], node.roles: [data_warm], etc.

Ingest nodes (preprocessing):
├── Role: document transformation before indexing
├── Pipelines: grok, geoip, remove, rename, set, date
├── Resources: moderate CPU (for pipeline processing)
├── Offload: separate from data/master nodes
├── Setup: node.roles: [ingest]
└── Use case: log ingestion, data enrichment, field extraction

ML nodes (machine learning):
├── Role: anomaly detection, forecasting, classification
├── Resources: high CPU, moderate memory
├── Required for: Elasticsearch ML features
├── Setup: node.roles: [ml]
└── Note: OpenSearch uses separate plugins for ML

Coordinating only nodes (query routing):
├── Role: distribute search requests, aggregate results
├── Used for: large clusters with heavy search volume
├── Resources: high CPU (for aggregation), high memory (for result merging)
├── Offload: reduce coordinating load from data nodes
├── Setup: node.roles: [] (empty = coordinating only)
└── Benefit: isolate query coordination from data operations

Recommended node per cluster size:

Small cluster (< 10 nodes):
├── 3 master-eligible nodes (shared with data roles)
├── Data nodes with [master, data_hot] roles
├── No dedicated coordinating or ingest nodes
└── Single role set per node

Medium cluster (10-30 nodes):
├── 3 dedicated master nodes
├── Data nodes split: hot + warm tiers
├── 1-2 dedicated ingest nodes (optional)
├── No dedicated coordinating nodes
└── Separate master from data

Large cluster (30+ nodes):
├── 3-5 dedicated master nodes
├── Data nodes: hot, warm, cold tiers
├── 2-4 dedicated ingest nodes
├── 2-4 dedicated coordinating nodes
└── Every role type dedicated
```

### Shard Architecture

```
Shards are the fundamental unit of data distribution:

Primary shards:
├── Each index has N primary shards (set at creation)
├── Primary shard count CANNOT be changed after creation
├── Default: 1 primary shard (7.x+), 5 (6.x and earlier)
├── Recommendation: start with 1 shard per 50GB
├── Maximum: sum of all primary shards across all indices should not exceed 20 per GB of heap
└── Formula: shard_count = max(1, ceil(total_data_gb / 50)), capped at 20 * heap_gb

Replica shards:
├── Copy of primary shard for HA and read scaling
├── Default: 1 replica per primary (can be changed dynamically)
├── Replicas can serve search queries (read scaling)
├── Replicas consume same storage as primary
├── Recommendation: 1 replica for production, 2 for read-heavy
└── Formula: total_shards = primary_shards * (1 + replica_count)

Shard distribution:
├── Elasticsearch distributes shards across nodes automatically
├── Shard allocation awareness: align shards to racks/zones
├── Shards per node = total_shards / data_nodes
├── Max shards per node: 1000 default (elasticsearch.yml)
└── Monitor: shard count per node for balance

Shard sizing guidelines:

Use case              │ Shard Size  │ Primary Count │ Notes
───────────────────────────────────────────────────────────────
Log/time-series       │ 50-100GB    │ 1-3 per day    │ ILM rollover at size
Ecommerce products    │ 10-30GB     │ 1-5             │ Stable dataset
Full-text articles    │ 30-50GB     │ 2-10            │ Content grows over time
User/search logs      │ 20-50GB     │ 1 per day       │ High retention
Metrics               │ 30-100GB    │ 1-3 per day     │ Aggregation-heavy

Shard health:
├── UNASSIGNED: shard not allocated to any node
│   ├── Cause: not enough nodes, disk space, allocation rules
│   └── Fix: check cluster health, reroute shards
├── INITIALIZING: shard being created/recovered
│   ├── Normal during: node restart, replica creation
│   └── Stuck: check node logs, disk space
├── STARTED: shard is active and serving
│   └── Normal operational state
├── RELOCATING: shard moving between nodes
│   ├── Normal during: rebalancing, node decommission
│   └── Stuck: relocation may indicate issues
└── Monitor: `GET _cluster/health` for shard status

Shard allocation awareness:
# Tell Elasticsearch about availability zones
cluster.routing.allocation.awareness.attributes: zone

# Ensure primaries and replicas are in different zones
cluster.routing.allocation.awareness.force.zone.values:
  - us-east-1a
  - us-east-1b
  - us-east-1c

# On each node, set: node.attr.zone: us-east-1a
# This ensures primaries and replicas never co-locate in same zone
```

### Data Tiers

```
Data tiers manage data based on age and access patterns:

Hot tier:
├── Purpose: active indexing, recent data, fast queries
├── Hardware: SSDs (NVMe preferred), high IOPS, moderate capacity
├── Typical: 2TB-10TB per node
├── Index settings: replicas=1-2, refresh_interval=1s-30s
├── Node role: data_hot
├── Performance: sub-10ms query latency, high indexing throughput
└── Retention: 1-30 days of data

Warm tier:
├── Purpose: older data, infrequent writes, occasional queries
├── Hardware: SSDs (SATA) or high-performance HDDs
├── Typical: 10TB-50TB per node
├── Index settings: replicas=0-1, forcemerge to 1 segment
├── Node role: data_warm
├── Performance: 50-500ms query latency
└── Retention: 30-90 days of data

Cold tier:
├── Purpose: rarely queried data, compliance retention
├── Hardware: HDDs or cost-optimized storage
├── Typical: 50TB-200TB per node
├── Index settings: replicas=0, searchable snapshot
├── Node role: data_cold
├── Performance: seconds-level query latency
└── Retention: 90-365 days of data

Frozen tier:
├── Purpose: archival data, minimal cost, infrequent access
├── Hardware: snapshot repository (S3, GCS, Azure Blob)
├── No dedicated nodes needed (stored in snapshot)
├── Index settings: frozen (searchable snapshot)
├── Performance: minutes-level query latency (first query)
└── Retention: 365+ days

Tier migration via ILM:
PUT _ilm/policy/logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": { "max_primary_shard_size": "50gb", "max_age": "30d" },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "shrink": { "number_of_shards": 1 },
          "allocate": { "number_of_replicas": 0, "require": { "data_tier": "data_warm" } },
          "set_priority": { "priority": 50 }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "searchable_snapshot": { "snapshot_repository": "s3-backup" },
          "set_priority": { "priority": 0 }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

## Cluster Operations

### Discovery and Cluster Formation

```
Discovery protocols:

Zen2 (Elasticsearch 7.x+, default):
├── Based on Raft consensus algorithm
├── Minimum 3 master-eligible nodes for fault tolerance
├── Cluster formation via
│   discovery.seed_hosts: ["node1:9300", "node2:9300", "node3:9300"]
├── Initial master nodes on first start:
│   cluster.initial_master_nodes: ["node1", "node2", "node3"]
├── Cluster state: serialized, published by elected master
├── Fault detection: master pings all nodes, nodes ping master
└── Re-election: ~5-30 seconds if master fails

Seed hosts configuration:
discovery.seed_hosts:
  - 10.0.1.10:9300
  - 10.0.1.11:9300
  - 10.0.1.12:9300

Single-node discovery (development only):
discovery.type: single-node

Cluster name:
cluster.name: production-search
├── All nodes in cluster must have same cluster.name
├── Different clusters on same network must have different names
└── Prevents: accidental cluster merging

Minimum master nodes (Zen1, legacy):
discovery.zen.minimum_master_nodes: 2  # For 3 master nodes
# Zen1 formula: (N / 2) + 1 where N = number of master-eligible nodes
```

### Node Addition and Removal

```
Adding a node:

1. Configure elasticsearch.yml on new node:
   cluster.name: existing-cluster-name
   node.name: new-node-name
   node.roles: [data_hot, ingest]
   network.host: 0.0.0.0
   discovery.seed_hosts: ["existing-master-1:9300", "existing-master-2:9300"]
   
2. Start Elasticsearch on new node
3. Verify node joins: `GET _cat/nodes`
4. Verify shard rebalancing: `GET _cat/shards`

Removing a node (graceful):

1. Exclude node from shard allocation:
   PUT _cluster/settings
   {
     "transient": {
       "cluster.routing.allocation.exclude._name": "node-to-remove"
     }
   }

2. Monitor shard relocation:
   GET _cat/recovery?active_only=true
   Wait until all shards relocated (no active recovery)

3. Stop Elasticsearch on the node
4. Remove from discovery seed hosts if applicable
5. Remove exclusion setting:
   PUT _cluster/settings
   {
     "transient": {
       "cluster.routing.allocation.exclude._name": null
     }
   }

Replacing a node (rolling):
├── Same as removal + addition
├── New node with same node.attr zones as old node
├── Shards automatically distribute to new node
└── Can be done without downtime (one node at a time)

Adding new data tier (e.g., adding warm nodes to existing cluster):
1. Add nodes with node.roles: [data_warm]
2. Define data tier attribute:
   node.attr.data_tier: warm
3. Create ILM policy that moves indices to warm after N days
4. Existing data: manually migrate or let ILM handle future rollovers
```

### Cluster Monitoring

```
Cluster health:
GET _cluster/health

Response:
{
  "cluster_name": "production-search",
  "status": "green",           // green=yellow=red
  "timed_out": false,
  "number_of_nodes": 12,
  "number_of_data_nodes": 8,
  "active_primary_shards": 450,
  "active_shards": 900,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0,
  "delayed_unassigned_shards": 0,
  "number_of_pending_tasks": 0,
  "number_of_in_flight_fetch": 0,
  "task_max_waiting_in_queue_millis": 0,
  "active_shards_percent_as_number": 100.0
}

Health status meanings:
├── Green: all primary and replica shards are active
├── Yellow: all primary shards active, some replicas unassigned
│   ├── Typically: not enough nodes for replica allocation
│   └── Acceptable: only if cluster has single data node
├── Red: some primary shards are unassigned
│   ├── DATA LOSS POSSIBLE
│   ├── Cause: node failure, disk full, corrupted index
│   └── Action: restore from snapshot, fix allocation

Node stats:
GET _nodes/stats
├── Indices: indexing rate, search rate, field data memory
├── OS: CPU, memory, disk usage
├── Process: open file descriptors, CPU percent
├── JVM: heap usage, GC count/duration, thread pools
├── Thread pools: search, indexing, bulk, get, merge
├── Transport: network tx/rx bytes
├── HTTP: current open connections
└── Breakers: field data, request, in-flight requests, accounting

Cluster stats:
GET _cluster/stats
├── Indices: total count, shard count, size
├── Nodes: node count by role, OS, JVM versions
├── Snapshot: current snapshots in progress
└── Status: overall cluster health

Index stats:
GET /myindex/_stats
├── Total indexing rate, search rate
├── Store size, translog size
├── Docs: count, deleted
├── Merges: current merges, total time
├── Refresh: total refreshes, time
├── Flush: total flushes, time
└── Segments: count, memory

Pending tasks:
GET _cluster/pending_tasks
├── Tasks waiting for master node
├── High count = cluster state update bottleneck
└── Monitor: pending tasks should stay near 0
```

### Backup and Restore

```
Snapshot repositories:

S3 repository:
PUT _snapshot/s3-backup
{
  "type": "s3",
  "settings": {
    "bucket": "my-search-snapshots",
    "region": "us-east-1",
    "role_arn": "arn:aws:iam::123456:role/snapshot-role",
    "base_path": "elasticsearch/backups",
    "compress": true,
    "chunk_size": "1gb"
  }
}

GCS repository:
PUT _snapshot/gcs-backup
{
  "type": "gcs",
  "settings": {
    "bucket": "my-search-snapshots",
    "base_path": "backups",
    "compress": true,
    "chunk_size": "1gb",
    "client": "default"
  }
}

Azure repository:
PUT _snapshot/azure-backup
{
  "type": "azure",
  "settings": {
    "container": "my-container",
    "base_path": "backups",
    "compress": true,
    "chunk_size": "1gb"
  }
}

Local filesystem repository:
path.repo: /mnt/backups

PUT _snapshot/local-backup
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups",
    "compress": true,
    "chunk_size": "1gb"
  }
}

Creating snapshots:
# Snapshot specific index
PUT _snapshot/s3-backup/my_products_snapshot
{
  "indices": "products",
  "ignore_unavailable": true,
  "include_global_state": false
}

# Snapshot all indices
PUT _snapshot/s3-backup/full_backup_20250315
{
  "indices": "*",
  "ignore_unavailable": false,
  "include_global_state": true
}

# Snapshot via SLM (Snapshot Lifecycle Management)
PUT _slm/policy/nightly-snapshots
{
  "schedule": "0 30 2 * * ?",    // Daily at 2:30 AM
  "name": "<nightly-snap-{now/d}>",
  "repository": "s3-backup",
  "config": {
    "indices": ["products", "orders", "logs-*"],
    "include_global_state": false
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 7,
    "max_count": 50
  }
}

Restoring snapshots:
# Restore specific index
POST _snapshot/s3-backup/my_products_snapshot/_restore
{
  "indices": "products",
  "rename_pattern": "(.+)",
  "rename_replacement": "restored_$1"
}

# Restore and wait for completion
POST _snapshot/s3-backup/my_products_snapshot/_restore?wait_for_completion=true
{
  "indices": "products",
  "ignore_index_settings": ["index.refresh_interval"]
}
```

## Capacity Planning

### Sizing Formula

```
Capacity planning calculations:

Total data size estimate:
├── Raw data per day: raw_gb_per_day
├── Index overhead: 1.1x (mapping + metadata)
├── Replicas: multiply by (1 + replica_count)
├── Days retention: retention_days
└── Total: raw_gb_per_day * 1.1 * (1 + replicas) * retention_days

Example: logging 100GB/day, 1 replica, 90 days retention
Total = 100 * 1.1 * 2 * 90 = 19,800 GB ≈ 20 TB

Node count estimate:
├── Total data (after compression, typically 30-50% reduction): ~10-14 TB
├── Target storage per hot node: 2-5 TB (SSD)
├── Target storage per warm node: 10-20 TB (HDD/SSD)
├── Hot nodes needed = compressed_hot_data / storage_per_node
├── Warm nodes needed = compressed_warm_data / storage_per_node
└── Example: 10 TB hot → 3-4 hot nodes (3-4TB each)
    Example: 14 TB warm → 2-3 warm nodes (5-7TB each)

Memory estimate:
├── Heap: 50% of physical RAM, max 31GB (compressed oops limit)
├── File system cache: remaining 50% of RAM
├── Shards per node: max 20 per GB of heap
├── Example: 8GB heap → max 160 shards per node
├── Example: 31GB heap → max 620 shards per node
└── General: 64GB RAM per data node (31GB heap + 33GB file cache)

CPU estimate:
├── Indexing-heavy: 8-16 cores per data node
├── Search-heavy: 8-32 cores per data node
├── Coordinating nodes: 8-16 cores (aggregation CPU)
├── Master nodes: 4-8 cores (light)
├── Ingest nodes: 8-16 cores (pipeline CPU)
└── General: 16 cores per data node for balanced workload

Network estimate:
├── Indexing: ~100Mbps per 10K docs/sec (depends on doc size)
├── Search: variable (aggregation returns are larger)
├── Cross-cluster: replication adds network overhead
├── Recommendation: 10Gbps between data nodes
└── Recommendation: 1Gbps between tiers is sufficient
```

### Shard Count Optimization

```
Shard count calculation:

Formula:
shards_per_index = max(1, ceil(target_size_gb / target_shard_size_gb))
target_shard_size_gb = 50 (recommended range 10-50)

Total shards across all indices:
total_shards = sum_over_all_indices(shards_per_index * (1 + replicas))

Max shards cluster can handle:
max_shards = 20 * heap_gb_per_node * data_node_count

Example:
├── Heap per node: 31GB
├── Data nodes: 10
├── Max shards: 20 * 31 * 10 = 6,200
├── Recommended actual: 3,100 (50% of max)
├── Max per index: 50 primary shards (50*50GB=2.5TB per index)
└── Recommendation: stay under 50% of max for headroom

Shard count by use case:

├── Small dataset (< 100GB, stable): 1-5 shards
├── Medium dataset (100GB-1TB): 5-20 shards
├── Large dataset (1TB-10TB): 20-200 shards
├── Massive dataset (10TB+): 200+ shards, multiple indices
└── Time-series: 1-3 shards per index, many indices

Shard rebalancing:
├── Automatic: cluster rebalances when nodes join/leave
├── Manual: `POST /_cluster/reroute` for specific shard moves
├── Index-level: set `index.routing.allocation.total_shards_per_node`
└── Cluster-level: `cluster.routing.rebalance.enable: replicas|primaries|all|none`
```

## Fault Tolerance

### High Availability Design

```
HA strategies:

1. Multi-node cluster (minimum 3 data nodes)
├── Losing any single node: cluster stays green
├── Replicas auto-assign to remaining nodes
├── Required: 1+ replicas per index
└── Recovery: automatic when node rejoins

2. Multi-zone deployment
├── Nodes spread across 3 availability zones
├── Shard allocation awareness ensures primaries/replicas in different zones
├── Losing 1 zone: cluster stays green (if replicas >= 2)
├── Losing 2 zones: data loss possible
└── Critical: use 3 zones minimum

3. Cross-cluster replication (CCR)
├── Active-passive: leader cluster replicates to follower cluster
├── Active-active: both clusters accept writes (requires conflict resolution)
├── Use case: disaster recovery, geo-proximity routing
├── RPO: near-zero (async replication, ~1s lag)
├── RTO: minutes (promote follower cluster)
└── Failover: update application endpoints to follower cluster

4. Snapshot-based DR
├── Regular snapshots to S3/GCS/Azure Blob
├── Restore to new cluster in different region
├── RPO: depends on snapshot frequency (typically 1-24 hours)
├── RTO: depends on data volume (typically 1-6 hours)
└── Lower cost than CCR, higher RPO/RTO

High availability checklist:
├── [ ] Minimum 3 master-eligible nodes
├── [ ] Minimum 3 data nodes per tier
├── [ ] At least 1 replica per index
├── [ ] Shard allocation awareness configured (zones)
├── [ ] Cross-cluster replication or snapshots for DR
├── [ ] Circuit breakers configured (70% total limit)
├── [ ] Disk watermark thresholds configured (85% warn, 90% critical, 95% flood)
├── [ ] Heap pressure monitoring and alerts
├── [ ] Snapshot lifecycle management enabled
└── [ ] Cluster health monitoring and paging

Disk watermark configuration:
cluster.routing.allocation.disk.watermark.low: 85%
cluster.routing.allocation.disk.watermark.high: 90%
cluster.routing.allocation.disk.watermark.flood_stage: 95%
# flood_stage blocks further writes — critical alert
```

### Disaster Recovery

```
DR strategies comparison:

Strategy          │ RPO       │ RTO        │ Cost     │ Complexity
───────────────────────────────────────────────────────────────────
Snapshot restore  │ 1-24h     │ 1-6h       │ Low      │ Low
CCR (cross-cluster)│ <1s     │ <5min      │ Medium   │ Medium
Dual-region active │ Near-0   │ <1min      │ High     │ High

CCR setup (Elasticsearch):
# On leader cluster
PUT /_ccr/auto_follow/logs-pattern
{
  "remote_cluster": "dr-cluster",
  "leader_index_patterns": ["logs-*"],
  "follow_index_pattern": "{{leader_index}}-copy",
  "max_read_request_operation_count": 5120,
  "max_outstanding_read_requests": 12,
  "max_write_request_operation_count": 5120,
  "max_outstanding_write_requests": 9,
  "max_write_buffer_count": 2147483647,
  "max_write_buffer_size": "512mb",
  "max_retry_delay": "500ms",
  "read_poll_timeout": "1m"
}

# Manual follower setup
PUT /dr-cluster/_ccr/follow
{
  "remote_cluster": "production",
  "leader_index": "products",
  "max_read_request_operation_count": 5120,
  "max_write_request_operation_count": 5120
}

Failover procedure:
1. Stop writes on primary cluster (or accept data loss)
2. Wait for CCR replication to catch up
3. Promote follower indices to regular indices:
   POST /follower_index/_ccr/unfollow
4. Update application endpoints to point to DR cluster
5. Re-reroute DNS / update connection strings
6. Verify cluster health and data integrity
7. Failback: reverse replication direction when ready

Disaster recovery testing:
├── Quarterly: snapshot restore test to new cluster
├── Semi-annual: CCR failover drill (30min)
├── Annual: full DR exercise (2-4 hours, all teams)
├── Validate: data integrity, latency, application connectivity
└── Document: lessons learned, update runbook
```

## OpenSearch-Specific Architecture

### OpenSearch Differences

```
OpenSearch cluster architecture key differences:

Configuration:
├── Config file: opensearch.yml (not elasticsearch.yml)
├── Cluster name: same concept
├── Node roles: same as Elasticsearch
├── Discovery: Zen2-based (same)
└── Plugins: security, alerting, anomaly-detection, k-NN

Security (built-in, not X-Pack):
├── Enabled by default (unlike Elasticsearch)
├── TLS for transport and HTTP layers
├── Internal user database or LDAP/Active Directory/SAML/OIDC
├── Role-based access control
└── Audit logging configurable

Index management:
├── ISM (Index State Management) — equivalent to ILM
├── Rollups: summarize time-series data
├── Transforms: pivot data for analytics
└── k-NN indices: separate index type for vector search

Dashboards (formerly Kibana):
├── Visualization, dashboarding, monitoring
├── Built-in: alerting, anomaly detection, maps
└── Extensible via plugins

OpenSearch configuration example:
# opensearch.yml
cluster.name: production-search
node.name: node-data-hot-1
node.roles: [data_hot, ingest]
path.data: /var/lib/opensearch
discovery.seed_hosts: ["master-1", "master-2", "master-3"]
cluster.initial_master_nodes: ["master-1", "master-2", "master-3"]

# Security
plugins.security.ssl.http.enabled: true
plugins.security.ssl.http.pemcert_filepath: cert.pem
plugins.security.ssl.http.pemkey_filepath: key.pem
plugins.security.allow_unsafe_democertificates: false
plugins.security.nodes_dn: ["CN=node.ops.example.com"]
plugins.security.audit.type: internal_opensearch
```

## Meilisearch Architecture

### Single-Node Architecture

```
Meilisearch is designed as a single-node search engine:

Architecture:
├── Binary: single Rust binary (< 30MB)
├── Storage: LMDB key-value store (embedded)
├── Indexing: fully in-memory, written to LMDB
├── Search: on-disk with memory-mapped files
├── No clustering: data must fit on one instance
├── No sharding: one index, one node
└── No replication: single node only (HA via load balancer + multiple instances)

Scaling approach:
├── Vertical scaling only (bigger instance)
├── Maximum: ~10M documents, ~50GB index size
├── RAM requirement: index fits in memory for best performance
├── CPU: 4-16 cores depending on query volume
└── Disk: SSD required for LMDB performance

High availability:
├── Run multiple Meilisearch instances behind load balancer
├── Each instance has full copy of data (no sharding)
├── Data sync: external (same index source for all instances)
├── Consistency: eventual (independently indexed)
└── Failover: load balancer detects unhealthy instances

Key limitations:
├── No distributed search (single node only)
├── No aggregation framework (facets only)
├── No script scoring (ranking rules only)
├── No cross-cluster replication
├── No index lifecycle management
└── No backup/restore API (manual LMDB copy)

Configuration:
# meilisearch.toml
http_addr = "0.0.0.0:7700"
master_key = "your-master-key"
db_path = "/var/lib/meilisearch/data"
dump_dir = "/var/lib/meilisearch/dumps"
snapshot_dir = "/var/lib/meilisearch/snapshots"
max_indexing_memory = "2GB"
max_indexing_threads = 4

# Performance settings
search_cutoff_ms = 1000  # Max search time
max_search_limit = 1000  # Max results per page
compression_level = 21   # Index compression

# For production behind load balancer
env = "production"
# No SSL (terminate at load balancer)
```

## Typesense Architecture

### Cluster Architecture

```
Typesense is designed as a clustered search engine:

Architecture:
├── Core: C++ binary
├── Storage: custom embedded storage engine (RocksDB-based)
├── Clustering: masterless, peer-to-peer
├── Sharding: per-node (each node holds subset of data)
├── Replication: per-shard (each shard replicated)
└── Consensus: Raft-based for cluster state

Node types:
├── All nodes are identical (no special master/ingest roles)
├── Data distribution: hash ring partitioning
├── Query handling: any node can serve any query
├── Write handling: any node can accept writes
└── Scaling: add nodes, data rebalances automatically

Sharding:
├── Hash-based partitioning on document ID
├── Each node hosts multiple shards
├── Shards auto-distribute when nodes added/removed
├── Query is broadcast to all nodes, results merged
└── Write is routed to primary shard, replicated to followers

Replication:
├── Each shard has N replicas (configurable)
├── Quorum-based writes: (N/2 + 1) replicas acknowledge
├── Writes are synchronous (strong consistency within cluster)
├── Read from any replica (eventual consistency for replicas)
└── Failover: automatic when node fails

Configuration:
# typesense-server.ini
api-port = 8108
api-address = "0.0.0.0"
data-dir = "/var/lib/typesense/data"
log-dir = "/var/log/typesense"

# Clustering
peers = [
  "node1.internal:8107",
  "node2.internal:8107",
  "node3.internal:8107"
]
api-key = "your-api-key"
ssl-certificate = "/etc/typesense/cert.pem"

# Performance
memory-size = "8GB"
num-search-threads = 8
num-write-threads = 4
enable-healthcheck = true

High availability:
├── Cluster: 3+ nodes for fault tolerance
├── Losing 1 node: cluster continues (quorum maintained)
├── Losing 2 nodes: read-only mode (no quorum for writes)
├── Replication: configure replication_factor=3
├── Write consensus: (replication_factor/2 + 1) = 2
└── Recovery: rebuilt from replica shards or snapshots

Backup and restore:
├── Snapshot: point-in-time snapshot of entire cluster
├── Export: document export from collection
├── Import: document import to collection
├── No incremental backup (full snapshots only)
└── Recommended: periodic exports + database dump
```

## Search Engine Architecture Comparison

### Architecture Comparison Matrix

```
Feature                    │ Elasticsearch  │ OpenSearch    │ Meilisearch    │ Typesense
────────────────────────────────────────────────────────────────────────────────────────────
Clustering                 │ ✅ Yes         │ ✅ Yes        │ ❌ No          │ ✅ Yes
Sharding                   │ ✅ Yes         │ ✅ Yes        │ ❌ No          │ ✅ Yes
Replication                │ ✅ Yes         │ ✅ Yes        │ ❌ No          │ ✅ Yes
Data tiers                 │ ✅ Hot/Warm/Cold│ ✅ Hot/Warm/Cold│ ❌ N/A       │ ❌ N/A
Cross-cluster replication  │ ✅ CCR         │ ✅ Replication│ ❌             │ ❌
Node roles                 │ ✅ 7 types     │ ✅ Same       │ ❌ N/A        │ ❌ Single role
Discovery                  │ ✅ Zen2 (Raft) │ ✅ Zen2       │ ❌ N/A        │ ✅ Raft
Snapshots                  │ ✅ Full/SLM    │ ✅ Full/SLM   │ ✅ Manual     │ ✅ Manual
ILM/ISM                    │ ✅ ILM         │ ✅ ISM        │ ❌            │ ❌
Automatic rebalancing      │ ✅ Yes         │ ✅ Yes        │ ❌ N/A        │ ✅ Yes
Rail/zone awareness        │ ✅ Yes         │ ✅ Yes        │ ❌ N/A        │ ❌
Max dataset size           │ PB-scale       │ PB-scale      │ ~50GB         │ TB-scale
Node language              │ Java           │ Java          │ Rust          │ C++
Minimum nodes for HA       │ 3              │ 3             │ 2 (LB only)   │ 3
Operations complexity      │ High           │ High          │ Low           │ Medium
Query latency (P99)        │ 10-100ms       │ 10-100ms      │ <50ms         │ <50ms
```

## Performance Benchmarking

### Cluster Performance Testing

```
Baseline performance testing:

Rally (Elasticsearch benchmarking tool):
# Install Rally
pip install esrally

# Run benchmark with default track
esrally --pipeline=benchmark-only \
  --target-host=localhost:9200 \
  --track=geonames \
  --challenge=append-fast-no-conflicts \
  --report-file=rally_report.json

# Custom track for your data
esrally --pipeline=benchmark-only \
  --target-host=localhost:9200 \
  --track=my-track \
  --track-path=/path/to/track \
  --report-file=my_report.json

Key metrics to measure:
├── Indexing throughput: docs/sec (target 10K-50K per node)
├── Indexing latency: P50/P90/P99
├── Search throughput: queries/sec (target 100-500 per node)
├── Search latency: P50/P90/P99 (target <50ms P50, <200ms P99)
├── Merge rate: MB/sec (should keep up with indexing)
├── GC duration: P99 < 500ms (long GC pauses impact latency)
├── Circuit breaker hits: should be 0
└── Memory pressure: heap < 75% used

Scaling test methodology:
1. Baseline: 1 node, 50% target data volume
2. Add 1 node: verify 2x indexing throughput
3. Add replicas: verify query throughput scaling
4. Vary shard count: 1, 3, 5, 10 shards per index
5. Vary index size: 10GB, 50GB, 100GB per shard
6. Test failure scenarios: kill node, verify recovery time
7. Test backup/restore: measure snapshot time, restore time

Benchmark results interpretation:
├── Indexing throughput linear scaling? (yes = good distribution)
├── Search latency increases with data size? (expect sub-linear growth)
├── Recovery time after node failure? (target < 5 min per 100GB)
├── Heap pressure stable over time? (leaks indicate problems)
└── GC pauses increase with data? (maybe need more shards or heap)
```

## Conclusion

Elasticsearch/OpenSearch distributed architecture provides enterprise-grade search at PB scale with data tiers, cross-cluster replication, and sophisticated shard management. Meilisearch offers simplicity for datasets up to 50GB. Typesense offers clustered search with simpler operations than Elasticsearch.

1. **Plan your shards**: 10-50GB per shard, max 20 shards per GB of heap.
2. **Use data tiers**: Hot (SSD, fast), Warm (SSD/HDD), Cold (HDD/snapshots).
3. **Separate roles**: Dedicated master nodes for cluster stability.
4. **Enable zone awareness**: Prims and replicas in different AZs.
5. **Set ILM policies**: Rollover at 50GB or 30 days for time-series data.
6. **Monitor cluster health**: Green is happy. Yellow is acceptably degraded. Red is data loss.
7. **Backup regularly**: Snapshot lifecycle management (SLM) for automated backups.
8. **Test DR**: Quarterly DR drills. Know your RPO and RTO.
9. **Benchmark at scale**: Test with production-like data volumes.
10. **Choose the right engine**: Elasticsearch/OpenSearch for PB-scale analytics. Meilisearch for simple site search. Typesense for high-performance search with clustering.

## References

- Elasticsearch Cluster Architecture: `elastic.co/guide/en/elasticsearch/reference/current/scalability.html`
- Elasticsearch Node Roles: `elastic.co/guide/en/elasticsearch/reference/current/modules-node.html`
- Elasticsearch Shard Allocation: `elastic.co/guide/en/elasticsearch/reference/current/modules-cluster.html`
- Elasticsearch ILM: `elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html`
- OpenSearch Cluster Configuration: `opensearch.org/docs/latest/install-and-configure/configuring-opensearch`
- OpenSearch Index State Management: `opensearch.org/docs/latest/im-plugin/ism/index`
- Meilisearch Architecture: `meilisearch.com/docs/learn/advanced/architecture`
- Typesense Architecture: `typesense.org/docs/latest/guide/clustering`
- Elasticsearch Rally: `elastic.co/guide/en/elasticsearch/reference/current/installing-and-upgrading.html#benchmarking`
- AWS re:Invent Elasticsearch Best Practices: `aws.amazon.com/blogs/big-data/top-10-best-practices-for-amazon-elasticsearch-service`
