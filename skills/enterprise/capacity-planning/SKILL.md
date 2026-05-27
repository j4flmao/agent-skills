---
name: enterprise-capacity-planning
description: >
  Use this skill when forecasting infrastructure capacity needs, calculating headroom, sizing for growth,
  modeling peak vs sustained load, planning procurement lead times for bare-metal/colo, computing
  cost-per-unit-of-work, and planning multi-quarter capacity roadmap. This skill enforces: usage baseline
  + p99 + peak measurement, growth modeling (linear/exponential/seasonal), headroom math by tier, lead-time
  aware ordering, autoscale boundaries, and capacity drill cadence. Do NOT use for: cloud cost optimization
  (see devops-cloud-cost-optimization), FinOps governance (see devops-finops), or per-team budget allocation
  (see enterprise-cost-governance).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, capacity-planning, forecasting, phase-8]
---

# Enterprise Capacity Planning

## Purpose
Forecast capacity demand 1–4 quarters ahead, size infrastructure with the right headroom for each
service tier, and trigger procurement with enough lead time for bare-metal/colo. Translate business
growth assumptions into compute/storage/network units and money.

## Agent Protocol

### Trigger
Exact user phrases: "capacity planning", "headroom", "forecast", "demand model", "growth model",
"sizing", "right-sizing", "autoscale limits", "procurement lead time", "compute budget", "storage
projection", "peak-to-average ratio", "burst capacity", "quarterly capacity review".

### Input Context
- Current usage metrics (CPU, memory, IOPS, storage, network egress, requests/sec) per service
- 12+ month historical trend
- Business growth assumptions (signups, MAU, transactions)
- Marketing campaigns / launches in next 4 quarters
- Procurement lead time (cloud: minutes / colo: weeks / bare-metal new build: months)
- Budget ceiling per quarter
- Tier classification per service (affects headroom requirement)

### Output Artifact
Capacity plan with baseline, forecast, headroom, procurement schedule, autoscale boundaries.

### Response Format
```
Service        Current   Q+1     Q+2     Q+3     Q+4     Action
api-rps        12k       18k     27k     35k     45k     scale autoscale max to 60k by Q+1
db-storage-TB  4.2       6.0     8.5     12.0    17.0    order 20TB tier by Q+1 (lead 8w)
egress-Gbps    1.5       2.2     3.0     4.5     6.5     upgrade transit contract Q+2
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Baseline measured (median, p95, p99, peak)
- [ ] Growth model selected (linear / exponential / seasonal / event-driven)
- [ ] Forecast 4 quarters with confidence interval
- [ ] Headroom per tier computed and applied
- [ ] Autoscale max raised ahead of forecast
- [ ] Procurement orders placed with lead-time buffer
- [ ] Quarterly review scheduled
- [ ] What-if scenarios (2× traffic, 0.5× traffic) documented

### Max Response Length
300 lines.

## Workflow

### Step 1: Measure Baseline
For each resource per service:
```
median     50th percentile of 30-day rolling window
p95        95th percentile (alert threshold sizing)
p99        99th percentile (peak handling)
peak       max observed in 90-day window
peak/avg   peak-to-average ratio (how spiky)
```

### Step 2: Choose Growth Model
```
Linear         predictable B2B SaaS, mature product
Exponential    high-growth startup, viral product
Seasonal       ecommerce (Q4 spike 3–5×), tax season, sport events
Event-driven   product launch, marketing campaign, acquired customer
Step           contract-bound enterprise customer (known onboarding date)
```

Formulas:
```
Linear:        f(t) = a + b*t
Exponential:   f(t) = a * (1+r)^t
Seasonal:      f(t) = base(t) * season_factor(month)
```

### Step 3: Apply Headroom by Tier
```
Tier-1 (99.99%)   100% headroom over forecast peak   (2× peak capacity)
Tier-2 (99.95%)   50% headroom over forecast peak    (1.5×)
Tier-3 (99.9%)    25% headroom                       (1.25×)
Tier-4 (99%)      10% headroom                       (1.1×)
```
Reason: spike + node failure + maintenance window must all fit within remaining capacity.

```
Required capacity = forecast_peak × (1 + headroom%) × (N / (N - failures_tolerated))
where N = total nodes, failures_tolerated = nodes that can fail in window
```

### Step 4: Lead Time Aware Ordering
```
Resource              Lead time          Order trigger
Cloud autoscale        seconds–minutes   raise max limit when current/limit > 60%
Cloud reserved cap     1–2 weeks         order 1mo ahead for steep ramps
Colo rack + power      4–8 weeks         order when 6mo forecast crosses limit
Bare-metal server      8–16 weeks        order when 9mo forecast crosses limit
Transit / cross-connect 6–12 weeks       order when bandwidth p95 > 50% of contract
Submarine fiber (rare) 12+ months        strategic, not capacity-planning
```

### Step 5: Autoscale Boundaries
```yaml
# HorizontalPodAutoscaler — min/max set above forecast headroom
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 6                          # = base load / per-pod capacity
  maxReplicas: 60                         # = forecast peak × headroom / per-pod
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: {type: Utilization, averageUtilization: 60}    # leave 40% for spike
  behavior:
    scaleUp:   {stabilizationWindowSeconds: 0,   policies: [{type: Percent, value: 100, periodSeconds: 60}]}
    scaleDown: {stabilizationWindowSeconds: 300, policies: [{type: Percent, value: 25,  periodSeconds: 60}]}
```

### Step 6: What-If Scenarios
- 2× traffic surprise (viral hit) — what breaks first?
- 0.5× traffic (recession / lost contract) — what can be scaled down?
- 1 region lost — does remaining region have 2× capacity?
- 1 vendor lost — do fallbacks have provisioned capacity?

### Step 7: Cost-Per-Unit-of-Work
```
$ / 1k requests
$ / GB stored
$ / GB egress
$ / active user / month
$ / transaction
```
Track these per quarter. If they trend up, find inefficiency. If down, reinvest in features.

### Step 8: Quarterly Review Cadence
```
Q-end -2w:  pull metrics, draft forecast
Q-end -1w:  service owners review numbers
Q-end:      finalize plan, file procurement orders
Q+1 -2w:    place orders for Q+1 capacity
Q+1 day 1:  autoscale max raised
```

## Rules
- Forecast horizon ≥ longest procurement lead time.
- Tier-1 headroom ≥ 100% of forecast peak.
- Re-forecast immediately after any business inflection (launch, campaign, acquisition).
- Autoscale max raised ≥ 1 quarter ahead of forecast crossing 60% utilization.
- Storage projections account for backup + replication factor (RF=3 → 3× raw).
- Network egress projections include CDN cache miss surprise.
- Procurement signed off by finance + engineering jointly for items > 1 quarter cost.

## References
  - references/capacity-planning-advanced.md — Capacity Planning Advanced Topics
  - references/capacity-planning-fundamentals.md — Capacity Planning Fundamentals
  - references/forecasting.md — Forecasting — Models, Fit, Confidence Intervals
  - references/growth-modeling.md — Growth Modeling — Business → Infra Translation
  - references/headroom-math.md — Headroom Math — Sizing With Failures, Spikes, Maintenance
  - references/procurement.md — Procurement — Lead Times, Vendor Matrix, Contract Patterns
## Handoff
- `devops-cloud-cost-optimization` for spot/RI/savings-plan optimization within forecast.
- `devops-finops` for chargeback, showback, multi-team allocation.
- `enterprise-cost-governance` for org-level budget enforcement.
- `devops-cloud-architecture` for design adjustments when forecast exceeds current arch.
