# Streaming Pipeline Troubleshooting Guide

Symptom-driven runbook for Kafka clusters, consumers, Kafka Connect, and Flink jobs: what to check, which commands to run, and typical fixes.

## First Commands

```bash
# Consumer group lag per partition
bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group billing

# Topic layout, leaders, ISR
bin/kafka-topics.sh --bootstrap-server kafka:9092 --describe --topic orders
bin/kafka-topics.sh --bootstrap-server kafka:9092 --describe --under-replicated-partitions
bin/kafka-topics.sh --bootstrap-server kafka:9092 --describe --unavailable-partitions

# KRaft quorum health
bin/kafka-metadata-quorum.sh --bootstrap-server kafka:9092 describe --status
bin/kafka-metadata-quorum.sh --bootstrap-server kafka:9092 describe --replication

# Read a few records
bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic orders --from-beginning --max-messages 5 \
  --property print.key=true --property print.headers=true
```

## Consumer Lag Growing

| Check | Likely cause | Fix |
|-------|-------------|-----|
| Lag on all partitions | Throughput too low | Scale consumers (≤ partitions), batch downstream writes |
| Lag on a few partitions | Key skew or one slow consumer instance | Inspect key distribution; rebalance hot keys; check that instance |
| Lag with frequent rebalances | Processing exceeds `max.poll.interval.ms` or instances restarting | Reduce `max.poll.records`, speed up processing, check crash loops |
| Lag after deploy | New code slower or erroring and retrying | Compare processing time per record; roll back |
| Lag but consumer "idle" | Stuck on poison message with infinite retry | Route to DLQ; fix deserialization |

## Frequent Rebalances

- Logs: `Member ... leaving group`, `Attempt to heartbeat failed since group is rebalancing`.
- Causes: long processing between polls, GC pauses, pods restarted by liveness probes, autoscaling churn.
- Fixes: cooperative-sticky assignor (classic protocol) or the new consumer group protocol (`group.protocol=consumer`, Kafka 4.0+), static membership (`group.instance.id`) for stable pods, tune `session.timeout.ms`, make liveness probes independent of lag.

## Under-Replicated or Offline Partitions

| Symptom | Check | Fix |
|---------|-------|-----|
| URP > 0 briefly during restarts | Expected during rolling restarts | Wait for ISR before restarting the next broker |
| Persistent URP on one broker | Disk I/O, network, or broker overloaded | Check broker metrics; move leadership/replicas away |
| Offline partitions | All replicas down or unclean election disabled with no ISR | Restore brokers; unclean election only as a last resort with known data loss |
| `NotEnoughReplicasException` on produce | ISR below `min.insync.replicas` | Recover replicas; do not lower `min.insync.replicas` permanently |

## Producer Errors

| Error | Meaning | Action |
|-------|---------|--------|
| `TimeoutException: Expiring N record(s)` | Batches not delivered within `delivery.timeout.ms` | Broker reachability, metadata, throttling, overloaded brokers |
| `RecordTooLargeException` | Message exceeds limits | Raise `max.request.size` + topic `max.message.bytes`, or use claim-check |
| `TopicAuthorizationException` | Missing ACL | Add Write/Describe ACL for the principal |
| `UnknownTopicOrPartitionException` | Topic missing and auto-create disabled | Create the topic via pipeline |
| `OutOfOrderSequenceException` | Broker data loss or misconfig with idempotence | Investigate broker failures; restart producer |

## Connection and Listener Problems

- Client connects to bootstrap then fails: `advertised.listeners` resolve to names/IPs unreachable from the client network. Test with `kafka-broker-api-versions.sh --bootstrap-server host:port --command-config client.properties`.
- TLS handshake failures: SAN mismatch, expired certificates, truststore missing the CA. Check with `openssl s_client -connect kafka-101.example.com:9094 -servername kafka-101.example.com`.
- SASL failures: wrong mechanism, missing SCRAM credentials for that mechanism, clock skew for OAuth tokens.

## Disk Full on Brokers

1. Identify large topics: `kafka-log-dirs.sh --bootstrap-server kafka:9092 --describe` (size per partition per log dir).
2. Temporarily reduce `retention.ms`/`retention.bytes` on offending topics with `kafka-configs.sh`; segments are deleted at the next retention check.
3. Never delete segment files manually while the broker runs.
4. Long term: tiered storage, capacity alerts at 70–80%, retention reviews.

## Compacted Topic Not Compacting

- Active segment is never compacted; small traffic topics may need smaller `segment.ms`/`segment.bytes`.
- `min.cleanable.dirty.ratio` (default 0.5) delays cleaning; lower it for faster compaction at more I/O.
- Check log cleaner thread health (`kafka.log:type=LogCleanerManager` metrics, cleaner logs); a crashed cleaner thread stops compaction until restart.

## Kafka Connect

| Symptom | Check | Fix |
|---------|-------|-----|
| Task `FAILED` | `/connectors/<name>/status` trace field | Fix config/data; restart failed tasks |
| Debezium not advancing | Replication slot status, connector logs, heartbeat | Ensure heartbeats; check DB permissions; avoid long-running source transactions |
| DB disk filling (PostgreSQL) | `pg_replication_slots` retained WAL | Restart/fix connector or drop abandoned slots |
| Duplicates in sink | At-least-once after restart | Upsert by key; idempotent sink config |
| Converter errors | Wrong converter or schema registry URL | Align converters with the producer's format |

## Flink Jobs

| Symptom | Check | Fix |
|---------|-------|-----|
| Backpressure | Web UI backpressure / `backPressuredTimeMsPerSecond` | Find the first busy operator downstream; scale it or fix the sink |
| Checkpoints timing out | Checkpoint size, alignment time, sink latency | Unaligned checkpoints, bigger interval, reduce state, faster storage |
| Restart loops | Exceptions in TaskManager logs, restart strategy | Fix poison records (side outputs), memory limits |
| OOMKilled TaskManagers | Managed vs heap memory, RocksDB memory | Adjust `taskmanager.memory.*`, enable managed memory for RocksDB |
| Watermark not advancing | Idle partitions, out-of-order timestamps | `withIdleness`, correct timestamp extraction |
| State restore fails after upgrade | Missing operator UIDs or incompatible serializers | Set UIDs; `--allowNonRestoredState` only when dropping state intentionally |

## Resetting Offsets Safely

```bash
# Dry run first (default), then --execute; the group must be inactive
bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --group billing --topic orders \
  --reset-offsets --to-datetime 2026-10-27T00:00:00.000 --dry-run
bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --group billing --topic orders \
  --reset-offsets --to-datetime 2026-10-27T00:00:00.000 --execute
```

Replays produce duplicates downstream; confirm consumers are idempotent before resetting.

## Data Issues

- Missing events: compare producer send counts with topic end offsets; check `errors.tolerance=all` silently dropping records into an unmonitored DLQ.
- Out-of-order events: different keys on different partitions have no relative order; ordering only holds per partition.
- Schema errors: `Unknown magic byte!` means a consumer expecting Schema Registry framing received plain JSON or vice versa.

## Checklist

- [ ] Dashboards: lag, URP, offline partitions, disk, rebalances, checkpoint health
- [ ] Runbooks for disk-full, broker loss, and offset reset
- [ ] DLQs monitored with alert thresholds
- [ ] Replication slot and Connect task status alerts
- [ ] Postmortems feed back into config standards
