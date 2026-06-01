---
name: enterprise-integration-patterns
description: >
  Use this skill when designing enterprise system integrations with message routing, protocol transformation, and error handling.
  This skill enforces: anti-corruption layers, SLA-defined integrations, dead letter queue monitoring.
  Do NOT use for: in-process function calls, simple REST API clients, database replication tools.
version: "2.0.0"
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

## Framework/Methodology

### INTEGRATE Framework
A six-phase methodology for enterprise integration:

Phase 1 - Identify: Map all systems requiring integration. Define system-of-record per data domain. Document protocols, data formats, and latency requirements. Identify integration touchpoints and data flows.

Phase 2 - Negotiate: Define contracts between systems (API specs, message schemas, SLA terms). Establish consumer-driven contracts. Agree on error handling and retry policies.

Phase 3 - Transform: Build anti-corruption layers between bounded contexts. Implement protocol and data format transformations. Enforce schema validation at boundaries.

Phase 4 - Route: Design message routing topology. Select integration style (API/messaging/streaming/file). Configure content-based, header-based, or topic-based routing.

Phase 5 - Govern: Monitor SLAs per integration flow. Track DLQ depth and error rates. Implement end-to-end tracing. Manage schema evolution with compatibility checks.

Phase 6 - Retire: Decommission deprecated integration points. Migrate consumers to new endpoints. Archive integration documentation.

### Enterprise Integration Patterns (EIP) Catalog

Messaging Patterns:
- Point-to-Point Channel: One-to-one message delivery
- Publish-Subscribe Channel: One-to-many message delivery
- Dead Letter Channel: Failed messages storage
- Guaranteed Delivery: Persistent messaging
- Message Bus: Shared messaging infrastructure

Routing Patterns:
- Content-Based Router: Route by message content
- Header-Based Router: Route by message metadata
- Recipient List: Send to multiple destinations
- Splitter: Split composite message into individual messages
- Aggregator: Combine related messages into single message

Transformation Patterns:
- Message Translator: Convert between data formats
- Enricher: Add data from external source
- Normalizer: Convert semantically equivalent messages
- Claim Check: Store large data externally, pass reference

## Architecture / Decision Trees

### Integration Style Decision Tree
```
Is real-time response required?
├── Yes → Is strong consistency needed?
│   ├── Yes → API (REST/gRPC) synchronous
│   └── No → Can consumer tolerate eventual consistency?
│       ├── Yes → Messaging (async, durable)
│       └── No → Streaming (Kafka, Kinesis)
└── No → Is it a bulk data transfer?
    ├── Yes → File Transfer (SFTP, S3)
    └── No → Messaging (async, queue-based)
```

### Integration Style Comparison

| Style | Latency | Consistency | Volume | Best For |
|---|---|---|---|---|
| API (REST/gRPC) | Low | Strong | Low-Med | Real-time, CRUD, synchronous |
| Messaging (RabbitMQ, SQS) | Medium | Eventual | Medium | Async, durable, decoupled |
| Streaming (Kafka, Kinesis) | Low | Eventual | Very High | Real-time events, log processing |
| File Transfer (SFTP, S3) | High | Eventual | High | Batch, legacy systems |
| Database Sharing | Low | Strong | High | Shared schema (avoid if possible) |

### Message Broker Decision Tree
```
Is throughput > 500K messages/second?
├── Yes → Apache Kafka (high-throughput, ordered per partition)
└── No → Are complex routing rules needed?
    ├── Yes → RabbitMQ (flexible exchanges, routing keys)
    └── No → Is it fully on AWS?
        ├── Yes → SQS (simple, unlimited scale)
        └── No → RabbitMQ (balanced features)

Do you need message replay/reprocessing?
├── Yes → Apache Kafka (retain and replay)
└── No → RabbitMQ or SQS (consume and remove)
```

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

## Code Examples

### Anti-Corruption Layer (Python)
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
import json

# Legacy system domain model
@dataclass
class LegacyOrder:
    order_id: str
    customer_code: str
    item_list: str  # Comma-separated
    total_dollars: float
    created_dt: str  # MM/DD/YYYY string

# Modern system domain model
@dataclass
class ModernOrder:
    id: str
    customer_id: str
    items: list[str]
    total_cents: int
    created_at: str  # ISO 8601

class AntiCorruptionLayer(ABC):
    @abstractmethod
    def translate(self, legacy: LegacyOrder) -> ModernOrder:
        pass

class OrderTranslator(AntiCorruptionLayer):
    def translate(self, legacy: LegacyOrder) -> ModernOrder:
        from datetime import datetime
        return ModernOrder(
            id=legacy.order_id,
            customer_id=legacy.customer_code,
            items=[i.strip() for i in legacy.item_list.split(",")],
            total_cents=int(legacy.total_dollars * 100),
            created_at=datetime.strptime(legacy.created_dt, "%m/%d/%Y").isoformat()
        )

# Facade for legacy API
class LegacyOrderFacade:
    def __init__(self, legacy_api_url):
        self.api_url = legacy_api_url

    def get_order(self, order_id: str) -> LegacyOrder:
        # Simulated legacy API call
        return LegacyOrder(
            order_id=order_id,
            customer_code="CUST001",
            item_list="Widget A, Widget B, Gadget C",
            total_dollars=149.99,
            created_dt="01/15/2025"
        )

# Modern consumer
class OrderService:
    def __init__(self, translator: AntiCorruptionLayer, legacy_facade: LegacyOrderFacade):
        self.translator = translator
        self.legacy_facade = legacy_facade

    def get_modern_order(self, order_id: str) -> dict:
        legacy = self.legacy_facade.get_order(order_id)
        modern = self.translator.translate(legacy)
        return asdict(modern)
```

### Message Router with Content-Based Routing (Python)
```python
import json, enum
from typing import Callable

class Message:
    def __init__(self, body: dict, headers: dict = None):
        self.body = body
        self.headers = headers or {}

class RoutingRule:
    def __init__(self, name: str, condition: Callable[[Message], bool], destination: str):
        self.name = name
        self.condition = condition
        self.destination = destination

class ContentBasedRouter:
    def __init__(self):
        self.rules: list[RoutingRule] = []

    def add_rule(self, rule: RoutingRule):
        self.rules.append(rule)

    def route(self, message: Message) -> list[str]:
        destinations = []
        for rule in self.rules:
            if rule.condition(message):
                destinations.append(rule.destination)
        return destinations or ["dead-letter-queue"]

# Example usage
router = ContentBasedRouter()
router.add_rule(RoutingRule(
    name="high-value-orders",
    condition=lambda m: m.body.get("amount", 0) > 10000,
    destination="order-fulfillment-premium"
))
router.add_rule(RoutingRule(
    name="international-shipments",
    condition=lambda m: m.body.get("region") == "international",
    destination="shipping-international"
))
router.add_rule(RoutingRule(
    name="fraud-review",
    condition=lambda m: m.body.get("risk_score", 0) > 0.8,
    destination="fraud-detection"
))

msg = Message({"amount": 15000, "region": "domestic", "risk_score": 0.3})
print(router.route(msg))  # ['order-fulfillment-premium']
```

### Retry with Exponential Backoff (Python)
```python
import time, random
from functools import wraps

def retry_with_backoff(max_retries=3, base_delay=1.0, max_delay=30.0, jitter=True):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        if jitter:
                            delay = delay * (0.5 + random.random() * 0.5)
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator

@retry_with_backoff(max_retries=3, base_delay=1.0)
def call_downstream_service(url):
    # Simulated API call
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()
```

### Schema Registry Compatibility Check (Python)
```python
class SchemaRegistry:
    def __init__(self):
        self.schemas = {}

    def register_schema(self, subject: str, schema: dict, compatibility: str = "backward"):
        if subject in self.schemas:
            existing = self.schemas[subject][-1]
            if compatibility == "backward":
                self._check_backward_compatibility(existing, schema)
            elif compatibility == "forward":
                self._check_forward_compatibility(existing, schema)
            elif compatibility == "full":
                self._check_backward_compatibility(existing, schema)
                self._check_forward_compatibility(existing, schema)
        self.schemas.setdefault(subject, []).append(schema)

    def _check_backward_compatibility(self, existing, new_schema):
        existing_fields = {f["name"]: f for f in existing.get("fields", [])}
        for field in new_schema.get("fields", []):
            if field["name"] in existing_fields:
                if field.get("type") != existing_fields[field["name"]].get("type"):
                    raise ValueError(f"Field {field['name']} type changed from "
                                     f"{existing_fields[field['name']]['type']} to {field['type']}")
        print("Backward compatibility check passed")

    def _check_forward_compatibility(self, existing, new_schema):
        new_field_names = {f["name"] for f in new_schema.get("fields", [])}
        for field in existing.get("fields", []):
            if field["name"] not in new_field_names:
                if not field.get("optional", False):
                    raise ValueError(f"Field {field['name']} removed but not optional")
        print("Forward compatibility check passed")

registry = SchemaRegistry()
registry.register_schema("order-value", {
    "type": "record",
    "fields": [
        {"name": "order_id", "type": "string"},
        {"name": "amount", "type": "float"}
    ]
})
registry.register_schema("order-value", {
    "type": "record",
    "fields": [
        {"name": "order_id", "type": "string"},
        {"name": "amount", "type": "float"},
        {"name": "currency", "type": "string", "default": "USD"}
    ]
})
```

## Anti-Patterns

### Anti-Pattern 1: Point-to-Point Spaghetti
Every system connects directly to every other system. N systems create N² connections. Changes ripple across the entire network. Use a message broker or API gateway as a central routing point. Limit direct connections to stable, high-throughput paths.

### Anti-Pattern 2: The Single ESB Monolith
Routing, transformation, orchestration, protocol conversion, business rules — all in one ESB. The ESB becomes a monolith that is harder to change than any of the systems it connects. Decompose into discrete: message broker, API gateway, transformation service, workflow engine.

### Anti-Pattern 3: Synchronous Chaining
Service A calls B calls C calls D. Latency equals the sum of all four. Failure of D takes down A, B, and C. Use async messaging between non-real-time steps. Implement circuit breakers and timeouts. Consider CQRS to separate read/write.

### Anti-Pattern 4: Schema Evolution Without Consumers
Producer changes a message schema without notifying consumers. Consumers break silently. Always use a schema registry with compatibility checks. Notify consumer teams before schema changes. Version all schemas.

### Anti-Pattern 5: Unmonitored Dead Letter Queue
Messages fail, go to DLQ, but nobody monitors it. DLQ messages accumulate and eventually overflow retention. Critical business events are permanently lost. Monitor DLQ depth with alerts. Review DLQ content weekly. Have a reprocessing workflow.

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
  - references/api-gateway-patterns.md -- API Gateway Patterns

## Handoff
For monitoring integration SLAs, hand off to `enterprise-sla-management`. For data governance across integrations, hand off to `enterprise-data-governance`.
