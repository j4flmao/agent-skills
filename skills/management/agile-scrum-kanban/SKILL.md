---
name: agile-scrum-kanban
description: >
  Use this skill when the user says 'scrum or kanban', 'kanban board', 'WIP limits', 'cycle time', 'throughput', 'flow metrics', 'scrumban', 'cumulative flow diagram', 'monte carlo forecast', 'backlog management', 'scaling agile', 'SAFe', 'LeSS'. It selects and tunes an agile delivery approach (Scrum, Kanban, Scrumban), designs boards and WIP policies, measures flow and forecasts delivery with data, and advises on scaling frameworks. Do NOT use for: Scrum event mechanics and Definition of Done setup (use agile-scrum), retrospective facilitation (use sprint-retro), team boundaries (use team-topology), OKRs (use okr-kpi).
version: "3.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, agile, scrum, kanban, flow-metrics, forecasting]
---

# Agile: Scrum, Kanban & Scrumban

## Purpose
Choose the delivery approach that fits the work's arrival pattern, then make flow visible and predictable: explicit board policies, WIP limits, flow metrics (WIP, throughput, cycle time, work item age) and probabilistic forecasts instead of point estimates and promises.

## Agent Protocol

### Trigger
"scrum vs kanban", "kanban", "WIP limit", "cycle time", "lead time", "throughput", "flow metrics", "CFD", "scrumban", "forecast delivery date", "monte carlo", "backlog management", "SAFe", "LeSS", "scaled agile".

### Input Context
- Type of work (planned product features vs interrupt-driven ops/support), team size.
- Current board columns, WIP, and 8–12 weeks of start/finish dates if available.
- Pain points (missed commitments, long cycle times, overload).

### Output Artifact
Approach recommendation + board design with WIP policies; or a flow-metrics analysis and forecast.

### Response Format
```
Approach: {Scrum|Kanban|Scrumban} — because {work pattern}
Board: {columns with WIP limits and done-policies}
Metrics: WIP {n}, throughput {items/week}, cycle time P50/P85 {days}, aging items {list}
Forecast: {N items} by {date} at {85%} confidence (Monte Carlo on throughput)
Next experiment: {one policy change + expected effect}
```

## Choosing an Approach

| Signal | Scrum | Kanban | Scrumban |
|--------|-------|--------|----------|
| Work arrival | Plannable in batches | Continuous, interrupt-driven | Mostly planned + steady interrupts |
| Cadence | Fixed sprints | Continuous; cadences decoupled (replenish, deliver, review) | Sprints for planning/review, flow inside |
| Roles | PO, SM, Developers | None prescribed | Usually keeps PO |
| Commitment | Sprint Goal | Service level expectation (e.g., 85% in ≤8 days) | Both |
| Good fit | Product teams discovering + building | Ops, support, platform, maintenance | Teams outgrowing rigid sprints |

## Kanban Essentials
1. **Visualize** the actual workflow (not an idealized one), including queues ("Ready for review").
2. **Limit WIP** per column or per person; start with current average WIP minus a little, then tune.
3. **Manage flow**: pull from the right ("stop starting, start finishing"); swarm on blocked/aging items.
4. **Make policies explicit**: entry/exit criteria per column, classes of service (expedite, fixed date, standard, intangible).
5. **Feedback loops**: daily flow review (walk the board right to left), replenishment, delivery planning, service delivery review.
6. **Improve experimentally**: change one policy at a time and watch the metrics.

Example board:
```
Backlog | Ready (WIP 6) | In Progress (WIP 4) | Review (WIP 3) | Testing (WIP 3) | Done
Policies: Ready = refined + acceptance criteria; Review = PR open + CI green; Done = deployed to prod
```

## Flow Metrics

| Metric | Definition | Use |
|--------|-----------|-----|
| WIP | Items started, not finished | Control lever |
| Throughput | Items finished per unit time | Forecasting |
| Cycle time | Finish date − start date (per item) | Predictability; report percentiles (P50, P85) |
| Work item age | Now − start date for in-progress items | Early warning; act when age passes P85 cycle time |

Little's Law (for a stable system): average cycle time = average WIP ÷ average throughput. Reducing WIP is the most direct lever to reduce cycle time.

Cumulative Flow Diagram: widening bands = growing queues/WIP; flat top band = nothing finishing.

## Forecasting with Monte Carlo

```python
import random


def forecast_weeks(weekly_throughput: list[int], items: int, runs: int = 10_000, pct: float = 0.85) -> int:
    if not weekly_throughput or all(t == 0 for t in weekly_throughput):
        raise ValueError("Need historical weekly throughput with at least one non-zero week")
    if items <= 0:
        raise ValueError(f"items must be positive, got {items}")
    results = []
    for _ in range(runs):
        done, weeks = 0, 0
        while done < items:
            done += random.choice(weekly_throughput)
            weeks += 1
        results.append(weeks)
    results.sort()
    return results[int(pct * runs) - 1]

# forecast_weeks([3, 5, 2, 6, 4, 4, 0, 5], items=30) -> weeks needed with 85% confidence
```
Use 8–12 recent weeks of throughput; re-run weekly. Communicate ranges with confidence levels, not single dates.

## Backlog Management
- Order by value, risk, dependencies and cost of delay (WSJF = cost of delay ÷ job duration is one option).
- Keep only the next 2–3 sprints/weeks detailed; the rest coarse.
- Prune items older than ~6 months not touched — they are not going to happen.
- Right-size items so most finish within the team's P85 cycle time.

## Scaling

| Framework | Fit | Caution |
|-----------|-----|---------|
| LeSS | 2–8 teams on one product, one PO, one backlog | Requires org redesign around feature teams |
| SAFe | Large enterprises needing portfolio alignment (PI planning, ARTs) | Heavyweight; risk of process over outcomes |
| Nexus | 3–9 Scrum teams on one product | Scrum-centric |
| Flight levels / portfolio Kanban | Coordinating flow across teams without prescribing team method | Needs metric discipline |
Before scaling a framework, reduce dependencies (team topology, architecture) — coordination overhead is the main cost.

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| Kanban board with no WIP limits | It is a to-do list; add limits |
| Comparing velocity across teams | Velocity is team-relative; use flow metrics for system view |
| Average cycle time only | Percentiles; distributions are skewed |
| Expedite lane always full | Limit expedite to 1; review why |
| Story points converted to hours | Use throughput-based forecasting |
| "Scrum" without Sprint Goals or retros | Either do Scrum or adopt Kanban honestly |

## Checklist
- [ ] Approach chosen based on work arrival pattern
- [ ] Board reflects real workflow with explicit policies
- [ ] WIP limits set and respected
- [ ] Cycle time percentiles + aging items reviewed weekly
- [ ] Forecasts given as ranges with confidence

## References
- `references/scrum-framework.md` — Scrum details
- `references/kanban-method.md` — Kanban practices and policies
- `references/agile-metrics-reporting.md` — flow metrics and reporting
- `references/backlog-management.md` — ordering and refinement
- `references/scaled-agile.md` — scaling approaches
- `references/agile-scaling-frameworks.md` — SAFe/LeSS/Nexus comparison
- `references/agile-scrum-kanban-fundamentals.md`
- `references/agile-scrum-kanban-advanced.md`
