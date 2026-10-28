# Flink State Backends and Checkpoint Storage for Lake Pipelines

Choosing where Flink keeps operator state (state backend) and where it persists snapshots (checkpoint storage) for jobs that write into Iceberg, Paimon, Hudi or Delta. Part 1 of the Flink series in this skill:

| File | Topic |
|---|---|
| `flink_state_management_1.md` | State backends and checkpoint storage |
| `flink_state_management_2.md` | Checkpointing and exactly-once lake commits |
| `flink_state_management_3.md` | Savepoints, upgrades and state evolution |
| `flink_state_management_4.md` | State TTL and growth control |
| `flink_state_management_5.md` | Keyed, operator and broadcast state patterns |
| `flink_state_management_6.md` | Flink to Iceberg sink: upserts and small files |
| `flink_state_management_7.md` | CDC ingestion into the lake |
| `flink_state_management_8.md` | RocksDB tuning and checkpoint troubleshooting |

## State Backends

| Backend | Where working state lives | Snapshot | Good for |
|---|---|---|---|
| `hashmap` (HashMapStateBackend) | JVM heap objects | Full copy each checkpoint | Small state (fits comfortably in heap), lowest latency |
| `rocksdb` (EmbeddedRocksDBStateBackend) | Local disk via RocksDB, off-heap memory | Full or incremental | Large state (GBs–TBs per job), long windows, big joins |
| `forst` (Flink 2.0+) | Disaggregated: remote storage with local cache | Native to remote storage | Very large state on cloud; check maturity for your version |

Rules of thumb:
- Lake ingestion jobs with dedup, joins or CDC normalization usually need RocksDB.
- Stateless or near-stateless transforms (map/filter, append-only to the lake) work with `hashmap`.
- RocksDB serializes on every access: higher CPU, but state size is bounded by disk, not heap.

## Checkpoint Storage

| Storage | Description |
|---|---|
| `jobmanager` | Snapshots in JobManager memory; testing only |
| `filesystem` | Snapshots to durable storage (`s3://`, `gs://`, `abfss://`, `hdfs://`) — production |

## Configuration (`config.yaml`, Flink 1.19+ / 2.x)

Flink 1.20 moved checkpoint options under the `execution.checkpointing.*` prefix (FLIP-406); older `state.checkpoints.dir`, `state.savepoints.dir` and `state.backend.incremental` keys are deprecated. Use the form matching your version.

```yaml
state.backend.type: rocksdb
execution.checkpointing.storage: filesystem
execution.checkpointing.dir: s3://acme-flink/checkpoints/orders-ingest
execution.checkpointing.savepoint-dir: s3://acme-flink/savepoints/orders-ingest
execution.checkpointing.incremental: true
execution.checkpointing.interval: 1min
execution.checkpointing.mode: EXACTLY_ONCE
execution.checkpointing.externalized-checkpoint-retention: RETAIN_ON_CANCELLATION
execution.checkpointing.num-retained: 3

state.backend.rocksdb.localdir: /mnt/flink-rocksdb   # fast local SSD
```

S3 access uses the `flink-s3-fs-presto` (recommended for checkpoints) or `flink-s3-fs-hadoop` plugin, copied into `plugins/`.

## Programmatic Setup (DataStream, Java)

```java
Configuration conf = new Configuration();
conf.set(StateBackendOptions.STATE_BACKEND, "rocksdb");
conf.set(CheckpointingOptions.CHECKPOINT_STORAGE, "filesystem");
conf.set(CheckpointingOptions.CHECKPOINTS_DIRECTORY, "s3://acme-flink/checkpoints/orders-ingest");
conf.set(CheckpointingOptions.INCREMENTAL_CHECKPOINTS, true);

StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment(conf);
env.enableCheckpointing(Duration.ofMinutes(1).toMillis(), CheckpointingMode.EXACTLY_ONCE);
```

Prefer cluster/job configuration over hard-coding backends in code, so operations can change them without a rebuild.

## Sizing Inputs

Measure, do not guess:
- Checkpointed state size per checkpoint (Web UI → Checkpoints → "Checkpointed Data Size" vs "Full Checkpoint Data Size").
- Number of keys × average value size per stateful operator.
- Growth over a week with TTL in place (see part 4).

| Signal | Action |
|---|---|
| Heap usage high with `hashmap`, long GC pauses | Switch to RocksDB |
| Full checkpoints take most of the interval | Enable incremental checkpoints |
| Local disk filling | Larger volumes for `state.backend.rocksdb.localdir`, add TTL |
| Recovery slow after failure | Enable task-local recovery (`state.backend.local-recovery: true`; 1.20+ renamed it under `execution.state-recovery.*` — check your version's config reference) |

## Pitfalls
- Checkpoints on local disk or JobManager memory in production: state lost on node failure.
- Changing state backend type on restore: supported from canonical savepoints (not from native/incremental checkpoints).
- Using one checkpoint directory for multiple jobs: retention cleanup removes another job's state.
- RocksDB local dir on network storage: severe latency.

## Checklist
- [ ] Backend chosen from measured state size
- [ ] Checkpoints on durable object storage with a per-job path
- [ ] Incremental checkpoints enabled for RocksDB
- [ ] Externalized checkpoints retained on cancellation
- [ ] Config keys match the Flink version in use
