# Enterprise Integration Patterns (EIP) Reference

> Practical patterns for message-based integration using Kafka, RabbitMQ, and HTTP.
> Examples in TypeScript.

---

## Messaging Channels

### 1. Message Channel

**Intent:** Decouple sender and receiver via a logical conduit.

**Problem:** Two components need to communicate without holding direct references.

**Solution:** A named channel sits between producer and consumer. Both only know the channel name.

```
[Producer] → (Channel) → [Consumer]
```

**Code:**
```typescript
// Kafka topic as channel
const producer = new KafkaProducer({ brokers: ["localhost:9092"] });
await producer.send({ topic: "orders", messages: [{ value: JSON.stringify(order) }] });
const consumer = new KafkaConsumer({ groupId: "order-svc" });
await consumer.subscribe({ topic: "orders" });
await consumer.run({ eachMessage: async ({ message }) => process(message) });
```

```csharp
// RabbitMQ queue as channel
var channel = connection.CreateModel();
channel.QueueDeclare("orders", durable: true, exclusive: false, autoDelete: false);
channel.BasicPublish("", "orders", null, body);
```

**Trade-offs:** Adds broker latency; choose at-least-once vs exactly-once semantics.

---

### 2. Point-to-Point Channel

**Intent:** Deliver each message to exactly one receiver.

**Problem:** A task (e.g., "process payment") must be handled once, not by every consumer.

**Solution:** Competing consumers share a queue; broker delivers each message to one.

```
[Producer] → (Queue) ──→ [Consumer A] (gets message)
                       └──→ [Consumer B] (does not)
```

**Code:**
```typescript
// Kafka consumer group — each partition assigned to one consumer
const consumer = new KafkaConsumer({ groupId: "payment-group" });
await consumer.subscribe({ topic: "payments" });
```

```csharp
// RabbitMQ competing consumers
channel.BasicQos(prefetchSize: 0, prefetchCount: 1, global: false);
```

**Trade-offs:** Ordering depends on partition/queue design; idle consumers delay processing if prefetch is low.

---

### 3. Publish-Subscribe Channel

**Intent:** Broadcast each message to all subscribed receivers.

**Problem:** Multiple subsystems (email, inventory, analytics) must react to the same event.

**Solution:** Fanout exchange (RabbitMQ) or consumer groups (Kafka) deliver to all subscribers.

```
[Producer] → (Topic) ──→ [Consumer A]
                      ├──→ [Consumer B]
                      └──→ [Consumer C]
```

**Code:**
```typescript
// Kafka — each consumer group gets all messages
const emailSvc = new KafkaConsumer({ groupId: "email-svc" });
const invSvc = new KafkaConsumer({ groupId: "inventory-svc" });
await Promise.all([emailSvc.subscribe({ topic: "orders" }), invSvc.subscribe({ topic: "orders" })]);
```

**Trade-offs:** Slow consumer causes backlog; no replay on RabbitMQ; fanout scales linearly.

---

### 4. Dead Letter Channel

**Intent:** Store unprocessable messages for later inspection.

**Problem:** Malformed messages or transient errors should not block the queue or cause infinite retries.

**Solution:** After retry exhaustion, move the message to a dedicated dead-letter queue/topic.

```
[Consumer] → (retry-exceeded) → (Dead Letter Queue) → [Manual Inspection]
```

**Code:**
```typescript
// Kafka — send to DLQ after failed retries
try {
  await process(message);
} catch {
  await producer.send({ topic: "orders-dlq", messages: [message] });
}
```

**Trade-offs:** Extra storage; DLQ monitoring needed; TTL/retry policy is service-specific.

---

### 5. Guaranteed Delivery

**Intent:** Ensure no message is lost despite broker or consumer failures.

**Problem:** Crashes and network failures must not cause data loss.

**Solution:** Persist messages to disk and use acknowledgements.

```
[Producer] ──(persist + ack)──→ [Broker] ──(deliver + commit)──→ [Consumer]
```

**Code:**
```typescript
// Kafka — acks=all, manual commit after processing
await producer.send({ topic: "orders", messages: [{ value: payload }], acks: -1 });
await consumer.run({
  eachMessage: async ({ message }) => {
    await process(message);
    await consumer.commitOffsets({ topic, partition, offset: message.offset });
  },
});
```

**Trade-offs:** Higher latency (disk I/O, replication); throughput vs durability tradeoff.

---

## Message Construction

### 6. Command Message

**Intent:** Invoke a remote action via message (RPC-style).

**Problem:** A service needs to request a specific action (e.g., "refund $50") from another service.

**Solution:** Send a message with an operation name and parameters, like a function call.

```
[Producer] → (Command: { action: "refund", amount: 50 }) → [Consumer]
```

**Code:**
```typescript
// Producer
await producer.send({
  topic: "payment-commands",
  messages: [{ value: JSON.stringify({ type: "Refund", data: { userId: "usr_123", amount: 50 } }) }],
});
// Consumer — route by type
await consumer.run({
  eachMessage: async ({ message }) => {
    const cmd = JSON.parse(message.value.toString());
    if (cmd.type === "Refund") return refundHandler(cmd.data);
  },
});
```

**Trade-offs:** Idempotency is critical (duplicate delivery); no built-in response.

---

### 7. Event Message

**Intent:** Notify that something happened without prescribing what to do.

**Problem:** Services should react to facts ("OrderShipped") without the publisher knowing who reacts.

**Solution:** Publish a past-tense, immutable event to a pub-sub channel.

```
[Order Service] → (OrderShipped) → [Email, Tracking, Analytics]
```

**Code:**
```typescript
// Publisher
await producer.send({
  topic: "domain-events",
  messages: [{ key: "OrderShipped", value: JSON.stringify({ orderId: "ord_456" }) }],
});
// Subscriber
await consumer.run({
  eachMessage: async ({ message }) => {
    if (message.key?.toString() === "OrderShipped") await sendTrackingEmail(JSON.parse(message.value.toString()));
  },
});
```

**Trade-offs:** Eventual consistency; schema versioning needed; event chains are hard to debug.

---

### 8. Document Message

**Intent:** Transfer structured data between services.

**Problem:** A service needs to send data (e.g., customer profile) without requesting an action.

**Solution:** Send the document as the message payload; receiver interprets as needed.

```
[CRM] → (CustomerDocument) → [Billing]
```

**Code:**
```typescript
await producer.send({
  topic: "customer-sync",
  messages: [{ value: JSON.stringify({ id: "c_1", name: "Alice", email: "alice@example.com" }) }],
});
```

**Trade-offs:** Large payloads pressure the broker; schema drift between services.

---

### 9. Request-Reply

**Intent:** Pair a request message with a corresponding response.

**Problem:** A sender needs a result but must communicate asynchronously.

**Solution:** Include `ReplyTo` address and `CorrelationId` in the request. Respond to the reply channel with the same correlation ID.

```
[Client] → (Request + ReplyTo + CorrelationId) → [Server]
            ↑                                      │
            └──── (Response + CorrelationId) ──────┘
```

**Code:**
```typescript
const correlationId = uuid();
await producer.send({
  topic: "payment-requests",
  messages: [{
    value: payload,
    headers: { "reply-to": "payment-responses", "correlation-id": correlationId },
  }],
});
await replyConsumer.run({
  eachMessage: async ({ message }) => {
    if (message.headers?.["correlation-id"]?.toString() === correlationId) resolve(message.value);
  },
});
```

**Trade-offs:** Timeout handling required; correlation ID management; harder to debug than HTTP.

---

## Message Routing

### 10. Message Router

**Intent:** Route a message to one of several destinations based on a condition.

**Problem:** Destination is not fixed and depends on content or context.

**Solution:** A router inspects the message and forwards to the appropriate channel.

```
[Input] → [Router] → (Channel A) / (Channel B) / (Channel C)
```

**Code:**
```typescript
async function route(message: Message): Promise<string> {
  const order = JSON.parse(message.value.toString());
  if (order.amount > 1000) return "high-value-orders";
  if (order.isInternational) return "international-orders";
  return "standard-orders";
}
```

**Trade-offs:** Single point of failure; routing logic maintenance; dynamic rule changes are tricky.

---

### 11. Content-Based Router

**Intent:** Route by evaluating specific fields in message content.

**Problem:** Messages of the same type need different processing based on data values.

**Solution:** Inspect fields and publish to different channels (RabbitMQ direct exchange routing key; Kafka partition key).

**Code:**
```typescript
// Kafka — route by partition key
const regionPartition: Record<string, number> = { EU: 0, US: 1, APAC: 2 };
await producer.send({
  topic: "fulfillment",
  messages: [{ value: payload, partition: regionPartition[order.region] ?? 3 }],
});
```

**Trade-offs:** Schema coupling; auditing routing decisions is difficult.

---

### 12. Message Filter

**Intent:** Discard messages that do not meet criteria.

**Problem:** Consumer receives unwanted messages that waste resources.

**Solution:** Place a filter that checks a predicate and drops non-matching messages.

```
[Input] → [Filter: status == "confirmed"] → [Processor]
                       ↓ (dropped)
```

**Code:**
```typescript
await consumer.run({
  eachMessage: async ({ message }) => {
    const order = JSON.parse(message.value.toString());
    if (order.status !== "confirmed") return;
    await fulfillOrder(order);
  },
});
```

**Trade-offs:** Filtered messages are lost — use DLQ if retention is needed.

---

### 13. Recipient List

**Intent:** Dynamically determine destinations per message.

**Problem:** The set of receivers varies per message (unlike fixed pub-sub).

**Solution:** Compute recipients from content or registry, then forward a copy to each.

**Code:**
```typescript
async function distribute(notification: Notification) {
  const channels: string[] = [];
  if (notification.prefersEmail) channels.push("email-notifications");
  if (notification.prefersSms) channels.push("sms-notifications");
  if (notification.prefersPush) channels.push("push-notifications");
  await Promise.all(channels.map(ch =>
    producer.send({ topic: ch, messages: [{ value: JSON.stringify(notification) }] })
  ));
}
```

**Trade-offs:** Handle failures per recipient independently; no delivery order guarantee.

---

### 14. Splitter

**Intent:** Break a composite message into individual messages.

**Problem:** A batch arrives as one message but downstream expects individual items.

**Solution:** Iterate the collection and publish each element separately.

```
[Batch { items: [A, B, C] }] → [Splitter] → (A) → (B) → (C)
```

**Code:**
```typescript
await consumer.run({
  eachMessage: async ({ message }) => {
    const batch = JSON.parse(message.value.toString()) as OrderItem[];
    await Promise.all(batch.map(item =>
      producer.send({ topic: "order-items", messages: [{ value: JSON.stringify(item) }] })
    ));
  },
});
```

**Trade-offs:** Ordering not guaranteed (use CorrelationId + sequence number); splitter failure loses batch.

---

### 15. Aggregator

**Intent:** Combine related messages into one.

**Problem:** A result is spread across multiple messages that must be correlated and merged.

**Solution:** Store messages by correlation ID, publish combined result when complete (all parts or timeout).

```
(A) ──┐
(B) ──┤→ [Aggregator] → [CombinedResult]
(C) ──┘
```

**Code:**
```typescript
const store = new Map<string, string[]>();
await consumer.run({
  eachMessage: async ({ message }) => {
    const part = JSON.parse(message.value.toString());
    const parts = store.get(part.correlationId) ?? [];
    parts.push(part.data);
    if (parts.length === part.expectedCount) {
      await producer.send({ topic: "aggregated", messages: [{ value: JSON.stringify(parts) }] });
      store.delete(part.correlationId);
    }
  },
});
```

**Trade-offs:** Stateful — needs persistent store; timeout handling for incomplete groups.

---

### 16. Resequencer

**Intent:** Reorder out-of-sequence messages.

**Problem:** Messages arrive out of order but the consumer needs original sequence.

**Solution:** Buffer messages and release in correct order using sequence numbers.

```
[3, 1, 2] → [Resequencer: 1, 2, 3] → [Processor]
```

**Code:**
```typescript
class Resequencer {
  private buffer = new Map<number, any>();
  private next = 1;
  async push(seq: number, msg: any) {
    this.buffer.set(seq, msg);
    while (this.buffer.has(this.next)) {
      await process(this.buffer.get(this.next)!);
      this.buffer.delete(this.next);
      this.next++;
    }
  }
}
```

**Trade-offs:** Buffering adds latency; cannot reorder across partitions; use timeout to skip gaps.

---

### 17. Routing Slip

**Intent:** Define a dynamic processing pipeline per message.

**Problem:** The processing steps vary per message and are not known at design time.

**Solution:** Attach a list of route steps to the message. Each step processes and forwards to the next.

```
[Message] → [Step A] → [Step B] → [Step C] → [Done]
             slip: [B,C]   slip: [C]   slip: []
```

**Code:**
```typescript
type SlipMsg = { payload: any; routingSlip: string[]; step: number };
await consumer.run({
  eachMessage: async ({ message }) => {
    const msg: SlipMsg = JSON.parse(message.value.toString());
    const step = msg.routingSlip[msg.step];
    if (!step) return;
    await producer.send({ topic: step, messages: [{ value: JSON.stringify({ ...msg, step: msg.step + 1 }) }] });
  },
});
```

**Trade-offs:** Self-describing messages are harder to evolve; lost message loses the entire slip.

---

### 18. Process Manager

**Intent:** Coordinate multi-step business processes across services.

**Problem:** A workflow (e.g., order-to-shipment) spans services; logic should not be scattered.

**Solution:** A central saga orchestrator receives events, decides next steps, sends commands.

```
[Order Placed] → [Process Manager] → [Payment] → [Fraud] → [Shipping]
```

**Code:**
```typescript
class OrderProcessManager {
  private state = new Map<string, Set<string>>();
  async handle(event: { orderId: string; type: string; order: Order }) {
    const status = this.state.get(event.orderId) ?? new Set();
    status.add(event.type);
    if (status.has("PaymentReceived") && status.has("FraudApproved")) {
      await producer.send({ topic: "ship-command", messages: [{ value: JSON.stringify(event.order) }] });
    }
  }
}
```

**Trade-offs:** Stateful; single point of failure; compensating transactions needed for failures.

---

## Message Transformation

### 19. Message Translator

**Intent:** Convert between different data formats or schemas.

**Problem:** Producer and consumer use incompatible formats.

**Solution:** Map fields and convert types between source and target schemas.

```
[XML] → [Translator] → [JSON]
```

**Code:**
```typescript
interface LegacyOrder { order_number: string; customer_name: string; total_amount: number; }
interface NewOrder { orderId: string; customer: { name: string }; total: number; }

function translate(input: LegacyOrder): NewOrder {
  return { orderId: input.order_number, customer: { name: input.customer_name }, total: input.total_amount };
}
```

**Trade-offs:** Serialization bottleneck; schema drift requires updates; field mapping errors are silent.

---

### 20. Message Enricher

**Intent:** Augment a message with data from an external source.

**Problem:** Incoming message lacks fields the consumer needs; producer cannot supply them.

**Solution:** Query an external source (DB, API) and publish an enriched copy.

**Code:**
```typescript
await consumer.run({
  eachMessage: async ({ message }) => {
    const order = JSON.parse(message.value.toString());
    const customer = await customerDb.findById(order.customerId);
    order.customerEmail = customer.email;
    order.customerTier = customer.tier;
    await producer.send({ topic: "enriched-orders", messages: [{ value: JSON.stringify(order) }] });
  },
});
```

**Trade-offs:** Adds latency; external dependency increases failure surface; handle missing data gracefully.

---

### 21. Claim Check

**Intent:** Reduce message size by storing large data externally.

**Problem:** Large payloads (files, images) bloat messages and degrade broker performance.

**Solution:** Store large data in S3/Blob Storage; send only a reference (claim check) in the message.

```
[Producer] → (Claim Check: s3://bucket/key) → [Consumer → Fetch from S3]
              ↓
         [Blob Store]
```

**Code:**
```typescript
// Producer
const blobKey = `orders/${order.id}/receipt.pdf`;
await s3.putObject({ Bucket: "receipts", Key: blobKey, Body: pdfBuffer });
await producer.send({ topic: "orders", messages: [{ value: JSON.stringify({ orderId: order.id, receiptKey: blobKey }) }] });
// Consumer
await consumer.run({
  eachMessage: async ({ message }) => {
    const msg = JSON.parse(message.value.toString());
    const receipt = await s3.getObject({ Bucket: "receipts", Key: msg.receiptKey });
    await processReceipt(receipt.Body);
  },
});
```

**Trade-offs:** Extra latency for store/retrieve; orphaned blob cleanup needed.

---

### 22. Normalizer

**Intent:** Convert messages in different formats to a common canonical format.

**Problem:** Multiple producers send semantically equivalent data in different schemas.

**Solution:** Route each format variant through a specific translator to canonical output.

```
[Format A] → [Translator A] ─┐
[Format B] → [Translator B] ─┤→ [Canonical] → [Consumer]
```

**Code:**
```typescript
const translators: Record<string, (raw: any) => CanonicalOrder> = {
  v1: (raw) => ({ id: raw.order_id, total: raw.amount }),
  v2: (raw) => ({ id: raw.id, total: raw.total }),
};
await consumer.run({
  eachMessage: async ({ message }) => {
    const msg = JSON.parse(message.value.toString());
    const normalize = translators[msg.version ?? "v1"];
    if (!normalize) return;
    await producer.send({ topic: "normalized-orders", messages: [{ value: JSON.stringify(normalize(msg)) }] });
  },
});
```

**Trade-offs:** Each new format needs a translator; canonical schema must be stable.

---

## Messaging Endpoints

### 23. Service Activator

**Intent:** Invoke a service method when a message arrives.

**Problem:** Bridge message-driven infrastructure to existing service methods without boilerplate.

**Solution:** A thin adapter listens on a channel, deserializes, and calls the target method.

```
[Channel] → [Service Activator] → processOrder(msg)
```

**Code:**
```typescript
function onMessage(topic: string) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    consumer.subscribe({ topic });
    consumer.run({ eachMessage: async ({ message }) => {
      descriptor.value.apply(target, [JSON.parse(message.value.toString())]);
    }});
  };
}
class OrderService {
  @onMessage("process-order")
  async processOrder(order: Order) { /* logic */ }
}
```

**Trade-offs:** Ties message format to method signature; error handling must be in the activator.

---

### 24. Channel Adapter

**Intent:** Connect an application's existing API to a messaging channel.

**Problem:** An existing app (REST API, DB) needs to send/receive messages without modification.

**Solution:** Inbound adapter translates app protocol → message; outbound adapter does the reverse.

```
[REST API] ↔ [Inbound Adapter] ↔ (Channel) ↔ [Outbound Adapter] ↔ [Legacy System]
```

**Code:**
```typescript
// Inbound: HTTP → Kafka
app.post("/orders", async (req, res) => {
  await producer.send({ topic: "orders", messages: [{ value: JSON.stringify(req.body) }] });
  res.status(202).json({ accepted: true });
});
// Outbound: Kafka → HTTP
await consumer.run({
  eachMessage: async ({ message }) => {
    await fetch("https://legacy-system/api/orders", { method: "POST", body: message.value.toString() });
  },
});
```

**Trade-offs:** Extra hop adds latency; protocol mismatch requires careful mapping.

---

### 25. Event-Driven Consumer

**Intent:** React to messages as soon as they arrive.

**Problem:** Consumer must respond immediately without polling.

**Solution:** Register a callback; broker pushes messages.

```
[Broker] ─push─→ [Consumer (callback)]
```

**Code:**
```typescript
// Kafka
await consumer.run({
  eachMessage: async ({ message }) => { await handleOrder(JSON.parse(message.value.toString())); },
});
```

```csharp
// RabbitMQ
var consumer = new EventingBasicConsumer(channel);
consumer.Received += async (_, ea) => {
    await _handler.Handle(JsonSerializer.Deserialize<Order>(ea.Body.Span));
    channel.BasicAck(ea.DeliveryTag, false);
};
channel.BasicConsume("orders", autoAck: false, consumer: consumer);
```

**Trade-offs:** Must handle bursts; backpressure via prefetch count; crashes can lose unprocessed messages.

---

### 26. Polling Consumer

**Intent:** Actively check for messages at own pace.

**Problem:** Consumer needs throttling, batching, or resource-aware message retrieval.

**Solution:** Periodically poll the broker instead of receiving pushes.

```
[Consumer] ─poll→ [Broker] → msg
```

**Code:**
```typescript
setInterval(async () => {
  const batch = await consumer.consumeBatch({ batchSize: 10, timeoutMs: 1000 });
  for (const message of batch) await process(message);
}, 5000);
```

**Trade-offs:** Higher latency (poll interval); wasted resources on empty polls; simpler flow control.
