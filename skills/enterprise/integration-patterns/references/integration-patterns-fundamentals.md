# Integration Patterns Fundamentals

## Overview
Enterprise integration connects systems across boundaries — different teams, technologies, and deployment models. This covers integration styles, message routing, anti-corruption layers, error handling, and schema management.

## Core Concepts

### Integration Styles
| Style | Latency | Consistency | Volume | Best For |
|-------|---------|-------------|--------|----------|
| API (REST/gRPC) | Low | Strong | Low-Med | Real-time, synchronous, CRUD |
| Messaging (RabbitMQ, SQS) | Medium | Eventual | Medium | Async, durable, decoupled |
| Streaming (Kafka, Kinesis) | Low | Eventual | Very High | Real-time events, log processing |
| File Transfer (SFTP, S3) | High | Eventual | High | Batch, legacy systems |

### Style Decision Tree
```
Real-time response required?
├── Yes → Strong consistency needed?
│   ├── Yes → API (REST/gRPC)
│   └── No → Eventual consistency OK?
│       ├── Yes → Messaging (async)
│       └── No → Streaming (Kafka)
└── No → Bulk data transfer?
    ├── Yes → File Transfer (SFTP, S3)
    └── No → Messaging (async)
```

### Anti-Corruption Layer (ACL)
ACL prevents a system's internal model from leaking into other systems. Three components: Interface (stable contract), Translation (maps between domain models), Routing (directs to legacy or new system).

ACL patterns:
- Facade: Wrap complex legacy API with simple interface
- Adapter: Translate between different interfaces
- Translator: Convert between data models (legacy XML -> modern JSON)
- Gateway: Route and transform at proxy layer

### Message Routing Patterns
| Pattern | Description |
|---------|-------------|
| Content-Based Router | Route by message content (field value, type) |
| Header-Based Router | Route by message metadata |
| Recipient List | Send to multiple destinations |
| Splitter | Split one message into many |
| Aggregator | Combine related messages |
| Dead Letter Channel | Failed messages storage |

### Error Handling
| Strategy | When | Details |
|----------|------|---------|
| Retry (exponential backoff) | Transient failures | Base delay 1s, max 30s, jitter 0.1 |
| Circuit breaker | Persistent failures | Open after 50% failure rate in 10s window |
| Dead letter queue | Poison messages | Review weekly, reprocess after fix |
| Idempotency keys | All state-changing operations | De-duplicate on consumer side |

## Message Brokers

### Broker Selection
```
Throughput > 500K msg/s? -> Kafka (high-throughput, ordered per partition, replay)
Complex routing needed? -> RabbitMQ (flexible exchanges, routing keys)
Fully on AWS? -> SQS (simple, unlimited scale, no ordering guarantees)
Need message replay? -> Kafka (retain and replay)
Simple queue? -> SQS or RabbitMQ
```

### Kafka vs RabbitMQ
| Feature | Kafka | RabbitMQ |
|---------|-------|----------|
| Throughput | Very high (1M+ msg/s) | Medium (50K msg/s) |
| Message retention | Configurable (days) | Until consumed |
| Replay | Yes (by offset/timestamp) | No (must re-publish) |
| Routing | Topic-based | Exchanges + bindings |
| Ordering | Per partition | Per queue |
| Delivery guarantees | At-least-once | At-most-once / at-least-once |

## Schema Management

### Schema Registry
Centralized registry for message schemas. Enforces compatibility on schema evolution. Produces validate before publishing. Consumers pull latest compatible schema.

### Compatibility Types
| Type | Allows | Prevents |
|------|--------|----------|
| Backward | Add optional fields, remove fields with defaults | Delete fields, change types |
| Forward | Delete fields, add optional fields | Remove fields with defaults |
| Full | Both backward and forward | Any breaking change |
| None | Anything | Nothing |

## Common Pitfalls

### Database Sharing Between Services
Direct database access creates tight coupling. Schema changes break other services. Always use APIs or message queues for service-to-service communication.

### No Anti-Corruption Layer
Integrating directly with a legacy system's internal model propagates legacy problems. ACL isolates internal domain from external models.

### Synchronous Chaining
A -> B -> C -> D means latency = sum of all. Failure of D takes down A, B, C. Use async messaging for non-real-time. Implement circuit breakers.

### Unmonitored Dead Letter Queue
Messages fail and go to DLQ but nobody monitors it. DLQ overflows, messages lost forever. Monitor DLQ depth, alert on growth, review weekly.

## Key Points
- Integration style drives architecture — choose based on latency, volume, and consistency needs
- Anti-corruption layer is mandatory between all bounded contexts
- Schema registry prevents breaking changes from propagating
- Idempotency keys on all state-changing operations prevent duplicate processing
- Dead letter queues must be monitored, not ignored
- Kafka for high-throughput streaming, RabbitMQ for flexible routing
- Always plan for error handling: retry, circuit breaker, DLQ, manual intervention
- Protocol transformation at boundaries prevents incompatibility issues