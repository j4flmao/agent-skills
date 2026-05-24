# CBA Methodology

## Overview
Cost-Benefit Analysis (CBA) is a systematic approach to evaluating the financial viability of projects, investments, or decisions by comparing total expected costs against total expected benefits.

## Net Present Value (NPV)

### Definition
NPV calculates the present value of future cash flows discounted by a rate that reflects the time value of money and risk.

### Formula
```
NPV = Σ (Ct / (1 + r)^t) for t = 0 to n

Where:
Ct = Net cash flow in period t (benefits - costs)
r  = Discount rate
t  = Time period (year)
n  = Number of periods
```

### Example Calculation
```
Investment: $100,000 today
Returns: $30,000/year for 5 years
Discount rate: 10%

Year 0: -$100,000
Year 1: $30,000 / 1.10^1 = $27,273
Year 2: $30,000 / 1.10^2 = $24,793
Year 3: $30,000 / 1.10^3 = $22,539
Year 4: $30,000 / 1.10^4 = $20,490
Year 5: $30,000 / 1.10^5 = $18,628

NPV = -$100,000 + $27,273 + $24,793 + $22,539 + $20,490 + $18,628
NPV = $13,723
```

### Decision Rule
- **NPV > 0**: Investment adds value — proceed
- **NPV = 0**: Investment breaks even — indifferent
- **NPV < 0**: Investment destroys value — reject
- **Multiple options**: Choose the one with the highest positive NPV

## Internal Rate of Return (IRR)

### Definition
The discount rate at which NPV equals zero. Represents the expected annual rate of return.

### Formula
```
0 = Σ (Ct / (1 + IRR)^t) for t = 0 to n
```

IRR cannot be solved analytically — use iterative methods or financial functions.

### Decision Rule
- **IRR > Cost of Capital**: Investment adds value
- **IRR = Cost of Capital**: Investment breaks even
- **IRR < Cost of Capital**: Investment destroys value
- **Multiple options**: Higher IRR is generally better (but consider scale)

### Limitations
- IRR assumes reinvestment at the same rate (often unrealistic)
- Can produce multiple IRRs for non-conventional cash flows
- Does not account for project scale (a $1k project with 50% IRR vs $1M with 20% IRR)

## Payback Period

### Definition
The time required for cumulative benefits to equal cumulative costs.

### Simple Payback
```
Payback = Initial Investment / Annual Net Benefit

Example: $100,000 investment, $30,000 annual benefit
Payback = $100,000 / $30,000 = 3.33 years
```

### Discounted Payback
Same as simple payback but using discounted cash flows. Accounts for time value of money.

### Decision Rule
- **Shorter payback is better** — faster return of invested capital
- **Target**: < 2 years for most tech investments
- **Acceptable**: 2-4 years for strategic investments
- **Requires approval**: > 4 years

### Payback Period Limitations
- Ignores cash flows after the payback period
- Does not account for time value of money (simple version)
- Favors short-term gains over long-term value

## Sensitivity Analysis

### What It Tests
How changes in key assumptions affect the outcome (NPV, IRR, payback).

### Key Variables to Test
1. **Adoption rate** (how many users/customers adopt)
2. **Labor cost** (development time, hourly rates)
3. **Timeline** (delays in delivery)
4. **Revenue impact** (conversion rate, price, volume)
5. **Discount rate** (cost of capital)
6. **Maintenance cost** (ongoing operational expense)

### Tornado Chart
```
Variable                Low (-20%)          Base          High (+20%)
Adoption Rate           NPV: $5K            |███████████| NPV: $45K
Labor Cost              NPV: $40K           |████        | NPV: -$10K
Timeline                NPV: $35K           |█████       | NPV: $5K
Discount Rate           NPV: $25K           |███████     | NPV: $15K
```

The variable with the widest bar has the most impact — that's the risk to manage.

### Scenario Analysis
```
| Scenario | Adoption | Timeline | NPV | IRR | Recommendation |
|----------|---------|----------|-----|-----|----------------|
| Best case | 80% | On time | $45K | 28% | Proceed |
| Expected | 60% | +2 months | $25K | 18% | Proceed |
| Worst case | 30% | +6 months | -$10K | 5% | Reconsider |
```

## Break-Even Analysis

### Definition
The point where total revenue equals total costs (in a revenue-generating context).

### Formula
```
Break-Even Point (units) = Fixed Costs / (Revenue per Unit - Variable Cost per Unit)

Break-Even Point ($) = Fixed Costs / Contribution Margin Ratio
```

### Example
```
Fixed Costs: $100,000 (development, setup)
Variable Cost per Unit: $5 (hosting, support)
Revenue per Unit: $20 (subscription)
Contribution Margin: $15/unit
Break-Even: 6,667 units or $133,333 in revenue
```

### Break-Even Timeline
```
| Month | Units Sold | Revenue | Variable Cost | Fixed Cost | Profit/Loss |
|-------|-----------|---------|--------------|------------|-------------|
| 1     | 200       | $4,000  | $1,000       | $100,000   | -$97,000    |
| 3     | 1,000     | $20,000 | $5,000       | $0         | -$85,000    |
| 6     | 4,000     | $80,000 | $20,000      | $0         | -$40,000    |
| 9     | 7,000     | $140,000| $35,000      | $0         | +$5,000     |
| 12    | 10,000    | $200,000| $50,000      | $0         | +$50,000    |
```

Break-even occurs in month 9.

## Cost Classification

### Direct vs Indirect Costs
| Cost Type | Definition | Example |
|-----------|------------|---------|
| Direct costs | Directly attributable to the project | Developer salaries, cloud infrastructure |
| Indirect costs | Shared across projects, allocated | Facilities, HR, IT support |

### Fixed vs Variable Costs
| Cost Type | Definition | Example |
|-----------|------------|---------|
| Fixed costs | Do not change with output level | Software licenses, base infrastructure |
| Variable costs | Change with output or usage | Cloud compute (per hour), transaction fees |

### Capital vs Operating Expenditure
| Cost Type | Definition | Accounting Treatment |
|-----------|------------|---------------------|
| CapEx | Long-term assets (depreciated over 3-5 years) | Balance sheet, depreciation on P&L |
| OpEx | Ongoing operational costs | P&L as incurred |

### Sunk Costs
Costs already incurred and cannot be recovered. Should not influence future decisions.

### Opportunity Costs
The value of the next best alternative foregone. Example: building a feature vs investing the same development time in other features.

## References
- Cost-Benefit Analysis: Concepts and Practice — Anthony Boardman et al.
- A Guide to Cost-Benefit Analysis — European Commission
- Project Management Institute: The Standard for Business Analysis — PMI
- Brealey & Myers: Principles of Corporate Finance
