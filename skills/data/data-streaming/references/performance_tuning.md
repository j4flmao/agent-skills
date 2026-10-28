# Streaming Performance Tuning: Kafka, Flink, and Spark Structured Streaming

Throughput and latency tuning for streaming pipelines, ordered from highest typical impact. Always measure first: consumer lag, end-to-end latency, broker request latency, and processing backpressure.

## Key Metrics

| Layer | Metric | Meaning |
|-------|--------|---------|
| Producer | `record-send-rate`, `batch-size-avg`, `request-latency-avg`, `record-queue-time-avg` | Batching efficiency and broker responsiveness |
| Broker | `UnderReplicatedPartitions`, `RequestHandlerAvgIdlePercent`, `NetworkProcessorAvgIdlePercent`, produce/fetch `TotalTimeMs` | Saturation and replication health |
| Consumer | `records-lag-max`, `fetch-latency-avg`, `records-consumed-rate` | Keeping up or falling behind |
| Flink | `busyTimeMsPerSecond`, `backPressuredTimeMsPerSecond`, checkpoint duration and size | Where the bottleneck operator is |
| Spark | Batch duration vs trigger interval, `inputRowsPerSecond` vs `processedRowsPerSecond` | Micro-batch keeping up |

## Producer Throughput

| Setting | Effect |
|---------|--------|
| `linger.ms` 5–50 | Larger batches, fewer requests; adds up to that much latency |
| `batch.size` 64–256 KB | More records per request |
| `compression.type=zstd` or `lz4` | Less network and disk; zstd better ratio, lz4 lower CPU |
| `buffer.memory` | Increase if `send` blocks (`bufferpool-wait-time`) |
| Keys | Skewed keys concentrate load on a few partitions; check per-partition rates |

Compression is applied per batch, so it works better with larger batches.

## Broker Throughput

- Disks: dedicated SSD/NVMe or high-throughput volumes; Kafka writes sequentially but many partitions create random-ish I/O.
- Network: often the real ceiling; replication multiplies inbound traffic by RF.
- `num.network.threads` / `num.io.threads`: increase when idle percentages fall below ~30%.
- Leadership balance: keep partition leaders evenly distributed (`auto.leader.rebalance.enable=true`, Cruise Control).
- Avoid many tiny partitions per broker; each costs memory and recovery time.

## Consumer Throughput

| Setting | Effect |
|---------|--------|
| More partitions + more consumers | Parallelism (consumers ≤ partitions) |
| `fetch.min.bytes` (e.g. 64 KB) + `fetch.max.wait.ms` | Fewer, larger fetches |
| `max.partition.fetch.bytes` | Larger per-partition fetches for big records |
| `max.poll.records` | Balance throughput and `max.poll.interval.ms` safety |
| Async processing within partition | Process in parallel per key while preserving per-key order (e.g. Confluent Parallel Consumer) |

Slow downstream writes are the most common cause of lag: batch sink writes, use bulk APIs, and parallelize by key.

## Flink

### Parallelism and Slots

- Source parallelism ≤ Kafka partitions (extra subtasks sit idle).
- Set `parallelism.default` per job and override hot operators; use `maxParallelism` (key groups) large enough for future rescaling — it cannot change without state migration.
- Break operator chains only when isolating a slow operator helps diagnose or rebalance.

### State Backend

| Backend | Use |
|---------|-----|
| HashMap (heap) | Small state, lowest latency; limited by TaskManager heap |
| RocksDB (embedded) | Large state on local disk; incremental checkpoints |
| ForSt (disaggregated, Flink 2.x) | State on remote storage; newer, validate maturity for your workload |

RocksDB tuning: give it managed memory (`taskmanager.memory.managed.fraction`), use local SSDs for `state.backend.rocksdb.localdir`, enable incremental checkpoints (`execution.checkpointing.incremental: true` in recent versions; `state.backend.incremental` in older ones).

### Checkpointing

```yaml
execution.checkpointing.interval: 60s
execution.checkpointing.min-pause: 30s
execution.checkpointing.timeout: 10min
execution.checkpointing.unaligned.enabled: true      # helps under backpressure
execution.checkpointing.max-concurrent-checkpoints: 1
```

- Checkpoint duration close to the interval means checkpoints back up; increase interval or reduce state.
- Unaligned checkpoints shorten checkpoint time under backpressure at the cost of larger checkpoints.
- Use TTL on state (`StateTtlConfig`) so per-key state does not grow forever.

### Data Skew

- Hot keys overload one subtask: pre-aggregate (local/two-phase aggregation, `table.optimizer.agg-phase-strategy=TWO_PHASE` in SQL with mini-batch), salt keys, or split heavy keys.
- Watermark stalls from idle partitions: set `scan.watermark.idle-timeout` (SQL) or `withIdleness` on the `WatermarkStrategy`.

### Serialization

- Avoid Kryo fallback for POJOs (slow, fragile); ensure types are recognized as POJOs or register serializers. Disable generic types in tests (`pipeline.generic-types: false`) to catch fallbacks.

## Spark Structured Streaming

```python
(spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "kafka:9092")
    .option("subscribe", "orders")
    .option("maxOffsetsPerTrigger", 2_000_000)        # bound batch size
    .option("minPartitions", 48)                      # split Kafka partitions into more tasks
    .load())
```

| Setting | Guidance |
|---------|----------|
| `trigger(processingTime="30 seconds")` | Batch interval; longer = higher throughput, higher latency |
| `spark.sql.shuffle.partitions` | Match cluster cores for stateful ops; cannot change after the first checkpoint for stateful queries |
| State store | RocksDB state store provider (`spark.sql.streaming.stateStore.providerClass`) for large state |
| Watermarks | `withWatermark` to bound state for aggregations and stream-stream joins |
| Sinks | `foreachBatch` with bulk/merge writes; Delta/Iceberg sinks with periodic compaction |

## Latency vs Throughput Trade-offs

| Lower latency | Higher throughput |
|---------------|-------------------|
| `linger.ms=0`, small batches | Larger `linger.ms` and `batch.size` |
| Short checkpoint/trigger intervals | Longer intervals |
| Flink network buffer timeout low (`execution.buffer-timeout`) | Default or higher buffer timeout |
| Fewer operators, no shuffles | Batching sinks |

Define the latency SLO first; then tune for throughput within it.

## Pitfalls

- Adding consumers beyond partition count expecting more throughput.
- Increasing partitions for a keyed topic mid-stream and breaking ordering.
- Unbounded state from joins/aggregations without watermarks or TTL.
- Synchronous per-record writes to databases.
- Tuning without a load test that reproduces production key distribution.

## Checklist

- [ ] Lag, latency, and backpressure dashboards in place
- [ ] Producer batching and compression tuned
- [ ] Partition count matches target parallelism
- [ ] Sinks batch writes and are idempotent
- [ ] State bounded (watermarks, TTL); checkpoints well within interval
- [ ] Skew detected and mitigated
