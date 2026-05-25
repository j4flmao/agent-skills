# Solution Architecture Templates

## Architecture Decision Record (ADR)

```markdown
# ADR-{N}: {Title}

## Status
{Proposed / Accepted / Deprecated / Superseded}

## Context
{What is the problem? What constraints exist? What options were considered?}

## Decision
{What was decided and why}

## Consequences
{Positive: ...}
{Negative: ...}
{Risks: ...}

## Compliance
{How will this decision be enforced?}
```

### ADR Example
```markdown
# ADR-001: Use PostgreSQL for Primary Database

## Status
Accepted

## Context
We need a primary database for the order management system.
Requirements: ACID compliance, JSON support, managed cloud service, < 10ms latency.

## Decision
Use PostgreSQL 16 with TimescaleDB extension.
Rationale: ACID compliance for orders, JSONB for flexible attributes,
native UUID support, managed service on all cloud providers.

## Consequences
Positive: Strong data integrity, excellent tooling, cost-effective managed services.
Negative: Not ideal for graph queries (would need separate graph DB).
Risks: Connection pooling needed beyond 200 concurrent connections.

## Compliance
Enforced via: Database migration review in CI pipeline.
```

## Solution Context Diagram

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Mobile    │────▶│              │────▶│   Orders     │
│    App      │     │  API Gateway │     │   Service    │
└─────────────┘     │              │     └──────┬───────┘
                    │  (Kong)      │            │
┌─────────────┐     │              │     ┌──────▼───────┐
│   Web App   │────▶│              │────▶│  Payment     │
│  (Next.js)  │     └──────────────┘     │  Service     │
└─────────────┘                          └──────────────┘
```

## Template Structure

| Template | Purpose | Sections |
|----------|---------|----------|
| ADR | Individual decisions | Context, Decision, Consequences |
| Solution brief | High-level overview | Problem, Proposed solution, Options |
| Technical spec | Implementation detail | Architecture, Data model, API, Deployment |
| Context diagram | System relationships | External actors, System boundaries, Data flows |

## Architecture Review Template

```markdown
## Architecture Review: {System Name}

### Overview
- Scope:
- Stakeholders:
- Review date:

### Key Decisions
| Decision | Option Selected | Alternatives | Rationale |
|----------|----------------|--------------|-----------|

### Architecture Characteristics
| Characteristic | Priority | Current Status | Target |
|----------------|----------|----------------|--------|
| Scalability | High | ... | ... |
| Availability | High | ... | ... |
| Security | Critical | ... | ... |
| Maintainability | Medium | ... | ... |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ... | High/Med/Low | High/Med/Low | ... |

### Action Items
- [ ] {item} — Owner — Due date
```

## Trade-off Analysis Format

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Cost | Low | Medium | High |
| Complexity | Low | High | Medium |
| Performance | Good | Excellent | Good |
| Scalability | Limited | Excellent | Good |
| Maintenance | Low | High | Medium |
| **Score** | **3.5/5** | **4/5** | **3/5** |
