# Kafka Client API Reference: Producer, Consumer, Admin, Streams

Practical reference for the Apache Kafka client APIs used in streaming pipelines: the key configuration properties, their defaults and safe values, and code for Java and Python (confluent-kafka). Applies to Kafka 3.x/4.x brokers.

## Producer

### Key Properties

| Property | Default (recent clients) | Guidance |
|----------|------------------------|----------|
| `bootstrap.servers` | — | 2–3 brokers per cluster for discovery |
| `acks` | `all` (since Kafka 3.0) | Keep `all` for durability |
| `enable.idempotence` | `true` (since 3.0) | Prevents duplicates from producer retries within a session |
| `retries` | effectively unbounded | Bounded instead by `delivery.timeout.ms` |
| `delivery.timeout.ms` | 120000 | Upper bound on time to report success/failure |
| `linger.ms` | 5 in Kafka 4.0 clients (0 before) | Higher values (5–50) improve batching |
| `batch.size` | 16384 bytes | Raise (64–256 KB) for throughput |
| `compression.type` | `none` | `zstd` or `lz4` for most workloads |
| `max.in.flight.requests.per.connection` | 5 | ≤5 keeps ordering with idempotence |
| `transactional.id` | unset | Set for exactly-once read-process-write |

### Java

```java
Properties p = new Properties();
p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka-1:9092,kafka-2:9092");
p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
p.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "zstd");
p.put(ProducerConfig.LINGER_MS_CONFIG, 20);

try (KafkaProducer<String, String> producer = new KafkaProducer<>(p)) {
    producer.send(new ProducerRecord<>("orders", orderId, json), (meta, ex) -> {
        if (ex != null) log.error("Failed to produce order {} to orders", orderId, ex);
    });
}
```

`send` is asynchronous; always handle the callback or `Future`. `close()` flushes outstanding records.

### Python (confluent-kafka)

```python
from confluent_kafka import Producer

producer = Producer({"bootstrap.servers": "kafka-1:9092", "compression.type": "zstd", "linger.ms": 20})

def on_delivery(err, msg):
    if err is not None:
        log.error("Delivery failed for key=%s topic=%s: %s", msg.key(), msg.topic(), err)

producer.produce("orders", key=order_id, value=payload, on_delivery=on_delivery)
producer.poll(0)          # serve delivery callbacks
producer.flush(10)        # on shutdown
```

## Consumer

### Key Properties

| Property | Default | Guidance |
|----------|---------|----------|
| `group.id` | — | One per logical application |
| `enable.auto.commit` | `true` | Set `false` and commit after processing for at-least-once |
| `auto.offset.reset` | `latest` | `earliest` for new pipelines that must read history |
| `max.poll.records` | 500 | Lower if processing per record is slow |
| `max.poll.interval.ms` | 300000 | Exceeding it triggers a rebalance |
| `session.timeout.ms` | 45000 | Heartbeat-based liveness |
| `isolation.level` | `read_uncommitted` | `read_committed` when consuming transactional output |
| `group.protocol` | `classic` | `consumer` enables the KIP-848 rebalance protocol (GA in Kafka 4.0) |
| `partition.assignment.strategy` | range + cooperative-sticky | Cooperative rebalancing avoids stop-the-world (classic protocol) |

### Java (at-least-once loop)

```java
consumer.subscribe(List.of("orders"));
while (running) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
    for (ConsumerRecord<String, String> r : records) {
        process(r);                       // must be idempotent
    }
    consumer.commitSync();                // commit after processing the batch
}
consumer.close();
```

Use `consumer.wakeup()` from a shutdown hook to break out of `poll` cleanly.

### Python

```python
from confluent_kafka import Consumer, KafkaException

c = Consumer({"bootstrap.servers": "kafka-1:9092", "group.id": "billing",
              "enable.auto.commit": False, "auto.offset.reset": "earliest"})
c.subscribe(["orders"])
try:
    while running:
        msg = c.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            raise KafkaException(msg.error())
        handle(msg)
        c.commit(message=msg, asynchronous=False)
finally:
    c.close()
```

## Transactions (Exactly-Once Read-Process-Write)

```java
producer.initTransactions();
while (running) {
    ConsumerRecords<String, String> recs = consumer.poll(Duration.ofMillis(500));
    producer.beginTransaction();
    for (ConsumerRecord<String, String> r : recs) {
        producer.send(new ProducerRecord<>("orders-enriched", r.key(), enrich(r.value())));
    }
    producer.sendOffsetsToTransaction(currentOffsets(recs), consumer.groupMetadata());
    producer.commitTransaction();
}
```

Exactly-once covers Kafka-to-Kafka only. Side effects to external systems still need idempotent writes or an outbox.

## Admin Client

```java
try (Admin admin = Admin.create(Map.of("bootstrap.servers", "kafka-1:9092"))) {
    admin.createTopics(List.of(new NewTopic("orders", 12, (short) 3)
        .configs(Map.of("min.insync.replicas", "2", "retention.ms", "604800000")))).all().get();
    Map<TopicPartition, OffsetAndMetadata> offsets =
        admin.listConsumerGroupOffsets("billing").partitionsToOffsetAndMetadata().get();
}
```

CLI equivalents: `kafka-topics.sh`, `kafka-consumer-groups.sh --describe --group billing`, `kafka-configs.sh`.

## Kafka Streams

```java
StreamsBuilder b = new StreamsBuilder();
KStream<String, Order> orders = b.stream("orders", Consumed.with(Serdes.String(), orderSerde));
orders.filter((k, o) -> o.totalCents() > 0)
      .groupBy((k, o) -> o.customerId(), Grouped.with(Serdes.String(), orderSerde))
      .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
      .count(Materialized.as("orders-per-customer-5m"))
      .toStream()
      .to("orders-per-customer", Produced.with(WindowedSerdes.timeWindowedSerdeFrom(String.class, 300_000L), Serdes.Long()));

Properties props = new Properties();
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-stats");
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
new KafkaStreams(b.build(), props).start();
```

`application.id` is the consumer group and the prefix for internal changelog/repartition topics.

## Error Handling Contracts

| Error | Handling |
|-------|----------|
| Retriable (`NotEnoughReplicas`, timeouts) | Client retries within `delivery.timeout.ms` |
| Serialization error on consume | Send raw bytes to a dead-letter topic with headers describing the error |
| `RecordTooLargeException` | Increase `max.request.size` and topic `max.message.bytes`, or store payload externally |
| `CommitFailedException` | Processing exceeded `max.poll.interval.ms`; reduce batch size or speed up processing |
| `ProducerFencedException` | Another instance with the same `transactional.id`; close the producer |

## Checklist

- [ ] `acks=all`, idempotence on, compression set
- [ ] Delivery callbacks handled and logged with context
- [ ] Manual commits after processing; idempotent consumers
- [ ] Dead-letter topic for poison messages
- [ ] Clean shutdown (`wakeup`/`close`, `flush`)
- [ ] Transactions only where Kafka-to-Kafka EOS is required
