# Vector Database Operations

## Sharding

### Why Shard
- Distribute data across multiple nodes when a single node can't hold the index.
- Parallelize search queries across shards for lower latency.
- Isolate tenant data for multi-tenant architectures.

### Sharding Strategies

#### Hash-Based Sharding
```
shard_id = hash(partition_key) % num_shards
```
Simple and even distribution. Use when no locality requirement exists.
Downside: queries must scatter to all shards.

#### Range-Based Sharding
```
shard_id = floor(partition_key / range_size)
```
Preserves ordering for range scans. Risk of hot spots if data not uniform.
Use when queries frequently target a specific partition (e.g., tenant_id range).

#### Consistent Hashing
```
shard_id = hash(partition_key) sorted on a ring
```
Minimal data movement when nodes added/removed. Best for production systems.
Supports replication by assigning each key to multiple nodes on the ring.

### Shard Sizing
```
Target vectors per shard: 500k - 5M
Max vectors per shard: 10M (beyond this, rebuild time becomes painful)
```
For 50M vectors, use 10-20 shards.

### Query Routing
```
Query → Router → [Shard 1, Shard 2, ..., Shard N]
Each shard returns top-K local results
Router merges and returns top-K global results
```

### Distributed Search Performance
```
latency = max(shard_latency) + merge_overhead
merge_overhead ≈ O(K × N × log(K × N)) for N shards returning K results each
```

## Replication

### Why Replicate
- High availability during node failure.
- Read scaling for high query throughput.
- Geographic distribution for lower latency.

### Replication Factor
```
Production minimum: 2 (one primary, one replica)
Mission-critical: 3 (tolerate 2 failures)
Read-heavy: 3+ replicas for read scaling
```

### Replication Models

#### Leader-Follower
One primary handles writes, replicates asynchronously to followers. Reads served by any node. Risk of stale reads if replica lags.

#### Leaderless (Quorum-based)
Writes go to W of N nodes, reads from R of N nodes where W + R > N for consistency. Based on Dynamo/DynamoDB model.

#### Multi-Leader
Multiple nodes accept writes, conflict resolution required. Use for multi-region deployments with eventual consistency.

### Consistency Considerations
| Model | Read Staleness | Write Latency | Availability |
|-------|---------------|---------------|--------------|
| Async (eventual) | Seconds | Fast | High |
| Sync (strong) | None | Slow | Lower |
| Quorum | Configurable | Medium | High |

## Backup and Recovery

### Backup Types

#### Full Snapshot
Complete copy of vector index and metadata. Most reliable. Most storage.
```
Frequency: daily for production.
Retention: 30 days.
Storage: S3/GCS/Azure Blob.
```

#### Incremental
Only changed vectors since last backup.
```
Frequency: hourly.
Retention: 7 days.
Faster backup, complex restore (need all increments).
```

#### Continuous (WAL-based)
Write-ahead log streaming. Near-zero data loss.
```
Requires: database with WAL support (PostgreSQL pgvector, Milvus).
Restore: replay WAL from last full snapshot.
```

### Backup Configuration
```yaml
backup:
  schedule: "0 0 * * *"     # daily at midnight
  type: full
  destination: s3://vector-db-backups/production/
  encryption: aes-256
  compression: zstd
  retention_days: 30
  notification:
    on_failure: pagerduty
    on_success: none
```

### Restore Runbook
```
1. Identify backup timestamp: from monitoring or incident time.
2. Restore full snapshot: download from S3 (10 min per 10M vectors).
3. Apply incremental backups: in chronological order.
4. Verify data integrity: random sample N queries, compare results.
5. Route traffic to restored cluster: update DNS or load balancer.
6. Scale replicas: reconfigure replication factor.
7. Monitor: track query latency and recall rate for 1 hour.
```

### Recovery Time Objective (RTO) / Recovery Point Objective (RPO)
```
Full snapshot restore: 1h per 10M vectors (RTO)
Incremental restore: +15 min per day of increments (RPO: 1h)

Recommended:
  RTO: 2 hours
  RPO: 1 hour
```

## Scaling

### Vertical Scaling (Scale Up)
Add more resources to existing node: more RAM, faster CPU, more storage.
```
Pros: No re-sharding needed. Simple.
Cons: Hardware limits. Expensive at high end. Downtime during upgrade.
Threshold: Scale up when node >70% memory usage sustained.
```

### Horizontal Scaling (Scale Out)
Add more nodes to the cluster and rebalance data.
```
Pros: Near-limitless scale. No single node bottleneck. Rolling upgrades.
Cons: Re-sharding required. Data migration complexity. More nodes to monitor.
Threshold: Scale out when any shard >5M vectors or search latency > P99 target.
```

### Auto-Scaling Configuration
```yaml
scaling:
  metric: search_latency_p99
  target: 50  # ms
  cooldown: 300  # seconds between scale events
  scale_up:
    threshold: target * 1.5  # 75ms
    increment: 2  # add 2 nodes
  scale_down:
    threshold: target * 0.5  # 25ms
    decrement: 1  # remove 1 node
  min_nodes: 3
  max_nodes: 20
```

### Rebalancing
When nodes are added or removed, data must be redistributed.
- Progress: incremental, don't block reads/writes.
- Priority: rebalance hottest shards first.
- Throttle: limit rebalance bandwidth to 20% of total (preserve capacity for queries).
- Rollback: ability to revert if rebalance causes issues.

## Monitoring

### Key Metrics

| Category | Metric | Warning | Critical |
|----------|--------|---------|----------|
| Performance | P50 search latency | > target | > target × 2 |
| Performance | P99 search latency | > target | > target × 1.5 |
| Performance | QPS (queries/sec) | < expected | > max capacity |
| Accuracy | Recall@10 | < 0.90 | < 0.80 |
| Memory | RAM usage | > 70% | > 90% |
| Storage | Disk usage | > 70% | > 85% |
| Storage | Index build queue | > 100 pending | > 1000 pending |
| Networking | Network IO | > 70% bw | > 90% bw |
| Health | Node status | 1 node down | > 1 node down |

### Alert Configuration
```yaml
alerts:
  search_latency_p99:
    condition: "> 100ms for 5 minutes"
    severity: warning
    action: "Notify on-call, investigate slow queries"
  recall_drop:
    condition: "recall@10 < 0.90"
    severity: critical
    action: "Page on-call, check index health"
  node_down:
    condition: "node unreachable for 30s"
    severity: critical
    action: "Page on-call, failover to replicas"
  disk_space:
    condition: "disk > 85%"
    severity: warning
    action: "Increase disk size or trigger cleanup"
```

### Dashboard Template
```
Row 1: Search latency (P50, P95, P99) — time series, last 24h
Row 2: QPS and recall rate — time series, last 24h
Row 3: Memory/CPU/Disk per node — time series, last 24h
Row 4: Index build queue depth — time series, last 24h
Row 5: Error rate and node status — single stat
```

## Vendor-Specific Operations

### Pinecone
- Managed: no node-level operations needed.
- Scale: increase pod count or pod type via API/console.
- Backup: automatic with 7-day retention. Request point-in-time restore.
- Monitoring: built-in dashboard + CloudWatch/Prometheus metrics export.

### Qdrant
- Sharding: hash-based, configurable at collection creation (immutable).
- Replication: per-shard factor 1-3.
- Scaling: add nodes → rebalance automatically.
- Backups: snapshot API — export/import per collection.
- Monitoring: Prometheus metrics endpoint (`/metrics`).

### Milvus
- Sharding: consistent hashing on primary key.
- Replication: configurable per collection.
- Scaling: add query nodes (stateless) or data nodes (stateful, triggers rebalance).
- Backups: milvus-backup tool (REST API). Full and incremental.
- Monitoring: Grafana dashboard template included.

### Weaviate
- Sharding: configurable at class (collection) creation.
- Replication: factor 1-3, configurable per class.
- Scaling: add nodes, rebalance is automatic but may require manual `Recover` trigger.
- Backups: `weaviate-backup` module to S3/GCS. Manual or cron.
- Monitoring: Prometheus endpoint with detailed class-level metrics.

### Chroma
- Intended for development and small-scale production.
- Sharding: not natively supported (single-node).
- Scaling: vertical only (more RAM on single node).
- Backups: filesystem-level (SQLite + Parquet files).
- Monitoring: basic logging, no native metrics.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
