---
name: management-agile-scrum-kanban
description: >
  Use this skill when the user asks about scrum framework, kanban method, sprint planning, backlog management, velocity, agile ceremonies, WIP limits, flow metrics, estimation, or scaled agile frameworks. Covers: Scrum roles and events, Kanban principles and WIP limits, backlog refinement and prioritization, velocity and capacity planning, scaled agile coordination. Do NOT use for: sprint retrospectives (sprint-retro), OKR setting (okr-kpi), or daily standups.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [management, agile, scrum, kanban, phase-7]
---

# Agile Scrum Kanban

## Purpose
Provide a comprehensive reference for implementing and coaching Scrum and Kanban frameworks across teams. Covers Scrum roles and ceremonies, Kanban flow metrics, backlog management and prioritization techniques, estimation and velocity tracking, and scaled agile coordination patterns.

## Framework and Methodology

### Agile Fundamentals
Agile software delivery rests on four core principles from the Agile Manifesto:
1. **Individuals and interactions** over processes and tools.
2. **Working software** over comprehensive documentation.
3. **Customer collaboration** over contract negotiation.
4. **Responding to change** over following a plan.

### Scrum Framework
Scrum is an empirical process framework with three pillars: transparency, inspection, adaptation.

```
Roles: Product Owner, Scrum Master, Development Team (3-9 members)
Artifacts: Product Backlog, Sprint Backlog, Increment
Events: Sprint (1-4 weeks), Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective

Accountability:
  PO: Maximizes value of product and backlog prioritization.
  SM: Ensures Scrum process is followed, removes impediments.
  Team: Self-organizing, delivers potentially releasable increments each sprint.
```

### Kanban Method
Kanban is a flow-based system for managing knowledge work.

```
Core practices:
  1. Visualize the workflow.
  2. Limit Work in Progress (WIP).
  3. Manage flow.
  4. Make process policies explicit.
  5. Implement feedback loops.
  6. Improve collaboratively, evolve experimentally.

General practices (STATIK):
  - Start where you are.
  - Agree to pursue incremental change.
  - Respect current roles and responsibilities.
  - Encourage acts of leadership at all levels.
```

### When to Use Which

| Condition | Recommended Framework |
|---|---|
| Predictable work, fixed iterations | Scrum |
| Unpredictable flow, interrupt-driven | Kanban |
| Mixed work types | Hybrid (Scrum for projects, Kanban for ops) |
| Needs improvement in flow efficiency | Kanban |
| Needs improvement in delivery cadence | Scrum |
| Team learning agile practices | Scrum (more structure) |
| Team resists ceremony | Kanban (start thin, add practices) |

### Framework Decision Tree

```
What is the team's work pattern?
  ├── Predictable, iteration-sized work items
  │   ├── Team needs structure and ceremony
  │   │   └── Scrum — fixed iterations, roles, events
  │   └── Team is experienced and self-organizing
  │       └── Scrum with lean ceremonies, focus on outcomes
  ├── Unpredictable, interrupt-driven (support, ops)
  │   └── Kanban — flow-based, WIP limits, no fixed iterations
  ├── Mixed (project work + maintenance)
  │   ├── Clear separation between work types
  │   │   └── Hybrid — Scrum for projects, Kanban track for ops
  │   └── No clear separation
  │       └── Scrumban — Scrum cadence with Kanban flow practices
  ├── Multiple dependent teams
  │   ├── 2-5 teams, moderate dependencies
  │   │   └── Scrum of Scrums + team-level Scrum or Kanban
  │   ├── 5-12 teams, heavy dependencies
  │   │   └── SAFe / LeSS — scaled framework with PI planning
  │   └── Teams can own independent value streams
  │       └── Independent team-level agility, coordination light
  └── Startup / exploration phase
      └── Kanban with lean practices — minimize ceremony, maximize learning
```

### Estimation Technique Comparison

| Technique | When to Use | Scale | Accuracy | Speed |
|-----------|-------------|-------|----------|-------|
| Planning Poker | Story-level, team consensus | Fibonacci (1,2,3,5,8,13,21) | High | Medium |
| T-Shirt Sizing | Epic-level, quick triage | XS, S, M, L, XL, XXL | Low | Fast |
| Affinity Mapping | Large backlog, batch sizing | Relative groups | Medium | Fast |
| Bucket System | Many items, fast categorization | Fixed-size buckets | Medium | Fast |
| Three-Point (PERT) | Task-level, high accuracy | Optimistic + Likely + Pessimistic | Very high | Slow |
| No Estimates | Continuous delivery, small items | Cycle time instead of points | N/A | Fastest |
| Dot Voting | Prioritization, not sizing | Priority rank | Low | Fastest |

## Agent Protocol

### Trigger
"scrum", "kanban", "sprint planning", "backlog", "velocity", "WIP",
"cycle time", "estimation", "planning poker", "MoSCoW", "WSJF",
"scaled agile", "SAFe", "LeSS", "sprint review", "daily standup",
"agile framework", "flow metrics".

### Input Context
- Current framework used (Scrum, Kanban, hybrid, none)
- Team size, composition, and experience level with agile
- Sprint length and iteration cadence (if applicable)
- Backlog size and current prioritization approach
- Pain points: late delivery, poor estimation, low throughput, unclear priorities
- Scaling context: single team or multiple dependent teams
- Tooling: Jira, Azure DevOps, Linear, physical board

### Output Artifact
Framework assessment with recommended practices, backlog management process,
estimation guidelines, and flow metrics dashboard.

### Response Format
```
## Agile Assessment
Current Framework: {scrum/kanban/hybrid}
Recommended Approach: {recommendation}
Key Gaps: {list of gaps identified}
Quick Wins: {3 actionable improvements}
## Backlog Status
Total Items: {N} | Refined: {N} | Unrefined: {N}
Avg Age: {N} days | Largest Item: {N} points
## Recommendation
{framework-specific guidance with concrete next steps}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Current framework assessed and documented
- [ ] Gaps identified against target framework
- [ ] Backlog health evaluated (refinement, aging, sizing)
- [ ] WIP limits or sprint commitment defined
- [ ] Estimation approach recommended
- [ ] Metrics defined for tracking improvement
- [ ] Next steps prioritized and actionable

### Max Response Length
7000 tokens

## Workflow

### Step 1: Assess Current State
Evaluate the team's current agile practices: ceremony attendance and effectiveness, backlog health (refinement cadence, aging items, sizing completeness), delivery predictability (planned vs actual), and team satisfaction. Identify the top 3 pain points — these define the improvement focus.

### Step 2: Choose Primary Framework
Scrum suits teams that can commit to iteration-length work and need ceremony structure. Kanban suits teams with unpredictable or interrupt-driven work (support, ops, data science) or teams that need flow improvement before adding ceremonies. Hybrid approaches work for teams transitioning or with mixed work types.

### Step 3: Establish Ceremonies and Cadence
Scrum: sprint planning (max 2h for 2-week sprint), daily standup (15 min, 3 questions), sprint review (1h, demo + stakeholder feedback), retro (45 min, improvement focus). Kanban: standup focuses on board walk and flow blockers, service delivery review on SLA performance, operations review on resource allocation.

### Step 4: Implement Backlog Management
Define refinement cadence (weekly for 2-week sprints). Set Definition of Ready for backlog items. Apply prioritization: WSJF for SAFe, MoSCoW for stakeholder alignment, value/effort for general use. Slice large items until each fits in a sprint. Maintain max 2 sprints of refined backlog ready for the team.

### Step 5: Track Metrics and Improve
Scrum: velocity trend, completed vs committed ratio, sprint predictability. Kanban: cycle time (P50/P85/P95), throughput, WIP age, CFD. Common: escaped defects, team morale trend. Review metrics in retros and adjust WIP limits, sprint length, or policies accordingly.

### Step 6: Estimation Practice
Choose estimation technique based on team maturity:
- **Planning poker**: Most common, relative sizing, reduces anchoring.
- **T-shirt sizing**: Quick, for large items before refinement.
- **Affinity mapping**: Group items by size, good for large backlogs.
- **No estimates**: Some teams find estimates add overhead without value. Use cycle time instead.
- **Bucket system**: Items sorted into fixed-size buckets, faster than poker.

Best practice: Estimate in story points using modified Fibonacci (1, 2, 3, 5, 8, 13, 21). Never compare velocity between teams. Use velocity trends within the same team.

### Step 7: Continuous Improvement Cycle
Plan-Do-Check-Act loop applied to process: sprint retro identifies improvement items, team selects 1-2 items to implement each sprint, items tracked on improvement board, future retros check if changes improved metrics, larger process changes evaluated quarterly.

### Step 8: Set Up Flow Metrics Dashboard
Track and display: cumulative flow diagram (CFD) for bottleneck detection, cycle time scatterplot for predictability analysis, throughput run chart for delivery rate trends, WIP aging report for stalled items. Review dashboard weekly. Use data in retros to drive improvements.

### Step 9: Handle Dependencies Between Teams
For multi-team coordination: maintain a dependency board visible to all teams, define dependency types (blocking, informational, shared resource), assign dependency owners, track dependency resolution at Scrum of Scrums. Use dependency swimlanes in backlog. Escalate unresolved dependencies at each layer.

### Step 10: Scale Agile Deliberately
Do not scale until team-level agility is working. Signs you need to scale: same items blocked waiting on other teams every sprint, integration takes longer than development, unclear ownership of cross-cutting concerns. Start with the simplest scaling approach (Scrum of Scrums) and add structure only as needed.

## Ceremony Effectiveness Guide

| Ceremony | Scrum Default | Kanban Equivalent | Success Signal | Anti-Pattern |
|----------|---------------|-------------------|----------------|--------------|
| Planning | 2h per 2-week sprint | Service delivery review | Clear sprint goal, committed items | Planning without capacity |
| Daily Standup | 15 min | Standup (board walk) | Blockers surfaced, coordination | Status report to manager |
| Review | 1h per 2-week sprint | Service delivery review | Working demo, stakeholder feedback | Slide deck, no demo |
| Retro | 45 min per 2-week sprint | Operations review | Action items with owners | Complaints without solutions |
| Refinement | 1h weekly | Replenishment meeting | Items meet DoR | 3-hour debates on 3-point items |

## Common Pitfalls

1. **ScrumBut**: Doing daily standups but not doing proper sprint planning, review, or retro. Fix: Commit to the full framework or choose Kanban.
2. **Velocity as performance metric**: Using story points to compare teams or judge productivity. Fix: Velocity is a planning tool, never a performance metric.
3. **WIP limits as suggestions**: Adding work without removing in-progress items. Fix: WIP limits are hard constraints.
4. **Zombie standups**: Status reporting to manager rather than team coordination. Fix: Standup is about blockers and coordination.
5. **Definition of Ready not defined**: Team commits to items that are not refined. Fix: DoR is a contract.
6. **Scope creep during sprint**: Adding work after sprint starts. Fix: Only abort sprint for critical emergencies.
7. **No process improvement**: Retros generate action items but nobody implements them. Fix: Track action items.
8. **Estimation paralysis**: Spending hours debating whether something is 3 or 5 points. Fix: If debate > 5 minutes, take higher estimate.
9. **Ignoring the board**: Jira tickets created but never updated. Fix: Board reflects actual state.
10. **Scaled agile without need**: Adopting SAFe with a single team or 2 teams. Fix: Start with team-level agility.

## Best Practices

- Sprint length consistent for at least 6 sprints before evaluating change
- Product Owner attends every ceremony, not just sprint planning and review
- Daily standup is for the team, not for management
- Sprint review includes working software demo, not just slide deck
- Retro follows a structured format (start/stop/continue, sailboat, 4Ls)
- Backlog refinement is a recurring event, not ad-hoc
- Definition of Done includes production deployment for maximum value
- Limit work-in-progress to reduce cycle time
- Use cumulative flow diagram to detect bottlenecks
- Team morale is the most important metric

## Compared With

| Framework | Strengths | Weaknesses |
|---|---|---|
| Scrum | Ceremony structure, clear roles, predictable cadence | Rigid, overhead for small items |
| Kanban | Flexible, flow focus, easy to start | Lacks iteration commitment |
| Scrum + Kanban (Scrumban) | Best for ops+dev mixed teams | Can confuse ceremonies |
| SAFe | Enterprise alignment, role clarity | Heavy, bureaucratic |
| LeSS | Scrum purity at scale, less overhead | Limited guidance on dependencies |
| XP | Technical excellence (TDD, pairing) | Needs disciplined team |
| Shape Up | Fixed time, variable scope | Unusual cycle, tooling poor |
| Waterfall | Linear, predictable stages | Rigid, late feedback |
| Lean Startup | Build-measure-learn, customer focus | Less about delivery process |

## Templates and Tools

### Sprint Planning Template
```
Sprint: {number} | Duration: {dates}
Capacity: {N} story points / {N} hours
Focus Factor: {N}%

Committed items:
  - {issue key} {summary} ({points})
  - ...

Risks:
  - {identified risk, mitigation}
```

### Daily Standup Template
```
1. What did I do yesterday that helped the team meet the sprint goal?
2. What will I do today to help the team meet the sprint goal?
3. Do I see any blockers or impediments?
```

### Retro Format: Start/Stop/Continue
```
Start Doing: {new practices to try}
Stop Doing: {ineffective practices}
Continue Doing: {practices working well}
Action Items: {1-2 items to implement next sprint}
```

### Kanban Board Column Definition
```
To Do -> In Progress (WIP: 3) -> Review (WIP: 2) -> Done
Explicit policies:
  - Items move to In Progress when someone starts working on them
  - Review column requires peer code review
  - Done requires: merged, deployed, tested in production
  - Blocked items flagged with red blocker token, action owner assigned
```

### Flow Metrics Dashboard
```
Metric            | Current | Target | Trend
Cycle Time P50    | 3.2d   | < 3d   | Improving
Cycle Time P95    | 8.1d   | < 7d   | Stable
Throughput        | 5.1/wk | 5/wk   | Stable
WIP               | 8      | < 6    | Needs attention
WIP Age (max)     | 12d    | < 7d   | Blocked item
Escaped Defects   | 2/mo   | < 1/mo | Improving
```

### Estimation Reference Card
```
Modified Fibonacci: 1, 2, 3, 5, 8, 13, 21
  1 = Trivial (minutes to hours)
  2 = Small (half day)
  3 = Medium (1 day)
  5 = Large (2-3 days)
  8 = Very large (3-5 days)
  13 = Too large (needs splitting)
  21 = Epic (must split)
```

## Rules

- Scrum requires fixed-length iterations; Kanban uses continuous flow
- Velocity is a planning tool, never a performance metric
- WIP limits exist to be respected, not as guidelines
- Every Kanban board must have explicit policies per column
- Backlog items must pass Definition of Ready before sprint commitment
- Estimation is relative, not absolute — story points have no meaning across teams
- Flow metrics (cycle time, throughput) are more predictive than velocity for continuous delivery
- Daily standup is about coordination and blockers, not status reporting
- Sprint review must include a working software demo
- Retro action items must be tracked and reviewed the following sprint
- Product Owner is the sole authority on backlog priority
- Team commits to sprint backlog — no scope additions without team consent
- Definition of Done must be agreed by the team and visible to all
- Estimation should take no more than 10% of sprint capacity
- Board reflects reality, not aspiration

## Framework Comparison — Scrum vs Kanban vs Scrumban

| Dimension | Scrum | Kanban | Scrumban |
|-----------|-------|--------|----------|
| Iterations | Fixed (1-4 weeks) | Continuous flow | Fixed + continuous |
| Roles | PO, SM, Dev Team | None prescribed | PO, Dev Team, opt SM |
| Ceremonies | Planning, daily, review, retro | Opt standup, service review | Planning, daily, retro |
| Estimation | Story points | Not required | Optional |
| Metrics | Velocity, burndown | Cycle time, throughput, WIP | Cycle time, throughput |
| WIP Limits | Implicit (sprint scope) | Explicit (per column) | Explicit + sprint scope |
| Scope Change | Discouraged mid-sprint | Any time | Flexible |
| Best When | Stable requirements, cross-functional | Variable priorities, ops | Hybrid flexibility needed |

## Flow Metrics — Deep Dive

### Cycle Time Analysis
```
Cycle Time: time from "started" to "done"

Segments:
  P50 (median): typical completion — use for planning
  P85: moderate complications — use for stakeholder expectations
  P95: worst case — use for SLA commitments

Targets for healthy dev team:
  P50: < 2-3 days
  P85: < 5-7 days
  P95: < 10-14 days

Scatterplot: tight cluster = predictable; wide spread = unpredictable
```

### Throughput Analysis
```
Throughput: items completed per week (rolling 4-week avg)

Patterns:
  Flat/declining -> WIP overload, blocked items
  Periodic drops -> recurring blockers
  Improving -> WIP reduction, process improvements

Application:
  Capacity: "We complete {n} items/week"
  Commitment: "Expect to finish {n} items in {m} weeks"
```

### WIP Metrics
```
Little's Law: WIP = Throughput x Cycle Time
  Reducing WIP -> reduces Cycle Time
  Increasing WIP -> increases Cycle Time beyond optimal WIP

WIP Rules:
  - Dev limit = team size x 2
  - Review limit = team size
  - Items exceeding P95 -> flag for triage

Reduction strategies: swarming, lower limits by 1/week, stop starting/start finishing
```

### Cumulative Flow Diagram (CFD) Interpretation
```
Healthy: parallel lines, steady Done slope, narrow In Progress band, consistent gaps
Unhealthy:
  - Widening In Progress -> increasing WIP
  - Flattening Done -> delivery stopped
  - Stair-step -> batch delivery
  - Crossing lines -> data quality issue
```

## WIP Limit Optimization Guide

```
Initial limits: Dev (n dev + 1), Review (team size / 2, min 2)
Cycle time too high -> reduce WIP limits
Throughput too low -> reduce WIP limits (counter-intuitive but correct)
Idle team -> check blockers first
Review bottleneck -> increase review limit or add reviewers

Exceptions: hotfix with approval, paired work (pair = 1 WIP), spike < 1 day
Not exceptions: "almost done", "quick review", "small task"
```

## Agile Ceremony Timebox Standards

| Ceremony | 2-week Sprint | 4-week Sprint | Kanban |
|----------|--------------|--------------|--------|
| Sprint Planning | 4 hours | 8 hours | N/A |
| Daily Standup | 15 min | 15 min | 15 min |
| Backlog Refinement | 2 hours | 2 hours | 30 min/week |
| Sprint Review | 2 hours | 4 hours | N/A |
| Sprint Retro | 1.5 hours | 3 hours | 1 hour/month |
| Service Delivery Review | N/A | N/A | 1 hour/week |

## Agile Anti-Pattern Catalog

### Scrum Anti-Patterns
1. Zombie Scrum: ceremonies without spirit
   Fix: retro on purpose; skip if no value
2. Sprint-as-Waterfall: design/build/test in separate sprints
   Fix: each sprint delivers working increment
3. PO as Proxy-Customer: no real user contact
   Fix: PO facilitates access to users
4. Estimate-As-Commitment: treating estimates as deadlines
   Fix: estimates are ranges; velocity is planning tool
5. ScrumBut: cherry-picking ceremonies
   Fix: do Scrum fully or use Kanban honestly

### Kanban Anti-Patterns
1. KanBAN: WIP limits ignored when convenient
   Fix: enforce limits; block new starts until below limit
2. KanBored: no process improvement
   Fix: regular service review with metrics
3. No Policies: columns without rules
   Fix: explicit done definitions per column
4. Focus on Busy-ness: celebrating WIP
   Fix: celebrate completion, not activity
5. Swimlane Overload: too many swimlanes
   Fix: max 3-4 swimlanes or use multiple boards

## Playbook: Scrum to Kanban Transition

```
Step 1 — Assess Readiness (1 week)
- Why transition? Team size? Top pain points?

Step 2 — Hybrid / Scrumban (2-4 sprints)
- Keep sprint cadence, add WIP limits
- Replace estimation with cycle time tracking
- Keep standup + retro; combine planning + refinement

Step 3 — Full Kanban (after hybrid stabilizes)
- Drop sprint boundary
- Pull system with explicit WIP limits
- Add service delivery review + operations review
- Use Little's law for commitment

Key transition indicators:
- Cycle time P50 decreases > 20%
- Throughput increases > 15%
- Team satisfaction increases
- Stakeholder satisfaction increases
```

## References
  - references/agile-scrum-kanban-advanced.md — Agile Scrum Kanban Advanced
  - references/agile-scrum-kanban-fundamentals.md — Agile Scrum Kanban Fundamentals
  - references/backlog-management.md — Backlog Management
  - references/kanban-method.md — Kanban Method
  - references/scaled-agile.md — Scaled Agile Frameworks
  - references/scrum-framework.md — Scrum Framework
  - references/velocity-metrics.md — Velocity and Capacity Metrics
  - references/agile-scaling-frameworks.md — Agile Scaling Frameworks
  - references/agile-metrics-reporting.md — Agile Metrics and Reporting

## Handoff
`sprint-retro` for improvement action items from metrics review.
`okr-kpi` for aligning team metrics to organizational goals.
`pm` for cross-team coordination and dependency management.

## Architecture Decision Trees

### Process Selection
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Cadence | Scrum (fixed sprints) | Kanban (flow-based) | Predictability vs flexibility, team maturity |
| Planning | Sprint planning poker | Continuous backlog refinement | Estimation accuracy vs overhead |
| Retro frequency | End of every sprint | Monthly or milestone-based | Fast feedback vs meeting fatigue |

### Scaling Decision Tree
- Team size <= 8 → Single Scrum/Kanban team
- 9-30 people → Scrum of Scrums / LeSS
- 30+ people → SAFe / Nexus

## Implementation Patterns

### Sprint Planning Template
`markdown
## Sprint Goal
{one sentence describing what this sprint delivers}

## Capacity
- Team velocity: {points}
- Planned leave: {days}
- Sprint capacity: {adjusted points}

## Commitments
| Story | Points | Owner | Dependencies |
|---|---|---|---|
| {title} | {pts} | {name} | {links} |

## Risks
- {risk description} → {mitigation}
`

### Daily Standup Format
`markdown
## Yesterday
- {completed tasks}
- {blockers encountered}

## Today
- {planned tasks}
- {collaboration needed}

## Blockers
- {blocker} → {escalation path}
`

## Production Considerations

### Board Hygiene
- **WIP limits**: Set explicit WIP limits per column (e.g., In Progress: 3 per person). Use cumulative flow diagrams to tune.
- **Definition of Done**: Maintain a team-ratified DoD checklist. Verify each item meets DoD before moving to Done.
- **Cycle time targets**: Set SLA for each workflow state. Alert when items exceed target cycle time.

### Metrics & Reporting
- **Velocity chart**: Track points completed per sprint over 6+ sprints. Use rolling average for planning.
- **Lead/cycle time**: Measure from backlog entry to done. Use 85th percentile for commitment SLAs.
- **CFD (Cumulative Flow Diagram)**: Monitor for bottlenecks. Investigate when bands widen.

## Anti-Patterns

| Anti-Pattern | Symptom | Solution |
|---|---|---|
| Velocity as productivity metric | Story point inflation | Use velocity only for forecasting, not evaluation |
| Zombie standups | "What I did yesterday" without collaboration | Focus on blockers and swarm opportunities |
| Scope creep mid-sprint | Never finishing stories | Enforce sprint scope freeze, defer new work |
| Retro without action items | Same complaints every sprint | Generate 1-2 actionable experiments per retro |
| Estimation as commitment | Stress and gaming of estimates | Emphasize that estimates are forecasts, not promises |

## Performance Optimization

### Meeting Efficiency
- **Timeboxing**: Rigid timeboxes for all ceremonies (planning max 2hrs/week, daily max 15min, retro max 1hr).
- **Async updates**: Use Slack/Teams bot for async daily standups. Reserve sync time for blocker resolution only.
- **Retro formats**: Rotate retro formats (Start/Stop/Continue, Sailboat, 4Ls) to keep engagement high.

### Tooling
- **Automated reporting**: Jira/PowerBI dashboards auto-generated from board data. Eliminate manual status reports.
- **Integration**: Connect board to GitHub/GitLab for automatic status transitions on PR/commit activity.
- **Template automation**: Pre-populate sprint backlog from prioritized epics. Use Jira automation rules.

## Security Considerations

### Tool Security
- **Access control**: Restrict board modification to team members. Use read-only view for stakeholders.
- **External sharing**: Avoid sharing Jira/Trello links publicly. Use dedicated stakeholder views without sensitive details.
- **Audit logging**: Enable board change audit logs. Review unexpected status changes or permission modifications.

### Data Protection
- **PII in tickets**: Never include customer PII in ticket descriptions or comments. Use anonymized references.
- **Security stories**: Flag security-related tasks with dedicated labels. Ensure security stories are not de-prioritized without CISO approval.
- **Vulnerability tracking**: Use private security board for vulnerability management. Restrict access to security team + relevant dev leads.
