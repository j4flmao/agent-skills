# GTM Measurement: Funnel Metrics, Unit Economics and Launch Impact Analysis

How to measure whether go-to-market work is working: funnel definitions, unit economics (CAC, payback, LTV, net revenue retention), attribution approaches and their limits, measuring the incremental impact of launches, and a launch scorecard. Fundamentals are in `go-to-market-fundamentals.md`.

## Funnel Definitions

Write definitions down; most GTM disputes are definition disputes.

| Stage | PLG definition example | Sales-led definition example |
|---|---|---|
| Visitor / reach | Unique visitors to site or listing | Target accounts reached |
| Lead / signup | Account created | Contact captured (MQL by agreed criteria) |
| Activated / qualified | Completed the key action (e.g. first deployment) within 7 days | Sales-accepted, discovery done (SQL) |
| Opportunity / PQL | Team usage over threshold, admin invited others | Opportunity with budget, authority, need, timeline |
| Customer | First paid invoice | Closed-won |
| Retained / expanded | Paid after 90 days; seat or usage growth | Renewal; upsell |

Track conversion and time between stages by cohort (signup month, segment, channel), not as blended totals.

## Unit Economics

| Metric | Formula | Notes |
|---|---|---|
| CAC (blended) | (sales + marketing spend in period) / new customers in period | Use fully loaded costs; also compute paid-only CAC |
| CAC payback (months) | CAC / (new MRR per customer × gross margin) | Common health check; acceptable range depends on segment and funding |
| LTV | ARPA × gross margin / churn rate | Unstable for young companies; use cohort-based estimates |
| LTV : CAC | LTV / CAC | Ratio heuristic, sensitive to LTV assumptions |
| Net revenue retention (NRR) | (starting MRR + expansion − contraction − churn) / starting MRR, for a cohort over 12 months | > 100 % means existing customers grow revenue |
| Gross revenue retention (GRR) | (starting MRR − contraction − churn) / starting MRR | Capped at 100 %; churn signal without expansion masking it |
| Magic number (SaaS) | (net new ARR in quarter) / (S&M spend previous quarter) | Efficiency of sales and marketing spend |

Compute per segment and motion; blended numbers hide unprofitable segments.

## Attribution

| Approach | How | Limits |
|---|---|---|
| Self-reported ("How did you hear about us?") | Signup or sales question | Recall bias; captures dark social and word of mouth |
| First-touch / last-touch | Credit one touchpoint | Ignores the rest of the journey |
| Multi-touch (linear, position-based, data-driven) | Spread credit across tracked touchpoints | Tracking gaps (cookies, privacy, offline), correlation not causation |
| Marketing mix modeling (MMM) | Regression of outcomes on spend over time | Needs long history and variance in spend; coarse |
| Incrementality tests (holdouts, geo experiments) | Compare exposed vs held-out groups | Gold standard for causality; costs reach |

Combine: self-reported + touch-based for direction, incrementality tests for budget decisions.

## Measuring Launch Impact

Launch metrics rise for many reasons (seasonality, other campaigns). Estimate incremental impact:

| Method | When |
|---|---|
| Feature-level holdout (A/B with feature flag) | In-product features; cleanest causal estimate |
| Staggered rollout by region/segment | When holdouts are impossible; compare early vs late groups (difference-in-differences) |
| Pre/post with control series | Compare to a similar unaffected metric/segment |
| Synthetic control | Few units (markets) and good pre-period data |

Define primary metric, guardrail metrics and the analysis window before launch.

## Launch Scorecard

```markdown
Launch: Usage-based billing (Tier 1)      Date: 2026-11-04      Owner: PMM
Primary metric: % of active accounts adopting usage-based plan within 30 days   Target: 15%
Leading indicators (week 1-2): announcement reach, pricing page visits, plan-change starts
Pipeline: opportunities influenced by launch content (CRM campaign), target 40
Guardrails: support tickets per 1k accounts, billing errors, churn of migrated accounts
Analysis: holdout of 10% eligible accounts for in-app prompt; read-out at day 30 and day 90
```

Report at fixed intervals (day 7, 30, 90) against targets set before launch.

## Dashboards

| View | Content |
|---|---|
| Funnel by cohort | Stage conversions and time-to-convert per signup cohort |
| Channel performance | Spend, leads, CAC, payback per channel/segment |
| Retention | Logo and revenue retention curves per cohort; NRR/GRR |
| Launch tracker | Scorecards for active launches |

Data sources: product analytics (events), CRM (opportunities), billing (MRR), marketing platforms (spend). Agree on a single source of truth per metric.

## Pitfalls
- Blended CAC hiding an expensive channel or segment.
- LTV from short histories presented as fact.
- Crediting launches with organic trends (no control).
- Changing metric definitions mid-quarter without restating history.
- Optimizing MQL volume while win rate falls.

## Checklist
- [ ] Written funnel definitions per motion
- [ ] Cohort-based conversion and retention reporting
- [ ] CAC, payback, NRR, GRR per segment and motion
- [ ] Attribution mix with periodic incrementality tests
- [ ] Launch scorecards with pre-registered targets and analysis method
- [ ] Single source of truth per metric
