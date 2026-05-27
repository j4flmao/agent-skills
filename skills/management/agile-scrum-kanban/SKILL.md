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
  windsurf: true
tags: [management, agile, scrum, kanban, phase-7]
---

# Agile Scrum Kanban

## Purpose
Provide a comprehensive reference for implementing and coaching Scrum and Kanban frameworks across teams. Covers Scrum roles and ceremonies, Kanban flow metrics and WIP limits, backlog management and prioritization techniques, estimation and velocity tracking, and scaled agile coordination patterns.

## Agent Protocol

### Trigger
"scrum", "kanban", "sprint planning", "backlog", "velocity", "WIP", "cycle time", "estimation", "planning poker", "MoSCoW", "WSJF", "scaled agile", "SAFe", "LeSS", "sprint review", "daily standup", "agile framework", "flow metrics".

### Input Context
- Current framework used (Scrum, Kanban, hybrid, none)
- Team size, composition, and experience level with agile
- Sprint length and iteration cadence (if applicable)
- Backlog size and current prioritization approach
- Pain points: late delivery, poor estimation, low throughput, unclear priorities
- Scaling context: single team or multiple dependent teams
- Tooling: Jira, Azure DevOps, Linear, physical board

### Output Artifact
Framework assessment with recommended practices, backlog management process, estimation guidelines, and flow metrics dashboard.

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

## Rules
- Scrum requires fixed-length iterations; Kanban uses continuous flow — do not mix the incompatible scheduling models
- Velocity is a planning tool, not a performance metric — never use it to compare teams
- WIP limits exist to be respected, not as guidelines — a broken WIP limit is a signal to stop and swarm
- Every Kanban board must have explicit policies per column — what qualifies items to move forward
- Backlog items must pass Definition of Ready before sprint commitment
- Estimation is relative, not absolute — story points have no meaning across teams
- Flow metrics (cycle time, throughput) are more predictive than velocity for continuous delivery
- Daily standup is about coordination and blockers, not status reporting to management

## References
  - references/agile-scrum-kanban-advanced.md — Agile Scrum Kanban Advanced Topics
  - references/agile-scrum-kanban-fundamentals.md — Agile Scrum Kanban Fundamentals
  - references/backlog-management.md — Backlog Management
  - references/kanban-method.md — Kanban Method
  - references/scaled-agile.md — Scaled Agile Frameworks
  - references/scrum-framework.md — Scrum Framework
  - references/velocity-metrics.md — Velocity and Capacity Metrics
## Handoff
`sprint-retro` for improvement action items from metrics review. `okr-kpi` for aligning team metrics to organizational goals. `pm` for cross-team coordination and dependency management.
