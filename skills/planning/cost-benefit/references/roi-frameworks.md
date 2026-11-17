# ROI Frameworks

## 3-5 Year Projections

### Structure
ROI projections should cover the expected lifecycle of the investment, typically 3-5 years for technology investments.

### 5-Year Projection Template
```
| Year | Costs | Benefits | Net Cash Flow | Cumulative | Discounted (10%) |
|------|-------|----------|---------------|------------|--------------------|
| 0 | $500,000 | $0 | -$500,000 | -$500,000 | -$500,000 |
| 1 | $200,000 | $300,000 | +$100,000 | -$400,000 | +$90,909 |
| 2 | $220,000 | $500,000 | +$280,000 | -$120,000 | +$231,405 |
| 3 | $240,000 | $700,000 | +$460,000 | +$340,000 | +$345,606 |
| 4 | $260,000 | $800,000 | +$540,000 | +$880,000 | +$368,825 |
| 5 | $280,000 | $900,000 | +$620,000 | +$1,500,000 | +$384,993 |

ROI: (1,500,000 / 1,500,000) × 100 = 100%
NPV (@10%): $921,738
Payback: Year 2-3
```

### Projecting Costs

| Cost Type | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|-----------|--------|--------|--------|--------|--------|
| Initial setup | $300,000 | $0 | $0 | $0 | $0 |
| Licensing | $50,000 | $50,000 | $55,000 | $55,000 | $60,000 |
| Infrastructure | $60,000 | $60,000 | $65,000 | $70,000 | $75,000 |
| Team (4 engineers) | $600,000 | $618,000 | $636,000 | $655,000 | $675,000 |
| Maintenance | $0 | $120,000 | $124,000 | $128,000 | $132,000 |
| Training | $30,000 | $10,000 | $10,000 | $10,000 | $10,000 |
| **Total** | **$1,040,000** | **$858,000** | **$890,000** | **$918,000** | **$952,000** |

### Projecting Benefits

| Benefit | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Source |
|---------|--------|--------|--------|--------|--------|--------|
| Efficiency savings | $80,000 | $160,000 | $240,000 | $320,000 | $400,000 | 10h/week saved × $100/h × 52 weeks × adoption |
| Revenue increase | $100,000 | $250,000 | $400,000 | $500,000 | $600,000 | Conversion rate improvement × customer LTV |
| Risk reduction | $20,000 | $40,000 | $60,000 | $80,000 | $100,000 | Avoided incident cost (P1 $50k avg) |
| Compliance | $0 | $50,000 | $50,000 | $50,000 | $50,000 | Audit cost avoidance |
| **Total** | **$200,000** | **$500,000** | **$750,000** | **$950,000** | **$1,150,000** | |

## Tangible vs Intangible Benefits

### Tangible Benefits (Quantifiable)
| Benefit | Measurement | Example |
|---------|-------------|---------|
| Cost reduction | Compare current vs projected spend | Reduced infrastructure costs |
| Productivity | Hours saved × loaded rate | Automation saves 20h/week |
| Revenue increase | Incremental revenue attribution | Feature adoption drives upsell |
| Compliance fines avoided | Probability × fine amount | GDPR penalty avoidance |
| Defect reduction | Cost of quality metrics | 30% fewer P1 incidents |
| Faster time-to-market | Revenue per month of early launch | Launch 3 months early at $50k/month |

### Intangible Benefits (Document Separately)
| Benefit | Impact | How to Measure Proxy |
|---------|--------|---------------------|
| Team satisfaction | Retention, productivity | eNPS, turnover rate |
| Brand reputation | Customer trust, market position | NPS, brand surveys |
| Strategic flexibility | Option value for future moves | Scenario analysis |
| Technical capability | Team skill growth, innovation | Skill assessments, hackathon output |
| Competitive positioning | Market share, differentiation | Market analysis, competitor moves |

### Communicating Intangible Benefits
```
Strategic Value Assessment:
- The investment enables a cloud-native architecture that positions us for AI/ML workloads (2027+)
- Reduces dependency on legacy systems that are increasingly hard to staff
- Aligns with the 3-year strategic goal of 80% cloud adoption
- Builds internal platform engineering capability (strategic differentiator)

Decision: Recommend despite borderline financials, due to strategic importance
```

## Risk-Adjusted ROI

### Risk Factors

| Risk | Impact on ROI | Probability | Expected Value Adjustment |
|------|--------------|-------------|--------------------------|
| Timeline delay | +20% cost, -15% benefits | 30% | -7% ROI |
| Adoption lower than expected | -30% benefits | 25% | -7.5% ROI |
| Technology underperforms | -10% benefits | 20% | -2% ROI |
| Key person departure | +15% hiring/training cost | 15% | -2.25% ROI |
| Vendor price increase | +10% cost | 10% | -1% ROI |
| Regulatory change | +$50k compliance cost | 5% | -$2,500 |

### Risk-Adjusted ROI Calculation
```
Base ROI: 100%
Risk Adjustment: -20%
Risk-Adjusted ROI: 80%
Risk-Adjusted NPV: $737,390 (921,738 × 0.8)
```

### Monte Carlo Simulation
Run 10,000+ scenarios with variable ranges to produce a probability distribution:

```
NPV Distribution (10,000 simulations):
- 90th percentile: $1.4M
- 50th percentile: $850K
- 10th percentile: $200K
- Probability of negative NPV: 4%
- Probability of ROI > 50%: 75%
```

## Option Value and Real Options

### What is Option Value
The value of keeping future options open. Traditional NPV assumes a binary go/no-go decision. Real options treat investment as a series of staged decisions with learning between stages.

### Real Options in Technology

| Option Type | Description | Example |
|-------------|-------------|---------|
| **Defer** | Wait before committing | Invest in research, delay full build |
| **Stage** | Invest in phases | Build MVP, validate, then expand |
| **Abandon** | Cut losses | Build with exit strategy |
| **Scale** | Expand if successful | Cloud auto-scaling, modular architecture |
| **Switch** | Change approach | Vendor-agnostic design |

### Example: Staged Investment with Option Value
```
Traditional NPV:
Build all features → $2M cost, $3M benefit → NPV = $1M (proceed)

Real Options Approach:
Phase 1 (MVP): $500K, learn about adoption
  If adoption > 30%: Phase 2 ($1.5M) → $3.5M benefit → NPV = $1M + $1.85M = $2.85M
  If adoption < 30%: Abandon → loss = -$500K (vs -$2M in traditional)

Option value added: $500K (avoided loss in abandonment scenario)
```

### Incorporating Option Value
- Document the option value alongside traditional NPV
- Use staged investment decisions to preserve flexibility
- Flag investments that close off future options as higher risk

## ROI Framework Comparison

| Method | Use Case | Pros | Cons |
|--------|----------|------|------|
| **Simple ROI** | Quick assessment | Easy to calculate | Ignores time value, risk |
| **NPV** | Project comparison | Accounts for timing, discount rate | Needs accurate cash flow projection |
| **IRR** | Rate of return comparison | Comparable across scales | Assumes reinvestment at IRR |
| **Payback period** | Liquidity analysis | Simple, intuitive | Ignores later cash flows |
| **Risk-adjusted ROI** | High-uncertainty projects | Accounts for probability | More complex, subjective probabilities |
| **Real options** | Strategic/uncertain investments | Values flexibility | Complex, hard to communicate |

## References
- Return on Investment in Training and Performance Improvement Programs — Jack Phillips
- Real Options: Managing Strategic Investment in an Uncertain World — Martha Amram & Nalin Kulatilaka
- Cost-Benefit Analysis: Concepts and Practice — Boardman et al.
- The Options Approach to Capital Investment — Dixit & Pindyck (HBR, 1995)
- Project Management Institute: The Standard for Portfolio Management
