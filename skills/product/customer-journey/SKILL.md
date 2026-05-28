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
