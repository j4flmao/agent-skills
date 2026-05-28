# Growth Metrics and Funnel Analysis

## Overview
Growth metrics and funnel analysis form the quantitative foundation of growth engineering. This reference covers the metric frameworks, funnel analysis techniques, cohort analysis, leading indicator identification, and dashboard design that growth teams use to measure, diagnose, and drive growth.

## Growth Metric Frameworks

### AARRR (Pirate Metrics) Framework
The foundational growth metric framework, developed by Dave McClure, maps the user lifecycle into five stages:

Acquisition: users discover and arrive at the product. Metrics: traffic by source, new user signups, app installs, cost per acquisition (CPA), traffic-to-signup conversion rate. Leading indicators: traffic trend, signup rate by source, CPA trend.

Activation: users have a great first experience. Metrics: activation rate (users reaching Aha moment within defined timeframe), time-to-value (TTV), signup-to-activated conversion rate, onboarding step completion rates. Leading indicators: activation rate trend, TTV trend, onboarding step drop-off rates.

Retention: users come back and continue using the product. Metrics: day N retention (D1, D7, D30, D90), DAU/MAU ratio, session frequency, churn rate, time between sessions. Leading indicators: early retention (D1, D7), engagement trend, session depth.

Revenue: users pay for the product. Metrics: conversion rate (free-to-paid, trial-to-paid), average revenue per user (ARPU), average revenue per paying user (ARPPU), customer acquisition cost (CAC), lifetime value (LTV), LTV/CAC ratio. Leading indicators: feature adoption before conversion, upgrade velocity, payment success rate.

Referral: users invite others. Metrics: K-factor (invite rate × conversion rate), viral cycle time, invite rate, invitee activation rate, referral-sourced users, organic growth rate. Leading indicators: invite rate trend, share rate, referral landing page conversion.

#### AARRR Best Practices
Track all five stages — missing one creates blind spots. A product with great acquisition and terrible retention is not growing. Assign a primary metric per stage and monitor trend weekly. Correlate stage metrics: activation rate predicts retention, retention predicts referral, retention and referral predict LTV.

### North Star Metric
A single metric that best captures the core value the product delivers to users. The North Star metric aligns the entire organization on a single growth objective. It is not a vanity metric — it correlates with long-term retention and revenue.

Characteristics of a good North Star metric: captures delivered value (not just activity), leads to revenue (correlates with conversion and retention), is actionable (team can influence it directly), is measurable (tracked reliably), is leading (predicts future outcomes).

Examples: Facebook: Daily Active Users (DAU). Spotify: Time Spent Listening. Airbnb: Nights Booked. Slack: Messages Sent. Dropbox: Files Saved. Zoom: Meeting Minutes.

North Star metric should be reviewed weekly by the growth team. Track trend, segment by user type, set targets (absolute and growth rate). Use as the ultimate decision criterion for growth experiments.

### One Metric That Matters (OMTM)
At any given time, the growth team focuses on a single metric that represents the biggest growth opportunity. The OMTM changes over time as the product and market evolve. Using the OMTM prevents the team from spreading efforts across too many metrics and experiments.

Selecting the OMTM: evaluate each stage of AARRR. Which stage has the highest improvement potential? Which metric, if improved, would have the biggest impact on the North Star? Which metric is currently furthest from target?

Example OMTM progression: Month 1: Activation Rate (leaky onboarding). Month 2-3: Referral Invite Rate (low virality). Month 4-5: Trial-to-Paid Conversion (pricing optimization). Month 6+: Retention Rate (churn reduction).

### Growth Accounting Framework
Growth accounting decomposes net new user growth into three components:

New users: users acquired through all channels (organic, paid, viral, sales). Gross new users added in the period.

Resurrected users: previously churned users who return during the period. Reactivated through re-engagement campaigns, product improvements, or natural return.

Churned users: previously active users who stop using the product during the period. Includes both voluntary churn (user decides to leave) and involuntary churn (payment failure, account expiration).

Net new users = New + Resurrected - Churned.

Growth accounting dashboard: show the three components stacked weekly or monthly. Green bar for new + resurrected, red bar for churned. Net position is the difference. Growth rate = net new users / total users at period start.

Growth accounting reveals the true growth trajectory. A product adding 10,000 new users per month but churning 9,500 is barely growing. A product adding 2,000 per month with 500 churning is growing faster (15% vs. 0.5% monthly growth for a 100K user base).

### Cohort-Based Metrics
Aggregate metrics hide important patterns. Cohort analysis tracks a group of users who started at the same time (same signup week or month) and measures their behavior over time.

Retention cohorts: track the percentage of each cohort that returns in subsequent periods. Week 1 users who return in Week 2, Week 3, etc. Compare retention curves across cohorts to identify whether product changes are improving retention.

Activation cohorts: track activation rate by signup cohort. Are users who signed up this month activating at higher rates than last month's users?

Revenue cohorts: track cumulative revenue per cohort over time. Do newer cohorts generate more or less revenue than older cohorts at the same age?

Behavioral cohorts: group users by behavior rather than time. Power users vs. casual users. Users who activated vs. those who did not. Users from different acquisition channels.

#### Interpreting Cohort Curves
Flat retention curve: users who survive the first period tend to stay. Strong product-market fit. Indicates compound growth potential.

Declining retention curve: users gradually stop using. Common for single-use or infrequent-use products. Growth requires continuous new acquisition.

Rising retention curve (newer cohorts do better): product improvements are working. Indicates improving product-market fit.

Falling retention curve (newer cohorts do worse): product changes are harming retention, or the user mix is changing (more low-quality acquisition). Requires investigation.

## Funnel Analysis for Growth

### Funnel Construction for Growth
Growth funnels differ from standard conversion funnels: they span the full user lifecycle (not just one conversion), they include non-linear paths (users may loop through stages multiple times), they focus on leading indicators (activation, not just revenue).

Standard growth funnel stages:
```
Visit → Signup → Onboarding Step 1 → Onboarding Step 2 → Aha Moment → Subscribe → Invite Others
```

Each stage should have a clear definition, measurable event, and expected transition rate. Define inclusion criteria (who enters the funnel) and timeboxes (how long users have to progress).

### Funnel Drop-Off Analysis
For each funnel stage, measure:

Entry volume: how many users enter this stage. Total and by segment.

Stage completion: how many users complete this stage (advance to next stage). Total and by segment.

Stage conversion rate: completion / entry × 100. The percentage of users who advance.

Drop-off rate: 100% - stage conversion rate. The percentage of users who leave.

Absolute drop-off: entry - completion. The raw number of users lost at this stage.

Relative drop-off: drop-off / entry × 100. The percentage of users lost at this stage.

Prioritization matrix: plot stages by absolute drop-off (volume) vs. relative drop-off (rate). High-volume, high-rate stages are the highest priority. High-volume, low-rate stages may have process issues. Low-volume, high-rate stages affect a small population (may still be worth optimizing if the population is high-value).

### Segment Drop-Off Analysis
Aggregate funnel analysis hides patterns that differ by segment. Run funnel analysis segmented by:

Acquisition channel: organic traffic may convert differently than paid traffic. Paid traffic that underperforms organic indicates a targeting or messaging issue.

Plan tier: free users may convert differently than trial users. Free users who never activate may need a different onboarding approach.

User role: admins activate differently than end users. Admins may need setup completion; end users may need feature discovery.

Device: mobile users convert differently than desktop users. Mobile users need mobile-optimized flows.

Region: users in different regions have different expectations, device capabilities, and payment preferences. Optimize per region where data supports it.

Funnel comparison: for each segment, calculate conversion rate at each stage. Identify where specific segments underperform the aggregate. Investigate root cause. Design targeted improvements for high-drop-off segments.

### Time-Based Funnel Analysis
Time between funnel stages reveals friction. For each adjacent pair of stages, calculate:

Average time: mean time elapsed between completing Stage N and starting Stage N+1.

Median time: median time, less sensitive to outliers than mean. Usually the better metric for time analysis.

P25/P75: 25th and 75th percentiles show the distribution. A large gap between P25 and P75 indicates high variance in user experience — some users fly through, others struggle.

By segment: compare time between stages by acquisition channel, device, plan, role. Longer times for specific segments indicate targeted friction.

Time-based drop-off: users who take longer than a threshold to progress are less likely to complete the funnel. Define thresholds per transition (e.g., if user has not activated within 7 days, they are unlikely to activate at all). Use thresholds for re-engagement triggers.

### Funnel Acceleration
Funnel acceleration reduces the time users spend in each stage and the time between stages. Acceleration compounds — users who activate faster are more likely to convert, and users who convert faster are more likely to refer.

Acceleration strategies:
- Remove non-essential steps from the activation flow
- Pre-fill data from signup context
- Provide templates and starting points
- Reduce cognitive load with progressive disclosure
- Trigger timely communications to nudge users through stages
- Add clear calls to action at each stage boundary

Measure acceleration impact: before and after comparison of stage transition times, aggregate funnel conversion (faster funnels typically convert better), and segment analysis (which segments benefit most from acceleration).

## Leading and Lagging Growth Metrics

### Leading Metrics for Growth
Leading metrics predict future growth outcomes. They change before the North Star metric changes. They are actionable — teams can influence them directly within weeks.

Activation rate: percentage of new users who reach the Aha moment within the defined timeframe. Predicts retention, conversion, and referral. Leading by 2-4 weeks (activation in Week 1 predicts retention in Week 4).

Feature adoption rate: percentage of users who have adopted a key feature. Predicts engagement depth and retention. Leading by 4-8 weeks.

Invite rate: invites sent per active user. Predicts future organic acquisition. Leading by 1-2 weeks (invite today → new user signs up within days).

Session frequency: sessions per week per active user. Predicts retention and churn. Leading by 2-4 weeks (declining session frequency precedes churn).

Onboarding step completion rates: completion rates for each step of the activation funnel. Predicts activation rate. Leading by 1-2 steps.

Time-to-value: time from signup to Aha moment. Predicts activation and retention. Leading by the TTV duration itself.

### Lagging Metrics for Growth
Lagging metrics confirm that growth has occurred. They change after the North Star metric changes. They are not directly actionable but measure overall health and business impact.

Retention rate (D30, D90): percentage of users who are still active 30 or 90 days after signup. Confirms that activation and engagement improvements are working.

Churn rate: percentage of users who stop using the product in a given period. Confirms retention and engagement health.

Lifetime value: total revenue generated by an average user over their lifetime. Confirms that growth is contributing to business outcomes.

Organic growth rate: percentage of new users coming from organic channels (viral, referral, SEO, content). Confirms that growth loops are functioning.

Revenue growth rate: month-over-month revenue growth. Confirms that growth initiatives are driving business results.

### Leading vs. Lagging Balance
A healthy growth dashboard includes 5-7 leading indicators and 3-5 lagging indicators. Leading indicators show early signals and guide weekly action. Lagging indicators confirm that actions are producing results.

Set targets for both: leading indicator targets (activation rate target, TTV target, invite rate target) and lagging indicator targets (retention target, revenue target, LTV target).

Review cadence: leading indicators reviewed weekly for experiment decisions. Lagging indicators reviewed monthly for strategic direction. Correlation between leading and lagging reviewed quarterly — if leading indicators improve but lagging do not, the leading indicators may be wrong.

## Growth Metric Definitions

### Activation Metrics
Activation rate: number of users who reach the Aha moment within the defined timeframe / total new users in the period. Timeframe is typically 1-7 days depending on product complexity. Activation rate is the single most important growth metric for most products.

Aha moment definition: a specific user action (or combination of actions) that correlates with long-term retention. Validated through data analysis: find the action-threshold-timeframe combination that best predicts D30 or D90 retention.

Time-to-value (TTV): time from signup to first Aha moment. Measured in minutes, hours, or days depending on product. Track median and percentile distribution. Segment by acquisition channel and user role.

Onboarding completion rate: percentage of users who complete each step of the onboarding flow. Track per step and overall. Identify steps with highest drop-off for optimization.

### Engagement Metrics
DAU (Daily Active Users): unique users who engage with the product on a given day. Measure of daily engagement scale.

MAU (Monthly Active Users): unique users who engage with the product in a given month. Measure of monthly engagement scale.

DAU/MAU ratio: daily active users / monthly active users. Indicates how frequently users return. A ratio of 0.2 means the average user engages 1 day per week (0.2 × 5 weekdays). A ratio of 0.5 means every other day. Target depends on product type: social and communication products target 0.5+, productivity tools target 0.3-0.5, infrequent-use products may be below 0.2.

Session frequency: sessions per week per active user. More granular than DAU/MAU for measuring engagement changes.

Session depth: actions per session or time per session. Indicates engagement quality. Increasing session depth suggests users are finding more value.

Feature stickiness: percentage of active users who use a specific feature in a given period. Track for each key feature. Features with low stickiness may need improvement or better discovery.

### Retention Metrics
Day N retention: percentage of users who return on Day N after signup. Standard measurement points: D1, D3, D7, D14, D30, D60, D90. D7 is the most common early retention benchmark. D30 and D90 indicate sustained retention.

Classic retention: users who are active on the specific Day N. Bounded between 0 and 1. Declines over time. The shape of the curve (steep vs. flat) indicates product-market fit.

Rolling retention: users who are active on Day N or any day after Day N. Higher than classic retention. Indicates users who have not permanently churned, even if they are not active exactly on Day N.

Return rate: percentage of users who return within a given period (e.g., within 7 days of their last session). Measures re-engagement effectiveness.

Churn rate: percentage of users who stop using the product in a given period. Voluntary churn (user decides to leave) + involuntary churn (payment failure, account expiration). Monthly churn = users lost in month / users at start of month.

Survival rate: 1 - churn rate. The percentage of users who survive (remain active) over time. Survival curve plots survival rate vs. time. Median survival time = time by which 50% of users have churned.

### Revenue Metrics
Conversion rate: percentage of users who convert from free to paid. Free-to-paid (for freemium) or trial-to-paid (for time-limited trials). Track overall and by plan tier.

Average Revenue Per User (ARPU): total revenue / total users. Includes both paying and non-paying users. Measures overall revenue health.

Average Revenue Per Paying User (ARPPU): total revenue / paying users. Measures revenue per converted user. Differs from ARPU by excluding non-payers.

Customer Acquisition Cost (CAC): total sales and marketing cost / new customers acquired. By channel: CAC per channel / customers from that channel. Important for channel ROI comparison.

Lifetime Value (LTV): total revenue a user generates over their entire relationship with the product. LTV = ARPU × average user lifespan (or ARPPU × average paying user lifespan). Simplified: LTV = ARPU / churn rate.

LTV/CAC ratio: LTV / CAC. Measures return on acquisition investment. Target: > 3.0 for healthy growth. < 1.0 means losing money on each customer. Between 1.0-3.0 means acceptable but needs improvement.

Payback period: CAC / (monthly ARPU). Months needed to recover the cost of acquiring a customer. Target: < 12 months. Longer payback periods require more working capital.

### Referral Metrics
K-factor: I × C where I = invites sent per user, C = invite-to-activation conversion rate. K > 1 means viral growth (each user brings more than one new user). K < 1 means the viral loop leaks.

Invite rate: invites sent per active user in a given period. Track total and by channel (email, social, SMS, in-app). Segment by user behavior (heavy users invite more).

Invitee activation rate: percentage of invitees who activate (reach the Aha moment). Measures invite quality. Invitees from different channels or referrer segments may activate at different rates.

Viral cycle time: time from invite being sent to invitee activating. Shorter cycle time means faster compounding. Track median and percentile. Optimize invite-to-signup flow and signup-to-activation flow.

Organic user percentage: percentage of new users who come through organic channels (referral, viral, SEO, content). Measures growth loop health. Higher is better — organic users have lower CAC.

## Growth Dashboard Design

### Dashboard Principles
Hierarchy: top-level metrics for quick health check, drill-down for detailed analysis. The executive summary first, detail on request.

Actionability: every metric should lead to a decision or action. If a metric cannot drive action, it should not be on the dashboard.

Trend direction: show metric direction (up/down/flat) and magnitude of change. Week-over-week, month-over-month, year-over-year comparisons.

Target comparison: show actual vs. target. Green when on track, yellow when at risk, red when below target.

Segmentation toggle: ability to segment any metric by channel, plan, device, region, user type.

### Growth Dashboard Layout
Row 1 — North Star Metric: the single most important metric prominently displayed. Current value, trend (7-day moving average), target.

Row 2 — AARRR Stage Overview: five cards, one per stage. Each card shows the stage's primary metric, trend, and target status.

Row 3 — Growth Accounting: weekly stacked bar chart showing new users (green), resurrected users (blue), churned users (red). Net position line overlaid. Month-over-month growth rate.

Row 4 — Funnel: the AARRR funnel with stage conversion rates. Absolute and relative drop-off per stage. Segment dropdown to toggle.

Row 5 — Leading Indicators: activation rate, TTV, invite rate, session frequency. Trend charts with target lines. Alert icons when below threshold.

Row 6 — Lagging Indicators: retention curves (D1, D7, D30, D90), churn rate, LTV/CAC, revenue growth rate. Monthly updated.

### Dashboard Cadence and Alerts
Weekly review metrics: new users, activation rate, TTV, invite rate, session frequency, DAU/MAU. Review every Monday for the previous week. Compare to target and previous weeks.

Monthly review metrics: retention curves, churn rate, conversion rate, ARPU, LTV/CAC, revenue growth rate, organic user percentage. Review first week of the month.

Automated alerts: activation rate drops below threshold, TTV increases above threshold, invite rate drops by 20%+ week-over-week, churn rate spikes, LTV/CAC drops below 2.0, conversion rate drops by 15%+ month-over-month.

### Metric Governance
Metric definitions must be documented and version-controlled. Every metric has: name, definition, formula, data source, measurement cadence, owner.

Metric changes must be reviewed and approved. Changing a metric definition changes the trend — misleading if not documented.

Quarterly metric audit: verify that metric definitions are still correct, data sources are reliable, and metrics are still driving the right decisions. Update as needed.

## Advanced Growth Analytics

### Predictive Growth Modeling
Use historical data to predict future growth trajectories:

Cohort projection: use historical cohort retention curves to project future retention for new cohorts. Apply projected retention rates to current cohort sizes to forecast active users.

Growth loop modeling: model the compounding effect of growth loops. Input: current user base, K-factor, cycle time, paid acquisition rate. Output: projected user growth over 6-12 months. Sensitivity analysis: what happens if K-factor changes by X%?

Leading indicator regression: build regression models to quantify the relationship between leading indicators and lagging outcomes. How much does a 10% improvement in activation rate improve D30 retention? Use these models to prioritize experiments.

### Channel Attribution in Growth
Attributing growth to specific channels and loops:

First-touch attribution: the first channel through which a user discovered the product. Simplest attribution model. Underweights the contribution of later-touch channels and growth loops.

Last-touch attribution: the last channel through which a user came before signing up. Common default in analytics tools. Overweights bottom-of-funnel channels.

Multi-touch attribution: distribute credit across all channels a user encountered. Time decay (later touches get more credit), linear (equal credit), or custom (based on experiment data).

Loop attribution: attribute users to the growth loop that generated them. Viral loop (user came through referral), content loop (user came through user-generated content), SEO loop (user came through organic search), paid loop (user came through paid acquisition).

### Growth Metric Decomposition
Decompose aggregate metrics into their components to identify drivers:

User growth decomposition: Net growth = New + Resurrected - Churned. Each component can be further decomposed: New by channel (organic, paid, viral, sales), Resurrected by re-engagement campaign, Churned by reason (voluntary, involuntary, by segment).

Revenue growth decomposition: Revenue = Users × ARPU. User growth × price changes × mix changes (more high-value users). Decompose ARPU into: free users (0), basic plan ($X), pro plan ($Y), enterprise ($Z). Track mix shift.

Retention decomposition: Overall retention = weighted average of segment retention rates. Decompose retention by acquisition channel, plan, user role, device. Identify which segments have declining retention that drags down the aggregate.

## Metric Quality and Governance

### Data Quality for Growth Metrics
Metric reliability depends on data quality. Common issues:

Tracking gaps: missing events for key user actions. Activation cannot be measured if the Aha moment event is not tracked. Fix: event inventory and gap analysis.

Identity resolution: users identified differently across sessions, devices, and channels. Inflates user counts and reduces metric accuracy. Fix: identity resolution system with deterministic matching.

Attribution errors: events incorrectly attributed to experiments or channels. Biases metric comparisons. Fix: attribution validation through AA tests and data audits.

Sample ratio mismatch: actual sample sizes differ from expected in experiments. Invalidates experiment results. Fix: SRM detection and investigation.

### Metric Ownership and Maintenance
Every growth metric has an owner responsible for: definition maintenance, data quality monitoring, trend analysis and reporting, alert response when metric drops below threshold.

Owners review their metrics weekly and report any anomalies. Quarterly metric review: is the metric still relevant? is the definition still correct? is the data source reliable?

### Experiment-to-Metric Governance
Every growth experiment must connect to at least one growth metric in the dashboard. The primary metric for the experiment must be a metric on the dashboard. This ensures that experiments are focused on metrics that matter and that experiment results directly update the dashboard.

After an experiment is implemented, the metric baseline should be updated. The team should track cumulative improvement across experiments — how much has the metric improved since the start of the growth program?

## Key Points
- AARRR (Acquisition, Activation, Retention, Revenue, Referral) maps the full user lifecycle with clear metrics per stage.
- Focus on one metric that matters (OMTM) to avoid spreading resources too thin.
- Cohort analysis reveals true trends — aggregate metrics hide segment-specific patterns.
- Activation rate and TTV are the most important leading indicators for most products.
- Segment funnel analysis by acquisition channel — aggregate funnels mislead.
- Leading indicators predict growth outcomes; lagging indicators confirm them.
- Growth dashboard should have 5-7 leading indicators and 3-5 lagging indicators.
- LTV/CAC > 3.0 indicates healthy growth unit economics.
- K-factor > 1.0 means viral growth; K < 1.0 means the viral loop leaks.
- Growth accounting (New + Resurrected - Churned) reveals true growth trajectory.
- Every growth metric needs an owner, clear definition, and data quality monitoring.
- Decompose aggregate metrics to identify the drivers of growth and decline.
