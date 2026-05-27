# Technology Radar for Solution Architects

## Overview

A technology radar is a strategic tool for tracking, evaluating, and making decisions about technologies in your architecture. It provides a structured approach to technology selection, reducing bias and ensuring decisions align with organizational capabilities and constraints.

## Technology Assessment Framework

### Assessment Dimensions

```yaml
assessment_criteria:
  maturity:
    - "Has this technology been used in production at similar scale?"
    - "What is the community size and ecosystem health?"
    - "Are there known production incidents or limitations?"
    - "What is the release cadence and breaking change frequency?"
  
  capability:
    - "Does this technology solve the specific problem?"
    - "How well does it handle our scale requirements?"
    - "What are the operational characteristics (perf, reliability)?"
    - "How extensible is it for future requirements?"
  
  risk:
    - "What is the learning curve for the team?"
    - "Are there compliance or licensing issues?"
    - "Is there vendor lock-in risk?"
    - "What is the bus factor (how many people know this)?"
  
  cost:
    - "Licensing cost (upfront + recurring)"
    - "Infrastructure cost to run it"
    - "Training and onboarding cost"
    - "Migration cost from current solution"
  
  strategic_fit:
    - "Does this align with the technology strategy?"
    - "Is this a core vs. supporting technology?"
    - "Does it integrate well with existing stack?"
    - "Is it trending toward industry standard or niche?"
```

### Radar Quadrants

```
                    ADOPT
               (Proven in production,
                recommended default)
                      │
                      │
                      │
    TRIAL ◄───────────┼───────────► ASSESS
    (Low risk,        │           (Promising but
    evaluate in        │           unproven, explore)
    non-critical)      │
                      │
                      │
                      │
                   HOLD
               (Known limitations,
                deprecating, avoid
                for new projects)
```

### Radar Rings Definition

| Ring | Meaning | Criteria | Action |
|------|---------|----------|--------|
| **Adopt** | Proven in production at scale | 6+ months of production use, well-understood failure modes, strong team expertise | Default choice for new projects |
| **Trial** | Low-risk, limited production use | 1-2 projects in production, known failure modes documented, at least 2 engineers experienced | Can use with monitoring, have migration plan |
| **Assess** | Promising but unproven | Proof-of-concept done, documented trade-offs, no production experience | Explore via spike/prototype, no production commitment |
| **Hold** | Known limitations | Outdated, better alternatives exist, or lacks evidence | Avoid for new projects, plan migration from existing |

### Radar Entry Template

```yaml
technology:
  name: "Apache Kafka"
  category: "Message Streaming"
  
  assessment:
    ring: "Adopt"
    last_reviewed: "2026-05-01"
    owner: "Platform Architecture"
  
  rationale:
    decision: "Kafka is our standard event streaming platform"
    evidence:
      - "Used in production across 12 services for 18+ months"
      - "Sustains 100K msg/sec with p99 latency < 10ms"
      - "5 engineers experienced, 2 at expert level"
      - "Well-understood failure modes: broker failure, partition rebalancing"
    trade_offs:
      - "Higher operational complexity vs. SQS/RabbitMQ"
      - "Requires dedicated ops knowledge"
      - "Overkill for simple queuing use cases"
    alternatives:
      - name: "RabbitMQ"
        ring: "Trial"
        use_case: "Simple task queues, lower throughput needs"
      - name: "SQS"
        ring: "Trial"
        use_case: "AWS-native, simpler but less flexible"
  
  adoption_guidance:
    recommend_for:
      - "Event-driven architectures"
      - "Stream processing"
      - "Data pipeline ingestion"
      - "Log aggregation"
    not_recommended_for:
      - "Simple point-to-point messaging (< 1K msg/sec)"
      - "RPC-style request-response"
  
  risks:
    - "Team turnover creates knowledge gap (mitigate: runbook, training)"
    - "Cost at extreme scale (mitigate: monitor partition count, retention)"
```

## Technology Decision Process

### Step 1: Frame the Decision

```yaml
decision_context:
  problem: "Need a message queue for order processing"
  constraints:
    - "Must support at-least-once delivery"
    - "Max latency: 500ms"
    - "Team experience: 2 engineers with Kafka, none with alternatives"
    - "Existing infra: AWS"
  
  requirements:
    functional:
      - "Reliable message delivery"
      - "Ordering within partition"
      - "Consumer group load balancing"
    non_functional:
      - "Throughput: 5K msg/sec (current), 50K msg/sec (projected)"
      - "Availability: 99.95%"
      - "Durability: survive single-AZ failure"
```

### Step 2: Identify Candidates

```
From radar: Assess and above rings
  - Apache Kafka (Adopt) — our standard, team experience
  - Amazon SQS (Trial) — AWS-native, simpler
  - RabbitMQ (Trial) — proven technology
  
Outside radar (new evaluation needed):
  - Apache Pulsar — promising but no team experience
  - Google Pub/Sub — additional cloud dependency
```

### Step 3: Evaluate Candidates

```yaml
evaluation_matrix:
  criteria:
    - name: "Team expertise"
      weight: 0.25
      description: "Existing knowledge and experience"
    
    - name: "Functional fit"
      weight: 0.20
      description: "How well it meets requirements"
    
    - name: "Operational maturity"
      weight: 0.15
      description: "Production readiness, monitoring, debugging"
    
    - name: "Scalability"
      weight: 0.15
      description: "Ability to handle growth"
    
    - name: "Cost"
      weight: 0.15
      description: "Total cost of ownership (3 years)"
    
    - name: "Strategic alignment"
      weight: 0.10
      description: "Fit with overall technology strategy"

  scores:
    kafka:
      team_expertise: 5
      functional_fit: 5
      operational_maturity: 4
      scalability: 5
      cost: 3
      strategic_alignment: 5
      total: 4.55
    
    sqs:
      team_expertise: 4
      functional_fit: 4
      operational_maturity: 5
      scalability: 4
      cost: 4
      strategic_alignment: 3
      total: 4.00
    
    rabbitmq:
      team_expertise: 3
      functional_fit: 4
      operational_maturity: 4
      scalability: 3
      cost: 4
      strategic_alignment: 2
      total: 3.35
```

### Step 4: Make Decision

```yaml
decision:
  recommendation: "Apache Kafka"
  rationale: "Strongest strategic fit, existing team expertise, best scalability for projected growth. Higher operational cost is acceptable given our operational maturity."
  
  conditions:
    - "Document standard Kafka configuration template"   # Q2 2026
    - "Create runbook for common failure scenarios"       # Q2 2026
    - "Train 2 more engineers on Kafka operations"        # Q3 2026
  
  alternatives_noted:
    sqs: "Consider for simple message queuing where Kafka is overkill"
    rabbitmq: "Hold — no strategic advantage over Kafka for our use case"
```

### Step 5: Update Radar

```yaml
update:
  - technology: "Apache Kafka"
    action: "Remain at Adopt"
    notes: "Reaffirmed as standard for event streaming"
  
  - technology: "Amazon SQS"
    action: "Remain at Trial"
    notes: "Approved for simple queuing, not a strategic platform"
  
  - technology: "RabbitMQ"
    action: "Move to Hold"
    notes: "No strategic advantage, team expertise concentrated on Kafka"
  
  - technology: "Apache Pulsar"
    action: "Add to Assess"
    notes: "Promising for geo-distributed use cases, evaluate for future multi-region needs"
```

## Build vs. Buy vs. Adapt Framework

### Decision Matrix

| Factor | Build | Buy/SaaS | Adapt (Open Source) |
|--------|-------|----------|-------------------|
| Core vs. generic | Core | Generic | Both |
| Time to market | Slowest | Fastest | Medium |
| Differentiation | High | Low | Medium |
| Control | Full | Limited | Moderate |
| Maintenance cost | Highest | Lowest | Medium |
| Customization | Complete | Limited | High |
| Vendor lock-in | None | High | Moderate |
| Team scale needed | Large | Small | Medium |

### Build vs. Buy Assessment

```yaml
build_vs_buy:
  scenario: "Customer analytics platform"
  
  questions:
    - q: "Is analytics a core business differentiator?"
      a: "Yes — personalization is competitive advantage"
      weight: "Strong build signal"
    
    - q: "Are there unique requirements not met by vendors?"
      a: "Yes — custom ML models, real-time scoring"
      weight: "Strong build signal"
    
    - q: "Do we have the team and time?"
      a: "Partial — have data engineers but need 2 more"
      weight: "Medium build risk"
    
    - q: "What is the cost comparison?"
      a: "Build: $800K/year (team + infra). Buy: $1.2M/year (Amplitude + Segment)"
      weight: "Build is cheaper"
    
    - q: "Is time-to-market critical?"
      a: "Yes — competitor launching similar feature in 6 months"
      weight: "Buy would be faster but can't customize"
    
    - q: "Will this need deep integration?"
      a: "Yes — must integrate with proprietary recommendation engine"
      weight: "Build integrates better"
  
  recommendation:
    decision: "Build core analytics, buy supporting components"
    rationale: "Analytics is core differentiator requiring custom ML integration. Build the analytics engine. Buy the data pipeline and visualization layers."
    components:
      build: ["Analytics engine", "ML scoring", "Real-time dashboard"]
      buy: ["Data ingestion (Segment)", "Data warehouse (Snowflake)", "BI layer (Looker)"]
```

## Vendor Evaluation Framework

### Evaluation Criteria

```yaml
vendor_evaluation:
  product:
    - "Functional completeness (meets 80%+ requirements)"
    - "Performance at our scale"
    - "API quality and documentation"
    - "Integration ease with existing stack"
    - "Security certifications and compliance"
  
  vendor:
    - "Company financial health and stability"
    - "Market position and growth trajectory"
    - "Customer support quality (SLAs, response times)"
    - "Product roadmap alignment with our needs"
    - "References from similar-scale customers"
  
  operations:
    - "Uptime SLA and historical performance"
    - "Incident response process"
    - "Data residency and sovereignty support"
    - "Backup, DR, and data portability"
  
  commercial:
    - "Pricing model (predictable, scales with value)"
    - "Contract terms (lock-in period, exit clauses)"
    - "Total cost of ownership (3-year projection)"
    - "Data egress and migration costs"
```

### Vendor Scorecard

```yaml
vendor_scorecard:
  vendor: "ExampleCloud DB"
  category: "Managed PostgreSQL"
  
  scores:
    functional: 4.5/5  # Missing: columnar storage extension
    performance: 4/5    # Good but read replica lag at scale
    integration: 5/5    # Excellent: standard PostgreSQL
    security: 5/5       # SOC 2, HIPAA, GDPR
    vendor_health: 5/5  # Public, profitable, growing
    support: 4/5        # Response < 1hr for critical
    operations: 4/5     # 99.99% SLA, multi-region option
    cost: 3/5           # Premium pricing vs. self-hosted
    
  weighted_total: 4.3/5
  
  decision: "Shortlisted for pilot"
  concerns:
    - "Cost at 10x scale needs renegotiation"
    - "Read replica lag at > 10K Writes/sec"
  
  pilot_plan:
    duration: "30 days"
    scope: "Non-critical read workload"
    success_criteria:
      - "p95 query latency < 50ms"
      - "Zero downtime"
      - "Replica lag < 1 second at projected peak"
```

## Technology Obsolescence Management

### Deprecation Process

```yaml
deprecation:
  phases:
    - phase: "EOL Announced"
      actions:
        - "Vendor announces end-of-life date"
        - "Architecture team assesses impact"
        - "Identify migration path and timeline"
    
    - phase: "Hold"
      actions:
        - "No new projects using this technology"
        - "Existing users notified of deprecation timeline"
        - "Document migration guide"
      duration: "6-12 months before EOL"
    
    - phase: "Migration in Progress"
      actions:
        - "Active migration of existing workloads"
        - "Track migration progress weekly"
        - "Escalate blockers to architecture board"
      duration: "3-6 months"
    
    - phase: "Decommissioned"
      actions:
        - "All workloads migrated"
        - "Infrastructure decommissioned"
        - "Archived in technology history"
```

### Technology Health Check

```yaml
quarterly_health_check:
  review_items:
    - technology: "PostgreSQL 14"
      status: "Adopt"
      health: "Healthy — mainstream, active community"
      action: "None (plan upgrade to 17 by Q1 2027)"
    
    - technology: "Legacy CRM API"
      status: "Hold"
      health: "Declining — vendor end-of-life Q4 2026"
      action: "Migration to new CRM in progress. 60% complete."
    
    - technology: "Apache Spark 2.4"
      status: "Hold"
      health: "Critical — EOL, security vulnerabilities"
      action: "Migration to Spark 3.5. Priority: HIGH. Target: Q3 2026."
    
    - technology: "GraphQL (Apollo)"
      status: "Trial"
      health: "Growing — 2 services in production, positive feedback"
      action: "Consider expanding to Adopt. Evaluate at next radar review."
```

## Key Points

- A technology radar provides a shared vocabulary and framework for technology decisions — it reduces bias and ensures consistency across teams
- Review the radar quarterly — technology evolves fast, and outdated assessments lead to suboptimal decisions
- Every technology decision should reference the radar and document rationale — traceability enables learning from past decisions
- Build vs. buy decisions depend on whether the capability is core to your competitive advantage — build what differentiates, buy what's table stakes
- Vendor evaluation should include a pilot phase with concrete success criteria before committing to production use
- Technology obsolescence management is as important as adoption — plan deprecation paths early to avoid emergency migrations
- The radar rings (Adopt, Trial, Assess, Hold) must be backed by evidence — opinions without data lead to politics-driven decisions
- Document trade-offs explicitly — every technology choice has downsides that must be understood and accepted
- Align technology strategy with organizational maturity — adopting cutting-edge tech without team capability increases delivery risk
- Create a feedback loop from production experience back to radar assessments — real-world usage updates the evidence base
