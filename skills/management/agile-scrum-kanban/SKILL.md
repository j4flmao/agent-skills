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
