---
name: product-go-to-market
description: >
  Use this skill when planning product launches: GTM strategy, launch tiers, channel selection, messaging, and beta programs.
  This skill enforces: ICP definition, launch tier classification, channel strategy, messaging and positioning.
  Do NOT use for: paid advertising execution, sales enablement, event planning, PR campaigns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, gtm, phase-8]
---

# Go-to-Market Agent

## Purpose
Designs go-to-market plans for product launches including target market definition, channel selection, launch tiering, messaging, and rollout execution.

## Agent Protocol

### Trigger
Exact user phrases: go-to-market, GTM, product launch, market entry, GTM plan, channel strategy.

### Input Context
- What is the product and its stage (new product, new feature, expansion)?
- Who is the target customer and what is the ideal customer profile (ICP)?
- What is the competitive landscape and market position?
- What channels are available (in-app, email, sales, content, paid)?
- What is the launch timeline and available resources?

### Output Artifact
GTM plan with ICP definition, launch tier, channel strategy, messaging framework, beta program, and execution timeline.

### Response Format
```
## Go-to-Market Plan
### Product: {name} | Stage: {new / feature / expansion}

### ICP
Segment: {description} | Persona: {role} | Company Size: {size}
Pain Point: {primary pain} | Budget: {typical budget}

### Launch Tier: T{1/2/3}
Scope: {scope} | Timeline: {x weeks}

### Channels
Primary: {channel} | Secondary: {channel} | Organic: {channel}

### Messaging
Headline: {value proposition}
Problem: {before} | Solution: {after}

### Beta Program
N: {participants} | Duration: {weeks} | Criteria: {qualification}

### Success Metrics
{metric}: {target} | {metric}: {target}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] ICP defined with demographic and firmographic criteria
- [ ] Launch tier determined with rationale
- [ ] Channel strategy documented with primary and secondary
- [ ] Messaging and positioning framework created
- [ ] Beta program designed with qualification criteria
- [ ] Launch timeline with milestones created
- [ ] Success metrics defined with targets
- [ ] Post-launch review schedule planned

### Max Response Length
7000 tokens

## Workflow

### Step 1: Target Market and ICP Definition
Define ICP with firmographics (company size, industry, revenue), demographics (role, seniority, technical level), and behavioral attributes (current solution, purchase triggers, budget). Validate ICP with existing customer data. Create anti-ICP to define who not to target.

### Step 2: Launch Tier Classification
Classify launch: T1 (major new product — full campaign, all channels, press, events), T2 (significant feature — targeted outreach, in-app, blog, email), T3 (minor feature — in-app notification, changelog, social). Align resources with launch tier.

### Step 3: Channel Selection
Primary channels: sales-led (enterprise, high ACV), product-led (self-serve, low ACV), hybrid (mid-market). Secondary channels: email campaigns, in-app messaging, content marketing, community, partnerships, paid acquisition. Select channels based on ICP reach.

### Step 4: Messaging and Positioning
Define positioning: For {ICP} who {need}, {product} is a {category} that {key benefit}. Differentiate from {competitor} by {differentiator}. Create messaging hierarchy: headline (one-liner), value proposition (3-5 bullet benefits), features (detailed capabilities).

### Step 5: Beta Program
Define beta goals (validation, feedback, case studies, references). Recruit 10-50 beta participants matching ICP. Structure beta: onboarding, feedback cadence, NPS survey, reference call. Offer incentive (extended trial, discount, early access). Run beta for 4-8 weeks.

### Step 6: Launch Execution
Create launch timeline: internal enablement, beta, announcement day, post-launch campaigns, review. Build launch checklist per channel. Monitor real-time metrics. Run post-launch review at 30/60/90 days. Document learnings for next launch.

## Rules
- ICP must be validated with existing customer data before launch.
- Launch tier must match resource allocation.
- Channels must reach the defined ICP, not the broadest audience.
- Beta participants must match ICP to produce relevant feedback.
- Messaging must be tested with target customers before launch.
- Launch timeline must include buffer for unexpected delays.
- Post-launch review must be scheduled before launch day.
- Learnings must be documented for future GTM efforts.

## References
  - references/channel-strategy.md — Channel Strategy
  - references/go-to-market-advanced.md — Go To Market Advanced Topics
  - references/go-to-market-fundamentals.md — Go To Market Fundamentals
  - references/launch-checklist.md — Launch Checklist
  - references/launch-tiers.md — Launch Tiers
  - references/positioning-guide.md — Product Positioning Guide
## Handoff
For pricing strategy support, hand off to `product-pricing-strategy`. For growth experiments post-launch, hand off to `product-growth-engineering`.
