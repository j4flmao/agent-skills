# Agile Metrics and Reporting

## Purpose
Provide comprehensive guidance on measuring agile team and program performance. Covers flow metrics, outcome metrics, leading vs lagging indicators, dashboard design, and common metric traps. Focus on metrics that drive improvement, not comparison.

## Table of Contents
1. [Metric Philosophy](#metric-philosophy)
2. [Flow Metrics for Kanban](#flow-metrics-for-kanban)
3. [Scrum Metrics](#scrum-metrics)
4. [Portfolio and Program Metrics](#portfolio-and-program-metrics)
5. [Outcome vs Output Metrics](#outcome-vs-output-metrics)
6. [Leading vs Lagging Indicators](#leading-vs-lagging-indicators)
7. [Metric Design Principles](#metric-design-principles)
8. [Dashboard Design](#dashboard-design)
9. [Metric Traps and Anti-Patterns](#metric-traps-and-anti-patterns)
10. [Reporting Cadence](#reporting-cadence)
11. [Advanced Analytics](#advanced-analytics)

---

## Metric Philosophy

### Why Measure?

Agile metrics serve three purposes:
1. **Improvement**: Identify bottlenecks and optimization opportunities.
2. **Predictability**: Forecast delivery with evidence.
3. **Alignment**: Ensure team effort matches organizational goals.

Metrics should NOT be used for:
- Comparing team performance (demotivating, gaming).
- Performance evaluation of individuals.
- Punishment or reward (creates perverse incentives).

### Goodhart Law

"When a measure becomes a target, it ceases to be a good measure."

Examples:
- Target: Increase velocity -> Teams inflate estimates.
- Target: Reduce cycle time -> Teams skip quality practices.
- Target: 100% code coverage -> Teams write meaningless tests.

Mitigation: Use metric portfolios, not single metrics.

### Metric Hierarchy

```
Level 1: Business outcomes (revenue, retention, NPS).
Level 2: Product outcomes (usage, adoption, task completion).
Level 3: Delivery outcomes (cycle time, throughput, quality).
Level 4: Process outcomes (WIP age, flow efficiency, predictability).
```

Measure from top to bottom: business outcomes determine which product outcomes matter.
Product outcomes drive delivery focus.

---

## Flow Metrics for Kanban

### Cycle Time

```
Definition: Time from when work starts to when work is delivered.

Calculation:
  Cycle Time = Delivery Date - Start Date

Measurement:
  P50 (median): Typical cycle time.
  P85: Service level expectation (most items complete by this time).
  P95: Worst-case scenario.

Example:
  P50 = 2.5 days (most items done in 2.5 days)
  P85 = 5.0 days (85% of items done within 5 days)
  P95 = 8.0 days (95% of items done within 8 days)

Interpretation:
  - Stable cycle time = predictable delivery.
  - Widening P85/P95 gap = increasing variability (investigate).
  - Rising cycle time = system under pressure.
```

### Throughput

```
Definition: Number of work items completed per unit of time.

Calculation:
  Throughput = Items Completed / Time Period

Measurement:
  Daily or weekly throughput.
  Rolling average (4-week) to smooth variance.

Interpretation:
  - Stable throughput = predictable capacity.
  - Declining throughput = system issue or external factor.
  - Use with WIP: low WIP, high throughput = efficient system.

Little Law:
  Cycle Time = WIP / Throughput
  If WIP stays constant and throughput drops, cycle time increases.
```

### WIP (Work in Progress)

```
Definition: Number of work items started but not finished.

Measurement:
  Current WIP at any point in time.
  Average WIP over a period.

Interpretation:
  - High WIP = multitasking, context switching, longer cycle times.
  - WIP exceeding explicit limit = broken system (stop and swarm).
  - WIP consistently at limit = true team capacity.

Queueing theory:
  Increasing WIP by 20% increases cycle time by > 20%.
  Decreasing WIP by 20% decreases cycle time by > 20%.

Target: WIP at or slightly below explicit limits.
```

### WIP Age

```
Definition: How long each work item has been in progress.

Calculation:
  WIP Age = Current Date - Start Date

Measurement:
  Per item in WIP column.
  Average WIP age across all items.

Interpretation:
  - Items aging beyond P85 cycle time need escalation.
  - Oldest items = highest risk (cost of delay increases).
  - Old items that are stuck should be: unblocked, descoped, or killed.

Action threshold:
  Any item with WIP age > 2x P85 cycle time: escalate.
```

### Cumulative Flow Diagram (CFD)

```
Definition: Stacked area chart showing work item counts over time.

Components:
  - X-axis: Time.
  - Y-axis: Count of work items.
  - Bands: To Do, In Progress, Done (or per Kanban column).

Reading the CFD:
  - Widening In Progress band = bottleneck (slowing down).
  - Steady slope on Done band = consistent delivery.
  - Flat Done band = no recent deliveries.
  - Parallel bands = stable smooth flow.

Actionable signals:
  - CFD bands fanning out = system degradation.
  - CFD bands compressing = improvement.
  - Step changes in bands = policy change or significant event.
```

### Flow Efficiency

```
Definition: Ratio of active work time to total cycle time.

Calculation:
  Flow Efficiency = Active Time / Total Cycle Time x 100

Example:
  Item touches active coding for 4 hours but sits in queue for 36 hours.
  Flow Efficiency = 4 / 40 = 10%

Interpretation:
  - Low efficiency (< 30%) = high wait times, context switching.
  - High efficiency (> 60%) = smooth flow, minimal queues.
  - Typical knowledge work: 15-30% flow efficiency.

Improvement:
  Reduce batch sizes.
  Limit WIP.
  Eliminate queues between steps.
  Automate handoffs.
```

---

## Scrum Metrics

### Velocity

```
Definition: Sum of story points completed in a sprint.

Calculation:
  Velocity = Sum of story points for all completed user stories.

Measurement:
  Rolling average of last 3-5 sprints.
  Velocity range (min-max over last 5 sprints).

Example:
  Sprint 1: 30 points
  Sprint 2: 35 points
  Sprint 3: 28 points
  Average: 31 points
  Range: 28-35

Interpretation:
  - Stable velocity = predictable capacity.
  - Increasing velocity = team improvement or estimation inflation.
  - Decreasing velocity = impediments, team change, or estimation rigor.

Warning signs:
  - Velocity varies > 30% sprint-to-sprint: not a reliable planning tool.
  - Velocity increasing while quality metrics decline: gaming estimates.
  - Velocity exactly same every sprint: unlikely, check for false reporting.
```

### Sprint Predictability

```
Definition: How consistently the team meets sprint commitments.

Calculation:
  Predictability = Completed Points / Committed Points x 100

Example:
  Committed 30 points, completed 26 points.
  Predictability = 26/30 = 87%.

Interpretation:
  - 80-100%: Good predictability.
  - < 70%: Overcommitting, process issue.
  - > 100%: Sandbagging, undercommitting.

Trend: Watch over time. Consistent 100% may mean team is undercommitting.
```

### Sprint Burndown

```
Definition: Chart showing remaining work vs time in sprint.

Components:
  - X-axis: Sprint days.
  - Y-axis: Remaining story points.
  - Ideal line: Linear from total to zero.
  - Actual line: Daily remaining work.

Reading the burndown:
  - Above ideal line: behind schedule.
  - Below ideal line: ahead of schedule.
  - Flat line: no progress (blocker or scope discussion).
  - Upward trend: scope added during sprint.

Limitations:
  - Only shows quantity, not quality.
  - Doesn't account for work not estimated (bugs, support).
  - Can be misleading if tasks are added after estimation.
```

### Scope Change Rate

```
Definition: How often scope changes after sprint commitment.

Calculation:
  Scope Change Rate = Items Added / Items Committed x 100

Interpretation:
  - > 20%: Scope instability. Investigate why.
  - Causes: unclear requirements, stakeholder interference, discovery mid-sprint.
  - Mitigation: stricter Definition of Ready, defer discoveries to next sprint.
```

### Defect Escape Rate

```
Definition: Defects found in production vs found during development.

Calculation:
  Escape Rate = Production Defects / (Test Defects + Production Defects) x 100

Example:
  5 production defects, 45 test defects.
  Escape Rate = 5/50 = 10%.

Interpretation:
  - < 5%: Good quality practices.
  - 5-15%: Room for improvement.
  - > 15%: Quality process needs attention.
```

---

## Portfolio and Program Metrics

### WSJF (Weighted Shortest Job First)

```
Definition: Prioritization model based on cost of delay and job size.

Calculation:
  WSJF = Cost of Delay / Job Size
  Cost of Delay = User-Business Value + Time Criticality + Risk Reduction/Opportunity Enablement

Example:
  Feature A: CoD = 100, Size = 20, WSJF = 5
  Feature B: CoD = 150, Size = 50, WSJF = 3
  Priority: Feature A first

Interpretation:
  Higher WSJF = higher priority per unit of effort.
```

### Program Predictability Measure (SAFe)

```
Definition: How well program objectives were met in a PI.

Calculation:
  Business value achieved vs planned for each objective.
  Scale: 1 (not achieved) to 10 (far exceeded).
  Sum of achieved value / sum of planned value x 100.

Interpretation:
  - > 80%: Good predictability.
  - 70-80%: Acceptable, room for improvement.
  - < 70%: Systemic issues in planning or execution.
```

### Flow Distribution

```
Definition: Proportion of work types across portfolio.

Categories:
  - Features: new functionality.
  - Defects: production bugs.
  - Technical debt: refactoring, infrastructure.
  - Risk: security, compliance.
  - Knowledge: research, spikes.

Target distribution:
  Features: 50-60%
  Defects: 10-15%
  Technical debt: 15-20%
  Risk: 5-10%
  Knowledge: 5-10%

Interpretation:
  - Too many features (> 70%): accumulating debt, risk.
  - Too many defects (> 20%): quality issue.
  - Too little tech debt (< 10%): accumulating future problems.
```

### Time-to-Market

```
Definition: End-to-end time from idea to production.

Components:
  - Discovery: idea to refined backlog item.
  - Development: backlog item to code complete.
  - Release: code complete to production deployment.
  - Total: idea to production.

Measurement:
  P50, P85, P95 for each phase.
  Monthly or quarterly update.

Interpretation:
  - Long discovery time: analysis paralysis, unclear strategy.
  - Long development time: large batch sizes, bottlenecks.
  - Long release time: deployment process friction, manual gates.
```

---

## Outcome vs Output Metrics

### Output Metrics (What we produce)

```
Easy to measure but can be misleading.

Examples:
  - Story points completed.
  - Number of features delivered.
  - Lines of code written.
  - Pull requests merged.
  - Deployments per week.

Problem:
  High output does not guarantee high value.
  Team optimizing for output may skip value.
```

### Outcome Metrics (What we achieve)

```
Harder to measure but drive real value.

Examples:
  - User retention rate.
  - Task completion rate.
  - Time on task reduction.
  - Revenue per user.
  - Customer satisfaction score.
  - Net Promoter Score.

Challenge:
  Outcomes have lag (weeks to see effect).
  Multiple factors influence outcomes.
  Requires product analytics investment.
```

### Impact Metrics (Strategic effect)

```
Examples:
  - Market share.
  - Annual recurring revenue.
  - Customer acquisition cost.
  - Customer lifetime value.
  - Employee retention.

Attribution is difficult but these are the metrics executives care about.
```

### Connecting the Hierarchy

```
Example for a checkout flow improvement:

Output: 5 features delivered (new payment method, auto-fill, etc.)
Outcome: Checkout completion rate increased from 65% to 82%.
Impact: Revenue increased by 12% from reduced cart abandonment.

Without measuring outcome and impact, we would only see "5 features delivered"
which tells nothing about whether we moved the business needle.
```

---

## Leading vs Lagging Indicators

### Leading Indicators (Predictive)

```
Metrics that predict future outcomes.

Examples:
  - WIP age (predicts delivery delay).
  - CI pipeline failure rate (predicts quality issues).
  - Code review turnaround (predicts cycle time increase).
  - Test coverage trend (predicts defect escape rate).
  - Flow efficiency (predicts throughput).

Use: Early warning system. Intervene when leading indicators signal trouble.
```

### Lagging Indicators (Historical)

```
Metrics that confirm past outcomes.

Examples:
  - Cycle time (confirms past delivery performance).
  - Defect escape rate (confirms past quality).
  - Customer satisfaction (confirms past product quality).
  - Revenue (confirms past business performance).

Use: Validate whether actions improved results. Can't change the past.
```

### Balanced Scorecard

```
Leading + Lagging for complete picture:

| Category | Leading | Lagging |
|---|---|---|
| Delivery | WIP age, flow efficiency | Cycle time, throughput |
| Quality | Pipeline pass rate, test coverage | Defect escape rate |
| Value | Feature adoption (early) | Revenue, NPS |
| Health | Morale survey, burnout signals | Retention, sick days |
```

---

## Metric Design Principles

### Principles

```
1. Measure outcomes, not outputs: What changed, not what was produced.
2. Measure trends, not absolute values: Is it getting better or worse?
3. Measure system, not individuals: Team metrics, not individual metrics.
4. Measure what you can improve: If you can't act on it, stop measuring it.
5. Fewer metrics are better: 3-5 key metrics, not 20 confusing ones.
6. Metrics need context: Without context, metrics mislead.
7. Metrics degrade over time: Review and refresh annually.
8. Make metrics visible: Dashed boards, dashboards, shared understanding.
9. Metrics are hypotheses: They may be measuring the wrong thing.
10. Combine quantitative + qualitative: Data tells what, people tell why.
```

### Metric Selection Framework

```
For each candidate metric, ask:

1. Can we measurably define this metric? (Operational definition)
2. Can we collect data for this metric reliably? (Data availability)
3. Can we influence this metric through our actions? (Actionability)
4. Will improving this metric lead to better outcomes? (Validity)
5. Can this metric be gamed? If yes, what are the side effects? (Robustness)
6. Is this metric worth the cost of collecting? (Cost-benefit)

Score: 1 = poor, 5 = excellent. Only adopt metrics scoring 4+ on all criteria.
```

### Metric Review Cycle

```
Sprint review: Team-level metrics review.
Monthly: Flow metrics review, trend analysis.
Quarterly: Portfolio metric review, target adjustment.
Yearly: Full metric portfolio evaluation, metric retirement.
```

---

## Dashboard Design

### Team Dashboard (Single Team)

```
Row 1: Flow metrics
  - CFD (last 3 months).
  - Cycle time scatterplot (P50, P85, P95).
  - Throughput trend (weekly rolling 4-week average).

Row 2: Quality metrics
  - Defect escape rate by month.
  - CI pipeline pass rate (daily).
  - Test coverage trend.

Row 3: Health metrics
  - Team satisfaction (sprint-by-sprint).
  - Workload balance (story points per person).
  - Blocked items count.
```

### Program Dashboard (Multiple Teams)

```
Row 1: Program progress
  - Program predictability measure (PI level).
  - Dependency resolution rate.
  - Cross-team blocking issues.

Row 2: Delivery metrics
  - Combined throughput by team.
  - Cycle time by team (P50 comparison).
  - Time-to-market by feature.

Row 3: Quality metrics
  - Defect escape rate by team.
  - Integration test pass rate.
  - Security scan pass rate.

Row 4: Health
  - Team engagement scores.
  - Turnover risk indicators.
  - Burnout signals (overtime hours).
```

### Portfolio Dashboard (Executive)

```
Row 1: Business outcomes
  - Revenue vs target.
  - Customer satisfaction (NPS).
  - Market share trend.

Row 2: Delivery effectiveness
  - Time-to-market trend (monthly).
  - Flow distribution (feature vs debt vs defect).
  - Investment allocation by initiative.

Row 3: Organizational health
  - Employee engagement score.
  - Voluntary turnover rate.
  - Agile maturity assessment.
```

### Dashboard Best Practices

```
1. Target audience: Optimize for the viewer, not the data collector.
2. Actionable: Each metric should suggest a follow-up question or action.
3. Trend lines: Show direction (chart) not just point-in-time (number).
4. Benchmark: Include target or acceptable range for each metric.
5. Annotations: Mark significant events (releases, team changes, process changes).
6. Refresh frequency: Match metric change rate (daily for flow, monthly for outcomes).
7. Accessible: Simple enough for a new team member to understand.
8. Stable: Don't change dashboard design weekly (review monthly).
9. Version tracked: Dashboard definition in version control.
10. Ownership: Someone responsible for keeping dashboard up to date.
```

---

## Metric Traps and Anti-Patterns

### Common Metric Traps

```
Trap 1: Vanity metrics
  Numbers that look good but don't correlate to outcomes.
  Example: "We closed 500 tickets this month" (but 50% were spam).
  Fix: Correlate with outcome metrics.

Trap 2: Metric fixation
  Optimizing the metric at expense of the system.
  Example: Decreasing cycle time by reducing quality.
  Fix: Use balanced metric sets.

Trap 3: Comparing teams
  Velocity, cycle time, or other metrics across teams.
  Example: "Team A has higher velocity than Team B."
  Fix: Same team trend only, no cross-team comparison.

Trap 4: Cherry-picking
  Reporting metrics that look favorable and hiding others.
  Fix: Fixed dashboard with all metrics visible.

Trap 5: Measuring without targets
  "Our velocity is X" without knowing if X is good.
  Fix: Set directional targets (increase, decrease, maintain).

Trap 6: Infrequent measurement
  Reviewing metrics quarterly in a fast-moving system.
  Fix: Measure at pace of system change.

Trap 7: Data quality issues
  Metrics based on inaccurate data.
  Example: Jira tickets not updated -> cycle time incorrect.
  Fix: Data quality checks before metric review.
```

### Anti-Pattern Detection

```
Signals you are misusing metrics:
  - Teams gaming the system (splitting stories to increase velocity).
  - Debates about metric definitions instead of improvement.
  - Fear of metrics (teams hiding data).
  - Metrics used in performance reviews.
  - Dashboard never consulted for decisions.
  - Metrics change every quarter (chasing fads).
  - Only positive metrics shared with stakeholders.
  - Metric targets set by management without team input.
```

---

## Reporting Cadence

### Daily

```
What: Team standup information.
  - Board walk (CFD visual check).
  - Blocked items count.
  - WIP age highlight (items nearing escalation).

Who: Team, Scrum Master.
Format: Verbal, physical or digital board.
```

### Weekly

```
What: Flow metric review.
  - Cycle time trend.
  - Throughput (weekly).
  - WIP vs limit.
  - Blocked items resolution.

Who: Team, Product Owner.
Format: 15-min board review.
```

### Sprint Review

```
What: Demonstration of completed work + metrics.
  - Completed vs committed.
  - Quality metrics.
  - Customer feedback.
  - Next sprint forecast.

Who: Team, stakeholders, customers.
Format: Demo + metrics slide.
```

### Monthly

```
What: Trend review.
  - Cycle time P50/P85/P95 trend (3-month).
  - Throughput trend.
  - Defect escape rate trend.
  - Team satisfaction trend.

Who: Team, Scrum Master, Product Owner.
Format: Dashboard review, no slides.
```

### Quarterly

```
What: Portfolio review.
  - OKR progress.
  - Program predictability.
  - Time-to-market trend.
  - Flow distribution.
  - Investment allocation.

Who: Portfolio stakeholders, leadership.
Format: Exec summary with metrics.
```

### Annual

```
What: Full metric audit.
  - Metric portfolio effectiveness review.
  - Metric deprecation/addition.
  - Process change recommendations.
  - Next year target setting.

Who: Organization leadership.
```

---

## Advanced Analytics

### Monte Carlo Simulation

```
Purpose: Predict delivery dates probabilistically.

Method:
  1. Collect historical throughput data (last 20+ sprints).
  2. Randomly sample sprint throughput values (simulate).
  3. Calculate when remaining backlog would be completed.
  4. Repeat 10,000 times for probability distribution.

Output:
  "There is an 85% probability of completing by June 30."

Use:
  - Release date forecasting.
  - Capacity planning.
  - Stakeholder communication on delivery risk.
```

### Queueing Theory

```
Concepts applied to agile:
  - Arrival rate: how often new work enters the system.
  - Service rate: how fast the team processes work.
  - Utilization: arrival rate / service rate.
  - Queue length: work waiting to be processed.

Little's Law applications:
  Predict cycle time from WIP and throughput.
  Calculate optimal WIP limit from desired cycle time.

Coordination costs:
  Cost of coordination grows as O(n^2) in task dependencies.
  Break work into smaller independent batches.
```

### Flow Debt

```
Definition: Accumulated inefficiency in the workflow.

Components:
  - Wait time debt: queues between process steps.
  - Handoff debt: knowledge lost in task transfer.
  - Variability debt: unpredictable work size distribution.
  - Context switching debt: frequent task switching reduces throughput.

Measurement:
  Flow efficiency (active vs wait time).
  Handoff count per item.
  Work size variance (coefficient of variation).

Improvement:
  Reduce batch sizes.
  Collocate teams.
  Standardize processes.
  Automate handoffs.
```

### Predictive Analytics

```
Model types:
  - Throughput regression: predict future throughput from historical trends.
  - Cycle time forecasting: predict delivery time for specific item size.
  - Defect prediction: identify high-defect-risk backlog items.
  - Flow anomaly detection: flag unusual metric patterns.

Data requirements:
  6+ months of clean historical data.
  Consistent metric definitions.
  Tracked artifacts (backlog items, defects, changes).

Tools:
  - Jira Advanced Roadmaps.
  - Actionable Agile.
  - Nave.
  - Custom analytics (Python/R).
```

## Handoff
`agile-scaling-frameworks.md` for scaling frameworks.
`../SKILL.md` for the parent agile-scrum-kanban skill.
