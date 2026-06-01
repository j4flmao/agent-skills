---
name: solution-architecture
description: >
  Make architecture decisions, evaluate trade-offs, select patterns, and document ADRs.
  Use when the user asks about architecture, system design, pattern selection, architecture decision, trade-off analysis, or ADR.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, architecture, phase-1]
---

# Solution Architecture

## Purpose
Guide architecture decisions using ADRs, pattern selection, trade-off analysis, and cross-domain architecture design. Produce defensible, context-driven architecture recommendations that balance technical excellence with business constraints.

## Architecture Decision Trees

### Architecture Depth Decision Tree
```
What stage is the project in?
  |-- IDEA / PRE-SEED --> Lightweight architecture: 1-page system sketch, key tech choices
  |     Output: Technology choices, high-level architecture diagram
  |-- MVP / EARLY STAGE --> Standard architecture: component diagram, data model, API design
  |     Output: System context, C1-C2 diagrams, ADRs for key decisions
  |-- GROWTH / SCALE --> Detailed architecture: C4 model, NFR specs, migration plans
  |     Output: C1-C4 diagrams, fitness functions, architecture metrics
  |-- ENTERPRISE / LEGACY --> Modernization architecture: strangler fig, domain decomposition
        Output: Modernization roadmap, architecture debt inventory, migration plan

What is the primary architectural concern?
  |-- PERFORMANCE --> Focus on: caching strategy, query optimization, CDN, async processing
  |-- SCALABILITY --> Focus on: horizontal scaling, stateless design, partitioning, queues
  |-- SECURITY --> Focus on: zero-trust, encryption, authn/authz, audit, compliance
  |-- MAINTAINABILITY --> Focus on: modularity, bounded contexts, API contracts, documentation
  |-- COST --> Focus on: serverless, reserved instances, multi-cloud, FinOps
  |-- SPEED --> Focus on: MVP patterns, existing services reuse, low-code integration
```

### Technology Selection Decision Tree
```
Is the technology core to your competitive advantage?
  |-- YES --> Build custom, own the IP, deep control
  |     Selection criteria: team expertise > ecosystem > cost > popularity
  |-- NO --> Use managed services, open-source, or COTS
        Selection criteria: ecosystem maturity > operational cost > team expertise > flexibility

How mature is your team with the technology?
  |-- EXPERT (3+ years) --> Low adoption risk, fast ramp-up
  |     Weight: expertise +50%
  |-- FAMILIAR (6-24 months) --> Moderate adoption risk, training needed
  |     Weight: expertise +25%, require spike/prototype
  |-- NOVICE (<6 months) --> High adoption risk, significant ramp-up cost
        Strong justification required. If selected: budget for training, spike, mentoring

What is the total cost of ownership (TCO) over 3 years?
  |-- Compute: infrastructure, licensing, operational overhead
  |-- People: hiring, training, ramp-up, retention
  |-- Migration: data migration, integration, cutover
  |-- Exit: switching costs, data portability, vendor lock-in
  TCO > 2x license cost means the choice is wrong.
```

### Architecture Pattern Selection
```
What is the primary integration pattern needed?
  |-- SYNCHRONOUS REQUEST-RESPONSE --> REST or gRPC
  |     REST: Standard web, browser clients, simple CRUD
  |     gRPC: High throughput, internal services, streaming, polyglot
  |-- ASYNCHRONOUS MESSAGING --> Message queue or event stream
  |     Queue (RabbitMQ/SQS): Point-to-point, work distribution, decoupling
  |     Stream (Kafka/Event Hubs): Event sourcing, audit trail, replay, multiple consumers
  |-- REALTIME PUSH --> WebSocket or SSE
  |     WebSocket: Bidirectional, low latency, stateful (chat, live updates)
  |     SSE: Server-to-client only, simpler, HTTP-native (notifications, feeds)
  |-- BATCH / OFFLINE --> Scheduler + job queue
        Cron + worker: Periodic tasks, ETL, report generation

How should services be decomposed?
  |-- < 5 ENGINEERS --> Modular monolith with clear internal boundaries
  |     Benefits: simpler deployment, no network overhead, faster dev
  |     Risks: scaling limits, deployment coupling
  |-- 5-20 ENGINEERS --> Service-oriented with 3-8 services
  |     Benefits: team autonomy, independent deploy, bounded contexts
  |     Risks: distributed system complexity, data consistency
  |-- 20+ ENGINEERS --> Microservices with domain-driven design
        Benefits: team-scale independence, polyglot, independent scaling
        Risks: coordination overhead, observability, eventual consistency
```

### Trade-off Analysis Framework
```
Every architecture decision involves trade-offs. Use this framework:

1. Identify the decision: "We need to choose between X and Y for {purpose}"
2. List the forced trade-offs (non-negotiable consequences):
   - If we choose X, we accept {consequence A} but gain {benefit B}
   - If we choose Y, we accept {consequence C} but gain {benefit D}
3. Evaluate against context-specific weights:
   - Which consequence is LESS damaging given our team, timeline, and constraints?
   - Which benefit is MORE valuable given our product stage and business goals?
4. Document the rejected option's merits honestly
5. Revisit the decision when context changes

Forced trade-off categories:
  - Consistency vs. Availability (CAP theorem)
  - Speed of delivery vs. Architectural purity
  - Flexibility vs. Safety (dynamic typing vs. static typing)
  - Coupling vs. Performance (normalized data vs. denormalized)
  - Operational simplicity vs. Scalability
```

### Architecture Review Severity Matrix
```
                            HIGH IMPACT
                                |
                    +---------------------+
                    |                     |
         URGENT     |  BLOCKER            |  CRITICAL
                    |  Must fix before     |  Must fix this
                    |  proceeding          |  sprint
                    +---------------------+
                    |                     |
         ROUTINE    |  MINOR              |  MAJOR
                    |  Address this        |  Must fix before
                    |  quarter             |  next release
                    +---------------------+
                                |
                            LOW IMPACT
```

### Non-Functional Requirements (NFR) Decision Tree
```
What is the expected scale in 12 months?
  |-- < 1K MAU --> NFR target: p95 < 500ms, 99% uptime
  |-- 1K-100K MAU --> NFR target: p95 < 300ms, 99.5% uptime, handle 10x spikes
  |-- 100K-1M MAU --> NFR target: p95 < 200ms, 99.9% uptime, auto-scale
  |-- 1M+ MAU --> NFR target: p95 < 100ms, 99.99% uptime, multi-region

What compliance requirements apply?
  |-- NONE --> Standard security: encryption, auth, audit logging
  |-- SOC 2 --> Add: access reviews, change management, vendor assessment
  |-- HIPAA --> Add: BAA, PHI encryption, access logging, audit controls
  |-- PCI DSS --> Add: card data isolation, SAQ, quarterly scans
  |-- GDPR / CCPA --> Add: data deletion API, consent management, DPA
  |-- FedRAMP --> Add: IL2/IL4/IL5 controls, 3PAO assessment
```

## Agent Protocol

### Trigger
- "architecture decision", "ADR", "system design", "architecture pattern", "architecture review"
- "trade-off", "architecture evaluation", "technology choice", "architecture comparison"
- "non-functional requirements", "NFR", "architecture characteristics"
- "high-level design", "HLD", "solution design"
- "architecture proposal", "architecture document"

### Input Context
- Known requirements, constraints, and context from the user
- If not provided, ask: "What are the key requirements, constraints, and context?"
- Check existing ADRs in `docs/decisions/` for prior decisions
- Check for existing architecture diagrams in `docs/architecture/`

### Output Artifact
- `docs/decisions/ADR-{number}-{kebab-title}.md` for ADRs
- Architecture diagrams (C4 model), pattern recommendations, trade-off analysis
- Architecture review checklist completion

### Response Format
```
## Context
{Summary of the requirements, constraints, and current state}

## Analysis
{Options considered, trade-offs evaluated with forced trade-off framework}

## Recommendation
{Selected pattern/decision with rationale and context-specific justification}

## Consequences
{Positive: specific benefits | Negative: specific trade-offs | Mitigation: how we address negatives}

## ADR
{Link to or inline ADR content}

## Next Steps
{Implementation guidance, validation criteria, revisit conditions}
```

### Completion Criteria
- [ ] Architecture decision(s) documented as ADR(s)
- [ ] Trade-offs explicitly stated using forced trade-off framework
- [ ] Selected pattern justified with context-driven reasoning
- [ ] Rejected alternatives documented with reasons
- [ ] Consequences documented (positive + negative + mitigation)
- [ ] NFRs addressed with numeric targets
- [ ] At least 2 alternatives considered per decision
- [ ] Fitness function defined to validate the decision

### Max Response Length
Unlimited — architecture requires thorough analysis.

## Trade-off Catalog

### REST vs GraphQL vs gRPC
| Dimension | REST | GraphQL | gRPC |
|-----------|------|---------|------|
| Maturity | Highest | Medium | High |
| Caching | Native HTTP caching | Custom | Requires gateway |
| Over-fetching | Common | Eliminated | Schema-defined |
| Tooling | OpenAPI/Swagger | GraphiQL/APOLLO | protoc/grpcurl |
| Streaming | SSE/Chunked | Subscriptions | Native bidirectional |
| Browser | Native | Native | Requires proxy/gRPC-web |
| Learning curve | Low | Medium | Medium-high |
| Best for | Public APIs, CRUD | Complex UIs, mobile | Internal services, high throughput |

### Monolith vs Microservices Decision
```
Choose monolith if:
  - Team < 5 engineers
  - Domain is well-understood and stable
  - Time-to-market is critical
  - Operational expertise is limited
  - Deployment frequency is < weekly

Choose microservices if:
  - Team > 10 engineers across multiple squads
  - Domain has clear bounded contexts
  - Independent scaling is needed
  - Different deployment cadences per service
  - Polyglot technology is required
  - Organizational structure follows Conway's Law
```

### SQL vs NoSQL Decision
```
Choose SQL (PostgreSQL, MySQL) if:
  - Complex relationships and joins
  - ACID transactions required
  - Schema is stable and well-defined
  - Reporting/analytics queries
  - Data integrity is paramount

Choose NoSQL (Document, Key-Value, Wide-Column) if:
  - Flexible/evolving schema
  - High write throughput
  - Simple key-based access patterns
  - Horizontal scaling is primary concern
  - Eventual consistency is acceptable

Hybrid pattern: SQL for transactional data + NoSQL for event logs, caches, denormalized reads
```

### Synchronous vs Asynchronous Communication
```
Use synchronous (REST/gRPC) for:
  - Queries where immediate response is needed
  - Simple CRUD operations
  - User-facing request-response flows
  - Low-latency requirements

Use asynchronous (Queue/Stream) for:
  - Decoupling services with different availability profiles
  - Event notifications to multiple consumers
  - Workflow orchestration with multiple steps
  - Load leveling (buffering spikes)
  - Audit trails and event sourcing

Rule: When in doubt, prefer async. Synchronous coupling is harder to undo than async.
```

### Stateful vs Stateless Design
```
Prefer stateless whenever possible:
  - Easier horizontal scaling
  - Simpler deployment and rollback
  - Better fault tolerance
  - Predictable resource usage

Go stateful only when:
  - Session state cannot be externalized
  - Caching requirements demand local memory
  - Real-time processing requires in-memory state
  - Database cannot meet latency requirements

Mitigation: Externalize state to Redis, database, or distributed cache.
Design stateful components with clear scaling boundaries.
```

## Architecture Quality Attributes

### Measurability Criteria
| Attribute | Metric | Target | Measurement Method |
|-----------|--------|--------|-------------------|
| Performance | p95/p99 latency | <200ms / <500ms | Distributed tracing |
| Scalability | Max throughput per instance | Defined per service | Load testing |
| Availability | Uptime % | 99.9%+ | Monitoring + SLI |
| Reliability | Error rate | <0.1% of requests | Error budget tracking |
| Security | CVSS critical findings | 0 in production | SAST/DAST scanning |
| Maintainability | Cyclomatic complexity per module | <15 | Static analysis |
| Testability | Code coverage | >80% | Coverage reports |
| Deployability | Time from merge to production | <1 hour | CI/CD pipeline metrics |

### Architecture Fitness Functions
Define automated checks that validate architecture decisions over time:
- Dependency rules: Service A must not import Service B's database
- Contract tests: API response schema must match OpenAPI spec
- Performance gates: p99 latency must stay under threshold
- Security gates: No critical vulnerabilities in dependencies
- Architecture tests: Package layering rules (e.g., controller → service → repository)

### Architecture Debt Tracking
| Debt Type | Description | Interest | Paydown Strategy |
|-----------|-------------|----------|------------------|
| Structural | Violation of layering, circular dependencies | Slows all changes | Refactor with clear boundaries |
| Technology | Deprecated libraries, outdated frameworks | Security risk, hiring difficulty | Upgrade or replace |
| Testing | Missing tests, slow test suite | Regression risk, slow feedback | Test coverage increment |
| Documentation | Missing ADRs, outdated diagrams | Knowledge loss, onboarding friction | Document as changes are made |
| Standardization | Multiple patterns for same concern | Cognitive load, inconsistent behavior | Converge on standard patterns |

## Workflow

### Step 1: Understand Context
Gather requirements, constraints, existing architecture, and team capabilities. Identify the key architectural drivers — the 3-5 non-negotiable requirements that will shape every decision. Ask: "What must be true for this architecture to be successful?"

### Step 2: Identify Options
Generate 2-4 viable alternatives. Include at least one conventional option (low risk) and one innovative option (higher reward). Never present only one option — that's not a decision, it's a mandate. For each option, identify the forced trade-off: what you gain and what you irreversibly lose.

### Step 3: Evaluate Trade-offs
Use the forced trade-off framework. Evaluate each option against:
- Functional requirements (does it do what's needed?)
- Non-functional requirements (does it meet NFR targets?)
- Team capability (can the team operate it?)
- Total cost of ownership (over 3 years)
- Strategic alignment (does it move toward or away from the target architecture?)

### Step 4: Make Recommendation
Select the option with the best weighted score. Document the rationale explicitly — reference specific constraints and context. Do not hedge: "We recommend X because Y and Z constraints make it the only viable choice."

### Step 5: Document as ADR
Capture the decision as an Architecture Decision Record. Include: context, decision, rationale, consequences (positive + negative + mitigation), alternatives considered, compliance mechanism. One ADR per decision. Save to `docs/decisions/`.

### Step 6: Define Validation
Specify how this decision will be validated over time:
- Fitness functions: automated checks that enforce the decision
- Review triggers: what event should trigger a revisit
- Success criteria: how will we know this was the right choice?

## Process Patterns

### Pattern 1: Architecture Decision Spike
**When**: Decision has high uncertainty with 3+ viable alternatives
**Process**: Timebox 2-4 hours per option. Build a proof-of-concept for the top 2. Measure against real metrics (latency, throughput, developer experience). Document findings in an ADR.
**Output**: ADR with empirical evidence from the spike.

### Pattern 2: Architecture Review Board
**When**: Significant decisions affect multiple teams or systems
**Process**: Submit ADR as RFC to the review board. Board reviews within 1 week. Decision by consensus, escalated to chief architect if needed. Document rationale.
**Output**: Reviewed and accepted/rejected ADR.

### Pattern 3: Emergency Architecture Decision
**When**: Production incident requires immediate architectural choice
**Process**: Make the decision. Implement the fix. Write the ADR within 24 hours. Mark status as "Accepted (Emergency)". Revisit within 30 days.
**Output**: ADR written post-hoc.

### Pattern 4: Architecture Refinement Sprint
**When**: Architecture debt has accumulated to blocking levels
**Process**: Dedicate one sprint to addressing the top 5 architecture debt items. Each item is a technical story with acceptance criteria. Measure before/after against architecture metrics.
**Output**: Reduced architecture debt, updated ADRs.

## Anti-Patterns

### 1. Architecture by Resume
Choosing a technology because someone on the team wants it on their resume rather than because it fits the problem. Fix: evaluate technology on merit, not team members' career goals. If someone wants to learn a technology, do it in a side project, not production architecture.

### 2. Premature Scalability
Designing for millions of users when you have dozens. Building a microservices architecture for a 3-person team. The cost of complexity kills the product before scalability matters. Fix: design for the scale you need in the next 6-12 months. Evolve the architecture as you grow.

### 3. Gold-Plating
Adding unnecessary complexity — event sourcing, CQRS, Kubernetes — when simpler solutions work. Every layer of abstraction is a tax. Fix: ask "What is the simplest thing that could possibly work?" Start there. Add complexity only when it solves a concrete, measurable problem.

### 4. One-Size-Fits-All
Using the same architecture pattern for every feature. A real-time chat service and a nightly report generator should not use the same architecture. Fix: match the pattern to the concern. Heterogeneous architecture is not inconsistency — it's appropriate design.

### 5. Analysis Paralysis
Spending weeks comparing technologies when the differences are marginal. A decision made quickly with 80% confidence and revisited later is better than a perfect decision that takes months. Fix: timebox architecture decisions. Small decisions: 1 hour. Medium: 4 hours. Large: 1 day.

### 6. Ignoring Operational Cost
Choosing a technology based on development cost alone without considering operational burden. A "free" open-source database may cost more in operational labor than a managed service. Fix: calculate 3-year TCO including engineering time, infrastructure, and operations.

### 7. Architecture as a Phase
Treating architecture as a separate phase done before coding. Architecture that isn't validated by implementation is speculative. Fix: architecture and implementation are concurrent. Build the riskiest parts first to validate architecture decisions.

### 8. Ivory Tower Architecture
Architecture decisions made without input from the engineers who will implement and operate them. The team will find ways around decisions they don't believe in. Fix: involve implementers in decision-making. Architecture is a team sport.

### 9. Failure to Deprecate
The architecture accumulates patterns, frameworks, and services that are no longer needed but never removed. Each addition stays forever. Fix: every architecture decision should include an exit strategy. Retire old patterns as new ones are adopted.

### 10. Not Documenting Rationale
Making decisions without recording why. Future team members reverse-engineer the rationale, often incorrectly, and make decisions that conflict with the original intent. Fix: every significant decision gets an ADR. The rationale is more important than the decision.

## Templates

### Forced Trade-off Template
```markdown
## Trade-off: {Option A} vs {Option B}

### If we choose {Option A}:
Gain: {specific benefit}
Lose: {specific trade-off}
Mitigation: {how we address the loss}

### If we choose {Option B}:
Gain: {specific benefit}
Lose: {specific trade-off}
Mitigation: {how we address the loss}

### Decision: {A or B}
Rationale: {why this choice given our specific context}
```

### Technology Selection Template
```markdown
## Technology: {Name}

### Evaluation Criteria
| Criterion | Weight | Score (1-10) | Weighted |
|-----------|--------|-------------|----------|
| Team expertise | 25% | 8 | 2.0 |
| Ecosystem maturity | 20% | 7 | 1.4 |
| Operational cost | 20% | 6 | 1.2 |
| Performance | 15% | 9 | 1.35 |
| Scalability | 10% | 8 | 0.8 |
| Community/support | 10% | 7 | 0.7 |
| **Total** | **100%** | | **7.45** |

### Decision: {Adopt / Trial / Assess / Hold}
Rationale: {context-specific justification}
```

### Architecture Review Checklist
```markdown
- [ ] Requirements met: all functional requirements addressed
- [ ] NFRs met: performance, security, scalability, availability targets defined
- [ ] Trade-offs documented: forced trade-offs explicitly stated
- [ ] Alternatives considered: at least 2 alternatives with reasons for rejection
- [ ] Consequences documented: positive and negative
- [ ] Compliance mechanism defined: how the decision is enforced
- [ ] Cost estimated: development + operational TCO
- [ ] Migration path defined: how to transition from current state
- [ ] Rollback plan: what to do if the decision proves wrong
- [ ] Team capability: team can implement and operate the solution
- [ ] ADR written: decision captured in ADR format
```

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| ADR creation time | < 2 hours | Time from trigger to save |
| Architecture debt trend | Decreasing | Debt tracking per quarter |
| Decision reversal rate | < 20% | Superseded / total ADRs |
| Team satisfaction with decisions | > 4/5 | Quarterly survey |
| Time from request to decision | < 1 week for standard | Review board metrics |
| NFR compliance | > 90% of targets met | Fitness function execution |

## References
  - references/adr-template.md — ADR-{number}: {title}
  - references/architecture-decision-framework.md — Architecture Decision Framework
  - references/architecture-patterns-catalog.md — Architecture Patterns Catalog
  - references/architecture-review-checklist.md — Architecture Review Checklist
  - references/domain-modeling-guide.md — Domain Modeling Guide for Solution Architects
  - references/solution-arch-templates.md — Solution Architecture Templates
  - references/solution-architecture-advanced.md — Solution Architecture Advanced Topics
  - references/solution-architecture-fundamentals.md — Solution Architecture Fundamentals
  - references/system-design-methodology.md — System Design Methodology for Solution Architects
  - references/c4-model-visualization.md — C4 Model for Architecture Visualization
  - references/architecture-evaluation-methods.md — Architecture Evaluation Methods
  - references/architecture-fitness-functions.md — Architecture Fitness Functions
  - references/reference-architectures.md — Reference Architectures for Solution Architects
  - references/architecture-modernization.md — Architecture Modernization
  - references/technology-radar.md — Technology Radar for Solution Architects
  - references/architecture-debt-management.md — Architecture Debt Management
  - references/architecture-leadership.md — Architecture Leadership
  - references/architecture-metrics.md — Architecture Metrics
  - references/architecture-risk-quantification.md — Architecture Risk Quantification
  - references/api-architecture-strategy.md — API Architecture Strategy
  - references/security-architecture-guide.md — Security Architecture Guide
  - references/startup-vs-enterprise-architecture.md — Startup vs Enterprise Architecture
## Handoff
Carry forward: ADR numbers used, decisions made, key trade-offs, outstanding decisions.
