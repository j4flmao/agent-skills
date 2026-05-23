# Budget Policies

## Budget Structure

### Hierarchical Budget Model
```
Organization Level: Total cloud + AI spend cap
  ├── Engineering: 60% of total
  │   ├── AI Inference: 40% of eng
  │   ├── AI Training: 25% of eng
  │   └── Infrastructure: 35% of eng
  ├── Product: 25% of total
  └── Operations: 15% of total
```

### Budget Periods
- Annual: Total allocation approved by leadership
- Quarterly: Reforecast based on actuals and changes
- Monthly: Spending target (annual / 12)
- Daily: Soft cap for anomaly detection

## Approval Workflow

### Spending Tiers
```
<$100: Self-service (individual)
$100-$1,000: Team lead approval
$1,000-$10,000: Director approval
$10,000-$100,000: VP approval
>$100,000: C-level approval + board notification
```

### Exception Process
```yaml
exception_request:
  requester: "team-lead@company.com"
  amount: 15000
  justification: "Fine-tuning production model for Q4 campaign"
  duration: "one-time"
  alternative_considered: "Using existing model with prompt tuning (saved $5K)"
  approval_chain: ["director-eng", "vp-product", "cfo"]
```

## Policy Enforcement

### Hard Policies (Automated)
```
Resource creation blocked if:
- Cost center tag missing
- Budget exceeded for category
- Non-approved instance type (>$10/hr)
```

### Soft Policies (Alert)
```
Alert triggered when:
- Monthly burn rate > 80% of budget
- Day-over-day cost increase > 50%
- New service appears in billing
- Resource count grows > 20% in a week
```

## Budget Allocation Strategies

| Strategy | Best For | Pros | Cons |
|----------|----------|------|------|
| Fixed allocation | Stable teams | Predictable | Inflexible |
| Proportional to usage | Variable teams | Fair | Complex tracking |
| Pooled + reserve | Shared services | Flexible | Needs governance |
| Zero-based budgeting | Startups | Precise | High overhead |

## Review Cadence

### Weekly
- Track burn rate vs budget
- Flag anomalies to cost center owners
- Review top 5 cost drivers

### Monthly
- Full budget vs actual report
- Reforecast remaining months
- Review savings initiatives progress

### Quarterly
- Budget adjustment requests
- Business review with finance
- Update cost allocation model

## Budget Templates

### Monthly Report
```yaml
month: 2026-03
total_budget: 50000
total_spend: 42350
utilization: 84.7%
forecast_month_end: 45200
anomalies:
  - service: "gpt-4o-inference"
    increase: "25% MoM"
    reason: "New product launch"
    action: "Request budget increase of $5K/mo"
```

### Budget Request Template
```
Requestor: {name}
Cost Center: {team}
Amount: {requested_amount}
Period: {start_date} to {end_date}
Category: {infrastructure | ai | tools | consulting}
Justification:
- What: Description of spend
- Why: Business value or requirement
- Alternatives considered
- ROI estimate
Approvals: [{level1}, {level2}]
```
