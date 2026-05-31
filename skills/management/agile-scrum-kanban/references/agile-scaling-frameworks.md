# Agile Scaling Frameworks

## Purpose
Provide comprehensive guidance on scaling agile practices across multiple teams, programs, and organizations. Covers SAFe, LeSS, Scrum@Scale, Nexus, and other frameworks with selection criteria, implementation patterns, and common anti-patterns.

## Table of Contents
1. [Scaling Framework Overview](#scaling-framework-overview)
2. [SAFe (Scaled Agile Framework)](#safe-scaled-agile-framework)
3. [LeSS (Large-Scale Scrum)](#less-large-scale-scrum)
4. [Scrum@Scale](#scrumatscale)
5. [Nexus](#nexus)
6. [Disciplined Agile (DA)](#disciplined-agile-da)
7. [Framework Selection Criteria](#framework-selection-criteria)
8. [Cross-Team Coordination Patterns](#cross-team-coordination-patterns)
9. [Dependency Management](#dependency-management)
10. [Scaling Anti-Patterns](#scaling-anti-patterns)
11. [Organizational Design for Agility](#organizational-design-for-agility)

---

## Scaling Framework Overview

### Why Scale Agile?

Single-team agile works well for small products. Scaling becomes necessary when:
- Multiple teams work on the same product or platform.
- Cross-team coordination overhead reduces throughput.
- Integration frequency decreases as team count increases.
- Product strategy requires alignment across 3+ teams.
- Organizational structure creates dependencies between teams.

### The Scaling Paradox

```
Small team (< 10): High autonomy, low coordination overhead, fast decisions.
Scaling (10-50): Coordination overhead grows quadratically with team count.
Large (> 50): Structure mitigates chaos but creates new friction.

Goal: Minimize coordination overhead while maintaining alignment.
```

### Cost of Scaling

| Team Count | Coordination Links | Overhead Ratio |
|---|---|---|
| 1 | 0 (single team) | 0% |
| 2 | 1 | 5% |
| 3 | 3 | 10% |
| 5 | 10 | 20% |
| 10 | 45 | 40% |
| 20 | 190 | 60%+ |

Each framework addresses this overhead differently.

---

## SAFe (Scaled Agile Framework)

### Overview
SAFe provides structured guidance for enterprise agility across four configurations:
- Essential SAFe (team + program level).
- Large Solution SAFe (adds solution level).
- Portfolio SAFe (adds strategic investment level).
- Full SAFe (all levels).

### Core Layers

```
Portfolio Level:
  - Strategic themes, lean budget, value streams.
  - Epic ownership and investment decisions.
  - Key metric: portfolio flow velocity.

Large Solution Level (optional):
  - For solutions built by 100+ practitioners.
  - Solution train, capability focus.
  - Supplier management.

Program Level:
  - Agile Release Train (ART) - 50-125 people, 5-12 teams.
  - Program Increment (PI) - 8-12 week planning horizon.
  - System demo, inspect and adapt.
  - Key metric: program predictability measure.

Team Level:
  - Scrum or Kanban per team.
  - Iterations (1-2 week sprints).
  - Built-in quality practices.
```

### Key SAFe Events

```
Program Increment (PI) Planning:
  - 2-day event every 8-12 weeks.
  - All ART members attend.
  - Define PI objectives (business value).
  - Identify dependencies and risks (ROAM).
  - Output: PI plan with committed objectives.

System Demo:
  - Every 2 weeks (end of each iteration).
  - Integrated system demo from all teams.
  - Stakeholder feedback.

Inspect and Adapt:
  - End of PI, half-day workshop.
  - Quantitative review (metrics).
  - Retrospective and improvement planning.

ART Sync:
  - Weekly or bi-weekly.
  - Scrum of Scrums + Product Owner sync.
  - Dependency tracking.
  - Impediment resolution.
```

### SAFe Roles

```
Portfolio:
  - Lean Portfolio Management (LPM)
  - Epic Owners

Large Solution:
  - Solution Train Engineer
  - Solution Architect
  - Solution Management

Program:
  - Release Train Engineer (RTE)
  - Product Management
  - System Architect
  - Business Owners

Team:
  - Scrum Master / Team Coach
  - Product Owner
  - Development Team
```

### When to Use SAFe

```
Good fit:
  - 75+ people working on a single solution.
  - Organization requires enterprise-level investment alignment.
  - Existing stage-gate processes need agile transformation.
  - Regulatory compliance requires documented traceability.

Poor fit:
  - < 50 people total.
  - Teams benefit from high autonomy.
  - Product can be delivered by loosely coupled teams.
  - Organization prefers lightweight processes.
```

### SAFe Implementation Steps

```
Step 1: Train leaders (Leading SAFe).
Step 2: Identify first value stream.
Step 3: Form first ART (train everyone).
Step 4: Launch first PI planning event.
Step 5: Coach teams through first 2 PIs.
Step 6: Extend to more value streams.
Step 7: Evolve to portfolio level.

Timeline: 6-12 months for first ART maturity.
```

### SAFe Metrics

| Metric | Target | Purpose |
|---|---|---|
| PI predictability measure | > 80% | Business value delivery confidence |
| ART flow velocity | Per ART | Delivery throughput trend |
| Time to market | Reduce quarterly | End-to-end delivery speed |
| Employee engagement | Year-over-year improvement | Team health |
| Customer satisfaction | NPS > 50 | Product quality |

---

## LeSS (Large-Scale Scrum)

### Overview
LeSS scales Scrum by keeping one Product Owner and one Product Backlog for multiple teams. Two configurations:
- LeSS (2-8 teams, ~30-60 people).
- LeSS Huge (8+ teams grouped into requirement areas).

### Principles

```
LeSS rules:
  - One Product Owner per product.
  - One Product Backlog per product.
  - All teams work from same backlog.
  - All teams in same sprint cadence (sprint ends same day).
  - One sprint review (all teams together).
  - One sprint retrospective (overall + per team).

Organizational principles:
  - More teams means more emphasis on removal of organizational impediments.
  - Managers are optional; self-management at all levels.
  - Feature teams, not component teams.
  - System thinking over local optimization.
```

### Key Differences from SAFe

| Aspect | LeSS | SAFe |
|---|---|---|
| Backlog | Single for all teams | Per team + program |
| Product Owner | Single PO | PO per team + Product Management |
| Cadence | All teams same sprint | Same iteration + PI |
| Planning | Sprint planning (multi-team) | PI planning (2-day event) |
| Roles | Fewer roles (PO, SM, team) | Many new roles |
| Organization | Feature teams | Component or feature teams |
| Framework weight | Light | Heavy |

### LeSS Events

```
Sprint Planning Part 1 (multi-team):
  - All teams + PO.
  - Clarify backlog, scope, team assignments.
  - 1.5 hours (4-week sprint) or 1 hour (2-week).

Sprint Planning Part 2 (per team):
  - Each team plans their work.
  - Design and task breakdown.

Sprint Review (multi-team):
  - All teams + stakeholders.
  - 1.5 hours (4-week sprint).
  - Integrated demo.

Overall Retrospective + Team Retro:
  - Overall: system-level improvement.
  - Team: per-team process improvement.
```

### LeSS Huge

```
For > 8 teams:
  - Requirement Areas group related teams.
  - Area Product Owner per area.
  - Area Backlog derived from product backlog.
  - Coordination within area via regular meetings.
  - Cross-area coordination via overall PO + area POs.

Conway inspired:
  - Requirement Areas mirror customer value domains.
  - Avoid component-based teams.
```

### When to Use LeSS

```
Good fit:
  - 30-60 people working on one product.
  - Organization wants to minimize framework overhead.
  - Teams can be organized as feature teams.
  - Strong Scrum experience at team level.

Poor fit:
  - Organization needs portfolio investment management.
  - Teams must be component-based (hardware + software).
  - Regulatory constraints require strict role separation.
  - Organization expects top-down command structure.
```

---

## Scrum@Scale

### Overview
Scrum@Scale (S@S) is a lightweight framework that scales Scrum through a modular approach.
Developed by Jeff Sutherland (Scrum co-creator).

### Structure

```
Scrum of Scrums (SoS):
  - Teams send delegate to SoS.
  - Focus: cross-team coordination, dependency management.
  - MetaScrum Master ensures scaling process.

Executive Action Team (EaT):
  - Removes organizational impediments.
  - Aligns on strategic priorities.
  - Removes blockers escalated from SoS.

Scaled Daily Scrum (SDS):
  - Representatives from each team.
  - Daily 15-min coordination.
  - Same format as team daily Scrum.
```

### Roles

```
Chief Product Owner:
  - Strategic product vision.
  - Coordinates Product Owners.
  - Manages portfolio backlog.

Scrum of Scrums Master:
  - Facilitates SoS meetings.
  - Coaches Scrum Masters on scaling.
  - Removes organizational impediments.

Executive MetaScrum:
  - Monthly or quarterly strategy session.
  - PO team + executive stakeholders.
  - Align on vision, strategy, metrics.
```

### When to Use S@S

```
Good fit:
  - Organizations wanting to scale with minimal overhead.
  - Teams experienced with Scrum.
  - Agile coaches available to support scaling.
  - Multiple independent products needing alignment.

Poor fit:
  - Teams new to Scrum (master team-level first).
  - Need for detailed portfolio financial management.
  - Large solution with hardware dependencies.
```

---

## Nexus

### Overview
Nexus is a framework for scaling Scrum with 3-9 teams. Created by Ken Schwaber (Scrum co-creator). Focuses on eliminating cross-team integration issues.

### Core Concepts

```
Nexus Integration Team (NIT):
  - PO, Scrum Master, and selected team members.
  - Owns the integrated increment.
  - Removes cross-team integration impediments.

Nexus Sprint:
  - Same duration for all teams.
  - One integrated increment at end.
  - Nexus Daily Scrum for coordination.
  - Nexus Sprint Retrospective.

Nexus artifacts:
  - Product Backlog (single).
  - Nexus Sprint Backlog (combined view).
  - Integrated Increment.
```

### Nexus Events

```
Nexus Sprint Planning:
  - Teams plan together, refine interfaces.
  - Identify cross-team dependencies.
  - 2-hour timebox (2-week sprint).

Nexus Daily Scrum:
  - Representatives from each team.
  - 15 minutes, daily.
  - Focus: integration progress and issues.

Nexus Sprint Review:
  - Integrated increment demo.
  - Stakeholder feedback.
  - 2-hour timebox.

Nexus Sprint Retrospective:
  - Whole Nexus (all teams + NIT).
  - Cross-team process improvement.
  - 1.5-hour timebox.
```

### When to Use Nexus

```
Good fit:
  - 3-9 teams working on same product.
  - Frequent integration issues.
  - Team-level Scrum already mature.
  - Product can be integrated continuously.

Poor fit:
  - < 3 teams (use regular Scrum).
  - > 9 teams (consider LeSS Huge or SAFe).
  - Teams geographically distributed.
  - Low integration frequency.
```

---

## Disciplined Agile (DA)

### Overview
DA is a process decision toolkit (not a rigid framework). Provides guidance for choosing practices based on context. Covers full delivery lifecycle (not just development).

### Principles

```
- Choice is good: multiple ways of working.
- Context counts: practices depend on team situation.
- Be pragmatic: use what works, skip what does not.
- Enterprise awareness: team decisions impact organization.
- Optimize flow: continuous delivery of value.
```

### Process Layers

```
- Disciplined DevOps: continuous delivery pipeline.
- Disciplined Agile Delivery (DAD): construction.
- Disciplined Agile IT (DAIT): full IT lifecycle.
- Disciplined Agile Enterprise (DAE): enterprise transformation.
```

### DA Decision Points

```
Team level:
  - Scrum, Kanban, Lean, XP, or hybrid?
  - Iterative or continuous flow?
  - Daily standup or just board review?
  - Estimation or no estimation?

Program level:
  - How to coordinate 2-10 teams?
  - How to manage dependencies?
  - When to synchronize releases?
  - How to get stakeholder feedback?

Enterprise level:
  - How to fund agile initiatives?
  - How to govern agile teams?
  - How to build organizational capability?
  - How to measure enterprise agility?
```

### When to Use DA

```
Good fit:
  - Organizations wanting framework flexibility.
  - Teams with experienced agile coaches.
  - Situations needing custom process design.
  - Enterprises with diverse team types.

Poor fit:
  - Organizations wanting prescriptive guidance.
  - Teams new to agile.
  - Need for standardized process across teams.
```

---

## Framework Selection Criteria

### Decision Matrix

| Factor | SAFe | LeSS | S@S | Nexus | DA |
|---|---|---|---|---|---|
| Team count 2-8 | No | Yes | Yes | Yes | Yes |
| Team count 9-20 | Yes | Huge | Yes | Max 9 | Yes |
| Team count 50+ | Yes | No | Yes | No | Yes |
| New to agile | Yes | No | No | No | No |
| Experienced with Scrum | Yes | Yes | Yes | Yes | Best |
| Component teams | OK | Avoid | OK | Avoid | OK |
| Feature teams | Best | Best | Best | Best | Best |
| Geographical distribution | Good | Hard | OK | Hard | OK |
| Portfolio management | Yes | No | Yes | No | Yes |
| Regulatory compliance | Yes | Hard | OK | OK | Yes |
| Framework weight | Heavy | Light | Light | Light | Medium |
| Role overhead | High | Low | Medium | Low | Varies |
| Tooling support | Excellent | Basic | Good | Basic | Varied |

### Selection Flowchart

```
How many teams?
  < 3 -> Regular Scrum or Kanban. Do not scale.
  3-9 -> Nexus (integration focus) or LeSS (simplicity).
  10-20 -> LeSS Huge or Scrum@Scale.
  20+ -> SAFe (enterprise) or DA (toolkit).

What is your Scrum maturity?
  New to agile -> SAFe (structured guidance).
  Experienced -> LeSS or S@S (less overhead).

What is your product complexity?
  Single product -> LeSS or Nexus.
  Multiple products -> SAFe or S@S.
  Hardware + software -> SAFe or DA.

Organization culture?
  Top-down, command -> SAFe.
  Empowered, autonomous -> LeSS or S@S.
  Pragmatic, contextual -> DA.
```

### Common Scaling Success Factors

```
Regardless of framework:
  1. Leadership commitment: executives actively sponsor and participate.
  2. Agile coaching: dedicated coaches per 20-30 people.
  3. Technical agility: CI/CD, test automation, DevOps maturity.
  4. Feature teams: teams organized around end-user features.
  5. Team proximity: co-located teams where possible.
  6. Aligned cadence: synchronization points.
  7. Transparency: information radiators visible to all.
  8. Improvement culture: retros feed process change.
  9. Metrics: focus on outcomes (value, quality, cycle time).
  10. Patience: 12-18 months for initial maturity.
```

---

## Cross-Team Coordination Patterns

### Scrum of Scrums

```
Structure: One delegate per team, meets 2-3x per week.
Duration: 15 minutes.
Agenda:
  1. What has my team done since last meeting?
  2. What will my team do before next meeting?
  3. Are there any cross-team impediments?
  4. Are there dependencies my team is waiting on?

Best practices:
  - Rotate delegate (not always same person).
  - Keep separate from status reporting.
  - Escalate unresolved impediments.
  - Use visual dependency board.
```

### Communities of Practice (CoP)

```
Purpose: Knowledge sharing across teams on specific topics.
Examples: Testing CoP, Security CoP, Architecture CoP.

Structure:
  - Voluntary membership.
  - Meet bi-weekly or monthly.
  - Rotating facilitator.
  - Topic suggested by members.
  - Output: shared practices, standards, tooling.

Integration with framework:
  - CoPs provide cross-team standardization.
  - Not part of delivery process.
  - Optional but valuable for organizational learning.
```

### Big Room Planning

```
Purpose: Align multiple teams on same goals.
Frequency: Every 8-12 weeks (SAFe PI planning).
Duration: 1-2 days.

Format:
  Day 1: Vision and planning.
   - Business context (executive).
   - Product vision (PM).
   - Architecture guidance (architect).
   - Team breakout sessions.
   - Dependency identification.
   - Risk identification (ROAM).

  Day 2: Commitment and review.
   - Team plan presentations.
   - Risk management (ROAM).
   - Management review and adjustments.
   - Final commitment.
   - Social event.

Virtual big room:
  - Video conference with breakout rooms.
  - Digital collaboration boards.
  - Shared timeline tracking.
  - Parallel team sessions.
  - Recorded for absent members.
```

### Feature Teams vs Component Teams

```
Feature Team:
  - Cross-functional, owns end-to-end features.
  - Can deliver value independently.
  - Pros: faster feature delivery, less dependency.
  - Cons: requires broad expertise, takes time to form.

Component Team:
  - Specialized in one technical area (database, UI, API).
  - Pros: deep expertise, component quality.
  - Cons: feature delivery blocked by dependencies, handoffs.

Conway's Law applied:
  Feature teams produce integrated, modular architecture.
  Component teams produce layered, coupled architecture.

Recommendation: Prefer feature teams. Only use component teams
when technical specialization genuinely requires it (e.g., hardware
drivers, DSP algorithms).
```

---

## Dependency Management

### Dependency Types

```
Hard dependency: Team A needs Team B to finish before Team A can deliver.
  Example: Payment team needs fraud detection API.

Soft dependency: Teams share a resource or decision.
  Example: Two teams both need database schema changes.

Knowledge dependency: Team needs information from another.
  Example: Team A needs to understand Team B's API design.

Resource dependency: Teams share limited resource.
  Example: Both teams need load testing environment on same day.
```

### Dependency Tracking

```
Visual dependency board:
  Columns: Identified -> In Progress -> Resolved -> Blocking
  Cards: Dependency description, owner, target date
  Swimlanes: Per dependency type

Dependency matrix:
  Team A -> Team B: {dependencies}
  Team B -> Team A: {dependencies}
  Team A -> Team C: {dependencies}

Review cadence: Dependency check at least weekly.
  Scrum of Scrums: dependency status.
  PI planning: identify new dependencies.
```

### Dependency Reduction Strategies

```
1. API-first design: teams build to documented interfaces, decouple timelines.
2. Platform teams: provide shared services (auth, logging, CI/CD).
3. Contract testing: automated API compatibility tests.
4. Feature flags: hide incomplete features, avoid dependency on full delivery.
5. Event-driven architecture: decouple via message bus.
6. Shared code ownership: any team can modify any code.
7. Continuous integration: integrate early and often.
8. Self-contained teams: provide teams with full stack resources.
9. Limit open dependencies: track and actively close.
10. Dependency SLA: define expected completion dates and communicate.
```

---

## Scaling Anti-Patterns

### Common Anti-Patterns

```
1. Scaling before ready: 10 teams doing Scrum poorly do not become 10 good teams with SAFe.
   Fix: Master team-level agile before scaling.

2. Framework dogmatism: Adopting SAFe by the book without adapting to context.
   Fix: Use framework as guidance, not law.

3. Ignoring Conway's Law: Organization structure blocks technical improvement.
   Fix: Align teams to product architecture, not legacy org chart.

4. Top-down agile: Management declares agile without empowering teams.
   Fix: Leadership must model agile behaviors (transparency, trust, empowerment).

5. Adding roles without value: Hiring 5 new roles (RTE, Solution Architect, etc.) without clear responsibility.
   Fix: Each role must add net positive value; avoid bloat.

6. Waterfall in sprints: Cross-team gantt charts with gates.
   Fix: Deliver integrated increments frequently.

7. Component teams everywhere: Every team owns a layer, features take months.
   Fix: Move toward feature teams incrementally.

8. Local optimization: One team improves velocity while blocking 3 others.
   Fix: Optimize for system throughput, not individual team velocity.

9. Missing technical foundation: No CI/CD, no test automation, manual deployment.
   Fix: Invest in technical practices before scaling.

10. Diluted accountability: When something fails, no single owner.
    Fix: Clear decision rights and ownership at each level.
```

### Anti-Pattern Detection

```
Signals you are scaling wrong:
  - Integration takes longer than development.
  - Teams spend more time in meetings than coding.
  - Queue of dependencies longer than sprint backlog.
  - Scrum Masters become project managers.
  - Product Owner becomes a committee.
  - Definition of Done varies across teams.
  - Time-to-production increases as team count grows.
  - Team morale declining.
  - Velocity stable but value delivery not improving.
```

---

## Organizational Design for Agility

### Team Topology Patterns

```
Stream-aligned team: Owns a single stream of work (feature, product, service).
  Single mission, continuous delivery.

Enabling team: Supports stream-aligned teams with skills and tools.
  Temporary, capability-focused.

Complicated-subsystem team: Owns complex component needing deep expertise.
  For subsystems where broad understanding is impractical.

Platform team: Provides internal services and APIs.
  Self-service, low cognitive load.
```

### Team Size and Composition

```
Optimal team size: 5-9 (Amazon two-pizza rule).
Stable teams: Keep teams intact across work (don't reorg).
Full-stack teams: Include all skills needed for value delivery.
Product tenure: Team stays with product long-term.

Diversity: Cognitive diversity improves problem-solving.
Experience mix: Senior + junior for growth and runway.
T-shaped skills: Broad knowledge + deep specialization.
```

### Physical Environment

```
Co-located teams: Highest collaboration bandwidth.
  Recommendations: team room, shared board, visible radiators.

Distributed teams: Need extra coordination investment.
  Recommendations: overlap hours, video always on, async-first documentation.
  Risk: 2+ sites slower than 1 site by 30-50%.

Hybrid: Some co-located, some remote.
  Recommendations: every remote person has dedicated video setup.
  Risk: remote participants become second-class.
```

## Handoff
`agile-metrics-reporting.md` for metrics and reporting practices.
`../SKILL.md` for the parent agile-scrum-kanban skill.
