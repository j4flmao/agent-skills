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

## Expanded Decision Trees

### Price Change Strategy Decision Tree
```
Why are you changing prices?
  |-- Costs increased → Communicate cost-based justification; consider modest increase
  |-- Product value increased → Value-based increase with feature/improvement narrative
  |-- Competitive repositioning → Strategic change with clear positioning message
  |-- Revenue growth needed → Segment-sensitive increase; test before rolling out

Who is affected by the price change?
  |-- New customers only → Implement immediately; no grandfathering needed
  |-- Existing customers → Grandfather current customers for X months
  |     |-- Voluntary migration → Offer incentive to switch to new pricing
  |     |-- Forced migration → Communicate with value justification; set effective date

What is the magnitude of change?
  |-- <10% increase → Communicate as routine adjustment
  |-- 10-25% increase → Segment rollout with clear value messaging
  |-- >25% increase → Staged rollout with grandfathering; expect churn
  |-- Price decrease → Use as competitive move; time-limited to create urgency
```

### Discount Strategy Decision Tree
```
What is the customer's situation?
  |-- New customer, first purchase → New customer discount (10-20% first term)
  |-- Annual commitment → Standard annual discount (15-20%)
  |-- Competitive threat → Competitive discount (match or slightly beat competitor price)
  |-- Expansion / upsell → Volume discount or multi-year commitment discount
  |-- Non-profit / education → Pre-defined discount tier (25-50%)
  |-- Churn risk → Retention discount (must be time-limited)

Is the discount pre-approved in the discount matrix?
  |-- YES → Apply within approved limits
  |-- NO → Does it meet exception criteria?
        |-- YES → Escalate with business justification
        |-- NO → Do not offer; hold at standard price
```

### Packaging Tiers Strategy Decision Tree
```
How many customer segments do you serve?
  |-- 1 segment → Single plan (flat-rate or usage-based) with clear value metric
  |-- 2-3 segments → 3 tiers (Good-Better-Best with distinct segments per tier)
  |-- 4+ segments → 3-4 tiers with clear segment targeting; consider custom for largest

What is the price sensitivity across segments?
  |-- High variance (SMB vs Enterprise) → Tiered with large price jumps between tiers
  |-- Low variance (all similar size) → Usage-based or flat-rate with minimal tiers

Is there a clear upgrade path?
  |-- YES (features naturally graduate) → Feature-based tiering with clear limits
  |-- NO (usage scales independently) → Usage-based pricing with tiered limits
```

## Templates

### Discount Matrix Template
```
# Discount Matrix: {Product}

| Scenario | Discount % | Approval Required | Documentation Needed |
|----------|-----------|-------------------|---------------------|
| Annual commitment | 15-20% | None (standard) | N/A |
| First-year introductory | 10-15% | Sales manager | Customer type |
| Competitive win-back | 20-30% | Sales director | Competitor quote |
| Volume (50+ seats) | 15-25% | Sales manager | Seat count |
| Non-profit / Education | 25-50% | Account manager | Tax-exempt status |
| Multi-year (2yr+) | 20-30% | Sales director | Contract length |
| Churn retention | 10-25% | CS manager | Churn risk assessment |
| Strategic partnership | Custom | VP Sales | Business case |

## Discount Rules
- No discount >50% without CEO approval
- Discounts must be documented in CRM
- Max 20% discount without a time limit (all high discounts must expire)
- Discounts cannot be stacked (only one discount per transaction)
```

### Pricing Calculator Template
```
# Pricing Calculator: {Product}

## Inputs
| Input | Value | Notes |
|-------|-------|-------|
| Target segments | {segments} | |
| Users per segment | {count} | |
| WTP (P50) | ${amount}/mo | From market research |
| WTP (P25 / P75) | ${amount} / ${amount} | Sensitivity range |
| COGS per user | ${amount}/mo | Infrastructure + support + payment fees |
| CAC (average) | ${amount} | Blended across channels |
| Monthly churn rate | {%} | Current or target |
| Discount rate | {%} | For LTV calculation |

## Outputs
| Tier | Price | Users | Revenue | Gross Margin | LTV | LTV/CAC |
|------|-------|-------|---------|-------------|-----|---------|
| Free | $0 | {n} | $0 | — | — | — |
| Pro | ${X} | {n} | ${rev} | {%} | ${ltv} | {ratio} |
| Enterprise | ${Y} | {n} | ${rev} | {%} | ${ltv} | {ratio} |

## Scenario Analysis
| Scenario | Price | Users | Revenue | LTV/CAC |
|----------|-------|-------|---------|---------|
| Base case | {price} | {n} | ${rev} | {ratio} |
| Price +20% | {price} | {n-adj} | ${rev} | {ratio} |
| Price -20% | {price} | {n+adj} | ${rev} | {ratio} |
| Churn +20% | {price} | {n} | ${rev} | {ratio} |

## Breakeven Analysis
Months to recover pricing change costs: {months}
Volume needed to offset price decrease: {% increase}
```

### Pricing Page A/B Test Plan Template
```
# Pricing Page Test: {Test Name}

## Hypothesis
If we {change} on the pricing page, then {metric} will {direction} by {amount} because {reason}.

## Variants
Control: {current pricing page description}
Variant A: {change A}
Variant B: {change B (optional)}

## Primary Metrics
- Conversion rate (visitor → trial/purchase)
- Average revenue per visitor
- Plan mix (% choosing each tier)

## Secondary Metrics
- Bounce rate on pricing page
- Time on pricing page
- FAQ section engagement
- Support tickets about pricing

## Guardrail Metrics
- Trial-to-paid conversion rate (should not decrease)
- Churn rate (30d after signup — should not increase)
- Support volume related to billing (should not increase)

## Duration
Minimum: 2 weeks (or until statistical significance reached)
Maximum: 4 weeks

## Segmentation
- New visitors vs returning
- By traffic source
- By device type
```

### Grandfathering Communication Template
```
# Pricing Change Communication Plan

## Customers Affected
{segment description}

## Messages

### New Customers
"We've updated our pricing to reflect new features: [features]. New pricing effective [date]."

### Existing Customers (Grandfathered)
"No action needed. You'll continue at your current rate for [time period]. Upgrade anytime to access new features at new pricing."

### Voluntary Migration Offer
"Switch to our new plans and get [incentive: 3 months at current rate, extra feature, dedicated support]."

## Timeline
| Date | Action | Owner |
|------|--------|-------|
| {date} | Announce to internal teams | Product |
| {date} | Email existing customers | Customer success |
| {date} | Update public pricing page | Marketing |
| {date} | New pricing effective | Engineering |

## Risk Mitigation
- Monitor churn rate daily during transition (2 weeks before, 2 weeks after)
- Set up alert for >20% increase in billing-related support tickets
- Have escalation path for customer complaints
- Prepare retention discount for churn-risk customers
```

## Expanded Case Studies

### Case Study 4: Usage-Based Pricing in B2B SaaS
A B2B document generation API had flat-rate pricing at $199/month with a 5-document limit. Analysis showed: 60% of customers used 1-2 documents/month (overpaying), 30% used 3-5 (good fit), 10% exceeded the limit monthly (frustrated). Customer feedback indicated the flat fee was a barrier for evaluation.

New model: $29/month base + $10 per document. Light users saw 50-85% savings. Heavy users paid more but usage was predictable with a price cap at $199/month for unlimited. Results: signups increased 140% (low barrier). Light user churn reduced 45%. Heavy user revenue increased 35%. Overall revenue increased 28% due to volume growth.

### Case Study 5: Enterprise Tier as Growth Driver
A B2B collaboration tool had two tiers: Free ($0) and Pro ($12/user/month). Enterprise sales were ad-hoc with no published pricing. The team created a published Enterprise tier at $35/user/month with SSO, advanced admin, audit logs, and SLA. Enterprise tier was positioned as the anchor.

Impact: Pro tier conversion increased 18% (decoy effect). Enterprise direct sales increased 40% (published pricing reduced sales friction). 15% of new Pro signups came from organizations that would eventually upgrade to Enterprise. The Enterprise anchor made Pro feel like a safe, reasonable choice.

### Case Study 6: Annual vs Monthly Optimization
A SaaS analytics company tested annual vs monthly billing presentation. Control: monthly shown first with annual toggle. Variant A: annual shown first with monthly toggle. Variant B: both shown side-by-side with "save 20%" callout on annual.

Results: Variant A (annual first) increased annual adoption from 28% to 47%. This improved cash flow (12 months upfront) and reduced churn (annual customers churn 40% less). Total LTV increased 23% despite the 20% discount. Key learning: annual billing is not just a discount — it's a commitment mechanism that improves retention.

## Expanded Economic Model

### Unit Economics Sensitivity Table
| Variable | Base | +10% | -10% | Impact on ARPU |
|----------|------|------|------|----------------|
| Price | $29 | $32 | $26 | ±10% |
| Conversion rate | 5% | 5.5% | 4.5% | ±10% |
| Churn rate | 5%/mo | 4.5%/mo | 5.5%/mo | ∓10% on LTV |
| CAC | $150 | $135 | $165 | ±10% on payback |
| Free-to-paid conversion | 4% | 4.4% | 3.6% | ±10% on paying users |

### Pricing Viability Scorecard
| Factor | Weight | Score (1-5) | Weighted | Notes |
|--------|--------|-------------|----------|-------|
| Value metric alignment | 20% | | | Does price scale with value? |
| Customer affordability | 15% | | | Is price within WTP range? |
| Competitive position | 15% | | | Is price competitive? |
| Margin adequacy | 15% | | | Is gross margin >70%? |
| Simplicity/comprehension | 15% | | | Can customers understand pricing? |
| Upgrade path clarity | 10% | | | Is upgrade path obvious? |
| LTV/CAC health | 10% | | | Is LTV/CAC >3x? |

Threshold: >4.0 = Ready to launch, 3.0-4.0 = Revise, <3.0 = Redesign pricing

## Pricing Governance

### Pricing Review Cadence
| Frequency | Activity | Participants | Output |
|-----------|----------|--------------|--------|
| Monthly | Competitor pricing check | Product marketing | Competitive pricing update |
| Quarterly | Pricing performance review | Product + Finance + Sales | Pricing adjustment recommendations |
| Annually | Full pricing strategy review | Leadership + Product | Pricing strategy refresh or confirmation |
| Event-driven | Response to market change | Product + Leadership | Reactive pricing adjustment plan |

### Pricing Change Approval Matrix
| Change Type | Approval Needed | Notice Period | Customer Communication |
|------------|----------------|---------------|----------------------|
| New tier added | Product lead | Immediate | Optional |
| Price increase <10% | Product + Finance | 30 days | Email + in-app |
| Price increase 10-25% | VP Product + CFO | 60 days | Email + in-app + blog |
| Price increase >25% | CEO + Board | 90 days | Full communication plan |
| Price decrease | Product + Finance | Immediate | Marketing campaign |
| Discount policy change | Sales + Finance | 30 days | Sales team training |

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
