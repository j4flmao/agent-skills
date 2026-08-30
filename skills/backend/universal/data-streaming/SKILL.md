# Data Streaming Architecture

## 1. Skill Context
**Focus**: High-throughput message processing, event streaming, Kafka, Flink, stateful processing, and exact-once semantics.
**Triggers**: data streaming, kafka architecture, flink jobs, stream processing, exactly once

## 2. Advanced Technical Patterns

### Apache Kafka Core
- **Partitions & Consumer Groups**: The unit of scale. A consumer group can only have as many active consumers as there are partitions in the topic.
- **Offset Management**: Consumers track their position. Explaining the difference between `auto.commit=true` (at-most-once risk) vs manual commit after processing (at-least-once).
- **Log Compaction**: Instead of deleting old messages by time, Kafka keeps only the latest message for a specific Key. Essential for event sourcing state reconstruction.

### Stream Processing (Apache Flink)
- **Stateful Processing**: Streaming joins (e.g., joining a stream of clicks with a stream of purchases) require holding state in memory (RocksDB backend) until the join condition is met.
- **Watermarks & Event Time**: Dealing with late-arriving data. A watermark tells the system "I assume no more events older than timestamp T will arrive," allowing windows to close and emit results.
- **Exactly-Once Semantics (EOS)**: Implemented via Flink's Distributed Snapshots (Chandy-Lamport algorithm) combined with Kafka's transactional producer API.

## 3. Output Format
- Provide Kafka producer/consumer configurations.
- Explain the trade-offs between latency and throughput (e.g., `linger.ms` and `batch.size`).
- Provide Mermaid flowcharts of the data pipeline.
