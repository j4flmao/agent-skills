# Architecture Patterns Catalog

See `.claude/rules/solution-architecture.md` for the full pattern catalog with decision trees, integration patterns, database patterns, caching patterns, resilience patterns, security patterns, frontend patterns, cloud-native patterns, and data architecture patterns.

This file is a reference for the solution-architecture skill. Key sections:

## Decision Tree
Use the architecture style decision tree for high-level pattern selection.

## Pattern Tables
- Architectural patterns (Layered, Hexagonal, Clean, Event-Driven, CQRS, Saga, etc.)
- Integration patterns (Request-Reply, Async Messaging, CDC, Stream Processing, etc.)
- Database patterns (Database per Service, CQRS with ES, Saga, Polyglot Persistence, etc.)
- Caching patterns (Cache-Aside, Read-Through, Write-Through, CDN, etc.)
- Resilience patterns (Circuit Breaker, Bulkhead, Rate Limiter, Timeout, etc.)
- Security patterns (Zero Trust, Auth Gateway, Least Privilege, etc.)
- Frontend patterns (SPA, SSR, SSG, Microfrontend, Islands, etc.)
- Cloud-Native patterns (Sidecar, Ambassador, Leader Election, Watchdog, etc.)
- Data patterns (Data Lake, Warehouse, Lakehouse, Mesh, Medallion, etc.)

## ADR Template
Use the canonical ADR template for documenting architecture decisions.

## Principles
- One decision per ADR
- Document rejected alternatives with reasoning
- Evaluate trade-offs explicitly
- Consider NFRs, failures, evolution, team alignment, compliance, cost, and security
