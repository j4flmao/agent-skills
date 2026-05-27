# Architecture Risk Quantification

## Overview

Architecture risks are uncertain events or conditions that, if they occur, negatively impact system qualities. Quantifying risks in business terms (dollars, downtime, velocity impact) enables data-driven prioritization and investment decisions. This guide provides frameworks for identifying, analyzing, quantifying, and mitigating architecture risks.

## Risk Taxonomy for Architects

### Risk Categories

```yaml
risk_categories:
  technology_risk:
    description: "Risks from technology choices"
    examples:
      - "Database reaches scaling ceiling within 12 months"
      - "Third-party API deprecation without migration path"
      - "Framework end-of-life during product lifecycle"
      - "Security vulnerability in critical dependency"
  
  design_risk:
    description: "Risks from architectural decisions"
    examples:
      - "Single point of failure in critical path"
      - "Tight coupling preventing independent deployment"
      - "Insufficient abstraction for planned extensions"
      - "Data consistency model doesn't match business needs"
  
  integration_risk:
    description: "Risks from system interactions"
    examples:
      - "External system latency spikes cascade to core service"
      - "Data format mismatch between services"
      - "Protocol version incompatibility"
      - "Authentication/authorization mismatch"
  
  operational_risk:
    description: "Risks from how the system operates"
    examples:
      - "No monitoring for key failure modes"
      - "Manual deployment process error-prone"
      - "Insufficient capacity for traffic spikes"
      - "No disaster recovery testing in 12+ months"
  
  organizational_risk:
    description: "Risks from team and process"
    examples:
      - "Single person has critical architectural knowledge"
      - "Team lacks experience with chosen technology"
      - "Architecture decisions not documented"
      - "No architecture review process"
  
  compliance_risk:
    description: "Risks from regulatory requirements"
    examples:
      - "Data residency violates GDPR requirements"
      - "Insufficient audit logging for SOC 2"
      - "Encryption standards below PCI DSS requirements"
      - "Access controls don't meet SOX requirements"
```

### Risk Source Identification

```yaml
identification_techniques:
  architecture_review:
    method: "Structured review using checklist"
    effectiveness: "Systematic, covers all dimensions"
    output: "Risk register with initial assessments"
  
  failure_mode_analysis:
    method: "For each component, ask: what could fail?"
    effectiveness: "Comprehensive, catches edge cases"
    output: "Failure mode catalog with severity"
  
  incident_retrospective:
    method: "Analyze past incidents for architectural causes"
    effectiveness: "Data-driven, based on real failures"
    output: "Root cause patterns and recurrence likelihood"
  
  premortem:
    method: "Assume the system has failed — why?"
    effectiveness: "Identifies risks not yet experienced"
    output: "Risk scenarios with preventive actions"
  
  threat_modeling:
    method: "STRIDE per component (Spoofing, Tampering, Repudiation, Info disclosure, DoS, Elevation)"
    effectiveness: "Comprehensive security risk identification"
    output: "Threat catalog with mitigations"
  
  dependency_analysis:
    method: "Map all dependencies and assess each"
    effectiveness: "Identifies single points of failure"
    output: "Dependency risk matrix"
```

## Risk Quantification Methods

### Method 1: Expected Loss (Quantitative)

```yaml
expected_loss:
  formula: "Probability × Impact ($)"
  
  example:
    risk: "Database connection pool exhaustion during traffic spike"
    probability: "20% (once per 5 peak events)"
    impact:
      downtime_minutes: 15
      cost_per_minute: "$5,000 (revenue loss)"
      incident_response_cost: "$3,000 (engineering time)"
      total_impact: "$78,000"
    expected_loss: "0.20 × $78,000 = $15,600"
    mitigation_cost: "$8,000 (connection pooling + HPA)"
    expected_roi: "($15,600 - $8,000) / $8,000 = 95% ROI"
    decision: "Implement mitigation (positive ROI)"
```

### Method 2: Risk Matrix (Semi-Quantitative)

```yaml
risk_matrix:
  likelihood_definitions:
    rare: "1 — May occur in exceptional circumstances (< 1%)"
    unlikely: "2 — Could occur at some time (1-10%)"
    possible: "3 — Might occur at some time (10-50%)"
    likely: "4 — Will probably occur in most circumstances (50-90%)"
    almost_certain: "5 — Is expected to occur (> 90%)"
  
  impact_definitions:
    negligible: "1 — < $10K, no customer impact, no SLA breach"
    minor: "2 — $10K-50K, minor customer impact, < 5min downtime"
    moderate: "3 — $50K-250K, some customers affected, 5-30min"
    major: "4 — $250K-1M, significant customer impact, 1-4h downtime"
    catastrophic: "5 — > $1M, widespread impact, > 4h downtime"
  
  risk_levels:
    critical: "15-25 — Immediate action required"
    high: "10-14 — Action required within 30 days"
    medium: "5-9 — Plan mitigation within quarter"
    low: "1-4 — Monitor, accept, or address opportunistically"
```

### Risk Register Example

```yaml
risk_register:
  system: "E-Commerce Platform"
  date: "2026-05-27"
  
  risks:
    - id: "RISK-001"
      title: "Payment gateway single point of failure"
      category: "Design"
      
      likelihood: 3 (possible)
      impact: 5 (catastrophic)
      risk_score: 15 (CRITICAL)
      
      description: "Payment processing depends on single external gateway"
      trigger: "Payment gateway API outage or latency spike"
      consequence: "Complete checkout failure, revenue loss"
      
      mitigation:
        approach: "Add secondary payment gateway with automatic failover"
        effort: "6 weeks"
        cost: "$45,000"
        residual_risk: "4 (medium) — reduced by failover capability"
        
      contingency:
        plan: "Manual switch to backup gateway via feature flag"
        trigger: "Primary gateway error rate > 5% for 2 minutes"
    
    - id: "RISK-002"
      title: "Database scaling ceiling"
      category: "Technology"
      
      likelihood: 4 (likely)
      impact: 4 (major)
      risk_score: 16 (CRITICAL)
      
      description: "Postgres primary reaches connection limit at projected 6-month growth"
      trigger: "User growth exceeds 1M MAU milestone"
      consequence: "Connection refused for new users, degraded experience"
      
      mitigation:
        approach: "Implement read replicas + connection pooling"
        effort: "3 weeks"
        cost: "$20,000"
        residual_risk: "6 (medium) — extends ceiling by 18 months"
      
      contingency:
        plan: "Emergency vertical scaling (larger instance)"
        trigger: "Connection pool utilization > 85%"
    
    - id: "RISK-003"
      title: "Single developer knowledge of search infrastructure"
      category: "Organizational"
      
      likelihood: 3 (possible)
      impact: 3 (moderate)
      risk_score: 9 (MEDIUM)
      
      description: "Only one engineer understands Elasticsearch cluster management"
      trigger: "That engineer is unavailable (vacation, departure)"
      consequence: "Search cluster incidents cannot be resolved, degraded search for 2+ weeks"
      
      mitigation:
        approach: "Document runbook, cross-train second engineer"
        effort: "2 weeks"
        cost: "$12,000 (2 engineers × 1 week)"
        residual_risk: "3 (low) — shared knowledge + runbook"
```

### Risk Dashboard

```yaml
risk_dashboard:
  date: "2026-05-27"
  system: "E-Commerce Platform"
  
  summary:
    total_risks: 24
    critical: 2
    high: 5
    medium: 10
    low: 7
    
  risk_trend:
    quarter: "Q1 2026"
    total: 28
    critical: 4
    mitigated: 3
    new: 2
    
    quarter: "Q2 2026"
    total: 24
    critical: 2
    mitigated: 6
    new: 4
    
  top_risks_by_score:
    - "RISK-002: Database scaling ceiling — 16 (CRITICAL)"
    - "RISK-001: Payment gateway SPOF — 15 (CRITICAL)"
    - "RISK-008: Cache stampede on deploy — 12 (HIGH)"
    - "RISK-005: No chaos testing for resilience — 12 (HIGH)"
    - "RISK-012: Single-region deployment — 10 (HIGH)"
  
  mitigation_progress:
    budget_allocated: "$150,000"
    spent: "$82,000 (55%)"
    completed_items: 8
    in_progress: 4
    planned: 6
  
  residual_risk_score:
    current: "11.2 (average)"
    target: "< 8.0"
    trend: "▼ Decreasing (was 13.5 in Q1)"
```

## Failure Mode Analysis

### Component Failure Modes

```yaml
component_failure_modes:
  component: "API Gateway"
  
  failure_modes:
    - mode: "Crash / restart"
      impact: "All incoming traffic fails"
      detection: "Health check fails, monitoring alert"
      mitigation:
        - "Multiple gateway instances behind load balancer"
        - "Auto-healing via orchestrator (K8s)"
      recovery_time: "30 seconds (auto)"
    
    - mode: "Latency degradation"
      impact: "All API calls slow, cascading to client timeout"
      detection: "Latency p95 > 500ms alert"
      mitigation:
        - "Rate limiting to protect gateway itself"
        - "Autoscaling based on request latency"
      recovery_time: "2 minutes (auto-scale)"
    
    - mode: "Configuration error"
      impact: "Wrong routing, incorrect auth, partial outage"
      detection: "Route-specific error rate increase"
      mitigation:
        - "Configuration validation in CI/CD"
        - "Canary deployment of config changes"
        - "Automatic rollback on error spike"
      recovery_time: "5 minutes (rollback)"
    
    - mode: "Resource exhaustion (connections, memory)"
      impact: "New connections dropped, existing connections slow"
      detection: "Resource utilization > 90% alert"
      mitigation:
        - "Connection pooling and limits"
        - "Horizontal autoscaling"
        - "Resource quotas per tenant"
      recovery_time: "2 minutes (auto-scale)"

  cascade_effects:
    downstream:
      - "Authenticated requests that reached services continue"
      - "In-flight transactions are not affected"
      - "Idempotent retries from clients work after recovery"
    upstream:
      - "CDN caches serve stale responses for GET endpoints"
      - "SPA continues to work with cached data"
```

### Failure Mode Catalog

```yaml
failure_mode_catalog:
  entry:
    component: "PostgreSQL Primary"
    failure_mode: "Instance crash"
    
    probability: "Low (99.95% uptime = ~4h downtime/year)"
    detection_time: "30 seconds (health check)"
    
    business_impact:
      revenue_loss: "$25,000/hour (all write operations blocked)"
      user_impact: "Cannot place orders, cannot update profiles"
      sla_breach: "Yes (if > 30 minutes)"
    
    recovery:
      rto: "15 min (with synchronous replica promotion)"
      rpo: "0 (synchronous replication)"
      procedure: "Automated failover to replica"
    
    mitigation:
      primary: "Synchronous replica in different AZ"
      cost: "$2,000/month (replica instance)"
      coverage: "Covers AZ failure, not region failure"
    
    residual:
      risk_level: "Medium"
      remaining_threat: "Region-level failure (RPO > 0 for async replication between regions)"
      secondary_mitigation: "Cross-region async replica (RPO = 5 seconds)"
```

## Cost of Delay

### Quantifying Delay Impact

```yaml
cost_of_delay:
  framework: "WSJF (Weighted Shortest Job First)"
  
  components:
    user_business_value:
      description: "Revenue impact or cost savings"
      quantification: "$X per month of delay"
    
    time_criticality:
      description: "How urgency changes with time"
      quantification: "Fixed deadline penalty or time-limited opportunity"
    
    risk_reduction:
      description: "Value of reducing uncertainty"
      quantification: "Cost of potential failure × probability"
    
    opportunity_enablement:
      description: "Value of enabling future work"
      quantification: "Downstream value that depends on this"
  
  example:
    decision: "Implement payment gateway failover"
    
    business_value: "$78,000 (expected loss avoidance per incident)"
    time_criticality: "$20,000/month (growing transaction volume)"
    risk_reduction: "$15,000 (reduced uncertainty in payment resilience)"
    opportunity_enablement: "$10,000 (enables multi-region expansion)"
    
    total_cost_of_delay: "$123,000/month"
    job_size: "6 weeks = 1.5 months"
    wsjd_score: "$123,000 / 1.5 = $82,000 per month"
    
    priority_rank: 2 out of 12
```

## Risk Response Strategies

### Strategy Selection

```yaml
response_strategies:
  avoid:
    description: "Eliminate the risk entirely"
    when: "Risk is high and mitigation is feasible"
    example: "Choose a different technology with known behavior instead of cutting-edge"
  
  mitigate:
    description: "Reduce probability or impact"
    when: "Risk cannot be avoided but can be reduced"
    example: "Add circuit breaker to reduce impact of dependency failure"
  
  transfer:
    description: "Shift risk to another party"
    when: "External party can manage risk better"
    example: "Use managed database service to transfer operational risk to cloud provider"
  
  accept:
    description: "Acknowledge and monitor"
    when: "Cost of mitigation exceeds expected loss"
    example: "Accept that deployment may have brief downtime during non-business hours"
  
  contingency:
    description: "Plan response if risk materializes"
    when: "Risk cannot be economically mitigated but has a plan"
    example: "Documented rollback procedure with automated triggers"
```

### Risk Acceptance Criteria

```yaml
risk_acceptance:
  criteria:
    - "Expected loss is less than cost of mitigation"
    - "Risk is well-understood with documented failure mode"
    - "Monitoring exists to detect when risk materializes"
    - "Contingency plan is documented and tested"
    - "Risk is reviewed quarterly for changes"
    - "Stakeholder acknowledges and accepts the risk"
  
  template:
    risk: "RISK-007: Single-region deployment"
    accepted_by: "CTO"
    acceptance_date: "2026-04-15"
    review_date: "2026-07-15"
    rationale: "Cost of multi-region ($500K/year) exceeds expected loss ($200K/year). Single-region SLA is sufficient for current scale."
    condition: "If revenue exceeds $10M/month, re-evaluate multi-region."
```

## Key Points

- Quantify risks in business terms ($, time, customers affected) — technical risk descriptions don't drive action, business impact descriptions do
- Expected loss (probability × impact) enables direct ROI comparison for mitigation investments — prioritize mitigations with the highest return
- Maintain a living risk register with trend data — the trajectory (risks increasing or decreasing) is more important than the absolute count
- Every critical risk must have both a mitigation plan AND a contingency plan — mitigation reduces probability, contingency limits damage
- Identify failure modes for every component in the architecture — the exercise itself reveals vulnerabilities even before quantification
- Use WSJF or cost-of-delay frameworks to prioritize risk responses alongside feature work — architecture risks compete for the same budget
- Review risks quarterly and update assessments — risks change as the system and context evolve
- Document risk acceptance decisions explicitly with owner, rationale, and review date — accepted risks are not forgotten risks
- Cascade effects (how one failure propagates) are often more impactful than the initial failure — map dependency chains
- The goal is not zero risk but informed risk-taking — architecture is about managing trade-offs, not eliminating uncertainty
