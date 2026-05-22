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
Designs product pricing strategy including value metric identification, model selection, packaging, and willingness-to-pay research.

## Agent Protocol

### Trigger
Exact user phrases: pricing, pricing strategy, monetization, revenue model, tiered pricing, subscription, freemium.

### Input Context
- What is the product's core value proposition?
- Who are the target customer segments and their willingness to pay?
- What are competitors' pricing models and price points?
- What are the costs of serving customers (COGS)?
- What is the current pricing and its performance?

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

### Max Response Length
7000 tokens

## Workflow

### Step 1: Value Metric Identification
Identify the metric that best captures the value customers receive. Common SaaS value metrics: per seat (collaboration tools), per active user (engagement tools), consumption (API calls, storage), per entity (projects, documents). The value metric should scale naturally with customer success.

### Step 2: Pricing Model Selection
Evaluate models: flat-rate (simple, limited upside), per-seat (scales with team size, can penalize growth), usage-based (aligns with value, unpredictable revenue), tiered (balance of simplicity and flexibility), freemium (low CAC acquisition, must convert). Choose based on product type and market.

### Step 3: Price Level Setting
Conduct willingness-to-pay research via Van Westendorp or Gabor-Granger. Analyze competitive pricing landscape. Consider value-based pricing (price = perceived value, not cost). Set anchor price at the highest tier to make middle tier look reasonable. Test price points before launch.

### Step 4: Packaging Design
Define free tier (limited features, drives adoption and top-of-funnel). Define pro tier (full features for individuals/teams, main revenue driver). Define enterprise tier (advanced features, SSO, SLA, support). Use feature gating that drives upgrade motivation. Avoid gating core value behind paywall.

### Step 5: Pricing Page Testing
Create pricing page variants for A/B testing. Test monthly vs annual billing (annual = 15-20% discount). Test feature presentation order (most impactful first). Test price anchoring. Run experiments for minimum 2 weeks. Track conversion rate, ARPU, and LTV per pricing page variant.

## Rules
- Value metric must be understandable and predictable for customers.
- Never price below cost of serving the customer.
- Grandfather existing customers on price changes.
- Pricing page must be tested before launch.
- Annual billing must offer meaningful discount (15-20%).
- Feature gating must motivate upgrade, not frustration.
- WTP research must reach minimum 50 responses per segment.
- Price changes must include communicated value justification.

## References
- `references/pricing-models.md` — Pricing model types and when to use them
- `references/packaging-tiers.md` — Tier design and feature packaging strategy

## Handoff
For growth experiments on pricing, hand off to `product-growth-engineering`. For GTM strategy for new pricing, hand off to `product-go-to-market`.
