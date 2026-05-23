# Solution Architecture Pattern Catalog

## Architecture Style Decision Tree

```
System characteristics?
├── Simple CRUD, low complexity
│   └── Layered Architecture
├── Complex domain logic, DDD
│   └── Hexagonal (Ports & Adapters) or Clean Architecture
├── Event-heavy, async, reactive
│   └── Event-Driven Architecture
├── Independent deployability, team autonomy
│   └── Microservices
├── UI composition, multiple frontend teams
│   └── Microfrontend
├── Real-time, bidirectional communication
│   └── WebSocket / SSE Architecture
├── Streaming data, real-time analytics
│   └── Kappa / Lambda Architecture
├── Query performance, read-heavy
│   └── CQRS
├── Distributed transaction across services
│   └── Saga (choreography or orchestration)
├── Existing monolith to split gradually
│   └── Strangler Fig
└── Mobile + API consumers, separate backend per UI
    └── Backend for Frontend (BFF)
```

## Pattern Catalog

### Architectural Patterns

| Pattern | Also Known As | When to Use | When NOT to Use |
|---------|--------------|-------------|-----------------|
| **Layered** | N-tier, Onion | CRUD apps, small teams, simple domains | Complex domains, high testability needs |
| **Hexagonal** | Ports & Adapters | DDD projects, high testability, framework-agnostic core | Simple CRUD, prototypes |
| **Clean Architecture** | Uncle Bob | Enterprise apps, long-lived systems, strict dependency rule | Small projects, tight deadlines |
| **Event-Driven** | Event Sourcing, Pub-Sub | Async workflows, audit trails, real-time updates | Simple synchronous flows, ACID-critical |
| **CQRS** | Command Query Separation | Different read/write workloads, complex queries | Simple CRUD, single-model-fits-all |
| **Saga** | Choreography / Orchestration | Multi-service transactions, compensation logic | Single-service transactions, strong consistency |
| **Strangler Fig** | Incremental Migration | Legacy migration, monolith decomposition | Greenfield projects |
| **Microservices** | SOA 2.0 | Team autonomy, independent scaling, polyglot | Small team, simple app, no clear boundaries |
| **BFF** | Backend for Frontend | Multiple client types (mobile, web, IoT) | Single client, or use GraphQL instead |
| **Space-Based** | Tuple Spaces, Grid | Extreme scale, low-latency, high-availability | Normal scale, simple apps |
| **Peer-to-Peer** | P2P, Mesh | Decentralized systems, file sharing, blockchain | Centralized authority needed |

### Integration Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Request-Reply** | Sync operations, need immediate response | REST, gRPC |
| **Async Messaging** | Decouple producers/consumers, buffering | Kafka, RabbitMQ |
| **Event Notification** | Publish state changes, loose coupling | Webhooks, Event Bus |
| **Event Sourcing** | Audit trail, temporal queries, event replay | Axon, EventStore |
| **CDC** | Database changes to downstream | Debezium, Kafka Connect |
| **Bidirectional Sync** | Two systems need mutual updates | GraphQL subscriptions, WebSocket |
| **Batch Processing** | Scheduled bulk operations, ETL | Spring Batch, Airflow |
| **Stream Processing** | Real-time analytics, continuous computation | Flink, Kafka Streams |
| **API Gateway** | Unified entry, routing, auth, rate-limit | Kong, APISIX, Envoy |
| **Service Mesh** | Inter-service comm, observability, security | Istio, Linkerd |

### Database Patterns

| Pattern | When to Use | Anti-Pattern |
|---------|-------------|-------------|
| **Single Database** | Simple apps, tight consistency | Shared database in microservices |
| **Database per Service** | Service autonomy, bounded context | Cross-service joins in app layer |
| **CQRS with Event Sourcing** | Audit trail, temporal queries | Using events as single source of truth for reads |
| **Saga** | Distributed transactions | Using distributed transactions (2PC) in microservices |
| **Strangler Fig DB** | Database migration | Big-bang migration |
| **Polyglot Persistence** | Different storage needs per service | Same data in multiple stores without sync |
| **Read Replicas** | Read-heavy workloads | Stale reads for critical data |
| **Sharding** | Horizontal scaling, data distribution | Cross-shard queries |

### Caching Patterns

| Pattern | When to Use | Eviction |
|---------|-------------|----------|
| **Cache-Aside** | General purpose, app-managed | TTL + manual invalidation |
| **Read-Through** | Transparent to app, cache manages DB load | TTL |
| **Write-Through** | Strong consistency between cache and DB | No stale data, but write penalty |
| **Write-Behind** | High write throughput, async persistence | Risk of data loss |
| **Refresh-Ahead** | Predictable access patterns | Might load unused data |
| **CDN Caching** | Static assets, edge delivery | PURGE/INVALIDATE API |

### Resilience Patterns

| Pattern | Problem Solved | Implementation |
|---------|---------------|----------------|
| **Circuit Breaker** | Cascading failures, slow dependencies | Resilience4j, Hystrix |
| **Retry with Backoff** | Transient failures | Exponential backoff + jitter |
| **Bulkhead** | Resource exhaustion from one client | Thread pool isolation, semaphores |
| **Rate Limiter** | Overload protection | Token bucket, sliding window |
| **Timeout** | Hanging dependencies | Deadline-based, per-call timeout |
| **Health Check** | Detect unresponsive services | `/health` endpoint, readiness/liveness |
| **Graceful Degradation** | Partial functionality when dependent fails | Feature flags, fallback responses |
| **Throttling** | Client overuse | Quota management, request queuing |

### Security Patterns

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| **Auth Gateway** | Centralized auth enforcement | OAuth2 proxy, API Gateway |
| **Zero Trust** | No implicit trust, verify every call | mTLS, SPIFFE, workload identity |
| **Token Exchange** | Service-to-service auth | OAuth2 token exchange, JWT |
| **API Key Rotation** | External API clients | Key rotation schedule, dual-key |
| **Secrets Rotation** | Database creds, API tokens | Vault, automatic rotation |
| **Defense in Depth** | Multi-layer security | WAF + Auth + Rate Limit + Audit |
| **Least Privilege** | Minimize blast radius | RBAC, ABAC, IAM roles |
| **Data Classification** | Different protection per sensitivity | Encryption, masking, access tiers |

### Frontend Architecture Patterns

| Pattern | When to Use | Tools |
|---------|-------------|-------|
| **SPA** | Rich interactive UI, client-side routing | React, Vue, Angular |
| **SSR** | SEO, initial load performance, social preview | Next.js, Nuxt, SvelteKit |
| **SSG** | Content sites, docs, blogs, marketing | Astro, 11ty, Hugo |
| **ISR** | Dynamic content that can be stale-slightly | Next.js ISR |
| **MPA** | Simple sites, server-rendered per page | Laravel, Rails, Django |
| **Microfrontend** | Multiple teams, independent deploy, composition | Module Federation, single-spa |
| **Islands** | Partial hydration, minimal JS | Astro, Fresh |
| **PWA** | Offline support, installable, native-like | Workbox, service workers |
| **Streaming SSR** | Progressive rendering, TTFB improvement | React Server Components, Suspense |
| **Edge Rendering** | Global low-latency, personalized content | Cloudflare Workers, Vercel Edge |

### Cloud-Native Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| **Service Discovery** | How services find each other | DNS, Consul, K8s Services |
| **External Configuration** | Config changes without rebuild | ConfigMaps, Vault, AppConfig |
| **Sidecar** | Cross-cutting concerns without modifying app | Envoy, Istio sidecar |
| **Ambassador** | Proxy external connectivity | Service mesh gateway, NGINX |
| **Adapter** | Normalize monitoring/metrics interfaces | Prometheus exporter, OpenTelemetry collector |
| **Leader Election** | Single active instance for coordination | ZooKeeper, etcd, K8s Lease |
| **Two-Phase Change** | Configuration rollout with rollback | Blue/green, canary, feature flags |
| **Health Endpoint** | Platform knows service status | `/health` + `/readyz` + `/livez` |
| **Stateless Service** | Horizontal scaling, no local state | Session in Redis, DB, or external store |
| **Watchdog** | Detect and restart unhealthy processes | K8s liveness probe, process manager |

### Data Architecture Patterns

| Pattern | When to Use | Trade-offs |
|---------|-------------|------------|
| **Data Lake** | Raw data storage, ML training, schema-on-read | Governance challenges, data swamp risk |
| **Data Warehouse** | Structured analytics, BI reporting, schema-on-write | Rigid schema, ETL cost, latency |
| **Lakehouse** | Lake flexibility + warehouse reliability | Complex setup, vendor lock-in |
| **Data Mesh** | Domain-owned data products, decentralized | Governance complexity, team maturity needed |
| **Data Fabric** | Virtual integration, federated queries | Performance overhead, vendor lock-in |
| **Medallion** | Bronze → Silver → Gold data refinement | Simple pattern, widely adopted |
| **Kappa** | Single streaming pipeline, no batch | Stream processing complexity |
| **Lambda** | Batch + stream, historical + real-time | Two code paths, maintenance cost |

## Architecture Decision Record (ADR) Template

```markdown
# ADR-{number}: {title}

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-{number}]

## Context
{What is the problem? What constraints exist? What options were considered?}

## Decision
{What was decided and why?}

## Consequences
{Positive: what becomes easier. Negative: what becomes harder.}

## Compliance
{How will this decision be enforced? Code review, linting, arch tests?}
```

## Key Principles

### ADR Best Practices
- One decision per ADR
- Date-stamp every ADR (use `YYYY-MM-DD` format)
- Keep context concise but complete — enough for someone 6 months later
- Include rejected alternatives with reasoning
- Link related ADRs (`Superseded by ADR-005`)
- Store ADRs in version control alongside code (`docs/decisions/`)
- Number sequentially: `ADR-001`, `ADR-002`, etc.
- Use architecture tests (ArchUnit, ArchTest) to enforce decisions

### Architecture Evaluation Checklist
1. **Non-functional requirements defined**? (performance, scalability, availability, security, cost)
2. **Trade-offs documented**? (what did we accept worse to get better?)
3. **Failures considered**? (what happens when each component fails?)
4. **Evolution path**? (how will this architecture evolve in 6/12/24 months?)
5. **Team alignment**? (does the team understand and agree on the architecture?)
6. **Compliance verified**? (regulatory requirements, data residency, audit)
7. **Cost estimated**? (infrastructure, operational, migration cost)
8. **Security reviewed**? (threat model, data classification, auth model)

### Architecture Anti-Patterns
| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **Big Ball of Mud** | No clear structure, everything depends on everything | Bounded contexts, dependency inversion |
| **Lava Flow** | Dead code, commented-out code, abandoned experiments | Remove unused code, document experiments |
| **God Service** | One service does everything | Split by bounded context |
| **Distributed Monolith** | Services but deployed together, shared DB | Enforce bounded context, database per service |
| **Entity Service** | Every DB table is a service | Group by domain aggregate, not by table |
| **No API Gateway** | Clients call services directly, no central control | Add gateway with routing, auth, rate-limit |
| **Premature Distribution** | Microservices before understanding domain | Start monolith, extract when boundaries are clear |
| **Golden Hammer** | Same pattern for every problem | Use decision tree above, context matters |
