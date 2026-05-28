---
name: enterprise-integration-patterns
description: >
  Use this skill when designing enterprise system integrations with message routing, protocol transformation, and error handling.
  This skill enforces: anti-corruption layers, SLA-defined integrations, dead letter queue monitoring.
  Do NOT use for: in-process function calls, simple REST API clients, database replication tools.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, integration, phase-8]
---

# Integration Patterns Agent

## Purpose
Designs enterprise integration systems with message routing, protocol transformation, and error handling.

## Agent Protocol

### Trigger
Exact user phrases: enterprise integration, system integration, legacy integration, ESB, message broker, data sync, system-of-record, integration pattern, API gateway integration, legacy system, middleware, event-driven integration, point-to-point, publish-subscribe.

### Input Context
- What systems are being integrated (source, target, protocol)?
- What is the system of record for each data domain?
- What are the latency and throughput requirements?
- What error handling and retry policies exist?

### Output Artifact
Integration architecture design with routing, transformation, error handling, and monitoring.

### Response Format
```
## Integration Architecture
### Systems: {sources} -> {targets}
### Style: {API / messaging / file / streaming}

### Message Flow
{source} -> {transform} -> {route} -> {target}

### Routing Rules
{content / header / topic / rule-based}

### Error Handling
{retry: strategy, DLQ: location, alert: threshold}

### Monitoring
{tracing, SLAs, dashboards}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Integration style selected and justified
- [ ] Anti-corruption layer defined between systems
- [ ] Message routing rules documented
- [ ] Protocol transformation mapped
- [ ] Error handling and retry strategy designed
- [ ] Dead letter queue monitoring configured
- [ ] End-to-end tracing implemented
- [ ] SLA metrics defined per integration

### Max Response Length
7000 tokens

## Workflow

### Step 1: Integration Style Selection
Choose from API (synchronous, request-response), messaging (async, durable, pub-sub), file transfer (batch, CSV/JSON/EDI), database sharing (schema federation, views), or streaming (real-time, Kafka/Kinesis). Base decision on latency requirements, data volume, consistency needs, and system autonomy.

### Step 2: Anti-Corruption Layer Design
Place ACL between bounded contexts. Translate domain models at boundaries. Prevent internal model changes from propagating to external systems. Implement with separate translation layer, DTO objects, and interface adapters.

### Step 3: Message Routing
Apply content-based routing (message content determines destination), header-based (metadata-driven), topic-based (pub-sub per topic), or rule-based (complex condition evaluation). Route to single or multiple consumers.

### Step 4: Protocol Transformation
Transform between SOAP/WSDL to REST/JSON, fixed-width files to structured payloads, EDI X12 to API objects, protobuf to Avro. Schema validation at boundaries. Version negotiation.

### Step 5: Error Handling and Retry
Implement retry with exponential backoff (base delay 1s, max 30s, jitter 0.1). Dead letter queue for poison messages. Manual intervention queue for business errors. Idempotency keys for safe retries.

### Step 6: Monitoring Integration Flows
End-to-end distributed tracing with trace ID propagation. SLA tracking (latency, throughput, error rate). Throughput dashboards partitioned by integration flow. Alert on DLQ depth, latency spikes, error rate thresholds.

## Architecture / Decision Trees

### Integration Style Decision Tree

| Style | Latency | Consistency | Volume | Best For |
|---|---|---|---|---|
| API (REST/gRPC) | Low | Strong | Low-Med | Real-time, CRUD, synchronous |
| Messaging (RabbitMQ, SQS) | Medium | Eventual | Medium | Async, durable, decoupled |
| Streaming (Kafka, Kinesis) | Low | Eventual | Very High | Real-time events, log processing |
| File Transfer (SFTP, S3) | High | Eventual | High | Batch, legacy systems |
| Database Sharing | Low | Strong | High | Shared schema (avoid if possible) |

### Message Broker Decision Tree

| Broker | Throughput | Durability | Ordering | Best For |
|---|---|---|---|---|
| RabbitMQ | 50k msg/s | High | Per queue | Task queues, RPC |
| Apache Kafka | 1M+ msg/s | Very High | Per partition | Event streaming, logging |
| AWS SQS | Unlimited | Very High | Best-effort | Simple queuing, Lambda |
| AWS SNS+SQS | 100k+ msg/s | Very High | No | Pub-sub fanout |
| Google Pub/Sub | 1M+ msg/s | Very High | Per subscription | GCP-native streaming |

### Integration Topology Options

| Topology | Flexibility | Complexity | Maintenance |
|---|---|---|---|
| Point-to-Point | Low | Low | High (N*N connections) |
| Hub-and-Spoke (ESB) | Medium | Medium | Medium (single broker) |
| Message Bus | High | High | Medium (routing rules) |
| Event Mesh | Very High | Very High | High (distributed brokers) |

### Anti-Corruption Layer Strategies

| Strategy | Use When |
|---|---|
| Facade | Legacy system API is complex or inconsistent |
| Adapter | Legacy API differs from modern contract |
| Translator | Data models differ between systems |
| Event Translation | Events from legacy use different schema |

## Common Pitfalls

### Pitfall 1: Database Sharing Between Services
Direct database access between services creates tight coupling. Schema changes in one service break others. Always use APIs or message queues for service-to-service communication. Database sharing is an anti-pattern in microservice architectures. If unavoidable, use views or read replicas.

### Pitfall 2: No Anti-Corruption Layer
Integrating directly with a legacy system's internal model propagates legacy problems. Changes to the legacy system break the integration. ACL isolates internal domain from external models. Always implement ACL between bounded contexts.

### Pitfall 3: Synchronous Chaining
Service A calls B calls C calls D. Latency = sum of all. Failure of any breaks the entire chain. Use async messaging for non-real-time processing. Implement circuit breakers for synchronous calls. Consider CQRS to decouple read and write paths.

### Pitfall 4: Ignoring Poison Messages
Messages that fail processing go to DLQ but nobody monitors it. DLQ fills up, retention overflows, messages lost. Monitor DLQ depth. Alert on growth. Have reprocessing mechanism. Review DLQ content weekly.

### Pitfall 5: Missing Idempotency
Retry without idempotency causes duplicate orders, payments, or data entries. All state-changing operations must be idempotent. Use idempotency keys. De-duplicate on consumer side. Store processed message IDs.

### Pitfall 6: Protocol Incompatibility Ignored
SOAP service expects XML; new microservice sends JSON. Transformation layer is missing. Always plan for protocol transformation at integration boundaries. Use message brokers with built-in transformation (Kafka Connect, Debezium) or custom transformer.

### Pitfall 7: No Circuit Breaker
When a downstream service fails, the caller keeps retrying and exacerbates the issue. Circuit breaker stops calls when failure rate exceeds threshold, giving the downstream time to recover. Implement circuit breakers for all synchronous integrations.

### Pitfall 8: Schema Evolution Without Compatibility Check
Producer changes message schema; consumer fails to deserialize. Always enforce schema compatibility checks. Use schema registry (Confluent Schema Registry, Apicurio). Set compatibility policy: backward (default), forward, or full.

## Best Practices

### Integration Design
- Define system of record per data domain (one source of truth)
- Use anti-corruption layer between all bounded contexts
- Prefer async messaging over synchronous API where latency allows
- Each integration has explicit SLAs (latency p99, throughput, error rate)
- Schema evolution must be backward-compatible
- Idempotency keys for all state-changing operations

### Error Handling
- Retry with exponential backoff + jitter
- Dead letter queue for poison messages
- Manual intervention queue for business errors
- Alert on DLQ depth exceeding threshold
- Circuit breaker for all synchronous calls

### Monitoring
- End-to-end distributed tracing with correlation IDs
- SLA dashboards per integration flow
- DLQ monitoring with automated reprocessing
- Alert on latency spikes and error rate thresholds
- Throughput tracking for capacity planning

## Compared With

### API Gateway vs Message Broker vs ESB
API Gateway: synchronous request handling, routing, rate limiting, auth. Message Broker: async pub/sub, queue, durable messaging. ESB: heavy middleware with routing, transformation, orchestration, governance. Modern approach: API Gateway for sync, Message Broker for async, avoid heavy ESB. Decompose ESB capabilities into lighter components.

### Kafka vs RabbitMQ
Kafka: high-throughput streaming, event log, replay, strong ordering per partition, consumer groups. RabbitMQ: flexible routing, reliable task queues, RPC, lower throughput but simpler ops. Kafka for event-driven and streaming. RabbitMQ for task queues and RPC. Many orgs use both for different use cases.

### Integration vs Orchestration
Integration: connecting systems, message routing, protocol transformation. Orchestration: coordinating a business process across multiple systems (e.g., order fulfillment: payment -> inventory -> shipping). Orchestration uses integration as infrastructure. Use workflow engines (Camunda, Temporal) for orchestration; use integration patterns for system connectivity.

## Operations & Maintenance

### Integration Health Monitoring
- Daily: review DLQ depth, check throughput, verify SLA compliance
- Weekly: analyze error patterns, review circuit breaker state
- Monthly: capacity review, schema compatibility audit
- Quarterly: integration audit, deprecation planning
- As needed: update connection credentials, rotate certificates

### Incident Response for Integration Failures
1. Detect: monitoring alert (DLQ growth, latency spike, error rate increase)
2. Assess: is this a producer issue or consumer issue?
3. For producer issue: notify producer team, isolate failed messages
4. For consumer issue: check consumer health, restart if needed
5. For network issue: check connectivity, retry on recovery
6. Reprocess DLQ messages after root cause fixed
7. Document incident and add preventive monitoring

### Integration Lifecycle Management
1. Request: new integration request with SLAs
2. Design: integration style, error handling, monitoring
3. Implement: build connectors, transformers, routing
4. Test: integration tests covering failure modes
5. Deploy: canary traffic, monitor for regressions
6. Operate: monitor, maintain, update as needed
7. Deprecate: notify consumers, drain traffic, archive

### Schema Registry Management
- Schema creation: validate backward compatibility
- Schema evolution: add-only fields, no deletions
- Schema versioning: every change creates new version
- Compatibility check: automated in CI
- Schema deprecation: notify consumers, set deprecation date
- Schema deletion: only after all consumers migrated

## Rules
- Always use anti-corruption layer between bounded contexts
- Never share databases between services -- use APIs or message queues
- Every integration must have defined SLAs (latency p99, throughput, error rate)
- Schema evolution must be backward-compatible (add-only fields)
- Dead letter queues must be monitored and alerted on depth
- Idempotency keys required for all state-changing operations
- Integration tests must cover failure modes (timeout, bad data, network partition)
- Every integration flow must have a circuit breaker
- System of record defined per data domain -- no ambiguity
- Protocol transformation documented at every integration boundary
- Message brokers must have high-availability configuration
- Integration monitoring dashboards visible to all consuming teams
- Schema registry used for all message serialization formats
- Integration deprecation follows documented lifecycle with consumer notification

## References
- references/integration-patterns-fundamentals.md -- Integration Patterns Fundamentals
- references/integration-patterns-advanced.md -- Integration Patterns Advanced Topics
- references/integration-styles.md -- Enterprise Integration Styles
- references/message-routing.md -- Message Routing Patterns
- references/integration-architectures.md -- Integration Architectures
- references/etl-integration.md -- ETL Integration Patterns
- references/enterprise-integration-architecture.md -- Enterprise Integration Architecture
- references/event-driven-integration.md -- Event-Driven Integration

## Handoff
For monitoring integration SLAs, hand off to `enterprise-sla-management`. For data governance across integrations, hand off to `enterprise-data-governance`.
