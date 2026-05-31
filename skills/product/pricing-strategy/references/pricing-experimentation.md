# Pricing Experimentation

## Experimentation Framework

Pricing experimentation is the systematic testing of pricing strategies, models, and page designs to optimize revenue, conversion, and customer satisfaction. Unlike feature A/B testing, pricing experiments carry direct revenue risk and require careful design.

### Pricing Experiment Lifecycle

```
Generate Hypothesis
  ↓
Assess Risk and Impact
  ↓
Design Experiment
  ↓
Get Stakeholder Buy-in
  ↓
Implement Technical Changes
  ↓
Monitor Guardrail Metrics
  ↓
Run Experiment
  ↓
Analyze Results
  ↓
Decide: Implement / Iterate / Revert
  ↓
Communicate Changes
```

### Types of Pricing Experiments

| Experiment Type | Risk Level | Duration | Typical Impact |
|----------------|------------|----------|----------------|
| Price point test (small change) | Medium | 2-4 weeks | +2-10% revenue |
| Price point test (large change) | High | 4-8 weeks | +5-25% revenue or -10-30% |
| Tier structure change | High | 4-12 weeks | +5-30% revenue |
| Feature gating change | Medium | 4-8 weeks | +5-20% upgrade rate |
| Pricing page layout | Low | 2-4 weeks | +5-15% conversion |
| Annual discount % test | Low | 4-8 weeks | +10-20% annual mix |
| Free trial length | Medium | 4-12 weeks | +10-30% trial conversion |
| Currency/presentation | Low | 2-4 weeks | +2-5% international conversion |
| Add-on pricing | Medium | 4-8 weeks | +5-15% ARPU |
| Freemium limits | Medium | 4-8 weeks | +5-20% free-to-paid conversion |

### Hypothesis Generation

Good pricing hypotheses come from:

| Source | Example Question | Example Hypothesis |
|--------|-----------------|-------------------|
| Usage data | Which users use which features? | "Gating advanced analytics will drive 20% of Pro users to Enterprise" |
| Customer feedback | What do customers complain about? | "Reducing price will decrease churn by 10%" |
| Competitor analysis | How do competitors price? | "Adding a free tier will increase signups by 50%" |
| WTP research | What are users willing to pay? | "Increasing price from $29 to $39 will decrease conversion by <5% but increase revenue by 25%" |
| Behavioral economics | What cognitive biases apply? | "Adding a $199 decoy tier will increase $49 tier selection by 15%" |
| Cohort analysis | How do different segments behave? | "Enterprise prospects need SSO; adding it at Pro will cannibalize Enterprise" |

Hypothesis template:
```
We believe that [change] for [segment/users] will [expected outcome] because [reason].
We will measure success by [metric] and guard against [risk] by [counter metric].
```

## Experiment Design

### Experiment Types

**A/B Test (Two Variants):**
- 50% control, 50% treatment
- Simplest, most statistically powerful
- Best for: price changes, page layout, feature gating

**A/B/C Test (Three+ Variants):**
- Smaller per-variant sample
- Requires more total traffic
- Correction for multiple comparisons
- Best for: testing multiple price points simultaneously

**Switchback Experiment:**
- Alternate between control and treatment over time
- Controls for time-based confounding
- Best for: when user-level randomization is not possible (e.g., marketplace pricing)

**Holdout Test:**
- Small percentage doesn't get the change
- Measures long-term effects
- Best for: high-risk changes where you want to measure retention impact

### Statistical Considerations

| Parameter | Recommendation | Rationale |
|-----------|---------------|-----------|
| Significance level (alpha) | 0.05 | 5% chance of false positive (Type I error) |
| Statistical power (1-beta) | 0.80 | 80% chance of detecting true effect |
| Minimum detectable effect | 5-10% relative change | Smaller effects require exponentially larger samples |
| Minimum runtime | 2 weeks minimum | Captures weekly cycles; avoids novelty effect |
| Weekdays included | Must include full weeks | Weekday/weekend behavior differs |
| Segments analyzed | Pre-register segments | Avoids post-hoc cherry-picking |
| Multiple comparisons correction | Bonferroni or Holm | Adjusts for testing multiple metrics |

### Sample Size Calculation

Sample size depends on: baseline conversion rate, minimum detectable effect, significance level, and power.

Approximate sample sizes per variant for a 2-week experiment:

| Baseline Rate | MDE (Relative) | N per Variant | Total N |
|--------------|----------------|---------------|---------|
| 5% | 20% (1 pp) | 33,000 | 66,000 |
| 5% | 10% (0.5 pp) | 135,000 | 270,000 |
| 10% | 20% (2 pp) | 18,000 | 36,000 |
| 10% | 10% (1 pp) | 73,000 | 146,000 |
| 20% | 20% (4 pp) | 10,000 | 20,000 |
| 20% | 10% (2 pp) | 41,000 | 82,000 |
| 50% | 20% (10 pp) | 4,000 | 8,000 |
| 50% | 10% (5 pp) | 16,000 | 32,000 |

### Novelty Effect

When users first see a price change, behavior may be unusual:
- Price increases: immediate negative reaction (dip), then recovery as users adapt
- Price decreases: immediate positive reaction (spike), then normalization
- New tier: initial exploration, then settling

Mitigation:
- Run experiments minimum 2 weeks (preferably 4)
- Track week-over-week metric stability
- Analyze by user tenure (new vs existing)
- Use holdout groups for long-term effects

## Risk Management

### Revenue Risk Assessment

| Risk Level | Description | Examples |
|------------|-------------|----------|
| Low | Reversible immediately, affects few users | Pricing page layout, CTA text |
| Medium | Reversible within days, affects subset | Feature gating, add-on pricing |
| High | Permanent impact on pricing perception | Price increase, tier restructure |
| Very High | Long-term brand and trust impact | Major pricing model change (e.g., per-seat to usage-based) |

### Risk Mitigation Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| Phased rollout | Gradually increase treatment % | High-risk changes |
| Grandfathering | Existing customers keep old pricing | Price increases, model changes |
| Holdout group | 5-10% don't get change | Measuring long-term effects |
| One-cell test | Test on new visitors only | Avoiding impact on existing customers |
| Market-specific test | Test in one region first | International pricing changes |
| Time-bound test | Test for limited period with known end | Temporary promotions |
| Reversibility check | Ensure change can be rolled back instantly | Always |
| Customer communication plan | Proactive messaging about change | Any visible change |

### Guardrail Metrics

For every pricing experiment, monitor:

| Guardrail | Why | Alert Threshold |
|-----------|-----|-----------------|
| Overall revenue | Revenue must not decline unacceptably | >5% decline from baseline |
| Conversion rate | Should not destroy top-of-funnel | >10% decline from baseline |
| Support tickets | Price confusion causes support volume | >20% increase from baseline |
| Churn rate | Pricing changes should not increase churn | >15% increase from baseline |
| Customer satisfaction | NPS or CSAT should not decline | >10% decline from baseline |
| Refund rate | Dissatisfaction leading to refunds | >50% increase from baseline |
| Payment failures | Technical issues with new pricing | >100% increase from baseline |

## Experiment Implementation

### Technical Implementation

```javascript
// Pricing experiment assignment
const pricingExperiment = {
  name: 'new-pricing-2025',
  variants: {
    control: { price: 29, annualDiscount: 0.17 },
    treatment: { price: 39, annualDiscount: 0.20 },
  },
};

function getPricingVariant(userId) {
  // Consistent assignment based on user ID hash
  const hash = hashCode(userId + pricingExperiment.name);
  const variant = hash % 100 < 50 ? 'control' : 'treatment';
  return pricingExperiment.variants[variant];
}

// Track experiment enrollment
analytics.track('pricing_experiment.viewed', {
  experiment: pricingExperiment.name,
  variant: currentVariant,
  page: 'pricing',
});

// Track conversion with experiment context
analytics.track('pricing_experiment.conversion', {
  experiment: pricingExperiment.name,
  variant: currentVariant,
  plan: selectedPlan,
  price: selectedPrice,
});
```

### Server-Side Pricing Configuration

```javascript
const pricingConfig = {
  experiments: {
    'tier-structure-2025': {
      status: 'running',
      variants: {
        control: {
          tiers: [
            { name: 'Starter', price: 19, users: 1, projects: 5 },
            { name: 'Pro', price: 49, users: 5, projects: 50 },
            { name: 'Enterprise', price: 199, users: null, projects: null },
          ],
        },
        treatment: {
          tiers: [
            { name: 'Free', price: 0, users: 1, projects: 2 },
            { name: 'Pro', price: 59, users: 10, projects: 100 },
            { name: 'Enterprise', price: 249, users: null, projects: null },
          ],
        },
      },
      assignment: 'user_id_hash',
      startDate: '2025-01-15',
      endDate: '2025-02-15',
    },
  },
};
```

### Experiment Management System

```javascript
class PricingExperimentManager {
  constructor() {
    this.experiments = new Map();
  }

  registerExperiment(config) {
    this.experiments.set(config.name, {
      ...config,
      status: 'draft',
      results: null,
    });
  }

  startExperiment(name) {
    const exp = this.experiments.get(name);
    if (!exp) throw new Error(`Experiment ${name} not found`);

    exp.status = 'running';
    exp.startDate = new Date();

    analytics.track('experiment.started', {
      experiment: name,
      variants: Object.keys(exp.variants),
      startDate: exp.startDate,
    });
  }

  stopExperiment(name) {
    const exp = this.experiments.get(name);
    exp.status = 'stopped';
    exp.endDate = new Date();

    this.analyzeResults(name);
  }

  analyzeResults(name) {
    const exp = this.experiments.get(name);
    const results = {};

    for (const [variant, config] of Object.entries(exp.variants)) {
      const events = analytics.query({
        event: 'pricing_experiment.conversion',
        filters: {
          experiment: name,
          variant: variant,
        },
        dateRange: [exp.startDate, exp.endDate],
      });

      results[variant] = {
        impressions: events.impressions,
        conversions: events.conversions,
        conversionRate: events.conversions / events.impressions,
        revenue: events.revenue,
        averageOrderValue: events.revenue / events.conversions,
      };
    }

    exp.results = results;
    return results;
  }

  checkGuardrails(name) {
    const exp = this.experiments.get(name);
    const violations = [];

    for (const [metric, threshold] of Object.entries(exp.guardrails)) {
      const currentValue = this.getMetricValue(metric);
      const baselineValue = this.baselines[metric];

      if (currentValue < baselineValue * threshold.min || currentValue > baselineValue * threshold.max) {
        violations.push({
          metric,
          current: currentValue,
          threshold,
          severity: threshold.severity,
        });
      }
    }

    return violations;
  }
}
```

## Analysis and Decision Framework

### Result Interpretation

| Scenario | Interpretation | Decision |
|----------|---------------|----------|
| Statistically significant positive | Treatment works with high confidence | Implement treatment |
| Statistically significant negative | Treatment harms metrics | Revert, analyze why |
| Not significant, trend positive | Inconclusive but promising | Continue test or increase sample |
| Not significant, trend negative | Inconclusive but concerning | Stop, analyze, don't implement |
| Flat (no difference) | Change doesn't matter | Either variant fine; pick simpler |

### Segment Analysis

Always analyze results by key segments:

| Segment | Why Analyze Here | Expected Difference |
|---------|------------------|-------------------|
| New vs existing customers | Price sensitivity differs | Existing customers more sensitive to increases |
| Free vs paid users | Conversion behavior differs | Free users more sensitive to price |
| By plan tier | Each tier has different value perception | Lower tiers more price-sensitive |
| By acquisition channel | Channel signals intent | Paid channel users often convert at different rates |
| By geography | Purchasing power differs | Emerging markets more price-sensitive |
| By company size | Budget differs | Enterprise less price-sensitive |
| By device | Presentation differences | Mobile users may convert differently |

### Decision Documentation

```
Experiment Name: {name}
Hypothesis: {statement}
Duration: {start} to {end}
Total Participants: {N}

Results:
| Metric | Control | Treatment | Lift | Significance | Decision |
|--------|---------|-----------|------|--------------|----------|
| Conversion | {X%} | {Y%} | {Z%} | {p-value} | {approve/reject} |
| Revenue/user | {X} | {Y} | {Z%} | {p-value} | {approve/reject} |
| Churn | {X%} | {Y%} | {Z%} | {p-value} | {approve/reject} |

Segment Analysis:
| Segment | Control | Treatment | Lift | Note |
|---------|---------|-----------|------|------|
| New users | {X%} | {Y%} | {Z%} | {note} |
| Existing users | {X%} | {Y%} | {Z%} | {note} |

Guardrail Check:
- Revenue: {within threshold / violated} — {action}
- Support tickets: {within threshold / violated} — {action}

Decision: {Implement / Revert / Iterate / Continue testing}
Rationale: {reasoning}
Owner: {name}
Next Steps: {actions}
```

## Common Pricing Experiments

### Price Point Testing

Testing different price levels for the same tier.

| Experiment | Control ($) | Treatment ($) | Expected Impact | Risk |
|------------|-------------|---------------|-----------------|------|
| Increase price | 29 | 39 | -15% conversion, +20% revenue | Churn from price-sensitive |
| Decrease price | 29 | 19 | +30% conversion, -10% revenue | Revenue dip, harder to raise later |
| Round number vs precise | 29 | 28 | +5% conversion | Minimal risk |
| Charm pricing | 29 | 27.99 | +3-7% conversion | Minimal risk |
| Annual monthly equiv. | 24/mo annual | 29/mo monthly | +5-10% annual mix | Minimal risk |

### Annual Discount Testing

| Experiment | Control | Treatment | Expected Impact |
|------------|---------|-----------|-----------------|
| Annual discount % | 17% (save 2 months) | 20% (save 2.4 months) | +10% annual mix |
| Annual discount framing | Save $60/year | Get 2 months free | +15% annual mix |
| Annual-only plan | Monthly + annual | Annual only | Higher LTV, lower conversion |
| First-year discount | Standard annual | First year at 30% off | Higher initial conversion |
| Quarterly option | No quarterly | Monthly + quarterly + annual | Flexibility, slight ARPU decrease |

### Feature Gating Experiments

| Experiment | Control | Treatment | Success Metric |
|------------|---------|-----------|----------------|
| Lock advanced analytics in Free | Free has analytics | Free removes analytics | Upgrade rate |
| Add SSO to Pro | SSO only Enterprise | SSO in Pro | Pro conversion |
| Reduce free project limit | 10 projects free | 3 projects free | Free-to-paid conversion |
| Add usage-based overage | Strict tier limits | Overage billing at 10% premium | Revenue from power users |
| Time-based trial | 14-day trial | 30-day trial | Trial conversion rate |

### Pricing Page Experiments

| Experiment | Control | Treatment | Expected Impact |
|------------|---------|-----------|-----------------|
| Tier order | Free, Pro, Enterprise | Enterprise, Pro, Free (anchor) | +10% Pro selection |
| Recommended badge | No badge | Pro tier has "Recommended" | +15% Pro selection |
| Feature comparison | Text list | Visual comparison table | +10% conversion |
| CTA button color | Same color | Different CTA per tier | +5% click-through |
| Social proof placement | No testimonials | Testimonials near price | +10% conversion |
| Money-back guarantee | No guarantee | 30-day guarantee | +15% conversion |
| Usage statistics | No usage shown | "Average team saves X hours" | +10% value perception |

## Legal and Ethical Considerations

### Price Discrimination vs Personalization

| Approach | Description | Risk |
|----------|-------------|------|
| Segment-based pricing | Different prices for different segments (student, enterprise) | Low if transparent |
| Behavioral pricing | Price based on user behavior or history | High (may feel predatory) |
| Geographic pricing | Different prices by region | Medium (expectation varies) |
| Individual pricing | Unique price per user | Very high (trust issue) |
| Time-based pricing | Price varies by time (surge pricing) | Medium (depends on product) |

### Regulatory Compliance

| Regulation | Region | Impact on Pricing |
|------------|--------|-------------------|
| Anti-discrimination laws | Various | May restrict personalized pricing |
| Price display laws | EU, UK | Must include taxes and fees |
| Subscription laws | EU, California | Easy cancellation, auto-renewal disclosure |
| Competition law | Global | No price fixing, collusion |
| Consumer protection | Global | No deceptive pricing practices |
| GDPR | EU | Data used for pricing must have consent |

### Ethical Pricing Guidelines

| Principle | Practice |
|-----------|----------|
| Transparency | Clearly display total price including all fees |
| Fairness | Don't exploit vulnerable customers |
| Consistency | Similar customers should see similar prices |
| Simplicity | Avoid hidden fees, surprise charges |
| Commitment | Honor prices shown during checkout |
| Communication | Notify customers of price changes with adequate notice |
| Grandfathering | Protect existing customers from immediate price increases |

## Advanced Experimentation

### Multi-Variable Testing

Testing multiple pricing variables simultaneously:

```javascript
const experiment = {
  name: 'pricing-optimization-2025',
  factors: {
    price: [29, 39, 49],
    billing: ['monthly', 'annual'],
    tierCount: [2, 3, 4],
    layout: ['columns', 'table'],
  },
  // Full factorial: 3 x 2 x 2 x 2 = 24 variants
  // Fractional factorial reduces to meaningful combinations
};
```

### Conjoint Analysis for Pricing

Conjoint analysis measures how customers value different product attributes including price:

1. Identify relevant attributes (features, limits, support, price)
2. Create choice sets (product profiles with different attribute combinations)
3. Present to respondents (which profile would you choose?)
4. Analyze: part-worth utilities for each attribute level
5. Simulate: predict market share at different price points

Conjoint outputs:
- Price elasticity: how demand changes with price
- Feature importance: which features drive choice
- Optimal price: price that maximizes revenue or adoption
- Segment differences: how preferences vary by customer type

### Van Westendorp Price Sensitivity Meter

The Van Westendorp method asks four questions:

1. At what price would you consider the product to be so expensive that you would never consider buying it? (Too expensive)
2. At what price would you consider the product to be starting to get expensive, but you would still consider it? (Expensive)
3. At what price would you consider the product to be a bargain? (Bargain)
4. At what price would you consider the product to be so cheap that you would question its quality? (Too cheap)

Analysis yields:
- Point of Marginal Cheapness (PMC): intersection of "too cheap" and "bargain"
- Point of Marginal Expensiveness (PME): intersection of "expensive" and "too expensive"
- Optimal Price Point (OPP): intersection of "too cheap" and "too expensive"
- Indifference Price Point (IDP): intersection of "bargain" and "expensive"
- Acceptable price range: PMC to PME

### Gabor-Granger Method

Iterative price testing:

1. Show product description to respondent
2. Ask: "Would you buy this product at $X?" (Yes/No)
3. If Yes: reduce price by increment and ask again
4. If No: increase price by increment and ask again
5. Results: demand curve showing purchase intent at each price point

Limitations:
- Respondents may overstate willingness to buy (hypothetical bias)
- Requires large sample (100-300 per segment)
- Does not measure feature trade-offs (use conjoint for that)
- Best used for establishing initial price range before conjoint

## Templates

### Pricing Experiment Brief Template
```
Experiment Name: {name}
Owner: {name}
Status: {Draft / Running / Analyzing / Complete}

Hypothesis
We believe that [change] will [outcome] because [reason].

Design
- Type: {A/B / A/B/C / Switchback / Holdout}
- Variants: {list all variants with exact pricing details}
- Success Metric: {primary metric}
- Guardrail Metrics: {list}
- Duration: {weeks} ({start} to {end})
- Sample Size: {N per variant}

Technical Implementation
- Assignment: {user_id / anonymous_id / session}
- Platform: {web / mobile / both}
- Tools: {analytics / experimentation platform}
- Rollback Plan: {how to revert}

Risk Assessment
- Risk Level: {Low / Medium / High / Very High}
- Mitigation: {strategies}
- Approval Needed: {list stakeholders}

Stakeholders
- Informed: {list}
- Approvers: {list}
```

### Experiment Review Checklist
```
Pre-Launch:
- [ ] Hypothesis clearly stated
- [ ] Success metric defined
- [ ] Guardrail metrics defined
- [ ] Sample size calculated (sufficient traffic)
- [ ] Minimum duration confirmed (2+ weeks)
- [ ] Assignment mechanism working
- [ ] Tracking implemented and tested
- [ ] Segments pre-registered
- [ ] Risk assessment completed
- [ ] Stakeholders informed
- [ ] Rollback plan documented

During Run:
- [ ] Guardrails monitored daily
- [ ] No peeking at results (pre-registered analysis)
- [ ] Sample ratio check (expected vs actual)
- [ ] Technical issues monitored (tracking failures)
- [ ] External events considered (holidays, outages)

Post-Launch:
- [ ] Statistical significance checked
- [ ] Segment analysis completed
- [ ] Guardrail violations reviewed
- [ ] Decision documented
- [ ] Results shared with stakeholders
- [ ] Change implemented or reverted
- [ ] Experiment archived
```
