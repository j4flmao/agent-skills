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
version: "2.0.0"
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
Forecast capacity demand 1-4 quarters ahead, size infrastructure with the right headroom for each
service tier, and trigger procurement with enough lead time for bare-metal/colo. Translate business
growth assumptions into compute/storage/network units and money.

## Framework/Methodology

### PREDICT Methodology
A five-phase framework for systematic capacity planning:

Phase 1 - Profile: Establish baseline usage for every resource across all services. Collect median, p95, p99, and peak values over a rolling 90-day window. Segment by service tier, region, and deployment environment.

Phase 2 - Review: Analyze historical trends and identify growth patterns. Correlate usage spikes with business events (product launches, marketing campaigns, seasonal peaks). Document assumptions about future growth drivers.

Phase 3 - Estimate: Apply growth models to each resource. Run linear, exponential, seasonal, and event-driven projections. Assign confidence intervals based on historical accuracy and business certainty.

Phase 4 - Determine: Calculate required capacity including headroom by tier. Account for failure tolerance, maintenance windows, and deployment overhead. Generate procurement schedule aligned with lead times.

Phase 5 - Iterate: Establish quarterly review cadence. Compare forecast vs actual monthly. Adjust models based on accuracy. Re-forecast immediately after any business inflection.

### Top-Down vs Bottom-Up Forecasting

Top-Down: Start with business growth assumptions (revenue targets, user growth, transaction volume). Apply historical ratios (requests per user, storage per user, compute per transaction). Best for new products without usage history. Risk: may over-provision if ratios shift.

Bottom-Up: Start with per-service usage metrics. Aggregate to total capacity. Best for mature services with stable growth patterns. Risk: may miss business-driven inflection points.

Recommended: Use both, reconcile differences. Top-down sets the ceiling, bottom-up validates the floor.

### Capacity Budgeting by Resource Type

Compute: Measure in vCPU-hours or pod-seconds. Track utilization at node and container level. Plan for bin-packing overhead (Kubernetes scheduler efficiency). Account for cluster headroom (node failure buffer).

Memory: Measure RSS vs limit. Track page cache and buffer cache. Plan for GC overhead in managed runtimes. Account for OOM-killer safety margin (10-15%).

Storage: Measure logical usage, replication factor, backup copies, retention growth. Plan for compaction/defragmentation overhead. Account for snapshot and restore scratch space.

Network: Measure ingress/egress, p95 bandwidth, connection count, packet rate. Plan for spike buffers and CDN cache-miss scenarios. Account for cross-region replication traffic.

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
- [ ] What-if scenarios (2x traffic, 0.5x traffic) documented

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

Collect per deployment group (region, AZ, cluster). Aggregate correctly: p95 of total is not sum of per-node p95. Use additive percentiles via HDR Histogram or DDSketch for accurate aggregation.

Measure request latency impact on resource usage. A latency spike can masquerade as a capacity shortage (queuing builds, utilization rises, but work done per second drops).

### Step 2: Choose Growth Model
```
Linear         predictable B2B SaaS, mature product
Exponential    high-growth startup, viral product
Seasonal       ecommerce (Q4 spike 3-5x), tax season, sport events
Event-driven   product launch, marketing campaign, acquired customer
Step           contract-bound enterprise customer (known onboarding date)
```

Formulas:
```
Linear:        f(t) = a + b*t
Exponential:   f(t) = a * (1+r)^t
Seasonal:      f(t) = base(t) * season_factor(month)
```

Validate model fit using:
- R-squared > 0.9 for linear models
- Mean Absolute Percentage Error (MAPE) < 15% for chosen model
- Residual analysis: residuals should be randomly distributed, not patterned
- Cross-validation: train on 12 months, validate on next 3 months

When models disagree, use the more conservative projection for Tier-1 services and the more optimistic for Tier-4.

### Step 3: Apply Headroom by Tier
```
Tier-1 (99.99%)   100% headroom over forecast peak   (2x peak capacity)
Tier-2 (99.95%)   50% headroom over forecast peak    (1.5x)
Tier-3 (99.9%)    25% headroom                       (1.25x)
Tier-4 (99%)      10% headroom                       (1.1x)
```
Reason: spike + node failure + maintenance window must all fit within remaining capacity.

```
Required capacity = forecast_peak x (1 + headroom%) x (N / (N - failures_tolerated))
where N = total nodes, failures_tolerated = nodes that can fail in window
```

Headroom decomposition:
```
30%  traffic spike buffer
30%  node failure tolerance (N+1 for 3+ nodes)
20%  deployment surge (rolling update doubles resource need)
20%  measurement error margin
```

### Step 4: Lead Time Aware Ordering
```
Resource              Lead time          Order trigger
Cloud autoscale        seconds-minutes   raise max limit when current/limit > 60%
Cloud reserved cap     1-2 weeks         order 1mo ahead for steep ramps
Colo rack + power      4-8 weeks         order when 6mo forecast crosses limit
Bare-metal server      8-16 weeks        order when 9mo forecast crosses limit
Transit / cross-connect 6-12 weeks       order when bandwidth p95 > 50% of contract
Submarine fiber (rare) 12+ months        strategic, not capacity-planning
```

For hardware procurement: factor in burn-in time (2 weeks for servers), staging/configuration (1 week), deployment window scheduling (1-2 weeks). Add these to lead time before computing order trigger.

### Step 5: Autoscale Boundaries
```yaml
# HorizontalPodAutoscaler - min/max set above forecast headroom
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 6                          # = base load / per-pod capacity
  maxReplicas: 60                         # = forecast peak x headroom / per-pod
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: {type: Utilization, averageUtilization: 60}    # leave 40% for spike
  behavior:
    scaleUp:   {stabilizationWindowSeconds: 0,   policies: [{type: Percent, value: 100, periodSeconds: 60}]}
    scaleDown: {stabilizationWindowSeconds: 300, policies: [{type: Percent, value: 25,  periodSeconds: 60}]}
```

For stateful workloads: use maxReplicas as a hard safety limit. Set cluster-autoscaler limits separately. For serverless: configure provisioned concurrency and account for cold-start overhead in peak capacity.

### Step 6: What-If Scenarios
- 2x traffic surprise (viral hit) - what breaks first?
- 0.5x traffic (recession / lost contract) - what can be scaled down?
- 1 region lost - does remaining region have 2x capacity?
- 1 vendor lost - do fallbacks have provisioned capacity?
- 3 simultaneous node failures - can cluster rebalance within SLO?

Document the bottleneck resource for each scenario. Run chaos engineering experiments to validate.

### Step 7: Cost-Per-Unit-of-Work
```
$ / 1k requests
$ / GB stored
$ / GB egress
$ / active user / month
$ / transaction
```
Track these per quarter. If they trend up, find inefficiency. If down, reinvest in features.

Normalize cost-per-unit across deployment environments. Account for reserved instance discounts, committed use discounts, and spot pricing. Publish unit costs per service tier.

### Step 8: Quarterly Review Cadence
```
Q-end -2w:  pull metrics, draft forecast
Q-end -1w:  service owners review numbers
Q-end:      finalize plan, file procurement orders
Q+1 -2w:    place orders for Q+1 capacity
Q+1 day 1:  autoscale max raised
```

Monthly pulse check: compare actual vs forecast for each resource. If variance exceeds 20%, trigger ad-hoc review. Document model accuracy in a running scorecard.

## Common Pitfalls

Pitfall 1: Measuring peak from average-only metrics. Average hides spikes. A service running at 40% average CPU but spiking to 95% every 5 minutes needs more headroom than one running at 60% flat.

Pitfall 2: Ignoring the noise floor. Low-utilization services show high variability in percentage terms. Don't over-provision for statistical noise. Set a minimum floor capacity.

Pitfall 3: Procurement for peak without considering elasticity. If your cloud autoscale can handle the spike in seconds, you don't need to provision for peak 100% of the time. Use burst capacity for spikes, base capacity for steady state.

Pitfall 4: Uniform headroom across all tiers. Tier-1 deserves 100% headroom. Tier-4 can run at 80% utilization. Treating them the same wastes budget or introduces risk.

Pitfall 5: Forecast without confidence intervals. A single number forecast is always wrong. Provide best-case, expected-case, worst-case. Use the worst case for procurement decisions.

Pitfall 6: Static models that don't adapt. A linear model fitted to last year's data will miss this year's hockey-stick growth. Re-fit models each quarter. Use ensemble methods for non-obvious patterns.

Pitfall 7: Storage growth modeled as linear when it compounds. Storage often exhibits exponential growth (user uploads, logs, event streams). Model it as compound growth with a retention-based decay.

Pitfall 8: Ignoring dependency cascades. Doubling API traffic may increase DB connections 10x due to N+1 queries. Model capacity at dependency boundaries, not just entry points.

## Best Practices

Practice 1: Instrument everything in standard units. Use milli-cores for CPU, bytes for memory, IOPS for storage. Avoid percentage utilization as the primary metric - it varies by instance type.

Practice 2: Maintain a capacity budget API. Each team submits their forecast quarterly. The API aggregates, validates, and flags outliers. Automate the data collection, not the analysis.

Practice 3: Right-size autoscale policies before adding hardware. The cheapest capacity improvement is tuning scale-up thresholds, stabilization windows, and pod resource requests.

Practice 4: Over-provision cluster headroom, not instance size. A cluster with N+2 buffer can absorb a node failure gracefully. A single giant instance failure takes out 25% of capacity.

Practice 5: Benchmark perf-per-cost curves. A 32-vCPU instance may cost 2x a 16-vCPU but deliver 2.5x throughput for parallel workloads. Benchmark your workload, don't trust published specs.

Practice 6: Build a capacity dashboard with three views. Executive: total cost and headroom by tier. Engineering: per-service forecast vs actual. Procurement: order pipeline and lead times.

Practice 7: Integrate capacity data with financial planning. Cost-per-unit trends feed the budget process. Capacity investment requests must show ROI in terms of revenue support or cost avoidance.

## Templates & Tools

### Capacity Plan Template
```
# Capacity Plan: {Service} - {Quarter} {Year}

## Baseline (Last 90 Days)
- Average RPS: {value}
- P99 RPS: {value}
- Peak RPS: {value}
- Peak-to-Average Ratio: {value}

## Growth Model
- Selected Model: {linear/exponential/seasonal}
- Model Fit (R-squared): {value}
- Quarterly Growth Rate: {value}%

## Forecast
| Period | Expected | Pessimistic | Optimistic |
|--------|----------|-------------|------------|
| Q+1    | {value}  | {value}     | {value}    |
| Q+2    | {value}  | {value}     | {value}    |
| Q+3    | {value}  | {value}     | {value}    |
| Q+4    | {value}  | {value}     | {value}    |

## Headroom Calculation
- Service Tier: {Tier}
- Headroom Required: {value}%
- Required Capacity: {value}

## Procurement Plan
| Resource | Lead Time | Order Date | Delivery Date |
|----------|-----------|------------|---------------|
| {item}   | {weeks}   | {date}     | {date}        |

## Autoscale Configuration
- Min Replicas: {value}
- Max Replicas: {value}
- Target Utilization: {value}%
- Scale-Up Policy: {policy}
- Scale-Down Policy: {policy}
```

### Tools Reference
- Prometheus + Kube-metrics for container resource monitoring
- Netflix-Sketchy / DDSketch for percentile aggregation
- Prophet / statsmodels for time-series forecasting
- Terraform + Kubernetes HPA for autoscale boundary management
- Grafana dashboard for capacity visualization
- Custom cost-per-unit calculator with tagged resource data

### Capacity Review Agenda (Quarterly)
1. Review previous quarter forecast accuracy (10 min)
2. Present current usage baselines for each service (15 min)
3. New business growth assumptions from product/marketing (15 min)
4. Forecast for next 4 quarters (20 min)
5. Headroom exceptions and risk review (15 min)
6. Procurement decisions and sign-off (15 min)
7. Action items and owners (10 min)

## Case Studies

### Case Study 1: E-Commerce Platform Holiday Scaling
A major e-commerce platform with steady 20% QoQ growth faced Q4 spikes of 5x baseline. Using seasonal growth models, they established dynamic autoscale limits that expanded 2 hours before known flash sales. Pre-warmed 30% of peak capacity using spot instances. Result: zero scale-related incidents during Black Friday, 40% cost savings vs always-provisioned peak capacity.

### Case Study 2: Fintech SaaS Storage Crisis
A fintech startup modeled storage growth linearly while actual usage compounded at 15% month-over-month due to transaction history retention. At month 18, storage costs exceeded revenue. Applying exponential growth models with retention-based decay curves, they projected the crisis 6 months in advance. Implemented tiered storage (hot/warm/cold) with automated lifecycle policies. Result: storage cost growth reduced from +15% to +3% monthly.

### Case Study 3: Enterprise Bare-Metal Migration
An enterprise migrating from colo to cloud discovered that their 16-week bare-metal lead time was longer than their forecast horizon for a fast-growing service. They implemented a hybrid approach: cloud autoscale absorbed growth bursts while bare-metal orders were placed using 12-month forecasts with 50% headroom. Established a quarterly review cadence. Result: zero capacity-related outages during migration, 30% reduction in total infrastructure cost.

## Rules
- Forecast horizon >= longest procurement lead time.
- Tier-1 headroom >= 100% of forecast peak.
- Re-forecast immediately after any business inflection (launch, campaign, acquisition).
- Autoscale max raised >= 1 quarter ahead of forecast crossing 60% utilization.
- Storage projections account for backup + replication factor (RF=3 -> 3x raw).
- Network egress projections include CDN cache miss surprise.
- Procurement signed off by finance + engineering jointly for items > 1 quarter cost.
- Every forecast includes a confidence interval (best/worst/expected case).
- Baseline measurement window is minimum 90 days for meaningful percentiles.
- Growth models re-validated quarterly against actuals.
- Cost-per-unit-of-work tracked and published monthly.
- Capacity budget must be integrated with financial planning cycle.
- Dependency resources (DB, cache, queue) included in every service forecast.
- Autoscale policies tested in staging before applying to production.
- What-if scenarios documented for 2x and 0.5x traffic conditions.
- Reserved/committed capacity purchases justified by stable base load only.
- Capacity data collected at service level, not just infrastructure level.
- Alerts configured for forecast-to-actual variance exceeding 20%.
- Hardware burn-in and staging time included in procurement lead time.

## References
  - references/capacity-planning-advanced.md -- Capacity Planning Advanced Topics
  - references/capacity-planning-fundamentals.md -- Capacity Planning Fundamentals
  - references/capacity-planning-models.md -- Capacity Planning Models and Math
  - references/capacity-planning-automation.md -- Capacity Planning Automation and Tooling
  - references/forecasting.md -- Forecasting -- Models, Fit, Confidence Intervals
  - references/growth-modeling.md -- Growth Modeling -- Business to Infra Translation
  - references/headroom-math.md -- Headroom Math -- Sizing With Failures, Spikes, Maintenance
  - references/procurement.md -- Procurement -- Lead Times, Vendor Matrix, Contract Patterns
## Handoff
- `devops-cloud-cost-optimization` for spot/RI/savings-plan optimization within forecast.
- `devops-finops` for chargeback, showback, multi-team allocation.
- `enterprise-cost-governance` for org-level budget enforcement.
- `devops-cloud-architecture` for design adjustments when forecast exceeds current arch.
