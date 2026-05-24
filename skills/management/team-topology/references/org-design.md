# Organizational Design

## Overview
Organizational design structures teams for effective delivery. Choosing the right structure — functional, cross-functional, or matrix — determines communication patterns, decision speed, and team autonomy.

## Organizational Structures

### Functional (Siloed)
Teams organized by skill or discipline: engineering, design, product, QA, operations. Each team reports to a functional manager. Work crosses multiple teams to deliver value.

Pros: deep specialization, clear career paths, efficient resource pooling, consistent practices within discipline.
Cons: handoff-heavy delivery, slow decision making, no end-to-end ownership, blame culture between functions, product quality suffers from coordination gaps.
Best for: stable organizations with predictable work, deep expertise requirements, or small companies where individuals share across projects.

### Cross-Functional (Product)
Teams organized by product or value stream with all necessary skills in one team. Engineers, designers, PMs, QA report within the team, not to functional managers.

Pros: end-to-end ownership, fast decision making, aligned incentives, reduced handoffs, higher quality and faster delivery.
Cons: diluted depth in specific skills, varied career paths, harder resource reallocation, potential for inconsistent practices across teams.
Best for: product development, digital services, any environment requiring speed and autonomy.

### Matrix
Dual reporting: functional line management and product/project management. Team members belong to skill community but work on cross-functional teams.

Pros: combines depth of functional with autonomy of cross-functional, flexible resource allocation, maintains skill communities.
Cons: complex reporting, slow decisions from dual authority, conflicting priorities, requires mature managers.
Best for: large organizations that need both specialization and cross-functional delivery.

### Spotify Model (Tribe-Squad)
Squad: cross-functional team (like a Scrum team) with end-to-end ownership. Tribe: collection of squads working in related area (like an incubator). Chapter: skill-based group within a tribe (like a guild within tribe). Guild: community of interest across the organization (like a community of practice).

Pros: autonomous squads, strong culture, within-tribe alignment, cross-org learning through guilds.
Cons: complex to implement well, requires strong engineering culture, can create not-invented-here syndrome, tribe boundaries can become silos.

## Team Topology Org Design Process

### Step 1: Understand Value Streams
Map the end-to-end flow from customer need to delivered value. Identify distinct business capabilities and domains. Determine what streams are stable vs. emerging. Assess current bottlenecks and pain points in the value stream. Score each stream: autonomy potential, cognitive load, dependency count.

### Step 2: Apply Conway's Law
Identify current communication structure. Map it against current system architecture. Determine if they are aligned or conflicting. If misaligned: reverse Conway maneuver — restructure first, architecture follows. If aligned but slow: optimize interaction modes and reduce cognitive load.

### Step 3: Define Team Boundaries
Assign each capability or domain to a team type. Stream-aligned for end-to-end delivery. Complicated-subsystem for specialized components. Platform for shared capabilities. Enabling for capability building. Ensure each team has clear boundaries and minimal external dependencies.

### Step 4: Design Interaction Modes
For each pair of teams that need to interact: choose collaboration (time-boxed, novel problem), X-as-a-service (stable interface, self-service), or facilitating (temporary, capability building). Document interaction modes explicitly. Review quarterly — interactions should evolve.

### Step 5: Plan Transitions
Current state: document existing org structure and pain points. Target state: desired team topology and interaction modes. Transition plan: incremental changes, not big bang. Change one team at a time where possible. Provide safety net for productivity dip during transition. Measure outcomes at each phase.

## Team Size

### Optimal Size
5-9 members per team (two-pizza rule). Fewer than 5: limited capacity, bus factor risk, knowledge silos, meeting overhead per person. More than 9: communication channels explode (n(n-1)/2), subgroup formation, diffusion of responsibility, decision paralysis.

### Scaling Considerations
At 5-6 teams: introduce platform teams. At 10-15 teams: consider tribes or value stream groups. At 20+ teams: establish enablement structure, architecture governance, formal interaction mode system. Team count, not total headcount, is the scaling variable.

## Colocation vs Remote

### Fully Colocated
Same office, same hours, high-bandwidth communication. Best for: early stage, high uncertainty, complex problem-solving, forming teams.
Risks: groupthink, limited talent pool, commute fatigue.

### Fully Remote
Different locations, async-first communication, deliberate connection. Best for: mature teams, well-defined problems, global talent pool, cost efficiency.
Risks: collaboration friction, isolation, harder onboarding, time zone challenges.

### Hybrid
Some colocated, some remote — hardest to get right. Requires: async-first culture regardless of location, equal participation regardless of location, intentional over-communication, all meetings have remote-first setup (everyone on their own device).

### Remote-First Principles
Write everything down (decisions, rationale, updates). Default to async (record meetings, use documents, Slack before Zoom). Deliberate connection (standups, retros, 1:1s, social events). Results-oriented (measure output, not hours). Over-communicate context and rationale.

### Team Topology Considerations
Colocated teams can use collaboration mode more easily. Remote teams need more mature X-as-a-service interfaces. Hybrid teams need extra investment in interaction mode clarity. Platform and enabling teams can be remote more easily than stream-aligned teams doing discovery work.

## Key Points
Cross-functional teams are the default for product development.
Functional teams are for deep specialization needs.
Matrix is best for large orgs that need both depth and autonomy.
Team size of 5-9 optimizes for communication and effectiveness.
Colocation helps early-stage teams; remote suits mature teams.
Hybrid is hardest — invest in async-first culture.
Scaling requires platform teams, not just more stream-aligned teams.
Transition incrementally, measure at each phase.
