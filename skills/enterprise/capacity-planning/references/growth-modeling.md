# Growth Modeling — Business → Infra Translation

## The Translation Chain

```
Business metric                Infra metric
─────────────────              ─────────────
MAU (monthly active users)  →  RPS, DB QPS, cache hit/miss, storage
Transactions / day          →  DB writes/sec, queue messages/sec
GB uploaded / day           →  storage growth, egress, CPU (processing)
Concurrent users (peak)     →  websocket conns, DB connections, memory
Items in catalog            →  search index size, query latency
Geographic markets          →  region count, latency, data residency
```

## Per-User Resource Coefficients

Measure once, then forecast = users × coefficient.

```
Example coefficients (typical SaaS):
  RPS per active user          0.01–0.05
  DB QPS per active user       0.05–0.2
  Storage per user (GB)        0.001–10 (huge variance by product)
  Egress per user (GB/month)   0.01–1
  Email per user (per day)     0.1–5
  Connections per user (peak)  0.001–0.01
```

Recompute coefficients quarterly. They drift as product evolves.

## Business → Infra Spreadsheet Template

```
Quarter             Q0     Q+1    Q+2    Q+3    Q+4
MAU (k)             150    180    220    270    330
Active conc peak    8k     10k    12k    15k    18k
Tx / day (M)        2.4    3.0    3.8    4.7    5.8

→ Forecast RPS peak  4k    5k     6k     7.5k   9k
→ DB QPS peak        12k   15k    18k    22k    27k
→ Storage TB         12    16     22     30     40
→ Egress TB/month    8     10     13     17     22
→ Compute vCPU       80    100    120    150    180
→ Estimated cost $   12k   15k    18k    22k    27k
```

## Scenario Planning (must do for Tier-1)

```
Base    forecast as modeled                                → primary plan
Upside  2× growth (viral launch, market shift)             → contingency capacity
Downside 0.5× growth (lost contract, recession)            → cost-cut plan
Stress  10× peak burst (flash sale)                        → burst architecture
Black   full region loss                                   → DR plan capacity
```

For each scenario: which resource saturates first? What is the procurement / autoscale path?

## Event-Driven Modeling

```
Event: product launch / marketing campaign / Black Friday
Step 1: estimate event traffic multiplier from past events
Step 2: window = announcement date − duration end
Step 3: pre-provision capacity 1 week before window
Step 4: monitor real-time vs forecast during event
Step 5: hold capacity 1 week after event (analyse residual demand)
Step 6: capture coefficients into baseline for future
```

## Acquisition / Customer Onboarding

```
Known new tenant: 50k MAU onboarding over 90 days
  Day 0:    sign contract
  Day 0–30: SSO integration, data migration prep
  Day 30:   migrate first 5k users (10%)
  Day 60:   ramp to 50% (25k)
  Day 90:   100% live (50k)

Capacity action: linearly add 50k worth of resources, completed by Day 75.
```

## Cohort-Based Modeling

If you have data: forecast by cohort (signup month). Each cohort has a usage curve over time.

```
Cohort 2025-01:  starts 10k MAU, retains 80% at M+1, 60% at M+12
Cohort 2025-02:  starts 11k MAU, similar curve

Sum of active cohorts at any time = total MAU
```

This is harder to compute but much more accurate for subscription products.

## Sanity Checks

- Does forecast imply > industry-average per-user usage? Likely wrong.
- Does forecast imply unit cost going down? Verify why (efficiency gain real?).
- Does forecast imply a step change without a known business driver? Re-examine.
- Are seasonality factors applied to ALL relevant resources, or just RPS?

## What to Track to Improve Modeling

```
Forecast accuracy by quarter: actual / forecast (target 90–110%)
Coefficient stability: per-user RPS quarter-over-quarter
Cost-per-MAU trend: should be flat or down at scale
Wasted-headroom: peak utilization vs provisioned (should be 60–85%)
```

## Hand-Off to Eng

Capacity plan is useless without action items. Each forecast row pairs with:
- Owning team
- Trigger metric + threshold
- Action (raise autoscale max / order hardware / negotiate contract)
- Deadline (lead-time-aware)
- Status: planned / ordered / received / live
