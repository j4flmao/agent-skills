# Architecture Decision Framework

## Overview

Architecture decisions are the most impactful choices a solution architect makes. They shape system qualities, team productivity, and long-term evolution cost. This framework provides a structured process for making, documenting, and governing architecture decisions — from quick tactical choices to complex strategic evaluations.

## Decision Types

### Decision Classification

```yaml
decision_types:
  strategic:
    description: "Long-term, high-impact, hard to reverse"
    examples:
      - "Technology platform selection (cloud provider, language ecosystem)"
      - "Architecture style (microservices vs. monolith)"
      - "Data architecture (data lake vs. warehouse vs. lakehouse)"
    cost_of_change: "Very high"
    review_required: "Architecture board"
    
  tactical:
    description: "Medium-term, component-level decisions"
    examples:
      - "Database technology for a service"
      - "API design approach (REST vs. GraphQL)"
      - "Message broker selection"
    cost_of_change: "Medium to high"
    review_required: "Lead architect"
    
  operational:
    description: "Short-term, implementation-level choices"
    examples:
      - "Caching strategy for a specific endpoint"
      - "Error handling approach in a service"
      - "Logging framework selection"
    cost_of_change: "Low to medium"
    review_required: "Tech lead"
```

### Decision Urgency Matrix

```
                    ┌─────────────────────────────────────────┐
                    │           TIME SENSITIVITY              │
                    │     Low                 High            │
                    │                                         │
    ┌───────────┼─────────────────────┼─────────────────┤
    │           │                     │                 │
    │   High    │  Strategic Decision │  Crisis Decision│
    │           │  (Full ATAM/ADR)    │  (Lightweight,  │
    │IMPORTANCE  │  Timeline: weeks    │  docs retroactively)│
    │           │                     │                 │
    ├───────────┼─────────────────────┼─────────────────┤
    │           │                     │                 │
    │   Low     │  Defer / Accept     │  Quick Decision │
    │           │  Current approach OK │  (Document as ADR)│
    │           │                     │                 │
    └───────────┴─────────────────────┴─────────────────┘
```

## Decision Process

### The Six-Step Decision Process

#### Step 1: Gather Context

Before evaluating options, establish a complete understanding of the decision context.

```
Context Checklist:
[ ] Business drivers — What business goals does this decision serve?
[ ] Technical constraints — Existing systems, team skills, operational model
[ ] Time constraints — Deadline, release cadence, urgency
[ ] Budget constraints — Infrastructure, licensing, people cost
[ ] Compliance requirements — Regulations, data residency, audit
[ ] Stakeholder concerns — Who cares and what do they need?

Output: Decision context document (1 page max)
```

#### Step 2: Identify Architecture Characteristics (NFRs)

Rank the following characteristics by importance (1-5) for the specific decision:

| Characteristic | Rank (1-5) | Why This Matters | Measurable Target |
|----------------|-----------|------------------|-------------------|
| Availability | | Uptime requirements, SLA commitments | 99.9% uptime |
| Scalability | | Growth projections, peak load | 10x current load |
| Performance | | Latency targets, throughput needs | p95 < 200ms |
| Security | | Data sensitivity, threat model | SOC 2 / HIPAA |
| Maintainability | | Team size, change frequency | < 1 week for new feature |
| Deployability | | Release cadence, CI/CD maturity | Daily deploys |
| Testability | | Test automation level | 80% coverage |
| Cost | | Infrastructure, operational, licensing | < $X/month |
| Time-to-market | | Deadline pressure, competitive window | Launch in 3 months |
| Evolvability | | Expected lifespan, future changes | 5-year architecture |
| Interoperability | | Integration complexity, ecosystem | Standard protocols |
| Observability | | Debugging, monitoring, SLOs | Full tracing |

#### Step 3: Generate Options

```
Option Generation Rules:
1. Generate at least 3 viable options
2. Consider build vs. buy vs. adapt for each
3. Map each option to the ranked characteristics
4. Include "do nothing" as option if appropriate
5. Research each option (documentation, case studies, benchmarks)

Option Template:
  Option A: {Name}
    Description: {Brief description}
    Key characteristics: {How it maps to top NFRs}
    Team alignment: {Does team have skills for this?}
    Integration: {How it fits with existing systems}
    Risk areas: {Known unknowns}
```

#### Step 4: Evaluate Trade-offs

For each option, document:

```yaml
option_evaluation:
  pros:
    - "NFRs it satisfies well"
    - "Team expertise alignment"
    - "Strategic fit with technology roadmap"
  
  cons:
    - "NFRs it compromises"
    - "Learning curve or skill gaps"
    - "Integration complexity"
  
  risks:
    technical:
      - severity: "High/Med/Low"
        description: "Known technical limitation"
    schedule:
      - severity: "High/Med/Low"
        description: "Implementation timeline risk"
    organizational:
      - severity: "High/Med/Low"
        description: "Team or process risk"
  
  cost:
    development: "Engineering time to implement"
    operations: "Ongoing operational cost"
    migration: "One-time transition cost"
    exit: "Cost to switch away later"
```

#### Step 5: Decide and Document

Choose the option with the best overall fit and document as an ADR.

```
Decision Documentation (ADR):
  Status: [Proposed / Accepted / Deprecated / Superseded]
  Context: {Problem, constraints, options considered}
  Decision: {What was chosen and why}
  Consequences: {Positive, negative, neutral}
  Compliance: {How will this be enforced?}
  Rejected Alternatives: {Each option with reason for rejection}
```

#### Step 6: Enforce and Govern

```yaml
enforcement:
  automated:
    - "Architecture tests (ArchUnit, ArchTest)"
    - "Dependency rules (dependency-cruiser, deptrac)"
    - "CI pipeline gates"
  
  manual:
    - "Architecture review for significant changes"
    - "Code review checklist referencing ADRs"
    - "Quarterly architecture compliance audit"
  
  tracking:
    - "ADR log with status tracking"
    - "Architecture decision metrics"
    - "Exception tracking for violations"
```

## Evaluation Techniques

### Weighted Decision Matrix

```yaml
weighted_matrix:
  method:
    - "Assign weight to each criterion (total = 1.0)"
    - "Score each option per criterion (1-5)"
    - "Calculate weighted score = sum(weight × score)"
    - "Sensitivity analysis: adjust weights ±10%, re-calculate"
  
  example:
    criteria:
      scalability:
        weight: 0.30
        description: "Ability to handle 10x growth"
      cost:
        weight: 0.25
        description: "Total cost of ownership (3 years)"
      team_skill:
        weight: 0.20
        description: "Existing team expertise"
      time_to_market:
        weight: 0.15
        description: "Implementation speed"
      interoperability:
        weight: 0.10
        description: "Integration with existing stack"
    
    options:
      option_a:
        scalability: 5 → 1.50
        cost: 3 → 0.75
        team_skill: 4 → 0.80
        time_to_market: 5 → 0.75
        interoperability: 3 → 0.30
        total: 4.10
      
      option_b:
        scalability: 4 → 1.20
        cost: 4 → 1.00
        team_skill: 3 → 0.60
        time_to_market: 3 → 0.45
        interoperability: 5 → 0.50
        total: 3.75
      
      option_c:
        scalability: 3 → 0.90
        cost: 5 → 1.25
        team_skill: 2 → 0.40
        time_to_market: 2 → 0.30
        interoperability: 4 → 0.40
        total: 3.25
```

### ATAM-Style Trade-off Analysis

See the Architecture Evaluation Methods reference for full ATAM process. For quick decisions, use this condensed template:

```yaml
quick_trade_off:
  decision: "Database selection for order service"
  
  trade_offs:
    - approach: "PostgreSQL"
      improves: ["Consistency", "Query flexibility", "Tooling"]
      degrades: ["Horizontal scalability", "Cross-region replication"]
      
    - approach: "DynamoDB"
      improves: ["Scalability", "Multi-region", "Operational simplicity"]
      degrades: ["Query flexibility", "Consistency", "Transaction support"]
      
    - approach: "CockroachDB"
      improves: ["Scalability", "Consistency", "Multi-region"]
      degrades: ["Cost", "Operational complexity", "Ecosystem maturity"]
  
  sensitivity_points:
    - "Query complexity requirement increase → PostgreSQL value increases"
    - "Scale requirement increase → DynamoDB/CockroachDB value increases"
    - "Feature: inventory joins across services → PostgreSQL value increases"
```

### Lightweight ARID

For partial decisions (component-level, interface-level):

```yaml
arid_evaluation:
  scope: "Order Service API contract"
  
  participants:
    architect: "Presents the design"
    reviewers: ["Order service team", "Payment service team", "Frontend team"]
  
  scenarios:
    - scenario: "User places order with 20 items"
      concern: "Request size, timeout"
      verdict: "Design handles — pagination in request"
    
    - scenario: "Payment gateway timeout"
      concern: "Error handling, user experience"
      verdict: "Missing — need async order confirmation flow"
      action: "Add async confirmation to design"
    
    - scenario: "Order status polled 100x second"
      concern: "Caching, DB load"
      verdict: "Design needs cache layer, not specified"
      action: "Add cache with 5-second TTL"
```

### Group Decision Techniques

| Technique | When to Use | How It Works |
|-----------|-------------|--------------|
| Dot Voting | Quick prioritization | Each stakeholder gets 3-5 votes, place on options |
| Roman Voting | Neutralize seniority bias | Stakeholders vote simultaneously (thumbs: yes/no/maybe) |
| Weighted Scoring | Objective comparison | Each criterion weighted, scored independently, then aggregated |
| Fist of Five | Consensus check | 5 fingers = full support, 1 = block. Discuss below 3. |
| Premortem | Risk identification | "Assume the decision failed — why?" |
| Decision Tree | Conditional decisions | Branching options with probability-weighted outcomes |

### Uncertainty Modeling

```yaml
decision_under_uncertainty:
  technique: "Scenario planning"
  
  scenarios:
    best_case:
      description: "Adoption exceeds projections (3x in 6 months)"
      impact: "Scalability requirements increase dramatically"
      winner: "DynamoDB or CockroachDB (horizontal scaling)"
    
    worst_case:
      description: "Regulatory requirements change (data residency)"
      impact: "Multi-region support becomes mandatory"
      winner: "CockroachDB or DynamoDB Global Tables"
    
    likely_case:
      description: "Steady growth (2x per year)"
      impact: "Manageable scaling requirements"
      winner: "PostgreSQL with read replicas"
  
  robust_decision: "Option that performs acceptably in ALL scenarios"
  optimal_decision: "Option that performs best in likely scenario"
  
  recommendation: "Choose PostgreSQL (appropriate for likely + worst case). Plan migration path to CockroachDB if best case materializes."
```

## Decision Anti-Patterns

### Anti-Pattern 1: Analysis Paralysis

```yaml
symptom: "Evaluating options indefinitely, never deciding"
cause: "Fear of wrong decision, perfect solution fallacy"
fix:
  - "Set decision deadline (time-box evaluation)"
  - "Accept that some decisions are reversible"
  - "Default to 'make decision and revisit in N months'"
  - "Use weighted matrix to force trade-off acknowledgment"
```

### Anti-Pattern 2: HiPPO Effect (Highest Paid Person's Opinion)

```yaml
symptom: "Decision made based on seniority, not evidence"
cause: "Organizational hierarchy overrides data-driven decision making"
fix:
  - "Anonymous option evaluation"
  - "Roman voting (simultaneous, visible to all)"
  - "Require documented evidence for all options"
  - "Separate problem-framing from solution-proposing"
```

### Anti-Pattern 3: False Dichotomy

```yaml
symptom: "Only two options presented, ignoring middle ground"
cause: "Binary thinking, premature narrowing of options"
fix:
  - "Require minimum 3 options"
  - "Consider hybrid approaches"
  - "Explore 'both-and' rather than 'either-or'"
  - "Challenge the framing: are we asking the right question?"
```

### Anti-Pattern 4: Recency Bias

```yaml
symptom: "Choosing the newest/trendiest technology"
cause: "Novelty bias, industry hype, personal learning desire"
fix:
  - "Always compare against current solution"
  - "Require production evidence at similar scale"
  - "Evaluate with team's current skills, not aspirational skills"
  - "Consider migration cost in addition to new tech cost"
```

### Anti-Pattern 5: Escalation of Commitment

```yaml
symptom: "Continuing with failing decision due to past investment"
cause: "Sunk cost fallacy, ego, organizational inertia"
fix:
  - "Separate decision review from decision maker"
  - "Set decision review milestones upfront"
  - "Pre-commit to 'switch criteria' (when to abandon)"
  - "Reward good decision reversals, not just good initial choices"
```

## Decision Tracking and Metrics

### Decision Log

```yaml
decision_log:
  entries:
    - id: "D-2026-001"
      title: "Database selection for order service"
      type: "Tactical"
      date: "2026-01-15"
      status: "Active"
      last_reviewed: "2026-04-15"
      outcome: "PostgreSQL selected. Three read replicas operational. No issues."
      metrics:
        - "Query latency: p50 15ms, p95 45ms (target: 100ms)"
        - "Scaling: read replicas handling 3x projected load"
    
    - id: "D-2026-042"
      title: "CI/CD platform selection"
      type: "Strategic"
      date: "2026-04-20"
      status: "Pending implementation"
      decision: "GitHub Actions over Jenkins"
      expected_benefits:
        - "Reduced pipeline maintenance (no self-hosted runners where possible)"
        - "Better developer experience (PR checks, native GitHub integration)"
      risks:
        - "Migration cost from existing Jenkins pipelines (~50 pipelines)"
```

### Decision Health Metrics

```yaml
metrics:
  quality:
    - metric: "Decision reversal rate"
      description: "% of decisions reversed within 12 months"
      target: "< 15%"
      interpretation: "High reversal rate indicates insufficient evaluation"
    
    - metric: "Decision satisfaction score"
      description: "Stakeholder satisfaction survey (1-5) at 6 months post-decision"
      target: "> 4.0"
    
    - metric: "ADR coverage"
      description: "% of significant decisions documented as ADRs"
      target: "> 90%"
  
  velocity:
    - metric: "Decision cycle time"
      description: "Average time from problem identification to documented decision"
      target: "Strategic: < 4 weeks, Tactical: < 1 week, Operational: < 1 day"
    
    - metric: "Decision queue size"
      description: "Number of pending decisions"
      target: "< 10"
  
  effectiveness:
    - metric: "Decision impact score"
      description: "Measured business outcomes from decisions"
      target: "Positive for > 80% of tracked decisions"
    
    - metric: "Technical debt from decisions"
      description: "Architecture debt items attributable to decisions"
      target: "< 5 active items from past decisions"
```

## Decision Templates

### Quick Decision Template (Strategic)

```markdown
# Decision: {Title}

## Context
{Problem statement, constraints, stakeholders}

## Options
| Option | Description | Key Trade-off | Risk Level |
|--------|-------------|---------------|------------|
| A | {Brief} | {Pro vs. Con} | {H/M/L} |
| B | {Brief} | {Pro vs. Con} | {H/M/L} |
| C | {Brief} | {Pro vs. Con} | {H/M/L} |

## Decision Matrix
| Criteria (Weight) | Option A | Option B | Option C |
|-------------------|----------|----------|----------|
| Criterion 1 (W1) | Score | Score | Score |
| Criterion 2 (W2) | Score | Score | Score |
| **Weighted Total** | **Total** | **Total** | **Total** |

## Decision
**Selected: Option {X}**

{Rationale — 2-3 sentences}

## Consequences
- Positive: {What becomes easier}
- Negative: {What becomes harder}
- Risk: {Risk 1 — Mitigation. Risk 2 — Mitigation.}

## Review Cadence
{When to revisit this decision}
```

### Quick Decision Template (Operational)

```markdown
# Decision: {Title}

## What we decided
{One sentence}

## Why
{One sentence — key reason}

## Alternatives considered
{List briefly, with one-line rejection reason}

## When to revisit
{If condition X changes, re-evaluate}
```

## Key Points

- Frame the decision correctly before evaluating options — the most expensive mistake is solving the wrong problem
- Establish the decision type (strategic, tactical, operational) to determine the appropriate depth of evaluation
- Always generate at least 3 options — binary choices mask creative alternatives and hybrid approaches
- Weight criteria explicitly to make trade-offs visible and debatable — implicit weightings lead to unexamined biases
- Document rejected alternatives with reasons — future decision-makers need to know what was considered and why
- Use group decision techniques to neutralize hierarchy bias — the best idea should win regardless of who proposed it
- Model uncertainty explicitly for strategic decisions — single-point estimates hide the range of possible outcomes
- Track decision outcomes and measure against predictions — this feedback loop improves future decision quality
- Set review cadence for every decision — what's right today may be wrong in 6 months as context changes
- Build a decision culture where reversals are celebrated, not punished — the best architects change their minds when evidence changes
