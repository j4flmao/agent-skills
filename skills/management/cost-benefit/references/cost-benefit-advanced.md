# Cost Benefit Advanced Topics

## Introduction
Advanced cost-benefit analysis covers sensitivity and scenario analysis, Monte Carlo simulation, real options valuation, cost allocation models, and integrating CBA into organizational decision-making.

## Sensitivity and Scenario Analysis

### One-Way Sensitivity Analysis
Vary one input at a time to see impact on NPV or ROI. Creates a tornado chart showing which variables have most influence.

**Process**:
1. Identify key uncertain variables (cost, revenue, discount rate, timeline)
2. Define range for each (optimistic, pessimistic)
3. Recalculate NPV for each variable at extremes
4. Rank variables by impact on outcome

**Example tornado chart**:
```
Variable                    NPV Range ($M)
Revenue growth              ████████████████░░░░░░  2.5 - 8.2
Implementation cost        ██████████░░░░░░░░░░░░  3.5 - 6.8
Discount rate              ████████░░░░░░░░░░░░░░  4.0 - 6.2
Timeline (months)          ██████░░░░░░░░░░░░░░░░  4.5 - 5.8
```

Focus risk management on top 2-3 variables.

### Scenario Analysis
Define discrete scenarios with consistent assumptions across all variables:

**Best case**: optimistic assumptions (high revenue, low cost, fast timeline)
**Base case**: most likely assumptions (P50)
**Worst case**: pessimistic assumptions (low revenue, high cost, slow timeline)

For each scenario, calculate NPV, ROI, payback period, and break-even point. Present as ranges, not single points.

**Decision rules**:
- If worst case NPV > 0: low risk, proceed
- If base case NPV > 0 but worst case < 0: proceed with risk mitigation
- If base case NPV < 0: reconsider or restructure
- If all scenarios negative: do not proceed

### Correlation in Multi-Variable Analysis
Variables are often correlated (e.g., higher revenue usually means higher costs). Ignoring correlation overstates both upside and downside.

**Approach**:
- Identify correlated variables (revenue and cost, timeline and cost)
- Define correlation coefficient (-1 to 1)
- Apply correlated sampling in Monte Carlo
- Document correlation assumptions

## Monte Carlo Simulation

### When to Use Monte Carlo
- NPV depends on multiple uncertain variables
- Variables have non-normal distributions
- Need probability distribution of outcomes (not just single point)
- Decision involves significant investment (> $1M)
- Stakeholders demand probabilistic analysis

### Simulation Process
1. **Define variables**: identify all uncertain inputs with distributions (triangular, normal, lognormal, uniform)
2. **Define correlations**: specify relationships between variables
3. **Run simulation**: 10,000 iterations, each sampling from distributions
4. **Analyze results**: distribution of NPV, ROI, payback, etc.

### Interpreting Monte Carlo Results

**NPV distribution**:
```
NPV Range       | Probability | Decision
NPV < -$500K    | 10%         | Worst case
-$500K < NPV < $1M | 25%     | Lower range
$1M < NPV < $3M | 40%        | Most likely (P50)
$3M < NPV < $5M | 20%        | Upper range
NPV > $5M       | 5%         | Best case

Probability of positive NPV: 85%
```

**Decision criteria**:
- P(NPV > 0) > 80%: strong confidence, proceed
- P(NPV > 0) 60-80%: proceed with risk mitigation
- P(NPV > 0) 40-60%: uncertain, gather more data
- P(NPV > 0) < 40%: reconsider or restructure

### Common Monte Carlo Mistakes
- Using normal distributions for values that can't be negative (cost, duration)
- Ignoring variable correlations (overstates risk and return)
- Too few iterations (< 1,000)
- Input distributions don't match real data
- Overfitting to limited historical data

## Real Options Valuation

### When NPV Isn't Enough
NPV assumes "invest now or never." Real options recognize that decisions can be staged, delayed, or abandoned.

**Types of real options**:
- **Option to defer**: wait before investing (learn more, see market evolve)
- **Option to stage**: invest in phases, decide on next phase based on results
- **Option to expand**: increase investment if initial results are positive
- **Option to contract**: scale down if underperforming
- **Option to abandon**: exit and recover salvage value
- **Option to switch**: change inputs or outputs based on conditions

### Staged Investment Analysis
Instead of a single go/no-go decision, structure as sequential decisions:

**Phase 1 — Discovery** ($100K): market research, prototype, feasibility study
- If positive → proceed to Phase 2
- If negative → abandon (loss = $100K)

**Phase 2 — Development** ($500K): build MVP, beta test
- If positive → proceed to Phase 3
- If negative → abandon (loss = $600K total)

**Phase 3 — Scale** ($2M): full launch, marketing, sales
- If positive → continue operations
- If negative → salvage what possible

**Value of staging**: total committed investment is lower. Early abandonment limits losses. Each phase resolves uncertainty before next commitment.

### Decision Tree for Staged Investment

```
Phase 1 ($100K)
├── 60% positive → Phase 2 ($500K)
│   ├── 70% positive → Phase 3 ($2M)
│   │   ├── 80% success → NPV $10M
│   │   └── 20% failure → loss $200K salvage
│   └── 30% negative → abandon (loss $600K)
└── 40% negative → abandon (loss $100K)

Expected value = 0.6 × [0.7 × (0.8 × 10M + 0.2 × -0.2M) + 0.3 × -0.6M] + 0.4 × -0.1M
               = $2.9M vs simple NPV (one phase) would be different
```

## Cost Allocation Models

### Direct vs Indirect Cost Allocation

**Direct costs**: traced directly to a project or product (labor, materials, licenses).

**Indirect costs**: shared across multiple projects (overhead, shared infrastructure, management).

Allocation methods:
- **Proportional by headcount**: indirect costs split by team size
- **Proportional by revenue**: allocation based on project revenue share
- **Activity-based costing**: allocate based on actual usage of shared resources
- **Equal split**: simplest, least accurate

### Total Cost of Ownership (TCO)

Complete cost picture across full lifecycle:

**Acquisition**: purchase price, initial setup, migration, training
**Operation**: hosting, licensing, support, personnel, energy
**Maintenance**: updates, patches, upgrades, bug fixes
**Decommissioning**: data migration, disposal, contract termination

TCO calculation example (3-year SaaS tool):
```
Year 1: $100K (licensing) + $50K (setup) + $20K (training) = $170K
Year 2: $100K (licensing) + $10K (support) = $110K
Year 3: $100K (licensing) + $10K (support) = $110K
Total: $390K
Include decommissioning: $10K (data export, contract end)
TCO: $400K
```

### Unit Economics

Measure cost per unit of value delivered:

**SaaS example**:
- Customer Acquisition Cost (CAC): $500
- Monthly Recurring Revenue (MRR) per customer: $100
- Gross Margin: 80%
- Customer Lifetime Value (LTV): $2,400 (24 months × $100)
- LTV/CAC ratio: 4.8 (> 3.0 is healthy)

Use unit economics to compare investment options on per-unit basis, not just absolute numbers.

## Integrating CBA into Decision-Making

### CBA Governance

For consistent, comparable analyses across the organization:

**Standards**:
- Standard discount rate defined by finance (e.g., 12%)
- Standard time horizon (e.g., 3 years for tech, 5 years for infrastructure)
- Required analysis depth by investment size
- Template for CBA documentation
- Review board for investments > $500K

**Gate review process**:
- < $50K: light analysis, single approver
- $50K - $500K: full CBA with sensitivity, team approval
- $500K - $5M: full CBA + Monte Carlo, executive approval
- > $5M: full analysis + board review, multiple scenario analysis

### Post-Investment Review

Compare actuals vs projections:
- Did costs match estimates? (variance analysis)
- Did benefits materialize as predicted?
- What assumptions were wrong?
- What would we do differently?
- Feed lessons into future CBA models

Review at 6, 12, and 24 months post-investment. Use results to calibrate future estimates.

## Key Points
- Sensitivity analysis reveals which variables drive outcome — focus risk management there
- Scenario analysis (best/base/worst) provides range of possible outcomes
- Monte Carlo simulation converts uncertain inputs into probability distribution of outcomes
- P(NPV > 0) > 80% is strong confidence threshold
- Real options value the ability to stage, defer, or abandon investments
- Staged investment limits downside while preserving upside
- TCO includes acquisition, operation, maintenance, and decommissioning
- Unit economics (LTV/CAC) enable per-unit comparison of alternatives
- Governance ensures consistent CBA methodology across organization
- Post-investment review closes the feedback loop — compare actuals to projections
