# Enterprise Integration Architecture

## Overview

Enterprise integration architecture provides the foundational patterns, platforms, and governance for connecting systems across an organization. This reference covers integration platforms (Kafka, RabbitMQ, API Gateway, ESB), hybrid integration, cloud integration, iPaaS, integration patterns catalog, SOA vs microservices, integration governance, API management, and integration security.

## Integration Architecture Styles

### Point-to-Point Integration

Each system connects directly to every other system.

Characteristics:
- Simple to implement initially
- N*(N-1)/2 connections for N systems
- High maintenance as system count grows
- No central monitoring or governance
- Brittle - one change propagates to many connections

When to use: Small number of systems (2-5), short-term integrations, simple data flows.
When to avoid: More than 5 systems, when monitoring is needed, when governance matters.

### Hub-and-Spoke (ESB/Message Broker)

A central broker handles all routing, transformation, and protocol mediation.

Characteristics:
- Central integration point for all routing and transformation
- Reduces connections to N (each system connects once to hub)
- Centralized monitoring, governance, and error handling
- Single point of failure (mitigate with HA clustering)
- Can become a bottleneck and monolithic complexity

When to use: Enterprise-scale integration with many systems, centralized governance required.
When to avoid: When low latency is critical (adds hop), for extremely high throughput scenarios.

### Message Bus / Event-Driven Architecture

Systems communicate via a shared message bus with publish-subscribe semantics.

Characteristics:
- Loose coupling - producers and consumers independent
- Scalable - multiple consumers can process in parallel
- Event-driven - reactive, real-time
- Complex to debug (event flow can be hard to trace)
- Requires schema governance to prevent contract drift

When to use: Event-driven systems, real-time processing, microservices communication.
When to avoid: Simple request-response patterns, low-throughput scenarios.

### Event Mesh

A distributed architecture where events flow across multiple brokers in different environments.

Characteristics:
- Global event routing across clouds, regions, and on-premise
- Built-in reliability (store-and-forward between brokers)
- Complex to operate and manage
- Requires sophisticated monitoring

When to use: Multi-cloud, multi-region, large-scale event-driven architectures.

## Integration Platform Comparison

### RabbitMQ

Strengths:
- Mature, stable, well-documented
- Flexible routing (direct, topic, fanout, headers)
- Supports multiple protocols (AMQP, MQTT, STOMP)
- Reliable delivery with publisher confirms and consumer acks
- Simpler to operate than Kafka

Use Cases:
- Task queues and background job processing
- RPC-style request-reply patterns
- Workflow routing with complex routing logic
- Lower-throughput messaging (< 50K msg/s)

**HA Configuration**:
- 3-5 node cluster
- Quorum queues for HA (not mirrored queues)
- Publisher confirms for reliable publishing
- Consumer acknowledgments for reliable consumption

### Apache Kafka

Strengths:
- Extremely high throughput (millions of msg/s)
- Durable log-based storage with replay capability
- Strong partitioning and ordering guarantees
- Exactly-once semantics (with proper configuration)
- Rich ecosystem (Kafka Connect, Kafka Streams, ksqlDB)

Use Cases:
- Event streaming and event sourcing
- Log aggregation and data pipeline
- Real-time analytics and streaming ETL
- Large-scale data distribution

**HA Configuration**:
- 3-7 brokers in cluster
- Replication factor: 3
- Min in-sync replicas: 2
- acks=all for producer durability
- Unclean leader election disabled

### API Gateway (Kong, AWS API Gateway, Apigee)

Strengths:
- API management, versioning, and lifecycle
- Authentication and authorization (OAuth2, OIDC, API keys)
- Rate limiting and throttling
- Request/response transformation
- Analytics and monitoring

Use Cases:
- REST API management and governance
- Microservices API aggregation
- External API exposure with security controls
- API monetization (Apigee)

### ESB (Enterprise Service Bus)

Examples: MuleSoft, IBM Integration Bus, WSO2, Fuse

Strengths:
- Rich transformation capabilities (XSLT, DataWeave, Java)
- Protocol mediation (SOAP to REST, file to JMS, etc.)
- Orchestration of complex business processes
- Built-in error handling and retry mechanisms
- End-to-end monitoring and governance

Modern View: ESB is increasingly considered legacy. Modern integration prefers lighter alternatives: API Gateway for sync, Message Broker for async, and iPaaS for SaaS integration.

### Integration Platform as a Service (iPaaS)

Examples: MuleSoft Anypoint, Dell Boomi, Workato, SnapLogic

Strengths:
- SaaS/iPaaS: low ops overhead, managed platform
- Built-in connectors for common SaaS applications
- Low-code integration development
- Pre-built integration templates

Use Cases:
- SaaS-to-SaaS integration (Salesforce + Workday + NetSuite)
- Cloud-to-on-premise hybrid integration
- B2B integration with trading partners
- Quick integration projects (weeks, not months)

## Integration Patterns Catalog

### Message Construction Patterns

| Pattern | Purpose | Implementation |
|---|---|---|
| Command Message | Invoke an action | JMS message with action type header |
| Document Message | Pass data between systems | JSON/XML payload with data only |
| Event Message | Notify of state change | CloudEvent format |
| Request-Reply | Sync request with async response | Correlation ID matching |
| Return Address | Tell recipient where to reply | ReplyTo header |
| Correlation Identifier | Match request with reply | Unique ID in both directions |
| Message Expiration | Set TTL | Message TTL header |
| Format Indicator | Describe payload format | Content-Type header |

### Message Routing Patterns

| Pattern | Description | Use Case |
|---|---|---|
| Content-Based Router | Route based on message content | Route by order type, customer segment |
| Message Filter | Drop messages that don't match criteria | Filter test messages in production |
| Dynamic Router | Routing rules change at runtime | Business hours routing |
| Recipient List | Send to multiple destinations | Broadcast to multiple systems |
| Splitter | Split one message into many | Batch processing to individual items |
| Aggregator | Combine multiple messages into one | Correlate split messages back together |
| Resequencer | Reorder messages by sequence number | Handle out-of-order delivery |
| Routing Slip | Pre-defined chain of processing steps | Sequential validation pipeline |

### Message Transformation Patterns

| Pattern | Description | Implementation |
|---|---|---|
| Envelope Wrapper | Wrap existing data in message format | Add headers, protocol metadata |
| Content Enricher | Add data from external source | Enrich order with customer details |
| Content Filter | Remove unnecessary data | Strip internal fields before external send |
| Claim Check | Store large payload externally | Store in S3, pass reference in message |
| Normalizer | Transform different formats to canonical | Map multiple input formats to one output |
| Canonical Data Model | Standardize data format across systems | Common JSON schema for all integrations |

### System Management Patterns

| Pattern | Description | Best For |
|---|---|---|
| Dead Letter Channel | Store undeliverable messages | Poison message handling |
| Detour | Route message through intermediate step | Debugging, validation |
| Wire Tap | Inspect messages without affecting flow | Monitoring, auditing |
| Message Store | Capture all messages for analysis | Compliance, replay |
| Smart Proxy | Add services to existing flow | Caching, rate limiting |
| Test Message | Verify channel health | Heartbeat monitoring |
| Channel Purger | Remove stuck messages | Error recovery |

## Integration Governance

### API Governance

```yaml
api_governance:
  design_standards:
    - RESTful API design (OpenAPI 3.0)
    - Consistent naming conventions
    - Versioning strategy (URL or header based)
    - Error response format (RFC 7807 Problem Details)
  registration:
    - All APIs must be registered in API catalog
    - API owner assigned per API
    - Lifecycle status tracked
  security:
    - Authentication required for all APIs
    - Rate limiting per consumer
    - TLS 1.2+ required
    - Regular security scanning
```

### Schema Governance

```yaml
schema_governance:
  registry:
    tool: Confluent Schema Registry or Apicurio
    compatibility: BACKWARD (default)
    evolution_rules:
      - Only add optional fields
      - Do not remove fields
      - Do not change field types
      - Use default values for new fields
  enforcement:
    - Schema changes require backward-compatible evolution
    - New schema versions auto-validated in CI/CD
    - Breaking changes require new topic with consumer migration
    - Schema deprecation: 30-day notice before removal
```

### Integration SLA Management

```yaml
integration_slas:
  metrics_per_integration:
    - p99 latency (target: < 500ms for sync, < 5s for async)
    - Throughput (msg/s or requests/s)
    - Error rate (target: < 0.1%)
    - Availability (target: 99.9%)
    - DLQ depth (alert if > 100 messages)
  monitoring:
    - End-to-end distributed tracing (OpenTelemetry)
    - Integration health dashboard per flow
    - Automated alerting on SLA breach
    - Weekly SLA compliance report
```

## Integration Security

### Transport Security
- TLS 1.2+ for all external endpoints
- mTLS for sensitive machine-to-machine communication
- Network segmentation for integration components
- VPC/network ACLs restricting access to brokers and gateways

### Message Security

```yaml
message_security:
  encryption:
    in_transit: TLS 1.3
    at_rest: AES-256 (Kafka topic encryption or DB encryption)
    payload: Application-level encryption for sensitive data
  authentication:
    api: OAuth2 client credentials (machine-to-machine)
    messaging: SASL/SCRAM or mTLS for Kafka/RabbitMQ
    file: SSH keys for SFTP
  authorization:
    - ACL-based access control for topics/queues
    - API key or OAuth2 scopes for API access
    - Least privilege principle for producers and consumers
  audit:
    - Log all integration events (produce, consume, fail)
    - Immutable audit log for compliance requirements
    - Trace message lifecycle from origin to destination
```

## Integration Architecture Decision Framework

### Technology Selection by Use Case

| Requirement | Recommended Technology | Reason |
|---|---|---|
| Simple task queue | RabbitMQ, SQS | Easy to operate, reliable delivery |
| High-throughput event stream | Kafka, Kinesis | Log-based, replayable, high throughput |
| Real-time streaming analytics | Kafka Streams, Flink | Stream processing built-in |
| External API management | Kong, Apigee, AWS API GW | Rate limiting, auth, documentation |
| File-based batch transfer | SFTP, S3 + SNS/SQS | Large files, legacy system support |
| SaaS integration | iPaaS (Boomi, Workato) | Pre-built connectors, low code |
| Service mesh (internal comms) | Istio, Linkerd | Sidecar proxy, mTLS, observability |
| Database change capture | Debezium (Kafka Connect) | CDC from databases to event streams |

## Integration Operations

### Daily Operations
- Review DLQ depth for critical integrations
- Verify throughput trends vs baseline
- Check SLA compliance for p99 latency
- Review error rates for anomalies

### Incident Response
1. Detect: monitoring alert (latency spike, DLQ growth, error rate increase)
2. Assess: producer or consumer issue? Network or application?
3. Isolate: stop bad messages, quarantine failed payloads
4. Fix: resolve root cause (replay, reconnect, reprocess)
5. Recover: reprocess DLQ messages, verify data integrity
6. Document: post-mortem, preventive measures

### Capacity Planning
- Track peak throughput per integration flow
- Plan for 2x headroom on broker clusters
- Monitor disk usage for Kafka (retention-based) and queues
- Scale partitions when consumer lag exceeds threshold



## Change Data Capture (CDC)

### Architecture Overview

CDC captures database changes in real-time and streams them to downstream consumers.

```yaml
cdc_architecture:
  capture_methods:
    log_based:
      description: Read database transaction log (WAL, binlog)
      tools: [Debezium, Maxwell, GoldenGate, AWS DMS]
      overhead: Minimal (< 2% DB performance)
      supported_dbs: [PostgreSQL, MySQL, SQL Server, Oracle, MongoDB, DB2]
    trigger_based:
      description: Database trigger captures changes to audit table
      overhead: Medium (trigger overhead per row operation)
      advantage: Works with any database
      disadvantage: Triggers affect source transaction performance
    polling:
      description: Application polls for changes using timestamp columns
      tools: [Apache Camel, custom implementation]
      overhead: Depends on polling frequency
      best_for: [Legacy systems, when log-based not available]

  debezium_configuration:
    name: "order-connector"
    connector.class: "io.debezium.connector.postgresql.PostgresConnector"
    database.hostname: "postgres-primary"
    database.port: 5432
    database.user: "${DB_USER}"
    database.password: "${DB_PASSWORD}"
    database.dbname: "orders_db"
    database.server.name: "orders-pg"
    slot.name: "debezium_orders"
    plugin.name: "pgoutput"
    publication.name: "debezium_pub"
    publication.autocreate.mode: "filtered"
    table.include.list: "public.orders,public.order_items"
    topic.prefix: "cdc"
    transforms: "unwrap,reroute"
    transforms.unwrap.type: "io.debezium.transforms.ExtractNewRecordState"
    transforms.unwrap.drop.tombstones: false
    transforms.reroute.type: "io.debezium.transforms.ByLogicalTableRouter"
    transforms.reroute.topic.regex: "(.*)orders(.*)"
    transforms.reroute.topic.replacement: "cdc.orders"
    key.converter: "org.apache.kafka.connect.json.JsonConverter"
    value.converter: "org.apache.kafka.connect.json.JsonConverter"
    heartbeat.interval.ms: 5000
    snapshot.mode: "initial"
    poll.interval.ms: 1000
    max.batch.size: 2048
    max.queue.size: 8192
    retriable.restart.wait.ms: 10000
```

### CDC Event Format

```json
{
  "schema": {
    "type": "struct",
    "fields": [
      {"field": "before", "type": "struct", "fields": [
        {"field": "order_id", "type": "int64", "optional": false},
        {"field": "customer_id", "type": "int64"},
        {"field": "status", "type": "string"},
        {"field": "total_amount", "type": "float64"}
      ]},
      {"field": "after", "type": "struct", "fields": [
        {"field": "order_id", "type": "int64"},
        {"field": "customer_id", "type": "int64"},
        {"field": "status", "type": "string"},
        {"field": "total_amount", "type": "float64"}
      ]},
      {"field": "op", "type": "string"},
      {"field": "ts_ms", "type": "int64"},
      {"field": "transaction", "type": "struct"}
    ]
  },
  "payload": {
    "before": {
      "order_id": 12345,
      "customer_id": 9876,
      "status": "PENDING",
      "total_amount": 250.00
    },
    "after": {
      "order_id": 12345,
      "customer_id": 9876,
      "status": "CONFIRMED",
      "total_amount": 250.00
    },
    "op": "u",
    "ts_ms": 1704067200000,
    "transaction": {
      "id": "1234-5678-9012-3456",
      "total_order": 1,
      "data_collection_order": 1
    }
  }
}
```

### CDC Operational Concerns

```yaml
cdc_operations:
  schema_changes:
    - "Debezium handles most schema changes automatically"
    - "DROPPED column: data included in before/after until restart"
    - "ADDED column: appears in after after schema change detected"
    - "Breaking schema changes trigger connector failure"
  backfill:
    - "Snapshot mode: initial captures existing data first"
    - "Snapshot can be rescheduled with snapshot.mode=custom"
    - "Large tables: use snapshot.fetch.size for chunking"
    - "Signal table for ad-hoc snapshot requests"
  failure_scenarios:
    - "Connector crash: resumes from last committed offset"
    - "Database failover: update connector config with new host"
    - "Topic deletion: requires snapshot resync"
    - "Schema registry changes: may break serialization"
  monitoring:
    - "Track lag: source-to-connector and connector-to-topic"
    - "Monitor snapshot progress for large tables"
    - "Alert on connector failures or error rate spikes"
    - "Track historical record counts per topic"
  capacity:
    - "Kafka topic: partitions based on table key cardinality"
    - "Retention: match downstream consumer replay needs"
    - "Throughput: CDC adds 1-5% overhead to source database"
    - "Storage: CDC topics grow proportionally to change rate"
```

## Saga Pattern with Compensation

### Choreography-Based Saga

```yaml
saga_choreography:
  order_flow:
    - command: "OrderCreated"
      service: "Order Service"
      event: "OrderCreated"
    - command: "ReserveInventory"
      service: "Inventory Service"
      event: "InventoryReserved"
    - command: "ProcessPayment"
      service: "Payment Service"
      event: "PaymentProcessed"
    - command: "ShipOrder"
      service: "Shipping Service"
      event: "OrderShipped"
      final: "OrderFulfilled"
  compensation:
    - trigger: "PaymentFailed"
      compensations:
        - service: "Inventory Service"
          action: "ReleaseReservedInventory"
          event: "InventoryReleased"
    - trigger: "ShippingFailed"
      compensations:
        - service: "Payment Service"
          action: "RefundPayment"
          event: "PaymentRefunded"
        - service: "Inventory Service"
          action: "ReleaseReservedInventory"
          event: "InventoryReleased"
  messaging_pattern:
    - "Each service publishes domain events after local transaction"
    - "Services subscribe to events they act on"
    - "Compensation events undo previous actions"
    - "No central coordinator needed"
```

### Orchestration-Based Saga

```yaml
saga_orchestration:
  orchestrator: "OrderSagaOrchestrator"
  state_machine:
    initial: "PENDING"
    states:
      PENDING:
        actions: ["CreateOrder"]
        on_success: "RESERVING_INVENTORY"
        on_failure: "FAILED"
      RESERVING_INVENTORY:
        actions: ["ReserveInventory"]
        on_success: "PROCESSING_PAYMENT"
        on_failure: "CANCELLING_ORDER"
      PROCESSING_PAYMENT:
        actions: ["ProcessPayment"]
        on_success: "SHIPPING"
        on_failure: "RELEASING_INVENTORY"
      SHIPPING:
        actions: ["ShipOrder"]
        on_success: "COMPLETED"
        on_failure: "REFUNDING_PAYMENT"
      CANCELLING_ORDER:
        compensation: "CancelOrder"
        transition: "FAILED"
      RELEASING_INVENTORY:
        compensation: "ReleaseInventory"
        transition: "FAILED"
      REFUNDING_PAYMENT:
        compensation: "RefundPayment"
        transition: "RELEASING_INVENTORY"
      COMPLETED:
        final: true
      FAILED:
        final: true
```

## API Versioning Strategies

### URL Path Versioning

```yaml
url_versioning:
  pattern: "/api/v{version}/resource"
  example: "/api/v2/orders"
  pros:
    - Simple and explicit version identification
    - Easily cacheable (different URLs, different cache entries)
    - Backward compatible without conflict
  cons:
    - URL pollution with version identifiers
    - Increases API surface over time
    - Requires deprecation cycle for old versions
  tooling:
    - "API Gateway routes v1 -> old service, v2 -> new service"
    - "Canary: route 10% to v2, 90% to v1"
```

### Header-Based Versioning

```yaml
header_versioning:
  pattern: "Accept: application/vnd.myapp.v2+json"
  example: "Accept: application/vnd.myapp.v2+json"
  pros:
    - Clean URLs, version in content negotiation
    - Version tied to media type semantics
    - Supports multiple representations (JSON, XML, Protobuf)
  cons:
    - Less visible in logs and debugging
    - Browser and tooling incompatibility with custom media types
    - Requires client to set header correctly
  implementation:
    - "API Gateway reads Accept header and routes accordingly"
    - "Default to latest version if header missing"
```

### Query Parameter Versioning

```yaml
query_versioning:
  pattern: "/api/orders?version=2"
  example: "/api/orders?version=2"
  pros:
    - Simple client implementation
    - Easy URL-based testing
    - Query parameter is optional (default to latest)
  cons:
    - URL ambiguity (same URL with different versions)
    - Caching complications
    - No formal media type semantics
  recommendation: "Avoid for public APIs; acceptable for internal"
```

### Deprecation Strategy

```yaml
api_deprecation:
  process:
    phase_1:
      action: "Announce deprecation"
      duration: "3 months before sunset"
      communication: ["API changelog", "Developer portal notice", "Email to registered consumers"]
    phase_2:
      action: "Add deprecation headers"
      headers:
        Sunset: "Sat, 01 Nov 2025 00:00:00 GMT"
        Warning: "299 - 'API version 1 is deprecated'"
      duration: "2 months"
    phase_3:
      action: "Soft 429 rate limiting"
      limit: "100 requests/hour for deprecated version"
      duration: "1 month"
    phase_4:
      action: "Return 410 Gone with migration link"
      response:
        status: 410
        body: {error: "API version 1 is removed. See /docs/migration/v1-to-v2"}
      final: true
```

## Integration Testing Strategies

### Contract Testing

```yaml
contract_testing:
  provider_contracts:
    - "OpenAPI specification for REST APIs"
    - "AsyncAPI specification for event-driven APIs"
    - "gRPC protobuf definitions"
    - "Avro/Protobuf schema for Kafka topics"
  consumer_driven:
    tool: "Pact"
    workflow:
      - "Consumer defines expected interactions in Pact file"
      - "Pact file published to Pact Broker"
      - "Provider verifies against Pact file in CI"
      - "Can I deploy? check validates compatibility"
    example:
      consumer: "Order Service"
      provider: "Inventory Service"
      interaction: "Order Service expects GET /inventory/{sku} returns stock level"

  schema_testing:
    - "Validate message format against Avro/Protobuf schema"
    - "Schema compatibility checks in CI (backward, forward, full)"
    - "Breaking schema changes block deployment"
    - "Schema registry enforces compatibility rules"
```

### Integration Test Environments

```yaml
test_environments:
  local:
    approach: "Testcontainers for dependent services"
    tools: ["Testcontainers", "LocalStack", "MockServer"]
    speed: Fast
    isolation: Complete
    confidence: Medium (mock behavior may differ from production)
  shared_staging:
    approach: "Dedicated integration environment with real dependencies"
    tools: ["Kubernetes + Helm", "Docker Compose", "Terraform"]
    speed: Slow (provisioning time)
    isolation: Shared
    confidence: High
  ephemeral:
    approach: "Review apps or preview environments per PR"
    tools: ["GitHub Actions + Terraform", "Helm + ArgoCD"]
    speed: Medium (5-15 min provision)
    isolation: Complete per PR
    confidence: High
    cost: Higher infrastructure cost
```

### Test Data Management

```yaml
test_data_management:
  strategies:
    synthetic:
      approach: "Generate test data programmatically"
      tools: ["Faker", "Java Faker", "DataFactory"]
      best_for: "Unit and integration tests with known data shapes"
      limitation: "Data may not match production distribution"
    masked_production:
      approach: "Clone production data with PII masked"
      tools: ["Delphix", "IBM Optim", "Tonic.ai", "custom masking scripts"]
      best_for: "Performance tests, data-volume tests"
      limitation: "Masking must preserve referential integrity"
    subset:
      approach: "Extract subset of production data relevant to tests"
      tools: ["pg_sample", "custom SQL with sampling"]
      best_for: "Large datasets where full size is impractical"
      limitation: "Subset may not represent edge cases"
  lifecycle:
    - "Test data seeded per test run (idempotent)"
    - "Data cleaned after test execution"
    - "Test data versioning for reproducibility"
    - "Data contracts between test suites"
```

## B2B Integration Patterns

### EDI to API Translation

```yaml
edi_integration:
  documents:
    - edi_850: "Purchase Order"
    - edi_856: "Advanced Shipping Notice"
    - edi_810: "Invoice"
    - edi_820: "Payment Order/Remittance Advice"
    - edi_997: "Functional Acknowledgment"
  translation_flow:
    - "Receive EDI X12 document via AS2 or SFTP"
    - "Parse EDI segments and elements"
    - "Transform to canonical JSON/XML format"
    - "Route to internal API"
    - "Generate 997 acknowledgment back to trading partner"
  tools:
    - "Open Source: Bots, python-edi, edilib"
    - "Commercial: Cleo, SEEBURGER, IBM Sterling"
    - "iPaaS: Boomi EDI, MuleSoft Anypoint EDI"
  operational_concerns:
    - "Trading partner onboarding: 2-4 weeks per partner"
    - "EDI version coordination (4010, 5010, etc.)"
    - "Testing with test trading partner profiles"
    - "Audit trail for all EDI transactions (7-year retention)"
    - "Duplicate detection within trading partner windows"
```

### AS2 Protocol Configuration

```yaml
as2_configuration:
  connection:
    url: "https://trading-partner.com/as2"
    as2_from: "MyCompany"
    as2_to: "TradingPartner"
    subject: "EDI Test"
    content_type: "application/EDI-X12"
  encryption:
    algorithm: "AES-256-CBC"
    certificate: "trading-partner-public.cer"
  signing:
    algorithm: "SHA-256"
    certificate: "my-company-private.p12"
  mdn:
    type: "signed"
    return_url: "https://my-company.com/as2/mdn"
    timeout: 3600
  retry:
    max_attempts: 5
    backoff: exponential
    initial_delay: 300
```

## Transaction Management Across Distributed Systems

### Two-Phase Commit (2PC)

```yaml
two_phase_commit:
  phase_1_prepare:
    - "Transaction coordinator sends prepare to all participants"
    - "Each participant: execute transaction, hold locks, write prepare log"
    - "Each participant votes: YES (ready to commit) or NO (abort)"
  phase_2_commit_or_abort:
    - "All YES: coordinator sends commit to all participants"
    - "Any NO: coordinator sends abort to all participants"
    - "Each participant: release locks, write final log entry"
  issues:
    - "Coordinator becomes single point of failure"
    - "Locks held during prepare phase reduce concurrency"
    - "Network partition: participants blocked waiting for coordinator"
    - "Not suitable for long-running transactions"
  modern_replacement:
    - "Saga pattern (choreographed or orchestrated)"
    - "Idempotent operations with retry"
    - "Outbox pattern for reliable message delivery"
```

### Outbox Pattern

```yaml
outbox_pattern:
  mechanism:
    - "Application writes business data + outbox record in same DB transaction"
    - "Separate process (outbox relay) reads outbox table"
    - "Outbox relay publishes messages to message broker"
    - "Outbox record deleted after successful publication"
  table_schema:
    table: "outbox"
    columns:
      - id: UUID PRIMARY KEY
      - aggregate_type: VARCHAR
      - aggregate_id: VARCHAR
      - event_type: VARCHAR
      - payload: JSONB
      - created_at: TIMESTAMP
      - published_at: TIMESTAMP NULL
    indexes:
      - created_at WHERE published_at IS NULL
  implementations:
    - "Transactional Outbox (custom implementation)"
    - "Debezium outbox event router (CDC-based)"
    - "NServiceBus, MassTransit (for .NET)"
    - "Temporal, Camunda (for workflow-based)"
```

## Error Handling Patterns for Integration

### Retry Strategies

```yaml
retry_strategies:
  immediate_retry:
    delay: 0
    max_retries: 3
    use_case: "Transient network errors, connection timeouts"
  fixed_delay:
    delay: 1000
    max_retries: 5
    use_case: "Service temporarily unavailable, rate limiting"
  exponential_backoff:
    initial_delay: 100
    multiplier: 2
    max_delay: 30000
    max_retries: 5
    jitter: true
    use_case: "Throttling, contention, retry storms"
  progressive_delay:
    delays: [100, 500, 2000, 10000, 60000]
    use_case: "Known degradation patterns, maintenance windows"
```

### Circuit Breaker Pattern

```yaml
circuit_breaker:
  states:
    closed:
      description: "Normal operation, requests pass through"
      conditions:
        - error_threshold: 50
        - window_seconds: 60
      transition: "Open when threshold exceeded"
    open:
      description: "Requests blocked, fast failure"
      duration: 30000
      transition: "Half-open after timeout"
    half_open:
      description: "Test request allowed to check recovery"
      conditions:
        - test_requests: 3
        - success_threshold: 0.8
      transition: "Closed if threshold met, open if not"
  implementation:
    - "Resilience4j (Java)"
    - "Polly (.NET)"
    - "Istio circuit breaker (envoy-based)"
    - "Hystrix (Netflix, deprecated)"
```

### Dead Letter Queue (DLQ) Management

```yaml
dlq_management:
  causes:
    - "Invalid message format or schema"
    - "Missing data for enrichment"
    - "Downstream service unavailable"
    - "Business rule violation"
    - "Processing timeout or deadlock"
  operations:
    monitoring:
      - "DLQ depth gauge per queue"
      - "Alert when DLQ depth exceeds threshold"
      - "Track message age in DLQ"
    analysis:
      - "View message headers and payload"
      - "Identify error cause and patterns"
      - "Group by error type for trend analysis"
    recovery:
      - "Fix root cause"
      - "Replay individual messages"
      - "Bulk replay with filtering"
      - "Expire messages beyond retention period"
    automation:
      - "Auto-retry with backoff for transient errors"
      - "Dead letter aging: expire after defined period"
      - "Dead letter archival to long-term storage"
```

## Integration Observability

### OpenTelemetry Integration

```yaml
opentelemetry:
  tracing:
    propagation:
      - "W3C Trace Context (traceparent, tracestate)"
      - "B3 propagation (Zipkin format)"
    sampling:
      strategy: "probability-based"
      rate: 0.1
      head_based: true
    attributes:
      - "messaging.system: kafka"
      - "messaging.destination: orders"
      - "messaging.operation: receive"
      - "messaging.message_id: 12345"
      - "messaging.consumer_group: order-processor"
  metrics:
    instruments:
      - name: "messaging.message.count"
        type: counter
        description: "Messages processed"
      - name: "messaging.message.duration"
        type: histogram
        description: "Message processing duration"
        unit: ms
      - name: "messaging.consumer.lag"
        type: gauge
        description: "Consumer lag in messages"
  logging:
    - "Structured JSON logging with trace_id, span_id"
    - "Correlation ID across integration chain"
    - "Log level escalation on error threshold"
  dashboards:
    integration_overview:
      - "Throughput (msg/s) per integration flow"
      - "Response time (p50, p95, p99)"
      - "Error rate (%) per flow"
      - "DLQ depth per queue/topic"
      - "Consumer lag per partition"
    health:
      - "Integration flow status (up/down)"
      - "SLA compliance per flow"
      - "Certificate expiry dates"
      - "Connection status per endpoint"
```

## Schema Evolution Strategies

### Avro Schema Evolution

```yaml
avro_evolution:
  backward_compatible:
    allowed:
      - "Adding optional field with default"
      - "Removing field that has default"
      - "Widening type (int -> long)"
      - "Adding enum symbol (with default)"
    forbidden:
      - "Removing field without default"
      - "Narrowing type (long -> int)"
      - "Removing enum symbols"
  forward_compatible:
    allowed:
      - "Adding field with default"
      - "Removing field (old data missing new field)"
      - "Adding enum symbol"
    forbidden:
      - "Removing field without default"
      - "Changing field type incompatibly"
  full_compatible (backward + forward):
    allowed:
      - "Adding optional field with default"
      - "Removing optional field with default"
    forbidden:
      - "Any change that breaks either direction"
  compatibility_change_process:
    - "Check current schema compatibility mode"
    - "Register new schema version"
    - "Validate compatibility (schematool or CI check)"
    - "Reject incompatible changes with error message"
    - "Rollback: revert to previous schema version"
```

## AsyncAPI for Event-Driven Design

```yaml
asyncapi_specification:
  structure:
    asyncapi: "3.0.0"
    info:
      title: "Order Events API"
      version: "1.0.0"
    channels:
      order_created:
        address: "orders.created"
        messages:
          OrderCreated:
            $ref: "#/components/messages/OrderCreated"
      order_status_changed:
        address: "orders.status.{status}"
        messages:
          OrderStatusChanged:
            $ref: "#/components/messages/OrderStatusChanged"
    operations:
      publishOrderCreated:
        action: publish
        channel: "orders.created"
        summary: "Notify when order is created"
        message:
          $ref: "#/components/messages/OrderCreated"
      subscribeOrderFailed:
        action: receive
        channel: "orders.created"
        summary: "Process failed orders"
        message:
          $ref: "#/components/messages/OrderCreated"
    components:
      messages:
        OrderCreated:
          headers:
            type: object
            properties:
              contentType:
                type: string
                enum: ["application/json"]
          payload:
            type: object
            properties:
              orderId:
                type: string
                format: uuid
              customerId:
                type: string
              items:
                type: array
                items:
                  $ref: "#/components/schemas/OrderItem"
              totalAmount:
                type: number
        OrderStatusChanged:
          payload:
            type: object
            properties:
              orderId:
                type: string
                format: uuid
              previousStatus:
                type: string
              newStatus:
                type: string
              timestamp:
                type: string
                format: date-time
```

## Integration Deployment Strategies

### Blue-Green Integration Deployment

```yaml
blue_green:
  integration:
    - "Maintain two integration environments (blue and green)"
    - "Route production traffic to active environment"
    - "Deploy new version to inactive environment"
    - "Validate in inactive environment with shadow traffic"
    - "Switch traffic to inactive environment"
    - "Previous version retains connectivity for rollback"
  rollback:
    - "Immediate: switch traffic back to previous environment"
    - "No data loss: both environments share same data stores"
    - "Verify connectivity: automated health checks on both"
```

### Canary Integration Deployment

```yaml
canary_deployment:
  traffic_splitting:
    - "API Gateway routes: 95% v1, 5% v2"
    - "Monitor v2: error rate, latency, throughput"
    - "Escalate if v2 shows degradation"
    - "Gradual shift: 25%, 50%, 75%, 100%"
  integration_specific:
    - "Kafka: dual consumers (v1 and v2) during transition"
    - "Replace v1 consumer with v2 after validation"
    - "Topic versioning for rollback: revert to v1 consumer"
  metrics:
    - "Error rate ratio: v2/v1 < 1.5x"
    - "p99 latency ratio: v2/v1 < 1.2x"
    - "Throughput: v2 matches or exceeds v1"
```

## Integration Performance Testing

```yaml
performance_testing:
  test_types:
    load_test:
      purpose: "Verify system handles expected production load"
      approach: "Gradually increase load to projected peak"
      tools: ["k6", "Gatling", "Locust"]
    stress_test:
      purpose: "Find breaking point and recovery behavior"
      approach: "Increase load until failure, then reduce"
      tools: ["k6", "JMeter"]
    endurance_test:
      purpose: "Detect memory leaks and degradation over time"
      approach: "Sustained load for 24-72 hours"
      tools: ["k6", "Gatling"]
    spike_test:
      purpose: "Handle sudden traffic surges"
      approach: "Instant 5-10x load increase"
      tools: ["k6", "Locust"]
  integration_specific_metrics:
    - "Broker throughput (msg/s produce and consume)"
    - "Consumer lag (messages, time delay)"
    - "DLQ growth rate under load"
    - "Connection pool utilization"
    - "Message processing latency distribution"
    - "Schema registry lookup latency"
```

## Integration Compliance and Audit

```yaml
integration_compliance:
  audit_trail:
    requirements:
      - "Every message capture: origin, destination, timestamp, payload hash"
      - "Immutable audit log (write once, never modify)"
      - "Retention: 7 years (financial), 1 year (operational)"
      - "Searchable by message ID, correlation ID, time range"
    implementation:
      - "Kafka topics with infinite retention for audit"
      - "S3 archival of audit events with S3 Object Lock"
      - "Immutable database (Amazon QLDB, TimescaleDB)"
      - "Signed audit events with hash chains"

  data_residency:
    requirements:
      - "Messages containing EU personal data stay in EU region"
      - "Cross-region routing requires data classification header"
      - "Integration platforms must support region-scoped deployments"
    implementation:
      - "Regional Kafka clusters with topic-level data routing"
      - "API Gateway with region-affinity routing"
      - "Data classification header enforced: no cross-region routing"
      - "Audit log of data crossing boundaries"

  sox_compliance:
    requirements:
      - "Segregation of duties: read vs write access to financial data"
      - "Approval workflow for integration changes"
      - "Access reviews every 90 days"
      - "No direct database access from integrations"
    implementation:
      - "Integration governance board approval for financial flows"
      - "API-level access controls with OAuth2 scopes"
      - "Quarterly access certification campaigns"
      - "Immutable audit trail for all financial transactions"
```

## Integration Maturity Model

```yaml
maturity_model:
  level_1_initial:
    characteristics:
      - "Point-to-point connections"
      - "No standard integration pattern"
      - "No monitoring or governance"
      - "Manual error handling"
    action_items:
      - "Document all existing integrations"
      - "Adopt messaging middleware"

  level_2_managed:
    characteristics:
      - "Centralized message broker"
      - "Basic monitoring (up/down)"
      - "Documented integration patterns"
      - "Manual error recovery from DLQ"
    action_items:
      - "Implement API gateway for REST APIs"
      - "Standardize on schema registry"

  level_3_defined:
    characteristics:
      - "API-first integration design"
      - "Schema governance enforced"
      - "Automated monitoring and alerting"
      - "CI/CD for integration deployments"
    action_items:
      - "Implement contract testing"
      - "Adopt event-driven architecture patterns"

  level_4_measured:
    characteristics:
      - "SLA monitoring with automated compliance reporting"
      - "Chaos engineering for integration resilience"
      - "Self-healing error recovery"
      - "Capacity planning based on predictive analytics"
    action_items:
      - "Implement chaos testing for integration paths"
      - "Automated performance regression detection"

  level_5_optimized:
    characteristics:
      - "Autonomous integration platform"
      - "AI-driven anomaly detection and remediation"
      - "Continuous optimization of throughput and cost"
      - "Self-service integration for business users"
    action_items:
      - "Implement AI-assisted integration monitoring"
      - "Self-service integration portal"
```

## References

- event-driven-integration.md -- Event-Driven Integration
- integration-patterns-fundamentals.md -- Integration Patterns Fundamentals
- integration-styles.md -- Enterprise Integration Styles
- message-routing.md -- Message Routing Patterns
- integration-architectures.md -- Integration Architectures
- etl-integration.md -- ETL Integration Patterns
- integration-patterns-advanced.md -- Advanced Integration Patterns
