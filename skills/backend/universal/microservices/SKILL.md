---
name: microservices
description: >
  Use this skill when designing microservices architecture — decomposition, communication, data, discovery, observability, deployment. This skill enforces: bounded context decomposition, database-per-service ownership, saga patterns for distributed transactions, strangler fig migration. Do NOT use for: monolith application design, frontend architecture, single-service API design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, microservices, phase-2, universal]
---

# Microservices Architecture

## Purpose
Guide microservices decomposition, communication patterns, data ownership, and migration strategies.

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

## Workflow

### Step 1: Decompose by Bounded Context

| Pattern | Approach | When |
|---|---|---|
| **Business Capability** | Map to business functions (orders, payments, shipping) | Clear organizational boundaries |
| **Subdomain** | Follow DDD bounded contexts | Complex domain, multiple subdomains |
| **Strangler Fig** | Incrementally replace monolith features | Brownfield migration |
| **Self-contained Service** | Service owns its data, API, and logic | Least coupling, maximum autonomy |

**Decomposition rules**:
- Service must be independently deployable
- Service must own its data exclusively (no shared databases)
- Service must be team-sizable (2-pizza team)
- Service communication must be via network calls (no in-process)

### Step 2: Select Communication Patterns

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

### Step 3: Define Data Ownership

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

### Step 4: Configure Service Discovery

| Pattern | Description |
|---|---|
| **Client-side Discovery** | Client queries registry, load-balances directly |
| **Server-side Discovery** | Load balancer queries registry, routes request |
| **Service Registry** | DNS-based (Consul, Eureka, Kubernetes DNS) |

**Recommendation**: Kubernetes-native (DNS for discovery, Service for load balancing). Only use external registry if running outside K8s.

### Step 5: Implement Observability

| Pillar | Tool (Language-agnostic) | What to Capture |
|---|---|---|
| **Logging** | Structured (JSON), centralized | Service ID, trace ID, span ID, severity, message |
| **Metrics** | Prometheus + Grafana | RED (Rate, Errors, Duration) for every endpoint |
| **Tracing** | OpenTelemetry | Request path across services, span timings |
| **Health Checks** | Readiness + Liveness probes | Can serve traffic? Is process alive? |

### Step 6: Choose Deployment Strategy

| Pattern | Strategy | Risk |
|---|---|---|
| **Blue/Green** | Two full environments, switch traffic | Low, double resources |
| **Canary** | Gradual traffic shift | Medium, requires monitoring |
| **Rolling** | Incremental instance replacement | Low, slow |
| **Feature Flags** | Toggle features independently | Low, requires flag infrastructure |

### Step 7: Apply Resilience Patterns

| Pattern | Description |
|---|---|
| **Circuit Breaker** | Stop calling failing service, fail fast |
| **Bulkhead** | Isolate resources per service client |
| **Retry with Backoff** | Exponential backoff + jitter |
| **Timeout** | Hard timeout per external call |
| **Fallback** | Degraded response when service unavailable |
| **Rate Limiter** | Protect services from overload |

### Step 8: Implement Security

| Pattern | Description |
|---|---|
| **API Gateway Auth** | Centralized authentication at gateway |
| **JWT / OAuth2** | Token-based service-to-service auth |
| **mTLS** | Mutual TLS for service mesh |
| **Service Mesh** | Istio / Linkerd for transparent mTLS, policy |

### Step 9: Plan Migration from Monolith

1. **Identify seams** — areas of code that change independently
2. **Extract read model first** — read-only microservice serving cached/pre-computed data
3. **Extract write model** — feature flag to route writes to new service, dual-write during transition
4. **Strangler** — incrementally replace monolith endpoints with service endpoints
5. **Monolith retirement** — when all features migrated, decommission monolith

## Rules
- No shared databases between services — ever.
- Each service independently deployable with its own CI/CD.
- 3+ services in a saga? Use orchestration.
- Kubernetes-native discovery preferred over external registries.
- OpenTelemetry for all observability pillars.
- No service calls another service's database directly.
- Strangler Fig for monolith migration — no big-bang rewrites.
- Communication patterns documented per service pair with rationale.

### Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Distributed Monolith** | Services tightly coupled, deployed together | Enforce strict API contracts, independent deploy |
| **Shared Database** | Multiple services same DB schema | Extract shared data into dedicated service |
| **Too Fine-grained** | Excessive network calls, latency | Merge related services |
| **God Service** | One service does everything | Decompose by capability |
| **No Monitoring** | Cannot debug production issues | Add OpenTelemetry before going live |

## References
  - references/communication-patterns.md — Communication Patterns
  - references/data-patterns.md — Data Patterns
  - references/decomposition-patterns.md — Decomposition Patterns
  - references/microservices-communication.md — Microservices Communication
  - references/microservices-observability.md — Microservices Observability
  - references/microservices-testing.md — Microservices Testing
## Handoff
Hand off to `devops/containerization/SKILL.md` for container orchestration setup. Hand off to `backend/universal/event-driven/SKILL.md` for detailed event-driven patterns. Hand off to `backend/universal/database-patterns/SKILL.md` for data consistency strategies.
