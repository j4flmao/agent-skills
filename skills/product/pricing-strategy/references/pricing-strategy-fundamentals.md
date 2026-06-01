# Pricing Strategy Fundamentals

## Overview
Pricing strategy determines how a product captures value from the market. Effective pricing aligns the price customers pay with the value they receive, optimizing conversion, retention, and revenue. Pricing is not just a number — it is a strategic tool that signals product positioning, segments the market, and drives customer behavior.

## Core Concepts

### Concept 1: Value-Based Pricing
Value-based pricing sets price based on the perceived value to the customer, not cost-plus (cost + margin) or competitive benchmarking (match competitors). Customers don't care what it costs you to build the product — they care what it's worth to them. Value-based pricing requires understanding customer willingness to pay, segmenting by value perception, and communicating value effectively.

### Concept 2: The Value Metric
The value metric is what customers are actually paying for. It must: increase as customer value increases, be predictable for customers, be controllable by customers, feel fair, and be simple to understand. Common value metrics: per seat (collaboration tools), per active user (engagement tools), consumption (API calls, storage), per entity (projects, documents). The right value metric aligns vendor revenue with customer success.

### Concept 3: Packaging Architecture
Most SaaS products use good-better-best packaging: Free (top-of-funnel, demonstrates core value), Pro (main revenue driver), Enterprise (anchors value, rarely purchased). Each tier has distinct features, limits, and target segment. The decoy effect makes the middle tier more attractive by comparison to the top tier.

### Concept 4: Willingness to Pay (WTP)
WTP is the maximum price a customer segment is willing to pay for the product. It varies by segment: enterprises pay more than SMBs, power users pay more than casual users. WTP is not a single number — it's a distribution with P10, P50, P90 values. Research WTP before setting prices using Van Westendorp, Gabor-Granger, or conjoint analysis.

### Concept 5: Pricing is a Hypothesis
Every price is a hypothesis that must be tested. The right price is not discovered through analysis alone — it requires experimentation. Launch with the best estimate based on WTP research, then test price elasticity through A/B tests, tier adjustments, and annual price changes.

## Pricing Models

### Model Types
| Model | Predictability | Scalability | Customer Alignment | Complexity |
|-------|---------------|-------------|-------------------|------------|
| Flat-rate | High | Low | Low | Minimal |
| Per-seat | High | Medium | Medium | Low |
| Tiered | Medium | Medium | Medium | Medium |
| Usage-based | Low | High | High | High |
| Hybrid (base + usage) | Medium | High | High | Medium |
| Freemium | Medium | N/A | Medium | Medium |

### Model Selection Guide
Is value per-user or per-usage? Per-user → Per-seat or per-active-user pricing. Per-usage → Can customers predict usage? Yes → Usage-based pricing. No → Hybrid (base + usage cap).

## Value Metric Identification

### Evaluation Criteria
| Criterion | Question | Weight |
|-----------|----------|--------|
| Aligned with value | Does the metric increase as customer value increases? | High |
| Predictable | Can customers forecast their bill? | High |
| Controllable | Can customers influence the metric? | Medium |
| Fair | Do heavy users pay more? | Medium |
| Simple | Can customers understand the metric? | High |
| Scalable | Does the metric work across segments? | Medium |

### Common Value Metrics
- Collaboration: active users — value grows with team adoption
- API/data: API calls or data volume — directly tied to usage
- Storage: GB stored — clear, fair consumption metric
- Project tools: active projects — value per project work
- Communications: messages sent — core value transaction

## Packaging Design

### Tier Architecture
Three tiers is the standard for SaaS. Free tier: limited features, demonstrates core value, drives top-of-funnel adoption. Pro tier: full features for individuals or teams, main revenue driver. Enterprise tier: advanced features, SSO, SLA, premium support, anchors value perception.

### Feature Gating Principles
Gate features that drive upgrade motivation (limits, advanced functionality, collaboration, integrations). Do NOT gate core value — if the free tier can't demonstrate why the product is useful, users won't upgrade. Feature graduation: each tier adds meaningful capabilities, not just more of everything.

### Decoy Effect
Adding a premium option at a high price makes the middle option feel more reasonable. Example: Standard $29/mo, Premium $99/mo, Enterprise $199/mo. Few customers buy Enterprise, but its presence increases Premium conversion by 22% on average.

## Willingness to Pay Research

### Research Methods
| Method | Description | Sample Required | Output |
|--------|-------------|-----------------|--------|
| Van Westendorp | 4 price sensitivity questions | 50-100 per segment | Acceptable price range, optimal price point |
| Gabor-Granger | "Would you buy at $X?" iterated | 100-300 per segment | Demand curve, price elasticity |
| Conjoint analysis | Feature-price trade-off survey | 200-500 per segment | Feature importance, price sensitivity |

## Pricing Page Optimization

### Key Elements
- Three tiers with enterprise anchor
- Annual/monthly toggle with savings callout
- Most popular tier visually highlighted
- Feature comparison matrix with checkmarks and limits
- FAQ addressing common objections
- Social proof (customer logos, testimonials)
- Risk reversal (money-back guarantee, free trial)

## Key Points
- Price reflects customer value, not cost — value-based pricing is the standard
- Value metric must align vendor revenue with customer success
- Three tiers (good-better-best) is the standard packaging architecture
- Decoy effect makes middle tier more attractive
- WTP varies by segment — research it before setting prices
- Pricing is a hypothesis — test it through experimentation
- Never gate core value behind a paywall
- Feature gating should motivate upgrade, not frustration
- Annual discount of 15-20% incentivizes commitment
- Grandfather existing customers on price changes
- Maximum 4 pricing tiers to avoid choice paralysis
- Monitor competitor pricing quarterly but don't automatically match
- Usage-based pricing needs caps and alerts to prevent bill shock
- Enterprise tier exists to anchor value perception, not to sell
- Communication of price changes must include value narrative
