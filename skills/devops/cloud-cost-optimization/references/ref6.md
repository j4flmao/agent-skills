# Unit Economics, Showback and Chargeback

Total cloud spend going up is not a problem if the business grows faster. Unit economics expresses cost per business outcome (per order, per active user, per GB processed) so engineering and finance can judge efficiency independently of growth. This reference covers choosing unit metrics, computing them from billing exports, and running showback or chargeback.

## Choosing Unit Metrics

A good unit metric is tied to value, measurable daily, and driven by the system whose cost it divides.

| Business | Candidate unit | Cost numerator |
|----------|----------------|----------------|
| E-commerce | Cost per order | Checkout, catalog, payment services |
| SaaS | Cost per monthly active tenant or seat | Shared platform + tenant-attributable services |
| Media / streaming | Cost per streamed hour or GB delivered | CDN, transcoding, storage |
| Data platform | Cost per TB processed or per query | Warehouse, compute, storage |
| API product | Cost per 1,000 API calls | API services, gateway, data stores |

Avoid units the platform team cannot influence (for example revenue) as the only metric; pair a technical unit (cost per request) with a business unit (cost per order).

## Computing Unit Cost

```text
unit_cost(period) = allocated_cost(period) / units(period)
gross_margin_impact = unit_cost / revenue_per_unit
```

Use amortized or FOCUS `EffectiveCost` for the numerator so commitment purchases do not create spikes.

```sql
-- BigQuery: daily cost per order, joining FOCUS-style cost data with business events
WITH cost AS (
  SELECT DATE(ChargePeriodStart) AS day, SUM(EffectiveCost) AS cost
  FROM   finops.focus_costs
  WHERE  Tags['product'] = 'checkout'
  GROUP  BY day
),
orders AS (
  SELECT DATE(created_at) AS day, COUNT(*) AS orders
  FROM   commerce.orders
  WHERE  status = 'completed'
  GROUP  BY day
)
SELECT c.day, c.cost, o.orders, SAFE_DIVIDE(c.cost, o.orders) AS cost_per_order
FROM   cost c JOIN orders o USING (day)
ORDER  BY c.day;
```

Smooth with a 7-day rolling window: billing data lags and weekly patterns create noise.

## Allocating Shared Costs

Shared costs (networking, shared clusters, observability, security tooling, support plans) must be split by a documented rule.

| Method | Rule | Use for |
|--------|------|---------|
| Proportional | By share of direct cost | Support plans, general overhead |
| Usage-based driver | By measured usage (requests, CPU-seconds, GB) | Shared clusters, API gateways, data platforms |
| Even split | Equal per team | Small fixed tools |
| Fixed / platform-owned | Not allocated; owned by platform budget | Idle capacity, platform R&D |

Write the rule down and keep it stable across quarters; changing it makes trends meaningless.

## Showback vs Chargeback

| Aspect | Showback | Chargeback |
|--------|----------|------------|
| What happens | Teams see their cost | Cost is moved to team budgets in finance systems |
| Accuracy needed | Directionally correct | Auditable, reconciled with invoice |
| Prerequisites | Tagging, allocation rules | Showback running reliably, finance agreement, dispute process |
| Behavioral effect | Awareness | Strong incentive; can cause gaming and friction |

Start with showback. Move to chargeback only when tag coverage is high and allocation rules are agreed.

## Showback Report Contents

| Section | Content |
|---------|---------|
| Summary | Total team cost, change vs last period, forecast |
| Unit cost | Team's unit metrics with trend |
| Breakdown | Top services and resources, shared-cost allocation shown separately |
| Efficiency | Rightsizing and commitment coverage for the team's resources |
| Anomalies | Notable spikes with explanations |
| Actions | Open optimization recommendations with estimated savings |

## Forecasting with Unit Costs

```text
forecast_cost = forecast_units x expected_unit_cost + fixed_costs
```

Driver-based forecasts link cloud budgets to business plans: if orders are expected to double, cost should grow by less than double if unit cost is falling. Compare forecast vs actual monthly; a rising unit cost is an engineering signal, a rising unit count is a business signal.

## KPIs

| KPI | Definition | Direction |
|-----|------------|-----------|
| Unit cost | Cost / business unit | Down or flat while scaling |
| Allocatable spend | % of spend with an owner | Up |
| Commitment coverage | Covered / eligible spend | Up to target |
| Waste ratio | Identified waste / spend | Down |
| Forecast accuracy | abs(forecast - actual) / actual | Down |
| Time to explain anomaly | Detection to root cause | Down |

## Organizational Practice

- **Cadence**: monthly business review with engineering, finance and product; weekly anomaly triage.
- **Ownership**: each service has a cost owner, the same as its on-call owner.
- **Engineering incentives**: include unit cost in design reviews and quarterly goals; celebrate efficiency improvements, not just spend cuts.
- **Data quality first**: if tags are missing, unit costs are wrong. Fix allocation before publishing rankings.

## Pitfalls

| Pitfall | Effect | Fix |
|---------|--------|-----|
| Using invoice (unblended) cost for units | Spikes in purchase months | Amortized / effective cost |
| Allocation rule changes every quarter | No usable trend | Version the rule; restate history when it changes |
| Unit metric from a different system clock/timezone | Daily mismatch | Align on UTC days |
| Chargeback before tag coverage is high | Disputes, distrust | Showback first |
| Only total spend reported | Growth looks like inefficiency | Report unit cost beside totals |

## Checklist

- [ ] One technical and one business unit metric per product
- [ ] Unit cost computed daily from billing export + business events
- [ ] Shared-cost allocation rule documented and versioned
- [ ] Monthly showback reports published to every owning team
- [ ] Driver-based forecast linked to business plan
- [ ] Chargeback only after allocation quality is proven
