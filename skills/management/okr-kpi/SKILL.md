---
name: management-okr-kpi
description: >
  Use this skill when the user says 'OKR', 'KPI', 'objectives', 'key results', 'metrics', 'OKR setting', 'quarterly goals', 'team metrics', 'performance indicators', 'goal setting', 'North Star metric'. Define and track OKRs and KPIs with cascade, scoring, and review cadence. Do NOT use for: project planning or sprint ceremonies.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, okr, kpi, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Management OKR & KPI

## Purpose
Define, cascade, and track Objectives and Key Results (OKRs) alongside KPIs for teams and individuals. Provides structured goal-setting with measurable outcomes, a scoring rubric for quarterly review, and a weekly check-in cadence that keeps goals alive between reviews.

OKRs create organizational alignment by connecting every team's daily work to the company's strategic priorities. KPIs provide the ongoing health metrics that tell you if the business is stable while OKRs drive change. Together they give teams both direction and feedback: OKRs tell you where to go, and KPIs tell you if you are healthy along the way. This skill implements the standard Google/Intel OKR methodology, adapted for engineering teams with emphasis on measurable KRs, cross-level cascade, and a consistent weekly tracking cadence.

The key insight is that OKRs and KPIs serve different purposes and should not be conflated. OKRs are time-bound change targets for a specific quarter. KPIs are ongoing health metrics with no end date. A team can have OKRs that move performance metrics from one KPI level to another, but the KPI itself persists beyond the quarter. Confusing the two leads to missed targets and demoralized teams.

## Agent Protocol

### Trigger
"OKR", "KPI", "objectives", "key results", "metrics", "OKR setting", "quarterly goals", "team metrics", "performance indicators", "goal setting", "North Star metric"

### Input Context
- Company/team mission statement and product vision (1-2 paragraphs)
- Previous quarter OKR documents with all scores and retrospective learnings
- Current strategic priorities from leadership with relative importance ranking
- Team capacity data: current headcount, committed allocation percentage, known leaves in the quarter, historical sprint velocity
- Market or competitive context documents for calibrating goal ambition
- Organizational chart for planning the cascade across departments, teams, and individuals
- Key business metrics from the previous quarter: revenue, active users, retention cohorts, NPS, churn

### Output Artifact
- OKR document: 2-4 objectives per level, each with 3-5 key results, each KR having a metric name, baseline, target, owner, and type (committed vs aspirational)
- KPI definition sheet: table with name, leading/lagging classification, input/output/impact type, baseline value, quarterly target, current value, owner, and measurement frequency
- Cascade map: tree-style alignment from company through department and team to individual
- Weekly tracking template: KR name, current progress number, confidence level (high/medium/low), blocker flag, and notes

### Response Format
- H2 per Objective, H3 for the KR table under each objective with columns: KR name, metric (with unit), baseline, target, owner, type (committed/aspirational), current score
- KPI definition sheet as a markdown table with all classification columns
- Cascade as an indented tree showing propagation of KRs to objectives at lower levels
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
OKR document complete with at least 3 objectives and 3-5 KRs per objective. KPI sheet populated with baselines and quarterly targets for 5+ metrics. Cascade maps across 3 organizational levels.

### Max Response Length
3000 tokens

## Framework and Methodology

### OKR vs KPI Decision Tree

```
Is this a time-bound change or ongoing health measurement?
  ├── Time-bound change (this quarter only)
  │   └── Is it inspirational or a delivery commitment?
  │       ├── Inspirational, stretch goal
  │       │   └── Aspirational OKR — expect ~60% achievement
  │       └── Delivery commitment, must achieve
  │           └── Committed OKR — expect 100% achievement
  └── Ongoing health measurement (no end date)
      └── KPI — track continuously, never mark complete
          └── Does it predict future outcomes or measure past?
              ├── Leading indicator — sign-ups, feature adoption
              └── Lagging indicator — revenue, retention, churn
```

### OKR Writing Framework

Every OKR must pass the following quality checks:

```
Objective: Qualitative, inspirational, time-bound
  - Verbs that imply change: transform, establish, accelerate, dominate
  - NOT: "Maintain system uptime" (maintenance, not change)
  - YES: "Achieve industry-leading API reliability"

Key Results: Quantitative, measurable, falsifiable
  - Each KR must contain a number and a target
  - NOT: "Improve performance significantly"
  - YES: "Reduce P95 latency from 400ms to 150ms"
  - NOT: "Make the team more agile"
  - YES: "Reduce cycle time from 5 days to 2 days"
```

### KPI Classification Framework

| Axis | Type | What It Measures | Example |
|------|------|-----------------|---------|
| Timing | Leading | Predicts the future | Sign-ups per week |
| Timing | Lagging | Measures the past | Quarterly revenue |
| Level | Input | Team effort | Stories committed |
| Level | Output | Team production | Features shipped |
| Level | Impact | Business result | Net Promoter Score |

### Cascade Decision Tree

```
How do I cascade OKRs to my team?
  ├── Company KR directly maps to team scope
  │   └── Team adopts KR as-is or splits into sub-metrics
  ├── Company KR needs team-level interpretation
  │   └── Company KR becomes team Objective
  │       └── Team defines own KRs aligned to company direction
  ├── Team contributes to multiple company OKRs
  │   └── Team defines one Objective per contribution area
  │       └── Each team KR maps to one company KR
  └── Team supports another team's OKRs
      └── Define enabling KRs that unblock dependent teams
```

### OKR Cycle Timeline

```
Week -2: Leadership drafts company OKRs
Week -1: Company OKRs shared for feedback
Week 0:  Company OKRs finalized, teams begin cascade
Week 1:  Team OKR drafts created in planning sessions
Week 2:  Team OKRs reviewed with management, aligned
Week 3:  Individual OKRs drafted (if used)
Weeks 4-12: Weekly check-ins (15 min, no scoring)
Week 13: Quarterly scoring and retrospective
Week 14: Next quarter OKR drafting begins
```

## Workflow

### Step 1: Define OKR Structure

Write inspirational qualitative Objectives in 1-2 sentences using active, energizing language. Use verbs that imply change: "dominate," "transform," "establish," "unlock," "accelerate." Attach precisely 3-5 measurable Key Results per objective. Each KR entry includes: the metric name and unit, the current baseline value (measured before the quarter starts), the specific target value for quarter end, the person responsible for tracking, and a flag marking it as committed (must achieve, treat as a delivery target) or aspirational (stretch goal, aim high and accept 60% achievement). Initialize all KR scores at 0.0 at the start of the quarter.

### Step 2: Define KPIs

Separate KPIs from OKRs conceptually. KPIs have no end date — they are ongoing health metrics you always monitor. Classify each KPI along two axes: leading indicators (predict future outcomes — sign-ups this week, feature adoption rate, code review turnaround) vs lagging indicators (measure past results — revenue, retention rate, churn). And by level: input (what the team does — story points committed), output (what the team produces — features shipped), and impact (what the business gets — NPS change, revenue growth). Set a target for the quarter and record the current baseline.

### Step 3: Cascade

Company-level OKRs define the strategic direction. Team-level OKRs derive from company KRs: the company KR "Reduce P95 latency from 400ms to 150ms" becomes the platform team's Objective "Achieve industry-leading API response times." Individual-level OKRs derive from team KRs. Each level adapts and translates — aligned in direction but not copy-pasted. Cross-functional teams may contribute to multiple higher-level objectives. Document the cascade tree so everyone can trace how their work connects to company goals.

### Step 4: Track Weekly

The weekly check-in is a 15-minute individual exercise, not a meeting. For each KR: update the current numeric progress value, rate confidence as high (on track with strong evidence, >75% confidence), medium (some risk or uncertainty, 50-75%), or low (off track, unlikely to hit target, <50%), and flag any blockers or dependencies that need unblocking. No scoring or grades during weekly check-ins — scores are exclusively for the quarterly review. Weekly is about visibility, course correction, and surfacing support needs early.

### Step 5: Review Quarterly

At the end of each quarter, score every KR on the 0.0 to 1.0 scale against its target. Green (0.7-1.0): achieved or substantially achieved, KR delivered as planned. Yellow (0.4-0.6): progress made but not fully met, partial achievement with learnings. Red (0.0-0.3): minimal progress, the KR was not achieved, needs discussion. For each KR, write a brief retrospective note: what enabled progress, what blocked completion, what the team would do differently next time. Carry forward incomplete KRs that remain strategically relevant. Remember that aspirational OKRs should average ~0.6 across all KRs — 1.0 on every KR means the team did not stretch enough.

### Step 6: Conduct OKR Writing Workshop

Schedule a 2-hour workshop per team at the start of each quarter cycle. Agenda: review previous quarter scores (20 min), present company OKRs and strategic context (15 min), brainstorm Objectives aligned to company priorities (25 min), define 3-5 KRs per Objective with baselines and targets (40 min), review and refine for quality (15 min), assign owners and log into tracking system (5 min). Output: draft OKRs ready for management review.

### Step 7: Align Cross-Functional OKRs

For OKRs requiring multiple teams: identify shared KRs (multiple teams contribute to same metric), define dependency KRs (Team A's output enables Team B's KR), establish joint ownership with clear per-team contribution, create cross-team checkpoint cadence (bi-weekly sync). Document collaborative KRs in both teams' OKR sets with cross-reference annotations.

### Step 8: Manage OKR Mid-Quarter Adjustments

If external factors change: assess whether the Objective is still relevant, adjust KR targets if the baseline has shifted significantly, add or remove KRs if scope has changed materially, re-score at adjustment point to establish new baseline. Communicate changes to all stakeholders. Document rationale for adjustments. Limit adjustments to one per quarter per OKR.

### Step 9: Create OKR Visibility Dashboard

Build a dashboard showing: each Objective with its KR list, current progress bars per KR (0-100%), confidence indicators (green/yellow/red), trend arrows (improving/stable/declining), owner names, last updated timestamp. Dashboard should be auto-updating from the tracking tool. Make it visible to the entire organization. Review as a team in the weekly check-in.

### Step 10: Run Quarterly OKR Retrospective

After scoring, conduct a 1-hour retrospective on the OKR process itself. Questions: did the OKRs drive the right behavior? Were the KRs truly measurable? Was the cascade effective? Did weekly check-ins happen consistently? What would improve next quarter's cycle? Document process improvements for the next quarter.

## Models

### OKR Score Rubric
```
0.7-1.0  Green   Achieved      KR delivered. Targets met or exceeded.
0.4-0.6  Yellow  Progress      Partial achievement. Significant but incomplete.
0.0-0.3  Red     At risk       Minimal progress. Needs discussion and re-scoping.
```
For committed OKRs, all KRs should score 1.0. They are delivery commitments, not aspirations. For aspirational OKRs, the average score across all KRs should land around 0.6 — this is the signal that the team stretched appropriately.

### OKR Maturity Model

| Level | Stage | Characteristics |
|-------|-------|-----------------|
| 1 | Ad-hoc | No formal OKRs, goals vary by manager, no alignment |
| 2 | Started | OKRs written but not tracked, forgotten by week 4 |
| 3 | Practicing | OKRs tracked weekly, scored quarterly, cascade exists |
| 4 | Embedded | OKRs drive prioritization, KPIs separate, mid-quarter adjustments |
| 5 | Optimizing | Data-driven target setting, cross-functional alignment, predictive modeling |

### KPI Design Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| Actionable | Can the metric owner influence it? | "Team velocity" (actionable) vs "Stock price" (not) |
| Timely | Available at decision-making cadence | Daily deployment frequency vs Quarterly NPS |
| Specific | Clearly defined numerator/denominator | "P95 API latency in ms" vs "System performance" |
| Comparable | Same definition across teams | Standardized DORA metrics vs custom definitions |
| Verifiable | Can be independently audited | Automated data source vs self-reported |

## Common Pitfalls

### Pitfall 1: OKR/KPI Confusion
Using OKRs to track ongoing operations ("Maintain 99.9% uptime") rather than change. Fix: uptime is a KPI, not an OKR. An OKR would be "Improve uptime from 99.9% to 99.99%."

### Pitfall 2: Too Many Objectives
Teams with 5+ objectives have no focus. Fix: limit to 2-4 objectives per level. Everything else is business-as-usual tracked by KPIs.

### Pitfall 3: Non-Measurable KRs
"Improve developer experience" without a metric. Fix: add a measurable KR like "Reduce CI pipeline time from 15 min to 5 min" or "Improve eNPS from 30 to 50."

### Pitfall 4: Copy-Paste Cascade
Each level copying the same KR rather than translating. Fix: a company KR "Reduce churn from 5% to 3%" becomes the product team's Objective "Build stickier user experience" with their own KRs.

### Pitfall 5: No Weekly Tracking
Writing OKRs and forgetting them until quarter end. Fix: implement a 15-minute weekly check-in ritual. No exception.

### Pitfall 6: KPI Proliferation
Tracking 50+ KPIs per team obscures what matters. Fix: max 5-7 KPIs per team. If everything is a priority, nothing is.

### Pitfall 7: Scoring Gaming
Setting easy targets to guarantee 1.0 scores. Fix: expect aspirational OKRs to average 0.6. Leadership should review score distributions.

### Pitfall 8: Individual Performance Linkage
Tying compensation to OKR scores discourages stretch goals. Fix: separate performance evaluation from OKR scoring. OKRs are for alignment and learning, not evaluation.

### Pitfall 9: Cascading Without Context
Teams receive company OKRs without understanding the strategic rationale. Fix: leadership shares context behind each Objective — why this, why now, why important.

### Pitfall 10: No Retrospective
Scoring without learning misses the point. Fix: every quarter, review what worked and what didn't in the OKR process itself.

## Best Practices

- **Objectives are qualitative, KRs are quantitative** — Never mix the two forms. An objective is an inspirational sentence. A KR is a number with a baseline and a target.
- **3-5 KRs per objective** — Fewer than 3 misses important dimensions. More than 5 dilutes focus and makes the score noisy.
- **Every KR must contain a number** — "Improve performance" is not a KR because it is not falsifiable. "Reduce P95 latency from 400ms to 200ms" is a KR.
- **Score against the target, not against effort** — The KR target is the goal. Met = 1.0. Halfway = 0.5. Effort without outcome is not a score.
- **Committed OKRs should hit 1.0 across all KRs** — They are delivery commitments. A committed KR scoring 0.7 needs a serious retro discussion.
- **Aspirational OKRs should average ~0.6** — 1.0 on every aspirational KR means targets were too low. 0.6 is the sweet spot.
- **KPIs track ongoing health, OKRs track time-bound change** — KPIs have no end date. OKRs are specific to a quarter.
- **Cascade downward, translate, never copy** — A higher-level KR becomes a lower-level Objective, adapted to the team's specific context.
- **Weekly check-ins keep OKRs alive** — Without weekly tracking, OKRs are forgotten by week 4.
- **Separate OKR scoring from performance reviews** — Linking compensation to OKR scores kills stretch goals.

## Compared With

| Framework | Focus | Best For | Weakness |
|-----------|-------|----------|----------|
| OKR (this skill) | Stretch goals, alignment | Innovation, growth | Not for routine operations |
| KPI (this skill) | Health metrics | Ongoing measurement | No direction setting |
| SMART Goals | Precision | Individual targets | Rigid, lacks alignment |
| Balanced Scorecard | Multi-perspective | Enterprise strategy | Heavy, complex |
| North Star Metric | Single focus | Product-led growth | Too narrow alone |
| Objectives & Standards | Commitments | Reliable delivery | Not aspirational |

## Templates and Tools

### OKR Template
```
Objective: {inspirational statement}
└── KR 1: {metric} from {baseline} to {target} [{committed/aspirational}] Owner: {name}
└── KR 2: {metric} from {baseline} to {target} [{committed/aspirational}] Owner: {name}
└── KR 3: {metric} from {baseline} to {target} [{committed/aspirational}] Owner: {name}
```

### Weekly Check-In Template
```
Name: {name} | Week: {n}
KR 1: {name} — {current value} / {target} — Confidence: {H/M/L}
  Blockers: {none or description}
KR 2: {name} — {current value} / {target} — Confidence: {H/M/L}
  Blockers: {none or description}
Action Items: {what needs to happen this week}
```

### KPI Definition Sheet
| KPI Name | Type | Baseline | Target | Owner | Frequency |
|----------|------|----------|--------|-------|-----------|
| P95 Latency | Lagging/Output | 400ms | 200ms | Platform team | Daily |
| Deployment Frequency | Leading/Output | 5/week | 10/week | Dev team | Weekly |
| NPS | Lagging/Impact | 30 | 50 | Product | Quarterly |

### OKR Cascade Template
```
Company Objective: {objective}
  └── Company KR 1: {metric} {baseline}→{target}
      └── Team Alpha Objective: {team objective aligned to KR 1}
          └── Team Alpha KR 1: {metric} {baseline}→{target}
          └── Team Alpha KR 2: {metric} {baseline}→{target}
      └── Team Beta Objective: {team objective aligned to KR 1}
          └── Team Beta KR 1: {metric} {baseline}→{target}
  └── Company KR 2: {metric} {baseline}→{target}
      └── Team Gamma Objective: {team objective aligned to KR 2}
          └── Team Gamma KR 1: {metric} {baseline}→{target}
```

## OKR Examples by Role

### Engineering Team
```
Objective: Ship reliable, fast software that delights users
KR 1: Reduce P95 API latency from 400ms to 150ms [aspirational]
KR 2: Increase deployment frequency from 5/week to 15/week [committed]
KR 3: Reduce change fail rate from 10% to 3% [committed]
KR 4: Improve unit test coverage from 72% to 85% [committed]
```

### Product Team
```
Objective: Make our onboarding the best in class
KR 1: Increase 7-day activation rate from 40% to 65% [aspirational]
KR 2: Reduce time-to-value from 14 days to 5 days [committed]
KR 3: Improve onboarding NPS from 20 to 45 [aspirational]
KR 4: Ship 3 onboarding experiments per month [committed]
```

### Platform Team
```
Objective: Empower engineering teams to self-serve infrastructure
KR 1: Reduce service provisioning time from 3 days to 4 hours [committed]
KR 2: Publish internal platform API docs for 100% of services [committed]
KR 3: Achieve 95% developer satisfaction with platform tools [aspirational]
KR 4: Reduce infrastructure cost per deployment by 20% [committed]
```

## Rules

- Objectives are qualitative, KRs are quantitative — never mix the two forms
- 3-5 KRs per objective — fewer than 3 misses dimensions, more than 5 dilutes focus
- Every KR must contain a number with a baseline and target — not falsifiable otherwise
- Score against the target, not against effort — met = 1.0, effort without outcome is not a score
- Committed OKRs should hit 1.0 across all KRs — they are delivery commitments
- Aspirational OKRs should average ~0.6 — 1.0 on every KR means targets were too low
- KPIs track ongoing health, OKRs track time-bound change — never conflate
- Cascade downward, translate, never copy — adapt to team context
- Separate OKR scoring from performance reviews — kills stretch goals
- Weekly check-ins measure progress and confidence, not scores — scores are quarterly
- Review OKR scores with a retrospective — scoring without learning misses the point
- Cross-functional OKRs need explicit shared ownership definitions
- KPI count per team: max 5-7 — more than that obscures focus
- Leading KPIs are more actionable than lagging — prioritize them
- OKR mid-quarter adjustments are allowed but limited to one per OKR

## OKR Cascading Template — Company to Team

### Level 1: Company OKR (Quarter {n})
Objective: {Company-level strategic objective}
KR 1: {Metric} from {baseline} to {target}
KR 2: {Metric} from {baseline} to {target}
KR 3: {Metric} from {baseline} to {target}

### Level 2: Department OKRs
Objective: {Department-level objective supporting Company O or KR 1}
KR 1: {Metric} from {baseline} to {target} [supports Company KR 1]
KR 2: {Metric} from {baseline} to {target} [supports Company KR 2]

### Level 3: Team OKRs
Objective: {Team-level objective supporting Department O}
KR 1: {Metric} from {baseline} to {target}
KR 2: {Metric} from {baseline} to {target}
KR 3: {Metric} from {baseline} to {target}

### Alignment Mapping
```
Company O
  -> Dept O 1
    -> Team O 1.1
    -> Team O 1.2
  -> Dept O 2
    -> Team O 2.1
    -> Team O 2.2

Rules:
  - Cascading means translating, not copying
  - Each level focuses on what they control
  - Dept KRs must be traceable to Company KRs
  - Cross-team alignment for interdependent teams
  - Max 4 levels to avoid clarity loss
```

## KPI Tree Template

```
Business Goal: Improve Customer Retention
|
+-- Leading Indicators (predictive, actionable)
|   +-- Engagement Score
|   |   +-- DAU/MAU ratio
|   |   +-- Session duration per user
|   |   +-- Feature adoption rate (%)
|   +-- Onboarding Success
|   |   +-- Time to first key action
|   |   +-- Activation rate
|   +-- Satisfaction Signals
|       +-- NPS score
|       +-- CSAT survey score
|
+-- Lagging Indicators (outcome, less actionable)
    +-- Monthly churn rate
    +-- Customer LTV
    +-- Renewal rate
    +-- Revenue retention (NRR)
```

### KPI Design Sheet Template
```
KPI Name: Activation Rate
Definition: % of new users who complete activation milestone within 7 days
Formula: (activated in 7d) / (total new users) x 100
Baseline: {value} | Target: {value}
Tier: Health | OKR | Watch | Exploratory
Data Source: {system, table, query}
Owner: {team or role}
Cadence: Daily | Weekly | Monthly | Quarterly
Trigger Alert: {threshold}
Actions Available: {action 1}, {action 2}
```

### KPI vs OKR Decision Matrix
| Aspect | OKR | KPI |
|--------|-----|-----|
| Purpose | Change direction | Track health |
| Timeframe | Quarterly | Ongoing |
| Target | Stretch + committed | Threshold |
| Score | 0.0-1.0 | Pass/fail |
| Review | Weekly check-in | Dashboard |
| Change frequency | Per quarter | As needed |

## OKR Scoring Rubric
```
Score | Meaning
0.0-0.3 | Did not achieve - significant gap
0.4-0.5 | Below target - made progress
0.6-0.7 | On track - solid delivery
0.8-0.9 | Exceeded - significantly overshot
1.0 | Far exceeded - target too low

Weekly confidence: 10 (certain) / 7-9 (on track) / 4-6 (at risk) / 1-3 (escalate)
```

## OKR Mid-Quarter Adjustment Protocol
```
When to adjust: external change, broken dependency, technical infeasibility, priority shift
When NOT: difficult but achievable, behind but 4+ weeks remain, personal discomfort

Process:
1. Propose change with data and reasoning
2. One adjustment per KR per quarter max
3. Document original and revised values
4. Communicate to dependent teams

Allowed: lower target, add supporting KR, split KR across teams
Not allowed: new Objective mid-quarter, lower target due to effort, remove KR without replacement
```

## OKR Examples by Area

### Engineering Team
```
Objective: Reduce production incident impact on users
KR 1: Decrease P0 incident MTTR from 45min to 15min
KR 2: Achieve 99.95% uptime (from 99.8%)
KR 3: Reduce incident-causing deploys from 3/mo to 0/mo
```

### Product Team
```
Objective: Ship a delightful onboarding experience
KR 1: Increase activation rate from 45% to 65%
KR 2: Reduce time to first key action from 12min to 5min
KR 3: Achieve NPS > 40 for onboarding flow
```

### Marketing Team
```
Objective: Establish category leadership in cloud monitoring
KR 1: Publish 4 thought leadership pieces in top-tier publications
KR 2: Increase organic traffic from 10k to 25k/mo
KR 3: Generate 200 qualified leads from content marketing
```

### Data/ML Team
```
Objective: Build data foundation for personalized experiences
KR 1: Launch real-time feature pipeline with < 100ms p99 latency
KR 2: Increase feature coverage from 60% to 95%
KR 3: Enable A/B testing platform for 3 teams by end of quarter
```

## KPI Dashboard Template
```
Team Dashboard - Q{n} {Year}
KPI | Current | Target | Trend | Status
{kpi} | {value} | {value} | up/down/flat | G/Y/R

Weekly Check-in:
Team: {name} | Week: {n}
OKR: {Objective}
KR 1: {score} - confidence: {n}/10 - status: track/risk/blocked
Key updates: {accomplishments}
Blockers: {blocker with owner}
Next week: {priorities}
```

## References
  - references/kpi-dashboard.md — KPI Dashboard
  - references/kpi-tracking-tools.md — KPI Tracking Tools
  - references/okr-alignment.md — OKR Alignment
  - references/okr-examples.md — OKR Examples
  - references/okr-kpi-advanced.md — OKR KPI Advanced Topics
  - references/okr-kpi-frameworks.md — OKR vs KPI Frameworks
  - references/okr-kpi-fundamentals.md — OKR KPI Fundamentals
  - references/okr-template.md — OKR Template

## Handoff
sprint-retro (review OKR progress during the sprint retrospective), create-roadmap (align the product roadmap themes with OKR objectives and KRs).
