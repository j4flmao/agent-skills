---
name: microservices
description: >
  Use this skill when designing microservices architecture — decomposition, communication, data, discovery, observability, deployment. This skill enforces: bounded context decomposition, database-per-service ownership, saga patterns for distributed transactions, strangler fig migration. Do NOT use for: monolith application design, frontend architecture, single-service API design.
version: "2.0.0"
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

## Decision Tree

### Should You Use Microservices?

```
What is your situation?
  ├── Small team (<10 devs), early stage product, uncertain domain
  │   └── Monolith recommended. Reason: microservices add accidental complexity before you understand the domain.
  ├── Medium team, well-understood domain, scaling issues in monolith
  │   └── Decompose selectively: extract hot paths first (bounded contexts)
  ├── Large organization, multiple teams, clear domain boundaries
  │   └── Microservices aligned to team topology (Conway's Law)
  └── Migrating from monolith with growing complexity
      └── Strangler Fig: extract one bounded context at a time
```

### How to Decompose?

```
What boundary defines this service?
  ├── Business capability (orders, payments, shipping)
  │   └── Standard approach: map to business functions
  ├── DDD subdomain (core, supporting, generic)
  │   └── Follow bounded contexts from domain modeling
  ├── Team topology (one team = one or more services)
  │   └── Conway's Law: services mirror communication structure
  └── Data ownership (candidate for extraction)
      └── If a data domain changes independently, it's a decomposition candidate
```

### Communication Pattern Selection

```
What does the caller need?
  ├── Immediate response, strong consistency, low latency needed
  │   └── Synchronous (HTTP/gRPC) — but beware cascading failures
  ├── Fire-and-forget, eventual consistency OK, decouple in time
  │   └── Async (message queue / event) — resilient, scalable
  ├── Distributed transaction spanning 3+ services
  │   └── Saga orchestration — central coordinator
  ├── Guaranteed event publication DB → broker
  │   └── Transactional outbox — write event in same DB transaction
  └── Need to rebuild state from events or audit trail
      └── Event sourcing — store events as source of truth
```

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

### Step 10: API Versioning and Contracts

```typescript
// Contract-first approach: define OpenAPI / protobuf before implementation
// Use consumer-driven contracts (CDC) to detect breaking changes

// API versioning strategies:
// 1. URL path: /v1/orders, /v2/orders
// 2. Header: Accept: application/vnd.myapp.v1+json
// 3. Query param: /orders?version=1
// Recommendation: URL path for major versions, additive field expansion for minor
```

### Step 11: Cross-Cutting Concerns

| Concern | Implementation |
|---------|---------------|
| Configuration | Centralized (Consul, etcd, K8s ConfigMap + secrets). Never env-specific in code |
| Shared libraries | Minimize. Prefer duplication over coupling via shared libs |
| Error handling | Standard error envelope across all services |
| Health checks | Readiness (can serve?) + Liveness (is alive?) exposed on management port |
| Graceful shutdown | Drain connections, complete in-flight, then exit |
| Rate limiting | Per service + global via API gateway |

### Step 12: API Gateway Integration

```typescript
// API Gateway (Kong / APISIX / Envoy) configuration pattern
// Route: /orders/* -> order-service:3001
// Route: /payments/* -> payment-service:3002
// Global: rate limit 1000 req/min per tenant, auth via JWT

// Gateway-level concerns:
// 1. Authentication — validate JWT before routing to service
// 2. Rate limiting — per-tenant, per-endpoint, burst allowance
// 3. Request validation — schema-based body validation at edge
// 4. Response transformation — strip internal headers, add CORS
// 5. Circuit breaking — gateway can fail fast before calling service
```

### Step 13: Service Mesh Integration

```yaml
# Istio VirtualService for traffic splitting (canary)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
  - order-service
  http:
  - match:
    - headers:
        x-canary: { exact: "true" }
    route:
    - destination:
        host: order-service
        subset: v2
      weight: 100
  - route:
    - destination:
        host: order-service
        subset: v1
      weight: 90
    - destination:
        host: order-service
        subset: v2
      weight: 10
# Service mesh provides: mTLS, traffic shifting, fault injection,
# circuit breaking, observability — without changing application code
```

### Step 14: Database per Service Implementation

```typescript
// Order Service — owns its PostgreSQL database
// Schema: orders, order_items, order_events
// No other service has direct DB access

// Payment Service — owns its PostgreSQL database
// Schema: payments, refunds, payment_methods

// Cross-service data access: via API calls only
// Example: Order Service needs payment status
// Solution: call `GET /payments/v1/orders/:orderId` — never query payment DB
```

### Step 15: Contract Testing with Pact

```typescript
// Consumer-driven contract test (Order Service -> Payment Service)
describe('Order Service - Payment API contract', () => {
  const provider = new Pact({
    consumer: 'OrderService',
    provider: 'PaymentService',
    port: 4000,
  });

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  it('should process payment and return transaction ID', async () => {
    await provider.addInteraction({
      state: 'payment can be processed',
      uponReceiving: 'a request to process payment',
      withRequest: {
        method: 'POST',
        path: '/v1/payments',
        headers: { 'Content-Type': 'application/json' },
        body: { orderId: '123', amount: 99.99, currency: 'USD' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { transactionId: like('txn_abc123'), status: 'completed' },
      },
    });
    const result = await paymentClient.processPayment({ orderId: '123', amount: 99.99, currency: 'USD' });
    expect(result.transactionId).toBeDefined();
  });
});
```

## API Composition Pattern
```typescript
// API Gateway / BFF that aggregates multiple downstream services
// Instead of client making 4 requests, gateway does it server-side

interface ProductDetailsResponse {
  product: Product;
  inventory: Inventory;
  reviews: Review[];
  recommendations: Product[];
}

async function getProductDetails(productId: string): Promise<ProductDetailsResponse> {
  const [product, inventory, reviews, recommendations] = await Promise.all([
    fetchProductService(productId),
    fetchInventoryService(productId),
    fetchReviewService(productId),
    fetchRecommendationService(productId),
  ]);

  return { product, inventory, reviews, recommendations };
}

// Circuit breaker for resilient inter-service calls
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30s

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
      throw err;
    }
  }
}
```

## Service Discovery
```yaml
# Kubernetes Headless Service for DNS-based discovery
# Services discover peers via SRV DNS lookups
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  clusterIP: None  # Headless — returns pod IPs
  selector:
    app: payment-service
  ports:
    - name: grpc
      port: 50051
    - name: health
      port: 8080
```

```typescript
// DNS-based service discovery with retry
import * as dns from 'dns/promises';

async function resolveService(name: string): Promise<string> {
  const records = await dns.resolveSrv(`_grpc._tcp.${name}.svc.cluster.local`);
  // Round-robin across healthy instances
  const target = records[Math.floor(Math.random() * records.length)];
  return `${target.name}:${target.port}`;
}
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Service boundaries wrong | Expect to merge/split services as understanding grows. Plan for refactoring |
| Network latency | Inter-service calls add 1-10ms. Batch queries where possible |
| Data consistency | Eventual consistency is default. Accept it or use saga with compensating actions |
| Team autonomy vs consistency | Balance: shared infrastructure (monitoring, CI) without coupling service decisions |
| Testing | Unit (service-local) + Integration (per service) + Contract (per API pair) + E2E (minimal) |
| Observability | Must be in place before going live. Debugging without it is guesswork |
| Cold start latency | Serverless services (Lambda) add 200ms-5s cold start — keep latency-critical services on persistent compute |
| Inter-service auth overhead | mTLS handshake adds ~10-50ms per connection — use connection pooling and keepalive |
| Schema changes | Independent DB migrations per service — coordination needed for cross-service schema changes |
| Backup and restore | Each service has independent backup strategy — test restore procedure quarterly |

## Security

| Layer | Threat | Mitigation |
|-------|--------|------------|
| API Gateway | DDoS, brute force | Rate limiting, WAF, IP allowlisting, request size limits |
| Inter-service | Man-in-the-middle | mTLS with short-lived certs (Istio/Linkerd auto-rotation) |
| Data at rest | Data breach | Encrypt DB volumes (AES-256), encrypt S3 buckets (SSE-KMS) |
| Secrets | Credential leak | Vault/AWS Secrets Manager, never in env files or config repos |
| Auth tokens | Token theft | Short-lived JWT (15 min), refresh tokens with rotation, httpOnly cookies |
| Supply chain | Compromised dependency | Dependency scanning (Snyk/Dependabot), signed artifacts, SBOM generation |
| API contracts | Breaking changes | Consumer-driven contracts, CI-validated, versioned APIs |

```typescript
// Service-to-service authentication with mTLS
import { credentials, Metadata } from '@grpc/grpc-js';
import { readFileSync } from 'fs';

const rootCert = readFileSync('/etc/ssl/certs/ca-cert.pem');
const clientCert = readFileSync('/etc/ssl/certs/service-cert.pem');
const clientKey = readFileSync('/etc/ssl/certs/service-key.pem');

const channelCredentials = credentials.createSsl(rootCert, clientKey, clientCert);
const client = new PaymentServiceClient('payment-service:443', channelCredentials);
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Distributed Monolith** | Services tightly coupled, deployed together | Enforce strict API contracts, independent deploy |
| **Shared Database** | Multiple services same DB schema | Extract shared data into dedicated service |
| **Too Fine-grained** | Excessive network calls, latency | Merge related services |
| **God Service** | One service does everything | Decompose by capability |
| **No Monitoring** | Cannot debug production issues | Add OpenTelemetry before going live |
| **Synchronous Chains** | A calls B calls C — high latency, fragile | Async where possible, parallel calls |
| **Leaky Abstractions** | Service exposes internal DB schema in API | API is contract — hide implementation |
| **Golden Hammer** | All problems solved with microservices | Consider monolith first, extract when needed |
| **Chatty Services** | Many small calls instead of one batched call | Use GraphQL or API composition layer |
| **Shared Model Classes** | Same DTO class in multiple services | Each service has its own view of data (duplication is OK) |
| **No Schema Governance** | Inconsistent API designs across services | API style guide + linting in CI (Spectral for OpenAPI) |
| **Synchronous Event Publishing** | Services send events inline in request path | Use transactional outbox pattern |

## Performance Benchmarks

| Pattern | Latency (p50) | Latency (p99) | Throughput |
|---------|---------------|---------------|------------|
| In-process method call | < 1µs | < 1µs | Unlimited |
| HTTP inter-service (same AZ) | 2-5ms | 10-20ms | ~10K req/s per instance |
| gRPC inter-service (same AZ) | 0.5-2ms | 5-10ms | ~50K req/s per instance |
| Message queue (async) | 5-50ms | 100-500ms | ~100K msg/s per broker |
| Saga (orchestration, 3 steps) | 15-50ms | 100-200ms | ~5K saga/s |
| Service mesh sidecar overhead | +1-3ms | +5-10ms | ~5% throughput reduction |

## Rules
- No shared databases between services — ever.
- Each service independently deployable with its own CI/CD.
- 3+ services in a saga? Use orchestration.
- Kubernetes-native discovery preferred over external registries.
- OpenTelemetry for all observability pillars.
- No service calls another service's database directly.
- Strangler Fig for monolith migration — no big-bang rewrites.
- Communication patterns documented per service pair with rationale.
- Always define API contracts before implementation (contract-first).
- Each service has at most one DB (shared-nothing).
- Prefer eventual consistency unless strong consistency is legally required.
- gRPC for high-throughput internal calls (< 2ms latency). HTTP for external or low-throughput internal.
- Rate limit at the gateway AND per-service for defense in depth.
- Use consumer-driven contracts to detect breaking API changes in CI.
- Every service must have independent backup and restore tested quarterly.

## References
  - references/communication-patterns.md — Communication Patterns
  - references/data-patterns.md — Data Patterns
  - references/decomposition-patterns.md — Decomposition Patterns
  - references/microservices-communication.md — Microservices Communication
  - references/microservices-observability.md — Microservices Observability
  - references/microservices-testing.md — Microservices Testing
## Handoff
Hand off to `devops/containerization/SKILL.md` for container orchestration setup. Hand off to `backend/universal/event-driven/SKILL.md` for detailed event-driven patterns. Hand off to `backend/universal/database-patterns/SKILL.md` for data consistency strategies.
