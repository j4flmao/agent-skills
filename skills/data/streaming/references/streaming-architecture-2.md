# Streaming Architecture

## Streaming Topology Patterns

### Publish-Subscribe (Fan-Out)

```
Producer → Topic ──→ Consumer Group A (scalable processing)
                  └──→ Consumer Group B (separate processing)
                  └──→ Consumer Group C (archive/audit)
```

### Partitioned Log (Ordered)

```
Producer (key=orderId:123) → Partition 0 ──→ Consumer (processes orders for 123)
Producer (key=orderId:456) → Partition 1 ──→ Consumer (processes orders for 456)
Producer (key=orderId:789) → Partition 2 ──→ Consumer (processes orders for 789)
```

### Stream-Table Join

```
Order Stream (key=orderId) ──→ KTable(orderId → latest order)
                                            ↓
                                   Stream-Table Join
                                            ↓
                           Enriched Order Stream (with customer details)
```

## Topic Design Patterns

```yaml
topics:
  # Event stream — one event per message, append-only
  order.events.v1:
    partitions: 6
    replication: 3
    retention: 7d
    cleanup.policy: delete

  # Compacted topic — latest value per key
  customer.profile.v1:
    partitions: 4
    replication: 3
    retention: -1  # infinite (compacted)
    cleanup.policy: compact

  # Log compaction + delete
  order.status.v1:
    partitions: 6
    replication: 3
    retention: 30d
    cleanup.policy: compact,delete

  # Change data capture
  cdc.inventory.v1:
    partitions: 8
    replication: 3
    retention: 3d
    cleanup.policy: delete
```

## Schema Registry Integration

```json
{
  "schemaRegistry": {
    "url": "http://schema-registry:8081",
    "compatibility": "BACKWARD",
    "serializers": {
      "key": "io.confluent.kafka.serializers.KafkaAvroSerializer",
      "value": "io.confluent.kafka.serializers.KafkaAvroSerializer"
    }
  }
}
```

### Compatibility Modes

| Mode | Evolution Rule | When to Use |
|------|---------------|-------------|
| BACKWARD | New schema can read old data | Default — safest |
| FORWARD | Old schema can read new data | Fast-moving producers |
| FULL | Both directions compatible | Coordinated deployments |
| NONE | Any change allowed | Dev/test only |

## Exactly-Once Topology (Kafka Streams)

```java
Properties props = new Properties();
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-enricher");
props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, "exactly_once_v2");
props.put(StreamsConfig.STATE_DIR_CONFIG, "/var/lib/kafka-streams");

StreamsBuilder builder = new StreamsBuilder();
KStream<String, Order> orders = builder.stream("order.events.v1",
  Consumed.with(Serdes.String(), orderSerde));

KTable<String, Customer> customers = builder.table("customer.profile.v1",
  Consumed.with(Serdes.String(), customerSerde));

// Enrich order stream with customer data
orders.join(customers, (order, customer) -> {
  order.setCustomerTier(customer.getTier());
  order.setShippingAddress(customer.getAddress());
  return order;
}).to("order.enriched.v1", Produced.with(Serdes.String(), enrichedOrderSerde));
```

## Consumer Group Rebalance Strategies

```yaml
rebalance:
  strategy: cooperative_sticky
  # eager (default): stop ALL consumers, reassign ALL partitions
  # cooperative_sticky: rebalance incrementally, fewer interruptions
  session_timeout_ms: 45000
  heartbeat_interval_ms: 15000
  max_poll_interval_ms: 300000

rebalance_listener:
  on_partitions_revoked:
    - commit_offsets
    - close_state_stores
    - flush_in_flight_records
  on_partitions_assigned:
    - rebuild_partition_state
    - seek_to_committed_offsets
```

## Consumer Backpressure

```typescript
class BackpressureConsumer {
  private pausedPartitions = new Set<string>();

  async run(): Promise<void> {
    await consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        const lag = await this.getLag(batch.topic, batch.partition);

        if (lag > 10000) {
          // Backpressure — pause this partition
          consumer.pause([{ topic: batch.topic, partitions: [batch.partition] }]);
          this.pausedPartitions.add(`${batch.topic}:${batch.partition}`);

          // Resume when lag is below threshold
          setTimeout(async () => {
            const currentLag = await this.getLag(batch.topic, batch.partition);
            if (currentLag < 1000) {
              consumer.resume([{ topic: batch.topic, partitions: [batch.partition] }]);
              this.pausedPartitions.delete(`${batch.topic}:${batch.partition}`);
            }
          }, 30000);
        }

        for (const message of batch.messages) {
          await this.process(message);
          resolveOffset(message.offset);
          await heartbeat();
        }
      },
      maxBatchSize: 100,
    });
  }
}
```

## Dead Letter Topology

```
Main Topic → Consumer
                  ↓ success → processed (commit offset)
                  ↓ failure → retry topic (with backoff)
                                  ↓ success → commit + ack
                                  ↓ max retries → DLQ topic
                                                      ↓
                                              DLQ Consumer (alert + manual fix)
```

```yaml
retry:
  topic: order.events.v1.retry
  delays: [1s, 4s, 16s, 64s, 256s]  # exponential backoff
  max_attempts: 5

dead_letter:
  topic: order.events.v1.dlq
  enrichment:
    - original_timestamp
    - error_type
    - error_message
    - stack_trace
    - retry_attempts
  alert_after: 10  # messages in DLQ triggers PagerDuty
```

## Multi-Datacenter Replication

```yaml
# Active-active (MirrorMaker 2)
replication:
  primary: us-east-1
  secondary: eu-west-1
  mode: active-active
  tool: MirrorMaker 2
  topics: [order.*, payment.*, inventory.*]
  replication_factor: 3
  sync_interval: 10s

# Active-passive (Cluster Linking)
cluster_link:
  source: us-east-1
  destination: us-west-2
  mode: active-passive
  bandwidth: 10Gbps
  compression: snappy
```

## Monitoring Topology

```yaml
metrics:
  producer:
    - record_send_rate
    - record_error_rate
    - request_latency_avg
    - batch_size_avg
    - compression_ratio
  consumer:
    - records_lag_max
    - records_lag_avg
    - records_consumed_rate
    - commit_rate
    - rebalance_rate
    - rebalance_latency_avg
  streams:
    - process_rate
    - process_latency_avg
    - state_store_size
    - commit_rate
    - rebalance_rate
  broker:
    - under_replicated_partitions
    - active_controller_count
    - request_queue_size
    - network_processor_avg_idle_percent
```
