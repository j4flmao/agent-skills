# Stream Architecture

## Kafka Topics

### Naming Convention
```
<source>.<event-type>.<version>
```
Examples: `orders.created.v1`, `inventory.updated.v1`, `customers.address_changed.v1`, `payment.processed.v1`.

### Topic Configurations
```bash
# Create topic with optimal config
kafka-topics --create \
  --topic orders.created.v1 \
  --partitions 6 \
  --replication-factor 3 \
  --config cleanup.policy=delete \
  --config retention.ms=604800000 \
  --config compression.type=producer \
  --config min.insync.replicas=2
```

### Partition Strategy
- Count: N * (throughput / single partition throughput). 6-12 per broker.
- Key-based: hash(key) → partition for ordered processing per key (customer_id, order_id).
- Round-robin: no key, even distribution.
- Stick partitioner: batch by producer for higher throughput.

### Retention and Compaction
- Delete retention: `retention.ms=604800000` (7 days). Default for most event topics.
- Compacted: `cleanup.policy=compact`, keep latest value per key. For state tables (customer profile, inventory).
- Compact + Delete: `cleanup.policy=compact,delete`, compact + time-based retention.

### Replication
- Replication factor: 3 for production (tolerates 2 broker failures).
- Min ISR: `min.insync.replicas=2`. Producer sets `acks=all`.
- Preferred leader: auto-leader rebalancing enabled.
- Unclean leader: `unclean.leader.election.enable=false` (prevent data loss).

## Schema Registry

### Avro Schema
```json
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.events",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record",
      "name": "LineItem",
      "fields": [
        {"name": "product_id", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "unit_price", "type": "double"}
      ]
    }}},
    {"name": "total_amount", "type": "double"},
    {"name": "created_at", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
```

### Compatibility Rules
- BACKWARD (default): new schema can read old data. New fields must have defaults. Never remove fields.
- FORWARD: old schema can read new data. Only add optional fields. Can remove fields.
- FULL: both directions compatible. Most restrictive.
- NONE: no compatibility checks (dev only).

### Producer/Consumer Integration
```java
// Producer
KafkaProducer<String, OrderCreated> producer = new KafkaProducer<>(props, 
    StringSerializer.NAME, KafkaAvroSerializer.NAME);

// Consumer
KafkaConsumer<String, OrderCreated> consumer = new KafkaConsumer<>(props,
    StringDeserializer, KafkaAvroDeserializer);
consumer.subscribe(Arrays.asList("orders.created.v1"));
```

## Avro vs Protobuf

| Feature | Avro | Protobuf |
|---------|------|----------|
| Schema format | JSON | .proto files |
| Wire format | Binary, no IDs | Binary with field numbers |
| Schema evolution | Rich compatibility modes | Forward/backward support |
| Code generation | Java, Python, C++ | Multi-language (broader) |
| Kafka integration | Native (Confluent Schema Registry) | Via converters |
| Performance | Smaller wire size | Slightly faster serialization |
| Best for | Kafka-native, schema registry | gRPC integration, cross-language |

## Consumer Groups

### Group Configuration
```java
props.put(ConsumerConfig.GROUP_ID_CONFIG, "orders-processor-v2");
props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);
```

### Rebalance Protocol
- Eager (default): stop all consumers, reassign all partitions. Pause during rebalance.
- Cooperative: incremental rebalance, minimal pause. Recommended for large consumer groups.
- Static group membership: `group.instance.id` for stable assignment.

### Monitoring
- Consumer lag: `kafka-consumer-groups --describe --group <group>`
- Lag threshold: alert on lag > 1000 messages or lag growing steadily
- Rebalance count: alert on > 10 rebalances per hour (indicates stability issue)
