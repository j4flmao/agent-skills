---
name: management-team-topology
description: >
  Use this skill when designing team structures: team topology, Conway's Law, cognitive load, stream-aligned teams, enabling teams, platform teams.
  This skill enforces: team type classification, cognitive load assessment, interaction mode selection, org design patterns.
  Do NOT use for: individual performance management, hiring process, sprint planning, agile coaching.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, team-topology, phase-10]
---

# Team Topology Agent

## Purpose
Designs team structures aligned with stream-aligned, enabling, complicated-subsystem, and platform topologies using Conway's Law, cognitive load principles, and interaction modes to optimize delivery flow.

## Agent Protocol

### Trigger
Exact user phrases: team topology, team structure, Conway's Law, stream-aligned, cognitive load, enabling team, platform team, team types, org design, squad health.

### Input Context
- What is the product or service being built?
- What does the current team structure look like?
- What are the main value streams or business domains?
- What are the pain points in current delivery (dependencies, bottlenecks, handoffs)?
- What is the team size and growth trajectory?

### Output Artifact
Team topology design with team type assignments, interaction modes, cognitive load assessment, and org transition plan.

### Response Format
```
## Team Topology Design
### Teams
{n} teams | {n} stream-aligned | {n} enabling | {n} platform | {n} complicated-subsystem
### Interaction Modes
{collaboration}: {teams} | {X-as-a-service}: {teams} | {facilitating}: {teams}
### Cognitive Load
{team}: {intrinsic}/{extraneous}/{germane} = {total}
### Transition Plan
Phase 1: {changes} | Phase 2: {changes} | Phase 3: {changes}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Value streams or business domains identified
- [ ] Team types assigned with rationale
- [ ] Cognitive load assessed per team
- [ ] Interaction modes defined between teams
- [ ] Conway's Law analysis applied to current org
- [ ] Reverse Conway maneuver planned if needed
- [ ] Transition plan with phases and timeline
- [ ] Squad health check baseline established
- [ ] Team API/purpose statement drafted per team

### Max Response Length
7000 tokens

## Workflow

### Step 1: Value Stream Identification
Map the end-to-end value streams the organization delivers. Identify the flow of work from customer need to delivered value. Find where handoffs, delays, and dependencies slow delivery. Determine team boundaries based on value streams, not functions. Each stream should be small enough for one team to own end-to-end.

### Step 2: Team Type Assignment
Classify each team into one of four types. Stream-aligned team owns an end-to-end value stream, works continuously, minimizes external dependencies. Enabling team helps stream-aligned teams build capability, provides coaching and tools, intervenes temporarily. Complicated-subsystem team owns a technically complex component requiring deep specialization. Platform team builds self-service APIs and infrastructure for other teams, treats internal teams as customers.

### Step 3: Cognitive Load Assessment
Measure each team's cognitive load: intrinsic (inherent domain complexity), extraneous (process overhead, coordination cost), germane (learning and improvement capacity). Target: total cognitive load should not exceed team capacity. If too high, split the value stream or create enabling/platform support. Add germane capacity explicitly — learning time, experimentation, improvement.

### Step 4: Interaction Mode Design
Define interaction modes between teams: collaboration (joint work on shared problem, time-limited, high-bandwidth), X-as-a-service (clear API/contract, minimal coordination, one team serves another), facilitating (helping team levels up another team, temporary). Limit collaboration mode — it's expensive. Prefer X-as-a-service for stable interfaces. Use facilitating for capability building.

### Step 5: Org Transition Plan
Identify what changes incrementally. Use reverse Conway maneuver: change org structure first, then design the system to match. Plan transitions in phases (not big bang). Start with team type reassignment and cognitive load reduction. Add enabling teams before platform teams (build capability first). Measure squad health at each phase.

## Rules
- Each team must own a complete value stream or meaningful subsystem.
- Cognitive load must be assessed before team type assignment.
- Stream-aligned teams are the default — other types exist to support them.
- Collaboration mode should be temporary and time-boxed.
- No team should exceed 8-9 members (two-pizza rule).
- Reverse Conway: design org structure to produce desired system architecture.
- Transition must be incremental, not big bang.
- Every team has a clear purpose statement and internal API.

## References
- `references/team-types.md` — Team types, Conway's Law, cognitive load
- `references/topology-patterns.md` — Interaction patterns and topology transitions
- `references/squad-health.md` — Squad health checks and team maturity
- `references/org-design.md` — Organizational design patterns and processes

## Handoff
For OKR alignment with team topology, hand off to `management-okr-kpi`. For agile process design, hand off to `management-agile-scrum-kanban`. For hiring to fill team gaps, hand off to `management-hiring`.
