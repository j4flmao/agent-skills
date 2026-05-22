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
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
OKR document complete with at least 3 objectives and 3-5 KRs per objective. KPI sheet populated with baselines and quarterly targets for 5+ metrics. Cascade maps across 3 organizational levels.

### Max Response Length
3000 tokens

## Workflow

1. **Define OKR structure** — Write inspirational qualitative Objectives in 1-2 sentences using active, energizing language. Use verbs that imply change: "dominate," "transform," "establish," "unlock," "accelerate." Attach precisely 3-5 measurable Key Results per objective. Each KR entry includes: the metric name and unit, the current baseline value (measured before the quarter starts), the specific target value for quarter end, the person responsible for tracking, and a flag marking it as committed (must achieve, treat as a delivery target) or aspirational (stretch goal, aim high and accept 60% achievement). Initialize all KR scores at 0.0 at the start of the quarter.

2. **Define KPIs** — Separate KPIs from OKRs conceptually. KPIs have no end date — they are ongoing health metrics you always monitor. Classify each KPI along two axes: leading indicators (predict future outcomes — sign-ups this week, feature adoption rate, code review turnaround) vs lagging indicators (measure past results — revenue, retention rate, churn). And by level: input (what the team does — story points committed), output (what the team produces — features shipped), and impact (what the business gets — NPS change, revenue growth). Set a target for the quarter and record the current baseline.

3. **Cascade** — Company-level OKRs define the strategic direction. Team-level OKRs derive from company KRs: the company KR "Reduce P95 latency from 400ms to 150ms" becomes the platform team's Objective "Achieve industry-leading API response times." Individual-level OKRs derive from team KRs. Each level adapts and translates — aligned in direction but not copy-pasted. Cross-functional teams may contribute to multiple higher-level objectives. Document the cascade tree so everyone can trace how their work connects to company goals.

4. **Track weekly** — The weekly check-in is a 15-minute individual exercise, not a meeting. For each KR: update the current numeric progress value, rate confidence as high (on track with strong evidence, >75% confidence), medium (some risk or uncertainty, 50-75%), or low (off track, unlikely to hit target, <50%), and flag any blockers or dependencies that need unblocking. No scoring or grades during weekly check-ins — scores are exclusively for the quarterly review. Weekly is about visibility, course correction, and surfacing support needs early.

5. **Review quarterly** — At the end of each quarter, score every KR on the 0.0 to 1.0 scale against its target. Green (0.7-1.0): achieved or substantially achieved, KR delivered as planned. Yellow (0.4-0.6): progress made but not fully met, partial achievement with learnings. Red (0.0-0.3): minimal progress, the KR was not achieved, needs discussion. For each KR, write a brief retrospective note: what enabled progress, what blocked completion, what the team would do differently next time. Carry forward incomplete KRs that remain strategically relevant. Remember that aspirational OKRs should average ~0.6 across all KRs — 1.0 on every KR means the team did not stretch enough.

## Models

### OKR Score Rubric
```
0.7-1.0  Green   Achieved      KR delivered. Targets met or exceeded.
0.4-0.6  Yellow  Progress      Partial achievement. Significant but incomplete.
0.0-0.3  Red     At risk       Minimal progress. Needs discussion and re-scoping.
```
For committed OKRs, all KRs should score 1.0. They are delivery commitments, not aspirations. For aspirational OKRs, the average score across all KRs should land around 0.6 — this is the signal that the team stretched appropriately.

### KPI Classification
| Axis | Type | What It Measures | Example |
|---|---|---|---|
| Timing | Leading | Predicts the future | Sign-ups per week |
| Timing | Lagging | Measures the past | Quarterly revenue |
| Level | Input | Team effort | Stories committed |
| Level | Output | Team production | Features shipped |
| Level | Impact | Business result | Net Promoter Score |

## Rules

- **Objectives are qualitative, KRs are quantitative** — Never mix the two forms. An objective is an inspirational sentence. A KR is a number with a baseline and a target.
- **3-5 KRs per objective** — Fewer than 3 misses important dimensions of the objective. More than 5 dilutes focus and makes the score noisy.
- **Every KR must contain a number** — "Improve performance" is not a KR because it is not falsifiable. "Reduce P95 latency from 400ms to 200ms" is a KR because we can objectively measure success.
- **Score against the target, not against effort** — The KR target is the goal. Met = 1.0. Halfway = 0.5. Effort without outcome is not a score. The KR is outcome-based.
- **Committed OKRs should hit 1.0 across all KRs** — They are delivery commitments. A committed KR scoring 0.7 at quarter end needs a serious retro discussion about what went wrong.
- **Aspirational OKRs should average ~0.6** — 1.0 on every aspirational KR means the team set targets too low and did not stretch. 0.0 means they tried nothing. 0.6 is the sweet spot.
- **KPIs track ongoing health, OKRs track time-bound change** — KPIs have no end date (you always track uptime). OKRs are specific to a quarter. Do not confuse the two.
- **Cascade downward, translate, never copy** — A higher-level KR becomes a lower-level Objective, but adapted to the team's specific scope and context. Copy-pasting is not cascading.

## Related Skills

- **sprint-retro** — Review OKR progress and confidence levels during the sprint retro
- **create-roadmap** — Align roadmap themes with OKR objectives and key results
- **create-story** — Break down OKR key results into actionable sprint stories
- **pm** — Coordinate OKR definition with product management and stakeholders

## References

- [OKR Template](references/okr-template.md)

## Handoff
sprint-retro (review OKR progress during the sprint retrospective), create-roadmap (align the product roadmap themes with OKR objectives and KRs).
