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
  windsurf: true
tags: [management, cost-benefit, phase-7]
---

# Cost-Benefit Analysis

## Purpose
Evaluate technology investments through ROI, TCO, break-even, and NPV analysis to support data-driven decision-making.

## Agent Protocol

### Trigger
"cost-benefit analysis", "ROI", "TCO", "cost analysis", "business case", "NPV", "payback period", "break-even", "cost justification", "financial analysis", "make vs buy", "build vs buy".

### Input Context
- Investment categories (licensing, infrastructure, engineering hours, training, migration)
- Expected benefits (cost savings, revenue increase, efficiency gains, risk reduction)
- Time horizon for analysis (1 year, 3 years, 5 years)
- Current costs for baseline comparison
- Strategic value (non-financial benefits)

### Output Artifact
Cost-benefit analysis with TCO model, ROI calculation, break-even timeline, and sensitivity analysis.

### Response Format
- Cost table with one-time and recurring categories
- Benefit table with quantification methodology
- ROI calculation: (total benefit - total cost) / total cost × 100
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

## References
- `references/tco-calculation.md` — Total Cost of Ownership modeling
- `references/roi-framework.md` — ROI calculation, break-even, NPV, sensitivity analysis
- `references/cba-methodology.md` — CBA methodology: NPV, IRR, payback period, sensitivity analysis, break-even analysis, cost classification
- `references/tco-modeling.md` — TCO modeling across scenarios: on-prem vs cloud, build vs buy, labor costs, migration costs
- `references/roi-frameworks.md` — ROI frameworks: 3-5 year projections, tangible vs intangible benefits, risk-adjusted ROI, real options

## Handoff
`risk-management` for cost-related risk assessment.
`stakeholder` for business case presentation.
