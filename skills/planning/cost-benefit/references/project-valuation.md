# Project Valuation

## Cost Estimation

### Estimation Approaches

| Method | When to Use | Accuracy | Effort Required |
|--------|-------------|----------|----------------|
| **Analogous** | Early-stage, similar past projects | -25% to +50% | Low (hours) |
| **Parametric** | Historical data available | -15% to +30% | Medium (days) |
| **Bottom-up** | Detailed requirements known | -5% to +15% | High (weeks) |
| **Three-point** | High uncertainty | Range-based | Medium (days) |
| **Expert judgment** | Novel projects, no historical data | Varies widely | Low (hours) |

### Three-Point Estimation
```
Expected Cost = (Optimistic + 4 × Most Likely + Pessimistic) / 6

Example:
Optimistic: $800,000
Most Likely: $1,000,000
Pessimistic: $1,600,000
Expected: (800,000 + 4,000,000 + 1,600,000) / 6 = $1,066,667
```

### Cost Breakdown Structure

```
Project: E-commerce Platform Migration
├── 1.0 Development
│   ├── 1.1 Backend (3 engineers × 6 months)
│   ├── 1.2 Frontend (2 engineers × 6 months)
│   └── 1.3 Database migration (1 engineer × 3 months)
├── 2.0 Infrastructure
│   ├── 2.1 Cloud setup and configuration
│   ├── 2.2 CI/CD pipeline
│   └── 2.3 Monitoring and observability
├── 3.0 Testing
│   ├── 3.1 Automated test suite
│   ├── 3.2 Performance testing
│   └── 3.3 User acceptance testing
├── 4.0 Training and Documentation
│   ├── 4.1 Team training
│   ├── 4.2 User documentation
│   └── 4.3 Operations runbook
├── 5.0 Migration
│   ├── 5.1 Data migration
│   ├── 5.2 Cutover planning
│   └── 5.3 Parallel run period
└── 6.0 Contingency (15%)
```

### Contingency Allocation
```
Contingency: 10-20% of total estimated cost

Breakdown:
- Known-unknowns: 10% (identified risks with specific mitigation)
- Unknown-unknowns: 5% (risks that cannot be identified)
- Management reserve: 5% (held by project sponsor for scope changes)
```

## Benefit Realization

### Benefit Mapping
```
| Benefit | Type | Measurement | Baseline | Target | Timeline | Owner |
|---------|------|-------------|----------|--------|----------|-------|
| Reduced infrastructure cost | Cost savings | Monthly cloud spend | $50k/mo | $35k/mo | Month 6 | DevOps |
| Faster deployment | Efficiency | Deploy time | 2 hours | 15 min | Month 3 | Eng |
| Lower error rate | Quality | P1 incidents/mo | 5/mo | <1/mo | Month 9 | QA |
| Increased conversion | Revenue | Conversion rate | 2.5% | 3.5% | Month 12 | Product |
| Faster onboarding | Efficiency | Time to first PR | 20 days | 5 days | Month 6 | Eng Manager |
```

### Benefit Scheduling
```
| Benefit | Year 1 | Year 2 | Year 3 | Total | Confidence |
|---------|--------|--------|--------|-------|------------|
| Infrastructure savings | $180,000 | $200,000 | $220,000 | $600,000 | High (similar migrations) |
| Productivity (dev) | $100,000 | $200,000 | $250,000 | $550,000 | Medium (depends on adoption) |
| Revenue increase | $150,000 | $300,000 | $400,000 | $850,000 | Low (market dependent) |
| Risk reduction | $50,000 | $75,000 | $100,000 | $225,000 | Medium (incident frequency) |
| **Total** | **$480,000** | **$775,000** | **$970,000** | **$2,225,000** | |
```

## Payback Analysis

### Payback Calculation

```
Simple Payback:
Investment: $800,000
Annual Net Benefit: $250,000
Payback Period: $800,000 / $250,000 = 3.2 years

Discounted Payback:
NPV of annual benefits @10% discount rate:
Year 1: $150,000 / 1.10 = $136,364
Year 2: $250,000 / 1.10^2 = $206,612
Year 3: $350,000 / 1.10^3 = $262,960
Year 4: $450,000 / 1.10^4 = $307,355
Year 5: $550,000 / 1.10^5 = $341,506

Cumulative Discounted Benefit:
End of Year 1: $136,364
End of Year 2: $342,976
End of Year 3: $605,936
End of Year 4: $913,291 ← Discounted payback occurs here (year 4)
```

### Comparing Multiple Options
```
| Option | Investment | Annual Benefit | Payback | NPV (10%) | ROI |
|--------|-----------|----------------|---------|-----------|-----|
| A: Full rebuild | $1.5M | $500K | 3.0 yr | $395K | 26% |
| B: Incremental | $800K | $300K | 2.7 yr | $337K | 42% |
| C: Buy SaaS | $300K | $200K | 1.5 yr | $458K | 153% |
| D: Do nothing | $0 | $0 | N/A | $0 | 0% |

Recommendation: Option C (Buy SaaS) has best ROI and NPV with lowest risk.
```

## ROI Calculation with Examples

### Example 1: Internal Tool Automation
```
Scenario: Build a deployment automation tool
Investment: 3 engineers × 4 months = $180,000
Annual benefit: 15 engineers × 5 hours/week saved × $100/h × 48 weeks = $360,000/year

Year 0: -$180,000
Year 1: $360,000 - $30,000 (maintenance) = $330,000
Year 2: $330,000
Year 3: $330,000

ROI (3 years): ($990,000 - $270,000) / $270,000 = 267%
NPV (@10%): $640,000
Payback: < 1 year
```

### Example 2: Platform Migration
```
Scenario: Migrate from monolithic to microservices architecture
Investment: $2M (18 months)
Annual benefit: $600K (faster feature delivery + reduced incidents)
Transition cost: -$200K/year (parallel run)

Year 0-1: -$1.2M (build)
Year 1-2: -$800K (build) + -$200K (transition) = -$1M cumulative  
Year 2-3: $600K - $300K (maintenance) = $300K net
Year 3-4: $600K - $300K = $300K net
Year 4-5: $750K - $350K = $400K net (compounding benefits)

ROI (5 years): ($1M - $2.2M) / $2.2M = -54%
Wait—this is negative for 5 years? Let's recalculate.

Actually:

Year 0: -$1,000,000
Year 1: -$1,000,000 (build continues)
Year 2: -$200,000 (parallel run costs exceed initial benefits)
Year 3: +$300,000 (post-migration, benefits exceed costs)
Year 4: +$400,000
Year 5: +$500,000

Total net: $0 → break-even at year 5

ROI: $0 / $2.2M = 0% (break-even at 5 years)
NPV (@10%): -$340,000 (negative due to time value of money)
Payback: ~5 years

Recommendation: Reconsider. Only proceed if strategic value (flexibility, velocity) justifies the cost.
```

### Example 3: Compliance Tool
```
Scenario: Implement automated compliance monitoring
Investment: $150,000 (tool + implementation)
Annual benefit: Avoided 2 compliance findings/year × $75K remediation each = $150K/year
Additional benefit: Reduced audit effort = $20K/year

Year 0: -$150,000
Year 1: $170,000 - $15,000 (support) = $155,000
Year 2: $155,000
Year 3: $155,000

ROI (3 years): ($465,000 - $180,000) / $180,000 = 158%
NPV (@10%): $235,000
Payback: ~1 year

Recommendation: Proceed. Strong financials + compliance risk reduction.
```

## References
- Project Management Institute: The Standard for Business Analysis
- Software Engineering Economics — Barry Boehm
- Cost-Benefit Analysis: Concepts and Practice — Anthony Boardman et al.
- PMBOK Guide — Project Management Institute
- SAFe Lean-Agile Budgeting — Scaled Agile Framework
