# Backend Skills Guide

50+ skills covering the complete backend development lifecycle: architecture, patterns, API design, data access, messaging, security, testing, and observability across 12+ language ecosystems.

## Skill Map

### Language Ecosystems

| Stack | Architecture | Patterns | Extra |
|-------|-------------|----------|-------|
| **Node.js** | `backend/nodejs/architecture/` | `backend/nodejs/patterns/` | express/, prisma/, drizzle/ |
| **NestJS** | `backend/nestjs/architecture/` | `backend/nestjs/patterns/` | — |
| **Go** | `backend/go/architecture/` | `backend/go/patterns/` | — |
| **Rust** | `backend/rust/architecture/` | `backend/rust/patterns/` | — |
| **Python (FastAPI)** | `backend/python/fastapi/` | — | django/ |
| **Java (Spring Boot)** | `backend/spring-boot/architecture/` | `backend/spring-boot/patterns/` | — |
| **C# (.NET)** | `backend/dotnet/architecture/` | `backend/dotnet/patterns/` | — |
| **PHP** | `backend/php/laravel/` | — | pure/, zend/ |
| **Ruby (Rails)** | `backend/ruby/rails/` | — | — |
| **Elysia** | `backend/elysia/architecture/` | `backend/elysia/patterns/` | — |
| **Elixir** | `backend/elixir/` | — | — |
| **Deno** | `backend/deno/` | — | — |
| **Bun** | `backend/bun/` | — | — |

### Universal Patterns (25 skills)

| Pattern | Skill | Focus |
|---------|-------|-------|
| API Design | `backend/universal/api-design/` | REST/GraphQL conventions, versioning |
| API Gateway | `backend/universal/api-gateway/` | Kong, Envoy, Traefik, rate limiting |
| API Response | `backend/universal/api-response/` | Envelope format, error codes, pagination |
| Auth Patterns | `backend/universal/auth-patterns/` | JWT, OAuth 2.0, session, MFA |
| Background Jobs | `backend/universal/background-jobs/` | Queues, cron, workers |
| Caching | `backend/universal/caching/` | Redis, CDN, in-memory, cache invalidation |
| Clean Architecture | `backend/universal/clean-architecture/` | Ports & adapters, dependency rule |
| Data Streaming | `backend/universal/data-streaming/` | Kafka, Kinesis, event sourcing |
| Database Patterns | `backend/universal/database-patterns/` | Migration, query optimization, connection mgmt |
| Design Patterns | `backend/universal/design-patterns/` | GoF patterns, idiomatic implementations |
| Event Driven | `backend/universal/event-driven/` | Event bus, pub/sub, saga choreography |
| Feature Flags | `backend/universal/feature-flags/` | LaunchDarkly, Unleash, gradual rollout |
| File Storage | `backend/universal/file-storage/` | S3, local, CDN, signed URLs |
| GraphQL Patterns | `backend/universal/graphql-patterns/` | Schema design, resolvers, DataLoader |
| gRPC Patterns | `backend/universal/grpc-patterns/` | Protobuf, streaming, interceptors |
| Internationalization | `backend/universal/internationalization/` | i18n, locale, RTL |
| Load Testing | `backend/universal/load-testing/` | k6, Artillery, Locust, benchmarks |
| Message Queue | `backend/universal/message-queue/` | RabbitMQ, SQS, Redis pub/sub |
| Microservices | `backend/universal/microservices/` | Decomposition, comms, data ownership |
| OOP Principles | `backend/universal/oop-principles/` | SOLID, composition, polymorphism |
| Rate Limiting | `backend/universal/rate-limiting/` | Token bucket, sliding window, distributed |
| Search Patterns | `backend/universal/search-patterns/` | Elasticsearch, Meilisearch, Typesense |
| Structured Logging | `backend/universal/structured-logging/` | Winston, Pino, structured context |
| Testing | `backend/universal/testing/` | Unit, integration, e2e, mocking |
| WebSocket Patterns | `backend/universal/websocket-patterns/` | WS, Socket.IO, SSE, real-time |
| Firebase | `backend/universal/firebase/` | Firestore, Auth, Storage, Cloud Functions, Hosting |
| Supabase | `backend/universal/supabase/` | PostgreSQL, RLS, Auth, Realtime, Edge Functions, pgvector |

## Decision Framework

### Choose Your Stack

```
Need maximum ecosystem?
  ├─ Node.js — largest package ecosystem, TypeScript end-to-end
  ├─ Python — best for AI/ML, data-heavy backends
  └─ Java/Spring Boot — enterprise, compliance-heavy, large teams

Need maximum performance?
  ├─ Rust — zero-cost abstractions, no GC, systems-level
  ├─ Go — fast compilation, goroutines, simple deployment
  └─ Zig — emerging, C ABI compatible

Need rapid development?
  ├─ NestJS — opinionated, decorators, DI container
  ├─ Rails — convention over configuration, mature
  └─ Laravel — elegant syntax, rich ecosystem

Need type safety?
  ├─ Rust — strongest type system, ownership model
  ├─ TypeScript (Node.js) — gradual typing, huge ecosystem
  └─ Go — simple but effective typing
```

### Choose Your Pattern

```
Problem: I need to expose data
  ├─ REST API → api-design + api-response
  ├─ GraphQL → graphql-patterns
  ├─ gRPC → grpc-patterns (internal services)
  └─ WebSocket → websocket-patterns (real-time)

Problem: I need to coordinate services
  ├─ Synchronous → api-gateway + rate-limiting
  ├─ Asynchronous → message-queue + event-driven
  ├─ Saga → event-driven + database-patterns
  └─ Event sourcing → data-streaming + event-driven

Problem: I need to store data
  ├─ Relational → database-patterns + backend/{stack}
  ├─ Document → database-patterns + NoSQL
  ├─ Cache → caching
  └─ File → file-storage

Problem: I need to secure my backend
  ├─ Auth → auth-patterns
  ├─ API security → security/api-security
  ├─ Secrets → security/secrets-management
  └─ Data → security/data-security
```

## Architecture Layers

```
┌──────────────────────────────────────────┐
│           API / Gateway Layer             │
│  api-design, api-gateway, api-response,   │
│  graphql-patterns, grpc-patterns          │
├──────────────────────────────────────────┤
│            Application Layer              │
│  clean-architecture, design-patterns,     │
│  oop-principles                           │
├──────────────────────────────────────────┤
│            Business Logic                 │
│  event-driven, microservices,             │
│  background-jobs, feature-flags           │
├──────────────────────────────────────────┤
│            Data Access Layer              │
│  database-patterns, caching,              │
│  file-storage, search-patterns            │
├──────────────────────────────────────────┤
│         Cross-Cutting Concerns            │
│  auth-patterns, rate-limiting,            │
│  structured-logging, security/*           │
│  testing, load-testing, i18n              │
└──────────────────────────────────────────┘
```

## By Common Scenarios

### Building a REST API
1. `backend/{stack}/architecture/` — project structure
2. `backend/universal/api-design/` — endpoint conventions
3. `backend/universal/api-response/` — response envelope
4. `backend/universal/auth-patterns/` — authentication
5. `backend/universal/database-patterns/` — data access
6. `backend/universal/caching/` — performance
7. `backend/universal/structured-logging/` — observability
8. `backend/{stack}/patterns/` — stack-specific idioms

### Building a Microservices System
1. `backend/universal/microservices/` — decomposition
2. `backend/universal/message-queue/` — async communication
3. `backend/universal/api-gateway/` — entry point
4. `backend/universal/event-driven/` — event choreography
5. `backend/universal/data-streaming/` — event sourcing
6. `backend/devops/observability/` — monitoring
7. `backend/universal/rate-limiting/` — protection

### Adding Real-Time Features
1. `backend/universal/websocket-patterns/` — WS/SSE
2. `backend/universal/data-streaming/` — event streams
3. `backend/universal/caching/` — real-time cache

## Reference: All Backend Skills

### Per-Stack Skills
- `skills/backend/nodejs/architecture/SKILL.md`
- `skills/backend/nodejs/patterns/SKILL.md`
- `skills/backend/nodejs/express/SKILL.md`
- `skills/backend/nodejs/prisma/SKILL.md`
- `skills/backend/nestjs/architecture/SKILL.md`
- `skills/backend/nestjs/patterns/SKILL.md`
- `skills/backend/go/architecture/SKILL.md`
- `skills/backend/go/patterns/SKILL.md`
- `skills/backend/rust/architecture/SKILL.md`
- `skills/backend/rust/patterns/SKILL.md`
- `skills/backend/python/fastapi/SKILL.md`
- `skills/backend/python/django/SKILL.md`
- `skills/backend/spring-boot/architecture/SKILL.md`
- `skills/backend/spring-boot/patterns/SKILL.md`
- `skills/backend/dotnet/architecture/SKILL.md`
- `skills/backend/dotnet/patterns/SKILL.md`
- `skills/backend/elysia/architecture/SKILL.md`
- `skills/backend/elysia/patterns/SKILL.md`
- `skills/backend/php/laravel/SKILL.md`
- `skills/backend/php/pure/SKILL.md`
- `skills/backend/php/zend/SKILL.md`
- `skills/backend/ruby/rails/SKILL.md`
- `skills/backend/elixir/SKILL.md`
- `skills/backend/deno/SKILL.md`
- `skills/backend/bun/SKILL.md`

### Universal Skills
- `skills/backend/universal/api-design/SKILL.md`
- `skills/backend/universal/api-gateway/SKILL.md`
- `skills/backend/universal/api-response/SKILL.md`
- `skills/backend/universal/auth-patterns/SKILL.md`
- `skills/backend/universal/background-jobs/SKILL.md`
- `skills/backend/universal/caching/SKILL.md`
- `skills/backend/universal/clean-architecture/SKILL.md`
- `skills/backend/universal/data-streaming/SKILL.md`
- `skills/backend/universal/database-patterns/SKILL.md`
- `skills/backend/universal/design-patterns/SKILL.md`
- `skills/backend/universal/event-driven/SKILL.md`
- `skills/backend/universal/feature-flags/SKILL.md`
- `skills/backend/universal/file-storage/SKILL.md`
- `skills/backend/universal/graphql-patterns/SKILL.md`
- `skills/backend/universal/grpc-patterns/SKILL.md`
- `skills/backend/universal/internationalization/SKILL.md`
- `skills/backend/universal/load-testing/SKILL.md`
- `skills/backend/universal/message-queue/SKILL.md`
- `skills/backend/universal/microservices/SKILL.md`
- `skills/backend/universal/oop-principles/SKILL.md`
- `skills/backend/universal/rate-limiting/SKILL.md`
- `skills/backend/universal/search-patterns/SKILL.md`
- `skills/backend/universal/structured-logging/SKILL.md`
- `skills/backend/universal/testing/SKILL.md`
- `skills/backend/universal/websocket-patterns/SKILL.md`
