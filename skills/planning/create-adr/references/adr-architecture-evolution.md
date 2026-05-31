# ADR and Architecture Evolution

## Overview

Architecture is never static. Systems evolve as requirements change, scale increases, team composition shifts, and technology advances. Architecture Decision Records track this evolution, providing the historical context that explains why the system looks the way it does today. This reference covers how ADRs document architectural evolution, how to manage superseding decisions, how to use ADRs for migration planning, and how ADRs support architectural governance over time.

## The Architecture Evolution Lifecycle

```
Phase 1: Startup / MVP
  └── Focus: Speed of delivery
  └── ADRs: Few (if any) — decisions are reversible at this stage
  └── Architecture: Monolith, single database, simple deployment

Phase 2: Growth / Traction
  └── Focus: Scalability, team expansion
  └── ADRs: Increasing — decisions become harder to reverse
  └── Architecture: Modular monolith or coarse services

Phase 3: Scale / Maturity
  └── Focus: Reliability, performance, compliance
  └── ADRs: Regular — every significant change documented
  └── Architecture: Microservices, specialized data stores

Phase 4: Evolution / Modernization
  └── Focus: Technical debt reduction, platform modernization
  └── ADRs: Superseding old decisions
  └── Architecture: Continual improvement cycle
```

## Documenting Architecture Evolution

### The Decision Timeline

ADRs create a timeline of architectural decisions. Reading them in order tells the story of the system:

```markdown
ADR-001 (2023-01): Use PostgreSQL for primary database
  → Initial decision for MVP

ADR-003 (2023-06): Use MongoDB for user profiles
  → New requirement: flexible schema for user profiles

ADR-005 (2024-01): Deprecate MongoDB, migrate profiles to PostgreSQL
  → Changed context: MongoDB operational overhead exceeds benefits
  → Context evolved: team grew, new team lacked MongoDB expertise

ADR-007 (2024-06): Implement read replicas for PostgreSQL
  → New requirement: reporting queries impacting primary performance

ADR-009 (2024-12): Implement event-driven CQRS with Kafka
  → Fundamental architecture change for scale
  → Supersedes ADR-007 (read replicas became intermediate step)
```

### Architecture Evolution Narrative

An architecture evolution narrative connects the ADRs into a coherent story:

```markdown
# Architecture Evolution: Order Processing System

## Phase 1: Monolith (2023)
The initial system was a Rails monolith with PostgreSQL.
All order processing happened synchronously within a single transaction.

Key ADRs: ADR-001 (PostgreSQL), ADR-002 (Rails Monolith)

## Phase 2: Extracted Services (2023-2024)
As order volume grew, we extracted payment processing and inventory
management into separate services. Each service had its own PostgreSQL
database. Communication was synchronous HTTP.

Key ADRs: ADR-008 (Service Boundaries), ADR-010 (Service Communication)

## Phase 3: Event-Driven Architecture (2024-2025)
Synchronous communication between services caused cascading failures.
We migrated to event-driven architecture with Kafka. Each service now
maintains its own materialized view.

Key ADRs: ADR-012 (Event-Driven Architecture), ADR-013 (Kafka Adoption)

## Phase 4: CQRS and Read Optimization (2025)
Reporting requirements drove the adoption of CQRS pattern.
Read models are optimized for specific query patterns.

Key ADRs: ADR-015 (CQRS), ADR-016 (Read Model Strategy)

## Future Direction
- Event sourcing for audit trail (proposed)
- Multi-region deployment (under investigation)
- Real-time analytics pipeline (planned for Q3)
```

## Superseding Decisions

### When to Supersede

An ADR should be superseded when:
1. **Context has changed**: Scale, team, regulation, business model.
2. **Better alternatives emerged**: New technology, lower cost, proven patterns.
3. **The decision was wrong**: Evidence shows the chosen option is not working.
4. **Requirements evolved**: The original requirements no longer apply.

### Supersession Process

```markdown
## Supersession Process

1. Write a new ADR that describes the new decision.
2. In the new ADR's Context section, reference the old ADR(s) being superseded.
3. In the new ADR's Rationale section, explain why the context changed and why
   the new decision is now better.
4. Update the old ADR's Status to "Superseded by ADR-NNN".
5. Add a note at the top of the old ADR pointing to the new one.
6. Update the decision log index.
7. Inform the team — especially newer members who may only know the old decision.
```

### Superseded ADR Example

```markdown
# ADR-003: Use MongoDB for User Profiles

## Status
**Superseded by ADR-005**

This ADR has been superseded. The decision to use MongoDB for user profiles
has been reversed. See ADR-005 for the current decision.

## Original Content

### Context
... (original content preserved exactly as written)
```

**Important**: Never edit the body of a superseded ADR. The original content must be preserved exactly as written because it represents the team's understanding at that point in time. Only the Status field should be updated.

### Supersession Chain

```mermaid
ADR-001: Use MySQL
    ↓ (superseded by)
ADR-003: Use PostgreSQL
    ↓ (superseded by)  
ADR-008: Use PostgreSQL with Citus for distributed scaling
```

A complex system may have multiple ADR chains running in parallel for different subsystems:

```yaml
decision_chains:
  database:
    - ADR-001: MySQL (2023-01)
    - ADR-003: PostgreSQL (2023-06)
    - ADR-008: PostgreSQL + Citus (2024-03)
  
  messaging:
    - ADR-002: RabbitMQ (2023-02)
    - ADR-006: Kafka (2024-01)
  
  frontend:
    - ADR-004: React with Redux (2023-03)
    - ADR-007: React with Zustand (2024-02)
```

## Architecture Migration Planning with ADRs

### Migration ADR Structure

When migrating from one technology to another, the ADR should explicitly cover the migration plan:

```markdown
# ADR-015: Migrate from MongoDB to PostgreSQL for User Profiles

## Status
Accepted

## Context
User profiles were initially stored in MongoDB (ADR-003) because the schema
was expected to change frequently. After 18 months, the schema has stabilized
to 85% static fields. Operational overhead of maintaining MongoDB (backup,
monitoring, expertise) exceeds its flexibility benefits. The team of 12
engineers has PostgreSQL expertise but only 2 have MongoDB experience.

## Decision
Migrate user profiles from MongoDB to PostgreSQL over a 6-week period.
The migration will use a dual-write strategy with backfill.

## Migration Plan

### Phase 1: Dual Writes (Week 1-2)
- Add PostgreSQL user_profiles table
- Write to both MongoDB and PostgreSQL on every profile update
- Read from MongoDB (existing code unchanged)
- Monitor consistency: compare MongoDB vs PostgreSQL reads

### Phase 2: Backfill (Week 3-4)
- Backfill all existing MongoDB data to PostgreSQL
- Verify row counts, checksum data integrity
- Fix any inconsistencies found

### Phase 3: Cutover (Week 5)
- Switch reads from MongoDB to PostgreSQL
- Feature flag: can toggle between MongoDB and PostgreSQL
- Run side-by-side for one week with monitoring

### Phase 4: Cleanup (Week 6)
- Remove MongoDB write path
- Remove MongoDB read path
- Deprecate MongoDB connection
- Archive MongoDB data for 30 days, then drop collection

## Rollback Plan
- Feature flag toggle returns reads to MongoDB immediately
- Dual writes ensure MongoDB data remains current during cutover window
- Rollback requires no data migration

## Consequences
### Positive
- Unified database technology reduces operational complexity
- Team can apply PostgreSQL expertise across all data stores
- ACID transactions become available for user profile operations

### Negative
- Migration effort is 6 weeks of engineering time
- Dual-write period increases write latency slightly
- Risk of data inconsistency during dual-write phase

### Mitigation
- Monitoring dashboard for write consistency
- Automated reconciliation job runs hourly during dual-write phase
- Rollback plan tested before cutover
```

### Migration State Tracking

```sql
CREATE TABLE migration_state (
  migration_id VARCHAR(100) PRIMARY KEY,
  source_system VARCHAR(100) NOT NULL,
  target_system VARCHAR(100) NOT NULL,
  phase VARCHAR(50) NOT NULL, -- planning, dual_write, backfill, cutover, cleanup, completed, rolled_back
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  adr_reference VARCHAR(50), -- ADR-015
  verification_query TEXT, -- SQL query to verify data integrity
  rollback_procedure TEXT -- steps to roll back
);
```

## Architecture Governance with ADRs

### Enforcing Architecture Decisions

ADRs are only useful if they are actually followed. Governance mechanisms ensure compliance:

```yaml
governance_mechanisms:
  automated:
    - "Architecture tests in CI: verify package dependencies, layer violations"
    - "API compatibility checks: ensure backward compatibility per ADR decisions"
    - "Schema validation: enforce event schema compatibility"
    - "Dependency rules: prevent using deprecated libraries"
    - "Infrastructure as code: enforce deployment patterns"

  manual:
    - "Code review checklist items referencing active ADRs"
    - "Architecture review for significant changes"
    - "Sprint planning: verify new work aligns with architectural direction"
    - "Monthly architecture sync: review ADR compliance"

  organizational:
    - "Architecture guild or working group"
    - "Architecture decision forum (RFC process for new decisions)"
    - "Technical lead responsibilities include ADR stewardship"
```

### Architecture Test Examples

```typescript
// Verify that services don't communicate directly (ADR-012 enforcement)
describe('Architecture Tests - Service Communication', () => {
  it('services should not import each other directly', () => {
    const services = ['order-service', 'payment-service', 'inventory-service'];
    const violations: string[] = [];

    for (const service of services) {
      const imports = getImports(service);
      const directImports = imports.filter(i =>
        services.includes(i) && i !== service
      );
      if (directImports.length > 0) {
        violations.push(`${service} directly imports ${directImports.join(', ')}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('services should only communicate through Kafka topics', () => {
    const httpCalls = findHttpClientCalls('order-service');
    const serviceCalls = httpCalls.filter(call =>
      services.includes(extractServiceName(call.url))
    );
    expect(serviceCalls).toEqual([]);
  });

  // Verify schema registry compliance
  it('event schema changes should maintain backward compatibility', () => {
    const schemas = loadEventSchemas();
    for (const schema of schemas) {
      const compatibility = checkSchemaCompatibility(schema);
      expect(compatibility.isCompatible).toBe(true);
    }
  });
});
```

### Architecture Review Checklist

```markdown
## Architecture Review Checklist

### Before Implementation
- [ ] Has a relevant ADR been written for this change?
- [ ] Does the implementation plan follow the architecture decisions?
- [ ] Are there any ADRs that conflict with the proposed approach?
- [ ] Has the architecture been reviewed by the tech lead?

### During Implementation
- [ ] Are architecture tests passing?
- [ ] Are code reviews checking ADR compliance?
- [ ] Are there any deviations from the documented architecture?

### After Implementation
- [ ] Has the ADR status been updated if needed?
- [ ] Are there lessons learned that should be documented?
- [ ] Should any existing ADRs be updated or superseded?
```

## ADRs and Architecture Fitness Functions

Architecture fitness functions are automated checks that verify an architecture property is being maintained. ADRs document the rationale behind the fitness function:

```markdown
# ADR-020: Implement Scalability Fitness Function

## Context
We committed to supporting 10,000 concurrent users (ADR-016). Without automated
verification, this property erodes gradually as features are added. We need a
fitness function that runs in CI to prevent regressions.

## Decision
Add a load test to CI that simulates 10,000 concurrent users and verifies:
- P95 response time < 500ms
- Error rate < 0.1%
- Zero timeouts

## Fitness Function
```yaml
# .github/workflows/scalability-fitness.yml
name: Scalability Fitness
on:
  schedule:
    - cron: '0 6 * * 1'  # Monday 6 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: ./deploy-staging.sh
      - name: Run load test
        run: k6 run tests/load/10000-concurrent.js
      - name: Check fitness criteria
        run: k6 run tests/load/fitness-check.js
      - name: Notify on failure
        if: failure()
        run: ./notify-team.sh "Scalability fitness function failed"
```

## Consequences
- Any change that degrades scalability at 10K users will be detected within 1 week
- Load test infrastructure cost increases by ~$200/month
- Team must fix scalability regressions before the next deployment
```

## ADR Versioning and the Architecture Encyclopedia

### Decision Log as Encyclopedia

Over time, the decision log becomes an encyclopedia of the system's architecture:

```markdown
# Architecture Encyclopedia Index

## System Overview
- ADR-001: Overall Architecture (Monolith → Services → Event-Driven)
- ADR-012: Service Boundaries and Domain Definitions

## Data Layer
- ADR-003: Database Technology (PostgreSQL)
- ADR-008: Read Replicas and Caching Strategy
- ADR-015: CQRS and Read Model Pattern

## Communication
- ADR-002: Service Communication (REST → Events)
- ADR-006: Message Broker Selection (Kafka)
- ADR-010: API Gateway Pattern

## Frontend
- ADR-004: Framework Selection (React)
- ADR-007: State Management (Zustand)
- ADR-011: Component Library Strategy

## Deployment
- ADR-009: Container Orchestration (Kubernetes)
- ADR-013: CI/CD Pipeline Design
- ADR-017: Multi-Region Deployment

## Security
- ADR-014: Authentication and Authorization
- ADR-018: Secrets Management
- ADR-019: API Security Standards
```

### Onboarding with ADRs

New team members can understand the architecture by reading the decision log:

```markdown
## Architecture Onboarding Path

1. **Week 1**: Read ADR-001 (overall architecture), ADR-012 (service boundaries),
   ADR-002 (communication patterns) — understand the system at a high level.

2. **Week 2**: Read ADRs relevant to your first feature area — database choices,
   API patterns, caching strategy.

3. **Week 3**: Read the architecture evolution narrative — understand why the
   system evolved the way it did.

4. **Week 4**: Read the most recent 5 ADRs — understand the current architectural
   challenges and direction.
```

## ADRs and Architecture Debt

### Identifying Architecture Debt Through ADRs

ADRs help identify architecture debt by revealing:
- Old decisions that have been superseded but not yet migrated
- Decisions made for different scale/context that no longer apply
- Patterns of repeated supersession indicating unstable architecture

```yaml
architecture_debt_indicators:
  old_decisions:
    - "ADR-003 (6 months ago): Chose MongoDB for flexibility — schema has now stabilized"
    - "ADR-008 (1 year ago): Chose monorepo — now at 50+ packages"
    - "ADR-005 (8 months ago): Manual deployment approval — now 25+ engineers"

  pattern_indicators:
    - "ADR-002 → ADR-006 → ADR-011: Three message broker changes in 18 months"
    - "ADR-004 → ADR-009 → ADR-016: Three frontend state management changes"

  context_changes:
    - "Team grew from 5 to 30: ADRs about communication patterns need review"
    - "Revenue grew 10x: ADRs about cost optimization need reevaluation"
    - "New compliance requirements: ADRs about data handling need audit"
```

### Creating Debt Reduction ADRs

```markdown
# ADR-025: Architecture Debt Reduction Sprint

## Context
Our architecture debt audit identified 8 outdated ADRs, including the
MongoDB-for-profiles decision (ADR-003, already superseded by ADR-005 but
migration not yet complete) and the monorepo structure (ADR-008, superseded
by ADR-014 but migration at 40% completion). Partial migrations increase
operational complexity and cognitive load.

## Decision
Dedicate Sprint 14 to completing all in-progress architecture migrations.

## Scope
1. Complete MongoDB → PostgreSQL profile migration (ADR-005): 3 days
2. Complete monorepo → multi-repo migration (ADR-014): 5 days
3. Update all affected ADR statuses
4. Remove deprecated code paths and feature flags

## Success Criteria
- Zero in-progress migrations remaining
- All ADR statuses accurately reflect current state
- Deprecated code paths removed from main branch
```

## References
- references/adr-decision-capture.md — ADR Decision Capture
- references/adr-best-practices.md — ADR Best Practices
- references/adr-examples.md — ADR Examples
- references/adr-workflow.md — ADR Workflow
- references/create-adr-advanced.md — Create ADR Advanced Topics
- references/create-adr-fundamentals.md — Create ADR Fundamentals
