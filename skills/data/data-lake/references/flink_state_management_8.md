# RocksDB Tuning and Checkpoint Troubleshooting in Flink

Diagnosing slow or failing checkpoints and tuning the RocksDB state backend for large-state lake jobs. Part 8 of the Flink series (index in `flink_state_management_1.md`).

## Checkpoint Duration Breakdown

The Web UI checkpoint details show, per subtask:

| Phase | Meaning | High value indicates |
|---|---|---|
| Start delay | Time until the barrier reached the task | Backpressure upstream |
| Alignment duration | Waiting for barriers on all inputs | Skew / slow input channel |
| Sync duration | Snapshot preparation on the task thread | Large heap state, slow RocksDB flush |
| Async duration | Upload to checkpoint storage | Slow storage, large state, too few upload threads |

## Symptom to Fix

| Symptom | Likely cause | Fix |
|---|---|---|
| Checkpoints time out, start delay high | Backpressure | Find the bottleneck operator (Backpressure tab, busy time), scale it, or enable unaligned checkpoints |
| Async duration grows over days | State growth | Add TTL (part 4), enable incremental checkpoints |
| One subtask much slower | Key skew | Better key, salting with two-phase aggregation, local-global aggregation in SQL |
| Sink commit slow | Catalog/storage latency | Check catalog health; fewer, larger files |
| Frequent restarts after checkpoint failure | `tolerable-failed-checkpoints` = 0 | Allow a few failures; fix root cause |

## Unaligned Checkpoints

Barriers overtake in-flight data, so checkpoints complete under backpressure; in-flight buffers become part of the checkpoint.

```yaml
execution.checkpointing.unaligned.enabled: true
execution.checkpointing.aligned-checkpoint-timeout: 30s   # start aligned, switch to unaligned if slow
```

Trade-offs: larger checkpoints, more I/O; they reduce checkpoint time, not the underlying backpressure. Use alongside buffer debloating (`taskmanager.network.memory.buffer-debloat.enabled: true`).

## Generalized Incremental (Changelog) Checkpoints

The changelog state backend continuously uploads state changes, making checkpoint duration more predictable at the cost of extra storage writes:

```yaml
state.changelog.enabled: true
state.changelog.storage: filesystem
state.changelog.dstl.dfs.base-path: s3://acme-flink/changelog/orders-ingest
```

Evaluate on your workload; it adds write amplification to object storage.

## RocksDB Memory Model

By default RocksDB uses Flink managed memory (`state.backend.rocksdb.memory.managed: true`), shared by all RocksDB instances in a slot.

| Option | Default | Effect |
|---|---|---|
| `taskmanager.memory.managed.fraction` | 0.4 | Share of Flink memory given to managed memory (RocksDB) |
| `state.backend.rocksdb.memory.write-buffer-ratio` | 0.5 | Share of RocksDB memory for memtables |
| `state.backend.rocksdb.memory.high-prio-pool-ratio` | 0.1 | Cache share reserved for index/filter blocks |
| `state.backend.rocksdb.memory.fixed-per-slot` | unset | Fixed size instead of managed fraction |
| `state.backend.rocksdb.predefined-options` | `DEFAULT` | `SPINNING_DISK_OPTIMIZED`, `SPINNING_DISK_OPTIMIZED_HIGH_MEM`, `FLASH_SSD_OPTIMIZED` |
| `state.backend.rocksdb.thread.num` | 2 | Background flush/compaction threads |
| `state.backend.rocksdb.timer-service.factory` | `ROCKSDB` | `HEAP` keeps timers on heap (faster, but heap-bound) |
| `execution.checkpointing.incremental` (`state.backend.incremental` pre-1.20) | false | Upload only new SST files |

Tuning steps:
1. Put `state.backend.rocksdb.localdir` on local NVMe/SSD.
2. If reads dominate and cache hit rate is low, raise managed memory (larger TaskManager memory or managed fraction) before touching low-level options.
3. If memtable flushes stall writes, raise `write-buffer-ratio` or background threads.
4. Enable a few native metrics temporarily (`state.backend.rocksdb.metrics.block-cache-usage`, `...estimate-live-data-size`, `...num-running-compactions`) to confirm the bottleneck.

## Container Memory Kills

On Kubernetes/YARN, a TaskManager killed for exceeding container memory with RocksDB usually means native memory outside Flink's accounting:
- Keep `state.backend.rocksdb.memory.managed: true`.
- Increase `taskmanager.memory.jvm-overhead.fraction` / `.max` for native allocations.
- Use jemalloc-based images (official Flink images use jemalloc) to reduce fragmentation.

## Restore Is Slow

- Incremental checkpoints restore by downloading SST files; enable local recovery for faster task restarts on the same host.
- Rescaling from incremental RocksDB checkpoints needs key-range clipping/merging; newer versions optimize this, but large-state rescale still takes time — plan maintenance windows.

## Diagnostics Checklist

```bash
# Flink REST API
curl -s http://jobmanager:8081/jobs/<jobId>/checkpoints | jq '.latest.completed | {id, state_size, end_to_end_duration}'
curl -s http://jobmanager:8081/jobs/<jobId>/vertices/<vertexId>/backpressure | jq '.backpressureLevel'
```

## Checklist
- [ ] Checkpoint phases inspected before tuning
- [ ] Backpressure root cause addressed (not only unaligned checkpoints)
- [ ] RocksDB on local SSD with managed memory
- [ ] Incremental checkpoints enabled
- [ ] Container memory headroom for native allocations
- [ ] Key skew checked for the slowest subtasks
