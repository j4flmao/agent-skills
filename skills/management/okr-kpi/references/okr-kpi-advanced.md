# OKR KPI Advanced Topics

## Introduction
Advanced OKR and KPI topics cover strategy deployment, leading indicator design, execution cadences, OKR-informed resource allocation, predictive analytics, and organizational alignment at scale. This reference builds on fundamentals for experienced practitioners.

## Strategy Deployment (Hoshin Kanri)

### X-Matrix Framework
Connects long-term vision to annual objectives to quarterly OKRs to daily execution:

```
                  Long-term Vision (5-10 yr)
                          ↑
                Annual Objectives (strategic)
                          ↑
        ┌─────────────────┼─────────────────┐
        |                                    |
  Quarterly OKRs (dept A)     Quarterly OKRs (dept B)
        |                                    |
  Weekly KPIs + actions          Weekly KPIs + actions
```

**X-Matrix quadrants**:
- Top: long-term vision / breakthrough objectives
- Left: annual strategic priorities
- Right: quarterly tactics / OKRs
- Bottom: daily metrics / KPIs

Cross-checks: every quarterly OKR connects to at least one annual priority. Every annual priority has OKRs supporting it.

### Strategy Review Cadence
- **Annual**: strategy refresh, 3-5 year vision, major pivots
- **Quarterly**: OKR setting, resource allocation, priority adjustment
- **Monthly**: cross-functional KPI review, strategic progress, risk assessment
- **Weekly**: team OKR check-in, blocker removal, course correction
- **Daily**: standup with KPI awareness

## Cascading with Autonomy

### 70/20/10 OKR Model
```
Team OKR composition:
70% Aligned: directly supports department/company OKRs
20% Local: team-specific improvement or innovation
10% Experimental: moonshot, exploration, learning
```

This ensures alignment without losing team ownership and creativity.

### Contribution vs Achievement
Not all teams contribute to OKRs in the same way:
- **Direct**: team's work directly moves a KR (e.g., engineering building a feature)
- **Enabling**: team's work enables others to move KRs (e.g., platform team)
- **Supporting**: team's work maintains stability so others can focus on KRs (e.g., SRE)

Map each team's contribution type to avoid forcing direct metrics on enabling teams.

## Leading Indicator Design

### Criteria for Good Leading Indicators
1. **Causal connection**: change in leading indicator predicts change in lagging outcome
2. **Measurable frequently**: can be tracked weekly or daily
3. **Actionable**: teams can influence it within their control
4. **Timely**: signal appears days/weeks before lagging outcome changes

### Leading Indicator Examples

| Outcome (Lagging) | Leading Indicators |
|--------------------|-------------------|
| Revenue growth | Pipeline value, demo completion rate, trial-to-paid conversion |
| Customer retention | Feature adoption rate, support ticket volume, login frequency |
| Product quality | Defect escape rate, CI failure rate, code review cycle time |
| Employee retention | Engagement survey score, 1:1 action item closure rate, promotion rate |
| Delivery speed | Cycle time, WIP count, branch lifetime, deployment frequency |

### Validating Leading Indicators
1. Collect 3-6 months of historical data for both proposed leading indicator and lagging outcome
2. Calculate correlation coefficient (R² > 0.5 is useful)
3. Test if changes in leading indicator precede changes in lagging (Granger causality)
4. Deploy in parallel with existing metrics, refine over 2 quarters

## Execution Cadences

### Weekly OKR Check-In Template
```
OKR: {objective}

KR 1: {metric} — Current: {value} — Target: {value} — Confidence: {LOW/MED/HIGH}
  Progress this week: {what moved the needle}
  Blockers: {what's preventing progress}
  Next action: {specific step for next week}

KR 2: {metric} — Current: {value} — Target: {value} — Confidence: {LOW/MED/HIGH}
  Progress this week: {what moved the needle}
  Blockers: {what's preventing progress}
  Next action: {specific step for next week}
```

### Monthly Business Review (MBR) Agenda
1. KPI dashboard review (10 min) — red/yellow/green status
2. OKR progress by department (15 min) — confidence levels, key moves
3. Strategic risks and opportunities (10 min) — external factors, competitive moves
4. Resource re-allocation decisions (10 min) — what to stop, start, continue
5. Action items and owners (5 min)

### Quarterly OKR Scoring

Score each KR 0-1.0:
```
1.0 = Aspirational result, near-impossible
0.7 = Great result, meaningful progress
0.5 = Significant progress but missed target
0.3 = Some progress but well below target
0.0 = No progress

Overall objective score = average of KR scores
```

Interpretation:
- 0.6-0.8: Healthy for aspirational OKRs (ambitious goals)
- 0.9-1.0: Either goals weren't ambitious enough or exceptional execution
- < 0.5: Either goals too ambitious, wrong strategy, or execution problems
- Track trend over quarters for each team

## OKR-Informed Resource Allocation

### Stop-Start-Continue Framework
For each quarter, based on OKR performance:

**Stop**:
- Activities not contributing to any OKR
- Projects with consistently low KR scores (> 2 quarters)
- Legacy products with declining KPIs

**Start**:
- New initiatives aligned to annual priorities
- Experiments to improve leading indicators
- Infrastructure changes enabling future OKRs

**Continue**:
- Activities driving OKR progress
- Projects with improving KR scores
- Core KPI maintenance

### Weighted OKR Budgeting
Allocate resources proportional to OKR priority:

```
Objective A (weight: 40%) → gets 40% of available budget
Objective B (weight: 30%) → gets 30% of available budget
Objective C (weight: 20%) → gets 20% of available budget
Operations (weight: 10%) → gets 10% of available budget
```

Budget includes people, money, and infrastructure. Review quarterly.

## OKR Anti-Patterns (Advanced)

### Anti-Pattern 1: Vanity Metrics as KRs
Choosing KRs that always look good (page views, registered users) but don't correlate to business outcomes.
Fix: validate correlation between KR movement and real business impact before setting.

### Anti-Pattern 2: KR Inflation
Adding more KRs each quarter without removing any. KRs grow unbounded, focus dilutes.
Fix: sunset one KR for every new KR added. Maintain 3-5 KRs per objective.

### Anti-Pattern 3: Objective Stagnation
Same objective repeated quarter after quarter with no progress.
Fix: if an objective is repeated > 3 quarters, question whether it's the right objective or resource allocation is insufficient.

### Anti-Pattern 4: Full Cascade
100% top-down OKRs. Teams have no say in what they work on. Autonomy and engagement drop.
Fix: bottom-up draft, top-down review. Teams own 70% of their OKRs. Leaders set "what," teams define "how."

### Anti-Pattern 5: KPI for KPI's Sake
Measuring everything because you can. Dashboards are overwhelming. No one acts on them.
Fix: every KPI must answer a question. If no decision depends on it, remove it. Max 5-7 KPIs per team.

## Predictive Analytics for OKRs

### KR Trajectory Forecasting
Using historical progress rate to predict quarter-end score:

```
Week 1: 10%   (start)
Week 4: 25%   (trend: 5%/week → will reach 65% by week 12)
Week 8: 40%   (trend: 3.75%/week → will reach 55% by week 12)
```

At current pace, KR will miss target. Intervention needed: unblock, reprioritize, reduce scope.

### Confidence Scoring
Update confidence level weekly:
- HIGH (75-100%): on track, no blockers expected
- MED (50-75%): some risk, defined mitigation
- LOW (0-50%): significant risk, needs intervention

Confidence drop is a leading indicator. Investigate any drop from MED to LOW.

## Key Points
- X-Matrix connects long-term vision to daily execution in one view
- Leading indicators predict outcomes — invest in finding the right ones
- 70/20/10 model balances alignment with autonomy and innovation
- Weekly check-ins keep OKRs alive between quarterly reviews
- Score 0.6-0.8 for aspirational OKRs is healthy
- Stop-Start-Continue links OKR performance to resource allocation
- One KR sunset for every new KR prevents metric inflation
- Validate leading indicators before deploying at scale
- Confidence tracking provides early warning for at-risk KRs
- Aligned autonomy (70% top, 30% team) drives engagement and results
