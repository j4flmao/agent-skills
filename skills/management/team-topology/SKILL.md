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

Team topology is the practice of organizing engineering teams around the systems they build, based on the observation that organizations design systems that mirror their communication structures (Conway's Law). The goal is to minimize cognitive load per team, maximize flow of value to customers, and create team boundaries that naturally produce the desired system architecture.

This skill implements the four fundamental team types from Team Topologies (Matthew Skelton and Manuel Pais): stream-aligned (default), enabling (capability building), complicated-subsystem (deep specialization), and platform (self-service infrastructure). It provides decision trees for team type assignment, cognitive load assessment frameworks, interaction mode selection guides, and transition plans for org restructuring.

## Agent Protocol

### Trigger
Exact user phrases: team topology, team structure, Conway's Law, stream-aligned, cognitive load, enabling team, platform team, team types, org design, squad health.

### Input Context
- Product or service being built
- Current team structure with sizes and responsibilities
- Main value streams or business domains
- Pain points: dependencies, bottlenecks, handoffs
- Team size and growth trajectory

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
- Value streams or business domains identified
- Team types assigned with rationale
- Cognitive load assessed per team
- Interaction modes defined between teams
- Conway's Law analysis applied to current org
- Reverse Conway maneuver planned if needed
- Transition plan with phases and timeline
- Squad health check baseline established
- Team API/purpose statement drafted per team

### Max Response Length
7000 tokens

## Framework and Methodology

### Four Team Types

| Type | Purpose | Typical Size | Cognitive Load | Default |
|-------|---------|-------------|----------------|---------|
| Stream-Aligned | Owns end-to-end value stream | 5-9 people | Moderate - high | Yes, default |
| Enabling | Builds capability in other teams | 3-5 people | Low - moderate | No |
| Complicated-Subsystem | Deep specialization on complex component | 3-6 people | High (deep) | No |
| Platform | Self-service infrastructure for other teams | 5-12 people | Moderate | No |

### Team Type Decision Tree

```
What kind of work does the team do?
  ├── End-to-end value delivery to customers
  │   └── Stream-Aligned Team — default choice
  │       └── Has the team clear ownership of a complete value stream?
  │           ├── Yes → stream-aligned is correct
  │           └── No → redefine team boundaries to own end-to-end flow
  ├── Complex component requiring deep expertise
  │   └── Does the complexity justify dedicated specialists?
  │       ├── Yes → Complicated-Subsystem Team
  │       └── No → embed specialist in stream-aligned team
  ├── Building shared infrastructure for other teams
  │   └── Platform Team — treat internal teams as customers
  │       └── Is the platform self-service (API, docs, SLAs)?
  │           ├── Yes → healthy platform team
  │           └── No → add API, documentation, and self-service capabilities
  └── Helping other teams build capability
      └── Enabling Team — temporary, limited lifespan
          └── Is there a clear exit criteria?
              ├── Yes → good, enabling teams should be temporary
              └── No → define exit criteria to prevent permanent enabling team
```

### Interaction Mode Decision Tree

```
Is this a one-time or ongoing need?
  ├── One-time
  │   └── Facilitating — help team build capability, then leave
  └── Ongoing
      └── Is the interface stable and well-defined?
          ├── Yes → X-as-a-Service — clear contract, minimal coordination
          └── No → Collaboration — work together on evolving shared boundary

Does the consuming team have skills to work independently?
  ├── Yes → X-as-a-Service — self-service APIs, documentation, SLAs
  └── No → Facilitating — pair, coach, document, gradually withdraw

How frequently does the interface change?
  ├── Stable → X-as-a-Service — versioned API, semver, deprecation policy
  ├── Changing weekly → Collaboration — shared ownership, joint design sessions
  └── Changing daily → Consider merging teams — boundary too unstable
```

### Conway's Law in Practice

```
Organizations design systems that mirror their communication structures.
  - If teams are organized by layer (frontend, backend, DB), the system will have layer boundaries
  - If teams are organized by feature (search, checkout, payments), the system will have feature boundaries
  - The communication paths between teams will become the integration points between services

Signs of misalignment:
  - Integration between two services requires 3+ teams to coordinate
  - Single team owns service but deployment requires changes in 5 other services
  - Frequent defects at service boundaries between specific teams
  - Key architectural changes blocked by organizational dependencies

Reverse Conway maneuver:
  1. Define target system architecture (bounded contexts, services, layers)
  2. Define team boundaries that would naturally produce that architecture
  3. Incrementally reorganize teams to match target
  4. Verify: new communication paths align with architectural interfaces
```

## Workflow

### Step 1: Value Stream Identification

Map the end-to-end value streams the organization delivers. Identify the flow of work from customer need to delivered value. Find where handoffs, delays, and dependencies slow delivery. Determine team boundaries based on value streams, not functions. Each stream should be small enough for one team to own end-to-end.

### Step 2: Team Type Assignment

Classify each team into one of four types. Stream-aligned team owns an end-to-end value stream, works continuously, minimizes external dependencies. Enabling team helps stream-aligned teams build capability, provides coaching and tools, intervenes temporarily. Complicated-subsystem team owns a technically complex component requiring deep specialization. Platform team builds self-service APIs and infrastructure for other teams, treats internal teams as customers.

### Step 3: Cognitive Load Assessment

Measure each team's cognitive load: intrinsic (inherent domain complexity), extraneous (process overhead, coordination cost), germane (learning and improvement capacity). Target: total cognitive load should not exceed team capacity. If too high, split the value stream or create enabling/platform support. Add germane capacity explicitly — learning time, experimentation, improvement.

### Step 4: Interaction Mode Design

Define interaction modes between teams: collaboration (joint work on shared problem, time-limited, high-bandwidth), X-as-a-service (clear API/contract, minimal coordination, one team serves another), facilitating (helping team levels up another team, temporary). Limit collaboration mode — it is expensive. Prefer X-as-a-service for stable interfaces. Use facilitating for capability building.

### Step 5: Org Transition Plan

Identify what changes incrementally. Use reverse Conway maneuver: change org structure first, then design the system to match. Plan transitions in phases (not big bang). Start with team type reassignment and cognitive load reduction. Add enabling teams before platform teams (build capability first). Measure squad health at each phase.

### Step 6: Define Team APIs

Every team should have a clear purpose statement and an internal API defining how other teams interact with it. Team API includes: purpose (one sentence describing what the team exists to do), ownership (what systems, services, or domains the team owns), interaction mode (how other teams should interact), inputs (what the team needs from other teams), outputs (what the team delivers to other teams), SLAs (response times, availability, quality targets for X-as-a-Service). Document team APIs in a shared registry visible to the entire organization.

### Step 7: Run Squad Health Checks

Establish a baseline squad health check before any org changes. Use a simple 6-dimension survey: delivery (are we shipping value?), mission (do we understand our purpose?), fun (are we enjoying work?), health (are we sustainable?), learning (are we growing?), dependencies (are we blocked?). Score each dimension as red/yellow/green. Run quarterly to track impact of topology changes.

### Step 8: Manage Team Size and Growth

Apply the two-pizza rule: teams should be 5-9 people max. When a stream-aligned team exceeds 9 people, split the value stream into two smaller streams. When a platform team exceeds 12 people, split into sub-platforms or create a platform enabling team. Use the cognitive load assessment to determine optimal team size — some domains may need smaller teams due to high intrinsic complexity.

### Step 9: Design for Team Topology Evolution

Team topology is not static. As the product and organization evolve, review the topology quarterly. Signs that topology needs to change: collaboration mode becomes permanent (should have been X-as-a-Service), enabling team has no exit date, cognitive load is critical for multiple sprints, same 3 teams attend every cross-team coordination meeting.

### Step 10: Avoid Common Anti-Patterns

Component teams (teams organized by technical layer) create integration hell. Feature teams that do not own the full stack create handoffs. Too many platform teams create platform fragmentation. Permanent enabling teams become bottlenecks. Collaboration mode used everywhere creates meeting overload. Stream-aligned teams that do not own their deployment cause release delays.

## Models

### Cognitive Load Assessment

| Load Type | Definition | Factors | Target |
|-----------|------------|---------|--------|
| Intrinsic | Complexity inherent to domain and tech | Domain complexity, technical complexity | Match team expertise |
| Extraneous | Process overhead, coordination cost | External dependencies, meetings, deployment complexity | < 30% of team capacity |
| Germane | Capacity for learning and improvement | Experimentation time, spikes, skill building | Minimum 20% of team capacity |

### Assessment Scale
| Level | Characteristics | Action |
|-------|-----------------|--------|
| Manageable | 1-2 domains, few dependencies, clear interfaces | No action needed |
| Warning | Multiple domains, 3+ coordination points, unclear interfaces | Reduce extraneous load |
| Critical | New domain, 5+ dependencies, high process overhead | Split team or add support |

### Cognitive Load Reduction Strategies
| Strategy | When to Use | Impact |
|----------|-------------|--------|
| Split stream | Stream covers too much scope | Reduces intrinsic load |
| Add enabling team | Team lacks skills for current domain | Reduces intrinsic + extraneous |
| Create platform | Common concerns not standardized | Reduces extraneous load |
| Simplify interface | High coordination cost between teams | Reduces extraneous load |
| Increase germane time | No improvement happening | Increases capacity long-term |

### Conway's Law Common Patterns

| Org Pattern | System Pattern | Good For |
|-------------|---------------|----------|
| Single team | Monolith | Startups, simple domains |
| N stream-aligned teams | N microservices | Large products with clear domain boundaries |
| Platform team + stream teams | Platform + services | Shared infrastructure needs |
| Enabling team + stream teams | Capability building | Skill gaps, new technology adoption |

## Common Pitfalls

### Pitfall 1: Component Teams
Teams organized by technical layer (UI, API, DB). Creates integration hell, handoffs, and blame culture. Fix: reorganize into stream-aligned teams that own end-to-end value.

### Pitfall 2: Too Many Collaboration Modes
Every team interaction is collaboration mode. Creates meeting overload, context switching, and slow decision-making. Fix: push interfaces toward X-as-a-Service. Collaboration should be the exception, not the norm.

### Pitfall 3: Ignoring Cognitive Load
Assigning complex domains without assessing team capacity. Fix: assess cognitive load before assigning team type and scope. Split streams if needed.

### Pitfall 4: Permanent Enabling Teams
Enabling teams that never disband become bottlenecks and create dependency. Fix: enabling teams always have an exit criterion and a maximum lifespan (3-6 months).

### Pitfall 5: Platform Teams That Don't Self-Serve
Platform teams that require other teams to "talk to us" rather than providing self-service APIs. Fix: platform teams are measured by adoption, not feature output. Self-service is non-negotiable.

### Pitfall 6: Big Bang Reorganization
Restructuring all teams at once causes chaos, productivity loss, and attrition. Fix: incremental transitions in phases. Let teams stabilize between changes.

### Pitfall 7: Copying Spotify Model
Copying another company's team structure without understanding context. Fix: design topology based on your value streams, cognitive load constraints, and team capabilities.

### Pitfall 8: No Team API
Teams without clear purpose statements cause confusion about ownership, overlapping responsibilities, and dropped work. Fix: every team documents its API including purpose, ownership, and interaction mode.

### Pitfall 9: Ignoring Conway's Law
Designing architecture without considering org structure. Fix: architecture and org structure must co-evolve. Use reverse Conway maneuver.

### Pitfall 10: Scaling Prematurely
Adding teams before the product-market fit is validated. Fix: start with stream-aligned teams. Add enabling and platform teams only when the pain is real.

## Best Practices

- Each team must own a complete value stream or meaningful subsystem
- Cognitive load must be assessed before team type assignment
- Stream-aligned teams are the default — other types exist to support them
- Collaboration mode should be temporary and time-boxed
- No team should exceed 8-9 members (two-pizza rule)
- Reverse Conway: design org structure to produce desired system architecture
- Transition must be incremental, not big bang
- Every team has a clear purpose statement and internal API
- Use interaction mode decision tree to choose between modes
- Monitor team cognitive load — extraneous load should never exceed team capacity
- Run squad health checks quarterly
- Review topology quarterly for needed changes

## Compared With

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| Team Topologies (this skill) | Evidence-based, clear types, cognitive load focus | Requires organizational buy-in |
| Spotify Model | Squad/tribe/guild, autonomy, alignment | Hard to scale, role confusion |
| Holacracy | Distributed authority, roles over people | Complex rules, hard adoption |
| Functional Org | Clear career paths, specialization | Silos, slow cross-team work |
| Matrix Management | Resource flexibility | Confused reporting, slow decisions |
| Squads (autonomous) | High ownership | Duplication, inconsistency |

## Templates and Tools

### Team API Template
```
## Team: {name}
- Type: {stream-aligned / enabling / complicated-subsystem / platform}
- Purpose: {one sentence describing what the team exists to do}
- Ownership: {systems, services, domains owned}
- Interaction Mode(s):
  - With {team}: {collaboration / X-as-a-Service / facilitating}
  - With {team}: {collaboration / X-as-a-Service / facilitating}
- Inputs: {what the team needs from other teams}
- Outputs: {what the team delivers to other teams}
- SLAs (for X-as-a-Service): {response times, availability targets}
- Communication Channel: {Slack channel, meeting cadence}
```

### Cognitive Load Assessment Template
```
## Team: {name} | Date: {date}
### Intrinsic Load
- Domain complexity: {low/medium/high} — {evidence}
- Technical complexity: {low/medium/high} — {evidence}
### Extraneous Load
- External dependencies: {n} teams — {list}
- Meeting overhead: {n} hours/week
- Deployment complexity: {low/medium/high} — {evidence}
### Germane Capacity
- Learning time: {n} hours/week — {target: > 20% capacity}
- Experimentation: {n} hours/week
### Overall Assessment: {manageable / warning / critical}
### Recommended Actions: {list}
```

### Squad Health Check Template
```
## Squad: {name} | Quarter: {Qn YYYY}
| Dimension | Score (R/Y/G) | Notes |
|-----------|---------------|-------|
| Delivery | {R/Y/G} | {evidence} |
| Mission | {R/Y/G} | {evidence} |
| Fun | {R/Y/G} | {evidence} |
| Health | {R/Y/G} | {evidence} |
| Learning | {R/Y/G} | {evidence} |
| Dependencies | {R/Y/G} | {evidence} |
Overall Score: {n} / 6 green
Trend: {improving / stable / declining}
```

### Org Transition Plan Template
```
### Phase 1 (Weeks 1-4): Foundation
- Reassign team types based on value streams
- Reduce extraneous cognitive load (simplify interfaces)
- Define team APIs for all teams
### Phase 2 (Weeks 5-12): Capability Building
- Create enabling team(s) for skill gaps
- Start platform team if needed
- Train teams on new interaction modes
### Phase 3 (Weeks 13-24): Stabilization
- Measure squad health baseline
- Adjust team boundaries based on cognitive load data
- Review and refine team APIs
- Phase out enabling teams as capability matures
```

## Rules

- Each team must own a complete value stream or meaningful subsystem
- Cognitive load must be assessed before team type assignment
- Stream-aligned teams are the default — other types exist to support them
- Collaboration mode should be temporary and time-boxed
- No team should exceed 8-9 members (two-pizza rule)
- Reverse Conway: design org structure to produce desired system architecture
- Transition must be incremental, not big bang
- Every team has a clear purpose statement and internal API
- Collaboration is expensive — prefer X-as-a-Service for stable interfaces
- Enabling teams must have exit criteria and maximum lifespan
- Platform teams are measured by adoption, not feature output
- Team topology must be reviewed quarterly
- Squad health must be measured before and after topology changes
- Component teams (layer-aligned) are an anti-pattern
- Cognitive load reduction is a continuous practice, not a one-time fix

## References
  - references/org-design.md — Organizational Design
  - references/squad-health.md — Squad Health
  - references/team-topology-advanced.md — Team Topology Advanced
  - references/team-topology-fundamentals.md — Team Topology Fundamentals
  - references/team-types.md — Team Types
  - references/topology-patterns.md — Topology Patterns

## Handoff
For OKR alignment with team topology, hand off to management-okr-kpi. For agile process design, hand off to management-agile-scrum-kanban. For hiring to fill team gaps, hand off to management-hiring.
