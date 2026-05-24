# Velocity and Capacity Metrics

## Velocity

### Definition
The amount of work a team completes in a sprint, measured in story points or story count. Velocity is a planning tool, not a performance metric.

### Calculating Velocity
```
Average Velocity = Sum of completed points over last 3-6 sprints / Number of sprints
```

- Use a rolling average of 3-6 sprints (not single sprint — too noisy)
- Exclude the most recent sprint if it was anomalous (holidays, outages)
- Only count completed items that meet the Definition of Done
- Use the same point scale consistently within a team

### Velocity Trend
```
Sprint:   1   2   3   4   5   6
Points:  32  28  35  30  33  31
Average: 32  30  32  31  32  31
```

- An upward trend means the team is improving or inflating estimates
- A downward trend signals problems: technical debt, scope creep, team issues
- Stable velocity (even with variation) is a healthy sign

## Capacity Planning

### Sprint Capacity Calculation
```
Team Capacity = Number of developers × Sprint working days × Focus factor

Focus Factor = 0.6-0.8 for most teams
```

### Capacity Adjustments
```
Base capacity:         5 devs × 10 days = 50 person-days
Holidays:             -2 days
Meetings/ceremonies:  -3 days (sprint planning, review, retro, refinement)
Support/incidents:    -2 days
Available capacity:   43 person-days
Focus factor:         0.75
Adjusted capacity:    32 person-days ≈ 32 story points
```

### Factors That Reduce Capacity
- Ceremonies (planning, review, retro, refinement): 1-2 days per sprint
- Support rotations and incident response
- Code reviews, PR feedback cycles
- Context switching, meetings, interviews
- Onboarding new team members
- Technical debt work that was not planned

### Sprint Commitment
```
Committed Points = Rolling Average Velocity × Confidence Factor

Confidence Factor:
  - 100%: Highly predictable, stable team (6+ sprints of data)
  - 80-90%: Moderately predictable (3-5 sprints of data)
  - 60-70%: New team or unstable context (1-2 sprints of data)
```

- Commit to a range, not a single number: "We expect to deliver 28-32 points"
- Include a buffer for unplanned work: 10-20% of capacity
- Sprint goal should be achievable even if the team delivers at the bottom of the range

## Predictability

### Completed vs Committed Ratio
```
Predictability = Story points completed / Story points committed × 100
```

| Score | Meaning |
|-------|---------|
| 85-100% | Highly predictable — commits are reliable |
| 70-84% | Moderately predictable — some scope creep or over-commitment |
| 50-69% | Unpredictable — systemic issues in estimation or planning |
| < 50% | Broken process — needs investigation |

### What Affects Predictability
- Unplanned work sneaking into the sprint
- Stories that are too large (8+ points) — they fail more often
- Dependencies on other teams that are not resolved
- Requirements discovery happening during the sprint
- Part-time team members or external assignments

## Throughput vs Velocity

| Dimension | Velocity | Throughput |
|-----------|----------|------------|
| Unit | Story points | Item count |
| When used | Scrum, fixed iterations | Kanban, continuous flow |
| What it measures | Relative effort delivered | Items completed |
| Compare teams? | No — scales differ | Yes if using same item types |
| Forecasting | Sprint commitment | Cycle time × WIP |

### When to Use Which
- **Velocity** for Scrum teams doing planned feature work
- **Throughput** for Kanban teams, support teams, or teams with variable-size work
- **Both** if you want to track trend (velocity) and volume (throughput)

## Cycle Time Scatterplot

### What It Shows
Each dot represents a completed work item. X-axis = date completed, Y-axis = cycle time in days.

```
Cycle Time
    ^
20  |         .   .
15  |  .  .   .   .   .   .
10  |  .  .   .   .   .   .   .
 5  |  .  .   .   .   .   .   .   .
 0  +-------------------------------------->
    W1  W2  W3  W4  W5  W6  W7  W8  Week
```

### Reading the Scatterplot
- **Lower is better**: Shorter cycle time means faster delivery
- **Wide vertical spread**: Unpredictable delivery — items take very different times
- **Upward trend**: System is slowing down — investigate bottlenecks
- **Percentile lines**: P50 = median (50% of items delivered this fast or faster); P85 = service level expectation for standard items; P95 = tail, which should trigger escalation

### Service Level Expectation (SLE)
```
SLE: 85% of standard items completed within 10 business days
```
Based on the P85 of the cycle time scatterplot. Review monthly.

## Velocity Best Practices

| Practice | Why |
|----------|-----|
| Use rolling average | Single sprint velocity is noisy |
| Normalize for team changes | Adding/removing members changes velocity |
| Separate new work from tech debt | Track improvement work separately |
| Don't compare teams | Different scales make comparison meaningless |
| Re-negotiate mid-sprint if needed | If the team discovers it overcommitted, adjust scope |
| Track at task level too | Story points alone hide task complexity |
| Review velocity trend monthly | Spot problems before they compound |

## Common Velocity Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| Velocity as target | Points inflate every sprint | Use throughput as secondary metric |
| Comparing teams | Resentment, sandbagging | Ban cross-team comparisons |
| Including partial items | Inflated velocity | Only count done items |
| Re-estimating past items | False trend | Never re-estimate — learn from variance |
| Long sprints hide problems | Same issues every sprint | Shorter sprints surface issues faster |

## References
- Scrum.org: Velocity — https://www.scrum.org/resources/blog/velocity
- Actionable Agile: Cycle Time Scatterplot — Daniel S. Vacanti
- Kanban: Successful Evolutionary Change — David J. Anderson
