# Reference Architectures for Solution Architects

## Overview

Reference architectures are canonical, reusable architecture blueprints for common solution types. They capture proven patterns, best practices, and trade-off decisions that can be adapted to specific contexts. This guide provides reference architectures for the most common solution categories.

## Reference Architecture 1: E-Commerce Platform

### Business Context

```
Use Case: Online retail platform selling physical and digital goods
Scale: 1M MAU, 50K daily orders, 500K product SKUs
Key Differentiators: Personalized recommendations, real-time inventory, multi-tenant marketplace
Compliance: PCI DSS (payment data), GDPR (customer data)
```

### Architecture Diagram (C4 Level 2)

```
                     ┌─────────────┐
                     │   CDN       │
                     │  (CloudFront)│
                     └──────┬──────┘
                            │
┌──────────┐     ┌─────────▼────────┐     ┌──────────────┐
│ Mobile   │────▶│   API Gateway    │◀────│  Web App     │
│ App      │     │  (Kong/APISIX)   │     │  (Next.js)   │
└──────────┘     └──┬──────┬──────┬─┘     └──────────────┘
                    │      │      │
                    ▼      ▼      ▼
            ┌────────┐ ┌────────┐ ┌────────┐
            │Product │ │ Order  │ │Catalog │
            │Service │ │Service │ │Service │
            └───┬────┘ └───┬────┘ └───┬────┘
                │          │          │
                ▼          ▼          ▼
            ┌────────┐ ┌────────┐ ┌────────┐
            │Postgres│ │Postgres│ │Elastic │
            │Product │ │ Order  │ │Search  │
            └────────┘ └───┬────┘ └────────┘
                           │
                           ▼
                     ┌──────────┐
                     │  Kafka   │
                     └──┬───────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │Recommend │ │Inventory │ │Analytics │
     │Consumer  │ │Consumer  │ │Pipeline  │
     └──────────┘ └──────────┘ └──────────┘
```

### Key Architecture Decisions

```yaml
adr-001:
  title: "Database per Service"
  decision: "Each business capability owns its database"
  rationale: "Service autonomy, independent scaling, bounded context enforcement"
  tradeoff: "Cross-service queries require API composition or CQRS"

adr-002:
  title: "Event-Driven Inventory Updates"
  decision: "Order events → Kafka → Inventory consumer"
  rationale: "Real-time stock updates without synchronous coupling"
  tradeoff: "Eventual consistency: brief over-selling window"

adr-003:
  title: "Search via Dedicated Index"
  decision: "Elasticsearch for product catalog search"
  rationale: "Full-text search, faceted navigation, typo tolerance"
  tradeoff: "Dual-write (Postgres + ES) requires sync mechanism"

adr-004:
  title: "Payment Isolation"
  decision: "Payment processing isolated in dedicated service with PCI scope"
  rationale: "PCI DSS scope reduction, tokenization, audit separation"
  tradeoff: "Additional service complexity, payment service is single point of failure"
```

### Scaling Model

```
Current:   1M MAU, 50K orders/day
6 months:  3M MAU, 150K orders/day
12 months: 5M MAU, 300K orders/day

Scaling approach:
  - Stateless services: horizontal (HPA based on CPU + request rate)
  - Product DB: read replicas (1 → 3 → 5)
  - Order DB: shard by customer_id (2 → 4 → 8 shards)
  - Search: add replica nodes (3 → 6 → 10)
  - Cache: Redis cluster (3 → 6 → 9 nodes)
  - Kafka: increase partitions (6 → 12 → 24)
```

## Reference Architecture 2: SaaS Multi-Tenant Platform

### Business Context

```
Use Case: B2B SaaS platform with tenant isolation and per-tenant customization
Scale: 100 tenants (10 large, 90 SMB), 100K total users
Key Differentiators: Tenant-specific features, per-tenant data isolation, usage-based billing
Compliance: SOC 2 Type II, GDPR
```

### Architecture Pattern: Silo + Pool Hybrid

```yaml
tenant_isolation:
  large_enterprise:
    pattern: "silo"
    infrastructure: "Dedicated EKS cluster per tenant"
    database: "Dedicated RDS instance per tenant"
    justification: "Compliance requirements, performance isolation, custom SLAs"
  
  smb:
    pattern: "pool"
    infrastructure: "Shared EKS cluster with namespace isolation"
    database: "Shared Postgres with row-level security (RLS)"
    justification: "Cost efficiency, simpler operations, standard SLAs"
  
  data_isolation:
    - "RLS policies on shared tables for pooled tenants"
    - "Tenant ID in every query (enforced via middleware)"
    - "Cross-tenant data access triggers security alert"
```

### Tenant Lifecycle

```
Provisioning flow:
  1. Tenant signs up → onboarding workflow triggered
  2. If silo: Create dedicated K8s namespace + DB instance
  3. If pool: Create tenant record, apply RLS policy
  4. Run schema migration for tenant context
  5. Configure tenant-specific features (feature flags)
  6. Provision DNS + TLS certificate
  7. Verify tenant health endpoint
  8. Mark tenant active → enable user login

Deprovisioning flow:
  1. Initiate tenant offboarding
  2. Set tenant to read-only mode (30-day grace)
  3. Export tenant data on request
  4. After grace period: delete tenant data
  5. If silo: decommission dedicated resources
  6. Clean up DNS, certificates, monitoring
```

### Billing and Metering

```yaml
metering:
  events:
    - "API call volume (per endpoint)"
    - "Storage usage (GB per tenant)"
    - "Active users (DAU/MAU)"
    - "Compute time (CPU-seconds)"
  
  pipeline:
    - "Each service emits usage events to Kafka"
    - "Metering consumer aggregates hourly"
    - "Usage data stored in time-series DB"
    - "Billing system queries aggregated usage"
  
  pricing_models:
    flat_rate: "Fixed monthly per tenant"
    per_seat: "Per active user per month"
    usage_based: "Per API call or per GB stored"
    tiered: "Flat + usage overage"
```

## Reference Architecture 3: Real-Time Analytics Platform

### Business Context

```
Use Case: Real-time event processing with sub-second analytics and dashboards
Scale: 1B events/day, 100K events/sec peak, 30-day data retention
Key Differentiators: Sub-second query latency, ad-hoc analysis, real-time alerting
```

### Architecture (Kappa Pattern)

```
┌──────────┐    ┌──────────┐    ┌──────────────────────┐
│  Mobile  │    │   Web    │    │   Server-side SDK    │
│  SDK     │    │  SDK     │    │   (API events)        │
└────┬─────┘    └────┬─────┘    └──────────┬───────────┘
     │               │                     │
     └───────────────┼─────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Event Gateway │
            │  (load balancer)│
            └───────┬────────┘
                    │
                    ▼
            ┌────────────────┐
            │  Kafka Cluster │
            │  (24 partitions)│
            └───┬───┬───┬────┘
                │   │   │
     ┌──────────┘   │   └──────────┐
     ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Stream   │ │ Stream   │ │  Batch       │
│ Processor│ │ Processor│ │  Processor   │
│ (Flink)  │ │ (Flink)  │ │  (Spark)     │
└──┬───────┘ └──┬───────┘ └──────┬───────┘
   │            │                │
   ▼            ▼                ▼
┌────────┐ ┌────────┐ ┌────────────┐
│Real-time│ │Metrics │ │  Cold      │
│Store    │ │ (Redis) │ │  Storage   │
│(Druid)  │ │        │ │  (S3/Parq)│
└────┬────┘ └────────┘ └────────────┘
     │
     ▼
┌──────────────┐
│  Dashboard   │
│  (Grafana)   │
└──────────────┘
```

### Data Model

```yaml
event_schema:
  name: "analytics_event"
  version: "2.0"
  
  fields:
    - name: "event_id"
      type: "uuid"
      required: true
    
    - name: "event_type"
      type: "string"
      required: true
      enum: ["page_view", "click", "purchase", "signup", "custom"]
    
    - name: "tenant_id"
      type: "string"
      required: true
    
    - name: "user_id"
      type: "string"
      required: true
    
    - name: "session_id"
      type: "string"
      required: true
    
    - name: "timestamp"
      type: "datetime"
      required: true
    
    - name: "properties"
      type: "map<string, any>"
      required: false
    
    - name: "context"
      type: "object"
      required: false
      properties:
        user_agent: "string"
        ip: "string"
        referrer: "string"
        device: "string"
        os: "string"
        browser: "string"
```

### Query Patterns

```sql
-- Real-time count (last 5 minutes)
SELECT COUNT(*) FROM realtime_page_views
WHERE timestamp > NOW() - INTERVAL '5 minutes'
  AND tenant_id = 'tenant-123';

-- Top pages (last hour)
SELECT page_path, COUNT(*) as views
FROM events
WHERE event_type = 'page_view'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY page_path
ORDER BY views DESC
LIMIT 10;

-- User funnel
SELECT
  COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN user_id END) as page_viewers,
  COUNT(DISTINCT CASE WHEN event_type = 'signup' THEN user_id END) as signups,
  COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) as purchasers
FROM events
WHERE timestamp > NOW() - INTERVAL '7 days';
```

## Reference Architecture 4: Data Platform / Lakehouse

### Business Context

```
Use Case: Central data platform for analytics, ML, and reporting
Scale: 50TB raw data, 200 data sources, 500 internal users (analysts, data scientists)
Key Differentiators: Self-service analytics, data quality, governance, ML pipeline integration
```

### Architecture (Medallion + Mesh Hybrid)

```
┌─────────────────────────────────────────────────────────────┐
│                    Ingestion Layer                           │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────────┐   │
│  │Batch   │  │Stream  │  │CDC     │  │API Connector   │   │
│  │(Airflow)│  │(Kafka) │  │(Debezium)│  │(Fivetran/Airbyte) │
│  └───┬────┘  └───┬────┘  └───┬────┘  └───────┬────────┘   │
│      └───────────┼────────────┼────────────────┘            │
└──────────────────┼────────────┼─────────────────────────────┘
                   │            │
                   ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Bronze Layer (Raw)                        │
│                  Object Store (S3 / ADLS)                    │
│            Format: Parquet (as-is, schema-on-read)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Silver Layer (Cleaned)                    │
│                  Delta Lake / Iceberg Tables                 │
│            - Deduplicated, validated, enriched               │
│            - Business entities (customers, orders)           │
│            - Slowly changing dimensions                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gold Layer (Aggregated)                   │
│                  - Data marts, metric stores                 │
│                  - Pre-aggregated for BI tools               │
│                  - Feature store for ML                      │
└────────┬───────────────────────────────┬────────────────────┘
         │                               │
         ▼                               ▼
┌──────────────┐              ┌──────────────────┐
│  BI & Analytics            │  ML & Data Science │
│  (Looker, Superset)         │  (Jupyter, MLflow) │
│  - Dashboards               │  - Model training  │
│  - Ad-hoc queries            │  - Experimentation  │
│  - Scheduled reports        │  - Feature serving  │
└─────────────────────────┘  └──────────────────┘
```

### Data Product Contracts

```yaml
data_product:
  name: "customer_360"
  owner: "Customer Data Team"
  domain: "Customer"
  sla:
    freshness: "15 minutes"
    completeness: "99.9%"
    availability: "99.5%"
  
  schema:
    - name: "customer_id"
      type: "string"
      description: "Unique customer identifier"
    - name: "email"
      type: "string"
      description: "Customer email address"
    - name: "total_orders"
      type: "integer"
      description: "Lifetime order count"
    - name: "ltv"
      type: "float"
      description: "Lifetime value in USD"
    - name: "segment"
      type: "string"
      enum: ["new", "active", "at_risk", "churned"]
  
  quality_checks:
    - "No null customer_ids"
    - "Email format validation"
    - "total_orders >= 0"
    - "No duplicate customer_ids"
```

## Reference Architecture 5: Event-Driven Microservices

### Business Context

```
Use Case: Highly scalable, loosely coupled system with complex business workflows
Scale: 50+ services, 1000+ events/sec, distributed across 3 regions
Key Differentiators: Workflow automation, auditability, asynchronous processing
```

### Communication Patterns

```yaml
sync_communication:
  use_for: "Queries, immediate responses, idempotent lookups"
  pattern: "REST + gRPC"
  rules:
    - "No synchronous calls in critical business paths"
    - "All sync calls must have circuit breakers"
    - "Maximum sync call depth: 3 services"
    - "Query services maintain local cache"

async_communication:
  use_for: "Commands, events, long-running workflows"
  pattern: "Event-driven via Kafka"
  event_types:
    domain_event:
      description: "Something happened (past tense)"
      examples: ["OrderPlaced", "PaymentReceived", "ShipmentCreated"]
      semantics: "Fire-and-forget, multiple consumers"
    
    command:
      description: "Request an action (imperative)"
      examples: ["ReserveInventory", "ChargePayment", "SendEmail"]
      semantics: "Exactly-once delivery, idempotent"
    
    notification:
      description: "Informational, no action required"
      examples: ["UserLoggedIn", "PageVisited", "SearchPerformed"]
      semantics: "At-most-once, acceptable to lose"
  
  reliability:
    - "Producers: exactly-once semantics with idempotent producers"
    - "Consumers: at-least-once with idempotent processing"
    - "DLQ: all failed events routed here for analysis"
    - "Retry: exponential backoff with max 3 retries"
```

### Saga Pattern Implementation

```yaml
order_fulfillment_saga:
  type: "orchestration"
  orchestrator: "Order Saga Manager"
  
  steps:
    - name: "Reserve Inventory"
      type: "try"
      compensation: "Release Inventory"
      timeout: "30 seconds"
    
    - name: "Process Payment"
      type: "try"
      compensation: "Refund Payment"
      timeout: "60 seconds"
    
    - name: "Create Shipment"
      type: "try"
      compensation: "Cancel Shipment"
      timeout: "30 seconds"
  
  state_machine:
    - state: "PENDING"
      on: "order_placed"
      transition: "RESERVING_INVENTORY"
    
    - state: "RESERVING_INVENTORY"
      on: "inventory_reserved"
      transition: "PROCESSING_PAYMENT"
      on: "inventory_reservation_failed"
      transition: "FAILED"
    
    - state: "PROCESSING_PAYMENT"
      on: "payment_processed"
      transition: "CREATING_SHIPMENT"
      on: "payment_failed"
      transition: "COMPENSATING_INVENTORY"
    
    - state: "COMPENSATING_INVENTORY"
      on: "inventory_released"
      transition: "FAILED"
    
    - state: "CREATING_SHIPMENT"
      on: "shipment_created"
      transition: "COMPLETED"
      on: "shipment_creation_failed"
      transition: "COMPENSATING_PAYMENT"
    
    - state: "COMPENSATING_PAYMENT"
      on: "payment_refunded"
      transition: "COMPENSATING_INVENTORY"
    
    - state: "COMPLETED"
      final: true
    
    - state: "FAILED"
      final: true
```

## Reference Architecture Selection Guide

| Solution Type | Primary Pattern | Key Considerations |
|--------------|----------------|-------------------|
| E-commerce | Event-driven microservices + CQRS | Payment isolation, inventory consistency, search |
| SaaS multi-tenant | Silo + pool hybrid | Tenant isolation, metering, per-tenant customization |
| Real-time analytics | Kappa (single stream) | Event schema evolution, query performance, data retention |
| Data platform | Medallion lakehouse | Data quality, governance, schema evolution |
| Content management | Monolith-first + modular monolith | Simple domain, extensions via plugins |
| IoT / Edge | Event-driven + edge compute | Offline capability, bandwidth optimization, device management |
| Financial services | Event sourcing + CQRS | Audit trail, regulatory compliance, transaction integrity |
| Internal tools | Layered monolith or BFF | Rapid development, limited scale, team size |
| API / Integration | API gateway + message broker | Protocol translation, rate limiting, SLA management |
| AI/ML platform | Lakehouse + feature store + model serving | Data versioning, experiment tracking, model governance |

## Key Points

- Reference architectures are starting points, not final designs — every context requires adaptation based on specific NFRs, team capabilities, and constraints
- Document deviations from the reference architecture as ADRs — understanding WHY you diverged is as valuable as knowing you followed the pattern
- Each reference architecture embodies specific trade-offs — understand them before adopting: e.g., event-driven architectures offer scalability at the cost of consistency complexity
- Choose isolation patterns based on compliance requirements, not just scale — silo patterns protect tenants but multiply operational costs
- The medallion architecture (bronze/silver/gold) provides a proven path from raw data to business insights — add a governance layer for production maturity
- Saga patterns require careful compensation design — every step must have a rollback that maintains data integrity
- Event schema evolution is a critical concern — use schema registry with compatibility checks to prevent silent data corruption
- Reference architectures should include failure modes — the most valuable knowledge is what breaks and how to recover
- Adapt reference architectures to team topology using Conway's Law — architecture mirrors communication structure
- Review reference architecture fit quarterly — as the system evolves, the optimal pattern may shift
