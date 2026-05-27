---
name: planning-cost-benefit
description: >
  Use this skill when the user says 'cost-benefit analysis', 'ROI', 'TCO', 'cost estimation', 'benefit estimation', 'business case', 'investment analysis', 'build vs buy', 'net present value', 'payback period', 'sensitivity analysis'. This skill enforces: comprehensive cost estimation covering build vs buy, TCO components (labor, infrastructure, maintenance, training, migration), benefit quantification across efficiency gains, revenue impact, and risk reduction, ROI and NPV calculation with discount rates, sensitivity analysis for key variables, and structured business case presentation. Do NOT use for: market analysis, pricing strategy, or financial accounting.
version: "1.0.0"
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

## Rules
- All costs and benefits must be in monetary terms — use loaded labor rates (salary × 1.3-1.5)
- Discount rate must be documented and justified — never omit it
- Sensitivity analysis must test at least 3 variables — single-point estimates are insufficient
- Build vs buy comparison must include ongoing maintenance for build option
- Benefits without a clear quantification methodology are assumptions, not estimates
- Intangible benefits must be noted separately, not folded into numeric estimates
- Do-nothing baseline must be documented — "no investment" is a valid scenario

## References
  - references/benefit-analysis.md — Benefit Analysis
  - references/cba-templates.md — CBA Templates
  - references/cost-benefit-advanced.md — Cost Benefit Advanced Topics
  - references/cost-benefit-fundamentals.md — Cost Benefit Fundamentals
  - references/cost-estimation.md — Cost Estimation
  - references/portfolio-prioritization.md — Portfolio Prioritization
  - references/project-valuation.md — Project Valuation
## Handoff
`planning/create-pitch-deck` for business case presentation with ROI and NPV highlights
`planning/create-adr` for recording the investment decision with rationale
