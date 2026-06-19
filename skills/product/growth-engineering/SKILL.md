---
name: product-growth-engineering
description: >
  Use this skill when designing growth engineering initiatives: viral loops, activation optimization, referral mechanics, and conversion experiments.
  This skill enforces: growth loop design, activation optimization, viral mechanics, conversion optimization.
  Do NOT use for: paid acquisition, SEO strategy, content marketing, sales funnel optimization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, growth, phase-8]
---

# Growth Engineering Agent

## Purpose
Designs and executes growth engineering initiatives including growth loops, activation optimization, viral mechanics, and experimentation pipelines.

## Agent Protocol

### Trigger
Exact user phrases: growth engineering, viral loop, activation, referral, PLG, growth experiment, conversion optimization, product-led growth, K-factor, viral cycle, Aha moment, time-to-value.

### Input Context
- What is the current acquisition, activation, retention, and revenue funnel?
- What is the product's core value moment (Aha moment) and current activation rate?
- What referral or sharing mechanics exist and what is the current K-factor?
- What is the viral cycle time (time from invite to new user activation)?
- What experiments are in the pipeline and what is the experiment velocity?
- What are the current growth metric baselines (CAC, LTV, activation rate, referral rate)?
- What is the product's pricing model and PLG maturity?

### Output Artifact
Growth loop architecture design, activation optimization plan, viral mechanics specification, and experiment pipeline.

### Response Format
```
## Growth Engineering Plan
### Growth Loop
{acquisition} → {activation} → {revenue} → {referral} → {loop back}

### Activation Optimization
Current TTV: {time-to-value}
Aha Moment: {action} within {timeframe}
Activation Rate: {current} → {target} | Impact: {projected growth}

### Viral Mechanics
K-factor: {current K} | Target K: {target K} | Cycle Time: {hours/days}
Invite Rate: {X%} | Conversion Rate: {Y%}
Top Channel: {channel with highest K}

### Experiment Pipeline
Running: {running} | Queued: {queued} | Backlog: {backlog}
Experiment Velocity: {experiments/month}
Top Priority: {experiment name} | Expected Impact: {impact}

### Conversion Optimization
Funnel: {step} → {step} → {step} → {step}
Current CR: {value} | Target CR: {value} | Projected Revenue Lift: {value}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Growth loop defined with all stages mapped and feedback mechanism identified
- [ ] Activation milestone (Aha moment) identified and validated with user data
- [ ] Time-to-value measured and documented with segment breakdown
- [ ] Viral mechanics designed with K-factor target and cycle time optimization
- [ ] Conversion funnel analyzed with drop-off points and segment differences
- [ ] Experiment pipeline established with prioritization framework
- [ ] Growth metrics dashboard created with leading and lagging indicators
- [ ] PLG motion designed for self-serve signup to paid conversion
- [ ] Experiment velocity target set and tracking mechanism in place

### Max Response Length
7000 tokens

## Workflow

### Step 1: Growth Loop Design
Map the full growth loop: Acquisition → Activation → Revenue → Referral → (loops back to Acquisition). Identify the input that feeds back into the loop: user invites, content sharing, network effects, organic virality. Differentiate between growth loops (self-reinforcing) and growth funnels (linear).

Calculate loop cycle time: time from a new user entering the loop to generating the next new user. Shorter cycle times create faster compounding growth. Calculate amplification factor: how many new users each existing user generates through the loop. Target amplification > 1 for sustainable growth.

Design loops for each acquisition channel: viral loop (user invites), content loop (user generates content that attracts new users), SEO loop (user activity creates indexable pages), sales loop (user referrals convert through sales). Align loop design with product usage patterns — the loop should feel natural, not forced.

### Step 2: Activation Optimization
Define the Aha moment — the specific action where users experience core value for the first time. Validate that users who reach this action have higher retention and LTV. Use data analysis to find the threshold: what action, how many times, within what timeframe correlates with long-term retention.

Measure current time-to-value (TTV): time elapsed between signup and first Aha moment. Segment TTV by acquisition channel, plan, user role, device. Identify segments with highest TTV — target them for activation optimization.

Reduce friction in the activation flow: remove unnecessary steps (optional fields, non-essential setup, tutorials before value), prefill data where possible (company info from email domain, template from industry), guide users with progressive onboarding (one step at a time, celebrate progress), provide template-based starting points. Set activation target (e.g., 80% of users activate within 24 hours). Track activation rate as a weekly leading indicator.

### Step 3: Viral Mechanics
Implement referral program with clear incentive structure. Two-sided rewards (both referrer and referee benefit) outperform one-sided rewards by 3-5x. Ensure the reward aligns with product value — give more of what makes the product valuable, not discounts or cash.

Calculate K-factor: K = I × C where I = average number of invites sent per user, C = conversion rate of invites to activated users. Target K > 1.0 for viral growth (each user brings more than one new user). K < 1.0 means the loop leaks and requires paid acquisition to sustain growth.

Reduce viral cycle time: time from invite to referee activation. Shorter cycle time = faster compounding. Optimize invite friction (one-click share, deep links, pre-filled message), invite-to-signup conversion (landing page optimization, social proof), signup-to-activation flow (fast onboarding, immediate value).

Track viral coefficient per channel (email, social, SMS, in-app) and per segment (by plan, usage, tenure). Identify high-viral segments and optimize the referral experience for them. Monitor K-factor weekly — changes in product, market, or season affect viral mechanics.

### Step 4: Conversion Optimization
Map the conversion funnel: signup → core feature exploration → value moment → subscribe. Identify the key conversion event — the action that indicates purchase intent. Analyze drop-off at each step using analytics, segmented by acquisition channel, plan, and user attributes.

Run experiments on conversion: pricing page layout and plan comparison, feature gating (what is free vs. paid), trial length and structure (time-limited vs. usage-limited), urgency and scarcity signals, social proof and case studies, payment friction (payment methods, checkout flow).

Implement conversion levers: time-based urgency (trial expiring, limited-time offer), usage-based triggers (hit usage limit, need paid feature), value-based messaging (what they will lose, what they will gain), social proof (similar companies converted, testimonials), risk reversal (money-back guarantee, easy downgrade). Track trial-to-paid conversion rate as a primary growth metric.

### Step 5: Experiment Pipeline
Maintain a running backlog of growth experiments sourced from: analytics data (high drop-off, low activation), user research insights, competitive analysis, team brainstorming, industry patterns (growth studies, playbooks).

Prioritize experiments using ICE (Impact, Confidence, Ease) or RICE (Reach, Impact, Confidence, Effort). Score each experiment and rank by priority. Keep top 5-10 experiments in the queue. Limit concurrent experiments to avoid interaction effects and maintain statistical validity.

Run experiments sequentially for the same funnel step. Parallel experiments on different funnel steps are fine. Document every experiment in a shared template: hypothesis, design, results, learnings, next steps. Pause experiments that don't show minimum detectable effect within the expected duration.

## Rules
- Activation must be defined by user action, not time elapsed or page views.
- Growth loops must be measurable end-to-end with tracking at every stage.
- K-factor must account for organic and paid channels separately — never combine.
- Experiments must have a single primary metric and pre-defined guardrails.
- Referral incentives must align with product value, not monetary rewards.
- PLG motion must support self-serve signup through to paid conversion without sales intervention.
- Growth experiments must include guardrail metrics to prevent negative impact on core experience.
- Learning is success even if hypothesis is invalidated — document and share.
- Viral cycle time is as important as K-factor — optimize both.
- Aha moment must be validated with retention and LTV data, not assumptions.
- Experiment results must be segmented by acquisition channel to avoid Simpson's paradox.
- Growth metrics must be tracked weekly, not monthly — growth moves fast.

## Framework / Methodologies

### Dave McClure's Pirate Metrics (AARRR)
Acquisition: users discover and arrive. Activation: users have a great first experience. Retention: users come back. Revenue: users pay. Referral: users invite others. The framework maps the full user lifecycle with clear metrics per stage. Growth engineering focuses primarily on Activation, Retention, and Referral.

### Growth Loops Framework (Brian Balfour)
Four types of growth loops: Viral (user invites user), Content (user content attracts new users), SEO (product activity creates indexable pages), Paid (revenue funds acquisition). Each loop is self-reinforcing — output becomes input. Design loops around natural product usage, not forced mechanics.

### ICE Prioritization (Impact, Confidence, Ease)
Score each growth experiment: Impact (1-10) — how much will this improve the growth metric? Confidence (1-10) — how certain are we of the impact based on data and research? Ease (1-10) — how quick and simple is implementation? Priority Score = (I × C) / E. Use for experiment pipeline prioritization.

### Funnel-Driven Growth (Casey Winters)
Identify the highest-leverage funnel step for optimization. Sometimes activation (getting users to value) has more impact than acquisition (getting more users). Sometimes retention (keeping users) outperforms activation. Allocate growth resources to the biggest bottleneck in the funnel. Shift focus as bottlenecks change.

### Product-Led Growth (PLG) Framework
Growth driven by the product itself, not sales or marketing. Self-serve signup, freemium or free trial, product usage drives conversion. Key metrics: time-to-value, activation rate, feature adoption, self-serve conversion rate. PLG requires investment in onboarding, in-app conversion, and product analytics.

### Refraction Thinking (Kevin Kwok)
Growth should change how users think about the product category, not just optimize existing mechanics. True breakout growth comes from changing the user's mental model of what the product is for. Apply refraction thinking when growth plateaus despite optimization — the next breakthrough requires a new framing.

## Common Pitfalls

### Vanity Metric Optimization
Optimizing metrics that look good but do not drive business outcomes: signups (not activated), page views (not engaged sessions), downloads (not usage). Teams report growth while the product is not actually growing. Mitigation: measure and report activation and retention, not just acquisition. Define growth as quality users, not any users.

### Forced Virality
Designing sharing mechanics that interrupt the user experience. Users share before they experience value. Invites feel spammy to both sender and recipient. Results in low conversion and potential brand damage. Mitigation: virality must be a natural byproduct of product usage. Users should want to share because they got value.

### Ignoring Activation
Investing heavily in acquisition while activation is broken. Acquiring users who never experience value and never convert. High CAC, low LTV, poor unit economics. Mitigation: fix activation before scaling acquisition. A leaky bucket cannot be filled by pouring more water.

### Over-Reliance on a Single Loop
Depending entirely on one growth loop (usually viral). When the loop saturates or breaks, growth stops. Vulnerability to platform changes (algorithm changes, policy updates), competitive responses, market saturation. Mitigation: build multiple growth loops. Diversify acquisition channels.

### Measuring Growth Infrequently
Tracking growth metrics monthly or quarterly. Growth changes too fast for monthly measurement — a bad week can compound into a bad quarter. Misses signals of loop degradation, channel saturation, competitive response. Mitigation: track leading indicators weekly. Set up automated alerts for metric drops.

### PLG Without Product Readiness
Launching self-serve PLG motion when the product is not ready for it. Onboarding is confusing, core value is not immediately clear, pricing is unclear. Users churn before converting. Mitigation: validate activation and conversion with sales-assisted funnel first. Only launch self-serve when metrics indicate readiness.

## Best Practices

### Growth Loop Design
- Design loops around natural product usage, not forced mechanics — sharing should feel like a byproduct of value.
- Measure and optimize both K-factor and cycle time — fast cycles compound faster than high K-factor alone.
- Build multiple loops across different channels to diversify growth sources and reduce dependency risk.
- Each loop must have a clear input (acquisition source) and output (new users entering the loop).
- Document the loop hypothesis with expected amplification factor and validate with data.

### Activation Optimization
- Define the Aha moment through data analysis, not intuition. Find the action-threshold-timeframe combination that best predicts retention.
- Reduce steps to activation ruthlessly — every unnecessary step costs activation percentage.
- Provide clear progress indicators during activation so users know how far they are from value.
- Use progressive onboarding: show features in order of value discovery, not in order of complexity.
- Offer template-based starting points for users who want to see value before configuring.
- Segment activation rate by acquisition channel to identify which sources bring high-quality users.

### Viral Mechanics
- Two-sided rewards (referrer + referee) outperform one-sided by 3-5x — invest in both sides.
- Reward should align with product value: more features, extended access, premium capabilities.
- Reduce invite friction to one click — deep links, pre-filled messages, contact access.
- Optimize the invitee landing page: personalized to the referrer, clear value proposition, fast activation path.
- Target high-viral segments with optimized referral experience and monitor their behavior.

### Experiment Pipeline
- Maintain a prioritized backlog with at least 10 experiment ideas at all times.
- Run experiments on one variable at a time — compound experiments are hard to attribute.
- Set a minimum experiment velocity (e.g., 2 experiments per week) to drive growth momentum.
- Document every experiment in a shared template regardless of outcome.
- Share learnings weekly with the broader team to build growth culture.

## Templates & Tools

### North Star Metric Selection
The North Star metric is the single metric that best captures customer value and correlates with long-term retention. For growth engineering, the North Star must be a leading indicator of sustainable growth, not a vanity metric.

| Product Type | Example North Star | Why It Works |
|-------------|-------------------|--------------|
| Social/communication | Messages sent per user per week | Core value is communication |
| SaaS B2B | Weekly active teams | Team adoption drives retention |
| Marketplace | Successful transactions | Liquidity drives both sides |
| Content platform | Weekly content consumption | Engagement drives subscription |
| Fintech | Transactions per active user | Usage demonstrates value |

Validate North Star against retention: segment users by North Star achievement (did they hit the threshold?), compare retention rates between segments, find the threshold that maximizes retention correlation. Target: users who achieve North Star should have >2x retention vs those who don't.

### Growth Accounting Framework
Growth accounting decomposes total growth into three sources to understand what drives it:

1. **Organic growth:** New users from existing users (virality, referrals, content loops). Track as percentage of total new users. Target >50% for sustainable growth.

2. **Paid growth:** New users from paid channels (ads, sponsorships, partnerships). Track CAC by channel and compare to LTV. Target LTV/CAC >3x.

3. **Product growth:** New users from product features (integrations, embed, API, marketplace). Track integration-sourced signups. Network effects are the strongest form of product growth.

**Growth decomposition formula:**
```
New Users(t) = Organic(t) + Paid(t) + Product(t)
Growth Efficiency = (Organic + Product) / Total New Users
```
Target growth efficiency >0.7 — meaning most growth comes from product and organic sources, not paid. Track monthly and flag when paid exceeds 30% of total.

### Growth Loop Documentation Template
```
### Loop Name
{name of the growth loop}

### Loop Stages
{stage 1} → {stage 2} → {stage 3} → {stage 4} → (feedback to stage 1)

### Current Metrics
Users in loop per week: {number}
Stage conversion rates: {stage 1 conversion} → {stage 2 conversion} → ...
Loop amplification factor: {value}
Cycle time: {value}

### Optimization Opportunities
{list of improvements with expected impact}
```

### Activation Analysis Template
```
### Aha Moment Definition
Action: {specific user action}
Threshold: {how many times}
Timeframe: {within what period}
Correlation with retention: {retention rate for users who hit vs. not}

### Current State
Overall activation rate: {value}
By channel: {channel breakdown}
By plan: {plan breakdown}
By role: {role breakdown}

### TTV Distribution
P25: {value} | P50: {value} | P75: {value}
Target: {target TTV}

### Optimization Initiatives
1. {initiative} — Expected improvement: {X%}
2. {initiative} — Expected improvement: {X%}
```

### Viral Mechanics Specification
```
### Referral Program
Reward structure: {two-sided / one-sided}
Referrer reward: {description}
Referee reward: {description}
Trigger: {when is invite offered}

### Current Metrics
Invite rate: {invites per active user}
Conversion rate: {invitee activation rate}
K-factor: {K} = {I} × {C}
Viral cycle time: {time from invite to activation}

### Optimization Plan
1. {optimization} — Expected K improvement: {X}
2. {optimization} — Expected K improvement: {X}
```

### Growth Experiment Card
```
### Experiment: {name}
Hypothesis: If {change} then {metric} will {direction} by {amount} because {reason}.
Type: {viral / activation / conversion / retention / referral}

### Design
Control: {current experience}
Treatment: {proposed change}
Primary Metric: {metric}
Guardrails: {metrics}

### Prioritization
Impact: {1-10} | Confidence: {1-10} | Ease: {1-10}
ICE Score: {value}

### Results
Primary Metric: {before vs. after} | p-value: {value}
Guardrails: {all passed / violations}
Decision: {implement / iterate / reject}
Learnings: {key insights}
```

### Growth Metrics Dashboard Template
```
### Leading Indicators (Weekly)
New users: {count} | Trend: {direction}
Activation rate: {%} | Trend: {direction}
TTV: {time} | Trend: {direction}
K-factor: {value} | Trend: {direction}
Viral cycle time: {time} | Trend: {direction}

### Lagging Indicators (Monthly)
Active users: {count} | Trend: {direction}
Retention rate (D7/D30/D90): {values}
Trial-to-paid conversion: {%} | Trend: {direction}
CAC: {cost} | LTV: {value} | LTV/CAC: {ratio}
Revenue: {value} | Growth rate: {%}

### Experiment Pipeline
Running: {count} | Queued: {count} | Velocity: {experiments/week}
Win rate: {%} | Avg impact per experiment: {value}
```

### PLG Funnel Template
```
### Self-Serve Funnel
Visit → Signup → Onboard → Activate → Subscribe → Refer

| Stage | Users | Conversion | Drop-off |
|-------|-------|-----------|---------|
| Visit | {n}   | —         | —       |
| Signup| {n}   | {%}       | {%}     |
| Onboard| {n}  | {%}       | {%}     |
| Activate| {n} | {%}       | {%}     |
| Subscribe| {n}| {%}       | {%}     |
| Refer | {n}   | {%}       | {%}     |

### Key Levers
{per stage lever and expected impact}
```

## Case Studies

### SaaS Activation Rate Transformation
A B2B project management tool had 28% activation rate (users who created a project with a teammate within 7 days). TTV analysis showed that users who completed their first project with a teammate had 89% 30-day retention vs. 34% for solo users. The Aha moment was clear: collaboration within a project.

Activation optimization: reduced signup fields from 7 to 3 (name, email, company size), added team member invitation during signup (not after), pre-populated a sample project with placeholder tasks, added guided project setup wizard with template selection, triggered email reminders for incomplete projects.

Results: activation rate increased from 28% to 64% within 3 months. TTV reduced from 5.2 days to 1.8 hours. 30-day retention improved from 61% to 82%. Monthly growth rate accelerated from 8% to 14%.

### Two-Sided Referral Program Launch
A consumer SaaS product launched a referral program. Initial design: one-sided reward (referrer gets 1 month free). Invite rate: 0.12 invites per active user. Conversion rate: 8%. K-factor: 0.01. No measurable growth impact.

Redesign: two-sided reward (referrer gets 3 months premium, referee gets 1 month premium), integrated invite into natural sharing moments (after export, after collaboration), reduced invite friction to one tap with deep link, added personalized message with referrer name. Results: invite rate increased to 0.45, conversion rate increased to 22%, K-factor increased to 0.10. While still below 1.0, the program now contributes measurable organic growth and reduces CAC by 18%.

### Freemium to Paid Conversion Optimization
A design tools company had 3.2% free-to-paid conversion rate. Analysis revealed: users who used 5+ premium features in their first week had 28% conversion rate vs. 1.1% for users who used fewer than 5. The gating strategy was wrong — it was blocking features that should have been free to drive usage.

Conversion optimization: moved 3 value-driving features from paid to free (export at high resolution, unlimited projects, custom templates), introduced usage-based gating (free tier limited to 5 exports per month), added in-app upgrade prompt triggered by hitting the limit, showed value comparison dashboard. Results: free-to-paid conversion increased from 3.2% to 8.7%. Total revenue increased 42% as more users upgraded despite more free features.

### Viral Loop Integration
A collaborative document platform integrated viral mechanics into the core product experience. Every document had a prominent Share button with collaborator invitation. When a user invited a collaborator, both could edit simultaneously — the value of collaboration was demonstrated immediately.

Key design decisions: no separate referral program — sharing was the core product mechanic. New collaborators could use the product immediately without signup (they signed up when they wanted to create their own document). Deep links preserved document context. Results: 68% of new users came through collaborator invites. K-factor stabilized at 0.85. Viral cycle time: 4 hours (invite to collaborator activation).

## Expanded Decision Trees

### Growth Loop Selection Decision Tree
```
What is the primary way users get value from your product?
  |-- Collaboration (users working together) → Viral loop (invite to collaborate)
  |-- Content creation (users making things) → Content loop (sharing attracts new users)
  |-- Data aggregation (users contribute data) → Network effects loop (more users = more value)
  |-- Transactional (users buying/selling) → Marketplace loop (liquidity attracts both sides)
  |-- Individual utility (users alone) → SEO loop (public pages attract search traffic)

Does the product have inherent sharing mechanics?
  |-- YES (documents, projects, lists are naturally shareable) → Optimize existing sharing
  |-- NO (utility tool, single-user experience) → Create sharing incentives or build SEO loop

What is your growth efficiency target?
  |-- High efficiency (low CAC, organic focus) → Invest in viral + content loops
  |-- Balanced (paid + organic) → Build multiple loops, optimize paid channel efficiency
  |-- Scale fast (high budget) → Paid acquisition loops + viral mechanics
```

### Channel Prioritization Decision Tree
```
What is your current growth stage?
  |-- 0-100 users (idea stage) → Focus on 1 channel that works, ignore others
  |-- 100-10K users (traction) → Double down on working channel, experiment with 1 more
  |-- 10K-100K users (growth) → 2-3 working channels, systematic experimentation
  |-- 100K+ users (scale) → Diversified channels, optimization focus

What is your CAC by channel?
  |-- CAC < $10 → High-efficiency channel, maximize investment
  |-- CAC $10-$100 → Moderate efficiency, optimize further
  |-- CAC $100-$500 → Low efficiency, improve targeting or test new channels
  |-- CAC > $500 → Validate LTV/CAC > 3x before scaling
```

### Retention Strategy Decision Tree
```
What is your D30 retention rate?
  |-- <20% → Core product value not being delivered. Fix activation and core experience first.
  |-- 20-40% → Retention needs improvement. Focus on habit formation and engagement loops.
  |-- 40-60% → Healthy retention. Optimize and add retention features (notifications, content).
  |-- >60% → Excellent retention. Focus on expansion revenue and referrals.

What is the primary churn reason?
  |-- Not enough value → Improve activation and onboarding
  |-- Not enough engagement → Add notifications, email sequences, content updates
  |-- Competitive switch → Improve product moat, consider pricing adjustment
  |-- No longer need → Accept natural churn, focus on acquisition
```

## Templates

### Retention Analysis Template
```
# Retention Analysis: {Cohort}
Period: {start} to {end}

## Overall Retention
| Period | D1 | D7 | D14 | D30 | D60 | D90 |
|--------|----|----|-----|-----|-----|-----|
| Week 1 |    |    |     |     |     |     |
| Week 2 |    |    |     |     |     |     |
| Week 3 |    |    |     |     |     |     |

## Retention by Activation Status
| Group | D1 | D7 | D30 | D90 |
|-------|----|----|-----|-----|
| Activated (hit aha moment) | | | | |
| Not activated | | | | |

## Retention by Acquisition Channel
| Channel | D1 | D7 | D30 | D90 |
|---------|----|----|-----|-----|

## Churn Reasons (Top 5)
| Reason | % of Churned | Common Segment |
|--------|-------------|----------------|
| {reason} | {X%} | {segment} |

## Retention Improvement Opportunities
1. {opportunity} — Expected retention lift: {X%}
2. {opportunity} — Expected retention lift: {X%}
```

### Cohort Analysis Template
```
# Cohort Analysis: {Period}

## Weekly Cohort Retention
| Cohort | Size | W1 | W2 | W3 | W4 | W8 | W12 |
|--------|------|----|----|----|----|----|-----|
| 2026-W01 | | | | | | | |
| 2026-W02 | | | | | | | |
| 2026-W03 | | | | | | | |

## Monthly Cohort Retention
| Cohort | Size | M1 | M2 | M3 | M6 | M12 |
|--------|------|----|----|----|----|-----|
| 2026-01 | | | | | | |
| 2026-02 | | | | | | |

## Key Insights
- {insight}
- {insight}
- {insight}
```

### Experiment Pipeline Dashboard Template
```
# Experiment Pipeline: {Quarter}

## Running Experiments
| # | Name | Hypothesis | Start | Duration | Primary Metric | Status |
|---|------|-----------|-------|----------|---------------|--------|

## Queued Experiments
| # | Name | ICE Score | Impact | Confidence | Ease | Owner |
|---|------|-----------|--------|-----------|------|-------|

## Completed This Quarter
| Name | Result | Decision | Learnings |
|------|--------|----------|-----------|

## Experiment Velocity
Target: {X} experiments/week
Actual: {X} experiments/week
Win rate: {X%}
Average impact per experiment: {X%}
```

### Growth Efficiency Report Template
```
# Growth Efficiency Report: {Month/Quarter}

## Growth Breakdown
| Source | New Users | % of Total | CAC | Trend |
|--------|-----------|-----------|-----|-------|
| Organic (viral) | {n} | {%} | $0 | {direction} |
| Organic (content) | {n} | {%} | $0 | {direction} |
| Organic (SEO) | {n} | {%} | $0 | {direction} |
| Paid (ads) | {n} | {%} | ${cac} | {direction} |
| Paid (partnerships) | {n} | {%} | ${cac} | {direction} |

Growth Efficiency = (Organic + Product) / Total = {X%}
Target: >70%

## Trend (Last 6 Months)
| Month | Total Users | Organic % | Paid % | Growth Efficiency |
|-------|------------|-----------|--------|-------------------|

## Recommendations
1. {recommendation} — Expected efficiency improvement: {X%}
2. {recommendation} — Expected efficiency improvement: {X%}
```

### PLG Readiness Checklist
```
## Product Assessment
- [ ] Core value can be experienced without human assistance
- [ ] Time-to-first-value is <5 minutes
- [ ] Self-serve signup requires only email (no sales intervention)
- [ ] Free tier or trial provides genuine value (not crippled)
- [ ] Upgrade path is clear and frictionless
- [ ] In-app conversion/purchase flow exists
- [ ] Product analytics track activation, usage, conversion

## Organization Assessment
- [ ] Team has autonomy to iterate on product experience
- [ ] Product has dedicated growth engineering resources
- [ ] Experimentation infrastructure exists
- [ ] Leadership understands PLG metrics (activation, TTV, self-serve conversion)
- [ ] Customer success is prepared for self-serve users (no hand-holding)

## Readiness Score
Score = (answered yes / total questions) × 100
- >80%: Ready for PLG
- 50-80%: Partial readiness, address gaps
- <50%: Focus on product-led fundamentals first
```

## Expanded Anti-Patterns

### 7. Vanity Metric Dashboard
Building dashboards that show impressive-looking numbers with no actionable insight. Total registered users (includes inactive), total page views (includes bots), total downloads (includes never-opened). Mitigation: every metric on the dashboard must drive a decision. If you can't answer "what will I do differently based on this number?" remove the metric.

### 8. Experiment Fatigue
Running too many experiments simultaneously. Overlapping experiments create interaction effects that invalidate results. Teams can't keep up with analysis. Experiments run for too long or are abandoned. Mitigation: limit concurrent experiments per funnel stage. Set a maximum of 3-5 concurrent experiments. Define experiment duration upfront. Kill underperforming experiments early.

### 9. Copycat Growth Tactics
Implementing growth mechanics that worked for other companies without adaptation. Dropbox-style referral program for a B2B enterprise tool. Gaming leaderboards for a productivity app. Mitigation: growth mechanics must align with natural product usage patterns. Test growth mechanics for your specific product and user base, don't assume transferability.

### 10. Over-Optimization Before Product-Market Fit
Optimizing growth mechanics before the product delivers core value. Spending engineering time on referral programs when activation is broken. A leaky bucket can't be filled by pouring more water. Mitigation: achieve product-market fit first (retention >40% D30). Then invest in growth mechanics. Activation optimization is always the first growth investment.

### 11. Ignoring Segment Dynamics
Optimizing growth metrics in aggregate while masking segment-level problems. Overall activation rate looks healthy but a key segment has 10% activation. Mitigation: segment every growth metric by acquisition channel, plan, user role, device, and region. Set targets per segment based on segment importance.

### 12. Growth Without Guardrails
Running growth experiments that improve one metric at the expense of another. Increasing signups by lowering quality bar, which increases churn. Increasing referral incentives which attract reward-seekers not product-lovers. Mitigation: every experiment must have guardrail metrics. Monitor core experience metrics during growth experiments. Kill experiments that improve growth metrics but degrade retention or satisfaction.

## Expanded Best Practices

### Growth Loop Optimization Cadence
| Frequency | Activity | Focus |
|-----------|----------|-------|
| Daily | Check leading indicators dashboard | Activation rate, K-factor, experiment results |
| Weekly | Experiment review meeting | Results, learnings, new experiment prioritization |
| Bi-weekly | Growth metric deep dive | Segments, trends, anomalies |
| Monthly | Full growth review | Loop performance, channel analysis, strategy adjustment |
| Quarterly | Growth strategy reset | New loops, channel exploration, resource allocation |

### Experiment Design Quality Checklist
- [ ] Hypothesis follows format: "If {change} then {metric} will {direction} by {amount} because {reason}"
- [ ] Primary metric is a single, measurable number
- [ ] Guardrail metrics defined to prevent sub-optimization
- [ ] Minimum detectable effect calculated
- [ ] Sample size calculated before experiment starts
- [ ] Duration determined by sample size (not calendar)
- [ ] Segment analysis planned (not just aggregate)
- [ ] Risks and edge cases considered
- [ ] Learning documented regardless of outcome

### Growth Team Rhythm
| Day | Activity | Output |
|-----|----------|--------|
| Monday | Review running experiments, check metrics | Status update |
| Tuesday | Analyze completed experiments | Results document |
| Wednesday | Ideation and prioritization | Experiment backlog update |
| Thursday | Design and launch new experiments | Experiment specs |
| Friday | Share learnings, plan next week | Weekly growth brief |

## References
  - references/activation-metrics.md — Activation Metrics
  - references/growth-engineering-advanced.md — Growth Engineering Advanced Topics
  - references/growth-engineering-fundamentals.md — Growth Engineering Fundamentals
  - references/growth-experiment-design.md — Growth Experiment Design
  - references/growth-experiments.md — Growth Experiments
  - references/growth-loops.md — Growth Loops
  - references/growth-metrics-funnel.md — Growth Metrics and Funnel Analysis
  - references/viral-mechanics.md — Viral Mechanics

## Handoff
For analytics tracking of growth metrics, hand off to `product-analytics`. For pricing and conversion experiments, hand off to `product-pricing-strategy`. For customer journey activation touchpoints, hand off to `product-customer-journey`. For A/B test experiment design, hand off to `product-ab-testing`.
