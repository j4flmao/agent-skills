---
name: microservices
description: Microservices architecture patterns — decomposition, communication, data, discovery, observability, deployment.
---

# Microservices Architecture

## Agent Protocol

### Trigger
User request includes: `microservice`, `micro-services`, `service decomposition`, `distributed system`, `saga`, `cqrs`, `event sourcing`, `service mesh`.

### Input Context
- Business domain description / bounded context map
- Current monolith architecture (if migrating)
- Team topology (Conway's Law)
- Non-functional requirements (latency, throughput, consistency, availability)
- Technology preferences (message broker, container platform, language)

### Output Artifact
A markdown document containing:
- Service decomposition model (bounded contexts with responsibilities)
- Communication pattern selection (sync/async/event) per service pair
- Data ownership strategy (database per service, shared nothing)
- Infrastructure recommendations (service mesh, API gateway, message broker)
- Migration strategy (strangler fig, parallel run)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. If monolith is appropriate, output `Monolith recommended. Reason: [reason].` and stop.

### Completion Criteria
- Decomposition bounded contexts explicitly mapped to business capabilities
- Each service pair has communication pattern documented with rationale
- Data consistency strategy for each transaction spanning services
- Infrastructure recommendations with concrete tools/versions
- Migration path with ordered phases

### Max Response Length
4096 tokens

## Core Patterns

### 1. Decomposition

| Pattern | Approach | When |
|---|---|---|
| **Business Capability** | Map to business functions (orders, payments, shipping) | Clear organizational boundaries |
| **Subdomain** | Follow DDD bounded contexts | Complex domain, multiple subdomains |
| **Strangler Fig** | Incrementally replace monolith features | Brownfield migration |
| **Self-contained Service** | Service owns its data, API, and logic | Least耦合, maximum autonomy |

**Decomposition rules**:
- Service must be independently deployable
- Service must own its data exclusively (no shared databases)
- Service must be team-sizable (2-pizza team)
- Service communication must be via network calls (no in-process)

### 2. Communication

| Pattern | Type | Consistency | Latency | Use Case |
|---|---|---|---|---|
| **Synchronous (HTTP/gRPC)** | Request-response | Strong (if transactional) | Higher | Queries, commands needing immediate response |
| **Asynchronous (Message Queue)** | Event-driven | Eventual | Lower | Cross-service notifications, long-running processes |
| **Saga** | Choreography / Orchestration | Eventual | Medium | Distributed transaction spanning services |
| **Transactional Outbox** | Reliable event publishing | Strong | Low + async | Guaranteed event delivery with DB transaction |

**Saga variants**:
- **Choreography**: Each service publishes events after local transaction. Lower complexity, harder to trace.
- **Orchestration**: Central coordinator tells each service what to do. Higher complexity, easier to trace, single point of failure.
- **Selection rule**: 3+ services in saga? Use orchestration. <3? Choreography is acceptable.

### 3. Data

| Pattern | Description | Trade-off |
|---|---|---|
| **Database per Service** | Each service owns its database | No shared schema, data duplication, eventual consistency |
| **CQRS** | Separate read and write models | Optimized queries, eventual consistency, higher complexity |
| **Event Sourcing** | Store events, derive state | Complete audit trail, complex querying, storage growth |
| **Saga (data)** | Compensating transactions | No distributed lock, eventual consistency, compensating logic needed |

**Data ownership rules**:
- No service ever accesses another service's database directly
- No shared database between services (exception: read-only reference data)
- Data duplication is acceptable and expected (each service owns its view)

### 4. Discovery

| Pattern | Description |
|---|---|
| **Client-side Discovery** | Client queries registry, load-balances directly |
| **Server-side Discovery** | Load balancer queries registry, routes request |
| **Service Registry** | DNS-based (Consul, Eureka, Kubernetes DNS) |

**Recommendation**: Kubernetes-native (DNS for discovery, Service for load balancing). Only use external registry if running outside K8s.

### 5. Observability

| Pillar | Tool (Language-agnostic) | What to Capture |
|---|---|---|
| **Logging** | Structured (JSON), centralized | Service ID, trace ID, span ID, severity, message |
| **Metrics** | Prometheus + Grafana | RED (Rate, Errors, Duration) for every endpoint |
| **Tracing** | OpenTelemetry | Request path across services, span timings |
| **Health Checks** | Readiness + Liveness probes | Can serve traffic? Is process alive? |

### 6. Deployment

| Pattern | Strategy | Risk |
|---|---|---|
| **Blue/Green** | Two full environments, switch traffic | Low, double resources |
| **Canary** | Gradual traffic shift | Medium, requires monitoring |
| **Rolling** | Incremental instance replacement | Low, slow |
| **Feature Flags** | Toggle features independently | Low, requires flag infrastructure |

### 7. Resilience

| Pattern | Description |
|---|---|
| **Circuit Breaker** | Stop calling failing service, fail fast |
| **Bulkhead** | Isolate resources per service client |
| **Retry with Backoff** | Exponential backoff + jitter |
| **Timeout** | Hard timeout per external call |
| **Fallback** | Degraded response when service unavailable |
| **Rate Limiter** | Protect services from overload |

### 8. Security

| Pattern | Description |
|---|---|
| **API Gateway Auth** | Centralized authentication at gateway |
| **JWT / OAuth2** | Token-based service-to-service auth |
| **mTLS** | Mutual TLS for service mesh |
| **Service Mesh** | Istio / Linkerd for transparent mTLS, policy |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Distributed Monolith** | Services tightly coupled, deployed together | Enforce strict API contracts, independent deploy |
| **Shared Database** | Multiple services same DB schema | Extract shared data into dedicated service |
| **Too Fine-grained** | Excessive network calls, latency | Merge related services |
| **God Service** | One service does everything | Decompose by capability |
| **No Monitoring** | Cannot debug production issues | Add OpenTelemetry before going live |

## Migration from Monolith

1. **Identify seams** — areas of code that change independently
2. **Extract read model first** — read-only microservice serving cached/pre-computed data
3. **Extract write model** — feature flag to route writes to new service, dual-write during transition
4. **Strangler** — incrementally replace monolith endpoints with service endpoints
5. **Monolith retirement** — when all features migrated, decommission monolith

## References

### Reference Files
- `references/decomposition-patterns.md` — Detailed decomposition strategies with examples
- `references/communication-patterns.md` — Sync/async/saga/outbox patterns with code sketches
- `references/data-patterns.md` — Database-per-service, CQRS, Event Sourcing, Saga patterns

### Related Skills
- `backend/universal/design-patterns/SKILL.md` — Foundational GoF patterns
- `backend/universal/event-driven/SKILL.md` — Event-driven architecture
- `backend/universal/clean-architecture/SKILL.md` — Monolith to microservices transition
- `devops/containerization/SKILL.md` — Container and orchestration

## Handoff

Hand off to `devops/containerization/SKILL.md` for container orchestration setup. Hand off to `backend/universal/event-driven/SKILL.md` for detailed event-driven patterns. Hand off to `backend/universal/database-patterns/SKILL.md` for data consistency strategies.
