# Kanban Method

## Core Principles

1. **Start with what you do now** — Kanban does not require changing existing roles or processes. Begin by visualizing current workflow.
2. **Agree to pursue incremental, evolutionary change** — Avoid sweeping transformations. Small, continuous improvements compound over time.
3. **Respect current roles, responsibilities, and job titles** — The team structure stays intact. Kanban adds visibility and control.
4. **Encourage acts of leadership at every level** — Leadership is not reserved for managers. Anyone can propose improvements.

## Core Practices

1. **Visualize the workflow** — Map every step from idea to delivery. Make work items visible on a board with columns.
2. **Limit Work in Progress (WIP)** — Cap the number of items in each column. Stop starting, start finishing.
3. **Manage flow** — Monitor the movement of work items through the system. Identify bottlenecks and smooth flow.
4. **Make policies explicit** — Document the rules for each column, class of service, and workflow transition.
5. **Implement feedback loops** — Conduct standups, service delivery reviews, and operations reviews.
6. **Improve collaboratively, evolve experimentally** — Use metrics and experiments to guide improvement.

## WIP Limits

### How WIP Limits Work
- Each column has a maximum number of items allowed at one time
- When a column hits its WIP limit, the team must swarm to finish items before pulling new work
- A broken WIP limit is a signal — the team should stop and investigate the blockage
- WIP limits apply per person and per column, whichever is more restrictive

### Setting WIP Limits
```
Column:    Backlog | Analysis | Dev | Review | Done
WIP:         ∞     |    3     |  5  |   3    |  ∞
```

- Start with WIP = 2 × team size per dev column, 1 × team size for review
- Reduce WIP limits gradually — a too-restrictive limit causes swarming and reveals bottlenecks
- The review column should have the smallest WIP — it is usually the bottleneck

### Common WIP Limit Mistakes
- Setting WIP limits but not enforcing them — limits must be respected
- WIP limits on columns that are not flow-constrained (e.g., backlog)
- Individual WIP limits too high — multitasking kills throughput
- Not adjusting WIP limits when the team changes size

## Flow Metrics

### Cycle Time
- **Definition**: Time from when work starts to when it is done
- **Use**: Predictability, customer commitment, bottleneck identification
- **Target**: Lower is better; stable P50 is more important than fast P95
- **Track**: P50 (median), P85, P95 (tail) — monitor the trend

### Throughput
- **Definition**: Number of items completed per unit time (week or sprint)
- **Use**: Capacity planning, delivery forecasting
- **Target**: Stable is better than high — volatility destroys predictability
- **Track**: Weekly or sprint-over-sprint moving average

### Cumulative Flow Diagram (CFD)
- **X-axis**: Time
- **Y-axis**: Cumulative count of items
- **Bands**: Each workflow state is a colored band
- **Reading the CFD**:
  - Widening band = growing queue = bottleneck
  - Narrowing band = reducing queue = improving flow
  - Constant width = stable flow
- **Warning signs**: Vertical band growth (items queuing), crossing bands (measurement error)

### WIP Aging
- **Definition**: How long each item has been in progress
- **Use**: Identify stale items that need attention or escalation
- **Action**: Items exceeding 2× the team's average cycle time should be escalated

## Board Design

### Basic Board
```
| Backlog | Analyze (3) | Develop (5) | Review (3) | Done |
|---------|-------------|-------------|------------|------|
|  Item   |  Item       |  Item       |  Item      |  Item |
|  Item   |             |  Item       |            |       |
```

### Swimlane Board (for classes of service)
```
|         | Backlog | Analyze | Develop | Review | Done |
|---------|---------|---------|---------|--------|------|
| Expedite|    —    |    —    | Item #3 |   —    |  —   |
| Standard|  Items  |  Items  |  Items  | Items  | Items|
| Fixed    |  Items  |    —    |    —    |   —    |  —   |
```

### Board Elements
- **Columns**: Workflow states with WIP limits
- **Swimlanes**: Classes of service or work types
- **Cards**: Work items with key info (title, type, owner, due date, blocked flag)
- **Blocked flags**: Visual indicator that an item is stuck
- **WIP counter**: Current count / limit displayed per column

## Classes of Service

| Class | Description | Policy |
|-------|-------------|--------|
| Expedite | Critical issue, immediate action | Bypass WIP limits, prioritize over all other work. Limit 1 expedite item at a time |
| Standard | Normal work items | Default class, respects all WIP limits, normal prioritization |
| Fixed Date | Deadline-driven items | Schedule to ensure delivery by the deadline. Track reverse calendar |
| Intangible | Maintenance, training, improvement | Low priority, fills slack when no Standard items ready |

## Kanban vs Scrum

| Dimension | Scrum | Kanban |
|-----------|-------|--------|
| Cadence | Fixed iterations | Continuous flow |
| Roles | PO, SM, Developers | No prescribed roles |
| WIP Limits | Implicit (sprint scope) | Explicit per column |
| Planning | Sprint planning event | On-demand pull |
| Estimation | Required (story points) | Optional (can use size only) |
| Change policy | During sprint is discouraged | Can be pulled anytime |
| Metrics | Velocity, burndown | Cycle time, throughput, CFD |
| Best for | Product development | Support, Ops, maintenance, or teams needing flow |

## References
- Kanban Guide — https://kanbanize.com/kanban-resources/getting-started/what-is-kanban
- David J. Anderson: Kanban — Successful Evolutionary Change for Your Technology Business
