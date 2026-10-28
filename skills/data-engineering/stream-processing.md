# Stream Processing (Apache Flink)

## 1. Skill Context
**Focus**: Stateful, real-time event stream processing. Replaces nightly batch ETL with continuous pipelines.
**Triggers**: apache-flink, stream-processing, stateful-streaming, watermarks.
**Deep dive**: `skills/data/streaming/SKILL.md`.

## 2. Event Time vs. Processing Time
- **Processing time**: When the operator sees the event. Simple, but results change if the job lags or replays.
- **Event time**: The timestamp inside the event (e.g. when the phone created it, even if it was offline for 3 days). Results are deterministic on replay.
- **Watermarks**: A watermark `W(t)` declares that events with timestamp ≤ t are no longer expected, which lets event-time windows close.
  - Watermarks are a heuristic (e.g. `forBoundedOutOfOrderness(Duration.ofSeconds(30))`), so late events can still arrive. Handle them with `allowedLateness` and side outputs.
  - Configure source idleness so one silent partition does not stall the watermark.

## 3. Stateful Checkpointing
- Flink snapshots operator state with **asynchronous barrier snapshotting**, a variant of Chandy-Lamport. Checkpoint barriers flow with the stream, and each operator snapshots its state as barriers arrive, without stopping the job.
- State lives in a state backend (heap, or RocksDB for large state with incremental checkpoints). Checkpoints go to durable storage (S3/HDFS). After a failure, Flink restores the last completed checkpoint and rewinds the sources (e.g. Kafka offsets).
- This gives **exactly-once state updates**. **End-to-end exactly-once** output also needs replayable sources and transactional or idempotent sinks (e.g. the Kafka sink with `DeliveryGuarantee.EXACTLY_ONCE`, which uses two-phase commit tied to checkpoints).

## 4. Rules
- Set `uid()` on every stateful operator so savepoints survive job changes.
- Key streams so state is evenly distributed, and watch for hot keys.
- Set state TTL when the keyspace is unbounded.
- Use savepoints for upgrades and rescaling.
- Monitor checkpoint duration and backpressure.
