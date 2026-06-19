---
name: planning-cost-benefit
description: >
  Use this skill when the user says 'cost-benefit analysis', 'ROI', 'TCO', 'cost estimation', 'benefit estimation', 'business case', 'investment analysis', 'build vs buy', 'net present value', 'payback period', 'sensitivity analysis'. This skill enforces: comprehensive cost estimation covering build vs buy, TCO components (labor, infrastructure, maintenance, training, migration), benefit quantification across efficiency gains, revenue impact, and risk reduction, ROI and NPV calculation with discount rates, sensitivity analysis for key variables, and structured business case presentation. Do NOT use for: market analysis, pricing strategy, or financial accounting.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, analysis, phase-10]
---

# Cost-Benefit Analysis

## Purpose
Produce a defensible cost-benefit analysis quantifying investment costs, expected benefits, ROI, NPV, payback period, and sensitivity ranges to support data-driven business case decisions.

## Agent Protocol

### Trigger
"cost-benefit analysis", "ROI", "TCO", "cost estimation", "benefit estimation", "business case", "investment analysis", "build vs buy", "net present value", "NPV", "payback period", "sensitivity analysis", "cost breakdown", "ROI calculation", "investment decision".

### Input Context
- Project description and scope (what is being invested in)
- Time horizon for analysis (1 year, 3 years, 5 years)
- Build vs buy options being considered
- Team composition and labor rates (internal vs contractor)
- Infrastructure requirements (cloud, hardware, licenses)
- Expected efficiency gains (hours saved, throughput increase)
- Revenue projections if applicable
- Discount rate (default 10% or company-specific)
- Existing systems and migration considerations

### Output Artifact
Cost-benefit analysis document with detailed cost breakdown, benefit quantification, ROI/NPV/payback period calculations, sensitivity analysis, and a recommendation.

### Response Format
```
Cost-Benefit: {project-name}
Time Horizon: {years}
Option: {build/buy/hybrid}
Total Cost: ${amount} ({year-1}, {year-2}, ...)
Total Benefit: ${amount} ({year-1}, {year-2}, ...)
Net Benefit: ${amount}
ROI: {percentage}
NPV (@{discount}%): ${amount}
Payback Period: {years}
Sensitivity: ±{range}% ({variable})
Recommendation: {proceed/reject/conditional}
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Costs broken into categories (labor, infrastructure, licenses, training, migration, maintenance)
- [ ] Benefits quantified in monetary terms (productivity, revenue, risk reduction, compliance)
- [ ] ROI and NPV calculated over the specified time horizon
- [ ] Payback period determined
- [ ] Sensitivity analysis on 3+ key variables
- [ ] Build vs buy comparison if applicable
- [ ] Recommendation with rationale

### Max Response Length
400 lines

## Decision Trees

### Build vs Buy Decision Tree
```
Does the core functionality differentiate your business?
  |-- YES --> Build (you need control and competitive advantage)
  |-- NO --> Is there a mature commercial or open-source option?
        |-- YES --> Buy (lower risk, faster time-to-market)
        |-- NO --> Does the functionality require deep integration?
              |-- YES --> Build with integration framework
              |-- NO --> Evaluate COTS/vendor options

Is the expected lifespan > 5 years?
  |-- YES --> Build (TCO of build amortizes better long-term)
  |-- NO --> Buy (shorter horizon favors subscription)
```

### Analysis Depth Decision
```
What is the investment size?
  |-- < $50K --> Quick CBA (1-page, 3 key assumptions)
  |-- $50K-$500K --> Standard CBA (full categories, sensitivity)
  |-- > $500K --> Deep CBA (Monte Carlo simulation, multi-scenario)
```

## Workflow

### Step 1: Define Scope and Time Horizon
Set the analysis boundaries: what is included, what is excluded, and the time horizon (typically 3-5 years). Identify the decision options (build, buy, hybrid, do nothing).

### Step 2: Estimate Costs
Build costs: labor (dev, QA, PM, DevOps), infrastructure (dev/staging/prod), tools and licenses, training, migration, ongoing maintenance (20% of build cost annually). Buy costs: subscription or license fees, implementation services, customization, integration, training, ongoing support fees.

### Step 3: Quantify Benefits
Efficiency: hours saved × loaded labor rate. Revenue: new feature impact, conversion improvement, time-to-market reduction. Risk reduction: avoided incident costs, compliance penalty avoidance, SLA breach prevention. Intangible: team capability building, strategic positioning.

### Step 4: Calculate ROI and NPV
ROI = (Total Benefits - Total Costs) / Total Costs × 100%. NPV = Σ(Benefit_t - Cost_t) / (1 + r)^t over time horizon. Payback period = time to cumulative net benefit > 0. Use discount rate r (default 10%, adjust for risk).

### Step 5: Sensitivity Analysis
Identify 3-5 key variables with highest uncertainty (adoption rate, labor cost, timeline). Vary each ±20% and recalculate NPV. Present as a table or spider chart. Flag scenarios where NPV turns negative.

### Step 6: Make Recommendation
Proceed: positive NPV, strong ROI, acceptable payback period. Reject: negative NPV in all scenarios. Conditional: proceed if certain conditions met (e.g., adoption rate > X%).

## Cost Categories

### Build Option
| Category | Components | Annual Cost (Y1) | Annual Cost (Y2+) |
|----------|-----------|-------------------|--------------------|
| Labor | Dev, QA, PM, DevOps, Design | Headcount × loaded rate | +X% escalation |
| Infrastructure | Cloud (dev/staging/prod), CI/CD | Monthly × 12 | Scales with usage |
| Tools | IDE licenses, project mgmt, monitoring | Per-seat × team | Per-seat × team |
| Training | Onboarding, certifications | One-time | Reduced yearly |
| Migration | Data migration, integration | One-time | — |
| Maintenance | Bug fixes, updates, support | — | 20% of build cost |

### Buy Option
| Category | Components | Annual Cost |
|----------|-----------|-------------|
| Subscription | Per-user or per-entity pricing | Monthly/Annual fee |
| Implementation | Vendor consulting, configuration | One-time |
| Customization | Custom features, integrations | One-time + annual maint |
| Training | Vendor training, certification | One-time + refresh |
| Support | Vendor support tier | Included or add-on |
| Exit | Data export, migration away | If applicable |

## Benefit Quantification Methods

### Efficiency Gains
```
Current time per task: 2 hours
Tasks per week: 50
New time per task: 0.5 hours (75% reduction)
Weekly savings: 50 × 1.5 = 75 hours
Annual savings: 75 × 52 = 3,900 hours
Monetary value: 3,900 × $75/hr (loaded rate) = $292,500/year
```

### Revenue Impact
```
Current conversion rate: 2.5%
Expected conversion rate: 3.5% (1% improvement)
Monthly visitors: 100,000
Current monthly conversions: 2,500
Expected monthly conversions: 3,500
Additional monthly revenue: 1,000 × $50 AOV = $50,000
Annual revenue impact: $600,000
```

### Risk Reduction
```
Current incident frequency: 12/year
Average incident cost: $25,000 (downtime + recovery)
Expected reduction: 75%
Annual savings: 12 × $25,000 × 75% = $225,000
Compliance penalty avoidance: $100,000/year
Total risk reduction: $325,000/year
```

## Financial Models

### Monte Carlo Simulation
Replace single-point estimates with probability distributions for each variable. Simulate 10,000+ scenarios to understand the range of possible outcomes.

```
Variable               | Distribution  | P10  | P50  | P90
Adoption rate          | Triangular    | 30%  | 50%  | 70%
Development cost       | Triangular    | $400K| $500K| $700K
Time to market (months)| Triangular    | 6    | 9    | 14
Annual maintenance     | Triangular    | $80K | $100K| $150K
Revenue per user/month | Uniform       | $15  | $20  | $30

Run 10,000 simulations:
  NPV > $0: 72% probability
  NPV > $500K: 45% probability
  NPV < $0: 28% probability (downside risk)
  P50 NPV: $380K
  P10 NPV: -$120K
  P90 NPV: $890K

Decision: Proceed if risk tolerance accepts 28% chance of negative NPV.
```

### Real Options Analysis
Treat investment as a series of options, not a single go/no-go decision. Stage investments to limit downside while preserving upside.

| Option | Description | Value | Cost |
|--------|-------------|-------|------|
| Defer | Wait for more information before committing | Reduces uncertainty | May miss first-mover advantage |
| Stage | Invest incrementally with go/no-go at each stage | Limits downside, preserves upside | Longer total timeline |
| Abandon | Option to exit investment | Saves remaining costs | Lost sunk investment |
| Scale | Option to increase investment if successful | Captures upside | Additional capital commitment |
| Switch | Option to pivot to alternative use | Preserves value of partial investment | May not fully capture original opportunity |

### Break-Even Analysis
Calculate how long until the investment pays for itself. Break-even point = fixed costs / (revenue per unit - variable cost per unit). For internal projects: break-even point = total investment / annual net benefit.

| Metric | Year 0 | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|--------|
| Investment | -$500K | -$100K | -$100K | -$100K |
| Net benefits | $0 | $250K | $400K | $600K |
| Cumulative | -$500K | -$350K | -$50K | $450K |
| Break-even: 2.1 years | | | | |

For subscription products: break-even months = initial CAC / monthly gross margin per customer. If CAC = $500 and monthly margin = $50, break-even = 10 months. Target break-even <12 months for healthy unit economics.

**Staged investment example:**
```
Phase 1: MVP build ($150K, 3 months)
  → If adoption >30%, proceed to Phase 2
Phase 2: Core platform ($250K, 4 months)
  → If retention >60%, proceed to Phase 3
Phase 3: Scale ($400K, 6 months)
  → Full rollout with marketing investment

Total at risk per phase is limited:
  Max loss: Phase 1 = $150K (not $800K)
  Expected value with options: higher than single-stage commitment
```

### Risk-Adjusted Return
Adjust return projections for key risks using probability-weighted scenarios:

```
Scenario      | Probability | NPV          | Weighted
Base case     | 50%         | $500K        | $250K
Optimistic    | 20%         | $1.2M        | $240K
Pessimistic   | 20%         | -$200K       | -$40K
Failure       | 10%         | -$500K       | -$50K

Expected NPV: $400K
NPV at risk (5th percentile): -$350K
NPV at upside (95th percentile): $1.1M
Return risk ratio: Expected NPV / |NPV at risk| = 1.14
```

### NPV Calculation
```
NPV = Σ (Bt - Ct) / (1 + r)^t

Where:
  Bt = Benefits in year t
  Ct = Costs in year t
  r = Discount rate
  t = Year (1 to n)

Example:
  Year 0: -$500,000 (initial investment)
  Year 1: $200,000 / (1.10)^1 = $181,818
  Year 2: $350,000 / (1.10)^2 = $289,256
  Year 3: $500,000 / (1.10)^3 = $375,657
  NPV = -$500,000 + $181,818 + $289,256 + $375,657 = $346,731
```

### Payback Period
```
Cumulative Year 0: -$500,000
Cumulative Year 1: -$500,000 + $200,000 = -$300,000
Cumulative Year 2: -$300,000 + $350,000 = -$50,000
Cumulative Year 3: -$50,000 + $500,000 = $450,000
Payback: 2 years + ($50,000 / $500,000) = 2.1 years
```

## Sensitivity Analysis Template

| Variable | Base Case | -20% | -10% | +10% | +20% |
|----------|-----------|------|------|------|------|
| Adoption rate | $346K NPV | $180K | $263K | $430K | $514K |
| Labor cost | $346K NPV | $420K | $383K | $309K | $272K |
| Timeline (delay) | $346K NPV | $310K | $328K | $364K | $382K |

## Common Anti-Patterns

### 1. Optimism Bias
Underestimating costs and overestimating benefits systematically. Mitigation: use reference class forecasting. Compare with similar projects in your organization. Apply a 20-30% contingency factor.

### 2. Hidden Costs
Ignoring ongoing costs: training new hires, vendor lock-in exit costs, compliance audits, opportunity cost of team allocation. Mitigation: use a comprehensive cost checklist.

### 3. Double Counting
Counting the same benefit in multiple categories. Example: counting "increased productivity" and "headcount reduction" separately when they represent the same outcome. Mitigation: ensure benefit categories are mutually exclusive.

### 4. Single-Point Estimates
Using one number for each variable without ranges. Creates false precision. Mitigation: use three-point estimates (optimistic, most likely, pessimistic) for every variable.

### 5. Ignoring Do-Nothing Baseline
Not documenting what happens if the investment is not made. Existing costs continue, competitors may gain advantage, compliance risks persist. Mitigation: always include a do-nothing scenario.

### 6. Wrong Time Horizon
Using too short a horizon (missing long-term benefits) or too long (speculative). Mitigation: match horizon to project lifecycle. 3-5 years for most IT projects. 5-10 years for infrastructure.

### 7. Vanity ROI
Inflating ROI by using unrealistic discount rates or excluding certain costs. Mitigation: document all assumptions. Use standard discount rate. External review of the analysis.

## Success Metrics

| Metric | Target |
|--------|--------|
| NPV | > $0 (positive) |
| ROI | > 100% (double the investment) |
| Payback period | < 3 years |
| Sensitivity range | NPV positive across ±20% of key variables |
| Build vs buy delta | Clear cost or benefit advantage >20% |

## Rules
- All costs and benefits must be in monetary terms — use loaded labor rates (salary × 1.3-1.5)
- Discount rate must be documented and justified — never omit it
- Sensitivity analysis must test at least 3 variables — single-point estimates are insufficient
- Build vs buy comparison must include ongoing maintenance for build option
- Benefits without a clear quantification methodology are assumptions, not estimates
- Intangible benefits must be noted separately, not folded into numeric estimates
- Do-nothing baseline must be documented — "no investment" is a valid scenario

## Expanded Decision Trees

### Sensitivity Analysis Method Decision Tree
```
How many uncertain variables do you have?
  |-- 1-3 variables --> One-at-a-time sensitivity (tornado chart)
  |-- 4-10 variables --> Scenario analysis (optimistic/base/pessimistic)
  |-- >10 variables --> Monte Carlo simulation with probability distributions

What is the investment size?
  |-- <$50K --> Simple what-if on 3 key variables
  |-- $50K-$500K --> Tornado chart + scenario analysis
  |-- >$500K --> Full Monte Carlo with probability distributions

What is stakeholder risk tolerance?
  |-- Risk-averse --> Include worst-case scenario + probability of negative NPV
  |-- Risk-neutral --> Base case + sensitivity range
  |-- Risk-seeking --> Focus on upside scenarios
```

### Cost Allocation Decision Tree
```
Can costs be directly attributed to this project?
  |-- YES --> Direct cost (labor, licenses, infrastructure)
  |-- NO --> Is the cost shared across multiple projects?
        |-- YES --> Allocate proportionally (by usage, headcount, or revenue)
        |-- NO --> Is this an overhead cost?
              |-- YES --> Exclude from project CBA or note separately
              |-- NO --> Include as indirect cost with allocation basis

Is this a sunk cost?
  |-- YES --> Exclude from forward-looking CBA decision
  |-- NO --> Include in cost estimate
```

### Investment Appraisal Method Decision Tree
```
What is the primary decision criterion?
  |-- Profitability --> Use ROI (simple) or IRR (time-adjusted)
  |-- Value creation --> Use NPV
  |-- Payback speed --> Use Payback Period or Discounted Payback
  |-- Risk-adjusted return --> Use Risk-Adjusted NPV or Monte Carlo

Does the investment have uncertain timing of returns?
  |-- YES --> Use NPV with sensitivity analysis
  |-- NO --> Simple ROI may suffice

Are there multiple investment options competing?
  |-- YES --> Use NPV ranking + Payback Period for tie-breaker
  |-- NO --> Use ROI with payback threshold
```

## Templates

### Business Case Executive Summary Template
```
# Business Case: {Project Name}

## Recommendation
{Proceed / Reject / Conditional on {condition}}

## Investment Summary
| Item | Value |
|------|-------|
| Total Investment | ${amount} |
| Time Horizon | {years} |
| Net Benefit (5yr) | ${amount} |
| ROI | {percentage} |
| NPV (@ {discount}%) | ${amount} |
| Payback Period | {years} |
| Risk-Adjusted NPV | ${amount} |

## Key Assumptions
1. {assumption} — {sensitivity impact if wrong}
2. {assumption} — {sensitivity impact if wrong}
3. {assumption} — {sensitivity impact if wrong}

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {risk} | {H/M/L} | {H/M/L} | {mitigation} |

## Decision Required By
{date} — {consequence of delay}
```

### Stakeholder Communication Template
```
# CBA Review: {Project Name}

## Audience
{executive / investment committee / team}

## Key Message
{the one thing they need to know}

## What We're Asking
{approval / feedback / decision}

## Supporting Data (1 page)
- Cost breakdown summary
- Benefit quantification highlights
- Sensitivity ranges
- Risk assessment
- Recommendation

## Appendix
- Full cost breakdown
- Full benefit analysis
- Sensitivity analysis details
- References and methodology
```

### CBA Presentation Structure (5 slides)
```
Slide 1: Title + Recommendation (30 seconds)
Slide 2: The Problem & Solution (60 seconds)
  - What we're investing in and why
  - Baseline (do nothing) scenario
Slide 3: The Numbers (90 seconds)
  - Cost breakdown (build vs buy if applicable)
  - Benefit quantification
  - ROI, NPV, Payback
Slide 4: Risk & Sensitivity (60 seconds)
  - Key risk factors
  - Sensitivity range (tornado chart)
  - Worst/base/optimistic scenarios
Slide 5: Decision & Next Steps (30 seconds)
  - Clear recommendation
  - Conditions/triggers
  - Timeline for decision
```

## Expanded Financial Models

### Discounted Payback Period
Unlike simple payback, discounted payback accounts for the time value of money. Calculate the cumulative discounted cash flow and find when it turns positive.

```
Year 0: -$500,000 (discounted: -$500,000)
Year 1: $200,000 / 1.10 = $181,818 (cumulative: -$318,182)
Year 2: $350,000 / 1.10^2 = $289,256 (cumulative: -$28,926)
Year 3: $500,000 / 1.10^3 = $375,657 (cumulative: $346,731)

Discounted payback: 2 + ($28,926 / $375,657) = 2.08 years
```

### Internal Rate of Return (IRR)
IRR is the discount rate that makes NPV = 0. It represents the effective return rate of the investment. Compare IRR against the company's cost of capital (WACC) or hurdle rate.

```
Investment: -$500,000
Cash flows: $200K (Y1), $350K (Y2), $500K (Y3)
IRR: Find r where NPV = 0
  0 = -500K + 200K/(1+r) + 350K/(1+r)^2 + 500K/(1+r)^3
  IRR ≈ 38%

Decision rule: IRR > WACC → Proceed (38% > 10% → Proceed)
```

### Profitability Index (PI)
PI = NPV / Initial Investment. Measures value created per dollar invested. Useful for comparing projects of different sizes.

```
Project A: NPV = $346K, Investment = $500K, PI = 0.69
Project B: NPV = $200K, Investment = $200K, PI = 1.00
Project B creates more value per dollar invested despite lower absolute NPV.
Capital-constrained: rank by PI, select highest first.
```

### Tornado Chart Construction
Rank variables by impact on NPV. The variable with the widest range is the most sensitive.

```
Variable            -20%    Base    +20%    Range
Adoption rate       $180K   $346K   $514K   $334K ← Most sensitive
Labor cost          $420K   $346K   $272K   $148K
Timeline            $310K   $346K   $382K   $72K
Discount rate       $389K   $346K   $305K   $84K

Priority: Adoption rate needs the most accurate estimate.
```

## Expanded Anti-Patterns

### 8. Sunk Cost Fallacy
Including past spending in the forward-looking investment decision. "We've already spent $200K on this project, so we have to continue." The $200K is gone and irrelevant to the decision. Only future costs and benefits matter. Mitigation: clearly separate sunk costs from forward costs in the analysis. Make the decision based on incremental ROI.

### 9. Ignoring Opportunity Cost
Not accounting for what the team could be doing instead of this project. The opportunity cost of allocating 5 engineers to Project A is the value they would create on Project B. Mitigation: include team allocation as an explicit cost. Run a quick CBA on the next-best alternative use of resources.

### 10. Confirmation Bias in Assumptions
Selecting assumptions that support the desired outcome. "We assume 50% market adoption because we need it for a positive NPV." No basis in data. Mitigation: use reference class forecasting. Find analogous projects and their actual outcomes. Base assumptions on data, not targets.

### 11. Scope Creep in CBA
The CBA evaluates Option A (Minimal Viable) but the team builds Option B (Full Feature). Costs overrun and benefits don't match the analysis. Mitigation: clearly define scope boundaries in the CBA. If scope changes, re-run the analysis. Every scope assumption is a sensitivity variable.

### 12. Ignoring Implementation Risk
Assuming the project will be delivered on time and on budget. No contingency. No risk adjustment. Most large IT projects overrun by 20-50%. Mitigation: apply a contingency factor based on project complexity and team track record. Use three-point estimates (optimistic/most likely/pessimistic).

### 13. False Precision in Long-Term Projections
Showing 5-year projections with dollar precision when year 5 estimates are essentially guesses. Presents a false sense of accuracy. Mitigation: use ranges instead of single numbers. Show declining confidence bands over time. Year 1 should be precise, year 5 should show ±50% range.

## Expanded Success Metrics

| Metric | Target | Measurement | Remediation |
|--------|--------|-------------|-------------|
| NPV > $0 | Positive at target discount | Calculation verification | Reduce costs or increase scope |
| ROI | > 100% | Net benefit / total cost | Re-evaluate build vs buy |
| Payback period | < 3 years | Cumulative cash flow | Focus on quicker wins |
| Sensitivity pass | NPV positive at ±20% | Sensitivity table | Strengthen business case |
| Build vs buy delta | > 20% advantage | Compare TCO options | Re-evaluate both options |
| Assumption accuracy | Within 20% of actual 1yr | Post-implementation audit | Improve estimation process |
| Stakeholder confidence | > 80% agree with recommendation | Survey reviewers | Address concerns in analysis |

## CBA Quality Checklist
- [ ] All costs are in monetary terms with loaded labor rates
- [ ] Benefits are quantified with methodology stated
- [ ] Discount rate is documented with justification
- [ ] Sensitivity analysis covers 3+ key variables
- [ ] Build vs buy comparison included (if applicable)
- [ ] Do-nothing baseline documented
- [ ] Sunk costs excluded from forward-looking analysis
- [ ] Opportunity cost considered
- [ ] Intangible benefits noted separately
- [ ] Assumptions have data sources
- [ ] Three-point estimates used (not single points)
- [ ] Scope boundaries clearly defined
- [ ] Post-implementation review plan documented

## Business Case Quality Scoring
| Criterion | Weight | Score (1-5) | Weighted |
|-----------|--------|-------------|----------|
| Problem clarity | 15% | | |
| Data quality | 20% | | |
| Options analyzed | 15% | | |
| Quantification rigor | 20% | | |
| Risk assessment | 15% | | |
| Recommendation logic | 15% | | |

Threshold: > 4.0 — Proceed. 3.0-4.0 — Revise. < 3.0 — Reject.

## References
  - references/benefit-analysis.md — Benefit Analysis
  - references/cba-templates.md — CBA Templates
  - references/cost-estimation.md — Cost Estimation
  - references/portfolio-prioritization.md — Portfolio Prioritization
  - references/project-valuation.md — Project Valuation
  - references/cost-benefit-advanced.md — Cost Benefit Advanced Topics
  - references/cost-benefit-fundamentals.md — Cost Benefit Fundamentals
  - references/sensitivity-analysis.md — Sensitivity Analysis Guide
## Handoff
`planning/create-pitch-deck` for business case presentation with ROI and NPV highlights
`planning/create-adr` for recording the investment decision with rationale
