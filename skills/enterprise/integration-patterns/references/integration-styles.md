# Enterprise Integration Styles

## Style Comparison

| Style | Sync | Latency | Volume | Durability | Coupling |
|-------|------|---------|--------|------------|----------|
| API (REST/gRPC) | Yes | ms-s | med | No | Tight |
| Messaging (RabbitMQ) | No | ms | high | Yes | Loose |
| Streaming (Kafka) | No | ms-min | very high | Yes | Loose |
| File Transfer | No | min-hr | high | No | Batch |
| DB Sharing | Yes | ms | low | No | Tightest |

## API Style (REST/gRPC)

### When to Use
- Real-time request-response needed
- Low latency (<500ms)
- Simple query operations
- Third-party integrations

### Implementation
```yaml
openapi: 3.0.0
info:
  title: Order Integration API
  version: 1.0.0
paths:
  /orders:
    post:
      x-integration:
        system-of-record: order-service
        sla-ms-p99: 500
        retry: idempotent
```

### Anti-Patterns
- Polling for updates (use webhooks)
- Chatty APIs (batch operations)
- Exposing internal domain models

## Messaging Style

### When to Use
- Async processing acceptable
- Need durability guarantees
- Multiple consumers needed
- Load leveling required

### Topologies
- Point-to-Point: One sender, one consumer
- Pub-Sub: One sender, many consumers
- Fan-Out: Broadcast to all queues
- Dead Letter: Failed messages queue

### Implementation
```python
# Producer
message = {
    "idempotency_key": str(uuid4()),
    "payload": order_data,
    "headers": {"origin": "web-ui"},
    "schema_version": "2.1"
}
channel.basic_publish(
    exchange="orders",
    routing_key="order.created",
    body=json.dumps(message),
    properties=pika.BasicProperties(delivery_mode=2)
)
```

## Streaming Style

### When to Use
- High throughput events (>10k/s)
- Event sourcing / CQRS
- Log aggregation
- Real-time analytics

### Key Patterns
- Event Sourcing: Store events as source of truth
- CQRS: Separate read/write models
- Kappa Architecture: Single streaming pipeline

## File Transfer Style

### When to Use
- Batch processing acceptable
- Large dataset transfers
- Legacy system integration
- Regulatory reporting

### Best Practices
- Manifest files with checksums
- Exactly-once delivery markers
- Archive after processing
- Monitoring for stale files

## DB Sharing (Anti-Pattern)

### When to Avoid
- NEVER for new integrations
- Leads to tight coupling
- Schema changes break consumers
- No clear ownership boundary
