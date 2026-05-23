# Market Sizing Guide

## Core Concepts

| Term | Definition | Example (Email Marketing SaaS) |
|------|-----------|-------------------------------|
| **TAM** (Total Addressable Market) | Total revenue opportunity if 100% market share | $10B — all global email marketing software spend |
| **SAM** (Serviceable Addressable Market) | Portion of TAM your product and model can reach | $2.5B — SaaS email marketing in US+EU for SMBs |
| **SOM** (Serviceable Obtainable Market) | Realistic revenue you can capture in 3-5 years | $100M — your realistic share given team and funding |

## TAM Calculation Methods

### Top-Down (Industry Report Based)

Start with an industry analyst TAM figure, then apply filters.

**Formula:**
```
TAM = Industry Revenue × Segment % × Region % × Delivery %
```

**Example:**
```
Industry:      Global project management software = $8B (Gartner 2024)
  × Segment:   SMB (< 100 employees) = 35%         = $2.8B
  × Region:    North America + Europe = 60%         = $1.68B
  × Delivery:  SaaS only = 70%                      = $1.18B
  = TAM:                                            = $1.18B
```

**Common Sources:**
| Source | Cost | Quality |
|--------|------|---------|
| Gartner | $5K-30K/year | High (industry standard) |
| Forrester | $5K-30K/year | High |
| IDC | $5K-15K/report | High |
| Statista | $200-1K/year | Medium (aggregated) |
| Grand View Research | Free summary | Medium |
| IBISWorld | $1K/report | Medium |
| Public company 10-K filings | Free | Medium (competitor revenue) |

**Limitations:**
- Top-down numbers are only as good as the analyst estimates
- Percentage filters can be arbitrary (why 35% and not 30%?)
- Multiple percentage multiplications inflate uncertainty
- "Cascading percentages" can produce wildly different results with
  small changes to any assumption

### Bottom-Up (Unit Economics Based)

Start with your price and multiply by addressable customer count.

**Formula:**
```
SOM = Price per unit × Addressable customers × Expected penetration
SAM = SOM × (potential market / target segment ratio)
TAM = SAM × (total market / addressable segment ratio)
```

**Example:**
```
Your price:                  $420/year per customer
Addressable customers:     500,000 SMBs in NA + EU
  Realistic capture (5yr):  8%                          = 40,000 customers
  SOM:                      40,000 × $420/yr            = $16.8M

SAM calculation:
  Your target segment is 20% of the broader SMB market
  SAM = $16.8M × 5                                      = $84M

TAM calculation:
  SMB is 35% of total PM software market
  TAM = $84M / 0.35                                     = $240M
```

**Precision Tips:**
- Customer count: use census data, industry associations, or
  LinkedIn company counts to estimate total businesses
- Price: use actual or planned pricing, not aspirational pricing
- Penetration: benchmark against comparable SaaS adoption rates in
  similar segments (e.g., Slack's SMB penetration in year 3)

**Limitations:**
- Assumes you can reach all addressable customers equally
- Does not account for competition or switching costs
- Linear projection (real adoption is typically S-curve)
- Price may need to change (discounts, tiered pricing)

### Third Method: Value-Theory Based

Estimate the economic value your product creates, then capture
a percentage of that value.

**Formula:**
```
TAM = Value created per customer × Total customers × Capture rate
```

**Example:**
```
Our task manager saves each team 4 hours/week × $50/hr = $200/week
  = $10,400/year in value
  We capture 20% of value created = $2,080/year per customer
  × 500,000 target customers
  = $1.04B TAM
```

**When to use:** Truly new markets with no existing analyst data,
or when your product creates net-new value rather than replacing
existing spending.

## Reconciliation

### When Top-Down and Bottom-Up Diverge

| Divergence | Likely Cause | Fix |
|------------|-------------|-----|
| Top-down >> Bottom-up | Top-down percentages too optimistic, or bottom-up too narrow | Reduce top-down percentages, widen bottom-up customer count |
| Bottom-up >> Top-down | Bottom-up price or customer count unrealistic, or top-down missing a segment | Validate price sensitivity, check customer count assumptions |
| Within 2x | Both methods are reasonable | Use average or weighted average |

### Reconciliation Table

| Metric | Top-Down | Bottom-Up | Value-Theory | Adopted |
|--------|----------|-----------|--------------|---------|
| TAM | $1.18B | $240M | $1.04B | $820M (avg of 3) |
| SAM | $360M | $84M | — | $220M (avg of 2) |
| SOM | $120M (10% SAM) | $16.8M | — | $35M (blended) |

### Confidence Scoring

Score each estimate component on confidence:

| Component | Confidence | Rationale |
|-----------|------------|-----------|
| Industry TAM ($8B) | High (80%) | Gartner 2024 report, established market |
| SMB segment (35%) | Medium (60%) | Gartner segment definition, may overlap |
| Price ($420/yr) | High (90%) | Validated with 50 pilot customers |
| Addressable customers (500K) | Medium (70%) | Census data, but includes non-software buyers |
| Penetration (8%) | Low (40%) | No comparable product benchmark |

Overall confidence: (80% × 60% × 90% × 70% × 40%) ^ (1/5) = 65%

When overall confidence is < 60%, present as a range not a single
number: "$25M-$50M SOM" rather than "$35M SOM."

## Sizing Templates

### B2B SaaS Template

```markdown
## Market Sizing: {Product Name}

### Top-Down
| Step | Value | Source |
|------|-------|--------|
| Industry TAM | ${amount} | {Report name, year} |
| × Segment share | {n}% | {Rationale} |
| × Region share | {n}% | {Rationale} |
| × Delivery share | {n}% | {Rationale} |
| = TAM | ${amount} | |
| × SAM % of TAM | {n}% | {Rationale} |
| = SAM | ${amount} | |
| × SOM % of SAM | {n}% | {Rationale: team capacity, funding, growth rate} |
| = SOM | ${amount} | |

### Bottom-Up
| Step | Value | Source |
|------|-------|--------|
| Annual price per customer | ${amount} | Pricing page |
| × Target customers | {count} | Census data / industry reports |
| = Addressable revenue | ${amount} | |
| × Expected penetration | {n}% | {Benchmark against comparable products} |
| = SOM | ${amount} | |
| × Market expansion factor | {n}x | {SAM/SOM ratio from top-down} |
| = SAM | ${amount} | |
| × Total market factor | {n}x | {TAM/SAM ratio from top-down} |
| = TAM | ${amount} | |
```

### Consumer Market Template

```markdown
## Market Sizing: {Consumer Product}

### Top-Down
| Step | Value | Source |
|------|-------|--------|
| Total population | {n}M | {Census source} |
| × Target demographic | {n}% | {Age, income, geography filter} |
| × Smartphone ownership | {n}% | {Pew/Statista} |
| × Category adoption rate | {n}% | {Comparable app category penetration} |
| = Potential users | {n}M | |
| × Revenue per user (ARPU) | ${amount} | {Pricing or ad revenue model} |
| = TAM | ${amount} | |

### Bottom-Up
| Step | Value | Source |
|------|-------|--------|
| Expected downloads (year 1) | {n}K | {Marketing budget × CPI benchmark} |
| × Conversion to registered | {n}% | {Industry benchmark for category} |
| × Conversion to paid | {n}% | {Industry freemium conversion rate} |
| = Paying users | {n} | |
| × ARPU | ${amount} | |
| = Year 1 revenue | ${amount} | |
```

## Market Sizing Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Arbitrary percentages | "We'll capture 10% of a $10B market" | Explain why 10%, not 1% or 20%. Reference team size, funding, growth trajectory. |
| Ignoring competition | TAM assumes no competitors exist | Factor in that competitors already serve portions of the market. Your SAM and SOM should exclude segments already saturated. |
| Price optimism | $100/mo for a simple habit tracker | Validate pricing with willingness-to-pay surveys. Consumer apps often monetize at $5-10/mo. |
| Global TAM for local product | $10B TAM but only selling in Germany | Apply geography filter from the start. A German-only product's TAM is Germany's share of the global market. |
| No source for TAM base | "The market is $5B (source: my assumption)" | Every number must cite a source. If no analyst report exists, use comparable company revenue. |
| Timing blindness | TAM assumes today's market size, but product launches in 2 years | Project market growth: "expected to grow at 12% CAGR to $15B by 2027." |
| Including non-buyers | "All 300M US adults" | Most adults do not buy project management software. Apply realistic buyer filters. |
