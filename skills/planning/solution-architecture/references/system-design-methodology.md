# System Design Methodology for Solution Architects

## Overview

System design is the process of defining architecture, components, modules, interfaces, and data to satisfy specified requirements. This methodology provides a structured end-to-end approach to tackle any system design problem — from ambiguous requirements to documented architecture decisions.

## The Design Methodology Framework

### Phase 1: Problem Framing

Before proposing any solution, establish a shared understanding of the problem.

#### 1.1 Clarify Requirements

```
Functional Requirements:
- What must the system do?
- What are the primary user flows?
- What are the admin/maintenance flows?
- What integrations are required?

Non-Functional Requirements (NFRs):
- Availability (uptime %)
- Scalability (users, data volume, growth rate)
- Performance (latency p50/p95/p99, throughput)
- Security (compliance, data sensitivity, threat model)
- Maintainability (team size, change frequency)
- Cost (infrastructure, operational, licensing)
- Time-to-market (deadline constraints)
```

#### 1.2 Identify Constraints

| Constraint Type | Examples |
|----------------|----------|
| Technical | Existing stack, legacy systems, cloud provider, regulated region |
| Organizational | Team size, expertise distribution, geographic distribution |
| Business | Budget, timeline, compliance deadlines |
| Operational | On-call rotation, deployment windows, support hours |

#### 1.3 Define Success Criteria

```yaml
success_criteria:
  performance:
    - "API responds within 200ms p95 under 10K RPM"
    - "Search results return within 500ms"
  availability:
    - "99.9% uptime (8.76h downtime/year max)"
    - "Zero data loss on single AZ failure"
  scalability:
    - "Linear scaling to 10x current load"
    - "Support 1M concurrent users within 6 months"
```

### Phase 2: Scope Definition

#### 2.1 Establish System Boundaries

```
What is IN scope:
- User-facing features (web, mobile, API)
- Core business logic and processing
- Data storage and retrieval

What is OUT of scope:
- Third-party integrations (assumed available)
- Legacy system migration strategy
- Internal admin tools
```

#### 2.2 Identify Stakeholders

| Stakeholder | Key Concern | Involvement |
|-------------|-------------|-------------|
| End Users | Performance, reliability, usability | Indirect |
| Product Owners | Feature completeness, time-to-market | Direct |
| Engineering | Maintainability, testability | Direct |
| Operations | Deployability, observability | Direct |
| Security | Threat posture, compliance | Review |
| Finance | Infrastructure cost | Approval |

### Phase 3: Estimation

#### 3.1 Traffic Estimation

```
Daily Active Users (DAU): 5M
Requests per user per day: 10
Total daily requests: 50M
Peak throughput (20x daily avg): ~11,500 req/s
Average request size: 2KB
Peak bandwidth: ~23 MB/s inbound, ~46 MB/s outbound
```

#### 3.2 Storage Estimation

```
Entity: User
  - 500 bytes/user × 10M users = 5 GB

Entity: Post (with media)
  - 2 KB text + 200 KB avg media × 100M posts = ~20 TB

Entity: Analytics event
  - 500 bytes/event × 1B events/month = ~500 GB/month

Total storage at year 1: ~25 TB
Storage growth: 50% YoY
```

#### 3.3 Cache Estimation

```
Cache hit ratio target: 90%
Working set size: ~10 GB (most active 5% of data)
Cache memory needed: 30 GB (with headroom)
Redis cluster: 3 nodes × 16 GB
```

### Phase 4: High-Level Design

#### 4.1 Draft System Context

Start with a system context diagram showing:
- The system (as a black box)
- External actors (users, services, systems)
- Data flows between them

```
[Mobile App] ----> [API Gateway] ----> [System]
[Web App]    ----> [API Gateway] ----> [System]
[3rd Party]  <---- [API Gateway] ----> [System]
```

#### 4.2 Identify Core Components

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|------------------|
| API Gateway | Routing, auth, rate limiting, aggregation | Horizontal, stateless |
| Application Service | Business logic, workflows | Horizontal, stateless |
| Database | Persistent storage | Vertical + read replicas |
| Cache | Hot data, session state | Clustered, in-memory |
| Queue | Async processing, decoupling | Partitioned, offset-based |
| Blob Storage | Media, files, backups | Geo-redundant |
| Search Index | Full-text search, filtering | Sharded, replicated |
| Analytics Pipeline | Events, reporting, ML | Stream + batch |

#### 4.3 Data Flow Design

```
Synchronous path (read):
  Client → API Gateway → Service → Cache (hit → return)
                                    → DB (miss → populate cache → return)

Asynchronous path (write):
  Client → API Gateway → Service → DB (persist)
                                  → Queue → Workers → Search Index
                                                  → Analytics Pipeline
                                                  → Notification Service
```

### Phase 5: Deep Dive — Component Design

#### 5.1 API Design

```
RESTful Resource Naming:
  GET    /api/v1/users/{id}            — Get user profile
  POST   /api/v1/users                 — Create user
  PUT    /api/v1/users/{id}            — Update user
  DELETE /api/v1/users/{id}            — Delete user
  GET    /api/v1/users/{id}/posts      — List user posts

Pagination:
  GET /api/v1/posts?cursor={id}&limit=20

Consistency Level:
  Strong consistency for user profile reads
  Eventual consistency for feed/aggregation reads
```

#### 5.2 Data Model

```yaml
User:
  id: UUID (PK)
  email: string (unique, indexed)
  name: string
  created_at: timestamp
  updated_at: timestamp

Post:
  id: UUID (PK)
  user_id: UUID (FK, indexed)
  title: string
  content: text
  media_ids: string[]
  created_at: timestamp
  updated_at: timestamp

Indexes:
  - posts (user_id, created_at DESC) — user feed
  - posts (created_at DESC) — global feed
  - posts (title GIN) — full-text search
```

#### 5.3 Component Responsibilities

```yaml
UserService:
  - Create/read/update/delete users
  - Authentication and session management
  - Data: users table (PostgreSQL)

FeedService:
  - Generate user feed (fanout-on-write for active users)
  - Generate global feed (fanout-on-read for discovery)
  - Data: feed cache (Redis sorted sets)

PostService:
  - CRUD posts with media upload
  - Trigger notification on publish
  - Data: posts table (PostgreSQL), media files (S3)

SearchService:
  - Full-text search across posts and users
  - Index updates via queue consumers
  - Data: Elasticsearch index
```

### Phase 6: Trade-off Analysis

#### 6.1 Architecture Options Comparison

| Decision | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Database | PostgreSQL | CockroachDB | DynamoDB |
| Consistency | Strong | Strong (global) | Eventual |
| Scalability | Vertical + read replicas | Horizontal, auto-sharding | Horizontal, managed |
| Complexity | Low | Medium | Low |
| Cost | Medium | High | Medium |
| Query Flexibility | High (SQL, joins, CTE) | High (Postgres-compatible) | Limited (key-value + query) |

#### 6.2 Decision Matrix with Weighted Scoring

```
Criteria                  Weight    PG (score×wt)    Cockroach (s×wt)    Dynamo (s×wt)
──────────────────────    ──────    ───────────────  ─────────────────  ────────────────
Consistency               0.25      5 → 1.25         5 → 1.25           2 → 0.50
Query Flexibility         0.20      5 → 1.00         5 → 1.00           3 → 0.60
Scalability               0.20      3 → 0.60         5 → 1.00           5 → 1.00
Operational Simplicity    0.15      4 → 0.60         3 → 0.45           5 → 0.75
Cost                      0.10      4 → 0.40         2 → 0.20           3 → 0.30
Ecosystem/Tooling         0.10      5 → 0.50         3 → 0.30           4 → 0.40
──────────────────────    ──────    ───────────────  ─────────────────  ────────────────
Total                     1.00      4.35             4.20               3.55
```

#### 6.3 Risk Identification

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Database connection exhaustion | Medium | High | Connection pooling, HPA, read replicas |
| Cache stampede on restart | High | Medium | Gradual warmup, jitter, hedging |
| Queue backlog during spike | Medium | High | Auto-scaling consumers, DLQ monitoring |
| Search index lag | Low | Medium | Tune refresh interval, replica count |

### Phase 7: Documentation

#### 7.1 Architecture Deliverables

| Artifact | Audience | Format | Detail Level |
|----------|----------|--------|-------------|
| System Context Diagram | All stakeholders | C4 Level 1 | System as black box |
| Container Diagram | Engineering team | C4 Level 2 | Services, data stores, queues |
| Component Diagram | Development team | C4 Level 3 | Internal component structure |
| ADRs | Architects, new team members | Markdown | Decision context + rationale |
| Data Flow Diagram | Integration team | Sequence diagram | Request/response flows |
| Deployment Diagram | Operations team | Infrastructure map | Network, scaling, regions |

#### 7.2 ADR Requirements

```
Every significant design decision MUST have an ADR including:
- Decision title and number
- Status (Proposed / Accepted / Deprecated / Superseded)
- Context: what problem, constraints, options considered
- Decision: what was chosen and why
- Consequences: positive (what becomes easier), negative (what becomes harder)
- Alternatives considered with reasons for rejection
- Compliance: how the decision will be enforced
```

### Phase 8: Review and Validation

#### 8.1 Self-Review Checklist

```
[ ] All NFRs have measurable targets
[ ] Each component's failure mode is documented
[ ] Scaling strategy exists for 2x, 10x, 100x load
[ ] Data consistency guarantees are explicit
[ ] Security: auth model, data encryption, secrets management
[ ] Cost estimate provided with growth projections
[ ] At least 2 alternatives considered for each major decision
[ ] Monitoring and observability strategy defined
[ ] Deployment and rollback strategy documented
[ ] Runbook items identified for operational readiness
```

#### 8.2 Architecture Validation Techniques

| Technique | When | Method |
|-----------|------|--------|
| Walkthrough | Early design | Present to peers, gather feedback |
| ATAM | Pre-implementation | Structured evaluation with stakeholders |
| Prototype | Risky components | Proof of concept for unknown tech |
| Architecture Test | CI pipeline | Automated fitness functions |
| Chaos Experiment | Post-deployment | Inject failures, verify resilience |

## Design Methodology Cheat Sheet

```
1. FRAME   — What are we building and why?
2. SCOPE   — What is in/out, who are the stakeholders?
3. ESTIMATE— Traffic, storage, cache, cost
4. DESIGN  — Context → Components → Data flow
5. DETAIL  — API, data model, component responsibilities
6. TRADE   — Compare options, score, identify risks
7. DOC     — Diagrams, ADRs, deployment maps
8. REVIEW  — Self-review, peer review, automated validation
```

## Key Points

- Always start with problem framing before proposing solutions — the biggest design mistakes come from solving the wrong problem
- Estimation grounds design decisions in reality — without numbers, every choice is equally valid
- Trade-off analysis must be explicit and weighted — implicit trade-offs lead to unexamined compromises
- Document decisions as ADRs — the rationale is more valuable than the choice itself
- Always identify failure modes for each component — resilient systems are designed for failure, not despite it
- Design for evolution — today's correct decision may not be tomorrow's; make reversible choices where possible
- Involve operations early — deployability and operability must be designed in, not bolted on
- Validate prototypes for high-risk assumptions — unknown unknowns are the most dangerous
