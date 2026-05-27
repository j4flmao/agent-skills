# Producer Patterns

## Message Envelope Design

### Standard Envelope
```typescript
interface MessageEnvelope<T = unknown> {
  id: string;
  type: string;
  version: number;
  timestamp: string;
  producer: string;
  key: string;
  data: T;
  metadata?: Record<string, string>;
}

function createEnvelope<T>(type: string, data: T, key: string): MessageEnvelope<T> {
  return {
    id: crypto.randomUUID(),
    type,
    version: 1,
    timestamp: new Date().toISOString(),
    producer: process.env.SERVICE_NAME || 'unknown',
    key,
    data,
    metadata: {
      correlationId: crypto.randomUUID(),
    },
  };
}
```

## Kafka Producer

### Basic Producer
```typescript
import { Kafka, Producer, Message } from 'kafkajs';

class KafkaEventProducer {
  private producer: Producer;

  constructor(private kafka: Kafka) {
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(topic: string, event: MessageEnvelope): Promise<void> {
    const message: Message = {
      key: event.key,
      value: JSON.stringify(event),
      headers: {
        'event-type': event.type,
        'event-version': event.version.toString(),
        'idempotency-key': event.id,
        'content-type': 'application/json',
      },
      timestamp: event.timestamp,
    };

    try {
      await this.producer.send({
        topic,
        messages: [message],
        acks: -1,
      });
    } catch (error) {
      console.error(`Failed to publish event ${event.id}:`, error);
      throw error;
    }
  }

  async publishBatch(topic: string, events: MessageEnvelope[]): Promise<void> {
    const messages: Message[] = events.map((event) => ({
      key: event.key,
      value: JSON.stringify(event),
      headers: {
        'event-type': event.type,
        'event-version': event.version.toString(),
        'idempotency-key': event.id,
      },
      timestamp: event.timestamp,
    }));

    try {
      await this.producer.send({
        topic,
        messages,
        acks: -1,
      });
    } catch (error) {
      console.error(`Failed to publish batch of ${events.length} events:`, error);
      throw error;
    }
  }
}
```

### Transactional Producer
```typescript
class TransactionalKafkaProducer {
  private producer: Producer;

  constructor(private kafka: Kafka) {
    this.producer = this.kafka.producer({
      transactionalId: `producer-${process.env.SERVICE_NAME}`,
      maxInFlightRequests: 1,
      idempotent: true,
    });
  }

  async sendInTransaction(
    topic: string,
    event: MessageEnvelope,
    dbOperation: () => Promise<void>
  ): Promise<void> {
    const transaction = await this.producer.transaction();

    try {
      await dbOperation();

      await transaction.send({
        topic,
        messages: [{
          key: event.key,
          value: JSON.stringify(event),
          headers: { 'event-type': event.type },
        }],
      });

      await transaction.commit();
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }
}
```

## RabbitMQ Producer

### Exchange-Based Publishing
```typescript
import amqp from 'amqplib';

class RabbitMQProducer {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async connect(url: string): Promise<void> {
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    this.channel.confirmSelect();
  }

  async publishToExchange(
    exchange: string,
    routingKey: string,
    event: MessageEnvelope,
    options?: amqp.Options.Publish
  ): Promise<void> {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    return new Promise((resolve, reject) => {
      const published = this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          contentType: 'application/json',
          headers: {
            'event-type': event.type,
            'event-version': event.version.toString(),
          },
          ...options,
        },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );

      if (!published) {
        reject(new Error('Channel write buffer full'));
      }
    });
  }

  async publishToQueue(queue: string, event: MessageEnvelope): Promise<void> {
    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: `${queue}.dlx`,
    });

    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(event)), {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async close(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}
```

## SQS Producer

### AWS SQS Producer
```typescript
import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

class SQSProducer {
  private client: SQSClient;

  constructor(private queueUrl: string, region: string) {
    this.client = new SQSClient({ region });
  }

  async send(event: MessageEnvelope): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(event),
      MessageDeduplicationId: event.id,
      MessageGroupId: event.key,
      MessageAttributes: {
        'event-type': {
          DataType: 'String',
          StringValue: event.type,
        },
        'event-version': {
          DataType: 'String',
          StringValue: event.version.toString(),
        },
      },
    });

    const response = await this.client.send(command);
    return response.MessageId;
  }

  async sendBatch(events: MessageEnvelope[]): Promise<void> {
    const entries = events.map((event, index) => ({
      Id: index.toString(),
      MessageBody: JSON.stringify(event),
      MessageDeduplicationId: event.id,
      MessageGroupId: event.key,
    }));

    const command = new SendMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries: entries,
    });

    const response = await this.client.send(command);

    if (response.Failed?.length > 0) {
      console.error('Failed SQS messages:', response.Failed);
    }
  }
}
```

## Reliable Publishing Patterns

### Outbox Pattern
```typescript
// Store event in DB first, then publish
class OutboxProducer {
  async createOrder(order: Order): Promise<void> {
    const event = createEnvelope('OrderCreated', order, order.id);

    // Transactional outbox: save event to DB in same transaction
    await db.transaction(async (tx) => {
      await tx.order.create(order);
      await tx.outbox.create({
        id: event.id,
        topic: 'orders',
        payload: event,
        status: 'pending',
      });
    });

    // Separate process picks up pending outbox events and publishes them
  }
}

// Outbox publisher
class OutboxPublisher {
  async publishPendingEvents(): Promise<void> {
    const pendingEvents = await db.outbox.findMany({
      where: { status: 'pending' },
      take: 100,
    });

    for (const event of pendingEvents) {
      try {
        await this.producer.publish(event.topic, event.payload);
        await db.outbox.update({
          where: { id: event.id },
          data: { status: 'published', publishedAt: new Date() },
        });
      } catch (error) {
        await db.outbox.update({
          where: { id: event.id },
          data: { status: 'failed', error: error.message },
        });
      }
    }
  }
}
```

### Idempotent Producer
```typescript
class IdempotentProducer {
  private publishedEvents: Set<string> = new Set();

  async publishOnce(event: MessageEnvelope): Promise<void> {
    if (this.publishedEvents.has(event.id)) {
      console.log(`Event ${event.id} already published, skipping`);
      return;
    }

    try {
      await this.producer.publish(event.topic, event);
      this.publishedEvents.add(event.id);

      // Clean up old entries periodically
      if (this.publishedEvents.size > 10000) {
        this.publishedEvents.clear();
      }
    } catch (error) {
      throw error;
    }
  }
}
```

## Schema Evolution

### Schema Registry Integration
```typescript
class SchemaAwareProducer {
  private schemaRegistry: SchemaRegistry;

  async publish(topic: string, event: MessageEnvelope): Promise<void> {
    const schema = await this.schemaRegistry.getSchema(topic, event.type);
    const compatibilityResult = schema.checkCompatibility(event);

    if (!compatibilityResult.compatible) {
      throw new Error(
        `Event ${event.type} v${event.version} incompatible: ${compatibilityResult.errors}`
      );
    }

    event.metadata = {
      ...event.metadata,
      schemaId: schema.id,
      schemaVersion: schema.version.toString(),
    };

    await this.producer.publish(topic, event);
  }
}
```

## Key Points
- Use a standardized message envelope with id, type, version, timestamp, and producer fields
- Configure producers with idempotent settings and appropriate acknowledgement levels
- Use transactional producers for atomic DB + message operations
- Implement the outbox pattern for reliable publishing with DB transaction guarantees
- Use message deduplication (idempotency keys) to prevent duplicate publishes
- Set message headers for routing, filtering, and metadata
- Use batch publishing for high-throughput scenarios
- Implement schema evolution with compatibility checking (backward/forward)
- Monitor producer error rates and publish latency
- Handle broker disconnection with retry and reconnection logic
