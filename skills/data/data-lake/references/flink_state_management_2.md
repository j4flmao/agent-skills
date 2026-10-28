# Flink Checkpointing and Exactly-Once Commits to Lake Tables

How Flink checkpoints interact with lake table commits: lake sinks commit on checkpoint completion, so the checkpoint interval controls data latency, file sizes and commit rate. Part 2 of the Flink series (index in `flink_state_management_1.md`).

## How Lake Sinks Achieve Exactly-Once

```
records --> writer tasks write data files (uncommitted)
checkpoint barrier --> writers flush, report file list in checkpoint state
checkpoint completes --> committer commits the files to the table (one snapshot/commit)
failure before completion --> restart from last checkpoint, uncommitted files discarded (cleaned as orphans)
```

Consequences:
- Data becomes visible to readers only after a successful checkpoint.
- One commit (snapshot) per checkpoint per sink table.
- The committer stores the last committed checkpoint ID in table metadata (Iceberg snapshot summary `flink.max-committed-checkpoint-id`, together with the job ID) so a replay does not commit twice.

## Choosing the Interval

| Interval | Latency | Files per commit | Commits/day |
|---|---|---|---|
| 10 s | very low | many tiny | 8,640 |
| 1 min | low | small | 1,440 |
| 5 min | moderate | medium | 288 |
| 15 min | high | larger | 96 |

For lake sinks, 1–5 minutes is the usual range. Shorter intervals multiply snapshots, manifests and small files; always pair with compaction and snapshot expiration.

## Core Settings

```yaml
execution.checkpointing.interval: 2min
execution.checkpointing.mode: EXACTLY_ONCE
execution.checkpointing.timeout: 10min
execution.checkpointing.min-pause: 30s                 # breathing room between checkpoints
execution.checkpointing.max-concurrent-checkpoints: 1
execution.checkpointing.tolerable-failed-checkpoints: 3
execution.checkpointing.unaligned.enabled: false       # see part 8 before enabling
```

(Pre-1.20 key for unaligned: `execution.checkpointing.unaligned`.)

## Source Side Requirements

Exactly-once end to end also needs replayable sources:
- Kafka source: offsets stored in Flink state; committed back to Kafka only for monitoring (`commit.offsets.on.checkpoint`).
- CDC sources: binlog/LSN position in state.
- Files: the FileSource tracks processed splits in state.

## Kafka to Iceberg (Flink SQL)

```sql
SET 'execution.checkpointing.interval' = '2min';

CREATE CATALOG lake WITH (
  'type' = 'iceberg',
  'catalog-type' = 'rest',
  'uri' = 'https://catalog.internal/api/catalog',
  'warehouse' = 'prod'
);

CREATE TEMPORARY TABLE orders_kafka (
  order_id BIGINT, customer_id BIGINT, amount DECIMAL(18,2), order_ts TIMESTAMP(3),
  WATERMARK FOR order_ts AS order_ts - INTERVAL '5' MINUTE
) WITH (
  'connector' = 'kafka',
  'topic' = 'orders',
  'properties.bootstrap.servers' = 'kafka:9092',
  'properties.group.id' = 'orders-to-lake',
  'scan.startup.mode' = 'group-offsets',
  'properties.auto.offset.reset' = 'earliest',
  'format' = 'json'
);

INSERT INTO lake.bronze.orders SELECT * FROM orders_kafka;
```

## Kafka Sink Exactly-Once (for comparison)

When Flink writes back to Kafka with `DeliveryGuarantee.EXACTLY_ONCE`, it uses Kafka transactions; `transaction.timeout.ms` must exceed the maximum checkpoint duration plus restart time, and consumers must read with `isolation.level=read_committed`.

## Monitoring

| Metric (Web UI / metrics reporter) | Watch for |
|---|---|
| `lastCheckpointDuration` | Approaching timeout |
| `lastCheckpointSize` | Unbounded growth |
| `numberOfFailedCheckpoints` | Any steady increase |
| Checkpoint alignment / start delay (UI) | Backpressure delaying barriers |
| Sink commit duration | Catalog or storage slowness |

Lake-side: snapshots per hour and average data file size per commit.

## Pitfalls
- Disabling checkpointing: lake sinks never commit (Iceberg FlinkSink commits only on checkpoints).
- Very long checkpoint timeout hiding backpressure; data latency silently grows.
- Running the same job twice (blue/green) against one table without distinct job IDs/committer state: conflicting commits.
- Expecting `AT_LEAST_ONCE` checkpoint mode to give exactly-once table writes: duplicates possible on replay for appends.

## Checklist
- [ ] Interval chosen from latency need and file-size budget
- [ ] Sources replayable and positions stored in state
- [ ] Timeout, min-pause and tolerable failures set
- [ ] Compaction and snapshot expiration scheduled for sink tables
- [ ] Checkpoint and commit metrics alerted
