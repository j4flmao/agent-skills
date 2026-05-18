# Message Broker Comparison

## Comparison Table

| Feature | Apache Kafka | RabbitMQ | AWS SQS |
|---------|-------------|----------|---------|
| Model | Distributed log (topic) | Message broker (exchange+queue) | Managed queue |
| Protocol | Custom (Kafka wire protocol) | AMQP 0-9-1, MQTT, STOMP | HTTPS, HTTP |
| Throughput | 100k-1M+ msg/s | 10k-100k msg/s | Unlimited (auto-scaled) |
| Latency | ~10ms (tuned) | ~1ms (low latency) | ~50-100ms |
| Ordering | Per partition | Per queue | Best-effort (FIFO queue available) |
| Persistence | Durable by default | Configurable (durable/transient) | Durable by default |
| Message retention | Configurable (time/size) | Until consumed (or TTL) | Up to 14 days |
| Replay | Yes (seek to offset) | No (consumed = deleted) | No (consumed = deleted) |
| Routing | Topic-based (key) | Exchange types (direct, topic, fanout, headers) | Simple (single queue) |
| Consumer model | Pull (consumer groups) | Push (or basic.get) | Pull (long polling) |
| Exactly-once | Yes (transactional) | No (at-least-once) | Yes (FIFO + dedup) |
| Operations | Heavy (ZooKeeper/KRaft, brokers, disks) | Light (single node or cluster) | Zero (fully managed) |
| Cost | Infrastructure + ops | Infrastructure + ops | Pay per request |
| Best for | Event sourcing, data pipelines, analytics | Task queues, RPC, complex routing | Simple queues, Lambda triggers |

## Kafka

### Strengths
- Massive throughput — designed for data pipelines.
- Message replay — consumers can rewind to any offset.
- Log compaction — retain latest value per key.
- Strong ordering within partitions.
- Ecosystem: Kafka Connect, Kafka Streams, ksqlDB.

### Weaknesses
- Complex operations (brokers, ZooKeeper/KRaft, rebalancing).
- Higher latency than RabbitMQ (~10ms minimum).
- Overkill for simple queue use cases.
- Large number of partitions can cause issues.

### Use When
- Event sourcing / event-driven architecture.
- Data pipelines (ingest → transform → sink).
- Audit logging.
- Metrics / analytics aggregation.
- CDC (Change Data Capture) with Debezium.

## RabbitMQ

### Strengths
- Low latency (~1ms).
- Flexible routing (exchanges + bindings).
- Lightweight operations (single node or small cluster).
- Mature protocol support (AMQP, MQTT, STOMP).
- Per-message acknowledgment (fine-grained control).

### Weaknesses
- Lower throughput than Kafka.
- No message replay (consumed = gone).
- Messages are ephemeral by default (need config for persistence).
- Ordering only within a single queue.

### Use When
- Task queues (background job processing).
- RPC (request-reply pattern).
- Complex routing (multi-tenant notifications).
- Lower-throughput but latency-sensitive messaging.

## AWS SQS

### Strengths
- Zero operations — fully managed.
- Auto-scaling — no capacity planning.
- Pay-per-use pricing.
- Integration with AWS Lambda, SNS, EventBridge.
- Dead-letter queue built-in.

### Weaknesses
- No push (must poll, even with long polling).
- Higher latency (~50-100ms).
- No broadcast / pub-sub (use SNS for that).
- Limited message metadata.
- FIFO queues limited to 300 TPS.

### Use When
- AWS-native stack.
- Simple queue without complex routing.
- Decoupling microservices without ops overhead.
- Lambda-triggered processing.

## Decision Matrix
```
Need replay / event sourcing?        → Kafka
Need complex routing?                 → RabbitMQ
Need zero ops / AWS-native?           → SQS
Need both high throughput + routing?  → Kafka (with careful topic design)
Need low latency + flexible routing?  → RabbitMQ
Need simple queue + Lambda?           → SQS
```
