# Solution Architecture Fundamentals

## Overview
Solution Architecture bridges business requirements and technical implementation by designing systems that are maintainable, scalable, and aligned with organizational goals. This reference covers the foundational concepts every architect must internalize before evaluating patterns or making trade-offs.

## Core Architectural Concepts

### What is Solution Architecture?
Solution Architecture translates business capabilities into technical systems. It defines the structure, behavior, and constraints of a software solution. The architect's primary responsibility is managing complexity — deciding what to build, how components interact, and which trade-offs to accept.

### Architecture vs Design
| Aspect | Architecture | Design |
|--------|-------------|--------|
| Scope | System-wide constraints | Local implementation |
| Decisions | Hard to change, costly to reverse | Easy to refactor |
| Examples | Database choice, deployment model, service boundaries | Class structure, algorithm choice, variable naming |
| Audience | Stakeholders, developers, operators | Developers |
| Validation | Fitness functions, reviews, metrics | Tests, code review |

### Architecture Characteristics (Non-Functional Requirements)
These are the "-ilities" that define quality attributes. Every architecture prioritizes some over others — no architecture optimizes all simultaneously.

| Characteristic | Definition | Example Metric |
|----------------|-------------|----------------|
| Availability | System uptime and fault tolerance | 99.9% uptime, RTO < 1 hour |
| Performance | Response time and throughput | p95 < 200ms, 1000 req/s |
| Scalability | Ability to handle growth | Linear cost per additional user |
| Security | Protection against threats | No critical CVEs, SOC 2 compliant |
| Maintainability | Ease of change and extension | < 15 cyclomatic complexity per module |
| Testability | How easily the system can be verified | > 80% code coverage, < 100ms per test |
| Deployability | Frequency and confidence of releases | < 1 hour from merge to production |
| Reliability | Correctness and consistency under load | Error rate < 0.1% of requests |

### The Three Pillars of Architecture Decisions
Every architecture decision should be evaluated against:
1. **Business alignment**: Does this decision support the business goals and timeline?
2. **Technical fitness**: Does this decision meet the architecture characteristics?
3. **Team capability**: Can the team build, operate, and evolve this system?

A decision that fails any pillar is likely wrong, no matter how technically elegant.

## Architecture Documentation

### C4 Model Levels
The C4 model provides a hierarchy of abstraction for communicating architecture:

| Level | Name | Audience | Content |
|-------|------|----------|---------|
| C1 | System Context | Everyone | System boundary, external users, dependencies |
| C2 | Container | Technical team | Services, databases, message queues, deployments |
| C3 | Component | Developers | Internal structure of each container |
| C4 | Code | Developers | Detailed class/package diagrams |

### ADR (Architecture Decision Record)
Every significant decision gets an ADR. The minimum viable ADR:
```markdown
# ADR-{NNN}: {Title}

## Status
{Proposed | Accepted | Deprecated | Superseded}

## Context
{Why this decision is needed. 2-5 sentences.}

## Decision
{What we decided. 1-2 sentences.}

## Rationale
{Why this is the right choice given the context. 2-3 sentences.}

## Consequences
{Positive, negative, and mitigation.}
```

### System Context Diagram
A box-and-line diagram showing:
- The system being built (center box)
- Users interacting with the system (stick figures or boxes)
- External systems the system depends on (boxes with dashed lines)
- Data flow direction (arrows with labels)

### Architecture Decision Log
Maintain a decision log index in `docs/decisions/README.md`:
```markdown
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 001 | Use PostgreSQL for primary database | Accepted | 2025-01-15 |
| 002 | Adopt REST APIs for public endpoints | Accepted | 2025-01-20 |
| 003 | Migrate from monolith to services | Proposed | 2025-02-01 |
```

## Fundamental Architecture Patterns

### Layered Architecture
```
[Presentation Layer] → [Business Logic Layer] → [Data Access Layer] → [Database]
```
- **Pros**: Simple, well-understood, clear separation
- **Cons**: Can lead to "sinkhole" anti-pattern (layers that do nothing but pass through)
- **Best for**: Simple CRUD applications, early-stage products

### Hexagonal Architecture (Ports and Adapters)
```
[External Systems] ←→ [Adapters/Ports] ←→ [Core Domain] ←→ [Adapters/Ports] ←→ [External Systems]
```
- **Pros**: Domain isolation, testable without infrastructure, swappable adapters
- **Cons**: More interfaces and abstractions initially
- **Best for**: Complex domain logic, long-lived systems

### Event-Driven Architecture
```
[Producer] → [Event Bus] → [Consumer 1]
                         → [Consumer 2]
                         → [Consumer 3]
```
- **Pros**: Loose coupling, scalability, auditability
- **Cons**: Eventual consistency, debugging complexity, schema evolution
- **Best for**: Workflow orchestration, cross-service notifications, audit trails

## Common Decisions and Defaults

### Database: PostgreSQL
Default to PostgreSQL for most applications. It handles relational data, JSON documents, full-text search, and geospatial queries. Only consider alternatives when specific requirements rule out PostgreSQL.

### API: REST with JSON
Default to REST over HTTP for external APIs. It's universally supported, cacheable, and well-understood. Move to GraphQL for complex UIs with many data dependencies. Move to gRPC for high-throughput internal service-to-service communication.

### Deployment: Containerized on Kubernetes
Default to containers for consistency across environments. Use Kubernetes when you need: auto-scaling, rolling updates, service discovery, and multi-service orchestration. Use simpler platforms (Heroku, Render, single VPS) for small teams and simple applications.

### Authentication: OAuth 2.0 / OIDC
Default to OAuth 2.0 with OpenID Connect. Use an identity provider (Auth0, Okta, Keycloak, Cognito) rather than building your own. Only build custom auth if you have specific compliance requirements that off-the-shelf solutions cannot meet.

## Architecture Principles

### Principle 1: Infrastructure as Code
All infrastructure — networks, servers, databases, configuration — is defined in code and version-controlled. Manual changes to production environments are forbidden. Every change is reviewed, tested, and deployed through CI/CD.

### Principle 2: Defense in Depth
Security is layered across every level of the architecture: network (firewalls, WAF), application (input validation, auth), data (encryption at rest and in transit), and operations (audit logging, monitoring).

### Principle 3: Observability by Default
Every service exposes: structured logs (for debugging), metrics (for monitoring and alerting), traces (for understanding request flow). The cost of adding observability after deployment is 10x higher than building it in from the start.

### Principle 4: Design for Failure
Assume every component will fail. Implement: retries with backoff, circuit breakers for downstream failures, bulkheads to isolate failures, graceful degradation instead of cascade failures, and dead letter queues for failed async processing.

### Principle 5: Evolutionary Architecture
Architecture evolves with the product. Don't design for scale you don't have. Build in the ability to change decisions: use feature flags, abstract external dependencies behind interfaces, maintain clean service boundaries. The architecture that survives is the one that can change.

## Estimation for Architects

### Effort Sizing
| Size | Team-Weeks | Example |
|------|-----------|---------|
| Small | 1-2 | Add a new API endpoint, simple data model change |
| Medium | 3-6 | New service with 3-5 endpoints, moderate domain logic |
| Large | 8-16 | New subsystem, external integration, data migration |
| XL | 20+ | Multi-service initiative, platform migration, major refactor |

### Architectural Complexity Factors
- Number of services involved
- Data consistency requirements (eventual vs. strong)
- External integration complexity
- Compliance and regulatory requirements
- Team distribution and coordination needs

## Key Points
- Architecture is about trade-offs, not absolute truths
- Document every significant decision as an ADR — the rationale matters more than the decision
- Match architecture complexity to team size and product stage
- Non-functional requirements drive architecture choices — quantify them
- The simplest architecture that meets requirements is almost always the best
- Involve implementers in architecture decisions
- Fitness functions prevent architecture drift over time
- Cost of change is the best measure of architecture quality
- Every technology choice has an exit cost — plan for it
- Architecture is never "done" — it evolves with the product
