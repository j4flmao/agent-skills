# Cost-Benefit Analysis Advanced Topics

## Introduction
Advanced cost-benefit analysis covers complex valuation methods, multi-option comparisons, risk-adjusted analysis, Monte Carlo simulation, and presentation of CBA results for executive decision-making.

## Advanced Valuation Methods

### Real Options Valuation
For investments with significant uncertainty and flexibility (e.g., phased builds, pivots):
- Option to defer: wait before committing (value of waiting)
- Option to expand: invest more if successful
- Option to abandon: recover value if failing
- Option to switch: change technology or approach

Apply option valuation when NPV is near zero but significant flexibility exists.

### Adjusted Present Value (APV)
Separates the investment's value from financing effects:
```
APV = Base-case NPV + PV of financing side effects
```
Use APV when financing structure (debt vs equity) materially affects project value.

### Economic Value Added (EVA)
Meures true economic profit after accounting for cost of capital:
```
EVA = NOPAT - (Capital × WACC)
```
Use EVA for ongoing business unit performance, not project-level decisions.

### Cost-Benefit Ratio
```
BCR = PV of Benefits / PV of Costs
BCR > 1: Benefits exceed costs
BCR < 1: Costs exceed benefits
```
Complementary to NPV. Useful for comparing projects of different scales.

## Multi-Option Comparison

### Decision Matrix Template
```
| Option | Year 1 Cost | 5-Year Cost | NPV (10%) | Payback | Risk | Recommendation |
|--------|-------------|-------------|-----------|---------|------|---------------|
| Build  | $500K       | $1.1M       | $346K     | 2.1 yr  | Med  | Best if >5yr horizon |
| Buy    | $120K       | $600K       | $280K     | 1.5 yr  | Low  | Best for fast delivery |
| Hybrid | $300K       | $750K       | $410K     | 1.8 yr  | Low  | Best overall |
| Do nothing | $0     | $0          | -$500K*   | —       | High | Not recommended |
```
*Do nothing may have negative NPV due to continued losses from current inefficiency.

### Weighted Decision Criteria
| Criterion | Weight | Build | Buy | Hybrid |
|-----------|--------|-------|-----|--------|
| NPV | 25% | 8 | 6 | 9 |
| Time-to-market | 20% | 4 | 9 | 7 |
| Strategic control | 20% | 9 | 3 | 7 |
| Risk | 20% | 5 | 8 | 7 |
| Flexibility | 15% | 8 | 4 | 6 |
| **Weighted Score** | **100%** | **6.85** | **6.05** | **7.25** |

## Monte Carlo Simulation

### Setup
1. Identify all uncertain variables (10-20 typically)
2. Assign probability distributions to each:
   - Normal: for well-understood variables
   - Triangular: three-point estimates
   - Uniform: no clear distribution shape
3. Define correlation between variables (adoption × revenue are correlated)
4. Run 5,000-10,000 iterations

### Output Interpretation
```
Simulation Results (10,000 iterations):
  Mean NPV: $342,000
  Median NPV: $335,000
  Std Dev: $185,000
  P(NPV > 0): 87%
  P10: $95,000
  P90: $590,000
  Scenario with worst 5%: -$45,000
```

### Sensitivity Tornado Chart Output
```
Variable           | Impact on NPV ($K)
-------------------|-------------------
Adoption rate      | ████████████████  ±$180K
Labor cost         | ████████████      ±$110K
Timeline delay     | ████████          ±$75K
License cost       | ████              ±$35K
Discount rate      | ███               ±$25K
```

Focus risk mitigation on the top 2-3 variables.

## Risk-Adjusted CBA

### Risk Premium
Add a risk premium to the discount rate for high-uncertainty projects:
```
Base discount rate: 10%
Innovation premium: +5%
New market premium: +5%
Timeline risk premium: +3%
Adjusted discount rate: 18-23%
```

### Expected Value with Probabilities
```
Scenario        | Probability | NPV
Optimistic      | 20%         | $800K
Base case       | 60%         | $346K
Pessimistic     | 15%         | -$50K
Worst case      | 5%          | -$200K

Expected NPV = 0.20($800K) + 0.60($346K) + 0.15(-$50K) + 0.05(-$200K)
             = $160K + $207.6K - $7.5K - $10K = $350.1K
```

## Non-Financial Impact Assessment

### Balanced Scorecard Integration
| Perspective | Metric | Target | Measurement |
|-------------|--------|--------|-------------|
| Financial | NPV | >$300K | CBA calculation |
| Customer | NPS impact | +10 points | Survey before/after |
| Internal | Process cycle time | -30% | Process measurement |
| Learning | Team capability | Skills matrix | Annual assessment |

### Multi-Criteria Decision Analysis (MCDA)
For projects where financial return is not the only criterion:
```
| Criterion | Weight | Score (1-10) | Weighted |
|-----------|--------|-------------|----------|
| NPV | 30% | 8 | 2.4 |
| Strategic alignment | 25% | 9 | 2.25 |
| Risk level | 20% | 6 | 1.2 |
| Time-to-market | 15% | 7 | 1.05 |
| Team capability | 10% | 8 | 0.8 |
| **Total** | **100%** | | **7.7** |
```

## Presentation for Decision Makers

### Executive Summary Structure
```
1. Recommendation (1 sentence)
2. Key numbers: NPV, ROI, Payback
3. Critical assumptions
4. Risk factors
5. Recommended next steps
```

### One-Page CBA Format
| Section | Content |
|---------|---------|
| Title | Project name, date, analyst |
| Recommendation | Proceed/Reject/Conditional |
| Key Metrics | NPV: $X, ROI: X%, Payback: X years |
| Cost Summary | Year 1: $X, Total 5yr: $X |
| Benefit Summary | Year 1: $X, Total 5yr: $X |
| Assumptions | Top 5 assumptions listed |
| Sensitivity | Tornado chart |
| Risk | Key risks and mitigations |

### Decision Gate Questions
1. Is NPV positive in the base case?
2. Is NPV positive in the pessimistic case?
3. Does the investment align with strategic priorities?
4. Are the key assumptions realistic and documented?
5. Is the payback period within acceptable range?
6. Do we have the resources to execute?
7. What is the opportunity cost?

## Post-Implementation Review

### Benefits Realization Check
| Benefit | Expected | Actual | Variance | Root Cause |
|---------|----------|--------|----------|------------|
| Cost savings | $200K/yr | $180K/yr | -10% | Slower than expected adoption |
| Productivity | 3,900 hrs/yr | 3,200 hrs/yr | -18% | Less time saved per task |

### CBA Accuracy Tracking
Track CBA estimates vs actuals over time to calibrate future analyses:
- Cost estimate accuracy: actual / estimated (target: 0.8-1.2)
- Benefit estimate accuracy: actual / estimated (target: 0.7-1.3)
- Timeline accuracy: actual / estimated (target: 0.9-1.5)

## Key Points
- Monte Carlo simulation provides confidence ranges, not single-point NPV
- Risk-adjusted discount rates account for uncertainty
- Multi-criteria analysis captures non-financial factors
- Post-implementation review closes the loop and improves future estimates
- Sensitivity analysis tells you where to focus risk mitigation
- Real options valuation captures flexibility value
- Decision makers need a one-page summary, not a 50-page report
- Track estimate accuracy to improve future CBAs
- Consider strategic value alongside financial return
