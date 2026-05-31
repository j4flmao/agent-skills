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
Evaluate technology investments through ROI, TCO, break-even, and NPV analysis
to support data-driven decision-making. Covers financial modeling, sensitivity
analysis, strategic alignment, and stakeholder communication.

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
  Compare across alternatives to prioritize.

TCO (Total Cost of Ownership):
  Sum of all costs over the investment lifetime.
  Includes acquisition, operation, maintenance, and disposal.
  Essential for comparing build vs buy vs SaaS.

NPV (Net Present Value):
  NPV = sum(C_t / (1 + r)^t) - C_0
  C_t = net cash flow at time t
  r = discount rate (usually WACC or 10-15%)
  t = time period
  Positive NPV = value-creating investment.

Payback Period:
  Time until cumulative benefits equal cumulative costs.
  Shorter payback = lower risk.
  Typically 12-24 months for technology investments.

Break-Even Point:
  The volume or time at which total revenue equals total cost.
  Used for pricing decisions and capacity planning.
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
  Year 1 benefit: $100,000
  Discount rate: 12%
  Present value: $100,000 / (1.12 ^ 1) = $89,286
  Year 2 benefit: $100,000
  Present value: $100,000 / (1.12 ^ 2) = $79,719
```

## Agent Protocol

### Trigger
"cost-benefit analysis", "ROI", "TCO", "cost analysis",
"business case", "NPV", "payback period", "break-even",
"cost justification", "financial analysis", "make vs buy",
"build vs buy".

### Input Context
- Investment categories (licensing, infrastructure, engineering hours, training, migration)
- Expected benefits (cost savings, revenue increase, efficiency gains, risk reduction)
- Time horizon for analysis (1 year, 3 years, 5 years)
- Current costs for baseline comparison
- Strategic value (non-financial benefits)

### Output Artifact
Cost-benefit analysis with TCO model, ROI calculation, break-even timeline,
and sensitivity analysis.

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
Identify the decision to be made and alternatives.
Set time horizon appropriate for investment type.
Determine discount rate based on company cost of capital.

### Step 2: Identify and Quantify Costs
List all cost categories. Separate one-time from recurring.
Estimate engineering hours at loaded cost rate.
Include training, migration, and transition costs.

### Step 3: Identify and Quantify Benefits
Map each benefit to a measurable outcome.
Use conservative estimates for benefit quantification.
Separate hard savings (cost reduction) from soft savings (efficiency).

### Step 4: Calculate Financial Metrics
Build cash flow projection for each year.
Calculate ROI, NPV, payback period, and break-even.
Compare against company investment thresholds.

### Step 5: Perform Sensitivity Analysis
Model best case, expected case, worst case scenarios.
Identify which variables have most impact on outcome.
Document assumptions and confidence levels.

### Step 6: Document Strategic Factors
Assess alignment with company strategy and OKRs.
Identify non-financial benefits and risks.
Provide recommendation with rationale.

### Step 7: Present to Stakeholders
Structure findings for the audience.
Highlight key numbers and tradeoffs.
Include risk mitigation recommendations.

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

## Best Practices

- Use loaded cost rates (salary + benefits + overhead + tooling).
- Apply a discount rate of at least 10% for technology investments.
- Model three scenarios: pessimistic, expected, optimistic.
- Include intangible benefits explicitly (even if hard to quantify).
- Document all assumptions clearly.
- Review with finance team before finalizing.
- Update analysis as new information becomes available.
- Use NPV for multi-year projects, ROI for quick comparisons.
- Keep analysis proportional to investment size.
- Follow up after decision: compare actual vs projected.

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

## Templates and Tools

### Cost Table Template
```
Category           | One-time | Year 1 | Year 2 | Year 3 | Total
Licensing          | $XX,XXX  | $X,XXX | $X,XXX | $X,XXX | $XX,XXX
Engineering        | $XX,XXX  | $X,XXX | $X,XXX | $X,XXX | $XX,XXX
Infrastructure     | $XX,XXX  | $X,XXX | $X,XXX | $X,XXX | $XX,XXX
Training           | $X,XXX   | $0     | $0     | $0     | $X,XXX
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

## Rules
- All costs use loaded labor rates (salary + 30% overhead minimum).
- Benefits use conservative estimates (80% of projected).
- Time horizon matches investment lifespan, typically 3-5 years.
- Discount rate applied for multi-year NPV calculation.
- Sensitivity analysis tests at least 3 scenarios.
- Alternative comparison includes do-nothing baseline.
- Non-financial factors documented separately.
- Assumptions explicitly stated in analysis.
- ROI calculated on total investment, not marginal.
- Break-even point expressed in months or years.
- Sunk costs excluded from forward-looking analysis.
- Analysis reviewed by finance before finalization.
- Results presented with confidence intervals, not single numbers.
- Follow-up review conducted 6-12 months post-decision.

## References
  - references/cba-methodology.md -- CBA Methodology
  - references/cost-benefit-advanced.md -- Cost Benefit Advanced Topics
  - references/cost-benefit-fundamentals.md -- Cost Benefit Fundamentals
  - references/roi-framework.md -- ROI Framework
  - references/roi-frameworks.md -- ROI Frameworks
  - references/tco-calculation.md -- TCO Calculation
  - references/tco-modeling.md -- TCO Modeling Across Scenarios
  - references/cost-benefit-analysis-methods.md -- Cost-Benefit Analysis Methods
  - references/cost-benefit-presentation-stakeholder.md -- Stakeholder Presentation

## Handoff
`risk-management` for cost-related risk assessment.
`stakeholder` for business case presentation.
