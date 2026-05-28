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
Exact user phrases: go-to-market, GTM, product launch, market entry, GTM plan, channel strategy, launch plan, market launch, beta program, product release.

### Input Context
- What is the product and its stage (new product, new feature, expansion, or pivot)?
- Who is the target customer and what is the ideal customer profile (ICP)?
- What is the competitive landscape and market position?
- What channels are available (in-app, email, sales, content, paid, partnerships, community)?
- What is the launch timeline and available resources (budget, headcount, external agencies)?
- What are the success criteria and key results for this launch?
- What existing customer base can be leveraged for beta and launch?

### Output Artifact
GTM plan with ICP definition, launch tier, channel strategy, messaging framework, beta program, and execution timeline.

### Response Format
```
## Go-to-Market Plan
### Product: {name} | Stage: {new / feature / expansion}

### ICP
Segment: {description} | Persona: {role} | Company Size: {size}
Pain Point: {primary pain} | Budget: {typical budget}
Current Solution: {alternative} | Purchase Trigger: {event}

### Launch Tier: T{1/2/3}
Scope: {scope description} | Timeline: {x weeks} | Resources: {FTE}

### Channels
Primary: {channel} — expected reach: {estimate}
Secondary: {channel} — expected reach: {estimate}
Organic: {channel} — expected reach: {estimate}

### Messaging
Headline: {value proposition}
Problem: {before state} | Solution: {after state}
Proof Points: {evidence}
Differentiator: {vs competitors}

### Beta Program
N: {participants} | Duration: {weeks} | Criteria: {qualification}
Incentive: {reward} | Feedback Cadence: {frequency}

### Execution Timeline
Beta: {start-end} | Internal Enablement: {date}
Announce: {date} | Post-Launch D30/D60/D90 Reviews: {dates}

### Success Metrics
{metric}: {baseline} → {target} | {metric}: {baseline} → {target}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] ICP defined with firmographic, demographic, and behavioral criteria plus anti-ICP
- [ ] Launch tier determined with rationale based on scope, resources, and impact
- [ ] Channel strategy documented with primary, secondary, and organic channels mapped to ICP
- [ ] Messaging and positioning framework created and validated with target customers
- [ ] Beta program designed with qualification criteria, incentive, and feedback cadence
- [ ] Launch timeline with milestones, dependencies, and buffer time
- [ ] Success metrics defined with baselines and targets
- [ ] Post-launch review schedule planned at D30, D60, D90
- [ ] Competitive differentiation articulated and validated

### Max Response Length
7000 tokens

## Workflow

### Step 1: Target Market and ICP Definition
Define ICP with firmographics (company size, industry, revenue range, geographic region), demographics (role title, seniority level, technical sophistication, decision-making authority), and behavioral attributes (current solution and satisfaction, purchase triggers, budget availability, buying process complexity). Validate ICP with existing customer data — do your best customers match the ICP? Interview 5-10 customers who fit the ICP to validate pain points and value perception.

Create anti-ICP: define who not to target — segments that are costly to serve, have low retention, generate low revenue, or require customization that does not fit the product strategy. Document why each anti-ICP segment is excluded.

Segment the market into tiers if relevant: enterprise (500+ employees, >$50M revenue), mid-market (50-500 employees, $10-50M revenue), SMB (<50 employees, <$10M revenue). Determine which tier(s) are primary focus and which are secondary.

### Step 2: Launch Tier Classification
Classify the launch into one of three tiers based on scope, resources, and expected impact:

T1 — Major new product or platform launch: full campaign across all channels. Includes press outreach, analyst briefings, launch event, paid acquisition, content marketing, email campaigns, in-app, sales enablement, partnerships. Timeline: 8-12 weeks pre-launch planning. Requires dedicated GTM team of 3-5 people. Metrics: awareness, adoption, revenue targets with board-level visibility.

T2 — Significant new feature or expansion: targeted outreach to existing customers and ICP prospects. Includes email campaign, in-app messaging, blog post, social media, sales enablement brief. Timeline: 3-5 weeks pre-launch. Requires GTM lead + cross-functional support. Metrics: feature adoption, activation rate, pipeline influence.

T3 — Minor feature or improvement: lightweight announcement. Includes in-app notification, changelog entry, social media post, internal announcement. Timeline: 1-2 weeks pre-launch. Requires product manager + comms support. Metrics: feature adoption rate, user satisfaction.

Align resources with launch tier — a T3 should never consume T1-level resources, and a T1 should not be under-resourced.

### Step 3: Channel Selection
Select primary channels based on where the ICP consumes information and makes purchase decisions:

Sales-led (enterprise, high ACV >$50K): direct sales, sales development, executive outreach, industry events, analyst relations, case studies. Primary channel is the sales team, supported by marketing.

Product-led (self-serve, low ACV <$5K): in-app messaging, email campaigns, content marketing, SEO, referral programs, community. Primary channel is the product itself, supported by automated marketing.

Hybrid (mid-market, ACV $5-50K): combination of product-led acquisition with sales-assisted conversion. In-app and email for acquisition, sales for high-value conversions. Channel mix depends on where each segment in the mid-market falls.

For each channel, estimate: reach (how many ICP members can this channel reach?), conversion rate (what percentage will convert?), cost per acquisition (total cost / conversions), time to first conversion (how long from first touch to conversion?). Prioritize channels with highest reach-to-cost ratio for the ICP.

### Step 4: Messaging and Positioning
Define positioning: For {ICP} who {need or want}, {product} is a {category} that {key benefit}. Unlike {competitor}, {product} {differentiator}. Example: For product managers at B2B SaaS companies who struggle with customer journey analysis, our tool is a journey analytics platform that automatically maps every customer touchpoint. Unlike traditional analytics, our tool shows cross-channel journeys without manual tagging.

Create messaging hierarchy: headline (one-liner, 5-10 words) that captures the core value proposition, elevator pitch (2-3 sentences) that explains what, who, and why, value proposition (3-5 bullet benefits) with specific quantified outcomes, features (detailed capabilities) organized by value they deliver.

Test messaging with 10-20 target customers before launch: which version resonates most? Which benefits are most compelling? Which differentiators matter? Which language is confusing or unconvincing? Iterate based on feedback.

Create messaging per channel: in-app (short, action-oriented), email (benefit-driven, personalized), sales (proof-heavy, ROI-focused), press (newsworthy, differentiated), social (conversational, shareable).

### Step 5: Beta Program
Define beta goals: validate product-market fit (would users pay?), collect feedback for refinement (what is missing, what is broken?), generate case studies and testimonials (quantified results, quotes), build reference customers (willing to be public references), create early adopters (users who will champion the product post-launch).

Recruit 10-50 beta participants matching ICP. For T1 launches, target 30-50 participants. For T2, target 10-20. For T3, beta may not be needed or can be informal (5-10 friendly customers). Qualification criteria: matches ICP, active user of current product (for existing customers), willingness to provide regular feedback, fits the product's current maturity (tolerant of bugs for early beta, demanding of quality for late beta).

Structure beta: onboarding session, weekly feedback survey, bi-weekly check-in call, NPS survey at midpoint and end, final retrospective with reference call request. Provide incentive: extended trial or free period, discount on launch pricing, early access recognition, direct access to product team.

Run beta for 4-8 weeks depending on complexity. Collect quantitative data (usage metrics, NPS, feature adoption) and qualitative data (feedback themes, pain points, delight moments). Close beta with a clear decision: launch as planned, delay for fixes, or pivot.

### Step 6: Launch Execution
Create launch timeline working backward from launch day:

T-8 to T-12 weeks (T1 only): strategy finalization, ICP validation, beta recruitment, channel preparation, creative development, press and analyst outreach scheduling.

T-4 to T-6 weeks: beta program launch, internal enablement (sales training, support training, documentation), messaging finalization, asset production (landing page, emails, social posts, sales deck, demo video).

T-2 to T-4 weeks: beta program ongoing, content development (blog posts, case studies, white papers), channel testing (email previews, ad testing, landing page QA), metrics dashboard setup.

T-0 to T-2 weeks: beta program close, final fixes based on feedback, asset finalization, launch sequence preparation, go/no-go decision.

Launch day: execute launch sequence per channel. Monitor real-time metrics: website traffic, signups, activation, support volume, press coverage, social mentions. Activate internal comms: all-hands announcement, slack channels, customer-facing team briefings.

Post-launch: D7 check-in (early metrics, issues), D30 review (adoption trends, funnel metrics, qualitative feedback), D60 review (retention, revenue impact, competitive response), D90 review (full performance against success criteria, lessons learned, next priorities).

### Step 7: Post-Launch Optimization
After launch, shift from campaign mode to optimization mode. Monitor channel performance and reallocate budget to highest-performing channels. A/B test messaging and creative based on launch data. Extend reach to secondary ICP segments if primary segment is saturated. Capture and document learnings for the next GTM launch.

## Rules
- ICP must be validated with existing customer data and interviews before launch — no untested assumptions.
- Launch tier must match resource allocation — T1 needs full team, T3 should not consume disproportionate resources.
- Channels must reach the defined ICP, not the broadest possible audience — targeted > broad.
- Beta participants must match ICP to produce relevant feedback — beta feedback from non-ICP users misleads.
- Messaging must be tested with target customers before launch — untested messaging risks missing the mark.
- Launch timeline must include buffer (20% of total planning time) for unexpected delays.
- Post-launch review must be scheduled before launch day — schedule first, execute later.
- Learnings must be documented for future GTM efforts in a shared, searchable repository.
- Competitive positioning must be validated against actual competitor messaging, not assumptions.
- Go/no-go decision must be based on data, not schedule pressure — delaying is better than launching poorly.
- Channel selection must prioritize ICP reach over breadth — narrow and deep beats wide and shallow.

## Framework / Methodologies

### Positioning Framework (April Dunford)
Step 1: Competitive alternatives — who does the customer compare you to? Step 2: Unique attributes — what can you do that alternatives cannot? Step 3: Value — what is the impact of those unique attributes for the customer? Step 4: Target market — who cares most about this value? Step 5: Category — what market category makes the value clear? Step 6: Positioning statement — synthesize into a clear statement. Validate with customers before launch.

### Jobs-to-Be-Done GTM Framework
Focus GTM messaging on the progress the customer wants to make (the job), not the product features. Functional job (what they want to accomplish), emotional job (how they want to feel), social job (how they want to be perceived). GTM messaging that addresses all three job types outperforms feature-focused messaging by 3-5x.

### Crossing the Chasm (Geoffrey Moore)
Technology Adoption Lifecycle: innovators, early adopters, early majority, late majority, laggards. The chasm between early adopters (who buy vision and potential) and early majority (who buy proven solutions) is where most products fail. GTM strategy must explicitly address chasm-crossing: focus on a narrow beachhead segment, provide complete solution, build proof points.

### Channel-Fit Framework
Match channel to product type and ICP: complex B2B → sales-led (high touch, long cycle). Simple B2B → product-led + inside sales (medium touch, medium cycle). Consumer → product-led (low touch, short cycle). Enterprise → sales-led + strategic partnerships (high touch, long cycle, high ACV). Each channel requires different GTM capabilities, org structure, and metrics.

### BLM (Business Leadership Model) for GTM
Three lenses for GTM strategy: Market (where to play — which segments, which geographies), Offer (how to win — what product, what pricing, what positioning), Capabilities (what capabilities are needed — what team, what channels, what systems). The three lenses must be aligned and internally consistent.

### Product-Led GTM Framework
Growth driven by product experience, not sales or marketing. Self-serve signup, in-app conversion, product usage drives expansion. Key metrics: self-serve conversion rate, time-to-value, activation rate, expansion revenue. Product-led GTM requires different investment (product analytics, in-app messaging, onboarding optimization) than sales-led GTM (SDRs, demos, proposals).

## Common Pitfalls

### ICP Too Broad
Defining ICP too broadly to maximize addressable market. Results in messaging that resonates with no one, channels that reach the wrong audience, and sales that are inefficient. Mitigation: narrow ICP to the segment with strongest product-market fit. Expand only after dominating the initial segment.

### Messaging Without Validation
Crafting positioning and messaging based on team assumptions without testing with target customers. Results in messaging that misses the mark, resonates weakly, or uses language customers do not understand. Mitigation: test messaging with 10-20 target customers before launch. Use their language, not internal jargon.

### Under-Resourced T1 Launch
Treating a T1 launch (major product) with T3 resources (minor effort). Results in poor execution across channels, missed deadlines, and underwhelming launch impact. Mitigation: align launch tier with resource allocation honestly. If resources are insufficient, reduce launch scope or delay.

### Ignoring Post-Launch
Investing all energy in launch day and nothing in post-launch optimization. The launch is the start, not the end. Most revenue comes in the weeks and months after launch. Mitigation: plan post-launch campaigns and reviews before launch day. Allocate 60% of GTM budget to post-launch activities.

### Beta Program Misalignment
Recruiting beta participants who do not match ICP. Results in feedback that is not relevant for the target market, false validation, or misleading feature requests. Mitigation: qualify beta participants against the ICP. Exclude non-ICP participants from feedback analysis.

### Channel Overload
Using too many channels with insufficient resources per channel. Results in mediocre execution everywhere and strong execution nowhere. Mitigation: select 2-3 channels maximum for launch. Do them well rather than spreading thin.

## Best Practices

### ICP Definition
- Validate ICP with existing customer data — analyze which segments have highest retention, LTV, and expansion.
- Include behavioral attributes (current solution, purchase triggers, buying process) — not just demographics.
- Create a specific, named example company that represents the ICP for team alignment.
- Define anti-ICP to prevent wasting resources on wrong-fit customers.
- Revisit ICP quarterly as product and market evolve.

### Launch Tiering
- Be honest about launch scope — a T2 with T1 ambitions will disappoint.
- Document the tier decision criteria and rationale for stakeholder alignment.
- Create tier-specific launch templates to streamline execution.
- For T1 launches, assign a dedicated GTM lead with cross-functional authority.
- Reserve T1 launches for truly new products or major platform changes, not every release.

### Channel Selection
- Select channels based on where ICP spends time, not where execution is easiest.
- Estimate channel ROI before committing resources: reach, conversion, cost, time-to-impact.
- Test new channels with small budgets before scaling.
- Integrate channels for funnel coverage: top-of-funnel (awareness), mid-funnel (consideration), bottom-of-funnel (conversion).
- Measure channel attribution to understand each channel's role in the customer journey.

### Messaging
- Use customer language, not internal jargon — test with customers to confirm.
- Quantify benefits where possible: "reduce onboarding time by 40%" not "improve efficiency."
- Differentiate against the customer's current solution, not just competitors.
- Create messaging variants for each stage of the buyer journey: awareness (problem), consideration (solution), decision (proof).
- Refresh messaging quarterly based on market feedback and competitive changes.

### Execution
- Plan backward from launch date with clear milestones and owners.
- Build 20% buffer into the timeline for unexpected delays.
- Run a go/no-go decision at T-2 weeks based on data, not schedule.
- Execute the launch sequence in order: existing customers first, then prospects, then press.
- Monitor launch metrics daily in the first week, weekly thereafter.

## Templates & Tools

### ICP Definition Template
```
### Ideal Customer Profile
Firmographics:
- Company size: {range}
- Industry: {industries}
- Revenue: {range}
- Geography: {regions}

Demographics:
- Role: {title}
- Seniority: {level}
- Decision authority: {buyer / influencer / user}
- Technical sophistication: {level}

Behavioral:
- Current solution: {competitors or manual process}
- Pain points: {top 3}
- Purchase trigger: {event that triggers buying}
- Budget: {range}
- Buying process: {self-serve / sales-assisted / procurement}

### Anti-ICP
- {segment} — Reason: {why excluded}
- {segment} — Reason: {why excluded}

### ICP Example
Company: {named example}
Persona: {named persona}
Why they fit: {explanation}
```

### Launch Tier Assessment
```
### Criteria
Product scope: {new product / major feature / minor feature}
Revenue impact: {high / medium / low}
Strategic importance: {high / medium / low}
Customer impact: {high / medium / low}
Resource availability: {high / medium / low}
Timeline: {12+ weeks / 4-8 weeks / 1-3 weeks}

### Tier Determination: T{X}
Rationale: {explanation of why this tier}

### Resource Allocation
GTM lead: {yes/no} — {FTE allocation}
Marketing: {channels and resource allocation}
Sales: {enablement and resource allocation}
Product: {support and resource allocation}
Engineering: {support and resource allocation}
```

### Channel Strategy Template
```
### Channel Mix
| Channel | Stage | Reach | Expected Conversion | Cost | Priority |
|---------|-------|-------|-------------------|------|----------|
| {name}  | {top/mid/bottom} | {ICP reach estimate} | {% estimate} | {cost estimate} | {H/M/L} |

### Primary Channel: {name}
Strategy: {approach}
Assets needed: {list}
Owner: {name}
Timeline: {dates}
Budget: {amount}

### Secondary Channel: {name}
Strategy: {approach}
Assets needed: {list}
Owner: {name}
Timeline: {dates}
Budget: {amount}
```

### Messaging Framework Template
```
### Positioning
For {ICP} who {need},
{product} is a {category}
that {key benefit}.
Unlike {competitor},
{product} {differentiator}.

### Messaging Hierarchy
Headline: {5-10 words}
Elevator pitch: {2-3 sentences}
Value propositions (3-5 bullets):
- {quantified benefit}
- {quantified benefit}
- {quantified benefit}
Features:
- {feature}: {benefit}
- {feature}: {benefit}

### Proof Points
{metric}: {source}
{testimonial}: {customer name}
{case study}: {link}

### Channel Variants
In-app: {short version}
Email: {benefit-driven version}
Sales: {ROI-focused version}
Press: {newsworthy version}
Social: {conversational version}
```

### Launch Timeline Template
```
### Pre-Launch (T-{X} weeks)
| Week | Activity | Owner | Dependencies | Status |
|------|---------|-------|-------------|--------|
| -12  | {activity} | {owner} | {dependencies} | {status} |

### Launch Week
| Day | Activity | Owner | Channel | Expected Outcome |
|-----|---------|-------|---------|----------------|
| Mon | {activity} | {owner} | {channel} | {outcome} |

### Post-Launch
| Timing | Activity | Owner | Success Criteria |
|--------|---------|-------|----------------|
| D7     | {review} | {owner} | {criteria} |
| D30    | {review} | {owner} | {criteria} |
| D60    | {review} | {owner} | {criteria} |
| D90    | {review} | {owner} | {criteria} |
```

### Beta Program Template
```
### Overview
Goals: {list of goals}
Participants needed: {N}
Duration: {weeks}
Incentive: {description}

### Qualification Criteria
Must-have: {criteria}
Nice-to-have: {criteria}
Exclude: {criteria}

### Cadence
Week 1: Onboarding, welcome survey
Weeks 2-X: Weekly feedback survey, bi-weekly check-in call
Final week: NPS survey, retrospective, reference call request

### Success Criteria
Adoption rate: {target}%
NPS: {target}
Critical feedback items resolved: {count}
Reference customers: {count}
```

### Post-Launch Review Template
```
### D30/D60/D90 Review
Date: {date}
Review period: {start} to {end}

### Performance vs Targets
| Metric | Target | Actual | Variance | Action |
|--------|--------|--------|----------|--------|
| {m1}   | {t}    | {a}    | {v}      | {action} |

### Key Insights
What went well: {list}
What could be improved: {list}
Surprises: {list}

### Competitive Response
Competitor actions: {list}
Our response: {list}

### Lessons Learned
{key lessons for future GTM efforts}
```

## Case Studies

### SaaS Product Launch with ICP Validation
A B2B analytics company planned to launch a new dashboard product. Initial ICP: all product managers at SaaS companies of any size. Customer data analysis revealed that retention was 3x higher for product managers at growth-stage companies (50-500 employees) who had direct control over their analytics budget. ICP was narrowed accordingly.

GTM impact: messaging focused on "self-serve analytics for growing product teams" resonated strongly. Channels selected: product-led (in-app upgrade from existing product), content marketing (blog posts on product analytics for growth), direct sales to growth-stage companies. Beta recruited 35 growth-stage product teams. Launch achieved 220% of revenue target in first quarter. Post-launch analysis: the narrowed ICP converted at 3x the rate of the broad ICP.

### Tier Misclassification Recovery
A project management SaaS classified a major workflow automation feature as T2 (targeted outreach). The feature was strategically important and would affect every user. T2 resources (3-person team, 4-week timeline) were insufficient for the scope.

Result: launch was delayed 6 weeks, channel execution was uneven, in-app messaging was poorly designed, sales team was not enabled until 2 weeks post-launch. Adoption was 40% below target at D30.

Recovery: reclassified as T1 at D45. Assigned dedicated GTM lead, upgraded channel execution, re-enabled sales team, ran targeted email campaign. Adoption reached 90% of target by D90. Lesson: tier honestly based on scope and strategic importance, not resource availability.

### Product-Led vs. Sales-Led Channel Selection
A cybersecurity startup launched a new compliance tool. Two-channel experiment: product-led (self-serve signup, in-app conversion) for SMB, sales-led (SDR outreach, demo, proposal) for enterprise. Results after 6 months: product-led channel converted 12% of signups with $0.30 CAC (cost per acquired user). Sales-led channel converted 8% of qualified leads with $4,500 CAC but $85K ACV.

Decision: maintained both channels but invested differently. Allocated 70% of GTM budget to sales-led (higher ROI despite higher CAC) and 30% to product-led (growth potential, lower touch). Lesson: channel selection depends on ICP ACV and conversion economics, not just reach.

## References
  - references/channel-strategy.md — Channel Strategy
  - references/go-to-market-advanced.md — Go To Market Advanced Topics
  - references/go-to-market-fundamentals.md — Go To Market Fundamentals
  - references/gtm-launch-execution.md — GTM Launch Execution Playbook
  - references/gtm-strategy-playbook.md — GTM Strategy Playbook
  - references/launch-checklist.md — Launch Checklist
  - references/launch-tiers.md — Launch Tiers
  - references/positioning-guide.md — Product Positioning Guide

## Handoff
For pricing strategy support, hand off to `product-pricing-strategy`. For growth experiments post-launch, hand off to `product-growth-engineering`. For customer journey analysis to inform GTM touchpoints, hand off to `product-customer-journey`. For experiment design on launch messaging, hand off to `product-ab-testing`.
