# Benefit Analysis

## Overview
Benefits must be quantified in monetary terms to compare against costs. This reference covers benefit types, quantification methods, NPV, payback period, and sensitivity analysis.

## Benefit Types

### Efficiency Gains (most common)
Hours saved per week × loaded labor rate × 52 weeks. Example: automation saves 20h/week for a senior engineer ($100/h loaded) = $104,000/year.

### Revenue Impact
- New feature adoption: estimated users × conversion rate × revenue per user
- Time-to-market reduction: launching 3 months earlier at $50k/month projected revenue = $150k benefit
- Upsell/cross-sell: improved platform enables 5% upsell on $2M existing revenue = $100k

### Risk Reduction
- Avoided incidents: incident frequency × average incident cost (labor + revenue loss)
- Compliance: penalty avoidance (GDPR: €20M or 4% revenue, PCI: $500k/month)
- SLA breach: reduced breach probability × contract penalty value

### Intangible Benefits (document separately)
- Team capability building
- Strategic positioning
- Brand perception
- Employee satisfaction and retention

## Financial Metrics

### Net Present Value (NPV)
NPV = Σ(Benefit_t - Cost_t) / (1 + r)^t for t = 0 to n years

- r = discount rate (WACC or opportunity cost of capital, default 10%)
- Positive NPV = investment adds value
- Higher NPV = better investment

### ROI
ROI = (Total Benefits - Total Costs) / Total Costs × 100%

- Simple payback measure
- Higher is better, but does not account for time value of money

### Payback Period
Time (years) when cumulative net benefit equals zero

- Shorter is better — faster return of invested capital
- Risk increases with payback length

## Sensitivity Analysis
Test key variables at ±10%, ±20%, ±30%:

| Variable | -30% | -20% | -10% | Base | +10% | +20% | +30% |
|---|---|---|---|---|---|---|---|
| Adoption rate | NPV | NPV | NPV | NPV | NPV | NPV | NPV |
| Labor cost | ... | ... | ... | ... | ... | ... | ... |
| Timeline | ... | ... | ... | ... | ... | ... | ... |

Flag the variable with steepest slope — that is the risk to watch.

## Key Points
- Monetize everything possible — if it cannot be monetized, it is an assumption
- Sensitivity analysis is mandatory — point estimates are virtually always wrong
- Conservative estimates preferred — overpromised benefits erode trust
- Intangible benefits support a decision but should not tip a negative NPV to positive
- Payback period should be less than the expected technology lifecycle (3-5 years typically)
