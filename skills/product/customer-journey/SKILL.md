---
name: product-customer-journey
description: >
  Use this skill when analyzing customer journeys: journey mapping, service blueprinting, journey analytics, and journey optimization.
  This skill enforces: lifecycle stage mapping, touchpoint identification, service blueprint creation, funnel analysis methodology.
  Do NOT use for: persona development, user research interviews, usability testing, feature prioritization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, customer-journey, phase-8]
---

# Customer Journey Agent

## Purpose
Analyzes and optimizes customer journeys through journey mapping, service blueprinting, quantitative funnel analysis, and experimentation to improve end-to-end customer experience.

## Agent Protocol

### Trigger
Exact user phrases: customer journey, journey map, service blueprint, touchpoint mapping, funnel analysis, journey analytics, journey optimization, omnichannel, moment of truth.

### Input Context
- What is the customer lifecycle stage or scope of the journey?
- What touchpoints and channels are involved?
- What quantitative data exists (funnel, drop-off, CSAT)?
- What are the known pain points and moments of truth?
- What business goals is the journey tied to?
- What customer segments are in scope?
- What is the current-state baseline for journey metrics?

### Output Artifact
Customer journey analysis with journey map, service blueprint, funnel analytics, and optimization recommendations.

### Response Format
```
## Customer Journey Analysis
### Journey Scope
{lifecycle stages covered} | {channels} | {segments}
### Key Findings
1. {finding} (evidence: {source})
2. {finding} (evidence: {source})
### Pain Points
{stage}: {pain point} | Severity: {H/M/L} | Frequency: {H/M/L}
### Opportunities
{stage}: {opportunity} | Impact: {H/M/L} | Effort: {H/M/L}
### Recommended Experiments
{experiment} | Primary metric: {metric} | Duration: {duration}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Journey scope defined with lifecycle stages, channels, and segments
- [ ] Current-state journey map created with touchpoints and emotional timeline
- [ ] Service blueprint with frontstage/backstage/support process layers
- [ ] Funnel analysis with drop-off rates per step and segment breakdown
- [ ] Moments of truth identified and assessed by impact and satisfaction
- [ ] Pain points prioritized by severity, frequency, and business impact
- [ ] Optimization recommendations with expected impact and effort estimates
- [ ] Measurement plan with leading and lagging indicators
- [ ] Abandonment recovery mechanisms documented

### Max Response Length
7000 tokens

## Workflow

### Step 1: Scope Definition
Define the customer journey boundaries: which lifecycle stages (awareness through advocacy), which channels (web, mobile, in-person, email, chat, phone), which customer segments (by plan, persona, region, acquisition source). Align scope with business goals and available data. Determine if this is current-state mapping or future-state vision. Identify stakeholders and data sources available for each journey stage.

Establish scope constraints: time period for analysis (last 90 days, last 6 months), geographic regions included, product lines or features covered. Document any known biases in available data (e.g., only digital channel data available, no offline touchpoint data). Set expectations for what the analysis will and will not cover.

### Step 2: Journey Mapping
Map the current-state journey across lifecycle stages. Identify all touchpoints (where customer interacts with brand), channels (medium of interaction), and actions (what customer does at each step). Add emotional journey timeline showing satisfaction highs and lows — use CSAT survey data where available, proxy signals (support volume, session replay) where not.

Mark moments of truth — critical touchpoints that disproportionately impact overall experience perception. Use a 2x2 matrix of impact vs. satisfaction to classify each moment of truth. Identify channel transitions and flag where context is lost between channels. Document customer questions, motivations, and barriers at each stage. Include timing estimates between steps to identify slowdowns.

### Step 3: Service Blueprinting
Layer operational reality over the journey map. Define five layers: physical evidence (every artifact customer encounters), customer actions, frontstage actions (visible employee or system interactions), backstage actions (invisible support work), and support processes (systems, tools, third parties).

Draw line of interaction (customer vs provider), line of visibility (seen vs unseen), and line of internal interaction (core team vs support teams). For each customer action, ensure there is at least one frontstage or backstage action and support process supporting it. Mark fail points with severity and frequency estimates. Identify wait times — both explicit (customer perceives the wait) and implicit (processing time customer does not see). Flag process gaps where no defined process exists for a customer expectation.

### Step 4: Journey Analytics
Quantify journey performance using funnel analysis. Define sequential funnel steps aligned to the journey stages. Measure step completion rates and absolute and relative drop-off percentages. Calculate time-to-value per journey — time elapsed between first interaction and first meaningful value experience.

Segment drop-off by customer attributes: plan tier, company size, acquisition channel, user role, device type, geographic region. Correlate journey experience with CSAT and NPS scores at each stage. Perform path analysis to identify common deviations from the ideal path — where do users go instead of the designed flow? Detect loop patterns where users get stuck in cycles. Compare power user paths vs. churning user paths to identify differentiating behaviors.

### Step 5: Optimization Recommendations
Prioritize optimization opportunities by pain point severity, frequency, and business impact. Use a scoring model: impact × confidence / effort. Propose specific experiments for each opportunity:

Funnel experiments: test changes to specific funnel steps (CTA copy, form length, button placement, layout). Sequence experiments: test order of steps in a journey. Channel experiments: test which channel works best at each journey stage. Personalization experiments: test content, navigation, or communication tailored by segment.

Design abandonment recovery mechanisms for each channel (email, push, SMS, retargeting, in-app). Set recovery timing based on abandonment context — immediate for high-intent, same-day for moderate, multi-touch for high-value journeys. Ensure omnichannel consistency across all touchpoints — visual, data, process, context, and voice consistency. Define success metrics for each change with primary metric, secondary metric, and guardrail metrics to prevent sub-optimization.

### Step 6: Measurement and Iteration
Establish a measurement framework with leading indicators (engagement trend, support ticket volume, session frequency, feature adoption rate) and lagging indicators (churn rate, revenue retention, LTV, annual NPS). Design a dashboard with four tiers: overall journey health score, funnel conversion with drop-off callouts, CSAT by stage with trend lines, segment comparison.

Set up automated alerts when any metric drops below threshold. Schedule regular journey review cadence (monthly for high-traffic journeys, quarterly for others). Re-baseline journey metrics after each optimization cycle. Document lessons learned from each experiment — what worked, what did not, and why.

## Rules
- Journeys must be mapped from customer perspective, not internal processes or org structure.
- Moments of truth must be validated with customer research or behavioral data, not assumptions.
- Funnel analysis requires event-level tracking data — aggregate data hides important patterns.
- Service blueprints must include at least one support process layer per customer action.
- Pain points must be ranked by severity AND frequency, not severity alone.
- Optimization recommendations must include measurement criteria and guardrail metrics.
- Omnichannel analysis must cover all touchpoints, not just digital channels.
- Journey maps are hypotheses until validated with data and research.
- Every customer action in a blueprint must connect to at least one frontstage or backstage action.
- Do not optimize a single step at the expense of the overall journey experience.
- CSAT surveys must be contextual to the specific experience, not generic satisfaction surveys.
- Segmentation must be applied to funnel analysis — aggregate funnels hide segment-specific drop-offs.
- Personalization must include an opt-out mechanism and avoid over-personalization.
- Abandonment recovery is a safety net, not a substitute for fixing underlying friction.
- Funnel steps must be sequential, non-overlapping, and consistent across users.
- Time-to-value is a leading indicator of retention — include it in all journey analyses.

## Journey Analytics Advanced Methods

### Path Analysis
Analyze the actual paths users take through the journey, not just the ideal designed path. Use sequence analysis to find common navigation patterns. Identify top 5-10 most common paths and their conversion rates. Compare power user paths vs churning user paths to find differentiating behaviors. Look for loop patterns where users get stuck repeating the same steps without progressing. Use sankey diagrams to visualize flow between stages.

### Customer Effort Score Integration
Place micro-surveys at key journey milestones using CES questions: "How much effort did you personally have to put forth to handle [journey step]?" (Very Low Effort to Very High Effort, 1-5). Score each journey step independently. Correlate high-effort steps with churn, support volume, and NPS. Target <2.5 average CES per step. High-effort steps are the highest-priority optimization targets.

### Journey-Level Attribution
Attribute revenue or retention impact to specific journey stages, not just the last touchpoint. Use time-decay attribution (more weight to recent stages), position-based attribution (more weight to first and last stages), or data-driven attribution (ML model assigning credit based on correlation with outcomes). Compare attribution models to understand which stages drive the most value.

## Journey Governance

### Journey Ownership Model
Assign a journey owner for each major customer journey. The owner has end-to-end accountability for journey metrics: completion rate, satisfaction score, time-to-value, and revenue impact. Journey owners are cross-functional — they coordinate across product, design, engineering, marketing, sales, and support.

Responsibilities: maintain journey map and service blueprint, monitor journey metrics, identify optimization opportunities, run experiments, coordinate cross-functional improvements, report journey health to leadership.

### Journey Health Score
Composite metric capturing overall journey quality:

```
Journey Health Score = w1 × completion_rate + w2 × satisfaction + w3 × TTV_score + w4 × retention_impact

Where:
  completion_rate = % of users completing journey end-to-end
  satisfaction = CSAT or CES at journey completion (normalized 0-1)
  TTV_score = 1 - (actual_TTV / target_TTV), capped at 0-1
  retention_impact = correlation between journey completion and D30 retention
  w1-w4 = weights summing to 1.0 (determined by business priorities)
```

Target: >0.8 Green, 0.6-0.8 Yellow, <0.6 Red. Track monthly for high-traffic journeys, quarterly for low-traffic.

### Journey Review Cadence

| Review Type | Frequency | Participants | Agenda |
|-------------|-----------|-------------|--------|
| Health check | Weekly (high-traffic) | Journey owner + PM | Metric trends, alerts, ongoing experiments |
| Deep dive | Monthly | Cross-functional team | Funnel analysis, pain point review, experiment results |
| Strategic review | Quarterly | Leadership + journey owners | Journey priorities, resource allocation, ROI analysis |
| Full refresh | Annually | All stakeholders | Journey map update, new research, market changes |

## Framework / Methodologies

### McKinsey Customer Journey Excellence Framework
Four pillars: journey-focused culture, integrated measurement, continuous improvement, cross-functional accountability. Map journeys end-to-end, measure outcomes per journey (not per touchpoint), run iterative experiments, and assign journey owners with P&L accountability. Prioritize journeys by revenue impact and customer pain.

### Forrester Service Blueprinting Methodology
Five-layer blueprint structure: physical evidence, customer actions, frontstage actions, backstage actions, support processes. Three threshold lines: interaction, visibility, internal interaction. Mark fail points, wait times, and process gaps. Use workshops with cross-functional participants to build and validate.

### Google HEART Framework for Journey Metrics
Happiness: CSAT, NPS, satisfaction per stage. Engagement: session frequency, feature adoption, journey progress. Adoption: new user journey completion rate, feature discovery rate. Retention: repeat journey rate, time between journeys. Task Success: journey completion rate, error rate, time-on-task.

### Jobs-to-be-Done Journey Mapping
Map journey around the functional, emotional, and social jobs the customer is trying to accomplish. Identify the progress the customer wants to make, not just the steps they take. Structure journey around the job lifecycle: defining, locating, preparing, confirming, executing, monitoring, modifying, maintaining.

### Lean Service Design Methodology
Build journey maps and service blueprints iteratively with minimal viable fidelity. Start with assumptions and validate with quick customer research rounds. Use the smallest possible scope to generate actionable insights. Prototype service improvements before full implementation. Measure before and after to confirm improvement.

### Customer Effort Score (CES) Framework
Measure how much effort customers expend at each journey stage. High-effort experiences predict churn more accurately than low-satisfaction experiences. Focus optimization on reducing effort rather than increasing delight. Key effort drivers: channel switching, repeating information, resolving issues, finding information.

## Common Pitfalls

### Mapping From Internal Perspective
Building the journey around internal processes, systems, or org structure instead of the customer's actual experience. Results in a process flow diagram, not a journey map. The map reflects how the company thinks the journey works rather than how the customer experiences it. Mitigation: always start with customer research before involving internal stakeholders.

### Cherry-Picking Funnel Data
Reporting only the funnel steps that show good performance while omitting steps with high drop-off. Selecting convenient time windows that exclude poor-performing periods. Using aggregate data that masks segment-specific patterns. Mitigation: require full funnel reporting with all steps, consistent time windows, and mandatory segment breakdown.

### Blueprint Without Validation
Building a service blueprint based solely on team assumptions without verifying with operations teams. Results in missing fail points, incorrect process flows, and missed improvement opportunities. Mitigation: blueprint workshop must include representatives from every swimlane — front-line staff, operations, engineering, support.

### Optimizing Touchpoints in Isolation
Improving individual touchpoint metrics (click rate, page speed, form completion) without measuring impact on the overall journey. A faster checkout might increase cart abandonment elsewhere in the journey. Mitigation: every experiment must include journey-level guardrail metrics, not just touchpoint-specific metrics.

### Ignoring the Emotional Journey
Mapping only actions and touchpoints without capturing what the customer feels at each stage. Misses the most important driver of satisfaction and loyalty — emotion. A functionally perfect journey can still fail if it feels impersonal, stressful, or confusing. Mitigation: include emotional timeline on every journey map, validated with customer sentiment data.

### Over-Personalization
Using too much customer data to personalize without establishing trust first. Personalization that feels invasive or surprising damages the relationship. Wrong personalization (inaccurate segment targeting, outdated behavior data) creates worse experience than no personalization. Mitigation: start with simple rule-based personalization, always offer opt-out, test before rolling out.

### Channel Silos
Analyzing and optimizing each channel independently without considering cross-channel context. Results in inconsistent experiences, lost context during channel switches, and customer frustration from repeating information. Mitigation: map channel transitions explicitly in journey maps, require cross-channel data integration before optimization.

### Static Journey Maps
Creating a journey map as a one-time exercise and never updating it. Customer behavior, market conditions, and product features change — the journey map becomes increasingly inaccurate over time. Mitigation: set a regular review cadence (monthly or quarterly) and update maps when significant product or market changes occur.

## Best Practices

### Journey Mapping
- Always start with customer research before involving internal stakeholders — journey maps must be customer-informed, not assumption-driven.
- Include the emotional journey as a separate timeline — functionally perfect journeys can still fail on emotion.
- Validate each touchpoint with behavioral data (analytics, session replays) and attitudinal data (surveys, interviews).
- Use a 2x2 matrix (impact vs. satisfaction) to prioritize moments of truth — focus on low-satisfaction, high-impact first.
- Map both current-state (real experience including workarounds) and future-state (ideal experience).
- Include timing estimates between steps to identify hidden slowdowns and friction points.
- Document customer questions, motivations, and goals at each stage — not just what they do but why.

### Service Blueprinting
- Involve cross-functional participants in a workshop format — product, design, engineering, support, sales, operations.
- Use the five-color sticky note method: one color per layer (physical evidence, customer, frontstage, backstage, support).
- Ensure every customer action has at least one supporting frontstage or backstage action and a support process.
- Mark fail points explicitly with severity and frequency estimates — use these as the prioritization input.
- Draw wait times on the blueprint with a distinction between explicit (customer perceives) and implicit (hidden).
- Validate the completed blueprint with actual operations teams, not just the design team.

### Journey Analytics
- Always segment funnel analysis — aggregate funnels hide drop-off patterns that affect specific user groups.
- Measure time-to-value (TTV) as a leading indicator of retention and activation.
- Perform path analysis to find common deviations from the designed ideal path.
- Detect loop patterns where users get stuck in cycles without progressing.
- Compare high-retention and low-retention user paths to identify differentiating behaviors.
- Place micro-surveys at key journey milestones for contextual CSAT data.
- Use leading indicators (engagement, support volume, session frequency) to predict churn before it happens.

### Optimization
- Run experiments on one friction point at a time to isolate impact on journey metrics.
- Use a prioritization model: impact × confidence / effort — score every opportunity consistently.
- Design experiments with primary metric, secondary metric, and guardrail metrics.
- Never optimize a single step at the expense of the overall journey — always measure journey-level impact.
- Implement abandonment recovery as a safety net, not a substitute for fixing underlying friction.
- Match recovery timing to abandonment context: immediate for high-intent, same-day for moderate, multi-touch for complex.
- Personalize at moments when relevance matters most: onboarding, feature discovery, churn risk — not everywhere.

### Measurement
- Track both leading indicators (engagement, support volume, feature adoption) and lagging indicators (churn, LTV, NPS).
- Design dashboards with a hierarchy: overall health score → funnel metrics → stage-level CSAT → segment comparison.
- Set automated alerts for metrics dropping below threshold — intervene before churn accelerates.
- Re-baseline after each optimization cycle to track improvement trajectory.
- Document lessons learned from each experiment in a shared repository.
- Correlate journey experience metrics with business outcomes (revenue, retention, LTV).

## Templates & Tools

### Journey Map Template Structure
```
| Stage | Touchpoint | Channel | Customer Action | Customer Goal | Emotion | Pain Point | Opportunity |
|-------|-----------|---------|----------------|--------------|---------|------------|-------------|
|       |           |         |                |              |         |            |             |
```
Add columns for: touchpoint owner, data source, satisfaction score (1-5), effort score (1-5), timing estimate.

### Moment of Truth Prioritization Matrix
```
| Moment of Truth | Impact (1-5) | Satisfaction (1-5) | Priority | Action |
|-----------------|-------------|-------------------|----------|--------|
|                 |             |                   |          |        |
```
Priority: Low Satisfaction + High Impact = Urgent Action. High Satisfaction + High Impact = Protect. Low Satisfaction + Low Impact = Monitor. High Satisfaction + Low Impact = No Action.

### Pain Point Scoring Template
```
| Pain Point | Stage | Severity (1-5) | Frequency (1-5) | Score | Business Impact | Churn Risk |
|-----------|-------|----------------|-----------------|-------|----------------|-----------|
|           |       |                |                 |       |                |           |
```
Score = Severity × Frequency. Use for prioritization.

### Optimization Opportunity Scoring
```
| Opportunity | Impact (1-5) | Confidence (1-5) | Effort (1-5) | Priority Score | Experiment Type | Duration |
|------------|-------------|-----------------|--------------|---------------|----------------|----------|
|            |             |                 |              |               |                |          |
```
Priority Score = Impact × Confidence / Effort. Higher score = higher priority.

### Funnel Analysis Report Template
```
## Funnel: {Funnel Name}
Period: {start} to {end}
Segments: {segments analyzed}

| Step | Entrants | Advanced | Drop-off | Drop-off Rate | Segment Breakdown |
|------|---------|---------|---------|-------------|------------------|
|      |         |         |         |             |                  |

Top drop-off segments: {segment details}
Time-to-value (average): {TTV}
TTV by segment: {segment TTVs}
```

### Service Blueprint Canvas
```
Physical Evidence: |        |        |        |        |
Customer Actions:  |        |        |        |        |
--- Line of Interaction ---
Frontstage:        |        |        |        |        |
--- Line of Visibility ---
Backstage:         |        |        |        |        |
--- Line of Internal Interaction ---
Support Processes: |        |        |        |        |

Fail Points: {list with severity/frequency}
Wait Times: {explicit vs implicit}
Process Gaps: {list}
```

### Experiment Design Card
```
Hypothesis: If we {change} at {step}, then {metric} will {direction} by {amount} because {reason}.
Primary Metric: {metric}
Secondary Metrics: {metrics}
Guardrail Metrics: {metrics}
Target Segment: {segment}
Duration: {days}
Sample Size Required: {n}
Risk Assessment: {low/medium/high}
```

### Journey Health Dashboard Layout
```
Row 1: Overall Journey Health Score (composite) — Green/Yellow/Red
Row 2: Funnel Funnel with drop-off callouts at each step
Row 3: CSAT by Stage — line chart with trend
Row 4: Segment Comparison — best vs worst performing segments
Row 5: Leading Indicators — engagement trend, support volume, session frequency
Alerts: auto-triggered when any metric drops below threshold
```

## Case Studies

### SaaS Onboarding Journey Optimization
A B2B SaaS company mapped their trial-to-paid journey and found 68% drop-off between signup and first key action. Service blueprint revealed six backstage steps (account provisioning, data migration, permission setup, training scheduling, integration configuration, compliance check) delaying first value experience. Average TTV was 11 days against a 14-day trial.

Optimization: automated account provisioning, pre-configured default settings, added guided setup wizard, offered template-based starting points. Reduced TTV from 11 to 3 days. Trial-to-paid conversion increased from 22% to 38%. Retained improvements through quarterly journey reviews and re-baselining.

### E-Commerce Checkout Abandonment Recovery
An e-commerce platform analyzed their purchase journey and identified 74% cart abandonment at the payment step. Journey analytics segmented by device, payment method, and cart value. Found that mobile users on the 3-step checkout had 82% abandonment vs. 61% on desktop.

Optimization: consolidated to single-page checkout for mobile, added digital wallet payment options (Apple Pay, Google Pay), implemented email abandonment recovery within 1 hour for carts over $50, added trust signals (security badges, return policy) at payment step. Cart abandonment reduced from 74% to 51%. Recovery emails converted 12% of abandoners. Revenue recovered: $2.4M annually.

### Telecom Omnichannel Journey Redesign
A telecom provider mapped the customer support journey across web, mobile app, chat, phone, and in-store. Found that 43% of customers contacted support through two or more channels for the same issue. Average issue required 2.7 channel switches and involved repeating account information 1.8 times.

Optimization: unified customer profile across all channels, implemented cross-channel session management (don't treat each channel as separate visit), deployed chat-to-phone handoff with full context preserved, added self-service resolution options before live agent contact. Average issue resolution time decreased from 8.4 to 3.2 days. CSAT improved from 3.1 to 4.3 (out of 5). Support volume decreased 23% as self-service resolution improved.

### Fintech First-Value Acceleration
A fintech app analyzed their activation journey and found that users who completed the first transaction within 3 days had 89% 90-day retention vs. 34% for those who took longer than 7 days. The journey map revealed unnecessary steps: mandatory profile photo upload, three separate identity verification checks, and a 24-hour manual approval process.

Optimization: reduced verification to single automated check using government ID scan, moved profile photo to optional post-activation step, replaced manual approval with instant verification. TTV reduced from 5 days to 12 minutes. First-week activation rate increased from 31% to 64%. 90-day retention improved from 47% to 71%.

### Healthcare Service Blueprint Redesign
A healthcare provider mapped the patient intake journey across appointment booking, pre-visit preparation, check-in, consultation, and follow-up. Service blueprint revealed 14 distinct backstage actions for a single patient visit, 4 fail points (insurance verification, lab order routing, referral processing, follow-up scheduling), and 2 process gaps (no process for late cancellations, no follow-up for abnormal results).

Optimization: automated insurance pre-verification at booking time, integrated lab order system with EMR, created cancellation recovery process, implemented automated follow-up for abnormal results. Reduced backstage actions from 14 to 7. Patient satisfaction improved from 3.8 to 4.5. No-show rate decreased 31%.

## Expanded Decision Trees

### Journey Optimization Prioritization Decision Tree
```
What is the current journey health score?
  |-- <0.6 (Red) --> Focus on fixing broken steps first
  |     |-- Highest drop-off step → Fix usability issues
  |     |-- Lowest CSAT step → Reduce friction
  |-- 0.6-0.8 (Yellow) --> Focus on high-impact improvements
  |     |-- High effort + low satisfaction → Reduce effort
  |     |-- High drop-off → Optimize funnel step
  |-- >0.8 (Green) --> Focus on delight and differentiation
        |-- Moments of truth → Enhance and protect
        |-- New channels → Expand reach and convenience

What is the primary constraint?
  |-- Engineering capacity → Prioritize low-effort high-impact changes
  |-- Data availability → Run discovery/measurement experiments first
  |-- Org alignment → Start with journey health workshop for alignment
  |-- Budget → Focus on no-cost changes (process, messaging, UX copy)
```

### Research Method Selection Decision Tree
```
Do you have quantitative data for this journey stage?
  |-- YES --> Is the data sufficient to identify the problem?
  |     |-- YES --> Jump to solution design and experimentation
  |     |-- NO --> Add qualitative research (interviews, session replays)
  |-- NO --> Do you have a hypothesis about the problem?
        |-- YES --> Run a targeted survey or micro-survey at the step
        |-- NO --> Conduct exploratory interviews (5-8 users)

What is the confidence in your understanding of customer needs?
  |-- High ({data from 3+ sources converge}) --> Design solution and test
  |-- Medium ({data from 1-2 sources}) --> Validate with additional research
  |-- Low ({assumptions only}) --> Start with generative research (interviews, diary studies)
```

### Channel Integration Decision Tree
```
Does the customer switch between channels during this journey?
  |-- YES --> Is context preserved across channels?
  |     |-- YES --> Ensure seamless handoff timing and communication
  |     |-- NO --> Prioritize context preservation (single customer view)
  |-- NO --> Is the journey completed in one channel?
        |-- YES --> Optimize within-channel experience
        |-- NO --> Consider adding cross-channel options

What channels are available for this journey stage?
  |-- Digital only → Optimize digital experience; consider adding human touchpoint
  |-- Human only → Consider adding digital option for convenience
  |-- Both → Map where each channel performs best; optimize channel routing
```

## Templates

### CSAT Survey Template (Micro-Survey)
```
After journey step completion:
  "How satisfied were you with [specific experience]?"
  Scale: 1 (Very Dissatisfied) — 5 (Very Satisfied)
  
  Follow-up (if score < 4):
  "What could we improve?" [open text]
  
  Follow-up (if score = 5):
  "What did you like most?" [open text]
```

### Journey Diagnostics Report Template
```
# Journey Diagnostics: {Journey Name}
Period: {start} to {end}

## Overall Health
Health Score: {value} — {Green/Yellow/Red}
Trend: {improving/stable/declining} — {X% change vs previous period}

## Funnel Performance
| Step | Entrants | Completion | Drop-off | vs Target | Trend |
|------|---------|-----------|---------|-----------|-------|
| {step} | {n} | {%} | {%} | {±X%} | {direction} |

## Pain Points (Top 5 by Score)
| Pain Point | Stage | Severity | Frequency | Score | Churn Impact |
|-----------|-------|---------|----------|-------|-------------|

## Moments of Truth Assessment
| Moment | Impact | Satisfaction | Status | Action |
|--------|--------|-------------|--------|--------|

## CSAT by Stage
| Stage | Score | Responses | vs Previous | Target Met? |
|-------|-------|-----------|-------------|-------------|

## Recommendations
1. {recommendation} — Expected impact: {estimation}
2. {recommendation} — Expected impact: {estimation}

## Action Items
| Action | Owner | Priority | Timeline | Status |
|--------|-------|----------|----------|--------|
```

### Abandonment Recovery Playbook Template
```
# Abandonment Recovery: {Journey Step}

## Triggers
{What specific abandonment event triggers recovery}
Detection method: {analytics event / timeout / exit intent}

## Recovery Channels (Ranked by Effectiveness)
| Channel | Conversion Rate | Timing | Message Type |
|---------|----------------|--------|--------------|
| {channel} | {X%} | {timing} | {email/push/SMS} |

## Message Templates
### Immediate Recovery (within 5 min)
Subject: {subject}
Body: {value reminder + link to resume}

### Follow-up (24 hours)
Subject: {subject}
Body: {social proof + limited-time incentive if applicable}

### Final Attempt (72 hours)
Subject: {subject}
Body: {urgency signal + clear CTA}

## Success Metrics
- Recovery contact rate: {%}
- Recovery conversion rate: {%}
- Revenue recovered: ${amount}
- Time-to-recovery: {average}
```

## Expanded Governance Model

### Journey Ownership Charter
Each journey owner's responsibilities:
- **Maintain journey map**: Update when product or market changes. Review quarterly with cross-functional team.
- **Monitor journey metrics**: Weekly health check against targets. Alert stakeholders when metrics drop below threshold.
- **Identify opportunities**: Continuous analysis of funnel data, CSAT trends, support tickets, and user research.
- **Run experiments**: Prioritize, design, run, and evaluate experiments on journey touchpoints.
- **Coordinate improvements**: Work across product, design, engineering, marketing, sales, and support to implement changes.
- **Report to leadership**: Monthly journey health report with metrics, improvements, and recommendations.

Journey owner authority: can block changes that negatively impact journey metrics, can request resources for journey improvements, has decision rights on journey-level prioritization.

### Cross-Functional Journey Team Structure
| Role | Responsibility | Time Allocation |
|------|---------------|-----------------|
| Journey Owner | End-to-end accountability | 100% |
| Product Manager | Feature prioritization for journey | 25-50% |
| UX Designer | Journey map maintenance, research | 25-50% |
| Data Analyst | Funnel analysis, metric tracking | 25% |
| Engineering Lead | Technical feasibility, implementation | 25% |
| Customer Support Rep | Pain point insights, CSAT data | 10% |
| Marketing/Sales Rep | Acquisition touchpoints | 10% |

### Journey Maturity Model
| Level | Name | Characteristics | Practices |
|-------|------|----------------|-----------|
| 1 | Initial | No journey maps, ad-hoc optimization | Reactive fixes, no measurement |
| 2 | Defined | Journey maps exist, basic funnel tracking | Quarterly reviews, pain point lists |
| 3 | Managed | Service blueprints, segment analysis | Monthly reviews, experimentation |
| 4 | Optimized | Journey health score, predictive analytics | Weekly monitoring, automated alerts |
| 5 | Leading | AI-driven personalization, real-time optimization | Continuous experimentation, proactive |

## Expanded Case Studies

### B2B SaaS Trial Journey Overhaul
A B2B data analytics platform discovered through journey mapping that their 14-day free trial had a 4% conversion rate. The journey map revealed: day 1-3 had high engagement, day 4-7 had a steep drop-off as users encountered complex setup, and less than 15% of users completed the setup wizard.

Optimization: restructured the 14-day trial into a guided 7-day program with daily email prompts and milestone celebrations. Simplified setup to 3 steps with template-based data import. Added a "success coordinator" touchpoint on day 3. Results: setup completion increased from 15% to 62%. Trial-to-paid conversion increased from 4% to 14%. The journey health score improved from 0.42 to 0.71.

### Mobile App Onboarding Friction Reduction
A consumer mobile app had 55% drop-off during onboarding between download and first core action. Journey analytics segmented by acquisition source and device type. Found that organic users had 25% higher completion than paid users, and Android users had 18% higher drop-off than iOS.

Optimization: reduced onboarding steps from 7 to 3 for all users (permission requests delayed to point of need). Added skip option for tutorial. Personalized first-experience content based on acquisition source. Results: onboarding completion increased from 45% to 78%. D7 retention increased from 22% to 41%. The emotional journey timeline showed satisfaction improved at every step.

### Financial Services Cross-Channel Journey
A bank mapped the mortgage application journey across web, mobile, phone, and in-branch. Found that 67% of applicants used 3+ channels during the process and 82% had to repeat information during channel switches. Average application completion time: 23 days.

Optimization: single customer profile across all channels with real-time sync. Implemented channel-aware design (save progress, resume on any channel). Added document upload via mobile during phone calls. Results: average completion time reduced to 8 days. Abandonment rate decreased from 45% to 22%. CSAT improved from 3.2 to 4.1.

## References
  - references/customer-journey-advanced.md — Customer Journey Advanced Topics
  - references/customer-journey-fundamentals.md — Customer Journey Fundamentals
  - references/customer-journey-analytics.md — Customer Journey Analytics Deep Dive
  - references/customer-journey-optimization.md — Customer Journey Optimization Playbook
  - references/journey-analytics.md — Journey Analytics
  - references/journey-mapping.md — Journey Mapping
  - references/journey-optimization.md — Journey Optimization
  - references/service-blueprint.md — Service Blueprinting

## Handoff
For persona insights to inform journey stages, hand off to `product-persona-development`. For analytics event tracking, hand off to `product-analytics`. For user research validation, hand off to `product-user-research`. For experiment execution on journey touchpoints, hand off to `product-ab-testing`. For growth metric tracking across journey stages, hand off to `product-growth-engineering`.
