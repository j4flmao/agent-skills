# Product Analytics Framework

## Analytics Framework Overview

A product analytics framework provides the structure for consistent, actionable measurement of user behavior and product performance. It connects business objectives to specific metrics, which are tracked through defined events and analyzed with appropriate methods.

### Framework Components

```
Business Objectives
  ↓
Product Strategy
  ↓
North Star Metric
  ↓
Input Metrics (Key Results)
  ↓
Counter Metrics (Guardrails)
  ↓
Diagnostic Metrics
  ↓
Tracking Events and Properties
  ↓
Analysis (Funnels, Cohorts, Segmentation)
  ↓
Dashboards and Reporting
  ↓
Decision Making
```

Each layer informs the layer below and explains the layer above.

### Dimension of a Good Metric Framework

| Dimension | Question | Check |
|-----------|----------|-------|
| Actionable | Can we directly influence this metric? | Yes / No |
| Understandable | Can everyone in the company understand it? | Yes / No |
| Comparable | Can we compare it across time or segments? | Yes / No |
| Leading | Does it predict future outcomes? | Yes / No |
| Accessible | Can we measure it with current instrumentation? | Yes / No |
| Timely | Can we measure it frequently enough to act? | Yes / No |
| Specific | Is it clearly defined and unambiguous? | Yes / No |
| Behavior-driven | Does it measure user behavior, not just volume? | Yes / No |

## North Star Framework

### What is a North Star Metric?

The North Star Metric (NSM) is the single metric that best captures the core value your product delivers to customers. It's the leading indicator of sustainable growth.

### Criteria for a Good North Star Metric

| Criterion | Description | Example Check |
|-----------|-------------|---------------|
| Customer value | Measures value delivered to users, not just business extraction | "Weekly active teams" vs "Monthly revenue" |
| Leading indicator | Predicts long-term retention and growth | Not "Churn rate" (lagging) but "Activation rate" (leading) |
| Actionable | The product team can directly influence it | Not "NPS" (lags, influenced by many factors) |
| Understandable | Every employee can understand and rally around it | "Orders per buyer per month" vs "Feature-weighted engagement index" |
| Measurable | Trackable with current or planned instrumentation | Clear event definition, no ambiguity |
| Resilient | Hard to game without creating genuine value | Not "Page views" (can be inflated with content farms) |

### North Star by Product Type

| Product Type | North Star Metric Candidates | Why |
|-------------|------------------------------|-----|
| SaaS B2B | Weekly active teams, Active workspaces | Value delivered to organization, not individual |
| Social / Communication | Daily active messages, Daily content shared | Core value is communication; frequency shows engagement |
| Marketplace | Successful transactions, Buyer repeat rate | Marketplace value = successful exchanges |
| E-commerce | Orders per buyer per month, Repeat purchase rate | Repeat purchasing indicates satisfaction and habit |
| Content / Media | Weekly content consumption, Time spent reading | Attention = value in content products |
| Productivity | Tasks completed per day, Projects delivered | Users get value from completing work |
| Fintech | Transactions per user, Active funding sources | Financial activity = engagement and trust |
| Education | Lessons completed, Time learning | Learning progress = value delivery |
| Health / Fitness | Active days per week, Workouts logged | Regular activity = health outcomes |
| Gaming | Daily active sessions, Levels completed | Progression and engagement drive retention |

### North Star Metric Validation Process

1. Identify 3-5 candidate metrics that capture customer value
2. For each candidate, calculate correlation with long-term retention (D30, D60, D90)
3. Select candidate with strongest correlation
4. Validate: Do users who increase on this metric retain better?
5. Test: Can the team influence this metric?
6. Set baseline: Current value of the metric
7. Set target: Desired value in 6-12 months
8. Communicate: Share NSM with entire organization
9. Review quarterly: Is this still the right metric?

## Input Metrics and Key Results

### Input Metrics Hierarchy

Input metrics are the leading indicators that drive the North Star metric.

```
North Star Metric
  ├── Input Metric 1 (e.g., Activation Rate)
  │   ├── Sub-metric 1a (e.g., Signup completion rate)
  │   ├── Sub-metric 1b (e.g., First value event rate)
  │   └── Sub-metric 1c (e.g., Time to activation)
  ├── Input Metric 2 (e.g., Core Action Frequency)
  │   ├── Sub-metric 2a (e.g., DAU/MAU ratio)
  │   ├── Sub-metric 2b (e.g., Sessions per user per week)
  │   └── Sub-metric 2c (e.g., Actions per session)
  └── Input Metric 3 (e.g., Feature Adoption Rate)
      ├── Sub-metric 3a (e.g., % using feature X)
      ├── Sub-metric 3b (e.g., Time to first feature use)
      └── Sub-metric 3c (e.g., Feature stickiness)
```

### Counter Metrics

Every metric can be gamed. Counter metrics guard against behavior that inflates the primary metric without creating genuine value.

| Primary Metric | Counter Metric | What It Prevents |
|----------------|----------------|------------------|
| Messages sent | Spam reports, Messages per recipient | Quantity-over-quality behavior |
| Time spent | Task completion rate | Time spent could mean confusion, not engagement |
| Page views | Bounce rate, Page load time | Clickbait and performance degradation |
| Signups | Activation rate, Spam signup rate | Low-quality signups that never convert |
| Revenue | Churn rate, Support tickets | Short-term revenue extraction at expense of trust |
| Referrals | Spam invites, Invite-to-signup conversion | Mass inviting without targeting |

### OKR Integration

Product analytics metrics map naturally to OKRs:

```
Objective: Become the most loved project management tool for design teams
  KR1: Increase weekly active teams from 12K to 18K (North Star metric)
  KR2: Improve activation rate from 35% to 55% (Input metric)
  KR3: Increase D30 retention from 40% to 55% (Retention metric)

Objective: Grow revenue while maintaining customer satisfaction
  KR1: Increase ARPU from $34 to $45 (Revenue metric)
  KR2: Keep churn rate below 3% monthly (Counter metric)
  KR3: Maintain NPS above 40 (Satisfaction metric)
```

## AARRR Framework (Pirate Metrics)

### AARRR Stages and Metrics

| Stage | Definition | Top Metric | Supporting Metrics |
|-------|------------|------------|-------------------|
| Acquisition | Users discover your product | Signups by source | Traffic, CAC, channel mix, CPA, organic vs paid ratio |
| Activation | Users experience core value for first time | Activation rate | Time to activation, % completing setup, first value event rate |
| Retention | Users return and continue using | D7/D30 retention | Churn rate, DAU/MAU, session frequency, power user rate |
| Revenue | Users pay for value | ARPU, LTV | Conversion rate, MRR, upgrade rate, expansion revenue |
| Referral | Users bring others | K-factor | Invite-to-signup rate, viral coefficient, NPS |

### Acquisition Metrics Detailing

| Metric | Definition | Benchmark | Formula |
|--------|------------|-----------|---------|
| Total signups | New user accounts created | Varies | Count of signup events |
| Signups by source | Signups segmented by acquisition channel | Depends on channel mix | Group signups by utm_source |
| CAC (Customer Acquisition Cost) | Cost to acquire one paying customer | Depends on business model | Total marketing spend / New customers |
| Channel mix | % of signups from each channel | Diversified is better | Signups per channel / Total signups * 100 |
| CPA (Cost Per Acquisition) | Cost per signup (not just paying) | Depends on channel | Channel spend / Channel signups |
| Organic vs paid ratio | % organic signups vs paid | 60%+ organic is healthy | Organic signups / Paid signups |
| Traffic-to-signup conversion | % of website visitors who sign up | 2-10% depending on product | Signups / Unique visitors |

### Activation Metrics Detailing

| Metric | Definition | Benchmark | Formula |
|--------|------------|-----------|---------|
| Activation rate | % of signups who reach activation milestone | 30-60% | Activated users / Signups in cohort |
| Time to activation | Time from signup to activation event | Minutes to days | Median time between signup and activation event |
| Signup completion rate | % who complete signup form | 60-90% | Signups completed / Signups started |
| Setup completion rate | % who complete onboarding setup | 40-70% | Setup completed / Signups |
| First value event rate | % who experience core value | 40-70% | Users with first core action / Signups |

### Retention Metrics Detailing

| Metric | Definition | Benchmark | Formula |
|--------|------------|-----------|---------|
| D1 retention | % who return the next day | 30-60% | Users active D1 / Users in cohort |
| D7 retention | % who return within 7 days | 20-40% | Users active D7 / Users in cohort |
| D30 retention | % who return within 30 days | 10-30% | Users active D30 / Users in cohort |
| Rolling retention | % ever returned within period | Higher than classic retention | Users ever active in period / Users in cohort |
| Churn rate | % of users who stop using | 3-7% monthly for SaaS | Churned users / Active users |
| DAU/MAU ratio | Daily active / Monthly active | 20-50% | DAU / MAU |
| Session frequency | Sessions per user per week | 3-7 for engaged | Total sessions / Active users |
| Power user rate | % of users with high engagement | Top 10-20% | Users above engagement threshold / Total users |

### Revenue Metrics Detailing

| Metric | Definition | Benchmark | Formula |
|--------|------------|-----------|---------|
| ARPU (Average Revenue Per User) | Revenue per user (all users) | Varies | Total revenue / Total users |
| ARPPU (Average Revenue Per Paying User) | Revenue per paying user | Varies | Total revenue / Paying users |
| LTV (Lifetime Value) | Total revenue from a user over lifetime | 3x+ CAC | ARPU * Average lifetime |
| MRR (Monthly Recurring Revenue) | Monthly subscription revenue | Growing | Sum of all monthly subscription fees |
| Conversion rate (free to paid) | % of free users who become paying | 3-10% | Paying users / Total users |
| Upgrade rate | % of users moving to higher tier | 5-15% quarterly | Upgraded users / Users at lower tier |
| Expansion revenue | Revenue from upgrades and add-ons | 10-30% of MRR | Upgrade + add-on revenue |
| Revenue churn | % of revenue lost to churn and downgrades | <2% monthly | Churned revenue / Total revenue |

### Referral Metrics Detailing

| Metric | Definition | Benchmark | Formula |
|--------|------------|-----------|---------|
| K-factor | Users referred per existing user | >1.0 = viral growth | Invites sent per user * Invite-to-signup rate |
| Invite-to-signup rate | % of invites that result in signup | 5-20% | Signups from invites / Invites sent |
| Viral coefficient | % of new users who send invites | 20-40% | Users who send invites / New users |
| Viral cycle time | Time from signup to first invite sent | 1-7 days | Median time between signup and first invite |
| NPS | Would recommend to friend? (0-10) | >30 = good, >50 = excellent | %Promoters — %Detractors |

## Metric Tree Construction

### Building a Metric Tree

A metric tree breaks a high-level metric into its component parts, identifying all the levers that can be pulled to influence it.

Example: Monthly Active Users (MAU)

```
MAU = New Users + Returning Users
  ├── New Users = Signups * Activation Rate
  │   ├── Signups = Traffic * Signup Rate
  │   └── Activation Rate = Setup Completion * First Value Event Rate
  └── Returning Users = Previous MAU * Retention Rate
      ├── Retention Rate = 1 — Churn Rate
      └── Churn Rate = (Users Lost to Churn + Users Lost to Inactivity) / Total Users
```

This tree identifies the levers: traffic, signup rate, setup completion, first value event, churn, inactivity.

Example: Revenue

```
Revenue = New MRR + Existing MRR + Expansion MRR — Churned MRR
  ├── New MRR = New Customers * Average Revenue Per New Customer
  ├── Existing MRR = Paying Users * ARPU
  ├── Expansion MRR = Upgraded Users * (New Price — Old Price)
  └── Churned MRR = Churned Users * Their Average Price
```

### Metric Ownership

Each metric should have a clear owner:

| Metric | Typical Owner | Review Cadence |
|--------|---------------|----------------|
| North Star metric | CPO / VP Product | Weekly |
| Activation rate | Product team (growth) | Daily |
| Signup rate | Growth team | Daily |
| D7 retention | Product team | Weekly |
| Churn rate | Customer success | Monthly |
| ARPU | Product team (monetization) | Monthly |
| LTV/CAC ratio | Finance / Strategy | Monthly |
| NPS / CSAT | Customer success | Monthly |
| Feature adoption | Feature team | Weekly |
| K-factor | Growth team | Monthly |

## Funnel Framework

### Funnel Construction Principles

| Principle | Explanation | Example |
|-----------|-------------|---------|
| Define clear entry and exit | Every funnel has a defined start event and end event | Enter: signup_completed, Exit: activated |
| Steps are user actions | Each step is a specific user event, not a page view | "Clicked continue" not "Loaded page" |
| Timebox the funnel | Specify the maximum time between first and last step | "Within 7 days of signup" |
| Limit to 5-7 steps | More steps obscures actionable insights | Focus on critical transitions |
| Include step descriptions | Plain English for each step | "User imports their first data file" |

### Funnel Types

| Funnel Type | Purpose | Example | Time Window |
|-------------|---------|---------|-------------|
| Conversion funnel | Measure step-by-step conversion | Signup → Onboarding → Activation | Hours to days |
| Drop-off funnel | Identify where users leave | Home → Search → Product → Cart → Checkout | Minutes |
| Engagement funnel | Measure depth of engagement | Signup → Day 1 → Day 7 → Day 30 | Days to months |
| Feature adoption funnel | Track feature rollout | Feature seen → Feature tried → Feature adopted | Days to weeks |
| Revenue funnel | Track monetization | Trial → Subscribe → Upgrade → Renew | Months |

### Funnel Analysis Process

1. Define the funnel: steps, events, timebox
2. Gather data: ensure all events are tracked
3. Calculate step conversion: % who move from each step to next
4. Calculate absolute conversion: % who made it from entry to each step
5. Identify biggest drop-off: step with largest absolute or relative loss
6. Segment the funnel: break down by user attributes
7. Diagnose drop-off: investigate root causes
8. Generate hypotheses: what might improve conversion
9. Prioritize and test: run experiments on highest-impact steps

## Cohort Framework

### Cohort Definition

A cohort is a group of users who share a common characteristic or experience within a defined time period.

| Cohort Type | Definition | Best For |
|-------------|------------|----------|
| Acquisition cohort | Users who signed up in the same time period | Tracking retention over time, identifying product changes impact |
| Behavior cohort | Users who performed a specific action | Comparing engaged vs non-engaged users |
| Attribute cohort | Users who share a property | Comparing segments (plan, source, region) |
| First-time cohort | Users who first experienced a feature at the same time | Measuring feature impact on retention |

### Retention Calculation Methods

**Classic (Period) Retention:**
- Definition: % of users who return in a specific period after signup
- Example: Users from Jan cohort who are active in Feb
- Best for: Products with expected regular usage cycles

**Rolling Retention:**
- Definition: % of users who ever returned after signup (any time up to now)
- Example: Users from Jan cohort who have been active at least once since signup
- Best for: Products with irregular usage patterns (e.g., travel booking)

**Bracket Retention:**
- Definition: % of users active in period X after signup
- Example: Users from Jan cohort who are active in their 4th week
- Best for: Standardized reporting, comparing against benchmarks

**Unbounded Retention:**
- Definition: % of users who returned at least once in the entire observation period
- Best for: Products where single return is meaningful (e.g., social apps)

### Cohort Analysis Process

1. Define cohort criteria (signup date, behavior, attribute)
2. Define return event (what counts as "returning"?)
3. Set time windows (daily, weekly, monthly)
4. Build cohort table or chart
5. Look for patterns: improving, declining, or flat retention over time
6. Identify outlier cohorts (unexpectedly high or low)
7. Correlate outliers with product changes or external events
8. Segment further if patterns are unclear
9. Generate hypotheses and recommendations

## Segmentation Framework

### Segmentation Dimensions

| Dimension | Examples | Analysis Type |
|-----------|----------|---------------|
| Demographic | Age, location, gender | Descriptive, profiling |
| Behavioral | Usage frequency, feature adoption, session length | Engagement, retention |
| Psychographic | Attitudes, motivations, preferences | Survey, qualitative |
| Technographic | Device, browser, platform | Performance, experience |
| Plan/customer type | Free, pro, enterprise, trial | Monetization, conversion |
| Acquisition channel | Organic, paid, referral, social | Channel effectiveness |
| Lifecycle stage | New, active, at-risk, churned | Retention, re-engagement |
| User role | Admin, member, viewer | Feature adoption, onboarding |

### Segmentation Analysis Process

1. Choose segmentation dimension based on research question
2. Split users into segments
3. Compare key metrics across segments
4. Identify segments with significantly different behavior
5. Investigate root causes of differences
6. Generate segment-specific recommendations

Common patterns to look for:
- Power users vs casual users: what drives high engagement?
- New users vs established users: how does behavior change with tenure?
- Free vs paid: what features drive conversion?
- Mobile vs desktop: how does platform affect behavior?
- High churn segment: what are they doing differently?

## Dashboard Framework

### Dashboard Types

| Type | Audience | Update Frequency | Metrics | Focus |
|------|----------|-----------------|---------|-------|
| Executive | Leadership | Weekly | North Star, key results, revenue | Strategic overview |
| Product | Product team | Daily | Funnels, feature adoption, engagement | Tactical decisions |
| Experiment | PM + engineers | Per experiment | Test metrics, significance | Experiment outcomes |
| Health | Data team | Daily | Data quality, event volume, anomalies | Data reliability |
| Operations | CS, support | Daily | Ticket volume, response time, satisfaction | Operational efficiency |
| Squad/Team | Feature team | Daily | Feature-specific metrics | Feature performance |

### Dashboard Design Principles

| Principle | Implementation |
|-----------|----------------|
| One screen, no scrolling | All key metrics visible at a glance |
| Consistent layout | Same metric placement across dashboards |
| Context always shown | Compare to prior period, target, or benchmark |
| Sparklines for trends | Show direction without taking space |
| Annotations for events | Mark releases, campaigns, incidents |
| Drill-down capability | Click through to detailed view |
| Alerts on anomalies | Color coding, notifications for significant changes |
| Metric definitions linked | Click to see exact definition and source |
| Minimal dimensions | Focus on 5-7 metrics per dashboard |
| Role-based access | Right metrics to right people |

### Dashboard Metrics Selection

Each dashboard should answer these questions:
1. Are we on track to meet our goals?
2. What changed since last review?
3. What should we investigate?
4. What should we do next?

Metric selection criteria:
- Actionability: Can the audience act on this metric?
- Relevance: Does it directly relate to the audience's goals?
- Timeliness: Can we update it frequently enough?
- Reliability: Is the data quality sufficient for decisions?

## Framework Governance

### Metric Definition Template

Every metric should be documented:

```
Metric Name: {name}
Description: {plain English description of what it measures}
Formula: {how it's calculated}
Data Source: {event or property used}
Owner: {team responsible}
Review Cadence: {daily / weekly / monthly}
Target: {desired value}
Baseline: {current value}
Bechmark: {industry benchmark if available}
Counter Metric: {what prevents gaming this metric}
```

### Framework Review Cadence

| Activity | Frequency | Participants |
|----------|-----------|--------------|
| NSM review | Quarterly | Product leadership |
| Metric tree review | Quarterly | Product + data team |
| Funnel performance | Monthly | Product team |
| Cohort trends | Monthly | Product + data team |
| Data quality audit | Weekly | Data team |
| Event taxonomy review | Quarterly | Data + engineering |
| Dashboard audit | Monthly | Data team |
| Framework alignment with OKRs | Quarterly | Product leadership |

### Common Framework Mistakes

| Mistake | Description | Fix |
|---------|-------------|-----|
| Vanity metrics | Metrics that look good but don't drive decisions | Audit: "What decision does this metric inform?" |
| Too many metrics | Dashboard overload, no clear priorities | Limit to 5-7 metrics per dashboard |
| North Star not understood | Team can't articulate or rally around NSM | Simplify: 5-year-old test — can anyone explain it? |
| No counter metrics | Primary metrics get gamed | Add counter metric for every input metric |
| Framework not reviewed | Outdated metrics persist | Quarterly review cadence |
| No data quality checks | Bad data poisons decisions | Automated daily data quality monitoring |
| Lagging metrics only | Metrics that only tell you about the past | Balance leading and lagging indicators |
| Metric without owner | No one responsible for improvement | Every metric must have named owner |
| Composite metrics | Complex formulas no one understands | Favor simple counts and ratios |
| Framework inconsistency | Different teams define same metric differently | Single source of truth for metric definitions |

## Case Studies

### Case Study 1: North Star Metric Transformation
A B2B SaaS company used "Monthly Active Users" as their North Star. The product team optimized for MAU by adding notifications and email nudges, which increased MAU but didn't improve retention. Switching to "Weekly Active Teams" as the NSM changed the team's focus to building collaborative features. Within 6 months, team-based engagement increased 40% and D30 retention improved from 35% to 52%.

### Case Study 2: Funnel Analysis Reveals False Bottleneck
An e-commerce site thought their checkout funnel had a bottleneck at the payment step (50% drop-off). Detailed funnel analysis segmented by payment method revealed that credit card users completed at 85%, but PayPal users dropped at 70% due to a redirect issue. Fixing the PayPal redirect increased overall checkout completion from 50% to 72%.

### Case Study 3: Counter Metric Prevents Gaming
A content platform set "Time Spent" as a key metric. The team optimized by making videos auto-play longer and adding clickbait titles. Time Spent increased 20%, but the counter metric (Task Completion Rate) dropped from 85% to 60%, revealing that users were spending more time because they couldn't find what they needed. The counter metric prevented a user-hostile optimization.

### Case Study 4: Cohort Analysis Saves a Feature
A SaaS company considered removing a feature that only 15% of users activated. Cohort analysis segmented by activation status showed that users who activated the feature had 65% D90 retention vs 25% for those who didn't. The feature was a leading indicator of retention, not a low-adoption feature. The team optimized onboarding to increase feature activation to 40%, improving overall retention.

## Template: Metric Tree Worksheet

```
North Star Metric: ____________________
Current Value: _____ | Target: _____ | Owner: _____

Input Metric 1: ____________________
Current: _____ | Target: _____ | Owner: _____
Sub-metrics:
  1a: ____________________ Current: _____ Target: _____
  1b: ____________________ Current: _____ Target: _____

Input Metric 2: ____________________
Current: _____ | Target: _____ | Owner: _____
Sub-metrics:
  2a: ____________________ Current: _____ Target: _____
  2b: ____________________ Current: _____ Target: _____

Input Metric 3: ____________________
Current: _____ | Target: _____ | Owner: _____
Sub-metrics:
  3a: ____________________ Current: _____ Target: _____
  3b: ____________________ Current: _____ Target: _____

Counter Metrics:
  1: ____________________ Current: _____ Threshold: _____
  2: ____________________ Current: _____ Threshold: _____
```
