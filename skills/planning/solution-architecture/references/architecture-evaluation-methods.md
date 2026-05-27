# Architecture Evaluation Methods

## Overview

Architecture evaluation is a structured process to assess how well a software architecture satisfies its quality attributes. Formal evaluation methods detect risks early, surface hidden assumptions, and ensure stakeholder alignment before implementation begins.

## When to Evaluate

| Timing | Method | Duration | Participants |
|--------|--------|----------|-------------|
| Pre-architecture (requirements) | QAW | 2-4 hours | Stakeholders, architects |
| Early design | Lightweight SAR | 1-2 hours | Architects, lead devs |
| Pre-implementation | ATAM | 2-3 days | Architects, stakeholders, eval team |
| Component-level | ARID | 1-day workshop | Architects, component owners |
| Post-deployment | Hindsight review | 2-4 hours | Architects, ops, devs |
| Continuous | Fitness functions | Automated | CI pipeline |

## Quality Attribute Workshop (QAW)

### Purpose
Elicit and prioritize quality attributes before architecture design begins. Ensures architects understand what stakeholders truly value.

### Participants

```
Facilitator:    1 (experienced architect, neutral party)
Architects:     1-2 (will design the system)
Stakeholders:   3-8 (product, ops, security, business, dev)
Scribe:         1 (documents output)
```

### QAW Agenda (2-4 hours)

```
1. Introduction and business drivers     (15 min)
   - Present business context and goals
   - Describe system overview

2. Quality attribute brainstorming       (30 min)
   - Each stakeholder writes quality concerns on cards
   - Categories: Performance, Availability, Security, etc.
   - Facilitator groups similar concerns

3. Scenario elicitation                  (45 min)
   - For top quality concerns, write concrete scenarios
   - Format: "Stimulus → Environment → Response → Measure"
   - Example: "10K concurrent users → normal operation → response < 200ms p95"

4. Scenario prioritization               (30 min)
   - Stakeholders vote on scenario importance
   - Top 10-15 scenarios move to architecture evaluation

5. Scenario refinement                   (30 min)
   - Refine top scenarios with precise measures
   - Document weighting for trade-off analysis

Output: Prioritized quality attribute scenarios with measurable responses
```

### Scenario Template

```yaml
quality_attr_scenario:
  id: "QA-001"
  attribute: "Performance"
  source: "End user (web browser)"
  stimulus: "User submits order with 10 items"
  artifact: "Order Service"
  environment: "Normal operations, peak hour (50% peak load)"
  response: "Order confirmation displayed"
  response_measure:
    - "p95 latency < 500ms"
    - "p99 latency < 1s"
    - "Success rate > 99.9%"
```

## ATAM (Architecture Trade-off Analysis Method)

### Overview
Developed by SEI at Carnegie Mellon. ATAM evaluates architectural decisions against quality attribute requirements and identifies trade-off points, sensitivity points, and risks.

### Participants

| Role | Number | Responsibility |
|------|--------|---------------|
| Evaluation Team Leader | 1 | Leads the evaluation |
| Evaluation Team | 2-3 | Analyze architecture |
| Project Decision Maker | 1 | Project manager or technical lead |
| Architecture Stakeholders | 3-8 | Represent different concerns |
| Architecture Presenter | 1-2 | Present the architecture |

### ATAM Phases

#### Phase 0: Partnership and Preparation (pre-meeting)

```
Activities:
- Evaluation team reviews architecture documentation
- Stakeholders identified and invited
- QAW output (scenarios) prepared if available
- Logistics confirmed (room, materials, schedule)

Output:
- Prepared evaluation team
- Stakeholder list with confirmed attendance
- Initial architecture understanding
```

#### Phase 1: Evaluation (Days 1-2)

**Step 1: Present business drivers** (30 min)
```
- Business context and goals
- Major stakeholders
- Key constraints (budget, timeline, regulations)
- Architectural drivers (the most important quality attributes)
```

**Step 2: Present architecture** (60 min)
```
- System context (C4 Level 1)
- Container diagram (C4 Level 2) with technology decisions
- Key architectural approaches and patterns used
- Architecture decisions (ADRs)
- Deployment architecture
```

**Step 3: Identify architectural approaches** (60 min)
```
- List architectural patterns used (microservices, event-driven, etc.)
- Document pattern usage per quality attribute
- Identify interactions between patterns

Output: Architecture Approaches table
| Approach | Used For | Affects QA |
|----------|----------|------------|
| Microservices | Independent deployability | Modifiability (+), Performance (-) |
| Event sourcing | Audit trail | Availability (-), Testability (-) |
| CQRS | Read/write isolation | Performance (+), Complexity (-) |
```

**Step 4: Generate quality attribute utility tree** (90 min)
```
Utility Tree structure:
  Attribute (e.g., Performance)
  └── Attribute Refinement (e.g., Data Latency)
      └── Scenarios prioritized (H/M/L)

Example:
  Performance (M)
  └── Data Latency
      └── (H) "DB query returns in < 100ms p95 under peak load"
      └── (M) "Cache hit rate > 90%"
  Availability (H)
  └── Service Continuity
      └── (H) "99.9% uptime measured monthly"
      └── (M) "Auto-recovery within 5 minutes of failure"
  Security (H)
  └── Data Protection
      └── (H) "All PII encrypted at rest"
      └── (L) "Encryption overhead < 5%"
  
  Prioritization votes:
    (H,H) = High priority, High difficulty → focus evaluation here
    (H,M) = Important but easier → sanity check
    (M,M) = Normal priority → verify if needed
```

**Step 5: Analyze architectural approaches** (120 min)
```
For each (H,H) scenario:
  1. Identify architectural approaches that address the scenario
  2. Analyze how each approach works for the scenario
  3. Identify risks (no approach or untested approach)
  4. Identify non-risks (well-established approach)
  5. Identify trade-off points (approach improves one QA, hurts another)
  6. Identify sensitivity points (small change in approach → large QA impact)

Output:
  Risk: "No documented failover strategy for database"
  Non-risk: "Stateless services behind load balancer (proven pattern)"
  Trade-off: "Event sourcing improves auditability, increases storage cost"
  Sensitivity: "Cache TTL increase from 5min to 30min improves performance by 40% but increases stale data risk"
```

**Step 6: Prioritize scenarios** (45 min)
```
- Stakeholders vote on the most important scenarios
- Top scenarios become evaluation focus
- Compare stakeholder priorities with architect utility tree
- Mismatches indicate communication gaps

Output: Ranked scenario list by stakeholder vote
```

**Step 7: Present initial findings** (30 min)
```
Structure:
  - Risks found
  - Non-risks confirmed
  - Trade-off points identified
  - Sensitivity points identified
  - Comparison: architect priorities vs stakeholder priorities
```

#### Phase 2: Follow-Up

```
Activities:
- Final report preparation
- Present findings to project leadership
- Track risk mitigation actions

Output: Final ATAM Report
```

### ATAM Output Artifacts

```yaml
atam_report:
  system: "E-Commerce Platform v2"
  date: "2026-05-15"
  evaluators: ["John (Lead)", "Sarah", "Mike"]
  
  risks:
    - id: "R-001"
      description: "Single database for all services creates bottleneck"
      severity: "High"
      affected_qa: ["Scalability", "Availability"]
      recommendation: "Introduce database per service with CQRS"
    
    - id: "R-002"
      description: "No circuit breaker on payment gateway calls"
      severity: "Medium"
      affected_qa: ["Availability", "Resilience"]
      recommendation: "Add Resilience4j circuit breaker with fallback"
  
  trade_offs:
    - id: "T-001"
      description: "Event sourcing provides full audit trail"
      positive: ["Auditability", "Debugging"]
      negative: ["Storage cost (5x)", "Query complexity"]
  
  sensitivity_points:
    - id: "S-001"
      description: "Cache TTL impacts both performance and consistency"
      parameter: "Cache TTL (current: 5min)"
      effect: "30s → high DB load; 30min → stale data risk"
  
  scenario_priorities:
    architect_top: ["Performance: data latency", "Availability: uptime"]
    stakeholder_top: ["Security: data protection", "Cost: infrastructure"]
    gap: "Stakeholders prioritize security and cost more than architects estimated"
```

## Lightweight SAR (Scenario-based Architecture Review)

### Purpose
A lightweight evaluation method for smaller projects or early-stage designs. Same principles as ATAM but compressed into a single session.

### Agenda (2-3 hours)

```
1. Business context (10 min)
2. Architecture overview (20 min)
3. Scenario generation (30 min)
   - Focus on top 3-5 quality attributes
   - 2-3 scenarios per attribute
4. Architecture analysis (45 min)
   - Walk through each scenario against the design
   - Document risks, trade-offs, non-risks
5. Findings and recommendations (15 min)
```

### SAR Output

```yaml
sar_report:
  findings:
    risks: 3
    non_risks: 5
    trade_offs: 2
  recommendation:
    - "Proceed with conditions: address R-001 (DB scalability)"
    - "Revisit search architecture when userbase exceeds 1M"
```

## ARID (Active Reviews for Intermediate Designs)

### Purpose
Evaluate partial or intermediate designs — component-level or interface-level — before full architecture is complete.

### When to Use ARID

```
ARID is appropriate when:
- Only part of the architecture is designed
- An interface or API needs stakeholder review
- A specific component has high risk
- Team needs to validate design direction before full commitment
```

### ARID Process (1-day workshop)

```
1. Present the design (30 min)
   - Focus only on the component/interface under review
   - Include: purpose, assumptions, dependencies, design decisions

2. Reviewers prepare questions (15 min)
   - Reviewers read the design document
   - Clarifying questions to the presenter

3. Active scenario review (90 min)
   - Reviewers propose specific scenarios
   - Presenter explains how the design handles each scenario
   - Scribe documents deficiencies

4. Brainstorm solutions (60 min)
   - For each deficiency, propose improvements
   - Group similar issues
   - Prioritize fixes

5. Wrap-up (15 min)
   - Summary of findings
   - Action items
   - Decision: accept, revise, or reject the design
```

### ARID Output

```yaml
arid_report:
  component: "Payment API Interface"
  date: "2026-05-20"
  
  deficiencies:
    - scenario: "Payment gateway times out"
      issue: "No timeout configuration exposed in API"
      fix: "Add configurable timeout field to PaymentRequest"
    
    - scenario: "Refund requires original transaction ID"
      issue: "No idempotency key support"
      fix: "Add idempotency-key header for retry safety"
  
  decision: "Accept with conditions (fix items 1-3 before implementation)"
```

## CBAM (Cost Benefit Analysis Method)

### Purpose
Extend ATAM with economic analysis. Quantify the ROI of architectural decisions to justify architectural investments to business stakeholders.

### CBAM Steps

```
Step 1: Identify architectural strategies
  - From ATAM, list candidate architectural improvements
  - Example: "Add read replicas", "Introduce cache layer", "Implement CQRS"

Step 2: Determine quality attribute benefits
  - For each strategy, estimate QA improvement
  - Example: "Read replicas → query latency drops from 200ms to 50ms (75% improvement)"

Step 3: Quantify benefit in business terms
  - Translate QA improvement to business value
  - Example: "50ms latency improvement → 2% conversion rate increase → $120K/month revenue"

Step 4: Estimate cost and risk
  - Development cost, operational cost, migration cost
  - Implementation risk (schedule, complexity)
  
Step 5: Calculate ROI
  - ROI = (Benefit - Cost) / Cost
  - Rank strategies by ROI
  - Sensitivity analysis on key assumptions

Step 6: Make decision
  - Present ROI-ranked options to stakeholders
  - Select strategies within budget
  - Document decision rationale
```

### CBAM Decision Matrix

| Strategy | QA Impact | Business Benefit | Cost | Risk | ROI | Decision |
|----------|-----------|-----------------|------|------|-----|----------|
| Read replicas | Performance +75% | $120K/mo | $15K | Low | 8.0 | Implement |
| Cache layer | Performance +90% | $150K/mo | $30K | Low | 5.0 | Implement |
| CQRS + ES | Auditability high | $50K/mo (compliance) | $200K | Medium | 0.25 | Defer |
| Multi-region | Availability 99.9→99.99% | $80K/mo (uptime SLA) | $500K | Medium | 0.16 | Defer |

## Architectural Risk Identification

### Risk Categories

| Category | Examples |
|----------|---------|
| Technology risk | Unproven technology, version conflicts, vendor lock-in |
| Performance risk | Insufficient capacity, scaling ceiling, latency spikes |
| Security risk | Data exposure, auth bypass, compliance gap |
| Operational risk | Complexity of deployment, monitoring gaps, team skill gaps |
| Integration risk | Third-party instability, protocol mismatch, data format issues |
| Evolution risk | Inability to add features, migration difficulty, extensibility limits |

### Risk Detection Heuristics

```
Risk: "Single point of failure"
  Detection: No redundancy for a component
  Mitigation: Add replicas, failover, or design for graceful degradation

Risk: "No monitoring/observability"
  Detection: No dashboards, alerts, or tracing identified
  Mitigation: Define SLOs before implementation, instrument as you build

Risk: "Tight coupling"
  Detection: Components share databases, sync calls everywhere
  Mitigation: Define bounded contexts, async communication, database per service

Risk: "Premature scaling"
  Detection: Microservices for a 2-person team, Kubernetes for static load
  Mitigation: Start simple, extract when boundaries are clear

Risk: "Undocumented assumptions"
  Detection: "We assume X works" without verification
  Mitigation: Prototype risky assumptions, document all assumptions explicitly
```

## Evaluation Technique Selection Guide

| Situation | Recommended Method | Duration |
|-----------|-------------------|----------|
| New system, full evaluation | ATAM | 2-3 days |
| New system, small team | Lightweight SAR | 2-3 hours |
| Component or interface review | ARID | 1 day |
| Requirements clarity needed | QAW | 2-4 hours |
| Budget justification needed | CBAM | Add 1 day to ATAM |
| Quick sanity check | Walkthrough + Checklist | 1 hour |
| Continuous compliance | Fitness functions | Automated |
| Production resilience | Chaos experiments | Ongoing |

## Key Points

- Evaluate architecture early — the cost of fixing architectural defects increases exponentially as the system grows
- ATAM is the gold standard for comprehensive evaluation, but lightweight methods (SAR, ARID) work well for smaller scopes
- Trade-off points are the most valuable ATAM output — no architecture can optimize all attributes simultaneously
- Stakeholder priorities often differ from architect assumptions — QAW and ATAM voting surface these gaps
- Always document risks with concrete scenarios, not abstract concerns — "DB query timeout at 10K RPM" vs "performance concern"
- Combine ATAM with CBAM when budget decisions are needed — technical quality must be translated to business value
- Use ARID for partial designs — don't wait for full architecture to validate high-risk components
- Follow up on risk mitigation — an evaluation without action is just documentation
- Automate where possible — fitness functions in CI provide continuous architecture validation
- Re-evaluate when context changes significantly — new regulations, 10x growth, major technology shifts
