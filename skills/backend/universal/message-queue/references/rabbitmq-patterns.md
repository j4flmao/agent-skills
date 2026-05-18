# RabbitMQ Patterns

## Core Concepts
```
Producer:         Sends messages to exchange
Exchange:         Routing engine (routes messages to queues)
Binding:          Link between exchange and queue (with routing key)
Queue:            Message buffer consumed by consumers
Consumer:         Receives messages from queue
ACK:              Acknowledgment (confirm processing)
```

## Exchange Types

### Direct Exchange
```
Message → exchange → queue (exact routing key match)

Exchange: user.events.direct
Queue: user.created   ← routing key: "user.created"
Queue: user.updated   ← routing key: "user.updated"

Producer sends with routing key "user.created" → only "user.created" queue receives.
```

### Topic Exchange
```
Message → exchange → queue (routing key pattern match)

Exchange: user.events.topic
Queue: user.created   ← binding key: "user.created.*"
Queue: user.eu        ← binding key: "user.#" and "*.eu.*"
Queue: all-events     ← binding key: "#" (match all)

Wildcards:
  * : matches exactly one word
  # : matches zero or more words
```

### Fanout Exchange
```
Message → exchange → ALL bound queues (ignores routing key)

Exchange: system.alerts
Queue: pager-duty     ← receives all alerts
Queue: slack-bot      ← receives all alerts
Queue: email-alerts   ← receives all alerts

Use: broadcast, event notifications, cache invalidation.
```

### Headers Exchange
```
Message → exchange → queue (match on header attributes, not routing key)

Exchange: routing.headers
Queue: high-priority  ← header: { "priority": "critical" }
Queue: standard       ← header: { "x-match": "any", "source": "web", "type": "update" }
```

## Dead Letter Exchange (DLX)
```yaml
Queue:
  name: user.created
  arguments:
    x-dead-letter-exchange: user.events.dlx
    x-dead-letter-routing-key: user.created.failed
    x-message-ttl: 60000          # 60s per-message TTL
    x-max-length: 10000           # max messages in queue
    x-max-priority: 10            # priority queue
```

When a message is rejected, NACKed, or TTL expires → routed to DLX.

## Retry Pattern
```
Main queue → consumer → reject → DLX → retry queue (with TTL) → main queue

Setup:
  1. Main queue: user.created
  2. DLX: user.events.dlx
  3. Retry queue: user.created.retry (TTL: 10s)
  4. Retry queue routes back to main queue after TTL
  5. Max retries: track in message header (x-retry-count)
  6. After max retries → route to permanent DLQ
```

## Publisher Confirms (Reliable Publishing)
```java
channel.confirmSelect();

// Synchronous
channel.basicPublish("exchange", "routingKey", null, body);
channel.waitForConfirmsOrDie(5000);

// Async
channel.addConfirmListener((deliveryTag, multiple) -> {
    // confirmed
}, (deliveryTag, multiple) -> {
    // not confirmed — retry
});
```

## Consumer ACK
```java
// Auto ACK (fire and forget — risk of loss)
boolean autoAck = true;
channel.basicConsume(queue, autoAck, consumer);

// Manual ACK (at-least-once)
boolean autoAck = false;
channel.basicConsume(queue, autoAck, consumer);

// In delivery callback:
channel.basicAck(deliveryTag, false);       // success
channel.basicNack(deliveryTag, false, true); // reject + requeue
channel.basicNack(deliveryTag, false, false);// reject + DLX
channel.basicReject(deliveryTag, false);     // reject + DLX (single message)
```

## Competing Consumers Pattern
```
Multiple consumers on the same queue → RabbitMQ distributes messages round-robin.

  Queue: task.queue
  Consumer 1: processes message A, C, E
  Consumer 2: processes message B, D, F

QoS (prefetch count):
  channel.basicQos(10);  // max 10 unacked messages per consumer
  - Low prefetch: 1-10  → fair distribution, lower throughput
  - High prefetch: 100+ → higher throughput, may be unfair
  - Set prefetch based on processing time variance
```

## RPC Pattern
```
Client → request queue (with reply_to + correlation_id)
Worker → processes → response queue (by reply_to)
Client → consumes response matching correlation_id

Request queue: rpc.queue
Reply queue: amq.rabbitmq.reply-to (auto-delete, per-connection)
```

## Monitoring
```
Key metrics:
  - Queue length (ready + unacked)
  - Consumer count
  - Publish rate
  - Ack rate
  - Nack/reject rate
  - Connection count
  - Node memory / disk / file descriptors
```
