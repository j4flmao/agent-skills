---
name: enterprise-integration-patterns
description: >
  Use this skill when designing enterprise system integrations with message routing, protocol transformation, and error handling.
  This skill enforces: anti-corruption layers, SLA-defined integrations, dead letter queue monitoring.
  Do NOT use for: in-process function calls, simple REST API clients, database replication tools.
version: "1.0.0"
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
### Systems: {sources} → {targets}
### Style: {API / messaging / file / streaming}

### Message Flow
{source} → {transform} → {route} → {target}

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

## Rules
- Always use anti-corruption layer between bounded contexts.
- Never share databases between services — use APIs or message queues.
- Every integration must have defined SLAs (latency p99, throughput, error rate).
- Schema evolution must be backward-compatible (add-only fields).
- Dead letter queues must be monitored and alerted on depth.
- Idempotency keys required for all state-changing operations.
- Integration tests must cover failure modes (timeout, bad data, network partition).
- Every integration flow must have a circuit breaker.

## References
  - references/etl-integration.md — ETL Integration Patterns
  - references/integration-architectures.md — Integration Architectures
  - references/integration-patterns-advanced.md — Integration Patterns Advanced Topics
  - references/integration-patterns-fundamentals.md — Integration Patterns Fundamentals
  - references/integration-styles.md — Enterprise Integration Styles
  - references/message-routing.md — Message Routing Patterns
## Handoff
For monitoring integration SLAs, hand off to `enterprise-sla-management`. For data governance across integrations, hand off to `enterprise-data-governance`.
