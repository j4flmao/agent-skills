# Replication Performance Reference

## Sync vs Async Trade-offs

### Performance Characteristics

| Factor | Synchronous | Asynchronous | Semi-Synchronous |
|--------|-------------|--------------|------------------|
| Write latency | RTT to replica(s) + fsync | Local commit only | RTT to 1 replica |
| Read-after-write | Guaranteed consistent | May read stale data | Consistent on ack'd replica |
| Throughput | Limited by replica latency | Maximum local throughput | Near-async throughput |
| Data loss risk | None (RPO = 0) | Possible (RPO > 0) | Minimal (at least 1 replica) |
| Availability impact | Replica failure blocks writes | Replica failure no impact | 1 replica failure tolerated |

```python
def estimate_write_latency(
    sync_type: str,
    local_fsync_ms: float,
    replica_rtt_ms: float,
    num_sync_replicas: int
) -> float:
    """Estimate write latency for different replication modes."""
    if sync_type == "async":
        return local_fsync_ms
    elif sync_type == "semi_sync":
        return local_fsync_ms + replica_rtt_ms  # Wait for 1 replica
    elif sync_type == "sync":
        return local_fsync_ms + replica_rtt_ms * num_sync_replicas
    else:
        raise ValueError(f"Unknown sync type: {sync_type}")

# Example: us-east-1 to us-west-2 (RTT ~65ms)
print(estimate_write_latency("async", 5, 65, 2))      # 5ms
print(estimate_write_latency("semi_sync", 5, 65, 1))   # 70ms
print(estimate_write_latency("sync", 5, 65, 2))         # 135ms
```

## Lag Monitoring

### Replication Lag Queries

```sql
-- MySQL: check replica lag
SHOW REPLICA STATUS\G
-- Seconds_Behind_Master: lag in seconds
-- Relay_Log_Space: pending relay log size
-- Last_IO_Errno: I/O thread errors
-- Last_SQL_Errno: SQL thread errors

-- PostgreSQL: check replication lag
SELECT
    application_name,
    state,
    sync_state,
    pg_wal_lsn_diff(
        pg_current_wal_lsn(),
        replay_lsn
    ) AS lag_bytes,
    ROUND(
        EXTRACT(EPOCH FROM (NOW() - replay_lag))
    ) AS lag_seconds
FROM pg_stat_replication;

-- MongoDB: check replication lag
rs.status().members.forEach(function(member) {
    print(member.name + ": " + member.optimeDate);
});

-- Custom lag tracking table
CREATE TABLE replication_lag_log (
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_region STRING,
    target_region STRING,
    database_name STRING,
    lag_seconds INT,
    lag_bytes BIGINT,
    is_healthy BOOLEAN
);

-- Lag trend analysis
SELECT
    DATE_TRUNC('hour', log_time) AS hour,
    source_region,
    target_region,
    AVG(lag_seconds) AS avg_lag,
    MAX(lag_seconds) AS max_lag,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY lag_seconds) AS p99_lag
FROM replication_lag_log
WHERE log_time >= DATEADD('day', -7, CURRENT_TIMESTAMP)
GROUP BY hour, source_region, target_region;
```

### Alerting Thresholds

```yaml
lag_alerts:
  - database: mysql_orders
    sync_type: semi_synchronous
    warning: 5
    critical: 30
    action: "Page DBA, investigate network or primary load"

  - database: postgres_customers
    sync_type: asynchronous
    warning: 60
    critical: 300
    action: "Alert on-call, check WAL generation rate"

  - database: mongo_sessions
    sync_type: asynchronous
    warning: 30
    critical: 120
    action: "Check secondary oplog window"
```

## Bandwidth Optimization

### Compression for Replication

```yaml
# MySQL: replica compression
CHANGE REPLICATION SOURCE TO
    SOURCE_COMPRESSION_ALGORITHM = 'zstd',
    SOURCE_ZSTD_COMPRESSION_LEVEL = 3;

# PostgreSQL: WAL compression
wal_compression = zstd

# MongoDB: compression on wire protocol
net:
  compression:
    compressors: snappy,zstd
    compressionLevel: 3
```

### Batch Tuning

```yaml
# MySQL: batch parameters
slave_rows_search_algorithms: INDEX_SCAN
slave_parallel_workers: 4
slave_parallel_type: LOGICAL_CLOCK
binlog_group_commit_sync_delay: 1000    # microseconds
binlog_group_commit_sync_no_delay_count: 10

# PostgreSQL: batch parameters
wal_buffers: 64MB          # Buffer for WAL writes
wal_writer_delay: 200ms     # Flush interval
commit_delay: 100000        # Microseconds to wait for group commit
commit_siblings: 5          # Minimum concurrent transactions for group commit
max_wal_size: 16GB          # Maximum WAL size before checkpoint
min_wal_size: 4GB           # Minimum WAL size

# MongoDB: batch write concern
# Use write concern with journaling for durability
db.collection.insertMany(
    documents,
    {
        writeConcern: { w: "majority", j: true, wtimeout: 5000 },
        ordered: false  # Allows parallel processing
    }
)
```

### Network Optimization

```yaml
network:
  replication:
    - use dedicated replication network/VLAN
    - enable jumbo frames (MTU 9000) for replication traffic
    - use TCP_NODELAY for low-latency replication
    - enable NIC multi-queue for parallel I/O
    - monitor network utilization (>70% = bottleneck)

  cross_region:
    - use dedicated Direct Connect / ExpressRoute
    - enable QoS marking for replication traffic
    - consider WAN optimization appliances
    - compress traffic (zstd at application level)
    - batch small transactions into larger packets
```

## Parallel Apply

### Configuring Parallel Replication

```sql
-- MySQL 8.0+: parallel replication
STOP REPLICA;
SET GLOBAL slave_parallel_workers = 8;
SET GLOBAL slave_parallel_type = 'LOGICAL_CLOCK';
START REPLICA;

-- PostgreSQL: parallel apply via pgoutput
-- Not natively parallel; use multiple subscription for partitioning

-- MongoDB: parallel apply is automatic
-- Sharded clusters apply operations in parallel across shards

-- Parallel apply monitoring
SHOW REPLICA STATUS\G
-- Shows: Parallel_apply_workers, Parallel_apply_queue_length
```

### Parallel Apply Performance

```python
def estimate_parallel_apply_speed(
    workers: int,
    avg_transaction_time_ms: float,
    conflict_rate: float
) -> float:
    """Estimate transactions per second with parallel apply."""
    # Amdahl's Law: speedup = 1 / ((1-p) + p/n)
    # where p = parallelizable fraction, n = workers

    parallel_ratio = 1.0 - conflict_rate  # More conflicts = less parallelizable
    if parallel_ratio <= 0:
        return 1000 / avg_transaction_time_ms  # Serial execution

    speedup = 1 / ((1 - parallel_ratio) + parallel_ratio / workers)
    return (1000 / avg_transaction_time_ms) * speedup

# Example: 8 workers, 5ms avg txn, 10% conflict rate
print(estimate_parallel_apply_speed(8, 5, 0.10))
# ~1100 tps vs ~200 tps serial (5.5x speedup)
```

## Performance Benchmarks

### Replication Topology Benchmarks

```yaml
benchmarks:
  same_region:
    source: "us-east-1"
    target: "us-east-1"
    rtt_ms: 1
    async_max_tps: 25000
    semi_sync_max_tps: 20000
    sync_max_tps: 15000
    typical_lag_ms: 10

  cross_region_near:
    source: "us-east-1"
    target: "us-west-2"
    rtt_ms: 65
    async_max_tps: 15000
    semi_sync_max_tps: 5000
    sync_max_tps: 2000
    typical_lag_ms: 100

  cross_region_far:
    source: "us-east-1"
    target: "eu-west-1"
    rtt_ms: 80
    async_max_tps: 12000
    semi_sync_max_tps: 3000
    sync_max_tps: 1000
    typical_lag_ms: 150

  cross_continent:
    source: "us-east-1"
    target: "ap-southeast-1"
    rtt_ms: 200
    async_max_tps: 8000
    semi_sync_max_tps: 1000
    sync_max_tps: 300
    typical_lag_ms: 350
```

## Rules
- Async replication for cross-region (latency makes sync impractical)
- Semi-sync for same-region (balance of safety and performance)
- Monitor replication lag with sub-second granularity
- Alert on lag exceeding thresholds (5s for semi-sync, 60s for async)
- Use compression for cross-region replication (zstd recommended)
- Batch small transactions into larger groups for better throughput
- Enable parallel apply where supported (MySQL 8.0+, MongoDB)
- Dedicated replication network/VLAN for bandwidth isolation
- Right-size WAL/binary log retention to balance recovery with storage
- Benchmark replication performance before production deployment
