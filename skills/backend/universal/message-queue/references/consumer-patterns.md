# Consumer Patterns

## Idempotent Consumer

### Deduplication with Idempotency Keys
```typescript
import { Consumer, KafkaMessage } from 'kafkajs';

class IdempotentConsumer {
  private processedKeys: Set<string> = new Set();
  private redisClient: Redis;

  constructor(private consumer: Consumer, private options: { dedupWindowMs: number }) {
    this.redisClient = new Redis();
  }

  async processMessage(message: KafkaMessage): Promise<void> {
    const idempotencyKey = message.headers['idempotency-key']?.toString();
    if (!idempotencyKey) {
      throw new Error('Message missing idempotency key');
    }

    const dedupKey = `dedup:${idempotencyKey}`;

    // Check if already processed
    const existing = await this.redisClient.get(dedupKey);
    if (existing) {
      console.log(`Skipping duplicate message: ${idempotencyKey}`);
      return;
    }

    // Atomically mark as processing
    const acquired = await this.redisClient.set(
      dedupKey,
      'processing',
      'PX',
      this.options.dedupWindowMs,
      'NX'
    );

    if (!acquired) {
      console.log(`Message already being processed: ${idempotencyKey}`);
      return;
    }

    try {
      await this.handleMessage(message);
      await this.redisClient.set(dedupKey, 'completed', 'PX', this.options.dedupWindowMs);
    } catch (error) {
      await this.redisClient.del(dedupKey);
      throw error;
    }
  }

  private async handleMessage(message: KafkaMessage): Promise<void> {
    // Business logic here
    const event = JSON.parse(message.value.toString());
    await this.processEvent(event);
  }
}
```

## Consumer Error Handling

### Retry with Exponential Backoff
```typescript
class RetryableConsumer {
  private maxRetries: number;
  private baseDelay: number;

  constructor(
    private consumer: Consumer,
    private deadLetterTopic: string,
    options: { maxRetries?: number; baseDelay?: number } = {}
  ) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
  }

  async consume(topic: string): Promise<void> {
    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const retryCount = parseInt(
          message.headers['retry-count']?.toString() || '0'
        );

        try {
          await this.process(message);
          await this.consumer.commitOffsets([
            { topic, partition, offset: message.offset },
          ]);
        } catch (error) {
          if (retryCount < this.maxRetries) {
            await this.retryLater(topic, message, retryCount + 1);
          } else {
            await this.sendToDLQ(message, error);
          }
        }
      },
    });
  }

  private async retryLater(topic: string, message: KafkaMessage, retryCount: number): Promise<void> {
    const delay = this.baseDelay * Math.pow(2, retryCount) + Math.random() * this.baseDelay;
    const retryTopic = `${topic}.retry`;

    await this.consumer.send({
      topic: retryTopic,
      messages: [{
        value: message.value,
        headers: {
          ...message.headers,
          'retry-count': retryCount.toString(),
          'original-timestamp': message.timestamp,
          'retry-delay': delay.toString(),
        },
      }],
    });
  }

  private async sendToDLQ(message: KafkaMessage, error: Error): Promise<void> {
    await this.consumer.send({
      topic: this.deadLetterTopic,
      messages: [{
        value: message.value,
        headers: {
          ...message.headers,
          'error-message': error.message,
          'error-timestamp': new Date().toISOString(),
        },
      }],
    });
  }
}
```

### DLQ Consumer with Alerting
```typescript
class DeadLetterConsumer {
  constructor(
    private consumer: Consumer,
    private alertService: AlertService,
    private maxDLQAge: number = 86400000
  ) {}

  async monitor(): Promise<void> {
    await this.consumer.subscribe({ topic: 'events.dlq', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const errorMessage = message.headers['error-message']?.toString();
        const originalTopic = message.headers['original-topic']?.toString();
        const timestamp = message.headers['error-timestamp']?.toString();

        console.error(`DLQ message from ${originalTopic}: ${errorMessage}`);

        await this.alertService.sendAlert({
          severity: 'critical',
          title: `Message failed after all retries`,
          description: `Topic: ${originalTopic}, Error: ${errorMessage}`,
          metadata: {
            messageId: message.key?.toString(),
            timestamp,
            error: errorMessage,
          },
        });
      },
    });
  }
}
```

## Batch Processing

```typescript
class BatchConsumer {
  private batchSize: number;
  private batchTimeout: number;
  private buffer: KafkaMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private consumer: Consumer,
    private processor: BatchProcessor,
    options: { batchSize?: number; batchTimeoutMs?: number } = {}
  ) {
    this.batchSize = options.batchSize || 100;
    this.batchTimeout = options.batchTimeoutMs || 5000;
  }

  async start(topic: string): Promise<void> {
    await this.consumer.subscribe({ topic });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        this.buffer.push(message);

        if (this.buffer.length >= this.batchSize) {
          await this.flush();
        } else if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => this.flush(), this.batchTimeout);
        }
      },
    });
  }

  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.processor.processBatch(batch);
    } catch (error) {
      console.error('Batch processing failed, sending to DLQ:', error);
      for (const message of batch) {
        await this.sendToDLQ(message, error);
      }
    }
  }
}
```

## Ordering and Partitioning

### Key-Based Partitioning
```typescript
class OrderedConsumer {
  async produce(topic: string, key: string, message: any): Promise<void> {
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(message) }],
    });
    // Messages with the same key go to the same partition
    // Maintaining order within that partition
  }

  async consume(topic: string): Promise<void> {
    await consumer.subscribe({ topic });

    await consumer.run({
      partitionsConsumedConcurrently: 1, // Process one partition at a time
      eachMessage: async ({ message }) => {
        // Within a partition, messages are ordered
        await this.processOrdered(message);
      },
    });
  }
}
```

## Consumer Group Management

```typescript
class ConsumerGroupManager {
  private consumer: Consumer;

  async ensureBalancedConsumers(
    topic: string,
    groupId: string,
    desiredConsumers: number
  ): Promise<void> {
    const admin = this.consumer.admin();
    const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
    const partitionCount = metadata.topics[0].partitions.length;

    // Best practice: at most one consumer per partition
    const optimalConsumers = Math.min(desiredConsumers, partitionCount);

    console.log(`Starting ${optimalConsumers} consumers for ${partitionCount} partitions`);
  }

  async getConsumerLag(topic: string, groupId: string): Promise<number> {
    const admin = this.consumer.admin();
    const lag = await admin.fetchOffsets({ groupId, topics: [topic] });
    return lag.reduce((total, partition) => total + partition.high - partition.low, 0);
  }

  async rebalanceIfNeeded(topic: string, groupId: string): Promise<void> {
    const lag = await this.getConsumerLag(topic, groupId);
    const threshold = 10000; // 10k messages lag threshold

    if (lag > threshold) {
      console.log(`High consumer lag detected: ${lag}. Consider scaling consumers.`);
      await this.scaleConsumers(topic, groupId);
    }
  }
}
```

## Key Points
- Implement idempotent consumers with deduplication using idempotency keys
- Use exponential backoff with jitter for retry strategies
- Route permanently failed messages to DLQ with full error context
- Monitor DLQ with alerts — unattended DLQ means silent data loss
- Use batch processing for high-throughput scenarios with configurable batch size and timeout
- Maintain message ordering with key-based partitioning and single-partition consumption
- Ensure consumer group rebalancing handles partition assignment correctly
- Monitor consumer lag and auto-scale consumer instances when lag exceeds threshold
- Always commit offsets after successful processing (at-least-once semantics)
- Implement graceful shutdown with proper offset commits on consumer exit
