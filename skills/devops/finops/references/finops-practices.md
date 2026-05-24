# FinOps Practices

## FinOps Lifecycle

```
   ┌────────────┐
   │   INFORM   │ ── Visibility, allocation, benchmarking
   └──────┬─────┘
          ↓
   ┌────────────┐
   │  OPTIMIZE  │ ── Right-sizing, discount, waste elimination
   └──────┬─────┘
          ↓
   ┌────────────┐
   │   OPERATE  │ ── Governance, automation, continuous improvement
   └────────────┘
```

## Cost Allocation

| Dimension | Granularity | Tag/Label |
|-----------|-------------|-----------|
| Team | Coarse | `team: payments` |
| Service | Medium | `service: checkout` |
| Environment | Medium | `environment: production` |
| Cost center | Medium | `cost-center: eng-123` |
| Project | Fine | `project: migration-2024` |
| Owner | Fine | `owner: alice@co` |

```bash
# Enforce tagging policy (AWS)
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=team,Values= Key=environment,Values=
# Returns untagged resources — enforce via Terraform/OPA

# Azure tag enforcement
az tag create --resource-id /subscriptions/... \
  --tags team=payments environment=production
```

## Unit Economics

| Metric | Formula | Target |
|--------|---------|--------|
| Cost per transaction | Total cloud cost / transactions | Decreasing |
| Cost per user | Total cloud cost / MAU | < $0.10 |
| Cost per API call | Total compute / API calls | < $0.0001 |
| Cost per GB stored | Storage cost / stored GB | Matching storage tier cost |
| Cost per ML training run | Training cost / experiments | Decreasing per run |

## Forecasting

```python
# Simple cost forecast using weighted moving average
def forecast_cost(historical: List[float], months: int = 3) -> List[float]:
    weights = [0.5, 0.3, 0.2]  # Recent months weighted higher
    forecast = []
    for _ in range(months):
        # Weighted average of last 3 months
        last_3 = historical[-3:]
        next_val = sum(w * v for w, v in zip(weights, last_3))
        # Apply growth factor (e.g., 5% monthly)
        next_val *= 1.05
        forecast.append(next_val)
        historical.append(next_val)
    return forecast
```

## Budget Models

| Model | Description | Best For |
|-------|-------------|----------|
| Fixed | Static monthly budget | Stable workloads |
| Growth % | Budget grows by X% monthly | Growing startups |
| Zero-based | Justify every dollar | Cost-conscious teams |
| Activity-based | Budget per unit (transaction, user) | Usage-based businesses |
| Cap & invest | Cap ops, invest savings in innovation | Mature FinOps teams |

## Optimization Feedback Loop

| Cadence | Activity | Participants |
|---------|----------|-------------|
| Daily | Cost anomaly review | On-call FinOps |
| Weekly | Waste removal, right-sizing tickets | Platform engineering |
| Monthly | Reserved instance / savings plan analysis | FinOps team |
| Quarterly | Commitment review, unit economics update | FinOps + Finance |
| Annually | Budget planning, vendor negotiation | Leadership + FinOps |

## FinOps Maturity Model

| Level | Inform | Optimize | Operate |
|-------|--------|----------|---------|
| 1 — Crawl | Basic billing, manual allocation | Manual right-sizing | Ad-hoc cost discussions |
| 2 — Walk | Tagged resources, dashboards | Scheduled optimization | Regular cost reviews |
| 3 — Run | Real-time visibility, anomaly alerts | Automated discounts, right-sizing | Continuous governance |
| 4 — Fly | Unit economics, forecasting | AI-driven optimization | Culture of cost awareness |
