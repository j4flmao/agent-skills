# Retro Metrics

## Action Item Completion Rate

### Definition
The percentage of action items from the previous retro that are completed by the next retro.

### Formula
```
Completion Rate = Number of action items completed on time / Total action items × 100
```

### Target
- **Good**: > 80% completion
- **Acceptable**: 60-80%
- **Needs attention**: < 60%

### Tracking
```
Sprint | Action Items | Completed | Completion Rate | Trend
-------|--------------|-----------|-----------------|-------
Sprint 11 | 3 | 2 | 67% | —
Sprint 12 | 3 | 3 | 100% | ↑
Sprint 13 | 3 | 1 | 33% | ↓
Sprint 14 | 2 | 2 | 100% | ↑
Sprint 15 | 3 | 3 | 100% | ↑
```

### Root Cause Analysis for Low Completion
| Reason | Indicator | Fix |
|--------|-----------|-----|
| Too many items | Consistently < 60% with 3 items | Try 1-2 items per sprint |
| No real ownership | Items without a clear owner | Assign owner before retro ends |
| Not prioritized | Items never enter sprint backlog | Add to sprint backlog as committed work |
| Too vague | Items without success criteria | Use SMART format |
| No follow-up | Items forgotten until next retro | Track in daily standup |
| Low urgency | Items that don't address real pain | Re-examine whether the item matters |

## Happiness Trend

### Definition
A simple 1-5 rating of team happiness, collected at each retro.

### Measurement
```
How are you feeling about the team and the work?
1 — Very dissatisfied
2 — Dissatisfied
3 — Neutral
4 — Satisfied
5 — Very satisfied
```

### Tracking
```
Sprint | Avg Happiness | Range | Notes
-------|--------------|-------|------
Sprint 11 | 4.2 | 3-5 | Good energy post-launch
Sprint 12 | 4.0 | 3-5 | Steady state
Sprint 13 | 2.8 | 1-4 | Tough sprint, many incidents
Sprint 14 | 3.5 | 2-5 | Recovering
Sprint 15 | 4.3 | 3-5 | Back to normal
```

### What Affects Happiness
- **Positive**: Clear goals, meaningful work, good collaboration, learning opportunities, autonomy
- **Negative**: Unclear priorities, scope creep, excessive meetings, technical debt, poor tooling, lack of recognition

### Intervention Triggers
- Happiness drops by 1+ point sprint-over-sprint → investigate
- Happiness below 3.0 → immediate retro focus
- Wide range (2+ points between highest and lowest) → surface what's dividing the team
- Sustained decline over 3+ sprints → systemic issue, escalate to management

## Team NPS (Net Promoter Score)

### Definition
How likely are team members to recommend this team as a great place to work?

### Measurement
```
On a scale of 0-10, how likely are you to recommend working on this team to a colleague?

Promoters (9-10): Highly engaged, satisfied
Passives (7-8): Satisfied but not enthusiastic
Detractors (0-6): Unhappy, may leave
```

### Calculation
```
NPS = % Promoters − % Detractors
Range: -100 to +100
```

### Tracking
```
Sprint | Promoters | Passives | Detractors | NPS
-------|-----------|----------|------------|-----
Sprint 11 | 4 | 2 | 1 | +43
Sprint 12 | 3 | 3 | 1 | +29
Sprint 13 | 1 | 3 | 3 | -29
Sprint 14 | 3 | 2 | 2 | +14
Sprint 15 | 5 | 1 | 1 | +57
```

### NPS Benchmarks
| Score | Interpretation |
|-------|---------------|
| 50+ | Excellent — highly engaged team |
| 30-50 | Good — healthy team with some concerns |
| 0-30 | Moderate — significant issues need attention |
| < 0 | Critical — team distress, high turnover risk |

## Team Velocity Correlation

### Definition
The relationship between retro health metrics and team velocity. Shows whether improvement efforts are actually improving delivery.

### Correlation Matrix
```
| Metric | High Completion | High Happiness | High NPS |
|--------|----------------|----------------|----------|
| Velocity stability | Strong positive | Strong positive | Moderate |
| Velocity trend | Moderate positive | Strong positive | Moderate |
| Predictability | Strong positive | Moderate positive | Moderate |
| Quality (low defects) | Moderate | Moderate | Moderate |
```

### What Strong Correlation Means
- Teams that complete action items also show stable or improving velocity
- Happy teams are more predictable (velocity variance decreases)
- High NPS teams have lower turnover and faster onboarding

### What Weak/No Correlation Means
- Action items may be addressing the wrong problems
- Other factors (external dependencies, technical debt) dominate velocity
- The team's happiness depends on factors outside the retro

## Improvement Velocity

### Definition
A composite metric that tracks how quickly the team converts retro insights into measurable improvement.

### Formula
```
Improvement Velocity = (Action Items Completed) × (Impact Score) / Sprint Duration

Impact Score (team-rated, 1-5):
1 = No noticeable impact
3 = Moderate improvement
5 = Transformational change
```

### Tracking
```
Sprint | Items Completed | Avg Impact | Improvement Velocity
-------|----------------|-------------|--------------------
Sprint 11 | 2 | 3.0 | 6.0
Sprint 12 | 3 | 2.5 | 7.5
Sprint 13 | 1 | 4.0 | 4.0
Sprint 14 | 2 | 3.5 | 7.0
Sprint 15 | 3 | 4.0 | 12.0
```

### What Drives Improvement Velocity
- **Completing high-impact items**: One high-impact item > three low-impact items
- **Fast action item completion**: Same-sprint completion accelerates improvement
- **Measurable success criteria**: Items with clear verification are more likely to have high impact

## Retro Retro Score

### Definition
A 1-5 rating of the retro itself, collected at the end of every retro.

### Measurement
```
How valuable was this retro?
1 — Waste of time
2 — Low value
3 — OK
4 — Good
5 — Excellent

What could make future retros better?
[Free text]
```

### Tracking
```
Sprint | Format | Rating | Feedback
-------|--------|--------|---------
Sprint 11 | Start/Stop/Continue | 4 | Good, but felt rushed
Sprint 12 | 4Ls | 3 | Too many items, hard to focus
Sprint 13 | Sailboat | 5 | Helped surface the team tension
Sprint 14 | Mad/Sad/Glad | 4 | Needed more time on Glad
Sprint 15 | Start/Stop/Continue | 4 | Better with the new timer
```

### Uses
- Identify format fatigue (same rating for the same format 3+ times in a row → switch it)
- Spot timing issues (consistently low ratings → adjust timebox)
- Collect improvement ideas for facilitation

## Composite Retro Health Score

### Formula
A weighted combination of key metrics:
```
Retro Health = (Completion Rate × 0.25) + (Happiness × 0.25) 
             + (Improvement Velocity normalized × 0.25) 
             + (Retro Rating × 0.25)

Normalized to 0-100 scale
```

### Interpretation
| Score | Status | Action |
|-------|--------|--------|
| 80-100 | Thriving | Maintain, look for stretch improvements |
| 60-79 | Healthy | Some gaps, targeted improvements needed |
| 40-59 | Struggling | Multiple issues, focus retro on retro process |
| < 40 | Critical | Reset the retro process, get external facilitation |

## Metric Visualization Dashboard

```
Sprint Retros Dashboard — Team Bravo
Last 6 Sprints

Action Item Completion:      ████████████ 80% (↑ improving)
Team Happiness:              ████████░░ 4.1 (↑ improving)
Team NPS:                    ████████░░ +45 (↑ improving)
Improvement Velocity:        ██████████ 8.2 (↑ improving)
Retro Rating:                ████████░░ 4.0 (→ stable)
Composite Health:            ████████░░ 78 (Healthy)

Top 3 Improvement Themes (last 3 sprints):
1. Communication (3 sprints) — improving
2. CI/CD Pipeline (2 sprints) — completed
3. Code Review Process (1 sprint) — new
```

## References
- Agile Retrospectives: Making Good Teams Great — Esther Derby & Diana Larsen
- The Retrospective Handbook — Patrick Kua
- Measuring Team Effectiveness — Nicole Forsgren (Accelerate)
- NPS for Internal Teams — Fred Reichheld, Bain & Company
- Actionable Agile Metrics — Daniel S. Vacanti
