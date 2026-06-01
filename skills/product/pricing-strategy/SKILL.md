---
name: product-pricing-strategy
description: >
  Use this skill when defining pricing strategy: value metrics, pricing models, packaging tiers, and pricing page experimentation.
  This skill enforces: value metric identification, pricing model selection, packaging design, willingness-to-pay research.
  Do NOT use for: discounting strategy, enterprise sales negotiation, contract management, revenue recognition.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, pricing, phase-8]
---

# Pricing Strategy Agent

## Purpose
Designs product pricing strategy including value metric identification, model selection, packaging, and willingness-to-pay research. Enables monetization strategy that aligns customer value with business revenue, optimizes conversion across segments, and supports sustainable growth.

## Agent Protocol

### Trigger
Exact user phrases: pricing, pricing strategy, monetization, revenue model, tiered pricing, subscription, freemium.

### Input Context
- What is the product's core value proposition?
- Who are the target customer segments and their willingness to pay?
- What are competitors' pricing models and price points?
- What are the costs of serving customers (COGS)?
- What is the current pricing and its performance?
- What is the customer acquisition cost (CAC) and lifetime value (LTV)?
- What are the business revenue goals and timeline?

### Output Artifact
Pricing strategy document with value metric, pricing model recommendation, tiered packaging, and testing plan.

### Response Format
```
## Pricing Strategy
### Value Metric
{metric}: {what it measures} | Scales with: {usage dimension}

### Pricing Model
{model}: {description}
Base Price: ${amount}/month | Variable: ${amount} per {unit}

### Packaging
Tier: Free | Features: {list} | Price: $0
Tier: Pro | Features: {list} | Price: ${X}/mo
Tier: Enterprise | Features: {list} | Price: ${Y}/mo

### WTP Research
{P10} | {P50} | {P90} willingness to pay per segment

### Testing Plan
{hypothesis} | {test type} | {duration} | {success metric}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Value metric identified and aligned with customer value
- [ ] Pricing model selected with rationale
- [ ] Tiered packaging designed with feature differentiation
- [ ] Price points informed by WTP research
- [ ] Competitive pricing analysis completed
- [ ] Pricing page designed for conversion
- [ ] Testing plan created for pricing validation
- [ ] Migration path for existing customers defined
- [ ] Economic model built with sensitivity analysis
- [ ] Stakeholder buy-in achieved for recommended pricing

### Max Response Length
7000 tokens

## Framework/Methodology

### Value-Based Pricing Framework
Value-based pricing sets price based on perceived value to the customer, not cost-plus or competitive benchmarking.

```
Customer Value → Value Metric → Price Level → Packaging → Testing
     ↓               ↓              ↓             ↓           ↓
WTP Research    Usage Pattern   Competitive    Feature     Experiment
+ Segment       + Value        + Cost         Gating      + Iterate
Analysis        Correlation    Structure      Strategy     + Optimize
```

### Pricing Model Spectrum

| Model | Predictability | Scalability | Customer Alignment | Complexity |
|-------|---------------|-------------|-------------------|------------|
| Flat-rate | High | Low | Low | Minimal |
| Per-seat | High | Medium | Medium | Low |
| Tiered | Medium | Medium | Medium | Medium |
| Usage-based | Low | High | High | High |
| Hybrid (base + usage) | Medium | High | High | Medium |
| Freemium | Medium | N/A | Medium | Medium |

### Economic Model Components
Build a pricing economic model around these inputs:

- Unit economics: CAC, LTV, gross margin, payback period
- Conversion rates: free-to-paid, trial-to-paid, upgrade rate
- Churn rates: by tier, by segment, by tenure
- Volume projections: users at each tier, growth rate

## Workflow

### Step 1: Value Metric Identification
Identify the metric that best captures the value customers receive. Common SaaS value metrics: per seat (collaboration tools), per active user (engagement tools), consumption (API calls, storage), per entity (projects, documents). The value metric should scale naturally with customer success.

Value metric evaluation criteria:

| Criterion | Question | Weight |
|-----------|----------|--------|
| Aligned with value | Does the metric increase as customer value increases? | High |
| Predictable | Can customers forecast their bill? | High |
| Controllable | Can customers influence the metric? | Medium |
| Fair | Do heavy users pay more? | Medium |
| Simple | Can customers understand the metric? | High |
| Scalable | Does the metric work across segments? | Medium |

Value metric candidates common in SaaS:

| Product Type | Value Metric | Why It Works | Risk |
|-------------|--------------|--------------|------|
| Collaboration | Active users | Value grows with team adoption | Can discourage usage |
| Data/API | API calls or data volume | Directly tied to usage | Unpredictable for customers |
| Storage | GB stored | Clear, fair consumption metric | Low margin on data heavy users |
| Project tools | Active projects | Value per project work | Hard to define "active" |
| Communications | Messages sent | Core value transaction | Can cap usage |
| HR/People | Employee count | Scales with company size | Infrequent changes |

### Step 2: Pricing Model Selection
Evaluate models: flat-rate (simple, limited upside), per-seat (scales with team size, can penalize growth), usage-based (aligns with value, unpredictable revenue), tiered (balance of simplicity and flexibility), freemium (low CAC acquisition, must convert). Choose based on product type and market.

Decision matrix for model selection:

```
Is the value per-user or per-usage?
  ├── Per-user → Is team size a value driver?
  │   ├── Yes → Per-seat or per-active-user pricing
  │   └── No → Flat-rate or tiered
  └── Per-usage → Can customers predict usage?
      ├── Yes → Usage-based pricing
      └── No → Hybrid (base + usage cap)
```

### Step 3: Price Level Setting
Conduct willingness-to-pay research via Van Westendorp or Gabor-Granger. Analyze competitive pricing landscape. Consider value-based pricing (price = perceived value, not cost). Set anchor price at the highest tier to make middle tier look reasonable. Test price points before launch.

WTP research methods:

| Method | Description | Sample Required | Output |
|--------|-------------|-----------------|--------|
| Van Westendorp | Price Sensitivity Meter with 4 questions | 50-100 per segment | Acceptable price range, optimal price point |
| Gabor-Granger | "Would you buy at $X?" iterated | 100-300 per segment | Demand curve, price elasticity |
| Conjoint analysis | Trade-off between features and price | 200-500 per segment | Feature importance, price sensitivity |
| Becker-DeGroot-Marschak | Incentive-aligned bidding | 30-50 per segment | True WTP, commitment-consistent |
| Competitor benchmarking | Price mapping against alternatives | Desk research | Competitive position, price corridor |

### Step 4: Packaging Design
Define free tier (limited features, drives adoption and top-of-funnel). Define pro tier (full features for individuals/teams, main revenue driver). Define enterprise tier (advanced features, SSO, SLA, support). Use feature gating that drives upgrade motivation. Avoid gating core value behind paywall.

Packaging architecture principles:

| Principle | Explanation | Example |
|-----------|-------------|---------|
| Good-better-best | Three tiers covering segments | Free → Pro → Enterprise |
| Decoy effect | Middle tier is target, top tier justifies it | Pro at $29, Enterprise at $99 makes Pro feel reasonable |
| Feature graduation | Each tier adds meaningful capabilities | Free: 1 project, Pro: 10 projects, Enterprise: unlimited |
| Value anchor | Top tier anchors perceived value | Enterprise at $999/mo makes $199/mo plan feel affordable |
| Upgrade triggers | Natural friction points that motivate upgrade | File size limits, member caps, export restrictions |
| No core gating | Essential value available at entry tier | Don't put core functionality behind paywall |

### Step 5: Pricing Page Testing
Create pricing page variants for A/B testing. Test monthly vs annual billing (annual = 15-20% discount). Test feature presentation order (most impactful first). Test price anchoring. Run experiments for minimum 2 weeks. Track conversion rate, ARPU, and LTV per pricing page variant.

Experiments to run:

| Hypothesis | Variant | Metric | Duration |
|------------|---------|--------|----------|
| Annual discount increases LTV | 20% annual discount vs monthly | LTV, conversion rate | 4 weeks |
| Price anchoring improves pro conversion | Show enterprise tier | Pro plan conversion | 2 weeks |
| Feature comparison table drives upgrades | Table vs list layout | Upgrade rate | 2 weeks |
| Social proof improves trust | Testimonial on pricing page | Trial signup rate | 2 weeks |
| Money-back guarantee reduces friction | 30-day guarantee text vs none | Conversion rate | 2 weeks |

### Step 6: Migration and Grandfathering
When changing pricing, define migration path for existing customers:

1. Grandfather current customers on existing pricing
2. Offer incentive for voluntary migration (e.g., 3 months at old price)
3. Set effective date for new customer pricing
4. Communicate changes with value justification
5. Monitor churn during transition period

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Underpricing | Setting price too low leaving money on the table | Use WTP research; competitor benchmarking |
| Feature bloat at low tiers | Giving too much value in free/basic tier | Gate features that drive upgrade motivation |
| Confusing value metric | Customers can't understand what they're paying for | Test value metric comprehension with users |
| Ignoring competitor moves | Pricing in a vacuum without market context | Quarterly competitive pricing reviews |
| No usage predictability | Customers fear unpredictable bills | Offer usage caps, notifications, and alerts |
| Frequent price changes | Erodes customer trust | Major changes max 1x per year |
| Discounting without strategy | Erodes perceived value | Pre-defined discount matrix; require justification |
| Over-segmentation | Too many tiers confuse customers | Max 4 tiers; distinct value per tier |
| Not testing pricing | Leaving revenue on the table | Continuous pricing experimentation |
| Bad grandfathering | Churning existing customers | Always grandfather; voluntary migration only |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Price to the value, not the cost | Customers pay for perceived value, not your expenses |
| Test pricing before launch | Reduces risk of wrong price point |
| Annual discount of 15-20% | Incentivizes commitment without feeling punitive |
| Free tier must demonstrate core value | Drives top-of-funnel and word-of-mouth |
| Enterprise tier exists to anchor value | Few customers buy it, but it makes pro tier look reasonable |
| Communicate price changes with value narrative | If you raise prices, explain what increased value justifies it |
| Monitor unit economics per tier | Ensure each profitable tier is actually profitable |
| Review pricing quarterly | Market conditions and product value evolve |
| Train sales team on pricing philosophy | Consistent discounting discipline across deals |
| Use neutral pricing anchors | Compare against competitors, not your own lower tiers |

## Templates & Tools

### Packaging Matrix Template
```
Tier: {Free / Starter / Pro / Enterprise}
Target Segment: {user persona or company size}
Monthly Price: ${amount}
Annual Price: ${amount} (save {X%})

Core Features:
- {Feature}: {free/pro/enterprise} — {why gated here}
- {Feature}: {free/pro/enterprise} — {why gated here}

Limits:
- {Limit type}: {free limit} → {pro limit} → {enterprise limit}

Support:
- {Support level} — {response time SLA}
```

### Pricing Psychology Principles

**Anchoring:** The first price a customer sees becomes their reference point. Display enterprise tier first (highest price) to anchor perceptions. The middle tier then feels reasonable by comparison.

**Decoy effect:** Adding a third option that is clearly worse value than one of the other two makes that option more attractive. Enterprise tier at $199 makes Pro at $29 look like a bargain.

**Left-digit effect:** $29.00 is perceived as significantly less than $30.00. Use $99 not $100. $29 not $30. The leftmost digit has disproportionate psychological impact.

**Loss aversion:** Customers feel losses 2x more than equivalent gains. Frame annual billing as "save $120/year" not "pay $240 upfront." Frame feature limits as "what you'll lose" at lower tiers.

**Fairness perception:** Customers need to feel pricing is fair. Usage-based pricing must have caps and alerts to prevent bill shock. Price increases must be accompanied by value narrative. Grandfathering protects fairness perception during changes.

### Emotional pricing levers:
- **Scarcity:** "Limited-time offer" with real deadline
- **Social proof:** "Join 10,000+ teams on Pro"
- **Risk reversal:** "30-day money-back guarantee"
- **Effort reduction:** "Set up in 5 minutes. No credit card required."
- **Identity:** "For serious professionals" (tier naming matters)

### Economic Model Template
Build a spreadsheet model with these inputs to validate pricing viability:

```
Inputs:
  Target segments: [{segment}, {segment}]
  Estimated users per segment: {N}
  Willingness to pay (P50): ${amount}/month
  COGS per user: ${amount}/month (infrastructure, support, payment processing)
  CAC by channel: {channel}: ${amount}

Outputs:
  Revenue per tier: {tier}: ${amount}/mo/user × {users}
  Gross margin per tier: ({price} - {COGS}) / {price}
  Payback period: CAC / (price - COGS)
  LTV: (price - COGS) / monthly_churn_rate
  LTV/CAC ratio: LTV / CAC

Scenario analysis:
  Base case: {assumptions} → Revenue: ${amount}, LTV/CAC: {ratio}
  Optimistic: {assumptions} → Revenue: ${amount}, LTV/CAC: {ratio}
  Pessimistic: {assumptions} → Revenue: ${amount}, LTV/CAC: {ratio}

Breakeven: {months to recover pricing change costs}
```

Sensitivity: test how revenue changes with ±20% price, ±20% conversion, ±20% churn. The economic model must show viable unit economics in the base case before committing to a pricing structure.

### Pricing Page Optimization Playbook

**Above the fold (must have):**
- Headline with customer value, not features ("Start shipping faster" not "3 plans")
- Three tiers with enterprise anchor
- Most popular tier visually highlighted
- Annual/monthly toggle with savings callout
- Key differentiators between tiers as comparison table

**Below the fold:**
- Feature comparison matrix with checkmarks and limits
- FAQ section addressing objections (what happens when I hit limits? can I downgrade?)
- Social proof (logos of customers on each tier)
- Risk reversal (money-back guarantee, free trial, easy cancellation)
- CTA that matches user intent ("Start free trial" not "Buy now")

**Conversion optimization checklist:**
- Test single-column vs multi-column layout
- Test annual price prominence (show annual first or highlight savings)
- Test feature comparison order (most impactful features first)
- Test social proof placement (near CTA or near feature comparison)
- Test FAQ position (before or after pricing table)
- Test CTA copy (action-oriented vs value-oriented)

### Pricing Page Conversion Metrics

| Metric | Definition | Benchmark |
|--------|------------|-----------|
| Pricing page conversion | % of visitors who sign up for trial/purchase | 2-5% |
| Free-to-paid conversion | % of free users who become paid | 3-10% |
| Trial-to-paid conversion | % of trial users who convert | 15-25% |
| Average revenue per user | Total revenue / total users | Varies widely |
| Average revenue per paying user | Total revenue / paying users | Varies widely |
| Upgrade rate | % of users moving to higher tier | 5-15% quarterly |
| Downgrade rate | % of users moving to lower tier | 2-5% quarterly |

### Pricing Experimentation Tools

| Tool | Use Case | Cost |
|------|----------|------|
| Google Optimize | Pricing page A/B testing | Free |
| VWO | Full-stack experimentation | Paid |
| Amplitude Experiment | Product-wide experiments | Paid |
| Optimizely | Enterprise experimentation | Paid |
| Statsig | Self-serve experiments | Freemium |

## Case Studies

### Case Study 1: Freemium to Tiered Pricing Migration
A project management SaaS with 100K free users and 2K paid users (all at $19/mo flat rate) was leaving revenue on the table. After WTP research with 200 users, they introduced a three-tier structure: Free ($0), Pro ($29/mo), and Business ($99/mo). Existing users were grandfathered. Within 6 months, ARPU increased from $19 to $34, and paying user count grew from 2K to 4.5K.

Method: WTP research (200 respondents), competitive analysis, pricing page A/B test
Key decision: Three-tier good-better-best with strategic feature gating
Impact: ARPU increased 79%, paying users increased 125%

### Case Study 2: Usage-Based Pricing at an API Company
An API company launched with flat-rate pricing at $99/mo. Usage analysis showed 80% of customers used less than 10% of the included API calls, while 5% of customers used 60% of capacity. Switching to usage-based pricing ($0.01 per API call + $29 base) reduced churn among light users by 40% and increased revenue from heavy users by 300%.

Method: Usage data analysis, pricing model simulation
Key insight: Flat-rate pricing was cross-subsidizing heavy users with light user revenue
Impact: Overall revenue increased 35%, churn reduced 25%

### Case Study 3: Decoy Effect in Pricing Page Design
An analytics SaaS tested three pricing page layouts. The original had two tiers ($29 and $99). Adding an Enterprise tier at $199 (with no intention of selling it at that price) increased Pro tier conversion by 22% through the decoy effect. The Enterprise tier was rarely selected but made the Pro tier feel like a better value.

Method: A/B test of pricing page with and without decoy tier
Key insight: Adding a premium anchor changes perceived value of the middle tier
Impact: 22% increase in Pro plan conversion, 12% increase in overall revenue

## Rules
- Value metric must be understandable and predictable for customers.
- Never price below cost of serving the customer.
- Grandfather existing customers on price changes.
- Pricing page must be tested before launch.
- Annual billing must offer meaningful discount (15-20%).
- Feature gating must motivate upgrade, not frustration.
- WTP research must reach minimum 50 responses per segment.
- Price changes must include communicated value justification.
- Maximum 4 pricing tiers to avoid choice paralysis.
- Every tier must have a distinct target segment and use case.
- Free tier must provide genuine value, not a crippled demo.
- Pricing changes max once per quarter for any given segment.
- Discounts must be pre-approved and tracked against a discount matrix.
- Monitor competitor pricing quarterly but do not automatically match.
- Pricing page must include FAQ section addressing common objections.

## References
  - references/packaging-tiers.md — Packaging and Tiers
  - references/pricing-experimentation.md — Pricing Experimentation
  - references/pricing-models.md — Pricing Models
  - references/pricing-strategy-advanced.md — Pricing Strategy Advanced Topics
  - references/pricing-strategy-fundamentals.md — Pricing Strategy Fundamentals
  - references/willingness-to-pay.md — Willingness to Pay (WTP)
  - references/pricing-models-tiering.md — Pricing Models and Tiering
  - references/pricing-experimentation.md — Pricing Experimentation
## Handoff
For growth experiments on pricing, hand off to `product-growth-engineering`. For GTM strategy for new pricing, hand off to `product-go-to-market`.
