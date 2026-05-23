# Kafka Architecture

## Kafka Topics

### Naming Convention
```
<source>.<event-type>.<version>
```
Examples: `orders.created.v1`, `inventory.updated.v1`, `customers.address_changed.v1`, `payment.processed.v1`. Use lowercase with dots separating logical segments. The version suffix enables breaking schema changes.

### Topic Creation
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

### Topic Configurations
| Config | Default | Production | Reason |
|---|---|---|---|
| `cleanup.policy` | delete | delete or compact | Delete for event logs, compact for state |
| `retention.ms` | 604800000 (7d) | 604800000-2592000000 | Based on replay needs |
| `compression.type` | producer | producer | Compress at producer, reduce storage |
| `min.insync.replicas` | 1 | 2 | Require at least 2 replicas for durability |
| `max.message.bytes` | 1048588 | 10485760 (10MB) | Allow larger messages if needed |
| `file.delete.delay.ms` | 60000 | 60000 | Default cleanup delay |

## Partition Strategy

### Partition Count Calculation
Partition count = N * (desired throughput / single partition throughput). Single partition throughput depends on message size, compression, and hardware: typically 10-50 MB/s per partition. A good starting point is 6-12 partitions per broker for balance. Key considerations: partition count affects consumer parallelism (each partition consumed by max 1 consumer in a group), too many partitions increase ZooKeeper/KRaft overhead and rebalance time, too few partitions limit throughput.

### Key-Based Partitioning
Messages with the same key go to the same partition, ensuring order per key. The default partitioner uses `hash(key) % num_partitions`. Custom partitioners can implement sticky partitioning for higher batching throughput. Key-based partitioning is essential for: customer events (order by customer_id), inventory changes (by product_id), and any scenario where event ordering per entity matters.

### Round-Robin Partitioning
Messages without a key are distributed evenly across partitions. The sticky partitioner batches messages by partition for higher throughput. Default when no key is specified. Best for: log events, metrics, and any scenario where order per key is not required.

## Replication and ISR

### Replication Factor
Replication factor 3 is standard for production environments. RF=3 tolerates up to 2 broker failures (1 for writes with `min.insync.replicas=2`). RF=2 tolerates 1 broker failure. RF=1 for development only. The tradeoff: higher RF provides more durability but uses more storage and network bandwidth.

### ISR (In-Sync Replicas)
The leader maintains a list of in-sync replicas. A follower is in-sync if it has fully caught up within `replica.lag.time.max.ms` (default 30s). `min.insync.replicas` ensures the leader has enough replicas to accept writes. If the ISR drops below the minimum, the leader stops accepting writes (producers get `NotEnoughReplicasException`). `unclean.leader.election.enable=false` prevents out-of-sync replicas from becoming leader (prevents data loss but risks availability).

### Producer Acknowledgment
```java
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true");
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, "5");
```
`acks=all` + `enable.idempotence=true` = exactly-once semantics for the producer.

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
- **BACKWARD** (default): new schema can read old data. New fields must have defaults. Never remove fields.
- **FORWARD**: old schema can read new data. Only add optional fields. Can remove fields.
- **FULL**: both directions compatible. Most restrictive — requires both backward and forward compatibility.
- **NONE**: no compatibility checks (dev only — never for production).

### Producer/Consumer Integration
```java
// Producer
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());
props.put(KafkaAvroSerializerConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://localhost:8081");

KafkaProducer<String, OrderCreated> producer = new KafkaProducer<>(props);

// Consumer
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class.getName());
props.put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, "true");

KafkaConsumer<String, OrderCreated> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("orders.created.v1"));
```

## Avro vs Protobuf

| Feature | Avro | Protobuf |
|---|---|---|
| Schema format | JSON | .proto files |
| Wire format | Binary, no field IDs in data | Binary with field numbers |
| Schema evolution | Rich compatibility modes | Forward/backward support |
| Code generation | Java, Python, C++, C#, Ruby | Multi-language (broader) |
| Kafka integration | Native (Confluent Schema Registry) | Via converters (protobuf-converter) |
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
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000); // 5 min
```

### Rebalance Protocol
- **Eager** (default): stop all consumers, reassign all partitions. Pause during rebalance. Simple but causes full processing halt.
- **Cooperative**: incremental rebalance, minimal pause. Recommended for large consumer groups. Consumers only release a subset of partitions.
- **Static group membership**: `group.instance.id` for stable assignment. Partitions are held until the consumer reconnects or the session timeout expires.

### Monitoring Commands
```bash
# Describe consumer group
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group orders-processor-v2

# Output shows each partition, current offset, log end offset, and lag
# GROUP               TOPIC             PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders-processor-v2 orders.created.v1 0          1428            1532            104

# Reset offset to earliest
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group orders-processor-v2 \
  --topic orders.created.v1 \
  --reset-offsets --to-earliest --execute
```

### Lag Monitoring
Consumer lag is the single most important streaming metric. Lag = LOG-END-OFFSET - CURRENT-OFFSET. High lag means the consumer is falling behind. Monitor lag every 60 seconds. Alert on lag > 1000 messages or lag growing steadily. Investigate lag causes: insufficient consumer parallelism, slow processing logic, or broker performance issues.

## Kafka Monitoring

### Key Metrics
| Metric | Source | Alert Threshold |
|---|---|---|
| Consumer lag | `kafka-consumer-groups` | > 1000 or growing |
| Under-replicated partitions | JMX (kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions) | > 0 |
| Request rate | JMX (kafka.network:type=RequestMetrics,name=RequestsPerSec) | > baseline + 50% |
| ISR shrink rate | JMX (kafka.server:type=ReplicaManager,name=IsrShrinksPerSec) | > 0 sustained |
| Producer error rate | Application metrics | > 1% |
| Rebalance count | Consumer group metrics | > 10/hour |
| Disk usage | Broker metrics | > 80% |

### Tools
- **Kafka UI** (provectus): web UI for topic browsing, consumer groups, and message viewing
- **Burrow**: LinkedIn's consumer lag monitoring tool with HTTP API
- **Cruise Control**: automated cluster rebalancing and broker management
- **Prometheus + Grafana**: custom dashboards for all Kafka metrics via JMX exporter
