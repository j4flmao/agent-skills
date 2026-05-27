# Architecture Metrics

## Overview

Architecture metrics quantify the quality, effectiveness, and health of software architecture. Without metrics, architecture decisions are based on intuition and opinion rather than data. This guide provides a framework for measuring architecture characteristics, tracking architectural health over time, and making data-driven architecture decisions.

## The Architecture Metrics Framework

### What to Measure

```yaml
measurement_categories:
  structural_quality:
    description: "Internal architecture quality"
    stakeholders: ["Architects", "Developers", "Tech leads"]
    cadence: "Per build (automated) + quarterly review"
  
  operational_effectiveness:
    description: "How well architecture serves operations"
    stakeholders: ["SRE", "Operations", "Architects"]
    cadence: "Weekly (automated from monitoring)"
  
  business_alignment:
    description: "How architecture supports business outcomes"
    stakeholders: ["CTO", "VP Engineering", "Product"]
    cadence: "Monthly + quarterly business review"
  
  evolution_velocity:
    description: "How easily the architecture can change"
    stakeholders: ["Architects", "Engineering managers"]
    cadence: "Sprint-based (from developer tooling)"
```

### Metric Classification

```
                    QUANTITATIVE                   QUALITATIVE
                    ────────────                   ──────────
    STRUCTURAL    │  Coupling metrics             │  Architecture review scores
                  │  Component count              │  Pattern compliance
                  │  Dependency depth             │  ADR quality
                  │  Cyclomatic complexity        │
                  │                               │
    OPERATIONAL   │  MTTR, MTBF                   │  Incident severity distribution
                  │  Deployment frequency         │  Runbook completeness
                  │  Error budget burn rate       │  On-call experience score
                  │  SLO compliance               │
                  │                               │
    BUSINESS      │  Infrastructure cost/trans.   │  Stakeholder satisfaction
                  │  Feature velocity             │  Architecture alignment score
                  │  Time-to-market               │  Business capability coverage
                  │  Cost of architecture debt    │
                  │                               │
    EVOLUTION     │  Time to add new feature     │  Architecture fitness score
                  │  Time to modify feature       │  Technology radar currency
                  │  Change failure rate          │  Migration progress %
                  │  Reversible decision ratio    │
```

## Structural Metrics

### Coupling Metrics

```yaml
coupling_metrics:
  afferent_coupling:
    description: "Number of incoming dependencies (how many modules depend on this one)"
    measurement: "Count of modules importing from this module"
    interpretation:
      high: "Highly depended-upon module — changes are risky, must be stable"
      low: "Independent module — changes are safe, easy to refactor"
    target: "< 20 for platform modules, < 5 for domain modules"
  
  efferent_coupling:
    description: "Number of outgoing dependencies (how many modules does this depend on)"
    measurement: "Count of modules this module imports from"
    interpretation:
      high: "Heavily dependent module — fragile, changes often break"
      low: "Self-contained module — resilient, easy to change"
    target: "< 10 for any module"
  
  instability:
    formula: "Ce / (Ca + Ce)"
    description: "Ratio of outgoing to total dependencies"
    interpretation:
      0: "Completely stable (no outgoing deps — maximally stable)"
      1: "Completely unstable (all outgoing deps — fragile)"
    target: "< 0.5 for most modules"
  
  abstractness:
    formula: "Number of abstract types / total types"
    description: "Ratio of abstract to concrete elements"
    interpretation:
      0: "Completely concrete (no abstractions)"
      1: "Completely abstract (all interfaces)"
    target: "Balance with instability (main sequence)"
  
  distance_from_main:
    formula: "|Instability + Abstractness - 1|"
    description: "Distance from the 'main sequence' (ideal balance)"
    target: "< 0.3 for most modules"
    interpretation:
      "Close (0)": "Well-balanced module"
      "Far from 0": "Zone of pain (too concrete + too depended) or zone of uselessness (too abstract + no dependents)"
```

### Dependency Metrics Dashboard Example

```yaml
dependency_dashboard:
  snapshot: "2026-05-27"
  
  totals:
    modules: 147
    dependencies: 2,341
    cycles: 3
  
  top_coupled:
    - module: "common-utils"
      afferent: 89
      efferent: 4
      instability: 0.04
      risk: "HIGH — huge blast radius, changes very risky"
    - module: "auth-service"
      afferent: 34
      efferent: 12
      instability: 0.26
      risk: "MEDIUM — widely used, manageable if stable"
  
  cycles_detected:
    - modules: ["billing", "invoice", "payment"]
      severity: "HIGH"
      fix: "Extract shared billing-interface module"
    - modules: ["user-service", "notification-service"]
      severity: "LOW"
      fix: "User service should emit events, not call notification directly"
  
  trend:
    month: "Jan → May 2026"
    modules: "142 → 147"
    avg_instability: "0.31 → 0.29"
    cycles: "5 → 3"
    assessment: "Improving — module boundaries tightening"
```

### Architecture Compliance Score

```yaml
compliance_score:
  description: "How well actual architecture matches intended architecture"
  
  measurement:
    - "Fitness function pass rate (structured checks)"
    - "Architecture review compliance (decisions followed)"
    - "Module boundary violations detected"
    - "ADR compliance (decisions enforced in code)"
  
  scoring:
    - fitness_pass_rate: 87%
    - boundary_violations_this_quarter: 4
    - adr_compliance_rate: 72%
    - architecture_drift_score: 0.15 (lower is better)
  
  composite_score: "72%"
  target: "> 85%"
  
  action_items:
    - "Investigate 3 boundary violations in payment module"
    - "Increase fitness function coverage for ADR-005 through ADR-012"
    - "Review 4 ADRs with non-compliant implementations"
```

## Operational Metrics

### DORA Metrics

```yaml
dora_metrics:
  deployment_frequency:
    current: "Daily"
    elite: "On-demand (multiple deploys/day)"
    high: "Between once per week and once per month"
    medium: "Between once per month and once every 6 months"
    low: "Less than once every 6 months"
    assessment: "High performer"
  
  lead_time_for_changes:
    current: "2 hours"
    elite: "< 1 day"
    high: "1 day to 1 week"
    medium: "1 week to 1 month"
    low: "> 6 months"
    assessment: "Elite performer"
  
  change_failure_rate:
    current: "5%"
    elite: "< 5%"
    high: "5-10%"
    medium: "10-15%"
    low: "> 30%"
    assessment: "High performer (borderline elite)"
  
  time_to_restore_service:
    current: "30 minutes"
    elite: "< 1 hour"
    high: "< 1 day"
    medium: "< 1 week"
    low: "> 6 months"
    assessment: "Elite performer"
```

### Architecture Reliability Metrics

```yaml
reliability_metrics:
  availability:
    measurement: "Service uptime / total time"
    current: "99.95%"
    target: "99.99%"
    interpretation: "Missing 4 nines target by 0.04%"
  
  error_budget:
    calculation: "100% - availability target = 0.01% error budget"
    current_consumption: "62% year-to-date"
    burn_rate: "0.15% per week"
    projection: "Will exhaust budget in November at current rate"
    action: "Reduce deployment risk in Q3"
  
  slo_compliance:
    metric: "Request latency p95 < 500ms"
    compliance_rate: "98.2%"
    target: "99.9%"
    gap: "1.7%"
  
  incident_metrics:
    total_incidents_this_quarter: 14
    architectural_causes: 8
    mean_time_to_detect: "4 minutes"
    mean_time_to_resolve: "22 minutes"
    
    incidents_by_architecture:
      - cause: "Cache stampede on deployment"
        count: 3
        fix: "Implement gradual cache warmup"
      - cause: "Database connection pool exhaustion"
        count: 2
        fix: "Add connection pooling with HPA"
      - cause: "Circuit breaker trip cascade"
        count: 2
        fix: "Review circuit breaker thresholds"
      - cause: "DNS propagation delay during failover"
        count: 1
        fix: "Implement health-check based routing"
```

## Business Alignment Metrics

### Cost Efficiency

```yaml
cost_metrics:
  infrastructure_cost_per_transaction:
    current: "$0.0003"
    target: "< $0.0002"
    trend: "Decreasing (was $0.0005 in January)"
  
  architecture_debt_cost:
    estimated_interest: "$45,000/month"
    breakdown:
      - "Legacy system maintenance overhead: $20,000"
      - "Developer productivity loss: $15,000"
      - "Incident response from architecture issues: $10,000"
    
    debt_principal: "$800,000 (estimated migration cost)"
    debt_ratio: "6.7% of engineering budget"
  
  cost_by_architecture_characteristic:
    scalability: "$12,000/month (excess provisioning)"
    performance: "$3,000/month (extra caching)"
    availability: "$8,000/month (multi-region overhead)"
    security: "$5,000/month (encryption, monitoring)"
```

### Feature Velocity

```yaml
velocity_metrics:
  time_to_add_new_api_endpoint:
    current: "2 days"
    target: "< 1 day"
    bottleneck: "API gateway configuration + documentation"
  
  time_to_add_new_integration:
    current: "2 weeks"
    target: "1 week"
    bottleneck: "Integration testing with external system"
  
  time_to_modify_existing_feature:
    current: "4 days"
    target: "2 days"
    bottleneck: "Understanding legacy code + testing impacted paths"
  
  feature_flag_adoption:
    current: "60% of features use feature flags"
    target: "> 90%"
  
  architecture_overhead_ratio:
    description: "Time spent on architecture vs. feature work"
    current: "30%"
    target: "< 20%"
    assessment: "High — indicates architecture debt and governance overhead"
```

## Architecture Health Score

### Composite Health Index

```yaml
health_score:
  version: "1.0"
  system: "E-Commerce Platform"
  date: "2026-05-27"
  
  dimensions:
    structural_health:
      score: 7.2 / 10
      weight: 0.25
      weighted: 1.80
      metrics:
        - "Coupling: 7/10 (3 cycles, improving)"
        - "Modularity: 8/10 (clear boundaries)"
        - "Fitness compliance: 6/10 (87% pass rate)"
      trend: "▲ Improving (from 6.5)"
    
    operational_health:
      score: 8.1 / 10
      weight: 0.25
      weighted: 2.03
      metrics:
        - "SLO compliance: 8/10 (98.2%)"
        - "Incident rate: 7/10 (14 this quarter)"
        - "Deployment health: 9/10 (99.9% success)"
      trend: "► Stable"
    
    business_alignment:
      score: 6.8 / 10
      weight: 0.25
      weighted: 1.70
      metrics:
        - "Feature velocity: 6/10 (declining)"
        - "Cost efficiency: 7/10 (improving)"
        - "Stakeholder satisfaction: 7/10 (survey score)"
      trend: "▼ Declining (velocity concern)"
    
    evolution_capability:
      score: 7.5 / 10
      weight: 0.25
      weighted: 1.88
      metrics:
        - "Migration progress: 8/10 (60% to target)"
        - "Technology freshness: 7/10 (90% of stack current)"
        - "Changeability: 7/10 (time to add new feature stable)"
      trend: "▲ Improving (migration on track)"
  
  composite_score: 7.4 / 10
  target: "> 8.0 / 10"
  assessment: "Good but not great. Two areas need attention: fitness compliance and feature velocity."
  
  priorities:
    - "Increase fitness function coverage by 20%"
    - "Address feature velocity bottleneck (API gateway config)"
    - "Complete 4 outstanding architecture debt items"
```

### Architecture Health Review Cadence

```yaml
review_cadence:
  continuous:
    - "Fitness functions in CI (per build)"
    - "SLO monitoring (per minute)"
    - "Incident tracking (per incident)"
  
  weekly:
    - "Review new architecture debt items"
    - "Track fitness function regressions"
    - "Architecture team sync"
  
  monthly:
    - "Architecture health snapshot"
    - "Review ADR log for stale decisions"
    - "Technology radar update"
    - "Report to engineering leadership"
  
  quarterly:
    - "Full architecture health score (composite)"
    - "Enterprise architecture review"
    - "Roadmap and target state update"
    - "Survey stakeholders on architecture satisfaction"
  
  annually:
    - "Major architecture assessment (ATAM or equivalent)"
    - "Technology strategy refresh"
    - "Architecture metric targets recalibration"
```

## Metric Anti-Patterns

### Anti-Pattern 1: Vanity Metrics

```yaml
symptom: "Reporting metrics that always look good but don't drive improvement"
example: "Code coverage percentage (easy to game, doesn't measure test quality)"
fix: "Use actionable metrics that indicate specific problems, not general 'health'"
```

### Anti-Pattern 2: Metric Without Context

```yaml
symptom: "Reporting a number without baseline, trend, or target"
example: "Our coupling score is 0.31" (so what?)
fix: "Always include: current value, trend (improving/declining), target, and action if off-track"
```

### Anti-Pattern 3: Too Many Metrics

```yaml
symptom: "Dashboard with 50+ metrics, no one knows which matter"
example: "Tracking 30+ architecture metrics but never acting on them"
fix: "Focus on 10-15 key metrics. The 'one thing' that matters for each dimension."
```

### Anti-Pattern 4: Gaming the Metric

```yaml
symptom: "Teams optimize for the metric instead of the outcome"
example: "Teams avoid refactoring because it temporarily increases cycle time"
fix: "Balance composite metrics that can't easily be gamed. Review metric definitions quarterly."
```

## Key Points

- Measure what matters, not what's easy — coupling counts are useful, but feature velocity and stakeholder satisfaction are more impactful
- Always include trend data — a single snapshot tells you status, a trend tells you trajectory
- Architecture health is a composite of structural, operational, business, and evolution dimensions — optimizing one dimension at the expense of others creates imbalance
- DORA metrics provide a standardized view of operational effectiveness — benchmark against industry standards
- Cost of architecture debt should be quantified in business terms ($/month) — this drives executive action more effectively than technical arguments
- Architecture metrics should drive decisions, not just fill dashboards — every metric should have a corresponding action if off-target
- Review metric definitions quarterly — what mattered 6 months ago may not matter now
- Automate metric collection where possible — manual metrics are rarely collected consistently
- Present metrics to the right audience at the right granularity — executives want composite scores, engineers want specific measurements
- The most important architecture metric is trend over time — is the architecture getting better or worse?
