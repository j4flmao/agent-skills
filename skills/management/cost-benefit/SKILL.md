---
name: cost-benefit
description: >
  Use this skill when the user says 'cost-benefit analysis', 'ROI', 'TCO', 'cost analysis', 'business case', 'financial analysis', 'break-even', 'payback period', 'NPV', 'cost justification', or needs financial evaluation of technology decisions. Covers: ROI calculation, TCO modeling, break-even analysis, cost comparison, and business case creation. Do NOT use for: budget planning, procurement, or resource allocation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [management, cost-benefit, phase-7]
---

# Cost-Benefit Analysis

## Purpose
Evaluate technology investments through ROI, TCO, break-even, and NPV analysis to support data-driven decision-making. Covers financial modeling, sensitivity analysis, strategic alignment, and stakeholder communication.

## Framework and Methodology

### Analysis Framework
The cost-benefit methodology follows five phases:

```
Phase 1: Scope definition
  - Define investment boundaries.
  - Identify alternatives (including do-nothing).
  - Set time horizon (1, 3, 5 years).

Phase 2: Cost identification
  - One-time costs (licensing, migration, setup).
  - Recurring costs (infrastructure, personnel, maintenance).
  - Hidden costs (training, opportunity cost, transition overhead).

Phase 3: Benefit quantification
  - Direct savings (cost reduction, headcount reallocation).
  - Revenue benefits (new capability, faster time-to-market).
  - Risk reduction benefits (compliance, security, reliability).

Phase 4: Financial calculation
  - ROI, NPV, TCO, break-even, payback period.
  - Discounted cash flow for multi-year analysis.
  - Sensitivity analysis across scenarios.

Phase 5: Decision and communication
  - Recommendation with confidence level.
  - Strategic alignment assessment.
  - Risk and mitigation documentation.
```

### Key Financial Metrics

```
ROI (Return on Investment):
  ROI = (Total Benefit - Total Cost) / Total Cost x 100
  Positive ROI means value > cost.

TCO (Total Cost of Ownership):
  Sum of all costs over the investment lifetime.
  Includes acquisition, operation, maintenance, and disposal.

NPV (Net Present Value):
  NPV = sum(C_t / (1 + r)^t) - C_0
  C_t = net cash flow at time t, r = discount rate, t = time period
  Positive NPV = value-creating investment.

Payback Period:
  Time until cumulative benefits equal cumulative costs.
  Shorter payback = lower risk. Typically 12-24 months for technology.

Break-Even Point:
  The volume or time at which total revenue equals total cost.
```

### Decision Tree: Financial Method Selection

```
What type of decision is being made?
  ├── Simple cost comparison (buy vs buy)
  │   └── TCO — total cost over lifetime, simplest comparison
  ├── Investment with measurable benefits
  │   ├── Time horizon < 1 year
  │   │   └── ROI + Payback Period — quick comparison
  │   └── Time horizon > 1 year
  │       └── NPV + IRR — accounts for time value of money
  ├── Build vs buy decision
  │   └── TCO + Opportunity Cost + Time-to-Market
  ├── Volume-dependent decision (pricing, capacity)
  │   └── Break-Even Analysis — find the volume where costs equal revenue
  ├── Risk assessment of investment
  │   └── Sensitivity Analysis + Monte Carlo — test multiple scenarios
  └── Strategic decision with hard-to-quantify benefits
      └── Multi-Criteria Analysis + Cost-Effectiveness
```

### Build vs Buy Decision Framework

```
Can a commercial solution meet the requirements?
  ├── Yes, fully
  │   └── Is the TCO of buying less than building?
  │       ├── Yes → Buy (SaaS or license)
  │       └── No → Build
  ├── Yes, with customization
  │   └── Is customization cost < 50% of build cost?
  │       ├── Yes → Buy + customize
  │       └── No → Build
  └── No, not available
      └── Build
        └── Is this part of core business differentiation?
            ├── Yes → Build with internal team
            └── No → Consider outsourcing or partnership
```

### Discounting and Present Value

```
Why discount?
  A dollar today is worth more than a dollar tomorrow.
  Discount rate reflects cost of capital and risk.

Typical discount rates:
  Low-risk project (infrastructure upgrade): 8-10%
  Moderate risk (new product feature): 12-15%
  High risk (new market entry): 18-25%

Example:
  Year 1 benefit: $100,000 | Discount rate: 12%
  Present value: $100,000 / (1.12 ^ 1) = $89,286
  Year 2 benefit: $100,000 | Present value: $79,719
```

## Agent Protocol

### Trigger
"cost-benefit analysis", "ROI", "TCO", "cost analysis",
"business case", "NPV", "payback period", "break-even",
"cost justification", "financial analysis", "make vs buy",
"build vs buy".

### Input Context
- Investment categories (licensing, infrastructure, engineering hours, training)
- Expected benefits (cost savings, revenue increase, efficiency gains, risk reduction)
- Time horizon for analysis (1 year, 3 years, 5 years)
- Current costs for baseline comparison
- Strategic value (non-financial benefits)

### Output Artifact
Cost-benefit analysis with TCO model, ROI calculation, break-even timeline, and sensitivity analysis.

### Response Format
- Cost table with one-time and recurring categories
- Benefit table with quantification methodology
- ROI calculation: (total benefit - total cost) / total cost x 100
- Break-even point: month or year when cumulative benefits exceed cumulative costs
- Sensitivity analysis: best case, expected case, worst case
- No preamble. No postamble. No explanations.

### Completion Criteria
- All cost categories identified and quantified
- All benefit categories mapped to measurable outcomes
- ROI, TCO, NPV, and break-even calculated
- Sensitivity analysis with at least 3 scenarios
- Non-financial factors documented

### Max Response Length
150 lines

## Workflow

### Step 1: Define Scope
Identify the decision to be made and alternatives. Set time horizon appropriate for investment type. Determine discount rate based on company cost of capital.

### Step 2: Identify and Quantify Costs
List all cost categories. Separate one-time from recurring. Estimate engineering hours at loaded cost rate. Include training, migration, and transition costs.

### Step 3: Identify and Quantify Benefits
Map each benefit to a measurable outcome. Use conservative estimates for benefit quantification. Separate hard savings (cost reduction) from soft savings (efficiency).

### Step 4: Calculate Financial Metrics
Build cash flow projection for each year. Calculate ROI, NPV, payback period, and break-even. Compare against company investment thresholds.

### Step 5: Perform Sensitivity Analysis
Model best case, expected case, worst case scenarios. Identify which variables have most impact on outcome. Document assumptions and confidence levels.

### Step 6: Document Strategic Factors
Assess alignment with company strategy and OKRs. Identify non-financial benefits and risks. Provide recommendation with rationale.

### Step 7: Present to Stakeholders
Structure findings for the audience. Highlight key numbers and tradeoffs. Include risk mitigation recommendations.

### Step 8: Monte Carlo Simulation (Advanced)
For high-stakes decisions, run Monte Carlo simulation: define probability distributions for each input variable (costs, benefits, timeline), run 10,000+ iterations, analyze output distribution for NPV/ROI, calculate probability of positive return, identify key drivers through sensitivity analysis. Use tools like @RISK, Crystal Ball, or Python (numpy).

### Step 9: Intangible Benefit Valuation
For benefits that are hard to monetize: use shadow pricing (estimate what the benefit would cost to purchase), use willingness-to-pay surveys, apply industry benchmarks for similar benefits, document assumptions transparently. If quantification is too speculative, include as a qualitative factor in the multi-criteria analysis.

### Step 10: Post-Decision Audit
Track actual costs and benefits after implementation. Compare against projections at 6, 12, and 24 months. Document variance reasons. Use learnings to improve future estimates. Update the business case with actual data for ongoing governance.

## Common Pitfalls

1. **Ignoring do-nothing baseline**: Always compare against current state.
2. **Overly optimistic benefits**: Assume everything goes perfectly. Use conservative estimates.
3. **Ignoring ongoing costs**: Hardware is one-time; power, cooling, staff are recurring.
4. **Wrong time horizon**: Too short captures setup costs but not benefits; too long inflates benefits.
5. **Double-counting benefits**: Same benefit appearing in multiple categories.
6. **Confirmation bias**: Selecting data that supports the preferred outcome.
7. **Ignoring opportunity cost**: What else could the money and people be doing?
8. **Sunk cost fallacy**: Past spending should not influence current decisions.
9. **Forgetting inflation**: Multi-year analysis should account for cost inflation.
10. **No sensitivity analysis**: Single-point estimates hide risk.
11. **Ignoring risk-adjusted returns**: Two investments with same ROI may have very different risk profiles.
12. **Treating soft savings as hard savings**: Efficiency gains may not translate to actual cost reduction.

## Best Practices

- Use loaded cost rates (salary + benefits + overhead + tooling)
- Apply a discount rate of at least 10% for technology investments
- Model three scenarios: pessimistic, expected, optimistic
- Include intangible benefits explicitly (even if hard to quantify)
- Document all assumptions clearly
- Review with finance team before finalizing
- Update analysis as new information becomes available
- Use NPV for multi-year projects, ROI for quick comparisons
- Keep analysis proportional to investment size
- Follow up after decision: compare actual vs projected
- Use Monte Carlo for high-stakes decisions
- Separate hard savings from soft savings in benefit calculations

## Compared With

| Method | Best For | Weakness |
|---|---|---|
| ROI | Simple comparisons | Ignores time value of money |
| NPV | Long-term investments | Requires discount rate |
| TCO | Ownership cost comparison | Doesn't measure benefits |
| Payback period | Risk assessment | Ignores post-payback value |
| Break-even | Volume-dependent decisions | Limited to cost recovery |
| Cost-effectiveness | Hard-to-monetize benefits | Doesn't show financial return |
| Multi-criteria analysis | Strategic decisions | Subjective weight selection |
| Monte Carlo | High-uncertainty decisions | Complex setup |

## Templates and Tools

### Cost Table Template
```
Category           | One-time | Year 1 | Year 2 | Year 3 | Total
Licensing          | $XX,XXX  | $X,XXX | $X,XXX | $X,XXX | $XX,XXX
Engineering        | $XX,XXX  | $X,XXX | $X,XXX | $X,XXX | $XX,XXX
Infrastructure     | $XX,XXX  | $X,XXX | $X,XXX | $X,XXX | $XX,XXX
Training           | $X,XXX   | $0     | $0     | $0     | $X,XXX
Transition         | $X,XXX   | $0     | $0     | $0     | $X,XXX
Total              | $XX,XXX  | $X,XXX | $X,XXX | $X,XXX | $XX,XXX
```

### Benefit Table Template
```
Benefit            | Year 1  | Year 2  | Year 3  | Total  | Methodology
Cost reduction     | $X,XXX  | $X,XXX  | $X,XXX  | $X,XXX | 20% fewer hours
Revenue increase   | $X,XXX  | $X,XXX  | $X,XXX  | $X,XXX | 5% conversion lift
Efficiency gain    | $X,XXX  | $X,XXX  | $X,XXX  | $X,XXX | 10% team throughput
Risk reduction     | $X,XXX  | $X,XXX  | $X,XXX  | $X,XXX | Avoid 1 breach/yr
Total              | $XX,XXX | $XX,XXX | $XX,XXX | $XX,XXX
```

### Sensitivity Analysis Template
```
Scenario      | Benefit | Cost  | ROI    | NPV         | Payback
Optimistic    | $400K   | $200K | 100%   | $150K       | 12 months
Expected      | $300K   | $200K | 50%    | $75K        | 18 months
Pessimistic   | $200K   | $200K | 0%     | -$25K       | 36 months
```

### Build vs Buy Scorecard
```
Factor              | Weight | Build Score | Buy Score
Unique capability   | 30%    | 5           | 2
Time to market      | 25%    | 2           | 4
TCO (3-year)        | 20%    | 3           | 4
Customization       | 15%    | 5           | 3
Vendor lock-in risk | 10%    | 4           | 2
Total               | 100%   | 3.8         | 3.0
```

## Rules
- All costs use loaded labor rates (salary + 30% overhead minimum)
- Benefits use conservative estimates (80% of projected)
- Time horizon matches investment lifespan, typically 3-5 years
- Discount rate applied for multi-year NPV calculation
- Sensitivity analysis tests at least 3 scenarios
- Alternative comparison includes do-nothing baseline
- Non-financial factors documented separately
- Assumptions explicitly stated in analysis
- ROI calculated on total investment, not marginal
- Break-even point expressed in months or years
- Sunk costs excluded from forward-looking analysis
- Analysis reviewed by finance before finalization
- Results presented with confidence intervals, not single numbers
- Follow-up review conducted 6-12 months post-decision
- Separate hard savings from soft savings
- Risk-adjusted return preferred over single-point ROI

## TCO Calculation Template — Technology Investment

```
## Total Cost of Ownership — {Project Name}
Time Horizon: {3-5 years} | Discount Rate: {n}%

### Direct Costs
| Category | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Total |
|----------|--------|--------|--------|--------|--------|-------|
| Software licenses | $ | $ | $ | $ | $ | $ |
| Hardware/infrastructure | $ | $ | $ | $ | $ | $ |
| Implementation | $ | $ | $ | $ | $ | $ |
| Integration | $ | $ | $ | $ | $ | $ |
| Training | $ | $ | $ | $ | $ | $ |
| **Direct Total** | $ | $ | $ | $ | $ | $ |

### Indirect Costs
| Category | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Total |
|----------|--------|--------|--------|--------|--------|-------|
| Internal staffing | $ | $ | $ | $ | $ | $ |
| Maintenance & support | $ | $ | $ | $ | $ | $ |
| Downtime/transition | $ | $ | $ | $ | $ | $ |
| Opportunity cost | $ | $ | $ | $ | $ | $ |
| **Indirect Total** | $ | $ | $ | $ | $ | $ |

### Total Cost: sum of Direct + Indirect
### Discounted Total (NPV): PV of all cash flows at discount rate
```

## ROI Calculation Template

```
## Return on Investment — {Project Name}
Time Horizon: {3-5 years}

### Investment (denominator)
Initial investment: {total upfront costs}
Ongoing investment (discounted): {NPV of ongoing costs}
Total Investment: $X

### Returns (numerator)
Cost savings:
  - Labor efficiency: {hours saved x hourly rate} per year
  - Infrastructure savings: {difference vs. current solution}
  - Process improvement: {reduction in cycle time x cost per unit}

Revenue impact:
  - Additional revenue: {estimated from increased capability}
  - Customer retention: {reduced churn x LTV x impacted customers}
  - Time-to-market improvement: {faster delivery x revenue per unit time}

Total Annual Return (Year 1): $Y1
Total Annual Return (Year 2): $Y2
Total Annual Return (Year 3): $Y3

### ROI Calculation
Simple ROI: (Total Returns - Total Investment) / Total Investment x 100%
Discounted ROI: (NPV of Returns - NPV of Investment) / NPV of Investment x 100%
Break-even: {X months} (when cumulative returns = total investment)
```

## Sensitivity Analysis Template

```
## Sensitivity Analysis — {Project Name}
Base Case Scenario: {most likely assumptions}

### Variable Ranges
| Variable | Pessimistic | Base Case | Optimistic |
|----------|-------------|-----------|------------|
| Implementation cost | +30% | Budgeted | -10% |
| Adoption rate | 40% | 65% | 85% |
| Efficiency gain | 10% | 25% | 40% |
| Maintenance cost/year | +25% | Budgeted | -10% |
| Revenue impact | 50% of base | Base | 150% of base |

### Scenario Results
| Metric | Pessimistic | Base Case | Optimistic |
|--------|-------------|-----------|------------|
| Total Investment | $ | $ | $ |
| 3-Year Returns | $ | $ | $ |
| ROI | X% | Y% | Z% |
| Break-even | {n} months | {n} months | {n} months |
| NPV at {n}% discount | $ | $ | $ |

### Key Sensitivity Drivers
1. {Variable with highest impact on outcome} — {magnitude of effect}
2. {Second most sensitive variable} — {magnitude of effect}
3. {Third most sensitive variable} — {magnitude of effect}

### Conclusion
The analysis is MOST sensitive to changes in {key variable}.
At {pessimistic value}, ROI drops to {X}% but remains positive/negative.
The investment is robust/sensitive to scenario variations.
Recommended confidence level for go decision: {Low | Medium | High}
```

## Scenario Modeling — Decision Tree

```
Investment Decision
├── Do Nothing (baseline)
│   ├── Cost: $0
│   ├── Current cost continues: ${n}/year
│   └── Outcome: No improvement, risk of falling behind
│
├── Buy Commercial Solution
│   ├── Upfront: ${n}
│   ├── Annual: ${n}
│   ├── P(success): 80% to ROI = {X%}
│   ├── P(failure): 20% to ROI = {-Y%}
│   └── Weighted ROI: calculation
│
├── Build In-House
│   ├── Upfront: ${n (higher than buy)}
│   ├── Annual: ${n (lower than buy)}
│   ├── P(success): 60% to ROI = {X%}
│   ├── P(failure): 40% to ROI = {-Y%}
│   └── Weighted ROI: calculation
│
└── Hybrid (buy + customize)
    ├── Upfront: ${mid}
    ├── Annual: ${mid}
    ├── P(success): 75% to ROI = {X%}
    ├── P(failure): 25% to ROI = {-Y%}
    └── Weighted ROI: calculation

Recommendation: {decision with rationale}
```

## Non-Financial Factors Assessment Template

```
## Qualitative Assessment — {Project Name}

| Factor | Rating (1-5) | Weight | Weighted Score | Notes |
|--------|-------------|--------|---------------|-------|
| Strategic alignment | /5 | x 0.20 | | |
| Competitive advantage | /5 | x 0.15 | | |
| Technical feasibility | /5 | x 0.15 | | |
| Organizational readiness | /5 | x 0.10 | | |
| Regulatory compliance | /5 | x 0.10 | | |
| User satisfaction impact | /5 | x 0.10 | | |
| Team morale/retention | /5 | x 0.10 | | |
| Long-term flexibility | /5 | x 0.10 | | |
| **Total** | | **1.0** | | |

Threshold: >= 3.5 = proceed, 2.5-3.5 = conditional, < 2.5 = reconsider

### Risk-Adjusted Recommendation
- NPV of base scenario: ${n}
- NPV weighted by scenario probabilities: ${n}
- Qualitative score: {n}/5
- **Final recommendation:** {Go | No-go | Conditional}
```

## Cost-Benefit Analysis — Full Template

```
## Cost-Benefit Analysis — {Decision Title}
Date: {date} | Prepared by: {name}

### Executive Summary
One-paragraph summary of the decision, key financials, and recommendation.

### Options Analyzed
1. {Option A} — {brief description}
2. {Option B} — {brief description}
3. Do nothing — {current state baseline}

### Quantitative Analysis
| Line Item | Option A | Option B | Do Nothing |
|-----------|----------|----------|------------|
| Initial investment | $ | $ | $0 |
| Annual operating cost | $ | $ | $ |
| Total 3-year cost | $ | $ | $ |
| Annual benefit year 1 | $ | $ | $0 |
| Annual benefit year 2 | $ | $ | $0 |
| Annual benefit year 3 | $ | $ | $0 |
| Total 3-year benefit | $ | $ | $0 |
| Net benefit (3-year) | $ | $ | $0 |
| ROI | % | % | --- |
| Break-even | {n} months | {n} months | --- |
| NPV (3yr @ {n}% discount) | $ | $ | $0 |

### Sensitivity Analysis
- Best case NPV: ${A} vs ${B}
- Base case NPV: ${A} vs ${B}
- Worst case NPV: ${A} vs ${B}
- Key driver: {variable}

### Non-Financial Assessment
- Strategic alignment: Option {x} is better because {reason}
- Risk profile: Option {x} has {higher/lower} risk because {reason}
- Implementation complexity: Option {x} is {simpler/more complex}

### Recommendation
**Recommended Option:** {Option X}
**Rationale:** {2-3 sentence justification}
**Risk mitigation:** {actions before proceeding}
**Approval required:** {role or level}
```

## References
  - references/cba-methodology.md — CBA Methodology
  - references/cost-benefit-advanced.md — Cost Benefit Advanced Topics
  - references/cost-benefit-fundamentals.md — Cost Benefit Fundamentals
  - references/roi-framework.md — ROI Framework
  - references/tco-calculation.md — TCO Calculation
  - references/tco-modeling.md — TCO Modeling Across Scenarios
  - references/cost-benefit-analysis-methods.md — Cost-Benefit Analysis Methods
  - references/cost-benefit-presentation-stakeholder.md — Stakeholder Presentation

## Handoff
`risk-management` for cost-related risk assessment.
`stakeholder` for business case presentation.
