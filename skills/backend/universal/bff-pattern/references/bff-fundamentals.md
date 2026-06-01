# BFF Fundamentals

## Core Concept

Backend for Frontend (BFF) is a dedicated backend service per client type (web, mobile, IoT, third-party). Each BFF owns the API contract for its specific client, composing and transforming data from backing services.

## Why Not One API for All Clients?

Mobile apps and web apps have fundamentally different needs:

| Concern | Web BFF | Mobile BFF |
|---------|---------|------------|
| Payload size | Full page data (50-200KB) | Compact (5-20KB) |
| Network | Fast, stable (gigabit) | Slow, unreliable (3G/4G) |
| Battery | Not a concern | Critical — minimize CPU/network |
| Screen size | Large — show everything | Small — show essentials |
| Data freshness | Real-time preferred | Stale-while-revalidate OK |
| Offline support | Load fresh every time | Cache aggressively for offline |
| Update frequency | Daily deploys | App store review (weekly) |
| Auth mechanism | Session cookies | Bearer tokens |

One API serving both means either mobile over-fetches or web under-fetches. BFF solves this.

## BFF Responsibilities

### Must Do
- **Compose**: Aggregate data from multiple backing services
- **Transform**: Shape data for the specific client (field selection, renaming, formatting)
- **Cache**: Cache composed responses to reduce backend load
- **Error handle**: Graceful degradation when backing services fail
- **Auth**: Validate authentication, forward user context to downstream

### Must NOT Do
- **Business logic**: Pricing, validation, workflows belong in backend services
- **Data storage**: BFF has no database of its own (except cache)
- **Authentication decisions**: BFF validates tokens, doesn't manage identity

## BFF vs Similar Patterns

| Pattern | Purpose | Data Shape | Complexity |
|---------|---------|------------|------------|
| **BFF** | Per-client composition | Server-defined per client | Moderate |
| **API Gateway** | Common cross-cutting | Raw proxy/passthrough | Low-Moderate |
| **GraphQL** | Client-defined queries | Client-defined | High |
| **Service Mesh** | Infrastructure-level | Passthrough | Low (ops) |
| **Aggregation Service** | Domain aggregation | Domain-defined | Moderate |

## When to Use BFF

Use BFF when:
- You have 2+ distinct client types (web + mobile is the classic case)
- Clients need different data shapes or fields
- You want to decouple frontend from backend service evolution
- Backend services are fine-grained (microservices) and many compose into one page

Don't use BFF when:
- Single client only (over-engineering)
- Backend is a monolith with a single API (BFF adds unnecessary hop)
- Clients can define their own data needs (use GraphQL instead)

## BFF Service Contract

Every BFF defines a contract per endpoint:
```
Endpoint: GET /api/{bff_type}/checkout/{cart_id}
Client: Web SPA
Backing services: [cart, pricing, shipping, payment]
Cache TTL: 30s (stale-while-revalidate: 300s)
Error fallback: Partial response with warnings
Auth: Session cookie
```

## Minimal BFF Structure

```
bff-web/
├── src/
│   ├── routes/          # Route handlers
│   ├── composers/       # Data composition logic
│   ├── clients/         # Backing service HTTP clients
│   ├── cache/           # Caching layer
│   ├── middleware/      # Auth, rate limiting, tracing
│   └── types/           # Request/response types
├── test/
├── Dockerfile
└── package.json
```
