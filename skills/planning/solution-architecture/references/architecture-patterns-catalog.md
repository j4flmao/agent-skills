# Architecture Patterns Catalog

## Overview

This catalog is the authoritative reference for architecture patterns used across solution designs. Each pattern entry includes when to use, when NOT to use, key trade-offs, implementation considerations, and real-world examples. Use this catalog during architecture design, trade-off analysis, and architecture reviews.

Patterns are organized by category. For quick selection, use the decision tree at the top of each category.

## Architectural Styles Decision Tree

```
System characteristics?
├── Simple CRUD, low complexity, small team
│   └── Layered Architecture
├── Complex domain logic, high testability needs
│   └── Hexagonal (Ports & Adapters) or Clean Architecture
├── Event-heavy, async workflows, real-time reactions
│   └── Event-Driven Architecture
├── Independent deployability, team autonomy, polyglot
│   └── Microservices (caution: start with modular monolith)
├── UI composition, multiple frontend teams
│   └── Microfrontend
├── Real-time, bidirectional, live updates
│   └── WebSocket / SSE Architecture
├── Streaming data, real-time analytics
│   └── Kappa or Lambda Architecture
├── Query performance, read-write separation
│   └── CQRS
├── Distributed transaction across services
│   └── Saga (choreography or orchestration)
├── Existing monolith to split gradually
│   └── Strangler Fig
├── Multiple client types, separate backends per UI
│   └── Backend for Frontend (BFF)
├── Need to evolve architecture continuously
│   └── Evolutionary Architecture
└── Unknown, need to validate before scaling
    └── Start with Monolith, extract when boundaries emerge
```

## Architectural Patterns

### Layered Architecture (N-Tier)

| Aspect | Description |
|--------|-------------|
| Also known as | N-tier, traditional layered |
| Problem | Separation of concerns in straightforward applications |
| Solution | Organize code into horizontal layers (Presentation → Business → Persistence → Database) |
| When to use | Simple CRUD apps, small teams, short-lived projects |
| When NOT to use | Complex domain logic, high testability needs, long-lived systems |

#### Trade-offs
```
Positive:
- Simple mental model, easy to learn
- Clear separation of concerns
- Well-understood by most developers
- Good for rapid prototyping

Negative:
- Layers are a leaky abstraction (business logic leaks into presentation)
- Single database becomes bottleneck
- Hard to test (business logic depends on persistence)
- Poor scalability (vertical only without significant refactoring)
- Can degenerate into "big ball of mud" without discipline
```

#### Implementation Guidance
```yaml
implementation:
  structure:
    - "Controller / API layer: handles HTTP, serialization, validation"
    - "Service layer: business logic, orchestration"
    - "Repository layer: data access, ORM"
    - "Domain layer: business entities, rules"
  
  rules:
    - "Dependencies flow downward (Presentation → Service → Repository → Database)"
    - "No skipping layers (Presentation never directly accesses Database)"
    - "Upper layers depend on lower layers via interfaces"
  
  variants:
    - "Strict layered: each layer only depends on the layer directly below"
    - "Relaxed layered: upper layer can depend on any lower layer"
```

### Hexagonal Architecture (Ports & Adapters)

| Aspect | Description |
|--------|-------------|
| Also known as | Ports & Adapters |
| Problem | Framework-dependent business logic, hard-to-test core |
| Solution | Core domain is isolated from external concerns via ports (interfaces) and adapters (implementations) |
| When to use | DDD projects, high testability, long-lived systems |
| When NOT to use | Simple CRUD, prototypes, tiny team |

#### Trade-offs
```
Positive:
- Domain logic is pure, framework-independent, and testable
- Easy to swap infrastructure (DB, message queue, external API)
- Clear separation of business logic from technical concerns
- Excellent for test-driven development

Negative:
- More initial structure and interfaces
- Abstraction overhead for simple operations
- Can be over-engineered for simple applications
- Team needs to understand the pattern
```

#### Implementation Guidance
```yaml
implementation:
  structure:
    domain:
      - "Entities and value objects"
      - "Repository interfaces (ports)"
      - "Domain services"
      - "Domain events"
    
    application:
      - "Use cases / application services"
      - "Input/output ports (DTOs)"
      - "Command/query objects for CQRS"
    
    infrastructure:
      - "Database adapters (JPA repositories)"
      - "Message queue adapters"
      - "External API clients"
      - "Framework configuration"
    
    presentation:
      - "REST controllers"
      - "GraphQL resolvers"
      - "gRPC endpoints"
  
  dependency_rule:
    - "Domain: NO external dependencies"
    - "Application: depends only on Domain"
    - "Infrastructure: depends on Domain + Application (via ports)"
    - "Presentation: depends on Application (via ports)"
```

### Event-Driven Architecture (EDA)

| Aspect | Description |
|--------|-------------|
| Problem | Loose coupling, async processing, real-time reactions |
| Solution | Components communicate via events through a message broker |
| When to use | Async workflows, audit trails, real-time updates, microservices |
| When NOT to use | Simple synchronous flows, ACID-critical transactions, simple CRUD |

#### Event Types

```yaml
event_types:
  domain_event:
    description: "Something significant happened in the domain"
    naming: "past tense (OrderPlaced, PaymentReceived)"
    semantics: "Fire-and-forget, multiple consumers"
    examples: ["OrderPlaced", "InventoryDepleted", "UserRegistered"]
  
  command:
    description: "Request an action"
    naming: "imperative (ReserveInventory, ChargePayment)"
    semantics: "Exactly-once, targeted to specific handler"
    examples: ["SendEmail", "ProcessRefund", "ReserveStock"]
  
  notification:
    description: "Informational, no action expected"
    naming: "past tense or passive (UserLoggedIn, SystemHealthy)"
    semantics: "At-most-once, subscribers are optional"
    examples: ["UserLoggedIn", "CacheEvicted", "SearchIndexed"]
```

#### Trade-offs
```
Positive:
- Loose coupling (producers don't know consumers)
- Scalability (independent consumers can scale differently)
- Resilience (broker buffers during consumer downtime)
- Auditability (event log is an immutable record)
- Real-time processing capability

Negative:
- Eventual consistency (temporary inconsistency is inherent)
- Debugging complexity (distributed flow is harder to trace)
- Schema evolution complexity (all consumers must handle changes)
- No central workflow visibility
- Exactly-once delivery is difficult
```

### Microservices Architecture

| Aspect | Description |
|--------|-------------|
| Problem | Independent deployability, team autonomy, polyglot |
| Solution | Decompose system into independently deployable services, each owning a bounded context |
| When to use | Large team (multiple teams), independent scaling needs, polyglot requirements |
| When NOT to use | Small team (< 10), simple application, unclear domain boundaries |

#### Trade-offs
```
Positive:
- Independent deployability and scalability
- Team autonomy and ownership
- Technology diversity (choose right tool per service)
- Fault isolation (one service failure doesn't cascade fully)
- Organizational alignment (Conway's Law)

Negative:
- Distributed systems complexity (network, consistency, debugging)
- Operational overhead (monitoring, deployment, CI/CD)
- Data consistency challenges (eventual consistency)
- Testing complexity (integration testing across services)
- Network latency overhead
- Team maturity required (DevOps, observability, on-call)
```

#### Service Decomposition Guidance

```yaml
decomposition:
  good_boundaries:
    - "Service aligns with a business capability"
    - "Service can be owned by a single team"
    - "Service has a clear data ownership boundary"
    - "Service can be deployed independently"
    - "Service communicates via well-defined APIs or events"
  
  bad_boundaries:
    - "Service per CRUD entity (entity service anti-pattern)"
    - "Services that share a database"
    - "Services that require coordinated deployment"
    - "Services with unclear ownership"
  
  common_anti_patterns:
    - "Distributed monolith: services but deployed together, shared DB"
    - "Entity service: every DB table becomes a microservice"
    - "Tunnel vision: over-focus on service boundaries, ignores data"
```

### Modular Monolith

| Aspect | Description |
|--------|-------------|
| Problem | Balance of modularity and operational simplicity |
| Solution | Single deployment unit with strong module boundaries (like microservices but in-process) |
| When to use | Medium team, uncertain boundaries, need to move fast, eventual migration to microservices |
| When NOT to use | Need independent scaling of modules, teams need independent deploy |

#### Trade-offs
```
Positive:
- Operational simplicity of monolith (single deploy, single process)
- Strong module boundaries (enforced via tooling, not just convention)
- No network overhead between modules
- Can extract services later when boundaries are proven
- Simpler testing, debugging, and deployment

Negative:
- Modules are not independently deployable
- Single scaling unit (can't scale hot modules independently)
- Single process can be resource-constrained
- Requires discipline to maintain module boundaries
```

## Integration Patterns

### Request-Reply (Synchronous)

| Aspect | Description |
|--------|-------------|
| Protocols | REST, gRPC, GraphQL |
| When to use | Queries, commands needing immediate response, CRUD operations |
| When NOT to use | Long-running operations, broadcast to multiple consumers, high-throughput write paths |

### Async Messaging (Pub-Sub)

| Aspect | Description |
|--------|-------------|
| Protocols | Kafka, RabbitMQ, SQS/SNS, Pulsar |
| When to use | Event notifications, workload distribution, decoupling producers from consumers |
| When NOT to use | Request-response pattern, low-throughput simple queuing |

### Change Data Capture (CDC)

| Aspect | Description |
|--------|-------------|
| Tools | Debezium, Kafka Connect, AWS DMS |
| When to use | Database changes need to be reflected in other systems, audit logging, cache invalidation |
| When NOT to use | Real-time requirements with strong consistency, when application-level events are adequate |

### Stream Processing

| Aspect | Description |
|--------|-------------|
| Tools | Kafka Streams, Apache Flink, Spark Streaming |
| When to use | Real-time analytics, continuous computation, data transformation pipelines |
| When NOT to use | Batch-only workloads, when latency requirements are relaxed |

### API Gateway

| Aspect | Description |
|--------|-------------|
| Tools | Kong, APISIX, Envoy, AWS API Gateway |
| When to use | Unified entry point, cross-cutting concerns (auth, rate-limit, routing) |
| When NOT to use | Simple service, single client type, when gateway would be a bottleneck |

### Backend for Frontend (BFF)

| Aspect | Description |
|--------|-------------|
| Problem | Different client needs (mobile vs. web), over-fetching, under-fetching |
| Solution | Dedicated backend per client type, tailored API for each |
| When to use | Multiple distinct client types, different data needs per client |
| When NOT to use | Single client type, when GraphQL federation suffices |

## Database Patterns

### Database per Service

| Aspect | Description |
|--------|-------------|
| Problem | Shared database creates coupling between services |
| Solution | Each microservice owns its database, accessed only through that service's API |
| When to use | Microservices, bounded context enforcement |
| When NOT to use | Simple applications, monolith, where strong consistency across services is critical |

### CQRS with Event Sourcing

| Aspect | Description |
|--------|-------------|
| Problem | Different read and write workloads, audit trail requirement |
| Solution | Separate commands (write model) from queries (read model). Use event store as source of truth. |
| When to use | Audit trails, temporal queries, complex read-side optimization needed |
| When NOT to use | Simple CRUD, where event store complexity outweighs benefits |

### Saga

| Aspect | Description |
|--------|-------------|
| Problem | Distributed transaction across multiple services |
| Solution | Sequence of local transactions with compensating actions for rollback |
| When to use | Multi-service operations requiring data consistency across boundaries |
| When NOT to use | Single-service transaction, when strong consistency is required |

### Polyglot Persistence

| Aspect | Description |
|--------|-------------|
| Problem | One database type doesn't fit all workloads |
| Solution | Use different database technologies for different service needs |
| When to use | Mixed workloads (transactional, analytical, search, graph) |
| When NOT to use | Simple applications, small team, when operational overhead exceeds benefit |

## Caching Patterns

| Pattern | Read Strategy | Write Strategy | Consistency | Best For |
|---------|--------------|----------------|-------------|----------|
| Cache-Aside | Read cache, miss → read DB → populate cache | Write DB, invalidate cache | Eventual | General purpose |
| Read-Through | Cache reads from DB automatically | Write DB, cache updates asynchronously | Eventual | Transparent caching |
| Write-Through | Cache reads from DB | Write cache + DB synchronously | Strong | Data consistency critical |
| Write-Behind | Same as write-through | Write cache, async flush to DB | Weak | High write throughput |
| Refresh-Ahead | Cache predicts and pre-loads | — | Eventual | Predictable read patterns |
| CDN | Edge cache for static/dynamic content | Purge/Invalidate | Eventual | Global static content |

## Resilience Patterns

| Pattern | Problem | Implementation | Considerations |
|---------|---------|---------------|----------------|
| Circuit Breaker | Cascading failures | Three states: Closed, Open, Half-Open. Trip on threshold. | Recovery timeout, half-open probe count |
| Retry with Backoff | Transient failures | Exponential backoff + jitter | Must be idempotent, max retries |
| Bulkhead | Resource exhaustion | Isolate resources per client/operation | Thread pool or semaphore per partition |
| Rate Limiter | Overload, abuse | Token bucket, sliding window | Per-client, per-endpoint limits |
| Timeout | Hanging dependencies | Deadline-based, per-call timeout | Tune per dependency, never infinite |
| Health Check | Unhealthy instances | Readiness + Liveness probes | TCP, HTTP, gRPC health checks |
| Graceful Degradation | Partial failure | Strip functionality, serve degraded | Cache critical features |
| Dead Letter Queue | Unprocessable messages | Route failures to DLQ | Monitor DLQ, reprocess after fix |

## Security Patterns

| Pattern | Problem | Implementation |
|---------|---------|---------------|
| Auth Gateway | Centralized auth | OAuth2 proxy, gateway auth plugin |
| Zero Trust | No implicit trust | mTLS, SPIFFE, workload identity, verify every call |
| Token Exchange | Service-to-service auth | OAuth2 token exchange, JWT with audience |
| Secrets Rotation | Stale credentials | Vault, automatic rotation, short-lived tokens |
| Defense in Depth | Multi-layer protection | WAF → Auth → Rate Limit → Input Validation → Audit |
| Least Privilege | Blast radius | RBAC, ABAC, IAM scoped roles |
| Data Classification | Varying sensitivity | Encryption, masking, tiered access based on classification |

## Cloud-Native Patterns

| Pattern | Problem | Solution | Example |
|---------|---------|----------|---------|
| Service Discovery | Service location | DNS, service registry, K8s Services | Consul, CoreDNS |
| External Configuration | Config without rebuild | ConfigMaps, vault, environment | Vault, K8s ConfigMap |
| Sidecar | Cross-cutting helpers | Co-located container | Envoy, Istio sidecar |
| Ambassador | External connectivity proxy | Gateway proxy | Envoy, NGINX |
| Adapter | Interface normalization | Monitoring/metrics adapter | Prometheus exporter, OTEL collector |
| Leader Election | Single active coordinator | Lease, lock | etcd, ZooKeeper, K8s Lease |
| Stateless Service | Horizontal scaling | External state | Session in Redis, stateless app |

## Data Architecture Patterns

| Pattern | When to Use | Trade-off |
|---------|-------------|-----------|
| Data Lake | Raw data storage, ML, schema-on-read flexibility | Governance challenges, data swamp risk |
| Data Warehouse | Structured BI, reporting, schema-on-write discipline | Rigid schema, ETL maintenance |
| Lakehouse | Lake flexibility + warehouse reliability + ACID | Complexity, vendor lock-in |
| Data Mesh | Domain-owned data, large org, decentralized | Governance complexity, maturity needed |
| Medallion (Bronze/Silver/Gold) | Data refinement pipeline | Simple but well-proven pattern |
| Kappa Architecture | Single streaming pipeline (no batch) | Stream processing complexity |
| Lambda Architecture | Batch + stream (historical + real-time) | Two code paths, maintenance cost |

## Frontend Architecture Patterns

| Pattern | When to Use | Tools |
|---------|-------------|-------|
| SPA (Single Page App) | Rich interactive UI, client routing | React, Vue, Angular |
| SSR (Server-Side Rendering) | SEO, initial load performance, social preview | Next.js, Nuxt, SvelteKit |
| SSG (Static Site Generation) | Content sites, docs, blogs | Astro, 11ty, Hugo |
| ISR (Incremental Static Regeneration) | Dynamic content with acceptable staleness | Next.js ISR |
| MPA (Multi-Page App) | Simple sites, server-rendered per page | Laravel, Rails, Django |
| Microfrontend | Multiple teams, independent deploy | Module Federation, single-spa |
| Islands Architecture | Partial hydration, minimal JS | Astro, Fresh |
| PWA (Progressive Web App) | Offline support, installable | Workbox, service workers |
| Streaming SSR | Progressive rendering, better TTFB | React Server Components, Suspense |
| Edge Rendering | Global low-latency, personalized | Cloudflare Workers, Vercel Edge |

## Pattern Selection Checklist

```
For each pattern under consideration:

[ ] Does this pattern solve an ACTUAL problem we have?
[ ] What new problems does this pattern introduce?
[ ] Do we have the team expertise to implement this correctly?
[ ] Can we start with a simpler version of this pattern?
[ ] Is there a proven implementation at our scale?
[ ] What is our exit strategy if this pattern doesn't work?
[ ] How does this pattern interact with other patterns we're using?
[ ] What degree of coupling does this pattern introduce between teams?
[ ] How does this pattern affect our deployment and operations?
[ ] Is this pattern aligned with our long-term technology strategy?
```

## Key Points

- No pattern is universally good or bad — every pattern has specific contexts where it excels and contexts where it creates problems
- Start with the simplest pattern that could work — complexity should be earned, not assumed
- Patterns interact in complex ways — evaluating a pattern in isolation ignores how it combines with other choices
- Team maturity is a critical selection factor — a pattern that works for a senior team may fail catastrophically for a junior team
- Document why a pattern was chosen AND rejected — future architects need to understand the reasoning
- Be aware of anti-patterns: distributed monolith (worst of both worlds), entity service (over-decomposition), golden hammer (one-pattern-fits-all)
- Most successful architectures use 2-4 patterns together — a single pattern rarely solves all concerns
- Re-evaluate pattern choices as the system evolves — what was right at 10K users may be wrong at 10M
- Patterns are not goals — using microservices doesn't make an architecture good; solving business problems effectively does
- Invest in fitness functions that enforce pattern adherence — without enforcement, patterns degrade into anti-patterns over time
