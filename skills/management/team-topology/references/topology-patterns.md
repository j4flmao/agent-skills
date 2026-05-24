# Topology Patterns

## Overview
Team Topology defines three interaction modes that teams use to work together, along with fundamental and transitional topology patterns that describe how team structures evolve over time.

## Interaction Modes

### Collaboration
Two or more teams work together on a shared problem, goal, or initiative. High-bandwidth communication, joint planning, shared responsibility. Time-boxed and outcome-focused, not ongoing.

When to use: novel problems requiring diverse expertise, early discovery and exploration, cross-team initiatives, defining new interfaces or APIs between subsystems.
When to stop: when interface is stable and documented, when repeated work becomes routine, when one team could own it alone.
Warning signs: indefinite collaboration, permanent shared ownership, collaboration used to avoid hard interface decisions, team spends >20% time in collaboration.

Setup: clear shared outcome, defined timebox, dedicated collaboration space (physical or digital), agreed communication cadence, decision-making protocol for disagreements.
Ending: collaboration retrospective, knowledge transfer, interface documentation, handoff to service mode.

### X-as-a-Service
One team provides a service to another team through a well-defined, self-service interface. Minimal coordination needed once interface is defined and stable. The consuming team treats the providing team like an external vendor.

When to use: stable, well-understood capabilities, repeated use by multiple teams, low need for customization per team, well-documented APIs or interfaces.
Specific services: infrastructure (CI/CD, monitoring, deployment), data (analytics, reporting, ML models), tools (design system, component library, testing framework), business (billing, auth, notifications).

Setup: define service contract (API, SLA, documentation), build self-service onboarding (no tickets), create feedback loop, set versioning and deprecation policy, monitor and publish SLAs.

Warning signs: consuming teams wait on provider, interface changes break consumers, provider doesn't measure consumer satisfaction, one-way communication, tickets instead of self-service.

### Facilitating
One team helps another team improve their capabilities. The facilitating team does not do the work — they enable the other team to do it themselves. Time-limited engagement with explicit capability transfer goal.

When to use: leveling up skills across the organization, introducing new technology or practices, conducting improvement programs, helping a team resolve a specific problem.
Approach: pair with team members on real work, provide structured learning, coach rather than do, share patterns and practices, reduce intensity over time.

Ending: capability assessment shows the team can operate independently, specific problem is resolved, engagement timebox expires.
Warning signs: becomes permanent consulting, team becomes dependent, no measurable capability improvement, facilitates but never transfers.

## Fundamental Topologies

### Stream-Aligned Topology
All teams are stream-aligned with enabling and platform support. The most common topology. Stream-aligned teams own value streams end-to-end. Enabling and platform teams exist to support and reduce cognitive load.

### Topology Triggers
When to change: stream-aligned teams consistently blocked by dependencies, cognitive load exceeds capacity, system architecture conflicts with org structure, scaling (team count increasing).

### Platform Topology
A dedicated platform team serves stream-aligned teams. Emerges when 3+ stream-aligned teams need the same capability. Platform treats internal teams as customers.

### Enabling Topology
Enabling teams help stream-aligned teams build new capabilities. Used during technology transitions, new domain adoption, or organization-wide skill building.

### Complicated-Subsystem Topology
Small, specialized teams manage technically complex subsystems. Used sparingly — only when subsystem complexity exceeds what stream-aligned teams can maintain.

## Transitional Topologies

### Topsy-Turvy Transition
Flip from functional teams to stream-aligned teams. This is a major org restructuring. Requires: clear value stream mapping, new team formation, reassignment of people, new interaction modes. Risk: significant productivity drop during transition. Mitigation: strong change management, clear rationale, transitional enabling teams.

### Ecosystem Transition
Move from centralized to decentralized platform ownership. Platform team evolves from controlling to enabling. Transition markers: platform moves from "approve all changes" to "provide self-service tools." Gradual shift over months.

### Network Transition
Scaling from few teams to many teams. Simple collaboration doesn't scale. Introduce platform teams, formalize interaction modes, establish governance without bureaucracy. Typical at 5-8 team threshold.

## Topology Transition Patterns

### Maturity Progression
Stage 1: Ad hoc — no defined team types, functional or project-based. Stage 2: Defined — team types assigned, interaction modes documented. Stage 3: Managed — cognitive load measured, platform adoption tracked, regular topology reviews. Stage 4: Optimized — topology is continuously adjusted based on data.

### Transition Failure Modes
Too fast: restructuring before value streams are understood. Too many enabling teams: enabling becomes permanent overhead. Platform as bottleneck: platform team can't keep up with demand. No reverse Conway: system architecture and org structure remain mismatched.

## Key Points
Collaboration is expensive — use it sparingly and time-box it.
X-as-a-service is the default interaction mode for stable interfaces.
Facilitating is temporary by definition — aim to make it temporary.
Stream-aligned is the default team type — other types support it.
Topology transitions should be incremental, not big bang.
Regular topology reviews ensure structure stays aligned with needs.
Interaction modes should be explicit, not implicit.
