---
name: data-streaming
description: >
  Advanced data streaming capabilities, encompassing real-time data
  processing, exact-once guarantees, and complex state management using
  Kafka and Flink.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [streaming, kafka, flink, real-time]
---

# Title: Data Streaming Mastery

## Purpose
Comprehensive data streaming handler designed to process massive real-time datasets with extreme low latency and high throughput.
Provides mechanisms for exact-once processing semantics, sophisticated topic partitioning in Kafka, and distributed state management in Flink.

## Core Principles
1. Exact-once semantics over at-least-once.
2. Robust topic partitioning strategies for maximum parallelism.
3. Comprehensive Flink state backend tuning for fault tolerance.
4. Seamless integration with late-arriving event handling.
5. Optimized checkpointing algorithms.

## Agent Protocol
- Triggers: Streaming data ingestion
- Input Context Required: Kafka broker list, Flink JM endpoint
- Output Artifact: Processed streams, materialized views
- Response Formats:
```json
{
  "status": "processing",
  "throughput_mbps": 1500.5,
  "checkpoint_status": "COMPLETED"
}
```

## Decision Matrix
```text
[Incoming Stream] --> Is high volume?
  +-- Yes --> Use Kafka Hash Partitioning --> Flink Keyed Process
  +-- No --> Use Round Robin --> Flink Stateless Process
```

## Detailed Architectural Overview
```text
  +------------------+       +---------------+       +---------------+
  | Kafka Producers  | ----> | Kafka Brokers | ----> | Flink Cluster |
  +------------------+       +---------------+       +---------------+
          |                         |                        |
          +--> Schema Registry      +--> Zookeeper           +--> RocksDB State Backend
```
Lifecycle Diagram:
```text
[Start] -> [Initialize Sources] -> [Restore State] -> [Process Elements] -> [Checkpoint] -> [Sink] -> [End]
```

## Workflow Steps
1. Phase 1: Initialization
   1. Connect to cluster.
   2. Establish schemas.
   3. Setup topologies.
2. Phase 2: Ingestion
   1. Consume from topic.
   2. Deserialize avro.
   3. Assign timestamps.
3. Phase 3: Processing
   1. Keyby operations.
   2. Windowing logic.
   3. Process functions.
4. Phase 4: State Management
   1. Update value state.
   2. Register timers.
   3. Handle late data.
5. Phase 5: Checkpointing
   1. Trigger barrier.
   2. Snapshot state.
   3. Acknowledge to JM.
6. Phase 6: Sinking
   1. Two-phase commit.
   2. Write to data warehouse.
   3. Finalize transaction.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| High Latency | Checkpoint Block | Tune checkpoint intervals |
| Backpressure | Slow Sink | Scale up sink parallelism |
| OOM | Large Window State | Use RocksDB backend |
| Data Loss | At-most-once config | Enable exact-once semantics |
| Rebalance Storm | Consumer Group Instability | Adjust session.timeout.ms |
| Late Data Drop | Watermark too tight | Increase allowedLateness |

## Complete Execution Scenario
```text
[Event Arrival] -> [Watermark Gen] -> [Window Assign] -> [Process Trigger] -> [State Update] -> [Result Emitted]
```

## Rules and Guidelines
1. Always enable checkpoints for fault tolerance.
2. Avoid giant objects in state; use MapState instead of single ValueState containing a List.
3. Always configure watermarks based on realistic out-of-orderness.
4. Handle schema evolution with Avro carefully.
5. Monitor consumer lag continuously.

## Reference Guides
1. [Flink State Management](references/flink_state.md)
2. [Kafka Partitioning Strategies](references/kafka_partitioning.md)
3. [Exact-Once Semantics](references/exact_once.md)
4. [Watermarking Deep Dive](references/watermarks.md)
5. [Windowing Fundamentals](references/windowing.md)
6. [Tuning RocksDB](references/rocksdb_tuning.md)
7. [Kafka Consumer Internals](references/consumer_internals.md)
8. [Production Deployment](references/deployment.md)

## Handoff
Refer to `data-storage` skill for final sink configurations.

<!-- COMPRESSION FOOTER: v1 -->






















































































































































