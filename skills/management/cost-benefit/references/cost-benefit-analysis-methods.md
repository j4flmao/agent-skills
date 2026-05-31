# Cost-Benefit Analysis Methods

## Purpose
Provide comprehensive coverage of cost-benefit analysis methodologies for technology investment decisions. Covers financial calculation methods, valuation techniques, risk adjustment, and comparative framework selection.

## Table of Contents
1. [Financial Metrics Deep Dive](#financial-metrics-deep-dive)
2. [ROI Calculation Methods](#roi-calculation-methods)
3. [NPV and DCF Analysis](#npv-and-dcf-analysis)
4. [Total Cost of Ownership (TCO)](#total-cost-of-ownership-tco)
5. [Break-Even and Payback Analysis](#break-even-and-payback-analysis)
6. [Cost-Effectiveness Analysis](#cost-effectiveness-analysis)
7. [Multi-Criteria Decision Analysis](#multi-criteria-decision-analysis)
8. [Risk-Adjusted Methods](#risk-adjusted-methods)
9. [Real Options Valuation](#real-options-valuation)
10. [Intangible Benefit Valuation](#intangible-benefit-valuation)
11. [Comparative Method Selection](#comparative-method-selection)

---

## Financial Metrics Deep Dive

### Core Metrics Summary

| Metric | Formula | Decision Rule | Time Value | Best For |
|---|---|---|---|---|
| ROI | (Benefit - Cost) / Cost x 100 | ROI > hurdle rate | No | Quick comparisons |
| NPV | sum(CF_t / (1+r)^t) - I_0 | NPV > 0 | Yes | Long-term investments |
| IRR | NPV = 0 at discount rate | IRR > cost of capital | Yes | Comparing returns |
| Payback | Cumulative CF = I_0 | < max allowed period | No | Risk assessment |
| TCO | Sum of all lifecycle costs | Lower is better | Optional | Cost comparison |
| BCR | PV Benefits / PV Costs | BCR > 1.0 | Yes | Efficiency ranking |

### Hurdle Rates by Investment Type

| Investment Type | Typical Hurdle Rate | Rationale |
|---|---|---|
| Compliance / Security | No hurdle (mandatory) | Must do regardless of ROI |
| Infrastructure upgrade | 10-15% | Low risk, necessary |
| Platform modernization | 15-25% | Higher risk, higher return expected |
| New product development | 25-40% | High risk, uncertain return |
| Cost-saving initiative | 15-20% | Directly measurable |
| Revenue-generating | 20-30% | Needs to exceed cost of capital |
| R and D / Innovation | Not applicable | Option value, not direct ROI |

### Loaded Cost Rate Calculation

```
Base salary: $120,000
Bonus (10%): $12,000
Benefits (30%): $36,000
Overhead (15%): $18,000
Tools and equipment: $6,000
Total loaded cost: $192,000

Loaded hourly rate: $192,000 / 2080 hours = ~$92/hr
Engineering hour cost (for project estimation): $92/hr
```

---

## ROI Calculation Methods

### Simple ROI

```
Formula: ROI = (Net Benefit / Total Cost) x 100

Example:
  Total costs: $200,000
  Total benefits over 3 years: $350,000
  Net benefit: $150,000
  ROI = ($150,000 / $200,000) x 100 = 75%

Interpretation: For every $1 invested, $0.75 profit returned.
```

### Annualized ROI

```
Formula: Annualized ROI = (1 + ROI)^(1/n) - 1

Where n = number of years.

Example:
  Total ROI (3 years): 75%
  Annualized ROI = (1 + 0.75)^(1/3) - 1 = 0.205 = 20.5%

Interpretation: Equivalent to earning 20.5% per year on the investment.
```

### ROI with Discounting

```
Formula: Discounted ROI = (PV Benefits - PV Costs) / PV Costs x 100

Example:
  PV of benefits (5 years, 12% discount): $280,000
  PV of costs (5 years, 12% discount): $180,000
  Discounted ROI = ($280,000 - $180,000) / $180,000 x 100 = 55.6%

Note: Discounted ROI is always lower than simple ROI for multi-year projects.
This reflects the time value of money.
```

### ROI Limitations

```
1. Ignores project scale: A $1M project with 50% ROI adds more value than
   a $10K project with 100% ROI, but simple ROI comparison says the opposite.

2. No time dimension: ROI treats year 1 benefits same as year 5 benefits.

3. Easy to manipulate: Depending on what costs are included or excluded.

4. Doesn't account for risk: Two projects with 50% ROI may have very
   different risk profiles.

5. Binary threshold: Passing ROI threshold doesn't mean it's the best use
   of capital (opportunity cost).

Workaround: Use ROI as screening metric, NPV for prioritizing.
```

---

## NPV and DCF Analysis

### Discounted Cash Flow Basics

```
DCF projects future cash flows and discounts them to present value.

Components:
  - Initial investment (I_0): upfront cost, negative cash flow year 0.
  - Operating cash flows (CF_t): net benefits minus costs each year.
  - Terminal value (TV): residual value at end of analysis period.
  - Discount rate (r): reflects time value of money and risk.

Formula:
  NPV = sum(CF_t / (1+r)^t) - I_0

Where t = 1 to n years.
```

### Step-by-Step NPV Calculation

```
Investment: Migrate from on-prem to cloud, $500K initial, 5-year horizon.

Year 0 (initial investment):
  Infrastructure purchase: -$300,000
  Migration labor: -$150,000
  Training: -$50,000
  Total: -$500,000

Year 1:
  Cost savings (infrastructure): +$120,000
  Personnel savings: +$40,000
  Cloud operating cost: -$80,000
  Net: +$80,000

Year 2:
  Same as year 1, net: +$80,000 (but some escalation)

Year 3-5: Similar pattern with growth.

Discount rate: 12%

NPV calculation:
  Year 0: -$500,000 / (1.12)^0 = -$500,000
  Year 1: $80,000 / (1.12)^1 = $71,429
  Year 2: $85,000 / (1.12)^2 = $67,729
  Year 3: $90,000 / (1.12)^3 = $64,060
  Year 4: $95,000 / (1.12)^4 = $60,377
  Year 5: $100,000 / (1.12)^5 = $56,743

NPV = -$500,000 + $71,429 + $67,729 + $64,060 + $60,377 + $56,743
NPV = -$179,662

Interpretation: NPV is negative at 12% discount rate.
The investment would need lower discount rate or higher benefits.
```

### IRR Calculation

```
IRR is the discount rate that makes NPV = 0.

For the example above, solve for r where:
  0 = -500,000 + 80,000/(1+r) + 85,000/(1+r)^2 + 90,000/(1+r)^3
      + 95,000/(1+r)^4 + 100,000/(1+r)^5

IRR in this case: approximately 2.1%

Since IRR (2.1%) < cost of capital (12%), reject the project.
```

### NPV Decision Rules

```
NPV > 0: Value-creating investment. Accept.
NPV = 0: Investment breaks even at discount rate. Indifferent.
NPV < 0: Value-destroying investment. Reject.

For mutually exclusive projects:
  Project A: NPV = $100,000
  Project B: NPV = $150,000
  Choose Project B (higher NPV).

For capital-constrained decisions:
  Use profitability index:
  PI = NPV / Investment
  Project A: $100K / $500K = 0.20
  Project B: $150K / $1M = 0.15
  Choose Project A (higher value per dollar invested).
```

---

## Total Cost of Ownership (TCO)

### TCO Categories

```
Acquisition costs:
  Software licenses (upfront + annual maintenance).
  Hardware purchase / lease.
  Implementation / integration services.
  Initial training.

Operation costs:
  Infrastructure (compute, storage, network).
  Personnel (admin, support, engineering).
  Software maintenance and updates.
  Facility costs (power, cooling, space).
  Third-party services (SaaS fees, support contracts).

Decommissioning costs:
  Data migration.
  Hardware disposal / recycling.
  Contract termination fees.
  Knowledge transfer.
```

### TCO Comparison: Build vs Buy

```
Building in-house:
  Pros: Full control, no vendor lock-in, custom features.
  Cons: Higher upfront, ongoing maintenance, slower to market.
  TCO factors: engineering time 3-5x purchase cost.

Buying commercial:
  Pros: Faster deployment, vendor support, proven reliability.
  Cons: Licensing fees, vendor dependency, feature constraints.
  TCO factors: license + 20% annual maintenance.

SaaS subscription:
  Pros: Minimal upfront, automatic updates, elastic scaling.
  Cons: Ongoing expense, data sovereignty, integration limits.
  TCO factors: monthly fee x months + migration = 5-year cost.

Open source with support:
  Pros: No license cost, community innovation, flexibility.
  Cons: Support costs, integration effort, security responsibility.
  TCO factors: hosting + support contract + engineering.
```

### TCO Calculation Example

```
Scenario: Monitoring solution, 3 years, 100 servers

Build in-house:
  Year 0: Engineering (6 months x 2 engineers) = $192,000
  Year 1-3: Maintenance (0.5 FTE) = $96,000/yr
  Infrastructure (monitoring servers) = $30,000
  Total TCO: $192,000 + $96,000 x 3 + $30,000 = $510,000

Commercial tool:
  Year 0: License + setup = $80,000
  Year 1-3: License renewal (20%) + support = $28,000/yr
  No dedicated engineering = $0
  Total TCO: $80,000 + $28,000 x 3 = $164,000

Open source (with support):
  Year 0: Engineering (2 months x 1 engineer) = $32,000
  Year 1-3: Support contract = $20,000/yr
  Infrastructure = $30,000
  Total TCO: $32,000 + $20,000 x 3 + $30,000 = $122,000

Conclusion: Open source has lowest TCO but requires in-house expertise.
Commercial tool trades engineering cost for licensing cost.
```

### TCO Pitfalls

```
1. Missing decommissioning costs: Exit costs can be 10-20% of initial TCO.
2. Ignoring personnel training: New tools need training investment.
3. Forgetting upgrades: Major version upgrades may require migration effort.
4. Assuming productivity parity: Different tools have different efficiency.
5. Not accounting for downtime: High-availability systems cost more but
   reduce downtime cost.
```

---

## Break-Even and Payback Analysis

### Payback Period Calculation

```
Formula: Payback Period = Initial Investment / Annual Net Cash Flow

For uneven cash flows:
  Sum net cash flows year by year.
  Payback occurs when cumulative cash flow becomes positive.

Simple example:
  Investment: $120,000
  Annual benefit: $40,000
  Payback: $120,000 / $40,000 = 3 years

Uneven example:
  Investment: $120,000
  Year 1: $20,000
  Year 2: $35,000
  Year 3: $50,000
  Year 4: $60,000

  Cumulative: Y1 -$100K, Y2 -$65K, Y3 -$15K, Y4 +$45K
  Payback: 3 years + ($15K/$60K x 12 months) = 3 years 3 months
```

### Discounted Payback Period

```
Same as payback but uses discounted cash flows.

Example with 12% discount rate:
  Year 1: $20,000 / 1.12 = $17,857
  Year 2: $35,000 / 1.12^2 = $27,891
  Year 3: $50,000 / 1.12^3 = $35,589
  Year 4: $60,000 / 1.12^4 = $38,126

  Cumulative: Y1 -$102,143, Y2 -$74,252, Y3 -$38,663, Y4 -$537
  Discounted payback: > 4 years (likely doesn't pay back)

Note: Discounted payback is always longer than simple payback.
```

### Break-Even Volume

```
For product or service investments:

Break-Even Volume = Fixed Costs / (Unit Price - Unit Variable Cost)

Example:
  Fixed costs (development): $200,000
  Unit price (per customer): $50
  Unit variable cost: $10
  Break-even volume: $200,000 / ($50 - $10) = 5,000 units

  If market size is 100,000 units, break-even is 5% market penetration.
  If market size is 8,000 units, break-even is 62.5% penetration (risky).
```

### Acceptable Payback Periods

| Investment Type | Max Payback | Rationale |
|---|---|---|
| Security / compliance | 12 months | High urgency |
| Efficiency tool | 18 months | Direct savings expected |
| Infrastructure | 24 months | Long-lived asset |
| Platform migration | 36 months | Strategic value extends timeline |
| New product | 24 months | Market uncertainty limits horizon |
| R and D | Not applicable | Option value, not direct payback |

---

## Cost-Effectiveness Analysis

### When to Use

Cost-effectiveness analysis (CEA) compares alternatives based on cost per unit of outcome.

```
Use when:
  - Financial benefits are hard to monetize.
  - Outcome is measured in non-financial units.
  - Comparing options with same goal but different costs.

Examples:
  - Cost per security vulnerability remediated.
  - Cost per hour of downtime avoided.
  - Cost per developer productivity point gained.
```

### CEA Calculation

```
Formula: Cost-Effectiveness Ratio = Total Cost / Units of Outcome

Example:
  Option A (automated testing): $50,000, detects 200 bugs.
  Cost per bug: $50,000 / 200 = $250/bug.

  Option B (manual testing): $30,000, detects 100 bugs.
  Cost per bug: $30,000 / 100 = $300/bug.

  Option A is more cost-effective per bug found, even though total cost is higher.

  Option C (both): $70,000, detects 250 bugs.
  Cost per bug: $70,000 / 250 = $280/bug.

  Option A still most cost-effective. Option C provides most total bugs.
```

### CEA Limitations

```
CEA doesn't tell you:
  - The absolute value of the outcome (how much is a bug worth?).
  - Whether the investment is worthwhile overall.
  - Non-quantitative factors.

Use CEA together with other methods, not alone.
```

---

## Multi-Criteria Decision Analysis

### MCDA Framework

Used when multiple qualitative and quantitative factors influence the decision.

```
Steps:
1. Identify decision criteria (financial, strategic, risk, technical).
2. Weight each criterion by importance.
3. Score each alternative per criterion.
4. Calculate weighted score.
5. Perform sensitivity analysis on weights.
```

### MCDA Example

```
Decision: Choose cloud provider for migration.

Criteria and weights:
  Cost (30%): lower total cost = better score.
  Performance (25%): latency, throughput.
  Feature match (20%): how well services match needs.
  Risk (15%): vendor lock-in, compliance.
  Migration ease (10%): tooling, expertise available.

Scores (1-10):
         | Cost | Perf | Feat | Risk | Migr | Weighted
Provider A: 8    | 7    | 6    | 7    | 9    | 7.25
Provider B: 6    | 9    | 8    | 6    | 7    | 7.25
Provider C: 7    | 7    | 7    | 8    | 7    | 7.20

Provider A and B tied. Sensitivity: if cost weight increases, A wins.
If performance weight increases, B wins.
```

### MCDA Weighting Methods

```
Direct weighting: Stakeholders assign weights directly.
  Simple, but can be biased.
  Use: when stakeholders can articulate priorities.

Pairwise comparison (AHP): Compare criteria in pairs.
  More rigorous, identifies inconsistencies.
  Use: high-stakes or contentious decisions.

Equal weighting: All criteria have equal importance.
  Simple default when priorities are unclear.
  Use: as sensitivity baseline to test other methods.

Ranking-based: Rank criteria, then derive weights.
  Rank 1 = highest weight, rank n = lowest.
  Use: quick prioritization without exact weights.
```

---

## Risk-Adjusted Methods

### Expected Value Method

```
Formula: Expected NPV = sum(p_i x NPV_i)

Where p_i = probability of scenario i.
NPV_i = NPV under scenario i.

Example:
  Optimistic (20% probability): NPV = $500,000
  Expected (60% probability): NPV = $200,000
  Pessimistic (20% probability): NPV = -$100,000

  Expected NPV = 0.2 x $500K + 0.6 x $200K + 0.2 x (-$100K)
               = $100K + $120K - $20K = $200K

Interpretation: Risk-adjusted NPV is $200K.
Decision: Proceed (NPV > 0 after risk adjustment).
```

### Monte Carlo Simulation

```
For complex investments with many uncertain variables:

1. Define each uncertain variable as a probability distribution:
   - Development time: normal distribution, mean 6 months, std 2 months.
   - Adoption rate: beta distribution, min 20%, max 60%, mode 40%.
   - Cost savings per user: lognormal distribution.

2. Run 10,000 simulations (randomly sample from each distribution).

3. Analyze output distribution:
   - NPV at 10th percentile: -$50K (10% chance of loss).
   - NPV at 50th percentile (median): $180K.
   - NPV at 90th percentile: $400K.
   - Probability of positive NPV: 78%.

Result: 78% chance of value creation. Accept with confidence.
```

### Risk-Adjusted Discount Rate

```
Adjust discount rate based on project risk:

Base rate (risk-free): 4%
Equity risk premium: 6%
Market beta (technology): 1.2-1.5
Company size premium: 0-3%
Project-specific premium: 0-5%

Typical range: 10-20% for technology projects.
Higher risk = higher discount rate = lower NPV = harder to justify.
```

### Sensitivity Analysis Variables

```
For any investment, test sensitivity to:

High-impact variables:
  - Implementation timeline (delay reduces benefits).
  - Adoption rate (lower adoption = lower benefit).
  - License / infrastructure cost escalation.
  - Personnel costs (labor market changes).
  - Competitor response (delays market capture).

Tornado chart: Variables ranked by impact on NPV.
  Most impactful at top.
  Focus risk mitigation on top 3 variables.
```

---

## Real Options Valuation

### When to Use

Options-based thinking applies when:
- Investment can be staged (not all-or-nothing).
- Future decisions depend on intermediate outcomes.
- Uncertainty is high but can be resolved over time.
- Initial investment creates platform for future opportunities.

### Types of Real Options

```
Option to defer:
  Wait for more information before committing.
  Value: avoiding irreversible mistake.
  Cost: potential first-mover disadvantage.

Option to expand:
  Initial small investment, expand if successful.
  Example: Pilot project -> full rollout.
  Value: limits downside while preserving upside.

Option to abandon:
  Exit investment if conditions change.
  Value: limits losses.
  Cost: exit fees, sunk investment.

Option to switch:
  Change technology, vendor, or approach.
  Value: flexibility to adapt.
  Cost: switching costs.

Growth option:
  Investment enables future opportunities.
  Example: API infrastructure enables future products.
  Value: strategic positioning.
```

### Simple Options Valuation

```
Real option value = NPV of investment + Value of flexibility

Simplified approach:
  Invest now (no option): NPV = $1M
  Wait one year: NPV at 50% probability, same $1M at 10% discount rate.

  Option value from waiting:
  If success, NPV = $1M, probability 50%.
  If failure, NPV = $0, can abandon.
  Expected NPV with option = (0.5 x $1M / 1.1) = $455K.

  If immediate investment has NPV < $455K, waiting adds value.
  But if immediate investment NPV > $455K, act now.

Decision: Choose the approach with higher expected value.
```

---

## Intangible Benefit Valuation

### Types of Intangible Benefits

```
Strategic intangibles:
  - Competitive positioning.
  - Brand reputation.
  - Customer trust.
  - Market share growth.

Operational intangibles:
  - Team morale.
  - Knowledge and expertise.
  - Process maturity.
  - Organizational agility.

Risk intangibles:
  - Security posture.
  - Compliance confidence.
  - Business continuity.
  - Vendor independence.

Innovation intangibles:
  - Learning and experimentation.
  - Platform for future capabilities.
  - Data assets.
  - Intellectual property.
```

### Valuation Approaches

```
Conjoint analysis: Survey stakeholders to determine willingness to pay.
  "How much premium would you pay for faster deployment?"

Cost-based: What would it cost to replace this capability?
  "Cost of rebuilding team expertise if lost."

Benefit-based: What benefit does this capability enable?
  "API platform enables 3 new revenue streams worth $X."

Market-based: What does the market pay for similar capabilities?
  "Industry average cost of similar security certification."

Scoring: High/medium/low qualitative assessment.
  Add to MCDA as explicit criteria.

Expert opinion: Internal or external expert estimates.
  Combine with probability ranges.
```

### Communicating Intangibles

```
Intangibles should be:
  - Listed separately from hard financials.
  - Given qualitative assessment (high/medium/low).
  - Linked to strategic outcomes.
  - Reviewed periodically as uncertainty resolves.

Intangibles should NOT be:
  - Given arbitrary dollar values (pseudo-quantification).
  - Ignored because they are hard to measure.
  - Used to justify poor financial returns.

Decision rule: Intangibles can tip the scale between alternatives
with similar financial outcomes, but should not override large
negative financial projections.
```

---

## Comparative Method Selection

### Decision Matrix

```
                   | ROI | NPV | TCO | Payback | CEA | MCDA | Options
Simple decision    | Yes | No  | No  | Yes     | No  | No   | No
Multi-year project | No  | Yes | Yes | Yes     | No  | Yes  | Maybe
High uncertainty   | No  | Yes | No  | Maybe   | Yes | Yes  | Yes
Staged investment  | No  | Yes | No  | No      | No  | Yes  | Yes
Cost comparison    | No  | No  | Yes | Partly  | Yes | No   | No
Mixed outcomes     | No  | No  | No  | No      | Yes | Yes  | No
Strategy decision  | No  | No  | No  | No      | No  | Yes  | Yes
Quick screening    | Yes | No  | No  | Yes     | No  | No   | No
```

### Method Selection Flow

```
Is investment mandatory (compliance, security)?
  Yes: Use TCO for cost efficiency.
  No: Continue.

Is benefit purely cost savings?
  Yes: ROI or payback (simple), NPV (multi-year).
  No: Continue.

Is benefit primarily revenue increase?
  Yes: NPV + sensitivity analysis.
  No: Continue.

Are there significant intangible benefits?
  Yes: Add MCDA.
  No: Continue.

Is uncertainty high?
  Yes: Add real options or expected NPV.
  No: Standard NPV/ROI.

Can investment be staged?
  Yes: Real options framework.
  No: All-or-nothing analysis.

Result: Choose primary method + secondary validation method.
```

### Common Method Combinations

```
Simple cost savings: ROI + Payback.
Multi-year transformation: NPV + TCO + Sensitivity.
Technology selection: TCO + MCDA.
New product development: NPV + Options + Monte Carlo.
Strategic investment: MCDA + NPV + Intangibles.
Portfolio prioritization: ROI (screening) + NPV (deep dive).
Build vs buy: TCO + MCDA + Risk assessment.
Platform investment: Options + NPV + Intangibles.
```

## Handoff
`cost-benefit-presentation-stakeholder.md` for stakeholder presentation.
`../SKILL.md` for the parent cost-benefit skill.
