# Streaming Operations

## Cluster Sizing

```yaml
sizing:
  partition_capacity: "~10 MB/s per partition"
  throughput_per_broker: "~100 MB/s (with compression)"
  storage_per_broker: "2-4 TB NVMe recommended"
  replication_overhead: "3x for replication factor 3"
  heap: "8-16 GB per broker"
  heap_limit: "31 GB (JVM compressed oops limit)"

  formula:
    total_partitions: "(peak_throughput_mbps / 10) * replication_factor"
    brokers: "max(3, ceil(total_partitions / 20))"
    disk_per_broker: "retention_days * daily_ingest_gb * replication_factor / brokers * 1.25"
```

## Performance Tuning

### Producer Tuning

```properties
# Optimal producer settings for throughput
enable.idempotence=true
acks=all
compression.type=snappy
batch.size=65536           # 64KB batch
linger.ms=5                # wait up to 5ms for batch
max.in.flight.requests.per.connection=5
buffer.memory=134217728    # 128MB buffer
delivery.timeout.ms=120000
request.timeout.ms=30000
```

### Consumer Tuning

```properties
# Optimal consumer settings
fetch.min.bytes=65536           # fetch at least 64KB
fetch.max.wait.ms=500           # wait up to 500ms for min bytes
max.partition.fetch.bytes=10485760  # 10MB per partition
max.poll.records=500
session.timeout.ms=45000
heartbeat.interval.ms=15000
enable.auto.commit=false
```

### Broker Tuning

```properties
# Broker configuration
log.segment.bytes=1073741824     # 1GB segments
log.retention.bytes=-1           # unlimited size, time-based
log.retention.hours=168          # 7 days
log.cleaner.threads=4            # compaction threads
num.network.threads=8            # network threads
num.io.threads=8                 # disk I/O threads
num.replica.fetchers=4           # replica sync threads
queued.max.requests=500          # max queued requests
compression.type=producer        # inherit producer compression
```

## Topic Operations

```bash
# Create topic with optimal config
kafka-topics.sh --bootstrap-server localhost:9092 --create \
  --topic order.events.v1 \
  --partitions 12 \
  --replication-factor 3 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000 \
  --config min.insync.replicas=2

# Increase partitions (cannot decrease)
kafka-topics.sh --bootstrap-server localhost:9092 --alter \
  --topic order.events.v1 \
  --partitions 24

# Describe topic
kafka-topics.sh --bootstrap-server localhost:9092 --describe \
  --topic order.events.v1

# Check consumer lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe \
  --group order-processor
```

## Monitoring and Alerting

```yaml
alerts:
  consumer_lag:
    condition: "records_lag_max > 10000"
    severity: warning
    channel: slack
    action: "Check consumer health, scale consumer group"

  consumer_lag_critical:
    condition: "records_lag_max > 100000"
    severity: critical
    channel: pagerduty
    action: "Immediate investigation, possible consumer failure"

  under_replicated:
    condition: "under_replicated_partitions > 0"
    severity: critical
    channel: pagerduty
    action: "Check broker health, network, disk"

  broker_down:
    condition: "active_controller_count == 0"
    severity: critical
    channel: pagerduty
    action: "No active controller, cluster unstable"

  rebalance_frequency:
    condition: "rebalance_rate > 1 per minute"
    severity: warning
    channel: slack
    action: "Consumer group instability, check session timeouts"
```

## Disaster Recovery

```yaml
backup:
  strategy: "Replicate topics to secondary cluster"
  tool: "MirrorMaker 2 or Cluster Linking"

  recovery_time_objective:
    rto: "15 minutes (warm standby)"
    rpo: "seconds (near real-time replication)"

  recovery_steps:
    1. "Promote secondary cluster"
    2. "Update producer/consumer configs to secondary"
    3. "Verify data consistency"
    4. "Redirect traffic"
    5. "Repair primary cluster"
    6. "Reverse replication direction"
    7. "Fail back during maintenance window"
```

## Capacity Planning

```yaml
planning:
  metrics_to_track:
    - "bytes_in_per_sec"      # write throughput
    - "bytes_out_per_sec"     # read throughput
    - "messages_in_per_sec"   # message rate
    - "total_log_size"        # disk usage
    - "partition_count"       # total partitions
    - "consumer_lag"          # consumer health

  scaling_triggers:
    - "disk_usage > 70%"      # add brokers or increase retention
    - "network_util > 60%"    # add brokers
    - "partition_count > 2000 per broker"  # rebalance partitions
    - "consumer_lag growing"  # increase partitions or consumers

  headroom: "Always maintain 30% capacity headroom"
```

## Common Production Issues

| Issue | Symptoms | Cause | Fix |
|-------|----------|-------|-----|
| Consumer lag spike | Lag growing, not catching up | Slow consumer processing | Scale consumer, optimize processing, increase partitions |
| Rebalance storm | Frequent rebalances, processing stops | Session timeout too low | Increase session.timeout.ms, heartbeat.interval.ms |
| Producer timeout | TimeoutException in producer | Broker overloaded | Increase request.timeout.ms, add brokers |
| Disk full | Log directory full, broker stops | Retention too long | Reduce retention, add brokers, enable compaction |
| Message too large | RecordTooLargeException | Message > 1MB default | Increase max.message.bytes on topic and broker |
| Out of order messages | Messages processed out of sequence | Retry with max.in.flight > 5 | Set max.in.flight.requests=1 for strict ordering |
| Schema incompatibility | SerializationException | Schema evolution violates compatibility | Fix schema compatibility mode, migrate properly |
