# PM Advanced Topics

## Introduction
Advanced project management covers adaptive and hybrid approaches, quantitative risk analysis, earned value management at depth, portfolio management, stakeholder negotiation, and organizational change management.

## Adaptive and Hybrid Approaches

### When to Use Hybrid

Not all projects fit pure predictive (Waterfall) or pure adaptive (Agile). Hybrid combines both:

**Use hybrid when**:
- Requirements are clear for some parts, uncertain for others
- Regulatory/compliance elements need upfront documentation
- Integration with existing systems has known specifications
- Innovation/exploration elements need iterative approach
- Team has mixed experience (some Waterfall, some Agile)

**Hybrid patterns**:
- Waterfall at program level, Agile at team level (SAFe-style)
- Predictive for planning and requirements, adaptive for delivery
- Agile development with milestone-based governance
- Fixed-price contract with variable scope (agile delivery)

### Hybrid Governance Model

**Stage gates** for funding and oversight:
```
Gate 1 — Feasibility → Gate 2 — Planning → Gate 3 — Execution (iterative) → Gate 4 — Close
  (charter)            (detailed plan)       (sprint cycles)                  (handoff)
```

Within each stage: iterative delivery, adaptive planning, continuous stakeholder feedback.

**Governance board reviews**: at gates. Reviews: business case still valid, budget on track, risks managed, benefits achievable. Within gates: team autonomous.

### Quantitative Risk Analysis

### Monte Carlo for Schedule

Process:
1. Identify all tasks with uncertain durations
2. Assign three-point estimates (optimistic, most likely, pessimistic)
3. Define task dependencies (predecessors, successors)
4. Run 10,000+ simulations
5. Analyze completion date probability distribution

**Output**:
```
Completion Probability:
Date            Probability
March 15        5% (P5 - best case)
April 1         50% (P50 - median forecast)
April 15        85% (P85 - commitment target)
May 1           95% (P95 - worst case)
```

Use P50 for planning, P85 for commitments, P95 for contingency reserves.

### Decision Tree Analysis

Evaluate alternative paths with probability-weighted outcomes:

**Example: Build vs Buy vs Partner**:

```
Build ($500K)
├── 60% succeed: $2M value → net $1.5M
└── 40% delays/bugs: $800K value → net $300K
Expected value: 0.6 × $1.5M + 0.4 × $300K = $1.02M

Buy ($200K license + $100K integration)
├── 80% integrate: $1.8M value → net $1.5M
└── 20% rework: $1M value → net $700K
Expected value: 0.8 × $1.5M + 0.2 × $700K = $1.34M

Partner ($300K + revenue share 20%)
├── 70% successful: $1.5M value → net $900K
└── 30% partnership issues: $700K → net $100K
Expected value: 0.7 × $900K + 0.3 × $100K = $660K
```

Buy option has highest expected value. But also consider risk tolerance and strategic factors.

## Advanced Earned Value Management

### EVM Deep Dive

**Key metrics**:
- **BAC** (Budget at Completion): total planned budget
- **PV** (Planned Value): budgeted cost of work scheduled to date
- **EV** (Earned Value): budgeted cost of work actually completed
- **AC** (Actual Cost): actual cost of work completed

**Variance analysis**:
- **SV** (Schedule Variance) = EV - PV (negative = behind schedule)
- **CV** (Cost Variance) = EV - AC (negative = over budget)
- **SPI** (Schedule Performance Index) = EV / PV (< 1.0 = behind)
- **CPI** (Cost Performance Index) = EV / AC (< 1.0 = over budget)

**Forecasting**:
- **EAC** (Estimate at Completion) = BAC / CPI (if trend continues)
- **EAC** = AC + (BAC - EV) / CPI (if remaining work at current efficiency)
- **ETC** (Estimate to Complete) = EAC - AC
- **TCPI** (To Complete Performance Index) = (BAC - EV) / (BAC - AC) (efficiency needed for remaining work)

### EVM for Agile

Adapt EVM for iterative delivery:
- Convert story points to budgeted cost
- PV = planned points per sprint × cost per point
- EV = completed points × cost per point
- Track CPI per sprint; investigate downward trends
- Forecast completion based on historical velocity, not EVM formulas

**Agile EVM metrics**:
- **SPI** = completed points / planned points (> 1.0 = ahead)
- **CPI** = budgeted cost / actual cost (> 1.0 = under budget)
- **BAC** = total planned points × planned cost per point

## Dependency Management at Scale

### Dependency Types

**Hard dependency**: Task A cannot start until Task B finishes. Fixed sequence.
**Soft dependency**: Task A could start but it's more efficient after Task B. Schedule optimization.
**External dependency**: depends on third party outside project control. High risk.

### Dependency Management Process

1. **Identify**: list all cross-team and external dependencies during planning
2. **Document**: dependency ID, description, type, owner, target date
3. **Visualize**: dependency board or matrix showing all dependencies
4. **Track**: review at standup, update dates, escalate blockers
5. **Mitigate**: parallel work where possible, buffer for external deps

### Dependency Risk Mitigation

For critical external dependencies:
- Regular check-ins with external party (weekly)
- Early warning triggers for delays
- Fallback plan if dependency fails
- Buffer in schedule for external delay
- Escalation path for blocked dependencies
- Contractual SLAs where feasible

## Portfolio Management

### Project Prioritization

**Weighted scoring model**:
```
Criteria            | Weight | Project A | Project B | Project C
Strategic alignment | 30%    | 8 (2.4)    | 6 (1.8)    | 9 (2.7)
ROI                 | 25%    | 7 (1.75)   | 9 (2.25)   | 5 (1.25)
Risk level          | 20%    | 6 (1.2)    | 5 (1.0)    | 8 (1.6)
Resource available  | 15%    | 9 (1.35)   | 4 (0.6)     | 7 (1.05)
Time to market      | 10%    | 8 (0.8)    | 7 (0.7)     | 6 (0.6)
Total score         | 100%   | 7.5        | 6.35        | 7.2
```

Higher score = higher priority. Review quarterly.

### Capacity Planning

Map demand (project requests) against capacity (available team time):
- Total team capacity = headcount × available hours × 0.8 (overhead factor)
- Calculate demand in same units
- Visualize demand vs capacity over next 2-4 quarters
- Identify over-allocation periods
- Make tradeoff decisions: descope, defer, add resources, reduce scope

### Benefits Realization

Track whether projected benefits actually materialize:
- Define measurable benefit metrics at project approval
- Establish baseline measurement before project starts
- Measure benefits at 6, 12, 24 months post-completion
- Document variance from projections
- Feed into future estimates and business case accuracy

## Key Points
- Hybrid combines predictive (planning/governance) with adaptive (delivery)
- Monte Carlo schedule simulation provides probability-based completion forecasts (P50, P85, P95)
- Decision trees evaluate alternatives with probability-weighted expected values
- EVM integrates scope, schedule, and cost — CPI < 0.9 needs intervention
- TCPI tells you the efficiency needed to finish on budget
- Dependency management: identify, visualize, track, mitigate, have fallback
- Weighted scoring prioritizes projects across criteria
- Capacity planning: total demand vs available capacity
- Benefits realization closes the loop — track actual vs projected
- Risk reserve = contingency (known risks) + management reserve (unknowns)
