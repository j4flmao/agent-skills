# ADR Decision Capture

## Overview

Architecture Decision Records capture the rationale behind significant technical decisions. The value of an ADR lies not in the decision itself but in the context, alternatives, and reasoning that produced it. This reference covers the art and science of decision capture: what makes a good ADR, how to structure alternatives, how to evaluate trade-offs objectively, and how to ensure ADRs remain useful over time.

## What Makes a Decision Worth Recording

### Decision Significance Scale

Use this scale to determine whether a decision merits an ADR:

| Level | Criteria | Example | ADR Required? |
|-------|----------|---------|---------------|
| L1 - Strategic | Affects system architecture, has long-term cost/complexity implications | Database selection, API paradigm, deployment model | Yes |
| L2 - Tactical | Affects a subsystem, moderate cost to reverse | Message broker, caching strategy, state management approach | Yes |
| L3 - Operational | Affects how the team works, low cost to reverse | CI/CD tool, linting rules, code formatting | Maybe — document if not obvious |
| L4 - Trivial | Easily changed, low impact | Variable naming convention, comment style, specific library version | No |

### Decision Capture Test

Ask these three questions. If any answer is "yes", write an ADR:

1. **Will this decision be expensive to reverse?** Database, framework, infrastructure.
2. **Will future team members wonder why we chose this?** Any non-obvious choice.
3. **Did the team debate multiple options?** The debate itself indicates significance.

## ADR Structure Deep Dive

### Title Convention

```
ADR-{NNN}-{kebab-case-title}.md
```

Examples:
- `ADR-001-use-postgresql-for-primary-database.md`
- `ADR-014-adopt-event-driven-architecture-for-order-processing.md`

### Section-by-Section Guidance

#### Status Section

```markdown
## Status

Proposed  →  Accepted  →  Superseded by ADR-{NNN}
                ↓
           Deprecated
```

Decision statuses and their meanings:

| Status | Meaning | Action Required |
|--------|---------|----------------|
| Proposed | Suggested but not yet adopted | Review and discussion needed |
| Accepted | Formally adopted | Implementation should follow this decision |
| Deprecated | Still valid but should not be used for new work | Migration plan needed |
| Superseded | Replaced by another decision | Update all references to point to new ADR |
| Rejected | Considered but not adopted | Keep for historical record of what was discussed |

#### Context Section

The context section is the most important part of an ADR. It must capture the situation that created the need for a decision:

```markdown
## Context

Our application processes real-time financial transactions with a requirement
for sub-100ms end-to-end latency. The current monolithic architecture uses a
shared PostgreSQL database that has become a bottleneck as transaction volume
grew from 100 TPS to 10,000 TPS over 18 months. We have experienced three
production incidents in the last quarter directly attributed to database
contention. The team has seven engineers and operates on a two-week sprint
cycle.

Key constraints:
- Must maintain processing during migration (zero downtime)
- Team has experience with Kafka but not with Kinesis or Pulsar
- Compliance requires full audit trail of all transactions
- Budget for new infrastructure is approved but not unlimited
- Existing deployment uses AWS with significant sunk cost in RDS
```

**Good context includes:**
- The problem that triggered the decision.
- Relevant constraints (time, budget, team skills, compliance).
- The scale and scope of the decision's impact.
- Any previous decisions that relate to this one.

#### Decision Section

```markdown
## Decision

We will adopt an event-driven architecture using Apache Kafka for the order
processing pipeline, with each domain service owning its event schema and
communicating asynchronously through Kafka topics.

Key elements of the decision:
1. Order Service produces OrderPlaced events to the `orders.placed` topic
2. Payment Service consumes OrderPlaced, processes payment, produces PaymentProcessed or PaymentFailed events
3. Inventory Service consumes PaymentProcessed, reserves inventory, produces InventoryReserved events
4. Each service maintains its own materialized view in a dedicated database
5. Schema Registry enforces event schema evolution with backward compatibility
```

**A good decision statement is:**
- Specific enough that someone can implement without ambiguity.
- Focused on what was decided, not why (rationale covers why).
- Scoped to the decision boundary.

#### Rationale Section

```markdown
## Rationale

Kafka was chosen over AWS Kinesis and RabbitMQ for the following reasons:

1. Strong durability guarantees (persistent log) are essential for our compliance
   requirements. Kafka's replay capability allows full audit reconstruction.

2. The team's existing Kafka expertise reduces learning curve and migration risk.
   Three team members have production Kafka experience from a previous project.

3. Kafka's partitioning model enables the linear scalability we need to handle
   10,000+ TPS without architectural changes.

4. Schema Registry integration provides the type safety needed for a system with
   12+ services exchanging events, preventing integration failures at deployment time.
```

**Rationale must:**
- Reference specific pros/cons from the alternatives analysis.
- Explain why the chosen option was better given the context.
- Address the key constraints identified in the context section.

#### Consequences Section

```markdown
## Consequences

### Positive
- Each service can scale independently based on its own processing load
- New services can be added by subscribing to existing topics without modifying producers
- Full audit trail is built into the event log — no separate audit implementation needed
- Development velocity improves because services are decoupled and independently deployable

### Negative
- Eventual consistency means users may see stale data for short periods
- Debugging distributed flows is harder than debugging synchronous request-response
- Operational complexity increases: Kafka cluster maintenance, monitoring, alerting
- Data loss scenarios require careful testing and recovery procedures

### Mitigation
- Accept eventual consistency — document expected propagation delays for product team
- Invest in distributed tracing (OpenTelemetry) from day one of the migration
- Dedicate DevOps time to Kafka cluster management and monitoring
- Implement chaos engineering practices to validate recovery procedures
```

#### Compliance Section

```markdown
## Compliance

This decision will be enforced through:
1. Architecture tests in CI that verify services only communicate through Kafka topics
   (no direct HTTP calls between domain services)
2. Schema validation in CI pipeline — every event schema change must pass compatibility
   checks against the Schema Registry
3. Code review checklist item: "Does this change introduce synchronous cross-service
   communication?"
4. Monthly architecture review to verify event boundaries are not being violated
```

#### Alternatives Section — The Heart of ADR Quality

```markdown
## Alternatives Considered

### Alternative 1: AWS Kinesis

**Pros:**
- Fully managed — no cluster to operate, no broker maintenance
- Native AWS integration with IAM, CloudWatch, and Lambda
- Automatic scaling based on shard throughput

**Cons:**
- Shard limits require careful capacity planning (5 TPU per shard write)
- Retention limited to 365 days (vs. unlimited with Kafka tiered storage)
- Replay functionality is less mature than Kafka's consumer group management
- Schema Registry integration is not native — requires custom implementation

**Why not chosen:**
Kinesis's managed nature is appealing, but the 365-day retention limit
is insufficient for our compliance requirements, and the lack of native
schema registry would create integration risk for our multi-service architecture.

### Alternative 2: RabbitMQ with Stream Plugin

**Pros:**
- Familiar AMQP protocol — many team members have used RabbitMQ before
- Lower operational complexity than Kafka for small clusters
- Good support for competing-consumer patterns

**Cons:**
- Stream plugin is relatively new and less battle-tested in production
- Performance degrades significantly beyond 10,000 messages/second
- Partitioning and parallelism model is weaker than Kafka
- Smaller ecosystem for stream processing integrations

**Why not chosen:**
While RabbitMQ is excellent for traditional message queuing, its stream processing
capabilities do not match Kafka's at our scale. The performance ceiling would
require re-architecture within 12-18 months.

### Alternative 3: Do Nothing (Keep Monolith)

**Pros:**
- Zero migration risk — no need to change the working system
- No additional operational complexity
- No team training required

**Cons:**
- Database contention will continue to cause incidents
- Scaling requires vertical scaling of the database, which has limits and costs
- New feature velocity is already slowing due to coupling in the monolith
- Hiring is harder — engineers prefer modern architectures

**Why not chosen:**
Doing nothing is not viable. The incident trend shows the current architecture
is reaching its limit, and delaying the migration increases technical debt and
business risk. The cost of maintaining the status quo now exceeds the migration cost.
```

**Alternative analysis must:**
- Include 2-4 realistic options (always include "do nothing" if it is viable).
- Have at least 2 pros and 2 cons per alternative.
- Be impartial — do not load the chosen option with more favorable language.
- End with a clear "why not chosen" for each rejected alternative.

## Decision Quality Criteria

### Evaluating Decision Completeness

```yaml
decision_quality_checklist:
  context:
    - "Does the context clearly state the problem?"
    - "Are all relevant constraints documented?"
    - "Is the scope of the decision clear?"
    - "Are related decisions referenced?"

  alternatives:
    - "Are there 2-4 realistic alternatives?"
    - "Does each alternative have balanced pros and cons?"
    - "Is 'do nothing' included when applicable?"
    - "Is each rejection justified with a specific reason?"

  decision:
    - "Is the decision stated clearly and precisely?"
    - "Can someone implement this without asking for clarification?"
    - "Is the decision scoped appropriately (not too broad, not too narrow)?"

  rationale:
    - "Does the rationale reference specific pros/cons from alternatives?"
    - "Does the rationale address the key constraints from context?"
    - "Is the reasoning logical and complete?"

  consequences:
    - "Are positive consequences documented?"
    - "Are negative consequences documented honestly?"
    - "Does every negative consequence have a mitigation plan?"

  compliance:
    - "Is there a mechanism to enforce this decision?"
    - "Is the enforcement mechanism realistic and sustainable?"
```

## Decision Capture Process

### When to Capture

| Timing | Method | Quality |
|--------|--------|---------|
| During the discussion | Collaborative document (Google Doc, Notion) | Medium — captures debate |
| Immediately after decision | Solo write-up by decision-maker | High — fresh context |
| Within the implementation PR | Template-based ADR | Medium — may miss context |
| During architecture review | Assigned ADR author | Medium-High — structured |

### Decision Capture Workshop

For complex decisions, a structured workshop produces better ADRs:

```markdown
## Architecture Decision Workshop

**Duration:** 2 hours
**Participants:** Tech lead, architects, engineers from affected teams

### Agenda

| Time | Activity |
|------|----------|
| 0-20 | Context setting — problem statement, constraints, success criteria |
| 20-40 | Brainstorm alternatives — all ideas accepted, no evaluation yet |
| 40-60 | Evaluate alternatives — pros/cons for each option |
| 60-80 | Decision — vote or consensus, select the best option |
| 80-100 | Capture rationale — document why this option was chosen |
| 100-120 | Document consequences and compliance — assign ADR author |

### Output
- Draft ADR with complete context, alternatives, decision, rationale, consequences
- Clear action items for ADR author (usually tech lead)
- Implementation timeline if decision has migration impact
```

## Managing Decision Debt

### Decision Debt Tracking

Just as code accumulates technical debt, architecture decisions accumulate "decision debt" when the rationale is lost or the decision is no longer optimal:

```yaml
decision_debt_register:
  adr_005:
    title: "Use MongoDB for User Profiles"
    status: "Accepted"
    is_outdated: true
    reason: "We now have a relational data model for profiles"
    action: "Write new ADR to migrate to PostgreSQL"

  adr_012:
    title: "Monorepo with npm workspaces"
    status: "Accepted"
    is_outdated: true
    reason: "Monorepo is too large (50+ packages); build times are 20+ minutes"
    action: "Write new ADR for splitting into multiple repos"

  adr_018:
    title: "Manual approval for production deployments"
    status: "Accepted"
    is_outdated: true
    reason: "Team has grown from 5 to 25; manual approval is a bottleneck"
    action: "Write new ADR for automated deployment pipeline"
```

### Decision Review Cadence

```yaml
review_cadence:
  quarterly:
    - "Review all ADRs with 'Accepted' status"
    - "Flag outdated decisions based on changed context"
    - "Assign owners for superseding outdated ADRs"
  yearly:
    - "Full architecture review against current requirements"
    - "Check decision debt register"
    - "Validate compliance mechanisms are working"
  trigger_based:
    - "New major feature or system"
    - "Team size doubles"
    - "Scale increases by 10x"
    - "New regulatory requirement"
```

## Cross-Referencing ADRs

### ADR Relationships

```markdown
## Relationships

This ADR:
- Supersedes: ADR-012 (Monorepo Strategy)
- Is extended by: ADR-015 (CI/CD Pipeline for Multi-Repo)
- Conflicts with: ADR-008 (Shared Library Approach) — resolved in favor of this ADR
- Related to: ADR-003 (Package Manager Selection)

Decision graph:
    ADR-003 ────┐
                 ├──→ ADR-012 ──→ THIS ADR ──→ ADR-015
    ADR-008 ────┘
```

### Decision Log Index

Maintain an index file in `docs/decisions/README.md`:

```markdown
# Architecture Decision Log

This log records architecture decisions for the {project} project.

## Format and Conventions
- One ADR per decision
- Status: Proposed, Accepted, Deprecated, Superseded, Rejected
- Numbering: sequential, never reused

## Active Decisions

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 001 | Use PostgreSQL for Primary Database | Accepted | 2023-01-15 |
| 003 | Adopt Event-Driven Architecture for Orders | Accepted | 2023-03-01 |
| 005 | Use MongoDB for User Profiles | Deprecated | 2023-02-01 |

## Superseded Decisions

| ADR | Title | Superseded By | Date Superseded |
|-----|-------|--------------|-----------------|
| 002 | Use MySQL for Primary Database | ADR-001 | 2023-01-15 |
| 004 | Monorepo with npm Workspaces | ADR-014 | 2024-03-15 |

## Rejected Decisions

| ADR | Title | Reason Summary | Date |
|-----|-------|---------------|------|
| 006 | Adopt GraphQL for All APIs | Team expertise insufficient at time of evaluation | 2023-04-01 |
```

## Decision Quality Anti-Patterns

| Anti-Pattern | Description | Fix |
|-------------|-------------|-----|
| "Architecture by blog post" | Choosing an option because a popular blog post recommended it | Reference specific pros/cons relevant to your context |
| "The devil we know" | Choosing familiar technology even when it is a worse fit | Explicitly evaluate against decision criteria |
| "Analysis paralysis" | Endless alternatives evaluation without deciding | Set a deadline; require a decision by that time |
| "Revenge of the rejected" | The rejected option keeps being brought up in every discussion | Show the ADR and its rationale; update it if context has changed |
| "Zombie ADRs" | ADRs that are superseded but still referenced as if active | Update status and notify team when an ADR is superseded |
| "Ghost ADRs" | Decisions documented outside the ADR process (Slack, email, meeting notes) | Create an ADR and retroactively capture context |
| "Fake alternatives" | Listing straw-man alternatives that are obviously inferior | Include genuinely competitive options |
| "The rationalization" | Decision was made emotionally but rationale is written to appear analytical | Encourage honest retrospective; it is OK to admit subjective factors |

## References
- references/adr-architecture-evolution.md — ADR and Architecture Evolution
- references/adr-best-practices.md — ADR Best Practices
- references/adr-examples.md — ADR Examples
- references/adr-template.md — ADR Template
- references/adr-workflow.md — ADR Workflow
- references/create-adr-advanced.md — Create ADR Advanced Topics
