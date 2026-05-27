# Streaming Testing

## Overview
Test streaming pipelines end-to-end: producer tests, consumer tests, schema compatibility, integration tests, and performance benchmarks.

## Producer Testing

```typescript
import { Kafka, Producer } from 'kafkajs';

describe('OrderProducer', () => {
  let producer: Producer;
  let kafka: Kafka;

  beforeEach(async () => {
    kafka = new Kafka({
      clientId: 'test',
      brokers: ['localhost:9092'],
    });
    producer = kafka.producer({ idempotent: true });
    await producer.connect();
  });

  afterEach(async () => {
    await producer.disconnect();
  });

  it('produces message with correct schema', async () => {
    const order = { id: '123', userId: 'u1', amount: 99.99 };

    const result = await producer.send({
      topic: 'order.created.v1',
      messages: [{
        key: order.id,
        value: JSON.stringify(order),
        headers: { 'event-type': 'order.created' },
      }],
    });

    expect(result).toBeDefined();
    expect(result[0].errorCode).toBe(0);
  });

  it('fails invalid message', async () => {
    const bad = { id: null, amount: -1 };

    await expect(producer.send({
      topic: 'order.created.v1',
      messages: [{ key: '1', value: JSON.stringify(bad) }],
    })).rejects.toThrow();
  });
});
```

## Consumer Testing with Isolation

```typescript
import { EachMessagePayload } from 'kafkajs';

class TestConsumer {
  private processed: string[] = [];
  private errors: string[] = [];

  async handleMessage({ topic, partition, message }: EachMessagePayload) {
    try {
      const event = JSON.parse(message.value!.toString());
      this.processed.push(event.type);
    } catch (err) {
      this.errors.push((err as Error).message);
    }
  }

  getProcessed() { return this.processed; }
  getErrors() { return this.errors; }
  reset() { this.processed = []; this.errors = []; }
}

describe('Consumer Handler', () => {
  it('processes valid events', async () => {
    const consumer = new TestConsumer();
    const payload = {
      topic: 'order.created.v1',
      partition: 0,
      message: {
        key: Buffer.from('123'),
        value: Buffer.from(JSON.stringify({ type: 'order.created' })),
        offset: '0',
        headers: {},
        timestamp: Date.now().toString(),
      } as any,
      heartbeat: async () => {},
      pause: () => () => {},
    };

    await consumer.handleMessage(payload);
    expect(consumer.getProcessed()).toEqual(['order.created']);
    expect(consumer.getErrors()).toHaveLength(0);
  });
});
```

## Schema Compatibility Tests

```typescript
describe('Schema Registry Compatibility', () => {
  const BASE_SCHEMA = {
    type: 'record',
    name: 'OrderCreated',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'amount', type: 'double' },
    ],
  };

  const BACKWARD_COMPATIBLE = {
    ...BASE_SCHEMA,
    fields: [
      ...BASE_SCHEMA.fields,
      { name: 'currency', type: ['null', 'string'], default: null },
    ],
  };

  const INCOMPATIBLE = {
    ...BASE_SCHEMA,
    fields: [
      { name: 'id', type: 'int' },  // Changed from string to int
    ],
  };

  it('accepts backward-compatible evolution', () => {
    // Backward compatible: new reader can read old data
    const valid = isBackwardCompatible(BASE_SCHEMA, BACKWARD_COMPATIBLE);
    expect(valid).toBe(true);
  });

  it('rejects incompatible schema change', () => {
    // Incompatible: type change from string to int
    const valid = isBackwardCompatible(BASE_SCHEMA, INCOMPATIBLE);
    expect(valid).toBe(false);
  });
});
```

## End-to-End Integration Tests

```typescript
import { KafkaContainer } from 'testcontainers';

describe('Streaming Pipeline E2E', () => {
  let kafkaContainer: StartedTestContainer;

  beforeAll(async () => {
    kafkaContainer = await new KafkaContainer()
      .withExposedPorts(9093)
      .start();
  }, 120000);

  afterAll(async () => {
    await kafkaContainer?.stop();
  });

  it('processes order from production to enrichment', async () => {
    const kafka = new Kafka({
      clientId: 'e2e',
      brokers: [`localhost:${kafkaContainer.getMappedPort(9093)}`],
    });

    // Create topics
    const admin = kafka.admin();
    await admin.createTopics({
      topics: [
        { topic: 'order.created.v1', numPartitions: 1 },
        { topic: 'order.enriched.v1', numPartitions: 1 },
      ],
    });

    // Produce
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
      topic: 'order.created.v1',
      messages: [{ key: '1', value: JSON.stringify({ id: '1', amount: 50 }) }],
    });

    // Consume enriched output
    const consumer = kafka.consumer({ groupId: 'e2e-test' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'order.enriched.v1', fromBeginning: true });

    const messages: string[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        messages.push(message.value!.toString());
        if (messages.length >= 1) await consumer.disconnect();
      },
    });

    await consumer.disconnect();
    expect(messages).toHaveLength(1);
    expect(JSON.parse(messages[0])).toMatchObject({
      id: '1',
      enriched: true,
    });
  }, 60000);
});
```

## Throughput Benchmark

```typescript
describe('Producer Throughput', () => {
  it('produces 10000 messages in < 5 seconds', async () => {
    const kafka = new Kafka({ clientId: 'bench', brokers: ['localhost:9092'] });
    const producer = kafka.producer({ idempotent: false });
    await producer.connect();

    const messages = Array.from({ length: 10000 }, (_, i) => ({
      key: String(i),
      value: JSON.stringify({ id: i, data: 'x'.repeat(500) }),
    }));

    const start = Date.now();
    await producer.send({ topic: 'benchmark.v1', messages });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
    await producer.disconnect();
  });
});
```

## Key Points
- Test producers with valid and invalid message payloads
- Use isolated consumer handlers for unit testing
- Verify schema registry compatibility (backward/forward)
- Run end-to-end tests with Testcontainers for Kafka
- Benchmark producer and consumer throughput
- Test rebalance behavior, offset commit, and error handling
