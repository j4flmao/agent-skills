# ROI Framework

## ROI Formula

```
ROI (%) = (Net Benefit / Total Cost) × 100

Where:
  Net Benefit = Total Benefits - Total Costs
  Total Costs = One-time costs + Recurring costs over period
```

### Example
```
Total Cost (3 years): $492,000
Total Benefits (3 years): $800,000
Net Benefit: $308,000
ROI: ($308,000 / $492,000) × 100 = 62.6%
```

## Net Present Value (NPV)

```
NPV = Σ(Cash Flow_t / (1 + r)^t) for t = 0 to N years

Where:
  r = discount rate (typically 8-15% for tech investments)
  t = year
  Cash Flow_t = Benefits_t - Costs_t for year t
```

Positive NPV means the investment adds value. Compare multiple options by NPV.

## Payback Period

The time (months or years) until cumulative benefits exceed cumulative costs.

```
Payback Period = Year when Cumulative Net Cash Flow turns positive
```

| Year | Costs | Benefits | Net Cash Flow | Cumulative |
|------|-------|----------|---------------|------------|
| 0 | $210,000 | $0 | -$210,000 | -$210,000 |
| 1 | $90,000 | $150,000 | +$60,000 | -$150,000 |
| 2 | $94,000 | $300,000 | +$206,000 | +$56,000 |
| 3 | $98,000 | $350,000 | +$252,000 | +$308,000 |

Payback occurs in year 2.

## Benefit Categories

| Category | Examples | Quantification Method |
|----------|----------|----------------------|
| Cost savings | Reduced infrastructure, licensing, support | Compare current vs projected spend |
| Productivity | Reduced engineering time for tasks | Hours saved × hourly rate |
| Revenue increase | New features, faster time-to-market | Projected incremental revenue |
| Risk reduction | Avoided incidents, compliance fines | Probability × cost of event |
| Efficiency | Automated manual processes | Hours saved × hourly rate |
| Quality | Reduced defects, faster resolution | Cost of quality metrics |

## Sensitivity Analysis

Run three scenarios to account for uncertainty:

| Scenario | Cost Variance | Benefit Variance | ROI |
|----------|--------------|-----------------|-----|
| Best case | -10% | +20% | 95% |
| Expected | Baseline | Baseline | 62% |
| Worst case | +20% | -30% | 15% |

## Non-Financial Factors

| Factor | Impact | Weight |
|--------|--------|--------|
| Strategic alignment | Supports company OKRs | Must-have |
| Competitive advantage | Enables new capabilities | High |
| Team morale | Reduces toil, increases satisfaction | Medium |
| Technical debt | Reduces future maintenance cost | Medium |
| Security posture | Reduces risk surface | High |
| Compliance | Enables regulatory requirements | Must-have |

## Decision Matrix

Combine financial and non-financial factors:

| Option | ROI | NPV | Payback | Strategic Fit | Risk | Decision |
|--------|-----|-----|---------|---------------|------|----------|
| Build in-house | 45% | $200K | 2.5 yr | High | Medium | Proceed |
| Buy SaaS | 85% | $400K | 1.5 yr | Medium | Low | Prefer |
| Open source | 120% | $550K | 1 yr | High | Low | Recommend |

## ROI Rules

- Always use 3-year horizon for technology investments
- Include team cost (salary + overhead) at fully loaded rate (1.3-1.5× base salary)
- Benefits should be conservative — overestimating benefits is the most common error
- Sensitivity analysis is mandatory — one-scenario ROI is not a business case
- Non-financial factors can override financial analysis at strategic inflection points
- Recalculate ROI quarterly after investment is made — track actual vs projected
- Payback under 2 years is strong; under 1 year is exceptional
- Any investment with payback > 4 years requires executive-level approval
