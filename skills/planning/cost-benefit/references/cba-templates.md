# CBA Templates

## Spreadsheet Template

### Recommended Structure

```yaml
Tab 1: Summary
  - Project name, description, date, author
  - Total cost, total benefit, net benefit
  - ROI, NPV, payback period
  - Recommendation

Tab 2: Cost Estimation
  - Category | Item | Year 0 | Year 1 | Year 2 | Year 3 | Total | Notes
  - One-time costs
  - Recurring costs
  - Total by year

Tab 3: Benefit Estimation
  - Category | Item | Year 1 | Year 2 | Year 3 | Total | Methodology | Confidence
  - Efficiency gains
  - Revenue impact
  - Risk reduction
  - Total by year

Tab 4: Financial Calculations
  - Cash flow by year
  - Discounted cash flow
  - Cumulative cash flow
  - NPV, ROI, payback

Tab 5: Sensitivity Analysis
  - Variable | -20% | -10% | Base | +10% | +20%
  - NPV at each level
  - Tornado chart data
```

### Summary Tab Template

```
┌────────────────────────────────────────────┐
│ PROJECT VALUATION SUMMARY                  │
├────────────────────────────────────────────┤
│ Project: Cloud Migration                   │
│ Date: 2026-04-15                           │
│ Author: [Name]                             │
│ Time Horizon: 3 years                      │
│ Discount Rate: 10%                         │
├────────────────────────────────────────────┤
│ Total Cost:           $1,378,000           │
│ Total Benefit:        $2,400,000           │
│ Net Benefit:          $1,022,000           │
│ ROI:                  74%                  │
│ NPV (@10%):           $716,000             │
│ Payback Period:       2.1 years            │
├────────────────────────────────────────────┤
│ Recommendation: PROCEED                    │
│ Rationale: Positive NPV, strong ROI,       │
│ acceptable payback period, strategic fit   │
└────────────────────────────────────────────┘
```

## Sensitivity Tables

### One-Way Sensitivity Table

```
Variable: Adoption Rate
Base assumption: 60%

| Adoption Rate | Total Cost | Total Benefit | Net Benefit | ROI  | NPV     |
|---------------|-----------|---------------|-------------|------|---------|
| 20%           | $1,378,000 | $800,000     | -$578,000   | -42% | -$215K  |
| 30%           | $1,378,000 | $1,200,000   | -$178,000   | -13% | -$65K   |
| 40%           | $1,378,000 | $1,600,000   | $222,000    | 16%  | $82K    |
| 50%           | $1,378,000 | $2,000,000   | $622,000    | 45%  | $232K   |
| **60%**       | **$1,378,000** | **$2,400,000** | **$1,022,000** | **74%** | **$716K** |
| 70%           | $1,378,000 | $2,800,000   | $1,422,000  | 103% | $995K   |
| 80%           | $1,378,000 | $3,200,000   | $1,822,000  | 132% | $1,275K |

Switch point: Adoption rate must be at least 37% for positive NPV
```

### Two-Way Sensitivity Table

```
           |        Development Cost               |
Adoption   | $1.0M    | $1.2M    | $1.4M    | $1.6M |
-----------|----------|----------|----------|--------|
20%        | -$350K   | -$450K   | -$550K   | -$650K |
40%        | $50K     | -$50K    | -$150K   | -$250K |
**60%**    | **$500K**| **$400K**| **$300K**| **$200K** |
80%        | $950K    | $850K    | $750K    | $650K |

Cells show NPV. Green (positive), Red (negative).
Most likely scenario (bold): $400K NPV
```

### Three-Variable Spider Chart Data

```
| Variable Swing | NPV at -20% | NPV at -10% | NPV at Base | NPV at +10% | NPV at +20% |
|----------------|-------------|-------------|-------------|-------------|-------------|
| Adoption       | $200K       | $458K       | $716K       | $974K       | $1,232K     |
| Development Cost | $916K    | $816K       | $716K       | $616K       | $516K       |
| Timeline       | $500K       | $608K       | $716K       | $538K       | $360K       |
| Discount Rate  | $789K       | $752K       | $716K       | $680K       | $647K       |

Steepest slope = highest sensitivity = key risk factor: Adoption Rate
```

## Scenario Analysis Table

### Scenario Definitions
```
| Scenario | Adoption | Dev Cost | Timeline | Revenue Impact | Probability |
|----------|---------|----------|----------|---------------|-------------|
| Best case | 80% | $1.1M | 8 months | High | 20% |
| Expected | 60% | $1.3M | 12 months | Medium | 60% |
| Worst case | 30% | $1.6M | 18 months | Low | 20% |
```

### Scenario Results
```
| Scenario | Total Cost | Total Benefit | Net Benefit | ROI | NPV | IRR |
|----------|-----------|---------------|-------------|-----|-----|-----|
| Best case (20%) | $1.1M | $3.2M | $2.1M | 191% | $1.5M | 45% |
| Expected (60%) | $1.4M | $2.4M | $1.0M | 74% | $716K | 24% |
| Worst case (20%) | $1.7M | $1.0M | -$700K | -41% | -$450K | -5% |

Expected value: (0.2 × $1.5M) + (0.6 × $716K) + (0.2 × -$450K) = $650K
Probability of positive NPV: 80%
Probability of negative NPV: 20%
```

## Investment Committee Presentation

### Slide Deck Structure

```
Slide 1: Executive Summary
- Project name, investment amount, timeframe
- Key metrics: ROI, NPV, payback
- One-line recommendation

Slide 2: Problem Statement
- What problem are we solving?
- What happens if we don't invest?
- Current state cost (pain)

Slide 3: Solution Options
- Option A: Build | Option B: Buy | Option C: Hybrid | Option D: Do Nothing
- Each with: investment, timeline, risk level

Slide 4: Financial Analysis
- Cost breakdown chart (one-time vs recurring)
- Benefit chart (efficiency, revenue, risk)
- ROI/NPV/payback comparison table across options

Slide 5: Sensitivity Analysis
- Tornado chart showing key variables
- Scenario analysis table (best/expected/worst)
- Probability distribution of NPV

Slide 6: Non-Financial Factors
- Strategic alignment
- Competitive advantage
- Technical capability building
- Risk and compliance

Slide 7: Recommendation
- Recommended option with rationale
- Implementation timeline and milestones
- Key risks and mitigation strategies
- Next steps and required approvals
```

### Executive Summary Slide Content
```
┌────────────────────────────────────────────┐
│ INVESTMENT COMMITTEE SUMMARY              │
├────────────────────────────────────────────┤
│ Request: $1.4M to migrate to cloud-native  │
│ architecture over 12 months                │
├────────────────────────────────────────────┤
│ Financials:                                │
│ ┌────────────────────────────────────┐    │
│ │ ROI: 74%      NPV: $716K          │    │
│ │ Payback: 2.1 years                │    │
│ │ Probability of positive ROI: 80%  │    │
│ └────────────────────────────────────┘    │
├────────────────────────────────────────────┤
│ Strategic Value:                           │
│ ┌────────────────────────────────────┐    │
│ │ Enables AI/ML workloads (2027+)   │    │
│ │ Reduces legacy dependency risk    │    │
│ │ Builds platform engineering cap.  │    │
│ └────────────────────────────────────┘    │
├────────────────────────────────────────────┤
│ Risk: Moderate — adoption rate key driver  │
│                                            │
│ Recommendation: APPROVE                     │
│ Conditions: Phase 1 gate at 6 months       │
└────────────────────────────────────────────┘
```

## CBA Review Checklist

```
□ Costs broken into one-time and recurring categories
□ Benefits quantified with clear methodology
□ Time horizon defined and justified
□ Discount rate documented
□ NPV and ROI calculated correctly
□ Payback period determined
□ Sensitivity analysis on 3+ key variables
□ Best/expected/worst case scenarios
□ Non-financial factors documented
□ Build vs buy comparison (if applicable)
□ Do-nothing baseline documented
□ Assumptions listed and challenged
□ Recommendation with clear rationale
□ Suitable for executive presentation
```

## References
- Harvard Business Review: The Case for More Cost-Benefit Analysis
- Project Management Institute: Business Analysis for Practitioners
- Microsoft Excel CBA Templates — various available on Office Template Gallery
- Smartsheet CBA Templates — https://www.smartsheet.com/
- A Guide to Cost-Benefit Analysis — European Commission (2015)
