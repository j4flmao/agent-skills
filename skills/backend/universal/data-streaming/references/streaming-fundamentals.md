# Data Streaming Fundamentals

## What is Event Streaming?

Event streaming captures data as a sequence of immutable events in a durable, append-only log. Unlike message queues (where messages are consumed and deleted), streaming platforms persist events and allow multiple consumers to read from the same log independently.

## Core Concepts

### Topic
A named, ordered log of events. Topics are partitioned for parallelism and replicated for durability.

### Partition
The unit of parallelism in Kafka. Events within a partition are strictly ordered. Partitions are distributed across brokers.

### Offset
A unique, monotonically increasing position identifier for each event within a partition. Consumers track their offset to know which events they've processed.

### Consumer Group
A set of consumers that cooperatively consume a topic. Each partition is assigned to exactly one consumer in the group. The group tracks the committed offset per partition.

## Delivery Semantics

| Semantic | Guarantee | Overhead | Use Case |
|---|---|---|---|
| At-most-once | Message delivered 0 or 1 times | Lowest | Metrics, monitoring |
| At-least-once | Message delivered 1+ times | Low | Most business events |
| Exactly-once | Message delivered exactly 1 time | Highest | Financial transactions |

### At-Least-Once Implementation
```typescript
const consumer = kafka.consumer({ groupId: 'my-group' });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    await processEvent(message);
    // Commit AFTER processing — this is at-least-once
    await consumer.commitOffsets([{ topic, partition, offset: message.offset }]);
  },
});
```

### Idempotent Consumer (for at-least-once)
```typescript
async function processEvent(event: OrderEvent): Promise<void> {
  // Check if already processed
  const processed = await idempotencyStore.exists(event.eventId);
  if (processed) return;
  
  // Process
  await handleOrderEvent(event);
  
  // Mark as processed
  await idempotencyStore.set(event.eventId, true);
}
```

## Topic Configuration

### Cleanup Policies
| Policy | Behavior | Use Case |
|--------|----------|----------|
| `delete` | Remove events after retention period | Most event streams |
| `compact` | Keep the latest event per key | State/log, KTables |
| `compact,delete` | Compact + delete after time | Both retention strategies |

### Compacted Topic Example
```bash
# Topic: user-profile (compacted)
# Key: user-1, Value: { "name": "Alice" }
# Key: user-2, Value: { "name": "Bob" }
# Key: user-1, Value: { "name": "Alice Updated" }  # ← Only this user-1 message is kept
```

## Consumer Group Rebalancing

### Rebalance Process
1. Consumer joins or leaves group → triggers rebalance
2. Group coordinator revokes partitions from existing consumers
3. Consumers commit offsets and stop processing
4. New partition assignment is computed
5. Consumers receive their new assignments and resume processing

### Rebalance Types
| Type | Behavior | Stop-The-World? | 
|------|----------|-----------------|
| Eager | Revoke ALL partitions, reassign all | Yes |
| Cooperative | Revoke subset, reassign incrementally | No |

### Cooperative Sticky Rebalance
```
Prefer `cooperative.sticky` for stateful consumers to avoid full rebuilds.
```

## Partition Assignment Strategy

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| Range | Contiguous ranges per topic | Same topic multiple subscriptions |
| RoundRobin | Round-robin distribution | Even load distribution |
| Sticky | Minimize partition movement | Stateful consumers |
| CooperativeSticky | Incremental reassignment | Stateful consumers with large state |

## Error Handling

### Retry Architecture
```
Consumer → Process Message → Success → Commit
                              ↓
                            Failure → Retry (with backoff)
                              ↓
                            Max retries → Dead Letter Queue
```

### Dead Letter Queue Pattern
```typescript
class ConsumerWithDLQ {
  async process(message: Message): Promise<void> {
    try {
      await this.handler(message);
    } catch (error) {
      await this.retryCount.increment(message.offset);
      if (await this.retryCount.get(message.offset) >= 3) {
        // Send to DLQ
        await this.producer.send({
          topic: `${message.topic}.dlq`,
          messages: [{
            key: message.key,
            value: message.value,
            headers: {
              ...message.headers,
              'error': error.message,
              'original-topic': message.topic,
            },
          }],
        });
        // Commit the offset to avoid blocking
        await this.consumer.commitOffsets([...]);
      } else {
        // Don't commit — retry on restart
        throw error;
      }
    }
  }
}
```

## Backpressure

### Pause/Resume Mechanism
```typescript
class BackpressureConsumer {
  private PAUSE_THRESHOLD = 10000;
  private RESUME_THRESHOLD = 1000;

  async run(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.process(message);
        await this.checkBackpressure(topic, partition);
      },
    });
  }

  private async checkBackpressure(topic: string, partition: number): Promise<void> {
    const lag = await this.getCurrentLag(topic, partition);
    if (lag > this.PAUSE_THRESHOLD) {
      await this.consumer.pause([{ topic, partitions: [partition] }]);
      // Resume when lag drops below threshold
      setTimeout(async () => {
        const newLag = await this.getCurrentLag(topic, partition);
        if (newLag < this.RESUME_THRESHOLD) {
          await this.consumer.resume([{ topic, partitions: [partition] }]);
        } else {
          this.checkBackpressure(topic, partition);
        }
      }, 5000);
    }
  }
}
```

## Operations Checklist

### Production Readiness
- [ ] Replication factor = 3
- [ ] `min.insync.replicas` = 2
- [ ] Idempotent producers enabled
- [ ] Schema registry configured
- [ ] Consumer lag monitoring set up
- [ ] Dead letter queue configured
- [ ] Alert on missed partitions
- [ ] ACLs configured for topics
- [ ] SSL/TLS enabled for all communication
- [ ] Backup and restore tested
