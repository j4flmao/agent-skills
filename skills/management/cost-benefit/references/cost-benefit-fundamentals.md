# Cost Benefit Fundamentals

## Overview
Cost-benefit analysis evaluates whether the benefits of a decision, project, or investment outweigh its costs. This reference covers fundamental concepts, financial formulas, valuation techniques, and decision frameworks.

## Core Concepts

### Concept 1: What is Cost-Benefit Analysis?

A systematic approach to comparing the costs and benefits of a decision or investment.

**Purpose**: determine if a project is worthwhile, compare alternatives, justify investment, quantify value.

**Basic formula**: `Net Benefit = Total Benefits - Total Costs`

If net benefit > 0, the project has positive value. But net benefit alone doesn't tell the whole story — timing, risk, and alternatives matter.

### Concept 2: Types of Costs

**Direct costs**: directly attributable to the project.
- Labor (salaries, contractors)
- Materials (software licenses, hardware)
- Services (consulting, cloud infrastructure)
- Capital (equipment, facilities)

**Indirect costs**: shared across multiple projects.
- Overhead (facilities, management, HR)
- Shared infrastructure (data centers, tools)
- Training and onboarding

**Fixed costs**: don't change with output level. Licensing fees, equipment purchases.

**Variable costs**: change with output level. Cloud usage, transaction fees, support costs.

**Sunk costs**: already incurred and cannot be recovered. Should not influence forward-looking decisions (sunk cost fallacy).

**Opportunity costs**: value of the next best alternative foregone. Choosing Project A means not choosing Project B.

### Concept 3: Types of Benefits

**Tangible benefits**: directly measurable in monetary terms.
- Revenue increase or cost reduction
- Productivity improvement
- Reduced error rates
- Lower support costs
- Faster time-to-market

**Intangible benefits**: valuable but hard to quantify.
- Customer satisfaction and loyalty
- Brand reputation
- Employee morale and retention
- Strategic positioning
- Competitive advantage

Intangible benefits should be estimated and documented, even with uncertainty. "If it's worth doing, it's worth estimating."

### Concept 4: Time Value of Money

Money today is worth more than the same amount in the future because it can be invested and earn returns.

**Present Value (PV)**: `PV = FV / (1 + r)^n`
- FV: future value
- r: discount rate (cost of capital or hurdle rate)
- n: number of periods

**Net Present Value (NPV)**: `NPV = Σ (Cash Flow_t / (1 + r)^t) - Initial Investment`

NPV > 0 means the investment generates returns above the discount rate. Higher NPV is better among alternatives.

### Concept 5: Discount Rate and Hurdle Rate

**Discount rate**: the interest rate used to discount future cash flows. Represents the cost of capital and risk premium.

**Hurdle rate**: minimum acceptable rate of return for an investment. Usually = discount rate or company's weighted average cost of capital (WACC).

Higher risk projects get higher discount rates. Typical rates: 8-12% for stable projects, 15-25% for risky/innovative projects.

### Concept 6: Payback Period

Time required for cumulative benefits to equal cumulative costs.

**Simple payback**: `Initial Investment / Annual Net Cash Flow`

**Discounted payback**: accounts for time value of money. Longer than simple payback.

Shorter payback = lower risk. But payback ignores benefits after the break-even point. Use with NPV, not instead of it.

### Concept 7: Return on Investment (ROI)

**ROI = (Net Benefit / Total Cost) × 100%**

Example: Project costs $100K and generates $150K in benefits → ROI = 50%.

ROI is intuitive but can be misleading: doesn't account for time, risk, or scale. A 50% ROI on $100 is less valuable than 20% ROI on $1M.

### Concept 8: Break-Even Analysis

Determines the point where total revenue equals total costs.

**Break-even quantity** = `Fixed Costs / (Price per Unit - Variable Cost per Unit)`

Useful for comparing investment scales. A lower break-even point means less risk. But assumes linear relationships (constant price, costs).

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Quantify Everything | Estimate intangibles with ranges | High |
| Use Multiple Metrics | NPV + ROI + Payback = complete picture | High |
| Include Sensitivity | Vary assumptions, show range of outcomes | High |
| Document Assumptions | Every number needs a source or rationale | High |
| Compare Alternatives | CBA is meaningless without options | High |
| Update Over Time | Revisit as costs and benefits change | Medium |
| Avoid Sunk Cost Fallacy | Past spend shouldn't influence future decisions | High |

## Common Pitfalls

### Pitfall 1: Ignoring Intangible Benefits
Focusing only on hard financial numbers. Customer satisfaction, brand value, and strategic positioning are real benefits even if hard to quantify.
Fix: estimate intangibles with reasonable ranges. Document assumptions. Include qualitative assessment alongside quantitative.

### Pitfall 2: Over-Optimistic Projections
Assuming best-case scenarios for costs (low) and benefits (high). Projects rarely go exactly to plan.
Fix: use three-point estimates (optimistic, likely, pessimistic). Run sensitivity analysis. Add 15-20% contingency.

### Pitfall 3: Ignoring Ongoing Costs
Counting only implementation costs, ignoring maintenance, support, training, and decommissioning. Total Cost of Ownership (TCO) includes all phases.
Fix: TCO = acquisition + operation + maintenance + decommissioning. Map costs across full lifecycle.

### Pitfall 4: Sunk Cost Fallacy
Continuing a failing project because "we've already invested so much." Past costs are irrelevant to go/no-go decisions.
Fix: evaluate forward costs and benefits only. If future costs > future benefits, stop regardless of past investment.

### Pitfall 5: Wrong Discount Rate
Using too low a rate inflates NPV. Using too high a rate kills worthwhile projects. Corporate WACC may not reflect project risk.
Fix: adjust discount rate for project risk profile. Higher risk = higher rate. Document rationale.

### Pitfall 6: Single-Point Estimates
"NPV will be $500K." No range, no probability. Creates false precision and overconfidence.
Fix: provide ranges (P10, P50, P90). Use Monte Carlo for complex analyses. "NPV range: $300K-$700K with P50 of $500K."

## Tooling Ecosystem

### Analysis Tools
- Excel / Google Sheets: universal, flexible, ad-hoc
- Google Sheets: for accessible, collaborative analysis
- Tableau / Power BI: visualization of CBA scenarios
- Monte Carlo simulators: @RISK, Crystal Ball for probabilistic analysis
- Financial calculators: online NPV, IRR, payback calculators

### Decision Frameworks
- Cost-benefit analysis spreadsheet templates
- Weighted scoring models for multi-factor decisions
- Decision trees with expected value calculation
- Real options analysis for staged investments

## Key Points
- Net benefit > 0 means positive value, but doesn't tell the whole story
- NPV accounts for time value of money — use it for major investments
- ROI is intuitive but ignore time and risk — pair with NPV
- Payback period measures risk (short = less risk)
- TCO includes all costs across full lifecycle
- Intangible benefits matter — estimate them even with uncertainty
- Discount rate reflects risk — adjust for project context
- Avoid sunk cost fallacy — past spend is irrelevant
- Use ranges, not single points — sensitivity > precision
- Compare alternatives — CBA without options is incomplete
