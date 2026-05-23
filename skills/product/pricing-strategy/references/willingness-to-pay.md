# Willingness to Pay (WTP)

## Measuring WTP

### Research Methods

| Method | Sample Size | Accuracy | Cost | Timeline |
|--------|-------------|----------|------|----------|
| Van Westendorp (PSM) | 200-500 | Medium | Low | 1-2 weeks |
| Conjoint Analysis | 500-2000 | High | High | 3-6 weeks |
| Gabor-Granger | 200-500 | Medium | Low | 1-2 weeks |
| A/B Price Test | 10000+ | Very High | Medium | 2-4 weeks |
| Customer Interviews | 10-30 | Qualitative | Low | 1-2 weeks |

### Van Westendorp Price Sensitivity Meter

#### Survey Questions
```
1. At what price would the product be so expensive
   that you would never consider buying it? (Too expensive)

2. At what price would the product be expensive,
   but you would still consider it? (Expensive)

3. At what price would the product be a bargain? (Cheap)

4. At what price would the product be so cheap
   that you would question its quality? (Too cheap)
```

#### Analysis
```python
def van_westendorp(responses):
    """Calculate optimal price point from survey responses."""
    too_cheap = np.mean(responses["too_cheap"])
    cheap = np.mean(responses["cheap"])
    expensive = np.mean(responses["expensive"])
    too_expensive = np.mean(responses["too_expensive"])
    
    # Point of Marginal Cheapness (PMC)
    pmc = (too_cheap + cheap) / 2
    
    # Point of Marginal Expensiveness (PME)
    pme = (expensive + too_expensive) / 2
    
    # Indifference Price Point (IDP)
    idp = (cheap + expensive) / 2
    
    # Optimal Price Point (OPP)
    opp = (pmc + pme) / 2
    
    return {
        "pmc": pmc,
        "pme": pme, 
        "idp": idp,
        "opp": opp,
        "acceptable_range": (pmc, pme)
    }
```

## Conjoint Analysis

### Attributes for Testing
```yaml
attributes:
  - name: "price"
    levels: ["$9/mo", "$19/mo", "$29/mo", "$49/mo"]
    
  - name: "storage"
    levels: ["10GB", "50GB", "100GB", "500GB"]
    
  - name: "users"
    levels: ["1 user", "5 users", "Unlimited"]
    
  - name: "support"
    levels: ["Email", "Chat", "Phone", "Priority"]
    
  - name: "integrations"
    levels: ["5 integrations", "20 integrations", "Unlimited"]
```

### Interpreting Results
```
Attribute Importance:
  Price: 35%
  Storage: 25%
  Users: 20%
  Support: 12%
  Integrations: 8%

Part-worth utilities (price):
  $9/mo:   +0.8  (most preferred)
  $19/mo:  +0.3
  $29/mo:  -0.2
  $49/mo:  -0.9  (least preferred)
```

## Pricing Psychology

### Anchoring Effects
```
Strategy: Show higher-priced option first to anchor
  Enterprise: $99/mo (anchor)
  Pro: $49/mo (feels reasonable after anchor)
  Free: $0 (feels generous)
```

### Decoy Effect
```
Option A: Pro $49/mo (target)
Option B: Enterprise $99/mo (decoy, makes A look good)
Option C: Pro Plus $59/mo (decoy, similar to A but worse value)
```

## Willingness to Pay by Segment

| Segment | WTP Range | Sensitivity | Key Drivers |
|---------|-----------|-------------|-------------|
| Enterprise | $50-200/mo | Low | Features, support, security |
| SMB | $10-50/mo | Medium | Ease of use, time savings |
| Individual | $0-15/mo | High | Free tier, immediate value |
| Startup | $0-25/mo | Medium | Growth potential, flexibility |

## Price Elasticity

### Calculation
```
Price elasticity = % change in demand / % change in price

Elastic (>1): Demand sensitive to price
  → Consider lowering price or adding value
Inelastic (<1): Demand not sensitive to price
  → Opportunity to raise price
```

### Elasticity by Segment
```
Enterprise: 0.4 (inelastic — can raise prices)
SMB: 1.2 (elastic — be careful with increases)
Individual: 2.1 (very elastic — free tier important)
```

## Testing WTP in Market

### A/B Price Test Design
```yaml
experiment:
  name: "price-optimization-q2"
  variants:
    control: "$19/mo"
    treatment_a: "$24/mo"  # +26%
    treatment_b: "$29/mo"  # +53%
  duration: "4 weeks"
  minimum_conversions: 500 per variant
  metrics:
    primary: "revenue_per_user"
    secondary: ["conversion_rate", "churn_rate", "trial_completion"]
  segments:
    - "acquisition_channel"
    - "company_size"
```

### Decision Framework
```
Raise price if:
  - Conversion rate not significantly affected
  - Revenue per user increases
  - Churn rate unchanged
  - Qualitative feedback acceptable

Hold price if:
  - Conversion drops >10%
  - Revenue per user unchanged
  - Negative feedback from customers

Lower price if:
  - Conversion very low (<1%)
  - Competitors significantly cheaper
  - Market research shows price objection
```
