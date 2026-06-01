# Cost-Benefit Analysis Fundamentals

## Overview
Cost-benefit analysis (CBA) is a systematic process for evaluating the financial viability of a project or investment. This reference covers the fundamental concepts, calculation methods, and best practices for producing defensible business cases.

## Core Concepts

### What is CBA?
CBA compares the total expected costs of an investment against its total expected benefits to determine whether the investment is worthwhile. It provides a numerical basis for decision-making and enables comparison across different investment options.

### Key Financial Metrics

#### Net Present Value (NPV)
The sum of all future cash flows (benefits minus costs), discounted to present value.
- NPV > 0: Investment adds value
- NPV = 0: Investment breaks even
- NPV < 0: Investment destroys value

Formula: `NPV = Σ (Bt - Ct) / (1 + r)^t` where r = discount rate, t = year

#### Return on Investment (ROI)
Percentage return relative to investment cost.
- Formula: `ROI = (Total Benefits - Total Costs) / Total Costs × 100%`
- Target: >100% (double the investment)

#### Payback Period
Time required for cumulative benefits to equal cumulative costs.
- Shorter is better
- Target: < 3 years for most IT projects
- Does not account for time value of money

#### Internal Rate of Return (IRR)
The discount rate that makes NPV = 0.
- Higher IRR = better investment
- Compare to company's cost of capital or hurdle rate
- IRR > discount rate = acceptable

## Cost Estimation

### Cost Categories
| Category | Build | Buy |
|----------|-------|-----|
| One-time | Development labor, infra setup, migration | License fees, implementation, customization |
| Recurring | Maintenance (20% of build/yr), hosting, team | Subscription, support renewal, hosting |
| People | Dev, QA, PM, DevOps (loaded rates) | Vendor team, internal PM |
| Infrastructure | Cloud services, CI/CD, monitoring | Included or add-on |
| Training | Team training, documentation | Vendor training, user training |
| Migration | Data migration, integration | Data migration, integration |

### Loaded Labor Rate Calculation
```
Annual salary: $120,000
Benefits (health, 401k, etc.): 25% = $30,000
Overhead (office, equipment, mgmt): 15% = $18,000
Total loaded cost: $120,000 + $30,000 + $18,000 = $168,000
Loaded hourly rate: $168,000 / 2,080 hours = $80.77/hr
```

### Three-Point Estimation
| Estimate | Definition | Weight |
|----------|------------|--------|
| Optimistic (O) | Everything goes right | 1 |
| Most Likely (M) | Normal conditions | 4 |
| Pessimistic (P) | Everything goes wrong | 1 |

PERT Expected = (O + 4M + P) / 6

## Benefit Quantification

### Benefit Categories
| Category | Description | Quantification Method | Example |
|----------|-------------|----------------------|---------|
| Cost reduction | Lower operating costs | Current cost - future cost | 40% reduction in cloud spend |
| Productivity gain | Same output, less time | Hours saved × loaded rate | 500 hrs/yr × $80/hr = $40K |
| Revenue increase | More sales, higher conversion | Additional units × unit margin | 1000 × $50 = $50K |
| Risk reduction | Avoided losses | Probability × impact | 5% × $1M = $50K |
| Compliance | Avoided penalties | Penalty amount | $100K annual penalty avoided |

### Hard vs Soft Benefits
| Hard Benefits | Soft Benefits |
|--------------|---------------|
| Measurable in dollars | Difficult to quantify |
| Direct cost savings | Improved employee satisfaction |
| Revenue increases | Better customer experience |
| Headcount reduction | Competitive advantage |
| Faster time-to-market | Strategic positioning |

Hard benefits go into the NPV calculation. Soft benefits are noted separately.

## Discount Rate Selection

| Investment Type | Typical Discount Rate | Rationale |
|-----------------|----------------------|-----------|
| Low-risk optimization | 5-8% | Proven technology, clear ROI |
| Standard IT project | 8-12% | Moderate uncertainty |
| High-risk innovation | 15-25% | New market, unproven technology |
| Company WACC | 7-10% | Weighted average cost of capital |

## Sensitivity Analysis

### One-Way Sensitivity
Vary one variable while holding others constant:
```
Variable        | -20%  | -10%  | Base  | +10%  | +20%
Adoption rate   | $120K | $230K | $346K | $462K | $578K
Labor cost      | $420K | $383K | $346K | $309K | $272K
```

### Scenario Analysis
Three scenarios with all variables adjusted simultaneously:
- **Optimistic**: high adoption, low costs, fast timeline
- **Base case**: expected values
- **Pessimistic**: low adoption, high costs, delays

### Monte Carlo Simulation
Run 1,000+ iterations with probability distributions for each variable. Output: probability distribution of NPV.
- P(NPV > 0): confidence in positive return
- P10, P50, P90: value at risk

## Build vs Buy Framework

### When to Build
| Factor | Build If... |
|--------|------------|
| Core differentiator | Functionality is your competitive advantage |
| Long lifespan | 5+ years of expected use |
| Deep integration | Requires tight coupling with existing systems |
| IP creation | You want to own the resulting intellectual property |
| Mature team | You have the right skills in-house |

### When to Buy
| Factor | Buy If... |
|--------|----------|
| Commodity function | Not a competitive differentiator |
| Short timeline | Need fast time-to-market |
| Limited team | Don't have the required skills |
| High risk | Mature vendor with proven track record |
| Low customization | Off-the-shelf meets most requirements |

### Build vs Buy Cost Comparison Table
```
| Cost Category | Build | Buy |
|--------------|-------|-----|
| Year 1       | $500K | $120K |
| Year 2       | $150K | $120K |
| Year 3       | $150K | $120K |
| Year 4       | $150K | $120K |
| Year 5       | $150K | $120K |
| Total 5yr    | $1.1M | $600K |
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Optimism bias | Underestimating costs, overestimating benefits | Use reference class forecasting, 20% contingency |
| Sunk cost fallacy | Including past spending in analysis | Only consider future costs and benefits |
| Hidden costs | Ignoring training, migration, exit costs | Use comprehensive cost checklist |
| Double counting | Counting same benefit multiple times | Ensure mutually exclusive categories |
| Single-point estimates | No ranges for variables | Use three-point estimates |
| Short horizon | Missing long-term benefits | Match horizon to project lifecycle |
| Ignoring do-nothing | No baseline comparison | Always include "do nothing" scenario |

## Key Points
- NPV > 0 is the primary decision criterion, not ROI
- Discount rate must be justified and documented
- Sensitivity analysis reveals which variables matter most
- Build vs buy is a financial AND strategic decision
- Loaded labor rates include benefits and overhead
- Hard benefits go in the financial model; soft benefits are noted separately
- Three-point estimates are more honest than single points
- Always include the do-nothing baseline scenario
